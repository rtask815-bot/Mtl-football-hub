import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://tyeiepytpzmjcutfhydw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZWllcHl0cHptamN1dGZoeWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTM2NTAsImV4cCI6MjA5NDg2OTY1MH0.1xSjCW6XJ-yEfAODlEHoL1HRU0OnQ6jeyDqUlVx9ESc";

export default function Dashboard() {
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

        // Supabase Auth Init
        if (typeof window !== 'undefined') {
            const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            supabaseClient.auth.getSession().then(({ data: { session } }) => {
                setUserEmail(session?.user?.email || 'Guest Session (Local Mode)');
            }).catch(err => console.error(err));
        }

        showToast("MTL HUB", "Football Intelligence Network initialized.");

        return () => clearInterval(clockInterval);
    }, []);

    // Canvas Physics Engine with Liquid Accumulation
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

        let balls = [];
        let particles = [];
        let liquidPools = []; // Stores melted liquid heights along the bottom
        let tiltX = 0;
        let tiltY = 0;

        class Ball {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 6;
                this.vy = (Math.random() - 0.5) * 6 - 2;
                this.radius = 12;
                this.color = '#10b981';
                this.melted = false;
            }

            update() {
                if (this.melted) return;

                this.vy += 0.2 + (tiltY * 0.05);
                this.vx += tiltX * 0.05;
                this.x += this.vx;
                this.y += this.vy;

                if (this.x - this.radius < 0) { this.x = this.radius; this.vx *= -0.8; }
                if (this.x + this.radius > canvas.width) { this.x = canvas.width - this.radius; this.vx *= -0.8; }
                if (this.y - this.radius < 0) { this.y = this.radius; this.vy *= -0.8; }
                
                // When hitting the bottom floor, turn into liquid
                if (this.y + this.radius >= canvas.height) { 
                    this.melted = true;
                    liquidPools.push({ x: this.x, height: 12, alpha: 0.9, color: this.color });
                    createParticles(this.x, canvas.height - 5, '#06b6d4');
                }
            }

            draw() {
                if (this.melted) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.closePath();
                ctx.shadowBlur = 0;
            }
        }

        class Particle {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 8;
                this.vy = (Math.random() - 0.5) * 8;
                this.alpha = 1;
                this.color = color || '#f97316';
                this.size = Math.random() * 3 + 1;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.alpha -= 0.03;
            }
            draw() {
                ctx.save();
                ctx.globalAlpha = Math.max(this.alpha, 0);
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.size, this.size);
                ctx.restore();
            }
        }

        const createParticles = (x, y, color) => {
            for(let i = 0; i < 6; i++) {
                particles.push(new Particle(x, y, color));
            }
        };

        for (let i = 0; i < 6; i++) {
            balls.push(new Ball(80 + (i * 70), 50 + (i * 20)));
        }

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
            balls.push(new Ball(mouseX, mouseY));
            createParticles(mouseX, mouseY, '#10b981');
        };

        canvas.addEventListener('click', handleCanvasClick);

        const animateGame = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw accumulated liquid pool at the base
            ctx.beginPath();
            ctx.moveTo(0, canvas.height);
            let poolHeight = Math.min(canvas.height, 4 + liquidPools.length * 1.5);
            ctx.lineTo(0, canvas.height - poolHeight);
            ctx.quadraticCurveTo(canvas.width / 2, canvas.height - poolHeight - 4, canvas.width, canvas.height - poolHeight);
            ctx.lineTo(canvas.width, canvas.height);
            ctx.closePath();
            ctx.fillStyle = 'rgba(16, 185, 129, 0.55)';
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0;

            for (let i = 0; i < balls.length; i++) {
                balls[i].update();
                balls[i].draw();
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

    const navigateTo = (route) => {
        setActiveNav(route);
        showToast("ROUTING", `Opening ${route.toUpperCase()}`);
        // Handle explicit route changes if needed e.g., window.location.href = `/${route}`
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
        } catch(err) { console.error(err); }
        setIsProfileOpen(false);
        showToast("SESSION", "Signed out successfully. Redirecting...");
        setTimeout(() => {
            window.location.href = './auth.jsx';
        }, 800);
    };

    return (
        <div className="dashboard-root">
            <style>{`
                /* ZERO WHITE SPACE RESET */
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

                /* ANIMATED CLOCK HANDS */
                @keyframes rotateHour {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes rotateMinute {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(2160deg); }
                }
                .clock-hand-hour {
                    transform-origin: 12px 12px;
                    animation: rotateHour 43200s linear infinite;
                }
                .clock-hand-min {
                    transform-origin: 12px 12px;
                    animation: rotateMinute 3600s linear infinite;
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
                    pointer-events: none;
                    z-index: -2;
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
                }

                .hero-title {
                    font-size: clamp(28px, 5.5vw, 48px);
                    font-weight: 950;
                    line-height: .95;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                }

                .hero-title span {
                    background: linear-gradient(90deg, #10b981, #06b6d4, #a855f7);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                }

                .hero-sub {
                    margin-top: 8px;
                    color: var(--muted);
                    font-size: 9.5px;
                    letter-spacing: .8px;
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
                }

                .view-all-link {
                    color: var(--muted);
                    font-size: 9px;
                    font-weight: 800;
                    text-decoration: none;
                    letter-spacing: 1px;
                    text-transform: uppercase;
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

                /* CARDS GRID */
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
                    cursor: pointer;
                    transition: transform .25s ease, border-color .25s ease;
                }

                .card:hover {
                    transform: translateY(-4px);
                    border-color: var(--accent);
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

                /* AI FOOTBALL BRIEF */
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

                /* MODALS & FOOTER */
                .dashboard-modal, .profile-modal {
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

                .dashboard-modal.active, .profile-modal.active {
                    opacity: 1;
                    pointer-events: auto;
                }

                .search-frame {
                    width: min(1050px, 100%);
                    height: min(750px, 92vh);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid rgba(16, 185, 129, .5);
                    border-radius: 16px;
                    background: #071019;
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

                .close-search {
                    width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(255,255,255,.15); background: rgba(255,255,255,.08); color: var(--muted); cursor: pointer;
                }

                .prediction-filters {
                    display: flex; gap: 6px; padding: 8px 12px; background: rgba(6, 13, 21, .98); border-bottom: 1px solid rgba(255,255,255,.08); overflow-x: auto;
                }

                .filter-chip {
                    padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: var(--muted); font-size: 8px; font-weight: 800; cursor: pointer; white-space: nowrap;
                }
                .filter-chip.active { color: white; border-color: var(--green); background: rgba(16,185,129,.2); }

                .search-bar { display: flex; gap: 8px; padding: 10px 12px; background: rgba(5,11,18,.98); }
                .search-input-wrap { flex: 1; position: relative; }
                .search-input { width: 100%; height: 38px; padding: 0 14px 0 36px; border-radius: 8px; outline: none; color: white; background: #02070c; border: 1px solid rgba(16,185,129,.4); font-size: 11px; }
                .search-symbol { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--green); }
                .execute-search { min-width: 90px; border: none; border-radius: 8px; background: linear-gradient(135deg, #10b981, #059669); color: #00140d; font-weight: 900; font-size: 9px; cursor: pointer; }

                .google-results-frame { flex: 1; overflow: auto; background: #ffffff; }
                .google-iframe-container { width: 100%; height: 100%; border: none; }

                .profile-box {
                    width: min(380px, 90%); padding: 22px; border: 1px solid rgba(16,185,129,.4); border-radius: 14px; background: rgba(9,17,28,.98); text-align: center;
                }
                .profile-user-info { padding: 10px; margin: 15px 0; background: rgba(255,255,255,.05); border-radius: 8px; font-size: 11px; color: var(--green); }
                .profile-actions { display: flex; gap: 8px; }
                .profile-actions button { flex: 1; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 9px; font-weight: 900; text-transform: uppercase; }
                .cancel-btn { color: var(--muted); background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); }
                .logout-btn { color: white; background: #ef4444; border: none; }

                .dashboard-footer { width: 100%; background: rgba(4,8,14,0.98); border-top: 1px solid var(--border); padding: 30px 20px; margin-top: 40px; color: var(--muted); font-size: 9px; }
                .footer-content { max-width: 1180px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
                .footer-links { display: flex; gap: 15px; }
                .footer-links a { color: var(--muted); text-decoration: none; }

                .toast {
                    position: fixed; right: 16px; bottom: 16px; z-index: 2000; min-width: 240px; padding: 10px 14px; border: 1px solid rgba(16,185,129,.5); border-radius: 10px; background: rgba(8,16,26,.98); transform: translateY(120px); opacity: 0; transition: .35s;
                }
                .toast.show { transform: translateY(0); opacity: 1; }
                .toast-title { color: var(--green); font-size: 8px; font-weight: 900; }
                .toast-message { color: #cbd5e1; font-size: 9px; margin-top: 2px; }
            `}</style>

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
                    <button className="icon-btn" onClick={openSearch} title="Search Network">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </button>
                    <button className="icon-btn" onClick={() => showToast('NOTIFICATIONS', 'No critical alerts.')}>
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
                    <span>MTL HUB SYSTEM ONLINE</span>
                </div>
                <div className="status-right">
                    <span>NODE: KE-01</span>
                    <span>SECURE</span>
                    <span>{clock}</span>
                </div>
            </div>

            {/* GAME & LIQUID PHYSICS SECTION */}
            <section className="game-section">
                <div className="hero">
                    <div className="welcome">The Pulse of Football</div>
                    <h1 className="hero-title">FOOTBALL<br /><span>INTELLIGENCE</span></h1>
                    <p className="hero-sub">Real-time updates. Smart insights. All in one place.</p>
                </div>

                <div className="section-header-flex" style={{ marginBottom: '10px', position: 'relative', zIndex: 15 }}>
                    <div className="section-title-badge">⚽ Interactive Ball Physics & Liquid Pool Engine</div>
                    <span style={{ fontSize: '7px', color: 'var(--muted)' }}>Click inside container to spawn balls that melt into liquid</span>
                </div>
                <div className="game-canvas-wrap">
                    <canvas ref={canvasRef}></canvas>
                </div>

                <div style={{ marginTop: '14px', position: 'relative', zIndex: 15 }}>
                    <div className="ai-brief-box">
                        <div className="ai-brief-header">
                            <span>🤖 AI Football Brief</span>
                            <span style={{ fontSize: '7px', color: 'var(--dim)' }}>POWERED BY MTL AI</span>
                        </div>
                        <div className="ai-brief-content">
                            <div className="ai-visual-orb">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5">
                                    <circle cx="12" cy="12" r="9"/>
                                    {/* Animated Clock Hands */}
                                    <line className="clock-hand-hour" x1="12" y1="12" x2="12" y2="8" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round" />
                                    <line className="clock-hand-min" x1="12" y1="12" x2="15" y2="12" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" />
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

            {/* CORE MODULE CARDS */}
            <section className="live-now-container">
                <div className="cards-grid">
                    <div className="card card-live" onClick={() => navigateTo('GroupChat')}>
                        <span className="card-number">01</span>
                        <div className="card-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                            </svg>
                        </div>
                        <h3 className="card-title">Group Chat</h3>
                        <p className="card-description">Join fan squads and discuss matches in real time.</p>
                        <div className="card-bottom">
                            <span className="card-stat">32 Active Groups</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-ai" onClick={() => navigateTo('ai-football')}>
                        <span className="card-number">02</span>
                        <div className="card-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l4 2" />
                            </svg>
                        </div>
                        <h3 className="card-title">AI Football</h3>
                        <p className="card-description">Match intelligence, tactical analysis and AI briefs.</p>
                        <div className="card-bottom">
                            <span className="card-stat">MTL AI ENGINE</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-chat" onClick={() => navigateTo('chat')}>
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
                            </svg>
                        </div>
                        <h3 className="card-title">Predictions</h3>
                        <p className="card-description">Make predictions, build your record and earn points.</p>
                        <div className="card-bottom">
                            <span className="card-stat">12.7K PICKS</span>
                            <span className="card-arrow">→</span>
                        </div>
                    </div>

                    <div className="card card-fixtures" onClick={() => navigateTo('fixture')}>
                        <span className="card-number">05</span>
                        <div className="card-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="3" y="4" width="18" height="18" rx="2" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                        <h3 className="card-title">Fixture</h3>
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

            {/* FOOTER */}
            <footer className="dashboard-footer">
                <div className="footer-content">
                    <div>
                        <div style={{ fontWeight: 900, color: 'white', marginBottom: '4px' }}>MTL FOOTBALL FANS HUB</div>
                        <div>© 2026 MTL Intelligence Network. All rights reserved.</div>
                    </div>
                    <div className="footer-links">
                        <a href="#privacy" onClick={(e) => { e.preventDefault(); showToast('POLICY', 'Privacy guidelines loaded.'); }}>Privacy Policy</a>
                        <a href="#terms" onClick={(e) => { e.preventDefault(); showToast('TERMS', 'Terms loaded.'); }}>Terms of Service</a>
                    </div>
                </div>
            </footer>

            {/* GOOGLE SEARCH MODAL */}
            <div className={`dashboard-modal ${isSearchOpen ? 'active' : ''}`} onClick={(e) => { if (e.target.className.includes('dashboard-modal')) closeSearch(); }}>
                <div className="search-frame" onClick={(e) => e.stopPropagation()}>
                    <div className="search-frame-header">
                        <div><b>Google Network Search</b></div>
                        <button className="close-search" onClick={closeSearch}>×</button>
                    </div>
                    <div className="prediction-filters">
                        <button className={`filter-chip ${activeSearchFilter === 'prediction' ? 'active' : ''}`} onClick={() => setActiveSearchFilter('prediction')}>Match Predictions</button>
                        <button className={`filter-chip ${activeSearchFilter === 'odds' ? 'active' : ''}`} onClick={() => setActiveSearchFilter('odds')}>Odds & Analysis</button>
                    </div>
                    <div className="search-bar">
                        <div className="search-input-wrap">
                            <span className="search-symbol">🔍</span>
                            <input value={googleQuery} onChange={(e) => setGoogleQuery(e.target.value)} className="search-input" type="search" placeholder="Search..." onKeyDown={(e) => { if (e.key === 'Enter') executeGoogleSearch(); }} />
                        </div>
                        <button className="execute-search" onClick={executeGoogleSearch}>SEARCH</button>
                    </div>
                    <div className="google-results-frame">
                        <iframe src={iframeSrc} className="google-iframe-container" title="Search"></iframe>
                    </div>
                </div>
            </div>

            {/* PROFILE MODAL */}
            <div className={`profile-modal ${isProfileOpen ? 'active' : ''}`} onClick={(e) => { if (e.target.className.includes('profile-modal')) setIsProfileOpen(false); }}>
                <div className="profile-box" onClick={(e) => e.stopPropagation()}>
                    <h2>User Profile</h2>
                    <p style={{ color: 'var(--muted)', fontSize: '9px', marginTop: '4px' }}>Connected session.</p>
                    <div className="profile-user-info">{userEmail}</div>
                    <div className="profile-actions">
                        <button className="cancel-btn" onClick={() => setIsProfileOpen(false)}>Close</button>
                        <button className="logout-btn" onClick={logout}>Sign Out</button>
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
