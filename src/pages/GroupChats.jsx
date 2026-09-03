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
  const [editProfileStatus, setEditProfileStatus] = useState('Connected to Local Server.');
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

  useEffect(() => {
    currentOpenGroupRef.current = currentOpenGroup;
  }, [currentOpenGroup]);

  const openModal = (modalName) => setModals(prev => ({ ...prev, [modalName]: true }));
  const closeModal = (modalName) => setModals(prev => ({ ...prev, [modalName]: false }));
  const toggleSideMenu = () => setIsSideNavOpen(prev => !prev);

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
     VISUAL VIEWPORT HANDLER (MOBILE KEYPADS)
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
      setEditProfileStatus(cachedProfile.status_message || 'Connected to Local Server.');
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
      status_message: 'Connected to Local Server.',
      is_global_admin: false
    };

    setCurrentProfile(finalProfile);
    setEditProfileName(finalProfile.username || '');
    setEditProfileStatus(finalProfile.status_message || 'Connected to Local Server.');
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

  function startNotificationLongPress(e, notifId) {
    cancelNotificationLongPress();
    notifPressTimer.current = setTimeout(() => {
      confirmDeleteNotification(notifId);
    }, 1500); // Increased wait time for responsiveness confirmation prompt
  }

  function cancelNotificationLongPress() {
    if (notifPressTimer.current) clearTimeout(notifPressTimer.current);
  }

  function confirmDeleteNotification(notifId) {
    setCustomPrompt({
      title: 'DELETE NOTIFICATION',
      titleColor: '#ff007f',
      message: 'Are you sure you want to remove this notification?',
      confirmText: 'Delete',
      confirmBg: '#ff007f',
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
      titleColor: '#ff007f',
      message: 'Are you sure you want to clear all notifications?',
      confirmText: 'Clear All',
      confirmBg: '#ff007f',
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
    }, 1500); // Increased wait time for responsiveness confirmation prompt
  }

  function cancelChatLongPress() {
    if (chatPressTimer.current) clearTimeout(chatPressTimer.current);
  }

  function confirmArchiveChat(groupId) {
    const isArchived = archivedGroupIds.includes(groupId);
    const actionText = isArchived ? "unarchive" : "archive and hide";
    setCustomPrompt({
      title: isArchived ? 'UNARCHIVE CHAT' : 'ARCHIVE CHAT',
      titleColor: '#00f3ff',
      message: `Are you sure you want to ${actionText} this chat?`,
      confirmText: 'Confirm',
      confirmBg: '#00f3ff',
      confirmColor: '#121212',
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
     GOOGLE VOICE TYPING FUNCTIONALITY
     ============================================================ */
  function handleVoiceTyping() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showErrorBanner("Voice Typing Not Supported", "Your browser does not support Speech Recognition API.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      setChatInputText(prev => prev + ' ' + transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
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
      titleColor: '#00f3ff',
      defaultValue: oldContent,
      confirmText: 'Save Changes',
      confirmBg: '#00f3ff',
      confirmColor: '#121212',
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
      titleColor: '#00f3ff',
      message: `Invite users to join ${groupName} via Email or Username:`,
      placeholder: 'Enter username or email address...',
      confirmText: 'Send Invite',
      confirmBg: '#00f3ff',
      confirmColor: '#121212',
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
      titleColor: '#ff007f',
      message: 'Enter suspension duration in hours:',
      defaultValue: '24',
      confirmText: 'Suspend',
      confirmBg: '#ff007f',
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
      {/* GLOBAL CSS STYLES - 1990s Professional Solid Web Page Framework */}
      <style>{`
        :root{--bg-deep:#000080;--bg-panel:#c0c0c0;--bg-card:#e0e0e0;--border-glow:#ffffff;--border-glow-active:#000080;--neon-cyan:#000080;--neon-purple:#800080;--neon-blue:#0000ff;--neon-pink:#ff0000;--text-main:#000000;--text-muted:#404040}
        *{box-sizing:border-box;margin:0;padding:0;font-family:'MS Sans Serif',Tahoma,sans-serif;scrollbar-width:thin}
        body{background-color:var(--bg-deep);color:var(--text-main);height:100vh;overflow:hidden;display:flex;justify-content:center;align-items:center;position:relative}
        .app-container{display:flex;flex-direction:column;width:100vw;height:100vh;max-width:1440px;position:relative;z-index:5;background:var(--bg-panel);border:3px solid #dfdfdf;box-shadow:inset -2px -2px 0px #0a0a0a, inset 2px 2px 0px #ffffff}
        .workspace{flex:1;display:flex;flex-direction:column;height:100vh;overflow:hidden;position:relative;background:var(--bg-panel)}
        .side-nav-drawer{position:absolute;top:70px;left:-100vw;width:260px;height:calc(100% - 70px);background:#c0c0c0;border:2px solid;border-color:#ffffff #404040 #404040 #ffffff;z-index:90;transition:left 0.2s ease;padding:12px;display:flex;flex-direction:column;gap:6px;box-shadow:4px 4px 10px rgba(0,0,0,0.5)}
        .side-nav-drawer.open{left:0}
        .side-nav-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border:2px solid;border-color:#ffffff #404040 #404040 #ffffff;color:#000000;background:#c0c0c0;cursor:pointer;font-weight:bold;font-size:0.85rem}
        .side-nav-item:hover,.side-nav-item.active{background:#000080;color:#ffffff;border-color:#404040 #ffffff #ffffff #404040}
        .top-header{height:60px;border-bottom:2px solid #808080;display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:#000080;color:#ffffff;position:relative;z-index:95;box-shadow:inset 0 1px 0 #ffffff}
        .top-header-left{display:flex;align-items:center;gap:12px}
        .icon-action-btn{background:#c0c0c0;border:2px solid;border-color:#ffffff #404040 #404040 #ffffff;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#000000;font-weight:bold}
        .icon-action-btn:active{border-color:#404040 #ffffff #ffffff #404040}
        .brand-title-area h1{font-size:1rem;font-weight:bold;letter-spacing:0.05em;color:#ffffff}
        .top-header-right{display:flex;align-items:center;gap:12px}
        .avatar{width:34px;height:34px;border:2px solid;border-color:#404040 #ffffff #ffffff #404040;background:#c0c0c0;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer}
        .avatar img{width:100%;height:100%;object-fit:cover}
        .action-bar-section{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;gap:12px;background:#c0c0c0;border-bottom:2px solid #808080}
        .search-box{position:relative;flex:1;max-width:380px}
        .search-box input{width:100%;background:#ffffff;border:2px solid;border-color:#404040 #ffffff #ffffff #404040;padding:6px 10px 6px 30px;color:#000;font-size:0.85rem;outline:none}
        .search-box svg{position:absolute;left:8px;top:50%;transform:translateY(-50%);width:14px;height:14px;stroke:#000;fill:none;stroke-width:2}
        .action-bar-right{display:flex;align-items:center;gap:8px}
        .filter-btn,.create-group-btn{background:#c0c0c0;border:2px solid;border-color:#ffffff #404040 #404040 #ffffff;color:#000;padding:6px 14px;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;gap:6px;font-weight:bold}
        .filter-btn:active,.create-group-btn:active{border-color:#404040 #ffffff #ffffff #404040}
        .create-group-btn{background:#000080;color:#ffffff}
        .main-content{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:16px;background:#c0c0c0}
        .view-section{display:none;flex-direction:column;gap:16px}
        .view-section.active{display:flex}
        .section-title{font-size:0.8rem;font-weight:bold;text-transform:uppercase;color:#000080;background:#e0e0e0;padding:4px 8px;border:1px solid #808080;margin-bottom:6px}
        .pinned-grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:12px}
        .pinned-card{background:#c0c0c0;border:2px solid;border-color:#ffffff #404040 #404040 #ffffff;padding:12px;cursor:pointer;position:relative;display:flex;flex-direction:column;box-shadow:2px 2px 5px rgba(0,0,0,0.2)}
        .pinned-card:hover{background:#d0d0d0}
        .pinned-card:active{border-color:#404040 #ffffff #ffffff #404040}
        .pinned-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
        .pinned-badge{color:#000080;font-size:1.1rem}
        .pinned-card-icon{width:32px;height:32px;border:2px solid;border-color:#ffffff #404040 #404040 #ffffff;background:#c0c0c0;display:flex;align-items:center;justify-content:center;color:#000080;font-weight:bold;font-size:0.8rem}
        .pinned-card-body{flex:1;display:flex;flex-direction:column}
        .pinned-card h3{font-size:0.9rem;margin-bottom:4px;color:#000}
        .pinned-card p{font-size:0.72rem;color:#404040;margin-bottom:8px}
        .pinned-card-footer{font-size:0.7rem;color:#000080;display:flex;align-items:center;justify-content:space-between;font-weight:bold}
        .section-divider-animated{height:2px;width:100%;margin:6px 0;background:#808080}
        .group-tabs{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #808080;padding-bottom:8px;margin-top:6px}
        .tab-btn,.cyber-sort-prompt-container{background:#c0c0c0;border:2px solid;border-color:#ffffff #404040 #404040 #ffffff}
        .tab-buttons{display:flex;gap:8px}
        .tab-btn{color:#000;font-size:0.78rem;font-weight:bold;cursor:pointer;padding:6px 12px;outline:none;display:flex;align-items:center;justify-content:center;height:32px}
        .tab-btn:active,.tab-btn.active{border-color:#404040 #ffffff #ffffff #404040;background:#dfdfdf;color:#000080}
        .cyber-sort-prompt-container{padding:0 12px;display:flex;align-items:center;gap:8px;height:32px}
        
        /* Telegram User Interface Appearance and Telegram Responsive Chat Room Styles */
        .chat-room-container{position:fixed;inset:0;left:50%;transform:translateX(-50%);width:min(100%, 750px);height:100dvh;max-height:none;display:flex;flex-direction:column;background:#ffffff;border:3px solid #808080;overflow:hidden;z-index:105;box-shadow:5px 5px 20px rgba(0,0,0,0.5)}
        .chat-room-header{position:relative;min-height:56px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;background:#5682a3;color:#ffffff;border-bottom:2px solid #365873;z-index:10}
        .chat-room-title-area{min-width:0;display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none}
        .chat-room-title-area .chat-avatar{position:relative;width:38px;height:38px;flex:0 0 38px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#ffffff;color:#5682a3;font-weight:bold;font-size:0.85rem;box-shadow:0 2px 5px rgba(0,0,0,0.2)}
        .chat-room-title-area .chat-avatar::after{content:"";position:absolute;width:9px;height:9px;right:0;bottom:0;border-radius:50%;background:#26a65b;border:2px solid #5682a3}
        .chat-room-title{min-width:0;display:flex;flex-direction:column;gap:1px}
        .chat-room-title h3{margin:0;color:#ffffff;font-size:0.92rem;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .chat-room-title span{color:#e0e0e0;font-size:0.7rem;white-space:nowrap}
        .chat-room-actions{display:flex;align-items:center;gap:4px;color:#ffffff}
        .chat-room-actions button,.chat-room-actions svg{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;color:inherit;border-radius:50%;cursor:pointer}
        .chat-room-actions svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2}
        .chat-room-actions button:hover,.chat-room-actions svg:hover{background:rgba(255,255,255,0.2)}
        
        .chat-messages-area{position:relative;flex:1;min-height:0;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;background:#e7ecef;scroll-behavior:smooth}
        .chat-messages-area::-webkit-scrollbar{width:8px}
        .chat-messages-area::-webkit-scrollbar-track{background:#c0c0c0}
        .chat-messages-area::-webkit-scrollbar-thumb{background:#808080}
        
        .chat-time-divider{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;width:fit-content;margin:10px auto;padding:3px 10px;color:#ffffff;font-size:0.68rem;font-weight:bold;background:#788f9c;border-radius:10px}
        
        .message-bubble{position:relative;z-index:1;width:fit-content;max-width:min(78%, 550px);padding:8px 12px;color:#000000;font-size:0.85rem;line-height:1.4;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.12);word-wrap:break-word}
        .message-bubble.incoming{align-self:flex-start;background:#ffffff;border:1px solid #d0d0d0;border-top-left-radius:2px}
        .message-bubble.outgoing{align-self:flex-end;background:#eeffde;border:1px solid #cce8b0;border-top-right-radius:2px}
        .message-sender{margin-bottom:2px;color:#3b82f6;font-size:0.72rem;font-weight:bold}
        .message-bubble.outgoing .message-sender{color:#2e7d32}
        
        /* Floating Chat Input Box for Flexible Movement Above Keyboard */
        .chat-input-floating-wrapper{position:absolute;left:0;right:0;bottom:0;width:100%;padding:8px 12px;background:#f0f0f0;border-top:2px solid #808080;z-index:20;pointer-events:none;transition:transform 0.15s ease-out}
        .chat-input-floating-wrapper>*{pointer-events:auto}
        .chat-input-bar{width:min(100%, 800px);margin:0 auto;display:flex;align-items:flex-end;gap:6px;padding:4px;background:#ffffff;border:2px solid;border-color:#808080 #ffffff #ffffff #808080}
        .chat-input-bar textarea{flex:1;width:100%;min-height:36px;max-height:120px;padding:6px 8px;background:#ffffff;border:none;outline:none;resize:none;color:#000000;font-family:inherit;font-size:0.88rem;line-height:1.4}
        .chat-input-bar textarea::placeholder{color:#808080}
        
        /* Professional Send Button & Voice Button Integration */
        .chat-input-btn-group {display: flex; align-items: center; gap: 4px;}
        .chat-input-bar button{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:2px solid;border-color:#ffffff #404040 #404040 #ffffff;background:#c0c0c0;color:#000000;cursor:pointer;font-weight:bold;font-size:0.75rem;border-radius:4px}
        .chat-input-bar button:active{border-color:#404040 #ffffff #ffffff #404040}
        .chat-send-professional-btn {background:#5682a3 !important;color:#ffffff !important;width:auto !important;padding:0 14px !important;font-weight:bold !important}
        .voice-typing-btn {background:#e74c3c !important;color:#ffffff !important;}
        .voice-typing-btn.listening {background:#27ae60 !important;animation: pulseVoice 1.2s infinite;}
        @keyframes pulseVoice { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

        .error-notification-banner{display:none;background:#ffcccc;border:2px solid;border-color:#ffffff #ff0000 #ff0000 #ffffff;border-radius:0px;padding:12px;margin-bottom:12px;align-items:center;justify-content:space-between}
        .error-notification-banner.active{display:flex}
        .error-content-wrapper{display:flex;align-items:center;gap:10px}
        .error-icon-box{width:28px;height:28px;background:#ff0000;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;flex-shrink:0}
        .error-text-area h4{font-size:0.85rem;color:#000;margin-bottom:2px;font-weight:bold}
        .error-text-area p{font-size:0.72rem;color:#333}
        .error-dismiss-btn{background:#c0c0c0;border:2px solid;border-color:#fff #404040 #404040 #fff;color:#000;font-size:1rem;cursor:pointer;padding:0 6px}
        
        .group-list{display:flex;flex-direction:column;gap:8px}
        .group-item{background:#c0c0c0;border:2px solid;border-color:#ffffff #808080 #808080 #ffffff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none}
        .group-item:hover{background:#d0d0d0}
        .group-item:active{border-color:#808080 #ffffff #ffffff #808080}
        .group-item-left{display:flex;align-items:center;gap:12px}
        .group-item-avatar{width:40px !important;height:40px !important;min-width:40px !important;min-height:40px !important;border:2px solid;border-color:#404040 #ffffff #ffffff #404040;background:#c0c0c0;display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:bold;overflow:hidden;flex-shrink:0;color:#000}
        .group-item-avatar img{width:100%;height:100%;object-fit:cover}
        .group-item-info h4{font-size:0.88rem;color:#000;margin-bottom:2px;font-weight:bold}
        .group-item-info p{font-size:0.72rem;color:#404040}
        .group-item-right{display:flex;align-items:center;gap:12px}
        .group-item-meta{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
        .group-item-time{font-size:0.7rem;color:#404040;text-align:right}
        .unread-badge{background:#ff0000;color:#fff;font-size:0.65rem;font-weight:bold;padding:1px 6px;border-radius:8px;display:inline-block}
        
        .overlay-screen{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:100;display:none;align-items:center;justify-content:center;padding:16px}
        .overlay-screen.active{display:flex}
        .modal-box{background:#c0c0c0;border:3px solid;border-color:#ffffff #404040 #404040 #ffffff;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:6px 6px 15px rgba(0,0,0,0.6);display:flex;flex-direction:column}
        .modal-header{padding:8px 12px;background:#000080;color:#fff;display:flex;align-items:center;justify-content:space-between}
        .modal-header h3{font-size:0.9rem;font-weight:bold;letter-spacing:0.02em}
        .close-modal-btn{background:#c0c0c0;border:2px solid;border-color:#fff #404040 #404040 #fff;color:#000;font-size:0.9rem;cursor:pointer;line-height:1;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-weight:bold}
        .close-modal-btn:active{border-color:#404040 #fff #fff #404040}
        .modal-body{padding:16px;display:flex;flex-direction:column;gap:16px;background:#c0c0c0}
        .decorated-prompt-box{background:#c0c0c0;border:3px solid;border-color:#ffffff #404040 #404040 #ffffff;padding:14px;box-shadow:4px 4px 10px rgba(0,0,0,0.4);position:relative}
        .solid-animated-tag{display:inline-block;padding:2px 6px;font-size:0.68rem;font-weight:bold;background:#000080;color:#fff;border:1px solid #fff}
        .tag-admin{background:#800080}
        .tag-member{background:#000080}
        .tag-approval{background:#ff6600}
        .form-group{display:flex;flex-direction:column;gap:6px}
        .form-group label{font-size:0.78rem;color:#000;font-weight:bold}
        .form-group input[type="text"],.form-group textarea,.form-group select{background:#ffffff;border:2px solid;border-color:#404040 #ffffff #ffffff #404040;padding:8px;color:#000;font-size:0.85rem;outline:none}
        .radio-options{display:flex;flex-direction:column;gap:8px}
        .radio-card{background:#c0c0c0;border:2px solid;border-color:#ffffff #808080 #808080 #ffffff;padding:10px;display:flex;align-items:center;gap:10px;cursor:pointer}
        .radio-card:hover,.radio-card.selected{background:#d0d0d0}
        .primary-action-btn,.danger-action-btn{background:#c0c0c0;border:2px solid;border-color:#ffffff #404040 #404040 #ffffff;color:#000;font-weight:bold;padding:8px 14px;cursor:pointer;width:100%;font-size:0.85rem}
        .primary-action-btn:active,.danger-action-btn:active{border-color:#404040 #ffffff #ffffff #404040}
        .primary-action-btn{background:#000080;color:#fff}
        .danger-action-btn{background:#cc0000;color:#fff}
        .predictions-container{display:flex;flex-direction:column;gap:10px}
        .notification-item-card{background:#c0c0c0;border:2px solid;border-color:#ffffff #808080 #808080 #ffffff;padding:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer}
        .notification-left-details{display:flex;align-items:center;gap:10px}
        .notification-icon-3d{width:32px;height:32px;border:2px solid;border-color:#ffffff #404040 #404040 #ffffff;background:#c0c0c0;display:flex;align-items:center;justify-content:center;color:#000080;font-size:0.9rem;font-weight:bold;flex-shrink:0}
        .flex-row{display:flex;align-items:center;gap:10px}
      `}</style>

      <div className="app-container">
        <main className="workspace">

          {/* SIDE NAVIGATION MENU DRAWER */}
          <div className={`side-nav-drawer ${isSideNavOpen ? 'open' : ''}`} id="sideNavDrawer">
            <div className={`side-nav-item ${activeMainView === 'chats' ? 'active' : ''}`} onClick={() => { setActiveMainView('chats'); toggleSideMenu(); }}>
              <span>~</span> Group Chats
            </div>
            <div className={`side-nav-item ${activeMainView === 'predictions' ? 'active' : ''}`} onClick={() => { setActiveMainView('predictions'); toggleSideMenu(); }}>
              <span>~</span> Notifications
            </div>
            <div className="side-nav-item" onClick={() => { openModal('createGroupModal'); toggleSideMenu(); }}>
              <span>~</span> Create New Group
            </div>
            <div className="side-nav-item" onClick={() => { openModal('deleteRequestModal'); toggleSideMenu(); }}>
              <span>~</span> Group Approval
            </div>
            <div className={`side-nav-item ${activeMainView === 'userHub' ? 'active' : ''}`} onClick={() => { setActiveMainView('userHub'); toggleSideMenu(); }}>
              <span>~</span> User Profile
            </div>
            <div className="side-nav-item" onClick={() => navigateTo('dashboard')} style={{ color: '#cc0000' }}>
              <span></span> CLOSE PAGE
            </div>
          </div>

          {/* SECTION 1: Top Header Navigation */}
          <header className="top-header">
            <div className="top-header-left">
              <button className="icon-action-btn" title="Side Navigation Menu" onClick={toggleSideMenu}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="brand-title-area">
                <h1>Group Chats</h1>
              </div>
            </div>

            <div className="top-header-right">
              <div className="user-mini-profile" onClick={() => setActiveMainView('userHub')} title="User Profile">
                <div className="avatar" id="headerUserAvatar">
                  <img src={currentAvatar} alt="User" id="headerAvatarImg" />
                </div>
              </div>
              <button className="icon-action-btn" title="Group Description & Navigation" onClick={() => openModal('groupOverviewModal')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="6" r="2" />
                  <circle cx="20" cy="10" r="1" />
                  <circle cx="6" cy="20" r="4" />
                </svg>
              </button>
               <button className="icon-action-btn" title="Back to Dashboard" onClick={() => navigateTo('dashboard')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                placeholder="Search available groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="action-bar-right">
              <button className="filter-btn" onClick={() => {}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filter
              </button>
              <button className="create-group-btn" onClick={() => openModal('createGroupModal')}>+ Create Group</button>
            </div>
          </div>

          {/* Error Notification Banner Prompt */}
          <div style={{ padding: '0 16px' }}>
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
                        <div className="pinned-badge">★</div>
                      </div>
                      <div className="section-divider-animated"></div>
                      <div className="pinned-card-body">
                        <h3>{g.name}</h3>
                        <p>{g.description || 'Pinned Group'}</p>
                      </div>
                      <div className="section-divider-animated"></div>
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

                <div className="group-list" id="groupListContainer" style={{ marginTop: '10px' }}>
                  {filteredGroupsList.length === 0 ? (
                    <p style={{ fontSize: '0.78rem', color: '#404040', padding: '10px 0' }}>No groups available in this section.</p>
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
                                {g.name} {g.is_big_three ? <span style={{ color: '#000080' }}>★</span> : ''} {!g.is_approved ? <span className="solid-animated-tag tag-approval" style={{ fontSize: '0.6rem', padding: '1px 4px' }}>Pending Approval</span> : ''}
                              </h4>
                              <p>{g.description || ''}</p>
                            </div>
                          </div>
                          <div className="group-item-right">
                            <div className="group-item-meta">
                              <div className="group-item-time">
                                {joined ? (
                                  <span className="solid-animated-tag tag-member" style={{ fontSize: '0.6rem', padding: '1px 4px' }}>JOINED</span>
                                ) : (
                                  <span style={{ color: '#404040', fontSize: '0.65rem', fontWeight: 'bold' }}>JOIN</span>
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
              <div style={{ background: '#c0c0c0', border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="flex-row" style={{ gap: '16px' }}>
                  <div className="avatar" style={{ width: '60px', height: '60px', fontSize: '1.2rem' }} id="hubUserAvatarLarge">
                    <img src={currentAvatar} alt="User" id="hubAvatarImg" />
                  </div>
                  <div>
                    <h3 id="hubProfileName" style={{ fontSize: '1.1rem', color: '#000', marginBottom: '4px', fontWeight: 'bold' }}>
                      {currentProfile ? currentProfile.username : 'Loading Profile...'}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#404040' }} id="hubProfileStatus">
                      {currentProfile ? currentProfile.status_message : 'Connected to Local Server.'}
                    </p>
                  </div>
                </div>
                <button className="filter-btn" onClick={() => openModal('editProfileModal')}>Edit Identity</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div className="section-title" style={{ margin: 0 }}>NOTIFICATIONS</div>
                <button className="danger-action-btn" style={{ width: 'auto', padding: '4px 10px', fontSize: '0.72rem' }} onClick={promptClearAllNotifications}>Clear Notifications</button>
              </div>
              <div className="predictions-container" id="localNotificationsList">
                {notifications.length === 0 ? (
                  <div className="notification-item-card">
                    <div className="notification-left-details">
                      <div className="notification-icon-3d">i</div>
                      <div>
                        <p style={{ fontSize: '0.75rem', color: '#404040' }}>No recent updates available.</p>
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
                        <div className="notification-icon-3d">!</div>
                        <div>
                          <h4 style={{ fontSize: '0.85rem', color: '#000', fontWeight: 'bold' }}>{n.title}</h4>
                          <p style={{ fontSize: '0.72rem', color: '#404040' }}>{n.message}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#000080', flexShrink: 0, fontWeight: 'bold' }}>{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* MODAL: OPEN CHAT */}
      <div className={`overlay-screen ${modals.chatRoomModal ? 'active' : ''}`} id="chatRoomModal">
        <div className="chat-room-container" id="chatRoomContainerBox" ref={chatContainerRef}>
          <div className="chat-room-header">
            <div className="chat-room-title-area" onClick={() => openGroupAbout(currentOpenGroup?.id)}>
              <div className="avatar" id="activeChatAvatar">
                {currentOpenGroup ? currentOpenGroup.name.substring(0, 2).toUpperCase() : 'MTL'}
              </div>
              <div>
                <h4 id="activeChatTitle" style={{ color: '#fff', fontSize: '0.95rem' }}>
                  {currentOpenGroup ? currentOpenGroup.name : 'AI & Beyond'}
                </h4>
                <p id="activeChatMeta" style={{ fontSize: '0.7rem', color: '#e0e0e0' }}>Telegram UI Active Channel</p>
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

          <div className="chat-messages-area" id="chatMessagesArea" ref={chatMessagesAreaRef} style={{ paddingBottom: '80px' }}>
            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#788f9c', margin: '6px 0' }}>Messages are visible only to the group members</div>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#788f9c', margin: '20px 0' }}>No messages yet. Start the conversation!</div>
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
                          {senderName} <span className="solid-animated-tag tag-member" style={{ fontSize: '0.55rem', padding: '1px 3px', marginLeft: '4px' }}>Member</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#000', marginTop: '2px' }}>{formatMentions(m.content)}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.65rem', color: '#788f9c', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '3px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {canEdit && <span style={{ cursor: 'pointer', color: '#000080', fontWeight: 'bold' }} onClick={() => editMessage(m.id, m.content)}>Edit</span>}
                            {canDelete && <span style={{ cursor: 'pointer', color: '#cc0000', fontWeight: 'bold' }} onClick={() => deleteMessage(m.id)}>Delete</span>}
                          </div>
                        </div>
                        <div style={{ margin: '4px 0 0 0', fontSize: '0.62rem', color: '#788f9c', textAlign: 'right' }}>
                          <span>{formatDetailedTimestamp(m.created_at)}</span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()
            )}
          </div>

          {/* Flexible Floating Chat Input Box for Keypad Support */}
          <div className="chat-input-floating-wrapper" id="chatInputFloatingWrapper">
            <div className="chat-input-bar">
              <textarea
                id="chatMessageInput"
                placeholder="Type message or use voice typing..."
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
              <div className="chat-input-btn-group">
                <button 
                  className={`voice-typing-btn ${isListening ? 'listening' : ''}`} 
                  onClick={handleVoiceTyping}
                  title="Google Voice Typing"
                >
                  🎤
                </button>
                <button className="chat-send-professional-btn" onClick={sendChatMessage} title="Professional Send">
                  Send
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
            <div className="solid-animated-tag tag-admin">GROUP CHATS</div>
            <p style={{ fontSize: '0.82rem', color: '#404040', lineHeight: 1.4 }}>
              Welcome to the 1990s Professional Web Page style featuring Telegram user interface layout, responsive dials, flexible floating chat inputs, and Google voice typing.
            </p>
            <button className="primary-action-btn" onClick={() => navigateTo('dashboard')}>Exit This Page</button>
          </div>
        </div>
      </div>

      {/* MODAL: GROUP ABOUT */}
      <div className={`overlay-screen ${modals.groupAboutModal ? 'active' : ''}`} id="groupAboutModal">
        <div className="modal-box" style={{ textAlign: 'center' }}>
          <div className="modal-header">
            <h3>ABOUT</h3>
            <button className="close-modal-btn" onClick={() => closeModal('groupAboutModal')}>&times;</button>
          </div>
          <div className="modal-body" style={{ alignItems: 'center' }} id="groupAboutBodyContent">
            {currentOpenGroup && (() => {
              const group = currentOpenGroup;
              const isMemberUser = isMember(group, currentUser?.id);
              const isAdminUser = isGroupAdmin(group, currentUser?.id);

              // Join Group First Prompt condition always shown when user joins for the first time
              if (!isMemberUser && !currentProfile?.is_global_admin && group.creator_id !== currentUser?.id) {
                return (
                  <>
                    <div className="solid-animated-tag tag-approval" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>JOIN GROUP FIRST PROMPT</div>
                    <div className="avatar" style={{ width: '70px', height: '70px', fontSize: '1.5rem', borderColor: '#404040' }}>
                      {group.name.substring(0, 2).toUpperCase()}
                    </div>
                    <h3 style={{ color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}>{group.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#404040' }}>{group.description || ''}</p>
                    <p style={{ fontSize: '0.7rem', color: '#000080', fontWeight: 'bold' }}>Type: {group.type} | Created: {formatDetailedTimestamp(group.created_at)}</p>
                    <button className="primary-action-btn" onClick={() => joinGroup(group.id)}>Join Group Now</button>
                  </>
                );
              } else {
                return (
                  <>
                    <div className="avatar" style={{ width: '70px', height: '70px', fontSize: '1.5rem', borderColor: '#404040' }}>
                      {group.name.substring(0, 2).toUpperCase()}
                    </div>
                    <h3 style={{ color: '#000', fontSize: '1.1rem', fontWeight: 'bold' }}>{group.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#404040' }}>{group.description || ''}</p>
                    <p style={{ fontSize: '0.7rem', color: '#000080', fontWeight: 'bold' }}>Date Created: {formatDetailedTimestamp(group.created_at)} | Access: {group.type}</p>

                    <div style={{ width: '100%', textAlign: 'left', background: '#e0e0e0', padding: '12px', border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <h4 style={{ color: '#000080', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Active Members ({groupAboutMembers.length})</h4>
                        {isAdminUser && <button className="solid-animated-tag tag-admin" style={{ cursor: 'pointer' }} onClick={() => inviteMember(group.id)}>+ Invite Member</button>}
                      </div>
                      <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {groupAboutMembers.map(m => (
                          <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', background: '#ffffff', padding: '4px 8px', border: '1px solid #808080' }}>
                            <span>
                              {m.profiles?.username || 'User'} <span className={`solid-animated-tag ${m.role === 'admin' ? 'tag-admin' : 'tag-member'}`} style={{ fontSize: '0.55rem', padding: '1px 3px' }}>{m.role}</span>
                            </span>
                            {isAdminUser && m.user_id !== currentUser?.id && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {m.role === 'admin' ? (
                                  <button style={{ background: '#c0c0c0', border: '1px solid #404040', color: '#cc0000', padding: '2px 4px', fontSize: '0.62rem', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => demoteAdmin(group.id, m.user_id)}>Demote</button>
                                ) : (
                                  <button style={{ background: '#c0c0c0', border: '1px solid #404040', color: '#000080', padding: '2px 4px', fontSize: '0.62rem', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => promoteUser(group.id, m.user_id)}>Promote Admin</button>
                                )}
                                <button style={{ background: '#c0c0c0', border: '1px solid #404040', color: '#cc0000', padding: '2px 4px', fontSize: '0.62rem', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => suspendMember(group.id, m.user_id)}>Suspend</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
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
              <textarea id="newGroupDescInput" placeholder="What is this group about?" rows={2} value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Privacy Type:</label>
              <div className="radio-options">
                <div className={`radio-card ${selectedNewGroupType === 'Public' ? 'selected' : ''}`} onClick={() => setSelectedNewGroupType('Public')}>
                  <input type="radio" name="gtype" checked={selectedNewGroupType === 'Public'} onChange={() => setSelectedNewGroupType('Public')} id="radioPublic" />
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: '#000', fontWeight: 'bold' }}>Public Listing</h4>
                    <p style={{ fontSize: '0.7rem', color: '#404040' }}>Visible in public directory after admin approval</p>
                  </div>
                </div>
                <div className={`radio-card ${selectedNewGroupType === 'Private' ? 'selected' : ''}`} onClick={() => setSelectedNewGroupType('Private')}>
                  <input type="radio" name="gtype" checked={selectedNewGroupType === 'Private'} onChange={() => setSelectedNewGroupType('Private')} id="radioPrivate" />
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: '#000', fontWeight: 'bold' }}>Private Group</h4>
                    <p style={{ fontSize: '0.7rem', color: '#404040' }}>Invite-only access</p>
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
            <div style={{ width: '45px', height: '45px', border: '2px solid', borderColor: '#ffffff #404040 #404040 #ffffff', background: '#c0c0c0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000080', fontWeight: 'bold' }}>
              🛡️
            </div>
            <h4 style={{ color: '#000', fontWeight: 'bold' }}>Admin Group Approval</h4>
            <p style={{ fontSize: '0.75rem', color: '#404040' }}>New groups require admin authorization before publishing to public feeds.</p>

            <div id="adminApprovalList" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
              {pendingApprovalGroups.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: '#404040' }}>No groups currently pending approval.</p>
              ) : (
                pendingApprovalGroups.map(g => {
                  const creatorName = g.creator_name || g.creator_id || 'USER';
                  return (
                    <div key={g.id} style={{ background: '#e0e0e0', border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff', padding: '10px', borderRadius: '0px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ color: '#000', fontSize: '0.82rem', fontWeight: 'bold' }}>{g.name}</h4>
                        <p style={{ fontSize: '0.68rem', color: '#404040' }}>Created by {creatorName}</p>
                      </div>
                      {currentProfile?.is_global_admin ? (
                        <button className="primary-action-btn" style={{ width: 'auto', padding: '4px 10px', fontSize: '0.72rem' }} onClick={() => approveGroup(g.id)}>Approve</button>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#000080', fontWeight: 'bold' }}>Awaiting Admin Approval</span>
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
        <div id="customPromptModal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '420px' }}>
            <div className="decorated-prompt-box">
              <h4 style={{ color: customPrompt.titleColor || '#000080', fontSize: '0.88rem', marginBottom: '6px', fontWeight: 'bold' }}>{customPrompt.title}</h4>
              {customPrompt.message && <p style={{ fontSize: '0.75rem', color: '#404040', marginBottom: '10px' }}>{customPrompt.message}</p>}
              
              {customPrompt.type === 'textarea' && (
                <textarea
                  id="promptEditInput"
                  defaultValue={customPrompt.defaultValue || ''}
                  style={{ width: '100%', background: '#ffffff', border: '2px solid', borderColor: '#404040 #ffffff #ffffff #404040', padding: '8px', color: '#000', fontSize: '0.85rem' }}
                  rows={3}
                />
              )}
              {customPrompt.type === 'input' && (
                <input
                  type="text"
                  id="promptInviteTarget"
                  placeholder={customPrompt.placeholder || ''}
                  style={{ width: '100%', background: '#ffffff', border: '2px solid', borderColor: '#404040 #ffffff #ffffff #404040', padding: '8px', color: '#000', fontSize: '0.85rem', marginBottom: '10px' }}
                />
              )}
              {customPrompt.type === 'number' && (
                <input
                  type="number"
                  id="suspendHoursInput"
                  defaultValue={customPrompt.defaultValue || '24'}
                  style={{ width: '100%', background: '#ffffff', border: '2px solid', borderColor: '#404040 #ffffff #ffffff #404040', padding: '8px', color: '#000', fontSize: '0.85rem', marginBottom: '10px' }}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => setCustomPrompt(null)} style={{ background: '#c0c0c0', border: '2px solid', borderColor: '#ffffff #404040 #404040 #ffffff', color: '#000', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                <button
                  style={{ background: customPrompt.confirmBg || '#000080', border: '2px solid', borderColor: '#ffffff #404040 #404040 #ffffff', color: customPrompt.confirmColor || '#fff', fontWeight: 'bold', padding: '6px 12px', cursor: 'pointer' }}
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
