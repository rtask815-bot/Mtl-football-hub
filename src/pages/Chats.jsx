import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE CLIENT INIT ---
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- LOCAL STORAGE UTILITY ENGINE ---
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

export default function ChatPage({ onNavigateDashboard }) {
  // --- STATE MANAGEMENT ---
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [chatRequests, setChatRequests] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [currentOpenChat, setCurrentOpenChat] = useState(null); // Selected peer user profile
  const [currentTabFilter, setCurrentTabFilter] = useState('chats'); // 'chats', 'users', 'pending'
  const [searchQuery, setSearchQuery] = useState('');

  // Messages & Input State
  const [messages, setMessages] = useState([]);
  const [messageInputText, setMessageInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);

  // Request Dialog State
  const [requestTargetUser, setRequestTargetUser] = useState(null);
  const [requestIntroText, setRequestIntroText] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Navigation Drawer & Modals
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'sendRequest', 'chatAbout', 'notifications', 'editProfile'

  // Edit Profile Inputs
  const [editUsername, setEditUsername] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  // Error Banner State
  const [errorBanner, setErrorBanner] = useState({ active: false, title: '', message: '' });

  // Refs
  const canvasRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // --- INITIALIZATION & LIFECYCLE ---
  useEffect(() => {
    loadCachedState();
    verifySessionAndInitialize();
    initSpaceCanvas();
  }, []);

  useEffect(() => {
    if (currentOpenChat && currentUser) {
      fetchMessages(currentOpenChat.id);
    }
  }, [currentOpenChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Dynamic Textarea Auto-Resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [messageInputText]);

  // --- LOCAL STORAGE CACHE HANDLER ---
  const loadCachedState = () => {
    const cachedProfile = LocalStore.get('profile');
    if (cachedProfile) {
      setCurrentProfile(cachedProfile);
      setEditUsername(cachedProfile.username || '');
      setEditStatus(cachedProfile.status_message || '');
      setEditAvatarUrl(cachedProfile.avatar_url || '');
    }

    const cachedUsers = LocalStore.get('users') || [];
    setAvailableUsers(cachedUsers);

    const cachedRequests = LocalStore.get('chat_requests') || [];
    setChatRequests(cachedRequests);

    const cachedUnread = LocalStore.get('unread') || {};
    setUnreadCounts(cachedUnread);

    const cachedNotifs = LocalStore.get('notifications') || [];
    setNotifications(cachedNotifs);
    setUnreadNotificationCount(cachedNotifs.filter(n => !n.read).length);
  };

  // --- SUPABASE SESSION & INITIALIZATION ---
  const verifySessionAndInitialize = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session || !session.user) {
        return;
      }
      setCurrentUser(session.user);
      await fetchOrCreateProfile(session.user);
      await syncAllUserData(session.user.id);
      setupRealtimeSubscriptions(session.user.id);
    } catch (err) {
      showErrorBanner("Authentication Error", "Unable to establish connection with Supabase services.");
    }
  };

  const fetchOrCreateProfile = async (user) => {
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const fallbackName = user.email ? user.email.split('@')[0] : 'Node_' + user.id.substring(0, 5);
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{ id: user.id, username: fallbackName, status_message: 'Connected to Direct Chat Node.' }])
        .select()
        .single();

      if (!createError) profile = newProfile;
    }

    const activeProfile = profile || {
      id: user.id,
      username: user.email ? user.email.split('@')[0] : 'Operator',
      avatar_url: '',
      status_message: 'Connected to Orbital Node 3099.',
    };

    setCurrentProfile(activeProfile);
    setEditUsername(activeProfile.username || '');
    setEditStatus(activeProfile.status_message || '');
    setEditAvatarUrl(activeProfile.avatar_url || '');
    LocalStore.set('profile', activeProfile);
  };

  // --- SYNC USERS, REQUESTS & ACTIVE CHATS ---
  const syncAllUserData = async (currentUserId) => {
    // 1. Fetch all other registered users
    const { data: users, error: usersErr } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId);

    if (!usersErr && users) {
      setAvailableUsers(users);
      LocalStore.set('users', users);
    }

    // 2. Fetch Chat Requests (Sent or Received)
    const { data: requests, error: reqErr } = await supabase
      .from('chat_requests')
      .select(`
        *,
        sender:sender_id(*),
        receiver:receiver_id(*)
      `)
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

    if (!reqErr && requests) {
      setChatRequests(requests);
      LocalStore.set('chat_requests', requests);

      // Derive Active Approved Peer Users
      const approvedPeers = requests
        .filter(r => r.status === 'approved')
        .map(r => (r.sender_id === currentUserId ? r.receiver : r.sender));

      setActiveChats(approvedPeers);
    }
  };

  const setupRealtimeSubscriptions = (userId) => {
    supabase
      .channel('realtime-private-chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_messages' }, payload => {
        if (payload.new) {
          const peerId = payload.new.sender_id === userId ? payload.new.receiver_id : payload.new.sender_id;
          if (currentOpenChat && currentOpenChat.id === peerId) {
            fetchMessages(peerId);
          } else if (payload.new.receiver_id === userId) {
            setUnreadCounts(prev => {
              const updated = { ...prev, [peerId]: (prev[peerId] || 0) + 1 };
              LocalStore.set('unread', updated);
              return updated;
            });
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_requests' }, () => syncAllUserData(userId))
      .subscribe();
  };

  // --- ERROR BANNER & NOTIFICATION ENGINE ---
  const showErrorBanner = (title, message) => {
    setErrorBanner({ active: true, title, message });
    addNotification(title, message);
  };

  const addNotification = (title, message) => {
    const newNotif = {
      id: Date.now(),
      title,
      message,
      read: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      LocalStore.set('notifications', updated);
      setUnreadNotificationCount(updated.filter(n => !n.read).length);
      return updated;
    });
  };

  const markNotificationsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      LocalStore.set('notifications', updated);
      setUnreadNotificationCount(0);
      return updated;
    });
  };

  // --- CHAT REQUEST SYSTEM ---
  const handleInitiateRequestModal = (targetUser) => {
    setRequestTargetUser(targetUser);
    setRequestIntroText(`Hello ${targetUser.username}, I would like to establish a private chat session.`);
    setActiveModal('sendRequest');
  };

  const handleSendChatRequest = async () => {
    if (!requestTargetUser || !currentUser) return;

    const { error } = await supabase
      .from('chat_requests')
      .insert([{
        sender_id: currentUser.id,
        receiver_id: requestTargetUser.id,
        intro_message: requestIntroText.trim(),
        status: 'pending'
      }]);

    if (!error) {
      addNotification("Request Sent", `Chat invitation dispatched to ${requestTargetUser.username}.`);
      setActiveModal(null);
      await syncAllUserData(currentUser.id);
    } else {
      showErrorBanner("Request Failed", error.message);
    }
  };

  const handleRespondToRequest = async (requestId, newStatus, senderUsername) => {
    const { error } = await supabase
      .from('chat_requests')
      .update({ status: newStatus })
      .eq('id', requestId);

    if (!error) {
      addNotification("Chat Request Updated", `Request from ${senderUsername} was ${newStatus}.`);
      await syncAllUserData(currentUser.id);
    } else {
      showErrorBanner("Action Failed", error.message);
    }
  };

  // --- MESSAGES FETCH & TIMESTAMPS ---
  const fetchMessages = async (peerUserId) => {
    const localKey = `msgs_${currentUser.id}_${peerUserId}`;
    const cached = LocalStore.get(localKey);
    if (cached) setMessages(cached);

    const { data, error } = await supabase
      .from('private_messages')
      .select(`
        *,
        sender:sender_id(username, avatar_url)
      `)
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${peerUserId}),and(sender_id.eq.${peerUserId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      LocalStore.set(localKey, data);
      
      // Clear unread count for active room
      setUnreadCounts(prev => {
        const updated = { ...prev, [peerUserId]: 0 };
        LocalStore.set('unread', updated);
        return updated;
      });
    }
  };

  const getTimeCategory = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'YESTERDAY';
    if (diffDays <= 7) return 'LAST WEEK';
    return 'PREVIOUS MONTH';
  };

  const processMessagesWithDividers = (msgList) => {
    const items = [];
    let lastCategory = null;

    msgList.forEach((msg) => {
      const category = getTimeCategory(msg.created_at);
      if (category !== lastCategory) {
        items.push({ isDivider: true, id: `divider-${msg.id}`, label: category });
        lastCategory = category;
      }
      items.push({ ...msg, isDivider: false });
    });

    return items;
  };

  // --- MESSAGE ACTIONS (SEND, EDIT, DELETE) ---
  const handleSendMessage = async () => {
    if (!messageInputText.trim() || !currentOpenChat || !currentUser) return;

    if (editingMessageId) {
      const { error } = await supabase
        .from('private_messages')
        .update({ content: messageInputText.trim(), is_edited: true })
        .eq('id', editingMessageId);

      if (!error) {
        setEditingMessageId(null);
        setMessageInputText('');
        fetchMessages(currentOpenChat.id);
      } else {
        showErrorBanner("Update Failed", error.message);
      }
    } else {
      const textToSend = messageInputText.trim();
      setMessageInputText('');
      const { error } = await supabase
        .from('private_messages')
        .insert([{
          sender_id: currentUser.id,
          receiver_id: currentOpenChat.id,
          content: textToSend
        }]);

      if (!error) {
        fetchMessages(currentOpenChat.id);
      } else {
        showErrorBanner("Transmission Failed", error.message);
      }
    }
  };

  const handleDeleteMessage = async (msgId) => {
    const { error } = await supabase.from('private_messages').delete().eq('id', msgId);
    if (!error) {
      fetchMessages(currentOpenChat.id);
    } else {
      showErrorBanner("Deletion Error", error.message);
    }
  };

  const handleStartEditMessage = (msg) => {
    setEditingMessageId(msg.id);
    setMessageInputText(msg.content);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const payload = {
      username: editUsername,
      status_message: editStatus,
      avatar_url: editAvatarUrl,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (!error && data) {
      setCurrentProfile(data);
      LocalStore.set('profile', data);
      setActiveModal(null);
    } else {
      showErrorBanner("Profile Update Error", error?.message);
    }
  };

  // --- CANVA 3D STARFIELD BACKGROUND ---
  const initSpaceCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    let FOV = 350;
    let shipSpeed = 14;

    const stars = Array.from({ length: 800 }, () => ({
      x: (Math.random() - 0.5) * 3000,
      y: (Math.random() - 0.5) * 3000,
      z: Math.random() * 2000 + 10,
      size: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.8 ? '#00f3ff' : '#ffffff'
    }));

    function render() {
      ctx.fillStyle = '#020308';
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;

      for (let s of stars) {
        s.z -= shipSpeed;
        if (s.z <= 1) s.z = 2000;
        let k = FOV / s.z;
        let px = s.x * k + cx;
        let py = s.y * k + cy;

        if (px >= 0 && px <= W && py >= 0 && py <= H) {
          let alpha = Math.min(1, (1 - s.z / 2000));
          ctx.strokeStyle = s.color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = s.size;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + 2);
          ctx.stroke();
        }
      }
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  };

  // --- REQUEST & USER STATUS HELPERS ---
  const getRequestWithUser = (peerId) => {
    return chatRequests.find(r => 
      (r.sender_id === currentUser?.id && r.receiver_id === peerId) ||
      (r.receiver_id === currentUser?.id && r.sender_id === peerId)
    );
  };

  const getFilteredItems = () => {
    if (currentTabFilter === 'chats') {
      return activeChats.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (currentTabFilter === 'users') {
      return availableUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (currentTabFilter === 'pending') {
      return chatRequests.filter(r => 
        r.receiver_id === currentUser?.id && 
        r.status === 'pending' &&
        r.sender?.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return [];
  };

  // Tag Highlight Utility
  const renderTextWithHighlightedTags = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w+|#\w+|\b(?:approved|pending|active|declined)\b)/gi);

    return parts.map((part, index) => {
      const lower = part.toLowerCase();
      if (['approved', 'pending', 'active', 'declined'].includes(lower)) {
        return (
          <span key={index} className="inline-tag-badge animated-solid-tag">
            {part}
          </span>
        );
      } else if (part.startsWith('@')) {
        return <span key={index} className="mention-tag-highlight">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="chat-app-root">
      <style>{`
        :root {
          --bg-deep: #020308;
          --bg-panel: rgba(11, 17, 38, 0.85);
          --bg-card: rgba(18, 27, 56, 0.75);
          --border-glow: rgba(0, 243, 255, 0.3);
          --border-glow-active: rgba(0, 243, 255, 0.85);
          --neon-cyan: #00f3ff;
          --neon-purple: #b000ff;
          --neon-blue: #2260ff;
          --neon-pink: #ff007f;
          --text-main: #f0f4ff;
          --text-muted: #8a9bb8;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, sans-serif; }
        
        body, html, .chat-app-root {
          width: 100vw; height: 100vh; overflow: hidden; background-color: var(--bg-deep);
          color: var(--text-main); position: relative;
        }

        #spaceCanvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; }

        .app-container { display: flex; flex-direction: column; width: 100vw; height: 100vh; position: relative; z-index: 5; }

        .top-header {
          height: 70px; border-bottom: 1px solid var(--border-glow); display: flex; align-items: center;
          justify-content: space-between; padding: 0 24px; background: rgba(5, 8, 20, 0.85); backdrop-filter: blur(15px);
          z-index: 95; flex-shrink: 0;
        }

        .top-header-left, .top-header-right { display: flex; align-items: center; gap: 14px; }

        .icon-action-btn {
          background: rgba(12, 19, 41, 0.8); border: 1px solid var(--border-glow); width: 42px; height: 42px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;
          color: var(--text-main); transition: all 0.3s; position: relative;
        }
        .icon-action-btn:hover { border-color: var(--neon-cyan); color: var(--neon-cyan); box-shadow: 0 0 15px rgba(0, 243, 255, 0.4); }

        .brand-title-area h1 {
          font-size: 1.2rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          background: linear-gradient(90deg, #fff, var(--neon-cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .avatar {
          width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
          display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--neon-cyan);
          cursor: pointer; flex-shrink: 0; color: #fff; font-weight: bold;
        }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }

        .notif-badge-count {
          position: absolute; top: -2px; right: -2px; background: var(--neon-pink); color: #fff;
          font-size: 0.65rem; font-weight: bold; padding: 2px 6px; border-radius: 10px; box-shadow: 0 0 8px var(--neon-pink);
        }

        .action-bar-section { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; gap: 16px; flex-shrink: 0; }
        .search-box { position: relative; flex: 1; max-width: 420px; }
        .search-box input {
          width: 100%; background: rgba(12, 19, 41, 0.8); border: 1px solid var(--border-glow); border-radius: 20px;
          padding: 10px 16px 10px 40px; color: var(--text-main); font-size: 0.85rem; outline: none;
        }
        .search-box input:focus { border-color: var(--neon-cyan); box-shadow: 0 0 15px rgba(0,243,255,0.3); }

        .main-content { flex: 1; overflow-y: auto; padding: 10px 24px 30px 24px; display: flex; flex-direction: column; gap: 20px; }

        .section-title {
          font-size: 0.82rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--neon-cyan);
          margin-bottom: 10px; text-shadow: 0 0 8px rgba(0,243,255,0.4);
        }

        .pinned-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .pinned-card {
          background: linear-gradient(135deg, rgba(18, 27, 56, 0.9), rgba(11, 17, 38, 0.95));
          border: 1px solid rgba(176, 0, 255, 0.3); border-radius: 16px; padding: 18px; cursor: pointer;
          transition: all 0.3s; display: flex; flex-direction: column;
        }
        .pinned-card:hover { border-color: var(--neon-cyan); transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,243,255,0.25); }

        .group-tabs { display: flex; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; }
        .tab-btn {
          background: rgba(12, 19, 41, 0.85); border: 1px solid var(--border-glow); border-radius: 12px;
          color: var(--text-muted); font-size: 0.8rem; font-weight: 600; padding: 8px 16px; cursor: pointer;
        }
        .tab-btn.active { color: var(--neon-cyan); border-color: var(--neon-cyan); box-shadow: 0 0 15px rgba(0,243,255,0.3); }

        .user-item {
          background: rgba(12, 19, 41, 0.6); border: 1px solid rgba(0, 243, 255, 0.12); border-radius: 14px;
          padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; transition: all 0.25s;
        }
        .user-item:hover { background: rgba(18, 27, 56, 0.85); border-color: rgba(0, 243, 255, 0.4); }

        .action-btn-sm {
          background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple)); border: none; color: #fff;
          font-weight: 600; padding: 6px 14px; border-radius: 12px; font-size: 0.75rem; cursor: pointer;
        }
        .action-btn-sm.secondary { background: rgba(255,255,255,0.1); border: 1px solid var(--border-glow); }

        .animated-solid-tag {
          background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple)); color: #fff !important;
          padding: 3px 10px; border-radius: 8px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
        }

        /* Modal Overlays */
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(2,3,8,0.85);
          backdrop-filter: blur(10px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal-card {
          background: rgba(11, 17, 38, 0.95); border: 1px solid var(--neon-cyan); border-radius: 20px;
          width: 100%; max-width: 500px; padding: 24px; display: flex; flex-direction: column; gap: 16px;
          box-shadow: 0 0 40px rgba(0,243,255,0.25);
        }

        .chat-room-container {
          display: flex; flex-direction: column; width: 100%; max-width: 900px; height: 100%;
          background: rgba(8, 12, 28, 0.98); border-radius: 20px; border: 1px solid var(--border-glow);
          box-shadow: 0 0 50px rgba(0, 243, 255, 0.2); overflow: hidden;
        }
        .chat-room-header {
          padding: 16px 24px; background: rgba(12, 19, 41, 0.95); border-bottom: 1px solid var(--border-glow);
          display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }
        .chat-messages-area { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
        .message-input-area { padding: 16px; background: rgba(12, 19, 41, 0.95); border-top: 1px solid var(--border-glow); display: flex; gap: 12px; }
        .message-input-area textarea {
          flex: 1; background: rgba(18, 27, 56, 0.8); border: 1px solid var(--border-glow); border-radius: 12px;
          color: #fff; padding: 10px 14px; outline: none; resize: none; font-size: 0.9rem;
        }
      `}</style>

      {/* 3D Canvas Background */}
      <canvas id="spaceCanvas" ref={canvasRef}></canvas>

      <div className="app-container">
        {/* Top Header */}
        <header className="top-header">
          <div className="top-header-left">
            <button className="icon-action-btn" onClick={() => setIsSideNavOpen(true)}>
              ☰
            </button>
            <div className="brand-title-area">
              <h1>MTL HUB // 1-on-1 Chat Node</h1>
            </div>
          </div>

          <div className="top-header-right">
            <button className="icon-action-btn" onClick={() => setActiveModal('notifications')}>
              🔔
              {unreadNotificationCount > 0 && (
                <span className="notif-badge-count">{unreadNotificationCount}</span>
              )}
            </button>
            <div className="avatar" onClick={() => setActiveModal('editProfile')}>
              {currentProfile?.avatar_url ? (
                <img src={currentProfile.avatar_url} alt="Profile" />
              ) : (
                currentProfile?.username?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
          </div>
        </header>

        {/* Action & Search Bar */}
        <div className="action-bar-section">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search users or chats..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <main className="main-content">
          {/* Active Conversations Spotlight */}
          <div className="section-title">Pinned Peer Channels</div>
          <div className="pinned-grid">
            {activeChats.slice(0, 3).map(peer => (
              <div className="pinned-card" key={peer.id} onClick={() => setCurrentOpenChat(peer)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="avatar">
                    {peer.avatar_url ? <img src={peer.avatar_url} alt="" /> : peer.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem' }}>{peer.username}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{peer.status_message}</p>
                  </div>
                </div>
              </div>
            ))}
            {activeChats.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No active peer chats yet. Discover users below to request a session.</p>
            )}
          </div>

          {/* Tab Filter Selection */}
          <div className="group-tabs">
            <button 
              className={`tab-btn ${currentTabFilter === 'chats' ? 'active' : ''}`}
              onClick={() => setCurrentTabFilter('chats')}
            >
              Active Chats ({activeChats.length})
            </button>
            <button 
              className={`tab-btn ${currentTabFilter === 'users' ? 'active' : ''}`}
              onClick={() => setCurrentTabFilter('users')}
            >
              Discover Users ({availableUsers.length})
            </button>
            <button 
              className={`tab-btn ${currentTabFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setCurrentTabFilter('pending')}
            >
              Pending Requests ({chatRequests.filter(r => r.receiver_id === currentUser?.id && r.status === 'pending').length})
            </button>
          </div>

          {/* List Content Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {getFilteredItems().map(item => {
              // Mode 1: Active Chats Tab
              if (currentTabFilter === 'chats') {
                return (
                  <div className="user-item" key={item.id} onClick={() => setCurrentOpenChat(item)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div className="avatar">
                        {item.avatar_url ? <img src={item.avatar_url} alt="" /> : item.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.9rem' }}>{item.username}</h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.status_message}</p>
                      </div>
                    </div>
                    {unreadCounts[item.id] > 0 && (
                      <span className="animated-solid-tag">{unreadCounts[item.id]} NEW</span>
                    )}
                  </div>
                );
              }

              // Mode 2: Discover Users Tab
              if (currentTabFilter === 'users') {
                const req = getRequestWithUser(item.id);
                return (
                  <div className="user-item" key={item.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div className="avatar">
                        {item.avatar_url ? <img src={item.avatar_url} alt="" /> : item.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.9rem' }}>{item.username}</h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.status_message}</p>
                      </div>
                    </div>
                    <div>
                      {!req && (
                        <button className="action-btn-sm" onClick={() => handleInitiateRequestModal(item)}>
                          Request Chat
                        </button>
                      )}
                      {req?.status === 'pending' && (
                        <span className="animated-solid-tag" style={{ background: 'var(--text-muted)' }}>Request Pending</span>
                      )}
                      {req?.status === 'approved' && (
                        <button className="action-btn-sm secondary" onClick={() => setCurrentOpenChat(item)}>
                          Open Room
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              // Mode 3: Pending Requests Tab
              if (currentTabFilter === 'pending') {
                return (
                  <div className="user-item" key={item.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div className="avatar">
                        {item.sender?.avatar_url ? <img src={item.sender.avatar_url} alt="" /> : item.sender?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.9rem' }}>{item.sender?.username}</h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>"{item.intro_message}"</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="action-btn-sm" 
                        onClick={() => handleRespondToRequest(item.id, 'approved', item.sender?.username)}
                      >
                        Approve
                      </button>
                      <button 
                        className="action-btn-sm secondary" 
                        onClick={() => handleRespondToRequest(item.id, 'declined', item.sender?.username)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </main>
      </div>

      {/* --- CHAT ROOM MODAL --- */}
      {currentOpenChat && (
        <div className="modal-overlay">
          <div className="chat-room-container">
            <div className="chat-room-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="avatar">
                  {currentOpenChat.avatar_url ? <img src={currentOpenChat.avatar_url} alt="" /> : currentOpenChat.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{currentOpenChat.username}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentOpenChat.status_message}</p>
                </div>
              </div>
              <button className="icon-action-btn" onClick={() => setCurrentOpenChat(null)}>✕</button>
            </div>

            <div className="chat-messages-area">
              {processMessagesWithDividers(messages).map(msg => {
                if (msg.isDivider) {
                  return (
                    <div key={msg.id} style={{ textAlign: 'center', margin: '10px 0' }}>
                      <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--neon-cyan)', background: 'rgba(0,243,255,0.1)', padding: '4px 10px', borderRadius: '10px' }}>
                        {msg.label}
                      </span>
                    </div>
                  );
                }

                const isOutgoing = msg.sender_id === currentUser?.id;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOutgoing ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      background: isOutgoing ? 'linear-gradient(135deg, rgba(34,96,255,0.8), rgba(176,0,255,0.8))' : 'rgba(18, 27, 56, 0.9)',
                      padding: '10px 14px', borderRadius: '14px', maxWidth: '75%', border: '1px solid var(--border-glow)'
                    }}>
                      <p style={{ fontSize: '0.85rem' }}>{renderTextWithHighlightedTags(msg.content)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isOutgoing && (
                        <button 
                          style={{ background: 'none', border: 'none', color: 'var(--neon-pink)', fontSize: '0.65rem', cursor: 'pointer' }}
                          onClick={() => handleDeleteMessage(msg.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-area">
              <textarea 
                ref={textareaRef}
                rows={1}
                placeholder="Type your message..."
                value={messageInputText}
                onChange={(e) => setMessageInputText(e.target.value)}
              />
              <button className="action-btn-sm" onClick={handleSendMessage}>Send</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SEND REQUEST MODAL --- */}
      {activeModal === 'sendRequest' && requestTargetUser && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Request Chat Session</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Send an invitation text to <strong>{requestTargetUser.username}</strong> to initiate a direct channel.
            </p>
            <textarea 
              style={{ width: '100%', background: 'rgba(18, 27, 56, 0.8)', border: '1px solid var(--border-glow)', color: '#fff', padding: '10px', borderRadius: '10px' }}
              rows={3}
              value={requestIntroText}
              onChange={(e) => setRequestIntroText(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="action-btn-sm secondary" onClick={() => setActiveModal(null)}>Cancel</button>
              <button className="action-btn-sm" onClick={handleSendChatRequest}>Send Request</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT PROFILE MODAL --- */}
      {activeModal === 'editProfile' && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Edit Profile Node</h3>
            <input 
              type="text" 
              placeholder="Username" 
              value={editUsername} 
              onChange={(e) => setEditUsername(e.target.value)}
              style={{ padding: '10px', background: 'rgba(18,27,56,0.8)', border: '1px solid var(--border-glow)', color: '#fff', borderRadius: '10px' }}
            />
            <input 
              type="text" 
              placeholder="Status Message" 
              value={editStatus} 
              onChange={(e) => setEditStatus(e.target.value)}
              style={{ padding: '10px', background: 'rgba(18,27,56,0.8)', border: '1px solid var(--border-glow)', color: '#fff', borderRadius: '10px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="action-btn-sm secondary" onClick={() => setActiveModal(null)}>Cancel</button>
              <button className="action-btn-sm" onClick={handleSaveProfile}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
