import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Shield, 
  Users, 
  Trophy, 
  Globe, 
  Plus, 
  Trash2, 
  X, 
  RefreshCw,
  Search,
  Filter,
  MapPin,
  Calendar
} from "lucide-react";
import UniversalFAB from "../components/UniversalFAB.tsx";
import { supabase } from "../config/supabase.ts";

export default function Clubs() {
  const navigate = useNavigate();
  const location = useLocation();
  const pageName = location.pathname.replace("/", "").toUpperCase() || "CLUBS";

  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("all");

  // Form states with all possible club dossier fields
  const [formData, setFormData] = useState({
    name: "",
    league: "Premier League",
    country: "England",
    founded: "1900",
    manager: "",
    stadium: "",
    capacity: "50,000",
    stars: "",
    badge: "🛡️",
    motto: "Excellence & Tactical Mastery"
  });

  // Fetch real clubs dynamically from Supabase
  const fetchClubsFromDB = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error querying clubs from database:", error);
        setClubs([]);
      } else {
        const normalized = (data || []).map(c => ({
          id: c.id,
          name: c.name,
          league: c.league || "Global League",
          country: c.country || "International",
          founded: c.founded_year ? String(c.founded_year) : (c.founded || "1900"),
          manager: c.manager || "Head Coach",
          stadium: c.stadium || "Home Stadium",
          capacity: c.capacity ? Number(c.capacity).toLocaleString() : "45,000",
          stars: Array.isArray(c.key_players) ? c.key_players.join(", ") : (c.stars || "Squad Roster"),
          badge: c.badge_url || c.badge || "🛡️"
        }));
        setClubs(normalized);
      }
    } catch (err) {
      console.error("Failed to fetch clubs from Supabase:", err);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

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
            session.user.user_metadata?.role === "admin";

          setIsAdmin(Boolean(userIsAdmin));
        }
      } catch (err) {
        console.error("Auth check error in Clubs:", err);
      }
    }
    checkAuth();
    fetchClubsFromDB();

    // Subscribe to realtime database updates on clubs table
    const channel = supabase
      .channel("public:clubs_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "clubs" }, () => {
        fetchClubsFromDB();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Admin Add Club Dossier directly to Supabase
  const handleAddClub = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.stadium.trim()) {
      alert("Please provide the club name and stadium.");
      return;
    }

    setSubmitting(true);
    try {
      const parsedCapacity = parseInt(formData.capacity.replace(/,/g, ""), 10) || 40000;
      const parsedYear = parseInt(formData.founded, 10) || 1900;
      const keyPlayersArray = formData.stars ? formData.stars.split(",").map(s => s.trim()) : [];

      const { data, error } = await supabase.from("clubs").insert([{
        name: formData.name.trim(),
        league: formData.league,
        manager: formData.manager.trim() || "Head Coach",
        founded_year: parsedYear,
        stadium: formData.stadium.trim(),
        capacity: parsedCapacity,
        badge_url: formData.badge || "🛡️",
        key_players: keyPlayersArray
      }]).select();

      if (error) {
        alert("Database error adding club: " + error.message);
      } else {
        setShowAddModal(false);
        setFormData({
          name: "",
          league: "Premier League",
          country: "England",
          founded: "1900",
          manager: "",
          stadium: "",
          capacity: "50,000",
          stars: "",
          badge: "🛡️",
          motto: "Excellence & Tactical Mastery"
        });
        fetchClubsFromDB();
      }
    } catch (err) {
      alert("Failed to save club to database: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Admin Delete Club directly from Supabase
  const handleDeleteClub = async (id) => {
    if (!window.confirm("Are you sure you want to remove this club dossier from the database?")) return;
    try {
      const { error } = await supabase.from("clubs").delete().eq("id", id);
      if (error) {
        alert("Database error deleting club: " + error.message);
      } else {
        setClubs(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      alert("Failed to delete club: " + err.message);
    }
  };

  const filteredClubs = clubs.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.manager.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.stadium.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLeague = selectedLeague === "all" || c.league.toLowerCase().includes(selectedLeague.toLowerCase());
    return matchesSearch && matchesLeague;
  });

  return (
    <div className="page-container font-['Plus_Jakarta_Sans',sans-serif] min-h-screen bg-[#060b14] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.06),rgba(0,0,0,0))]">
      {/* Unified Page Hero Banner */}
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0a1221] border border-slate-800/90 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-orbitron text-xs tracking-widest text-emerald-400 uppercase font-bold">
              GLOBAL FOOTBALL DOSSIERS & SQUAD REGISTRIES
            </span>
          </div>
          <h1 className="page-title text-2xl sm:text-3xl font-black text-white font-['Orbitron'] flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            {pageName}
          </h1>
          <p className="page-subtitle text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Squad registries, club tactical dossiers, manager profiles, and stadium statistics.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ADD CLUB DOSSIER</span>
            </button>
          )}

          <button onClick={() => navigate('/fixtures')} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>FIXTURES SCHEDULE</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-6 bg-[#091120] border border-slate-800/80 p-3 rounded-2xl shadow-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search club name, manager, or home stadium..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#060d18] border border-slate-800/90 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className="bg-[#060d18] border border-slate-800/90 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Competitions</option>
            <option value="Premier League">Premier League</option>
            <option value="La Liga">La Liga</option>
            <option value="Major League Soccer">MLS</option>
            <option value="Bundesliga">Bundesliga</option>
          </select>
        </div>
      </div>

      {/* Clubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
        {filteredClubs.map((club) => (
          <div key={club.id} className="group bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl p-6 space-y-4 shadow-xl shadow-black/40 transition-all duration-200 hover:-translate-y-0.5 relative">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="font-['Orbitron'] text-xl font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                  <span>{club.badge}</span>
                  <span>{club.name}</span>
                </h3>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mt-0.5">{club.league}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteClub(club.id)}
                    className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 transition-colors"
                    title="Delete Club"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="w-11 h-11 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-center shadow-md">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#060d18] p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 uppercase block font-semibold text-[10px] tracking-wider">Head Coach</span>
                <span className="font-bold text-white text-sm">{club.manager}</span>
              </div>
              <div className="bg-[#060d18] p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 uppercase block font-semibold text-[10px] tracking-wider">Home Venue</span>
                <span className="font-bold text-white text-sm">{club.stadium}</span>
              </div>
              <div className="bg-[#060d18] p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 uppercase block font-semibold text-[10px] tracking-wider">Stadium Capacity</span>
                <span className="font-bold text-cyan-300 font-mono text-sm">{club.capacity}</span>
              </div>
              <div className="bg-[#060d18] p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 uppercase block font-semibold text-[10px] tracking-wider">Founded</span>
                <span className="font-bold text-amber-400 font-mono text-sm">{club.founded}</span>
              </div>
            </div>

            {club.stars && (
              <div className="pt-2 text-xs text-slate-400 border-t border-slate-800/80">
                <span className="text-emerald-400 font-bold block mb-0.5">Key Talismanic Players:</span>
                <span className="text-slate-300">{club.stars}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredClubs.length === 0 && (
        <div className="p-12 text-center text-slate-500 bg-[#091120] border border-slate-800 rounded-2xl my-6">
          No club dossiers matching search criteria.
        </div>
      )}

      {/* ADMIN ADD CLUB MODAL WITH ALL POSSIBLE FIELDS */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-2xl p-6 sm:p-7 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white font-['Orbitron'] uppercase tracking-wider">ADMIN: REGISTER CLUB DOSSIER</h3>
                  <span className="text-[11px] text-slate-400">Stores official club specifications and stadium telemetry</span>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClub} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-cyan-400 block mb-1 uppercase tracking-wider">Club Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CF Montréal / Arsenal FC"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-cyan-400 block mb-1 uppercase tracking-wider">League / Division</label>
                  <input
                    type="text"
                    placeholder="e.g. Premier League / MLS"
                    value={formData.league}
                    onChange={(e) => setFormData({ ...formData, league: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-cyan-400 block mb-1 uppercase tracking-wider">Head Coach / Manager</label>
                  <input
                    type="text"
                    placeholder="e.g. Laurent Courtois"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-cyan-400 block mb-1 uppercase tracking-wider">Founded Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 1992"
                    value={formData.founded}
                    onChange={(e) => setFormData({ ...formData, founded: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-cyan-400 block mb-1 uppercase tracking-wider">Badge / Emoji</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-cyan-400 block mb-1 uppercase tracking-wider">Home Stadium *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stade Saputo"
                    value={formData.stadium}
                    onChange={(e) => setFormData({ ...formData, stadium: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-cyan-400 block mb-1 uppercase tracking-wider">Stadium Capacity</label>
                  <input
                    type="text"
                    placeholder="e.g. 19,619"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-cyan-400 block mb-1 uppercase tracking-wider">Key Talismanic Players</label>
                <input
                  type="text"
                  placeholder="e.g. Josef Martínez, Samuel Piette, Sunusi Ibrahim"
                  value={formData.stars}
                  onChange={(e) => setFormData({ ...formData, stars: e.target.value })}
                  className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
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
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs font-['Orbitron'] shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "REGISTERING..." : "REGISTER CLUB DOSSIER"}
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
            id: 'admin_add_club',
            label: 'Add Club Dossier',
            description: 'Register club telemetry',
            icon: <Plus className="w-4 h-4 text-cyan-400" />,
            onClick: () => setShowAddModal(true)
          }] : []),
          {
            id: 'fixtures',
            label: 'Upcoming Fixtures',
            description: 'Check schedule and venues',
            icon: <Globe className="w-4 h-4 text-emerald-400" />,
            onClick: () => navigate('/fixtures'),
          }
        ]}
      />
    </div>
  );
}
