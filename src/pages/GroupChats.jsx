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
  const [currentTabFilter, setCurrentTabFilter] = useState('my_groups');
  const [activeMainView, setActiveMainView] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  
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
     VISUAL VIEWPORT HANDLER (MOBILE KEYPADS & FLOATING VIEWPORT)
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
     INITIALIZATION & SYNC
     ============================================================ */
  useEffect(() => {
    loadCachedState();
    verifySessionAndInitialize();

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
     HELPER METHODS & RESPONSIVE DIALS
     ============================================================ */
  function isMember(group, userId) {
    return group && group.group_members && group.group_members.some(m => m.user_id === userId);
  }

  function isGroupAdmin(group, userId) {
    if (currentProfile && currentProfile.is_global_admin) return true;
    const m = group && group.group_members && group.group_members.find(x => x.user_id === userId);
    return m && m.role === 'admin';
  }

  function startNotificationLongPress(e, notifId) {
    cancelNotificationLongPress();
    notifPressTimer.current = setTimeout(() => {
      confirmDeleteNotification(notifId);
    }, 1800); // Waiting period before showing confirmation prompt
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
    }, 1800); // Waiting period before showing confirmation prompt
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
      confirmBg: 'var(--tg-accent)',
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
    // Join group first prompt rules: Always display if user is joining for the first time
    if (!memberCheck && !currentProfile?.is_global_admin && group.creator_id !== currentUser?.id) {
      openGroupAbout(groupId);
      return;
    }

    await fetchMessages(group.id);
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
      confirmBg: 'var(--tg-accent)',
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
          <span key={index} className="solid-animated-tag tag-admin" style={{ fontSize: '0.75rem', padding: '1px 6px' }}>
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
      confirmBg: 'var(--tg-accent)',
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
    if (currentTabFilter === 'my_groups') {
      filtered = groupsData.filter(g => isMember(g, currentUser?.id) && !archivedGroupIds.includes(g.id));
    } else if (currentTabFilter === 'all') {
      filtered = groupsData.filter(g => (g.is_approved || g.creator_id === currentUser?.id) && !archivedGroupIds.includes(g.id));
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
  const pendingApprovalGroups = groupsData.filter(g => !g.is_approved);

  const joinedCount = groupsData.filter(g => isMember(g, currentUser?.id)).length;
  const createdCount = groupsData.filter(g => g.creator_id === currentUser?.id).length;

  const currentAvatar = currentProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  return (
    <>
      {/* GLOBAL CSS STYLES - PROFESSIONAL 9090 FUTURE WEB PAGE & TELEGRAM UI APPEARANCE */}
      <style>{`
        :root{
          --bg-deep:#0e1621;
          --bg-panel:rgba(23, 33, 43, 0.96);
          --bg-card:rgba(29, 43, 59, 0.92);
          --border-glow:rgba(51, 144, 236, 0.3);
          --border-glow-active:rgba(51, 144, 236, 0.9);
          --tg-accent:#3390ec;
          --tg-accent-hover:#2b7cd3;
          --tg-dark-card:#18222d;
          --tg-dark-panel:#17212b;
          --tg-destructive:#e17076;
          --tg-online:#4cd964;
          --text-main:#f5f5f5;
          --text-muted:#707c88;
        }
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,sans-serif;scrollbar-width:thin;scrollbar-color:var(--tg-accent) var(--bg-deep)}
        body{background-color:var(--bg-deep);color:var(--text-main);height:100vh;overflow:hidden;display:flex;justify-content:center;align-items:center;position:relative}
        .app-container{display:flex;flex-direction:column;width:100vw;height:100vh;max-width:1440px;position:relative;z-index:5;background:linear-gradient(135deg, #0e1621 0%, #080c10 100%)}
        .workspace{flex:1;display:flex;flex-direction:column;height:100vh;overflow:hidden;position:relative}
        
        /* Telegram Side Nav Drawer */
        .side-nav-drawer{position:absolute;top:65px;left:-100vw;width:100vw;height:calc(100% - 65px);background:var(--tg-dark-panel);border-right:1px solid rgba(255, 255, 255, 0.08);backdrop-filter:blur(20px);z-index:90;transition:left 0.35s cubic-bezier(0.16, 1, 0.3, 1);padding:24px 16px;display:flex;flex-direction:column;gap:12px;box-shadow:15px 0 30px rgba(0, 0, 0, 0.7)}
        .side-nav-drawer.open{left:0}
        .side-nav-item{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:10px;color:var(--text-main);border:1px solid transparent;background:rgba(255, 255, 255, 0.02);cursor:pointer;transition:all 0.25s;font-size:0.92rem;font-weight:500}
        .side-nav-item:hover,.side-nav-item.active{color:var(--tg-accent);border-color:rgba(51, 144, 236, 0.3);background:rgba(51, 144, 236, 0.1);box-shadow:0 0 15px rgba(51, 144, 236, 0.15)}
        
        /* Telegram Top Header */
        .top-header{height:65px;border-bottom:1px solid rgba(255, 255, 255, 0.08);display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:var(--tg-dark-panel);backdrop-filter:blur(15px);position:relative;z-index:95}
        .top-header-left{display:flex;align-items:center;gap:16px}
        .icon-action-btn{background:rgba(255, 255, 255, 0.05);border:1px solid rgba(255, 255, 255, 0.08);width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-main);transition:all 0.25s}
        .icon-action-btn:hover{border-color:var(--tg-accent);color:var(--tg-accent);background:rgba(51, 144, 236, 0.1);box-shadow:0 0 12px rgba(51, 144, 236, 0.3)}
        .brand-title-area h1{font-size:1.1rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#fff}
        .top-header-right{display:flex;align-items:center;gap:14px}
        .avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg, var(--tg-accent), #8774e1);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--tg-accent);box-shadow:0 0 10px rgba(51, 144, 236, 0.25);cursor:pointer}
        .avatar img{width:100%;height:100%;object-fit:cover}
        
        /* Action Bar */
        .action-bar-section{display:flex;align-items:center;justify-content:space-between;padding:16px 24px 10px 24px;gap:16px;background:var(--bg-deep)}
        .search-box{position:relative;flex:1;max-width:420px}
        .search-box input{width:100%;background:var(--tg-dark-card);border:1px solid rgba(255, 255, 255, 0.08);border-radius:20px;padding:10px 16px 10px 40px;color:var(--text-main);font-size:0.88rem;outline:none;transition:all 0.25s}
        .search-box input:focus{border-color:var(--tg-accent);box-shadow:0 0 15px rgba(51, 144, 236, 0.25)}
        .search-box svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:16px;height:16px;stroke:var(--text-muted);fill:none;stroke-width:2}
        .action-bar-right{display:flex;align-items:center;gap:12px}
        .filter-btn,.create-group-btn{background:var(--tg-dark-card);border:1px solid rgba(255, 255, 255, 0.08);color:var(--text-main);padding:9px 18px;border-radius:20px;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.25s}
        .filter-btn:hover{border-color:var(--tg-accent);color:var(--tg-accent);box-shadow:0 0 12px rgba(51, 144, 236, 0.25)}
        .create-group-btn{background:var(--tg-accent);border:none;color:#fff;font-weight:600;box-shadow:0 0 15px rgba(51, 144, 236, 0.4)}
        .create-group-btn:hover{background:var(--tg-accent-hover);box-shadow:0 0 25px rgba(51, 144, 236, 0.6);transform:translateY(-1px)}
        
        .main-content{flex:1;overflow-y:auto;padding:10px 24px 40px 24px;display:flex;flex-direction:column;gap:20px}
        .view-section{display:none;flex-direction:column;gap:20px;animation:fadeIn 0.3s ease forwards}
        .view-section.active{display:flex}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .section-title{font-size:0.8rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--tg-accent);margin-bottom:8px;margin-top:4px;font-weight:700}
        
        /* Pinned Grid (Solid Background Containers) */
        .pinned-grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:16px}
        .pinned-card{background:var(--tg-dark-card);border:1px solid rgba(255, 255, 255, 0.08);border-radius:14px;padding:18px;cursor:pointer;position:relative;overflow:hidden;transition:all 0.25s ease;box-shadow:0 4px 15px rgba(0, 0, 0, 0.4);display:flex;flex-direction:column}
        .pinned-card:hover{border-color:var(--tg-accent);transform:translateY(-3px);box-shadow:0 6px 25px rgba(51, 144, 236, 0.2)}
        .pinned-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .pinned-badge{color:var(--tg-accent);font-size:1.3rem}
        .pinned-card-icon{width:40px;height:40px;border-radius:10px;background:rgba(51, 144, 236, 0.12);border:1px solid rgba(51, 144, 236, 0.3);display:flex;align-items:center;justify-content:center;color:var(--tg-accent);font-weight:bold}
        .pinned-card-body{flex:1;display:flex;flex-direction:column}
        .pinned-card h3{font-size:0.98rem;margin-bottom:4px;color:#fff;font-weight:600}
        .pinned-card p{font-size:0.75rem;color:var(--text-muted);margin-bottom:12px}
        .pinned-card-footer{font-size:0.72rem;color:var(--tg-accent);display:flex;align-items:center;justify-content:space-between;font-weight:600}
        
        .section-divider-solid{height:1px;width:100%;margin:10px 0;background:rgba(255, 255, 255, 0.06)}
        
        /* Group Tabs */
        .group-tabs{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255, 255, 255, 0.08);padding-bottom:10px;margin-top:6px}
        .tab-buttons{display:flex;gap:10px}
        .tab-btn{background:var(--tg-dark-card);border:1px solid rgba(255, 255, 255, 0.06);color:var(--text-muted);font-size:0.8rem;font-weight:600;cursor:pointer;padding:8px 16px;border-radius:10px;letter-spacing:0.03em;outline:none;display:flex;align-items:center;justify-content:center;height:36px;transition:all 0.25s}
        .tab-btn:hover{border-color:rgba(51, 144, 236, 0.4);color:var(--text-main)}
        .tab-btn.active{color:#fff;background:var(--tg-accent);border-color:var(--tg-accent);box-shadow:0 0 15px rgba(51, 144, 236, 0.3)}

        /* Telegram Chat Room Container & Floating Input Bar */
        .chat-room-container{position:fixed;inset:0;left:50%;transform:translateX(-50%);width:min(100%, 920px);height:100dvh;max-height:none;display:flex;flex-direction:column;background:var(--bg-deep);border-left:1px solid rgba(255, 255, 255, 0.08);border-right:1px solid rgba(255, 255, 255, 0.08);overflow:hidden;z-index:105;box-shadow:0 0 50px rgba(0, 0, 0, 0.7)}
        .chat-room-header{position:relative;min-height:65px;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;background:var(--tg-dark-panel);border-bottom:1px solid rgba(255, 255, 255, 0.08);backdrop-filter:blur(20px);z-index:10}
        .chat-room-title-area{min-width:0;display:flex;align-items:center;gap:12px;cursor:pointer;user-select:none}
        .chat-room-title-area .chat-avatar{position:relative;width:42px;height:42px;flex:0 0 42px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg, var(--tg-accent), #50a7ea);color:#fff;font-weight:bold;border:1px solid rgba(255, 255, 255, 0.15)}
        .chat-room-title-area .chat-avatar::after{content:"";position:absolute;width:9px;height:9px;right:1px;bottom:1px;border-radius:50%;background:var(--tg-online);border:2px solid var(--tg-dark-panel)}
        .chat-room-title{min-width:0;display:flex;flex-direction:column;gap:2px}
        .chat-room-title h3{margin:0;color:#fff;font-size:0.95rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .chat-room-title span{color:var(--tg-online);font-size:0.72rem;white-space:nowrap}
        .chat-room-actions{display:flex;align-items:center;gap:4px;color:var(--text-muted)}
        .chat-room-actions button,.chat-room-actions svg{width:38px;height:38px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;color:inherit;border-radius:50%;cursor:pointer;transition:background 0.2s ease, color 0.2s ease}
        .chat-room-actions svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8}
        .chat-room-actions button:hover,.chat-room-actions svg:hover{color:#fff;background:rgba(255, 255, 255, 0.08)}
        
        .chat-messages-area{position:relative;flex:1;min-height:0;padding:16px clamp(12px, 3vw, 28px) 110px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;background:var(--bg-deep);scroll-behavior:smooth}
        .chat-time-divider{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;width:fit-content;margin:14px auto 10px;padding:4px 12px;color:var(--text-muted);font-size:0.7rem;font-weight:600;background:rgba(23, 33, 43, 0.85);border:1px solid rgba(255, 255, 255, 0.06);border-radius:10px;box-shadow:0 2px 8px rgba(0, 0, 0, 0.2)}
        
        /* Telegram Message Bubbles */
        .message-bubble{position:relative;z-index:1;width:fit-content;max-width:min(75%, 600px);padding:8px 12px 6px;color:#fff;font-size:0.9rem;line-height:1.45;border-radius:12px;box-shadow:0 2px 6px rgba(0, 0, 0, 0.25);word-wrap:break-word}
        .message-bubble.incoming{align-self:flex-start;background:var(--tg-dark-card);border-bottom-left-radius:3px;border:1px solid rgba(255, 255, 255, 0.05)}
        .message-bubble.outgoing{align-self:flex-end;background:#2b5278;border-bottom-right-radius:3px;border:1px solid rgba(51, 144, 236, 0.2)}
        .message-sender{margin-bottom:3px;color:var(--tg-accent);font-size:0.74rem;font-weight:700}
        .message-bubble.outgoing .message-sender{color:#73b9ff}
        
        /* Floating Flexible Chat Input Bar (Keyboard Adaptive) */
        .chat-input-floating-wrapper{position:absolute;left:0;right:0;bottom:0;width:100%;padding:10px clamp(10px, 3vw, 20px) calc(10px + env(safe-area-inset-bottom));background:linear-gradient(to top, var(--bg-deep) 85%, transparent);z-index:20;pointer-events:none}
        .chat-input-floating-wrapper>*{pointer-events:auto}
        .chat-input-bar{width:min(100%, 860px);margin:0 auto;display:flex;align-items:flex-end;gap:8px;padding:6px 10px;background:var(--tg-dark-panel);border:1px solid rgba(255, 255, 255, 0.08);border-radius:24px;box-shadow:0 8px 30px rgba(0, 0, 0, 0.45);backdrop-filter:blur(20px)}
        .chat-input-bar textarea{flex:1;width:100%;min-height:38px;max-height:130px;padding:8px 6px;background:transparent;border:none;outline:none;resize:none;color:#fff;font-family:inherit;font-size:0.9rem;line-height:1.4}
        .chat-input-bar textarea::placeholder{color:var(--text-muted)}
        
        .chat-tools-group{display:flex;align-items:center;gap:4px;margin-bottom:2px}
        .voice-btn,.send-btn{width:38px;height:38px;flex:0 0 38px;display:flex;align-items:center;justify-content:center;border:none;border-radius:50%;cursor:pointer;transition:all 0.2s ease}
        .voice-btn{background:rgba(255, 255, 255, 0.06);color:var(--text-muted)}
        .voice-btn:hover{background:rgba(255, 255, 255, 0.12);color:#fff}
        .voice-btn.listening{background:rgba(225, 112, 118, 0.2);color:var(--tg-destructive);border:1px solid var(--tg-destructive);animation:pulseMic 1.5s infinite}
        @keyframes pulseMic{0%{box-shadow:0 0 0 0 rgba(225, 112, 118, 0.4)}70%{box-shadow:0 0 0 10px rgba(225, 112, 118, 0)}100%{box-shadow:0 0 0 0 rgba(225, 112, 118, 0)}}
        
        .send-btn{background:var(--tg-accent);color:#fff;box-shadow:0 2px 10px rgba(51, 144, 236, 0.3)}
        .send-btn:hover{background:var(--tg-accent-hover);transform:scale(1.05);box-shadow:0 4px 15px rgba(51, 144, 236, 0.45)}
        .send-btn svg{width:16px;height:16px;fill:currentColor}

        /* Error Notification Banner */
        .error-notification-banner{display:none;background:rgba(225, 112, 118, 0.12);border:1px solid var(--tg-destructive);border-radius:12px;padding:14px 18px;margin-bottom:14px;align-items:center;justify-content:space-between;box-shadow:0 0 20px rgba(225, 112, 118, 0.25)}
        .error-notification-banner.active{display:flex}
        .error-content-wrapper{display:flex;align-items:center;gap:12px}
        .error-icon-box{width:32px;height:32px;background:rgba(225, 112, 118, 0.25);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--tg-destructive);font-weight:bold;flex-shrink:0}
        .error-text-area h4{font-size:0.85rem;color:#fff;margin-bottom:2px}
        .error-text-area p{font-size:0.75rem;color:var(--text-muted)}
        .error-dismiss-btn{background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer}
        .error-dismiss-btn:hover{color:#fff}
        
        /* Groups List */
        .group-list{display:flex;flex-direction:column;gap:8px}
        .group-item{background:var(--tg-dark-card);border:1px solid rgba(255, 255, 255, 0.05);border-radius:12px;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:all 0.2s ease;user-select:none}
        .group-item:hover{background:rgba(35, 52, 71, 0.95);border-color:rgba(51, 144, 236, 0.3);transform:translateX(4px)}
        .group-item-left{display:flex;align-items:center;gap:14px}
        .group-item-avatar{width:46px !important;height:46px !important;min-width:46px !important;min-height:46px !important;border-radius:50% !important;background:linear-gradient(135deg, var(--tg-accent), #6c5ce7);display:flex;align-items:center;justify-content:center;font-size:0.95rem;font-weight:700;color:#fff;overflow:hidden;flex-shrink:0;border:1px solid rgba(255, 255, 255, 0.15)}
        .group-item-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
        .group-item-info h4{font-size:0.92rem;color:#fff;margin-bottom:3px;font-weight:600}
        .group-item-info p{font-size:0.76rem;color:var(--text-muted)}
        .group-item-right{display:flex;align-items:center;gap:14px}
        .group-item-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
        .group-item-time{font-size:0.7rem;color:var(--text-muted)}
        .unread-badge{background:var(--tg-accent);color:#fff;font-size:0.68rem;font-weight:700;padding:2px 6px;border-radius:10px;box-shadow:0 0 8px rgba(51, 144, 236, 0.4)}

        /* Modals & Overlays */
        .overlay-screen{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0, 0, 0, 0.75);backdrop-filter:blur(10px);z-index:100;display:none;align-items:center;justify-content:center;padding:20px}
        .overlay-screen.active{display:flex}
        .modal-box{background:var(--tg-dark-panel);border:1px solid rgba(255, 255, 255, 0.1);border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0, 0, 0, 0.6);display:flex;flex-direction:column}
        .modal-header{padding:18px 22px;border-bottom:1px solid rgba(255, 255, 255, 0.08);display:flex;align-items:center;justify-content:space-between}
        .modal-header h3{font-size:1.1rem;color:#fff;letter-spacing:0.03em;font-weight:600}
        .close-modal-btn{background:none;border:none;color:var(--text-muted);font-size:2rem;cursor:pointer;line-height:1;transition:color 0.2s}
        .close-modal-btn:hover{color:#fff}
        .modal-body{padding:22px;display:flex;flex-direction:column;gap:18px}
        
        .decorated-prompt-box{background:var(--tg-dark-card);border:1px solid var(--tg-accent);border-radius:14px;padding:18px;box-shadow:0 0 25px rgba(51, 144, 236, 0.25);position:relative}
        .solid-animated-tag{display:inline-block;padding:3px 8px;border-radius:6px;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;color:#fff}
        .tag-admin{background:linear-gradient(135deg, #e17076, #d63031)}
        .tag-member{background:linear-gradient(135deg, var(--tg-accent), #0984e3)}
        .tag-approval{background:linear-gradient(135deg, #fdcb6e, #e17076);color:#111}
        
        .form-group{display:flex;flex-direction:column;gap:6px}
        .form-group label{font-size:0.78rem;color:var(--text-muted);font-weight:600}
        .form-group input[type="text"],.form-group textarea,.form-group select,.form-group input[type="number"]{background:var(--tg-dark-card);border:1px solid rgba(255, 255, 255, 0.08);border-radius:10px;padding:10px 14px;color:#fff;font-size:0.88rem;outline:none;transition:border-color 0.2s}
        .form-group input[type="text"]:focus,.form-group textarea:focus,.form-group select:focus,.form-group input[type="number"]:focus{border-color:var(--tg-accent)}
        
        .radio-options{display:flex;flex-direction:column,gap:8px}
        .radio-card{background:var(--tg-dark-card);border:1px solid rgba(255, 255, 255, 0.06);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all 0.2s}
        .radio-card:hover,.radio-card.selected{border-color:var(--tg-accent);background:rgba(51, 144, 236, 0.08)}
        
        .primary-action-btn{background:var(--tg-accent);border:none;color:#fff;font-weight:600;padding:12px;border-radius:10px;cursor:pointer;width:100%;font-size:0.92rem;box-shadow:0 4px 15px rgba(51, 144, 236, 0.3);transition:all 0.2s}
        .primary-action-btn:hover{background:var(--tg-accent-hover);box-shadow:0 6px 20px rgba(51, 144, 236, 0.45)}
        .danger-action-btn{background:rgba(225, 112, 118, 0.15);border:1px solid var(--tg-destructive);color:var(--tg-destructive);font-weight:600;padding:12px;border-radius:10px;cursor:pointer;width:100%;font-size:0.92rem;transition:all 0.2s}
        .danger-action-btn:hover{background:var(--tg-destructive);color:#fff;box-shadow:0 0 20px rgba(225, 112, 118, 0.5)}
        
        .predictions-container{display:flex;flex-direction:column;gap:12px}
        .notification-item-card{background:var(--tg-dark-card);border:1px solid rgba(255, 255, 255, 0.06);border-radius:12px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;user-select:none;cursor:pointer;transition:border-color 0.2s}
        .notification-item-card:hover{border-color:rgba(51, 144, 236, 0.3)}
        .notification-left-details{display:flex;align-items:center;gap:12px}
        .notification-icon-3d{width:38px;height:38px;border-radius:10px;background:rgba(51, 144, 236, 0.12);border:1px solid rgba(51, 144, 236, 0.3);display:flex;align-items:center;justify-content:center;color:var(--tg-accent);font-size:1rem;flex-shrink:0}
        .flex-row{display:flex;align-items:center;gap:12px}
      `}</style>

      <div className="app-container">
        <main className="workspace">

          {/* SIDE NAVIGATION MENU DRAWER */}
          <div className={`side-nav-drawer ${isSideNavOpen ? 'open' : ''}`} id="sideNavDrawer">
            <div className={`side-nav-item ${activeMainView === 'chats' ? 'active' : ''}`} onClick={() => { setActiveMainView('chats'); toggleSideMenu(); }}>
              <span></span> Group Chats
            </div>
            <div className={`side-nav-item ${activeMainView === 'predictions' ? 'active' : ''}`} onClick={() => { setActiveMainView('predictions'); toggleSideMenu(); }}>
              <span></span> Notifications
            </div>
            <div className="side-nav-item" onClick={() => { openModal('createGroupModal'); toggleSideMenu(); }}>
              <span></span> Create New Group
            </div>
            <div className="side-nav-item" onClick={() => { openModal('deleteRequestModal'); toggleSideMenu(); }}>
              <span></span> Group Approval
            </div>
            <div className={`side-nav-item ${activeMainView === 'userHub' ? 'active' : ''}`} onClick={() => { setActiveMainView('userHub'); toggleSideMenu(); }}>
              <span></span> User Profile
            </div>
            <div className="side-nav-item" onClick={() => navigateTo('dashboard')} style={{ borderColor: 'rgba(225,112,118,0.4)', color: 'var(--tg-destructive)' }}>
              <span></span> CLOSE PAGE
            </div>
          </div>

          {/* SECTION 1: Top Header Navigation */}
          <header className="top-header">
            <div className="top-header-left">
              <button className="icon-action-btn" title="Side Navigation Menu" onClick={toggleSideMenu}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="brand-title-area">
                <h1>Telegram Hub</h1>
              </div>
            </div>

            <div className="top-header-right">
              <div className="user-mini-profile" onClick={() => setActiveMainView('userHub')} title="User Profile">
                <div className="avatar" id="headerUserAvatar">
                  <img src={currentAvatar} alt="User" id="headerAvatarImg" />
                </div>
              </div>
              <button className="icon-action-btn" title="Group Description & Navigation" onClick={() => openModal('groupOverviewModal')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="6" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="18" r="2" />
                </svg>
              </button>
               <button className="icon-action-btn" title="Back to Dashboard" onClick={() => navigateTo('dashboard')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <button className="filter-btn" onClick={() => {}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filter
              </button>
              <button className="create-group-btn" onClick={() => openModal('createGroupModal')}>+ Create Group</button>
            </div>
          </div>

          {/* Error Notification Banner Prompt */}
          <div style={{ padding: '0 24px' }}>
            <div className={`error-notification-banner ${errorBanner.active ? 'active' : ''}`} id="errorNotificationBanner">
              <div className="error-content-wrapper">
                <div className="error-icon-box">!</div>
                <div className="error-text-area">
                  <h4 id="errorBannerTitle">{errorBanner.title || 'Connection Interrupted'}</h4>
                  <p id="errorBannerMessage">{errorBanner.message || 'An unexpected error occurred while connecting to the database.'}</p>
                </div>
              </div>
              <button className="error-dismiss-btn" onClick={dismissErrorBanner}>&times;</button>
            </div>
          </div>

          {/* Dynamic Main Views Container */}
          <div className="main-content" id="mainContentArea">

            {/* VIEW 1: CHATS LIST & PINNED */}
            <div className={`view-section ${activeMainView === 'chats' ? 'active' : ''}`} id="view-chats">

              {/* SECTION 3: Pinned Groups */}
              <div>
                <div className="section-title">📌 PINNED CHATS</div>
                <div className="pinned-grid" id="pinnedGroupsGrid">
                  {bigThreeGroups.map((g, index) => (
                    <div className="pinned-card" key={g.id} onClick={() => openChatRoom(g.id)}>
                      <div className="pinned-card-header">
                        <div className="pinned-card-icon">0{index + 1}</div>
                        <div className="pinned-badge">🟢</div>
                      </div>
                      <div className="section-divider-solid"></div>
                      <div className="pinned-card-body">
                        <h3>{g.name}</h3>
                        <p>{g.description || 'Pinned Channel'}</p>
                      </div>
                      <div className="section-divider-solid"></div>
                      <div className="pinned-card-footer">
                        <span>Open &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 4: Group Feed */}
              <div>
                <div className="group-tabs">
                  <div className="tab-buttons">
                    <button className={`tab-btn ${currentTabFilter === 'my_groups' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('my_groups')}>MY GROUPS</button>
                    <button className={`tab-btn ${currentTabFilter === 'all' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('all')}>ALL CHATS</button>
                    <button className={`tab-btn ${currentTabFilter === 'available' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('available')}>NOT JOINED</button>
                    <button className={`tab-btn ${currentTabFilter === 'archived' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('archived')}>ARCHIVED</button>
                  </div>
                </div>

                <div className="group-list" id="groupListContainer" style={{ marginTop: '12px' }}>
                  {filteredGroupsList.length === 0 ? (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '10px 0' }}>No groups available in this section.</p>
                  ) : (
                    filteredGroupsList.map(g => {
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
                                {g.name} {g.is_big_three ? <span style={{ color: 'var(--tg-accent)' }}>📌</span> : ''} {!g.is_approved ? <span className="solid-animated-tag tag-approval" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>Pending Approval</span> : ''}
                              </h4>
                              <p>{g.description || ''}</p>
                            </div>
                          </div>
                          <div className="group-item-right">
                            <div className="group-item-meta">
                              <div className="group-item-time">
                                {joined ? (
                                  <span className="solid-animated-tag tag-member" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>JOINED</span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>JOIN</span>
                                )}
                              </div>
                              {unread > 0 && <div className="unread-badge">{unread} unread</div>}
                            </div>
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
              <div style={{ background: 'var(--tg-dark-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="flex-row" style={{ gap: '18px' }}>
                  <div className="avatar" style={{ width: '64px', height: '64px', fontSize: '1.4rem' }} id="hubUserAvatarLarge">
                    <img src={currentAvatar} alt="User" id="hubAvatarImg" />
                  </div>
                  <div>
                    <h3 id="hubProfileName" style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '4px' }}>
                      {currentProfile ? currentProfile.username : 'Loading Profile...'}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }} id="hubProfileStatus">
                      {currentProfile ? currentProfile.status_message : 'Connected to Secure Matrix.'}
                    </p>
                  </div>
                </div>
                <button className="filter-btn" onClick={() => openModal('editProfileModal')}>Edit Identity</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
                <div className="pinned-card" onClick={() => { setCurrentTabFilter('my_groups'); setActiveMainView('chats'); }}>
                  <h3>Active Groups</h3>
                  <p>Manage your groups.</p>
                  <div className="pinned-card-footer"><span id="countJoined">{joinedCount}</span> <span>Open Channels &rarr;</span></div>
                </div>
                <div className="pinned-card" onClick={() => { setCurrentTabFilter('my_groups'); setActiveMainView('chats'); }}>
                  <h3>My Groups</h3>
                  <p>Groups you created.</p>
                  <div className="pinned-card-footer"><span id="countCreated">{createdCount}</span> <span>Manage Hubs &rarr;</span></div>
                </div>
              </div>
            </div>

            {/* VIEW 3: NOTIFICATIONS HUB */}
            <div className={`view-section ${activeMainView === 'predictions' ? 'active' : ''}`} id="view-predictions">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div className="section-title" style={{ margin: 0 }}>NOTIFICATIONS</div>
                <button className="danger-action-btn" style={{ width: 'auto', padding: '6px 14px', fontSize: '0.75rem' }} onClick={promptClearAllNotifications}>Clear Notifications</button>
              </div>
              <div className="predictions-container" id="localNotificationsList">
                {notifications.length === 0 ? (
                  <div className="notification-item-card">
                    <div className="notification-left-details">
                      <div className="notification-icon-3d">🔔</div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No recent updates available.</p>
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
                          <h4 style={{ fontSize: '0.88rem', color: '#fff' }}>{n.title}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.message}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--tg-accent)', flexShrink: 0 }}>{n.time}</span>
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
                <h4 id="activeChatTitle" style={{ color: '#fff', fontSize: '0.96rem' }}>
                  {currentOpenGroup ? currentOpenGroup.name : 'Telegram Channel'}
                </h4>
                <p id="activeChatMeta" style={{ fontSize: '0.72rem', color: 'var(--tg-online)' }}>online</p>
              </div>
            </div>
            <div className="chat-room-actions">
              <svg onClick={() => openGroupAbout(currentOpenGroup?.id)} viewBox="0 0 24 24" title="Group Info">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <svg onClick={() => closeModal('chatRoomModal')} viewBox="0 0 24 24" title="Close">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>

          <div className="chat-messages-area" id="chatMessagesArea" ref={chatMessagesAreaRef}>
            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', margin: '10px 0' }}>Secure end-to-end encrypted messaging channel</div>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '20px 0' }}>No messages yet. Start the conversation!</div>
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
                        <div className="message-sender">
                          {senderName} <span className="solid-animated-tag tag-member" style={{ fontSize: '0.55rem', padding: '1px 4px', marginLeft: '6px' }}>Member</span>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: '#fff', marginTop: '3px' }}>{formatMentions(m.content)}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px' }}>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            {canEdit && <span style={{ cursor: 'pointer', color: 'var(--tg-accent)', fontWeight: 600 }} onClick={() => editMessage(m.id, m.content)}>Edit</span>}
                            {canDelete && <span style={{ cursor: 'pointer', color: 'var(--tg-destructive)', fontWeight: 600 }} onClick={() => deleteMessage(m.id)}>Delete</span>}
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

          {/* FLOATING CHAT INPUT BAR WITH GOOGLE VOICE TYPING & PROFESSIONAL SEND BUTTON */}
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
              <div className="chat-tools-group">
                <button
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={toggleVoiceTyping}
                  title={isListening ? "Listening... Click to stop" : "Google Voice Typing"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
                <button className="send-btn" onClick={sendChatMessage} title="Send Message">
                  <svg viewBox="0 0 24 24">
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
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Mtl football hub group chat interface
            </p>
            <button className="primary-action-btn" onClick={() => navigateTo('dashboard')}>EXIT</button>
          </div>
        </div>
      </div>

      {/* MODAL: GROUP ABOUT & JOIN PROMPT (Always show when joining for the first time, hide after joining) */}
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
                    <div className="avatar" style={{ width: '75px', height: '75px', fontSize: '1.8rem', borderColor: 'var(--tg-accent)' }}>
                      {group.name.substring(0, 2).toUpperCase()}
                    </div>
                    <h3 style={{ color: '#fff', fontSize: '1.15rem' }}>{group.name}</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{group.description || ''}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--tg-accent)' }}>Type: {group.type} | Created: {formatDetailedTimestamp(group.created_at)}</p>
                    
                    {/* Join Group First Prompt */}
                    <div style={{ background: 'rgba(51, 144, 236, 0.1)', border: '1px solid rgba(51, 144, 236, 0.3)', padding: '12px', borderRadius: '10px', width: '100%' }}>
                      <p style={{ fontSize: '0.78rem', color: '#fff', marginBottom: '8px' }}>You must join this group first before viewing messages or participating.</p>
                      <button className="primary-action-btn" onClick={() => joinGroup(group.id)}>Join Group Now</button>
                    </div>
                  </>
                );
              } else {
                return (
                  <>
                    <div className="avatar" style={{ width: '75px', height: '75px', fontSize: '1.8rem', borderColor: 'var(--tg-accent)' }}>
                      {group.name.substring(0, 2).toUpperCase()}
                    </div>
                    <h3 style={{ color: '#fff', fontSize: '1.15rem' }}>{group.name}</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{group.description || ''}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--tg-accent)' }}>Date Created: {formatDetailedTimestamp(group.created_at)} | Access: {group.type}</p>

                    <div style={{ width: '100%', textAlign: 'left', background: 'var(--tg-dark-card)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ color: 'var(--tg-accent)', fontSize: '0.78rem', textTransform: 'uppercase' }}>Active Members ({groupAboutMembers.length})</h4>
                        {isAdminUser && <button className="solid-animated-tag tag-admin" style={{ cursor: 'pointer', border: 'none' }} onClick={() => inviteMember(group.id)}>+ Invite Member</button>}
                      </div>
                      <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {groupAboutMembers.map(m => (
                          <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '8px' }}>
                            <span>
                              {m.profiles?.username || 'User'} <span className={`solid-animated-tag ${m.role === 'admin' ? 'tag-admin' : 'tag-member'}`} style={{ fontSize: '0.55rem', padding: '1px 4px' }}>{m.role}</span>
                            </span>
                            {isAdminUser && m.user_id !== currentUser?.id && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {m.role === 'admin' ? (
                                  <button style={{ background: 'none', border: '1px solid var(--tg-destructive)', color: 'var(--tg-destructive)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer' }} onClick={() => demoteAdmin(group.id, m.user_id)}>Demote</button>
                                ) : (
                                  <button style={{ background: 'none', border: '1px solid var(--tg-accent)', color: 'var(--tg-accent)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer' }} onClick={() => promoteUser(group.id, m.user_id)}>Promote Admin</button>
                                )}
                                <button style={{ background: 'none', border: '1px solid var(--tg-destructive)', color: 'var(--tg-destructive)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer' }} onClick={() => suspendMember(group.id, m.user_id)}>Suspend</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                      <button className="primary-action-btn" onClick={() => exitGroup(group.id)}>Exit Group</button>
                      {(group.creator_id === currentUser?.id || currentProfile?.is_global_admin) && (
                        <button className="danger-action-btn" onClick={() => deleteGroup(group.id)}>Delete Group</button>
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
                    <h4 style={{ fontSize: '0.88rem', color: '#fff' }}>Public Listing</h4>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Visible in public directory after admin approval</p>
                  </div>
                </div>
                <div className={`radio-card ${selectedNewGroupType === 'Private' ? 'selected' : ''}`} onClick={() => setSelectedNewGroupType('Private')}>
                  <input type="radio" name="gtype" checked={selectedNewGroupType === 'Private'} onChange={() => setSelectedNewGroupType('Private')} id="radioPrivate" />
                  <div>
                    <h4 style={{ fontSize: '0.88rem', color: '#fff' }}>Private Group</h4>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Invite-only access</p>
                  </div>
                </div>
              </div>
            </div>
            <button className="primary-action-btn" onClick={createNewGroupSubmit}>Create Group</button>
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
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(51,144,236,0.15)', border: '1px solid var(--tg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tg-accent)' }}>
              🛡️
            </div>
            <h4 style={{ color: '#fff' }}>Admin Group Approval</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>New groups require admin authorization before publishing to public feeds.</p>

            <div id="adminApprovalList" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {pendingApprovalGroups.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No groups currently pending approval.</p>
              ) : (
                pendingApprovalGroups.map(g => {
                  const creatorName = g.creator_name || g.creator_id || 'USER';
                  return (
                    <div key={g.id} style={{ background: 'var(--tg-dark-card)', border: '1px solid rgba(255,255,255,0.06)', padding: '12px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ color: '#fff', fontSize: '0.85rem' }}>{g.name}</h4>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Created by {creatorName}</p>
                      </div>
                      {currentProfile?.is_global_admin ? (
                        <button className="primary-action-btn" style={{ width: 'auto', padding: '6px 14px', fontSize: '0.75rem' }} onClick={() => approveGroup(g.id)}>Approve</button>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--tg-accent)' }}>Awaiting Admin Approval</span>
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
            <h3>Edit User Identity & Profile Picture</h3>
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
              <input type="text" id="editProfileAvatarInput" placeholder="https://images.unsplash.com/... or image link" value={editProfileAvatar} onChange={(e) => setEditProfileAvatar(e.target.value)} />
            </div>
            <button className="primary-action-btn" onClick={saveProfileChanges}>Save Changes</button>
          </div>
        </div>
      </div>

      {/* DECORATED DYNAMIC PROMPT MODAL */}
      {customPrompt && (
        <div id="customPromptModal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '440px' }}>
            <div className="decorated-prompt-box">
              <h4 style={{ color: customPrompt.titleColor || 'var(--tg-accent)', fontSize: '0.92rem', marginBottom: '8px' }}>{customPrompt.title}</h4>
              {customPrompt.message && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{customPrompt.message}</p>}
              
              {customPrompt.type === 'textarea' && (
                <textarea
                  id="promptEditInput"
                  defaultValue={customPrompt.defaultValue || ''}
                  style={{ width: '100%', background: 'var(--tg-dark-panel)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '0.88rem' }}
                  rows={3}
                />
              )}
              {customPrompt.type === 'input' && (
                <input
                  type="text"
                  id="promptInviteTarget"
                  placeholder={customPrompt.placeholder || ''}
                  style={{ width: '100%', background: 'var(--tg-dark-panel)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '0.88rem', marginBottom: '12px' }}
                />
              )}
              {customPrompt.type === 'number' && (
                <input
                  type="number"
                  id="suspendHoursInput"
                  defaultValue={customPrompt.defaultValue || '24'}
                  style={{ width: '100%', background: 'var(--tg-dark-panel)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '0.88rem', marginBottom: '12px' }}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button onClick={() => setCustomPrompt(null)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button
                  style={{ background: customPrompt.confirmBg || 'var(--tg-accent)', border: 'none', color: customPrompt.confirmColor || '#fff', fontWeight: 'bold', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer' }}
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
