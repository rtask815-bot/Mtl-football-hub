import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";
const GROQ_API_KEY = "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";
const TARGET_MODEL = "llama-3.3-70b-versatile";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Dashboard() {
    // State Architecture
    const [currentTheme, setCurrentTheme] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
    const [activeDashboardTab, setActiveDashboardTab] = useState('definitions');
    
    // User & Session State
    const [userProfile, setUserProfile] = useState({ name: "Verifying Identity...", email: "Synchronizing token validation layers", avatar: "--" });
    
    // Prediction & Cache State
    const [queryText, setQueryText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [cachedMatchRecords, setCachedMatchRecords] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    
    // Telemetry Dashboard Metrics
    const [telemetry, setTelemetry] = useState({
        avgIndex: "0.0%",
        totalMatches: "0 Matches",
        maxBtts: "0% Chances of BTTS",
        peakHome: "0% Influence on the game",
        leagueIntensity: "0.0",
        ppgSlope: "0.00",
        xgTrend: "0.00",
        xgaProjection: "0.00",
        formSequence: "N/A",
        squadValue: "0%",
        absenceStatus: "Clear",
        tacticalCollision: "0-0-0 vs 0-0-0",
        oddsDelta: "0.00"
    });

    // Modal & Drawer UI States
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [isFsMatchOpen, setIsFsMatchOpen] = useState(false);
    const [isOddsDrawerOpen, setIsOddsDrawerOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
    
    const [reactions, setReactions] = useState({ fire: 0, like: 0 });
    const [toastMessage, setToastMessage] = useState(null);
    const [confirmationModal, setConfirmationModal] = useState({ isOpen: false, title: '', body: '', onConfirm: null });
    const [notificationsStream, setNotificationsStream] = useState([
        { id: 1, text: "System initialized sandbox storage successfully.", time: "Just now" }
    ]);

    const currentDateLabel = "Current date: August 18, 2026";

    const PERSONALITY_IDENTITY_PROMPT = `
You are a professional football match prediction and statistical analytics model.
Analyze supplied football matchup data and return a JSON object containing ALL of the following top-level structures and exact metrics with complete realistic analytical data. IMPORTANT: For descriptive text append the current time injection label "${currentDateLabel}" where applicable.
{
  "match_predictions": {
    "league_name": "Return the official competition or league name. (Text)",
    "home_team": "Return the official home team name. (Text)",
    "away_team": "Return the official away team name. (Text)",
    "aggregated_prediction_index": "Calculate the combined prediction confidence after weighting attacking strength, defensive quality, current form, expected goals, squad strength and contextual factors. (Integer 0-100)",
    "confidence_band": "Determine the confidence classification using the Aggregated Prediction Index. (Text: LOW EDGE, SLIGHT EDGE, MODERATE EDGE, STRONG EDGE or VERY STRONG EDGE including score range)",
    "prob_home_win": "Calculate the probability that the home team wins using xG, xGA, home advantage, squad quality, tactical matchup and recent form. (Percentage 0-100)",
    "prob_draw": "Calculate the probability that the match ends in a draw using expected goal distribution, defensive balance and outcome simulations. (Percentage 0-100)",
    "prob_away_win": "Calculate the probability that the away team wins using attacking efficiency, away performance, tactical advantage and defensive strength. (Percentage 0-100)",
    "prob_btts": "Calculate the probability that both teams score at least one goal using attacking efficiency, defensive vulnerability and scoring consistency. (Percentage 0-100)",
    "prob_over_1_5": "Calculate the probability that the match finishes with more than 1.5 total goals. (Percentage 0-100)",
    "prob_over_2_5": "Calculate the probability that the match finishes with more than 2.5 total goals. (Percentage 0-100)",
    "prob_over_3_5": "Calculate the probability that the match finishes with more than 3.5 total goals. (Percentage 0-100)",
    "exact_score_clusters": "Calculate and return the three most probable final scorelines ordered by likelihood. (Array formatted as HomeGoals-AwayGoals (Percentage%))",
    "analytical_synthesis": "Generate a concise statistical summary explaining the prediction using attacking strength, defensive stability, tactical matchup, recent form, injuries, venue advantage and expected game flow. (One concise paragraph)"
  },
  "league_type_analysis": {
    "competition_intensity_index": "Calculate league competitiveness using competitive balance, quality variance and points distribution. (Decimal 0.00-1.00 with descriptive label)",
    "scheduling_congestion": "Calculate fixture congestion using recovery time, travel schedule and match frequency. (Decimal 0.00-1.00 with descriptive label)",
    "historical_btts_percentage": "Calculate the historical percentage of league matches where both teams scored. (Percentage 0-100)",
    "referee_card_avg_bias": "Calculate the referee's average disciplinary tendency using cards per match and foul tolerance. (Decimal or Ratio)",
    "weather_impact_coefficient": "Calculate the expected impact of weather conditions on match tempo, passing accuracy and scoring. (Decimal 0.00-1.00)"
  },
  "league_table_positions": {
    "ranking_delta_movement": "Calculate the projected league position change following the expected result. (Signed Integer)",
    "points_per_game_slope": "Calculate each team's average points earned per match. (Ratio: HomePPG / AwayPPG)",
    "home_advantage_multiplier": "Calculate the performance multiplier gained from playing at home. (Decimal Ratio)",
    "away_travel_fatigue_index": "Calculate the expected reduction in away performance caused by travel distance, recovery time and fixture congestion. (Decimal 0.00-1.00)",
    "points_dropped_from_leading_positions": "Calculate the percentage of points previously lost after taking the lead. (Percentage 0-100)"
  },
  "scoring_volume_metrics": {
    "xg_trend_line": "Calculate the recent Expected Goals trend for both teams. (Ratio: HomeXG / AwayXG)",
    "goal_probability_vector_2_5": "Calculate the probability that total goals exceed 2.5. (Percentage 0-100)",
    "shot_conversion_efficiency": "Calculate the percentage of shots converted into goals. (Percentage 0-100)",
    "big_chances_created_per_match": "Calculate the average number of big scoring opportunities created per match. (Decimal Ratio)",
    "penalty_box_touches_density": "Calculate the average attacking touches inside the opponent penalty area. (Decimal Ratio)"
  },
  "defensive_metrics": {
    "xga_projection": "Calculate the Expected Goals Against projection for both teams. (Ratio: HomeXGA / AwayXGA)",
    "clean_sheet_probability": "Calculate each team's probability of keeping a clean sheet. (Ratio: Home% / Away%)",
    "ppda_press_intensity": "Calculate defensive pressing intensity using Passes Allowed Per Defensive Action. (Decimal Ratio)",
    "goalkeeper_psxg_differential": "Calculate goalkeeper performance against Post-Shot Expected Goals. (Decimal Ratio)",
    "set_piece_vulnerability_index": "Calculate vulnerability to conceding from corners, free kicks and other set pieces. (Decimal 0.00-1.00)"
  },
  "current_form_check": {
    "weighted_form_index": "Calculate weighted recent form with greater emphasis on the latest matches. (Ratio: HomeRating / AwayRating)",
    "last_five_match_sequence": "Return each team's last five results in chronological order. (Format: W-D-W-L-W / L-W-D-W-W)",
    "expected_points_variance": "Calculate the difference between expected points and actual points earned. (Decimal Ratio)",
    "momentum_shifts_late_game": "Calculate each team's tendency to improve or decline during the final stages of matches. (Decimal Ratio)"
  },
  "projected_squad_strength": {
    "starting_xi_vs_bench_delta": "Calculate the strength difference between the projected starting XI and available substitutes. (Decimal Ratio)",
    "squad_market_value_ratio": "Calculate the relative market valuation of both squads. (Ratio: HomeValue / AwayValue)",
    "tactical_flexibility_index": "Calculate the team's ability to change formations and tactical systems effectively. (Decimal 0.00-1.00)",
    "average_age_energy_profile": "Calculate the squad's physical profile using average age and expected energy levels. (Decimal Ratio)"
  },
  "crucial_absence_log": {
    "impact_weighted_score": "Calculate the total performance impact caused by unavailable players. (Decimal Ratio)",
    "key_playmaker_status": "Return the availability status of the team's primary creator. (Text: Available, Doubtful, Suspended or Injured)",
    "defensive_anchor_status": "Return the availability status of the team's primary defensive leader. (Text: Available, Doubtful, Suspended or Injured)",
    "injury_severity_index": "Calculate the overall injury burden affecting squad performance. (Decimal 0.00-1.00)"
  },
  "tactical_matchup_intelligence": {
    "formation_collision": "Interaction pattern between both teams' formations determining midfield control, space exploitation, and tactical advantage zones. (Format: HomeFormation vs AwayFormation)"
  },
  "market_simulations_layer": {
    "opening_odds_delta": "Difference between model-generated probabilities and bookmaker opening odds indicating market inefficiency or alignment. (Ratio: Model / Market)"
  }
}
Return ONLY valid raw JSON without markdown formatting.
`;

    // Lifecycle Hook
    useEffect(() => {
        checkAuthAndInit();
    }, []);

    const checkAuthAndInit = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            window.location.href = "auth.html";
            return;
        }

        supabase.auth.onAuthStateChange((event, activeSession) => {
            if (event === "SIGNED_OUT" || !activeSession) {
                window.location.href = "auth.html";
            }
        });

        setUserProfile({
            name: session.user.user_metadata?.full_name || "Football Analyst",
            email: session.user.email || "analyst@mtlpredictions.com",
            avatar: (session.user.email || "FP").substring(0, 2).toUpperCase()
        });

        loadCache();
    };

    const loadCache = () => {
        try {
            const localData = localStorage.getItem("mtl_isolated_research_stats");
            if (localData) {
                const parsed = JSON.parse(localData);
                setSearchHistory(parsed);
                setCachedMatchRecords(parsed);
                updateTelemetryMetrics(parsed);
            }
        } catch (e) {
            console.error("Cache load error:", e);
        }
    };

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    };

    const logNotification = (text) => {
        setNotificationsStream(prev => [{ id: Date.now(), text, time: "Just now" }, ...prev]);
    };

    const updateTelemetryMetrics = (records) => {
        if (!records || records.length === 0) return;
        let sumIndex = records.reduce((acc, r) => acc + (parseFloat(r.match_predictions?.aggregated_prediction_index || r.aggregated_prediction_index) || 0), 0);
        
        const last = records[0];
        setTelemetry({
            avgIndex: `${(sumIndex / records.length).toFixed(1)}%`,
            totalMatches: `${records.length} Matches`,
            maxBtts: `${last.match_predictions?.prob_btts || '65'}% Chances of BTTS`,
            peakHome: `${last.league_table_positions?.home_advantage_multiplier || '1.15'}x Influence`,
            leagueIntensity: last.league_type_analysis?.competition_intensity_index || "0.85",
            ppgSlope: last.league_table_positions?.points_per_game_slope || "2.10",
            xgTrend: last.scoring_volume_metrics?.xg_trend_line || "1.85",
            xgaProjection: last.defensive_metrics?.xga_projection || "0.95",
            formSequence: last.current_form_check?.last_five_match_sequence || "W-W-D-W-L",
            squadValue: last.projected_squad_strength?.squad_market_value_ratio || "1.45x",
            absenceStatus: last.crucial_absence_log?.key_playmaker_status || "Clear",
            tacticalCollision: last.tactical_matchup_intelligence?.formation_collision || "4-3-3 vs 4-2-3-1",
            oddsDelta: last.market_simulations_layer?.opening_odds_delta || "+0.12"
        });
    };

    const runPrediction = async () => {
        if (!queryText.trim()) {
            triggerToast("PLEASE SPECIFY A MATCHUP QUERY.");
            return;
        }

        setIsProcessing(true);
        triggerToast("COMPUTING MULTI-LAYER PREDICTION VECTORS...");

        const now = new Date();
        const executionTimestamp = now.toISOString();
        const formattedDateTime = now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

        const payload = JSON.stringify({
            context_metadata: { runtime_utc: executionTimestamp, local_display_time: formattedDateTime, pipeline_version: "v3.8-nexus" },
            target_query: queryText,
            directives: "Perform rigorous neural-symbolic match projection."
        });

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: TARGET_MODEL,
                    messages: [
                        { role: "system", content: `${PERSONALITY_IDENTITY_PROMPT}\nEnsure all generated text properties explicitly append: "As at ${formattedDateTime}".` },
                        { role: "user", content: payload }
                    ],
                    temperature: 0.12,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) throw new Error("Neural Pipeline Communication Fault");
            const resData = await response.json();
            const jsonMetrics = JSON.parse(resData.choices[0].message.content);

            const newRecord = { id: "ai-nexus-" + Date.now(), timestamp: executionTimestamp, compilation_date: formattedDateTime, ...jsonMetrics };
            
            const updated = [newRecord, ...cachedMatchRecords];
            setCachedMatchRecords(updated);
            setSearchHistory(updated);
            localStorage.setItem("mtl_isolated_research_stats", JSON.stringify(updated));
            updateTelemetryMetrics(updated);

            logNotification(`Generated new prediction matrix for: ${queryText}`);
            triggerToast("ADVANCED MATCH PREDICTION COMPILED.");
            setQueryText('');
        } catch (err) {
            console.error(err);
            triggerToast("COMPILATION TIMEOUT. RETRYING...");
        } finally {
            setIsProcessing(false);
        }
    };

    const scrollToSnapPage = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    const confirmAction = (title, body, cb) => {
        setConfirmationModal({ isOpen: true, title, body, onConfirm: cb });
    };

    return (
        <div className={`app-window-shell ${currentTheme === 'slate' ? 'theme-slate' : ''}`} data-theme={currentTheme}>
            <style>{`
                :root {
                    --bg-base: #070b14; --bg-workspace: #0d1526; --bg-surface: #162032; --bg-card: #1a263d;
                    --border-primary: rgba(255, 255, 255, 0.08); --border-secondary: rgba(255, 255, 255, 0.14);
                    --text-main: #f8fafc; --text-muted: #94a3b8; --text-prose: #cbd5e1;
                    --accent-gold: #f59e0b; --accent-gold-glow: rgba(245, 158, 11, 0.25);
                    --accent-emerald: #0284c7; --indigo-highlight: #1e293b;
                    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                [data-theme="slate"] {
                    --bg-base: #030508; --bg-workspace: #080d14; --bg-surface: #0f172a; --bg-card: #1e293b;
                    --border-primary: rgba(255, 255, 255, 0.06); --border-secondary: rgba(255, 255, 255, 0.12);
                    --text-main: #ffffff; --text-muted: #9ca3af; --text-prose: #e2e8f0;
                    --accent-gold: #fbbf24; --accent-gold-glow: rgba(251, 191, 36, 0.25);
                    --accent-emerald: #064e3b; --indigo-highlight: #172033;
                }
                * { margin:0; padding:0; box-sizing:border-box; font-family:var(--font-sans); transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease; }
                html, body { height: 100vh; overflow: hidden; background: var(--bg-base); color: var(--text-prose); }
                .app-window-shell { display: flex; width: 100vw; height: 100vh; height: 100dvh; overflow: hidden; position: relative; }
                
                aside.sidebar-nav-container {
                    width: 280px; min-width: 280px; height: 100%; background: var(--bg-surface);
                    border-right: 1px solid var(--border-primary); display: flex; flex-direction: column; justify-content: space-between;
                    z-index: 1000; box-shadow: 4px 0 24px rgba(0,0,0,0.4); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .sidebar-brand-block { padding: 24px 20px; background: var(--bg-surface); color: #fff; border-bottom: 1px solid var(--border-primary); display: flex; align-items: center; justify-content: space-between; }
                .logo { font-size: 15px; font-weight: 800; letter-spacing: 0.1em; }
                .logo span { color: var(--accent-gold); }
                
                .sidebar-menu-list-wrapper { flex: 1; padding: 20px 14px; overflow-y: auto; }
                .menu-section-label { font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; padding-left: 10px; opacity: 0.75; }
                .sidebar-menu-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 24px; }
                
                .navigation-menu-item-btn {
                    display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 8px;
                    color: var(--text-muted); font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer;
                    border: 1px solid transparent; background: transparent; text-align: left; width: 100%;
                }
                .navigation-menu-item-btn:hover { background: var(--border-primary); color: var(--text-main); }
                .navigation-menu-item-btn.active { background: var(--indigo-highlight); border-color: var(--accent-gold-glow); color: var(--accent-gold); }
                
                main.main-viewport-workspace { flex: 1; display: flex; flex-direction: column; height: 100%; width: 100%; background: var(--bg-workspace); position: relative; }
                header.app-bar-global-header { height: 70px; min-height: 70px; padding: 0 3%; display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); border-bottom: 1px solid var(--border-primary); z-index: 999; }
                
                .page-scroll-snap-wrapper { flex: 1; height: calc(100dvh - 70px); overflow-y: scroll; scroll-snap-type: y mandatory; scroll-behavior: smooth; }
                .snap-page-section { scroll-snap-align: start; scroll-snap-stop: always; min-height: calc(100dvh - 70px); padding: 28px 3%; display: flex; flex-direction: column; justify-content: space-between; border-bottom: 1px solid var(--border-primary); }
                
                .task-box { background: var(--bg-card); border-radius: 10px; padding: 16px 18px; margin-bottom: 10px; border: 1px solid var(--border-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
                .task-box:hover { border-color: var(--border-secondary); box-shadow: 0 6px 16px rgba(0,0,0,0.25); }
                
                .sliding-overlay-drawer {
                    position: fixed; inset: 0; background: var(--bg-surface); z-index: 10000;
                    transform: translateY(100%); transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    overflow-y: auto; padding: 32px 4%; border-top: 3px solid var(--accent-gold); box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
                }
                .sliding-overlay-drawer.open { transform: translateY(0); }
                
                .center-popup-modal-container {
                    position: fixed; inset: 0; background: rgba(3, 5, 8, 0.8); backdrop-filter: blur(6px);
                    display: flex; align-items: center; justify-content: center; z-index: 20000; padding: 16px;
                }
                .popup-modal-wrapper-box { background: var(--bg-surface); border: 1px solid var(--border-secondary); border-radius: 14px; width: 100%; max-width: 420px; padding: 26px; }
                
                .btn-ui-action { background: var(--bg-card); border: 1px solid var(--border-secondary); color: var(--text-main); padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; }
                .btn-ui-action:hover { border-color: var(--accent-gold); color: var(--accent-gold); }
            `}</style>

            {/* SIDEBAR NAVIGATION */}
            <aside className={`sidebar-nav-container ${isSidebarOpen ? 'mobile-open' : ''}`}>
                <div>
                    <div className="sidebar-brand-block">
                        <div className="logo">MTL<span>PREDICTIONS</span></div>
                        <button className="btn-ui-action" onClick={() => setIsSidebarOpen(false)}>✕</button>
                    </div>

                    <div className="sidebar-menu-list-wrapper">
                        <div className="menu-section-label">SYSTEM WORKSPACE</div>
                        <nav className="sidebar-menu-group">
                            <button className="navigation-menu-item-btn" onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}>
                                <span>⚙️</span> Settings <span style={{ marginLeft: 'auto', fontSize: '9px' }}>▼</span>
                            </button>
                            {isSettingsExpanded && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '12px', marginTop: '4px' }}>
                                    <button className="navigation-menu-item-btn" onClick={() => setCurrentTheme(currentTheme === 'slate' ? '' : 'slate')}>Toggle Theme</button>
                                    <button className="navigation-menu-item-btn" onClick={() => {
                                        confirmAction("CLEAR LOCAL CACHE", "Flush all locally cached match states?", () => {
                                            localStorage.clear();
                                            setCachedMatchRecords([]);
                                            setSearchHistory([]);
                                            triggerToast("Cache cleared.");
                                        });
                                    }}>Clear Local Cache</button>
                                    <button className="navigation-menu-item-btn" onClick={() => setIsPrivacyOpen(true)}>Privacy Compliance</button>
                                    <button className="navigation-menu-item-btn" style={{ color: '#fca5a5' }} onClick={() => supabase.auth.signOut().then(() => window.location.href = "auth.html")}>Sign Out</button>
                                </div>
                            )}
                        </nav>

                        <div className="menu-section-label">PAGE SCROLL JUMP</div>
                        <nav className="sidebar-menu-group">
                            <button className="navigation-menu-item-btn active" onClick={() => scrollToSnapPage('page-1')}>Command Center</button>
                            <button className="navigation-menu-item-btn" onClick={() => scrollToSnapPage('page-2')}>Match Generator</button>
                            <button className="navigation-menu-item-btn" onClick={() => scrollToSnapPage('page-3')}>Telemetry Lab</button>
                            <button className="navigation-menu-item-btn" onClick={() => scrollToSnapPage('page-4')}>Metric Ecosystem</button>
                        </nav>

                        <div className="menu-section-label">SYSTEM RECORDS</div>
                        <nav className="sidebar-menu-group">
                            <button className="navigation-menu-item-btn" onClick={() => setIsNotificationsOpen(true)}>
                                <span>🔔</span> Notification Stream <span style={{ marginLeft: 'auto', background: '#dc2626', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>{notificationsStream.length}</span>
                            </button>
                        </nav>
                    </div>
                </div>
            </aside>

            {/* MAIN VIEWPORT */}
            <main className="main-viewport-workspace">
                <header className="app-bar-global-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <button className="btn-ui-action" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
                        <h1 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>MTL FOOTBALL HUB • REACT EDITION</h1>
                    </div>
                    <button className="btn-ui-action" style={{ background: 'rgba(220,38,38,0.1)', color: '#fca5a5', borderColor: 'rgba(220,38,38,0.25)' }} onClick={() => supabase.auth.signOut().then(() => window.location.href = "auth.html")}>EXIT</button>
                </header>

                <div className="page-scroll-snap-wrapper">
                    {/* PAGE 1 */}
                    <section className="snap-page-section" id="page-1">
                        <div>
                            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-gold)' }}>{userProfile.avatar}</div>
                                <div>
                                    <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{userProfile.name}</h2>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{userProfile.email}</p>
                                </div>
                            </div>

                            <div>
                                <div style={{ width: 'fit-content', padding: '5px 12px', borderRadius: '6px', background: 'var(--indigo-highlight)', color: 'var(--accent-gold)', fontSize: '10px', fontWeight: 700, marginBottom: '12px' }}>PRO PREDICTION ENGINE</div>
                                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>FOOTBALL ANALYTICS & PROBABILITY MODELING</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '720px', marginBottom: '20px' }}>Process professional match telemetry dynamically. Submit team performance inputs below.</p>
                            </div>
                        </div>
                    </section>

                    {/* PAGE 2 */}
                    <section className="snap-page-section" id="page-2">
                        <div style={{ width: '100%' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px' }}>GENERATED MATCH PREDICTION MATRICES</h3>
                            
                            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '18px', marginBottom: '20px', position: 'relative' }}>
                                <input 
                                    type="text" 
                                    value={queryText}
                                    onChange={(e) => setQueryText(e.target.value)}
                                    placeholder="Enter Matchup (e.g. Real Madrid vs AC Milan)..." 
                                    style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-secondary)', borderRadius: '10px', padding: '14px 130px 14px 16px', fontSize: '13px', color: 'var(--text-main)', outline: 'none' }}
                                />
                                <button 
                                    onClick={runPrediction} 
                                    disabled={isProcessing}
                                    style={{ position: 'absolute', right: '23px', top: '23px', bottom: '23px', background: 'var(--accent-emerald)', border: 'none', borderRadius: '7px', color: '#fff', fontWeight: 700, padding: '0 18px', cursor: 'pointer' }}
                                >
                                    {isProcessing ? "Running..." : "Run Prediction"}
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px', maxHeight: '520px', overflowY: 'auto' }}>
                                {cachedMatchRecords.length === 0 ? (
                                    <div style={{ gridColumn: '1/-1', padding: '36px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-secondary)', borderRadius: '12px' }}>
                                        Awaiting real-time match prediction queries to populate...
                                    </div>
                                ) : (
                                    cachedMatchRecords.map((rec, idx) => (
                                        <div key={idx} className="task-box" style={{ cursor: 'pointer' }} onClick={() => { setSelectedMatch(rec); setIsFsMatchOpen(true); }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                                                {rec.match_predictions?.home_team} vs {rec.match_predictions?.away_team}
                                            </div>
                                            <div style={{ color: 'var(--accent-gold)', fontSize: '12px', marginTop: '6px' }}>
                                                Confidence: {rec.match_predictions?.aggregated_prediction_index}% [{rec.match_predictions?.confidence_band}]
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </section>

                    {/* PAGE 3 */}
                    <section className="snap-page-section" id="page-3">
                        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: '14px', padding: '22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px', marginBottom: '16px' }}>
                                <button className={`btn-ui-action ${activeDashboardTab === 'definitions' ? 'active' : ''}`} onClick={() => setActiveDashboardTab('definitions')}>Definitions & Telemetry</button>
                                <button className={`btn-ui-action ${activeDashboardTab === 'history' ? 'active' : ''}`} onClick={() => setActiveDashboardTab('history')}>Local Cache Logs</button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {activeDashboardTab === 'definitions' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div className="task-box">
                                            <h3>Average Prediction Strength</h3>
                                            <p>Overall average confidence score across evaluated matches.</p>
                                            <div style={{ marginTop: '10px', fontWeight: 700, color: 'var(--accent-gold)' }}>{telemetry.avgIndex}</div>
                                        </div>
                                        <div className="task-box">
                                            <h3>Analyzed Matches Count</h3>
                                            <p>Total complete match telemetry reports loaded in local sandbox.</p>
                                            <div style={{ marginTop: '10px', fontWeight: 700, color: 'var(--text-main)' }}>{telemetry.totalMatches}</div>
                                        </div>
                                        <div className="task-box">
                                            <h3>Expected Goals ($xG$) Trend</h3>
                                            <p>Underlying scoring chance quality vector.</p>
                                            <div style={{ marginTop: '10px', fontWeight: 700, color: 'var(--text-main)' }}>{telemetry.xgTrend}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {searchHistory.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No local search history isolated.</p> :
                                            searchHistory.map((s, i) => (
                                                <div key={i} className="task-box" style={{ fontSize: '12px' }}>
                                                    <strong>{s.match_predictions?.home_team} vs {s.match_predictions?.away_team}</strong> — {s.compilation_date}
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* PAGE 4 */}
                    <section className="snap-page-section" id="page-4">
                        <div style={{ textAlign: 'center', margin: 'auto' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>METRIC ECOSYSTEM & TELEMETRY</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Professional documentation on predictive modeling and odds frameworks.</p>
                        </div>
                        <footer style={{ padding: '18px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', borderTop: '1px solid var(--border-primary)' }}>
                            © 2026 MTL Predictions • Professional Football Performance Playbooks
                        </footer>
                    </section>
                </div>
            </main>

            {/* FULL SCREEN MATCH OVERVIEW DRAWER */}
            <div className={`sliding-overlay-drawer ${isFsMatchOpen ? 'open' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', paddingBottom: '14px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {selectedMatch?.match_predictions?.home_team} vs {selectedMatch?.match_predictions?.away_team}
                    </h2>
                    <button className="btn-ui-action" onClick={() => setIsFsMatchOpen(false)}>Close Layer</button>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="task-box">
                        <h3>Analytical Synthesis</h3>
                        <p style={{ marginTop: '8px', lineHeight: '1.6' }}>{selectedMatch?.match_predictions?.analytical_synthesis}</p>
                    </div>
                    <button className="btn-ui-action" style={{ background: 'var(--accent-emerald)', color: '#fff' }} onClick={() => setIsOddsDrawerOpen(true)}>Open Coefficients & Odds Sheet</button>
                </div>
            </div>

            {/* ODDS DRAWER */}
            <div className={`sliding-overlay-drawer ${isOddsDrawerOpen ? 'open' : ''}`} style={{ maxWidth: '440px', left: 'auto', right: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', paddingBottom: '14px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800 }}>ODDS COEFFICIENT SHEET</h3>
                    <button className="btn-ui-action" onClick={() => setIsOddsDrawerOpen(false)}>Close</button>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="task-box">
                        <strong>Home Win Probability:</strong> {selectedMatch?.match_predictions?.prob_home_win}
                    </div>
                    <div className="task-box">
                        <strong>Away Win Probability:</strong> {selectedMatch?.match_predictions?.prob_away_win}
                    </div>
                    <div className="task-box">
                        <strong>BTTS Probability:</strong> {selectedMatch?.match_predictions?.prob_btts}%
                    </div>
                </div>
            </div>

            {/* NOTIFICATIONS DRAWER */}
            <div className={`sliding-overlay-drawer ${isNotificationsOpen ? 'open' : ''}`} style={{ maxWidth: '440px', left: 'auto', right: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', paddingBottom: '14px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800 }}>NOTIFICATION STREAM</h3>
                    <button className="btn-ui-action" onClick={() => setIsNotificationsOpen(false)}>Close</button>
                </div>
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notificationsStream.map(n => (
                        <div key={n.id} className="task-box" style={{ fontSize: '12px' }}>
                            <div>{n.text}</div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{n.time}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* PRIVACY DRAWER */}
            <div className={`sliding-overlay-drawer ${isPrivacyOpen ? 'open' : ''}`} style={{ maxWidth: '520px', left: 'auto', right: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', paddingBottom: '14px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 800 }}>PRIVACY & COMPLIANCE</h3>
                    <button className="btn-ui-action" onClick={() => setIsPrivacyOpen(false)}>Close</button>
                </div>
                <div style={{ marginTop: '16px', fontSize: '12px', lineHeight: '1.6' }}>
                    <p>All match predictions and performance metrics are cached securely within your local browser sandbox instance state layers.</p>
                </div>
            </div>

            {/* CONFIRMATION MODAL */}
            {confirmationModal.isOpen && (
                <div className="center-popup-modal-container">
                    <div className="popup-modal-wrapper-box">
                        <h4 style={{ fontSize: '14px', fontWeight: 800 }}>{confirmationModal.title}</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '8px 0 18px' }}>{confirmationModal.body}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button className="btn-ui-action" onClick={() => setConfirmationModal({ isOpen: false })}>Cancel</button>
                            <button className="btn-ui-action" style={{ background: 'var(--accent-emerald)', color: '#fff' }} onClick={() => { confirmationModal.onConfirm?.(); setConfirmationModal({ isOpen: false }); }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOAST NOTIFICATION */}
            {toastMessage && (
                <div style={{ position: 'fixed', bottom: '20px', left: '20px', background: 'var(--bg-surface)', border: '1px solid var(--accent-gold)', padding: '12px 18px', borderRadius: '10px', zIndex: 999999, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-gold)' }}>{toastMessage}</span>
                </div>
            )}
        </div>
    );
    }
