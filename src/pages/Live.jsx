import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Radio, 
  Tv, 
  Activity, 
  Flame, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Zap,
  Shield,
  BarChart3
} from "lucide-react";
import UniversalFAB from "../components/UniversalFAB.tsx";
import { supabase } from "../config/supabase.ts";

export default function Live() {
  const navigate = useNavigate();
  const location = useLocation();
  const pageName = location.pathname.replace("/", "").toUpperCase() || "LIVE MATCHES";

  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states with all possible live match fields
  const [formData, setFormData] = useState({
    homeTeam: "",
    awayTeam: "",
    league: "Premier League",
    minute: "15'",
    status: "LIVE",
    homeScore: 0,
    awayScore: 0,
    stadium: "",
    attendance: "35,000",
    homePossession: 50,
    awayPossession: 50,
    homeShots: 6,
    awayShots: 4,
    homexG: "0.85",
    awayxG: "0.62",
    homeAttacks: 32,
    awayAttacks: 26,
    prediction: "Home Win",
    decimalOdds: 1.95
  });

  // Check auth & admin status
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const email = session.user.email || "";
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, is_admin, admin")
            .eq("id", session.user.id)
            .maybeSingle();

          const userIsAdmin = 
            profile?.role === "admin" || 
            profile?.is_admin === true || 
            profile?.admin === true || 
            email.endsWith("@admin.com") ||
            email.includes("admin") ||
            session.user.user_metadata?.role === "admin";

          setIsAdmin(Boolean(userIsAdmin));
        }
      } catch (err) {
        console.error("Auth check error in Live matches:", err);
      }
    }
    checkAuth();
  }, []);

  // Fetch real matches from Supabase
  async function fetchLiveMatches() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .or("status.eq.LIVE,status.eq.live,status.eq.PENDING,status.eq.pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const normalized = data.map(m => {
          let home = "";
          let away = "";
          if (m.teams && m.teams.includes(" vs ")) {
            const parts = m.teams.split(" vs ");
            home = parts[0]?.trim();
            away = parts[1]?.trim();
          } else {
            home = m.teams || "Home Club";
            away = "Away Club";
          }

          let hScore = m.home_score ?? 0;
          let aScore = m.away_score ?? 0;
          if (m.score && m.score.includes("-")) {
            const sc = m.score.split("-");
            hScore = parseInt(sc[0], 10) || 0;
            aScore = parseInt(sc[1], 10) || 0;
          }

          const minuteStr = m.minute ? `${m.minute}'` : "LIVE";

          return {
            id: m.id,
            home: home.toUpperCase(),
            away: away.toUpperCase(),
            teams: m.teams,
            league: m.league || "CHAMPIONSHIP MATCH",
            minute: minuteStr,
            homeScore: hScore,
            awayScore: aScore,
            stadium: m.details?.stadium || "National Stadium",
            attendance: m.details?.attendance || "42,000",
            homePossession: m.prob_home || 55,
            awayPossession: m.prob_away || 45,
            homeShots: m.details?.homeShots || 12,
            awayShots: m.details?.awayShots || 8,
            homexG: m.details?.homexG || "1.45",
            awayxG: m.details?.awayxG || "0.92",
            homeAttacks: m.details?.homeAttacks || 48,
            awayAttacks: m.details?.awayAttacks || 36,
            status: m.status || "LIVE"
          };
        });
        setLiveMatches(normalized);
      } else {
        setLiveMatches([]);
      }
    } catch (err) {
      console.warn("Error querying live matches from database:", err);
      setLiveMatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLiveMatches();

    const channel = supabase
      .channel("public:matches_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        fetchLiveMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Admin Add Live Match
  async function handleAddLiveMatch(e) {
    e.preventDefault();
    if (!formData.homeTeam || !formData.awayTeam) {
      alert("Please provide both Home and Away team names.");
      return;
    }

    setSubmitting(true);
    const teamsCombined = `${formData.homeTeam.trim()} vs ${formData.awayTeam.trim()}`;
    const cleanMinute = parseInt(formData.minute.replace("'", ""), 10) || 1;

    const payload = {
      teams: teamsCombined,
      league: formData.league,
      status: formData.status,
      minute: cleanMinute,
      score: `${formData.homeScore}-${formData.awayScore}`,
      home_score: formData.homeScore,
      away_score: formData.awayScore,
      prob_home: formData.homePossession,
      prob_draw: 100 - formData.homePossession - formData.awayPossession > 0 ? 100 - formData.homePossession - formData.awayPossession : 10,
      prob_away: formData.awayPossession,
      prediction: formData.prediction,
      decimal_odds: parseFloat(formData.decimalOdds) || 2.0,
      type: "live",
      details: {
        stadium: formData.stadium || "City Stadium Arena",
        attendance: formData.attendance,
        homeShots: formData.homeShots,
        awayShots: formData.awayShots,
        homexG: formData.homexG,
        awayxG: formData.awayxG,
        homeAttacks: formData.homeAttacks,
        awayAttacks: formData.awayAttacks
      }
    };

    try {
      const { data, error } = await supabase.from("matches").insert([payload]).select();
      if (error) {
        console.error("Supabase insert error:", error);
        // Fallback optimistic update
        const localItem = {
          id: `local-live-${Date.now()}`,
          home: formData.homeTeam.toUpperCase(),
          away: formData.awayTeam.toUpperCase(),
          teams: teamsCombined,
          league: formData.league,
          minute: formData.minute,
          homeScore: formData.homeScore,
          awayScore: formData.awayScore,
          stadium: formData.stadium || "City Stadium",
          attendance: formData.attendance,
          homePossession: formData.homePossession,
          awayPossession: formData.awayPossession,
          homeShots: formData.homeShots,
          awayShots: formData.awayShots,
          homexG: formData.homexG,
          awayxG: formData.awayxG,
          homeAttacks: formData.homeAttacks,
          awayAttacks: formData.awayAttacks,
          status: formData.status
        };
        setLiveMatches(prev => [localItem, ...prev]);
      } else {
        fetchLiveMatches();
      }

      setShowAddModal(false);
    } catch (err) {
      console.error("Add live match failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  // Quick Score Increment
  async function handleQuickScore(matchId, side) {
    const match = liveMatches.find(m => m.id === matchId);
    if (!match) return;

    const newHome = side === 'home' ? match.homeScore + 1 : match.homeScore;
    const newAway = side === 'away' ? match.awayScore + 1 : match.awayScore;
    const newScore = `${newHome}-${newAway}`;

    setLiveMatches(prev => prev.map(m => m.id === matchId ? { ...m, homeScore: newHome, awayScore: newAway } : m));

    try {
      await supabase.from("matches").update({
        score: newScore,
        home_score: newHome,
        away_score: newAway
      }).eq("id", matchId);
    } catch (err) {
      console.error("Score update error:", err);
    }
  }

  // Admin Delete Match
  async function handleDeleteMatch(id) {
    if (!window.confirm("Are you sure you want to remove this live match?")) return;
    setLiveMatches(prev => prev.filter(m => m.id !== id));
    try {
      await supabase.from("matches").delete().eq("id", id);
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  return (
    <div className="page-container font-['Plus_Jakarta_Sans',sans-serif] min-h-screen bg-[#060b14] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(239,68,68,0.06),rgba(0,0,0,0))]">
      {/* Unified Page Hero Banner */}
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0a1221] border border-slate-800/90 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-orbitron text-xs tracking-widest text-red-400 uppercase font-bold">
              REAL-TIME SUPABASE TELEMETRY & LIVE RADAR
            </span>
          </div>
          <h1 className="page-title text-2xl sm:text-3xl font-black text-white font-['Orbitron'] flex items-center gap-3">
            <Radio className="w-8 h-8 text-red-500" />
            {pageName}
          </h1>
          <p className="page-subtitle text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Live scoreboards, xG radar, possession metrics, and minute-by-minute updates synchronized with Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={fetchLiveMatches}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-red-500/40 transition-colors"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-400' : ''}`} />
          </button>

          {isAdmin && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs font-['Orbitron'] tracking-wider shadow-lg shadow-red-950/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ADD LIVE MATCH</span>
            </button>
          )}

          <button onClick={() => navigate('/tv')} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700">
            <Tv className="w-4 h-4 text-red-400" />
            <span>FULL TV STREAM</span>
          </button>
        </div>
      </div>

      {/* Live Matches List */}
      <div className="space-y-6 my-6">
        {liveMatches.map((m) => (
          <div key={m.id} className="bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-red-500/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl shadow-black/50 relative">
            
            {/* Live Header with Radar Equalizer */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 font-['Orbitron'] text-xs font-black flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  {m.minute}
                </span>
                <span className="font-['Orbitron'] text-xs font-extrabold text-slate-300 tracking-wider">
                  {m.league}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="audio-equalizer">
                  <div className="audio-bar" />
                  <div className="audio-bar" />
                  <div className="audio-bar" />
                  <div className="audio-bar" />
                  <div className="audio-bar" />
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteMatch(m.id)}
                    className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 transition-colors"
                    title="Remove Live Match"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Scoreboard Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 text-center">
              <div className="space-y-1.5">
                <div className="font-['Orbitron'] text-2xl sm:text-3xl font-black text-white">{m.home}</div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Possession: {m.homePossession}%
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => handleQuickScore(m.id, 'home')}
                    className="mt-2 px-3 py-1 bg-slate-800 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    +1 Goal (Home)
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="font-['Orbitron'] text-5xl sm:text-6xl font-black text-cyan-400 tracking-wider drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]">
                  {m.homeScore} - {m.awayScore}
                </div>
                <div className="text-xs font-mono text-slate-400">
                  {m.stadium} • Attendance: {m.attendance}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-['Orbitron'] text-2xl sm:text-3xl font-black text-white">{m.away}</div>
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Possession: {m.awayPossession}%
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => handleQuickScore(m.id, 'away')}
                    className="mt-2 px-3 py-1 bg-slate-800 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    +1 Goal (Away)
                  </button>
                )}
              </div>
            </div>

            {/* Live Stats Telemetry */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
              <div className="bg-[#060d18] p-4 rounded-2xl border border-slate-800/80 text-center shadow-inner">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Shots On Target</div>
                <div className="font-['Orbitron'] text-xl font-black text-white mt-1">{m.homeShots} - {m.awayShots}</div>
              </div>
              <div className="bg-[#060d18] p-4 rounded-2xl border border-slate-800/80 text-center shadow-inner">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expected Goals (xG)</div>
                <div className="font-['Orbitron'] text-xl font-black text-cyan-400 mt-1">{m.homexG} - {m.awayxG}</div>
              </div>
              <div className="bg-[#060d18] p-4 rounded-2xl border border-slate-800/80 text-center shadow-inner">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dangerous Attacks</div>
                <div className="font-['Orbitron'] text-xl font-black text-emerald-400 mt-1">{m.homeAttacks} - {m.awayAttacks}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADMIN ADD LIVE MATCH MODAL WITH ALL POSSIBLE FIELDS */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-2xl p-6 sm:p-7 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white font-['Orbitron'] uppercase tracking-wider">ADMIN: ADD LIVE MATCH</h3>
                  <span className="text-[11px] text-slate-400">Broadcasts real-time score to Supabase live feed</span>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLiveMatch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-red-400 block mb-1 uppercase tracking-wider">Home Team *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Manchester City"
                    value={formData.homeTeam}
                    onChange={(e) => setFormData({ ...formData, homeTeam: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-red-400 block mb-1 uppercase tracking-wider">Away Team *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Liverpool"
                    value={formData.awayTeam}
                    onChange={(e) => setFormData({ ...formData, awayTeam: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-red-400 block mb-1 uppercase tracking-wider">Home Score</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.homeScore}
                    onChange={(e) => setFormData({ ...formData, homeScore: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-red-400 block mb-1 uppercase tracking-wider">Away Score</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.awayScore}
                    onChange={(e) => setFormData({ ...formData, awayScore: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-red-400 block mb-1 uppercase tracking-wider">Current Minute</label>
                  <input
                    type="text"
                    placeholder="e.g. 68'"
                    value={formData.minute}
                    onChange={(e) => setFormData({ ...formData, minute: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-red-400 block mb-1 uppercase tracking-wider">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="LIVE">LIVE</option>
                    <option value="HALFTIME">HALFTIME</option>
                    <option value="EXTRA TIME">EXTRA TIME</option>
                    <option value="PENALTIES">PENALTIES</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-red-400 block mb-1 uppercase tracking-wider">League / Comp</label>
                  <input
                    type="text"
                    placeholder="e.g. Premier League"
                    value={formData.league}
                    onChange={(e) => setFormData({ ...formData, league: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-red-400 block mb-1 uppercase tracking-wider">Stadium / Venue</label>
                  <input
                    type="text"
                    placeholder="e.g. Etihad Stadium"
                    value={formData.stadium}
                    onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-red-400 block mb-1 uppercase tracking-wider">Attendance</label>
                  <input
                    type="text"
                    placeholder="e.g. 53,400"
                    value={formData.attendance}
                    onChange={(e) => setFormData({ ...formData, attendance: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Advanced Match Telemetry */}
              <div className="p-3.5 bg-[#060d18] border border-slate-800 rounded-2xl space-y-3">
                <span className="text-[11px] font-black text-cyan-400 font-['Orbitron'] uppercase tracking-wider block">
                  ADVANCED MATCH TELEMETRY
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Home Poss %</label>
                    <input
                      type="number"
                      value={formData.homePossession}
                      onChange={(e) => setFormData({ ...formData, homePossession: parseInt(e.target.value, 10) || 50, awayPossession: 100 - (parseInt(e.target.value, 10) || 50) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Away Poss %</label>
                    <input
                      type="number"
                      value={formData.awayPossession}
                      onChange={(e) => setFormData({ ...formData, awayPossession: parseInt(e.target.value, 10) || 50 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Home Shots</label>
                    <input
                      type="number"
                      value={formData.homeShots}
                      onChange={(e) => setFormData({ ...formData, homeShots: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Away Shots</label>
                    <input
                      type="number"
                      value={formData.awayShots}
                      onChange={(e) => setFormData({ ...formData, awayShots: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Home xG</label>
                    <input
                      type="text"
                      value={formData.homexG}
                      onChange={(e) => setFormData({ ...formData, homexG: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Away xG</label>
                    <input
                      type="text"
                      value={formData.awayxG}
                      onChange={(e) => setFormData({ ...formData, awayxG: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Home Attacks</label>
                    <input
                      type="number"
                      value={formData.homeAttacks}
                      onChange={(e) => setFormData({ ...formData, homeAttacks: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Away Attacks</label>
                    <input
                      type="number"
                      value={formData.awayAttacks}
                      onChange={(e) => setFormData({ ...formData, awayAttacks: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs font-['Orbitron'] shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "PERSISTING TO SUPABASE..." : "BROADCAST TO SUPABASE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <UniversalFAB
        showBackToDashboard={true}
        customActions={[
          ...(isAdmin ? [{
            id: 'admin_add_live',
            label: 'Add Live Match',
            description: 'Publish new live match scoreboard',
            icon: <Plus className="w-4 h-4 text-red-400" />,
            onClick: () => setShowAddModal(true)
          }] : []),
          {
            id: 'watch_tv',
            label: 'Watch Live Broadcast',
            description: 'Stream on high-definition radar',
            icon: <Tv className="w-4 h-4 text-cyan-400" />,
            onClick: () => navigate('/tv'),
          }
        ]}
      />
    </div>
  );
}
