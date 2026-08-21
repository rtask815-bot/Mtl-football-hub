import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

/* ============================================================
   SUPABASE CONFIGURATION & CLIENT INIT
   ============================================================ */
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================
   LOCAL STORAGE HYBRID CACHING SYSTEM (SPEED ENGINE)
   ============================================================ */
const LocalStore = {
    get: (key) => {
        try {
            const d = localStorage.getItem('mtl_hub_' + key);
            return d ? JSON.parse(d) : null;
        } catch(e) { return null; }
    },
    set: (key, val) => {
        try {
            localStorage.setItem('mtl_hub_' + key, JSON.stringify(val));
        } catch(e) {}
    }
};

export default function GroupChat() {
    // State Management
    const [sideNavOpen, setSideNavOpen] = useState(false);
    const [currentView, setCurrentView] = useState('chats'); // 'chats', 'userHub', 'predictions'
    const [activeDockItem, setActiveDockItem] = useState('chats');
    
    // Data States
    const [currentUser, setCurrentUser] = useState(null);
    const [currentProfile, setCurrentProfile] = useState(null);
    const [groupsData, setGroupsData] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [currentTabFilter, setCurrentTabFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Chat Room States
    const [currentOpenGroup, setCurrentOpenGroup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatInputText, setChatInputText] = useState('');
    
    // Error Banner State
    const [errorBanner, setErrorBanner] = useState({ active: false, title: '', message: '' });
    
    // Local Notifications & Modals
    const [notifications, setNotifications] = useState([]);
    const [activeModal, setActiveModal] = useState(null); // 'createGroup', 'deleteRequest', 'editProfile', 'appHubAbout', 'groupAbout', 'chatRoom'
    const [selectedGroupAbout, setSelectedGroupAbout] = useState(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [groupPrivacyType, setGroupPrivacyType] = useState('Public');
    
    // Edit Profile States
    const [editName, setEditName] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [editAvatar, setEditAvatar] = useState('');

    // Refs
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const chatMessagesEndRef = useRef(null);

    /* ============================================================
       SPACESHIP VIEWPORT FLIGHT SIMULATOR (3D PERSPECTIVE STARFIELD)
       ============================================================ */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { alpha: false });

        let animationFrameId;
        let W = window.innerWidth;
        let H = window.innerHeight;
        const FOV = 350;
        const shipSpeed = 16;

        const handleResize = () => {
            if (!canvasRef.current) return;
            W = window.innerWidth;
            H = window.innerHeight;
            canvasRef.current.width = W;
            canvasRef.current.height = H;
        };
        window.addEventListener("resize", handleResize);
        handleResize();

        let mouseX = 0;
        let mouseY = 0;
        let targetOffsetX = 0;
        let targetOffsetY = 0;
        let currentOffsetX = 0;
        let currentOffsetY = 0;

        const handleMouseMove = (e) => {
            mouseX = (e.clientX - W / 2) / (W / 2);
            mouseY = (e.clientY - H / 2) / (H / 2);
            targetOffsetX = -mouseX * 120;
            targetOffsetY = -mouseY * 80;
        };
        window.addEventListener("mousemove", handleMouseMove);

        const NUM_STARS = 1000;
        const stars3D = Array.from({ length: NUM_STARS }, () => ({
            x: (Math.random() - 0.5) * 3000,
            y: (Math.random() - 0.5) * 3000,
            z: Math.random() * 2000 + 10,
            size: Math.random() * 1.5 + 0.5,
            color: Math.random() > 0.8 ? '#8edcff' : (Math.random() > 0.9 ? '#ffb366' : '#ffffff')
        }));

        const spacePlanets = [
            { x: -600, y: -200, z: 1800, r: 160, color1: '#2255aa', color2: '#0b1d3a', atmosphere: '#00e2ff' },
            { x: 800, y: 350, z: 2800, r: 240, color1: '#aa4422', color2: '#3d1205', atmosphere: '#ff7733' }
        ];

        const nebulae = Array.from({ length: 6 }, () => ({
            x: (Math.random() - 0.5) * 2000,
            y: (Math.random() - 0.5) * 2000,
            z: Math.random() * 2500 + 500,
            radius: Math.random() * 400 + 300,
            color: Math.random() > 0.5 ? 'rgba(0, 243, 255, ' : 'rgba(176, 0, 255, '
        }));

        const drawSpaceFlight = () => {
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

            for (let p of spacePlanets) {
                p.z -= shipSpeed * 0.5;
                if (p.z <= -200) {
                    p.z = 3500;
                    p.x = (Math.random() - 0.5) * 2000;
                    p.y = (Math.random() - 0.5) * 1200;
                }
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
                    let size = (1 - s.z / 2000) * s.size * 2.5;
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
            animationFrameId = requestAnimationFrame(drawSpaceFlight);
        };

        animationFrameId = requestAnimationFrame(drawSpaceFlight);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    /* ============================================================
       INITIALIZATION & DATA FETCHING
       ============================================================ */
    useEffect(() => {
        loadCachedState();
        verifySessionAndInitialize();
        loadLocalNotifications();
    }, []);

    const loadCachedState = () => {
        const cachedProfile = LocalStore.get('profile');
        if (cachedProfile) {
            setCurrentProfile(cachedProfile);
            setEditName(cachedProfile.username || '');
            setEditStatus(cachedProfile.status_message || '');
            setEditAvatar(cachedProfile.avatar_url || '');
        } else {
            const defaultProf = {
                id: 'anthony-user-id',
                username: 'Anthony',
                avatar_url: '',
                status_message: 'Connected to Mtl Football Hub',
                is_global_admin: true
            };
            setCurrentProfile(defaultProf);
            setEditName(defaultProf.username);
            setEditStatus(defaultProf.status_message);
        }

        const cachedGroups = LocalStore.get('groups');
        if (cachedGroups && Array.isArray(cachedGroups)) {
            setGroupsData(cachedGroups);
        }

        const cachedUnread = LocalStore.get('unread');
        if (cachedUnread) setUnreadCounts(cachedUnread);
    };

    const loadLocalNotifications = () => {
        const notifs = LocalStore.get('notifications') || [
            { id: 1, title: 'Welcome to MTL Hub', message: 'Connected to orbital node.', time: 'Just Now' }
        ];
        setNotifications(notifs);
    };

    const addLocalNotification = (title, message) => {
        const updated = [{
            id: Date.now(),
            title,
            message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }, ...notifications];
        setNotifications(updated);
        LocalStore.set('notifications', updated);
    };

    const verifySessionAndInitialize = async () => {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                setCurrentUser(session.user);
                await fetchOrCreateProfile(session.user.id);
                await fetchGroups();
                setupRealtimeSubscriptions();
            } else {
                const fallbackUser = { id: 'anthony-user-id', email: 'user@mtlhub.com' };
                setCurrentUser(fallbackUser);
                await fetchOrCreateProfile(fallbackUser.id);
                await fetchGroups();
            }
        } catch (err) {
            setErrorBanner({ active: true, title: "Authentication Verification", message: "Running in local resilient mode." });
        }
    };

    const fetchOrCreateProfile = async (userId) => {
        let { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!profile) {
            const { data: newProfile } = await supabaseClient
                .from('profiles')
                .insert([{ id: userId, username: 'Anthony' }])
                .select()
                .single();
            
            profile = newProfile || {
                id: userId,
                username: 'Anthony',
                avatar_url: '',
                status_message: 'Connected to Mtl Football Hub',
                is_global_admin: true
            };
        }
        setCurrentProfile(profile);
        LocalStore.set('profile', profile);
    };

    const fetchGroups = async () => {
        const { data, error } = await supabaseClient
            .from('chat_groups')
            .select(`*, group_members (user_id, role, is_suspended, suspended_until)`)
            .order('created_at', { ascending: false });

        let finalGroups = data;
        if (error || !data || data.length === 0) {
            finalGroups = [
                { id: '1', name: 'Montreal Football HQ', description: 'Main hub for Anthony & Montreal FC lovers.', is_big_three: true, is_approved: true, created_at: new Date().toISOString(), creator_id: currentUser?.id || 'anthony-user-id' },
                { id: '2', name: 'Tactics & Analytics', description: 'Deep strategy breakdowns and match stats.', is_big_three: true, is_approved: true, created_at: new Date().toISOString(), creator_id: 'other' },
                { id: '3', name: 'Champions League Chat', description: 'European matchday discussions.', is_big_three: true, is_approved: true, created_at: new Date().toISOString(), creator_id: 'other' }
            ];
        }
        setGroupsData(finalGroups);
        LocalStore.set('groups', finalGroups);
    };

    const setupRealtimeSubscriptions = () => {
        supabaseClient
            .channel('public-db-changes')
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
                        addLocalNotification("New Message Received", `Incoming update in group ID ${gId}`);
                    }
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_groups' }, () => {
                fetchGroups();
            })
            .subscribe();
    };

    /* ============================================================
       CHAT & MESSAGING LOGIC
       ============================================================ */
    const openChatRoom = async (groupId) => {
        const group = groupsData.find(g => g.id === groupId);
        if (!group) return;
        setCurrentOpenGroup(group);

        setUnreadCounts(prev => {
            const updated = { ...prev, [groupId]: 0 };
            LocalStore.set('unread', updated);
            return updated;
        });

        await fetchMessages(groupId);
        setActiveModal('chatRoomModal');
    };

    const fetchMessages = async (groupId) => {
        const localKey = 'messages_' + groupId;
        const cachedMsgs = LocalStore.get(localKey);
        if (cachedMsgs) setMessages(cachedMsgs);

        const { data: fetchedMsgs } = await supabaseClient
            .from('messages')
            .select(`*, profiles:sender_id (username, avatar_url)`)
            .eq('group_id', groupId)
            .order('created_at', { ascending: true });

        if (fetchedMsgs && fetchedMsgs.length > 0) {
            setMessages(fetchedMsgs);
            LocalStore.set(localKey, fetchedMsgs);
        } else if (!cachedMsgs) {
            const fallbackMsgs = [
                { id: 'm1', sender_id: currentUser?.id || 'anthony-user-id', content: 'Welcome to the full screen hub chat!', created_at: new Date().toISOString() },
                { id: 'm2', sender_id: 'bot', content: 'You can now share photos, videos, and GIFs here.', created_at: new Date().toISOString() }
            ];
            setMessages(fallbackMsgs);
            LocalStore.set(localKey, fallbackMsgs);
        }
    };

    useEffect(() => {
        if (activeModal === 'chatRoomModal') {
            chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeModal]);

    const sendChatMessage = async () => {
        if (!chatInputText.trim() || !currentOpenGroup) return;
        await sendContent(chatInputText.trim());
        setChatInputText('');
    };

    const sendContent = async (content) => {
        const localKey = 'messages_' + currentOpenGroup.id;
        const newMsg = {
            id: 'local_' + Date.now(),
            group_id: currentOpenGroup.id,
            sender_id: currentUser?.id || 'anthony-user-id',
            content,
            created_at: new Date().toISOString()
        };

        const updated = [...messages, newMsg];
        setMessages(updated);
        LocalStore.set(localKey, updated);

        await supabaseClient.from('messages').insert([{
            group_id: currentOpenGroup.id,
            sender_id: currentUser?.id || 'anthony-user-id',
            content,
            message_type: 'text'
        }]);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                sendContent(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const deleteMessage = async (msgId) => {
        const localKey = 'messages_' + currentOpenGroup.id;
        const updated = messages.filter(m => m.id !== msgId);
        setMessages(updated);
        LocalStore.set(localKey, updated);

        await supabaseClient.from('messages').delete().eq('id', msgId);
    };

    const editMessage = async (msgId, oldContent) => {
        const newText = prompt("Edit message content:", decodeURIComponent(oldContent));
        if (newText !== null && newText.trim() !== "") {
            const localKey = 'messages_' + currentOpenGroup.id;
            const updated = messages.map(m => m.id === msgId ? { ...m, content: newText.trim() } : m);
            setMessages(updated);
            LocalStore.set(localKey, updated);

            await supabaseClient.from('messages').update({ content: newText.trim(), is_edited: true }).eq('id', msgId);
        }
    };

    /* ============================================================
       PROFILE & GROUP ACTIONS
       ============================================================ */
    const saveProfileChanges = async () => {
        const updatedProf = {
            ...currentProfile,
            username: editName.trim() || 'Anthony',
            status_message: editStatus.trim(),
            avatar_url: editAvatar.trim()
        };
        setCurrentProfile(updatedProf);
        LocalStore.set('profile', updatedProf);
        setActiveModal(null);

        if (currentUser) {
            await supabaseClient.from('profiles').update({
                username: updatedProf.username,
                status_message: updatedProf.status_message,
                avatar_url: updatedProf.avatar_url
            }).eq('id', currentUser.id);
        }
    };

    const createNewGroupSubmit = () => {
        if (!newGroupName.trim()) return;
        const newGroupObj = {
            id: 'grp_' + Date.now(),
            name: newGroupName.trim(),
            description: newGroupDesc.trim() || 'New Football Hub Group',
            is_approved: true,
            created_at: new Date().toISOString(),
            creator_id: currentUser?.id || 'anthony-user-id'
        };

        const updated = [newGroupObj, ...groupsData];
        setGroupsData(updated);
        LocalStore.set('groups', updated);
        setActiveModal(null);
        setNewGroupName('');
        setNewGroupDesc('');
        addLocalNotification("Group Created", `Group ${newGroupObj.name} was created successfully.`);
    };

    const handleSignOut = () => {
        localStorage.clear();
        window.location.reload();
    };

    // Filter Logic
    const filteredGroups = groupsData.filter(g => {
        const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()));
        if (!matchesSearch) return false;

        const userId = currentUser?.id || 'anthony-user-id';
        const isJoined = g.group_members ? g.group_members.some(m => m.user_id === userId) : true;

        if (currentTabFilter === 'joined') return isJoined;
        if (currentTabFilter === 'created') return g.creator_id === userId;
        if (currentTabFilter === 'available') return g.is_approved && !isJoined;
        return true;
    });

    const bigThreeGroups = groupsData.filter(g => g.is_big_three && (g.is_approved || g.creator_id === (currentUser?.id || 'anthony-user-id')));
    const joinedCount = groupsData.filter(g => !g.group_members || g.group_members.some(m => m.user_id === (currentUser?.id || 'anthony-user-id'))).length;
    const createdCount = groupsData.filter(g => g.creator_id === (currentUser?.id || 'anthony-user-id')).length;

    const avatarSrc = currentProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

    return (
        <div style={{
            backgroundColor: '#020308',
            color: '#f0f4ff',
            height: '100vh',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
        }}>
            {/* Inline CSS Rules for custom styling & animations */}
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
                * { box-sizing: border-box; margin: 0; padding: 0; }
                #spaceCanvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; }
                .viewport-frame {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2; pointer-events: none;
                    box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.9), inset 0 0 40px rgba(0, 243, 255, 0.15);
                    background: radial-gradient(circle at 50% 50%, transparent 60%, rgba(2, 5, 15, 0.7) 85%, rgba(1, 2, 6, 0.95) 100%),
                                linear-gradient(180deg, rgba(0,243,255,0.03) 0%, transparent 5%, transparent 95%, rgba(0,243,255,0.03) 100%);
                }
                .viewport-frame::before {
                    content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
                    background-size: 100% 4px; opacity: 0.3; z-index: 3;
                }
                .app-container { display: flex; flex-direction: column; width: 100vw; height: 100vh; max-width: 1440px; position: relative; z-index: 5; background: rgba(5, 8, 20, 0.1); backdrop-filter: blur(3px); }
                .workspace { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; position: relative; }
                .side-nav-drawer {
                    position: absolute; top: 80px; left: -320px; width: 300px; height: 100%;
                    background: rgba(8, 13, 30, 0.95); border-right: 1px solid transparent; backdrop-filter: blur(20px);
                    z-index: 90; transition: left 0.4s cubic-bezier(0.16, 1, 0.3, 1); padding: 80px 24px 24px 24px;
                    display: flex; flex-direction: column; gap: 20px; box-shadow: 15px 0 30px rgba(0,0,0,0.8);
                }
                .side-nav-drawer.open { left: 0; }
                .side-nav-item {
                    display: flex; align-items: center; gap: 14px; padding: 12px 16px; border-radius: 12px;
                    color: var(--text-muted); border: 2px solid transparent; background: rgba(255,255,255,0.02);
                    cursor: pointer; transition: all 0.3s;
                }
                .side-nav-item:hover, .side-nav-item.active {
                    color: var(--neon-cyan); border-color: rgba(0, 243, 255, 0.3);
                    background: rgba(0, 243, 255, 0.08); box-shadow: 0 0 15px rgba(0, 243, 255, 0.2);
                }
                .top-header {
                    height: 70px; border-bottom: 1px solid var(--border-glow); display: flex; align-items: center;
                    justify-content: space-between; padding: 0 30px; background: rgba(5, 8, 20, 0.65); backdrop-filter: blur(15px);
                    position: relative; z-index: 95;
                }
                .icon-action-btn {
                    background: rgba(12, 19, 41, 0.8); border: 1px solid var(--border-glow); width: 40px; height: 40px;
                    border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;
                    color: var(--text-main); transition: all 0.3s; box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }
                .icon-action-btn:hover { border-color: var(--neon-cyan); color: var(--neon-cyan); box-shadow: 0 0 15px rgba(0, 243, 255, 0.4); }
                .avatar {
                    width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
                    display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--neon-cyan);
                    box-shadow: 0 0 12px rgba(0, 243, 255, 0.3); cursor: pointer;
                }
                .avatar img { width: 100%; height: 100%; object-fit: cover; }
                .action-bar-section { display: flex; align-items: center; justify-content: space-between; padding: 16px 30px 10px 30px; gap: 16px; }
                .search-box { position: relative; flex: 1; max-width: 420px; }
                .search-box input {
                    width: 100%; background: rgba(12, 19, 41, 0.8); border: 1px solid var(--border-glow); border-radius: 20px;
                    padding: 10px 16px 10px 40px; color: var(--text-main); font-size: 0.85rem; outline: none; transition: all 0.3s;
                }
                .search-box input:focus { border-color: var(--neon-cyan); box-shadow: 0 0 15px rgba(0, 243, 255, 0.3); }
                .search-box svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; stroke: var(--text-muted); fill: none; stroke-width: 2; }
                .action-bar-right { display: flex; align-items: center; gap: 12px; }
                .filter-btn, .create-group-btn {
                    background: rgba(12, 19, 41, 0.8); border: 1px solid var(--border-glow); color: var(--text-main);
                    padding: 9px 18px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s;
                }
                .filter-btn:hover { border-color: var(--neon-cyan); box-shadow: 0 0 12px rgba(0, 243, 255, 0.3); }
                .create-group-btn { background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple)); border: none; color: #fff; font-weight: 600; box-shadow: 0 0 15px rgba(176, 0, 255, 0.5); }
                .create-group-btn:hover { opacity: 0.95; box-shadow: 0 0 25px rgba(176, 0, 255, 0.8); transform: translateY(-1px); }
                .main-content { flex: 1; overflow-y: auto; padding: 10px 30px 100px 30px; display: flex; flex-direction: column; gap: 20px; }
                .view-section { display: none; flex-direction: column; gap: 20px; animation: fadeIn 0.4s ease forwards; }
                .view-section.active { display: flex; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .section-title { font-size: 0.82rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--neon-cyan); margin-bottom: 10px; margin-top: 6px; text-shadow: 0 0 8px rgba(0,243,255,0.4); }
                .pinned-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
                @media (max-width: 900px) { .pinned-grid { grid-template-columns: 1fr; } }
                .pinned-card {
                    background: linear-gradient(135deg, rgba(18, 27, 56, 0.9), rgba(11, 17, 38, 0.95));
                    border: 1px solid rgba(176, 0, 255, 0.3); border-radius: 16px; padding: 18px; cursor: pointer;
                    position: relative; overflow: hidden; transition: all 0.3s ease; box-shadow: 0 4px 20px rgba(0,0,0,0.5); display: flex; flex-direction: column;
                }
                .pinned-card:hover { border-color: var(--neon-cyan); transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0, 243, 255, 0.25); }
                .pinned-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
                .pinned-badge { color: var(--neon-cyan); font-size: 1.4rem; }
                .pinned-card-icon {
                    width: 42px; height: 42px; border-radius: 12px; background: rgba(0, 243, 255, 0.1);
                    border: 1px solid var(--neon-cyan); display: flex; align-items: center; justify-content: center; color: var(--neon-cyan); font-weight: bold;
                }
                .pinned-card-body { flex: 1; display: flex; flex-direction: column; }
                .pinned-card h3 { font-size: 1rem; margin-bottom: 4px; color: #fff; }
                .pinned-card p { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px; }
                .pinned-card-footer { font-size: 0.7rem; color: var(--neon-cyan); display: flex; align-items: center; justify-content: space-between; }
                .section-divider-animated {
                    height: 2px; width: 100%; margin: 10px 0;
                    background: linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-purple), transparent);
                    background-size: 200% 100%; animation: dividerGlow 3s linear infinite;
                }
                @keyframes dividerGlow { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
                .group-tabs { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-top: 10px; }
                .tab-buttons { display: flex; gap: 12px; flex-wrap: wrap; }
                .tab-btn {
                    background: linear-gradient(135deg, rgba(12, 19, 41, 0.85), rgba(8, 14, 30, 0.95));
                    border: 1px solid var(--border-glow); border-radius: 14px; box-shadow: 0 0 15px rgba(0, 243, 255, 0.1);
                    color: var(--text-muted); font-size: 0.82rem; font-weight: 600; cursor: pointer; padding: 8px 16px; height: 38px;
                    transition: all 0.3s ease; display: flex; align-items: center; justify-content: center;
                }
                .tab-btn:hover { border-color: var(--border-glow-active); color: var(--text-main); box-shadow: 0 0 20px rgba(0, 243, 255, 0.2); }
                .tab-btn.active { color: var(--neon-cyan); border-color: var(--neon-cyan); box-shadow: 0 0 20px rgba(0, 243, 255, 0.35); }
                .error-notification-banner {
                    background: linear-gradient(135deg, rgba(255, 0, 127, 0.15), rgba(40, 10, 25, 0.85));
                    border: 1px solid var(--neon-pink); border-radius: 14px; padding: 16px 20px; margin-bottom: 16px;
                    display: flex; align-items: center; justify-content: space-between; box-shadow: 0 0 25px rgba(255, 0, 127, 0.3);
                }
                .group-list { display: flex; flex-direction: column; gap: 10px; }
                .group-item {
                    background: rgba(12, 19, 41, 0.6); border: 1px solid rgba(0, 243, 255, 0.12); border-radius: 14px;
                    padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.25s ease;
                }
                .group-item:hover { background: rgba(18, 27, 56, 0.85); border-color: rgba(0, 243, 255, 0.4); transform: translateX(6px); box-shadow: 0 4px 20px rgba(0, 243, 255, 0.1); }
                .group-item-left { display: flex; align-items: center; gap: 16px; }
                .group-item-avatar {
                    width: 48px !important; height: 48px !important; min-width: 48px !important; min-height: 48px !important;
                    border-radius: 50% !important; background: radial-gradient(circle at 35% 35%, var(--neon-cyan), var(--neon-purple), #020308);
                    display: flex; align-items: center; justify-content: center; border: 2px solid var(--neon-cyan); font-size: 1rem;
                    font-weight: 800; box-shadow: 0 0 15px rgba(0, 243, 255, 0.5), inset 0 2px 6px rgba(255,255,255,0.6);
                    overflow: hidden; flex-shrink: 0; color: #fff;
                }
                .group-item-info h4 { font-size: 0.92rem; color: #fff; margin-bottom: 3px; }
                .group-item-info p { font-size: 0.78rem; color: var(--text-muted); }
                .group-item-right { display: flex; align-items: center; gap: 16px; }
                .group-item-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
                .group-item-time { font-size: 0.72rem; color: var(--text-muted); text-align: right; }
                .unread-badge { background: var(--neon-pink); color: #fff; font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 10px; box-shadow: 0 0 8px var(--neon-pink); display: inline-block; }
                .options-dots { color: var(--text-muted); font-size: 1.2rem; letter-spacing: 2px; padding: 6px; }
                .options-dots:hover { color: var(--neon-cyan); }
                .overlay-screen {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(2, 4, 10, 0.85);
                    backdrop-filter: blur(16px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px;
                }
                .modal-box {
                    background: rgba(11, 17, 38, 0.95); border: 1px solid var(--border-glow-active); border-radius: 20px;
                    width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 0 60px rgba(0, 243, 255, 0.25);
                    display: flex; flex-direction: column;
                }
                .modal-header { padding: 20px 24px; border-bottom: 2px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; }
                .modal-header h3 { font-size: 1.2rem; color: #fff; letter-spacing: 0.05em; text-transform: uppercase; }
                .close-modal-btn { background: none; border: none; color: var(--text-muted); font-size: 2.4rem; cursor: pointer; line-height: 1; }
                .close-modal-btn:hover { color: var(--neon-pink); }
                .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
                .chat-room-container {
                    flex: 1; display: flex; flex-direction: column; background: rgba(8, 12, 28, 0.98); border-radius: 0;
                    border: none; box-shadow: none; overflow: hidden; width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh;
                }
                .chat-room-header { padding: 16px 24px; background: rgba(12, 19, 41, 0.95); border-bottom: 1px solid var(--border-glow); display: flex; align-items: center; justify-content: space-between; }
                .chat-messages-area { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; background: radial-gradient(circle at center, rgba(0,243,255,0.03) 0%, transparent 75%); }
                .message-bubble { max-width: 75%; background: rgba(18, 27, 56, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px 18px; position: relative; }
                .message-bubble.incoming { align-self: flex-start; background: rgba(25, 96, 34, 0.15); border-color: rgba(25, 243, 0, 0.2); }
                .message-bubble.outgoing { align-self: flex-end; background: rgba(34, 96, 255, 0.15); border-color: rgba(0, 243, 255, 0.2); }
                .message-sender { font-size: 0.75rem; color: var(--neon-cyan); margin-bottom: 4px; font-weight: 700; }
                .chat-input-bar { padding: 16px 24px; background: rgba(12, 19, 41, 0.95); border-top: 1px solid var(--border-glow); display: flex; align-items: center; gap: 12px; position: relative; }
                .chat-input-bar input[type="text"] { flex: 1; background: rgba(5, 8, 20, 0.8); border: 1px solid var(--border-glow); border-radius: 20px; padding: 12px 20px; color: #fff; outline: none; font-size: 0.88rem; }
                .chat-input-bar button.send-btn { background: var(--neon-cyan); border: none; color: #020308; font-weight: bold; cursor: pointer; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 0 15px var(--neon-cyan); flex-shrink: 0; }
                .chat-media-preview-attachment { max-width: 280px; max-height: 200px; border-radius: 10px; margin-top: 8px; border: 1px solid var(--border-glow); object-fit: cover; }
                .form-group { display: flex; flex-direction: column; gap: 8px; }
                .form-group label { font-size: 0.8rem; color: var(--text-muted); letter-spacing: 0.05em; }
                .form-group input[type="text"], .form-group textarea, .form-group select { background: rgba(5, 8, 20, 0.8); border: 1px solid var(--border-glow); border-radius: 10px; padding: 12px 16px; color: #fff; font-size: 0.9rem; outline: none; }
                .radio-options { display: flex; flex-direction: column; gap: 10px; }
                .radio-card { background: rgba(12, 19, 41, 0.6); border: 1px solid rgba(0, 243, 255, 0.15); border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
                .radio-card.selected { border-color: var(--neon-cyan); background: rgba(0, 243, 255, 0.08); }
                .primary-action-btn { background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple)); border: none; color: #fff; font-weight: 600; padding: 12px; border-radius: 10px; cursor: pointer; width: 100%; font-size: 0.95rem; box-shadow: 0 0 20px rgba(176, 0, 255, 0.4); }
                .bottom-nav-dock {
                    position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); background: rgba(11, 17, 38, 0.9);
                    border: 1px solid var(--border-glow); border-radius: 40px; padding: 8px 30px; display: flex; align-items: center;
                    gap: 48px; backdrop-filter: blur(20px); z-index: 10; box-shadow: 0 10px 40px rgba(0,0,0,0.8), inset 0 0 15px rgba(0, 243, 255, 0.15);
                }
                .dock-item { display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; color: var(--text-muted); background: none; border: none; transition: all 0.3s; position: relative; }
                .dock-item:hover, .dock-item.active { color: var(--neon-cyan); text-shadow: 0 0 8px var(--neon-cyan); }
                .dock-item.highlighted-center {
                    width: 52px; height: 52px; background: radial-gradient(circle, rgba(176,0,255,0.9) 0%, rgba(34,96,255,0.5) 40%, transparent 100%);
                    border: 1px solid var(--neon-cyan); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: -14px; box-shadow: 0 0 25px rgba(0,243,255,0.6); color: var(--neon-cyan);
                }
                .dock-item svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 2; }
                .dock-item span { font-size: 0.65rem; letter-spacing: 0.05em; }
                .notification-dot-dock { position: absolute; top: 0; right: 4px; width: 6px; height: 6px; background: var(--neon-pink); border-radius: 50%; box-shadow: 0 0 6px var(--neon-pink); }
                .notification-item-card { background: rgba(12, 19, 41, 0.7); border: 1px solid var(--border-glow); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
            `}</style>

            {/* Animated Space Canvas */}
            <canvas ref={canvasRef} id="spaceCanvas"></canvas>
            
            {/* Viewport Glass Overlay */}
            <div className="viewport-frame"></div>

            <div className="app-container">
                <main className="workspace">
                    
                    {/* SIDE NAVIGATION MENU DRAWER */}
                    <div className={`side-nav-drawer ${sideNavOpen ? 'open' : ''}`}>
                        <div className={`side-nav-item ${currentView === 'chats' ? 'active' : ''}`} onClick={() => { setCurrentView('chats'); setSideNavOpen(false); }}>
                            <span>~</span> Group Chats
                        </div>
                        <div className={`side-nav-item ${currentView === 'predictions' ? 'active' : ''}`} onClick={() => { setCurrentView('predictions'); setSideNavOpen(false); }}>
                            <span>~</span> Notifications
                        </div>
                        <div className="side-nav-item" onClick={() => { setActiveModal('createGroup'); setSideNavOpen(false); }}>
                            <span>~</span> Create New Group
                        </div>
                        <div className="side-nav-item" onClick={() => { setActiveModal('deleteRequest'); setSideNavOpen(false); }}>
                            <span>~</span> Group Approval
                        </div>
                        <div className={`side-nav-item ${currentView === 'userHub' ? 'active' : ''}`} onClick={() => { setCurrentView('userHub'); setSideNavOpen(false); }}>
                            <span>~</span> User Profile
                        </div>
                        <div className="side-nav-item" onClick={handleSignOut} style={{ borderColor: 'rgba(255,0,127,0.4)', color: 'var(--neon-pink)' }}>
                            <span>⮑</span> Sign Out
                        </div>
                    </div>

                    {/* SECTION 1: Top Header Navigation */}
                    <header className="top-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button className="icon-action-btn" title="Side Navigation Menu" onClick={() => setSideNavOpen(!sideNavOpen)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <svg style={{ width: '36px', height: '36px', filter: 'drop-shadow(0 0 10px var(--neon-cyan))' }} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="50" cy="50" r="46" fill="url(#ballGradient)" stroke="#00f3ff" strokeWidth="4"/>
                                    <path d="M50 20 L68 33 L61 55 L39 55 L32 33 Z" fill="#0b1126" stroke="#00f3ff" strokeWidth="3"/>
                                    <path d="M50 20 L50 4 M68 33 L88 25 M61 55 L78 72 M39 55 L22 72 M32 33 L12 25" stroke="#00f3ff" strokeWidth="3"/>
                                    <defs>
                                        <radialGradient id="ballGradient" cx="30%" cy="30%" r="70%">
                                            <stop offset="0%" stopColor="#00f3ff"/>
                                            <stop offset="50%" stopColor="#b000ff"/>
                                            <stop offset="100%" stopColor="#020308"/>
                                        </radialGradient>
                                    </defs>
                                </svg>
                                <h1 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'linear-gradient(90deg, #fff, var(--neon-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Mtl Football Hub
                                </h1>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div className="avatar" onClick={() => setCurrentView('userHub')} title="User Profile">
                                <img src={avatarSrc} alt="User" />
                            </div>
                            <button className="icon-action-btn" title="About MTL Football Hub Page" onClick={() => setActiveModal('appHubAbout')}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                            </button>
                        </div>
                    </header>

                    {/* SECTION 2: Search, Filter, and Create Group Bar */}
                    <div className="action-bar-section">
                        <div className="search-box">
                            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input type="text" value={searchQuery} placeholder="Search available groups & channels..." onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="action-bar-right">
                            <button className="filter-btn" onClick={() => {}}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                                Filter
                            </button>
                            <button className="create-group-btn" onClick={() => setActiveModal('createGroup')}>+ Create Group</button>
                        </div>
                    </div>

                    {/* Error Notification Banner Prompt */}
                    {errorBanner.active && (
                        <div style={{ padding: '0 30px' }}>
                            <div className="error-notification-banner">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '36px', height: '36px', background: 'rgba(255, 0, 127, 0.2)', border: '1px solid var(--neon-pink)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-pink)', fontWeight: 'bold' }}>!</div>
                                    <div>
                                        <h4 style={{ fontSize: '0.88rem', color: '#fff', marginBottom: '2px' }}>{errorBanner.title}</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{errorBanner.message}</p>
                                    </div>
                                </div>
                                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setErrorBanner({ active: false, title: '', message: '' })}>&times;</button>
                            </div>
                        </div>
                    )}

                    {/* Dynamic Main Views Container */}
                    <div className="main-content">
                        
                        {/* VIEW 1: CHATS LIST & PINNED */}
                        <div className={`view-section ${currentView === 'chats' ? 'active' : ''}`}>
                            <div>
                                <div className="section-title">Pinned Chats</div>
                                <div className="pinned-grid">
                                    {bigThreeGroups.map((g, index) => (
                                        <div key={g.id} className="pinned-card" onClick={() => openChatRoom(g.id)}>
                                            <div className="pinned-card-header">
                                                <div className="pinned-card-icon">0{index+1}</div>
                                                <div className="pinned-badge">⭐</div>
                                            </div>
                                            <div className="section-divider-animated"></div>
                                            <div className="pinned-card-body">
                                                <h3>{g.name}</h3>
                                                <p>{g.description || 'Active Group'}</p>
                                            </div>
                                            <div className="section-divider-animated"></div>
                                            <div className="pinned-card-footer">
                                                <span>Active Chats</span>
                                                <span>Open Chat &rarr;</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="group-tabs">
                                    <div className="tab-buttons">
                                        <button className={`tab-btn ${currentTabFilter === 'all' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('all')}>ALL GROUPS</button>
                                        <button className={`tab-btn ${currentTabFilter === 'joined' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('joined')}>JOINED</button>
                                        <button className={`tab-btn ${currentTabFilter === 'created' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('created')}>CREATED</button>
                                        <button className={`tab-btn ${currentTabFilter === 'available' ? 'active' : ''}`} onClick={() => setCurrentTabFilter('available')}>NOT JOINED</button>
                                    </div>
                                </div>

                                <div className="group-list" style={{ marginTop: '14px' }}>
                                    {filteredGroups.map(g => {
                                        const userId = currentUser?.id || 'anthony-user-id';
                                        const joined = !g.group_members || g.group_members.some(m => m.user_id === userId);
                                        const unread = unreadCounts[g.id] || 0;
                                        return (
                                            <div key={g.id} className="group-item" onClick={() => openChatRoom(g.id)}>
                                                <div className="group-item-left">
                                                    <div className="group-item-avatar" onClick={(e) => { e.stopPropagation(); setSelectedGroupAbout(g); setActiveModal('groupAbout'); }} title="Click for Group About">
                                                        {g.name.substring(0,2).toUpperCase()}
                                                    </div>
                                                    <div className="group-item-info">
                                                        <h4>{g.name} {g.is_big_three ? <span style={{ color: 'var(--neon-cyan)' }}>⭐</span> : ''}</h4>
                                                        <p>{g.description || ''}</p>
                                                    </div>
                                                </div>
                                                <div className="group-item-right">
                                                    <div className="group-item-meta">
                                                        <div className="group-item-time">
                                                            <div>{new Date(g.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                            {joined ? <span style={{ color: 'var(--neon-cyan)', fontSize: '0.65rem' }}>Joined</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Available</span>}
                                                        </div>
                                                        {unread > 0 && <div className="unread-badge">{unread}</div>}
                                                    </div>
                                                    <div className="options-dots" onClick={(e) => { e.stopPropagation(); setSelectedGroupAbout(g); setActiveModal('groupAbout'); }} title="Individual Group About">&bull;&bull;&bull;</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                               </div>
                            </div>
                        </div>

                        {/* VIEW 2: USER HUB / PROFILE */}
                        <div className={`view-section ${currentView === 'userHub' ? 'active' : ''}`}>
                            <div className="section-title">PROFILE</div>
                            <div style={{ background: 'rgba(12,19,41,0.7)', border: '1px solid var(--border-glow)', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div className="avatar" style={{ width: '70px', height: '70px', fontSize: '1.5rem' }}>
                                        <img src={avatarSrc} alt="User" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '4px' }}>{currentProfile?.username || 'Anthony'}</h3>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{currentProfile?.status_message || 'Connected to Orbital Node 3099.'}</p>
                                    </div>
                                </div>
                                <button className="filter-btn" onClick={() => setActiveModal('editProfile')}>Edit profile info</button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginTop: '10px' }}>
                                <div className="pinned-card" onClick={() => { setCurrentTabFilter('joined'); setCurrentView('chats'); }}>
                                    <h3>Active Groups</h3>
                                    <p>Groups you have Joined</p>
                                    <div className="pinned-card-footer"><span>{joinedCount}</span> <span>Open Channels &rarr;</span></div>
                                </div>
                                <div className="pinned-card" onClick={() => { setCurrentTabFilter('created'); setCurrentView('chats'); }}>
                                    <h3>My Groups</h3>
                                    <p>Groups you have created</p>
                                    <div className="pinned-card-footer"><span>{createdCount}</span> <span>Manage Hubs &rarr;</span></div>
                                </div>
                            </div>
                        </div>

                        {/* VIEW 3: NOTIFICATIONS */}
                        <div className={`view-section ${currentView === 'predictions' ? 'active' : ''}`}>
                            <div className="section-title">Notifications</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ background: 'rgba(12, 19, 41, 0.7)', border: '1px solid var(--border-glow)', borderRadius: '16px', padding: '20px' }}>
                                    <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '12px', letterSpacing: '0.05em' }}>NOTIFICATIONS</h4>
                                    <div className="section-divider-animated"></div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                                        {notifications.map(n => (
                                            <div key={n.id} className="notification-item-card">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0, 243, 255, 0.1)', border: '1px solid var(--neon-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, boxShadow: '0 0 10px rgba(0,243,255,0.3)' }}>🔔</div>
                                                    <div>
                                                        <h4 style={{ fontSize: '0.88rem', color: '#fff' }}>{n.title}</h4>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.message}</p>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.68rem', color: 'var(--neon-cyan)', flexShrink: 0 }}>{n.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Bottom Floating Navigation Dock */}
                    <nav className="bottom-nav-dock">
                        <button className={`dock-item ${currentView === 'chats' ? 'active' : ''}`} onClick={() => { setCurrentView('chats'); setActiveDockItem('chats'); }}>
                            <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            <span>Chats</span>
                       </button>
                        <button className={`dock-item ${currentView === 'predictions' ? 'active' : ''}`} onClick={() => { setCurrentView('predictions'); setActiveDockItem('predictions'); }}>
                            <svg viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                            <span>Notifications</span>
                        </button>
                        <button className="dock-item highlighted-center" onClick={() => setActiveModal('createGroup')}>
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                        </button>
                        <button className={`dock-item ${activeModal === 'deleteRequest' ? 'active' : ''}`} onClick={() => setActiveModal('deleteRequest')}>
                            <div className="notification-dot-dock"></div>
                            <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                            <span>Group Approval</span>
                        </button>
                        <button className={`dock-item ${currentView === 'userHub' ? 'active' : ''}`} onClick={() => { setCurrentView('userHub'); setActiveDockItem('userHub'); }}>
                            <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            <span>Profile</span>
                        </button>
                    </nav>
                </main>
            </div>

            {/* MODAL: OPEN CHAT (FULL SCREEN) */}
            {activeModal === 'chatRoomModal' && currentOpenGroup && (
                <div className="overlay-screen">
                    <div className="chat-room-container">
                        <div className="chat-room-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }} onClick={() => { setSelectedGroupAbout(currentOpenGroup); setActiveModal('groupAbout'); }}>
                                <div className="avatar">AI</div>
                                <div>
                                    <h4 style={{ color: '#fff', fontSize: '1rem' }}>{currentOpenGroup.name}</h4>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Connected nodes</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', alignItems: 'center' }}>
                                <svg style={{ width: '20px', height: '20px', cursor: 'pointer', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }} onClick={() => { setSelectedGroupAbout(currentOpenGroup); setActiveModal('groupAbout'); }} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                <svg style={{ width: '20px', height: '20px', cursor: 'pointer', stroke: 'currentColor', fill: 'none', strokeWidth: 2 }} onClick={() => setActiveModal(null)} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </div>
                        </div>

                        <div className="chat-messages-area">
                            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', margin: '10px 0' }}>Messages are visible only to active members</div>
                            {messages.map(m => {
                                const isOwnMessage = m.sender_id === (currentUser?.id || 'anthony-user-id');
                                const senderName = m.profiles ? m.profiles.username : (isOwnMessage ? 'Anthony' : 'Member Node');
                                return (
                                    <div key={m.id} className={`message-bubble ${isOwnMessage ? 'outgoing' : 'incoming'}`}>
                                        <div className="message-sender">{senderName}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#fff' }}>
                                            {m.content.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || m.content.startsWith('data:image') ? (
                                                <img src={m.content.trim()} className="chat-media-preview-attachment" alt="Media" />
                                            ) : m.content}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                            <span>{new Date(m.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {isOwnMessage && <span style={{ cursor: 'pointer', color: 'var(--neon-cyan)' }} onClick={() => editMessage(m.id, encodeURIComponent(m.content))}>Edit</span>}
                                                <span style={{ cursor: 'pointer', color: 'var(--neon-pink)' }} onClick={() => deleteMessage(m.id)}>Delete</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatMessagesEndRef} />
                        </div>

                        <div className="chat-input-bar">
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                            <input type="text" value={chatInputText} placeholder="Type message, image link, or @mention someone..." onChange={(e) => setChatInputText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()} />
                            <button className="send-btn" onClick={sendChatMessage}>SEND</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: APP ABOUT */}
            {activeModal === 'appHubAbout' && (
                <div className="overlay-screen">
                    <div className="modal-box" style={{ textAlign: 'center' }}>
                        <div className="modal-header">
                            <h3>MTL Football Hub</h3>
                            <button className="close-modal-btn" onClick={() => setActiveModal(null)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center' }}>
                            <div className="group-item-avatar" style={{ width: '80px !important', height: '80px !important', fontSize: '2rem' }}>⚡</div>
                            <h3 style={{ color: '#fff', fontSize: '1.3rem' }}>ABOUT THIS PAGE:</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                This is a decentralized football communication portal built with advanced React architecture.
                            </p>
                            <div style={{ width: '100%', textAlign: 'left', background: 'rgba(5,8,20,0.6)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-glow)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                                <div><b>Core Engine:</b> SVS43HUVG.JGG.876.09</div>
                                <div><b>Platform Lead:</b> MOURICE LENNOX</div>
                                <div><b>Network Nodes:</b> Connected to KE01saf</div>
                            </div>
                            <button className="primary-action-btn" onClick={() => setActiveModal(null)}>CLOSE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: GROUP ABOUT */}
            {activeModal === 'groupAbout' && selectedGroupAbout && (
                <div className="overlay-screen">
                    <div className="modal-box" style={{ textAlign: 'center' }}>
                        <div className="modal-header">
                            <h3>ABOUT:</h3>
                            <button className="close-modal-btn" onClick={() => setActiveModal(null)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ alignItems: 'center' }}>
                            <div className="group-item-avatar" style={{ width: '80px !important', height: '80px !important', fontSize: '2rem' }}>{selectedGroupAbout.name.substring(0,2).toUpperCase()}</div>
                            <h3 style={{ color: '#fff', fontSize: '1.2rem' }}>{selectedGroupAbout.name}</h3>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{selectedGroupAbout.description || ''}</p>
                            <p style={{ fontSize: '0.72rem', color: 'var(--neon-cyan)' }}>Formation Date: {new Date(selectedGroupAbout.created_at).toLocaleDateString()}</p>
                            <button className="primary-action-btn" onClick={() => setActiveModal(null)}>CLOSE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE GROUP */}
            {activeModal === 'createGroup' && (
                <div className="overlay-screen">
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Create a Group</h3>
                            <button className="close-modal-btn" onClick={() => setActiveModal(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Group Name</label>
                                <input type="text" value={newGroupName} placeholder="Enter hub designation" onChange={(e) => setNewGroupName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={newGroupDesc} placeholder="What is this group about ?" rows="2" onChange={(e) => setNewGroupDesc(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Privacy Type:</label>
                                <div className="radio-options">
                                    <div className={`radio-card ${groupPrivacyType === 'Public' ? 'selected' : ''}`} onClick={() => setGroupPrivacyType('Public')}>
                                        <div>
                                            <h4 style={{ fontSize: '0.88rem', color:'#fff' }}>Public Listing</h4>
                                            <p style={{ fontSize: '0.72rem', color:'var(--text-muted)' }}>Visible in directory</p>
                                        </div>
                                    </div>
                                    <div className={`radio-card ${groupPrivacyType === 'Private' ? 'selected' : ''}`} onClick={() => setGroupPrivacyType('Private')}>
                                        <div>
                                            <h4 style={{ fontSize: '0.88rem', color:'#fff' }}>Private Stream</h4>
                                            <p style={{ fontSize: '0.72rem', color:'var(--text-muted)' }}>Invite-only access</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button className="primary-action-btn" onClick={createNewGroupSubmit}>CREATE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: APPROVALS */}
            {activeModal === 'deleteRequest' && (
                <div className="overlay-screen">
                    <div className="modal-box" style={{ textAlign: 'center' }}>
                        <div className="modal-header">
                            <h3>Governance & Approvals</h3>
                            <button className="close-modal-btn" onClick={() => setActiveModal(null)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ alignItems: 'center' }}>
                            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(0,243,255,0.15)', border: '1px solid var(--neon-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-cyan)' }}>🛡️</div>
                            <h4 style={{ color:'#fff' }}>Admin Group Approval</h4>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>All active channels are fully operational.</p>
                            <button className="primary-action-btn" onClick={() => setActiveModal(null)}>CLOSE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: EDIT PROFILE */}
            {activeModal === 'editProfile' && (
                <div className="overlay-screen">
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Edit User Identity & DP</h3>
                            <button className="close-modal-btn" onClick={() => setActiveModal(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Username</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Status Message</label>
                                <input type="text" value={editStatus} onChange={(e) => setEditStatus(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Display Picture (DP) Image URL</label>
                                <input type="text" value={editAvatar} placeholder="https://images.unsplash.com/..." onChange={(e) => setEditAvatar(e.target.value)} />
                            </div>
                            <button className="primary-action-btn" onClick={saveProfileChanges}>SAVE</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
