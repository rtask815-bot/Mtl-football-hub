import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Dashboard() {
    const navigate = useNavigate();
    const [activeNav, setActiveNav] = useState('home');
    const [clock, setClock] = useState('00:00:00');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [activeSearchFilter, setActiveSearchFilter] = useState('prediction');
    
    // User Profile Details
    const [userName, setUserName] = useState('Loading profile...');
    const [userEmail, setUserEmail] = useState('Checking session...');
    const [createdAt, setCreatedAt] = useState('N/A');
    const [isAdmin, setIsAdmin] = useState(false);

    // Supabase Live Data States
    const [liveMatches, setLiveMatches] = useState([]);
    const [upcomingFixtures, setUpcomingFixtures] = useState([]);
    const [trendingNews, setTrendingNews] = useState([]);
    const [loadingLive, setLoadingLive] = useState(true);

    const [googleQuery, setGoogleQuery] = useState('');
    const [iframeSrc, setIframeSrc] = useState('about:blank');
    
    // Toast state
    const [toast, setToast] = useState({ show: false, title: '', message: '' });
    const toastTimerRef = useRef(null);
    const canvasRef = useRef(null);

    // 4D Background Canvas Animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        // 4D Hypercube / Tesseract Vertices Setup
        const numPoints = 16;
        let points4D = [];
        for (let i = 0; i < numPoints; i++) {
            points4D.push([
                (i & 1) ? 1 : -1,
                (i & 2) ? 1 : -1,
                (i & 4) ? 1 : -1,
                (i & 8) ? 1 : -1
            ]);
        }

        let angle = 0;

        const render = () => {
            ctx.fillStyle = '#050a12';
            ctx.fillRect(0, 0, width, height);

            angle += 0.01;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            // Project 4D to 3D to 2D
            const projected2D = points4D.map(p => {
                // Rotate in 4D (XY, ZW planes)
                let x = p[0] * cos - p[3] * sin;
                let y = p[1];
                let z = p[2] * cos - p[1] * sin;
                let w = p[0] * sin + p[3] * cos;

                // Perspective projection 4D -> 3D
                const distance4D = 2.5;
                const wFactor = 1 / (distance4D - w);
                x *= wFactor;
                y *= wFactor;
                z *= wFactor;

                // Perspective projection 3D -> 2D
                const distance3D = 3;
                const zFactor = 1 / (distance3D - z);
                const screenX = x * zFactor * (width * 0.35) + width / 2;
                const screenY = y * zFactor * (height * 0.35) + height / 2;

                return { x: screenX, y: screenY, w: wFactor };
            });

            // Draw connecting lines
            ctx.lineWidth = 1;
            for (let i = 0; i < numPoints; i++) {
                for (let j = i + 1; j < numPoints; j++) {
                    let diff = 0;
                    for (let k = 0; k < 4; k++) {
                        if ((i & (1 << k)) !== (j & (1 << k))) diff++;
                    }
                    if (diff === 1) {
                        const gradient = ctx.createLinearGradient(projected2D[i].x, projected2D[i].y, projected2D[j].x, projected2D[j].y);
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
                        gradient.addColorStop(1, 'rgba(6, 182, 212, 0.25)');
                        ctx.strokeStyle = gradient;
                        ctx.beginPath();
                        ctx.moveTo(projected2D[i].x, projected2D[i].y);
                        ctx.lineTo(projected2D[j].x, projected2D[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Draw nodes
            projected2D.forEach((pt) => {
                ctx.fillStyle = pt.w > 0.4 ? '#2dd4bf' : '#10b981';
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, Math.max(1.5, pt.w * 4), 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // Fetch Real Supabase Data for Matches, News, and Fixtures
    useEffect(() => {
        const fetchSupabaseSyncData = async () => {
            setLoadingLive(true);
            try {
                // 1. Fetch Live Matches
                const { data: liveData, error: liveError } = await supabaseClient
                    .from('matches')
                    .select('*')
                    .eq('status', 'LIVE')
                    .limit(4);

                if (!liveError && liveData && liveData.length > 0) {
                    setLiveMatches(liveData);
                } else {
                    // Fallback to fetch active/recent matches if explicit LIVE tag isn't set
                    const { data: altMatches } = await supabaseClient.from('matches').select('*').limit(4);
                    setLiveMatches(altMatches || []);
                }

                // 2. Fetch Fixtures
                const { data: fixtureData } = await supabaseClient
                    .from('fixtures')
                    .select('*')
                    .limit(4);
                
                setUpcomingFixtures(fixtureData && fixtureData.length > 0 ? fixtureData : []);

                // 3. Fetch News
                const { data: newsData } = await supabaseClient
                    .from('news')
                    .select('*')
                    .limit(4);

                setTrendingNews(newsData && newsData.length > 0 ? newsData : []);

            } catch (err) {
                console.error("Supabase sync error:", err);
            } finally {
                setLoadingLive(false);
            }
        };

        fetchSupabaseSyncData();

        // Realtime Subscription for Live Matches
        const matchChannel = supabaseClient
            .channel('public:matches')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (payload) => {
                fetchSupabaseSyncData();
            })
            .subscribe();

        return () => {
            supabaseClient.removeChannel(matchChannel);
        };
    }, []);

    useEffect(() => {
        // Clock Interval
        const clockInterval = setInterval(() => {
            const now = new Date();
            setClock(now.toLocaleTimeString([], { hour12: false }));
        }, 1000);

        // Strict Supabase Auth Session Check & DB Profile Retrieval
        const verifySessionAndFetchProfile = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
                
                if (sessionError || !session) {
                    navigate('/gateway', { replace: true });
                    return;
                }

                const user = session.user;
                setUserEmail(user.email || 'No Email Found');
                localStorage.setItem("mtl_auth_token", session.access_token);

                if (user.created_at) {
                    setCreatedAt(new Date(user.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    }));
                }

                const userRole = user.app_metadata?.role || user.user_metadata?.role;
                if (userRole === 'admin' || user.email?.endsWith('@admin.com')) {
                    setIsAdmin(true);
                }

                const { data: profileData, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('full_name, name, email, is_admin, role')
                    .eq('id', user.id)
                    .maybeSingle();

                if (!profileError && profileData) {
                    setUserName(profileData.full_name || profileData.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member');
                    if (profileData.email) setUserEmail(profileData.email);
                    if (profileData.is_admin || profileData.role === 'admin') setIsAdmin(true);
                } else {
                    setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Authenticated User');
                }
            } catch (err) {
                console.error("Session check failure:", err);
                navigate('/auth', { replace: true });
            }
        };

        verifySessionAndFetchProfile();

        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                navigate('/gateway', { replace: true });
            } else if (session?.user) {
                setUserEmail(session.user.email || 'Authenticated User');
            }
        });

        showToast("SYSTEM", "Data synchronization operational.");

        return () => {
            clearInterval(clockInterval);
            subscription?.unsubscribe();
        };
    }, [navigate]);

    const showToast = (title, message) => {
        setToast({ show: true, title, message });
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    const navigateTo = (route) => {
        setActiveNav(route);
        showToast("ROUTING", `Opening ${route.toUpperCase()}`);
        
        switch (route) {
            case 'fixtures':
                navigate('/fixtures');
                break;
            case 'group-chat':
            case 'community':
                navigate('/group-chats');
                break;
            case 'past-predictions':
                navigate('/past-predictions');
                break;
            case 'ai-predictions':
                navigate('/ai-predictions');
                break;
            case 'news':
                navigate('/news');
                break;
            case 'clubs':
                navigate('/clubs');
                break;
            case 'live':
                navigate('/live');
                break;
            case 'trending':
                navigate('/trending');
                break;
            case 'notifications':
                navigate('/notifications');
                break;
            case 'predictions':
                navigate('/predictions');
                break;
            case 'home':
            default:
                navigate('/dashboard');
                break;
        }
    };

    const openSearch = () => {
        setIsSearchOpen(true);
        if (iframeSrc === 'about:blank' || !iframeSrc) {
            setIframeSrc('https://www.google.com/search?igu=1&q=todays+top+predictions');
        }
    };

    const closeSearch = () => setIsSearchOpen(false);

    const executeGoogleSearch = () => {
        const q = googleQuery.trim();
        if (!q) { showToast("SEARCH", "Enter a query first."); return; }
        const searchUrl = `https://www.google.com/search?igu=1&q=${encodeURIComponent(q + ' football ' + activeSearchFilter)}`;
        setIframeSrc(searchUrl);
        showToast("SEARCH", `Loading search inside floating container...`);
    };

    const logout = async () => {
        try {
            await supabaseClient.auth.signOut();
            localStorage.removeItem("mtl_auth_token");
        } catch(err) { 
            console.error(err); 
        }
        setIsProfileOpen(false);
        showToast("SESSION", "Signed out successfully. Redirecting...");
        setTimeout(() => {
            navigate('/auth', { replace: true });
        }, 800);
    };

    return (
        <div className="dashboard-root">
            <style>{`
                html, body, #root {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    min-height: 100vh;
                    background: #050a12;
                    overflow-x: hidden;
                }

                .dashboard-4d-canvas {
                    position: fixed;
                    inset: 0;
                    z-index: 0;
                    pointer-events: none;
                }

                .dashboard-root * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    -webkit-tap-highlight-color: transparent;
                    line-height: 1.45;
                }

                .dashboard-root {
                    --bg: #050a12;
                    --bg-solid: #0d1626;
                    --surface: #0f1c2e;
                    --surface-strong: #15243b;
                    --btn-bg: #1e2f47;
                    --btn-bg-hover: #283e5d;
                    --border: #233754;
                    --border-active: #34d399;
                    --text: #ffffff;
                    --muted: #c4d2e3;
                    --dim: #8fa2bb;
                    --green: #10b981;
                    --cyan: #06b6d4;
                    --purple: #a855f7;
                    --orange: #f97316;
                    --yellow: #eab308;
                    --blue: #3b82f6;
                    min-height: 100vh;
                    width: 100%;
                    max-width: 100vw;
                    color: var(--text);
                    position: relative;
                    z-index: 1;
                }

                .dashboard-header {
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    position: relative;
                    z-index: 50;
                    background: var(--surface);
                    border-bottom: 1px solid var(--border);
                }

                .logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                }

                .logo-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #10b981;
                    box-shadow: 0 0 15px rgba(16, 185, 129, .5);
                }

                .logo-text {
                    display: flex;
                    flex-direction: column;
                }

                .logo-sub {
                    color: var(--green);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 1px;
                }

                .logo-main {
                    font-size: 15px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                }

                .dashboard-nav {
                    display: flex;
                    gap: 18px;
                }

                .dashboard-nav a {
                    color: var(--muted);
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 600;
                    transition: .2s ease;
                    position: relative;
                    padding: 6px 12px;
                    border-radius: 6px;
                    background: var(--btn-bg);
                }

                .dashboard-nav a:hover, .dashboard-nav a.active {
                    color: white;
                    background: var(--btn-bg-hover);
                    border: 1px solid var(--green);
                }

                .nav-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .icon-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    background: var(--btn-bg);
                    color: var(--muted);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: .2s ease;
                }

                .icon-btn:hover {
                    color: white;
                    border-color: var(--border-active);
                    background: var(--btn-bg-hover);
                }

                .badge {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #ef4444;
                    box-shadow: 0 0 6px #ef4444;
                    position: absolute;
                    right: 6px;
                    top: 6px;
                }

                .avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 2px solid var(--green);
                    cursor: pointer;
                }

                .avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .system-bar {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 12px auto;
                    min-height: 34px;
                    padding: 6px 14px;
                    border: 1px solid var(--border);
                    background: var(--surface);
                    border-radius: 6px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: var(--muted);
                    font-size: 12px;
                    font-weight: 600;
                }

                .status-left, .status-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--green);
                    box-shadow: 0 0 8px var(--green);
                }

                /* Futuristic 4D Banner */
                .futuristic-banner {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 12px auto;
                    background: var(--surface-strong);
                    border: 2px solid var(--border);
                    border-radius: 14px;
                    padding: 24px 20px;
                    text-align: center;
                    position: relative;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                }

                .futuristic-banner::before {
                    content: "";
                    position: absolute;
                    inset: -1px;
                    border-radius: 14px;
                    padding: 1px;
                    background: linear-gradient(90deg, var(--green), var(--cyan), var(--purple));
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                }

                .welcome-tag {
                    color: var(--cyan);
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 2px;
                    margin-bottom: 6px;
                    text-transform: uppercase;
                }

                .hero-title {
                    font-size: clamp(24px, 4vw, 38px);
                    font-weight: 900;
                    line-height: 1.15;
                    margin-bottom: 8px;
                    letter-spacing: 1px;
                }

                .hero-title span {
                    background: linear-gradient(90deg, #10b981, #06b6d4, #a855f7);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                }

                .hero-sub {
                    color: var(--muted);
                    font-size: 13px;
                    margin-bottom: 16px;
                }

                .prompt-container {
                    background: var(--bg-solid);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    padding: 16px;
                    text-align: left;
                    max-width: 900px;
                    margin: 0 auto;
                }

                .prompt-intro {
                    font-size: 12px;
                    color: var(--muted);
                    line-height: 1.5;
                    margin-bottom: 10px;
                }

                .prompt-badge {
                    font-size: 11px;
                    font-weight: 800;
                    color: var(--yellow);
                    letter-spacing: 1px;
                }

                .live-now-container {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 0 auto 16px;
                }

                .section-header-flex {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .section-title-badge {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    font-weight: 800;
                    color: white;
                }

                .live-pulse-dot {
                    width: 8px;
                    height: 8px;
                    background: #ef4444;
                    border-radius: 50%;
                    box-shadow: 0 0 8px #ef4444;
                }

                .view-all-link {
                    color: var(--muted);
                    font-size: 12px;
                    font-weight: 700;
                    text-decoration: none;
                    background: var(--btn-bg);
                    padding: 4px 10px;
                    border-radius: 6px;
                    border: 1px solid var(--border);
                }

                .view-all-link:hover {
                    color: white;
                    border-color: var(--green);
                }

                .live-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 12px;
                }

                .live-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    padding: 12px;
                    position: relative;
                    cursor: pointer;
                    transition: .2s ease;
                }

                .live-card:hover {
                    border-color: var(--green);
                    transform: translateY(-2px);
                }

                .league-tag {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--cyan);
                    text-align: center;
                    margin-bottom: 8px;
                }

                .live-match-scoreboard {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .team-col {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    width: 35%;
                }

                .team-logo-placeholder {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 11px;
                    background: var(--btn-bg);
                    border-radius: 50%;
                    border: 1px solid var(--border);
                }

                .team-name-lbl {
                    font-size: 11px;
                    font-weight: 700;
                    text-align: center;
                }

                .score-center {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 30%;
                }

                .score-val {
                    font-size: 18px;
                    font-weight: 800;
                    color: white;
                }

                .match-time-badge {
                    font-size: 10px;
                    color: var(--green);
                    font-weight: 700;
                }

                .live-indicator-text {
                    font-size: 10px;
                    color: #ef4444;
                    font-weight: 800;
                    text-align: center;
                    margin-bottom: 4px;
                }

                .match-timeline-bar {
                    width: 100%;
                    height: 3px;
                    background: var(--btn-bg);
                    border-radius: 2px;
                    margin-bottom: 6px;
                    position: relative;
                }

                .match-timeline-progress {
                    position: absolute;
                    left: 0; top: 0; bottom: 0;
                    background: var(--green);
                    border-radius: 2px;
                }

                .match-events-footer {
                    font-size: 10px;
                    color: var(--dim);
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .quick-actions-bar {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 0 auto 16px;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                }

                .qa-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    transition: .2s;
                }

                .qa-card:hover {
                    border-color: var(--green);
                    background: var(--btn-bg);
                }

                .qa-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: white;
                }

                .qa-sub {
                    font-size: 10px;
                    color: var(--dim);
                }

                .dashboard-container {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: auto;
                    padding-bottom: 24px;
                }

                .dashboard-main-grid {
                    display: grid;
                    grid-template-columns: 1.2fr 0.8fr;
                    gap: 14px;
                    margin-bottom: 14px;
                }

                .dashboard-panel {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 16px;
                }

                .highlight-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid var(--border);
                    font-size: 12px;
                }

                .highlight-item:last-child {
                    border-bottom: none;
                }

                .hl-league {
                    font-size: 10px;
                    color: var(--cyan);
                    font-weight: 700;
                }

                .hl-teams {
                    font-weight: 700;
                    font-size: 12px;
                    color: white;
                }

                .hl-time {
                    text-align: right;
                    font-weight: 700;
                    color: var(--muted);
                    font-size: 11px;
                }

                .hl-date {
                    font-size: 10px;
                    color: var(--dim);
                }

                .reminder-bell {
                    background: var(--btn-bg);
                    border: 1px solid var(--border);
                    color: var(--green);
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }

                .reminder-bell:hover {
                    background: var(--green);
                    color: #000;
                }

                .trending-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 0;
                    border-bottom: 1px solid var(--border);
                    cursor: pointer;
                }

                .trending-item:last-child {
                    border-bottom: none;
                }

                .trending-rank {
                    font-size: 14px;
                    font-weight: 800;
                    color: var(--green);
                    width: 20px;
                }

                .trending-thumb {
                    width: 40px;
                    height: 30px;
                    border-radius: 4px;
                    object-fit: cover;
                    border: 1px solid var(--border);
                }

                .trending-info {
                    flex: 1;
                }

                .trending-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: white;
                }

                .trending-disc {
                    font-size: 10px;
                    color: var(--dim);
                }

                .stats-grid-4 {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin-bottom: 12px;
                }

                .stat-box-mini {
                    background: var(--bg-solid);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 8px;
                    text-align: center;
                }

                .stat-box-val {
                    font-size: 14px;
                    font-weight: 800;
                    color: white;
                }

                .stat-box-lbl {
                    font-size: 9px;
                    color: var(--dim);
                }

                .stat-box-growth {
                    font-size: 9px;
                    color: var(--green);
                    font-weight: 700;
                }

                .scorers-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-top: 12px;
                    border-top: 1px solid var(--border);
                    padding-top: 12px;
                }

                .scorer-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 11px;
                    padding: 4px 0;
                }

                .cards-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 12px;
                }

                .card {
                    min-height: 140px;
                    padding: 16px 12px;
                    position: relative;
                    border-radius: 10px;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    cursor: pointer;
                    transition: transform .2s ease, border-color .2s ease;
                }

                .card:hover {
                    transform: translateY(-2px);
                    border-color: var(--green);
                }

                .card-icon {
                    width: 32px;
                    height: 32px;
                    margin: 0 auto 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--green);
                }

                .card-title {
                    font-size: 13px;
                    font-weight: 800;
                    text-align: center;
                }

                .card-description {
                    margin: 4px auto 8px;
                    text-align: center;
                    color: var(--muted);
                    font-size: 11px;
                }

                .card-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: auto;
                    border-top: 1px solid var(--border);
                    padding-top: 8px;
                }

                .card-stat {
                    color: var(--green);
                    font-size: 10px;
                    font-weight: 700;
                }

                .dashboard-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px;
                    background: rgba(0, 0, 0, .85);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity .2s ease;
                }

                .dashboard-modal.active {
                    opacity: 1;
                    pointer-events: auto;
                }

                .search-frame {
                    width: min(950px, 100%);
                    height: min(700px, 90vh);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid var(--green);
                    border-radius: 12px;
                    background: var(--surface-strong);
                }

                .search-frame-header {
                    min-height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 14px;
                    background: var(--bg-solid);
                    border-bottom: 1px solid var(--border);
                }

                .search-brand {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .search-brand-title {
                    font-size: 13px;
                    font-weight: 800;
                }

                .close-search {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    border: 1px solid var(--border);
                    background: var(--btn-bg);
                    color: var(--muted);
                    cursor: pointer;
                }

                .prediction-filters {
                    display: flex;
                    gap: 8px;
                    padding: 8px 12px;
                    background: var(--surface);
                    border-bottom: 1px solid var(--border);
                }

                .filter-chip {
                    padding: 6px 12px;
                    border-radius: 6px;
                    border: 1px solid var(--border);
                    background: var(--btn-bg);
                    color: var(--muted);
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .filter-chip.active, .filter-chip:hover {
                    color: white;
                    border-color: var(--green);
                    background: var(--btn-bg-hover);
                }

                .search-bar {
                    display: flex;
                    gap: 8px;
                    padding: 10px 12px;
                    background: var(--bg-solid);
                    border-bottom: 1px solid var(--border);
                }

                .search-input-wrap {
                    flex: 1;
                    position: relative;
                }

                .search-input {
                    width: 100%;
                    height: 36px;
                    padding: 0 12px 0 32px;
                    border-radius: 6px;
                    outline: none;
                    color: white;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    font-size: 12px;
                }

                .search-symbol {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--green);
                }

                .execute-search {
                    min-width: 90px;
                    border: none;
                    border-radius: 6px;
                    background: var(--green);
                    color: #000;
                    font-weight: 800;
                    font-size: 11px;
                    cursor: pointer;
                }

                .google-results-frame {
                    flex: 1;
                    background: #ffffff;
                }

                .google-iframe-container {
                    width: 100%;
                    height: 100%;
                    border: none;
                }

                .profile-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 900;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, .85);
                    opacity: 0;
                    pointer-events: none;
                    transition: .2s;
                }

                .profile-modal.active { opacity: 1; pointer-events: auto; }

                .profile-box {
                    width: min(380px, 90%);
                    padding: 24px;
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    background: var(--surface-strong);
                    text-align: center;
                }

                .profile-avatar-large {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    margin: 0 auto 12px;
                    border: 2px solid var(--green);
                    overflow: hidden;
                }

                .profile-avatar-large img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .profile-user-info-list {
                    margin: 16px 0;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    text-align: left;
                }

                .profile-field-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: var(--bg-solid);
                    border-radius: 6px;
                    border: 1px solid var(--border);
                    font-size: 12px;
                }

                .profile-field-label {
                    color: var(--dim);
                    font-weight: 700;
                    font-size: 10px;
                }

                .profile-field-value {
                    color: white;
                    font-weight: 700;
                }

                .role-badge {
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 800;
                }

                .role-badge.admin {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                    border: 1px solid #ef4444;
                }

                .role-badge.user {
                    background: rgba(16, 185, 129, 0.2);
                    color: var(--green);
                    border: 1px solid var(--green);
                }

                .profile-actions { display: flex; gap: 10px; margin-top: 16px; }
                .profile-actions button {
                    flex: 1;
                    padding: 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 700;
                }

                .cancel-btn { color: var(--muted); background: var(--btn-bg); border: 1px solid var(--border); }
                .logout-btn { color: white; background: #ef4444; border: none; }

                .dashboard-footer {
                    width: 100%;
                    background: var(--surface);
                    border-top: 1px solid var(--border);
                    padding: 24px 16px;
                    margin-top: 32px;
                    color: var(--muted);
                    font-size: 12px;
                }

                .footer-content {
                    max-width: 1140px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                .footer-links {
                    display: flex;
                    gap: 16px;
                }

                .footer-links a {
                    color: var(--muted);
                    text-decoration: none;
                }

                .footer-links a:hover {
                    color: var(--green);
                }

                .toast {
                    position: fixed;
                    right: 16px;
                    bottom: 16px;
                    z-index: 2000;
                    min-width: 240px;
                    padding: 10px 16px;
                    border: 1px solid var(--green);
                    border-radius: 8px;
                    background: var(--surface-strong);
                    transform: translateY(100px);
                    opacity: 0;
                    transition: .3s cubic-bezier(.175, .885, .32, 1.275);
                }

                .toast.show { transform: translateY(0); opacity: 1; }
                .toast-title { color: var(--green); font-size: 12px; font-weight: 800; }
                .toast-message { color: var(--muted); font-size: 11px; margin-top: 2px; }

                @media(max-width:850px) {
                    .dashboard-nav { display: none; }
                    .live-cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .dashboard-main-grid { grid-template-columns: 1fr; }
                    .cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .quick-actions-bar { grid-template-columns: repeat(2, 1fr); }
                }
            `}</style>

            {/* 4D Dynamic Canvas Effect */}
            <canvas ref={canvasRef} className="dashboard-4d-canvas" />

            <header className="dashboard-header">
                <div className="logo" onClick={() => navigateTo('home')}>
                    <div className="logo-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div className="logo-text">
                        <span className="logo-sub">MTL</span>
                        <span className="logo-main">FOOTBALL HUB</span>
                    </div>
                </div>

                <nav className="dashboard-nav">
                    <a href="#home" className={activeNav === 'home' ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigateTo('home'); }}>Home</a>
                    <a href="#live" className={activeNav === 'live' ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigateTo('live'); }}>Live</a>
                    <a href="#fixtures" className={activeNav === 'fixtures' ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigateTo('fixtures'); }}>Fixtures</a>
                    <a href="#predictions" className={activeNav === 'predictions' ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigateTo('predictions'); }}>Predictions</a>
                    <a href="#community" className={activeNav === 'community' ? 'active' : ''} onClick={(e) => { e.preventDefault(); navigateTo('community'); }}>Community</a>
                </nav>

                <div className="nav-actions">
                    <button className="icon-btn" onClick={openSearch} title="Search Network">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </button>
                    <button className="icon-btn" onClick={() => showToast('NOTIFICATIONS', 'No notifications found.')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                        </svg>
                        <span className="badge"></span>
                    </button>
                    <div className="avatar" onClick={() => setIsProfileOpen(true)}>
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" alt="Profile" />
                    </div>
                </div>
            </header>

            <div className="system-bar">
                <div className="status-left">
                    <span className="status-dot"></span>
                    <span>{userName}</span>
                </div>
                <div className="status-right">
                    <span>SYSTEM TIME:</span>
                    <span>{clock}</span>
                </div>
            </div>

            {/* FUTURISTIC 4D BANNER */}
            <section className="futuristic-banner">
                <div className="welcome-tag">★ The Hub Of Football ★</div>
                <h1 className="hero-title">FOOTBALL <span>INTELLIGENCE</span></h1>
                <p className="hero-sub">Welcome To The Community.</p>

                <div className="prompt-container">
                    <div className="prompt-intro">
                        A football intelligence hub refers to an advanced data analytics and tactical platform used to process match metrics, scout players and optimize team management. The MTL AI Engine continuously parses global fixtures, odds shifts and tactical data streams directly into Supabase.
                    </div>
                    <div className="prompt-badge">THIS IS A COMMUNITY OF FOOTBALL FANS</div>
                </div>
            </section>

            <section className="live-now-container">
                <div className="cards-grid">
                    <div className="card" onClick={() => navigateTo('group-chat')}>
                        <div className="card-icon">👥</div>
                        <h3 className="card-title">Group Chat</h3>
                        <p className="card-description">Join fan squads and discuss matches in real time.</p>
                        <div className="card-bottom">
                            <span className="card-stat">Join Active Groups</span>
                            <span>📡</span>
                        </div>
                    </div>

                    <div className="card" onClick={() => navigateTo('ai-predictions')}>
                        <div className="card-icon">⚡</div>
                        <h3 className="card-title">AI Football</h3>
                        <p className="card-description">Match intelligence, tactical analysis and AI briefs.</p>
                        <div className="card-bottom">
                            <span className="card-stat">MTL AI ENGINE</span>
                            <span>🛸</span>
                        </div>
                    </div>

                    <div className="card" onClick={() => navigateTo('chats')}>
                        <div className="card-icon">📰</div>
                        <h3 className="card-title">TRENDING NEWS</h3>
                        <p className="card-description">Get football updates from all across the world.</p>
                        <div className="card-bottom">
                            <span className="card-stat">8.4K Plus</span>
                            <span>🗺️</span>
                        </div>
                    </div>

                    <div className="card" onClick={() => navigateTo('predictions')}>
                        <div className="card-icon">🎯</div>
                        <h3 className="card-title">Predictions</h3>
                        <p className="card-description">Make predictions, build your record and earn points.</p>
                        <div className="card-bottom">
                            <span className="card-stat">12.7K PICKS</span>
                            <span>→</span>
                        </div>
                    </div>

                    <div className="card" onClick={() => navigateTo('fixtures')}>
                        <div className="card-icon">📅</div>
                        <h3 className="card-title">Fixtures</h3>
                        <p className="card-description">Browse upcoming matches and competition schedules.</p>
                        <div className="card-bottom">
                            <span className="card-stat">128 MATCHES</span>
                            <span>→</span>
                        </div>
                    </div>

                    <div className="card" onClick={() => navigateTo('clubs')}>
                        <div className="card-icon">🏆</div>
                        <h3 className="card-title">Clubs</h3>
                        <p className="card-description">Discover clubs, squads, competitions and history.</p>
                        <div className="card-bottom">
                            <span className="card-stat">650+ CLUBS</span>
                            <span>→</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* REAL SUPABASE MATCH SYNC SECTION */}
            <section className="live-now-container">
                <div className="section-header-flex">
                    <div className="section-title-badge">
                        <span className="live-pulse-dot"></span>
                        <span>Live Now ({liveMatches.length > 0 ? liveMatches.length : 4} Matches Live)</span>
                    </div>
                    <a href="#live" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('live'); }}>View All Live 📡</a>
                </div>
                
                <div className="live-cards-grid">
                    {loadingLive ? (
                        <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>Syncing Supabase database...</div>
                    ) : liveMatches.length > 0 ? (
                        liveMatches.map((m, idx) => (
                            <div key={m.id || idx} className="live-card" onClick={() => navigateTo(`match-${m.id || idx}`)}>
                                <div className="league-tag">{m.league || 'Premier League'}</div>
                                <div className="live-match-scoreboard">
                                    <div className="team-col">
                                        <div className="team-logo-placeholder">{m.home_team ? m.home_team.substring(0, 3).toUpperCase() : 'HOME'}</div>
                                        <span className="team-name-lbl">{m.home_team || 'Home Team'}</span>
                                    </div>
                                    <div className="score-center">
                                        <span className="score-val">{m.home_score ?? 0} - {m.away_score ?? 0}</span>
                                        <span className="match-time-badge">{m.minute ? `${m.minute}'` : 'LIVE'}</span>
                                    </div>
                                    <div className="team-col">
                                        <div className="team-logo-placeholder">{m.away_team ? m.away_team.substring(0, 3).toUpperCase() : 'AWAY'}</div>
                                        <span className="team-name-lbl">{m.away_team || 'Away Team'}</span>
                                    </div>
                                </div>
                                <div className="live-indicator-text">● LIVE SYNC</div>
                                <div className="match-timeline-bar"><div className="match-timeline-progress" style={{ width: `${m.minute || 60}%` }}></div></div>
                                <div className="match-events-footer">{m.events || 'Tactical high intensity'}</div>
                            </div>
                        ))
                    ) : (
                        // Fallback dataset if tables are currently unpopulated
                        <>
                            <div className="live-card" onClick={() => navigateTo('match-1')}>
                                <div className="league-tag">Premier League</div>
                                <div className="live-match-scoreboard">
                                    <div className="team-col">
                                        <div className="team-logo-placeholder" style={{ color: '#ef4444' }}>ARS</div>
                                        <span className="team-name-lbl">Arsenal</span>
                                    </div>
                                    <div className="score-center">
                                        <span className="score-val">2 - 1</span>
                                        <span className="match-time-badge">78:42</span>
                                    </div>
                                    <div className="team-col">
                                        <div className="team-logo-placeholder" style={{ color: '#3b82f6' }}>CHE</div>
                                        <span className="team-name-lbl">Chelsea</span>
                                    </div>
                                </div>
                                <div className="live-indicator-text">● LIVE</div>
                                <div className="match-timeline-bar"><div className="match-timeline-progress" style={{ width: '78%' }}></div></div>
                                <div className="match-events-footer">72' Ødegaard (G) | 34' Sterling (G)</div>
                            </div>

                            <div className="live-card" onClick={() => navigateTo('match-2')}>
                                <div className="league-tag">La Liga</div>
                                <div className="live-match-scoreboard">
                                    <div className="team-col">
                                        <div className="team-logo-placeholder" style={{ color: '#a855f7' }}>BAR</div>
                                        <span className="team-name-lbl">Barcelona</span>
                                    </div>
                                    <div className="score-center">
                                        <span className="score-val">1 - 0</span>
                                        <span className="match-time-badge">65:17</span>
                                    </div>
                                    <div className="team-col">
                                        <div className="team-logo-placeholder" style={{ color: '#eab308' }}>RMA</div>
                                        <span className="team-name-lbl">Real Madrid</span>
                                    </div>
                                </div>
                                <div className="live-indicator-text">● LIVE</div>
                                <div className="match-timeline-bar"><div className="match-timeline-progress" style={{ width: '65%' }}></div></div>
                                <div className="match-events-footer">45' Lewandowski (G)</div>
                            </div>

                            <div className="live-card" onClick={() => navigateTo('match-3')}>
                                <div className="league-tag">Serie A</div>
                                <div className="live-match-scoreboard">
                                    <div className="team-col">
                                        <div className="team-logo-placeholder" style={{ color: '#ef4444' }}>ACM</div>
                                        <span className="team-name-lbl">AC Milan</span>
                                    </div>
                                    <div className="score-center">
                                        <span className="score-val">0 - 0</span>
                                        <span className="match-time-badge">52:33</span>
                                    </div>
                                    <div className="team-col">
                                        <div className="team-logo-placeholder" style={{ color: '#3b82f6' }}>INT</div>
                                        <span className="team-name-lbl">Inter</span>
                                    </div>
                                </div>
                                <div className="live-indicator-text">● LIVE</div>
                                <div className="match-timeline-bar"><div className="match-timeline-progress" style={{ width: '52%' }}></div></div>
                                <div className="match-events-footer">Tactical battle in midfield</div>
                            </div>

                            <div className="live-card" onClick={() => navigateTo('match-4')}>
                                <div className="league-tag">Bundesliga</div>
                                <div className="live-match-scoreboard">
                                    <div className="team-col">
                                        <div className="team-logo-placeholder" style={{ color: '#ef4444' }}>FCB</div>
                                        <span className="team-name-lbl">Bayern</span>
                                    </div>
                                    <div className="score-center">
                                        <span className="score-val">1 - 2</span>
                                        <span className="match-time-badge">81:05</span>
                                    </div>
                                    <div className="team-col">
                                        <div className="team-logo-placeholder" style={{ color: '#eab308' }}>BVB</div>
                                        <span className="team-name-lbl">Dortmund</span>
                                    </div>
                                </div>
                                <div className="live-indicator-text">● LIVE</div>
                                <div className="match-timeline-bar"><div className="match-timeline-progress" style={{ width: '81%' }}></div></div>
                                <div className="match-events-footer">25' Kane (G) | 33' Reus (G)</div>
                            </div>
                        </>
                    )}
                </div>
            </section>

            <div className="quick-actions-bar">
                <div className="qa-card" onClick={() => navigateTo('centre')}>
                    <div>
                        <div className="qa-title">Match Centre</div>
                        <div className="qa-sub">Live stats & events</div>
                    </div>
                    <span>→</span>
                </div>
                <div className="qa-card" onClick={() => navigateTo('notifications')}>
                    <div>
                        <div className="qa-title">Favourite Teams</div>
                        <div className="qa-sub">Track your teams</div>
                    </div>
                    <span>→</span>
                </div>
                <div className="qa-card" onClick={() => showToast('NOTIFICATIONS', 'Notifications management panel')}>
                    <div>
                        <div className="qa-title">Notifications</div>
                        <div className="qa-sub">Manage alerts</div>
                    </div>
                    <span>→</span>
                </div>
                <div className="qa-card" onClick={() => showToast('CALENDAR', 'Syncing match calendar...')}>
                    <div>
                        <div className="qa-title">Calendar Sync</div>
                        <div className="qa-sub">Never miss a match</div>
                    </div>
                    <span>→</span>
                </div>
            </div>

            <main className="dashboard-container">
                <div className="dashboard-main-grid">
                    {/* UPCOMING FIXTURES SYNC */}
                    <div className="dashboard-panel">
                        <div className="section-header-flex">
                            <div className="section-title-badge">📅 Upcoming Highlights</div>
                            <a href="#fixtures" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('fixtures'); }}>View Fixtures →</a>
                        </div>

                        {upcomingFixtures.length > 0 ? (
                            upcomingFixtures.map((f, i) => (
                                <div key={f.id || i} className="highlight-item">
                                    <div>
                                        <div className="hl-league">{f.league || 'League Match'}</div>
                                        <div className="hl-teams">{f.home_team} vs {f.away_team}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="hl-time">{f.date || 'Today'}<div className="hl-date">{f.time || '21:00'}</div></div>
                                        <button className="reminder-bell" onClick={() => showToast('REMINDER', 'Match notification set!')}>🔔</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <>
                                <div className="highlight-item">
                                    <div>
                                        <div className="hl-league">Champions League</div>
                                        <div className="hl-teams">Man City vs PSG</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="hl-time">Today<div className="hl-date">21:00</div></div>
                                        <button className="reminder-bell" onClick={() => showToast('REMINDER', 'Match notification set!')}>🔔</button>
                                    </div>
                                </div>

                                <div className="highlight-item">
                                    <div>
                                        <div className="hl-league">Premier League</div>
                                        <div className="hl-teams">Liverpool vs Man United</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="hl-time">Tomorrow<div className="hl-date">18:30</div></div>
                                        <button className="reminder-bell" onClick={() => showToast('REMINDER', 'Match notification set!')}>🔔</button>
                                    </div>
                                </div>

                                <div className="highlight-item">
                                    <div>
                                        <div className="hl-league">La Liga</div>
                                        <div className="hl-teams">Atletico Madrid vs Sevilla</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="hl-time">Sun, 18 May<div className="hl-date">20:00</div></div>
                                        <button className="reminder-bell" onClick={() => showToast('REMINDER', 'Match notification set!')}>🔔</button>
                                    </div>
                                </div>

                                <div className="highlight-item">
                                    <div>
                                        <div className="hl-league">Serie A</div>
                                        <div className="hl-teams">Juventus vs Napoli</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="hl-time">Sun, 18 May<div className="hl-date">21:45</div></div>
                                        <button className="reminder-bell" onClick={() => showToast('REMINDER', 'Match notification set!')}>🔔</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* TRENDING NEWS SYNC */}
                    <div className="dashboard-panel">
                        <div className="section-header-flex">
                            <div className="section-title-badge">🔥 Trending Now</div>
                            <a href="#iq" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('trending'); }}>View All →</a>
                        </div>

                        {trendingNews.length > 0 ? (
                            trendingNews.map((n, i) => (
                                <div key={n.id || i} className="trending-item" onClick={() => showToast('TRENDING', `Opening topic: ${n.title}`)}>
                                    <div className="trending-rank">0{i + 1}</div>
                                    <img className="trending-thumb" src={n.image_url || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=100&q=80"} alt="News" />
                                    <div className="trending-info">
                                        <div className="trending-title">{n.title}</div>
                                        <div className="trending-disc">{n.discussions_count || '1.2K'} discussions</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <>
                                <div className="trending-item" onClick={() => showToast('TRENDING', 'Opening topic: Mbappé goals')}>
                                    <div className="trending-rank">01</div>
                                    <img className="trending-thumb" src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=100&q=80" alt="News" />
                                    <div className="trending-info">
                                        <div className="trending-title">Mbappé scores again as Real keep title hopes alive</div>
                                        <div className="trending-disc">2.4K discussions</div>
                                    </div>
                                </div>

                                <div className="trending-item" onClick={() => showToast('TRENDING', 'Opening topic: Arsenal transfer')}>
                                    <div className="trending-rank">02</div>
                                    <img className="trending-thumb" src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=100&q=80" alt="News" />
                                    <div className="trending-info">
                                        <div className="trending-title">Arsenal close in on star midfielder transfer</div>
                                        <div className="trending-disc">1.8K discussions</div>
                                    </div>
                                </div>

                                <div className="trending-item" onClick={() => showToast('TRENDING', 'Opening topic: Xabi Alonso')}>
                                    <div className="trending-rank">03</div>
                                    <img className="trending-thumb" src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=100&q=80" alt="News" />
                                    <div className="trending-info">
                                        <div className="trending-title">Xabi Alonso to replace Ancelotti?</div>
                                        <div className="trending-disc">1.5K discussions</div>
                                    </div>
                                </div>

                                <div className="trending-item" onClick={() => showToast('TRENDING', 'Opening topic: AFCON qualifiers')}>
                                    <div className="trending-rank">04</div>
                                    <img className="trending-thumb" src="https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=100&q=80" alt="News" />
                                    <div className="trending-info">
                                        <div className="trending-title">AFCON qualifiers: Big wins for Nigeria & Egypt</div>
                                        <div className="trending-disc">1.2K discussions</div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="dashboard-main-grid">
                    <div className="dashboard-panel" style={{ gridColumn: 'span 2' }}>
                        <div className="section-title-badge" style={{ marginBottom: '12px' }}>⚽ Football At A Glance</div>
                        
                        <div className="stats-grid-4">
                            <div className="stat-box-mini">
                                <div className="stat-box-val">1,248</div>
                                <div className="stat-box-lbl">Goals Scored</div>
                                <div className="stat-box-growth">+18% this week</div>
                            </div>
                            <div className="stat-box-mini">
                                <div className="stat-box-val">3,642</div>
                                <div className="stat-box-lbl">Matches Played</div>
                                <div className="stat-box-growth">+12% this week</div>
                            </div>
                            <div className="stat-box-mini">
                                <div className="stat-box-val">28,571</div>
                                <div className="stat-box-lbl">Shots on Target</div>
                                <div className="stat-box-growth">+7% this week</div>
                            </div>
                            <div className="stat-box-mini">
                                <div className="stat-box-val">892</div>
                                <div className="stat-box-lbl">Clean Sheets</div>
                                <div className="stat-box-growth">+5% this week</div>
                            </div>
                        </div>

                        <div className="scorers-grid">
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Top Scorers</div>
                                <div className="scorer-row"><span>1. K. Mbappé <span style={{ color: 'var(--dim)' }}>Real Madrid</span></span> <b>28</b></div>
                                <div className="scorer-row"><span>2. H. Kane <span style={{ color: 'var(--dim)' }}>Bayern</span></span> <b>24</b></div>
                                <div className="scorer-row"><span>3. E. Haaland <span style={{ color: 'var(--dim)' }}>Man City</span></span> <b>22</b></div>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Top Assists</div>
                                <div className="scorer-row"><span>1. K. De Bruyne <span style={{ color: 'var(--dim)' }}>Man City</span></span> <b>17</b></div>
                                <div className="scorer-row"><span>2. L. Messi <span style={{ color: 'var(--dim)' }}>Inter Miami</span></span> <b>15</b></div>
                                <div className="scorer-row"><span>3. B. Fernandes <span style={{ color: 'var(--dim)' }}>Man Utd</span></span> <b>14</b></div>
                            </div>
                        </div>
                    </div>            
                </div>
            </main>

            <footer className="dashboard-footer">
                <div className="footer-content">
                    <div>
                        <div style={{ fontWeight: 800, color: 'white', marginBottom: '2px' }}>MTL FOOTBALL FANS HUB</div>
                        <div>© 2026 MTL Football Hub. All rights reserved.</div>
                    </div>
                    <div className="footer-links">
                        <a href="#privacy" onClick={(e) => { e.preventDefault(); showToast('POLICY', 'Privacy guidelines loaded.'); }}>Privacy Policy</a>
                        <a href="#terms" onClick={(e) => { e.preventDefault(); showToast('TERMS', 'Terms of service loaded.'); }}>Terms of Service</a>
                        <a href="#support" onClick={(e) => { e.preventDefault(); showToast('SUPPORT', 'Support node online.'); }}>Support</a>
                    </div>
                </div>
            </footer>

            {/* SEARCH MODAL */}
            <div className={`dashboard-modal ${isSearchOpen ? 'active' : ''}`} onClick={(e) => { if (e.target.className.includes('dashboard-modal')) closeSearch(); }}>
                <div className="search-frame" onClick={(e) => e.stopPropagation()}>
                    <div className="search-frame-header">
                        <div className="search-brand">
                            <div>🔍</div>
                            <div>
                                <div className="search-brand-title">Google Network Search</div>
                            </div>
                        </div>
                        <button className="close-search" onClick={closeSearch}>❌</button>
                    </div>

                    <div className="prediction-filters">
                        <button className={`filter-chip ${activeSearchFilter === 'prediction' ? 'active' : ''}`} onClick={() => setActiveSearchFilter('prediction')}>Match Predictions</button>
                        <button className={`filter-chip ${activeSearchFilter === 'odds' ? 'active' : ''}`} onClick={() => setActiveSearchFilter('odds')}>Odds & Analysis</button>
                        <button className={`filter-chip ${activeSearchFilter === 'h2h' ? 'active' : ''}`} onClick={() => setActiveSearchFilter('h2h')}>Head-to-Head</button>
                        <button className={`filter-chip ${activeSearchFilter === 'tactical' ? 'active' : ''}`} onClick={() => setActiveSearchFilter('tactical')}>Tactical Brief</button>
                    </div>

                    <div className="search-bar">
                        <div className="search-input-wrap">
                            <span className="search-symbol">🔍</span>
                            <input 
                                value={googleQuery}
                                onChange={(e) => setGoogleQuery(e.target.value)}
                                className="search-input" 
                                type="search" 
                                placeholder="Search teams, match predictions, analysis..." 
                                onKeyDown={(e) => { if (e.key === 'Enter') executeGoogleSearch(); }} 
                            />
                        </div>
                        <button className="execute-search" onClick={executeGoogleSearch}>SEARCH</button>
                    </div>

                    <div className="google-results-frame">
                        <iframe src={iframeSrc} className="google-iframe-container" title="Google Search Section"></iframe>
                    </div>
                </div>
            </div>

            {/* PROFILE MODAL */}
            <div className={`profile-modal ${isProfileOpen ? 'active' : ''}`} onClick={(e) => { if (e.target.className.includes('profile-modal')) setIsProfileOpen(false); }}>
                <div className="profile-box" onClick={(e) => e.stopPropagation()}>
                    <div className="profile-avatar-large">
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" alt="Avatar" />
                    </div>
                    <h2 style={{ fontSize: '14px', fontWeight: 800 }}>USER PROFILE</h2>
                    
                    <div className="profile-user-info-list">
                        <div className="profile-field-row">
                            <span className="profile-field-label">Name</span>
                            <span className="profile-field-value">{userName}</span>
                        </div>
                        <div className="profile-field-row">
                            <span className="profile-field-label">Email</span>
                            <span className="profile-field-value">{userEmail}</span>
                        </div>
                        <div className="profile-field-row">
                            <span className="profile-field-label">Created At</span>
                            <span className="profile-field-value">{createdAt}</span>
                        </div>
                        <div className="profile-field-row">
                            <span className="profile-field-label">Role</span>
                            <span className={`role-badge ${isAdmin ? 'admin' : 'user'}`}>
                                {isAdmin ? 'ADMINISTRATOR' : 'MEMBER'}
                            </span>
                        </div>
                    </div>

                    <div className="profile-actions">
                        <button className="cancel-btn" onClick={() => setIsProfileOpen(false)}>Close</button>
                        <button className="logout-btn" onClick={logout}>Sign Out</button>
                    </div>
                </div>
            </div>

            <div className={`toast ${toast.show ? 'show' : ''}`}>
                <div className="toast-title">{toast.title}</div>
                <div className="toast-message">{toast.message}</div>
            </div>
        </div>
    );
}
