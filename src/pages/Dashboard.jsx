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
                if (userRole === 'admin' || user.email?.endsWith('@admin.mtl.com')) {
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
                console.error("Strict session check failure:", err);
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

        showToast("MTL HUB", "Page view restored.");

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
            case 'chats':
                navigate('/chats');
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
                    background: #0a1422;
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
                    --bg: #0a1422;
                    --bg-2: #101d2e;
                    --surface: rgba(25, 40, 60, 0.95);
                    --surface-strong: rgba(23, 38, 57, 0.99);
                    --border: rgba(255, 255, 255, 0.15);
                    --border-active: rgba(52, 211, 153, 0.85);
                    --text: #ffffff;
                    --muted: #c4d2e3;
                    --dim: #91a4bb;
                    --green: #4ade80;
                    --cyan: #2dd4bf;
                    --purple: #d8b4fe;
                    --orange: #fb923c;
                    --yellow: #fde047;
                    --blue: #60a5fa;
                    --pink: #fb7185;
                    min-height: 100vh;
                    width: 100%;
                    max-width: 100vw;
                    color: var(--text);
                    background: 
                        radial-gradient(circle at 50% -10%, rgba(16, 185, 129, .15), transparent 34%),
                        radial-gradient(circle at 10% 30%, rgba(6, 182, 212, .08), transparent 25%),
                        var(--bg);
                    position: relative;
                    overflow-x: hidden;
                }

                .background-grid {
                    position: fixed;
                    inset: 0;
                    z-index: -4;
                    pointer-events: none;
                    background-image: linear-gradient(rgba(255, 255, 255, .02) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(255, 255, 255, .02) 1px, transparent 1px);
                    background-size: 35px 35px;
                    mask-image: linear-gradient(to bottom, black, transparent 90%);
                }

                .scanline {
                    position: fixed;
                    left: 0;
                    width: 100%;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(16, 185, 129, .3), transparent);
                    z-index: -1;
                    animation: scan 8s linear infinite;
                    pointer-events: none;
                }

                @keyframes scan {
                    0% { top: -10%; opacity: 0; }
                    10% { opacity: .6; }
                    90% { opacity: .6; }
                    100% { top: 110%; opacity: 0; }
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
                }

                .logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                }

                .logo-icon {
                    width: 34px;
                    height: 34px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #10b981, #047857);
                    box-shadow: 0 0 15px rgba(16, 185, 129, .3);
                }

                .logo-text {
                    display: flex;
                    flex-direction: column;
                }

                .logo-sub {
                    color: var(--green);
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }

                .logo-main {
                    font-size: 14px;
                    font-weight: 700;
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
                    font-weight: 500;
                    transition: .2s ease;
                    position: relative;
                }

                .dashboard-nav a:hover, .dashboard-nav a.active {
                    color: white;
                }

                .dashboard-nav a.active::after {
                    content: "";
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: -4px;
                    height: 2px;
                    background: var(--green);
                    box-shadow: 0 0 6px var(--green);
                }

                .nav-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .icon-btn {
                    width: 34px;
                    height: 34px;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    background: rgba(255, 255, 255, .05);
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
                    border-color: var(--border-active);
                    background: rgba(16, 185, 129, .15);
                }

                .badge {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #ef4444;
                    box-shadow: 0 0 4px #ef4444;
                    position: absolute;
                    right: 6px;
                    top: 6px;
                }

                .avatar {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 2px solid var(--green);
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(16, 185, 129, .2);
                    transition: .2s ease;
                }

                .avatar:hover {
                    transform: scale(1.05);
                }

                .avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .system-bar {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 0 auto 12px;
                    min-height: 32px;
                    padding: 6px 12px;
                    border: 1px solid rgba(16, 185, 129, .25);
                    background: rgba(16, 185, 129, .05);
                    border-radius: 6px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: var(--muted);
                    font-size: 12px;
                    font-weight: 500;
                }

                .status-left, .status-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--green);
                    box-shadow: 0 0 6px var(--green);
                    animation: statusPulse 1.8s infinite;
                }

                @keyframes statusPulse {
                    50% { opacity: .35; transform: scale(.7); }
                }

                /* Compact Hero Section replacing the game container */
                .compact-hero-section {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 12px auto;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 20px 16px;
                    text-align: center;
                    position: relative;
                }

                .welcome {
                    color: var(--green);
                    font-size: 12px;
                    font-weight: 600;
                    margin-bottom: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }

                .welcome::before, .welcome::after {
                    content: "";
                    width: 20px;
                    height: 1px;
                    background: rgba(16, 185, 129, .5);
                }

                .hero-title {
                    font-size: clamp(22px, 4vw, 36px);
                    font-weight: 800;
                    line-height: 1.15;
                    margin-bottom: 6px;
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
                    margin-bottom: 14px;
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
                    margin-bottom: 10px;
                }

                .section-title-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                    font-weight: 700;
                }

                .live-pulse-dot {
                    width: 6px;
                    height: 6px;
                    background: #ef4444;
                    border-radius: 50%;
                    box-shadow: 0 0 6px #ef4444;
                    animation: statusPulse 1s infinite;
                }

                .view-all-link {
                    color: var(--muted);
                    font-size: 12px;
                    font-weight: 600;
                    text-decoration: none;
                    transition: .2s;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .view-all-link:hover {
                    color: var(--green);
                }

                .live-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 10px;
                }

                .live-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    padding: 10px 12px;
                    position: relative;
                    cursor: pointer;
                    transition: .2s ease;
                }

                .live-card:hover {
                    border-color: var(--border-active);
                    transform: translateY(-2px);
                }

                .league-tag {
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--muted);
                    text-align: center;
                    margin-bottom: 6px;
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
                    gap: 3px;
                    width: 35%;
                }

                .team-logo-placeholder {
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 11px;
                    background: rgba(255,255,255,0.06);
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.15);
                }

                .team-name-lbl {
                    font-size: 11px;
                    font-weight: 600;
                }

                .score-center {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 30%;
                }

                .score-val {
                    font-size: 16px;
                    font-weight: 700;
                    color: white;
                }

                .match-time-badge {
                    font-size: 10px;
                    color: var(--green);
                    font-weight: 600;
                }

                .live-indicator-text {
                    font-size: 10px;
                    color: #ef4444;
                    font-weight: 700;
                    text-align: center;
                    margin-bottom: 4px;
                }

                .match-timeline-bar {
                    width: 100%;
                    height: 2px;
                    background: rgba(255,255,255,0.1);
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
                    gap: 8px;
                }

                .qa-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    transition: .2s;
                }

                .qa-card:hover {
                    border-color: var(--green);
                    background: rgba(16, 185, 129, 0.08);
                }

                .qa-title {
                    font-size: 12px;
                    font-weight: 600;
                    color: white;
                }

                .qa-sub {
                    font-size: 10px;
                    color: var(--dim);
                    margin-top: 1px;
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
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .dashboard-panel {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 14px;
                }

                .highlight-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    font-size: 12px;
                }

                .highlight-item:last-child {
                    border-bottom: none;
                }

                .hl-league {
                    font-size: 10px;
                    color: var(--dim);
                    font-weight: 600;
                }

                .hl-teams {
                    font-weight: 600;
                    font-size: 12px;
                    color: white;
                    margin-top: 1px;
                }

                .hl-time {
                    text-align: right;
                    font-weight: 600;
                    color: var(--muted);
                    font-size: 11px;
                }

                .hl-date {
                    font-size: 10px;
                    color: var(--dim);
                }

                .reminder-bell {
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    color: var(--green);
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
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

                .trending-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 6px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    cursor: pointer;
                }

                .trending-item:last-child {
                    border-bottom: none;
                }

                .trending-rank {
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--green);
                    width: 18px;
                }

                .trending-thumb {
                    width: 36px;
                    height: 26px;
                    border-radius: 4px;
                    object-fit: cover;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .trending-info {
                    flex: 1;
                }

                .trending-title {
                    font-size: 12px;
                    font-weight: 600;
                    color: white;
                    line-height: 1.25;
                }

                .trending-disc {
                    font-size: 10px;
                    color: var(--dim);
                    margin-top: 1px;
                }

                .stats-grid-4 {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                    margin-bottom: 10px;
                }

                .stat-box-mini {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 6px;
                    padding: 6px;
                    text-align: center;
                }

                .stat-box-val {
                    font-size: 13px;
                    font-weight: 700;
                    color: white;
                }

                .stat-box-lbl {
                    font-size: 9px;
                    color: var(--dim);
                    margin-top: 1px;
                }

                .stat-box-growth {
                    font-size: 9px;
                    color: var(--green);
                    margin-top: 1px;
                }

                .scorers-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-top: 10px;
                    border-top: 1px solid rgba(255,255,255,0.08);
                    padding-top: 10px;
                }

                .scorer-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 11px;
                    padding: 3px 0;
                }

                .cards-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 10px;
                }

                .card {
                    min-height: 140px;
                    padding: 14px 12px;
                    position: relative;
                    overflow: hidden;
                    border-radius: 10px;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    cursor: pointer;
                    transition: transform .2s ease, border-color .2s ease;
                }

                .card:hover {
                    transform: translateY(-2px);
                    border-color: var(--accent);
                }

                .card-number {
                    position: absolute;
                    top: 8px;
                    left: 10px;
                    color: #94a3b8;
                    font-size: 10px;
                    font-weight: 600;
                }

                .card-icon {
                    width: 30px;
                    height: 30px;
                    margin: 2px auto 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--accent);
                }

                .card-title {
                    font-size: 13px;
                    font-weight: 700;
                    text-align: center;
                }

                .card-description {
                    max-width: 220px;
                    margin: 2px auto 6px;
                    text-align: center;
                    color: var(--muted);
                    font-size: 11px;
                    line-height: 1.35;
                }

                .card-bottom {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: auto;
                    border-top: 1px solid rgba(255, 255, 255, 0.06);
                    padding-top: 6px;
                }

                .card-stat {
                    color: var(--accent);
                    font-size: 10px;
                    font-weight: 600;
                }

                .card-arrow {
                    width: 16px;
                    height: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--accent);
                    font-size: 10px;
                }

                .card-live { --accent: #10b981; }
                .card-ai { --accent: #06b6d4; }
                .card-chat { --accent: #a855f7; }
                .card-predictions { --accent: #f97316; }
                .card-fixtures { --accent: #14b8a6; }
                .card-clubs { --accent: #84cc16; }

                .dashboard-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px;
                    background: rgba(0, 4, 8, .9);
                    backdrop-filter: blur(12px);
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
                    position: relative;
                    border: 1px solid rgba(16, 185, 129, .4);
                    border-radius: 12px;
                    background: #071019;
                    box-shadow: 0 0 40px rgba(16, 185, 129, .2);
                }

                .search-frame-header {
                    min-height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: rgba(10, 20, 30, .98);
                    border-bottom: 1px solid rgba(16, 185, 129, .2);
                }

                .search-brand {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .search-brand-icon {
                    width: 26px;
                    height: 26px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    color: var(--green);
                    border: 1px solid rgba(16, 185, 129, .3);
                    background: rgba(16, 185, 129, .1);
                }

                .search-brand-title {
                    font-size: 12px;
                    font-weight: 700;
                }

                .search-brand-sub {
                    font-size: 10px;
                    color: var(--dim);
                }

                .close-search {
                    width: 26px;
                    height: 26px;
                    border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, .12);
                    background: rgba(255, 255, 255, .05);
                    color: var(--muted);
                    cursor: pointer;
                }

                .prediction-filters {
                    display: flex;
                    gap: 6px;
                    padding: 6px 10px;
                    background: rgba(6, 13, 21, .98);
                    border-bottom: 1px solid rgba(255, 255, 255, .06);
                    overflow-x: auto;
                }

                .filter-chip {
                    padding: 4px 10px;
                    border-radius: 4px;
                    border: 1px solid rgba(255, 255, 255, .1);
                    background: rgba(255, 255, 255, .03);
                    color: var(--muted);
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    white-space: nowrap;
                }

                .filter-chip:hover, .filter-chip.active {
                    color: white;
                    border-color: var(--green);
                    background: rgba(16, 185, 129, .15);
                }

                .search-bar {
                    display: flex;
                    gap: 6px;
                    padding: 8px 10px;
                    background: rgba(5, 11, 18, .98);
                    border-bottom: 1px solid rgba(255, 255, 255, .06);
                }

                .search-input-wrap {
                    flex: 1;
                    position: relative;
                }

                .search-input {
                    width: 100%;
                    height: 34px;
                    padding: 0 12px 0 32px;
                    border-radius: 6px;
                    outline: none;
                    color: white;
                    background: #02070c;
                    border: 1px solid rgba(16, 185, 129, .3);
                    font-size: 12px;
                }

                .search-symbol {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--green);
                    font-size: 12px;
                }

                .execute-search {
                    min-width: 80px;
                    border: none;
                    border-radius: 6px;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: #00140d;
                    font-weight: 700;
                    font-size: 11px;
                    cursor: pointer;
                }

                .google-results-frame {
                    flex: 1;
                    overflow: auto;
                    background: #ffffff;
                    position: relative;
                }

                .google-iframe-container {
                    width: 100%;
                    height: 100%;
                    border: none;
                }

                .search-footer {
                    min-height: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 4px 10px;
                    color: #94a3b8;
                    background: #071019;
                    border-top: 1px solid rgba(16, 185, 129, .15);
                    font-size: 10px;
                }

                .profile-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 900;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, .8);
                    backdrop-filter: blur(12px);
                    opacity: 0;
                    pointer-events: none;
                    transition: .2s;
                }

                .profile-modal.active { opacity: 1; pointer-events: auto; }

                .profile-box {
                    width: min(360px, 90%);
                    padding: 20px;
                    border: 1px solid rgba(16, 185, 129, .3);
                    border-radius: 12px;
                    background: rgba(9, 17, 28, .98);
                    text-align: center;
                }

                .profile-avatar-large {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    margin: 0 auto 10px;
                    border: 2px solid var(--green);
                    overflow: hidden;
                }

                .profile-avatar-large img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .profile-user-info-list {
                    margin: 14px 0;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    text-align: left;
                }

                .profile-field-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 6px 10px;
                    background: rgba(255, 255, 255, .03);
                    border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, .05);
                    font-size: 12px;
                }

                .profile-field-label {
                    color: var(--dim);
                    font-weight: 600;
                    font-size: 10px;
                }

                .profile-field-value {
                    color: white;
                    font-weight: 600;
                    word-break: break-all;
                }

                .role-badge {
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 600;
                }

                .role-badge.admin {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                }

                .role-badge.user {
                    background: rgba(16, 185, 129, 0.15);
                    color: var(--green);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }

                .profile-actions { display: flex; gap: 8px; margin-top: 14px; }
                .profile-actions button {
                    flex: 1;
                    padding: 8px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 600;
                }
                .cancel-btn { color: var(--muted); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); }
                .logout-btn { color: white; background: #ef4444; border: none; }

                .dashboard-footer {
                    width: 100%;
                    background: rgba(4, 8, 14, 0.98);
                    border-top: 1px solid var(--border);
                    padding: 20px 16px;
                    margin-top: 24px;
                    color: var(--muted);
                    font-size: 11px;
                }

                .footer-content {
                    max-width: 1140px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 14px;
                }

                .footer-links {
                    display: flex;
                    gap: 12px;
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
                    right: 12px;
                    bottom: 12px;
                    z-index: 2000;
                    min-width: 220px;
                    padding: 8px 12px;
                    border: 1px solid rgba(16, 185, 129, .4);
                    border-radius: 8px;
                    background: rgba(8, 16, 26, .98);
                    transform: translateY(100px);
                    opacity: 0;
                    transition: .3s cubic-bezier(.175, .885, .32, 1.275);
                }
                .toast.show { transform: translateY(0); opacity: 1; }
                .toast-title { color: var(--green); font-size: 11px; font-weight: 700; }
                .toast-message { color: #cbd5e1; font-size: 11px; margin-top: 1px; }

                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                .dashboard-info-intro {
                    font-size: 11px;
                    color: var(--muted);
                    line-height: 1.4;
                    margin-bottom: 8px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                }

                .ai-brief-box-animated {
                    background: linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08), rgba(16, 185, 129, 0.06));
                    background-size: 200% 200%;
                    animation: gradientShift 8s ease infinite;
                    border: 1px solid rgba(6, 182, 212, 0.3);
                    border-radius: 10px;
                    padding: 12px;
                }

                @media(max-width:850px) {
                    .dashboard-nav { display: none; }
                    .live-cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .dashboard-main-grid { grid-template-columns: 1fr; }
                    .cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .quick-actions-bar { grid-template-columns: repeat(2, 1fr); }
                }
            `}</style>

            <div className="background-grid"></div>
            <div className="scanline"></div>

            <header className="dashboard-header">
                <div className="logo" onClick={() => navigateTo('home')}>
                    <div className="logo-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
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
                    <button className="icon-btn" onClick={openSearch} title="Search Network (Ctrl+K)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </button>
                    <button className="icon-btn" onClick={() => showToast('NOTIFICATIONS', 'No notifications found.')}>
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
                    <span>TIME</span>
                    <span id="clock">{clock}</span>
                </div>
            </div>

            {/* COMPACT HERO SECTION (Game Logic & Container Removed) */}
            <section className="compact-hero-section">
                <div className="welcome">The Hub Of Football</div>
                <h1 className="hero-title">FOOTBALL <span>INTELLIGENCE</span></h1>
                <p className="hero-sub">Welcome To The Community.</p>

                <div className="ai-brief-box-animated" style={{ textAlign: 'left', maxWidth: '900px', margin: '0 auto' }}>
                    <div className="dashboard-info-intro">
                        A football intelligence hub refers to an advanced data analytics and tactical platform used to process match metrics, scout players and optimize team management. The MTL AI Engine continuously parses global fixtures, odds shifts and tactical data streams to deliver synchronized intelligence directly to the system.
                    </div>
                    <div className="ai-brief-content">
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'gold', letterSpacing: '0.5px' }}>THIS IS A COMMUNITY OF FOOTBALL FANS</div>
                    </div>
                </div>
            </section>

            <section className="live-now-container">
                <div className="cards-grid">
                    <div className="card card-live" onClick={() => navigateTo('group-chat')}>
                        <div className="card-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h3 className="card-title">Group Chat</h3>
                        <p className="card-description">Join fan squads and discuss matches in real time.</p>
                        <div className="card-bottom">
                            <span className="card-stat">Join Active Groups</span>
                            <span className="card-arrow">📡</span>
                        </div>
                    </div>

                    <div className="card card-ai" onClick={() => navigateTo('ai-predictions')}>
                        <div className="card-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l4 2" />
                                <circle cx="12" cy="12" r="2" />
                            </svg>
                        </div>
                        <h3 className="card-title">AI Football</h3>
                        <p className="card-description">Match intelligence, tactical analysis and AI briefs.</p>
                        <div className="card-bottom">
                            <span className="card-stat">MTL AI ENGINE</span>
                            <span className="card-arrow">🛸</span>
                        </div>
                    </div>

                    <div className="card card-chat" onClick={() => navigateTo('chats')}>
                        <div className="card-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h3 className="card-title">Chat</h3>
                        <p className="card-description">Talk football with thousands of supporters online.</p>
                        <div className="card-bottom">
                            <span className="card-stat">8.4K ONLINE</span>
                            <span className="card-arrow">💬</span>
                        </div>
                    </div>

                    <div className="card card-predictions" onClick={() => navigateTo('predictions')}>
                        <div className="card-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="6" />
                                <circle cx="12" cy="12" r="2" />
                            </svg>
                        </div>
                        <h3 className="card-title">Predictions</h3>
                        <p className="card-description">Make predictions, build your record and earn points.</p>
                        <div className="card-bottom">
                            <span className="card-stat">12.7K PICKS</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-fixtures" onClick={() => navigateTo('fixtures')}>
                        <div className="card-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                        <h3 className="card-title">Fixtures</h3>
                        <p className="card-description">Browse upcoming matches and competition schedules.</p>
                        <div className="card-bottom">
                            <span className="card-stat">128 MATCHES</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-clubs" onClick={() => navigateTo('clubs')}>
                        <div className="card-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
                                <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
                                <path d="M4 22h16" />
                                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
                            </svg>
                        </div>
                        <h3 className="card-title">Clubs</h3>
                        <p className="card-description">Discover clubs, squads, competitions and history.</p>
                        <div className="card-bottom">
                            <span className="card-stat">650+ CLUBS</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="live-now-container">
                <div className="section-header-flex">
                    <div className="section-title-badge">
                        <span className="live-pulse-dot"></span>
                        <span>Live Now (4 Matches Live)</span>
                    </div>
                    <a href="#live" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('live'); }}>View All Live 📡</a>
                </div>
                
                <div className="live-cards-grid">
                    <div className="live-card" onClick={() => navigateTo('match-arsenal-chelsea')}>
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

                    <div className="live-card" onClick={() => navigateTo('match-barcelona-madrid')}>
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

                    <div className="live-card" onClick={() => navigateTo('match-milan-inter')}>
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

                    <div className="live-card" onClick={() => navigateTo('match-bayern-dortmund')}>
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
                    <div className="dashboard-panel">
                        <div className="section-header-flex" style={{ marginBottom: '6px' }}>
                            <div className="section-title-badge">📅 Upcoming Highlights</div>
                            <a href="#fixtures" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('fixtures'); }}>View Fixtures →</a>
                        </div>

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
                    </div>

                    <div className="dashboard-panel">
                        <div className="section-header-flex" style={{ marginBottom: '6px' }}>
                            <div className="section-title-badge">🔥 Trending Now</div>
                            <a href="#iq" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('trending'); }}>View All →</a>
                        </div>

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
                    </div>
                </div>

                <div className="dashboard-main-grid">
                    <div className="dashboard-panel" style={{ gridColumn: 'span 2' }}>
                        <div className="section-title-badge" style={{ marginBottom: '10px' }}>⚽ Football At A Glance</div>
                        
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
                                <div style={{ fontSize: '9px', fontWeight: 900, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Top Scorers</div>
                                <div className="scorer-row"><span>1. K. Mbappé <span style={{ color: 'var(--dim)' }}>Real Madrid</span></span> <b>28</b></div>
                                <div className="scorer-row"><span>2. H. Kane <span style={{ color: 'var(--dim)' }}>Bayern</span></span> <b>24</b></div>
                                <div className="scorer-row"><span>3. E. Haaland <span style={{ color: 'var(--dim)' }}>Man City</span></span> <b>22</b></div>
                            </div>
                            <div>
                                <div style={{ fontSize: '9px', fontWeight: 900, color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Top Assists</div>
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

            {/* GOOGLE SEARCH MODAL */}
            <div className={`dashboard-modal ${isSearchOpen ? 'active' : ''}`} onClick={(e) => { if (e.target.className.includes('dashboard-modal')) closeSearch(); }}>
                <div className="search-frame" onClick={(e) => e.stopPropagation()}>
                    <div className="search-frame-header">
                        <div className="search-brand">
                            <div className="search-brand-icon">🔍</div>
                            <div>
                                <div className="search-brand-title">Google Network Search</div>
                                <div className="search-brand-sub">MTL QUICK SEARCH</div>
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

                    <div className="search-footer">
                        <span>Quick Search Section</span>
                    </div>
                </div>
            </div>

            {/* PROFILE MODAL */}
            <div className={`profile-modal ${isProfileOpen ? 'active' : ''}`} onClick={(e) => { if (e.target.className.includes('profile-modal')) setIsProfileOpen(false); }}>
                <div className="profile-box" onClick={(e) => e.stopPropagation()}>
                    <div className="profile-avatar-large">
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" alt="Avatar" />
                    </div>
                    <h2 style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '1px' }}>USER PROFILE</h2>
                    
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

            <div className={`toast ${toast.show ? 'show' : ''}`} id="toast">
                <div className="toast-title" id="toastTitle">{toast.title}</div>
                <div className="toast-message" id="toastMessage">{toast.message}</div>
            </div>
        </div>
    );
}
