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
   AUDIO SYNTHESIZER FOR FUTURISTIC NOTIFICATION SOUND
   ============================================================ */
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15); // D6 note

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (e) {
    // Audio context restricted or unavailable
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
    console.log(`[AI CORE TOAST - ${title}]: ${message}`);
  };

  const navigate = (path) => {
    window.location.href = path;
  };

  const navigateTo = (route) => {
    setActiveNav(route);
    showToast("ROUTING", `Navigating to ${route.toUpperCase()}`);
    
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  
  // AI System State
  const [aiSystemStatus, setAiSystemStatus] = useState("OPTIMAL");
  const [aiLogFeed, setAiLogFeed] = useState([
    "connected",
    "data loading completed."
  ]);

  // Dynamic Futuristic Loader Messages Sequence
  const loadingTexts = [
    "connecting...",
    "loading data...",
    "loading completed"
  ];

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
  const [editProfileStatus, setEditProfileStatus] = useState('online');
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

  // Lock background scroll when modal or chat room is open
  useEffect(() => {
    const isAnyModalOpen = modals.chatRoomModal || modals.createGroupModal || modals.groupAboutModal || modals.deleteRequestModal || modals.editProfileModal || modals.groupOverviewModal || !!customPrompt;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [modals, customPrompt]);

  // Dynamic AI Logging Utility
  const appendAiLog = (logText) => {
    setAiLogFeed(prev => [ `[${new Date().toLocaleTimeString()}] ${logText}`, ...prev.slice(0, 4) ]);
  };

  // Dynamic Text Cycling for Loader
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingTextIndex(prev => (prev + 1) % loadingTexts.length);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

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
        appendAiLog("voice input error");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceTyping = () => {
    if (!recognitionRef.current) {
      showErrorBanner("Voice Error", "Speech Recognition module is offline or unsupported.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      appendAiLog("VOICE MMODULE CLOSED");
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        appendAiLog("LISTENING FOR VOCAL INPUT...");
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
    playNotificationSound();
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
    appendAiLog(`EVENT LOGGED: ${title.toUpperCase()}`);
  }

  function showErrorBanner(title, message) {
    setErrorBanner({
      active: true,
      title: title || "SYSTEM ALERT",
      message: message || "System anomaly detected."
    });
    setAiSystemStatus("WARNING");
    addLocalNotification(title, message);
  }

  function dismissErrorBanner() {
    setErrorBanner(prev => ({ ...prev, active: false }));
    setAiSystemStatus("OPTIMAL");
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
      setTimeout(() => {
        setIsLoading(false);
        appendAiLog("DATA LOADING COMPLETED");
      }, 1000);
    });

    const syncInterval = setInterval(() => {
      syncBackgroundData();
    }, 1200);

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
        appendAiLog("SESSION MISSING: REDIRECTING TO AUTHENTICATION PAGE");
        window.location.href = 'auth.html';
        return;
      }
      setCurrentUser(session.user);
      await fetchOrCreateProfile(session.user);
      await fetchGroups();
      setupRealtimeSubscriptions();
    } catch (err) {
      showErrorBanner("Authentication Failed", "Unable to establish quantum uplink with node.");
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
    setEditProfileStatus(finalProfile.status_message || 'onlineqq1qq.');
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
      showErrorBanner("Synchronization Error", "Failed to retrieve chats.");
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
              playNotificationSound();
              appendAiLog("NEW INCOMING MESSAGES");
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
      titleColor: '#00f0ff',
      message: `Initiate an encrypted end-to-end direct chat with ${targetUsername}?`,
      confirmText: 'SEND',
      confirmBg: 'var(--3d-button-bg)',
      confirmColor: '#fff',
      onConfirm: async () => {
        addLocalNotification("CHAT REQUEST SENT", `Chat request transmitted to ${targetUsername}.`);
        showToast("CHAT REQUEST", `Request sent to ${targetUsername}`);
        setCustomPrompt(null);
      }
    });
  }

  function startNotificationLongPress(e, notifId) {
    cancelNotificationLongPress();
    notifPressTimer.current = setTimeout(() => {
      confirmDeleteNotification(notifId);
    }, 1500);
  }

  function cancelNotificationLongPress() {
    if (notifPressTimer.current) clearTimeout(notifPressTimer.current);
  }

  function confirmDeleteNotification(notifId) {
    setCustomPrompt({
      title: 'DELETE NOTIFICATIONS',
      titleColor: 'var(--tg-destructive)',
      message: 'Are you sure you want to delete this system event ?',
      confirmText: 'Delete Data',
      confirmBg: 'var(--tg-destructive)',
      confirmColor: '#fff',
      onConfirm: () => {
        const current = LocalStore.get('notifications') || [];
        const updated = current.filter(n => String(n.id) !== String(notifId));
        LocalStore.set('notifications', updated);
        setNotifications(updated);
        setCustomPrompt(null);
        appendAiLog("NOTIFICATION DELETED");
      }
    });
  }

  function promptClearAllNotifications() {
    setCustomPrompt({
      title: 'DELETE ALL NOTIFICATIONS',
      titleColor: 'var(--tg-destructive)',
      message: 'Delete all notification records from system RAM?',
      confirmText: 'Delete All',
      confirmBg: 'var(--tg-destructive)',
      confirmColor: '#fff',
      onConfirm: () => {
        LocalStore.set('notifications', []);
        setNotifications([]);
        setCustomPrompt(null);
        appendAiLog("ALL NOTIFICATIONS CLEARED");
      }
    });
  }

  function startChatLongPress(e, groupId) {
    cancelChatLongPress();
    chatPressTimer.current = setTimeout(() => {
      confirmArchiveChat(groupId);
    }, 1500);
  }

  function cancelChatLongPress() {
    if (chatPressTimer.current) clearTimeout(chatPressTimer.current);
  }

  function confirmArchiveChat(groupId) {
    const isArchived = archivedGroupIds.includes(groupId);
    const actionText = isArchived ? "unarchive" : "archive and encrypt";
    setCustomPrompt({
      title: isArchived ? 'RESTORING NODE' : 'ENCRYPTING NODE',
      titleColor: '#00f0ff',
      message: `Execute command to ${actionText} this channel?`,
      confirmText: 'Execute',
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
        appendAiLog(`CHANNEL ${isArchived ? 'UNARCHIVED' : 'ARCHIVED'}`);
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
    appendAiLog(`CONNECTED: ${group.name.toUpperCase()}`);
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
      showErrorBanner("Message Error", "Failed to load chat messages.");
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
      appendAiLog("PACKET TRANSMITTED");
    } else {
      showErrorBanner("Transmission Error", "Packet transmission failed.");
    }
  }

  async function deleteMessage(msgId) {
    const { error } = await supabaseClient
      .from('messages')
      .delete()
      .eq('id', msgId);

    if (!error && currentOpenGroup) {
      fetchMessages(currentOpenGroup.id);
      appendAiLog("PACKET ERASED");
    }
  }

  function editMessage(msgId, oldContent) {
    setCustomPrompt({
      type: 'textarea',
      title: 'EDIT MESSAGE',
      titleColor: '#00f0ff',
      defaultValue: oldContent,
      confirmText: 'Save Patch',
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
            appendAiLog("MESSAGE EDITED");
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
          <span key={index} className="solid-animated-tag tag-admin" style={{ fontSize: '0.7em', padding: '1px 6px' }}>
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
    if (!currentUser || isJoiningGroup) return;
    setIsJoiningGroup(true);

    const { error } = await supabaseClient
      .from('group_members')
      .insert([{ group_id: groupId, user_id: currentUser.id, role: 'member' }]);

    setIsJoiningGroup(false);

    if (!error) {
      closeModal('groupAboutModal');
      await fetchGroups();
      appendAiLog("ACCESS GRANTED");
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
      appendAiLog("GROUPABOUT CLOSED");
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
      appendAiLog("GROUPMODAL CLOSED");
    }
  }

  async function promoteUser(groupId, userId) {
    const { error } = await supabaseClient
      .from('group_members')
      .update({ role: 'admin' })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (!error) {
      addLocalNotification("ADMIN ELEVATION", "User elevated to ADMIN.");
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
      addLocalNotification("ADMIN DEMOTION", "ADMIN clearance adjusted to USER.");
      openGroupAbout(groupId);
    }
  }

  function inviteMember(groupId) {
    const group = groupsData.find(g => g.id === groupId);
    const groupName = group ? group.name : 'Group';
    const inviterName = currentProfile ? currentProfile.username : 'An Administrator';

    setCustomPrompt({
      type: 'input',
      title: 'GENERATE INVITATION LINK',
      titleColor: '#00f0ff',
      message: `Invite users to ${groupName} via User ID / Email:`,
      placeholder: 'Enter User ID or email address...',
      confirmText: 'INVITE',
      confirmBg: 'var(--3d-button-bg)',
      confirmColor: '#fff',
      onConfirm: (target) => {
        if (target && target.trim() !== "") {
          const inviteLink = `${window.location.origin}${window.location.pathname}?group=${groupId}`;
          const inviteMessage = `Invitation generated by ${inviterName} for channel ${groupName}.`;
          addLocalNotification("INVITATION DISPATCHED", inviteMessage);
          alert(`Access link sent to target: ${target}\n\nAccess URL:\n${inviteLink}`);
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
      message: 'Set suspension timeline in hours:',
      defaultValue: '24',
      confirmText: 'Isolate',
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
            addLocalNotification("MEMBER SUSPENDED", `User signal suppressed for ${duration} hours.`);
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
        description: newGroupDesc.trim() || 'Secure communication channel.',
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
      addLocalNotification("CHANNEL INITIALIZED", `Group Chat ${newGroupName.trim()} online.`);
    } else {
      showErrorBanner("Initialization Failed", error?.message || 'Unable to instantiate group chat.');
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
      appendAiLog("IDENTITY UPDATED");
    } else {
      showErrorBanner("Update Anomaly", error?.message || 'Could not update identity.');
    }
  }

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
  const pinnedGroupsList = groupsData.filter(g => g.is_big_three && (currentTabFilter === 'archived' ? archivedGroupIds.includes(g.id) : !archivedGroupIds.includes(g.id)));
  const normalGroupsList = filteredGroupsList.filter(g => !g.is_big_three);

  const pendingApprovalGroups = groupsData.filter(g => !g.is_approved);
  const joinedCount = groupsData.filter(g => isMember(g, currentUser?.id)).length;
  const createdCount = groupsData.filter(g => g.creator_id === currentUser?.id).length;
  const archivedCount = archivedGroupIds.length;

  const currentAvatar = currentProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  return (
    <>
      {/* GLOBAL HIGH-END 3D STYLES, SOLID COLOR GRADIENTS & ADAPTABLE TYPOGRAPHY */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@500;600;700&display=swap');

        :root {
          /* Ultra-Modern Solid Color Palette with 3D Depth */
          --bg-deep: #03070d;
          --bg-panel: #09131f;
          --bg-card: #0e1c2e;
          --border-glow: rgba(0, 240, 255, 0.4);
          --tg-accent: #00f0ff;
          --tg-accent-hover: #00b8e6;
          --tg-dark-card: #081422;
          --tg-dark-panel: #050c16;
          --tg-destructive: #ff2a55;
          --tg-online: #00ff88;
          --text-main: #f0f8ff;
          --text-muted: #6b859e;
          
          /* Modern Adaptable Professional Fonts */
          --font-cyber: 'Orbitron', -apple-system, sans-serif;
          --font-body: 'Rajdhani', 'Segoe UI', -apple-system, sans-serif;
          
          /* Adaptable Relative Font Sizes (Adapts to Browser Base Settings) */
          --fs-xs: clamp(0.72rem, 0.8vw, 0.8rem);
          --fs-sm: clamp(0.85rem, 1vw, 0.95rem);
          --fs-base: clamp(1rem, 1.2vw, 1.1rem);
          --fs-lg: clamp(1.2rem, 1.5vw, 1.35rem);
          --fs-xl: clamp(1.5rem, 2vw, 1.75rem);

          /* Dynamic 3D Solid Surface Elevation System */
          --3d-card-bg: linear-gradient(145deg, #0f2035 0%, #06121f 100%);
          --3d-card-border: 1px solid rgba(0, 240, 255, 0.25);
          --3d-card-shadow: 0 10px 25px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 0 12px rgba(0, 240, 255, 0.08);
          
          --3d-button-bg: linear-gradient(180deg, #00f0ff 0%, #0077c8 100%);
          --3d-button-shadow: 0 4px 0 #004488, 0 8px 18px rgba(0, 240, 255, 0.35);
          --3d-button-active: 0 1px 0 #004488, 0 2px 4px rgba(0, 0, 0, 0.8);

          --3d-btn-dark: linear-gradient(180deg, #14283e 0%, #091522 100%);
          --3d-btn-dark-shadow: 0 4px 0 #03080e, 0 6px 12px rgba(0, 0, 0, 0.6);

          --3d-btn-danger: linear-gradient(180deg, #ff2a55 0%, #a80024 100%);
          --3d-btn-danger-shadow: 0 4px 0 #590011, 0 6px 12px rgba(255, 42, 85, 0.35);
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: var(--font-body);
          scrollbar-width: thin;
          scrollbar-color: var(--tg-accent) var(--bg-deep);
        }
        
        body {
          background-color: var(--bg-deep);
          color: var(--text-main);
          height: 100vh;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          font-size: var(--fs-base);
        }

        /* STRICT NON-INTERACTIVE POINTER OVERLAYS */
        .non-interactive-overlay {
          pointer-events: none !important;
          user-select: none !important;
        }

        /* AMBIENT BACKGROUND ATMOSPHERE */
        .hud-scanlines {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02));
          background-size: 100% 3px, 6px 100%;
          z-index: 1;
          opacity: 0.4;
        }

        .hud-ambient-grid {
          position: fixed;
          inset: 0;
          background-image: radial-gradient(rgba(0, 240, 255, 0.08) 1px, transparent 0);
          background-size: 28px 28px;
          z-index: 1;
        }

        .app-container {
          display: flex;
          flex-direction: column;
          width: 100vw;
          height: 100vh;
          max-width: 1440px;
          position: relative;
          z-index: 5;
          background: rgba(3, 7, 13, 0.94);
          backdrop-filter: blur(12px);
        }

        .workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }
        
        /* MODERN 3D ICON SVG WRAPPERS */
        .svg-icon-3d {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 3px 5px rgba(0, 240, 255, 0.4));
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .svg-icon-3d:hover {
          transform: translateY(-2px) scale(1.1);
        }

        /* SIDE NAVIGATION DRAWER */
        .side-nav-drawer {
          position: absolute;
          top: 0;
          left: -100vw;
          width: 100vw;
          max-width: 320px;
          height: 100%;
          background: rgba(5, 12, 22, 0.98);
          border-right: var(--3d-card-border);
          backdrop-filter: blur(25px);
          z-index: 110;
          transition: left 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          padding: 18px 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 20px 0 50px rgba(0, 240, 255, 0.25);
        }
        .side-nav-drawer.open { left: 0; }
        .side-nav-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(0, 240, 255, 0.2);
          margin-bottom: 4px;
        }
        .side-nav-header h3 {
          font-family: var(--font-cyber);
          font-size: var(--fs-sm);
          letter-spacing: 0.12em;
          color: var(--tg-accent);
          font-weight: 900;
          text-shadow: 0 0 10px var(--tg-accent);
        }
        .side-nav-close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.5rem;
          cursor: pointer;
          line-height: 1;
          transition: color 0.15s;
        }
        .side-nav-close-btn:hover { color: #fff; }
        
        .side-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          color: var(--text-main);
          background: var(--3d-btn-dark);
          box-shadow: var(--3d-btn-dark-shadow);
          cursor: pointer;
          transition: all 0.15s ease;
          font-size: var(--fs-sm);
          font-weight: 700;
          letter-spacing: 0.05em;
          border: 1px solid rgba(0, 240, 255, 0.15);
        }
        .side-nav-item:active {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #03080e;
        }
        .side-nav-item:hover, .side-nav-item.active {
          color: #fff;
          border-color: var(--tg-accent);
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
        }
        
        /* AI SYSTEM HUD CARD */
        .ai-system-hud-bar {
          background: linear-gradient(135deg, rgba(0, 240, 255, 0.08), rgba(5, 12, 22, 0.9));
          border: 1px solid rgba(0, 240, 255, 0.25);
          border-radius: 14px;
          padding: 12px;
          margin-top: 10px;
          font-size: var(--fs-xs);
          color: var(--tg-accent);
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
        }

        /* 3D HEADER NAVIGATION */
        .top-header {
          height: 68px;
          border-bottom: 1px solid rgba(0, 240, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          background: rgba(5, 12, 22, 0.96);
          backdrop-filter: blur(20px);
          position: relative;
          z-index: 95;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.85);
        }
        .top-header-left { display: flex; align-items: center; gap: 14px; }
        
        /* 3D INTERACTIVE BUTTONS */
        .btn-3d {
          border: none;
          outline: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          border-radius: 10px;
          transition: all 0.12s ease;
          user-select: none;
          text-decoration: none;
          letter-spacing: 0.06em;
          font-family: var(--font-cyber);
        }
        .btn-3d:active { transform: translateY(3px) !important; }
        
        .btn-3d-primary {
          background: var(--3d-button-bg);
          color: #fff;
          box-shadow: var(--3d-button-shadow);
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
        .btn-3d-primary:active { box-shadow: var(--3d-button-active); }
        
        .btn-3d-dark {
          background: var(--3d-btn-dark);
          color: #fff;
          box-shadow: var(--3d-btn-dark-shadow);
          border: 1px solid rgba(0, 240, 255, 0.18);
        }
        .btn-3d-dark:active { box-shadow: 0 1px 0 #03080e; }

        .btn-3d-danger {
          background: var(--3d-btn-danger);
          color: #fff;
          box-shadow: var(--3d-btn-danger-shadow);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .btn-3d-danger:active { box-shadow: 0 1px 0 #590011; }

        .icon-action-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: var(--3d-btn-dark);
          box-shadow: var(--3d-btn-dark-shadow);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-main);
          transition: all 0.15s;
          border: 1px solid rgba(0, 240, 255, 0.2);
        }
        .icon-action-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #03080e; }

        .brand-title-area { display: flex; align-items: center; gap: 12px; }
        .brand-title-area h1 {
          font-family: var(--font-cyber);
          font-size: var(--fs-lg);
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #fff;
          text-shadow: 0 0 14px rgba(0, 240, 255, 0.6);
        }

        .top-header-right { display: flex; align-items: center; gap: 12px; }
        
        /* 3D AVATAR FRAME */
        .avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--tg-accent), #7000ff);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 2px solid var(--tg-accent);
          box-shadow: 0 0 16px rgba(0, 240, 255, 0.6);
          cursor: pointer;
        }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        /* ACTION BAR */
        .action-bar-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px 8px 20px;
          gap: 14px;
        }
        .search-box { position: relative; flex: 1; max-width: 420px; }
        .search-box input {
          width: 100%;
          background: rgba(14, 28, 46, 0.85);
          border: 1px solid rgba(0, 240, 255, 0.35);
          border-radius: 12px;
          padding: 10px 14px 10px 42px;
          color: var(--text-main);
          font-size: var(--fs-sm);
          outline: none;
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.8);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-box input:focus {
          border-color: var(--tg-accent);
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
        }
        .search-box svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          stroke: var(--tg-accent);
          fill: none;
          stroke-width: 2.5;
        }
        .action-bar-right { display: flex; align-items: center; gap: 10px; }
        .filter-btn { padding: 9px 16px; font-size: var(--fs-xs); }
        .create-group-btn { padding: 9px 18px; font-size: var(--fs-xs); }
        
        /* MAIN WORKSPACE CONTAINER */
        .main-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px 20px 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin: 0 auto;
          width: 100%;
          max-width: 1240px;
        }
        .view-section {
          display: none;
          flex-direction: column;
          gap: 16px;
          animation: matrixFloat 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .view-section.active { display: flex; }

        @keyframes matrixFloat {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .section-title {
          font-family: var(--font-cyber);
          font-size: var(--fs-xs);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--tg-accent);
          margin-bottom: 6px;
          font-weight: 900;
          text-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
        }

        /* FULL SCREEN FUTURISTIC LOADER OVERLAY */
        .full-screen-loader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #02050a;
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .loader-card-container {
          width: 100%;
          max-width: 400px;
          background: #07121e;
          border: 1px solid rgba(0, 240, 255, 0.4);
          box-shadow: 0 0 50px rgba(0, 240, 255, 0.25), inset 0 0 20px rgba(0, 240, 255, 0.1);
          border-radius: 22px;
          padding: 36px 28px 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
          text-align: center;
          position: relative;
        }
        .futuristic-spinner-ring {
          position: relative;
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spinner-outer-arc {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: #00f0ff;
          border-bottom-color: #ff0055;
          animation: spinRing 1s linear infinite;
        }
        .spinner-inner-dot {
          width: 16px;
          height: 16px;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 15px #00f0ff, 0 0 30px #00f0ff;
        }
        @keyframes spinRing {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .loader-brand-title {
          font-family: var(--font-cyber);
          font-size: var(--fs-lg);
          font-weight: 900;
          letter-spacing: 0.15em;
          color: #ffffff;
          text-transform: uppercase;
          text-shadow: 0 0 12px #00f0ff;
        }
        .loader-brand-sub {
          font-family: var(--font-cyber);
          font-size: var(--fs-xs);
          letter-spacing: 0.22em;
          color: #00f0ff;
          text-transform: uppercase;
          font-weight: 800;
          margin-top: 4px;
        }
        .loader-status-pill {
          width: 100%;
          background: #030a12;
          border: 1px solid rgba(0, 240, 255, 0.25);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .loader-pulse-dot {
          width: 8px;
          height: 8px;
          background: #00f0ff;
          border-radius: 50%;
          box-shadow: 0 0 10px #00f0ff;
          animation: pulseGlow 0.8s infinite alternate;
        }
        @keyframes pulseGlow {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.3); }
        }
        .loader-dynamic-text {
          font-size: var(--fs-sm);
          color: #00f0ff;
          font-family: monospace;
          letter-spacing: 0.08em;
          font-weight: bold;
        }
        .loader-action-button {
          width: 100%;
          background: linear-gradient(90deg, #091a2a, #0d283e);
          border: 1px solid rgba(0, 240, 255, 0.4);
          border-radius: 12px;
          padding: 12px;
          color: #00f0ff;
          font-family: var(--font-cyber);
          font-weight: 900;
          font-size: var(--fs-xs);
          letter-spacing: 0.15em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.2);
        }

        /* TOP ARCHIVED CHATS DISPLAY BAR */
        .archived-top-bar {
          background: var(--3d-card-bg);
          border: var(--3d-card-border);
          box-shadow: var(--3d-card-shadow);
          border-radius: 16px;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          margin-bottom: 12px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .archived-top-bar:hover {
          border-color: var(--tg-accent);
          box-shadow: 0 0 25px rgba(0, 240, 255, 0.35);
          transform: translateY(-2px);
        }

        /* GROUP TABS */
        .group-tabs {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(0, 240, 255, 0.18);
          padding-bottom: 12px;
        }
        .tab-buttons { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 2px; }
        .tab-btn { padding: 9px 16px; font-size: var(--fs-xs); height: 36px; white-space: nowrap; }

        /* INDEPENDENT FLOATING CONTAINER CHAT ROOM OVERLAY */
        .chat-room-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: min(94vw, 880px);
          height: min(90vh, 800px);
          display: flex;
          flex-direction: column;
          background: rgba(5, 12, 22, 0.98);
          border: 1px solid rgba(0, 240, 255, 0.4);
          border-radius: 22px;
          overflow: hidden;
          z-index: 200;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.95), 0 0 35px rgba(0, 240, 255, 0.3);
          backdrop-filter: blur(30px);
          overscroll-behavior: contain;
          isolation: isolate;
          touch-action: contain;
        }
        .chat-room-header {
          position: relative;
          height: 68px;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(8, 20, 34, 0.96);
          border-bottom: 1px solid rgba(0, 240, 255, 0.22);
          z-index: 10;
          box-shadow: 0 4px 20px rgba(0,0,0,0.6);
          flex-shrink: 0;
        }
        .chat-room-title-area { min-width: 0; display: flex; align-items: center; gap: 14px; cursor: pointer; user-select: none; }
        .chat-room-title-area .chat-avatar {
          position: relative;
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--tg-accent), #0066cc);
          color: #fff;
          font-family: var(--font-cyber);
          font-weight: 900;
          font-size: var(--fs-sm);
          border: 2px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 0 12px rgba(0, 240, 255, 0.4);
        }
        .chat-room-title-area .chat-avatar::after {
          content: "";
          position: absolute;
          width: 10px;
          height: 10px;
          right: 1px;
          bottom: 1px;
          border-radius: 50%;
          background: var(--tg-online);
          border: 2px solid var(--tg-dark-panel);
          box-shadow: 0 0 8px var(--tg-online);
        }
        
        .chat-messages-area {
          position: relative;
          flex: 1;
          min-height: 0;
          padding: 18px clamp(14px, 3.5vw, 28px) 110px;
          overflow-y: auto;
          overscroll-behavior: contain;
          touch-action: pan-y;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: var(--bg-deep);
        }
        .chat-time-divider {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          margin: 12px auto 8px;
          padding: 6px 16px;
          color: var(--tg-accent);
          font-size: var(--fs-xs);
          font-weight: 800;
          background: var(--3d-card-bg);
          border: var(--3d-card-border);
          box-shadow: var(--3d-card-shadow);
          border-radius: 10px;
          letter-spacing: 0.08em;
          font-family: var(--font-cyber);
        }
        
        /* 3D DYNAMIC MESSAGE BUBBLES */
        .message-bubble {
          position: relative;
          z-index: 1;
          width: fit-content;
          max-width: min(84%, 540px);
          padding: 12px 18px;
          color: #fff;
          font-size: var(--fs-sm);
          line-height: 1.5;
          border-radius: 18px;
          box-shadow: 0 8px 22px rgba(0,0,0,0.65);
          word-wrap: break-word;
        }
        .message-bubble.incoming {
          align-self: flex-start;
          background: var(--3d-card-bg);
          border: var(--3d-card-border);
          border-bottom-left-radius: 3px;
          animation: slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .message-bubble.outgoing {
          align-self: flex-end;
          background: linear-gradient(145deg, #0f3d61, #07233b);
          border: 1px solid rgba(0, 240, 255, 0.45);
          border-bottom-right-radius: 3px;
          animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }

        .message-sender {
          margin-bottom: 4px;
          color: var(--tg-accent);
          font-family: var(--font-cyber);
          font-size: var(--fs-xs);
          font-weight: 800;
          cursor: pointer;
        }
        .message-sender:hover { text-decoration: underline; }
        
        /* FLOATING CHAT INPUT BAR */
        .chat-input-floating-wrapper {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          padding: 12px clamp(12px, 3vw, 24px) calc(12px + env(safe-area-inset-bottom));
          background: linear-gradient(to top, var(--bg-deep) 85%, transparent);
          z-index: 20;
          pointer-events: none;
        }
        .chat-input-floating-wrapper > * { pointer-events: auto; }
        .chat-input-bar {
          width: min(100%, 840px);
          margin: 0 auto;
          display: flex;
          align-items: flex-end;
          gap: 10px;
          padding: 10px 14px;
          background: var(--tg-dark-panel);
          border: var(--3d-card-border);
          border-radius: 24px;
          box-shadow: 0 0 30px rgba(0, 240, 255, 0.35);
        }
        .chat-input-bar textarea {
          flex: 1;
          width: 100%;
          min-height: 40px;
          max-height: 120px;
          padding: 8px 10px;
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          color: #fff;
          font-family: inherit;
          font-size: var(--fs-sm);
          line-height: 1.4;
        }
        
        .voice-btn, .send-btn { width: 40px; height: 40px; flex: 0 0 40px; border-radius: 50%; }
        .voice-btn.listening {
          background: rgba(255, 42, 85, 0.25);
          color: var(--tg-destructive);
          border: 1px solid var(--tg-destructive);
          box-shadow: 0 0 15px var(--tg-destructive);
        }

        /* DYNAMIC TYPING INDICATOR ANIMATION */
        .typing-indicator-container {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.25);
          border-radius: 14px;
          width: fit-content;
          margin-top: 4px;
        }
        .typing-dot {
          width: 7px;
          height: 7px;
          background: var(--tg-accent);
          border-radius: 50%;
          animation: typingBlink 1.2s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBlink {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }

        /* FUTURISTIC NOTIFICATION BANNER PROMPT */
        .futuristic-banner-prompt {
          background: linear-gradient(135deg, rgba(8, 20, 34, 0.95), rgba(0, 240, 255, 0.1));
          border: 1px solid var(--tg-accent);
          box-shadow: 0 0 30px rgba(0, 240, 255, 0.35), inset 0 0 12px rgba(0, 240, 255, 0.15);
          border-radius: 18px;
          padding: 16px 20px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          animation: promptGlow 3s infinite alternate ease-in-out;
        }
        @keyframes promptGlow {
          0% { border-color: rgba(0, 240, 255, 0.4); box-shadow: 0 0 15px rgba(0, 240, 255, 0.2); }
          100% { border-color: rgba(0, 240, 255, 0.95); box-shadow: 0 0 35px rgba(0, 240, 255, 0.45); }
        }

        /* ERROR NOTIFICATION BANNER */
        .error-notification-banner {
          display: none;
          background: var(--3d-card-bg);
          border: 1px solid var(--tg-destructive);
          border-radius: 14px;
          padding: 12px 18px;
          margin-bottom: 12px;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 0 25px rgba(255, 42, 85, 0.4);
        }
        .error-notification-banner.active { display: flex; }
        .error-content-wrapper { display: flex; align-items: center; gap: 12px; }
        .error-icon-box {
          width: 32px;
          height: 32px;
          background: rgba(255, 42, 85, 0.25);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--tg-destructive);
          font-weight: bold;
          font-size: var(--fs-sm);
          flex-shrink: 0;
        }
        
        /* 3D GROUP LIST ITEMS */
        .group-list { display: flex; flex-direction: column; gap: 14px; }
        .group-item {
          background: var(--3d-card-bg);
          border: var(--3d-card-border);
          box-shadow: var(--3d-card-shadow);
          border-radius: 18px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
        }
        .group-item.pinned-item {
          border-color: var(--tg-accent);
          background: linear-gradient(135deg, rgba(0, 240, 255, 0.12), rgba(14, 28, 46, 0.96));
        }
        .group-item:hover {
          transform: translateY(-3px) scale(1.01);
          border-color: var(--tg-accent);
          box-shadow: 0 15px 35px rgba(0, 240, 255, 0.35);
        }
        .group-item-left { display: flex; align-items: center; gap: 16px; }
        .group-item-avatar {
          width: 48px !important;
          height: 48px !important;
          min-width: 48px !important;
          min-height: 48px !important;
          border-radius: 50% !important;
          background: linear-gradient(135deg, var(--tg-accent), #7000ff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--fs-sm);
          font-weight: 900;
          color: #fff;
          font-family: var(--font-cyber);
          overflow: hidden;
          flex-shrink: 0;
          border: 2px solid rgba(255, 255, 255, 0.35);
          box-shadow: 0 0 14px rgba(0, 240, 255, 0.5);
        }
        .group-item-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .group-item-info h4 {
          font-size: var(--fs-base);
          color: #fff;
          margin-bottom: 4px;
          font-weight: 800;
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .group-item-info p { font-size: var(--fs-xs); color: var(--text-muted); }
        .group-item-right { display: flex; align-items: center; gap: 12px; }
        .unread-badge {
          background: var(--tg-accent);
          color: #000;
          font-size: var(--fs-xs);
          font-weight: 900;
          padding: 3px 10px;
          border-radius: 12px;
          box-shadow: 0 0 14px var(--tg-accent);
          font-family: var(--font-cyber);
        }

        /* MODALS & OVERLAYS */
        .overlay-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(2, 5, 10, 0.88);
          backdrop-filter: blur(16px);
          z-index: 180;
          display: none;
          align-items: center;
          justify-content: center;
          padding: 18px;
          opacity: 0;
          transition: opacity 0.25s ease;
          overscroll-behavior: contain;
          touch-action: contain;
        }
        .overlay-screen.active { display: flex; opacity: 1; }
        .modal-box {
          background: var(--tg-dark-panel);
          border: var(--3d-card-border);
          box-shadow: 0 25px 70px rgba(0, 240, 255, 0.35);
          border-radius: 22px;
          width: 100%;
          max-width: 500px;
          max-height: 88vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          transform: translateY(30px) scale(0.95);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          overscroll-behavior: contain;
        }
        .overlay-screen.active .modal-box { transform: translateY(0) scale(1); }
        
        .modal-header { padding: 20px 24px; border-bottom: 1px solid rgba(0, 240, 255, 0.2); display: flex; align-items: center; justify-content: space-between; }
        .modal-header h3 { font-family: var(--font-cyber); font-size: var(--fs-base); color: var(--tg-accent); letter-spacing: 0.08em; font-weight: 800; }
        .close-modal-btn { background: none; border: none; color: var(--text-muted); font-size: 1.6rem; cursor: pointer; line-height: 1; }
        .modal-body { padding: 22px; display: flex; flex-direction: column; gap: 18px; }
        
        .decorated-prompt-box {
          background: var(--3d-card-bg);
          border: var(--3d-card-border);
          box-shadow: var(--3d-card-shadow);
          border-radius: 18px;
          padding: 22px;
          position: relative;
        }
        .solid-animated-tag { display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: var(--fs-xs); font-weight: 900; text-transform: uppercase; color: #fff; letter-spacing: 0.05em; font-family: var(--font-cyber); }
        .tag-admin { background: linear-gradient(135deg, #ff2a55, #a80024); box-shadow: 0 0 12px rgba(255, 42, 85, 0.5); }
        .tag-member { background: linear-gradient(135deg, var(--tg-accent), #0077c8); color: #000; box-shadow: 0 0 12px rgba(0, 240, 255, 0.5); }
        .tag-approval { background: linear-gradient(135deg, #ffbb00, #ff5500); color: #000; }
        
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-group label { font-family: var(--font-cyber); font-size: var(--fs-xs); color: var(--tg-accent); font-weight: 800; letter-spacing: 0.05em; }
        .form-group input[type="text"], .form-group textarea, .form-group select, .form-group input[type="number"] {
          background: rgba(14, 28, 46, 0.85);
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
          color: #fff;
          font-size: var(--fs-sm);
          outline: none;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
        }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: var(--tg-accent); box-shadow: 0 0 12px rgba(0, 240, 255, 0.35); }
        
        .radio-options { display: flex; flex-direction: column; gap: 12px; }
        .radio-card { background: var(--3d-card-bg); border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 14px; cursor: pointer; }
        .radio-card.selected { border-color: var(--tg-accent); background: rgba(0, 240, 255, 0.12); box-shadow: 0 0 18px rgba(0, 240, 255, 0.25); }
        
        .predictions-container { display: flex; flex-direction: column; gap: 14px; }
        .notification-item-card {
          background: var(--3d-card-bg);
          border: var(--3d-card-border);
          box-shadow: var(--3d-card-shadow);
          border-radius: 16px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        .notification-item-card:hover { transform: translateY(-2px); }
        .notification-left-details { display: flex; align-items: center; gap: 14px; }
        .notification-icon-3d {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: rgba(0, 240, 255, 0.15);
          border: 1px solid rgba(0, 240, 255, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--tg-accent);
          font-size: var(--fs-base);
          flex-shrink: 0;
        }
        .flex-row { display: flex; align-items: center; gap: 10px; }

        /* RESPONSIVE BREAKPOINTS */
        @media (max-width: 768px) {
          .top-header { padding: 0 14px; }
          .brand-title-area h1 { font-size: var(--fs-base); }
          .main-content { padding: 8px 14px 20px 14px; }
          .chat-room-container { width: 100vw; height: 100dvh; top: 0; left: 0; transform: none; border-radius: 0; border: none; }
        }
      `}</style>

      {/* NON-INTERACTIVE POINTER AMBIENT BACKGROUND OVERLAYS */}
      <div className="hud-scanlines non-interactive-overlay"></div>
      <div className="hud-ambient-grid non-interactive-overlay"></div>

      {/* FULL-SCREEN FUTURISTIC CONTAINER LOADER OVERLAY */}
      {isLoading && (
        <div className="full-screen-loader-overlay">
          <div className="loader-card-container">
            <div className="futuristic-spinner-ring">
              <div className="spinner-outer-arc"></div>
              <div className="spinner-inner-dot"></div>
            </div>

            <div>
              <div className="loader-brand-title">DATA LOADING</div>
              <div className="loader-brand-sub">Kindly Wait A Second</div>
            </div>

            <div className="loader-status-pill">
              <div className="loader-pulse-dot"></div>
              <div className="loader-dynamic-text">{loadingTexts[loadingTextIndex]}</div>
            </div>

            <div className="loader-action-button">
              loading... &gt;&gt;
            </div>
          </div>
        </div>
      )}

      <div className="app-container">
        <main className="workspace">

          {/* SIDE NAVIGATION DRAWER */}
          <div className={`side-nav-drawer ${isSideNavOpen ? 'open' : ''}`} id="sideNavDrawer">
            <div className="side-nav-header">
              <h3>SIDE NAV MENU</h3>
              <button className="side-nav-close-btn" onClick={toggleSideMenu} title="Close Menu">❌</button>
            </div>
            <div className={`side-nav-item ${activeMainView === 'chats' ? 'active' : ''}`} onClick={() => { setActiveMainView('chats'); toggleSideMenu(); }}>
              <span className="svg-icon-3d">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </span>
              Group Chats
            </div>
            <div className={`side-nav-item ${activeMainView === 'predictions' ? 'active' : ''}`} onClick={() => { setActiveMainView('predictions'); toggleSideMenu(); }}>
              <span className="svg-icon-3d">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </span>
              Notifications
            </div>
            <div className="side-nav-item" onClick={() => { openModal('createGroupModal'); toggleSideMenu(); }}>
              <span className="svg-icon-3d">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              </span>
              Create New Group
            </div>
            <div className="side-nav-item" onClick={() => { openModal('deleteRequestModal'); toggleSideMenu(); }}>
              <span className="svg-icon-3d">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </span>
              Group Approval
            </div>
            <div className={`side-nav-item ${activeMainView === 'userHub' ? 'active' : ''}`} onClick={() => { setActiveMainView('userHub'); toggleSideMenu(); }}>
              <span className="svg-icon-3d">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              User Profile
            </div>

            {/* AI SYSTEM STATUS FEED */}
            <div className="ai-system-hud-bar">
              <div style={{ fontWeight: 'bold', color: '#fff' }}>SYSTEM LOGS: {aiSystemStatus}</div>
              {aiLogFeed.map((log, idx) => (
                <div key={idx} style={{ opacity: 0.85 }}>{log}</div>
              ))}
            </div>

            <div className="side-nav-item btn-3d-danger" onClick={() => navigateTo('dashboard')} style={{ marginTop: 'auto' }}>
              CLOSE PAGE
            </div>
          </div>

          {/* TOP HEADER NAVIGATION */}
          <header className="top-header">
            <div className="top-header-left">
              <button className="icon-action-btn" title="Side Navigation Menu" onClick={toggleSideMenu}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="brand-title-area">
                {/* Modern 3D Futuristic Logo SVG */}
                <div className="svg-icon-3d" style={{ width: '34px', height: '34px' }}>
                  <svg viewBox="0 0 100 100" width="34" height="34">
                    <defs>
                      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00f0ff" />
                        <stop offset="100%" stopColor="#7000ff" />
                      </linearGradient>
                      <filter id="glow3d" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="url(#logoGrad)" filter="url(#glow3d)" />
                    <polygon points="50,15 80,30 80,70 50,85 20,70 20,30" fill="#050c16" />
                    <path d="M35 45 L50 35 L65 45 L65 60 L50 70 L35 60 Z" fill="url(#logoGrad)" />
                  </svg>
                </div>
                <h1>GROUP CHATS</h1>
              </div>
            </div>

            <div className="top-header-right">
              <div className="user-mini-profile" onClick={() => setActiveMainView('userHub')} title="User Profile">
                <div className="avatar" id="headerUserAvatar">
                  <img src={currentAvatar} alt="User" id="headerAvatarImg" />
                </div>
              </div>
              <button className="icon-action-btn" title="Back to Dashboard" onClick={() => navigateTo('dashboard')}>
                <span className="svg-icon-3d">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2.2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>
                </span>
              </button>
            </div>
          </header>

          {/* SEARCH, FILTER AND CREATE BAR */}
          <div className="action-bar-section">
            <div className="search-box">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                id="globalSearchInput"
                placeholder="Search quantum channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="action-bar-right">
              <button className="btn-3d btn-3d-dark filter-btn" onClick={() => {}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filter
              </button>
            </div>
          </div>

          {/* ERROR NOTIFICATION BANNER PROMPT */}
          <div style={{ padding: '0 20px' }}>
            <div className={`error-notification-banner ${errorBanner.active ? 'active' : ''}`} id="errorNotificationBanner">
              <div className="error-content-wrapper">
                <div className="error-icon-box">!</div>
                <div className="error-text-area">
                  <h4 id="errorBannerTitle" style={{ fontSize: 'var(--fs-sm)', color: '#fff', fontFamily: 'var(--font-cyber)' }}>{errorBanner.title || 'Connection Interrupted'}</h4>
                  <p id="errorBannerMessage" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{errorBanner.message || 'An unexpected error occurred.'}</p>
                </div>
              </div>
              <button className="error-dismiss-btn" onClick={dismissErrorBanner} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
            </div>
          </div>

          {/* DYNAMIC MAIN VIEWS WORKSPACE */}
          <div className="main-content" id="mainContentArea">

            {/* VIEW 1: CHATS LIST & PINNED */}
            <div className={`view-section ${activeMainView === 'chats' ? 'active' : ''}`} id="view-chats">

              {/* FUTURISTIC ANNOUNCEMENT / PROMPT BANNER */}
              <div className="futuristic-banner-prompt">
                <div className="flex-row" style={{ gap: '14px' }}>
                  <div className="svg-icon-3d">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </div>
                  <div>
                    <h4 style={{ color: '#fff', fontSize: 'var(--fs-sm)', fontFamily: 'var(--font-cyber)', fontWeight: 'bold' }}>GROUP CREATION</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>Dial the create button in order to create a group.</p>
                  </div>
                </div>
                <button className="btn-3d btn-3d-primary" style={{ padding: '7px 14px', fontSize: 'var(--fs-xs)' }} onClick={() => openModal('createGroupModal')}>CREATE GROUP</button>
              </div>

              {/* GROUP TABS HEADER */}
              <div>
                <div className="group-tabs">
                  <div className="tab-buttons">
                    <button className={`btn-3d ${currentTabFilter === 'all' ? 'btn-3d-primary' : 'btn-3d-dark'} tab-btn`} onClick={() => setCurrentTabFilter('all')}>ALL CHATS</button>
                    <button className={`btn-3d ${currentTabFilter === 'my_groups' ? 'btn-3d-primary' : 'btn-3d-dark'} tab-btn`} onClick={() => setCurrentTabFilter('my_groups')}>MY GROUPS</button>
                    <button className={`btn-3d ${currentTabFilter === 'archived' ? 'btn-3d-primary' : 'btn-3d-dark'} tab-btn`} onClick={() => setCurrentTabFilter('archived')}>ARCHIVED</button>
                  </div>
                </div>

                <div className="group-list" id="groupListContainer" style={{ marginTop: '16px' }}>
                  
                  {/* ARCHIVED CHATS AT THE TOP */}
                  {archivedCount > 0 && currentTabFilter !== 'archived' && (
                    <div className="archived-top-bar" onClick={() => setCurrentTabFilter('archived')}>
                      <div className="group-item-left">
                        <div className="group-item-avatar" style={{ background: 'var(--tg-dark-card)' }}>
                          <span className="svg-icon-3d">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                          </span>
                        </div>
                        <div className="group-item-info">
                          <h4>Archived Groups</h4>
                          <p>{archivedCount} {archivedCount === 1 ? 'channel' : 'channels'} stored</p>
                        </div>
                      </div>
                      <span style={{ color: 'var(--tg-accent)', fontSize: '1rem', fontWeight: 'bold' }}></span>
                    </div>
                  )}

                  {/* PINNED CHATS SHOWN ON TOP WITHIN LIST */}
                  {pinnedGroupsList.map(g => {
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
                              {g.name} 
                              <span className="svg-icon-3d" style={{ marginLeft: '4px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#00f0ff" stroke="none"><path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z"/></svg>
                              </span>
                            </h4>
                            <p>{g.description || ''}</p>
                          </div>
                        </div>
                        <div className="group-item-right">
                          {joined ? (
                            <span className="solid-animated-tag tag-member">JOINED</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)', fontWeight: 'bold' }}>OPEN</span>
                          )}
                          {unread > 0 && <div className="unread-badge">{unread}</div>}
                        </div>
                      </div>
                    );
                  })}

                  {/* REGULAR NON-PINNED CHATS LIST */}
                  {normalGroupsList.length === 0 && pinnedGroupsList.length === 0 ? (
                    <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', padding: '14px 0' }}>No active channels available in this section.</p>
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
                                {g.name} {!g.is_approved ? <span className="solid-animated-tag tag-approval" style={{ fontSize: '0.6rem' }}>Pending Approval</span> : ''}
                              </h4>
                              <p>{g.description || ''}</p>
                            </div>
                          </div>
                          <div className="group-item-right">
                            {joined ? (
                              <span className="solid-animated-tag tag-member">JOINED</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)', fontWeight: 'bold' }}>VIEW</span>
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
              <div className="section-title">USER PROFILE</div>
              <div style={{ background: 'var(--3d-card-bg)', border: 'var(--3d-card-border)', boxShadow: 'var(--3d-card-shadow)', borderRadius: '20px', padding: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div className="flex-row" style={{ gap: '18px' }}>
                  <div className="avatar" style={{ width: '64px', height: '64px' }} id="hubUserAvatarLarge">
                    <img src={currentAvatar} alt="User" id="hubAvatarImg" />
                  </div>
                  <div>
                    <h3 id="hubProfileName" style={{ fontSize: 'var(--fs-lg)', color: '#fff', marginBottom: '2px', fontFamily: 'var(--font-cyber)' }}>
                      {currentProfile ? currentProfile.username : 'Loading Profile...'}
                    </h3>
                    <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }} id="hubProfileStatus">
                      {currentProfile ? currentProfile.status_message : 'Connected to Secure Matrix.'}
                    </p>
                  </div>
                </div>
                <button className="btn-3d btn-3d-dark" style={{ padding: '9px 18px', fontSize: 'var(--fs-xs)' }} onClick={() => openModal('editProfileModal')}>Edit Profile</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '8px' }}>
                <div className="group-item" onClick={() => { setCurrentTabFilter('my_groups'); setActiveMainView('chats'); }} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <h3 style={{ fontSize: 'var(--fs-sm)', color: 'var(--tg-accent)', fontFamily: 'var(--font-cyber)' }}>Active Channels</h3>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Manage Groups You Have Joined.</p>
                  <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>You have joined {joinedCount} Group(s)</div>
                </div>
                <div className="group-item" onClick={() => { setCurrentTabFilter('my_groups'); setActiveMainView('chats'); }} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <h3 style={{ fontSize: 'var(--fs-sm)', color: 'var(--tg-accent)', fontFamily: 'var(--font-cyber)' }}>Created Groups</h3>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Manage Groups you have created.</p>
                  <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>You have created {createdCount} Group(s)</div>
                </div>
              </div>
            </div>

            {/* VIEW 3: NOTIFICATIONS HUB */}
            <div className={`view-section ${activeMainView === 'predictions' ? 'active' : ''}`} id="view-predictions">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div className="section-title" style={{ margin: 0 }}>SYSTEM NOTIFICATIONS</div>
                <button className="btn-3d btn-3d-danger" style={{ padding: '7px 16px', fontSize: 'var(--fs-xs)' }} onClick={promptClearAllNotifications}>Clear All</button>
              </div>
              <div className="predictions-container" id="localNotificationsList">
                {notifications.length === 0 ? (
                  <div className="notification-item-card">
                    <div className="notification-left-details">
                      <div className="notification-icon-3d">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      </div>
                      <div>
                        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>No recent updates available.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className="notification-item-card"
                      onMouseDown={(e) => startNotificationLongPress(e, n.id)}
                      onMouseUp={cancelNotificationLongPress}
                      onMouseLeave={cancelNotificationLongPress}
                      onTouchStart={(e) => startNotificationLongPress(e, n.id)}
                      onTouchEnd={cancelNotificationLongPress}
                    >
                      <div className="notification-left-details">
                        <div className="notification-icon-3d">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        </div>
                        <div>
                          <h4 style={{ fontSize: 'var(--fs-sm)', color: '#fff', fontFamily: 'var(--font-cyber)' }}>{n.title}</h4>
                          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{n.message}</p>
                          <span style={{ fontSize: '0.68rem', color: 'var(--tg-accent)' }}>{n.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* INDEPENDENT FLOATING CONTAINER CHAT ROOM OVERLAY */}
      {modals.chatRoomModal && currentOpenGroup && (
        <div className="chat-room-container" ref={chatContainerRef}>
          <div className="chat-room-header">
            <div className="chat-room-title-area" onClick={() => openGroupAbout(currentOpenGroup.id)}>
              <div className="chat-avatar">{currentOpenGroup.name.substring(0, 2).toUpperCase()}</div>
              <div>
                <h3 style={{ fontSize: 'var(--fs-sm)', color: '#fff', fontFamily: 'var(--font-cyber)' }}>{currentOpenGroup.name}</h3>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--tg-online)' }}>End-to-end Encrypted</p>
              </div>
            </div>
            <div className="flex-row">
              <button className="icon-action-btn" title="Group Info" onClick={() => openGroupAbout(currentOpenGroup.id)}>
                <span className="svg-icon-3d">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </span>
              </button>
              <button className="icon-action-btn" title="Close Room" onClick={() => closeModal('chatRoomModal')}>
                ❌
              </button>
            </div>
          </div>

          <div className="chat-messages-area" ref={chatMessagesAreaRef}>
            <div className="chat-time-divider"></div>

            {messages.map((m, idx) => {
              const isOutgoing = m.sender_id === currentUser?.id;
              const prevMsg = messages[idx - 1];
              const showDivider = !prevMsg || new Date(m.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 3 * 3600 * 1000;

              return (
                <React.Fragment key={m.id || idx}>
                  {showDivider && (
                    <div className="chat-time-divider">
                      {get3HourTimeDivider(m.created_at)}
                    </div>
                  )}
                  <div className={`message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                    {!isOutgoing && (
                      <div
                        className="message-sender"
                        onClick={() => handleUserClick(m.sender_id, m.profiles?.username || 'User')}
                      >
                        {m.profiles?.username || 'User'}
                      </div>
                    )}
                    <div>{formatMentions(m.content)}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', gap: '8px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)' }}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {m.is_edited ? ' (edited)' : ''}
                      </span>
                      {isOutgoing && (
                        <div className="flex-row" style={{ gap: '6px' }}>
                          <span style={{ cursor: 'pointer', fontSize: '0.75rem' }} onClick={() => editMessage(m.id, m.content)}>✏️</span>
                          <span style={{ cursor: 'pointer', fontSize: '0.75rem' }} onClick={() => deleteMessage(m.id)}>🗑️</span>
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {isListening && (
              <div className="typing-indicator-container">
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--tg-accent)', fontWeight: 'bold' }}>Listening Voice Input</span>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}
          </div>

          <div className="chat-input-floating-wrapper">
            <div className="chat-input-bar">
              <textarea
                placeholder="Type encrypted message..."
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
              />
              <button
                className={`btn-3d btn-3d-dark voice-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleVoiceTyping}
                title="Voice Typing"
              >
                <span className="svg-icon-3d">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </span>
              </button>
              <button className="btn-3d btn-3d-primary send-btn" onClick={sendChatMessage} title="Send Message">
                <span className="svg-icon-3d">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      <div className={`overlay-screen ${modals.createGroupModal ? 'active' : ''}`}>
        <div className="modal-box">
          <div className="modal-header">
            <h3>CREATE A NEW GROUP</h3>
            <button className="close-modal-btn" onClick={() => closeModal('createGroupModal')}>❌</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>GROUP NAME</label>
              <input type="text" placeholder="Channel Title..." value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>DESCRIPTION</label>
              <textarea placeholder="Purpose or rules..." value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} />
            </div>
            <div className="form-group">
              <label>CHANNEL TYPE</label>
              <div className="radio-options">
                <div className={`radio-card ${selectedNewGroupType === 'Public' ? 'selected' : ''}`} onClick={() => setSelectedNewGroupType('Public')}>
                  <span className="svg-icon-3d">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  </span>
                  <div>
                    <h4 style={{ fontSize: 'var(--fs-sm)', color: '#fff' }}>Public Network</h4>
                    <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Searchable and accessible by users.</p>
                  </div>
                </div>
                <div className={`radio-card ${selectedNewGroupType === 'Private' ? 'selected' : ''}`} onClick={() => setSelectedNewGroupType('Private')}>
                  <span className="svg-icon-3d">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <div>
                    <h4 style={{ fontSize: 'var(--fs-sm)', color: '#fff' }}>Private Encrypted</h4>
                    <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Invite only access node.</p>
                  </div>
                </div>
              </div>
            </div>
            <button className="btn-3d btn-3d-primary" style={{ padding: '13px', width: '100%', marginTop: '8px' }} onClick={createNewGroupSubmit}>
              CREATE
            </button>
          </div>
        </div>
      </div>

      {/* GROUP ABOUT MODAL */}
      <div className={`overlay-screen ${modals.groupAboutModal ? 'active' : ''}`}>
        <div className="modal-box">
          <div className="modal-header">
            <h3>CHANNEL SPECS</h3>
            <button className="close-modal-btn" onClick={() => closeModal('groupAboutModal')}>❌</button>
          </div>
          <div className="modal-body">
            {currentOpenGroup && (
              <>
                <div className="decorated-prompt-box">
                  <h3 style={{ fontSize: 'var(--fs-base)', color: '#fff', fontFamily: 'var(--font-cyber)', marginBottom: '6px' }}>{currentOpenGroup.name}</h3>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{currentOpenGroup.description}</p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {isMember(currentOpenGroup, currentUser?.id) ? (
                    <>
                      <button className="btn-3d btn-3d-dark" style={{ flex: 1, padding: '11px' }} onClick={() => inviteMember(currentOpenGroup.id)}>Invite New Member</button>
                      <button className="btn-3d btn-3d-danger" style={{ flex: 1, padding: '11px' }} onClick={() => exitGroup(currentOpenGroup.id)}>Exit Group</button>
                    </>
                  ) : (
                    <button className="btn-3d btn-3d-primary" style={{ width: '100%', padding: '11px' }} onClick={() => joinGroup(currentOpenGroup.id)}>
                      JOIN GROUP
                    </button>
                  )}
                </div>

                {isGroupAdmin(currentOpenGroup, currentUser?.id) && (
                  <button className="btn-3d btn-3d-danger" style={{ width: '100%', padding: '11px' }} onClick={() => deleteGroup(currentOpenGroup.id)}>
                    DELETE GROUP
                  </button>
                )}

                <div className="section-title" style={{ marginTop: '10px' }}>MEMBERS LIST</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
                  {groupAboutMembers.map(m => (
                    <div key={m.user_id} className="notification-item-card" style={{ padding: '12px' }}>
                      <div className="flex-row">
                        <div className="avatar" style={{ width: '34px', height: '34px' }}>
                          <img src={m.profiles?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="User" />
                        </div>
                        <div>
                          <h4 style={{ fontSize: 'var(--fs-xs)', color: '#fff' }}>{m.profiles?.username || 'User'}</h4>
                          <span className={`solid-animated-tag ${m.role === 'admin' ? 'tag-admin' : 'tag-member'}`} style={{ fontSize: '0.55rem' }}>{m.role}</span>
                        </div>
                      </div>
                      {isGroupAdmin(currentOpenGroup, currentUser?.id) && m.user_id !== currentUser?.id && (
                        <div className="flex-row" style={{ gap: '6px' }}>
                          {m.role === 'admin' ? (
                            <button className="btn-3d btn-3d-dark" style={{ padding: '4px 8px', fontSize: '0.65rem' }} onClick={() => demoteAdmin(currentOpenGroup.id, m.user_id)}>Demote</button>
                          ) : (
                            <button className="btn-3d btn-3d-primary" style={{ padding: '4px 8px', fontSize: '0.65rem' }} onClick={() => promoteUser(currentOpenGroup.id, m.user_id)}>Promote</button>
                          )}
                          <button className="btn-3d btn-3d-danger" style={{ padding: '4px 8px', fontSize: '0.65rem' }} onClick={() => suspendMember(currentOpenGroup.id, m.user_id)}>Suspend</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* GROUP APPROVAL MODAL */}
      <div className={`overlay-screen ${modals.deleteRequestModal ? 'active' : ''}`}>
        <div className="modal-box">
          <div className="modal-header">
            <h3>PENDING APPROVALS</h3>
            <button className="close-modal-btn" onClick={() => closeModal('deleteRequestModal')}>❌</button>
          </div>
          <div className="modal-body">
            {pendingApprovalGroups.length === 0 ? (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>No New Groups requiring administrator authorization.</p>
            ) : (
              pendingApprovalGroups.map(g => (
                <div key={g.id} className="notification-item-card">
                  <div>
                    <h4 style={{ fontSize: 'var(--fs-sm)', color: '#fff', fontFamily: 'var(--font-cyber)' }}>{g.name}</h4>
                    <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{g.description}</p>
                  </div>
                  {currentProfile?.is_global_admin && (
                    <button className="btn-3d btn-3d-primary" style={{ padding: '7px 14px', fontSize: 'var(--fs-xs)' }} onClick={() => approveGroup(g.id)}>Approve</button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      <div className={`overlay-screen ${modals.editProfileModal ? 'active' : ''}`}>
        <div className="modal-box">
          <div className="modal-header">
            <h3>EDIT USER IDENTITY</h3>
            <button className="close-modal-btn" onClick={() => closeModal('editProfileModal')}>❌</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>USERNAME</label>
              <input type="text" value={editProfileName} onChange={(e) => setEditProfileName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>STATUS SIGNAL</label>
              <input type="text" value={editProfileStatus} onChange={(e) => setEditProfileStatus(e.target.value)} />
            </div>
            <div className="form-group">
              <label>AVATAR URL</label>
              <input type="text" value={editProfileAvatar} onChange={(e) => setEditProfileAvatar(e.target.value)} />
            </div>
            <button className="btn-3d btn-3d-primary" style={{ padding: '13px', width: '100%', marginTop: '8px' }} onClick={saveProfileChanges}>
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* GROUP OVERVIEW MODAL */}
      <div className={`overlay-screen ${modals.groupOverviewModal ? 'active' : ''}`}>
        <div className="modal-box">
          <div className="modal-header">
            <h3>GROUP CHATS</h3>
            <button className="close-modal-btn" onClick={() => closeModal('groupOverviewModal')}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="decorated-prompt-box">
              <h4 style={{ color: 'var(--tg-accent)', fontSize: 'var(--fs-sm)', fontFamily: 'var(--font-cyber)', marginBottom: '8px' }}>SYSTEM ARCHITECTURE</h4>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOM PROMPT INTERACTIVE OVERLAY */}
      {customPrompt && (
        <div className="overlay-screen active" style={{ zIndex: 350 }}>
          <div className="modal-box" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ color: customPrompt.titleColor || 'var(--tg-accent)' }}>{customPrompt.title}</h3>
              <button className="close-modal-btn" onClick={() => setCustomPrompt(null)}>❌</button>
            </div>
            <div className="modal-body">
              {customPrompt.message && <p style={{ fontSize: 'var(--fs-sm)', color: '#fff' }}>{customPrompt.message}</p>}
              
              {customPrompt.type === 'input' && (
                <input
                  type="text"
                  id="customPromptInput"
                  placeholder={customPrompt.placeholder || ''}
                  defaultValue={customPrompt.defaultValue || ''}
                  style={{ background: 'rgba(14, 28, 46, 0.9)', border: '1px solid rgba(0,240,255,0.4)', padding: '12px', borderRadius: '12px', color: '#fff' }}
                />
              )}

              {customPrompt.type === 'number' && (
                <input
                  type="number"
                  id="customPromptInput"
                  defaultValue={customPrompt.defaultValue || '24'}
                  style={{ background: 'rgba(14, 28, 46, 0.9)', border: '1px solid rgba(0,240,255,0.4)', padding: '12px', borderRadius: '12px', color: '#fff' }}
                />
              )}

              {customPrompt.type === 'textarea' && (
                <textarea
                  id="customPromptInput"
                  defaultValue={customPrompt.defaultValue || ''}
                  style={{ background: 'rgba(14, 28, 46, 0.9)', border: '1px solid rgba(0,240,255,0.4)', padding: '12px', borderRadius: '12px', color: '#fff', minHeight: '90px' }}
                />
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button className="btn-3d btn-3d-dark" style={{ flex: 1, padding: '11px' }} onClick={() => setCustomPrompt(null)}>Cancel</button>
                <button
                  className="btn-3d"
                  style={{ flex: 1, padding: '11px', background: customPrompt.confirmBg || 'var(--3d-button-bg)', color: customPrompt.confirmColor || '#fff' }}
                  onClick={() => {
                    const inputEl = document.getElementById('customPromptInput');
                    const val = inputEl ? inputEl.value : null;
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
