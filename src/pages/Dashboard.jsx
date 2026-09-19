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
    
    // User Profile Details State
    const [userName, setUserName] = useState('Loading profile...');
    const [userEmail, setUserEmail] = useState('Checking session...');
    const [createdAt, setCreatedAt] = useState('N/A');
    const [isAdmin, setIsAdmin] = useState(false);

    // Live Supabase Feeds Data
    const [liveMatches, setLiveMatches] = useState([]);
    const [fixtures, setFixtures] = useState([]);
    const [trendingFeeds, setTrendingFeeds] = useState([]);
    const [isLoadingFeeds, setIsLoadingFeeds] = useState(true);

    const [googleQuery, setGoogleQuery] = useState('');
    const [iframeSrc, setIframeSrc] = useState('about:blank');
    
    // Toast state
    const [toast, setToast] = useState({ show: false, title: '', message: '' });
    const toastTimerRef = useRef(null);
    const canvasRef = useRef(null);

    // Canvas 4D Background Motion Mesh Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        // Particle 4D points matrix
        const numParticles = 60;
        const particles = Array.from({ length: numParticles }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            z: Math.random() * 1000,
            vz: Math.random() * 2 + 1,
            size: Math.random() * 2 + 1,
            color: Math.random() > 0.5 ? '#10b981' : '#06b6d4'
        }));

        let time = 0;
        const render = () => {
            time += 0.01;
            ctx.fillStyle = '#060b13';
            ctx.fillRect(0, 0, width, height);

            // Draw animated glowing mesh lines
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.07)';
            ctx.lineWidth = 1;
            for (let x = 0; x < width; x += 60) {
                const shiftY = Math.sin(time + x * 0.005) * 20;
                ctx.moveTo(x, 0);
                ctx.lineTo(x + shiftY, height);
            }
            for (let y = 0; y < height; y += 60) {
                const shiftX = Math.cos(time + y * 0.005) * 20;
                ctx.moveTo(0, y);
                ctx.lineTo(width, y + shiftX);
            }
            ctx.stroke();

            // Render 4D Warp Particles
            particles.forEach(p => {
                p.z -= p.vz;
                if (p.z <= 0) p.z = 1000;

                const k = 400 / p.z;
                const px = (p.x - width / 2) * k + width / 2;
                const py = (p.y - height / 2) * k + height / 2;
                const pSize = Math.max(0.1, p.size * k);

                if (px >= 0 && px <= width && py >= 0 && py <= height) {
                    ctx.beginPath();
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = Math.min(1, (1000 - p.z) / 1000);
                    ctx.arc(px, py, pSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.globalAlpha = 1.0;

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // Fetch Direct Supabase Live Feeds & Subscribe to Realtime Updates
    useEffect(() => {
        const fetchSupabaseFeeds = async () => {
            setIsLoadingFeeds(true);
            try {
                // Fetch Matches
                const { data: matchesData, error: matchesErr } = await supabaseClient
                    .from('matches')
                    .select('*')
                    .eq('status', 'LIVE')
                    .limit(4);
                
                if (!matchesErr && matchesData && matchesData.length > 0) {
                    setLiveMatches(matchesData);
                } else {
                    // Default Structured Fallback Data matching DB schema
                    setLiveMatches([
                        { id: 'm1', league: 'Premier League', home_team: 'Arsenal', away_team: 'Chelsea', home_code: 'ARS', away_code: 'CHE', home_score: 2, away_score: 1, minute: "78'", events: "72' Ødegaard (G) | 34' Sterling (G)" },
                        { id: 'm2', league: 'La Liga', home_team: 'Barcelona', away_team: 'Real Madrid', home_code: 'BAR', away_code: 'RMA', home_score: 1, away_score: 0, minute: "65'", events: "45' Lewandowski (G)" },
                        { id: 'm3', league: 'Serie A', home_team: 'AC Milan', away_team: 'Inter', home_code: 'ACM', away_code: 'INT', home_score: 0, away_score: 0, minute: "52'", events: "High intensity tactical clash" },
                        { id: 'm4', league: 'Bundesliga', home_team: 'Bayern', away_team: 'Dortmund', home_code: 'FCB', away_code: 'BVB', home_score: 1, away_score: 2, minute: "81'", events: "25' Kane (G) | 33' Reus (G)" }
                    ]);
                }

                // Fetch Fixtures
                const { data: fixturesData, error: fixturesErr } = await supabaseClient
                    .from('fixtures')
                    .select('*')
                    .order('scheduled_time', { ascending: true })
                    .limit(4);

                if (!fixturesErr && fixturesData && fixturesData.length > 0) {
                    setFixtures(fixturesData);
                } else {
                    setFixtures([
                        { id: 'f1', league: 'Champions League', title: 'Man City vs PSG', date_str: 'Today', time_str: '21:00' },
                        { id: 'f2', league: 'Premier League', title: 'Liverpool vs Man United', date_str: 'Tomorrow', time_str: '18:30' },
                        { id: 'f3', league: 'La Liga', title: 'Atletico Madrid vs Sevilla', date_str: 'Sun, 18 May', time_str: '20:00' },
                        { id: 'f4', league: 'Serie A', title: 'Juventus vs Napoli', date_str: 'Sun, 18 May', time_str: '21:45' }
                    ]);
                }

                // Fetch Trending Feeds
                const { data: trendingData, error: trendingErr } = await supabaseClient
                    .from('trending_feeds')
                    .select('*')
                    .order('rank', { ascending: true })
                    .limit(4);

                if (!trendingErr && trendingData && trendingData.length > 0) {
                    setTrendingFeeds(trendingData);
                } else {
                    setTrendingFeeds([
                        { id: 't1', rank: '01', title: 'Mbappé scores again as Real keep title hopes alive', discussions: '2.4K discussions', image_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=100&q=80' },
                        { id: 't2', rank: '02', title: 'Arsenal close in on star midfielder transfer', discussions: '1.8K discussions', image_url: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=100&q=80' },
                        { id: 't3', rank: '03', title: 'Xabi Alonso to replace Ancelotti?', discussions: '1.5K discussions', image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=100&q=80' },
                        { id: 't4', rank: '04', title: 'AFCON qualifiers: Big wins for Nigeria & Egypt', discussions: '1.2K discussions', image_url: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=100&q=80' }
                    ]);
                }
            } catch (err) {
                console.error("Supabase sync error:", err);
            } finally {
                setIsLoadingFeeds(false);
            }
        };

        fetchSupabaseFeeds();

        // Realtime Subscription
        const matchesSub = supabaseClient
            .channel('public:matches')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchSupabaseFeeds())
            .subscribe();

        return () => {
            supabaseClient.removeChannel(matchesSub);
        };
    }, []);

    useEffect(() => {
        const clockInterval = setInterval(() => {
            const now = new Date();
            setClock(now.toLocaleTimeString([], { hour12: false }));
        }, 1000);

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

        showToast("NOTICE 🔔", "Dashboard synchronized with Supabase.");

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
                    --bg-2: #0b1523;
                    --surface: #0e1a2b;
                    --surface-solid: #112238;
                    --border: rgba(16, 185, 129, 0.25);
                    --border-active: #10b981;
                    --text: #ffffff;
                    --muted: #94a3b8;
                    --dim: #64748b;
                    --green: #10b981;
                    --cyan: #06b6d4;
                    --purple: #a855f7;
                    --orange: #f97316;
                    --blue: #3b82f6;
                    min-height: 100vh;
                    width: 100%;
                    max-width: 100vw;
                    color: var(--text);
                    position: relative;
                    overflow-x: hidden;
                }

                .canvas-4d-bg {
                    position: fixed;
                    inset: 0;
                    z-index: -5;
                    pointer-events: none;
                }

                .scanline {
                    position: fixed;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, rgba(16, 185, 129, .6), transparent);
                    z-index: -1;
                    animation: scan 6s linear infinite;
                    pointer-events: none;
                }

                @keyframes scan {
                    0% { top: -10%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 110%; opacity: 0; }
                }

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
                    background: linear-gradient(135deg, #10b981, #047857);
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
                    border: 1px solid rgba(255,255,255,0.2);
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
                    gap: 20px;
                    background: var(--surface-solid);
                    padding: 6px 16px;
                    border-radius: 20px;
                    border: 1px solid var(--border);
                }

                .dashboard-nav a {
                    color: var(--muted);
                    text-decoration: none;
                    font-size: 12px;
                    font-weight: 600;
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
                    box-shadow: 0 0 8px var(--green);
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
                    border-color: var(--border-active);
                    background: rgba(16, 185, 129, .2);
                    box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
                }

                .badge {
                    width: 6px;
                    height: 6px;
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
                    box-shadow: 0 0 12px rgba(16, 185, 129, .4);
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
                    margin: 0 auto 12px;
                    min-height: 34px;
                    padding: 6px 14px;
                    border: 1px solid var(--border);
                    background: var(--surface-solid);
                    border-radius: 8px;
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
                    animation: statusPulse 1.8s infinite;
                }

                @keyframes statusPulse {
                    50% { opacity: .35; transform: scale(.7); }
                }

                /* FUTURISTIC PROMPT BANNER */
                .compact-hero-section {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 12px auto;
                    background: var(--surface-solid);
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    padding: 24px 20px;
                    text-align: center;
                    position: relative;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 15px rgba(16, 185, 129, 0.05);
                }

                .welcome {
                    color: var(--green);
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    margin-bottom: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .welcome::before, .welcome::after {
                    content: "";
                    width: 30px;
                    height: 1px;
                    background: rgba(16, 185, 129, .5);
                }

                .hero-title {
                    font-size: clamp(24px, 4vw, 38px);
                    font-weight: 900;
                    line-height: 1.15;
                    margin-bottom: 6px;
                    letter-spacing: -0.5px;
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

                .live-now-container {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 0 auto 18px;
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
                    font-size: 13px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                }

                .live-pulse-dot {
                    width: 8px;
                    height: 8px;
                    background: #ef4444;
                    border-radius: 50%;
                    box-shadow: 0 0 8px #ef4444;
                    animation: statusPulse 1s infinite;
                }

                .view-all-link {
                    color: var(--green);
                    font-size: 12px;
                    font-weight: 700;
                    text-decoration: none;
                    transition: .2s;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .view-all-link:hover {
                    color: white;
                    text-shadow: 0 0 8px var(--green);
                }

                .live-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 12px;
                }

                /* SOLID BACKGROUND CONTAINERS & BUTTONS */
                .live-card {
                    background: var(--surface-solid);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 12px 14px;
                    position: relative;
                    cursor: pointer;
                    transition: .2s ease;
                }

                .live-card:hover {
                    border-color: var(--border-active);
                    transform: translateY(-3px);
                    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.2);
                }

                .league-tag {
                    font-size: 10px;
                    font-weight: 700;
                    color: var(--green);
                    text-transform: uppercase;
                    text-align: center;
                    margin-bottom: 8px;
                    letter-spacing: 0.5px;
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
                    background: rgba(255,255,255,0.08);
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.2);
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
                    margin-bottom: 6px;
                }

                .match-timeline-bar {
                    width: 100%;
                    height: 3px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 2px;
                    margin-bottom: 8px;
                    position: relative;
                    overflow: hidden;
                }

                .match-timeline-progress {
                    position: absolute;
                    left: 0; top: 0; bottom: 0;
                    background: var(--green);
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

                .quick-actions-bar {
                    width: calc(100% - 24px);
                    max-width: 1140px;
                    margin: 0 auto 18px;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                }

                .qa-card {
                    background: var(--surface-solid);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    padding: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    transition: .2s;
                }

                .qa-card:hover {
                    border-color: var(--green);
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.25);
                }

                .qa-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: white;
                }

                .qa-sub {
                    font-size: 10px;
                    color: var(--muted);
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
                    gap: 14px;
                    margin-bottom: 14px;
                }

                .dashboard-panel {
                    background: var(--surface-solid);
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    padding: 16px;
                }

                .highlight-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    font-size: 12px;
                }

                .highlight-item:last-child {
                    border-bottom: none;
                }

                .hl-league {
                    font-size: 10px;
                    color: var(--green);
                    font-weight: 700;
                    text-transform: uppercase;
                }

                .hl-teams {
                    font-weight: 700;
                    font-size: 13px;
                    color: white;
                    margin-top: 1px;
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
                    background: rgba(16, 185, 129, 0.15);
                    border: 1px solid var(--border);
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
                    box-shadow: 0 0 10px var(--green);
                }

                .trending-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    cursor: pointer;
                }

                .trending-item:last-child {
                    border-bottom: none;
                }

                .trending-rank {
                    font-size: 14px;
                    font-weight: 900;
                    color: var(--green);
                    width: 20px;
                }

                .trending-thumb {
                    width: 42px;
                    height: 30px;
                    border-radius: 6px;
                    object-fit: cover;
                    border: 1px solid rgba(255,255,255,0.15);
                }

                .trending-info {
                    flex: 1;
                }

                .trending-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: white;
                    line-height: 1.25;
                }

                .trending-disc {
                    font-size: 10px;
                    color: var(--dim);
                    margin-top: 2px;
                }

                .stats-grid-4 {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin-bottom: 12px;
                }

                .stat-box-mini {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 8px;
                    text-align: center;
                }

                .stat-box-val {
                    font-size: 15px;
                    font-weight: 900;
                    color: white;
                }

                .stat-box-lbl {
                    font-size: 10px;
                    color: var(--dim);
                    margin-top: 2px;
                }

                .stat-box-growth {
                    font-size: 10px;
                    color: var(--green);
                    margin-top: 2px;
                    font-weight: 700;
                }

                .scorers-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-top: 12px;
                    border-top: 1px solid rgba(255,255,255,0.08);
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
                    min-height: 145px;
                    padding: 16px 14px;
                    position: relative;
                    overflow: hidden;
                    border-radius: 12px;
                    background: var(--surface-solid);
                    border: 1px solid var(--border);
                    cursor: pointer;
                    transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
                }

                .card:hover {
                    transform: translateY(-3px);
                    border-color: var(--accent);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
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
                    max-width: 240px;
                    margin: 4px auto 10px;
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
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    padding-top: 8px;
                }

                .card-stat {
                    color: var(--accent);
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                }

                .card-arrow {
                    width: 18px;
                    height: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: var(--accent);
                    font-size: 11px;
                }

                .card-live { --accent: #10b981; }
                .card-ai { --accent: #06b6d4; }
                .card-chat { --accent: #a855f7; }
                .card-predictions { --accent: #f97316; }
                .card-fixtures { --accent: #14b8a6; }
                .card-clubs { --accent: #84cc16; }

                /* MODALS & PROMPT CONTAINERS */
                .dashboard-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px;
                    background: rgba(4, 8, 14, 0.85);
                    backdrop-filter: blur(14px);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity .25s ease;
                }

                .dashboard-modal.active {
                    opacity: 1;
                    pointer-events: auto;
                }

                .search-frame {
                    width: min(960px, 100%);
                    height: min(700px, 90vh);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                    border: 1px solid var(--green);
                    border-radius: 14px;
                    background: #08111e;
                    box-shadow: 0 0 50px rgba(16, 185, 129, .25);
                }

                .search-frame-header {
                    min-height: 52px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 14px;
                    background: var(--surface-solid);
                    border-bottom: 1px solid var(--border);
                }

                .search-brand {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .search-brand-icon {
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    color: var(--green);
                    border: 1px solid var(--border);
                    background: rgba(16, 185, 129, .15);
                }

                .search-brand-title {
                    font-size: 13px;
                    font-weight: 800;
                }

                .search-brand-sub {
                    font-size: 10px;
                    color: var(--dim);
                }

                .close-search {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, .2);
                    background: rgba(255, 255, 255, .05);
                    color: var(--muted);
                    cursor: pointer;
                }

                .prediction-filters {
                    display: flex;
                    gap: 8px;
                    padding: 8px 12px;
                    background: #060c16;
                    border-bottom: 1px solid rgba(255, 255, 255, .06);
                    overflow-x: auto;
                }

                .filter-chip {
                    padding: 6px 12px;
                    border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, .15);
                    background: var(--surface-solid);
                    color: var(--muted);
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: .2s;
                }

                .filter-chip:hover, .filter-chip.active {
                    color: white;
                    border-color: var(--green);
                    background: rgba(16, 185, 129, .2);
                    box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
                }

                .search-bar {
                    display: flex;
                    gap: 8px;
                    padding: 10px 12px;
                    background: #050a12;
                    border-bottom: 1px solid rgba(255, 255, 255, .06);
                }

                .search-input-wrap {
                    flex: 1;
                    position: relative;
                }

                .search-input {
                    width: 100%;
                    height: 38px;
                    padding: 0 12px 0 36px;
                    border-radius: 8px;
                    outline: none;
                    color: white;
                    background: #02060b;
                    border: 1px solid var(--border);
                    font-size: 13px;
                }

                .search-symbol {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--green);
                    font-size: 14px;
                }

                .execute-search {
                    min-width: 90px;
                    border: none;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: #00140d;
                    font-weight: 800;
                    font-size: 12px;
                    cursor: pointer;
                    box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
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
                    min-height: 26px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 4px 12px;
                    color: #94a3b8;
                    background: var(--surface-solid);
                    border-top: 1px solid var(--border);
                    font-size: 10px;
                }

                .profile-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 900;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, .85);
                    backdrop-filter: blur(12px);
                    opacity: 0;
                    pointer-events: none;
                    transition: .2s;
                }

                .profile-modal.active { opacity: 1; pointer-events: auto; }

                .profile-box {
                    width: min(380px, 92%);
                    padding: 22px;
                    border: 1px solid var(--green);
                    border-radius: 14px;
                    background: var(--surface-solid);
                    text-align: center;
                    box-shadow: 0 0 40px rgba(16, 185, 129, 0.2);
                }

                .profile-avatar-large {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    margin: 0 auto 12px;
                    border: 2px solid var(--green);
                    overflow: hidden;
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
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
                    background: rgba(255, 255, 255, .03);
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, .06);
                    font-size: 12px;
                }

                .profile-field-label {
                    color: var(--dim);
                    font-weight: 700;
                    font-size: 10px;
                    text-transform: uppercase;
                }

                .profile-field-value {
                    color: white;
                    font-weight: 700;
                    word-break: break-all;
                }

                .role-badge {
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 800;
                }

                .role-badge.admin {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.4);
                }

                .role-badge.user {
                    background: rgba(16, 185, 129, 0.2);
                    color: var(--green);
                    border: 1px solid var(--border);
                }

                .profile-actions { display: flex; gap: 10px; margin-top: 16px; }
                .profile-actions button {
                    flex: 1;
                    padding: 10px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 800;
                }
                .cancel-btn { color: var(--muted); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); }
                .logout-btn { color: white; background: #ef4444; border: none; box-shadow: 0 0 10px rgba(239,68,68,0.4); }

                .dashboard-footer {
                    width: 100%;
                    background: #04080e;
                    border-top: 1px solid var(--border);
                    padding: 22px 16px;
                    margin-top: 28px;
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
                    gap: 14px;
                }

                .footer-links a {
                    color: var(--muted);
                    text-decoration: none;
                    font-weight: 600;
                }

                .footer-links a:hover {
                    color: var(--green);
                }

                .toast {
                    position: fixed;
                    right: 14px;
                    bottom: 14px;
                    z-index: 2000;
                    min-width: 240px;
                    padding: 10px 14px;
                    border: 1px solid var(--green);
                    border-radius: 10px;
                    background: var(--surface-solid);
                    transform: translateY(100px);
                    opacity: 0;
                    box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
                    transition: .3s cubic-bezier(.175, .885, .32, 1.275);
                }
                .toast.show { transform: translateY(0); opacity: 1; }
                .toast-title { color: var(--green); font-size: 11px; font-weight: 800; }
                .toast-message { color: #cbd5e1; font-size: 11px; margin-top: 2px; }

                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                .dashboard-info-intro {
                    font-size: 12px;
                    color: var(--muted);
                    line-height: 1.45;
                    margin-bottom: 8px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }

                .ai-brief-box-animated {
                    background: linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(168, 85, 247, 0.12), rgba(16, 185, 129, 0.12));
                    background-size: 200% 200%;
                    animation: gradientShift 8s ease infinite;
                    border: 1px solid var(--cyan);
                    border-radius: 12px;
                    padding: 14px;
                }

                @media(max-width:850px) {
                    .dashboard-nav { display: none; }
                    .live-cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .dashboard-main-grid { grid-template-columns: 1fr; }
                    .cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .quick-actions-bar { grid-template-columns: repeat(2, 1fr); }
                }
            `}</style>

            {/* 4D ANIMATED BACKGROUND MATRIX CANVAS */}
            <canvas ref={canvasRef} className="canvas-4d-bg" />
            <div className="scanline"></div>

            <header className="dashboard-header">
                <div className="logo" onClick={() => navigateTo('home')}>
                    <div className="logo-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </button>
                    <button className="icon-btn" onClick={() => showToast('NOTIFICATIONS', 'No new alerts.')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

            {/* FUTURISTIC PROMPT BANNER */}
            <section className="compact-hero-section">
                <div className="welcome">The Hub Of Football</div>
                <h1 className="hero-title">FOOTBALL <span>INTELLIGENCE</span></h1>
                <p className="hero-sub">Welcome To The Community.</p>

                <div className="ai-brief-box-animated" style={{ textAlign: 'left', maxWidth: '900px', margin: '0 auto' }}>
                    <div className="dashboard-info-intro">
                        A football intelligence hub refers to an advanced data analytics and tactical platform used to process match metrics, scout players and optimize team management. The MTL AI Engine continuously parses global fixtures, odds shifts and tactical data streams to deliver synchronized intelligence directly to the system.
                    </div>
                    <div className="ai-brief-content">
                        <div style={{ fontSize: '11px', fontWeight: 900, color: 'gold', letterSpacing: '0.5px' }}>THIS IS A COMMUNITY OF FOOTBALL FANS</div>
                    </div>
                </div>
            </section>

            <section className="live-now-container">
                <div className="cards-grid">
                    <div className="card card-live" onClick={() => navigateTo('group-chat')}>
                        <div className="card-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h3 className="card-title">TRENDING NEWS</h3>
                        <p className="card-description">Get football updates from all across the world.</p>
                        <div className="card-bottom">
                            <span className="card-stat">8.4K plus</span>
                            <span className="card-arrow">🗺️</span>
                        </div>
                    </div>

                    <div className="card card-predictions" onClick={() => navigateTo('predictions')}>
                        <div className="card-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

            {/* LIVE MATCHES CONTAINER SYNCED WITH SUPABASE */}
            <section className="live-now-container">
                <div className="section-header-flex">
                    <div className="section-title-badge">
                        <span className="live-pulse-dot"></span>
                        <span>Live Now ({liveMatches.length} Matches Live)</span>
                    </div>
                    <a href="#live" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('live'); }}>View All Live 📡</a>
                </div>
                
                <div className="live-cards-grid">
                    {isLoadingFeeds ? (
                        <div style={{ gridColumn: 'span 4', textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>Syncing Supabase live matches...</div>
                    ) : (
                        liveMatches.map((m) => (
                            <div key={m.id} className="live-card" onClick={() => navigateTo(`match-${m.id}`)}>
                                <div className="league-tag">{m.league}</div>
                                <div className="live-match-scoreboard">
                                    <div className="team-col">
                                        <div className="team-logo-placeholder" style={{ color: '#ef4444' }}>{m.home_code || m.home_team.substring(0,3).toUpperCase()}</div>
                                        <span className="team-name-lbl">{m.home_team}</span>
                                    </div>
                                    <div className="score-center">
                                        <span className="score-val">{m.home_score} - {m.away_score}</span>
                                        <span className="match-time-badge">{m.minute || 'LIVE'}</span>
                                    </div>
                                    <div className="team-col">
                                        <div className="team-logo-placeholder" style={{ color: '#3b82f6' }}>{m.away_code || m.away_team.substring(0,3).toUpperCase()}</div>
                                        <span className="team-name-lbl">{m.away_team}</span>
                                    </div>
                                </div>
                                <div className="live-indicator-text">● LIVE</div>
                                <div className="match-timeline-bar"><div className="match-timeline-progress" style={{ width: m.minute ? `${parseInt(m.minute)}%` : '60%' }}></div></div>
                                <div className="match-events-footer">{m.events || 'In Progress'}</div>
                            </div>
                        ))
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
                    {/* UPCOMING FIXTURES SYNCED FROM SUPABASE */}
                    <div className="dashboard-panel">
                        <div className="section-header-flex" style={{ marginBottom: '8px' }}>
                            <div className="section-title-badge">📅 Upcoming Highlights</div>
                            <a href="#fixtures" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('fixtures'); }}>View Fixtures →</a>
                        </div>

                        {fixtures.map((f) => (
                            <div key={f.id} className="highlight-item">
                                <div>
                                    <div className="hl-league">{f.league}</div>
                                    <div className="hl-teams">{f.title || `${f.home_team} vs ${f.away_team}`}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="hl-time">{f.date_str || 'Scheduled'}<div className="hl-date">{f.time_str || 'TBD'}</div></div>
                                    <button className="reminder-bell" onClick={() => showToast('REMINDER', 'Match notification set!')}>🔔</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* TRENDING FEEDS SYNCED FROM SUPABASE */}
                    <div className="dashboard-panel">
                        <div className="section-header-flex" style={{ marginBottom: '8px' }}>
                            <div className="section-title-badge">🔥 Trending Feeds</div>
                            <a href="#iq" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('trending'); }}>View All →</a>
                        </div>

                        {trendingFeeds.map((t) => (
                            <div key={t.id} className="trending-item" onClick={() => showToast('TRENDING', `Opening topic: ${t.title}`)}>
                                <div className="trending-rank">{t.rank || '01'}</div>
                                <img className="trending-thumb" src={t.image_url || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=100&q=80'} alt="Feed" />
                                <div className="trending-info">
                                    <div className="trending-title">{t.title}</div>
                                    <div className="trending-disc">{t.discussions || 'Active Discussions'}</div>
                                </div>
                            </div>
                        ))}
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
                                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--green)', marginBottom: '6px', textTransform: 'uppercase' }}>Top Scorers</div>
                                <div className="scorer-row"><span>1. K. Mbappé <span style={{ color: 'var(--dim)' }}>Real Madrid</span></span> <b>28</b></div>
                                <div className="scorer-row"><span>2. H. Kane <span style={{ color: 'var(--dim)' }}>Bayern</span></span> <b>24</b></div>
                                <div className="scorer-row"><span>3. E. Haaland <span style={{ color: 'var(--dim)' }}>Man City</span></span> <b>22</b></div>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--green)', marginBottom: '6px', textTransform: 'uppercase' }}>Top Assists</div>
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

            {/* GOOGLE SEARCH MODAL CONTAINER */}
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

            {/* USER PROFILE MODAL */}
            <div className={`profile-modal ${isProfileOpen ? 'active' : ''}`} onClick={(e) => { if (e.target.className.includes('profile-modal')) setIsProfileOpen(false); }}>
                <div className="profile-box" onClick={(e) => e.stopPropagation()}>
                    <div className="profile-avatar-large">
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" alt="Avatar" />
                    </div>
                    <h2 style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '1px' }}>USER PROFILE</h2>
                    
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
