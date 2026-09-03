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
    } catch (e) { return null; }
  },
  set: (key, val) => {
    try { localStorage.setItem('mtl_hub_' + key, JSON.stringify(val)); } catch (e) {}
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
  const [currentOpenChat, setCurrentOpenChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Telegram-style Category Filter Tabs ('ACTIVE', 'REQUESTS', 'PENDING')
  const [telegramTab, setTelegramTab] = useState('ACTIVE');

  // Messages & Input State
  const [messages, setMessages] = useState([]);
  const [messageInputText, setMessageInputText] = useState('');

  // Request Dialog State
  const [requestTargetUser, setRequestTargetUser] = useState(null);
  const [requestIntroText, setRequestIntroText] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Modals & Panels ('sendRequest', 'notifications', 'editProfile', 'requestsPanel', 'profileDetails')
  const [activeModal, setActiveModal] = useState(null);
  const [profileModalUser, setProfileModalUser] = useState(null);

  // Edit Profile Inputs
  const [editUsername, setEditUsername] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [messageInputText]);

  const loadCachedState = () => {
    const cachedProfile = LocalStore.get('profile');
    if (cachedProfile) {
      setCurrentProfile(cachedProfile);
      setEditUsername(cachedProfile.username || '');
      setEditStatus(cachedProfile.status_message || '');
      setEditAvatarUrl(cachedProfile.avatar_url || '');
    }
    setAvailableUsers(LocalStore.get('users') || []);
    setChatRequests(LocalStore.get('chat_requests') || []);
    setUnreadCounts(LocalStore.get('unread') || {});
    const cachedNotifs = LocalStore.get('notifications') || [];
    setNotifications(cachedNotifs);
    setUnreadNotificationCount(cachedNotifs.filter(n => !n.read).length);
  };

  const verifySessionAndInitialize = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session || !session.user) return;
      setCurrentUser(session.user);
      await fetchOrCreateProfile(session.user);
      await syncAllUserData(session.user.id);
      setupRealtimeSubscriptions(session.user.id);
    } catch (err) {
      console.error("Auth session error:", err);
    }
  };

  const fetchOrCreateProfile = async (user) => {
    let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) {
      const fallbackName = user.email ? user.email.split('@')[0] : 'Node_' + user.id.substring(0, 5);
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert([{ id: user.id, username: fallbackName, status_message: 'CHATS Node Active.' }])
        .select().single();
      if (newProfile) profile = newProfile;
    }
    const activeProfile = profile || { id: user.id, username: 'Operator', status_message: 'Online' };
    setCurrentProfile(activeProfile);
    setEditUsername(activeProfile.username || '');
    setEditStatus(activeProfile.status_message || '');
    setEditAvatarUrl(activeProfile.avatar_url || '');
    LocalStore.set('profile', activeProfile);
  };

  const syncAllUserData = async (currentUserId) => {
    const { data: users } = await supabase.from('profiles').select('*').neq('id', currentUserId);
    if (users) {
      setAvailableUsers(users);
      LocalStore.set('users', users);
    }

    const { data: requests, error: reqErr } = await supabase
      .from('chat_requests')
      .select(`*, sender:sender_id(*), receiver:receiver_id(*)`)
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

    if (!reqErr && requests) {
      setChatRequests(requests);
      LocalStore.set('chat_requests', requests);
      const approvedPeers = requests
        .filter(r => r.status === 'approved')
        .map(r => (r.sender_id === currentUserId ? r.receiver : r.sender))
        .filter(Boolean);
      setActiveChats(approvedPeers);
    }
  };

  const setupRealtimeSubscriptions = (userId) => {
    supabase
      .channel('chats-realtime-sync')
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

  const addNotification = (title, message) => {
    const newNotif = {
      id: Date.now(), title, message, read: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      LocalStore.set('notifications', updated);
      setUnreadNotificationCount(updated.filter(n => !n.read).length);
      return updated;
    });
  };

  // --- ACTIONS ---
  const handleSendChatRequest = async () => {
    if (!requestTargetUser || !currentUser) return;
    const { error } = await supabase.from('chat_requests').insert([{
      sender_id: currentUser.id, receiver_id: requestTargetUser.id,
      intro_message: requestIntroText.trim(), status: 'pending'
    }]);
    if (!error) {
      addNotification("Request Dispatched", `Invitation sent to ${requestTargetUser.username}.`);
      setActiveModal(null);
      await syncAllUserData(currentUser.id);
    } else {
      alert("Error sending request: " + error.message);
    }
  };

  const handleRespondToRequest = async (requestId, newStatus, senderUsername) => {
    const { error } = await supabase.from('chat_requests').update({ status: newStatus }).eq('id', requestId);
    if (!error) {
      addNotification("Request Updated", `Chat request from ${senderUsername} was ${newStatus}.`);
      await syncAllUserData(currentUser.id);
    } else {
      alert("Error updating request: " + error.message);
    }
  };

  const fetchMessages = async (peerUserId) => {
    const localKey = `msgs_${currentUser.id}_${peerUserId}`;
    if (LocalStore.get(localKey)) setMessages(LocalStore.get(localKey));

    const { data } = await supabase
      .from('private_messages')
      .select(`*, sender:sender_id(username, avatar_url)`)
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${peerUserId}),and(sender_id.eq.${peerUserId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (data) {
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
    const textToSend = messageInputText.trim();
    setMessageInputText('');
    const { error } = await supabase.from('private_messages').insert([{
      sender_id: currentUser.id, receiver_id: currentOpenChat.id, content: textToSend
    }]);
    if (!error) fetchMessages(currentOpenChat.id);
  };

  const handleDeleteMessage = async (msgId) => {
    const { error } = await supabase.from('private_messages').delete().eq('id', msgId);
    if (!error && currentOpenChat) fetchMessages(currentOpenChat.id);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('profiles').update({
      username: editUsername, status_message: editStatus, avatar_url: editAvatarUrl
    }).eq('id', currentUser.id).select().single();
    if (data) {
      setCurrentProfile(data);
      LocalStore.set('profile', data);
      setActiveModal(null);
    }
  };

  // --- CANVA 3D STARFIELD BACKGROUND ---
  const initSpaceCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    let stars = Array.from({ length: 600 }, () => ({
      x: (Math.random() - 0.5) * 2500, y: (Math.random() - 0.5) * 2500,
      z: Math.random() * 2000 + 10, size: Math.random() * 1.5 + 0.5
    }));
    function render() {
      ctx.fillStyle = '#0e1621'; 
      ctx.fillRect(0, 0, W, H);
      for (let s of stars) {
        s.z -= 10;
        if (s.z <= 1) s.z = 2000;
        let k = 300 / s.z;
        let px = s.x * k + W / 2;
        let py = s.y * k + H / 2;
        if (px >= 0 && px <= W && py >= 0 && py <= H) {
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = Math.min(1, 1 - s.z / 2000);
          ctx.fillRect(px, py, s.size, s.size);
        }
      }
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  };

  const getFilteredChats = () => {
    return activeChats.filter(chat => chat.username.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  return (
    <div className="telegram-app-root">
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body, html, .telegram-app-root { width: 100vw; height: 100vh; overflow: hidden; background: #0e1621; color: #f5f5f5; }
        #spaceCanvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; }

        .tg-container { display: flex; width: 100vw; height: 100vh; position: relative; z-index: 5; }

        /* Left Sidebar (Chats List Panel) */
        .tg-sidebar { width: 380px; background: #17212b; display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; height: 100vh; }
        
        /* App Header */
        .tg-header {
          height: 60px; background: #17212b; display: flex; align-items: center; justify-content: space-between;
          padding: 0 16px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;
        }
        .tg-header-left { display: flex; align-items: center; gap: 14px; }
        
        /* Dashboard Container replacing menu button */
        .dashboard-nav-container {
          background: #242f3d; color: #64b5f6; font-size: 0.8rem; font-weight: 600; padding: 6px 12px;
          border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background 0.2s;
        }
        .dashboard-nav-container:hover { background: #2b5278; color: #fff; }

        .tg-icon-btn { background: none; border: none; color: #708499; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 50%; }
        .tg-icon-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .tg-title { font-size: 1.15rem; font-weight: 500; color: #fff; letter-spacing: 0.3px; }

        /* Search bar */
        .tg-search-wrapper { padding: 10px 16px; background: #17212b; flex-shrink: 0; }
        .tg-search-box { position: relative; width: 100%; }
        .tg-search-box input {
          width: 100%; background: #242f3d; border: none; border-radius: 8px; padding: 10px 14px 10px 40px;
          color: #fff; font-size: 0.9rem; outline: none;
        }
        .tg-search-box input::placeholder { color: #879baf; }
        .tg-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #879baf; font-size: 0.9rem; }

        /* Category Filter Tabs Bar */
        .tg-tabs-bar {
          display: flex; gap: 8px; padding: 0 16px 10px 16px; background: #17212b; overflow-x: auto; flex-shrink: 0;
          border-bottom: 1px solid rgba(255,255,255,0.03); scrollbar-width: none;
        }
        .tg-tab-pill {
          background: #242f3d; border: none; border-radius: 16px; color: #879baf; font-size: 0.78rem; font-weight: 600;
          padding: 6px 14px; cursor: pointer; white-space: nowrap; transition: all 0.2s;
        }
        .tg-tab-pill.active { background: #2b5278; color: #fff; }

        /* Main Content List */
        .tg-chat-list { flex: 1; overflow-y: auto; background: #17212b; display: flex; flex-direction: column; }
        .tg-chat-item {
          display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; cursor: pointer;
          border-bottom: 1px solid rgba(255,255,255,0.02); transition: background 0.15s;
        }
        .tg-chat-item:hover, .tg-chat-item.active-peer { background: #202b38; }

        .tg-avatar {
          width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #2b5278, #17212b);
          display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; font-size: 1.1rem;
          overflow: hidden; flex-shrink: 0; position: relative; cursor: pointer;
        }
        .tg-avatar img { width: 100%; height: 100%; object-fit: cover; }

        .section-header-tag { font-size: 0.75rem; text-transform: uppercase; color: #64b5f6; padding: 12px 16px 4px 16px; font-weight: 700; letter-spacing: 0.8px; }

        /* Main Chat Container Area (Desktop Split / Workspace View) */
        .tg-chat-workspace { flex: 1; display: flex; flex-direction: column; background: #0e1621; height: 100vh; position: relative; }
        .tg-room-header { height: 60px; background: #17212b; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .tg-messages-box { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 8px; background: #0e1621; }
        
        .tg-bubble { max-width: 65%; padding: 10px 14px; border-radius: 12px; font-size: 0.9rem; line-height: 1.4; position: relative; word-break: break-word; color: #fff; }
        .tg-bubble.sent { align-self: flex-end; background: #2b5278; border-bottom-right-radius: 2px; }
        .tg-bubble.received { align-self: flex-start; background: #182533; border-bottom-left-radius: 2px; }

        .tg-input-area { padding: 12px 20px; background: #17212b; display: flex; align-items: flex-end; gap: 12px; flex-shrink: 0; border-top: 1px solid rgba(255,255,255,0.05); }
        .tg-input-area textarea {
          flex: 1; background: #242f3d; border: none; border-radius: 8px; color: #fff; padding: 10px 14px;
          outline: none; resize: none; font-size: 0.9rem; max-height: 140px;
        }
        .tg-send-btn { background: #2b5278; border: none; border-radius: 50%; color: #fff; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
        .tg-send-btn:hover { background: #366594; }

        .empty-chat-placeholder {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #708499; gap: 10px; text-align: center; padding: 20px;
        }

        /* Modals */
        .tg-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .tg-modal-box { background: #17212b; border-radius: 12px; width: 100%; max-width: 440px; padding: 20px; display: flex; flex-direction: column; gap: 14px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
        .tg-input-field { width: 100%; background: #242f3d; border: none; border-radius: 8px; color: #fff; padding: 10px 14px; outline: none; font-size: 0.9rem; margin-top: 4px; }
        .tg-btn-primary { background: #2b5278; border: none; color: #fff; font-weight: 600; padding: 10px; border-radius: 8px; cursor: pointer; text-align: center; }
        .tg-btn-primary:hover { background: #366594; }
        .tg-badge { background: #2b5278; color: #fff; font-size: 0.7rem; font-weight: bold; padding: 2px 7px; border-radius: 10px; }
      `}</style>

      <canvas id="spaceCanvas" ref={canvasRef}></canvas>

      <div className="tg-container">
        {/* Left Sidebar Layout */}
        <div className="tg-sidebar">
          {/* Header with Dashboard Container */}
          <header className="tg-header">
            <div className="tg-header-left">
              <div className="dashboard-nav-container" onClick={() => onNavigateDashboard?.()} title="Return to Dashboard">
                <span>←</span> Dashboard
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="tg-icon-btn" onClick={() => setActiveModal('requestsPanel')} title="Requests">
                📥 {chatRequests.filter(r => r.receiver_id === currentUser?.id && r.status === 'pending').length > 0 && <span style={{fontSize:'0.6rem', background:'#ff3366', borderRadius:'50px', padding:'1px 5px', marginLeft:'2px'}}>•</span>}
              </button>
              <button className="tg-icon-btn" onClick={() => setActiveModal('notifications')} title="Notifications">🔔</button>
              <button className="tg-icon-btn" onClick={() => setActiveModal('editProfile')} title="Profile">
                <div className="tg-avatar" style={{width: '28px', height: '28px', fontSize:'0.75rem'}}>
                  {currentProfile?.avatar_url ? <img src={currentProfile.avatar_url} alt="" /> : (currentProfile?.username?.charAt(0).toUpperCase() || 'U')}
                </div>
              </button>
            </div>
          </header>

          {/* Search Bar */}
          <div className="tg-search-wrapper">
            <div className="tg-search-box">
              <span className="tg-search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="Search Chats & Users..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="tg-tabs-bar">
            <button className={`tg-tab-pill ${telegramTab === 'ACTIVE' ? 'active' : ''}`} onClick={() => setTelegramTab('ACTIVE')}>
              ACTIVE ({activeChats.length})
            </button>
            <button className={`tg-tab-pill ${telegramTab === 'REQUESTS' ? 'active' : ''}`} onClick={() => setTelegramTab('REQUESTS')}>
              REQUEST ({availableUsers.length})
            </button>
            <button className={`tg-tab-pill ${telegramTab === 'PENDING' ? 'active' : ''}`} onClick={() => setTelegramTab('PENDING')}>
              PENDING ({chatRequests.filter(r => r.receiver_id === currentUser?.id && r.status === 'pending').length})
            </button>
          </div>

          {/* Chat List Feed */}
          <div className="tg-chat-list">
            {telegramTab === 'ACTIVE' && getFilteredChats().map(chat => (
              <div 
                className={`tg-chat-item ${currentOpenChat?.id === chat.id ? 'active-peer' : ''}`} 
                key={chat.id} 
                onClick={() => setCurrentOpenChat(chat)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div className="tg-avatar" onClick={(e) => { e.stopPropagation(); setProfileModalUser(chat); setActiveModal('profileDetails'); }}>
                    {chat.avatar_url ? <img src={chat.avatar_url} alt="" /> : chat.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>{chat.username}</h3>
                      <span style={{ fontSize: '0.7rem', color: '#708499' }}>Active</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#708499', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                      {chat.status_message || 'Online'}
                    </p>
                  </div>
                </div>
                {unreadCounts[chat.id] > 0 && <span className="tg-badge">{unreadCounts[chat.id]}</span>}
              </div>
            ))}
            {telegramTab === 'ACTIVE' && activeChats.length === 0 && (
              <p style={{ padding: '20px', color: '#708499', fontSize: '0.85rem' }}>No active chats yet. Connect with users via the Request tab!</p>
            )}

            {telegramTab === 'REQUESTS' && (
              <>
                <div className="section-header-tag">Send A Chat Request</div>
                {availableUsers.map(user => {
                  const req = chatRequests.find(r => (r.sender_id === currentUser?.id && r.receiver_id === user.id) || (r.receiver_id === currentUser?.id && r.sender_id === user.id));
                  return (
                    <div className="tg-chat-item" key={user.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <div className="tg-avatar" onClick={(e) => { e.stopPropagation(); setProfileModalUser(user); setActiveModal('profileDetails'); }}>
                          {user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>{user.username}</h3>
                          <p style={{ fontSize: '0.8rem', color: '#708499' }}>{user.status_message}</p>
                        </div>
                      </div>
                      {req ? (
                        <span style={{ fontSize: '0.75rem', color: '#64b5f6', textTransform: 'uppercase' }}>{req.status}</span>
                      ) : (
                        <button className="tg-tab-pill active" onClick={() => { setRequestTargetUser(user); setRequestIntroText(`Hello ${user.username}, let's chat!`); setActiveModal('sendRequest'); }}>
                          Connect
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {telegramTab === 'PENDING' && (
              <>
                <div className="section-header-tag">Incoming Chat Requests</div>
                {chatRequests.filter(r => r.receiver_id === currentUser?.id && r.status === 'pending').map(req => (
                  <div className="tg-chat-item" key={req.id} style={{ padding: '14px 16px', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <strong style={{ color: '#64b5f6', fontSize: '0.9rem' }}>{req.sender?.username}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#708499' }}>Pending</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#fff' }}>"{req.intro_message}"</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button className="tg-tab-pill active" onClick={() => handleRespondToRequest(req.id, 'approved', req.sender?.username)}>Accept</button>
                      <button className="tg-tab-pill" style={{ background: '#3b1c28', color: '#ff5252' }} onClick={() => handleRespondToRequest(req.id, 'rejected', req.sender?.username)}>Decline</button>
                    </div>
                  </div>
                ))}
                {chatRequests.filter(r => r.receiver_id === currentUser?.id && r.status === 'pending').length === 0 && (
                  <p style={{ padding: '20px', color: '#708499', fontSize: '0.85rem' }}>No pending chat requests found.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* --- DEDICATED CHAT CONTAINER WORKSPACE --- */}
        <div className="tg-chat-workspace">
          {currentOpenChat ? (
            <>
              <div className="tg-room-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="tg-avatar" style={{width:'38px', height:'38px'}} onClick={() => { setProfileModalUser(currentOpenChat); setActiveModal('profileDetails'); }}>
                    {currentOpenChat.avatar_url ? <img src={currentOpenChat.avatar_url} alt="" /> : currentOpenChat.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', color: '#fff' }}>{currentOpenChat.username}</h3>
                    <p style={{ fontSize: '0.7rem', color: '#708499' }}>{currentOpenChat.status_message || 'online'}</p>
                  </div>
                </div>
              </div>

              <div className="tg-messages-box">
                {messages.map((msg) => (
                  <div key={msg.id} className={`tg-bubble ${msg.sender_id === currentUser?.id ? 'sent' : 'received'}`}>
                    <p>{msg.content}</p>
                    {msg.sender_id === currentUser?.id && (
                      <div style={{ textAlign: 'right', marginTop: '2px' }}>
                        <button onClick={() => handleDeleteMessage(msg.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.6rem' }}>delete</button>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="tg-input-area">
                <textarea 
                  ref={textareaRef} rows={1} placeholder="Write a message..."
                  value={messageInputText} onChange={(e) => setMessageInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                />
                <button className="tg-send-btn" onClick={handleSendMessage}>➤</button>
              </div>
            </>
          ) : (
            <div className="empty-chat-placeholder">
              <div style={{ fontSize: '2.5rem' }}>💬</div>
              <h3 style={{ color: '#fff', fontSize: '1.1rem' }}>No Chat Selected</h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '300px' }}>Select an active chat conversation from your sidebar or initiate a connection request to begin messaging.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALS --- */}
      {activeModal === 'requestsPanel' && (
        <div className="tg-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="tg-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#64b5f6', fontSize: '1rem' }}>Chat Requests Overview</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {chatRequests.map(r => (
                <div key={r.id} style={{ background: '#242f3d', padding: '10px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.85rem' }}><b>{r.sender_id === currentUser?.id ? `To: ${r.receiver?.username}` : `From: ${r.sender?.username}`}</b></p>
                  <p style={{ fontSize: '0.75rem', color: '#708499' }}>Status: {r.status}</p>
                </div>
              ))}
            </div>
            <button className="tg-btn-primary" onClick={() => setActiveModal(null)}>Close</button>
          </div>
        </div>
      )}

      {activeModal === 'notifications' && (
        <div className="tg-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="tg-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#64b5f6', fontSize: '1rem' }}>Notifications</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notifications.map(n => (
                <div key={n.id} style={{ background: '#242f3d', padding: '10px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.85rem', color: '#fff' }}>{n.title}</p>
                  <p style={{ fontSize: '0.75rem', color: '#708499' }}>{n.message}</p>
                </div>
              ))}
              {notifications.length === 0 && <p style={{ fontSize: '0.8rem', color: '#708499' }}>No notifications found.</p>}
            </div>
            <button className="tg-btn-primary" onClick={() => setActiveModal(null)}>Close</button>
          </div>
        </div>
      )}

      {/* --- PROFILE DETAILS & GROUP DIAL MODAL --- */}
      {activeModal === 'profileDetails' && profileModalUser && (
        <div className="tg-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="tg-modal-box" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', alignItems: 'center' }}>
            <div className="tg-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem', marginBottom: '8px' }}>
              {profileModalUser.avatar_url ? <img src={profileModalUser.avatar_url} alt="" /> : profileModalUser.username.charAt(0).toUpperCase()}
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.2rem' }}>{profileModalUser.username}</h2>
            <p style={{ color: '#708499', fontSize: '0.85rem', margin: '4px 0 12px 0' }}>{profileModalUser.status_message || 'No bio available'}</p>
            
            <div style={{ width: '100%', background: '#242f3d', padding: '12px', borderRadius: '8px', textAlign: 'left', marginTop: '10px' }}>
              <h4 style={{ fontSize: '0.8rem', color: '#64b5f6', marginBottom: '6px' }}>SHARED NODES / GROUPS</h4>
              <p style={{ fontSize: '0.8rem', color: '#fff' }}>• Orbital Hub Room Alpha</p>
              <p style={{ fontSize: '0.8rem', color: '#fff' }}>• Direct P2P Channel</p>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '14px' }}>
              <button className="tg-btn-primary" style={{ flex: 1 }} onClick={() => { setCurrentOpenChat(profileModalUser); setActiveModal(null); }}>
                Open Chat
              </button>
              <button className="tg-tab-pill" style={{ flex: 1, background: '#242f3d', color: '#fff' }} onClick={() => setActiveModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'sendRequest' && requestTargetUser && (
        <div className="tg-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="tg-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#64b5f6', fontSize: '1rem' }}>Connect with {requestTargetUser.username}</h3>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#708499' }}>Intro Message</label>
              <textarea className="tg-input-field" rows={3} value={requestIntroText} onChange={e => setRequestIntroText(e.target.value)} />
            </div>
            <button className="tg-btn-primary" onClick={handleSendChatRequest}>Send Invitation</button>
          </div>
        </div>
      )}

      {activeModal === 'editProfile' && (
        <div className="tg-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="tg-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#64b5f6', fontSize: '1rem' }}>Edit Profile</h3>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#708499' }}>Username</label>
              <input className="tg-input-field" value={editUsername} onChange={e => setEditUsername(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#708499' }}>Bio / Status</label>
              <input className="tg-input-field" value={editStatus} onChange={e => setEditStatus(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#708499' }}>Avatar URL</label>
              <input className="tg-input-field" value={editAvatarUrl} onChange={e => setEditAvatarUrl(e.target.value)} />
            </div>
            <button className="tg-btn-primary" onClick={handleSaveProfile}>Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
}
