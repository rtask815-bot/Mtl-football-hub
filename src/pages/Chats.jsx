import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

/* ============================================================
   LOCAL STORAGE CACHING & OFFLINE SYNC
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

export default function DirectUserChats() {
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
    if (route === 'dashboard') {
      navigate('/dashboard');
    }
  };

  // User & State Management
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [userList, setUserList] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [archivedChatIds, setArchivedChatIds] = useState([]);
  const [pinnedChatIds, setPinnedChatIds] = useState([]);
  const [currentActivePeer, setCurrentActivePeer] = useState(null);
  
  // Navigation & UI States
  const [currentTabFilter, setCurrentTabFilter] = useState('all');
  const [activeMainView, setActiveMainView] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState({ active: false, title: '', message: '' });
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInputText, setChatInputText] = useState('');
  
  // Google Voice Typing State
  const [isListening, setIsListening] = useState(false);
  
  // Modals & Dynamic Prompts
  const [modals, setModals] = useState({
    chatRoomModal: false,
    userAboutModal: false,
    newDirectChatModal: false,
    governanceModal: false,
    editProfileModal: false
  });
  const [customPrompt, setCustomPrompt] = useState(null);

  // Form Inputs
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileStatus, setEditProfileStatus] = useState('Online & available');
  const [editProfileAvatar, setEditProfileAvatar] = useState('');
  const [newChatSearchUser, setNewChatSearchUser] = useState('');

  // Refs
  const chatMessagesAreaRef = useRef(null);
  const chatContainerRef = useRef(null);
  const notifPressTimer = useRef(null);
  const chatPressTimer = useRef(null);
  const currentActivePeerRef = useRef(currentActivePeer);
  const recognitionRef = useRef(null);

  useEffect(() => {
    currentActivePeerRef.current = currentActivePeer;
  }, [currentActivePeer]);

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

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
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

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

    if (isToday) return timeStr;
    if (isYesterday) return `Yesterday ${timeStr}`;
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
    return `${formatDetailedTimestamp(startBlock)} (${formatTime(startBlock)} - ${formatTime(endBlock)})`;
  }

  /* ============================================================
     NOTIFICATIONS & ERROR HANDLING
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
     VISUAL VIEWPORT HANDLER (MOBILE KEYPAD)
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
     DIRECT USER MESSAGING & CACHING DATA
     ============================================================ */
  const fetchAllUsersAndDirectChats = useCallback(async (myUserId) => {
    if (!myUserId) return;

    // Load local cache immediately to prevent blank loading screen
    const cachedUsers = LocalStore.get('users_list');
    const cachedRecent = LocalStore.get('recent_chats');
    if (cachedUsers) setUserList(cachedUsers);
    if (cachedRecent) setRecentChats(cachedRecent);

    // Sync profiles from backend
    const { data: profiles, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('*')
      .neq('id', myUserId);

    if (!profileErr && profiles) {
      setUserList(profiles);
      LocalStore.set('users_list', profiles);
    }

    // Fetch direct conversation logs
    const { data: directMsgs, error: msgErr } = await supabaseClient
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, username, avatar_url, status_message),
        receiver:receiver_id(id, username, avatar_url, status_message)
      `)
      .or(`sender_id.eq.${myUserId},receiver_id.eq.${myUserId}`)
      .order('created_at', { ascending: false });

    if (!msgErr && directMsgs) {
      const peerMap = {};
      directMsgs.forEach(m => {
        const peer = m.sender_id === myUserId ? m.receiver : m.sender;
        if (peer && !peerMap[peer.id]) {
          peerMap[peer.id] = {
            peerInfo: peer,
            lastMessage: m.content,
            lastTime: m.created_at,
            senderId: m.sender_id
          };
        }
      });

      const compiledChats = Object.values(peerMap);
      setRecentChats(compiledChats);
      LocalStore.set('recent_chats', compiledChats);
    }
  }, []);

  const fetchDirectMessages = useCallback(async (peerUserId) => {
    if (!currentUser) return;
    const localMsgKey = 'direct_messages_' + peerUserId;

    // Local Sync Check
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
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${peerUserId}),and(sender_id.eq.${peerUserId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      showErrorBanner("Message Retrieval Failed", "Could not fetch chat history with this user.");
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
  }, [currentUser]);

  const setupRealtimeSubscriptions = useCallback(() => {
    if (!currentUser) return;
    const channel = supabaseClient
      .channel('public-direct-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        if (payload.new) {
          const newMsg = payload.new;
          if (newMsg.sender_id === currentUser.id || newMsg.receiver_id === currentUser.id) {
            const peerId = newMsg.sender_id === currentUser.id ? newMsg.receiver_id : newMsg.sender_id;
            
            if (currentActivePeerRef.current && currentActivePeerRef.current.id === peerId) {
              fetchDirectMessages(peerId);
            } else {
              setUnreadCounts(prev => {
                const newCounts = { ...prev, [peerId]: (prev[peerId] || 0) + 1 };
                LocalStore.set('unread_direct', newCounts);
                return newCounts;
              });
            }
            fetchAllUsersAndDirectChats(currentUser.id);
          }
        }
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [currentUser, fetchDirectMessages, fetchAllUsersAndDirectChats]);

  /* ============================================================
     INITIALIZATION & CACHE RECOVERY
     ============================================================ */
  useEffect(() => {
    loadCachedState();
    verifySessionAndInitialize();
  }, []);

  function loadCachedState() {
    const arch = LocalStore.get('archived_chats') || [];
    const pinned = LocalStore.get('pinned_chats') || [];
    const unread = LocalStore.get('unread_direct') || {};
    const notifs = LocalStore.get('notifications') || [];
    setArchivedChatIds(arch);
    setPinnedChatIds(pinned);
    setUnreadCounts(unread);
    setNotifications(notifs);

    const cachedProfile = LocalStore.get('profile');
    if (cachedProfile) {
      setCurrentProfile(cachedProfile);
      setEditProfileName(cachedProfile.username || '');
      setEditProfileStatus(cachedProfile.status_message || 'Online & available');
      setEditProfileAvatar(cachedProfile.avatar_url || '');
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
      await fetchAllUsersAndDirectChats(session.user.id);
      setupRealtimeSubscriptions();
    } catch (err) {
      showErrorBanner("Authentication Failed", "Unable to establish secure connection with server.");
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
        .insert([{ id: userObj.id, username: fallbackName, status_message: 'Online & available' }])
        .select()
        .single();
      profile = newProfile;
    }

    const finalProfile = profile || {
      id: userObj.id,
      username: userObj.email ? userObj.email.split('@')[0] : 'User',
      avatar_url: '',
      status_message: 'Online & available',
      is_global_admin: false
    };

    setCurrentProfile(finalProfile);
    setEditProfileName(finalProfile.username || '');
    setEditProfileStatus(finalProfile.status_message || 'Online & available');
    setEditProfileAvatar(finalProfile.avatar_url || '');
    LocalStore.set('profile', finalProfile);
  }

  /* ============================================================
     LONG PRESS & INTERACTION HANDLERS
     ============================================================ */
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
      message: 'Are you sure you want to clear all notifications from history?',
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

  function startChatLongPress(e, peerId) {
    cancelChatLongPress();
    chatPressTimer.current = setTimeout(() => {
      confirmArchiveOrPinChat(peerId);
    }, 1500);
  }

  function cancelChatLongPress() {
    if (chatPressTimer.current) clearTimeout(chatPressTimer.current);
  }

  function confirmArchiveOrPinChat(peerId) {
    const isArchived = archivedChatIds.includes(peerId);
    const isPinned = pinnedChatIds.includes(peerId);

    setCustomPrompt({
      title: 'CHAT OPTIONS',
      titleColor: 'var(--tg-accent)',
      message: 'Select action for this user conversation:',
      confirmText: isArchived ? 'Unarchive' : 'Archive',
      confirmBg: 'var(--tg-accent)',
      confirmColor: '#fff',
      onConfirm: () => {
        let updated;
        if (isArchived) {
          updated = archivedChatIds.filter(id => id !== peerId);
        } else {
          updated = [...archivedChatIds, peerId];
        }
        setArchivedChatIds(updated);
        LocalStore.set('archived_chats', updated);
        setCustomPrompt(null);
      }
    });
  }

  function togglePinChat(peerId, e) {
    e.stopPropagation();
    let updated;
    if (pinnedChatIds.includes(peerId)) {
      updated = pinnedChatIds.filter(id => id !== peerId);
    } else {
      updated = [...pinnedChatIds, peerId];
    }
    setPinnedChatIds(updated);
    LocalStore.set('pinned_chats', updated);
  }

  /* ============================================================
     CHAT ROOM & MESSAGE ACTIONS
     ============================================================ */
  async function openDirectChatRoom(peerUser) {
    if (!peerUser) return;
    setCurrentActivePeer(peerUser);

    setUnreadCounts(prev => {
      const updated = { ...prev, [peerUser.id]: 0 };
      LocalStore.set('unread_direct', updated);
      return updated;
    });

    await fetchDirectMessages(peerUser.id);
    openModal('chatRoomModal');
  }

  async function sendChatMessage() {
    const content = chatInputText.trim();
    if (!content || !currentActivePeer || !currentUser) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const { error } = await supabaseClient
      .from('messages')
      .insert([{
        sender_id: currentUser.id,
        receiver_id: currentActivePeer.id,
        content: content,
        message_type: 'direct'
      }]);

    if (!error) {
      setChatInputText('');
      fetchDirectMessages(currentActivePeer.id);
      fetchAllUsersAndDirectChats(currentUser.id);
    } else {
      showErrorBanner("Sending Failed", "Unable to deliver message to user.");
    }
  }

  async function deleteMessage(msgId) {
    const { error } = await supabaseClient
      .from('messages')
      .delete()
      .eq('id', msgId);

    if (!error && currentActivePeer) {
      fetchDirectMessages(currentActivePeer.id);
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

          if (!error && currentActivePeer) {
            fetchDirectMessages(currentActivePeer.id);
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
     TELEGRAM/WHATSAPP LIST FILTERING LOGIC
     ============================================================ */
  const getDisplayChats = () => {
    // Combine recent conversations and all users
    let chatMap = {};

    recentChats.forEach(rc => {
      if (rc.peerInfo) {
        chatMap[rc.peerInfo.id] = {
          id: rc.peerInfo.id,
          name: rc.peerInfo.username || 'User',
          avatar: rc.peerInfo.avatar_url,
          status: rc.peerInfo.status_message || 'Available',
          lastMessage: rc.lastMessage,
          lastTime: rc.lastTime,
          isRecent: true
        };
      }
    });

    userList.forEach(u => {
      if (!chatMap[u.id]) {
        chatMap[u.id] = {
          id: u.id,
          name: u.username || 'User',
          avatar: u.avatar_url,
          status: u.status_message || 'Available',
          lastMessage: 'Tap to start conversation',
          lastTime: null,
          isRecent: false
        };
      }
    });

    let chatsArr = Object.values(chatMap);

    // Filter by Archive status
    if (currentTabFilter === 'archived') {
      chatsArr = chatsArr.filter(c => archivedChatIds.includes(c.id));
    } else {
      chatsArr = chatsArr.filter(c => !archivedChatIds.includes(c.id));
    }

    // Filter by custom tab pill
    if (currentTabFilter === 'unread') {
      chatsArr = chatsArr.filter(c => (unreadCounts[c.id] || 0) > 0);
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      chatsArr = chatsArr.filter(c => c.name.toLowerCase().includes(q) || c.status.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
    }

    // Sort pinned to top, then recent by timestamp
    chatsArr.sort((a, b) => {
      const isAPinned = pinnedChatIds.includes(a.id);
      const isBPinned = pinnedChatIds.includes(b.id);
      if (isAPinned && !isBPinned) return -1;
      if (!isAPinned && isBPinned) return 1;

      const timeA = a.lastTime ? new Date(a.lastTime).getTime() : 0;
      const timeB = b.lastTime ? new Date(b.lastTime).getTime() : 0;
      return timeB - timeA;
    });

    return chatsArr;
  };

  const filteredDisplayList = getDisplayChats();
  const archivedCount = archivedChatIds.length;
  const currentAvatar = currentProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  return (
    <>
      <style>{`
        :root{
          --bg-deep:#0f1721;
          --bg-panel:#17212b;
          --bg-card:#182533;
          --border-glow:rgba(82, 136, 193, 0.3);
          --tg-accent:#5288c1;
          --tg-accent-hover:#4374a7;
          --tg-pill-bg:rgba(255, 255, 255, 0.07);
          --tg-pill-active:#5288c1;
          --tg-destructive:#e17076;
          --tg-online:#4cd964;
          --text-main:#f5f5f5;
          --text-muted:#7f91a4;
        }
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,sans-serif;scrollbar-width:thin;scrollbar-color:var(--tg-accent) var(--bg-deep)}
        body{background-color:var(--bg-deep);color:var(--text-main);height:100vh;overflow:hidden;display:flex;justify-content:center;align-items:center;position:relative}
        .app-container{display:flex;flex-direction:column;width:100vw;height:100vh;max-width:1440px;position:relative;z-index:5;background:var(--bg-deep)}
        .workspace{flex:1;display:flex;flex-direction:column;height:100vh;overflow:hidden;position:relative}
        
        .side-nav-drawer{position:absolute;top:60px;left:-100vw;width:280px;height:calc(100% - 60px);background:var(--bg-panel);border-right:1px solid rgba(255, 255, 255, 0.08);backdrop-filter:blur(20px);z-index:90;transition:left 0.3s cubic-bezier(0.16, 1, 0.3, 1);padding:20px 14px;display:flex;flex-direction:column;gap:8px;box-shadow:15px 0 30px rgba(0, 0, 0, 0.7)}
        .side-nav-drawer.open{left:0}
        .side-nav-item{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:10px;color:var(--text-main);border:1px solid transparent;background:transparent;cursor:pointer;transition:all 0.2s;font-size:0.9rem;font-weight:500}
        .side-nav-item:hover,.side-nav-item.active{color:#fff;background:rgba(255, 255, 255, 0.06)}
        
        /* TELEGRAM TOP HEADER STYLING */
        .top-header{height:60px;border-bottom:1px solid rgba(255, 255, 255, 0.06);display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:var(--bg-panel);position:relative;z-index:95}
        .top-header-left{display:flex;align-items:center;gap:16px}
        .icon-action-btn{background:transparent;border:none;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);transition:all 0.2s}
        .icon-action-btn:hover{color:#fff;background:rgba(255, 255, 255, 0.08)}
        .brand-title-area h1{font-size:1.15rem;font-weight:600;letter-spacing:0.01em;color:#fff}
        .top-header-right{display:flex;align-items:center;gap:8px}
        .avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg, var(--tg-accent), #8774e1);display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;flex-shrink:0}
        .avatar img{width:100%;height:100%;object-fit:cover}

        /* TELEGRAM SEARCH BAR */
        .search-bar-wrapper{padding:10px 16px 6px 16px;background:var(--bg-panel)}
        .search-box{position:relative;width:100%}
        .search-box input{width:100%;background:var(--bg-deep);border:1px solid transparent;border-radius:22px;padding:9px 16px 9px 42px;color:var(--text-main);font-size:0.88rem;outline:none;transition:all 0.25s}
        .search-box input:focus{border-color:var(--tg-accent);background:var(--bg-card)}
        .search-box svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:16px;height:16px;stroke:var(--text-muted);fill:none;stroke-width:2}

        /* TELEGRAM HORIZONTAL SCROLLABLE TAB PILLS */
        .tab-pills-container{display:flex;align-items:center;gap:8px;padding:8px 16px 12px 16px;background:var(--bg-panel);border-bottom:1px solid rgba(0, 0, 0, 0.3);overflow-x:auto;scrollbar-width:none}
        .tab-pills-container::-webkit-scrollbar{display:none}
        .tab-pill{background:var(--tg-pill-bg);color:var(--text-muted);border:none;padding:6px 14px;border-radius:16px;font-size:0.8rem;font-weight:600;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;transition:all 0.2s}
        .tab-pill:hover{color:#fff;background:rgba(255, 255, 255, 0.12)}
        .tab-pill.active{background:var(--tg-pill-active);color:#fff}
        .pill-badge{background:rgba(0, 0, 0, 0.25);color:#fff;font-size:0.7rem;padding:1px 6px;border-radius:10px;font-weight:700}
        
        .main-content{flex:1;overflow-y:auto;padding:0;display:flex;flex-direction:column}
        .view-section{display:none;flex-direction:column;animation:fadeIn 0.2s ease forwards}
        .view-section.active{display:flex}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}

        /* TELEGRAM/WHATSAPP CHAT LIST ROW ITEM */
        .chat-list-group{display:flex;flex-direction:column}
        .archived-banner-row{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg-card);border-bottom:1px solid rgba(0, 0, 0, 0.2);cursor:pointer;transition:background 0.2s}
        .archived-banner-row:hover{background:rgba(255, 255, 255, 0.04)}
        .archived-banner-left{display:flex;align-items:center;gap:16px}
        .archived-icon-box{width:46px;height:46px;border-radius:50%;background:rgba(127, 145, 164, 0.15);display:flex;align-items:center;justify-content:center;color:var(--text-muted)}
        
        .chat-row-item{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:transparent;border-bottom:1px solid rgba(255, 255, 255, 0.03);cursor:pointer;transition:background 0.15s;user-select:none;position:relative}
        .chat-row-item:hover{background:var(--bg-card)}
        .chat-row-left{display:flex;align-items:center;gap:14px;min-width:0;flex:1}
        .chat-row-avatar-box{position:relative;width:48px;height:48px;min-width:48px;border-radius:50%;background:linear-gradient(135deg, var(--tg-accent), #6c5ce7);display:flex;align-items:center;justify-content:center;font-size:1.05rem;font-weight:700;color:#fff;overflow:hidden;flex-shrink:0}
        .chat-row-avatar-box img{width:100%;height:100%;object-fit:cover;border-radius:50%}
        .online-dot{position:absolute;width:11px;height:11px;right:1px;bottom:1px;border-radius:50%;background:var(--tg-online);border:2px solid var(--bg-deep)}
        
        .chat-row-details{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
        .chat-row-header-line{display:flex;align-items:center;justify-content:space-between;gap:8px}
        .chat-row-name{font-size:0.93rem;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .chat-row-time{font-size:0.72rem;color:var(--text-muted);white-space:nowrap}
        
        .chat-row-sub-line{display:flex;align-items:center;justify-content:space-between;gap:8px}
        .chat-row-snippet{font-size:0.8rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
        .chat-row-badges{display:flex;align-items:center;gap:6px;flex-shrink:0}
        .pin-icon{color:var(--text-muted);font-size:0.85rem}
        .unread-pill{background:var(--tg-accent);color:#fff;font-size:0.68rem;font-weight:700;padding:2px 7px;border-radius:12px;min-width:18px;text-align:center}
        .open-action-tag{background:var(--tg-accent);color:#fff;font-size:0.7rem;font-weight:600;padding:4px 12px;border-radius:14px;border:none;cursor:pointer}

        /* TELEGRAM ACTIVE CHAT OVERLAY ROOM */
        .chat-room-container{position:fixed;inset:0;left:50%;transform:translateX(-50%);width:min(100%, 920px);height:100dvh;max-height:none;display:flex;flex-direction:column;background:var(--bg-deep);overflow:hidden;z-index:105}
        .chat-room-header{min-height:58px;padding:8px 16px;display:flex;align-items:center;justify-content:space-between;background:var(--bg-panel);border-bottom:1px solid rgba(0, 0, 0, 0.3)}
        .chat-room-title-area{min-width:0;display:flex;align-items:center;gap:12px;cursor:pointer}
        .chat-room-title-area .chat-avatar{position:relative;width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg, var(--tg-accent), #50a7ea);color:#fff;font-weight:bold}
        .chat-room-title{min-width:0;display:flex;flex-direction:column;gap:1px}
        .chat-room-title h3{margin:0;color:#fff;font-size:0.95rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .chat-room-title span{color:var(--text-muted);font-size:0.72rem}
        .chat-room-actions{display:flex;align-items:center;gap:4px;color:var(--text-muted)}
        .chat-room-actions svg{width:22px;height:22px;padding:8px;box-sizing:content-box;cursor:pointer;border-radius:50%;transition:background 0.2s}
        .chat-room-actions svg:hover{color:#fff;background:rgba(255, 255, 255, 0.08)}
        
        .chat-messages-area{position:relative;flex:1;min-height:0;padding:16px clamp(12px, 3vw, 28px) 100px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;background:var(--bg-deep);scroll-behavior:smooth}
        .chat-time-divider{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;width:fit-content;margin:12px auto 8px;padding:3px 10px;color:var(--text-muted);font-size:0.7rem;font-weight:600;background:rgba(23, 33, 43, 0.85);border-radius:10px}
        
        .message-bubble{position:relative;z-index:1;width:fit-content;max-width:min(78%, 560px);padding:7px 11px 5px;color:#fff;font-size:0.88rem;line-height:1.4;border-radius:10px;word-wrap:break-word}
        .message-bubble.incoming{align-self:flex-start;background:var(--bg-panel);border-bottom-left-radius:2px}
        .message-bubble.outgoing{align-self:flex-end;background:#2b5278;border-bottom-right-radius:2px}
        .message-sender{margin-bottom:2px;color:var(--tg-accent);font-size:0.74rem;font-weight:700}
        .message-bubble.outgoing .message-sender{color:#73b9ff}
        
        /* FLOATING INPUT BAR */
        .chat-input-floating-wrapper{position:absolute;left:0;right:0;bottom:0;width:100%;padding:8px clamp(10px, 3vw, 20px) calc(8px + env(safe-area-inset-bottom));background:var(--bg-panel);z-index:20}
        .chat-input-bar{width:min(100%, 860px);margin:0 auto;display:flex;align-items:center;gap:8px}
        .chat-input-bar textarea{flex:1;width:100%;min-height:36px;max-height:120px;padding:8px 12px;background:var(--bg-deep);border:none;border-radius:18px;outline:none;resize:none;color:#fff;font-family:inherit;font-size:0.9rem}
        .chat-tools-group{display:flex;align-items:center;gap:6px}
        .voice-btn,.send-btn{width:36px;height:36px;flex:0 0 36px;display:flex;align-items:center;justify-content:center;border:none;border-radius:50%;cursor:pointer;transition:all 0.2s}
        .voice-btn{background:transparent;color:var(--text-muted)}
        .voice-btn:hover{color:#fff;background:rgba(255, 255, 255, 0.08)}
        .voice-btn.listening{background:rgba(225, 112, 118, 0.2);color:var(--tg-destructive);animation:pulseMic 1.5s infinite}
        @keyframes pulseMic{0%{box-shadow:0 0 0 0 rgba(225, 112, 118, 0.4)}70%{box-shadow:0 0 0 10px rgba(225, 112, 118, 0)}100%{box-shadow:0 0 0 0 rgba(225, 112, 118, 0)}}
        .send-btn{background:var(--tg-accent);color:#fff}
        .send-btn:hover{background:var(--tg-accent-hover)}

        .error-notification-banner{display:none;background:rgba(225, 112, 118, 0.12);border:1px solid var(--tg-destructive);border-radius:8px;padding:10px 14px;margin:10px 16px 0 16px;align-items:center;justify-content:space-between}
        .error-notification-banner.active{display:flex}

        .overlay-screen{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0, 0, 0, 0.7);backdrop-filter:blur(6px);z-index:100;display:none;align-items:center;justify-content:center;padding:16px}
        .overlay-screen.active{display:flex}
        .modal-box{background:var(--bg-panel);border-radius:12px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column}
        .modal-header{padding:14px 18px;border-bottom:1px solid rgba(255, 255, 255, 0.06);display:flex;align-items:center;justify-content:space-between}
        .modal-header h3{font-size:1rem;color:#fff;font-weight:600}
        .close-modal-btn{background:none;border:none;color:var(--text-muted);font-size:1.8rem;cursor:pointer;line-height:1}
        .modal-body{padding:18px;display:flex;flex-direction:column;gap:14px}
        
        .decorated-prompt-box{background:var(--bg-card);border:1px solid var(--tg-accent);border-radius:12px;padding:16px;position:relative}
        .solid-animated-tag{display:inline-block;padding:2px 6px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;color:#fff}
        .tag-admin{background:linear-gradient(135deg, #e17076, #d63031)}
        .tag-member{background:linear-gradient(135deg, var(--tg-accent), #0984e3)}
        
        .form-group{display:flex;flex-direction:column;gap:6px}
        .form-group label{font-size:0.75rem;color:var(--text-muted);font-weight:600}
        .form-group input[type="text"],.form-group textarea,.form-group select{background:var(--bg-deep);border:1px solid rgba(255, 255, 255, 0.08);border-radius:8px;padding:8px 12px;color:#fff;font-size:0.85rem;outline:none}
        .form-group input:focus,.form-group textarea:focus{border-color:var(--tg-accent)}
        
        .primary-action-btn{background:var(--tg-accent);border:none;color:#fff;font-weight:600;padding:10px;border-radius:8px;cursor:pointer;width:100%;font-size:0.88rem}
        .primary-action-btn:hover{background:var(--tg-accent-hover)}
        .danger-action-btn{background:rgba(225, 112, 118, 0.15);border:1px solid var(--tg-destructive);color:var(--tg-destructive);font-weight:600;padding:10px;border-radius:8px;cursor:pointer;width:100%;font-size:0.88rem}
        
        .notification-item-card{background:var(--bg-card);border:1px solid rgba(255, 255, 255, 0.04);border-radius:10px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
        .flex-row{display:flex;align-items:center;gap:12px}
      `}</style>

      <div className="app-container">
        <main className="workspace">

          {/* TELEGRAM SIDE DRAWER */}
          <div className={`side-nav-drawer ${isSideNavOpen ? 'open' : ''}`} id="sideNavDrawer">
            <div className={`side-nav-item ${activeMainView === 'chats' ? 'active' : ''}`} onClick={() => { setActiveMainView('chats'); toggleSideMenu(); }}>
              💬 All Chats
            </div>
            <div className={`side-nav-item ${activeMainView === 'predictions' ? 'active' : ''}`} onClick={() => { setActiveMainView('predictions'); toggleSideMenu(); }}>
              🔔 Notifications
            </div>
            <div className="side-nav-item" onClick={() => { openModal('newDirectChatModal'); toggleSideMenu(); }}>
              👤 Start Direct Chat
            </div>
            <div className={`side-nav-item ${activeMainView === 'userHub' ? 'active' : ''}`} onClick={() => { setActiveMainView('userHub'); toggleSideMenu(); }}>
              ⚙️ My Profile
            </div>
            <div className="side-nav-item" onClick={() => navigateTo('dashboard')} style={{ color: 'var(--tg-destructive)' }}>
              🚪 Close Interface
            </div>
          </div>

          {/* SECTION 1: Top Header Bar */}
          <header className="top-header">
            <div className="top-header-left">
              <button className="icon-action-btn" onClick={toggleSideMenu} title="Menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="brand-title-area">
                <h1>Telegram</h1>
              </div>
            </div>

            <div className="top-header-right">
              <button className="icon-action-btn" onClick={() => openModal('newDirectChatModal')} title="New Direct Chat">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <div className="avatar" onClick={() => setActiveMainView('userHub')} title="Profile">
                <img src={currentAvatar} alt="User" />
              </div>
            </div>
          </header>

          {/* SECTION 2: Search Input Field */}
          <div className="search-bar-wrapper">
            <div className="search-box">
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search Chats"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* SECTION 3: Horizontal Filter Tab Pills */}
          <div className="tab-pills-container">
            <button className={`tab-pill ${currentTabFilter === 'all' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('all')}>
              All <span className="pill-badge">{userList.length}</span>
            </button>
            <button className={`tab-pill ${currentTabFilter === 'unread' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('unread')}>
              Unread
            </button>
            <button className={`tab-pill ${currentTabFilter === 'archived' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('archived')}>
              Archived <span className="pill-badge">{archivedCount}</span>
            </button>
          </div>

          {/* Error Notification Banner */}
          <div className={`error-notification-banner ${errorBanner.active ? 'active' : ''}`}>
            <div className="flex-row">
              <span style={{ color: 'var(--tg-destructive)', fontWeight: 'bold' }}>!</span>
              <div>
                <h4 style={{ fontSize: '0.82rem', color: '#fff' }}>{errorBanner.title || 'Notice'}</h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{errorBanner.message}</p>
              </div>
            </div>
            <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={dismissErrorBanner}>&times;</button>
          </div>

          {/* Dynamic Views Container */}
          <div className="main-content">

            {/* VIEW 1: DIRECT CHATS LIST */}
            <div className={`view-section ${activeMainView === 'chats' ? 'active' : ''}`}>
              <div className="chat-list-group">

                {/* ARCHIVED CHATS BANNER */}
                {archivedCount > 0 && currentTabFilter !== 'archived' && (
                  <div className="archived-banner-row" onClick={() => setCurrentTabFilter('archived')}>
                    <div className="archived-banner-left">
                      <div className="archived-icon-box">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="21 8 21 21 3 21 3 8" />
                          <rect x="1" y="3" width="22" height="5" />
                          <line x1="10" y1="12" x2="14" y2="12" />
                        </svg>
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.92rem', color: '#fff' }}>Archived Chats</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Conversations put on hold</p>
                      </div>
                    </div>
                    <span className="pill-badge">{archivedCount}</span>
                  </div>
                )}

                {/* CHAT ROWS */}
                {filteredDisplayList.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    No user conversations found in this view.
                  </div>
                ) : (
                  filteredDisplayList.map(item => {
                    const unread = unreadCounts[item.id] || 0;
                    const isPinned = pinnedChatIds.includes(item.id);

                    return (
                      <div
                        className="chat-row-item"
                        key={item.id}
                        onClick={() => openDirectChatRoom(item)}
                        onMouseDown={(e) => startChatLongPress(e, item.id)}
                        onMouseUp={cancelChatLongPress}
                        onMouseLeave={cancelChatLongPress}
                        onTouchStart={(e) => startChatLongPress(e, item.id)}
                        onTouchEnd={cancelChatLongPress}
                      >
                        <div className="chat-row-left">
                          <div className="chat-row-avatar-box">
                            {item.avatar ? <img src={item.avatar} alt={item.name} /> : item.name.substring(0, 2).toUpperCase()}
                            <div className="online-dot"></div>
                          </div>
                          <div className="chat-row-details">
                            <div className="chat-row-header-line">
                              <span className="chat-row-name">{item.name}</span>
                              <span className="chat-row-time">{formatDetailedTimestamp(item.lastTime)}</span>
                            </div>
                            <div className="chat-row-sub-line">
                              <span className="chat-row-snippet">{item.lastMessage}</span>
                              <div className="chat-row-badges">
                                {isPinned && <span className="pin-icon" onClick={(e) => togglePinChat(item.id, e)}>📌</span>}
                                {unread > 0 && <span className="unread-pill">{unread}</span>}
                                <button className="open-action-tag" onClick={(e) => { e.stopPropagation(); openDirectChatRoom(item); }}>
                                  Open
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* VIEW 2: PROFILE HUB */}
            <div className={`view-section ${activeMainView === 'userHub' ? 'active' : ''}`} style={{ padding: '16px' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="flex-row">
                  <div className="avatar" style={{ width: '60px', height: '60px' }}>
                    <img src={currentAvatar} alt="User" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>{currentProfile ? currentProfile.username : 'User Profile'}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{currentProfile ? currentProfile.status_message : 'Online & available'}</p>
                  </div>
                </div>
                <button className="primary-action-btn" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => openModal('editProfileModal')}>Edit Profile</button>
              </div>
            </div>

            {/* VIEW 3: NOTIFICATIONS HUB */}
            <div className={`view-section ${activeMainView === 'predictions' ? 'active' : ''}`} style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Notifications</h3>
                <button className="danger-action-btn" style={{ width: 'auto', padding: '4px 12px', fontSize: '0.75rem' }} onClick={promptClearAllNotifications}>Clear History</button>
              </div>
              <div>
                {notifications.length === 0 ? (
                  <div className="notification-item-card">
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No recent notifications.</span>
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
                      <div>
                        <h4 style={{ fontSize: '0.88rem', color: '#fff' }}>{n.title}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.message}</p>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--tg-accent)' }}>{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* MODAL: DIRECT CHAT ROOM */}
      <div className={`overlay-screen ${modals.chatRoomModal ? 'active' : ''}`} id="chatRoomModal">
        <div className="chat-room-container" ref={chatContainerRef}>
          <div className="chat-room-header">
            <div className="chat-room-title-area" onClick={() => openModal('userAboutModal')}>
              <div className="avatar">
                {currentActivePeer?.avatar_url ? (
                  <img src={currentActivePeer.avatar_url} alt="Peer" />
                ) : (
                  currentActivePeer?.username ? currentActivePeer.username.substring(0, 2).toUpperCase() : 'U'
                )}
              </div>
              <div className="chat-room-title">
                <h3>{currentActivePeer ? currentActivePeer.username || currentActivePeer.name : 'Chat User'}</h3>
                <span>{currentActivePeer?.status || 'online'}</span>
              </div>
            </div>
            <div className="chat-room-actions">
              <svg onClick={() => closeModal('chatRoomModal')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>

          <div className="chat-messages-area" ref={chatMessagesAreaRef}>
            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', margin: '8px 0' }}>End-to-end user message session</div>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '20px 0' }}>Say hello to start the conversation!</div>
            ) : (
              (() => {
                let lastDivider = '';
                return messages.map(m => {
                  const dividerText = get3HourTimeDivider(m.created_at);
                  const showDivider = dividerText !== lastDivider;
                  if (showDivider) lastDivider = dividerText;

                  const isOwnMessage = m.sender_id === currentUser?.id;

                  return (
                    <React.Fragment key={m.id}>
                      {showDivider && <div className="chat-time-divider">{dividerText}</div>}
                      <div className={`message-bubble ${isOwnMessage ? 'outgoing' : 'incoming'}`}>
                        <p style={{ fontSize: '0.88rem', color: '#fff' }}>{formatMentions(m.content)}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.62rem', color: 'rgba(255,255,255,0.6)' }}>
                          {isOwnMessage && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span style={{ cursor: 'pointer', color: '#73b9ff' }} onClick={() => editMessage(m.id, m.content)}>Edit</span>
                              <span style={{ cursor: 'pointer', color: 'var(--tg-destructive)' }} onClick={() => deleteMessage(m.id)}>Delete</span>
                            </div>
                          )}
                          <span style={{ marginLeft: 'auto' }}>{formatDetailedTimestamp(m.created_at)}</span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()
            )}
          </div>

          {/* FLOATING INPUT BAR WITH VOICE TYPING */}
          <div className="chat-input-floating-wrapper">
            <div className="chat-input-bar">
              <textarea
                placeholder="Message"
                rows={1}
                value={chatInputText}
                onChange={(e) => {
                  setChatInputText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
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
                  title="Google Voice Typing"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                  </svg>
                </button>
                <button className="send-btn" onClick={sendChatMessage} title="Send Message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: USER DETAILS */}
      <div className={`overlay-screen ${modals.userAboutModal ? 'active' : ''}`}>
        <div className="modal-box" style={{ textAlign: 'center' }}>
          <div className="modal-header">
            <h3>USER INFORMATION</h3>
            <button className="close-modal-btn" onClick={() => closeModal('userAboutModal')}>&times;</button>
          </div>
          <div className="modal-body" style={{ alignItems: 'center' }}>
            <div className="avatar" style={{ width: '70px', height: '70px', fontSize: '1.5rem' }}>
              {currentActivePeer?.username ? currentActivePeer.username.substring(0, 2).toUpperCase() : 'U'}
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.1rem' }}>{currentActivePeer?.username || currentActivePeer?.name}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{currentActivePeer?.status || 'Online & available'}</p>
            <button className="primary-action-btn" onClick={() => closeModal('userAboutModal')}>Back to Chat</button>
          </div>
        </div>
      </div>

      {/* MODAL: START NEW DIRECT CHAT */}
      <div className={`overlay-screen ${modals.newDirectChatModal ? 'active' : ''}`}>
        <div className="modal-box">
          <div className="modal-header">
            <h3>Start Direct Message</h3>
            <button className="close-modal-btn" onClick={() => closeModal('newDirectChatModal')}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>Filter Users</label>
              <input
                type="text"
                placeholder="Search username..."
                value={newChatSearchUser}
                onChange={(e) => setNewChatSearchUser(e.target.value)}
              />
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {userList
                .filter(u => u.username?.toLowerCase().includes(newChatSearchUser.toLowerCase()))
                .map(u => (
                  <div
                    key={u.id}
                    style={{ background: 'var(--bg-deep)', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => {
                      closeModal('newDirectChatModal');
                      openDirectChatRoom(u);
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: '0.88rem' }}>{u.username}</span>
                    <button className="open-action-tag">Message</button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: EDIT PROFILE */}
      <div className={`overlay-screen ${modals.editProfileModal ? 'active' : ''}`}>
        <div className="modal-box">
          <div className="modal-header">
            <h3>Edit Profile Details</h3>
            <button className="close-modal-btn" onClick={() => closeModal('editProfileModal')}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={editProfileName} onChange={(e) => setEditProfileName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Status Message</label>
              <input type="text" value={editProfileStatus} onChange={(e) => setEditProfileStatus(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Avatar URL</label>
              <input type="text" value={editProfileAvatar} onChange={(e) => setEditProfileAvatar(e.target.value)} />
            </div>
            <button className="primary-action-btn" onClick={saveProfileChanges}>Save Changes</button>
          </div>
        </div>
      </div>

      {/* DYNAMIC PROMPT OVERLAY */}
      {customPrompt && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <div className="decorated-prompt-box">
              <h4 style={{ color: customPrompt.titleColor || 'var(--tg-accent)', fontSize: '0.9rem', marginBottom: '8px' }}>{customPrompt.title}</h4>
              {customPrompt.message && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{customPrompt.message}</p>}
              
              {customPrompt.type === 'textarea' && (
                <textarea
                  id="promptEditInput"
                  defaultValue={customPrompt.defaultValue || ''}
                  style={{ width: '100%', background: 'var(--bg-deep)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '0.85rem' }}
                  rows={3}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button onClick={() => setCustomPrompt(null)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button
                  style={{ background: customPrompt.confirmBg || 'var(--tg-accent)', border: 'none', color: customPrompt.confirmColor || '#fff', fontWeight: 'bold', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
                  onClick={() => {
                    let val;
                    if (customPrompt.type === 'textarea') val = document.getElementById('promptEditInput')?.value;
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
