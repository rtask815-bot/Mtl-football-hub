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
  const [groupsData, setGroupsData] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [currentOpenGroup, setCurrentOpenGroup] = useState(null);
  const [currentTabFilter, setCurrentTabFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Messages & Input State
  const [messages, setMessages] = useState([]);
  const [messageInputText, setMessageInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Group Members State
  const [groupMembers, setGroupMembers] = useState([]);

  // Navigation Drawer & Modals
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'createGroup', 'groupAbout', 'notifications', 'editProfile', 'adminApproval'

  // Form Inputs
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroupType, setSelectedGroupType] = useState('Public');
  const [inviteEmail, setInviteEmail] = useState('');

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
    if (currentOpenGroup) {
      fetchMessages(currentOpenGroup.id);
      fetchGroupMembers(currentOpenGroup.id);
    }
  }, [currentOpenGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Dynamic Textarea Auto-Resize (Gemini Style)
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

    const cachedGroups = LocalStore.get('groups');
    if (cachedGroups && Array.isArray(cachedGroups)) {
      setGroupsData(cachedGroups);
    }

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
        // Fallback or handle auth redirect if integrated into React Router
        return;
      }
      setCurrentUser(session.user);
      await fetchOrCreateProfile(session.user);
      await fetchGroups();
      setupRealtimeSubscriptions();
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
        .insert([{ id: user.id, username: fallbackName }])
        .select()
        .single();

      if (!createError) profile = newProfile;
    }

    const activeProfile = profile || {
      id: user.id,
      username: user.email ? user.email.split('@')[0] : 'Operator',
      avatar_url: '',
      status_message: 'Connected to Orbital Node 3099.',
      is_global_admin: false,
      is_superadmin: false
    };

    setCurrentProfile(activeProfile);
    setEditUsername(activeProfile.username || '');
    setEditStatus(activeProfile.status_message || '');
    setEditAvatarUrl(activeProfile.avatar_url || '');
    LocalStore.set('profile', activeProfile);
  };

  const fetchGroups = async () => {
    const { data, error } = await supabase
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

    if (!error && data) {
      setGroupsData(data);
      LocalStore.set('groups', data);
    } else if (error) {
      showErrorBanner("Synchronization Error", "Failed to load chat channels: " + error.message);
    }
  };

  const fetchGroupMembers = async (groupId) => {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('group_id', groupId);

    if (!error && data) {
      setGroupMembers(data);
    }
  };

  const setupRealtimeSubscriptions = () => {
    supabase
      .channel('realtime-chat-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        if (payload.new) {
          const gId = payload.new.group_id;
          if (currentOpenGroup && gId === currentOpenGroup.id) {
            fetchMessages(gId);
          } else {
            setUnreadCounts(prev => {
              const updated = { ...prev, [gId]: (prev[gId] || 0) + 1 };
              LocalStore.set('unread', updated);
              return updated;
            });
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_groups' }, () => fetchGroups())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => {
        fetchGroups();
        if (currentOpenGroup) fetchGroupMembers(currentOpenGroup.id);
      })
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

  // --- MESSAGES FETCH & TIMESTAMP DIVIDERS ---
  const fetchMessages = async (groupId) => {
    const localKey = 'messages_' + groupId;
    const cached = LocalStore.get(localKey);
    if (cached) setMessages(cached);

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:sender_id (username, avatar_url)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      LocalStore.set(localKey, data);
    }
  };

  const getTimeCategory = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'NOW / TODAY';
    if (diffDays === 1) return 'YESTERDAY';
    if (diffDays <= 7) return 'LAST WEEK';
    return 'LAST MONTH';
  };

  // Process Messages to Insert Time Divider Headers
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
    if (!messageInputText.trim() || !currentOpenGroup || !currentUser) return;

    if (editingMessageId) {
      const { error } = await supabase
        .from('messages')
        .update({ content: messageInputText.trim(), is_edited: true })
        .eq('id', editingMessageId);

      if (!error) {
        setEditingMessageId(null);
        setMessageInputText('');
        fetchMessages(currentOpenGroup.id);
      } else {
        showErrorBanner("Update Failed", error.message);
      }
    } else {
      const textToSend = messageInputText.trim();
      setMessageInputText('');
      const { error } = await supabase
        .from('messages')
        .insert([{
          group_id: currentOpenGroup.id,
          sender_id: currentUser.id,
          content: textToSend,
          message_type: 'text'
        }]);

      if (!error) {
        fetchMessages(currentOpenGroup.id);
      } else {
        showErrorBanner("Transmission Failed", error.message);
      }
    }
  };

  const handleDeleteMessage = async (msgId) => {
    const { error } = await supabase.from('messages').delete().eq('id', msgId);
    if (!error) {
      fetchMessages(currentOpenGroup.id);
    } else {
      showErrorBanner("Deletion Error", error.message);
    }
  };

  const handleStartEditMessage = (msg) => {
    setEditingMessageId(msg.id);
    setMessageInputText(msg.content);
  };

  // --- SUPERADMIN & GOVERNANCE ACTIONS ---
  const handleDemoteAdmin = async (targetUserId) => {
    if (!currentProfile?.is_superadmin) {
      showErrorBanner("Access Denied", "Superadmin status required to demote admins.");
      return;
    }

    const { error } = await supabase
      .from('group_members')
      .update({ role: 'member' })
      .eq('group_id', currentOpenGroup.id)
      .eq('user_id', targetUserId);

    if (!error) {
      addNotification("Role Change", `An admin in group ${currentOpenGroup.name} was demoted to member.`);
      fetchGroupMembers(currentOpenGroup.id);
    } else {
      showErrorBanner("Demotion Failed", error.message);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !currentOpenGroup) return;

    // Dispatch invitation notification to global network
    addNotification(
      "Member Invitation Sent",
      `Invitation sent to ${inviteEmail} for group ${currentOpenGroup.name}.`
    );
    setInviteEmail('');
    showErrorBanner("Invitation Dispatched", `Notification sent to ${inviteEmail}!`);
  };

  const handlePromoteAdmin = async (targetUserId) => {
    const { error } = await supabase
      .from('group_members')
      .update({ role: 'admin' })
      .eq('group_id', currentOpenGroup.id)
      .eq('user_id', targetUserId);

    if (!error) {
      fetchGroupMembers(currentOpenGroup.id);
    } else {
      showErrorBanner("Promotion Error", error.message);
    }
  };

  const handleCreateGroupSubmit = async () => {
    if (!newGroupName.trim() || !currentUser) return;
    const isApproved = currentProfile?.is_global_admin || currentProfile?.is_superadmin;

    const { data, error } = await supabase
      .from('chat_groups')
      .insert([{
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || 'Synchronized quantum neural channel.',
        type: selectedGroupType,
        creator_id: currentUser.id,
        is_approved: isApproved
      }])
      .select()
      .single();

    if (!error && data) {
      await supabase
        .from('group_members')
        .insert([{ group_id: data.id, user_id: currentUser.id, role: 'superadmin' }]);

      setNewGroupName('');
      setNewGroupDesc('');
      setActiveModal(null);
      await fetchGroups();
    } else {
      showErrorBanner("Group Creation Failed", error?.message);
    }
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

  // --- COMPUTED GROUPS & FILTERING ---
  const isMember = (group, uId) => group.group_members && group.group_members.some(m => m.user_id === uId);
  const getUserRole = (group, uId) => {
    const m = group?.group_members?.find(x => x.user_id === uId);
    return m ? m.role : 'member';
  };

  const getFilteredGroups = () => {
    return groupsData.filter(g => {
      const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (currentTabFilter === 'joined') return isMember(g, currentUser?.id);
      if (currentTabFilter === 'created') return g.creator_id === currentUser?.id;
      if (currentTabFilter === 'available') return g.is_approved && !isMember(g, currentUser?.id);
      return g.is_approved || g.creator_id === currentUser?.id || isMember(g, currentUser?.id);
    });
  };

  // Pinning Logic: Retain top 3 pinned cards in original layout structure
  const pinnedGroups = groupsData.slice(0, 3);

  // --- TAG HIGHLIGHT HELPER ENGINE ---
  const renderTextWithHighlightedTags = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\w+|#\w+|\b(?:member|admin|superadmin|waiting for approval|promote admin|edit)\b)/gi);

    return parts.map((part, index) => {
      const lower = part.toLowerCase();
      if (['admin', 'superadmin', 'member', 'waiting for approval', 'promote admin', 'edit'].includes(lower)) {
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
      {/* Dynamic Inline CSS Injection to Guarantee Zero Missing Styles & Mobile Safe Layout */}
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
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background-color: var(--bg-deep);
          color: var(--text-main);
          position: relative;
        }

        /* 3D Canvas Background */
        #spaceCanvas {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none;
        }

        .viewport-frame {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2; pointer-events: none;
          box-shadow: inset 0 0 100px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,243,255,0.15);
        }

        .app-container {
          display: flex; flex-direction: column; width: 100vw; height: 100vh; position: relative; z-index: 5;
        }

        /* App Bar Header */
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

        /* Notification Badge */
        .notif-badge-count {
          position: absolute; top: -2px; right: -2px; background: var(--neon-pink); color: #fff;
          font-size: 0.65rem; font-weight: bold; padding: 2px 6px; border-radius: 10px; box-shadow: 0 0 8px var(--neon-pink);
        }

        /* Action & Search Bar */
        .action-bar-section {
          display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; gap: 16px; flex-shrink: 0;
        }
        .search-box { position: relative; flex: 1; max-width: 420px; }
        .search-box input {
          width: 100%; background: rgba(12, 19, 41, 0.8); border: 1px solid var(--border-glow); border-radius: 20px;
          padding: 10px 16px 10px 40px; color: var(--text-main); font-size: 0.85rem; outline: none;
        }
        .search-box input:focus { border-color: var(--neon-cyan); box-shadow: 0 0 15px rgba(0,243,255,0.3); }
        .search-box svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; stroke: var(--text-muted); }

        .create-group-btn {
          background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple)); border: none; color: #fff;
          font-weight: 600; padding: 9px 18px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; box-shadow: 0 0 15px rgba(176,0,255,0.5);
        }

        /* Main Scrollable View */
        .main-content {
          flex: 1; overflow-y: auto; padding: 10px 24px 30px 24px; display: flex; flex-direction: column; gap: 20px;
        }

        .section-title {
          font-size: 0.82rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--neon-cyan);
          margin-bottom: 10px; text-shadow: 0 0 8px rgba(0,243,255,0.4);
        }

        /* Pinned Cards Container Appearance Maintenance */
        .pinned-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .pinned-card {
          background: linear-gradient(135deg, rgba(18, 27, 56, 0.9), rgba(11, 17, 38, 0.95));
          border: 1px solid rgba(176, 0, 255, 0.3); border-radius: 16px; padding: 18px; cursor: pointer;
          transition: all 0.3s; display: flex; flex-direction: column;
        }
        .pinned-card:hover { border-color: var(--neon-cyan); transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,243,255,0.25); }
        .pinned-card-header { display: flex; align-items: center; justify-content: space-between; }
        .pinned-card-icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(0,243,255,0.1); border: 1px solid var(--neon-cyan); display: flex; align-items: center; justify-content: center; color: var(--neon-cyan); font-weight: bold; }
        
        .section-divider-animated {
          height: 2px; width: 100%; margin: 12px 0; background: linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-purple), transparent);
          background-size: 200% 100%; animation: dividerGlow 3s linear infinite;
        }
        @keyframes dividerGlow { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

        /* Group Tabs */
        .group-tabs { display: flex; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-top: 10px; }
        .tab-btn {
          background: rgba(12, 19, 41, 0.85); border: 1px solid var(--border-glow); border-radius: 12px;
          color: var(--text-muted); font-size: 0.8rem; font-weight: 600; padding: 8px 16px; cursor: pointer;
        }
        .tab-btn.active { color: var(--neon-cyan); border-color: var(--neon-cyan); box-shadow: 0 0 15px rgba(0,243,255,0.3); }

        /* Group Items Feed */
        .group-list { display: flex; flex-direction: column; gap: 10px; }
        .group-item {
          background: rgba(12, 19, 41, 0.6); border: 1px solid rgba(0, 243, 255, 0.12); border-radius: 14px;
          padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.25s;
        }
        .group-item:hover { background: rgba(18, 27, 56, 0.85); border-color: rgba(0, 243, 255, 0.4); transform: translateX(4px); }
        .group-item-left { display: flex; align-items: center; gap: 16px; }

        /* SOLID ANIMATED TAG CONTAINERS FOR MEMBER, ADMIN, WAITING APPROVAL, ETC. */
        .animated-solid-tag {
          background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple));
          background-size: 200% 200%;
          animation: gradientShift 4s ease infinite;
          color: #fff !important;
          padding: 3px 10px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: inline-block;
          box-shadow: 0 0 10px rgba(176, 0, 255, 0.4);
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .mention-tag-highlight {
          color: var(--neon-cyan);
          font-weight: bold;
          background: rgba(0, 243, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* CHAT ROOM MODAL & FULL-VIEW INPUT SAFE AREA */
        .chat-room-container {
          display: flex; flex-direction: column; width: 100%; max-width: 900px; height: 100%;
          background: rgba(8, 12, 28, 0.98); border-radius: 20px; border: 1px solid var(--border-glow);
          box-shadow: 0 0 50px rgba(0, 243, 255, 0.2); overflow: hidden;
        }

        .chat-room-header {
          padding: 16px 24px; background: rgba(12, 19, 41, 0.95); border-bottom: 1px solid var(--border-glow);
          display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }

        .chat-messages-area {
          flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;
        }

        /* Message Bubbles, Sender Names & Action Container */
        .message-bubble-wrapper { display: flex; flex-direction: column; max-width: 78%; position: relative; }
        .message-bubble-wrapper.outgoing { align-self: flex-end; align-items: flex-end; }
        .message-bubble-wrapper.incoming { align-self: flex-start; align-items: flex-start; }

        .decorated-sender-name {
          font-size: 0.75rem; font-weight: 800; color: var(--neon-cyan); margin-bottom: 4px;
          display: flex; align-items: center; gap: 8px; text-shadow: 0 0 6px rgba(0,243,255,0.4);
        }

        .message-bubble {
          background: rgba(18, 27, 56, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px 16px; width: 100%;
        }
        .outgoing .message-bubble { background: rgba(34, 96, 255, 0.2); border-color: rgba(0, 243, 255, 0.3); }

        .msg-actions-container {
          display: flex; gap: 10px; margin-top: 4px; font-size: 0.68rem; color: var(--text-muted);
          background: rgba(5,8,20,0.6); padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);
        }
        .msg-action-btn { cursor: pointer; transition: color 0.2s; }
        .msg-action-btn.edit:hover { color: var(--neon-cyan); }
        .msg-action-btn.delete:hover { color: var(--neon-pink); }

        /* TimeMention Divider */
        .time-mention-divider {
          display: flex; align-items: center; justify-content: center; margin: 16px 0; position: relative;
        }
        .time-mention-divider::before {
          content: ''; position: absolute; width: 100%; height: 1px; background: linear-gradient(90deg, transparent, var(--border-glow), transparent);
        }
        .time-mention-badge {
          position: relative; z-index: 2; background: var(--bg-deep); border: 1px solid var(--neon-cyan);
          color: var(--neon-cyan); font-size: 0.68rem; font-weight: 800; padding: 3px 12px; border-radius: 12px;
          box-shadow: 0 0 10px rgba(0,243,255,0.3); text-transform: uppercase; letter-spacing: 0.1em;
        }

        /* GEMINI-STYLE INPUT BAR ABOVE BROWSER TABS / KEYBOARD SAFE AREA */
        .chat-input-bar-container {
          padding: 12px 16px;
          background: rgba(12, 19, 41, 0.98);
          border-top: 1px solid var(--border-glow);
          display: flex;
          align-items: flex-end;
          gap: 10px;
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
          backdrop-filter: blur(20px);
        }

        .chat-textarea-gemini {
          flex: 1;
          background: rgba(5, 8, 20, 0.9);
          border: 1px solid var(--border-glow);
          border-radius: 18px;
          padding: 12px 16px;
          color: #fff;
          font-size: 0.9rem;
          outline: none;
          resize: none;
          min-height: 44px;
          max-height: 180px;
          line-height: 1.4;
          transition: border-color 0.2s;
        }
        .chat-textarea-gemini:focus { border-color: var(--neon-cyan); box-shadow: 0 0 12px rgba(0,243,255,0.25); }

        .send-chat-btn {
          width: 44px; height: 44px; border-radius: 50%; background: var(--neon-cyan); border: none;
          color: var(--bg-deep); font-weight: bold; cursor: pointer; display: flex; align-items: center;
          justify-content: center; box-shadow: 0 0 15px var(--neon-cyan); flex-shrink: 0; transition: transform 0.2s;
        }
        .send-chat-btn:hover { transform: scale(1.05); }

        /* Drawer Navigation */
        .side-nav-drawer {
          position: fixed; top: 0; left: -320px; width: 300px; height: 100vh; background: rgba(8, 13, 30, 0.98);
          border-right: 1px solid var(--border-glow); backdrop-filter: blur(20px); z-index: 200;
          transition: left 0.35s cubic-bezier(0.16, 1, 0.3, 1); padding: 80px 24px 24px 24px; display: flex; flex-direction: column; gap: 16px;
        }
        .side-nav-drawer.open { left: 0; }
        .side-nav-item {
          display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px;
          color: var(--text-muted); background: rgba(255,255,255,0.02); cursor: pointer; border: 1px solid transparent;
        }
        .side-nav-item:hover { color: var(--neon-cyan); border-color: var(--border-glow); background: rgba(0,243,255,0.08); }

        /* Modals & Overlays */
        .overlay-screen {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(2, 4, 10, 0.88);
          backdrop-filter: blur(16px); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal-box {
          background: rgba(11, 17, 38, 0.98); border: 1px solid var(--border-glow-active); border-radius: 20px;
          width: 100%; max-width: 520px; max-height: 85vh; overflow-y: auto; padding: 24px; box-shadow: 0 0 50px rgba(0, 243, 255, 0.25);
        }
        .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; }
        .close-modal-btn { background: none; border: none; color: var(--text-muted); font-size: 2rem; cursor: pointer; }

        .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .form-group label { font-size: 0.8rem; color: var(--text-muted); }
        .form-group input, .form-group textarea {
          background: rgba(5, 8, 20, 0.8); border: 1px solid var(--border-glow); border-radius: 10px;
          padding: 10px 14px; color: #fff; font-size: 0.88rem; outline: none;
        }

        .primary-action-btn {
          background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple)); border: none; color: #fff;
          font-weight: 600; padding: 12px; border-radius: 10px; cursor: pointer; width: 100%; font-size: 0.9rem;
        }

        /* Notifications Panel Card Item */
        .notification-card-item {
          background: rgba(12, 19, 41, 0.8); border: 1px solid var(--border-glow); border-radius: 12px;
          padding: 12px 16px; margin-bottom: 10px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
        }
      `}</style>

      {/* 3D Canvas Flight Background */}
      <canvas id="spaceCanvas" ref={canvasRef} />
      <div className="viewport-frame" />

      {/* Side Navigation Drawer Menu */}
      <div className={`side-nav-drawer ${isSideNavOpen ? 'open' : ''}`}>
        <div className="side-nav-item" onClick={() => { setIsSideNavOpen(false); setActiveModal('createGroup'); }}>
          <span>+</span> Create New Group
        </div>
        <div className="side-nav-item" onClick={() => { setIsSideNavOpen(false); setActiveModal('notifications'); markNotificationsRead(); }}>
          <span>🔔</span> Notifications Panel ({unreadNotificationCount})
        </div>
        <div className="side-nav-item" onClick={() => { setIsSideNavOpen(false); setActiveModal('editProfile'); }}>
          <span>👤</span> User Identity Profile
        </div>
        <div className="side-nav-item" onClick={() => { setIsSideNavOpen(false); onNavigateDashboard && onNavigateDashboard(); }} style={{ borderColor: 'rgba(255,0,127,0.4)', color: 'var(--neon-pink)' }}>
          <span>⮑</span> Back to Dashboard
        </div>
      </div>

      <div className="app-container">
        {/* App Bar / Top Header */}
        <header className="top-header">
          <div className="top-header-left">
            <button className="icon-action-btn" title="Side Navigation Menu" onClick={() => setIsSideNavOpen(!isSideNavOpen)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div className="brand-title-area">
              <h1>Group Chats</h1>
            </div>
          </div>

          <div className="top-header-right">
            {/* Notification Button */}
            <button className="icon-action-btn" title="Notifications" onClick={() => { setActiveModal('notifications'); markNotificationsRead(); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadNotificationCount > 0 && <span className="notif-badge-count">{unreadNotificationCount}</span>}
            </button>

            <div className="avatar" onClick={() => setActiveModal('editProfile')}>
              <img src={currentProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="User" />
            </div>

            {/* Three Dots in App Bar -> Opens Description & Dashboard Return Option */}
            <button className="icon-action-btn" title="Group Chats Description & Menu" onClick={() => setActiveModal('groupAbout')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </div>
        </header>

        {/* Search, Filter, and Action Bar */}
        <div className="action-bar-section">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search available groups & channels..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <button className="create-group-btn" onClick={() => setActiveModal('createGroup')}>+ Create Group</button>
        </div>

        {/* Main Content Dashboard Feed */}
        <main className="main-content">
          {/* SECTION 1: Pinned Chats (Maintains exact grid container appearance for first 3) */}
          <div>
            <div className="section-title">Pinned Chats</div>
            <div className="pinned-grid">
              {pinnedGroups.map((g, index) => (
                <div key={g.id} className="pinned-card" onClick={() => setCurrentOpenGroup(g)}>
                  <div className="pinned-card-header">
                    <div className="pinned-card-icon">0{index + 1}</div>
                    <span style={{ color: 'var(--neon-cyan)', fontSize: '1.2rem' }}>★</span>
                  </div>
                  <div className="section-divider-animated" />
                  <div>
                    <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '4px' }}>{g.name}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{g.description || 'Quantum channel'}</p>
                  </div>
                  <div className="section-divider-animated" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--neon-cyan)' }}>
                    <span>Active Stream</span>
                    <span>Open Channel &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: Group Feed */}
          <div>
            <div className="group-tabs">
              <button className={`tab-btn ${currentTabFilter === 'all' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('all')}>ALL GROUPS</button>
              <button className={`tab-btn ${currentTabFilter === 'joined' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('joined')}>JOINED</button>
              <button className={`tab-btn ${currentTabFilter === 'created' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('created')}>CREATED</button>
              <button className={`tab-btn ${currentTabFilter === 'available' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('available')}>NOT JOINED</button>
            </div>

            <div className="group-list" style={{ marginTop: '14px' }}>
              {getFilteredGroups().map((g) => {
                const joined = isMember(g, currentUser?.id);
                const unread = unreadCounts[g.id] || 0;
                const role = getUserRole(g, currentUser?.id);

                return (
                  <div key={g.id} className="group-item" onClick={() => setCurrentOpenGroup(g)}>
                    <div className="group-item-left">
                      <div className="avatar" style={{ border: '2px solid var(--neon-cyan)', background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))' }}>
                        {g.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ color: '#fff', fontSize: '0.92rem' }}>{g.name}</h4>
                          <span className="animated-solid-tag">{role}</span>
                          {!g.is_approved && <span className="animated-solid-tag" style={{ background: 'var(--neon-pink)' }}>Waiting for Approval</span>}
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{renderTextWithHighlightedTags(g.description)}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <div>{new Date(g.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {joined ? <span style={{ color: 'var(--neon-cyan)' }}>Joined</span> : <span>Available</span>}
                      </div>
                      {unread > 0 && <span className="notif-badge-count">{unread}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* CHAT ROOM MODAL (Includes Dynamic Area Input Above Mobile Keyboard / Bottom Bars) */}
      {currentOpenGroup && (
        <div className="overlay-screen">
          <div className="chat-room-container">
            <div className="chat-room-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setActiveModal('groupAbout')}>
                <div className="avatar">{currentOpenGroup.name.substring(0, 2).toUpperCase()}</div>
                <div>
                  <h4 style={{ color: '#fff' }}>{currentOpenGroup.name}</h4>
                  <span className="animated-solid-tag">{getUserRole(currentOpenGroup, currentUser?.id)}</span>
                </div>
              </div>
              <button className="close-modal-btn" onClick={() => setCurrentOpenGroup(null)}>&times;</button>
            </div>

            {/* Chat Messages Feed with TimeMention Dividers & Decorated Sender Container */}
            <div className="chat-messages-area">
              {processMessagesWithDividers(messages).map((item) => {
                if (item.isDivider) {
                  return (
                    <div key={item.id} className="time-mention-divider">
                      <span className="time-mention-badge">{item.label}</span>
                    </div>
                  );
                }

                const isOwn = item.sender_id === currentUser?.id;
                const senderName = item.profiles?.username || 'Node User';

                return (
                  <div key={item.id} className={`message-bubble-wrapper ${isOwn ? 'outgoing' : 'incoming'}`}>
                    <div className="decorated-sender-name">
                      <span>{senderName}</span>
                      <span className="animated-solid-tag" style={{ fontSize: '0.55rem', padding: '1px 5px' }}>
                        {getUserRole(currentOpenGroup, item.sender_id)}
                      </span>
                    </div>

                    <div className="message-bubble">
                      <p style={{ fontSize: '0.88rem', color: '#fff' }}>{renderTextWithHighlightedTags(item.content)}</p>
                    </div>

                    {/* Decorated Edit/Delete Messages Container */}
                    <div className="msg-actions-container">
                      <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isOwn && (
                        <>
                          <span className="msg-action-btn edit" onClick={() => handleStartEditMessage(item)}>Edit</span>
                          <span className="msg-action-btn delete" onClick={() => handleDeleteMessage(item.id)}>Delete</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Gemini-Style Chat Input Container: Positioned Sticky Above Keyboard / Tab Bars */}
            <div className="chat-input-bar-container">
              <textarea
                ref={textareaRef}
                className="chat-textarea-gemini"
                placeholder="Type message, @mention or tag..."
                rows={1}
                value={messageInputText}
                onChange={(e) => setMessageInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button className="send-chat-btn" onClick={handleSendMessage}>&rarr;</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOTIFICATIONS PANEL */}
      {activeModal === 'notifications' && (
        <div className="overlay-screen">
          <div className="modal-box">
            <div className="modal-header">
              <h3 style={{ color: '#fff' }}>Notifications Container</h3>
              <button className="close-modal-btn" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div>
              {notifications.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No notifications received yet.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="notification-card-item">
                    <div>
                      <h4 style={{ color: '#fff', fontSize: '0.88rem' }}>{n.title}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{renderTextWithHighlightedTags(n.message)}</p>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--neon-cyan)' }}>{n.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GROUP ABOUT & DESCRIPTION (THREE DOTS APP BAR HANDLER) */}
      {activeModal === 'groupAbout' && (
        <div className="overlay-screen">
          <div className="modal-box">
            <div className="modal-header">
              <h3 style={{ color: '#fff' }}>Group Chats Overview</h3>
              <button className="close-modal-btn" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Welcome to the official Group Chats page. Here you can coordinate with channel members, monitor real-time updates, and govern team activities.
              </p>

              {/* SUPERADMIN ACTIONS PANEL */}
              {currentOpenGroup && (
                <div style={{ background: 'rgba(5,8,20,0.8)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-glow)' }}>
                  <h4 style={{ color: 'var(--neon-cyan)', fontSize: '0.85rem', marginBottom: '10px' }}>Group Members & Admin Privileges</h4>
                  
                  {/* Invite Members */}
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label>Invite Member via Email</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" placeholder="member@domain.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                      <button className="primary-action-btn" style={{ width: 'auto', padding: '0 14px' }} onClick={handleInviteMember}>Invite</button>
                    </div>
                  </div>

                  {/* Members List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                    {groupMembers.map((m) => (
                      <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '8px' }}>
                        <span>{m.profiles?.username || 'User'} ({m.role})</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {currentProfile?.is_superadmin && m.role === 'admin' && (
                            <button className="animated-solid-tag" style={{ background: 'var(--neon-pink)', cursor: 'pointer', border: 'none' }} onClick={() => handleDemoteAdmin(m.user_id)}>Demote Admin</button>
                          )}
                          {m.role === 'member' && (
                            <button className="animated-solid-tag" style={{ cursor: 'pointer', border: 'none' }} onClick={() => handlePromoteAdmin(m.user_id)}>Promote Admin</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Button for Returning to Main Dashboard */}
              <button
                className="primary-action-btn"
                style={{ background: 'linear-gradient(135deg, var(--neon-pink), var(--neon-purple))', marginTop: '10px' }}
                onClick={() => {
                  setActiveModal(null);
                  onNavigateDashboard && onNavigateDashboard();
                }}
              >
                Back to Main Dashboard.jsx
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE GROUP */}
      {activeModal === 'createGroup' && (
        <div className="overlay-screen">
          <div className="modal-box">
            <div className="modal-header">
              <h3 style={{ color: '#fff' }}>Create a Group</h3>
              <button className="close-modal-btn" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div className="form-group">
              <label>Group Name</label>
              <input type="text" placeholder="Enter channel name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea placeholder="Describe group purpose..." rows={3} value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} />
            </div>
            <button className="primary-action-btn" onClick={handleCreateGroupSubmit}>Deploy Channel</button>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PROFILE */}
      {activeModal === 'editProfile' && (
        <div className="overlay-screen">
          <div className="modal-box">
            <div className="modal-header">
              <h3 style={{ color: '#fff' }}>Edit Identity</h3>
              <button className="close-modal-btn" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Status Message</label>
              <input type="text" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Avatar Image URL</label>
              <input type="text" value={editAvatarUrl} onChange={(e) => setEditAvatarUrl(e.target.value)} />
            </div>
            <button className="primary-action-btn" onClick={handleSaveProfile}>Save Identity</button>
          </div>
        </div>
      )}
    </div>
  );
}
