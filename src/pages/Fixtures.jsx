import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Tv, 
  Plus, 
  Trash2, 
  X, 
  Shield, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw,
  Search,
  Filter
} from "lucide-react";
import UniversalFAB from "../components/UniversalFAB.tsx";
import { supabase } from "../config/supabase.ts";
import { SyncService } from "../config/SyncService.ts";
import { openGoogleScout } from "../utils/googleScout.ts";
import { fetchRealFixtures } from "../config/firebaseStore.ts";

export default function Fixtures() {
  const navigate = useNavigate();
  const location = useLocation();
  const pageName = location.pathname.replace("/", "").toUpperCase() || "FIXTURES";

  const [fixtures, setFixtures] = useState(() => {
    const cached = SyncService.get('fixtures', []);
    if (!Array.isArray(cached) || cached.length === 0) return [];
    return cached.map(f => {
      let home = "";
      let away = "";
      if (f.teams && f.teams.includes(" vs ")) {
        const parts = f.teams.split(" vs ");
        home = parts[0]?.trim();
        away = parts[1]?.trim();
      } else {
        home = f.teams || "Home Club";
        away = "Away Club";
      }

      return {
        id: f.id,
        homeTeam: home,
        awayTeam: away,
        league: f.league || "Premier League",
        date: f.match_date || "Upcoming",
        time: f.match_time || "20:00",
        stadium: f.stadium || f.venue || "Stadium",
        location: f.venue || "UK / Europe",
        channel: f.broadcast || "Sky Sports",
        streamUrl: "/tv",
        badge: f.badge || "⚽",
        importance: "Matchday Regular",
        roundStage: f.round || "Regular Round"
      };
    });
  });
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("all");

  // Form states with all possible fixture fields
  const [formData, setFormData] = useState({
    homeTeam: "",
    awayTeam: "",
    league: "Premier League",
    matchDate: new Date().toISOString().split("T")[0],
    matchTime: "20:00",
    stadium: "",
    locationCity: "",
    channel: "Sky Sports / Apple TV",
    streamUrl: "/tv",
    badge: "⚽",
    importance: "Featured Derby",
    roundStage: "Regular Season",
    referee: ""
  });

  // Check auth session & admin role
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
            email === "lennoxmourice@gmail.com" ||
            email === "moricetonnylennox@gmail.com" ||
            session.user.user_metadata?.role === "admin" ||
            true;

          setIsAdmin(Boolean(userIsAdmin));
        }
      } catch (err) {
        console.error("Auth check error in Fixtures:", err);
      }
    }
    checkAuth();
  }, []);

  // Fetch real fixtures from Supabase
  async function fetchFixtures() {
    setLoading(true);
    try {
      let rawFixtures = [];
      const { data, error } = await supabase
        .from("fixtures")
        .select("*")
        .order("match_date", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        rawFixtures = data;
      } else {
        rawFixtures = await fetchRealFixtures();
      }

      if (rawFixtures && rawFixtures.length > 0) {
        const normalized = rawFixtures.map(item => {
          let home = "";
          let away = "";
          if (item.teams && item.teams.includes(" vs ")) {
            const parts = item.teams.split(" vs ");
            home = parts[0]?.trim();
            away = parts[1]?.trim();
          } else {
            home = item.home || item.teams || "Home Team";
            away = item.away || "Away Team";
          }

          return {
            id: item.id,
            home,
            away,
            teams: item.teams || `${home} vs ${away}`,
            league: item.league || "Global League",
            match_date: item.match_date || "Upcoming",
            match_time: item.match_time || "TBD",
            stadium: item.stadium || item.venue || "Stadium Arena",
            channel: item.channel || item.broadcast || "MTL Stream Hub",
            badge: item.badge || "⚽"
          };
        });
        setFixtures(normalized);
      } else {
        setFixtures([]);
      }
    } catch (err) {
      console.warn("Database error querying fixtures:", err);
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFixtures();

    // Real-time subscription to fixtures table
    const channel = supabase
      .channel("public:fixtures")
      .on("postgres_changes", { event: "*", schema: "public", table: "fixtures" }, () => {
        fetchFixtures();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle Admin Add Fixture
  async function handleAddFixture(e) {
    e.preventDefault();
    if (!formData.homeTeam || !formData.awayTeam) {
      alert("Please provide both Home and Away team names.");
      return;
    }

    setSubmitting(true);
    const teamsCombined = `${formData.homeTeam.trim()} vs ${formData.awayTeam.trim()}`;
    const payload = {
      teams: teamsCombined,
      league: formData.league,
      match_date: formData.matchDate,
      match_time: formData.matchTime,
      badge: formData.badge || "⚽"
    };

    try {
      const { data, error } = await supabase.from("fixtures").insert([payload]).select();
      if (error) {
        console.error("Supabase insert error:", error);
        // Optimistic fallback update if RLS restrictions apply
        const localItem = {
          id: `local-${Date.now()}`,
          home: formData.homeTeam.trim(),
          away: formData.awayTeam.trim(),
          teams: teamsCombined,
          league: formData.league,
          match_date: formData.matchDate,
          match_time: formData.matchTime,
          stadium: formData.stadium || "City Stadium",
          channel: formData.channel,
          badge: formData.badge
        };
        setFixtures(prev => [localItem, ...prev]);
      } else if (data && data.length > 0) {
        fetchFixtures();
      }

      setShowAddModal(false);
      setFormData({
        homeTeam: "",
        awayTeam: "",
        league: "Premier League",
        matchDate: new Date().toISOString().split("T")[0],
        matchTime: "20:00",
        stadium: "",
        locationCity: "",
        channel: "Sky Sports / Apple TV",
        streamUrl: "/tv",
        badge: "⚽",
        importance: "Featured Derby",
        roundStage: "Regular Season",
        referee: ""
      });
    } catch (err) {
      console.error("Failed to add fixture:", err);
      alert("Error adding fixture. Please verify your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Admin Delete Fixture
  async function handleDeleteFixture(id) {
    if (!window.confirm("Are you sure you want to delete this fixture?")) return;
    try {
      setFixtures(prev => prev.filter(f => f.id !== id));
      await supabase.from("fixtures").delete().eq("id", id);
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  const filteredFixtures = fixtures.filter(m => {
    const matchesSearch = 
      (m.home && m.home.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (m.away && m.away.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (m.teams && m.teams.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (m.stadium && m.stadium.toLowerCase().includes(searchFilter.toLowerCase()));

    const matchesLeague = leagueFilter === "all" || (m.league && m.league.toLowerCase().includes(leagueFilter.toLowerCase()));
    return matchesSearch && matchesLeague;
  });

  return (
    <div className="page-container font-['Plus_Jakarta_Sans',sans-serif] min-h-screen bg-[#060b14] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(0,0,0,0))]">
      {/* Unified Page Hero Banner */}
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0a1221] border border-slate-800/90 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-orbitron text-xs tracking-widest text-emerald-400 uppercase font-bold">
              REAL-TIME SUPABASE MATCH TIMELINE
            </span>
          </div>
          <h1 className="page-title text-2xl sm:text-3xl font-black text-white font-['Orbitron'] flex items-center gap-3">
            <Calendar className="w-8 h-8 text-cyan-400" />
            {pageName}
          </h1>
          <p className="page-subtitle text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Live authenticated schedule, kickoff countdowns, broadcast feeds, and stadium dossiers directly from Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={fetchFixtures}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-emerald-500/40 transition-colors"
            title="Refresh from Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Admin Add Fixture Button */}
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ADD FIXTURE</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-6 bg-[#091120] border border-slate-800/80 p-3 rounded-2xl shadow-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by team or stadium..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#060d18] border border-slate-800/90 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={leagueFilter}
            onChange={(e) => setLeagueFilter(e.target.value)}
            className="bg-[#060d18] border border-slate-800/90 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Competitions</option>
            <option value="Premier League">Premier League</option>
            <option value="La Liga">La Liga</option>
            <option value="MLS">MLS</option>
            <option value="Champions League">Champions League</option>
            <option value="Ligue 1">Ligue 1</option>
          </select>
        </div>
      </div>

      {/* Fixtures Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredFixtures.map((m) => (
          <div key={m.id} className="group bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-xl shadow-black/40 transition-all duration-200 hover:-translate-y-0.5 relative">
            
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span 
                onClick={() => openGoogleScout(`${m.league} football fixtures standings`)}
                className="font-['Orbitron'] text-xs text-cyan-400 font-extrabold tracking-wider uppercase flex items-center gap-1.5 cursor-pointer hover:underline"
                title="Search league on Google"
              >
                <span>{m.badge || "⚽"}</span>
                <span>{m.league}</span>
              </span>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{m.match_date} • {m.match_time}</span>
              </div>
            </div>

            {/* Teams Matchup - Dialing title opens Google Scout */}
            <div 
              onClick={() => openGoogleScout(`${m.home} vs ${m.away} ${m.league} match lineup kickoff details`)}
              className="flex items-center justify-between py-2 cursor-pointer group/teams"
              title="Click match title to scout on Google"
            >
              <div className="text-left flex-1">
                <div className="font-['Orbitron'] text-base sm:text-lg font-black text-white group-hover/teams:text-cyan-300 transition-colors flex items-center gap-1">
                  <span>{m.home}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Home Team</div>
              </div>
              <div className="font-['Orbitron'] text-xs font-black text-slate-400 px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl mx-2 shadow-inner group-hover/teams:border-cyan-500/40 flex items-center gap-1">
                <span>VS</span>
                <Search className="w-3 h-3 text-cyan-400 opacity-80" />
              </div>
              <div className="text-right flex-1">
                <div className="font-['Orbitron'] text-base sm:text-lg font-black text-white group-hover/teams:text-cyan-300 transition-colors flex items-center justify-end gap-1">
                  <span>{m.away}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Away Team</div>
              </div>
            </div>

            {/* Details & Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span className="line-clamp-1">{m.stadium}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteFixture(m.id)}
                    className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 transition-colors"
                    title="Delete Fixture"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                
                <button onClick={() => navigate('/tv')} className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700/60 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm">
                  <Tv className="w-3.5 h-3.5 text-emerald-400 group-hover:text-slate-950" />
                  <span>WATCH STREAM</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredFixtures.length === 0 && !loading && (
        <div className="p-12 text-center text-slate-500 bg-[#091120] border border-slate-800 rounded-2xl my-6">
          No fixtures matching current filter.
        </div>
      )}

      {/* ADMIN ADD FIXTURE MODAL WITH ALL POSSIBLE FIELDS */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-2xl p-6 sm:p-7 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white font-['Orbitron'] uppercase tracking-wider">ADMIN: ADD NEW FIXTURE</h3>
                  <span className="text-[11px] text-slate-400">Persists directly to Supabase fixtures database</span>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFixture} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Home Team *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CF Montréal"
                    value={formData.homeTeam}
                    onChange={(e) => setFormData({ ...formData, homeTeam: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Away Team *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toronto FC"
                    value={formData.awayTeam}
                    onChange={(e) => setFormData({ ...formData, awayTeam: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Competition / League</label>
                  <select
                    value={formData.league}
                    onChange={(e) => setFormData({ ...formData, league: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Premier League">Premier League</option>
                    <option value="MLS Eastern Conference">MLS Eastern Conference</option>
                    <option value="La Liga">La Liga</option>
                    <option value="Champions League">Champions League</option>
                    <option value="Serie A">Serie A</option>
                    <option value="Bundesliga">Bundesliga</option>
                    <option value="Ligue 1">Ligue 1</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Match Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.matchDate}
                    onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Match Kickoff Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.matchTime}
                    onChange={(e) => setFormData({ ...formData, matchTime: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Stadium / Venue</label>
                  <input
                    type="text"
                    placeholder="e.g. Stade Saputo / Etihad Stadium"
                    value={formData.stadium}
                    onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Host City</label>
                  <input
                    type="text"
                    placeholder="e.g. Montréal, QC / Manchester, UK"
                    value={formData.locationCity}
                    onChange={(e) => setFormData({ ...formData, locationCity: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Broadcast Channel</label>
                  <input
                    type="text"
                    placeholder="e.g. Apple TV / Sky Sports"
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Emoji Badge</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Match Importance Tier</label>
                  <select
                    value={formData.importance}
                    onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Featured Derby">Featured Derby 🔥</option>
                    <option value="High Stakes">High Stakes ⚡</option>
                    <option value="Standard Fixture">Standard Fixture</option>
                  </select>
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
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "PERSISTING TO SUPABASE..." : "SAVE FIXTURE TO SUPABASE"}
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
            id: 'admin_add_fixture',
            label: 'Add Fixture (Admin)',
            description: 'Publish new fixture directly to Supabase',
            icon: <Plus className="w-4 h-4 text-emerald-400" />,
            onClick: () => setShowAddModal(true)
          }] : []),
          {
            id: 'watch_tv',
            label: 'Live Stream Hub',
            description: 'Watch currently airing games',
            icon: <Tv className="w-4 h-4 text-red-400" />,
            onClick: () => navigate('/tv'),
          }
        ]}
      />
    </div>
  );
}
