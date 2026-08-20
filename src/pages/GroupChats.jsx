
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Safe LocalStorage Wrapper Engine with fallback
const LocalStore = {
  get: (key) => {
    try {
      const d = localStorage.getItem('mtl_hub_' + key);
      return d ? JSON.parse(d) : null;
    } catch (e) {
      console.warn('LocalStorage read warning:', e);
      return null;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem('mtl_hub_' + key, JSON.stringify(val));
    } catch (e) {
      console.warn('LocalStorage write warning:', e);
    }
  }
};

const DEFAULT_PROFILE = {
  id: 'anthony-user-id',
  username: 'Anthony',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  status_message: 'Connected to Orbital Node 3099.',
  is_global_admin: true
};

const DEFAULT_GROUPS = [
  {
    id: '1',
    name: 'Montreal Football HQ',
    description: 'Main hub for Anthony & Montreal FC lovers.',
    is_big_three: true,
    is_approved: true,
    created_at: new Date().toISOString(),
    creator_id: 'anthony-user-id'
  },
  {
    id: '2',
    name: 'Tactics & Analytics',
    description: 'Deep strategy breakdowns and match stats.',
    is_big_three: true,
    is_approved: true,
    created_at: new Date().toISOString(),
    creator_id: 'other'
  },
  {
    id: '3',
    name: 'Champions League Chat',
    description: 'European matchday discussions.',
    is_big_three: true,
    is_approved: true,
    created_at: new Date().toISOString(),
    creator_id: 'other'
  }
];

