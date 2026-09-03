import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

/* ============================================================
   LOCAL STORAGE SYSTEM (SYNC & OFFLINE PERSISTENCE)
   ============================================================ */
const LocalStore = {
  get: (key) => {
    try {
      const d = localStorage.getItem('tg_hub_' + key);
      return d ? JSON.parse(d) : null;
    } catch (e) {
      return null;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem('tg_hub_' + key, JSON.stringify(val));
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
  const [currentTabFilter, setCurrentTabFilter] = useState('all');
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
  const [editProfileStatus, setEditProfileStatus] = useState('Connected to Telegram Hub.');
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
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
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
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    if (isToday) return timeStr;
    if (isYesterday) return `Yesterday`;
    return dateStr;
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
    return `${formatDetailedTimestamp(startBlock)} (${formatTime(startBlock)} - ${formatTime(endBlock)})`;
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

  const fetchGroups = useCallback(async () => {
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
  }, []);

  const fetchMessages = useCallback(async (groupId) => {
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
  }, []);

  const setupRealtimeSubscriptions = useCallback(() => {
    const channel = supabaseClient
      .channel('public-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        if (payload.new) {
          const gId = payload.new.group_id;
          if (currentOpenGroupRef.current && gId === currentOpenGroupRef.current.id) {
            fetchMessages(gId);
          } else {
            setUnreadCounts(prev => {
              const newCounts = { ...prev, [gId]: (prev[gId] || 0) + 1 };
              LocalStore.set('unread', newCounts);
              return newCounts;
            });
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_groups' }, () => fetchGroups())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => fetchGroups())
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [fetchGroups, fetchMessages]);

  /* ============================================================
     INITIALIZATION & SYNC FROM LOCAL STORE & BACKEND
     ============================================================ */
  useEffect(() => {
    loadCachedState();
    verifySessionAndInitialize();
  }, []);

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
      setEditProfileStatus(cachedProfile.status_message || 'Connected to Telegram Hub.');
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
      status_message: 'Connected to Telegram Hub.',
      is_global_admin: false
    };

    setCurrentProfile(finalProfile);
    setEditProfileName(finalProfile.username || '');
    setEditProfileStatus(finalProfile.status_message || 'Connected to Telegram Hub.');
    setEditProfileAvatar(finalProfile.avatar_url || '');
    LocalStore.set('profile', finalProfile);
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
    if (!memberCheck && !currentProfile?.is_global_admin && group.creator_id !== currentUser?.id) {
      openGroupAbout(groupId);
      return;
    }

    await fetchMessages(group.id);
    openModal('chatRoomModal');
  }

  async function sendChatMessage() {
    const content = chatInputText.trim();
    if (!content || !currentOpenGroup || !currentUser) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    // Local optimistic update & store sync
    const tempMsg = {
      id: Date.now(),
      group_id: currentOpenGroup.id,
      sender_id: currentUser.id,
      content: content,
      message_type: 'text',
      created_at: new Date().toISOString(),
      profiles: { username: currentProfile?.username || 'You', avatar_url: currentProfile?.avatar_url }
    };

    const localMsgKey = 'messages_' + currentOpenGroup.id;
    const currentCached = LocalStore.get(localMsgKey) || [];
    const updatedLocal = [...currentCached, tempMsg];
    LocalStore.set(localMsgKey, updatedLocal);
    setMessages(updatedLocal);
    setChatInputText('');

    const { error } = await supabaseClient
      .from('messages')
      .insert([{
        group_id: currentOpenGroup.id,
        sender_id: currentUser.id,
        content: content,
        message_type: 'text'
      }]);

    if (!error) {
      fetchMessages(currentOpenGroup.id);
    } else {
      showErrorBanner("Sending Failed", "Unable to sync message to server.");
    }
  }

  async function deleteMessage(msgId) {
    const localMsgKey = 'messages_' + currentOpenGroup?.id;
    const currentCached = LocalStore.get(localMsgKey) || [];
    const updatedLocal = currentCached.filter(m => m.id !== msgId);
    LocalStore.set(localMsgKey, updatedLocal);
    setMessages(updatedLocal);

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
          <span key={index} style={{ color: '#6ab2f2', fontWeight: 500 }}>
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
        if (target && target.trim() !== "") {
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

  /* ============================================================
     TAB FILTERING & METRICS COMPUTATION (TELEGRAM-EXACT)
     ============================================================ */
  const countAll = groupsData.filter(g => (g.is_approved || g.creator_id === currentUser?.id) && !archivedGroupIds.includes(g.id)).length;
  const countMyGroups = groupsData.filter(g => isMember(g, currentUser?.id) && !archivedGroupIds.includes(g.id)).length;
  const countPMe = groupsData.filter(g => g.type === 'P-ME' || g.name.toLowerCase().includes('p-me')).length || 52;
  const countSureOdds = groupsData.filter(g => g.type === 'Sure-Odds' || g.name.toLowerCase().includes('sure')).length || 24;
  const countForex = groupsData.filter(g => g.type === 'Forex' || g.name.toLowerCase().includes('forex')).length || 17;
  const countArchived = archivedGroupIds.length || 24;

  const getFilteredGroups = () => {
    let filtered = [];
    if (currentTabFilter === 'all') {
      filtered = groupsData.filter(g => (g.is_approved || g.creator_id === currentUser?.id) && !archivedGroupIds.includes(g.id));
    } else if (currentTabFilter === 'my_groups') {
      filtered = groupsData.filter(g => isMember(g, currentUser?.id) && !archivedGroupIds.includes(g.id));
    } else if (currentTabFilter === 'p_me') {
      filtered = groupsData.filter(g => (g.type === 'P-ME' || g.name.toLowerCase().includes('p-me')) && !archivedGroupIds.includes(g.id));
    } else if (currentTabFilter === 'sure_odds') {
      filtered = groupsData.filter(g => (g.type === 'Sure-Odds' || g.name.toLowerCase().includes('sure')) && !archivedGroupIds.includes(g.id));
    } else if (currentTabFilter === 'forex') {
      filtered = groupsData.filter(g => (g.type === 'Forex' || g.name.toLowerCase().includes('forex')) && !archivedGroupIds.includes(g.id));
    } else if (currentTabFilter === 'cld') {
      filtered = groupsData.filter(g => (g.type === 'CLD' || g.name.toLowerCase().includes('cld')) && !archivedGroupIds.includes(g.id));
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
      <style>{`
        :root{
          --tg-bg:#0f1721;
          --tg-surface:#17212b;
          --tg-card:#1e2c3a;
          --tg-hover:#243447;
          --tg-accent:#2AABEE;
          --tg-accent-hover:#229ED9;
          --tg-text-main:#f5f5f5;
          --tg-text-sub:#7f91a4;
          --tg-badge-bg:#2b5278;
          --tg-destructive:#e17076;
          --tg-online:#00c853;
          --tg-pinned-icon:#6ab2f2;
          --tg-border:rgba(255, 255, 255, 0.06);
        }
        *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;scrollbar-width:thin;scrollbar-color:var(--tg-accent) var(--tg-bg)}
        body{background-color:var(--tg-bg);color:var(--tg-text-main);height:100vh;overflow:hidden;display:flex;justify-content:center;align-items:center}
        
        .app-container{display:flex;flex-direction:column;width:100vw;height:100vh;max-width:540px;position:relative;background:var(--tg-bg);border-left:1px solid var(--tg-border);border-right:1px solid var(--tg-border)}
        .workspace{flex:1;display:flex;flex-direction:column;height:100vh;overflow:hidden;position:relative}
        
        /* TELEGRAM TOP HEADER STYLING */
        .tg-top-bar{height:56px;background:var(--tg-surface);display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--tg-border);z-index:90}
        .tg-top-left{display:flex;align-items:center;gap:12px}
        .tg-avatar-head{width:36px;height:36px;border-radius:50%;overflow:hidden;cursor:pointer;position:relative}
        .tg-avatar-head img{width:100%;height:100%;object-fit:cover}
        .tg-brand-name{font-size:1.22rem;font-weight:700;color:#fff;letter-spacing:0.2px}
        .tg-top-right{display:flex;align-items:center;gap:18px;color:var(--tg-text-sub)}
        .tg-icon-btn{background:none;border:none;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;border-radius:50%;transition:background 0.2s}
        .tg-icon-btn:hover{color:#fff;background:rgba(255, 255, 255, 0.05)}

        /* SEARCH BAR */
        .tg-search-wrapper{padding:8px 12px;background:var(--tg-bg)}
        .tg-search-bar{display:flex;align-items:center;background:var(--tg-surface);border-radius:22px;padding:6px 14px;gap:10px;border:1px solid rgba(255, 255, 255, 0.03)}
        .tg-search-bar svg{fill:none;stroke:var(--tg-text-sub);stroke-width:2;width:18px;height:18px}
        .tg-search-bar input{background:transparent;border:none;outline:none;color:#fff;font-size:0.92rem;width:100%}
        .tg-search-bar input::placeholder{color:var(--tg-text-sub)}

        /* HORIZONTAL PILL TABS WITH COUNTERS */
        .tg-tabs-container{display:flex;align-items:center;gap:8px;padding:6px 12px 12px 12px;overflow-x:auto;white-space:nowrap;background:var(--tg-bg);scrollbar-width:none}
        .tg-tabs-container::-webkit-scrollbar{display:none}
        .tg-tab-pill{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:18px;background:var(--tg-surface);color:var(--tg-text-sub);font-size:0.82rem;font-weight:600;cursor:pointer;transition:all 0.2s ease;border:1px solid transparent}
        .tg-tab-pill:hover{color:#fff;background:var(--tg-hover)}
        .tg-tab-pill.active{background:var(--tg-accent);color:#fff}
        .tg-tab-count{background:rgba(255, 255, 255, 0.2);color:#fff;font-size:0.7rem;font-weight:700;padding:1px 7px;border-radius:10px}
        .tg-tab-pill.active .tg-tab-count{background:#fff;color:var(--tg-accent)}

        /* ANNOUNCEMENT BANNER CARD */
        .tg-announcement-card{margin:0 12px 10px 12px;background:var(--tg-surface);border-radius:12px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;border:1px solid var(--tg-border)}
        .tg-announcement-left{display:flex;flex-direction:column;gap:2px}
        .tg-announcement-title{font-size:0.9rem;font-weight:700;color:#fff;display:flex;align-items:center;gap:6px}
        .tg-announcement-sub{font-size:0.76rem;color:var(--tg-text-sub)}
        .tg-announcement-close{background:none;border:none;color:var(--tg-text-sub);cursor:pointer;font-size:1.1rem}

        /* MAIN LIST CONTENT */
        .main-content{flex:1;overflow-y:auto;display:flex;flex-direction:column}
        .view-section{display:none;flex-direction:column;animation:fadeIn 0.25s ease forwards}
        .view-section.active{display:flex}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}

        /* ARCHIVED CHATS ENTRY ITEM */
        .tg-archived-item{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--tg-bg);cursor:pointer;border-bottom:1px solid rgba(255, 255, 255, 0.03);transition:background 0.2s}
        .tg-archived-item:hover{background:var(--tg-surface)}
        .tg-archived-left{display:flex;align-items:center;gap:14px}
        .tg-archived-icon{width:48px;height:48px;border-radius:50%;background:#243447;display:flex;align-items:center;justify-content:center;color:#fff}
        .tg-archived-info h4{font-size:0.95rem;color:#fff;font-weight:600;margin-bottom:2px}
        .tg-archived-info p{font-size:0.78rem;color:var(--tg-text-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px}
        .tg-archived-badge{background:var(--tg-surface);color:var(--tg-text-sub);border:1px solid var(--tg-border);font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:12px}

        /* CHAT LIST ITEM FORMAT (SCREENSHOT MATCH) */
        .tg-chat-item{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;cursor:pointer;background:var(--tg-bg);border-bottom:1px solid rgba(255, 255, 255, 0.02);transition:background 0.15s;user-select:none}
        .tg-chat-item:hover{background:var(--tg-surface)}
        .tg-chat-left{display:flex;align-items:center;gap:12px;min-width:0;flex:1}
        .tg-avatar-wrapper{position:relative;width:50px;height:50px;flex-shrink:0}
        .tg-avatar{width:100%;height:100%;border-radius:50%;overflow:hidden;background:linear-gradient(135deg, #2aabee, #229ed9);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:1.1rem}
        .tg-avatar img{width:100%;height:100%;object-fit:cover}
        .tg-avatar-badge{position:absolute;bottom:0;right:0;width:14px;height:14px;border-radius:50%;background:var(--tg-online);border:2px solid var(--tg-bg)}
        
        .tg-chat-details{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;padding-right:8px}
        .tg-chat-title-row{display:flex;align-items:center;gap:6px}
        .tg-chat-name{font-size:0.95rem;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tg-verified-check{color:var(--tg-accent);font-size:0.82rem}
        .tg-pin-icon{color:var(--tg-text-sub);font-size:0.8rem;margin-left:auto}

        .tg-chat-msg-row{display:flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--tg-text-sub)}
        .tg-chat-msg-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}

        .tg-chat-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
        .tg-chat-time{font-size:0.74rem;color:var(--tg-text-sub)}
        .tg-chat-time.pinned{color:var(--tg-pinned-icon)}
        .tg-unread-count{background:var(--tg-accent);color:#fff;font-size:0.7rem;font-weight:700;padding:2px 7px;border-radius:12px;min-width:18px;text-align:center}
        .tg-open-btn{background:var(--tg-accent);color:#fff;border:none;padding:4px 14px;border-radius:14px;font-size:0.78rem;font-weight:600;cursor:pointer}

        /* SIDE NAVIGATION MENU DRAWER */
        .side-nav-drawer{position:fixed;top:0;left:-100vw;width:280px;height:100vh;background:var(--tg-surface);border-right:1px solid var(--tg-border);z-index:200;transition:left 0.3s cubic-bezier(0.16, 1, 0.3, 1);padding:20px 16px;display:flex;flex-direction:column;gap:12px;box-shadow:10px 0 30px rgba(0,0,0,0.5)}
        .side-nav-drawer.open{left:0}
        .side-nav-item{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:10px;color:var(--tg-text-main);cursor:pointer;transition:all 0.2s;font-size:0.9rem;font-weight:500}
        .side-nav-item:hover,.side-nav-item.active{color:var(--tg-accent);background:rgba(42, 171, 238, 0.1)}

        /* FLOATING CHAT ROOM OVERLAY */
        .chat-room-container{position:fixed;inset:0;left:50%;transform:translateX(-50%);width:min(100%, 540px);height:100dvh;display:flex;flex-direction:column;background:var(--tg-bg);z-index:105;overflow:hidden}
        .chat-room-header{height:56px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;background:var(--tg-surface);border-bottom:1px solid var(--tg-border)}
        .chat-room-title-area{display:flex;align-items:center;gap:12px;cursor:pointer}
        .chat-room-title h3{color:#fff;font-size:0.95rem;font-weight:600}
        .chat-room-title span{color:var(--tg-online);font-size:0.72rem}
        .chat-messages-area{flex:1;padding:16px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;background:#0e1621}
        
        .chat-time-divider{text-align:center;margin:8px 0;font-size:0.7rem;color:var(--tg-text-sub);background:rgba(0,0,0,0.3);padding:2px 10px;border-radius:10px;align-self:center}
        .message-bubble{max-width:80%;padding:8px 12px;border-radius:12px;font-size:0.88rem;line-height:1.4;word-break:break-word}
        .message-bubble.incoming{align-self:flex-start;background:var(--tg-surface);color:#fff;border-bottom-left-radius:2px}
        .message-bubble.outgoing{align-self:flex-end;background:#2b5278;color:#fff;border-bottom-right-radius:2px}
        .message-sender{font-size:0.72rem;color:var(--tg-accent);font-weight:bold;margin-bottom:2px}

        /* FLOATING CHAT INPUT BAR */
        .chat-input-floating-wrapper{padding:10px 12px;background:var(--tg-surface);border-top:1px solid var(--tg-border)}
        .chat-input-bar{display:flex;align-items:center;gap:10px}
        .chat-input-bar textarea{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:0.9rem;resize:none;max-height:100px}
        .voice-btn,.send-btn{background:none;border:none;color:var(--tg-accent);cursor:pointer;display:flex;align-items:center;justify-content:center}
        .voice-btn.listening{color:var(--tg-destructive);animation:pulseMic 1.5s infinite}

        /* MODALS & OVERLAYS */
        .overlay-screen{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0, 0, 0, 0.75);backdrop-filter:blur(6px);z-index:300;display:none;align-items:center;justify-content:center;padding:20px}
        .overlay-screen.active{display:flex}
        .modal-box{background:var(--tg-surface);border:1px solid var(--tg-border);border-radius:16px;width:100%;max-width:440px;max-height:85vh;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:16px}
        .modal-header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--tg-border);padding-bottom:12px}
        .modal-header h3{color:#fff;font-size:1.05rem}
        .close-modal-btn{background:none;border:none;color:var(--tg-text-sub);font-size:1.5rem;cursor:pointer}

        .form-group{display:flex;flex-direction:column;gap:6px}
        .form-group label{font-size:0.8rem;color:var(--tg-text-sub);font-weight:600}
        .form-group input,.form-group textarea,.form-group select{background:var(--tg-bg);border:1px solid var(--tg-border);border-radius:8px;padding:10px;color:#fff;font-size:0.88rem;outline:none}
        .primary-action-btn{background:var(--tg-accent);border:none;color:#fff;font-weight:600;padding:12px;border-radius:8px;cursor:pointer;width:100%;font-size:0.9rem}
        .danger-action-btn{background:rgba(225, 112, 118, 0.15);border:1px solid var(--tg-destructive);color:var(--tg-destructive);font-weight:600;padding:10px;border-radius:8px;cursor:pointer;width:100%}

        /* ERROR BANNER */
        .error-notification-banner{display:none;background:rgba(225, 112, 118, 0.12);border:1px solid var(--tg-destructive);border-radius:10px;padding:10px 14px;margin:8px 12px;align-items:center;justify-content:space-between}
        .error-notification-banner.active{display:flex}
      `}</style>

      <div className="app-container">
        <main className="workspace">

          {/* SIDE NAVIGATION MENU DRAWER */}
          <div className={`side-nav-drawer ${isSideNavOpen ? 'open' : ''}`} id="sideNavDrawer">
            <div className="tg-avatar-head" style={{ width: 54, height: 54, marginBottom: 8 }} onClick={() => setActiveMainView('userHub')}>
              <img src={currentAvatar} alt="Profile" />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.05rem' }}>{currentProfile?.username || 'User Profile'}</h3>
            <p style={{ color: 'var(--tg-text-sub)', fontSize: '0.8rem', marginBottom: 12 }}>{currentProfile?.status_message || 'Telegram Hub'}</p>
            
            <div className={`side-nav-item ${activeMainView === 'chats' ? 'active' : ''}`} onClick={() => { setActiveMainView('chats'); toggleSideMenu(); }}>
              💬 All Chats
            </div>
            <div className={`side-nav-item ${activeMainView === 'predictions' ? 'active' : ''}`} onClick={() => { setActiveMainView('predictions'); toggleSideMenu(); }}>
              🔔 Notifications ({notifications.length})
            </div>
            <div className="side-nav-item" onClick={() => { openModal('createGroupModal'); toggleSideMenu(); }}>
              ➕ Create New Group
            </div>
            <div className="side-nav-item" onClick={() => { openModal('deleteRequestModal'); toggleSideMenu(); }}>
              🛡️ Group Governance
            </div>
            <div className={`side-nav-item ${activeMainView === 'userHub' ? 'active' : ''}`} onClick={() => { setActiveMainView('userHub'); toggleSideMenu(); }}>
              ⚙️ Settings & Profile
            </div>
            <div className="side-nav-item" onClick={() => navigateTo('dashboard')} style={{ color: 'var(--tg-destructive)', marginTop: 'auto' }}>
              🚪 Exit Hub
            </div>
          </div>

          {/* SECTION 1: Telegram Header Navigation */}
          <header className="tg-top-bar">
            <div className="tg-top-left">
              <div className="tg-avatar-head" onClick={toggleSideMenu} title="Open Menu">
                <img src={currentAvatar} alt="Profile" />
              </div>
              <div className="tg-brand-name">Telegram</div>
            </div>

            <div className="tg-top-right">
              <button className="tg-icon-btn" onClick={() => openModal('createGroupModal')} title="New Group">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button className="tg-icon-btn" onClick={() => openModal('groupOverviewModal')} title="Options">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
            </div>
          </header>

          {/* SECTION 2: Telegram Search Bar */}
          <div className="tg-search-wrapper">
            <div className="tg-search-bar">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                placeholder="Search Chats"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* SECTION 3: Telegram Horizontal Tab Filters */}
          <div className="tg-tabs-container">
            <div className={`tg-tab-pill ${currentTabFilter === 'all' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('all')}>
              All <span className="tg-tab-count">{countAll}</span>
            </div>
            <div className={`tg-tab-pill ${currentTabFilter === 'my_groups' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('my_groups')}>
              My Groups <span className="tg-tab-count">{countMyGroups}</span>
            </div>
            <div className={`tg-tab-pill ${currentTabFilter === 'p_me' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('p_me')}>
              P-ME 🤬 <span className="tg-tab-count">{countPMe}</span>
            </div>
            <div className={`tg-tab-pill ${currentTabFilter === 'sure_odds' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('sure_odds')}>
              SURE-ODDS ? <span className="tg-tab-count">{countSureOdds}</span>
            </div>
            <div className={`tg-tab-pill ${currentTabFilter === 'forex' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('forex')}>
              FOREX 💀 <span className="tg-tab-count">{countForex}</span>
            </div>
            <div className={`tg-tab-pill ${currentTabFilter === 'cld' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('cld')}>
              CLD
            </div>
          </div>

          {/* SECTION 4: Telegram Birthday / Announcement Banner */}
          <div className="tg-announcement-card">
            <div className="tg-announcement-left">
              <div className="tg-announcement-title">Add your birthday! 🎂</div>
              <div className="tg-announcement-sub">Let your contacts know when you're celebrating</div>
            </div>
            <button className="tg-announcement-close" onClick={(e) => e.target.closest('.tg-announcement-card').style.display = 'none'}>&times;</button>
          </div>

          {/* Error Banner */}
          <div className={`error-notification-banner ${errorBanner.active ? 'active' : ''}`}>
            <span style={{ fontSize: '0.8rem', color: '#fff' }}>{errorBanner.message}</span>
            <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={dismissErrorBanner}>&times;</button>
          </div>

          {/* Dynamic Main Views */}
          <div className="main-content">

            {/* VIEW 1: TELEGRAM CHATS LIST */}
            <div className={`view-section ${activeMainView === 'chats' ? 'active' : ''}`}>

              {/* ARCHIVED CHATS BUTTON ITEM */}
              {countArchived > 0 && (
                <div className="tg-archived-item" onClick={() => setCurrentTabFilter('archived')}>
                  <div className="tg-archived-left">
                    <div className="tg-archived-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                    </div>
                    <div className="tg-archived-info">
                      <h4>Archived Chats</h4>
                      <p>TelepostBot, PosterBot, Manybot, BET PLUG, DRAW MAFI...</p>
                    </div>
                  </div>
                  <div className="tg-archived-badge">{countArchived}</div>
                </div>
              )}

              {/* CHAT ITEMS LIST */}
              {filteredGroupsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--tg-text-sub)', fontSize: '0.85rem' }}>
                  No channels or chats found.
                </div>
              ) : (
                filteredGroupsList.map((g) => {
                  const unread = unreadCounts[g.id] || (g.unread_count || 0);
                  const isBot = g.is_bot || g.name.toLowerCase().includes('bot');
                  const isPinned = g.is_big_three || g.is_pinned;

                  return (
                    <div
                      className="tg-chat-item"
                      key={g.id}
                      onClick={() => openChatRoom(g.id)}
                      onMouseDown={(e) => startChatLongPress(e, g.id)}
                      onMouseUp={cancelChatLongPress}
                      onMouseLeave={cancelChatLongPress}
                      onTouchStart={(e) => startChatLongPress(e, g.id)}
                      onTouchEnd={cancelChatLongPress}
                    >
                      <div className="tg-chat-left">
                        <div className="tg-avatar-wrapper">
                          <div className="tg-avatar">
                            {g.avatar_url ? <img src={g.avatar_url} alt={g.name} /> : g.name.substring(0, 2).toUpperCase()}
                          </div>
                          {g.is_online && <div className="tg-avatar-badge" />}
                        </div>

                        <div className="tg-chat-details">
                          <div className="tg-chat-title-row">
                            <span className="tg-chat-name">{g.name}</span>
                            {g.is_verified && <span className="tg-verified-check">✔</span>}
                            {isPinned && <span className="tg-pin-icon">📌</span>}
                          </div>
                          <div className="tg-chat-msg-row">
                            <span className="tg-chat-msg-text">{g.description || 'No recent messages'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="tg-chat-right">
                        <span className={`tg-chat-time ${isPinned ? 'pinned' : ''}`}>
                          {formatDetailedTimestamp(g.created_at || new Date())}
                        </span>
                        {isBot ? (
                          <button className="tg-open-btn" onClick={(e) => { e.stopPropagation(); openChatRoom(g.id); }}>Open</button>
                        ) : unread > 0 ? (
                          <div className="tg-unread-badge">{unread}</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* VIEW 2: NOTIFICATIONS HUB */}
            <div className={`view-section ${activeMainView === 'predictions' ? 'active' : ''}`} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ color: '#fff', fontSize: '1rem' }}>Notifications History</h3>
                <button className="danger-action-btn" style={{ width: 'auto', padding: '4px 10px', fontSize: '0.75rem' }} onClick={promptClearAllNotifications}>Clear</button>
              </div>
              {notifications.length === 0 ? (
                <p style={{ color: 'var(--tg-text-sub)', fontSize: '0.8rem' }}>No recent notifications.</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} style={{ background: 'var(--tg-surface)', padding: 12, borderRadius: 10, marginBottom: 8, border: '1px solid var(--tg-border)' }}>
                    <h4 style={{ color: '#fff', fontSize: '0.88rem' }}>{n.title}</h4>
                    <p style={{ color: 'var(--tg-text-sub)', fontSize: '0.78rem', marginTop: 2 }}>{n.message}</p>
                    <span style={{ fontSize: '0.68rem', color: 'var(--tg-accent)', marginTop: 4, display: 'block' }}>{n.time}</span>
                  </div>
                ))
              )}
            </div>

            {/* VIEW 3: USER PROFILE */}
            <div className={`view-section ${activeMainView === 'userHub' ? 'active' : ''}`} style={{ padding: 16 }}>
              <div style={{ background: 'var(--tg-surface)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="tg-avatar-head" style={{ width: 60, height: 60 }}>
                  <img src={currentAvatar} alt="Avatar" />
                </div>
                <div>
                  <h3 style={{ color: '#fff' }}>{currentProfile?.username || 'User'}</h3>
                  <p style={{ color: 'var(--tg-text-sub)', fontSize: '0.8rem' }}>{currentProfile?.status_message}</p>
                </div>
              </div>
              <button className="primary-action-btn" style={{ marginTop: 16 }} onClick={() => openModal('editProfileModal')}>Edit Profile Settings</button>
            </div>

          </div>
        </main>
      </div>

      {/* MODAL: OPEN CHAT ROOM */}
      <div className={`overlay-screen ${modals.chatRoomModal ? 'active' : ''}`}>
        <div className="chat-room-container" ref={chatContainerRef}>
          <div className="chat-room-header">
            <div className="chat-room-title-area" onClick={() => openGroupAbout(currentOpenGroup?.id)}>
              <div className="tg-avatar-head" style={{ width: 38, height: 38 }}>
                {currentOpenGroup?.name?.substring(0, 2).toUpperCase()}
              </div>
              <div className="chat-room-title">
                <h3>{currentOpenGroup?.name || 'Telegram Group'}</h3>
                <span>online</span>
              </div>
            </div>
            <button className="close-modal-btn" onClick={() => closeModal('chatRoomModal')}>&times;</button>
          </div>

          <div className="chat-messages-area" ref={chatMessagesAreaRef}>
            {messages.map(m => {
              const isOwn = m.sender_id === currentUser?.id;
              return (
                <div key={m.id} className={`message-bubble ${isOwn ? 'outgoing' : 'incoming'}`}>
                  <div className="message-sender">{m.profiles?.username || 'User'}</div>
                  <p>{formatMentions(m.content)}</p>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: 4 }}>
                    {formatDetailedTimestamp(m.created_at)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="chat-input-floating-wrapper">
            <div className="chat-input-bar">
              <textarea
                placeholder="Message..."
                rows={1}
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              />
              <button className={`voice-btn ${isListening ? 'listening' : ''}`} onClick={toggleVoiceTyping}>🎤</button>
              <button className="send-btn" onClick={sendChatMessage}>➤</button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: CREATE GROUP */}
      <div className={`overlay-screen ${modals.createGroupModal ? 'active' : ''}`}>
        <div className="modal-box">
          <div className="modal-header">
            <h3>New Group</h3>
            <button className="close-modal-btn" onClick={() => closeModal('createGroupModal')}>&times;</button>
          </div>
          <div className="form-group">
            <label>Group Name</label>
            <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Enter group name" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Group bio or details" />
          </div>
          <button className="primary-action-btn" onClick={createNewGroupSubmit}>Create Channel</button>
        </div>
      </div>

      {/* MODAL: EDIT PROFILE */}
      <div className={`overlay-screen ${modals.editProfileModal ? 'active' : ''}`}>
        <div className="modal-box">
          <div className="modal-header">
            <h3>Edit Profile</h3>
            <button className="close-modal-btn" onClick={() => closeModal('editProfileModal')}>&times;</button>
          </div>
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={editProfileName} onChange={(e) => setEditProfileName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <input type="text" value={editProfileStatus} onChange={(e) => setEditProfileStatus(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Avatar URL</label>
            <input type="text" value={editProfileAvatar} onChange={(e) => setEditProfileAvatar(e.target.value)} />
          </div>
          <button className="primary-action-btn" onClick={saveProfileChanges}>Save Changes</button>
        </div>
      </div>

      {/* PROMPT OVERLAY */}
      {customPrompt && (
        <div className="overlay-screen active">
          <div className="modal-box">
            <h4 style={{ color: customPrompt.titleColor || '#fff' }}>{customPrompt.title}</h4>
            <p style={{ color: 'var(--tg-text-sub)', fontSize: '0.85rem' }}>{customPrompt.message}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button className="primary-action-btn" style={{ background: 'transparent', border: '1px solid var(--tg-border)' }} onClick={() => setCustomPrompt(null)}>Cancel</button>
              <button className="primary-action-btn" style={{ background: customPrompt.confirmBg }} onClick={() => customPrompt.onConfirm()}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
