import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

/* ============================================================
   LOCAL STORAGE SYSTEM
   ============================================================ */
const LocalStore = {
  get: (key) => {
    try {
      const d = localStorage.getItem('mtl_hub_' + key);
      return d ? JSON.parse(d) : null;
    } catch (e) {
      return null;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem('mtl_hub_' + key, JSON.stringify(val));
    } catch (e) {}
  }
};

/* ============================================================
   SUPABASE CONFIGURATION & CLIENT INIT
   ============================================================ */
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function GroupChats() {
  const [activeNav, setActiveNav] = useState('chats');

  const showToast = (title, message) => {
    console.log(`[TOAST - ${title}]: ${message}`);
  };

  const navigate = (path) => {
    window.location.href = path;
  };

  const navigateTo = (route) => {
    setActiveNav(route);
    showToast("ROUTING", `Opening ${route.toUpperCase()}`);
    
    switch (route) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      default:
        break;
    }
  };

  // State Management
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [groupsData, setGroupsData] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [archivedGroupIds, setArchivedGroupIds] = useState([]);
  const [currentOpenGroup, setCurrentOpenGroup] = useState(null);
  const [currentTabFilter, setCurrentTabFilter] = useState('all'); // Set 'all' as default first tab
  const [activeMainView, setActiveMainView] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // UI & Drawer States
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState({ active: false, title: '', message: '' });
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInputText, setChatInputText] = useState('');
  
  // Voice Typing State
  const [isListening, setIsListening] = useState(false);
  
  // Modals
  const [modals, setModals] = useState({
    chatRoomModal: false,
    groupOverviewModal: false,
    groupAboutModal: false,
    createGroupModal: false,
    deleteRequestModal: false,
    editProfileModal: false
  });

  const [customPrompt, setCustomPrompt] = useState(null);

  // Form Inputs
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileStatus, setEditProfileStatus] = useState('Connected to Secure Matrix.');
  const [editProfileAvatar, setEditProfileAvatar] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedNewGroupType, setSelectedNewGroupType] = useState('Public');
  
  // Group About Details
  const [groupAboutMembers, setGroupAboutMembers] = useState([]);

  // Refs
  const chatMessagesAreaRef = useRef(null);
  const chatContainerRef = useRef(null);
  const notifPressTimer = useRef(null);
  const chatPressTimer = useRef(null);
  const currentOpenGroupRef = useRef(currentOpenGroup);
  const recognitionRef = useRef(null);

  useEffect(() => {
    currentOpenGroupRef.current = currentOpenGroup;
  }, [currentOpenGroup]);

  const openModal = (modalName) => setModals(prev => ({ ...prev, [modalName]: true }));
  const closeModal = (modalName) => setModals(prev => ({ ...prev, [modalName]: false }));
  const toggleSideMenu = () => setIsSideNavOpen(prev => !prev);

  /* ============================================================
     GOOGLE VOICE TYPING SETUP (SPEECH RECOGNITION API)
     ============================================================ */
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setChatInputText(prev => (prev ? prev + ' ' + finalTranscript : finalTranscript));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceTyping = () => {
    if (!recognitionRef.current) {
      showErrorBanner("Voice Error", "Speech Recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  /* ============================================================
     TIME FORMATTING UTILITIES
     ============================================================ */
  function formatDetailedTimestamp(dateInput) {
    const date = new Date(dateInput);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    if (isToday) return `${dateStr} (Today - ${timeStr})`;
    if (isYesterday) return `${dateStr} (Yesterday - ${timeStr})`;
    return `${dateStr} (${timeStr})`;
  }

  function get3HourTimeDivider(date) {
    const msgDate = new Date(date);
    const year = msgDate.getFullYear();
    const month = msgDate.getMonth();
    const day = msgDate.getDate();

    const hourBlock = Math.floor(msgDate.getHours() / 3) * 3;
    const startBlock = new Date(year, month, day, hourBlock, 0, 0);
    const endBlock = new Date(year, month, day, hourBlock + 3, 0, 0);

    const formatTime = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${formatDetailedTimestamp(startBlock).split('(')[0]} (${formatTime(startBlock)} - ${formatTime(endBlock)})`;
  }

  /* ============================================================
     NOTIFICATIONS & ERROR BANNERS
     ============================================================ */
  function addLocalNotification(title, message) {
    const currentNotifs = LocalStore.get('notifications') || [];
    const newNotif = {
      id: Date.now(),
      title: title,
      message: message,
      time: formatDetailedTimestamp(new Date())
    };
    const updated = [newNotif, ...currentNotifs];
    LocalStore.set('notifications', updated);
    setNotifications(updated);
  }

  function showErrorBanner(title, message) {
    setErrorBanner({
      active: true,
      title: title || "Notice",
      message: message || "An unexpected error occurred."
    });
    addLocalNotification(title, message);
  }

  function dismissErrorBanner() {
    setErrorBanner(prev => ({ ...prev, active: false }));
  }

  /* ============================================================
     VISUAL VIEWPORT HANDLER
     ============================================================ */
  useEffect(() => {
    if (window.visualViewport) {
      const handleVisualViewportResize = () => {
        if (chatContainerRef.current) {
          const currentHeight = window.visualViewport.height;
          chatContainerRef.current.style.height = `${currentHeight}px`;
          chatContainerRef.current.style.maxHeight = `${currentHeight}px`;
        }
      };
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
      return () => window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
    }
  }, []);

  /* ============================================================
     INITIALIZATION & DYNAMIC REALTIME SYNCING
     ============================================================ */
  useEffect(() => {
    setIsLoading(true);
    loadCachedState();
    verifySessionAndInitialize().finally(() => {
      setIsLoading(false);
    });

    const syncInterval = setInterval(() => {
      syncBackgroundData();
    }, 1000);

    return () => clearInterval(syncInterval);
  }, []);

  async function syncBackgroundData() {
    try {
      const activeGrp = currentOpenGroupRef.current;
      if (activeGrp) {
        const { data } = await supabaseClient
          .from('messages')
          .select(`*, profiles:sender_id (username, avatar_url)`)
          .eq('group_id', activeGrp.id)
          .order('created_at', { ascending: true });

        if (data) {
          LocalStore.set('messages_' + activeGrp.id, data);
          setMessages(data);
        }
      }

      const { data: groupsList } = await supabaseClient
        .from('chat_groups')
        .select(`*, group_members (user_id, role, is_suspended, suspended_until)`)
        .order('created_at', { ascending: false });

      if (groupsList) {
        setGroupsData(groupsList);
        LocalStore.set('groups', groupsList);
      }

      const cachedNotifs = LocalStore.get('notifications') || [];
      setNotifications(cachedNotifs);
    } catch (err) {}
  }

  function loadCachedState() {
    const arch = LocalStore.get('archived_groups') || [];
    const unread = LocalStore.get('unread') || {};
    const notifs = LocalStore.get('notifications') || [];
    setArchivedGroupIds(arch);
    setUnreadCounts(unread);
    setNotifications(notifs);

    const cachedProfile = LocalStore.get('profile');
    if (cachedProfile) {
      setCurrentProfile(cachedProfile);
      setEditProfileName(cachedProfile.username || '');
      setEditProfileStatus(cachedProfile.status_message || 'Connected to Secure Matrix.');
      setEditProfileAvatar(cachedProfile.avatar_url || '');
    }

    const cachedGroups = LocalStore.get('groups');
    if (cachedGroups && Array.isArray(cachedGroups)) {
      setGroupsData(cachedGroups);
    }
  }

  async function verifySessionAndInitialize() {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error || !session || !session.user) {
        window.location.href = 'auth.html';
        return;
      }
      setCurrentUser(session.user);
      await fetchOrCreateProfile(session.user);
      await fetchGroups();
      setupRealtimeSubscriptions();
    } catch (err) {
      showErrorBanner("Authentication Failed", "Unable to establish connection with server.");
      setTimeout(() => { window.location.href = 'auth.html'; }, 3000);
    }
  }

  async function fetchOrCreateProfile(userObj) {
    if (!userObj) return;
    let { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userObj.id).single();

    if (!profile) {
      let fallbackName = userObj.email ? userObj.email.split('@')[0] : 'User_' + userObj.id.substring(0, 5);
      const { data: newProfile } = await supabaseClient
        .from('profiles')
        .insert([{ id: userObj.id, username: fallbackName }])
        .select()
        .single();
      profile = newProfile;
    }

    const finalProfile = profile || {
      id: userObj.id,
      username: userObj.email ? userObj.email.split('@')[0] : 'User',
      avatar_url: '',
      status_message: 'Connected to Secure Matrix.',
      is_global_admin: false
    };

    setCurrentProfile(finalProfile);
    setEditProfileName(finalProfile.username || '');
    setEditProfileStatus(finalProfile.status_message || 'Connected to Secure Matrix.');
    setEditProfileAvatar(finalProfile.avatar_url || '');
    LocalStore.set('profile', finalProfile);
  }

  async function fetchGroups() {
    const { data, error } = await supabaseClient
      .from('chat_groups')
      .select(`
        *,
        group_members (
          user_id,
          role,
          is_suspended,
          suspended_until
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      showErrorBanner("Synchronization Error", "Failed to load group chats.");
      return;
    }

    if (data) {
      setGroupsData(data);
      LocalStore.set('groups', data);
    }
  }

  function setupRealtimeSubscriptions() {
    supabaseClient
      .channel('public-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        if (payload.new) {
          const gId = payload.new.group_id;
          setCurrentOpenGroup(activeGroup => {
            if (activeGroup && gId === activeGroup.id) {
              fetchMessages(gId);
            } else {
              setUnreadCounts(prev => {
                const newCounts = { ...prev, [gId]: (prev[gId] || 0) + 1 };
                LocalStore.set('unread', newCounts);
                return newCounts;
              });
            }
            return activeGroup;
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_groups' }, () => fetchGroups())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => fetchGroups())
      .subscribe();
  }

  /* ============================================================
     HELPER METHODS
     ============================================================ */
  function isMember(group, userId) {
    return group && group.group_members && group.group_members.some(m => m.user_id === userId);
  }

  function isGroupAdmin(group, userId) {
    if (currentProfile && currentProfile.is_global_admin) return true;
    const m = group && group.group_members && group.group_members.find(x => x.user_id === userId);
    return m && m.role === 'admin';
  }

  function handleUserClick(targetUserId, targetUsername) {
    if (targetUserId === currentUser?.id) return;
    setCustomPrompt({
      title: 'SEND CHAT REQUEST',
      titleColor: 'var(--tg-accent)',
      message: `Do you want to send a private chat request to ${targetUsername}?`,
      confirmText: 'Send Request',
      confirmBg: 'var(--3d-button-bg)',
      confirmColor: '#fff',
      onConfirm: async () => {
        addLocalNotification("CHAT REQUEST SENT", `Request sent to ${targetUsername}. Request queued in chats system.`);
        showToast("CHAT REQUEST", `Request sent to ${targetUsername}`);
        setCustomPrompt(null);
      }
    });
  }

  function startNotificationLongPress(e, notifId) {
    cancelNotificationLongPress();
    notifPressTimer.current = setTimeout(() => {
      confirmDeleteNotification(notifId);
    }, 1800);
  }

  function cancelNotificationLongPress() {
    if (notifPressTimer.current) clearTimeout(notifPressTimer.current);
  }

  function confirmDeleteNotification(notifId) {
    setCustomPrompt({
      title: 'DELETE NOTIFICATION',
      titleColor: 'var(--tg-destructive)',
      message: 'Are you sure you want to remove this notification?',
      confirmText: 'Delete',
      confirmBg: 'var(--tg-destructive)',
      confirmColor: '#fff',
      onConfirm: () => {
        const current = LocalStore.get('notifications') || [];
        const updated = current.filter(n => String(n.id) !== String(notifId));
        LocalStore.set('notifications', updated);
        setNotifications(updated);
        setCustomPrompt(null);
      }
    });
  }

  function promptClearAllNotifications() {
    setCustomPrompt({
      title: 'CLEAR ALL NOTIFICATIONS',
      titleColor: 'var(--tg-destructive)',
      message: 'Are you sure you want to clear all notifications?',
      confirmText: 'Clear All',
      confirmBg: 'var(--tg-destructive)',
      confirmColor: '#fff',
      onConfirm: () => {
        LocalStore.set('notifications', []);
        setNotifications([]);
        setCustomPrompt(null);
      }
    });
  }

  function startChatLongPress(e, groupId) {
    cancelChatLongPress();
    chatPressTimer.current = setTimeout(() => {
      confirmArchiveChat(groupId);
    }, 1800);
  }

  function cancelChatLongPress() {
    if (chatPressTimer.current) clearTimeout(chatPressTimer.current);
  }

  function confirmArchiveChat(groupId) {
    const isArchived = archivedGroupIds.includes(groupId);
    const actionText = isArchived ? "unarchive" : "archive and hide";
    setCustomPrompt({
      title: isArchived ? 'UNARCHIVE CHAT' : 'ARCHIVE CHAT',
      titleColor: 'var(--tg-accent)',
      message: `Are you sure you want to ${actionText} this chat?`,
      confirmText: 'Confirm',
      confirmBg: 'var(--3d-button-bg)',
      confirmColor: '#fff',
      onConfirm: () => {
        let updated;
        if (isArchived) {
          updated = archivedGroupIds.filter(id => id !== groupId);
        } else {
          updated = [...archivedGroupIds, groupId];
        }
        setArchivedGroupIds(updated);
        LocalStore.set('archived_groups', updated);
        setCustomPrompt(null);
      }
    });
  }

  /* ============================================================
     CHAT MESSAGES & ROOM HANDLING
     ============================================================ */
  async function openChatRoom(groupId) {
    const group = groupsData.find(g => g.id === groupId);
    if (!group) return;
    setCurrentOpenGroup(group);

    setUnreadCounts(prev => {
      const updated = { ...prev, [groupId]: 0 };
      LocalStore.set('unread', updated);
      return updated;
    });

    const memberCheck = isMember(group, currentUser?.id);
    if (!memberCheck && !currentProfile?.is_global_admin && group.creator_id !== currentUser?.id) {
      openGroupAbout(groupId);
      return;
    }

    setIsLoading(true);
    await fetchMessages(group.id);
    setIsLoading(false);
    openModal('chatRoomModal');
  }

  async function fetchMessages(groupId) {
    const localMsgKey = 'messages_' + groupId;
    const cachedMsgs = LocalStore.get(localMsgKey);
    if (cachedMsgs) {
      setMessages(cachedMsgs);
    }

    const { data, error } = await supabaseClient
      .from('messages')
      .select(`
        *,
        profiles:sender_id (username, avatar_url)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      showErrorBanner("Message Error", "Could not retrieve messages for this group.");
      return;
    }

    if (data) {
      LocalStore.set(localMsgKey, data);
      setMessages(data);
      setTimeout(() => {
        if (chatMessagesAreaRef.current) {
          chatMessagesAreaRef.current.scrollTop = chatMessagesAreaRef.current.scrollHeight;
        }
      }, 50);
    }
  }

  async function sendChatMessage() {
    const content = chatInputText.trim();
    if (!content || !currentOpenGroup || !currentUser) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    // Dynamic local optimistic update
    const newMsgObj = {
      id: Date.now(),
      group_id: currentOpenGroup.id,
      sender_id: currentUser.id,
      content: content,
      message_type: 'text',
      created_at: new Date().toISOString(),
      profiles: { username: currentProfile?.username || 'User', avatar_url: currentProfile?.avatar_url || '' }
    };

    const updatedLocal = [...messages, newMsgObj];
    setMessages(updatedLocal);
    LocalStore.set('messages_' + currentOpenGroup.id, updatedLocal);

    const { error } = await supabaseClient
      .from('messages')
      .insert([{
        group_id: currentOpenGroup.id,
        sender_id: currentUser.id,
        content: content,
        message_type: 'text'
      }]);

    if (!error) {
      setChatInputText('');
      fetchMessages(currentOpenGroup.id);
    } else {
      showErrorBanner("Sending Failed", "Unable to send message.");
    }
  }

  async function deleteMessage(msgId) {
    const { error } = await supabaseClient
      .from('messages')
      .delete()
      .eq('id', msgId);

    if (!error && currentOpenGroup) {
      fetchMessages(currentOpenGroup.id);
    }
  }

  function editMessage(msgId, oldContent) {
    setCustomPrompt({
      type: 'textarea',
      title: 'EDIT MESSAGE',
      titleColor: 'var(--tg-accent)',
      defaultValue: oldContent,
      confirmText: 'Save Changes',
      confirmBg: 'var(--3d-button-bg)',
      confirmColor: '#fff',
      onConfirm: async (val) => {
        const newText = val.trim();
        if (newText !== "" && newText !== oldContent) {
          const { error } = await supabaseClient
            .from('messages')
            .update({ content: newText, is_edited: true })
            .eq('id', msgId);

          if (!error && currentOpenGroup) {
            fetchMessages(currentOpenGroup.id);
          }
        }
        setCustomPrompt(null);
      }
    });
  }

  function formatMentions(text) {
    if (!text) return '';
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="solid-animated-tag tag-admin" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
            {part}
          </span>
        );
      }
      return part;
    });
  }

  /* ============================================================
     GROUP MANAGEMENT & ABOUT MODAL
     ============================================================ */
  async function openGroupAbout(groupId) {
    const group = typeof groupId === 'string' ? groupsData.find(g => g.id === groupId) : currentOpenGroup;
    if (!group) return;
    setCurrentOpenGroup(group);

    let { data: membersList } = await supabaseClient
      .from('group_members')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('group_id', group.id);

    setGroupAboutMembers(membersList || []);
    openModal('groupAboutModal');
  }

  async function joinGroup(groupId) {
    if (!currentUser) return;
    const { error } = await supabaseClient
      .from('group_members')
      .insert([{ group_id: groupId, user_id: currentUser.id, role: 'member' }]);

    if (!error) {
      closeModal('groupAboutModal');
      await fetchGroups();
      openChatRoom(groupId);
    } else {
      showErrorBanner("Join Error", error.message);
    }
  }

  async function exitGroup(groupId) {
    if (!currentUser) return;
    const { error } = await supabaseClient
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', currentUser.id);

    if (!error) {
      closeModal('groupAboutModal');
      closeModal('chatRoomModal');
      await fetchGroups();
    }
  }

  async function deleteGroup(groupId) {
    const { error } = await supabaseClient
      .from('chat_groups')
      .delete()
      .eq('id', groupId);

    if (!error) {
      closeModal('groupAboutModal');
      closeModal('chatRoomModal');
      await fetchGroups();
    }
  }

  async function promoteUser(groupId, userId) {
    const { error } = await supabaseClient
      .from('group_members')
      .update({ role: 'admin' })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (!error) {
      addLocalNotification("Admin Promotion", `A user was promoted to admin.`);
      openGroupAbout(groupId);
    }
  }

  async function demoteAdmin(groupId, userId) {
    const { error } = await supabaseClient
      .from('group_members')
      .update({ role: 'member' })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (!error) {
      addLocalNotification("Admin Demotion", `An administrator was demoted to standard member status.`);
      openGroupAbout(groupId);
    }
  }

  function inviteMember(groupId) {
    const group = groupsData.find(g => g.id === groupId);
    const groupName = group ? group.name : 'Group';
    const inviterName = currentProfile ? currentProfile.username : 'An Administrator';

    setCustomPrompt({
      type: 'input',
      title: 'GROUP INVITATION',
      titleColor: 'var(--tg-accent)',
      message: `Invite users to join ${groupName} via Email or Username:`,
      placeholder: 'Enter username or email address...',
      confirmText: 'Send Invite',
      confirmBg: 'var(--3d-button-bg)',
      confirmColor: '#fff',
      onConfirm: (target) => {
        if (target.trim() !== "") {
          const inviteLink = `${window.location.origin}${window.location.pathname}?group=${groupId}`;
          const inviteMessage = `You have been invited by ${inviterName} to join ${groupName}.`;
          addLocalNotification("GROUP INVITATION", inviteMessage);
          alert(`Invitation successfully sent to ${target}.\n\nInvite Link:\n${inviteLink}`);
        }
        setCustomPrompt(null);
      }
    });
  }

  function suspendMember(groupId, userId) {
    setCustomPrompt({
      type: 'number',
      title: 'SUSPEND MEMBER',
      titleColor: 'var(--tg-destructive)',
      message: 'Enter suspension duration in hours:',
      defaultValue: '24',
      confirmText: 'Suspend',
      confirmBg: 'var(--tg-destructive)',
      confirmColor: '#fff',
      onConfirm: async (duration) => {
        if (duration) {
          const suspendedUntil = new Date(Date.now() + duration * 3600 * 1000).toISOString();
          const { error } = await supabaseClient
            .from('group_members')
            .update({ is_suspended: true, suspended_until: suspendedUntil })
            .eq('group_id', groupId)
            .eq('user_id', userId);

          if (!error) {
            addLocalNotification("Member Suspension", `Member suspended for ${duration} hours.`);
            openGroupAbout(groupId);
          } else {
            showErrorBanner("Suspension Failed", error.message);
          }
        }
        setCustomPrompt(null);
      }
    });
  }

  async function createNewGroupSubmit() {
    if (!newGroupName.trim() || !currentUser) return;

    const isApproved = currentProfile?.is_global_admin || false;

    const { data: newGroup, error } = await supabaseClient
      .from('chat_groups')
      .insert([{
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || 'Group chat channel.',
        type: selectedNewGroupType,
        creator_id: currentUser.id,
        is_approved: isApproved
      }])
      .select()
      .single();

    if (!error && newGroup) {
      await supabaseClient
        .from('group_members')
        .insert([{ group_id: newGroup.id, user_id: currentUser.id, role: 'admin' }]);

      setNewGroupName('');
      setNewGroupDesc('');
      closeModal('createGroupModal');
      await fetchGroups();
      addLocalNotification("Group Created", `Group ${newGroupName.trim()} created successfully.`);
    } else {
      showErrorBanner("Group Creation Failed", error?.message || 'Could not create group.');
    }
  }

  async function approveGroup(groupId) {
    const { error } = await supabaseClient
      .from('chat_groups')
      .update({ is_approved: true })
      .eq('id', groupId);

    if (!error) await fetchGroups();
  }

  async function saveProfileChanges() {
    if (!currentUser) return;
    const newUsername = editProfileName.trim();
    const newStatus = editProfileStatus.trim();
    const newAvatar = editProfileAvatar.trim();

    const updatePayload = {
      username: newUsername,
      status_message: newStatus,
      updated_at: new Date().toISOString()
    };
    if (newAvatar) updatePayload.avatar_url = newAvatar;

    const { data, error } = await supabaseClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (!error && data) {
      setCurrentProfile(data);
      LocalStore.set('profile', data);
      closeModal('editProfileModal');
    } else {
      showErrorBanner("Update Error", error?.message || 'Could not update profile details.');
    }
  }

  const bigThreeGroups = groupsData
    .filter(g => g.is_big_three && (g.is_approved || g.creator_id === currentUser?.id))
    .slice(0, 3);

  const getFilteredGroups = () => {
    let filtered = [];
    if (currentTabFilter === 'all') {
      filtered = groupsData.filter(g => (g.is_approved || g.creator_id === currentUser?.id) && !archivedGroupIds.includes(g.id));
    } else if (currentTabFilter === 'my_groups') {
      filtered = groupsData.filter(g => isMember(g, currentUser?.id) && !archivedGroupIds.includes(g.id));
    } else if (currentTabFilter === 'available') {
      filtered = groupsData.filter(g => g.is_approved && !isMember(g, currentUser?.id) && !archivedGroupIds.includes(g.id));
    } else if (currentTabFilter === 'archived') {
      filtered = groupsData.filter(g => archivedGroupIds.includes(g.id));
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(g => g.name.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q)));
    }

    return filtered;
  };

  const filteredGroupsList = getFilteredGroups();
  const pinnedGroupsList = groupsData.filter(g => g.is_big_three && !archivedGroupIds.includes(g.id));
  const normalGroupsList = filteredGroupsList.filter(g => !g.is_big_three);

  const pendingApprovalGroups = groupsData.filter(g => !g.is_approved);
  const joinedCount = groupsData.filter(g => isMember(g, currentUser?.id)).length;
  const createdCount = groupsData.filter(g => g.creator_id === currentUser?.id).length;
  const archivedCount = archivedGroupIds.length;

  const currentAvatar = currentProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  return (
    <>
      {/* GLOBAL CSS STYLES WITH COMPACT COMPOSITIONS, 3D CONTAINERS & FUTURISTIC ANIMATIONS */}
      <style>{`
        :root{
          --bg-deep:#0b1118;
          --bg-panel:#16222f;
          --bg-card:#1d2c3f;
          --border-glow:rgba(51, 144, 236, 0.4);
          --tg-accent:#3390ec;
          --tg-accent-hover:#2b7cd3;
          --tg-dark-card:#17222e;
          --tg-dark-panel:#121a24;
          --tg-destructive:#e17076;
          --tg-online:#4cd964;
          --text-main:#f5f5f5;
          --text-muted:#7c8c9e;
          
          /* 3D Visual Styling Token System */
          --3d-card-bg: linear-gradient(145deg, #1f2f44, #152232);
          --3d-card-border: 1px solid rgba(255, 255, 255, 0.12);
          --3d-card-shadow: 0 8px 18px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -2px 0 rgba(0, 0, 0, 0.4);
          
          --3d-button-bg: linear-gradient(180deg, #3aa0ff 0%, #227bd6 100%);
          --3d-button-shadow: 0 4px 0 #185ba3, 0 6px 12px rgba(0, 0, 0, 0.5);
          --3d-button-active: 0 1px 0 #185ba3, 0 2px 4px rgba(0, 0, 0, 0.5);

          --3d-btn-dark: linear-gradient(180deg, #283a4f 0%, #192636 100%);
          --3d-btn-dark-shadow: 0 4px 0 #0f1822, 0 6px 10px rgba(0, 0, 0, 0.4);

          --3d-btn-danger: linear-gradient(180deg, #f0535a 0%, #c0392b 100%);
          --3d-btn-danger-shadow: 0 4px 0 #871c1c, 0 6px 10px rgba(0, 0, 0, 0.4);
        }
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,sans-serif;scrollbar-width:thin;scrollbar-color:var(--tg-accent) var(--bg-deep)}
        body{background-color:var(--bg-deep);color:var(--text-main);height:100vh;overflow:hidden;display:flex;justify-content:center;align-items:center;position:relative}
        .app-container{display:flex;flex-direction:column;width:100vw;height:100vh;max-width:1440px;position:relative;z-index:5;background:var(--bg-deep)}
        .workspace{flex:1;display:flex;flex-direction:column;height:100vh;overflow:hidden;position:relative}
        
        /* Telegram Side Nav Drawer */
        .side-nav-drawer{position:absolute;top:56px;left:-100vw;width:100vw;max-width:320px;height:calc(100% - 56px);background:var(--tg-dark-panel);border-right:var(--3d-card-border);backdrop-filter:blur(20px);z-index:90;transition:left 0.3s cubic-bezier(0.16, 1, 0.3, 1);padding:16px 12px;display:flex;flex-direction:column;gap:10px;box-shadow:15px 0 30px rgba(0, 0, 0, 0.8)}
        .side-nav-drawer.open{left:0}
        .side-nav-item{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;color:var(--text-main);background:var(--3d-btn-dark);box-shadow:var(--3d-btn-dark-shadow);cursor:pointer;transition:all 0.15s ease;font-size:0.85rem;font-weight:600}
        .side-nav-item:active{transform:translateY(2px);box-shadow:0 1px 0 #0f1822}
        .side-nav-item:hover,.side-nav-item.active{color:#fff;border-color:rgba(51, 144, 236, 0.6)}
        
        /* Compact Header Navigation */
        .top-header{height:56px;border-bottom:1px solid rgba(255, 255, 255, 0.08);display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:var(--tg-dark-panel);backdrop-filter:blur(15px);position:relative;z-index:95;box-shadow:0 4px 12px rgba(0,0,0,0.5)}
        .top-header-left{display:flex;align-items:center;gap:12px}
        
        /* Distinct 3D Buttons */
        .btn-3d{border:none;outline:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-weight:700;border-radius:10px;transition:all 0.1s ease;user-select:none;text-decoration:none}
        .btn-3d:active{transform:translateY(3px) !important}
        
        .btn-3d-primary{background:var(--3d-button-bg);color:#fff;box-shadow:var(--3d-button-shadow)}
        .btn-3d-primary:active{box-shadow:var(--3d-button-active)}
        
        .btn-3d-dark{background:var(--3d-btn-dark);color:#fff;box-shadow:var(--3d-btn-dark-shadow);border:1px solid rgba(255,255,255,0.08)}
        .btn-3d-dark:active{box-shadow:0 1px 0 #0f1822}

        .btn-3d-danger{background:var(--3d-btn-danger);color:#fff;box-shadow:var(--3d-btn-danger-shadow)}
        .btn-3d-danger:active{box-shadow:0 1px 0 #871c1c}

        .icon-action-btn{width:36px;height:36px;border-radius:10px;background:var(--3d-btn-dark);box-shadow:var(--3d-btn-dark-shadow);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-main);transition:all 0.15s;border:1px solid rgba(255, 255, 255, 0.08)}
        .icon-action-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #0f1822}

        .brand-title-area h1{font-size:1.05rem;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#fff;text-shadow:0 2px 4px rgba(0,0,0,0.5)}
        .top-header-right{display:flex;align-items:center;gap:10px}
        .avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg, var(--tg-accent), #8774e1);display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid var(--tg-accent);box-shadow:0 4px 10px rgba(0,0,0,0.5);cursor:pointer}
        .avatar img{width:100%;height:100%;object-fit:cover}
        
        /* Action Bar */
        .action-bar-section{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 6px 16px;gap:10px;background:var(--bg-deep)}
        .search-box{position:relative;flex:1;max-width:380px}
        .search-box input{width:100%;background:var(--3d-card-bg);border:1px solid rgba(255, 255, 255, 0.1);border-radius:14px;padding:8px 14px 8px 36px;color:var(--text-main);font-size:0.82rem;outline:none;box-shadow:inset 0 2px 4px rgba(0,0,0,0.5)}
        .search-box input:focus{border-color:var(--tg-accent)}
        .search-box svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:15px;height:15px;stroke:var(--text-muted);fill:none;stroke-width:2}
        .action-bar-right{display:flex;align-items:center;gap:8px}
        .filter-btn{padding:8px 14px;font-size:0.8rem}
        .create-group-btn{padding:8px 14px;font-size:0.8rem}
        
        /* Main Container */
        .main-content{flex:1;overflow-y:auto;padding:8px 16px 24px 16px;display:flex;flex-direction:column;gap:16px;margin:0 auto;width:100%;max-width:1200px}
        .view-section{display:none;flex-direction:column;gap:14px;animation:fadeIn 0.25s ease forwards}
        .view-section.active{display:flex}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .section-title{font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--tg-accent);margin-bottom:6px;font-weight:800}
        
        /* FUTURISTIC LOADING PROMPT CONTAINER */
        .futuristic-loader-prompt {
          background: linear-gradient(135deg, rgba(29, 44, 63, 0.95), rgba(11, 17, 24, 0.98));
          border: 1px solid var(--tg-accent);
          box-shadow: 0 0 20px rgba(51, 144, 236, 0.3), inset 0 0 15px rgba(51, 144, 236, 0.15);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          backdrop-filter: blur(10px);
        }
        .futuristic-loader-title {
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--tg-accent);
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .futuristic-progress-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(51, 144, 236, 0.3);
        }
        .futuristic-progress-bar {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #3aa0ff, #8774e1, #3aa0ff);
          background-size: 200% 100%;
          animation: laserScan 1.5s infinite linear;
          border-radius: 10px;
        }
        @keyframes laserScan {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Top Telegram/WhatsApp Archived Bar */
        .archived-top-bar {
          background: var(--3d-card-bg);
          border: var(--3d-card-border);
          box-shadow: var(--3d-card-shadow);
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          margin-bottom: 10px;
          transition: all 0.15s ease;
        }
        .archived-top-bar:hover {
          border-color: var(--tg-accent);
        }

        /* Group Tabs */
        .group-tabs{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255, 255, 255, 0.08);padding-bottom:8px}
        .tab-buttons{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px}
        .tab-btn{padding:6px 12px;font-size:0.75rem;height:32px;white-space:nowrap}

        /* Chat Room Floating Layer */
        .chat-room-container{position:fixed;inset:0;left:50%;transform:translateX(-50%);width:min(100%, 860px);height:100dvh;display:flex;flex-direction:column;background:var(--bg-deep);border-left:1px solid rgba(255, 255, 255, 0.1);border-right:1px solid rgba(255, 255, 255, 0.1);overflow:hidden;z-index:105;box-shadow:0 0 50px rgba(0, 0, 0, 0.9)}
        .chat-room-header{position:relative;height:56px;padding:6px 14px;display:flex;align-items:center;justify-content:space-between;background:var(--tg-dark-panel);border-bottom:1px solid rgba(255, 255, 255, 0.08);z-index:10;box-shadow:0 4px 10px rgba(0,0,0,0.4)}
        .chat-room-title-area{min-width:0;display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none}
        .chat-room-title-area .chat-avatar{position:relative;width:38px;height:38px;flex:0 0 38px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg, var(--tg-accent), #50a7ea);color:#fff;font-weight:bold;font-size:0.85rem;border:1px solid rgba(255, 255, 255, 0.2)}
        .chat-room-title-area .chat-avatar::after{content:"";position:absolute;width:8px;height:8px;right:1px;bottom:1px;border-radius:50%;background:var(--tg-online);border:2px solid var(--tg-dark-panel)}
        
        .chat-messages-area{position:relative;flex:1;min-height:0;padding:12px clamp(10px, 2.5vw, 20px) 100px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;background:var(--bg-deep)}
        .chat-time-divider{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;width:fit-content;margin:10px auto 6px;padding:3px 10px;color:var(--text-muted);font-size:0.68rem;font-weight:700;background:var(--3d-card-bg);border:var(--3d-card-border);box-shadow:var(--3d-card-shadow);border-radius:8px}
        
        /* Messages Styling */
        .message-bubble{position:relative;z-index:1;width:fit-content;max-width:min(80%, 520px);padding:8px 12px 6px;color:#fff;font-size:0.85rem;line-height:1.4;border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,0.4);word-wrap:break-word}
        .message-bubble.incoming{align-self:flex-start;background:var(--3d-card-bg);border:var(--3d-card-border);border-bottom-left-radius:2px}
        .message-bubble.outgoing{align-self:flex-end;background:linear-gradient(145deg, #2b5278, #1c3854);border:1px solid rgba(51, 144, 236, 0.3);border-bottom-right-radius:2px}
        .message-sender{margin-bottom:2px;color:var(--tg-accent);font-size:0.72rem;font-weight:700;cursor:pointer}
        .message-sender:hover{text-decoration:underline}
        
        /* Floating Chat Input Bar */
        .chat-input-floating-wrapper{position:absolute;left:0;right:0;bottom:0;width:100%;padding:8px clamp(8px, 2vw, 16px) calc(8px + env(safe-area-inset-bottom));background:linear-gradient(to top, var(--bg-deep) 85%, transparent);z-index:20;pointer-events:none}
        .chat-input-floating-wrapper>*{pointer-events:auto}
        .chat-input-bar{width:min(100%, 820px);margin:0 auto;display:flex;align-items:flex-end;gap:6px;padding:6px 8px;background:var(--tg-dark-panel);border:var(--3d-card-border);border-radius:20px;box-shadow:var(--3d-card-shadow)}
        .chat-input-bar textarea{flex:1;width:100%;min-height:34px;max-height:120px;padding:6px 8px;background:transparent;border:none;outline:none;resize:none;color:#fff;font-family:inherit;font-size:0.85rem;line-height:1.35}
        
        .voice-btn,.send-btn{width:34px;height:34px;flex:0 0 34px;border-radius:50%}
        .voice-btn.listening{background:rgba(225, 112, 118, 0.2);color:var(--tg-destructive);border:1px solid var(--tg-destructive)}

        /* Error Notification Banner */
        .error-notification-banner{display:none;background:var(--3d-card-bg);border:1px solid var(--tg-destructive);border-radius:12px;padding:10px 14px;margin-bottom:10px;align-items:center;justify-content:space-between;box-shadow:var(--3d-card-shadow)}
        .error-notification-banner.active{display:flex}
        .error-content-wrapper{display:flex;align-items:center;gap:10px}
        .error-icon-box{width:28px;height:28px;background:rgba(225, 112, 118, 0.25);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--tg-destructive);font-weight:bold;font-size:0.8rem;flex-shrink:0}
        
        /* Compact Distinct Group Lists */
        .group-list{display:flex;flex-direction:column;gap:8px}
        .group-item{background:var(--3d-card-bg);border:var(--3d-card-border);box-shadow:var(--3d-card-shadow);border-radius:12px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:all 0.15s ease;user-select:none}
        .group-item.pinned-item{border-color:rgba(51, 144, 236, 0.4);background:linear-gradient(145deg, #25374d, #172433)}
        .group-item:hover{transform:translateY(-1px);border-color:rgba(51, 144, 236, 0.4)}
        .group-item-left{display:flex;align-items:center;gap:12px}
        .group-item-avatar{width:40px !important;height:40px !important;min-width:40px !important;min-height:40px !important;border-radius:50% !important;background:linear-gradient(135deg, var(--tg-accent), #6c5ce7);display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:800;color:#fff;overflow:hidden;flex-shrink:0;border:1px solid rgba(255, 255, 255, 0.2)}
        .group-item-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
        .group-item-info h4{font-size:0.86rem;color:#fff;margin-bottom:2px;font-weight:700}
        .group-item-info p{font-size:0.72rem;color:var(--text-muted)}
        .group-item-right{display:flex;align-items:center;gap:10px}
        .unread-badge{background:var(--tg-accent);color:#fff;font-size:0.65rem;font-weight:800;padding:2px 6px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.4)}

        /* Modals & Overlays */
        .overlay-screen{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0, 0, 0, 0.8);backdrop-filter:blur(8px);z-index:100;display:none;align-items:center;justify-content:center;padding:14px}
        .overlay-screen.active{display:flex}
        .modal-box{background:var(--tg-dark-panel);border:var(--3d-card-border);box-shadow:0 12px 40px rgba(0, 0, 0, 0.8);border-radius:16px;width:100%;max-width:440px;max-height:88vh;overflow-y:auto;display:flex;flex-direction:column}
        .modal-header{padding:14px 18px;border-bottom:1px solid rgba(255, 255, 255, 0.08);display:flex;align-items:center;justify-content:space-between}
        .modal-header h3{font-size:0.98rem;color:#fff;letter-spacing:0.02em;font-weight:700}
        .close-modal-btn{background:none;border:none;color:var(--text-muted);font-size:1.6rem;cursor:pointer;line-height:1}
        .modal-body{padding:16px;display:flex;flex-direction:column;gap:14px}
        
        .decorated-prompt-box{background:var(--3d-card-bg);border:var(--3d-card-border);box-shadow:var(--3d-card-shadow);border-radius:14px;padding:16px;position:relative}
        .solid-animated-tag{display:inline-block;padding:2px 6px;border-radius:6px;font-size:0.65rem;font-weight:800;text-transform:uppercase;color:#fff}
        .tag-admin{background:linear-gradient(135deg, #e17076, #d63031)}
        .tag-member{background:linear-gradient(135deg, var(--tg-accent), #0984e3)}
        .tag-approval{background:linear-gradient(135deg, #fdcb6e, #e17076);color:#111}
        
        .form-group{display:flex;flex-direction:column;gap:4px}
        .form-group label{font-size:0.75rem;color:var(--text-muted);font-weight:700}
        .form-group input[type="text"],.form-group textarea,.form-group select,.form-group input[type="number"]{background:var(--3d-card-bg);border:1px solid rgba(255, 255, 255, 0.1);border-radius:10px;padding:8px 12px;color:#fff;font-size:0.82rem;outline:none;box-shadow:inset 0 2px 4px rgba(0,0,0,0.4)}
        
        .radio-options{display:flex;flex-direction:column;gap:6px}
        .radio-card{background:var(--3d-card-bg);border:1px solid rgba(255, 255, 255, 0.08);border-radius:10px;padding:10px;display:flex;align-items:center;gap:10px;cursor:pointer}
        .radio-card.selected{border-color:var(--tg-accent);background:rgba(51, 144, 236, 0.1)}
        
        .predictions-container{display:flex;flex-direction:column;gap:10px}
        .notification-item-card{background:var(--3d-card-bg);border:var(--3d-card-border);box-shadow:var(--3d-card-shadow);border-radius:12px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer}
        .notification-left-details{display:flex;align-items:center;gap:10px}
        .notification-icon-3d{width:32px;height:32px;border-radius:8px;background:rgba(51, 144, 236, 0.15);border:1px solid rgba(51, 144, 236, 0.3);display:flex;align-items:center;justify-content:center;color:var(--tg-accent);font-size:0.9rem;flex-shrink:0}
        .flex-row{display:flex;align-items:center;gap:10px}
      `}</style>

      <div className="app-container">
        <main className="workspace">

          {/* SIDE NAVIGATION MENU DRAWER */}
          <div className={`side-nav-drawer ${isSideNavOpen ? 'open' : ''}`} id="sideNavDrawer">
            <div className={`side-nav-item ${activeMainView === 'chats' ? 'active' : ''}`} onClick={() => { setActiveMainView('chats'); toggleSideMenu(); }}>
              Group Chats
            </div>
            <div className={`side-nav-item ${activeMainView === 'predictions' ? 'active' : ''}`} onClick={() => { setActiveMainView('predictions'); toggleSideMenu(); }}>
              Notifications
            </div>
            <div className="side-nav-item" onClick={() => { openModal('createGroupModal'); toggleSideMenu(); }}>
              Create New Group
            </div>
            <div className="side-nav-item" onClick={() => { openModal('deleteRequestModal'); toggleSideMenu(); }}>
              Group Approval
            </div>
            <div className={`side-nav-item ${activeMainView === 'userHub' ? 'active' : ''}`} onClick={() => { setActiveMainView('userHub'); toggleSideMenu(); }}>
              User Profile
            </div>
            <div className="side-nav-item btn-3d-danger" onClick={() => navigateTo('dashboard')} style={{ marginTop: 'auto' }}>
              CLOSE PAGE
            </div>
          </div>

          {/* SECTION 1: Top Header Navigation */}
          <header className="top-header">
            <div className="top-header-left">
              <button className="icon-action-btn" title="Side Navigation Menu" onClick={toggleSideMenu}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="brand-title-area">
                <h1>GROUP CHATS</h1>
              </div>
            </div>

            <div className="top-header-right">
              <div className="user-mini-profile" onClick={() => setActiveMainView('userHub')} title="User Profile">
                <div className="avatar" id="headerUserAvatar">
                  <img src={currentAvatar} alt="User" id="headerAvatarImg" />
                </div>
              </div>
              <button className="icon-action-btn" title="Group Description & Navigation" onClick={() => openModal('groupOverviewModal')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="6" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="18" r="2" />
                </svg>
              </button>
               <button className="icon-action-btn" title="Back to Dashboard" onClick={() => navigateTo('dashboard')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
            </div>
          </header>

          {/* SECTION 2: Search, Filter, and Create Group Bar */}
          <div className="action-bar-section">
            <div className="search-box">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                id="globalSearchInput"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="action-bar-right">
              <button className="btn-3d btn-3d-dark filter-btn" onClick={() => {}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filter
              </button>
              <button className="btn-3d btn-3d-primary create-group-btn" onClick={() => openModal('createGroupModal')}>+ Create</button>
            </div>
          </div>

          {/* Error Notification Banner Prompt */}
          <div style={{ padding: '0 16px' }}>
            <div className={`error-notification-banner ${errorBanner.active ? 'active' : ''}`} id="errorNotificationBanner">
              <div className="error-content-wrapper">
                <div className="error-icon-box">!</div>
                <div className="error-text-area">
                  <h4 id="errorBannerTitle" style={{ fontSize: '0.8rem', color: '#fff' }}>{errorBanner.title || 'Connection Interrupted'}</h4>
                  <p id="errorBannerMessage" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{errorBanner.message || 'An unexpected error occurred.'}</p>
                </div>
              </div>
              <button className="error-dismiss-btn" onClick={dismissErrorBanner} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>&times;</button>
            </div>
          </div>

          {/* Dynamic Main Views Container */}
          <div className="main-content" id="mainContentArea">

            {/* FUTURISTIC PROGRESS BAR LOADING PROMPT */}
            {isLoading && (
              <div className="futuristic-loader-prompt">
                <div className="futuristic-loader-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Syncing Secure Matrix Data...
                </div>
                <div className="futuristic-progress-track">
                  <div className="futuristic-progress-bar"></div>
                </div>
              </div>
            )}

            {/* VIEW 1: CHATS LIST & PINNED */}
            <div className={`view-section ${activeMainView === 'chats' ? 'active' : ''}`} id="view-chats">

              {/* SECTION 3: Group Tabs Header (ALL CHATS option is First) */}
              <div>
                <div className="group-tabs">
                  <div className="tab-buttons">
                    <button className={`btn-3d ${currentTabFilter === 'all' ? 'btn-3d-primary' : 'btn-3d-dark'} tab-btn`} onClick={() => setCurrentTabFilter('all')}>ALL CHATS</button>
                    <button className={`btn-3d ${currentTabFilter === 'my_groups' ? 'btn-3d-primary' : 'btn-3d-dark'} tab-btn`} onClick={() => setCurrentTabFilter('my_groups')}>MY GROUPS</button>
                    <button className={`btn-3d ${currentTabFilter === 'archived' ? 'btn-3d-primary' : 'btn-3d-dark'} tab-btn`} onClick={() => setCurrentTabFilter('archived')}>ARCHIVED</button>
                  </div>
                </div>

                <div className="group-list" id="groupListContainer" style={{ marginTop: '12px' }}>
                  
                  {/* ARCHIVED CHATS AT THE TOP (WhatsApp / Telegram style) */}
                  {archivedCount > 0 && currentTabFilter !== 'archived' && (
                    <div className="archived-top-bar" onClick={() => setCurrentTabFilter('archived')}>
                      <div className="group-item-left">
                        <div className="group-item-avatar" style={{ background: 'var(--tg-dark-card)' }}>📥</div>
                        <div className="group-item-info">
                          <h4>Archived Chats</h4>
                          <p>{archivedCount} {archivedCount === 1 ? 'chat' : 'chats'} stored</p>
                        </div>
                      </div>
                      <span style={{ color: 'var(--tg-accent)', fontSize: '0.8rem' }}>&rarr;</span>
                    </div>
                  )}

                  {/* PINNED CHATS SHOWN ON TOP WITHIN NORMAL LIST */}
                  {currentTabFilter !== 'archived' && pinnedGroupsList.map(g => {
                    const joined = isMember(g, currentUser?.id);
                    const unread = unreadCounts[g.id] || 0;
                    return (
                      <div
                        className="group-item pinned-item"
                        key={g.id}
                        onClick={() => openChatRoom(g.id)}
                        onMouseDown={(e) => startChatLongPress(e, g.id)}
                        onMouseUp={cancelChatLongPress}
                        onMouseLeave={cancelChatLongPress}
                        onTouchStart={(e) => startChatLongPress(e, g.id)}
                        onTouchEnd={cancelChatLongPress}
                      >
                        <div className="group-item-left">
                          <div className="group-item-avatar">{g.name.substring(0, 2).toUpperCase()}</div>
                          <div className="group-item-info">
                            <h4>
                              {g.name} <span style={{ color: 'var(--tg-accent)', fontSize: '0.8rem' }}>📌</span>
                            </h4>
                            <p>{g.description || ''}</p>
                          </div>
                        </div>
                        <div className="group-item-right">
                          {joined ? (
                            <span className="solid-animated-tag tag-member" style={{ fontSize: '0.58rem' }}>JOINED</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 'bold' }}>VIEW</span>
                          )}
                          {unread > 0 && <div className="unread-badge">{unread}</div>}
                        </div>
                      </div>
                    );
                  })}

                  {/* REGULAR NON-PINNED CHATS LIST */}
                  {normalGroupsList.length === 0 && pinnedGroupsList.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '10px 0' }}>No groups available in this section.</p>
                  ) : (
                    normalGroupsList.map(g => {
                      const joined = isMember(g, currentUser?.id);
                      const unread = unreadCounts[g.id] || 0;
                      return (
                        <div
                          className="group-item"
                          key={g.id}
                          onClick={() => openChatRoom(g.id)}
                          onMouseDown={(e) => startChatLongPress(e, g.id)}
                          onMouseUp={cancelChatLongPress}
                          onMouseLeave={cancelChatLongPress}
                          onTouchStart={(e) => startChatLongPress(e, g.id)}
                          onTouchEnd={cancelChatLongPress}
                        >
                          <div className="group-item-left">
                            <div className="group-item-avatar">{g.name.substring(0, 2).toUpperCase()}</div>
                            <div className="group-item-info">
                              <h4>
                                {g.name} {!g.is_approved ? <span className="solid-animated-tag tag-approval" style={{ fontSize: '0.55rem' }}>Pending Approval</span> : ''}
                              </h4>
                              <p>{g.description || ''}</p>
                            </div>
                          </div>
                          <div className="group-item-right">
                            {joined ? (
                              <span className="solid-animated-tag tag-member" style={{ fontSize: '0.58rem' }}>JOINED</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 'bold' }}>VIEW</span>
                            )}
                            {unread > 0 && <div className="unread-badge">{unread}</div>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* VIEW 2: USER HUB / PROFILE */}
            <div className={`view-section ${activeMainView === 'userHub' ? 'active' : ''}`} id="view-userHub">
              <div className="section-title">PROFILE</div>
              <div style={{ background: 'var(--3d-card-bg)', border: 'var(--3d-card-border)', boxShadow: 'var(--3d-card-shadow)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div className="flex-row" style={{ gap: '14px' }}>
                  <div className="avatar" style={{ width: '54px', height: '54px' }} id="hubUserAvatarLarge">
                    <img src={currentAvatar} alt="User" id="hubAvatarImg" />
                  </div>
                  <div>
                    <h3 id="hubProfileName" style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '2px' }}>
                      {currentProfile ? currentProfile.username : 'Loading Profile...'}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} id="hubProfileStatus">
                      {currentProfile ? currentProfile.status_message : 'Connected to Secure Matrix.'}
                    </p>
                  </div>
                </div>
                <button className="btn-3d btn-3d-dark" style={{ padding: '8px 14px', fontSize: '0.78rem' }} onClick={() => openModal('editProfileModal')}>Edit Profile</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '6px' }}>
                <div className="pinned-card" onClick={() => { setCurrentTabFilter('my_groups'); setActiveMainView('chats'); }}>
                  <h3>Active Groups</h3>
                  <p>Manage joined channels.</p>
                  <div className="pinned-card-footer"><span id="countJoined">{joinedCount} Joined</span> <span>Open &rarr;</span></div>
                </div>
                <div className="pinned-card" onClick={() => { setCurrentTabFilter('my_groups'); setActiveMainView('chats'); }}>
                  <h3>My Created Hubs</h3>
                  <p>Groups you created.</p>
                  <div className="pinned-card-footer"><span id="countCreated">{createdCount} Created</span> <span>Manage &rarr;</span></div>
                </div>
              </div>
            </div>

            {/* VIEW 3: NOTIFICATIONS HUB */}
            <div className={`view-section ${activeMainView === 'predictions' ? 'active' : ''}`} id="view-predictions">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div className="section-title" style={{ margin: 0 }}>NOTIFICATIONS</div>
                <button className="btn-3d btn-3d-danger" style={{ padding: '6px 12px', fontSize: '0.7rem' }} onClick={promptClearAllNotifications}>Clear All</button>
              </div>
              <div className="predictions-container" id="localNotificationsList">
                {notifications.length === 0 ? (
                  <div className="notification-item-card">
                    <div className="notification-left-details">
                      <div className="notification-icon-3d">🔔</div>
                      <div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No recent updates available.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      className="notification-item-card"
                      key={n.id}
                      onMouseDown={(e) => startNotificationLongPress(e, n.id)}
                      onMouseUp={cancelNotificationLongPress}
                      onMouseLeave={cancelNotificationLongPress}
                      onTouchStart={(e) => startNotificationLongPress(e, n.id)}
                      onTouchEnd={cancelNotificationLongPress}
                    >
                      <div className="notification-left-details">
                        <div className="notification-icon-3d">🔔</div>
                        <div>
                          <h4 style={{ fontSize: '0.82rem', color: '#fff' }}>{n.title}</h4>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{n.message}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--tg-accent)', flexShrink: 0 }}>{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* MODAL: OPEN CHAT ROOM */}
      <div className={`overlay-screen ${modals.chatRoomModal ? 'active' : ''}`} id="chatRoomModal">
        <div className="chat-room-container" id="chatRoomContainerBox" ref={chatContainerRef}>
          <div className="chat-room-header">
            <div className="chat-room-title-area" onClick={() => openGroupAbout(currentOpenGroup?.id)}>
              <div className="avatar" id="activeChatAvatar">
                {currentOpenGroup ? currentOpenGroup.name.substring(0, 2).toUpperCase() : 'TG'}
              </div>
              <div>
                <h4 id="activeChatTitle" style={{ color: '#fff', fontSize: '0.9rem', margin: 0 }}>
                  {currentOpenGroup ? currentOpenGroup.name : 'Telegram Channel'}
                </h4>
                <p id="activeChatMeta" style={{ fontSize: '0.68rem', color: 'var(--tg-online)', margin: 0 }}>online</p>
              </div>
            </div>
            <div className="chat-room-actions" style={{ display: 'flex', gap: '6px' }}>
              <button className="icon-action-btn" onClick={() => openGroupAbout(currentOpenGroup?.id)} title="Group Info">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </button>
              <button className="icon-action-btn" onClick={() => closeModal('chatRoomModal')} title="Close">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="chat-messages-area" id="chatMessagesArea" ref={chatMessagesAreaRef}>
            <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', margin: '6px 0' }}>Encrypted channel connection</div>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', margin: '16px 0' }}>No messages yet. Start the conversation!</div>
            ) : (
              (() => {
                let lastDivider = '';
                return messages.map(m => {
                  const dividerText = get3HourTimeDivider(m.created_at);
                  const showDivider = dividerText !== lastDivider;
                  if (showDivider) lastDivider = dividerText;

                  const senderName = m.profiles ? m.profiles.username : 'User';
                  const isOwnMessage = m.sender_id === currentUser?.id;
                  const canDelete = isOwnMessage || isGroupAdmin(currentOpenGroup, currentUser?.id);
                  const canEdit = isOwnMessage;

                  return (
                    <React.Fragment key={m.id}>
                      {showDivider && <div className="chat-time-divider">{dividerText}</div>}
                      <div className={`message-bubble ${isOwnMessage ? 'outgoing' : 'incoming'}`} id={`msg-${m.id}`}>
                        <div className="message-sender" onClick={() => handleUserClick(m.sender_id, senderName)}>
                          {senderName} <span className="solid-animated-tag tag-member" style={{ fontSize: '0.5rem', padding: '1px 3px' }}>Member</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#fff', marginTop: '2px' }}>{formatMentions(m.content)}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '2px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {canEdit && <span style={{ cursor: 'pointer', color: 'var(--tg-accent)', fontWeight: 'bold' }} onClick={() => editMessage(m.id, m.content)}>Edit</span>}
                            {canDelete && <span style={{ cursor: 'pointer', color: 'var(--tg-destructive)', fontWeight: 'bold' }} onClick={() => deleteMessage(m.id)}>Delete</span>}
                          </div>
                          <span>{formatDetailedTimestamp(m.created_at)}</span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()
            )}
          </div>

          {/* FLOATING CHAT INPUT BAR WITH GOOGLE VOICE TYPING */}
          <div className="chat-input-floating-wrapper" id="chatInputFloatingWrapper">
            <div className="chat-input-bar">
              <textarea
                id="chatMessageInput"
                placeholder="Message..."
                rows={1}
                value={chatInputText}
                onChange={(e) => {
                  setChatInputText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
              />
              <div style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
                <button
                  className={`btn-3d icon-action-btn voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={toggleVoiceTyping}
                  title={isListening ? "Listening..." : "Google Voice Typing"}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
                <button className="btn-3d btn-3d-primary send-btn" onClick={sendChatMessage} title="Send Message">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: GROUP OVERVIEW */}
      <div className={`overlay-screen ${modals.groupOverviewModal ? 'active' : ''}`} id="groupOverviewModal">
        <div className="modal-box" style={{ textAlign: 'center' }}>
          <div className="modal-header">
            <h3>ABOUT THIS PAGE</h3>
            <button className="close-modal-btn" onClick={() => closeModal('groupOverviewModal')}>&times;</button>
          </div>
          <div className="modal-body" style={{ alignItems: 'center' }}>
            <div className="solid-animated-tag tag-admin">MTL FOOTBALL HUB</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              The Mtl football hub group chat interface serves as a vibrant digital gathering space for enthusiasts of the beautiful game, where fans from all walks of life converge to share their passion for football. This interface is designed with user-friendly features that facilitate seamless communication, allowing members to engage in lively discussions about their favorite teams, players and matches. Within this dynamic environment, users can post real-time updates, share match highlights and exchange opinions on strategies and performances, creating a rich tapestry of conversation that reflects the diverse perspectives of its participants.
            </p>
            <button className="btn-3d btn-3d-primary" style={{ width: '100%', padding: '10px' }} onClick={() => navigateTo('dashboard')}>EXIT</button>
          </div>
        </div>
      </div>

      {/* MODAL: GROUP ABOUT & PERMANENT JOIN LOGIC */}
      <div className={`overlay-screen ${modals.groupAboutModal ? 'active' : ''}`} id="groupAboutModal">
        <div className="modal-box" style={{ textAlign: 'center' }}>
          <div className="modal-header">
            <h3>ABOUT CHANNEL</h3>
            <button className="close-modal-btn" onClick={() => closeModal('groupAboutModal')}>&times;</button>
          </div>
          <div className="modal-body" style={{ alignItems: 'center' }} id="groupAboutBodyContent">
            {currentOpenGroup && (() => {
              const group = currentOpenGroup;
              const isMemberUser = isMember(group, currentUser?.id);
              const isAdminUser = isGroupAdmin(group, currentUser?.id);

              if (!isMemberUser && !currentProfile?.is_global_admin && group.creator_id !== currentUser?.id) {
                return (
                  <>
                    <div className="avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
                      {group.name.substring(0, 2).toUpperCase()}
                    </div>
                    <h3 style={{ color: '#fff', fontSize: '1.05rem' }}>{group.name}</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{group.description || ''}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--tg-accent)' }}>Type: {group.type} | Created: {formatDetailedTimestamp(group.created_at)}</p>
                    
                    {/* Join Group Prompt Container (Permanently disappears once joined) */}
                    <div style={{ background: 'var(--3d-card-bg)', border: 'var(--3d-card-border)', boxShadow: 'var(--3d-card-shadow)', padding: '12px', borderRadius: '12px', width: '100%' }}>
                      <p style={{ fontSize: '0.75rem', color: '#fff', marginBottom: '8px' }}>You must join this group first to view messages or participate.</p>
                      <button className="btn-3d btn-3d-primary" style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }} onClick={() => joinGroup(group.id)}>Join Group Now</button>
                    </div>
                  </>
                );
              } else {
                return (
                  <>
                    <div className="avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
                      {group.name.substring(0, 2).toUpperCase()}
                    </div>
                    <h3 style={{ color: '#fff', fontSize: '1.05rem' }}>{group.name}</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{group.description || ''}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--tg-accent)' }}>Date Created: {formatDetailedTimestamp(group.created_at)} | Access: {group.type}</p>

                    <div style={{ width: '100%', textAlign: 'left', background: 'var(--3d-card-bg)', border: 'var(--3d-card-border)', boxShadow: 'var(--3d-card-shadow)', padding: '12px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ color: 'var(--tg-accent)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Active Members ({groupAboutMembers.length})</h4>
                        {isAdminUser && <button className="solid-animated-tag tag-admin" style={{ cursor: 'pointer', border: 'none' }} onClick={() => inviteMember(group.id)}>+ Invite Member</button>}
                      </div>
                      <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {groupAboutMembers.map(m => (
                          <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '6px' }}>
                            <span style={{ cursor: 'pointer' }} onClick={() => handleUserClick(m.user_id, m.profiles?.username || 'User')}>
                              {m.profiles?.username || 'User'} <span className={`solid-animated-tag ${m.role === 'admin' ? 'tag-admin' : 'tag-member'}`} style={{ fontSize: '0.5rem', padding: '1px 3px' }}>{m.role}</span>
                            </span>
                            {isAdminUser && m.user_id !== currentUser?.id && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {m.role === 'admin' ? (
                                  <button className="btn-3d btn-3d-danger" style={{ padding: '2px 6px', fontSize: '0.6rem' }} onClick={() => demoteAdmin(group.id, m.user_id)}>Demote</button>
                                ) : (
                                  <button className="btn-3d btn-3d-primary" style={{ padding: '2px 6px', fontSize: '0.6rem' }} onClick={() => promoteUser(group.id, m.user_id)}>Promote</button>
                                )}
                                <button className="btn-3d btn-3d-dark" style={{ padding: '2px 6px', fontSize: '0.6rem' }} onClick={() => suspendMember(group.id, m.user_id)}>Suspend</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <button className="btn-3d btn-3d-dark" style={{ flex: 1, padding: '10px' }} onClick={() => exitGroup(group.id)}>Exit Group</button>
                      {(group.creator_id === currentUser?.id || currentProfile?.is_global_admin) && (
                        <button className="btn-3d btn-3d-danger" style={{ flex: 1, padding: '10px' }} onClick={() => deleteGroup(group.id)}>Delete Group</button>
                      )}
                    </div>
                  </>
                );
              }
            })()}
          </div>
        </div>
      </div>

      {/* MODAL: CREATE GROUP */}
      <div className={`overlay-screen ${modals.createGroupModal ? 'active' : ''}`} id="createGroupModal">
        <div className="modal-box">
          <div className="modal-header">
            <h3>Create A Group</h3>
            <button className="close-modal-btn" onClick={() => closeModal('createGroupModal')}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>Group Name</label>
              <input type="text" id="newGroupNameInput" placeholder="Enter group name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea id="newGroupDescInput" placeholder="What is this channel about?" rows={2} value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Privacy Type:</label>
              <div className="radio-options">
                <div className={`radio-card ${selectedNewGroupType === 'Public' ? 'selected' : ''}`} onClick={() => setSelectedNewGroupType('Public')}>
                  <input type="radio" name="gtype" checked={selectedNewGroupType === 'Public'} onChange={() => setSelectedNewGroupType('Public')} id="radioPublic" />
                  <div>
                    <h4 style={{ fontSize: '0.82rem', color: '#fff' }}>Public Listing</h4>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Visible in public directory after approval</p>
                  </div>
                </div>
                <div className={`radio-card ${selectedNewGroupType === 'Private' ? 'selected' : ''}`} onClick={() => setSelectedNewGroupType('Private')}>
                  <input type="radio" name="gtype" checked={selectedNewGroupType === 'Private'} onChange={() => setSelectedNewGroupType('Private')} id="radioPrivate" />
                  <div>
                    <h4 style={{ fontSize: '0.82rem', color: '#fff' }}>Private Group</h4>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Invite-only access</p>
                  </div>
                </div>
              </div>
            </div>
            <button className="btn-3d btn-3d-primary" style={{ padding: '10px', fontSize: '0.85rem' }} onClick={createNewGroupSubmit}>Create Group</button>
          </div>
        </div>
      </div>

      {/* MODAL: GOVERNANCE & APPROVALS */}
      <div className={`overlay-screen ${modals.deleteRequestModal ? 'active' : ''}`} id="deleteRequestModal">
        <div className="modal-box" style={{ textAlign: 'center' }}>
          <div className="modal-header">
            <h3>Governance & Approvals</h3>
            <button className="close-modal-btn" onClick={() => closeModal('deleteRequestModal')}>&times;</button>
          </div>
          <div className="modal-body" style={{ alignItems: 'center' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(51,144,236,0.15)', border: '1px solid var(--tg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tg-accent)' }}>
              🛡️
            </div>
            <h4 style={{ color: '#fff', fontSize: '0.9rem' }}>Admin Group Approval</h4>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>New groups require admin authorization before publishing to public feeds.</p>

            <div id="adminApprovalList" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {pendingApprovalGroups.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No groups currently pending approval.</p>
              ) : (
                pendingApprovalGroups.map(g => {
                  const creatorName = g.creator_name || g.creator_id || 'USER';
                  return (
                    <div key={g.id} style={{ background: 'var(--3d-card-bg)', border: 'var(--3d-card-border)', boxShadow: 'var(--3d-card-shadow)', padding: '10px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ color: '#fff', fontSize: '0.82rem' }}>{g.name}</h4>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Created by {creatorName}</p>
                      </div>
                      {currentProfile?.is_global_admin ? (
                        <button className="btn-3d btn-3d-primary" style={{ padding: '5px 10px', fontSize: '0.7rem' }} onClick={() => approveGroup(g.id)}>Approve</button>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: 'var(--tg-accent)' }}>Pending Approval</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: EDIT PROFILE */}
      <div className={`overlay-screen ${modals.editProfileModal ? 'active' : ''}`} id="editProfileModal">
        <div className="modal-box">
          <div className="modal-header">
            <h3>Edit Identity & Avatar URL</h3>
            <button className="close-modal-btn" onClick={() => closeModal('editProfileModal')}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>Username</label>
              <input type="text" id="editProfileNameInput" value={editProfileName} onChange={(e) => setEditProfileName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Status Message</label>
              <input type="text" id="editProfileStatusInput" value={editProfileStatus} onChange={(e) => setEditProfileStatus(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Display Picture Image URL</label>
              <input type="text" id="editProfileAvatarInput" placeholder="https://images.unsplash.com/..." value={editProfileAvatar} onChange={(e) => setEditProfileAvatar(e.target.value)} />
            </div>
            <button className="btn-3d btn-3d-primary" style={{ padding: '10px', fontSize: '0.85rem' }} onClick={saveProfileChanges}>Save Changes</button>
          </div>
        </div>
      </div>

      {/* DECORATED DYNAMIC PROMPT MODAL */}
      {customPrompt && (
        <div id="customPromptModal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <div className="decorated-prompt-box">
              <h4 style={{ color: customPrompt.titleColor || 'var(--tg-accent)', fontSize: '0.88rem', marginBottom: '6px' }}>{customPrompt.title}</h4>
              {customPrompt.message && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>{customPrompt.message}</p>}
              
              {customPrompt.type === 'textarea' && (
                <textarea
                  id="promptEditInput"
                  defaultValue={customPrompt.defaultValue || ''}
                  style={{ width: '100%', background: 'var(--tg-dark-panel)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '0.82rem' }}
                  rows={3}
                />
              )}
              {customPrompt.type === 'input' && (
                <input
                  type="text"
                  id="promptInviteTarget"
                  placeholder={customPrompt.placeholder || ''}
                  style={{ width: '100%', background: 'var(--tg-dark-panel)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '0.82rem', marginBottom: '10px' }}
                />
              )}
              {customPrompt.type === 'number' && (
                <input
                  type="number"
                  id="suspendHoursInput"
                  defaultValue={customPrompt.defaultValue || '24'}
                  style={{ width: '100%', background: 'var(--tg-dark-panel)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '0.82rem', marginBottom: '10px' }}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button className="btn-3d btn-3d-dark" onClick={() => setCustomPrompt(null)} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Cancel</button>
                <button
                  className="btn-3d btn-3d-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', background: customPrompt.confirmBg }}
                  onClick={() => {
                    let val;
                    if (customPrompt.type === 'textarea') val = document.getElementById('promptEditInput').value;
                    if (customPrompt.type === 'input') val = document.getElementById('promptInviteTarget').value;
                    if (customPrompt.type === 'number') val = document.getElementById('suspendHoursInput').value;
                    customPrompt.onConfirm(val);
                  }}
                >
                  {customPrompt.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