export default function GroupChat({ supabaseClient }) {
  // Navigation & View States
  const [activeView, setActiveView] = useState('chats');
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [profile, setProfile] = useState(() => LocalStore.get('profile') || DEFAULT_PROFILE);
  const [groups, setGroups] = useState(() => LocalStore.get('groups') || DEFAULT_GROUPS);
  const [unreadCounts, setUnreadCounts] = useState(() => LocalStore.get('unread') || {});
  const [notifications, setNotifications] = useState(() => LocalStore.get('notifications') || [
    { id: 1, title: 'Welcome to MTL Hub', message: 'Connected directly with user Anthony.', time: 'Just Now' }
  ]);
  const [errorBanner, setErrorBanner] = useState({ visible: false, title: '', message: '' });

  // Modal & Active Item States
  const [activeModal, setActiveModal] = useState(null); // 'appHubAbout' | 'groupAbout' | 'createGroup' | 'deleteRequest' | 'editProfile' | 'chatRoom'
  const [currentOpenGroup, setCurrentOpenGroup] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  // Form Inputs
  const [newGroup, setNewGroup] = useState({ name: '', desc: '', type: 'Public' });
  const [editProfile, setEditProfile] = useState({
    username: profile.username,
    status: profile.status_message,
    avatar: profile.avatar_url
  });

  // Canvas Reference
  const canvasRef = useRef(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync profile edits state when profile updates
  useEffect(() => {
    setEditProfile({
      username: profile.username || 'Anthony',
      status: profile.status_message || '',
      avatar: profile.avatar_url || ''
    });
  }, [profile]);

  /* ============================================================
     1. SPACESHIP VIEWPORT 3D CANVAS ANIMATION (Optimized)
     ============================================================ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    let animationFrameId;
    let W = window.innerWidth;
    let H = window.innerHeight;
    const FOV = 350;
    const shipSpeed = 12;

    const handleResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    let targetOffsetX = 0;
    let targetOffsetY = 0;
    let currentOffsetX = 0;
    let currentOffsetY = 0;

    const handleMouseMove = (e) => {
      const mouseX = (e.clientX - W / 2) / (W / 2);
      const mouseY = (e.clientY - H / 2) / (H / 2);
      targetOffsetX = -mouseX * 100;
      targetOffsetY = -mouseY * 60;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Initialize 3D Stars
    const NUM_STARS = Math.min(800, Math.floor((W * H) / 1500)); // Dynamic star scaling for performance
    const stars3D = Array.from({ length: NUM_STARS }, () => ({
      x: (Math.random() - 0.5) * 3000,
      y: (Math.random() - 0.5) * 3000,
      z: Math.random() * 2000 + 10,
      size: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.8 ? '#8edcff' : Math.random() > 0.9 ? '#ffb366' : '#ffffff'
    }));

    const spacePlanets = [
      { x: -600, y: -200, z: 1800, r: 160, color1: '#2255aa', color2: '#0b1d3a', atmosphere: '#00e2ff' },
      { x: 800, y: 350, z: 2800, r: 240, color1: '#aa4422', color2: '#3d1205', atmosphere: '#ff7733' }
    ];

    const renderFrame = () => {
      currentOffsetX += (targetOffsetX - currentOffsetX) * 0.05;
      currentOffsetY += (targetOffsetY - currentOffsetY) * 0.05;

      const cx = W / 2 + currentOffsetX;
      const cy = H / 2 + currentOffsetY;

      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H));
      bgGrad.addColorStop(0, '#04091a');
      bgGrad.addColorStop(0.6, '#02040b');
      bgGrad.addColorStop(1, '#000103');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Render Planets
      for (let p of spacePlanets) {
        p.z -= shipSpeed * 0.3;
        if (p.z <= -200) p.z = 3500;
        let k = FOV / p.z;
        let px = p.x * k + cx;
        let py = p.y * k + cy;
        let size = p.r * k;
        if (px + size * 2 > 0 && px - size * 2 < W && py + size * 2 > 0 && py - size * 2 < H) {
          let atmoGrad = ctx.createRadialGradient(px, py, size * 0.9, px, py, size * 1.25);
          atmoGrad.addColorStop(0, p.atmosphere);
          atmoGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = atmoGrad;
          ctx.beginPath();
          ctx.arc(px, py, size * 1.25, 0, Math.PI * 2);
          ctx.fill();

          let pGrad = ctx.createRadialGradient(px - size * 0.3, py - size * 0.3, size * 0.1, px, py, size);
          pGrad.addColorStop(0, p.color1);
          pGrad.addColorStop(0.7, p.color2);
          pGrad.addColorStop(1, '#000000');
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Render Stars
      for (let s of stars3D) {
        s.z -= shipSpeed;
        if (s.z <= 1) {
          s.z = 2000;
          s.x = (Math.random() - 0.5) * 3000;
          s.y = (Math.random() - 0.5) * 3000;
        }
        let k = FOV / s.z;
        let px = s.x * k + cx;
        let py = s.y * k + cy;
        if (px >= 0 && px <= W && py >= 0 && py <= H) {
          let size = (1 - s.z / 2000) * s.size * 2;
          let alpha = Math.min(1, (1 - s.z / 2000) * 1.2);
          let prevK = FOV / (s.z + shipSpeed * 1.5);
          let prevX = s.x * prevK + cx;
          let prevY = s.y * prevK + cy;

          ctx.strokeStyle = s.color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = Math.max(0.5, size * 0.8);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(prevX, prevY);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }

      animationFrameId = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  /* ============================================================
     2. NOTIFICATION AND ERROR SYSTEM
     ============================================================ */
  const triggerErrorBanner = useCallback((title, message) => {
    setErrorBanner({ visible: true, title, message });
    addNotification(title, message);
  }, []);

  const addNotification = (title, message) => {
    const newItem = {
      id: Date.now(),
      title: title || 'System Update',
      message: message || '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setNotifications((prev) => {
      const updated = [newItem, ...prev];
      LocalStore.set('notifications', updated);
      return updated;
    });
  };

  /* ============================================================
     3. SUPABASE REALTIME & INITIAL DATA SYNC
     ============================================================ */
  useEffect(() => {
    if (!supabaseClient) return;

    let messageChannel = null;

    const initData = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const userId = session?.user?.id || profile.id;

        // Fetch profile
        const { data: profData } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profData) {
          setProfile(profData);
          LocalStore.set('profile', profData);
        }

        // Fetch Groups
        const { data: groupsData, error: gErr } = await supabaseClient
          .from('chat_groups')
          .select('*, group_members(user_id, role, is_suspended, suspended_until)')
          .order('created_at', { ascending: false });

        if (!gErr && groupsData) {
          setGroups(groupsData);
          LocalStore.set('groups', groupsData);
        }

        // Setup realtime
        messageChannel = supabaseClient
          .channel('public-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
            if (payload.new) {
              const gId = payload.new.group_id;
              if (currentOpenGroup && gId === currentOpenGroup.id) {
                fetchMessages(gId);
              } else {
                setUnreadCounts((prev) => {
                  const updated = { ...prev, [gId]: (prev[gId] || 0) + 1 };
                  LocalStore.set('unread', updated);
                  return updated;
                });
                addNotification('New Message Received', `Incoming update in neural channel.`);
              }
            }
          })
          .subscribe();
      } catch (err) {
        triggerErrorBanner('Connection Alert', 'Running in local resilient mode.');
      }
    };

    initData();

    return () => {
      if (messageChannel) supabaseClient.removeChannel(messageChannel);
    };
  }, [supabaseClient, currentOpenGroup, triggerErrorBanner]);

  /* ============================================================
     4. CHAT MESSAGES MANAGEMENT
     ============================================================ */
  const fetchMessages = async (groupId) => {
    const localKey = 'messages_' + groupId;
    const cached = LocalStore.get(localKey);
    if (cached) setChatMessages(cached);

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('messages')
        .select('*, profiles:sender_id(username, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setChatMessages(data);
        LocalStore.set(localKey, data);
        return;
      }
    }

    if (!cached) {
      const fallback = [
        { id: 'm1', sender_id: profile.id, content: 'Welcome to the full screen hub chat!', created_at: new Date().toISOString() },
        { id: 'm2', sender_id: 'bot', content: 'You can share text, images, or direct media links.', created_at: new Date().toISOString() }
      ];
      setChatMessages(fallback);
      LocalStore.set(localKey, fallback);
    }
  };

  useEffect(() => {
    if (activeModal === 'chatRoom') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeModal]);

  const openChatRoom = (group) => {
    setCurrentOpenGroup(group);
    setUnreadCounts((prev) => {
      const updated = { ...prev, [group.id]: 0 };
      LocalStore.set('unread', updated);
      return updated;
    });
    fetchMessages(group.id);
    setActiveModal('chatRoom');
  };

  const handleSendMessage = async (contentToSend) => {
    const text = contentToSend || messageInput.trim();
    if (!text || !currentOpenGroup) return;

    const newMessage = {
      id: 'msg_' + Date.now(),
      group_id: currentOpenGroup.id,
      sender_id: profile.id,
      content: text,
      created_at: new Date().toISOString(),
      profiles: { username: profile.username, avatar_url: profile.avatar_url }
    };

    const updated = [...chatMessages, newMessage];
    setChatMessages(updated);
    LocalStore.set('messages_' + currentOpenGroup.id, updated);
    setMessageInput('');

    if (supabaseClient) {
      await supabaseClient.from('messages').insert([
        { group_id: currentOpenGroup.id, sender_id: profile.id, content: text }
      ]);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleSendMessage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  /* ============================================================
     5. ACTIONS & HELPERS
     ============================================================ */
  const isMember = (group, userId) => {
    if (!group.group_members) return true;
    return group.group_members.some((m) => m.user_id === userId);
  };

  const filteredGroups = useMemo(() => {
    let list = groups.filter((g) => g.is_approved || g.creator_id === profile.id || isMember(g, profile.id));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q)));
    }

    if (activeTab === 'joined') list = list.filter((g) => isMember(g, profile.id));
    if (activeTab === 'created') list = list.filter((g) => g.creator_id === profile.id);
    if (activeTab === 'available') list = list.filter((g) => g.is_approved && !isMember(g, profile.id));

    return list;
  }, [groups, searchQuery, activeTab, profile.id]);

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) return;
    const newEntry = {
      id: 'grp_' + Date.now(),
      name: newGroup.name,
      description: newGroup.desc,
      is_big_three: false,
      is_approved: profile.is_global_admin || false,
      created_at: new Date().toISOString(),
      creator_id: profile.id
    };

    const updated = [newEntry, ...groups];
    setGroups(updated);
    LocalStore.set('groups', updated);

    if (supabaseClient) {
      await supabaseClient.from('chat_groups').insert([{
        name: newGroup.name,
        description: newGroup.desc,
        creator_id: profile.id,
        is_approved: newEntry.is_approved
      }]);
    }

    setNewGroup({ name: '', desc: '', type: 'Public' });
    setActiveModal(null);
    addNotification('Group Registered', `${newEntry.name} was successfully initialized.`);
  };

  const handleSaveProfile = async () => {
    const updated = {
      ...profile,
      username: editProfile.username,
      status_message: editProfile.status,
      avatar_url: editProfile.avatar
    };
    setProfile(updated);
    LocalStore.set('profile', updated);

    if (supabaseClient) {
      await supabaseClient.from('profiles').upsert([updated]);
    }
    setActiveModal(null);
    addNotification('Profile Sync', 'Display identification and status updated.');
  };

  const formatMediaContent = (text) => {
    if (!text) return '';
    if (text.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || text.startsWith('data:image')) {
      return (
        <div>
          <img src={text.trim()} alt="Attached media" className="chat-media-preview-attachment" />
        </div>
      );
    }
    if (text.match(/\.(mp4|webm|ogg)($|\?)/i)) {
      return (
        <video controls className="chat-media-preview-attachment">
          <source src={text.trim()} />
        </video>
      );
    }
    return <span>{text}</span>;
  };

  return (
    <div className="react-group-chat-wrapper">
      {/* Dynamic Embedded Styling Guaranteeing Standalone Adaptability */}
      <style>{`
        :root {
          --bg-deep: #020308;
          --border-glow: rgba(0, 243, 255, 0.25);
          --border-glow-active: rgba(0, 243, 255, 0.85);
          --neon-cyan: #00f3ff;
          --neon-purple: #b000ff;
          --neon-blue: #2260ff;
          --neon-pink: #ff007f;
          --text-main: #f0f4ff;
          --text-muted: #8a9bb8;
        }

        .react-group-chat-wrapper {
          background-color: var(--bg-deep);
          color: var(--text-main);
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        }

        #spaceCanvas {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          z-index: 0;
          pointer-events: none;
        }

        .viewport-frame {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          z-index: 2;
          pointer-events: none;
          box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.9), inset 0 0 40px rgba(0, 243, 255, 0.15);
          background: radial-gradient(circle at 50% 50%, transparent 60%, rgba(2, 5, 15, 0.7) 85%, rgba(1, 2, 6, 0.95) 100%);
        }

        .app-container {
          display: flex;
          flex-direction: column;
          width: 100vw; height: 100vh;
          max-width: 1440px;
          position: relative;
          z-index: 5;
          background: rgba(5, 8, 20, 0.1);
          backdrop-filter: blur(3px);
        }

        .workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }

        /* Side Navigation Drawer Menu */
        .side-nav-drawer {
          position: absolute;
          top: 70px; left: -320px;
          width: 300px; height: calc(100% - 70px);
          background: rgba(8, 13, 30, 0.96);
          backdrop-filter: blur(20px);
          z-index: 90;
          transition: left 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          padding: 30px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 15px 0 30px rgba(0,0,0,0.8);
          border-right: 1px solid var(--border-glow);
        }
        .side-nav-drawer.open { left: 0; }

        .side-nav-item {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 16px; border-radius: 12px;
          color: var(--text-muted); background: rgba(255,255,255,0.02);
          cursor: pointer; transition: all 0.25s; font-size: 0.9rem;
        }
        .side-nav-item:hover, .side-nav-item.active {
          color: var(--neon-cyan); border: 1px solid rgba(0, 243, 255, 0.3);
          background: rgba(0, 243, 255, 0.08); box-shadow: 0 0 15px rgba(0, 243, 255, 0.2);
        }

        /* Top Header */
        .top-header {
          height: 70px;
          border-bottom: 1px solid var(--border-glow);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; background: rgba(5, 8, 20, 0.75);
          backdrop-filter: blur(15px); z-index: 95;
        }

        .icon-action-btn {
          background: rgba(12, 19, 41, 0.8);
          border: 1px solid var(--border-glow);
          width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--text-main); transition: all 0.3s;
        }
        .icon-action-btn:hover {
          border-color: var(--neon-cyan); color: var(--neon-cyan);
          box-shadow: 0 0 15px rgba(0, 243, 255, 0.4);
        }

        .brand-title-area h1 {
          font-size: 1.15rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase;
          background: linear-gradient(90deg, #fff, var(--neon-cyan));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; border: 1px solid var(--neon-cyan);
          box-shadow: 0 0 12px rgba(0, 243, 255, 0.3); cursor: pointer;
        }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }

        /* Action Bar */
        .action-bar-section {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 24px 10px 24px; gap: 16px; flex-wrap: wrap;
        }

        .search-box { position: relative; flex: 1; min-width: 200px; max-width: 420px; }
        .search-box input {
          width: 100%; background: rgba(12, 19, 41, 0.8);
          border: 1px solid var(--border-glow); border-radius: 20px;
          padding: 10px 16px 10px 40px; color: var(--text-main);
          font-size: 0.85rem; outline: none; transition: all 0.3s;
        }
        .search-box input:focus {
          border-color: var(--neon-cyan); box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
        }
        .search-box svg {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          width: 16px; height: 16px; stroke: var(--text-muted); fill: none; stroke-width: 2;
        }

        .create-group-btn {
          background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple));
          border: none; color: #fff; font-weight: 600; padding: 9px 18px;
          border-radius: 20px; font-size: 0.85rem; cursor: pointer;
          box-shadow: 0 0 15px rgba(176, 0, 255, 0.5); transition: all 0.3s;
        }
        .create-group-btn:hover { transform: translateY(-1px); box-shadow: 0 0 25px rgba(176, 0, 255, 0.8); }

        /* Main Content */
        .main-content {
          flex: 1; overflow-y: auto; padding: 10px 24px 100px 24px;
          display: flex; flex-direction: column; gap: 20px;
        }

        .section-title {
          font-size: 0.82rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--neon-cyan); margin-bottom: 10px; margin-top: 6px;
          text-shadow: 0 0 8px rgba(0,243,255,0.4);
        }

        .pinned-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;
        }
        .pinned-card {
          background: linear-gradient(135deg, rgba(18, 27, 56, 0.9), rgba(11, 17, 38, 0.95));
          border: 1px solid rgba(176, 0, 255, 0.3); border-radius: 16px;
          padding: 18px; cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column;
        }
        .pinned-card:hover {
          border-color: var(--neon-cyan); transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 243, 255, 0.25);
        }

        .section-divider-animated {
          height: 2px; width: 100%; margin: 10px 0;
          background: linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-purple), transparent);
          background-size: 200% 100%; animation: dividerGlow 3s linear infinite;
        }
        @keyframes dividerGlow { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

        .group-tabs { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
        .tab-btn {
          background: rgba(12, 19, 41, 0.85); border: 1px solid var(--border-glow);
          border-radius: 14px; color: var(--text-muted); font-size: 0.8rem;
          font-weight: 600; cursor: pointer; padding: 8px 16px; transition: all 0.3s;
        }
        .tab-btn.active, .tab-btn:hover {
          color: var(--neon-cyan); border-color: var(--neon-cyan); box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
        }

        .group-list { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
        .group-item {
          background: rgba(12, 19, 41, 0.6); border: 1px solid rgba(0, 243, 255, 0.12);
          border-radius: 14px; padding: 14px 20px; display: flex; align-items: center;
          justify-content: space-between; cursor: pointer; transition: all 0.25s ease;
        }
        .group-item:hover {
          background: rgba(18, 27, 56, 0.85); border-color: rgba(0, 243, 255, 0.4);
          transform: translateX(4px); box-shadow: 0 4px 20px rgba(0, 243, 255, 0.1);
        }

        .group-item-avatar {
          width: 46px; height: 46px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, var(--neon-cyan), var(--neon-purple), var(--bg-deep));
          display: flex; align-items: center; justify-content: center;
          border: 2px solid var(--neon-cyan); font-weight: 800; font-size: 0.95rem;
          box-shadow: 0 0 12px rgba(0, 243, 255, 0.5); flex-shrink: 0; color: #fff;
        }

        .unread-badge {
          background: var(--neon-pink); color: #fff; font-size: 0.7rem; font-weight: 800;
          padding: 2px 7px; border-radius: 10px; box-shadow: 0 0 8px var(--neon-pink);
        }

        /* Overlay & Modals */
        .overlay-screen {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(2, 4, 10, 0.85); backdrop-filter: blur(16px);
          z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .modal-box {
          background: rgba(11, 17, 38, 0.95); border: 1px solid var(--border-glow-active);
          border-radius: 20px; width: 100%; max-width: 500px; max-height: 90vh;
          overflow-y: auto; box-shadow: 0 0 60px rgba(0, 243, 255, 0.25);
          display: flex; flex-direction: column;
        }
        .modal-header {
          padding: 20px 24px; border-bottom: 2px solid rgba(255,255,255,0.08);
          display: flex; align-items: center; justify-content: space-between;
        }
        .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }

        /* Full Screen Chat Modal */
        .chat-room-container {
          flex: 1; display: flex; flex-direction: column;
          background: rgba(8, 12, 28, 0.98); width: 100vw; height: 100vh;
        }
        .chat-room-header {
          padding: 16px 24px; background: rgba(12, 19, 41, 0.95);
          border-bottom: 1px solid var(--border-glow); display: flex;
          align-items: center; justify-content: space-between;
        }
        .chat-messages-area {
          flex: 1; padding: 24px; overflow-y: auto; display: flex;
          flex-direction: column; gap: 14px;
        }
        .message-bubble {
          max-width: 80%; background: rgba(18, 27, 56, 0.85);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px 18px;
        }
        .message-bubble.incoming { align-self: flex-start; border-color: rgba(0, 243, 255, 0.2); }
        .message-bubble.outgoing { align-self: flex-end; background: rgba(34, 96, 255, 0.2); border-color: var(--neon-cyan); }

        .chat-input-bar {
          padding: 16px 24px; background: rgba(12, 19, 41, 0.95);
          border-top: 1px solid var(--border-glow); display: flex; gap: 12px; align-items: center;
        }
        .chat-input-bar input[type="text"] {
          flex: 1; background: rgba(5, 8, 20, 0.8); border: 1px solid var(--border-glow);
          border-radius: 20px; padding: 12px 20px; color: #fff; outline: none;
        }
        .chat-media-preview-attachment {
          max-width: 260px; max-height: 180px; border-radius: 10px; margin-top: 8px; border: 1px solid var(--border-glow); object-fit: cover;
        }

        /* Bottom Floating Dock */
        .bottom-nav-dock {
          position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
          background: rgba(11, 17, 38, 0.9); border: 1px solid var(--border-glow);
          border-radius: 40px; padding: 8px 24px; display: flex; align-items: center;
          gap: 32px; backdrop-filter: blur(20px); z-index: 10;
        }
        .dock-item {
          background: none; border: none; color: var(--text-muted);
          cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; transition: all 0.3s;
        }
        .dock-item.active, .dock-item:hover { color: var(--neon-cyan); }
        .dock-item.highlighted-center {
          width: 48px; height: 48px; background: radial-gradient(circle, rgba(176,0,255,0.9) 0%, rgba(34,96,255,0.5) 40%, transparent 100%);
          border: 1px solid var(--neon-cyan); border-radius: 50%; display: flex; align-items: center; justify-content: center;
          margin-top: -12px; color: var(--neon-cyan); box-shadow: 0 0 20px rgba(0,243,255,0.6);
        }

        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-group label { font-size: 0.8rem; color: var(--text-muted); }
        .form-group input, .form-group textarea {
          background: rgba(5, 8, 20, 0.8); border: 1px solid var(--border-glow);
          border-radius: 10px; padding: 10px 14px; color: #fff; font-size: 0.88rem; outline: none;
        }

        .primary-action-btn {
          background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple));
          border: none; color: #fff; font-weight: 600; padding: 12px;
          border-radius: 10px; cursor: pointer; width: 100%; transition: all 0.2s;
        }
        .primary-action-btn:hover { opacity: 0.95; box-shadow: 0 0 20px rgba(176, 0, 255, 0.7); }
      `}</style>

      {/* 3D Animated Background Canvas */}
      <canvas ref={canvasRef} id="spaceCanvas" />

      {/* Ambient Glass Frame */}
      <div className="viewport-frame" />

      <div className="app-container">
        <main className="workspace">
          {/* SIDE NAVIGATION DRAWER */}
          <div className={`side-nav-drawer ${sideMenuOpen ? 'open' : ''}`}>
            <div className={`side-nav-item ${activeView === 'chats' ? 'active' : ''}`} onClick={() => { setActiveView('chats'); setSideMenuOpen(false); }}>
              <span>~</span> Group Chats
            </div>
            <div className={`side-nav-item ${activeView === 'notifications' ? 'active' : ''}`} onClick={() => { setActiveView('notifications'); setSideMenuOpen(false); }}>
              <span>~</span> Notifications
            </div>
            <div className="side-nav-item" onClick={() => { setActiveModal('createGroup'); setSideMenuOpen(false); }}>
              <span>~</span> Create New Group
            </div>
            <div className="side-nav-item" onClick={() => { setActiveModal('deleteRequest'); setSideMenuOpen(false); }}>
              <span>~</span> Group Approval
            </div>
            <div className={`side-nav-item ${activeView === 'userHub' ? 'active' : ''}`} onClick={() => { setActiveView('userHub'); setSideMenuOpen(false); }}>
              <span>~</span> User Profile
            </div>
          </div>

          {/* TOP HEADER */}
          <header className="top-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="icon-action-btn" title="Navigation Drawer" onClick={() => setSideMenuOpen(!sideMenuOpen)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="brand-title-area" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1>Mtl Football Hub</h1>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="avatar" onClick={() => setActiveView('userHub')} title="User Profile">
                <img src={profile.avatar_url || DEFAULT_PROFILE.avatar_url} alt="User" />
              </div>
              <button className="icon-action-btn" title="About MTL Football Hub" onClick={() => setActiveModal('appHubAbout')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                </svg>
              </button>
            </div>
          </header>

          {/* ACTION BAR */}
          <div className="action-bar-section">
            <div className="search-box">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search groups..." />
            </div>
            <button className="create-group-btn" onClick={() => setActiveModal('createGroup')}>+ Create Group</button>
          </div>

          {/* ERROR NOTIFICATION BANNER */}
          {errorBanner.visible && (
            <div style={{ padding: '0 24px', marginBottom: '10px' }}>
              <div style={{ background: 'rgba(255, 0, 127, 0.15)', border: '1px solid var(--neon-pink)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '0.85rem' }}>{errorBanner.title}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{errorBanner.message}</p>
                </div>
                <button onClick={() => setErrorBanner({ ...errorBanner, visible: false })} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
              </div>
            </div>
          )}

          {/* MAIN DYNAMIC CONTENT */}
          <div className="main-content">
            {activeView === 'chats' && (
              <>
                {/* Pinned Section */}
                <div>
                  <div className="section-title">Pinned Chats</div>
                  <div className="pinned-grid">
                    {groups.filter((g) => g.is_big_three).map((g, idx) => (
                      <div key={g.id} className="pinned-card" onClick={() => openChatRoom(g)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>0{idx + 1}</span>
                          <span style={{ color: 'var(--neon-cyan)' }}>★</span>
                        </div>
                        <div className="section-divider-animated" />
                        <h3 style={{ color: '#fff', fontSize: '0.98rem', marginBottom: '4px' }}>{g.name}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flex: 1 }}>{g.description}</p>
                        <div className="section-divider-animated" />
                        <span style={{ color: 'var(--neon-cyan)', fontSize: '0.7rem' }}>Open Chat Stream &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feed Section */}
                <div>
                  <div className="group-tabs">
                    {['all', 'joined', 'created', 'available'].map((tab) => (
                      <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                        {tab.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="group-list">
                    {filteredGroups.map((g) => {
                      const unread = unreadCounts[g.id] || 0;
                      return (
                        <div key={g.id} className="group-item" onClick={() => openChatRoom(g)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div className="group-item-avatar">{g.name.substring(0, 2).toUpperCase()}</div>
                            <div>
                              <h4 style={{ color: '#fff', fontSize: '0.9rem' }}>
                                {g.name} {g.is_big_three && <span style={{ color: 'var(--neon-cyan)' }}>★</span>}
                              </h4>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{g.description}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {unread > 0 && <div className="unread-badge">{unread}</div>}
                            <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>&bull;&bull;&bull;</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeView === 'userHub' && (
              <div>
                <div className="section-title">PROFILE</div>
                <div style={{ background: 'rgba(12,19,41,0.7)', border: '1px solid var(--border-glow)', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="avatar" style={{ width: '64px', height: '64px' }}>
                      <img src={profile.avatar_url || DEFAULT_PROFILE.avatar_url} alt="User Profile" />
                    </div>
                    <div>
                      <h3 style={{ color: '#fff', fontSize: '1.2rem' }}>{profile.username}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{profile.status_message}</p>
                    </div>
                  </div>
                  <button className="tab-btn" onClick={() => setActiveModal('editProfile')}>Edit Profile</button>
                </div>
              </div>
            )}

            {activeView === 'notifications' && (
              <div>
                <div className="section-title">Notifications</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notifications.map((n) => (
                    <div key={n.id} style={{ background: 'rgba(12,19,41,0.7)', border: '1px solid var(--border-glow)', borderRadius: '12px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ color: '#fff', fontSize: '0.88rem' }}>{n.title}</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{n.message}</p>
                      </div>
                      <span style={{ color: 'var(--neon-cyan)', fontSize: '0.7rem' }}>{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM DOCK */}
          <nav className="bottom-nav-dock">
            <button className={`dock-item ${activeView === 'chats' ? 'active' : ''}`} onClick={() => setActiveView('chats')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <span style={{ fontSize: '0.65rem' }}>Chats</span>
            </button>
            <button className={`dock-item ${activeView === 'notifications' ? 'active' : ''}`} onClick={() => setActiveView('notifications')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
              <span style={{ fontSize: '0.65rem' }}>Notifications</span>
            </button>
            <button className="dock-item highlighted-center" onClick={() => setActiveModal('createGroup')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            <button className={`dock-item ${activeView === 'userHub' ? 'active' : ''}`} onClick={() => setActiveView('userHub')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <span style={{ fontSize: '0.65rem' }}>Profile</span>
            </button>
          </nav>
        </main>
      </div>

      {/* FULL SCREEN CHAT ROOM MODAL */}
      {activeModal === 'chatRoom' && currentOpenGroup && (
        <div className="overlay-screen" style={{ padding: 0 }}>
          <div className="chat-room-container">
            <div className="chat-room-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="avatar">{currentOpenGroup.name.substring(0, 2).toUpperCase()}</div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '0.95rem' }}>{currentOpenGroup.name}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Full screen active stream</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>

            <div className="chat-messages-area">
              {chatMessages.map((m) => {
                const isOwn = m.sender_id === profile.id;
                return (
                  <div key={m.id} className={`message-bubble ${isOwn ? 'outgoing' : 'incoming'}`}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--neon-cyan)', fontWeight: 'bold', marginBottom: '4px' }}>
                      {m.profiles ? m.profiles.username : isOwn ? profile.username : 'Node Member'}
                    </div>
                    <div style={{ color: '#fff', fontSize: '0.85rem' }}>{formatMediaContent(m.content)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-bar">
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*,video/*" />
              <button className="icon-action-btn" title="Upload Media" onClick={() => fileInputRef.current?.click()}>
                📷
              </button>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type message or media link..."
              />
              <button className="create-group-btn" onClick={() => handleSendMessage()}>SEND</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {activeModal === 'createGroup' && (
        <div className="overlay-screen">
          <div className="modal-box">
            <div className="modal-header">
              <h3 style={{ color: '#fff', fontSize: '1.1rem' }}>Create Group</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Group Name</label>
                <input type="text" value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="Enter group title" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={newGroup.desc} onChange={(e) => setNewGroup({ ...newGroup, desc: e.target.value })} placeholder="Group summary..." rows={3} />
              </div>
              <button className="primary-action-btn" onClick={handleCreateGroup}>Deploy Group</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {activeModal === 'editProfile' && (
        <div className="overlay-screen">
          <div className="modal-box">
            <div className="modal-header">
              <h3 style={{ color: '#fff', fontSize: '1.1rem' }}>Edit Identity</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Username</label>
                <input type="text" value={editProfile.username} onChange={(e) => setEditProfile({ ...editProfile, username: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <input type="text" value={editProfile.status} onChange={(e) => setEditProfile({ ...editProfile, status: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Avatar URL</label>
                <input type="text" value={editProfile.avatar} onChange={(e) => setEditProfile({ ...editProfile, avatar: e.target.value })} />
              </div>
              <button className="primary-action-btn" onClick={handleSaveProfile}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ABOUT APP MODAL */}
      {activeModal === 'appHubAbout' && (
        <div className="overlay-screen">
          <div className="modal-box" style={{ textAlign: 'center' }}>
            <div className="modal-header">
              <h3 style={{ color: '#fff', fontSize: '1.1rem' }}>MTL Football Hub</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            <div className="modal-body">
              <h4 style={{ color: 'var(--neon-cyan)' }}>Decentralized Football Network</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.4' }}>
                High-performance real-time communication platform optimized for desktop and mobile clients.
              </p>
              <div style={{ textAlign: 'left', background: 'rgba(5,8,20,0.6)', padding: '12px', borderRadius: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <div><b>Platform Lead:</b> MOURICE LENNOX</div>
                <div><b>License:</b> MIT Open Source License</div>
                <div><b>Status:</b> Fully Operational</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
