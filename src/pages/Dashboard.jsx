import React, { useState, useEffect } from 'react';

const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";
const GROQ_API_KEY = "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";
const TARGET_MODEL = "llama-3.3-70b-versatile";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Dashboard() {
    const [currentTheme, setCurTheme] = useState('dark');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('hub');
    const [queryText, setQueryText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [cachedRecords, setCachedRecords] = useState([]);
    const [selectedCardModal, setSelectedCardModal] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    const currentDateLabel = "Current date: August 18, 2026";

    const PERSONALITY_IDENTITY_PROMPT = `
You are the AI engine for MTL Football Fans Hub. Analyze the user request and return a JSON object covering professional match statistics, odds, insights, and analysis. Append "${currentDateLabel}" where applicable.
{
  "hub_data": {
    "title": "Matchup or Topic Title",
    "category": "Live / AI Football / Chat / Predictions / Fixtures / Past Fixtures / Clubs / Players / Football IQ",
    "metrics_summary": "Key performance data or stats summary (Text)",
    "insight_details": "Comprehensive analytical breakdown of the requested topic, including tactical evaluation and current form trends. (One comprehensive paragraph)"
  }
}
Return ONLY valid raw JSON without markdown formatting.
`;

    useEffect(() => {
        checkAuthAndInit();
    }, []);

    const checkAuthAndInit = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            // Uncomment if auth is strictly enforced: window.location.href = "auth.html";
        }
        loadCache();
    };

    const loadCache = () => {
        try {
            const localData = localStorage.getItem("mtl_hub_records");
            if (localData) {
                setCachedRecords(JSON.parse(localData));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    };

    const handleCardClick = (title, category) => {
        setSelectedCardModal({ title, category, details: `Loading live intelligence vectors for ${title} as at ${currentDateLabel}...` });
    };

    const runAiQuery = async () => {
        if (!queryText.trim()) {
            triggerToast("PLEASE ENTER A QUERY.");
            return;
        }

        setIsProcessing(true);
        triggerToast("CONSULTING MTL AI NEURAL NETWORK...");

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: TARGET_MODEL,
                    messages: [
                        { role: "system", content: PERSONALITY_IDENTITY_PROMPT },
                        { role: "user", content: queryText }
                    ],
                    temperature: 0.2,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) throw new Error("API Fault");
            const resData = await response.json();
            const parsed = JSON.parse(resData.choices[0].message.content);

            const updated = [parsed.hub_data, ...cachedRecords];
            setCachedRecords(updated);
            localStorage.setItem("mtl_hub_records", JSON.stringify(updated));
            setSelectedCardModal(parsed.hub_data);
            triggerToast("AI INSIGHT GENERATED SUCCESSFULLY.");
            setQueryText('');
        } catch (err) {
            console.error(err);
            triggerToast("GENERATION FAILED. TRY AGAIN.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="hub-container">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Inter:wght@400;500;600;700&display=swap');

                * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
                body, html { background: #030712; color: #f3f4f6; overflow-x: hidden; width: 100vw; }

                .hub-container {
                    min-height: 100vh;
                    background: radial-gradient(circle at 50% 15%, #0d1f14 0%, #030712 65%);
                    position: relative;
                    padding-bottom: 60px;
                }

                /* Header / Navigation Bar */
                .hub-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 5%;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    background: rgba(3, 7, 18, 0.85);
                    backdrop-filter: blur(12px);
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                }

                .brand-logo {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-family: 'Orbitron', sans-serif;
                    font-weight: 900;
                    font-size: 15px;
                    letter-spacing: 0.05em;
                    color: #fff;
                    cursor: pointer;
                }
                .brand-logo span { color: #22c55e; }
                .brand-logo img { width: 34px; height: 34px; object-fit: contain; }

                .nav-links {
                    display: flex;
                    gap: 32px;
                    list-style: none;
                }
                .nav-links a {
                    color: #9ca3af;
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 600;
                    letter-spacing: 0.08em;
                    transition: color 0.2s ease;
                }
                .nav-links a:hover, .nav-links a.active { color: #22c55e; }

                .nav-actions {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                .icon-btn {
                    background: none;
                    border: none;
                    color: #9ca3af;
                    font-size: 16px;
                    cursor: pointer;
                    position: relative;
                }
                .icon-btn:hover { color: #fff; }
                .notification-dot {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    width: 7px;
                    height: 7px;
                    background: #22c55e;
                    border-radius: 50%;
                }

                .user-avatar-badge {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #22c55e, #3b82f6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 12px;
                    color: #fff;
                    cursor: pointer;
                }

                /* Hero Section */
                .hero-section {
                    text-align: center;
                    padding: 50px 20px 30px;
                    position: relative;
                }
                .welcome-sub {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 11px;
                    letter-spacing: 0.3em;
                    color: #22c55e;
                    font-weight: 700;
                    margin-bottom: 12px;
                    text-transform: uppercase;
                }
                .hero-title {
                    font-family: 'Orbitron', sans-serif;
                    font-size: clamp(32px, 6vw, 64px);
                    font-weight: 900;
                    line-height: 1.1;
                    letter-spacing: -0.02em;
                    color: #ffffff;
                    text-transform: uppercase;
                }
                .hero-title span {
                    display: block;
                    background: linear-gradient(180deg, #ffffff 20%, #22c55e 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .hero-tagline {
                    font-size: 13px;
                    letter-spacing: 0.15em;
                    color: #9ca3af;
                    margin-top: 14px;
                    text-transform: uppercase;
                }

                /* Stadium Arena Graphic Banner */
                .stadium-graphic-wrapper {
                    max-width: 1100px;
                    margin: 20px auto 40px;
                    padding: 0 20px;
                    position: relative;
                    text-align: center;
                }
                .central-ball {
                    width: 90px;
                    height: 90px;
                    margin: 0 auto;
                    filter: drop-shadow(0 0 25px rgba(34, 197, 94, 0.6));
                    animation: floatBall 4s ease-in-out infinite;
                }
                @keyframes floatBall {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }

                /* AI Search Quick Bar */
                .ai-search-bar-container {
                    max-width: 680px;
                    margin: 0 auto 40px;
                    padding: 0 20px;
                }
                .ai-search-inner {
                    display: flex;
                    background: rgba(15, 23, 42, 0.9);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    border-radius: 12px;
                    padding: 6px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .ai-search-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    padding: 12px 16px;
                    color: #fff;
                    font-size: 13px;
                    outline: none;
                }
                .ai-search-btn {
                    background: #22c55e;
                    color: #030712;
                    border: none;
                    font-family: 'Orbitron', sans-serif;
                    font-weight: 700;
                    font-size: 11px;
                    padding: 0 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    letter-spacing: 0.05em;
                    transition: background 0.2s;
                }
                .ai-search-btn:hover { background: #16a34a; }

                /* 3x3 Cards Grid */
                .cards-grid-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 20px;
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 24px;
                }
                @media(max-width: 960px) {
                    .cards-grid-container { grid-template-columns: repeat(2, 1fr); }
                    .hub-header .nav-links { display: none; }
                }
                @media(max-width: 640px) {
                    .cards-grid-container { grid-template-columns: 1fr; }
                }

                .hub-card {
                    background: linear-gradient(145deg, rgba(15, 23, 42, 0.75) 0%, rgba(10, 15, 28, 0.9) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: 28px 24px;
                    position: relative;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .hub-card:hover {
                    border-color: rgba(34, 197, 94, 0.5);
                    transform: translateY(-4px);
                    box-shadow: 0 12px 40px rgba(34, 197, 94, 0.15);
                }

                .card-index-label {
                    position: absolute;
                    top: 18px;
                    left: 20px;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 11px;
                    color: #6b7280;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                }

                .card-badge-live {
                    position: absolute;
                    top: 18px;
                    right: 20px;
                    background: rgba(220, 38, 38, 0.2);
                    border: 1px solid rgba(220, 38, 38, 0.4);
                    color: #f87171;
                    font-size: 9px;
                    font-family: 'Orbitron', sans-serif;
                    font-weight: 700;
                    padding: 3px 8px;
                    border-radius: 6px;
                    letter-spacing: 0.08em;
                }

                .card-icon-frame {
                    width: 72px;
                    height: 72px;
                    margin: 18px 0 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    filter: drop-shadow(0 0 12px rgba(34, 197, 94, 0.25));
                }
                .card-icon-frame svg { width: 56px; height: 56px; }

                .card-title {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 16px;
                    font-weight: 800;
                    color: #ffffff;
                    letter-spacing: 0.08em;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }

                .card-description {
                    font-size: 12px;
                    color: #9ca3af;
                    line-height: 1.5;
                    margin-bottom: 16px;
                    max-width: 240px;
                }

                .card-footer-metric {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    color: #22c55e;
                    margin-top: auto;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                /* Modal Overlay */
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(3, 7, 18, 0.85);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 20000;
                    padding: 20px;
                }
                .modal-content-box {
                    background: #0f172a;
                    border: 1px solid rgba(34, 197, 94, 0.4);
                    border-radius: 16px;
                    width: 100%;
                    max-width: 500px;
                    padding: 30px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.6);
                    position: relative;
                }
                .modal-close-btn {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: none;
                    border: none;
                    color: #9ca3af;
                    font-size: 16px;
                    cursor: pointer;
                }
                .modal-close-btn:hover { color: #fff; }

                /* Toast Notification */
                .toast-notification {
                    position: fixed;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #0f172a;
                    border: 1px solid #22c55e;
                    color: #22c55e;
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    z-index: 99999;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }

                /* Footer bottom text */
                .hub-footer-bottom {
                    text-align: center;
                    margin-top: 50px;
                    font-family: 'Orbitron', sans-serif;
                    font-size: 10px;
                    letter-spacing: 0.3em;
                    color: #4b5563;
                    text-transform: uppercase;
                }
            `}</style>

            {/* HEADER NAVIGATION */}
            <header className="hub-header">
                <div className="brand-logo" onClick={() => setActiveSection('hub')}>
                    <img src="https://api.iconify.icon/fluent-emoji-flat:soccer-ball.svg" alt="Logo" />
                    MTL <span>FOOTBALL FANS HUB</span>
                </div>
                <ul className="nav-links">
                    <li><a href="#home" className="active">HOME</a></li>
                    <li><a href="#live">LIVE</a></li>
                    <li><a href="#fixtures">FIXTURES</a></li>
                    <li><a href="#predictions">PREDICTIONS</a></li>
                    <li><a href="#community">COMMUNITY</a></li>
                </ul>
                <div className="nav-actions">
                    <button className="icon-btn">🔍</button>
                    <button className="icon-btn">
                        🔔
                        <span className="notification-dot"></span>
                    </button>
                    <div className="user-avatar-badge">MT</div>
                </div>
            </header>

            {/* HERO SECTION */}
            <section className="hero-section">
                <div className="welcome-sub">W E L C O M E &nbsp; T O</div>
                <h1 className="hero-title">
                    FOOTBALL
                    <span>FANS HUB</span>
                </h1>
                <p className="hero-tagline">— LIVE IT. PREDICT IT. OWN IT. —</p>
            </section>

            {/* STADIUM GRAPHIC BANNER */}
            <div className="stadium-graphic-wrapper">
                <img 
                    src="https://api.iconify.icon/fluent-emoji:soccer-ball.svg" 
                    alt="Soccer Ball" 
                    className="central-ball"
                />
            </div>

            {/* AI QUICK QUERY SEARCH BAR */}
            <div className="ai-search-bar-container">
                <div className="ai-search-inner">
                    <input 
                        type="text" 
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder="Ask MTL AI (e.g. Analyze Premier League title race as at August 18, 2026)..." 
                        className="ai-search-input"
                    />
                    <button className="ai-search-btn" onClick={runAiQuery} disabled={isProcessing}>
                        {isProcessing ? "PROCESSING..." : "ASK AI"}
                    </button>
                </div>
            </div>

            {/* 3x3 INTERACTIVE CARDS GRID EXACTLY MATCHING THE PROVIDED UI */}
            <div className="cards-grid-container">
                
                {/* 01 LIVE */}
                <div className="hub-card" onClick={() => handleCardClick("Live Matches & Real Time Action", "LIVE")}>
                    <div className="card-index-label">01</div>
                    <div className="card-badge-live">LIVE</div>
                    <div className="card-icon-frame">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>
                    </div>
                    <h2 className="card-title">LIVE</h2>
                    <p className="card-description">Live Matches & Real Time Action</p>
                    <div className="card-footer-metric">24 MATCHES LIVE →</div>
                </div>

                {/* 02 AI FOOTBALL */}
                <div className="hub-card" onClick={() => handleCardClick("AI Insights, Analysis & Smart Briefs", "AI FOOTBALL")}>
                    <div className="card-index-label">02</div>
                    <div className="card-icon-frame">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5"><path d="M12 2a10 10 0 0 1 7.54 16.54L12 22l-7.54-3.46A10 10 0 0 1 12 2z"/></svg>
                    </div>
                    <h2 className="card-title" style={{ color: '#38bdf8' }}>AI FOOTBALL</h2>
                    <p className="card-description">AI Insights, Analysis & Smart Briefs</p>
                    <div className="card-footer-metric" style={{ color: '#38bdf8' }}>POWERED BY MTL AI →</div>
                </div>

                {/* 03 CHAT */}
                <div className="hub-card" onClick={() => handleCardClick("Connect. Discuss. Celebrate.", "CHAT")}>
                    <div className="card-index-label">03</div>
                    <div className="card-icon-frame">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <h2 className="card-title" style={{ color: '#a855f7' }}>CHAT</h2>
                    <p className="card-description">Connect. Discuss. Celebrate.</p>
                    <div className="card-footer-metric" style={{ color: '#a855f7' }}>8.4K FANS ONLINE →</div>
                </div>

                {/* 04 PREDICTIONS */}
                <div className="hub-card" onClick={() => handleCardClick("Predict Matches. Earn Points. Climb the Ranks.", "PREDICTIONS")}>
                    <div className="card-index-label">04</div>
                    <div className="card-icon-frame">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                    </div>
                    <h2 className="card-title" style={{ color: '#f97316' }}>PREDICTIONS</h2>
                    <p className="card-description">Predict Matches. Earn Points. Climb the Ranks.</p>
                    <div className="card-footer-metric" style={{ color: '#f97316' }}>12.7K PREDICTIONS TODAY →</div>
                </div>

                {/* 05 FIXTURES */}
                <div className="hub-card" onClick={() => handleCardClick("Upcoming Matches & Schedules", "FIXTURES")}>
                    <div className="card-index-label">05</div>
                    <div className="card-icon-frame">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    </div>
                    <h2 className="card-title" style={{ color: '#22d3ee' }}>FIXTURES</h2>
                    <p className="card-description">Upcoming Matches & Schedules</p>
                    <div className="card-footer-metric" style={{ color: '#22d3ee' }}>128 MATCHES THIS WEEK →</div>
                </div>

                {/* 06 PAST FIXTURES */}
                <div className="hub-card" onClick={() => handleCardClick("Results, History & Legendary Matches", "PAST FIXTURES")}>
                    <div className="card-index-label">06</div>
                    <div className="card-icon-frame">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <h2 className="card-title" style={{ color: '#fbbf24' }}>PAST FIXTURES</h2>
                    <p className="card-description">Results, History & Legendary Matches</p>
                    <div className="card-footer-metric" style={{ color: '#fbbf24' }}>1900 → 3099 →</div>
                </div>

                {/* 07 CLUBS */}
                <div className="hub-card" onClick={() => handleCardClick("Explore Clubs, Stats, Squads & History", "CLUBS")}>
                    <div className="card-index-label">07</div>
                    <div className="card-icon-frame">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17h4v-2.34M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                    </div>
                    <h2 className="card-title" style={{ color: '#4ade80' }}>CLUBS</h2>
                    <p className="card-description">Explore Clubs, Stats, Squads & History</p>
                    <div className="card-footer-metric" style={{ color: '#4ade80' }}>650+ CLUBS →</div>
                </div>

                {/* 08 PLAYERS */}
                <div className="hub-card" onClick={() => handleCardClick("Profiles, Stats, Rankings & Comparisons", "PLAYERS")}>
                    <div className="card-index-label">08</div>
                    <div className="card-icon-frame">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <h2 className="card-title" style={{ color: '#60a5fa' }}>PLAYERS</h2>
                    <p className="card-description">Profiles, Stats, Rankings & Comparisons</p>
                    <div className="card-footer-metric" style={{ color: '#60a5fa' }}>50K+ PLAYERS →</div>
                </div>

                {/* 09 FOOTBALL IQ */}
                <div className="hub-card" onClick={() => handleCardClick("News, Opinions, Transfers & Tactical Insights", "FOOTBALL IQ")}>
                    <div className="card-index-label">09</div>
                    <div className="card-icon-frame">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="1.5"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2M18 14h-8M18 10h-8M14 18h-4"/></svg>
                    </div>
                    <h2 className="card-title" style={{ color: '#f43f5e' }}>FOOTBALL IQ</h2>
                    <p className="card-description">News, Opinions, Transfers & Tactical Insights</p>
                    <div className="card-footer-metric" style={{ color: '#f43f5e' }}>TRENDING NOW →</div>
                </div>

            </div>

            <div className="hub-footer-bottom">
                E X P L O R E &nbsp; T H E &nbsp; F O O T B A L L &nbsp; U N I V E R S E
            </div>

            {/* MODAL WINDOW */}
            {selectedCardModal && (
                <div className="modal-overlay" onClick={() => setSelectedCardModal(null)}>
                    <div className="modal-content-box" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setSelectedCardModal(null)}>✕</button>
                        <span style={{ fontSize: '10px', fontFamily: 'Orbitron', color: '#22c55e', fontWeight: 700, letterSpacing: '0.1em' }}>
                            {selectedCardModal.category || "MODULE INTEL"}
                        </span>
                        <h3 style={{ fontFamily: 'Orbitron', fontSize: '18px', fontWeight: 800, margin: '8px 0 12px', color: '#fff' }}>
                            {selectedCardModal.title}
                        </h3>
                        {selectedCardModal.metrics_summary && (
                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#22c55e', fontWeight: 600, marginBottom: '14px' }}>
                                {selectedCardModal.metrics_summary}
                            </div>
                        )}
                        <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#9ca3af' }}>
                            {selectedCardModal.insight_details || selectedCardModal.details}
                        </p>
                    </div>
                </div>
            )}

            {/* TOAST */}
            {toastMessage && (
                <div className="toast-notification">
                    {toastMessage}
                </div>
            )}
        </div>
    );
}
