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

    // Supabase Synced Data States
    const [liveMatches, setLiveMatches] = useState([]);
    const [upcomingFixtures, setUpcomingFixtures] = useState([]);
    const [trendingFeeds, setTrendingFeeds] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const [googleQuery, setGoogleQuery] = useState('');
    const [iframeSrc, setIframeSrc] = useState('about:blank');
    
    // Toast state
    const [toast, setToast] = useState({ show: false, title: '', message: '' });
    const toastTimerRef = useRef(null);

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

        // Sync Data directly from Supabase Tables
        const fetchSupabaseFeeds = async () => {
            setLoadingData(true);
            try {
                // Fetch Live Matches
                const { data: matchesData } = await supabaseClient
                    .from('matches')
                    .select('*')
                    .eq('status', 'LIVE')
                    .limit(4);

                if (matchesData) setLiveMatches(matchesData);

                // Fetch Fixtures
                const { data: fixturesData } = await supabaseClient
                    .from('fixtures')
                    .select('*')
                    .order('match_time', { ascending: true })
                    .limit(4);

                if (fixturesData) setUpcomingFixtures(fixturesData);

                // Fetch Trending News Feeds
                const { data: feedsData } = await supabaseClient
                    .from('trending_feeds')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(4);

                if (feedsData) setTrendingFeeds(feedsData);

            } catch (err) {
                console.error("Error fetching Supabase data:", err);
            } finally {
                setLoadingData(false);
            }
        };

        verifySessionAndFetchProfile();
        fetchSupabaseFeeds();

        // Realtime Subscription Setup
        const matchSubscription = supabaseClient
            .channel('public:matches')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchSupabaseFeeds())
            .subscribe();

        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                navigate('/gateway', { replace: true });
            } else if (session?.user) {
                setUserEmail(session.user.email || 'Authenticated User');
            }
        });

        showToast("NOTICE 🔔", "System online & synchronized with Supabase.");

        return () => {
            clearInterval(clockInterval);
            subscription?.unsubscribe();
            supabaseClient.removeChannel(matchSubscription);
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
            case 'chats':
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
                    background: #060b13;
                    overflow-x: hidden;
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
                    --bg: #060b13;
                    --bg-2: #0b1422;
                    --surface: #0f1c2e;
                    --surface-solid: #13233a;
                    --border: rgba(255, 255, 255, 0.12);
                    --border-active: #00ffaa;
                    --text: #ffffff;
                    --muted: #b0c4de;
                    --dim: #7088a8;
                    --green: #00ffaa;
                    --cyan: #00e5ff;
                    --purple: #b026ff;
                    --orange: #ff7700;
                    --yellow: #ffea00;
                    --blue: #0088ff;
                    --pink: #ff2a85;
                    min-height: 100vh;
                    width: 100%;
                    max-width: 100vw;
                    color: var(--text);
                    background: var(--bg);
                    position: relative;
                    overflow-x: hidden;
                    perspective: 1000px;
                }

                /* --- 4D BACKGROUND ANIMATION SYSTEM --- */
                .background-4d-wrapper {
                    position: fixed;
                    inset: 0;
                    z-index: -5;
                    pointer-events: none;
                    overflow: hidden;
                    transform-style: preserve-3d;
                }

                .grid-plane-1 {
                    position: absolute;
                    width: 200%;
                    height: 200%;
                    top: -50%;
                    left: -50%;
                    background-image: 
                        linear-gradient(rgba(0, 255, 170, 0.08) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 255, 170, 0.08) 1px, transparent 1px);
                    background-size: 50px 50px;
                    transform: rotateX(60deg) translateZ(-100px);
                    animation: gridMove4D 20s linear infinite;
                }

                .grid-plane-2 {
                    position: absolute;
                    width: 200%;
                    height: 200%;
                    top: -50%;
                    left: -50%;
                    background-image: 
                        linear-gradient(rgba(0, 229, 255, 0.05) 1.5px, transparent 1.5px),
                        linear-gradient(90deg, rgba(0, 229, 255, 0.05) 1.5px, transparent 1.5px);
                    background-size: 80px 80px;
                    transform: rotateX(-45deg) translateZ(-50px);
                    animation: gridMove4DReverse 25s linear infinite;
                }

                .nebula-glow {
                    position: absolute;
                    width: 600px;
                    height: 600px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(176, 38, 255, 0.15) 0%, rgba(0, 255, 170, 0.08) 40%, transparent 70%);
                    filter: blur(80px);
                    animation: nebulaPulse 12s ease-in-out infinite alternate;
                }

                @keyframes gridMove4D {
                    0% { transform: rotateX(60deg) translateY(0px) translateZ(-100px); }
                    100% { transform: rotateX(60deg) translateY(50px) translateZ(-100px); }
                }

                @keyframes gridMove4DReverse {
                    0% { transform: rotateX(-45deg) translateY(0px) translateZ(-50px); }
                    100% { transform: rotateX(-45deg) translateY(-80px) translateZ(-50px); }
                }

                @keyframes nebulaPulse {
                    0% { top: -10%; left: 20%; transform: scale(1); }
                    100% { top: 40%; left: 50%; transform: scale(1.3); }
                }

                .scanline {
                    position: fixed;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(0, 255, 170, 0.6), transparent);
                    z-index: 10;
                    animation: scan 6s linear infinite;
                    pointer-events: none;
                    box-shadow: 0 0 10px rgba(0, 255, 170, 0.5);
                }

                @keyframes scan {
                    0% { top: -10%; opacity: 0; }
                    5% { opacity: 1; }
                    95% { opacity: 1; }
                    100% { top: 110%; opacity: 0; }
                }

                /* --- HEADER & NAVIGATION --- */
                .dashboard-header {
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 14px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    position: relative;
                    z-index: 50;
                }

                .logo {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                }

                .logo-icon {
                    width: 38px;
                    height: 38px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, var(--green), #007755);
                    box-shadow: 0 0 20px rgba(0, 255, 170, 0.4);
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
                    letter-spacing: 1px;
                }

                .dashboard-nav {
                    display: flex;
                    gap: 20px;
                    background: var(--surface-solid);
                    padding: 8px 18px;
                    border-radius: 30px;
                    border: 1px solid var(--border);
                }

                .dashboard-nav a {
                    color: var(--muted);
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 600;
                    transition: .2s ease;
                    position: relative;
                }

                .dashboard-nav a:hover, .dashboard-nav a.active {
                    color: var(--green);
                }

                .dashboard-nav a.active::after {
                    content: "";
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: -4px;
                    height: 2px;
                    background: var(--green);
                    box-shadow: 0 0 8px var(--green);
                }

                .nav-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                /* Solid Interactive Buttons */
                .solid-btn {
                    padding: 8px 16px;
                    border-radius: 8px;
                    background: var(--surface-solid);
                    border: 1px solid var(--border);
                    color: white;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }

                .solid-btn:hover {
                    border-color: var(--green);
                    background: #192d4a;
                    transform: translateY(-2px);
                    box-shadow: 0 0 12px rgba(0, 255, 170, 0.3);
                }

                .icon-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    background: var(--surface-solid);
                    color: var(--muted);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: .2s ease;
                    position: relative;
                }

                .icon-btn:hover {
                    color: white;
                    border-color: var(--green);
                    box-shadow: 0 0 10px rgba(0, 255, 170, 0.3);
                }

                .badge {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--pink);
                    box-shadow: 0 0 6px var(--pink);
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
                    box-shadow: 0 0 12px rgba(0, 255, 170, 0.3);
                    transition: .2s ease;
                }

                .avatar:hover {
                    transform: scale(1.08);
                }

                .avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .system-bar {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 0 auto 16px;
                    padding: 8px 16px;
                    border: 1px solid rgba(0, 255, 170, 0.3);
                    background: var(--surface-solid);
                    border-radius: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: var(--muted);
                    font-size: 12px;
                    font-weight: 600;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
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
                    animation: statusPulse 1.8s infinite;
                }

                @keyframes statusPulse {
                    50% { opacity: .3; transform: scale(.7); }
                }

                /* --- FUTURISTIC BANNER HERO --- */
                .futuristic-hero-banner {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 16px auto 20px;
                    background: linear-gradient(135deg, #0d192b 0%, #172a45 100%);
                    border: 1px solid var(--border);
                    border-left: 4px solid var(--green);
                    border-radius: 14px;
                    padding: 24px 20px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }

                .hero-tag {
                    color: var(--green);
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    margin-bottom: 6px;
                }

                .hero-title {
                    font-size: clamp(24px, 4vw, 38px);
                    font-weight: 900;
                    line-height: 1.15;
                    margin-bottom: 8px;
                    letter-spacing: -0.5px;
                }

                .hero-title span {
                    background: linear-gradient(90deg, var(--green), var(--cyan), var(--purple));
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                }

                .futuristic-prompt-container {
                    background: #08101c;
                    border: 1px solid rgba(0, 229, 255, 0.3);
                    border-radius: 10px;
                    padding: 14px;
                    margin: 16px auto 0;
                    max-width: 900px;
                    text-align: left;
                    box-shadow: inset 0 0 15px rgba(0,0,0,0.8);
                }

                .prompt-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 11px;
                    font-weight: 800;
                    color: var(--cyan);
                    text-transform: uppercase;
                    margin-bottom: 6px;
                }

                .dashboard-info-intro {
                    font-size: 12px;
                    color: var(--muted);
                    line-height: 1.5;
                }

                /* --- GRID CONTAINERS --- */
                .live-now-container {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 0 auto 20px;
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
                    letter-spacing: 0.5px;
                }

                .live-pulse-dot {
                    width: 8px;
                    height: 8px;
                    background: var(--pink);
                    border-radius: 50%;
                    box-shadow: 0 0 8px var(--pink);
                    animation: statusPulse 1s infinite;
                }

                .view-all-link {
                    color: var(--muted);
                    font-size: 12px;
                    font-weight: 700;
                    text-decoration: none;
                    transition: .2s;
                }

                .view-all-link:hover {
                    color: var(--green);
                }

                /* Live Matches Grid (Synced from Supabase) */
                .live-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 12px;
                }

                .live-card {
                    background: var(--surface-solid);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 12px;
                    position: relative;
                    cursor: pointer;
                    transition: .2s ease;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }

                .live-card:hover {
                    border-color: var(--green);
                    transform: translateY(-3px);
                    box-shadow: 0 0 15px rgba(0, 255, 170, 0.2);
                }

                .league-tag {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--dim);
                    text-align: center;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }

                .live-match-scoreboard {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }

                .team-col {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    width: 38%;
                    text-align: center;
                }

                .team-logo-placeholder {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 11px;
                    background: #08101c;
                    border-radius: 50%;
                    border: 1px solid var(--border);
                }

                .team-name-lbl {
                    font-size: 11px;
                    font-weight: 700;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%;
                }

                .score-center {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 24%;
                }

                .score-val {
                    font-size: 18px;
                    font-weight: 900;
                    color: white;
                }

                .match-time-badge {
                    font-size: 10px;
                    color: var(--green);
                    font-weight: 700;
                }

                .live-indicator-text {
                    font-size: 10px;
                    color: var(--pink);
                    font-weight: 800;
                    text-align: center;
                    margin-bottom: 6px;
                }

                .match-timeline-bar {
                    width: 100%;
                    height: 3px;
                    background: #08101c;
                    border-radius: 2px;
                    margin-bottom: 8px;
                    position: relative;
                    overflow: hidden;
                }

                .match-timeline-progress {
                    position: absolute;
                    left: 0; top: 0; bottom: 0;
                    background: var(--green);
                    border-radius: 2px;
                    box-shadow: 0 0 6px var(--green);
                }

                .match-events-footer {
                    font-size: 10px;
                    color: var(--dim);
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* Quick Actions Bar */
                .quick-actions-bar {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 0 auto 20px;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                }

                .qa-card {
                    background: var(--surface-solid);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    padding: 12px 14px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    transition: .2s;
                }

                .qa-card:hover {
                    border-color: var(--cyan);
                    background: #182a42;
                    transform: translateY(-2px);
                }

                .qa-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: white;
                }

                .qa-sub {
                    font-size: 10px;
                    color: var(--dim);
                    margin-top: 2px;
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
                    background: var(--surface-solid);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 16px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                }

                /* Upcoming Fixtures Item */
                .highlight-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }

                .highlight-item:last-child {
                    border-bottom: none;
                }

                .hl-league {
                    font-size: 10px;
                    color: var(--cyan);
                    font-weight: 700;
                    text-transform: uppercase;
                }

                .hl-teams {
                    font-weight: 700;
                    font-size: 13px;
                    color: white;
                    margin-top: 2px;
                }

                .hl-time {
                    text-align: right;
                    font-weight: 700;
                    color: var(--muted);
                    font-size: 12px;
                }

                .hl-date {
                    font-size: 10px;
                    color: var(--dim);
                }

                .reminder-bell {
                    background: rgba(0, 255, 170, 0.1);
                    border: 1px solid rgba(0, 255, 170, 0.3);
                    color: var(--green);
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: .2s;
                }

                .reminder-bell:hover {
                    background: var(--green);
                    color: #000;
                }

                /* Trending Item */
                .trending-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    cursor: pointer;
                }

                .trending-item:last-child {
                    border-bottom: none;
                }

                .trending-rank {
                    font-size: 15px;
                    font-weight: 900;
                    color: var(--green);
                    width: 20px;
                }

                .trending-thumb {
                    width: 42px;
                    height: 30px;
                    border-radius: 6px;
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
                    line-height: 1.3;
                }

                .trending-disc {
                    font-size: 10px;
                    color: var(--dim);
                    margin-top: 2px;
                }

                .cards-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 12px;
                }

                .card {
                    min-height: 140px;
                    padding: 16px 14px;
                    position: relative;
                    overflow: hidden;
                    border-radius: 12px;
                    background: var(--surface-solid);
                    border: 1px solid var(--border);
                    cursor: pointer;
                    transition: transform .2s ease, border-color .2s ease;
                }

                .card:hover {
                    transform: translateY(-3px);
                    border-color: var(--accent);
                    box-shadow: 0 0 15px rgba(0,0,0,0.5);
                }

                .card-icon {
                    width: 32px;
                    height: 32px;
                    margin: 0 auto 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--accent);
                }

                .card-title {
                    font-size: 14px;
                    font-weight: 800;
                    text-align: center;
                }

                .card-description {
                    margin: 4px auto 10px;
                    text-align: center;
                    color: var(--muted);
                    font-size: 11px;
                }

                .card-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: auto;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    padding-top: 8px;
                }

                .card-stat {
                    color: var(--accent);
                    font-size: 10px;
                    font-weight: 800;
                }

                .card-arrow {
                    color: var(--accent);
                    font-size: 12px;
                }

                .card-live { --accent: var(--green); }
                .card-ai { --accent: var(--cyan); }
                .card-chat { --accent: var(--purple); }
                .card-predictions { --accent: var(--orange); }
                .card-fixtures { --accent: var(--yellow); }
                .card-clubs { --accent: var(--blue); }

                /* MODALS & OVERLAYS */
                .dashboard-modal, .profile-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px;
                    background: rgba(0, 0, 0, .85);
                    backdrop-filter: blur(10px);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity .2s ease;
                }

                .dashboard-modal.active, .profile-modal.active {
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
                    border-radius: 14px;
                    background: #08101c;
                    box-shadow: 0 0 30px rgba(0, 255, 170, 0.3);
                }

                .search-frame-header {
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: var(--surface-solid);
                    border-bottom: 1px solid var(--border);
                }

                .search-brand-title { font-size: 13px; font-weight: 800; }
                .close-search { background: none; border: none; color: white; cursor: pointer; font-size: 16px; }

                .prediction-filters {
                    display: flex;
                    gap: 8px;
                    padding: 8px 12px;
                    background: #040810;
                }

                .filter-chip {
                    padding: 5px 12px;
                    border-radius: 6px;
                    border: 1px solid var(--border);
                    background: var(--surface-solid);
                    color: var(--muted);
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .filter-chip.active {
                    border-color: var(--green);
                    color: var(--green);
                    background: rgba(0, 255, 170, 0.1);
                }

                .search-bar {
                    display: flex;
                    gap: 8px;
                    padding: 10px 12px;
                    background: #08101c;
                }

                .search-input-wrap { flex: 1; position: relative; }
                .search-input {
                    width: 100%;
                    height: 36px;
                    padding: 0 12px 0 32px;
                    border-radius: 6px;
                    outline: none;
                    color: white;
                    background: #02050a;
                    border: 1px solid var(--border);
                    font-size: 12px;
                }

                .search-symbol { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); }
                .execute-search {
                    padding: 0 16px;
                    border: none;
                    border-radius: 6px;
                    background: var(--green);
                    color: #000;
                    font-weight: 800;
                    font-size: 11px;
                    cursor: pointer;
                }

                .google-results-frame { flex: 1; background: #fff; }
                .google-iframe-container { width: 100%; height: 100%; border: none; }

                /* Profile Box */
                .profile-box {
                    width: min(380px, 92%);
                    padding: 24px;
                    border: 1px solid var(--green);
                    border-radius: 14px;
                    background: var(--surface-solid);
                    text-align: center;
                    box-shadow: 0 0 30px rgba(0, 255, 170, 0.2);
                }

                .profile-avatar-large {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    margin: 0 auto 12px;
                    border: 2px solid var(--green);
                    overflow: hidden;
                }

                .profile-avatar-large img { width: 100%; height: 100%; object-fit: cover; }

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
                    background: #08101c;
                    border-radius: 6px;
                    border: 1px solid var(--border);
                    font-size: 12px;
                }

                .role-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; }
                .role-badge.admin { background: rgba(255, 42, 133, 0.2); color: var(--pink); border: 1px solid var(--pink); }
                .role-badge.user { background: rgba(0, 255, 170, 0.2); color: var(--green); border: 1px solid var(--green); }

                .profile-actions { display: flex; gap: 10px; margin-top: 16px; }
                .profile-actions button { flex: 1; }

                .dashboard-footer {
                    width: 100%;
                    background: #03060a;
                    border-top: 1px solid var(--border);
                    padding: 24px 16px;
                    margin-top: 30px;
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

                .footer-links { display: flex; gap: 16px; }
                .footer-links a { color: var(--muted); text-decoration: none; }
                .footer-links a:hover { color: var(--green); }

                .toast {
                    position: fixed;
                    right: 16px;
                    bottom: 16px;
                    z-index: 2000;
                    min-width: 240px;
                    padding: 10px 16px;
                    border: 1px solid var(--green);
                    border-radius: 8px;
                    background: #08101c;
                    transform: translateY(100px);
                    opacity: 0;
                    transition: .3s cubic-bezier(.175, .885, .32, 1.275);
                    box-shadow: 0 0 15px rgba(0, 255, 170, 0.3);
                }
                .toast.show { transform: translateY(0); opacity: 1; }
                .toast-title { color: var(--green); font-size: 12px; font-weight: 800; }
                .toast-message { color: #cbd5e1; font-size: 11px; margin-top: 2px; }

                @media(max-width:850px) {
                    .dashboard-nav { display: none; }
                    .live-cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .dashboard-main-grid { grid-template-columns: 1fr; }
                    .cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .quick-actions-bar { grid-template-columns: repeat(2, 1fr); }
                }
            `}</style>

            {/* 4D Background System */}
            <div className="background-4d-wrapper">
                <div className="grid-plane-1"></div>
                <div className="grid-plane-2"></div>
                <div className="nebula-glow"></div>
            </div>
            <div className="scanline"></div>

            <header className="dashboard-header">
                <div className="logo" onClick={() => navigateTo('home')}>
                    <div className="logo-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </button>
                    <button className="icon-btn" onClick={() => showToast('NOTIFICATIONS', 'No new alerts.')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    <span>SYSTEM CLOCK:</span>
                    <span>{clock}</span>
                </div>
            </div>

            {/* FUTURISTIC BANNER HERO */}
            <section className="futuristic-hero-banner">
                <div className="hero-tag">⚡ Next-Gen Football Intelligence</div>
                <h1 className="hero-title">SUPABASE <span>SYNCHRONIZED</span> HUB</h1>
                
                <div className="futuristic-prompt-container">
                    <div className="prompt-header">
                        <span>🤖 MTL AI PROMPT MATRIX</span>
                    </div>
                    <div className="dashboard-info-intro">
                        System actively processing global tactical metrics, odds movements, and live match data. Connect with fans, execute predictions, and monitor real-time scores across leagues.
                    </div>
                </div>
            </section>

            {/* CARD GRID */}
            <section className="live-now-container">
                <div className="cards-grid">
                    <div className="card card-live" onClick={() => navigateTo('group-chat')}>
                        <div className="card-icon">👥</div>
                        <h3 className="card-title">Group Chat</h3>
                        <p className="card-description">Join squad discussions and interact live.</p>
                        <div className="card-bottom">
                            <span className="card-stat">Live Groups</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-ai" onClick={() => navigateTo('ai-predictions')}>
                        <div className="card-icon">🧠</div>
                        <h3 className="card-title">AI Predictions</h3>
                        <p className="card-description">Deep tactical briefs & match analytics.</p>
                        <div className="card-bottom">
                            <span className="card-stat">AI ENGINE</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-chat" onClick={() => navigateTo('chats')}>
                        <div className="card-icon">📰</div>
                        <h3 className="card-title">Trending News</h3>
                        <p className="card-description">Latest breaking feeds & transfer alerts.</p>
                        <div className="card-bottom">
                            <span className="card-stat">Updated Live</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-predictions" onClick={() => navigateTo('predictions')}>
                        <div className="card-icon">🎯</div>
                        <h3 className="card-title">Predictions</h3>
                        <p className="card-description">Submit predictions and build your rank.</p>
                        <div className="card-bottom">
                            <span className="card-stat">User Picks</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-fixtures" onClick={() => navigateTo('fixtures')}>
                        <div className="card-icon">📅</div>
                        <h3 className="card-title">Fixtures</h3>
                        <p className="card-description">Browse complete competition schedules.</p>
                        <div className="card-bottom">
                            <span className="card-stat">Schedules</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-clubs" onClick={() => navigateTo('clubs')}>
                        <div className="card-icon">🏆</div>
                        <h3 className="card-title">Clubs</h3>
                        <p className="card-description">Schedules, team news, and squad rosters.</p>
                        <div className="card-bottom">
                            <span className="card-stat">650+ Teams</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* LIVE MATCHES CONTAINER - SYNCED FROM SUPABASE */}
            <section className="live-now-container">
                <div className="section-header-flex">
                    <div className="section-title-badge">
                        <span className="live-pulse-dot"></span>
                        <span>Live Matches (Supabase Synced)</span>
                    </div>
                    <a href="#live" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('live'); }}>View All Live 📡</a>
                </div>
                
                <div className="live-cards-grid">
                    {loadingData ? (
                        <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                            Syncing Live Matches from Supabase...
                        </div>
                    ) : liveMatches.length === 0 ? (
                        <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                            No live matches currently in progress.
                        </div>
                    ) : (
                        liveMatches.map((match) => (
                            <div key={match.id} className="live-card" onClick={() => navigateTo(`match-${match.id}`)}>
                                <div className="league-tag">{match.league || 'League Match'}</div>
                                <div className="live-match-scoreboard">
                                    <div className="team-col">
                                        <div className="team-logo-placeholder">{match.home_code || 'HOME'}</div>
                                        <span className="team-name-lbl">{match.home_team}</span>
                                    </div>
                                    <div className="score-center">
                                        <span className="score-val">{match.home_score ?? 0} - {match.away_score ?? 0}</span>
                                        <span className="match-time-badge">{match.minute || "0'"}</span>
                                    </div>
                                    <div className="team-col">
                                        <div className="team-logo-placeholder">{match.away_code || 'AWAY'}</div>
                                        <span className="team-name-lbl">{match.away_team}</span>
                                    </div>
                                </div>
                                <div className="live-indicator-text">● LIVE</div>
                                <div className="match-timeline-bar">
                                    <div className="match-timeline-progress" style={{ width: `${Math.min(parseInt(match.minute || 0), 100)}%` }}></div>
                                </div>
                                <div className="match-events-footer">{match.last_event || 'Match in progress'}</div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* QUICK ACTIONS BAR */}
            <div className="quick-actions-bar">
                <div className="qa-card" onClick={() => navigateTo('live')}>
                    <div>
                        <div className="qa-title">Match Centre</div>
                        <div className="qa-sub">Real-time stats</div>
                    </div>
                    <button className="solid-btn">Go →</button>
                </div>
                <div className="qa-card" onClick={() => navigateTo('notifications')}>
                    <div>
                        <div className="qa-title">Favorite Teams</div>
                        <div className="qa-sub">Track team alerts</div>
                    </div>
                    <button className="solid-btn">Track →</button>
                </div>
                <div className="qa-card" onClick={() => showToast('NOTIFICATIONS', 'Notifications Panel')}>
                    <div>
                        <div className="qa-title">Notifications</div>
                        <div className="qa-sub">Configure push alerts</div>
                    </div>
                    <button className="solid-btn">Manage</button>
                </div>
                <div className="qa-card" onClick={() => showToast('CALENDAR', 'Syncing calendar...')}>
                    <div>
                        <div className="qa-title">Calendar Sync</div>
                        <div className="qa-sub">Export schedule</div>
                    </div>
                    <button className="solid-btn">Sync</button>
                </div>
            </div>

            <main className="dashboard-container">
                <div className="dashboard-main-grid">
                    {/* UPCOMING FIXTURES - SYNCED FROM SUPABASE */}
                    <div className="dashboard-panel">
                        <div className="section-header-flex" style={{ marginBottom: '8px' }}>
                            <div className="section-title-badge">📅 Upcoming Fixtures</div>
                            <a href="#fixtures" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('fixtures'); }}>View All →</a>
                        </div>

                        {loadingData ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>Loading Fixtures...</div>
                        ) : upcomingFixtures.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>No upcoming fixtures scheduled.</div>
                        ) : (
                            upcomingFixtures.map((fixture) => (
                                <div key={fixture.id} className="highlight-item">
                                    <div>
                                        <div className="hl-league">{fixture.league}</div>
                                        <div className="hl-teams">{fixture.home_team} vs {fixture.away_team}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div className="hl-time">
                                            {fixture.match_date || 'Upcoming'}
                                            <div className="hl-date">{fixture.match_time || 'TBD'}</div>
                                        </div>
                                        <button className="reminder-bell" onClick={() => showToast('REMINDER', `Alert set for ${fixture.home_team} vs ${fixture.away_team}`)}>🔔</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* TRENDING FEEDS - SYNCED FROM SUPABASE */}
                    <div className="dashboard-panel">
                        <div className="section-header-flex" style={{ marginBottom: '8px' }}>
                            <div className="section-title-badge">🔥 Trending Feeds</div>
                            <a href="#trending" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('trending'); }}>View All →</a>
                        </div>

                        {loadingData ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>Loading Feeds...</div>
                        ) : trendingFeeds.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>No trending feeds available.</div>
                        ) : (
                            trendingFeeds.map((feed, idx) => (
                                <div key={feed.id || idx} className="trending-item" onClick={() => showToast('TRENDING', `Opening: ${feed.title}`)}>
                                    <div className="trending-rank">0{idx + 1}</div>
                                    <img className="trending-thumb" src={feed.image_url || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=100&q=80"} alt="News" />
                                    <div className="trending-info">
                                        <div className="trending-title">{feed.title}</div>
                                        <div className="trending-disc">{feed.comments_count || '0'} discussions • {feed.category || 'News'}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            <footer className="dashboard-footer">
                <div className="footer-content">
                    <div>
                        <div style={{ fontWeight: 900, color: 'white', marginBottom: '2px' }}>MTL FOOTBALL FANS HUB</div>
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
                        <div className="search-brand-title">🔍 Supabase & Google Integrated Search</div>
                        <button className="close-search" onClick={closeSearch}>✕</button>
                    </div>

                    <div className="prediction-filters">
                        <button className={`filter-chip ${activeSearchFilter === 'prediction' ? 'active' : ''}`} onClick={() => setActiveSearchFilter('prediction')}>Match Predictions</button>
                        <button className={`filter-chip ${activeSearchFilter === 'odds' ? 'active' : ''}`} onClick={() => setActiveSearchFilter('odds')}>Odds & Analysis</button>
                        <button className={`filter-chip ${activeSearchFilter === 'h2h' ? 'active' : ''}`} onClick={() => setActiveSearchFilter('h2h')}>Head-to-Head</button>
                    </div>

                    <div className="search-bar">
                        <div className="search-input-wrap">
                            <span className="search-symbol">🔍</span>
                            <input 
                                value={googleQuery}
                                onChange={(e) => setGoogleQuery(e.target.value)}
                                className="search-input" 
                                type="search" 
                                placeholder="Search queries..." 
                                onKeyDown={(e) => { if (e.key === 'Enter') executeGoogleSearch(); }} 
                            />
                        </div>
                        <button className="execute-search" onClick={executeGoogleSearch}>SEARCH</button>
                    </div>

                    <div className="google-results-frame">
                        <iframe src={iframeSrc} className="google-iframe-container" title="Search Iframe"></iframe>
                    </div>
                </div>
            </div>

            {/* PROFILE MODAL */}
            <div className={`profile-modal ${isProfileOpen ? 'active' : ''}`} onClick={(e) => { if (e.target.className.includes('profile-modal')) setIsProfileOpen(false); }}>
                <div className="profile-box" onClick={(e) => e.stopPropagation()}>
                    <div className="profile-avatar-large">
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" alt="Avatar" />
                    </div>
                    <h2 style={{ fontSize: '14px', fontWeight: 900 }}>USER PROFILE</h2>
                    
                    <div className="profile-user-info-list">
                        <div className="profile-field-row">
                            <span>Name</span>
                            <span>{userName}</span>
                        </div>
                        <div className="profile-field-row">
                            <span>Email</span>
                            <span>{userEmail}</span>
                        </div>
                        <div className="profile-field-row">
                            <span>Joined</span>
                            <span>{createdAt}</span>
                        </div>
                        <div className="profile-field-row">
                            <span>Role</span>
                            <span className={`role-badge ${isAdmin ? 'admin' : 'user'}`}>
                                {isAdmin ? 'ADMINISTRATOR' : 'MEMBER'}
                            </span>
                        </div>
                    </div>

                    <div className="profile-actions">
                        <button className="solid-btn" onClick={() => setIsProfileOpen(false)}>Close</button>
                        <button className="solid-btn" style={{ borderColor: 'var(--pink)', color: 'var(--pink)' }} onClick={logout}>Sign Out</button>
                    </div>
                </div>
            </div>

            {/* TOAST */}
            <div className={`toast ${toast.show ? 'show' : ''}`}>
                <div className="toast-title">{toast.title}</div>
                <div className="toast-message">{toast.message}</div>
            </div>
        </div>
    );
}
