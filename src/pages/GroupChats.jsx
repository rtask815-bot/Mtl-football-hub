/*
 * MIT License
 * 
 * Copyright (c) 2026 Mtl Football Hub
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIMBB OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
 * IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- Safe Configuration & Initialization ---
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LocalStore = {
    get: (key) => {
        try {
            const d = localStorage.getItem('mtl_hub_' + key);
            return d ? JSON.parse(d) : null;
        } catch (e) { return null; }
    },
    set: (key, val) => {
        try {
            localStorage.setItem('mtl_hub_' + key, JSON.stringify(val));
        } catch (e) {}
    }
};

// --- Starfield Background Component ---
const SpaceCanvas = memo(() => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: false });
        let animationFrameId;

        let W = window.innerWidth;
        let H = window.innerHeight;
        let FOV = 350;
        let shipSpeed = 12; // Optimized speed to prevent render stuttering

        const resizeCanvas = () => {
            W = window.innerWidth;
            H = window.innerHeight;
            canvas.width = W;
            canvas.height = H;
        };

        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        let mouseX = 0, mouseY = 0;
        let targetOffsetX = 0, targetOffsetY = 0;
        let currentOffsetX = 0, currentOffsetY = 0;

        const handleMouseMove = (e) => {
            mouseX = (e.clientX - W / 2) / (W / 2);
            mouseY = (e.clientY - H / 2) / (H / 2);
            targetOffsetX = -mouseX * 80;
            targetOffsetY = -mouseY * 50;
        };

        window.addEventListener("mousemove", handleMouseMove);

        const NUM_STARS = Math.min(600, Math.floor((W * H) / 1500)); // Adaptive density based on resolution
        const stars3D = Array.from({ length: NUM_STARS }, () => ({
            x: (Math.random() - 0.5) * 3000,
            y: (Math.random() - 0.5) * 3000,
            z: Math.random() * 2000 + 10,
            size: Math.random() * 1.5 + 0.5,
            color: Math.random() > 0.8 ? '#8edcff' : (Math.random() > 0.9 ? '#ffb366' : '#ffffff')
        }));

        const nebulae = Array.from({ length: 4 }, () => ({
            x: (Math.random() - 0.5) * 2000,
            y: (Math.random() - 0.5) * 2000,
            z: Math.random() * 2500 + 500,
            radius: Math.random() * 300 + 200,
            color: Math.random() > 0.5 ? 'rgba(0, 243, 255, ' : 'rgba(176, 0, 255, '
        }));

        const draw = () => {
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

            for (let n of nebulae) {
                n.z -= shipSpeed * 0.3;
                if (n.z <= 10) n.z = 2500;
                let k = FOV / n.z;
                let px = n.x * k + cx;
                let py = n.y * k + cy;
                let size = n.radius * k;
                if (px + size > 0 && px - size < W && py + size > 0 && py - size < H) {
                    let grad = ctx.createRadialGradient(px, py, 0, px, py, size);
                    let alpha = Math.min(0.12, (1 - n.z / 3000) * 0.15);
                    grad.addColorStop(0, n.color + alpha + ')');
                    grad.addColorStop(1, n.color + '0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(px, py, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

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
                    ctx.fillStyle = s.color;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(px, py, Math.max(0.5, size), 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }
            }
            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} style={styles.spaceCanvas} />;
});

// --- Main Application Component ---
export default function GroupChat() {
    // --- Application States ---
    const [view, setView] = useState('chats');
    const [sideNavOpen, setSideNavOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [tabFilter, setTabFilter] = useState('all');
    
    // Data States
    const [currentUser, setCurrentUser] = useState(null);
    const [profile, setProfile] = useState({ username: 'Authentic User', status_message: 'Connected', avatar_url: '' });
    const [groups, setGroups] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [errorBanner, setErrorBanner] = useState({ show: false, title: '', message: '' });

    // Active Chat & Message States
    const [currentGroup, setCurrentGroup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const chatEndRef = useRef(null);

    // Form States
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [newGroupPrivacy, setNewGroupPrivacy] = useState('Public');
    const [editName, setEditName] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [editAvatar, setEditAvatar] = useState('');

    // --- Helper & Utility Functions ---
    const triggerError = (title, message) => {
        setErrorBanner({ show: true, title, message });
        addNotification(title, message);
    };

    const addNotification = (title, message) => {
        const item = {
            id: Date.now(),
            title,
            message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setNotifications(prev => {
            const next = [item, ...prev];
            LocalStore.set('notifications', next);
            return next;
        });
    };

    // --- Initialization & Data Synchronization ---
    useEffect(() => {
        // Load local caches
        const cachedProfile = LocalStore.get('profile');
        if (cachedProfile) setProfile(cachedProfile);

        const cachedGroups = LocalStore.get('groups');
        if (cachedGroups && Array.isArray(cachedGroups)) setGroups(cachedGroups);

        const cachedUnread = LocalStore.get('unread');
        if (cachedUnread) setUnreadCounts(cachedUnread);

        const cachedNotifs = LocalStore.get('notifications') || [
            { id: 1, title: 'Welcome to MTL Hub', message: 'System initialized.', time: 'Just Now' }
        ];
        setNotifications(cachedNotifs);

        // Supabase Data Initialization
        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const usr = session?.user || { id: 'anthony-user-id', email: 'user@mtlhub.com' };
                setCurrentUser(usr);

                // Sync Profile
                let { data: prof } = await supabase.from('profiles').select('*').eq('id', usr.id).single();
                if (!prof) {
                    prof = { id: usr.id, username: 'Anthony', status_message: 'Connected to Mtl Football Hub', avatar_url: '', is_global_admin: true };
                }
                setProfile(prof);
                LocalStore.set('profile', prof);

                // Fetch Groups
                let { data: grps, error } = await supabase.from('chat_groups').select('*').order('created_at', { ascending: false });
                if (error || !grps || grps.length === 0) {
                    grps = [
                        { id: '1', name: 'Montreal Football HQ', description: 'Main hub for Anthony & Montreal FC lovers.', is_big_three: true, is_approved: true, created_at: new Date().toISOString(), creator_id: usr.id },
                        { id: '2', name: 'Tactics & Analytics', description: 'Deep strategy breakdowns and match stats.', is_big_three: true, is_approved: true, created_at: new Date().toISOString(), creator_id: 'other' },
                        { id: '3', name: 'Champions League Chat', description: 'European matchday discussions.', is_big_three: true, is_approved: true, created_at: new Date().toISOString(), creator_id: 'other' }
                    ];
                }
                setGroups(grps);
                LocalStore.set('groups', grps);
            } catch (err) {
                triggerError("Authentication", "Operating in resilient offline mode.");
            }
        };

        initSession();

        // Realtime Subscription Engine
        const channel = supabase
            .channel('public-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
                if (payload.new) {
                    const gId = payload.new.group_id;
                    if (currentGroup && currentGroup.id === gId) {
                        fetchMessages(gId);
                    } else {
                        setUnreadCounts(prev => {
                            const updated = { ...prev, [gId]: (prev[gId] || 0) + 1 };
                            LocalStore.set('unread', updated);
                            return updated;
                        });
                        addNotification("New Transmission", `Incoming update in group ${gId}`);
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentGroup?.id]);

    // Auto Scroll Chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Sync Edit Form Inputs on Open
    useEffect(() => {
        if (activeModal === 'editProfile') {
            setEditName(profile.username || '');
            setEditStatus(profile.status_message || '');
            setEditAvatar(profile.avatar_url || '');
        }
    }, [activeModal, profile]);

    // --- Actions ---
    const fetchMessages = async (groupId) => {
        const localKey = 'messages_' + groupId;
        const cached = LocalStore.get(localKey);
        if (cached) setMessages(cached);

        const { data, error } = await supabase
            .from('messages')
            .select('*, profiles:sender_id(username, avatar_url)')
            .eq('group_id', groupId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setMessages(data);
            LocalStore.set(localKey, data);
        } else if (!cached) {
            const fallback = [
                { id: 'm1', sender_id: currentUser?.id, content: 'Welcome to the full screen hub chat!', created_at: new Date().toISOString() },
                { id: 'm2', sender_id: 'bot', content: 'You can now share photos, videos, and media here.', created_at: new Date().toISOString() }
            ];
            setMessages(fallback);
            LocalStore.set(localKey, fallback);
        }
    };

    const handleOpenChat = (group) => {
        setCurrentGroup(group);
        setUnreadCounts(prev => {
            const next = { ...prev, [group.id]: 0 };
            LocalStore.set('unread', next);
            return next;
        });
        fetchMessages(group.id);
        setActiveModal('chatRoom');
    };

    const handleSendMessage = async (overrideContent) => {
        const content = overrideContent || messageInput.trim();
        if (!content || !currentGroup || !currentUser) return;

        const localKey = 'messages_' + currentGroup.id;
        const newMsgObj = {
            id: 'local_' + Date.now(),
            group_id: currentGroup.id,
            sender_id: currentUser.id,
            content: content,
            created_at: new Date().toISOString()
        };

        const updated = [...messages, newMsgObj];
        setMessages(updated);
        LocalStore.set(localKey, updated);
        if (!overrideContent) setMessageInput('');

        await supabase.from('messages').insert([{
            group_id: currentGroup.id,
            sender_id: currentUser.id,
            content: content,
            message_type: 'text'
        }]);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => handleSendMessage(event.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteMessage = async (msgId) => {
        const localKey = 'messages_' + currentGroup.id;
        const filtered = messages.filter(m => m.id !== msgId);
        setMessages(filtered);
        LocalStore.set(localKey, filtered);
        await supabase.from('messages').delete().eq('id', msgId);
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        const newGroupObj = {
            id: 'grp_' + Date.now(),
            name: newGroupName.trim(),
            description: newGroupDesc.trim() || 'New Football Hub Group',
            is_approved: true,
            created_at: new Date().toISOString(),
            creator_id: currentUser?.id
        };

        const updated = [newGroupObj, ...groups];
        setGroups(updated);
        LocalStore.set('groups', updated);
        setActiveModal(null);
        setNewGroupName('');
        setNewGroupDesc('');
        addNotification("Group Created", `Group ${newGroupObj.name} created successfully.`);
    };

    const handleSaveProfile = async () => {
        const updated = {
            ...profile,
            username: editName.trim() || 'Anthony',
            status_message: editStatus.trim(),
            avatar_url: editAvatar.trim()
        };
        setProfile(updated);
        LocalStore.set('profile', updated);
        setActiveModal(null);

        if (currentUser) {
            await supabase.from('profiles').update({
                username: updated.username,
                status_message: updated.status_message,
                avatar_url: updated.avatar_url
            }).eq('id', currentUser.id);
        }
    };

    const handleSignOut = async () => {
        localStorage.clear();
        await supabase.auth.signOut();
        window.location.reload();
    };

    // --- Computed Filter Logic ---
    const filteredGroups = groups.filter(g => {
        const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matchesSearch) return false;
        if (tabFilter === 'joined') return g.creator_id === currentUser?.id;
        if (tabFilter === 'created') return g.creator_id === currentUser?.id;
        if (tabFilter === 'available') return g.is_approved && g.creator_id !== currentUser?.id;
        return true;
    });

    const pinnedGroups = groups.filter(g => g.is_big_three);

    // --- Render Content Helpers ---
    const renderMediaContent = (text) => {
        if (!text) return '';
        if (text.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || text.startsWith('data:image')) {
            return (
                <div>
                    <div>{text.replace(/(https?:\/\/[^\s]+)/g, '')}</div>
                    <img src={text.trim()} style={styles.chatMediaPreview} alt="Attachment" />
                </div>
            );
        }
        if (text.match(/\.(mp4|webm|ogg)($|\?)/i)) {
            return <video controls style={styles.chatMediaPreview}><source src={text.trim()} /></video>;
        }
        return text.replace(/@([a-zA-Z0-9_]+)/g, ' @$1 ');
    };

    return (
        <div style={styles.appWrapper}>
            <style>{`
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; scrollbar-width: thin; scrollbar-color: #00f3ff #020308; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: #020308; }
                ::-webkit-scrollbar-thumb { background: #00f3ff; border-radius: 4px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes dividerGlow { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
            `}</style>

            {/* Background Animations */}
            <SpaceCanvas />
            <div style={styles.viewportFrame} />

            {/* Application Main Layout Container */}
            <div style={styles.appContainer}>
                <main style={styles.workspace}>

                    {/* Navigation Drawer */}
                    <div style={{ ...styles.sideNavDrawer, ...(sideNavOpen ? styles.sideNavDrawerOpen : {}) }}>
                        <div style={{ ...styles.sideNavItem, ...(view === 'chats' ? styles.sideNavItemActive : {}) }} onClick={() => { setView('chats'); setSideNavOpen(false); }}>
                            <span>~</span> Group Chats
                        </div>
                        <div style={{ ...styles.sideNavItem, ...(view === 'predictions' ? styles.sideNavItemActive : {}) }} onClick={() => { setView('predictions'); setSideNavOpen(false); }}>
                            <span>~</span> Notifications
                        </div>
                        <div style={styles.sideNavItem} onClick={() => { setActiveModal('createGroup'); setSideNavOpen(false); }}>
                            <span>~</span> Create New Group
                        </div>
                        <div style={styles.sideNavItem} onClick={() => { setActiveModal('deleteRequest'); setSideNavOpen(false); }}>
                            <span>~</span> Group Approval
                        </div>
                        <div style={{ ...styles.sideNavItem, ...(view === 'userHub' ? styles.sideNavItemActive : {}) }} onClick={() => { setView('userHub'); setSideNavOpen(false); }}>
                            <span>~</span> User Profile
                        </div>
                        <div style={{ ...styles.sideNavItem, borderColor: 'rgba(255,0,127,0.4)', color: '#ff007f' }} onClick={handleSignOut}>
                            <span>⮑</span> Sign Out
                        </div>
                    </div>

                    {/* Top Navigation Header */}
                    <header style={styles.topHeader}>
                        <div style={styles.flexRow}>
                            <button style={styles.iconActionBtn} title="Side Navigation" onClick={() => setSideNavOpen(!sideNavOpen)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                            </button>
                            <div style={{ ...styles.flexRow, gap: '12px' }}>
                                <svg style={styles.brandLogo} viewBox="0 0 100 100" fill="none">
                                    <circle cx="50" cy="50" r="46" fill="url(#ballGrad)" stroke="#00f3ff" strokeWidth="4"/>
                                    <path d="M50 20 L68 33 L61 55 L39 55 L32 33 Z" fill="#0b1126" stroke="#00f3ff" strokeWidth="3"/>
                                    <path d="M50 20 L50 4 M68 33 L88 25 M61 55 L78 72 M39 55 L22 72 M32 33 L12 25" stroke="#00f3ff" strokeWidth="3"/>
                                    <defs>
                                        <radialGradient id="ballGrad" cx="30%" cy="30%" r="70%">
                                            <stop offset="0%" stopColor="#00f3ff"/>
                                            <stop offset="50%" stopColor="#b000ff"/>
                                            <stop offset="100%" stopColor="#020308"/>
                                        </radialGradient>
                                    </defs>
                                </svg>
                                <h1 style={styles.brandTitle}>Mtl Football Hub</h1>
                            </div>
                        </div>

                        <div style={styles.flexRow}>
                            <div style={styles.avatar} onClick={() => setView('userHub')}>
                                <img src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="User" style={styles.avatarImg} />
                            </div>
                            <button style={styles.iconActionBtn} title="About Hub" onClick={() => setActiveModal('appAbout')}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                            </button>
                        </div>
                    </header>

                    {/* Search & Dynamic Filter Actions */}
                    <div style={styles.actionBar}>
                        <div style={styles.searchBox}>
                            <svg style={styles.searchIcon} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input 
                                type="text" 
                                style={styles.searchInput} 
                                placeholder="Search available groups & channels..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div style={{ ...styles.flexRow, gap: '12px' }}>
                            <button style={styles.filterBtn} onClick={() => setTabFilter('all')}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                                Filter
                            </button>
                            <button style={styles.createBtn} onClick={() => setActiveModal('createGroup')}>+ Create Group</button>
                        </div>
                    </div>

                    {/* Error Banner Prompt */}
                    {errorBanner.show && (
                        <div style={{ padding: '0 30px' }}>
                            <div style={styles.errorBanner}>
                                <div style={styles.flexRow}>
                                    <div style={styles.errorIconBox}>!</div>
                                    <div>
                                        <h4 style={{ fontSize: '0.88rem', color: '#fff' }}>{errorBanner.title}</h4>
                                        <p style={{ fontSize: '0.75rem', color: '#8a9bb8' }}>{errorBanner.message}</p>
                                    </div>
                                </div>
                                <button style={styles.closeDismissBtn} onClick={() => setErrorBanner({ show: false, title: '', message: '' })}>&times;</button>
                            </div>
                        </div>
                    )}

                    {/* Views Container */}
                    <div style={styles.mainContent}>

                        {/* VIEW 1: CHATS VIEW */}
                        {view === 'chats' && (
                            <div style={styles.viewSection}>
                                {/* Pinned Cards */}
                                <div>
                                    <div style={styles.sectionTitle}>Pinned Chats</div>
                                    <div style={styles.pinnedGrid}>
                                        {pinnedGroups.map((g, idx) => (
                                            <div key={g.id} style={styles.pinnedCard} onClick={() => handleOpenChat(g)}>
                                                <div style={styles.spaceBetween}>
                                                    <div style={styles.pinnedCardIcon}>0{idx + 1}</div>
                                                    <div style={{ color: '#00f3ff', fontSize: '1.4rem' }}>⭐</div>
                                                </div>
                                                <div style={styles.dividerAnimated} />
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '4px' }}>{g.name}</h3>
                                                    <p style={{ fontSize: '0.75rem', color: '#8a9bb8' }}>{g.description}</p>
                                                </div>
                                                <div style={styles.dividerAnimated} />
                                                <div style={styles.spaceBetween}>
                                                    <span style={{ fontSize: '0.7rem', color: '#00f3ff' }}>Active Stream</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#00f3ff' }}>Open Chat &rarr;</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Filterable Group List */}
                                <div>
                                    <div style={styles.groupTabs}>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            {['all', 'joined', 'created', 'available'].map((type) => (
                                                <button 
                                                    key={type} 
                                                    style={{ ...styles.tabBtn, ...(tabFilter === type ? styles.tabBtnActive : {}) }}
                                                    onClick={() => setTabFilter(type)}
                                                >
                                                    {type.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                                        {filteredGroups.map(g => (
                                            <div key={g.id} style={styles.groupItem} onClick={() => handleOpenChat(g)}>
                                                <div style={styles.flexRow}>
                                                    <div 
                                                        style={styles.groupAvatar} 
                                                        onClick={(e) => { e.stopPropagation(); setCurrentGroup(g); setActiveModal('groupAbout'); }}
                                                    >
                                                        {g.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 style={{ fontSize: '0.92rem', color: '#fff' }}>
                                                            {g.name} {g.is_big_three && <span style={{ color: '#00f3ff' }}>⭐</span>}
                                                        </h4>
                                                        <p style={{ fontSize: '0.78rem', color: '#8a9bb8' }}>{g.description}</p>
                                                    </div>
                                                </div>

                                                <div style={styles.flexRow}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                        <span style={{ fontSize: '0.72rem', color: '#8a9bb8' }}>
                                                            {new Date(g.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {unreadCounts[g.id] > 0 && <span style={styles.unreadBadge}>{unreadCounts[g.id]}</span>}
                                                    </div>
                                                    <div 
                                                        style={{ color: '#8a9bb8', cursor: 'pointer', padding: '6px' }} 
                                                        onClick={(e) => { e.stopPropagation(); setCurrentGroup(g); setActiveModal('groupAbout'); }}
                                                    >
                                                        &bull;&bull;&bull;
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* VIEW 2: PROFILE VIEW */}
                        {view === 'userHub' && (
                            <div style={styles.viewSection}>
                                <div style={styles.sectionTitle}>PROFILE</div>
                                <div style={{ ...styles.cardPanel, ...styles.spaceBetween }}>
                                    <div style={styles.flexRow}>
                                        <div style={{ ...styles.avatar, width: '70px', height: '70px' }}>
                                            <img src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="User" style={styles.avatarImg} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.3rem', color: '#fff' }}>{profile.username}</h3>
                                            <p style={{ fontSize: '0.85rem', color: '#8a9bb8' }}>{profile.status_message}</p>
                                        </div>
                                    </div>
                                    <button style={styles.filterBtn} onClick={() => setActiveModal('editProfile')}>Edit Profile</button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
                                    <div style={styles.pinnedCard} onClick={() => { setTabFilter('joined'); setView('chats'); }}>
                                        <h3>Active Groups</h3>
                                        <p>Groups you have Joined</p>
                                        <div style={{ ...styles.spaceBetween, marginTop: '12px', fontSize: '0.7rem', color: '#00f3ff' }}>
                                            <span>{groups.filter(g => g.creator_id === currentUser?.id).length}</span>
                                            <span>Open Channels &rarr;</span>
                                        </div>
                                    </div>
                                    <div style={styles.pinnedCard} onClick={() => { setTabFilter('created'); setView('chats'); }}>
                                        <h3>My Groups</h3>
                                        <p>Groups created by you</p>
                                        <div style={{ ...styles.spaceBetween, marginTop: '12px', fontSize: '0.7rem', color: '#00f3ff' }}>
                                            <span>{groups.filter(g => g.creator_id === currentUser?.id).length}</span>
                                            <span>Manage Hubs &rarr;</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* VIEW 3: NOTIFICATIONS VIEW */}
                        {view === 'predictions' && (
                            <div style={styles.viewSection}>
                                <div style={styles.sectionTitle}>NOTIFICATIONS</div>
                                <div style={styles.cardPanel}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {notifications.map(n => (
                                            <div key={n.id} style={styles.notifCard}>
                                                <div style={styles.flexRow}>
                                                    <div style={styles.notifIcon}>🔔</div>
                                                    <div>
                                                        <h4 style={{ fontSize: '0.88rem', color: '#fff' }}>{n.title}</h4>
                                                        <p style={{ fontSize: '0.75rem', color: '#8a9bb8' }}>{n.message}</p>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.68rem', color: '#00f3ff' }}>{n.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Bottom Floating Navigation Dock */}
                    <nav style={styles.bottomDock}>
                        <button style={{ ...styles.dockItem, ...(view === 'chats' ? styles.dockItemActive : {}) }} onClick={() => setView('chats')}>
                            <svg style={styles.dockSvg} viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            <span style={{ fontSize: '0.65rem' }}>Chats</span>
                        </button>
                        <button style={{ ...styles.dockItem, ...(view === 'predictions' ? styles.dockItemActive : {}) }} onClick={() => setView('predictions')}>
                            <svg style={styles.dockSvg} viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                            <span style={{ fontSize: '0.65rem' }}>Notifications</span>
                        </button>
                        <button style={styles.dockCenterBtn} onClick={() => setActiveModal('createGroup')}>
                            <svg style={styles.dockSvg} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        </button>
                        <button style={styles.dockItem} onClick={() => setActiveModal('deleteRequest')}>
                            <div style={styles.dockDot} />
                            <svg style={styles.dockSvg} viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                            <span style={{ fontSize: '0.65rem' }}>Approval</span>
                        </button>
                        <button style={{ ...styles.dockItem, ...(view === 'userHub' ? styles.dockItemActive : {}) }} onClick={() => setView('userHub')}>
                            <svg style={styles.dockSvg} viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            <span style={{ fontSize: '0.65rem' }}>Profile</span>
                        </button>
                    </nav>

                </main>
            </div>

            {/* --- MODALS OVERLAYS --- */}

            {/* MODAL 1: FULLSCREEN CHAT */}
            {activeModal === 'chatRoom' && currentGroup && (
                <div style={{ ...styles.overlayScreen, padding: 0 }}>
                    <div style={styles.chatRoomContainer}>
                        <div style={styles.chatHeader}>
                            <div style={styles.flexRow} onClick={() => setActiveModal('groupAbout')}>
                                <div style={styles.avatar}>{currentGroup.name.substring(0, 2).toUpperCase()}</div>
                                <div>
                                    <h4 style={{ color: '#fff', fontSize: '1rem' }}>{currentGroup.name}</h4>
                                    <p style={{ fontSize: '0.72rem', color: '#8a9bb8' }}>Active Decoupled Stream</p>
                                </div>
                            </div>
                            <div style={styles.flexRow}>
                                <svg style={styles.actionSvg} viewBox="0 0 24 24" onClick={() => setActiveModal('groupAbout')}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                <svg style={styles.actionSvg} viewBox="0 0 24 24" onClick={() => setActiveModal(null)}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </div>
                        </div>

                        <div style={styles.chatMessageArea}>
                            {messages.map(m => {
                                const isOwn = m.sender_id === currentUser?.id;
                                return (
                                    <div key={m.id} style={{ ...styles.msgBubble, ...(isOwn ? styles.msgOutgoing : styles.msgIncoming) }}>
                                        <div style={{ fontSize: '0.75rem', color: '#00f3ff', fontWeight: 700, marginBottom: '4px' }}>
                                            {m.profiles?.username || (isOwn ? 'Anthony' : 'Member')}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#fff' }}>{renderMediaContent(m.content)}</div>
                                        <div style={{ ...styles.spaceBetween, marginTop: '6px', fontSize: '0.65rem', color: '#8a9bb8' }}>
                                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {isOwn && (
                                                <span style={{ cursor: 'pointer', color: '#ff007f' }} onClick={() => handleDeleteMessage(m.id)}>Delete</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        <div style={styles.chatInputBar}>
                            <label style={styles.mediaBtn} title="Upload Image/Media">
                                +
                                <input type="file" style={{ display: 'none' }} accept="image/*,video/*" onChange={handleFileUpload} />
                            </label>
                            <input 
                                type="text" 
                                style={styles.chatTextInput} 
                                placeholder="Type message or media link..."
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button style={styles.sendBtn} onClick={() => handleSendMessage()}>SEND</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: ABOUT PAGE */}
            {activeModal === 'appAbout' && (
                <div style={styles.overlayScreen}>
                    <div style={styles.modalBox}>
                        <div style={styles.modalHeader}>
                            <h3>MTL FOOTBALL HUB</h3>
                            <button style={styles.closeDismissBtn} onClick={() => setActiveModal(null)}>&times;</button>
                        </div>
                        <div style={{ ...styles.modalBody, alignItems: 'center', textAlign: 'center' }}>
                            <div style={styles.groupAvatar}>⚡</div>
                            <h3 style={{ color: '#fff', fontSize: '1.2rem' }}>decentralized Communication Engine</h3>
                            <p style={{ fontSize: '0.85rem', color: '#8a9bb8' }}>Built with state-sync react capabilities.</p>
                            <button style={styles.primaryBtn} onClick={() => setActiveModal(null)}>CLOSE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: GROUP ABOUT */}
            {activeModal === 'groupAbout' && currentGroup && (
                <div style={styles.overlayScreen}>
                    <div style={styles.modalBox}>
                        <div style={styles.modalHeader}>
                            <h3>ABOUT CHANNEL</h3>
                            <button style={styles.closeDismissBtn} onClick={() => setActiveModal(null)}>&times;</button>
                        </div>
                        <div style={{ ...styles.modalBody, alignItems: 'center', textAlign: 'center' }}>
                            <div style={styles.groupAvatar}>{currentGroup.name.substring(0, 2).toUpperCase()}</div>
                            <h3 style={{ color: '#fff', fontSize: '1.2rem' }}>{currentGroup.name}</h3>
                            <p style={{ fontSize: '0.85rem', color: '#8a9bb8' }}>{currentGroup.description}</p>
                            <button style={styles.primaryBtn} onClick={() => setActiveModal(null)}>CLOSE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 4: CREATE GROUP */}
            {activeModal === 'createGroup' && (
                <div style={styles.overlayScreen}>
                    <div style={styles.modalBox}>
                        <div style={styles.modalHeader}>
                            <h3>CREATE NEW HUB</h3>
                            <button style={styles.closeDismissBtn} onClick={() => setActiveModal(null)}>&times;</button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Group Name</label>
                                <input type="text" style={styles.input} value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Enter hub designation" />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Description</label>
                                <textarea style={styles.input} value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="What is this group about?" rows="2" />
                            </div>
                            <button style={styles.primaryBtn} onClick={handleCreateGroup}>CREATE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 5: EDIT PROFILE */}
            {activeModal === 'editProfile' && (
                <div style={styles.overlayScreen}>
                    <div style={styles.modalBox}>
                        <div style={styles.modalHeader}>
                            <h3>EDIT USER IDENTITY</h3>
                            <button style={styles.closeDismissBtn} onClick={() => setActiveModal(null)}>&times;</button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Username</label>
                                <input type="text" style={styles.input} value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Status Message</label>
                                <input type="text" style={styles.input} value={editStatus} onChange={(e) => setEditStatus(e.target.value)} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Avatar Image Link</label>
                                <input type="text" style={styles.input} value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} />
                            </div>
                            <button style={styles.primaryBtn} onClick={handleSaveProfile}>SAVE</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// --- Dynamic Responsive CSS-in-JS Style Definitions ---
const styles = {
    appWrapper: {
        backgroundColor: '#020308',
        color: '#f0f4ff',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
    },
    spaceCanvas: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none'
    },
    viewportFrame: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 2,
        pointerEvents: 'none',
        boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.9), inset 0 0 40px rgba(0, 243, 255, 0.15)',
        background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(2, 5, 15, 0.7) 85%, rgba(1, 2, 6, 0.95) 100%)'
    },
    appContainer: {
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        maxWidth: '1440px',
        position: 'relative',
        zIndex: 5,
        background: 'rgba(5, 8, 20, 0.1)',
        backdropFilter: 'blur(3px)'
    },
    workspace: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative'
    },
    sideNavDrawer: {
        position: 'absolute',
        top: '70px',
        left: '-320px',
        width: '300px',
        height: 'calc(100% - 70px)',
        background: 'rgba(8, 13, 30, 0.95)',
        borderRight: '1px solid rgba(0, 243, 255, 0.2)',
        backdropFilter: 'blur(20px)',
        zIndex: 90,
        transition: 'left 0.3s ease',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    sideNavDrawerOpen: {
        left: 0
    },
    sideNavItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 16px',
        borderRadius: '12px',
        color: '#8a9bb8',
        border: '1px solid transparent',
        background: 'rgba(255,255,255,0.02)',
        cursor: 'pointer'
    },
    sideNavItemActive: {
        color: '#00f3ff',
        borderColor: 'rgba(0, 243, 255, 0.3)',
        background: 'rgba(0, 243, 255, 0.08)'
    },
    topHeader: {
        height: '70px',
        borderBottom: '1px solid rgba(0, 243, 255, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(5, 8, 20, 0.65)',
        backdropFilter: 'blur(15px)',
        zIndex: 95
    },
    flexRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    spaceBetween: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    iconActionBtn: {
        background: 'rgba(12, 19, 41, 0.8)',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#f0f4ff'
    },
    brandLogo: {
        width: '36px',
        height: '36px'
    },
    brandTitle: {
        fontSize: '1.1rem',
        fontWeight: '700',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        background: 'linear-gradient(90deg, #fff, #00f3ff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
    },
    avatar: {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #00f3ff, #b000ff)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        border: '1px solid #00f3ff',
        cursor: 'pointer'
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
    actionBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px 10px 20px',
        gap: '12px',
        flexWrap: 'wrap'
    },
    searchBox: {
        position: 'relative',
        flex: 1,
        minWidth: '200px'
    },
    searchInput: {
        width: '100%',
        background: 'rgba(12, 19, 41, 0.8)',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        borderRadius: '20px',
        padding: '10px 16px 10px 40px',
        color: '#f0f4ff',
        fontSize: '0.85rem',
        outline: 'none'
    },
    searchIcon: {
        position: 'absolute',
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '16px',
        height: '16px',
        stroke: '#8a9bb8',
        fill: 'none',
        strokeWidth: 2
    },
    filterBtn: {
        background: 'rgba(12, 19, 41, 0.8)',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        color: '#f0f4ff',
        padding: '9px 18px',
        borderRadius: '20px',
        fontSize: '0.85rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    createBtn: {
        background: 'linear-gradient(135deg, #2260ff, #b000ff)',
        border: 'none',
        color: '#fff',
        padding: '9px 18px',
        borderRadius: '20px',
        fontWeight: '600',
        fontSize: '0.85rem',
        cursor: 'pointer'
    },
    errorBanner: {
        background: 'linear-gradient(135deg, rgba(255, 0, 127, 0.15), rgba(40, 10, 25, 0.85))',
        border: '1px solid #ff007f',
        borderRadius: '14px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
    },
    errorIconBox: {
        width: '32px',
        height: '32px',
        background: 'rgba(255, 0, 127, 0.2)',
        border: '1px solid #ff007f',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ff007f',
        fontWeight: 'bold'
    },
    mainContent: {
        flex: 1,
        overflowY: 'auto',
        padding: '10px 20px 100px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    viewSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'fadeIn 0.3s ease forwards'
    },
    sectionTitle: {
        fontSize: '0.82rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: '#00f3ff',
        marginBottom: '10px'
    },
    pinnedGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px'
    },
    pinnedCard: {
        background: 'linear-gradient(135deg, rgba(18, 27, 56, 0.9), rgba(11, 17, 38, 0.95))',
        border: '1px solid rgba(176, 0, 255, 0.3)',
        borderRadius: '16px',
        padding: '18px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    },
    pinnedCardIcon: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: 'rgba(0, 243, 255, 0.1)',
        border: '1px solid #00f3ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#00f3ff',
        fontWeight: 'bold'
    },
    dividerAnimated: {
        height: '1px',
        width: '100%',
        background: 'linear-gradient(90deg, transparent, #00f3ff, #b000ff, transparent)'
    },
    groupTabs: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '12px',
        overflowX: 'auto'
    },
    tabBtn: {
        background: 'rgba(12, 19, 41, 0.85)',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        borderRadius: '12px',
        color: '#8a9bb8',
        fontSize: '0.78rem',
        fontWeight: '600',
        padding: '8px 16px',
        cursor: 'pointer'
    },
    tabBtnActive: {
        color: '#00f3ff',
        borderColor: '#00f3ff',
        boxShadow: '0 0 15px rgba(0, 243, 255, 0.3)'
    },
    groupItem: {
        background: 'rgba(12, 19, 41, 0.6)',
        border: '1px solid rgba(0, 243, 255, 0.12)',
        borderRadius: '14px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer'
    },
    groupAvatar: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #00f3ff, #b000ff, #020308)',
        border: '2px solid #00f3ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '800',
        color: '#fff',
        flexShrink: 0
    },
    unreadBadge: {
        background: '#ff007f',
        color: '#fff',
        fontSize: '0.68rem',
        fontWeight: 'bold',
        padding: '2px 6px',
        borderRadius: '10px'
    },
    cardPanel: {
        background: 'rgba(12,19,41,0.7)',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        borderRadius: '16px',
        padding: '20px'
    },
    notifCard: {
        background: 'rgba(12, 19, 41, 0.7)',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        borderRadius: '14px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    notifIcon: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'rgba(0, 243, 255, 0.1)',
        border: '1px solid #00f3ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    bottomDock: {
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(11, 17, 38, 0.92)',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        borderRadius: '40px',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '28px',
        backdropFilter: 'blur(20px)',
        zIndex: 10
    },
    dockItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        color: '#8a9bb8',
        background: 'none',
        border: 'none',
        position: 'relative'
    },
    dockItemActive: {
        color: '#00f3ff'
    },
    dockSvg: {
        width: '20px',
        height: '20px',
        stroke: 'currentColor',
        fill: 'none',
        strokeWidth: 2
    },
    dockCenterBtn: {
        width: '48px',
        height: '48px',
        background: 'radial-gradient(circle, rgba(176,0,255,0.9) 0%, rgba(34,96,255,0.5) 100%)',
        border: '1px solid #00f3ff',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '-12px',
        color: '#00f3ff',
        cursor: 'pointer'
    },
    dockDot: {
        position: 'absolute',
        top: 0,
        right: '2px',
        width: '6px',
        height: '6px',
        background: '#ff007f',
        borderRadius: '50%'
    },
    overlayScreen: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(2, 4, 10, 0.85)',
        backdropFilter: 'blur(16px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
    },
    modalBox: {
        background: 'rgba(11, 17, 38, 0.95)',
        border: '1px solid #00f3ff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '90vh',
        overflowY: 'auto'
    },
    modalHeader: {
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#fff'
    },
    modalBody: {
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    closeDismissBtn: {
        background: 'none',
        border: 'none',
        color: '#8a9bb8',
        fontSize: '1.8rem',
        cursor: 'pointer'
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    label: {
        fontSize: '0.8rem',
        color: '#8a9bb8'
    },
    input: {
        background: 'rgba(5, 8, 20, 0.8)',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        borderRadius: '10px',
        padding: '10px 14px',
        color: '#fff',
        outline: 'none'
    },
    primaryBtn: {
        background: 'linear-gradient(135deg, #2260ff, #b000ff)',
        border: 'none',
        color: '#fff',
        fontWeight: '600',
        padding: '12px',
        borderRadius: '10px',
        cursor: 'pointer',
        width: '100%'
    },
    chatRoomContainer: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(8, 12, 28, 0.98)',
        width: '100vw',
        height: '100vh'
    },
    chatHeader: {
        padding: '16px 20px',
        background: 'rgba(12, 19, 41, 0.95)',
        borderBottom: '1px solid rgba(0, 243, 255, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    actionSvg: {
        width: '20px',
        height: '20px',
        cursor: 'pointer',
        stroke: '#8a9bb8',
        fill: 'none',
        strokeWidth: 2
    },
    chatMessageArea: {
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
    },
    msgBubble: {
        maxWidth: '80%',
        borderRadius: '14px',
        padding: '10px 16px',
        position: 'relative'
    },
    msgIncoming: {
        alignSelf: 'flex-start',
        background: 'rgba(25, 96, 34, 0.2)',
        border: '1px solid rgba(25, 243, 0, 0.2)'
    },
    msgOutgoing: {
        alignSelf: 'flex-end',
        background: 'rgba(34, 96, 255, 0.2)',
        border: '1px solid rgba(0, 243, 255, 0.2)'
    },
    chatInputBar: {
        padding: '14px 20px',
        background: 'rgba(12, 19, 41, 0.95)',
        borderTop: '1px solid rgba(0, 243, 255, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    mediaBtn: {
        background: 'rgba(5, 8, 20, 0.8)',
        border: '1px solid #00f3ff',
        color: '#00f3ff',
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '1.2rem'
    },
    chatTextInput: {
        flex: 1,
        background: 'rgba(5, 8, 20, 0.8)',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        borderRadius: '20px',
        padding: '10px 18px',
        color: '#fff',
        outline: 'none'
    },
    sendBtn: {
        background: '#00f3ff',
        border: 'none',
        color: '#020308',
        fontWeight: 'bold',
        cursor: 'pointer',
        padding: '10px 16px',
        borderRadius: '20px'
    },
    chatMediaPreview: {
        maxWidth: '100%',
        maxHeight: '180px',
        borderRadius: '8px',
        marginTop: '6px',
        border: '1px solid rgba(0, 243, 255, 0.25)'
    }
};
