
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://tyeiepytpzmjcutfhydw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZWllcHl0cHptamN1dGZoeWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTM2NTAsImV4cCI6MjA5NDg2OTY1MH0.1xSjCW6XJ-yEfAODlEHoL1HRU0OnQ6jeyDqUlVx9ESc";

export default function Dashboard() {
    const navigate = useNavigate();
    const [activeNav, setActiveNav] = useState('home');
    const [clock, setClock] = useState('00:00:00');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [activeSearchFilter, setActiveSearchFilter] = useState('prediction');
    const [userEmail, setUserEmail] = useState('Checking session...');
    const [googleQuery, setGoogleQuery] = useState('');
    const [iframeSrc, setIframeSrc] = useState('about:blank');
    
    // Toast state
    const [toast, setToast] = useState({ show: false, title: '', message: '' });
    const toastTimerRef = useRef(null);

    // Canvas ref
    const canvasRef = useRef(null);

    useEffect(() => {
        // Clock Interval
        const clockInterval = setInterval(() => {
            const now = new Date();
            setClock(now.toLocaleTimeString([], { hour12: false }));
        }, 1000);

        // Enhanced Supabase Auth & Email Sync Initialization
        if (typeof window !== 'undefined') {
            const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            // Check active session
            supabaseClient.auth.getSession().then(({ data: { session }, error }) => {
                if (error) throw error;
                if (session?.user?.email) {
                    setUserEmail(session.user.email);
                    localStorage.setItem("mtl_auth_token", session.access_token);
                } else {
                    const localToken = localStorage.getItem("mtl_auth_token");
                    setUserEmail(localToken ? 'Authenticated User' : 'Guest Session (Local Mode)');
                }
            }).catch(err => {
                console.error("Auth session retrieval error:", err);
                setUserEmail('Session Error (Local Mode)');
            });

            // Listen for auth state changes to keep email synced dynamically
            const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
                if (session?.user?.email) {
                    setUserEmail(session.user.email);
                }
            });

            return () => {
                subscription?.unsubscribe();
            };
        }

        showToast("MTL HUB", "Football Intelligence Network initialized.");

        return () => clearInterval(clockInterval);
    }, []);

    // Canvas Physics Engine (Continuous Money & Coin Rain with 3D Spin Effect)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const handleResize = () => {
            const wrap = canvas.parentElement;
            if (wrap) {
                canvas.width = wrap.clientWidth;
                canvas.height = wrap.clientHeight;
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);

        let items = [];
        let particles = [];
        let tiltX = 0;
        let tiltY = 0;
        let spawnTimer = 0;

        class MoneyItem {
            constructor(x, y) {
                this.x = x || Math.random() * (canvas.width || 300);
                this.y = y || -30;
                this.vx = (Math.random() - 0.5) * 3;
                this.vy = Math.random() * 2 + 1.5;
                this.radius = Math.random() * 6 + 12;
                this.type = Math.random() > 0.4 ? 'coin' : 'cash'; // Coin or banknote
                this.angle = Math.random() * Math.PI * 2;
                this.spinSpeed = (Math.random() - 0.5) * 0.08;
                this.scaleX = 1; // Used for 3D coin/bill rotation flip simulation
            }

            update() {
                this.vy += 0.12 + (tiltY * 0.05);
                this.vx += tiltX * 0.05;
                this.x += this.vx;
                this.y += this.vy;
                this.angle += this.spinSpeed;
                this.scaleX = Math.cos(this.angle);

                if (this.x - this.radius < 0) { this.x = this.radius; this.vx *= -0.6; }
                if (this.x + this.radius > canvas.width) { this.x = canvas.width - this.radius; this.vx *= -0.6; }
                if (this.y - this.radius < 0) { this.y = this.radius; this.vy *= -0.6; }
                if (this.y + this.radius > canvas.height) { 
                    this.y = canvas.height - this.radius; 
                    this.vy *= -0.45; 
                    this.vx *= 0.85;
                    if(Math.abs(this.vy) > 1) {
                        createSparkles(this.x, this.y, this.type === 'coin' ? '#fde047' : '#4ade80');
                    }
                }
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.scale(Math.abs(this.scaleX) < 0.1 ? 0.1 : this.scaleX, 1); // Simulate 3D rotation flip

                if (this.type === 'coin') {
                    // Draw Gold Coin
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fillStyle = '#f59e0b';
                    ctx.shadowColor = '#fde047';
                    ctx.shadowBlur = 10;
                    ctx.fill();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#fde047';
                    ctx.stroke();
                    ctx.closePath();

                    // Inner symbol ($)
                    ctx.fillStyle = '#fef08a';
                    ctx.font = `${Math.floor(this.radius * 1.1)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('$', 0, 1);
                } else {
                    // Draw Banknote
                    ctx.beginPath();
                    ctx.fillStyle = '#10b981';
                    ctx.shadowColor = '#059669';
                    ctx.shadowBlur = 8;
                    ctx.fillRect(-this.radius * 1.4, -this.radius * 0.8, this.radius * 2.8, this.radius * 1.6);
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = '#d1fae5';
                    ctx.strokeRect(-this.radius * 1.4, -this.radius * 0.8, this.radius * 2.8, this.radius * 1.6);
                    ctx.closePath();

                    // Banknote Detail
                    ctx.fillStyle = '#d1fae5';
                    ctx.font = `${Math.floor(this.radius * 0.8)}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('$', 0, 0);
                }

                ctx.restore();
            }
        }

        class Sparkle {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 5;
                this.vy = (Math.random() - 0.5) * 5;
                this.alpha = 1;
                this.color = color || '#fde047';
                this.size = Math.random() * 3 + 2;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.alpha -= 0.035;
            }
            draw() {
                ctx.save();
                ctx.globalAlpha = Math.max(this.alpha, 0);
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        const createSparkles = (x, y, color) => {
            for(let i = 0; i < 5; i++) {
                particles.push(new Sparkle(x, y, color));
            }
        };

        const handleOrientation = (event) => {
            if (event.gamma !== null) tiltX = event.gamma / 10;
            if (event.beta !== null) tiltY = event.beta / 10;
        };

        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation, true);
        }

        const handleCanvasClick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            items.push(new MoneyItem(mouseX, mouseY));
            createSparkles(mouseX, mouseY, '#fde047');
        };

        canvas.addEventListener('click', handleCanvasClick);

        const animateGame = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            spawnTimer++;
            if (spawnTimer % 20 === 0 && items.length < 30) {
                items.push(new MoneyItem(Math.random() * canvas.width, -30));
            }

            for (let i = items.length - 1; i >= 0; i--) {
                items[i].update();
                items[i].draw();
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                particles[i].draw();
                if (particles[i].alpha <= 0) {
                    particles.splice(i, 1);
                }
            }

            animationFrameId = requestAnimationFrame(animateGame);
        };
        animateGame();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (window.DeviceOrientationEvent) {
                window.removeEventListener('deviceorientation', handleOrientation, true);
            }
            if (canvas) canvas.removeEventListener('click', handleCanvasClick);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const showToast = (title, message) => {
        setToast({ show: true, title, message });
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 3000);
    };

    // Functional Routing using React Router's navigate hook mapping to exact redirect pages
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
            setIframeSrc('https://www.google.com/search?igu=1&q=football+intelligence+hub');
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
            const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            await supabaseClient.auth.signOut();
            localStorage.removeItem("mtl_auth_token");
        } catch(err) { console.error(err); }
        setIsProfileOpen(false);
        showToast("SESSION", "Signed out successfully. Redirecting...");
        setTimeout(() => {
            navigate('/auth');
        }, 800);
    };

    return (
        <div className="dashboard-root">
            <style>{`
                /* GLOBAL SYSTEM & ZERO WHITE SPACE */
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
                    font-family: "Segoe UI", Roboto, Arial, sans-serif;
                    -webkit-tap-highlight-color: transparent;
                }

                .dashboard-root {
                    --bg: #0a1422;
                    --bg-2: #101d2e;
                    --surface: rgba(25, 40, 60, 0.95);
                    --surface-strong: rgba(23, 38, 57, 0.99);
                    --border: rgba(255, 255, 255, 0.28);
                    --border-active: rgba(52, 211, 153, 0.95);
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
                    width: 100vw;
                    color: var(--text);
                    background: 
                        radial-gradient(circle at 50% -10%, rgba(16, 185, 129, .2), transparent 34%),
                        radial-gradient(circle at 10% 30%, rgba(6, 182, 212, .1), transparent 25%),
                        radial-gradient(circle at 90% 70%, rgba(168, 85, 247, .08), transparent 25%),
                        var(--bg);
                    position: relative;
                }

                /* BACKGROUND EFFECTS */
                .background-grid {
                    position: fixed;
                    inset: 0;
                    z-index: -4;
                    pointer-events: none;
                    background-image: linear-gradient(rgba(255, 255, 255, .03) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(255, 255, 255, .03) 1px, transparent 1px);
                    background-size: 45px 45px;
                    mask-image: linear-gradient(to bottom, black, transparent 85%);
                }

                .scanline {
                    position: fixed;
                    left: 0;
                    width: 100%;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(16, 185, 129, .4), transparent);
                    z-index: -1;
                    animation: scan 8s linear infinite;
                    pointer-events: none;
                }

                @keyframes scan {
                    0% { top: -10%; opacity: 0; }
                    10% { opacity: .8; }
                    90% { opacity: .8; }
                    100% { top: 110%; opacity: 0; }
                }

                .hero-glow {
                    position: fixed;
                    width: 900px;
                    height: 500px;
                    left: 50%;
                    top: -280px;
                    transform: translateX(-50%);
                    background: radial-gradient(circle, rgba(16, 185, 129, .25), rgba(6, 182, 212, .12) 35%, transparent 70%);
                    filter: blur(55px);
                    animation: ambientGlow 8s ease-in-out infinite alternate;
                    pointer-events: none;
                    z-index: -2;
                }

                @keyframes ambientGlow {
                    from { opacity: .45; transform: translateX(-50%) scale(1); }
                    to { opacity: .9; transform: translateX(-50%) scale(1.15); }
                }

                /* HEADER */
                .dashboard-header {
                    width: 100%;
                    max-width: 1300px;
                    margin: auto;
                    padding: 18px 24px;
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
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #10b981, #047857);
                    box-shadow: 0 0 20px rgba(16, 185, 129, .4);
                }

                .logo-text {
                    display: flex;
                    flex-direction: column;
                }

                .logo-sub {
                    color: var(--green);
                    font-size: 8px;
                    font-weight: 900;
                    letter-spacing: 2.5px;
                }

                .logo-main {
                    font-size: 14px;
                    font-weight: 900;
                    letter-spacing: 1px;
                }

                .dashboard-nav {
                    display: flex;
                    gap: 20px;
                }

                .dashboard-nav a {
                    color: var(--muted);
                    text-decoration: none;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 1.2px;
                    text-transform: uppercase;
                    position: relative;
                    transition: .25s ease;
                }

                .dashboard-nav a:hover, .dashboard-nav a.active {
                    color: white;
                }

                .dashboard-nav a.active::after {
                    content: "";
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: -6px;
                    height: 2px;
                    background: var(--green);
                    box-shadow: 0 0 8px var(--green);
                }

                .nav-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .icon-btn {
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    border: 1px solid var(--border);
                    background: rgba(255, 255, 255, .08);
                    color: var(--muted);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: .25s ease;
                    position: relative;
                }

                .icon-btn:hover {
                    color: white;
                    border-color: var(--border-active);
                    background: rgba(16, 185, 129, .2);
                    box-shadow: 0 0 15px rgba(16, 185, 129, .3);
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
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    overflow: hidden;
                    border: 2px solid var(--green);
                    cursor: pointer;
                    box-shadow: 0 0 12px rgba(16, 185, 129, .25);
                    transition: .25s ease;
                }

                .avatar:hover {
                    transform: scale(1.08);
                    box-shadow: 0 0 20px rgba(16, 185, 129, .5);
                }

                .avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                /* SYSTEM STATUS BAR */
                .system-bar {
                    width: calc(100% - 32px);
                    max-width: 1180px;
                    margin: 0 auto 16px;
                    min-height: 32px;
                    padding: 6px 12px;
                    border: 1px solid rgba(16, 185, 129, .3);
                    background: rgba(16, 185, 129, .08);
                    border-radius: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: var(--muted);
                    font-size: 8px;
                    letter-spacing: 1px;
                    text-transform: uppercase;
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
                    box-shadow: 0 0 8px var(--green);
                    animation: statusPulse 1.8s infinite;
                }

                @keyframes statusPulse {
                    50% { opacity: .35; transform: scale(.7); }
                }

                /* HERO / INTELLIGENCE BANNER */
                .game-section {
                    width: calc(100% - 32px);
                    max-width: 1180px;
                    margin: 20px auto;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    padding: 16px;
                    position: relative;
                }

                .game-canvas-wrap {
                    position: relative;
                    width: 100%;
                    height: 340px;
                    background: rgba(0,0,0,0.65);
                    border-radius: 10px;
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.1);
                }

                #gameCanvas {
                    display: block;
                    width: 100%;
                    height: 100%;
                }

                .hero {
                    position: absolute;
                    top: 60px;
                    left: 50%;
                    transform: translateX(-50%);
                    text-align: center;
                    padding: 10px 20px;
                    z-index: 10;
                    pointer-events: none;
                    width: 100%;
                }

                .welcome {
                    color: var(--green);
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: 4px;
                    text-transform: uppercase;
                    margin-bottom: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
                }

                .welcome::before, .welcome::after {
                    content: "";
                    width: 30px;
                    height: 1px;
                    background: rgba(16, 185, 129, .6);
                }

                .hero-title {
                    font-size: clamp(28px, 5.5vw, 48px);
                    font-weight: 950;
                    line-height: .95;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    text-shadow: 0 4px 12px rgba(0,0,0,0.9);
                }

                .hero-title span {
                    background: linear-gradient(90deg, #10b981, #06b6d4, #a855f7);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    filter: drop-shadow(0 0 15px rgba(16, 185, 129, .4));
                }

                .hero-sub {
                    margin-top: 8px;
                    color: var(--muted);
                    font-size: 9.5px;
                    letter-spacing: .8px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
                }

                /* LIVE NOW SECTION */
                .live-now-container {
                    width: calc(100% - 32px);
                    max-width: 1180px;
                    margin: 0 auto 24px;
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
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: 1px;
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
                    color: var(--muted);
                    font-size: 9px;
                    font-weight: 800;
                    text-decoration: none;
                    letter-spacing: 1px;
                    text-transform: uppercase;
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
                    gap: 12px;
                }

                .live-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 14px;
                    position: relative;
                    cursor: pointer;
                    transition: .25s ease;
                }

                .live-card:hover {
                    border-color: var(--border-active);
                    transform: translateY(-3px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.6);
                }

                .league-tag {
                    font-size: 7px;
                    font-weight: 900;
                    color: var(--muted);
                    text-align: center;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin-bottom: 10px;
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
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 11px;
                    background: rgba(255,255,255,0.08);
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.2);
                }

                .team-name-lbl {
                    font-size: 8px;
                    font-weight: 800;
                    letter-spacing: .5px;
                    text-transform: uppercase;
                }

                .score-center {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 30%;
                }

                .score-val {
                    font-size: 18px;
                    font-weight: 900;
                    letter-spacing: 1px;
                    color: white;
                }

                .match-time-badge {
                    font-size: 7px;
                    color: var(--green);
                    font-weight: 900;
                }

                .live-indicator-text {
                    font-size: 6.5px;
                    color: #ef4444;
                    font-weight: 900;
                    letter-spacing: 1px;
                    text-align: center;
                    margin-bottom: 6px;
                }

                .match-timeline-bar {
                    width: 100%;
                    height: 2px;
                    background: rgba(255,255,255,0.15);
                    border-radius: 2px;
                    margin-bottom: 8px;
                    position: relative;
                }

                .match-timeline-progress {
                    position: absolute;
                    left: 0; top: 0; bottom: 0;
                    background: var(--green);
                    border-radius: 2px;
                }

                .match-events-footer {
                    font-size: 7px;
                    color: var(--dim);
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                /* QUICK ACTIONS BAR */
                .quick-actions-bar {
                    width: calc(100% - 32px);
                    max-width: 1180px;
                    margin: 0 auto 24px;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                }

                .qa-card {
                    background: var(--surface);
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
                    background: rgba(16, 185, 129, 0.12);
                }

                .qa-title {
                    font-size: 8.5px;
                    font-weight: 900;
                    color: white;
                    text-transform: uppercase;
                }

                .qa-sub {
                    font-size: 6.5px;
                    color: var(--dim);
                    margin-top: 2px;
                }

                /* MAIN DASHBOARD GRID */
                .dashboard-container {
                    width: calc(100% - 32px);
                    max-width: 1180px;
                    margin: auto;
                    padding-bottom: 40px;
                }

                .dashboard-main-grid {
                    display: grid;
                    grid-template-columns: 1.2fr 0.8fr;
                    gap: 16px;
                    margin-bottom: 16px;
                }

                .dashboard-panel {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    padding: 18px;
                    backdrop-filter: blur(14px);
                }

                /* UPCOMING HIGHLIGHTS LIST */
                .highlight-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    font-size: 9px;
                }

                .highlight-item:last-child {
                    border-bottom: none;
                }

                .hl-league {
                    font-size: 6.5px;
                    color: var(--dim);
                    font-weight: 900;
                    letter-spacing: .8px;
                    text-transform: uppercase;
                }

                .hl-teams {
                    font-weight: 800;
                    font-size: 9px;
                    color: white;
                    margin-top: 2px;
                }

                .hl-time {
                    text-align: right;
                    font-weight: 800;
                    color: var(--muted);
                    font-size: 8px;
                }

                .hl-date {
                    font-size: 6.5px;
                    color: var(--dim);
                }

                .reminder-bell {
                    background: rgba(16, 185, 129, 0.15);
                    border: 1px solid rgba(16, 185, 129, 0.4);
                    color: var(--green);
                    width: 24px;
                    height: 24px;
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

                /* TRENDING NOW LIST */
                .trending-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    cursor: pointer;
                }

                .trending-item:last-child {
                    border-bottom: none;
                }

                .trending-rank {
                    font-size: 14px;
                    font-weight: 950;
                    color: var(--green);
                    width: 20px;
                }

                .trending-thumb {
                    width: 40px;
                    height: 30px;
                    border-radius: 6px;
                    object-fit: cover;
                    border: 1px solid rgba(255,255,255,0.15);
                }

                .trending-info {
                    flex: 1;
                }

                .trending-title {
                    font-size: 9px;
                    font-weight: 800;
                    color: white;
                    line-height: 1.3;
                }

                .trending-disc {
                    font-size: 7px;
                    color: var(--dim);
                    margin-top: 2px;
                }

                /* FOOTBALL AT A GLANCE STATS & SCORERS */
                .stats-grid-4 {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                    margin-bottom: 14px;
                }

                .stat-box-mini {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    padding: 8px;
                    text-align: center;
                }

                .stat-box-val {
                    font-size: 12px;
                    font-weight: 900;
                    color: white;
                }

                .stat-box-lbl {
                    font-size: 6.5px;
                    color: var(--dim);
                    text-transform: uppercase;
                    margin-top: 2px;
                }

                .stat-box-growth {
                    font-size: 6px;
                    color: var(--green);
                    margin-top: 2px;
                }

                .scorers-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-top: 12px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding-top: 12px;
                }

                .scorer-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    font-size: 8.5px;
                    padding: 4px 0;
                }

                /* AI FOOTBALL BRIEF PANEL */
                .ai-brief-box {
                    background: linear-gradient(145deg, rgba(6, 182, 212, 0.1), rgba(168, 85, 247, 0.1));
                    border: 1px solid rgba(6, 182, 212, 0.3);
                    border-radius: 12px;
                    padding: 14px;
                    margin-top: 16px;
                }

                .ai-brief-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    font-size: 9px;
                    font-weight: 900;
                    color: var(--cyan);
                    letter-spacing: 1px;
                }

                .ai-brief-content {
                    display: flex;
                    gap: 14px;
                    align-items: center;
                }

                .ai-visual-orb {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(6,182,212,0.4), rgba(168,85,247,0.2));
                    border: 1px solid var(--cyan);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 15px rgba(6,182,212,0.4);
                    flex-shrink: 0;
                }

                .clock-hand-hour {
                    transform-origin: 12px 12px;
                    animation: rotateHour 43200s linear infinite;
                }
                .clock-hand-min {
                    transform-origin: 12px 12px;
                    animation: rotateMin 3600s linear infinite;
                }
                .clock-hand-sec {
                    transform-origin: 12px 12px;
                    animation: rotateSec 60s steps(60) infinite;
                }

                @keyframes rotateHour {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes rotateMin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes rotateSec {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .ai-bullet-list {
                    list-style: none;
                    font-size: 8.5px;
                    color: var(--muted);
                    line-height: 1.4;
                }

                .ai-bullet-list li {
                    position: relative;
                    padding-left: 10px;
                    margin-bottom: 4px;
                }

                .ai-bullet-list li::before {
                    content: "•";
                    position: absolute;
                    left: 0;
                    color: var(--cyan);
                }

                /* CARDS GRID FOR FEATURES */
                .cards-grid {
                    display: grid;
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 14px;
                }

                .card {
                    min-height: 170px;
                    padding: 18px 16px;
                    position: relative;
                    overflow: hidden;
                    border-radius: 12px;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    backdrop-filter: blur(14px);
                    cursor: pointer;
                    transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
                }

                .card:hover {
                    transform: translateY(-4px);
                    border-color: var(--accent);
                    box-shadow: 0 12px 35px rgba(0, 0, 0, .5);
                }

                .card-number {
                    position: absolute;
                    top: 10px;
                    left: 12px;
                    color: #94a3b8;
                    font-size: 8px;
                    font-weight: 900;
                }

                .card-icon {
                    width: 38px;
                    height: 38px;
                    margin: 4px auto 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--accent);
                }

                .card-title {
                    font-size: 12px;
                    font-weight: 900;
                    letter-spacing: .8px;
                    text-transform: uppercase;
                    text-align: center;
                }

                .card-description {
                    max-width: 250px;
                    margin: 4px auto 8px;
                    text-align: center;
                    color: var(--muted);
                    font-size: 8.5px;
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
                    font-size: 7px;
                    font-weight: 900;
                    text-transform: uppercase;
                }

                .card-arrow {
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    color: var(--accent);
                }

                .card-live { --accent: #10b981; }
                .card-ai { --accent: #06b6d4; }
                .card-chat { --accent: #a855f7; }
                .card-predictions { --accent: #f97316; }
                .card-fixtures { --accent: #14b8a6; }
                .card-clubs { --accent: #84cc16; }

                /* GOOGLE SEARCH MODAL */
                .dashboard-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 14px;
                    background: rgba(0, 4, 8, .92);
                    backdrop-filter: blur(16px);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity .25s ease;
                }

                .dashboard-modal.active {
                    opacity: 1;
                    pointer-events: auto;
                }

                .search-frame {
                    width: min(1050px, 100%);
                    height: min(750px, 92vh);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                    border: 1px solid rgba(16, 185, 129, .5);
                    border-radius: 16px;
                    background: #071019;
                    box-shadow: 0 0 60px rgba(16, 185, 129, .25);
                }

                .search-frame-header {
                    min-height: 55px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 14px;
                    background: rgba(10, 20, 30, .98);
                    border-bottom: 1px solid rgba(16, 185, 129, .25);
                }

                .search-brand {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .search-brand-icon {
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    color: var(--green);
                    border: 1px solid rgba(16, 185, 129, .4);
                    background: rgba(16, 185, 129, .15);
                }

                .search-brand-title {
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: 1.2px;
                    text-transform: uppercase;
                }

                .search-brand-sub {
                    font-size: 7px;
                    color: var(--dim);
                }

                .close-search {
                    width: 30px;
                    height: 30px;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, .15);
                    background: rgba(255, 255, 255, .08);
                    color: var(--muted);
                    cursor: pointer;
                }

                .prediction-filters {
                    display: flex;
                    gap: 6px;
                    padding: 8px 12px;
                    background: rgba(6, 13, 21, .98);
                    border-bottom: 1px solid rgba(255, 255, 255, .08);
                    overflow-x: auto;
                }

                .filter-chip {
                    padding: 5px 10px;
                    border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, .12);
                    background: rgba(255, 255, 255, .04);
                    color: var(--muted);
                    font-size: 8px;
                    font-weight: 800;
                    letter-spacing: .8px;
                    text-transform: uppercase;
                    cursor: pointer;
                    white-space: nowrap;
                }

                .filter-chip:hover, .filter-chip.active {
                    color: white;
                    border-color: var(--green);
                    background: rgba(16, 185, 129, .2);
                }

                .search-bar {
                    display: flex;
                    gap: 8px;
                    padding: 10px 12px;
                    background: rgba(5, 11, 18, .98);
                    border-bottom: 1px solid rgba(255, 255, 255, .08);
                }

                .search-input-wrap {
                    flex: 1;
                    position: relative;
                }

                .search-input {
                    width: 100%;
                    height: 38px;
                    padding: 0 14px 0 36px;
                    border-radius: 8px;
                    outline: none;
                    color: white;
                    background: #02070c;
                    border: 1px solid rgba(16, 185, 129, .4);
                    font-size: 11px;
                }

                .search-symbol {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--green);
                }

                .execute-search {
                    min-width: 90px;
                    border: none;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: #00140d;
                    font-weight: 900;
                    font-size: 9px;
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
                    min-height: 28px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 6px 12px;
                    color: #94a3b8;
                    background: #071019;
                    border-top: 1px solid rgba(16, 185, 129, .2);
                    font-size: 7px;
                    text-transform: uppercase;
                }

                /* PROFILE MODAL */
                .profile-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 900;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0, 0, 0, .85);
                    backdrop-filter: blur(15px);
                    opacity: 0;
                    pointer-events: none;
                    transition: .25s;
                }

                .profile-modal.active { opacity: 1; pointer-events: auto; }

                .profile-box {
                    width: min(380px, 90%);
                    padding: 22px;
                    border: 1px solid rgba(16, 185, 129, .4);
                    border-radius: 14px;
                    background: rgba(9, 17, 28, .98);
                    text-align: center;
                }

                .profile-user-info {
                    padding: 10px;
                    margin: 15px 0;
                    background: rgba(255, 255, 255, .05);
                    border-radius: 8px;
                    font-size: 11px;
                    color: var(--green);
                }

                .profile-actions { display: flex; gap: 8px; }
                .profile-actions button {
                    flex: 1;
                    padding: 10px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 9px;
                    font-weight: 900;
                    text-transform: uppercase;
                }
                .cancel-btn { color: var(--muted); background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); }
                .logout-btn { color: white; background: #ef4444; border: none; }

                /* FOOTER */
                .dashboard-footer {
                    width: 100%;
                    background: rgba(4, 8, 14, 0.98);
                    border-top: 1px solid var(--border);
                    padding: 30px 20px;
                    margin-top: 40px;
                    color: var(--muted);
                    font-size: 9px;
                }

                .footer-content {
                    max-width: 1180px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 20px;
                }

                .footer-links {
                    display: flex;
                    gap: 15px;
                }

                .footer-links a {
                    color: var(--muted);
                    text-decoration: none;
                    transition: color 0.2s;
                }

                .footer-links a:hover {
                    color: var(--green);
                }

                /* TOAST */
                .toast {
                    position: fixed;
                    right: 16px;
                    bottom: 16px;
                    z-index: 2000;
                    min-width: 240px;
                    padding: 10px 14px;
                    border: 1px solid rgba(16, 185, 129, .5);
                    border-radius: 10px;
                    background: rgba(8, 16, 26, .98);
                    transform: translateY(120px);
                    opacity: 0;
                    transition: .35s cubic-bezier(.175, .885, .32, 1.275);
                }
                .toast.show { transform: translateY(0); opacity: 1; }
                .toast-title { color: var(--green); font-size: 8px; font-weight: 900; letter-spacing: 1px; }
                .toast-message { color: #cbd5e1; font-size: 9px; margin-top: 2px; }

                /* RESPONSIVE */
                @media(max-width:850px) {
                    .dashboard-nav { display: none; }
                    .live-cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .dashboard-main-grid { grid-template-columns: 1fr; }
                    .cards-grid { grid-template-columns: repeat(2, 1fr); }
                    .quick-actions-bar { grid-template-columns: repeat(2, 1fr); }
                }
            `}</style>

            {/* BACKGROUND */}
            <div className="background-grid"></div>
            <div className="scanline"></div>
            <div className="hero-glow"></div>

            {/* HEADER */}
            <header className="dashboard-header">
                <div className="logo" onClick={() => navigateTo('home')}>
                    <div className="logo-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
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
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </button>
                    <button className="icon-btn" onClick={() => showToast('NOTIFICATIONS', 'No critical alerts detected.')}>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

            {/* SYSTEM BAR */}
            <div className="system-bar">
                <div className="status-left">
                    <span className="status-dot"></span>
                    <span>ONLINE</span>
                </div>
                <div className="status-right">
                    <span>NODE: E096RGDSV-01</span>
                    <span>TIME</span>
                    <span id="clock">{clock}</span>
                </div>
            </div>

            {/* MONEY & COIN RAIN ANIMATION SECTION */}
            <section className="game-section">
                <div className="hero">
                    <div className="welcome">The Pulse of Football</div>
                    <h1 className="hero-title">FOOTBALL<br /><span>INTELLIGENCE</span></h1>
                    <p className="hero-sub">Real-time updates. Smart insights. All in one place.</p>
                </div>

                <div className="section-header-flex" style={{ marginBottom: '10px', position: 'relative', zIndex: 15 }}>
                    <div className="section-title-badge">MTL</div>
                    <span style={{ fontSize: '7px', color: 'var(--muted)' }}>PFH</span>
                </div>
                <div className="game-canvas-wrap" id="canvasWrap">
                    <canvas ref={canvasRef} id="gameCanvas"></canvas>
                </div>

                <div className="dashboard-panel" style={{ marginTop: '14px', position: 'relative', zIndex: 15 }}>
                    <div className="ai-brief-box">
                        <div className="ai-brief-header">
                            <span>🤖 AI Football Brief</span>
                            <span style={{ fontSize: '7px', color: 'var(--dim)' }}>POWERED BY MTL TECH</span>
                        </div>
                        <div className="ai-brief-content">
                            <div className="ai-visual-orb">
                                <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5">
                                    <circle cx="12" cy="12" r="9"/>
                                    <line className="clock-hand-hour" x1="12" y1="12" x2="12" y2="7" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" />
                                    <line className="clock-hand-min" x1="12" y1="12" x2="16" y2="12" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" />
                                    <line className="clock-hand-sec" x1="12" y1="12" x2="12" y2="5" stroke="#f43f5e" strokeWidth="1" strokeLinecap="round" />
                                    <circle cx="12" cy="12" r="1.5" fill="var(--cyan)" />
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontSize: '8.5px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Here's your 60-second football briefing for today:</div>
                                <ul className="ai-bullet-list">
                                    <li>Arsenal maintain strong form with a crucial win over Chelsea.</li>
                                    <li>Real Madrid struggle in defense but stay in the title race.</li>
                                    <li>Liverpool prepare for a massive clash against Man United.</li>
                                    <li>Transfer market heating up with several top clubs in action.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CORE HUB MODULE CARDS */}
            <section className="live-now-container">
                <div className="cards-grid">
                    <div className="card card-live" onClick={() => navigateTo('group-chat')}>
                        <span className="card-number">01</span>
                        <div className="card-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h3 className="card-title">Group Chat</h3>
                        <p className="card-description">Join fan squads and discuss matches in real time.</p>
                        <div className="card-bottom">
                            <span className="card-stat">32 Active Groups</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-ai" onClick={() => navigateTo('ai-predictions')}>
                        <span className="card-number">02</span>
                        <div className="card-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l4 2" />
                                <circle cx="12" cy="12" r="2" />
                            </svg>
                        </div>
                        <h3 className="card-title">AI Football</h3>
                        <p className="card-description">Match intelligence, tactical analysis and AI briefs.</p>
                        <div className="card-bottom">
                            <span className="card-stat">MTL AI ENGINE</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-chat" onClick={() => navigateTo('chats')}>
                        <span className="card-number">03</span>
                        <div className="card-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h3 className="card-title">Chat</h3>
                        <p className="card-description">Talk football with thousands of supporters online.</p>
                        <div className="card-bottom">
                            <span className="card-stat">8.4K ONLINE</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-predictions" onClick={() => navigateTo('predictions')}>
                        <span className="card-number">04</span>
                        <div className="card-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
                        <span className="card-number">05</span>
                        <div className="card-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
                        <span className="card-number">06</span>
                        <div className="card-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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

            {/* LIVE NOW MATCHES CAROUSEL */}
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
                        <div className="match-events-footer">25' Kane (G) | 33' Reus (G) 77' Adeyemi</div>
                    </div>
                </div>
            </section>

            {/* QUICK ACTIONS BAR */}
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

            {/* MAIN CONTAINER - DASHBOARD GRID */}
            <main className="dashboard-container">
                <div className="dashboard-main-grid">
                    <div className="dashboard-panel">
                        <div className="section-header-flex" style={{ marginBottom: '8px' }}>
                            <div className="section-title-badge">📅 Upcoming Highlights</div>
                            <a href="#fixtures" className="view-all-link" onClick={(e) => { e.preventDefault(); navigateTo('fixtures'); }}>View Fixtures →</a>
                        </div>

                        <div className="highlight-item">
                            <div>
                                <div className="hl-league">Champions League</div>
                                <div className="hl-teams">Man City vs PSG</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="hl-time">Today<div className="hl-date">21:00</div></div>
                                <button className="reminder-bell" onClick={() => showToast('REMINDER', 'Match notification set!')}>🔔</button>
                            </div>
                        </div>

                        <div className="highlight-item">
                            <div>
                                <div className="hl-league">Premier League</div>
                                <div className="hl-teams">Liverpool vs Man United</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="hl-time">Tomorrow<div className="hl-date">18:30</div></div>
                                <button className="reminder-bell" onClick={() => showToast('REMINDER', 'Match notification set!')}>🔔</button>
                            </div>
                        </div>

                        <div className="highlight-item">
                            <div>
                                <div className="hl-league">La Liga</div>
                                <div className="hl-teams">Atletico Madrid vs Sevilla</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="hl-time">Sun, 18 May<div className="hl-date">20:00</div></div>
                                <button className="reminder-bell" onClick={() => showToast('REMINDER', 'Match notification set!')}>🔔</button>
                            </div>
                        </div>

                        <div className="highlight-item">
                            <div>
                                <div className="hl-league">Serie A</div>
                                <div className="hl-teams">Juventus vs Napoli</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="hl-time">Sun, 18 May<div className="hl-date">21:45</div></div>
                                <button className="reminder-bell" onClick={() => showToast('REMINDER', 'Match notification set!')}>🔔</button>
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-panel">
                        <div className="section-header-flex" style={{ marginBottom: '8px' }}>
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
                                <div className="trending-title">AFCON 2025 qualifiers: Big wins for Nigeria & Egypt</div>
                                <div className="trending-disc">1.2K discussions</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-main-grid">
                    <div className="dashboard-panel" style={{ gridColumn: 'span 2' }}>
                        <div className="section-title-badge" style={{ marginBottom: '12px' }}>📊 Football At A Glance</div>
                        
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
                                <div style={{ fontSize: '8px', fontWeight: 900, color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Top Scorers</div>
                                <div className="scorer-row"><span>1. K. Mbappé <span style={{ color: 'var(--dim)' }}>Real Madrid</span></span> <b>28</b></div>
                                <div className="scorer-row"><span>2. H. Kane <span style={{ color: 'var(--dim)' }}>Bayern Munich</span></span> <b>24</b></div>
                                <div className="scorer-row"><span>3. E. Haaland <span style={{ color: 'var(--dim)' }}>Man City</span></span> <b>22</b></div>
                            </div>
                            <div>
                                <div style={{ fontSize: '8px', fontWeight: 900, color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Top Assists</div>
                                <div className="scorer-row"><span>1. K. De Bruyne <span style={{ color: 'var(--dim)' }}>Man City</span></span> <b>17</b></div>
                                <div className="scorer-row"><span>2. L. Messi <span style={{ color: 'var(--dim)' }}>Inter Miami</span></span> <b>15</b></div>
                                <div className="scorer-row"><span>3. B. Fernandes <span style={{ color: 'var(--dim)' }}>Man United</span></span> <b>14</b></div>
                            </div>
                        </div>
                    </div>            
                </div>
            </main>

            {/* FOOTER */}
            <footer className="dashboard-footer">
                <div className="footer-content">
                    <div>
                        <div style={{ fontWeight: 900, color: 'white', marginBottom: '4px' }}>MTL FOOTBALL FANS HUB</div>
                        <div>© 2026 MTL Intelligence Network. All rights reserved.</div>
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
                                <div className="search-brand-sub">MTL INTELLIGENCE & PREDICTION SEARCH</div>
                            </div>
                        </div>
                        <button className="close-search" onClick={closeSearch}>×</button>
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
                        <iframe src={iframeSrc} className="google-iframe-container" title="Google Search Floating Container"></iframe>
                    </div>

                    <div className="search-footer">
                        <span>Google Floating Iframe Container Online</span>
                        <span>MTL • Prediction Index</span>
                    </div>
                </div>
            </div>

            {/* PROFILE MODAL */}
            <div className={`profile-modal ${isProfileOpen ? 'active' : ''}`} onClick={(e) => { if (e.target.className.includes('profile-modal')) setIsProfileOpen(false); }}>
                <div className="profile-box" onClick={(e) => e.stopPropagation()}>
                    <h2>User Profile</h2>
                    <p style={{ color: 'var(--muted)', fontSize: '9px', marginTop: '4px' }}>Connected to secure Supabase session.</p>
                    <div className="profile-user-info" id="profileUserEmail">{userEmail}</div>
                    <div className="profile-actions">
                        <button className="cancel-btn" onClick={() => setIsProfileOpen(false)}>Close</button>
                        <button className="logout-btn" onClick={logout}>Sign Out</button>
                    </div>
                </div>
            </div>

            {/* TOAST NOTIFICATION */}
            <div className={`toast ${toast.show ? 'show' : ''}`} id="toast">
                <div className="toast-title" id="toastTitle">{toast.title}</div>
                <div className="toast-message" id="toastMessage">{toast.message}</div>
            </div>
        </div>
    );
}
