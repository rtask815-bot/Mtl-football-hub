import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, CheckCircle2, AlertCircle, Zap, RefreshCw, MessageSquare, Radio, Calendar } from "lucide-react";
import UniversalFAB from "../components/UniversalFAB.tsx";
import FuturisticLoader from "../components/FuturisticLoader.tsx";
import { supabase } from "../config/supabase.ts";
import { SyncService } from "../config/SyncService.ts";

export default function Notifications() {
  const navigate = useNavigate();
  const location = useLocation();
  const pageName = location.pathname.replace("/", "").toUpperCase() || "NOTIFICATIONS";

  const [alerts, setAlerts] = useState(() => {
    const cached = SyncService.get('notifications', []);
    if (Array.isArray(cached) && cached.length > 0) {
      return cached.map(n => ({
        id: n.id,
        title: n.title,
        desc: n.message || n.desc,
        time: n.time || "Recent",
        type: n.type || "system"
      }));
    }
    return [
      {
        id: 'init-1',
        title: '30-SECOND HEARTBEAT ACTIVE',
        desc: 'Real-time telemetry and message synchronization active across MTL Quantum Hub.',
        time: 'Active',
        type: 'system'
      }
    ];
  });
  const [loading, setLoading] = useState(false);

  // Fetch real notifications and dynamic telemetry from Supabase
  const fetchAlertsFromDB = async () => {
    setLoading(true);
    try {
      // 1. Fetch from notifications table if any
      const { data: dbNotifs } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // 2. Fetch live & recent match telemetry from matches table
      const { data: recentMatches } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // 3. Fetch upcoming fixtures
      const { data: upcomingFixtures } = await supabase
        .from('fixtures')
        .select('*')
        .order('match_date', { ascending: true })
        .limit(3);

      const dynamicList = [];

      // Add user notifications from database
      if (dbNotifs && dbNotifs.length > 0) {
        dbNotifs.forEach(n => {
          dynamicList.push({
            id: n.id,
            title: n.title,
            desc: n.message,
            time: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            type: n.type || 'system'
          });
        });
      }

      // Add dynamic match telemetry from database matches
      if (recentMatches && recentMatches.length > 0) {
        recentMatches.forEach(m => {
          if (m.status === 'LIVE' || m.status === 'live') {
            dynamicList.push({
              id: `match-live-${m.id}`,
              title: `LIVE TELEMETRY: ${m.teams}`,
              desc: `Match active at minute ${m.minute || 1}'. Current score: ${m.score || '0-0'}. Predicted pick: ${m.prediction || 'Home Win'}.`,
              time: 'Live Now',
              type: 'goal'
            });
          } else if (m.status === 'FINISHED' || m.status === 'finished') {
            dynamicList.push({
              id: `match-finished-${m.id}`,
              title: `MATCH RESULT SETTLED: ${m.teams}`,
              desc: `Final Score: ${m.final_score || m.score || 'Full Time'}. AI Selection (${m.prediction || 'Result'}) verified.`,
              time: m.match_date || 'Settled',
              type: 'win'
            });
          } else {
            dynamicList.push({
              id: `match-pending-${m.id}`,
              title: `AI PREDICTION DISPATCH: ${m.teams}`,
              desc: `Odds: ${m.decimal_odds || '1.95'} • Selection: ${m.prediction || 'Home Win'} • League: ${m.league || 'Premier League'}.`,
              time: m.match_time || 'Upcoming',
              type: 'stream'
            });
          }
        });
      }

      // Add upcoming fixture dispatch
      if (upcomingFixtures && upcomingFixtures.length > 0) {
        upcomingFixtures.forEach(f => {
          dynamicList.push({
            id: `fixture-${f.id}`,
            title: `UPCOMING FIXTURE: ${f.teams}`,
            desc: `Scheduled for ${f.match_date} at ${f.match_time}. Broadcast: ${f.broadcast || 'Live Feed'}.`,
            time: f.match_date || 'Upcoming',
            type: 'system'
          });
        });
      }

      setAlerts(dynamicList);
    } catch (err) {
      console.error('Error fetching notifications telemetry:', err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsFromDB();

    const channel = supabase
      .channel('public:notifications_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchAlertsFromDB();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchAlertsFromDB();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="page-container font-['Plus_Jakarta_Sans',sans-serif] min-h-screen bg-[#060b14] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.06),rgba(0,0,0,0))]">
      {/* Unified Page Hero Banner */}
      <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#0a1221] border border-slate-800/90 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-orbitron text-xs tracking-widest text-emerald-400 uppercase font-bold">
              REAL-TIME TELEMETRY DISPATCH • SUPABASE SYNCED
            </span>
          </div>
          <h1 className="page-title flex items-center gap-3 text-2xl sm:text-3xl font-black text-white font-['Orbitron']">
            <Bell className="w-8 h-8 text-cyan-400" />
            {pageName}
          </h1>
          <p className="page-subtitle text-xs sm:text-sm text-slate-400">
            Real-time live scores, settled predictions, upcoming tournament alerts, and system notices directly from database.
          </p>
        </div>

        <button
          onClick={fetchAlertsFromDB}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer shadow-md self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-4 my-8">
        {alerts.map((a) => (
          <div key={a.id} className="cyber-card p-5 flex items-start gap-4 bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 rounded-2xl hover:border-emerald-500/50 transition-all shadow-xl">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 mt-0.5 shrink-0">
              {a.type === 'goal' && <Zap className="w-5 h-5 text-amber-400" />}
              {a.type === 'win' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {a.type === 'stream' && <Radio className="w-5 h-5 text-cyan-400" />}
              {a.type === 'system' && <AlertCircle className="w-5 h-5 text-purple-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-orbitron text-sm sm:text-base font-bold text-white truncate">
                  {a.title}
                </h3>
                <span className="text-xs font-mono text-slate-400 whitespace-nowrap">{a.time}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-inter mt-1 leading-relaxed">
                {a.desc}
              </p>
            </div>
          </div>
        ))}

        {alerts.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-500 bg-[#091120] border border-slate-800 rounded-2xl">
            No telemetry alerts dispatching right now. System operating normally.
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <UniversalFAB
        showBackToDashboard={true}
        onRefresh={fetchAlertsFromDB}
        customActions={[
          {
            id: 'predictions',
            label: 'Predictions Dispatch',
            description: 'Check verified tips',
            icon: <Zap className="w-4 h-4 text-emerald-400" />,
            onClick: () => navigate('/predictions'),
          }
        ]}
      />
    </div>
  );
}
