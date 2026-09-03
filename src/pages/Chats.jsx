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

  // Modals & Panels
  const [activeModal, setActiveModal] = useState(null); // 'sendRequest', 'notifications', 'editProfile', 'requestsPanel'

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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
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
      status_message: 'Connected to Orbital Node.',
    };

    setCurrentProfile(activeProfile);
    setEditUsername(activeProfile.username || '');
    setEditStatus(activeProfile.status_message || '');
    setEditAvatarUrl(activeProfile.avatar_url || '');
    LocalStore.set('profile', activeProfile);
  };

  const syncAllUserData = async (currentUserId) => {
    const { data: users, error: usersErr } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId);

    if (!usersErr && users) {
      setAvailableUsers(users);
      LocalStore.set('users', users);
    }

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
    setRequestIntroText(`Hello ${targetUser.username}, let's start a secure chat.`);
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

  // --- MESSAGES FETCH & ACTIONS ---
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
      
      setUnreadCounts(prev => {
        const updated = { ...prev, [peerUserId]: 0 };
        LocalStore.set('unread', updated);
        return updated;
      });
    }
  };

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
    if (textareaRef.current) textareaRef.current.focus();
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
    let shipSpeed = 10;

    const stars = Array.from({ length: 600 }, () => ({
      x: (Math.random() - 0.5) * 3000,
      y: (Math.random() - 0.5) * 3000,
      z: Math.random() * 2000 + 10,
      size: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.8 ? '#00f3ff' : '#ffffff'
    }));

    function render() {
      ctx.fillStyle = '#0b0f19';
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

  const getRequestWithUser = (peerId) => {
    return chatRequests.find(r => 
      (r.sender_id === currentUser?.id && r.receiver_id === peerId) ||
      (r.receiver_id === currentUser?.id && r.sender_id === peerId)
    );
  };

  return (
    <div className="telegram-app-root">
      <style>{`
        :root {
          --tg-bg: #0e1621;
          --tg-sidebar: #17212b;
          --tg-panel: #242f3d;
          --tg-hover: #2b3848;
          --tg-active: #2b5278;
          --tg-accent: #2ea6ff;
          --tg-text: #f5f5f5;
          --tg-muted: #829ab1;
          --tg-border: #0f1621;
          --neon-cyan: #00f3ff;
          --neon-pink: #ff007f;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        
        body, html, .telegram-app-root {
          width: 100vw; height: 100vh; overflow: hidden; background-color: var(--tg-bg);
          color: var(--tg-text); position: relative;
        }

        #spaceCanvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; }

        .app-container {
          display: flex; width: 100vw; height: 100vh; position: relative; z-index: 5;
        }

        /* Telegram Sidebar Master Pane */
        .telegram-sidebar {
          width: 380px; background: rgba(23, 33, 43, 0.95); backdrop-filter: blur(12px);
          border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; height: 100%; flex-shrink: 0;
        }

        .sidebar-header {
          padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--tg-border); gap: 12px;
        }

        .icon-btn {
          background: transparent; border: none; width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--tg-muted);
          transition: background 0.2s, color 0.2s; position: relative; font-size: 1.1rem;
        }
        .icon-btn:hover { background: var(--tg-hover); color: var(--tg-text); }

        .search-container { padding: 8px 16px; }
        .search-input {
          width: 100%; background: var(--tg-bg); border: none; border-radius: 20px;
          padding: 9px 16px 9px 38px; color: var(--tg-text); font-size: 0.9rem; outline: none;
        }
        .search-input:focus { box-shadow: inset 0 0 0 1px var(--tg-accent); }

        .tabs-list { display: flex; padding: 0 16px 10px 16px; gap: 8px; border-bottom: 1px solid var(--tg-border); }
        .tab-chip {
          background: var(--tg-bg); border: none; border-radius: 14px; color: var(--tg-muted);
          font-size: 0.75rem; font-weight: 600; padding: 6px 12px; cursor: pointer; transition: all 0.2s;
        }
        .tab-chip.active { background: var(--tg-accent); color: #fff; }

        .sidebar-list { flex: 1; overflow-y: auto; padding: 6px 0; }

        .chat-list-item {
          display: flex; align-items: center; padding: 10px 16px; gap: 14px; cursor: pointer;
          transition: background 0.15s; position: relative;
        }
        .chat-list-item:hover { background: var(--tg-hover); }
        .chat-list-item.selected { background: var(--tg-active); }

        .avatar {
          width: 46px; height: 46px; border-radius: 50%; background: linear-gradient(135deg, #2ea6ff, #6b46c1);
          display: flex; align-items: center; justify-content: center; overflow: hidden;
          color: #fff; font-weight: bold; flex-shrink: 0; font-size: 1rem;
        }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }

        .chat-info { flex: 1; min-width: 0; }
        .chat-info-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .chat-name { font-size: 0.95rem; font-weight: 600; color: var(--tg-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .chat-preview { font-size: 0.8rem; color: var(--tg-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .badge {
          background: var(--tg-accent); color: #fff; font-size: 0.7rem; font-weight: bold;
          padding: 2px 6px; border-radius: 10px; min-width: 18px; text-align: center;
        }

        /* Telegram Main Chat Pane */
        .telegram-chat-pane {
          flex: 1; display: flex; flex-direction: column; background: #0e1621; height: 100%; position: relative;
        }

        .chat-room-header {
          height: 60px; padding: 0 20px; background: rgba(23, 33, 43, 0.95); border-bottom: 1px solid var(--tg-border);
          display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; z-index: 10;
        }

        .messages-scroll-area {
          flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;
          background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0);
          background-size: 24px 24px;
        }

        .message-bubble {
          max-width: 65%; padding: 8px 12px 6px 12px; border-radius: 12px; font-size: 0.9rem;
          line-height: 1.4; position: relative; word-break: break-word; box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        .message-bubble.sent { align-self: flex-end; background: #2b5278; border-top-right-radius: 4px; color: #fff; }
        .message-bubble.received { align-self: flex-start; background: #182533; border-top-left-radius: 4px; color: var(--tg-text); }
        
        .message-footer { display: flex; justify-content: flex-end; align-items: center; gap: 4px; margin-top: 2px; }
        .message-time { font-size: 0.65rem; color: rgba(255,255,255,0.6); }

        .message-actions {
          position: absolute; top: 4px; right: 6px; display: none; gap: 4px; background: rgba(0,0,0,0.3); border-radius: 4px; padding: 2px;
        }
        .message-bubble:hover .message-actions { display: flex; }
        .msg-action-btn { background: none; border: none; color: #fff; cursor: pointer; font-size: 0.7rem; padding: 2px 4px; }

        .chat-input-footer {
          padding: 12px 16px; background: rgba(23, 33, 43, 0.95); border-top: 1px solid var(--tg-border);
          display: flex; align-items: flex-end; gap: 12px; flex-shrink: 0;
        }
        .chat-textarea {
          flex: 1; background: var(--tg-bg); border: none; border-radius: 10px; color: var(--tg-text);
          padding: 10px 14px; outline: none; resize: none; font-size: 0.9rem; max-height: 120px;
        }
        
        .send-btn {
          background: var(--tg-accent); border: none; width: 42px; height: 42px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer;
          transition: transform 0.2s, background 0.2s; flex-shrink: 0;
        }
        .send-btn:hover { background: #1d8fe1; transform: scale(1.05); }

        .empty-chat-placeholder {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
          color: var(--tg-muted); text-align: center; gap: 10px; padding: 20px;
        }

        /* Modal Overlays */
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7);
          backdrop-filter: blur(5px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal-card {
          background: var(--tg-sidebar); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
          width: 100%; max-width: 440px; padding: 20px; display: flex; flex-direction: column; gap: 14px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--tg-border); padding-bottom: 10px; }
        .modal-header h3 { font-size: 1rem; color: var(--tg-accent); }

        .input-field {
          width: 100%; background: var(--tg-bg); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
          color: var(--tg-text); padding: 10px 12px; outline: none; font-size: 0.85rem; margin-top: 4px;
        }
        .input-field:focus { border-color: var(--tg-accent); }

        .action-btn {
          background: var(--tg-accent); border: none; color: #fff; font-weight: 600; padding: 10px 16px;
          border-radius: 8px; font-size: 0.85rem; cursor: pointer; text-align: center; transition: background 0.2s;
        }
        .action-btn:hover { background: #1d8fe1; }
        .action-btn.danger { background: #e53935; }
        .action-btn.danger:hover { background: #c62828; }
      `}</style>

      {/* 3D Canvas Background */}
      <canvas id="spaceCanvas" ref={canvasRef}></canvas>

      <div className="app-container">
        {/* --- TELEGRAM SIDEBAR MASTER PANE --- */}
        <aside className="telegram-sidebar">
          <div className="sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                className="icon-btn" 
                title="Dashboard"
                onClick={() => onNavigateDashboard && onNavigateDashboard()}
              >
                ☰
              </button>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tg-text)' }}>MTL Telegram</h2>
            </div>
            
            <div style={{ display: 'flex', gap: '4px' }}>
              {/* Requests Panel Button */}
              <button className="icon-btn" title="Chat Requests" onClick={() => setActiveModal('requestsPanel')}>
                📩
                {chatRequests.filter(r => r.receiver_id === currentUser?.id && r.status === 'pending').length > 0 && (
                  <span style={{ position: 'absolute', top: 4, right: 4, background: '#e53935', color: '#fff', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '10px' }}>
                    {chatRequests.filter(r => r.receiver_id === currentUser?.id && r.status === 'pending').length}
                  </span>
                )}
              </button>
              {/* Notifications Button */}
              <button className="icon-btn" title="Notifications" onClick={() => { setActiveModal('notifications'); markNotificationsRead(); }}>
                🔔
                {unreadNotificationCount > 0 && (
                  <span style={{ position: 'absolute', top: 4, right: 4, background: '#e53935', color: '#fff', fontSize: '0.6rem', padding: '1px 5px', borderRadius: '10px' }}>
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
              {/* Profile Settings Button */}
              <button className="icon-btn" title="Edit Profile" onClick={() => setActiveModal('editProfile')}>
                ⚙️
              </button>
            </div>
          </div>

          <div className="search-container">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search chats or users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="tabs-list">
            <button className={`tab-chip ${currentTabFilter === 'chats' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('chats')}>
              Chats ({activeChats.length})
            </button>
            <button className={`tab-chip ${currentTabFilter === 'users' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('users')}>
              Discover ({availableUsers.length})
            </button>
            <button className={`tab-chip ${currentTabFilter === 'pending' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('pending')}>
              Pending
            </button>
          </div>

          <div className="sidebar-list">
            {getFilteredItems().map(item => {
              if (currentTabFilter === 'chats') {
                const unread = unreadCounts[item.id] || 0;
                return (
                  <div 
                    key={item.id} 
                    className={`chat-list-item ${currentOpenChat?.id === item.id ? 'selected' : ''}`}
                    onClick={() => setCurrentOpenChat(item)}
                  >
                    <div className="avatar">
                      {item.avatar_url ? <img src={item.avatar_url} alt="" /> : item.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="chat-info">
                      <div className="chat-info-top">
                        <span className="chat-name">{item.username}</span>
                      </div>
                      <div className="chat-preview">{item.status_message || 'Online'}</div>
                    </div>
                    {unread > 0 && <span className="badge">{unread}</span>}
                  </div>
                );
              }

              if (currentTabFilter === 'users') {
                const existingReq = getRequestWithUser(item.id);
                return (
                  <div key={item.id} className="chat-list-item">
                    <div className="avatar">
                      {item.avatar_url ? <img src={item.avatar_url} alt="" /> : item.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="chat-info">
                      <div className="chat-name">{item.username}</div>
                      <div className="chat-preview">{item.status_message}</div>
                    </div>
                    {existingReq ? (
                      <span style={{ fontSize: '0.7rem', color: 'var(--tg-accent)', textTransform: 'uppercase' }}>
                        {existingReq.status}
                      </span>
                    ) : (
                      <button className="tab-chip active" onClick={() => handleInitiateRequestModal(item)}>
                        Connect
                      </button>
                    )}
                  </div>
                );
              }

              if (currentTabFilter === 'pending') {
                return (
                  <div key={item.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--tg-border)' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.sender?.username}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--tg-muted)', margin: '2px 0' }}>"{item.intro_message}"</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button className="tab-chip active" onClick={() => handleRespondToRequest(item.id, 'approved', item.sender?.username)}>Accept</button>
                      <button className="tab-chip" style={{ background: '#e53935', color: '#fff' }} onClick={() => handleRespondToRequest(item.id, 'rejected', item.sender?.username)}>Decline</button>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </aside>

        {/* --- TELEGRAM CHAT CONTENT PANE --- */}
        <main className="telegram-chat-pane">
          {currentOpenChat ? (
            <>
              <div className="chat-room-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="avatar" style={{ width: '38px', height: '38px', fontSize: '0.9rem' }}>
                    {currentOpenChat.avatar_url ? <img src={currentOpenChat.avatar_url} alt="" /> : currentOpenChat.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{currentOpenChat.username}</h3>
                    <p style={{ fontSize: '0.7rem', color: 'var(--tg-accent)' }}>online</p>
                  </div>
                </div>
                <button className="icon-btn" onClick={() => setCurrentOpenChat(null)} title="Close Chat">✕</button>
              </div>

              <div className="messages-scroll-area">
                {messages.map((msg) => {
                  const isSent = msg.sender_id === currentUser?.id;
                  return (
                    <div key={msg.id} className={`message-bubble ${isSent ? 'sent' : 'received'}`}>
                      {isSent && (
                        <div className="message-actions">
                          <button className="msg-action-btn" onClick={() => handleStartEditMessage(msg)}>Edit</button>
                          <button className="msg-action-btn" onClick={() => handleDeleteMessage(msg.id)}>Delete</button>
                        </div>
                      )}
                      <p>{msg.content}</p>
                      <div className="message-footer">
                        {msg.is_edited && <span className="message-time">edited</span>}
                        <span className="message-time">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-footer">
                <textarea 
                  ref={textareaRef}
                  className="chat-textarea"
                  rows={1}
                  placeholder={editingMessageId ? "Edit your message..." : "Write a message..."}
                  value={messageInputText}
                  onChange={(e) => setMessageInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button className="send-btn" onClick={handleSendMessage} title="Send Message">
                  ➤
                </button>
              </div>
            </>
          ) : (
            <div className="empty-chat-placeholder">
              <div style={{ fontSize: '3rem' }}>💬</div>
              <h3>Select a chat to start messaging</h3>
              <p style={{ fontSize: '0.85rem' }}>Choose from your active conversations or discover new users on the left sidebar.</p>
            </div>
          )}
        </main>
      </div>

      {/* --- MODALS --- */}
      {activeModal === 'requestsPanel' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chat Requests Manager</h3>
              <button className="icon-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--tg-accent)' }}>INCOMING</div>
              {chatRequests.filter(r => r.receiver_id === currentUser?.id).map(req => (
                <div key={req.id} style={{ background: 'var(--tg-bg)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600 }}>{req.sender?.username}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--tg-muted)', margin: '4px 0' }}>{req.intro_message}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--tg-accent)' }}>Status: {req.status}</div>
                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <button className="action-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleRespondToRequest(req.id, 'approved', req.sender?.username)}>Accept</button>
                      <button className="action-btn danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleRespondToRequest(req.id, 'rejected', req.sender?.username)}>Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeModal === 'notifications' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Notifications Log</h3>
              <button className="icon-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
              {notifications.map(n => (
                <div key={n.id} style={{ background: 'var(--tg-bg)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--tg-accent)' }}>{n.title}</div>
                  <div style={{ fontSize: '0.8rem', margin: '2px 0' }}>{n.message}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--tg-muted)' }}>{n.time}</div>
                </div>
              ))}
              {notifications.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--tg-muted)' }}>No logs found.</p>}
            </div>
          </div>
        </div>
      )}

      {activeModal === 'sendRequest' && requestTargetUser && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Chat with {requestTargetUser.username}</h3>
              <button className="icon-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--tg-muted)' }}>Introductory Note</label>
              <textarea 
                className="input-field" 
                rows={3} 
                style={{ resize: 'none' }}
                value={requestIntroText} 
                onChange={(e) => setRequestIntroText(e.target.value)} 
              />
            </div>
            <button className="action-btn" onClick={handleSendChatRequest}>Send Request</button>
          </div>
        </div>
      )}

      {activeModal === 'editProfile' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Profile Settings</h3>
              <button className="icon-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--tg-muted)' }}>Username</label>
              <input className="input-field" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--tg-muted)' }}>Status Message</label>
              <input className="input-field" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--tg-muted)' }}>Avatar Image URL</label>
              <input className="input-field" value={editAvatarUrl} onChange={(e) => setEditAvatarUrl(e.target.value)} />
            </div>
            <button className="action-btn" onClick={handleSaveProfile}>Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
}
