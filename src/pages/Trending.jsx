import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Flame, 
  TrendingUp, 
  MessageSquare, 
  Award, 
  Plus, 
  Trash2, 
  X, 
  RefreshCw,
  Search,
  Zap,
  ExternalLink
} from "lucide-react";
import UniversalFAB from "../components/UniversalFAB.tsx";
import { supabase } from "../config/supabase.ts";
import { SyncService } from "../config/SyncService.ts";
import { openGoogleScout } from "../utils/googleScout.ts";
import { fetchRealTrending } from "../config/firebaseStore.ts";

export default function Trending() {
  const navigate = useNavigate();
  const location = useLocation();
  const pageName = location.pathname.replace("/", "").toUpperCase() || "TRENDING";

  const [trendingTopics, setTrendingTopics] = useState(() => {
    const cached = SyncService.get('trending', []);
    if (!Array.isArray(cached) || cached.length === 0) return [];
    return cached.map((t, idx) => ({
      id: t.id,
      rank: t.rank || idx + 1,
      title: t.title || t.topic || "Football Spike",
      category: t.category || "Tactical Analysis",
      heat: t.heat || (t.posts_count ? `${t.posts_count} interactions` : "42.0K interactions"),
      trend: t.trend || t.growth_rate || "+18%",
      route: "/group-chats",
      description: "Trending football discourse across MTL community lounge."
    }));
  });
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states with all possible trending topic fields
  const [formData, setFormData] = useState({
    rank: 1,
    title: "",
    category: "Match Highlights",
    heat: "50.0K interactions",
    trend: "+25%",
    route: "/group-chats",
    description: "Trending football discourse across MTL community lounge."
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
            session.user.user_metadata?.role === "admin";

          setIsAdmin(Boolean(userIsAdmin));
        }
      } catch (err) {
        console.error("Auth check error in Trending:", err);
      }
    }
    checkAuth();
  }, []);

  // Fetch trending topics from Supabase
  async function fetchTrending() {
    setLoading(true);
    try {
      let rawTrending = [];
      const { data, error } = await supabase
        .from("trending")
        .select("*")
        .order("rank", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        rawTrending = data;
      } else {
        rawTrending = await fetchRealTrending();
      }

      if (rawTrending && rawTrending.length > 0) {
        const normalized = rawTrending.map((t, idx) => ({
          id: t.id,
          rank: t.rank || idx + 1,
          title: t.title || t.topic || "Trending Discussion",
          category: t.category || "Viral Football",
          heat: t.heat || (t.posts_count ? `${t.posts_count} interactions` : `${t.comments_count ? (t.comments_count * 1.5).toFixed(1) + 'K' : '45.0K'} interactions`),
          trend: t.trend || t.growth_rate || "+30%",
          route: t.route || "/group-chats"
        }));
        setTrendingTopics(normalized);
      } else {
        setTrendingTopics([]);
      }
    } catch (err) {
      console.warn("Database error querying trending:", err);
      setTrendingTopics([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrending();

    const channel = supabase
      .channel("public:trending")
      .on("postgres_changes", { event: "*", schema: "public", table: "trending" }, () => {
        fetchTrending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Admin Add Trending Topic
  async function handleAddTrending(e) {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Please provide a topic title.");
      return;
    }

    setSubmitting(true);
    const payload = {
      rank: parseInt(formData.rank, 10) || 1,
      title: formData.title.trim()
    };

    try {
      const { data, error } = await supabase.from("trending").insert([payload]).select();
      if (error) {
        console.error("Supabase insert error in trending:", error);
        // Fallback optimistic
        const localItem = {
          id: `trend-local-${Date.now()}`,
          rank: formData.rank,
          title: formData.title.trim(),
          category: formData.category,
          heat: formData.heat,
          trend: formData.trend,
          route: formData.route
        };
        setTrendingTopics(prev => [...prev, localItem].sort((a, b) => a.rank - b.rank));
      } else {
        fetchTrending();
      }

      setShowAddModal(false);
      setFormData({
        rank: trendingTopics.length + 1,
        title: "",
        category: "Match Highlights",
        heat: "50.0K interactions",
        trend: "+25%",
        route: "/group-chats",
        description: "Trending football discourse across MTL community lounge."
      });
    } catch (err) {
      console.error("Add trending error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  // Admin Delete Trending Topic
  async function handleDeleteTopic(id) {
    if (!window.confirm("Are you sure you want to remove this trending topic?")) return;
    setTrendingTopics(prev => prev.filter(t => t.id !== id));
    try {
      await supabase.from("trending").delete().eq("id", id);
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  const filteredTopics = trendingTopics.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="page-container font-['Plus_Jakarta_Sans',sans-serif] min-h-screen bg-[#060b14] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.06),rgba(0,0,0,0))]">
      {/* Unified Page Hero Banner */}
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0a1221] border border-slate-800/90 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-orbitron text-xs tracking-widest text-amber-400 uppercase font-bold">
              REAL-TIME SUPABASE VIRAL DISCUSSIONS
            </span>
          </div>
          <h1 className="page-title text-2xl sm:text-3xl font-black text-white font-['Orbitron'] flex items-center gap-3">
            <Flame className="w-8 h-8 text-amber-400" />
            {pageName}
          </h1>
          <p className="page-subtitle text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Most discussed matches, top community picks, transfer rumors, and tactical breakdowns directly from Supabase.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={fetchTrending}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-amber-500/40 transition-colors"
            title="Refresh Trending Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ADD TOPIC</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="my-6 bg-[#091120] border border-slate-800/80 p-3 rounded-2xl shadow-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search viral trending topics or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#060d18] border border-slate-800/90 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Trending Topics Grid */}
      <div className="space-y-4 my-6">
        {filteredTopics.map((item) => (
          <div key={item.id} className="group bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-black/40 transition-all duration-200 hover:-translate-y-0.5">
            <div className="flex items-start sm:items-center gap-4">
              <span className="font-['Orbitron'] text-2xl sm:text-3xl font-black text-amber-400 min-w-10 group-hover:scale-105 transition-transform">
                #{item.rank}
              </span>
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                  {item.category}
                </span>
                <h3 
                  onClick={() => openGoogleScout(item.title, 'news')}
                  className="font-['Orbitron'] text-base sm:text-lg font-bold text-white mt-0.5 group-hover:text-amber-300 transition-colors cursor-pointer inline-flex items-center gap-2"
                  title="Click to search on Google"
                >
                  <span>{item.title}</span>
                  <Search className="w-4 h-4 text-cyan-400 opacity-75" />
                </h3>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
              <div className="text-right">
                <div className="text-xs font-mono text-slate-400">{item.heat}</div>
                <div className="text-xs font-['Orbitron'] font-bold text-emerald-400 flex items-center gap-1 justify-end">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {item.trend}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteTopic(item.id)}
                    className="p-2 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 transition-colors"
                    title="Remove topic"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <button 
                  onClick={() => navigate(item.route || '/group-chats')} 
                  className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700/60 font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400 group-hover:text-slate-950" />
                  <span>JOIN CHAT</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTopics.length === 0 && !loading && (
        <div className="p-12 text-center text-slate-500 bg-[#091120] border border-slate-800 rounded-2xl my-6">
          No trending topics found.
        </div>
      )}

      {/* ADMIN ADD TRENDING MODAL WITH ALL POSSIBLE FIELDS */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-lg p-6 sm:p-7 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white font-['Orbitron'] uppercase tracking-wider">ADMIN: ADD TRENDING TOPIC</h3>
                  <span className="text-[11px] text-slate-400">Publishes instantly to Supabase trending table</span>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTrending} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-amber-400 block mb-1 uppercase tracking-wider">Topic Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wonderkid Signs 5-Year Contract Extension"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-amber-400 block mb-1 uppercase tracking-wider">Rank Position</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: parseInt(e.target.value, 10) || 1 })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-400 block mb-1 uppercase tracking-wider">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Match Highlights">Match Highlights</option>
                    <option value="Predictions">Predictions</option>
                    <option value="Transfer Radar">Transfer Radar</option>
                    <option value="Global Football">Global Football</option>
                    <option value="Stream Tech">Stream Tech</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-amber-400 block mb-1 uppercase tracking-wider">Interactions Heat</label>
                  <input
                    type="text"
                    placeholder="e.g. 84.5K interactions"
                    value={formData.heat}
                    onChange={(e) => setFormData({ ...formData, heat: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-400 block mb-1 uppercase tracking-wider">Trend Momentum</label>
                  <input
                    type="text"
                    placeholder="e.g. +38% / VIRAL"
                    value={formData.trend}
                    onChange={(e) => setFormData({ ...formData, trend: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-amber-400 block mb-1 uppercase tracking-wider">Action Route / Link</label>
                <select
                  value={formData.route}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="/group-chats">Group Chats (/group-chats)</option>
                  <option value="/predictions">Predictions Hub (/predictions)</option>
                  <option value="/tv">Live Stream TV (/tv)</option>
                  <option value="/fixtures">Fixtures Timeline (/fixtures)</option>
                  <option value="/news">News Wire (/news)</option>
                </select>
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
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs font-['Orbitron'] shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "PERSISTING..." : "PUBLISH TO SUPABASE"}
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
            id: 'admin_add_trending',
            label: 'Add Trending Topic',
            description: 'Publish topic directly to Supabase',
            icon: <Plus className="w-4 h-4 text-amber-400" />,
            onClick: () => setShowAddModal(true)
          }] : []),
          {
            id: 'join_chat',
            label: 'Group Chat Rooms',
            description: 'Participate in viral live threads',
            icon: <MessageSquare className="w-4 h-4 text-purple-400" />,
            onClick: () => navigate('/group-chats'),
          }
        ]}
      />
    </div>
  );
}
