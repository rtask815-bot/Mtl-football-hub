import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  BarChart3, 
  BarChart2,
  Activity, 
  Shield, 
  Trophy, 
  Target, 
  Zap, 
  Plus, 
  HelpCircle, 
  X, 
  Check, 
  RefreshCw,
  Sparkles,
  Info,
  ChevronRight,
  ChevronLeft,
  Trash2,
  AlertTriangle,
  Search,
  Sliders,
  Database
} from 'lucide-react';
import { supabase } from '../config/supabase.ts';
import { StorageCache } from '../config/storageCache.ts';

export interface TeamTrendData {
  matchday: string;
  opponent: string;
  formIndex: number; // 0-100 scale
  xGCreated: number;
  xGConceded: number;
  goalsScored: number;
  goalsConceded: number;
  result: 'W' | 'D' | 'L';
}

export interface TeamAnalyticsProfile {
  id?: string;
  teamName: string;
  badge: string;
  winRatio: { name: string; value: number; color: string }[];
  totalMatches: number;
  winRatePercent: number;
  avgXG: number;
  cleanSheets: number;
  goalDiff: number;
  trendData: TeamTrendData[];
}

const DEFAULT_TEAMS_ANALYTICS: Record<string, TeamAnalyticsProfile> = {
  'CF Montréal': {
    teamName: 'CF Montréal',
    badge: 'MTL',
    totalMatches: 28,
    winRatePercent: 57.1,
    avgXG: 1.84,
    cleanSheets: 9,
    goalDiff: 14,
    winRatio: [
      { name: 'Wins', value: 16, color: '#10b981' }, // Emerald
      { name: 'Draws', value: 6, color: '#f59e0b' },  // Amber
      { name: 'Losses', value: 6, color: '#f43f5e' }   // Rose
    ],
    trendData: [
      { matchday: 'M1', opponent: 'vs TOR', formIndex: 65, xGCreated: 1.4, xGConceded: 0.9, goalsScored: 2, goalsConceded: 1, result: 'W' },
      { matchday: 'M2', opponent: 'vs NYC', formIndex: 72, xGCreated: 1.9, xGConceded: 1.1, goalsScored: 3, goalsConceded: 1, result: 'W' },
      { matchday: 'M3', opponent: 'vs CLB', formIndex: 58, xGCreated: 1.1, xGConceded: 1.8, goalsScored: 0, goalsConceded: 2, result: 'L' },
      { matchday: 'M4', opponent: 'vs NE',  formIndex: 68, xGCreated: 1.6, xGConceded: 0.8, goalsScored: 1, goalsConceded: 0, result: 'W' },
      { matchday: 'M5', opponent: 'vs MIA', formIndex: 82, xGCreated: 2.3, xGConceded: 1.4, goalsScored: 2, goalsConceded: 2, result: 'D' },
      { matchday: 'M6', opponent: 'vs CIN', formIndex: 88, xGCreated: 2.6, xGConceded: 1.0, goalsScored: 3, goalsConceded: 1, result: 'W' },
      { matchday: 'M7', opponent: 'vs PHI', formIndex: 79, xGCreated: 1.8, xGConceded: 1.2, goalsScored: 2, goalsConceded: 1, result: 'W' },
      { matchday: 'M8', opponent: 'vs ORL', formIndex: 85, xGCreated: 2.1, xGConceded: 0.7, goalsScored: 2, goalsConceded: 0, result: 'W' }
    ]
  },
  'FC Cincinnati': {
    teamName: 'FC Cincinnati',
    badge: 'CIN',
    totalMatches: 28,
    winRatePercent: 60.7,
    avgXG: 1.92,
    cleanSheets: 11,
    goalDiff: 18,
    winRatio: [
      { name: 'Wins', value: 17, color: '#10b981' },
      { name: 'Draws', value: 5, color: '#f59e0b' },
      { name: 'Losses', value: 6, color: '#f43f5e' }
    ],
    trendData: [
      { matchday: 'M1', opponent: 'vs CLB', formIndex: 70, xGCreated: 1.7, xGConceded: 1.0, goalsScored: 2, goalsConceded: 1, result: 'W' },
      { matchday: 'M2', opponent: 'vs MIA', formIndex: 64, xGCreated: 1.3, xGConceded: 1.6, goalsScored: 1, goalsConceded: 2, result: 'L' },
      { matchday: 'M3', opponent: 'vs ORL', formIndex: 78, xGCreated: 2.1, xGConceded: 0.9, goalsScored: 3, goalsConceded: 0, result: 'W' },
      { matchday: 'M4', opponent: 'vs TOR', formIndex: 84, xGCreated: 2.4, xGConceded: 0.6, goalsScored: 2, goalsConceded: 0, result: 'W' },
      { matchday: 'M5', opponent: 'vs NYC', formIndex: 75, xGCreated: 1.8, xGConceded: 1.2, goalsScored: 1, goalsConceded: 1, result: 'D' },
      { matchday: 'M6', opponent: 'vs MTL', formIndex: 62, xGCreated: 1.2, xGConceded: 2.4, goalsScored: 1, goalsConceded: 3, result: 'L' },
      { matchday: 'M7', opponent: 'vs ATL', formIndex: 80, xGCreated: 2.0, xGConceded: 0.8, goalsScored: 2, goalsConceded: 0, result: 'W' },
      { matchday: 'M8', opponent: 'vs DC',  formIndex: 86, xGCreated: 2.3, xGConceded: 0.9, goalsScored: 3, goalsConceded: 1, result: 'W' }
    ]
  },
  'Inter Miami': {
    teamName: 'Inter Miami',
    badge: 'MIA',
    totalMatches: 28,
    winRatePercent: 64.3,
    avgXG: 2.15,
    cleanSheets: 8,
    goalDiff: 22,
    winRatio: [
      { name: 'Wins', value: 18, color: '#10b981' },
      { name: 'Draws', value: 4, color: '#f59e0b' },
      { name: 'Losses', value: 6, color: '#f43f5e' }
    ],
    trendData: [
      { matchday: 'M1', opponent: 'vs LAFC', formIndex: 80, xGCreated: 2.2, xGConceded: 1.3, goalsScored: 3, goalsConceded: 1, result: 'W' },
      { matchday: 'M2', opponent: 'vs CIN',  formIndex: 75, xGCreated: 1.6, xGConceded: 1.2, goalsScored: 2, goalsConceded: 1, result: 'W' },
      { matchday: 'M3', opponent: 'vs ORL',  formIndex: 88, xGCreated: 2.8, xGConceded: 0.9, goalsScored: 4, goalsConceded: 1, result: 'W' },
      { matchday: 'M4', opponent: 'vs NSH',  formIndex: 70, xGCreated: 1.5, xGConceded: 1.5, goalsScored: 1, goalsConceded: 1, result: 'D' },
      { matchday: 'M5', opponent: 'vs MTL',  formIndex: 78, xGCreated: 2.0, xGConceded: 1.9, goalsScored: 2, goalsConceded: 2, result: 'D' },
      { matchday: 'M6', opponent: 'vs CLB',  formIndex: 92, xGCreated: 2.9, xGConceded: 1.1, goalsScored: 3, goalsConceded: 2, result: 'W' },
      { matchday: 'M7', opponent: 'vs NYC',  formIndex: 85, xGCreated: 2.3, xGConceded: 0.8, goalsScored: 2, goalsConceded: 0, result: 'W' },
      { matchday: 'M8', opponent: 'vs ATL',  formIndex: 68, xGCreated: 1.4, xGConceded: 2.1, goalsScored: 1, goalsConceded: 3, result: 'L' }
    ]
  },
  'Columbus Crew': {
    teamName: 'Columbus Crew',
    badge: 'CLB',
    totalMatches: 28,
    winRatePercent: 53.6,
    avgXG: 1.76,
    cleanSheets: 10,
    goalDiff: 10,
    winRatio: [
      { name: 'Wins', value: 15, color: '#10b981' },
      { name: 'Draws', value: 7, color: '#f59e0b' },
      { name: 'Losses', value: 6, color: '#f43f5e' }
    ],
    trendData: [
      { matchday: 'M1', opponent: 'vs CIN', formIndex: 60, xGCreated: 1.1, xGConceded: 1.6, goalsScored: 1, goalsConceded: 2, result: 'L' },
      { matchday: 'M2', opponent: 'vs MTL', formIndex: 78, xGCreated: 1.9, xGConceded: 0.9, goalsScored: 2, goalsConceded: 0, result: 'W' },
      { matchday: 'M3', opponent: 'vs PHI', formIndex: 68, xGCreated: 1.4, xGConceded: 1.3, goalsScored: 1, goalsConceded: 1, result: 'D' },
      { matchday: 'M4', opponent: 'vs TOR', formIndex: 82, xGCreated: 2.2, xGConceded: 0.7, goalsScored: 3, goalsConceded: 0, result: 'W' },
      { matchday: 'M5', opponent: 'vs LAFC',formIndex: 73, xGCreated: 1.7, xGConceded: 1.4, goalsScored: 2, goalsConceded: 1, result: 'W' },
      { matchday: 'M6', opponent: 'vs MIA', formIndex: 65, xGCreated: 1.3, xGConceded: 2.5, goalsScored: 2, goalsConceded: 3, result: 'L' },
      { matchday: 'M7', opponent: 'vs NYC', formIndex: 80, xGCreated: 2.0, xGConceded: 0.8, goalsScored: 2, goalsConceded: 0, result: 'W' },
      { matchday: 'M8', opponent: 'vs ORL', formIndex: 74, xGCreated: 1.6, xGConceded: 1.1, goalsScored: 1, goalsConceded: 1, result: 'D' }
    ]
  }
};

interface Props {
  isAdmin?: boolean;
}

export const PerformanceAnalyticsChart: React.FC<Props> = ({ isAdmin = false }) => {
  const effectiveIsAdmin = isAdmin;

  // Local cached state for immediate local responsiveness
  const [teams, setTeams] = useState<Record<string, TeamAnalyticsProfile>>(() => {
    const cached = StorageCache.get('team_analytics', DEFAULT_TEAMS_ANALYTICS);
    return cached && Object.keys(cached).length > 0 ? cached : DEFAULT_TEAMS_ANALYTICS;
  });

  const [selectedTeam, setSelectedTeam] = useState<string>('CF Montréal');
  const [teamSearchQuery, setTeamSearchQuery] = useState<string>('');
  const [isTeamsListOpen, setIsTeamsListOpen] = useState<boolean>(false);
  const [activeMetric, setActiveMetric] = useState<'trends' | 'winloss' | 'goals'>('trends');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Admin Adding a New Team
  const [newTeam, setNewTeam] = useState({
    teamName: '',
    badge: '',
    totalMatches: 20,
    wins: 10,
    draws: 5,
    losses: 5,
    avgXG: 1.65,
    cleanSheets: 6,
    goalDiff: 8,
    opponentsInput: 'vs TOR, vs NYC, vs MIA, vs CLB, vs LAFC'
  });

  // Toast Notification Helper
  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Convert raw DB row to TeamAnalyticsProfile object
  const mapDbRowToProfile = (row: any): TeamAnalyticsProfile => {
    const wins = row.wins || 0;
    const draws = row.draws || 0;
    const losses = row.losses || 0;
    const total = row.total_matches || (wins + draws + losses) || 1;
    const winRate = Number(row.win_rate_percent) || Number(((wins / total) * 100).toFixed(1));

    return {
      id: row.id,
      teamName: row.team_name,
      badge: row.badge || row.team_name.slice(0, 3).toUpperCase(),
      totalMatches: total,
      winRatePercent: winRate,
      avgXG: Number(row.avg_xg) || 1.5,
      cleanSheets: row.clean_sheets || 0,
      goalDiff: row.goal_diff || 0,
      winRatio: [
        { name: 'Wins', value: wins, color: '#10b981' },
        { name: 'Draws', value: draws, color: '#f59e0b' },
        { name: 'Losses', value: losses, color: '#f43f5e' }
      ],
      trendData: Array.isArray(row.trend_data) && row.trend_data.length > 0 ? row.trend_data : [
        { matchday: 'M1', opponent: 'vs TOR', formIndex: 70, xGCreated: 1.8, xGConceded: 1.0, goalsScored: 2, goalsConceded: 1, result: 'W' },
        { matchday: 'M2', opponent: 'vs NYC', formIndex: 75, xGCreated: 2.0, xGConceded: 1.2, goalsScored: 1, goalsConceded: 1, result: 'D' },
        { matchday: 'M3', opponent: 'vs MIA', formIndex: 82, xGCreated: 2.2, xGConceded: 0.8, goalsScored: 3, goalsConceded: 0, result: 'W' },
        { matchday: 'M4', opponent: 'vs CLB', formIndex: 65, xGCreated: 1.2, xGConceded: 1.9, goalsScored: 0, goalsConceded: 2, result: 'L' }
      ]
    };
  };

  // 1. FETCH FROM SUPABASE
  const fetchTeamAnalyticsFromSupabase = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('team_analytics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch notice (using cache/defaults):', error.message);
        return;
      }

      if (data && data.length > 0) {
        const mappedRecords: Record<string, TeamAnalyticsProfile> = {};
        data.forEach(row => {
          mappedRecords[row.team_name] = mapDbRowToProfile(row);
        });

        // Merge with defaults so base teams remain present
        const merged = { ...DEFAULT_TEAMS_ANALYTICS, ...mappedRecords };
        setTeams(merged);
        StorageCache.set('team_analytics', merged);
      }
    } catch (err: any) {
      console.warn('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. REALTIME SUBSCRIPTION
  useEffect(() => {
    fetchTeamAnalyticsFromSupabase();

    const channel = supabase
      .channel('public:team_analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_analytics' }, (payload) => {
        if (payload.new && (payload.new as any).team_name) {
          const updatedProfile = mapDbRowToProfile(payload.new);
          setTeams(prev => {
            const next = { ...prev, [updatedProfile.teamName]: updatedProfile };
            StorageCache.set('team_analytics', next);
            return next;
          });
          showNotification(`New real-time team telemetry updated: ${updatedProfile.teamName}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTeamAnalyticsFromSupabase]);

  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const teamCarouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (teamCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -240 : 240;
      teamCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // 3. POST / INSERT NEW TEAM TO SUPABASE (ADMIN ONLY - INSTANT OPTIMISTIC)
  const handleAddTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newTeam.teamName.trim();
    if (!nameTrimmed) {
      showNotification('Please enter a valid team name');
      return;
    }

    try {
      setIsLoading(true);
      const total = Number(newTeam.wins) + Number(newTeam.draws) + Number(newTeam.losses) || Number(newTeam.totalMatches) || 20;
      const winRate = Number(((Number(newTeam.wins) / total) * 100).toFixed(1));

      // Build sample trend data matchdays from input
      const opponentList = newTeam.opponentsInput.split(',').map(s => s.trim()).filter(Boolean);
      const generatedTrendData: TeamTrendData[] = (opponentList.length > 0 ? opponentList : ['vs TOR', 'vs NYC', 'vs MIA', 'vs CLB', 'vs LAFC']).map((opp, idx) => ({
        matchday: `M${idx + 1}`,
        opponent: opp.startsWith('vs') || opp.startsWith('@') ? opp : `vs ${opp}`,
        formIndex: Math.floor(Math.random() * 30) + 60,
        xGCreated: Number((Math.random() * 1.5 + 1.1).toFixed(2)),
        xGConceded: Number((Math.random() * 1.2 + 0.6).toFixed(2)),
        goalsScored: Math.floor(Math.random() * 3) + 1,
        goalsConceded: Math.floor(Math.random() * 2),
        result: idx % 2 === 0 ? 'W' : (idx === 1 ? 'D' : 'W')
      }));

      const payload = {
        team_name: nameTrimmed,
        badge: (newTeam.badge || nameTrimmed.slice(0, 3)).toUpperCase(),
        total_matches: total,
        wins: Number(newTeam.wins),
        draws: Number(newTeam.draws),
        losses: Number(newTeam.losses),
        win_rate_percent: winRate,
        avg_xg: Number(newTeam.avgXG),
        clean_sheets: Number(newTeam.cleanSheets),
        goal_diff: Number(newTeam.goalDiff),
        trend_data: generatedTrendData
      };

      // 0ms INSTANT OPTIMISTIC LOCAL UPDATE
      const createdProfile: TeamAnalyticsProfile = {
        id: `local-${Date.now()}`,
        teamName: payload.team_name,
        badge: payload.badge,
        totalMatches: total,
        winRatePercent: winRate,
        avgXG: payload.avg_xg,
        cleanSheets: payload.clean_sheets,
        goalDiff: payload.goal_diff,
        winRatio: [
          { name: 'Wins', value: payload.wins, color: '#10b981' },
          { name: 'Draws', value: payload.draws, color: '#f59e0b' },
          { name: 'Losses', value: payload.losses, color: '#f43f5e' }
        ],
        trendData: generatedTrendData
      };

      setTeams(prev => {
        const next = { ...prev, [createdProfile.teamName]: createdProfile };
        StorageCache.set('team_analytics', next);
        return next;
      });

      setSelectedTeam(createdProfile.teamName);
      setIsAddModalOpen(false);
      showNotification(`Saved & published ${createdProfile.teamName} analytics!`);

      // Reset form
      setNewTeam({
        teamName: '',
        badge: '',
        totalMatches: 20,
        wins: 10,
        draws: 5,
        losses: 5,
        avgXG: 1.65,
        cleanSheets: 6,
        goalDiff: 8,
        opponentsInput: 'vs TOR, vs NYC, vs MIA, vs CLB, vs LAFC'
      });

      // Background Supabase persistence
      supabase
        .from('team_analytics')
        .upsert(payload, { onConflict: 'team_name' })
        .then(({ error }) => {
          if (error) console.warn('Supabase background sync notice:', error.message);
        });

    } catch (err: any) {
      console.error('Failed to add team analytics:', err);
      showNotification(err.message || 'Error posting team analytics');
    } finally {
      setIsLoading(false);
    }
  };

  // DELETE TEAM FROM SUPABASE & LOCAL STATE (0ms RESPONSIVE)
  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    const targetName = teamToDelete;
    setTeamToDelete(null);

    // Instant local optimistic removal
    setTeams(prev => {
      const next = { ...prev };
      delete next[targetName];
      StorageCache.set('team_analytics', next);
      return next;
    });

    const remaining = Object.keys(teams).filter(k => k !== targetName);
    if (remaining.length > 0) {
      setSelectedTeam(remaining[0]);
    }

    showNotification(`Deleted ${targetName} from team analytics database`);

    // Async background deletion from Supabase
    try {
      const { error } = await supabase
        .from('team_analytics')
        .delete()
        .eq('team_name', targetName);

      if (error) {
        console.warn('Supabase delete notice:', error.message);
      }
    } catch (err: any) {
      console.error('Delete team error:', err);
    }
  };

  const activeTeamNames = Object.keys(teams);
  const filteredTeamNames = activeTeamNames.filter(name => 
    name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
    (teams[name]?.badge || '').toLowerCase().includes(teamSearchQuery.toLowerCase())
  );
  const currentTeam = teams[selectedTeam] || teams[activeTeamNames[0]] || DEFAULT_TEAMS_ANALYTICS['CF Montréal'];

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TeamTrendData;
      return (
        <div className="bg-[#091122] border border-cyan-500/40 p-3 rounded-xl shadow-2xl text-xs font-['Plus_Jakarta_Sans',sans-serif] space-y-1.5 z-50">
          <div className="font-bold text-cyan-400 font-['Orbitron'] flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
            <span>{data.matchday} ({data.opponent})</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
              data.result === 'W' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
              data.result === 'D' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
              'bg-red-500/20 text-red-400 border border-red-500/40'
            }`}>
              {data.result === 'W' ? 'WIN' : data.result === 'D' ? 'DRAW' : 'LOSS'} ({data.goalsScored}-{data.goalsConceded})
            </span>
          </div>
          <div className="text-slate-300 grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
            <div>Form Index: <strong className="text-emerald-400">{data.formIndex}/100</strong></div>
            <div>Expected Goals (xG): <strong className="text-cyan-300">{data.xGCreated}</strong></div>
            <div>xG Conceded: <strong className="text-rose-400">{data.xGConceded}</strong></div>
            <div>Goals Scored: <strong className="text-white">{data.goalsScored}</strong></div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#080d19] border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5 font-['Plus_Jakarta_Sans',sans-serif] relative overflow-hidden">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-3 right-4 z-50 bg-emerald-500 text-slate-950 text-xs font-extrabold px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SOLID CARD 1: CONTROLS & SEARCH BAR HEADER CONTAINER                  */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-gradient-to-b from-[#101c30] to-[#091222] border border-slate-700/80 shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl p-4 sm:p-5 text-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left Title & Status */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
              <BarChart2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-extrabold text-cyan-400 uppercase tracking-widest block">
                  TACTICAL TELEMETRY
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white font-['Orbitron'] tracking-wide">
                PERFORMANCE & FORM ANALYTICS
              </h2>
            </div>
          </div>

          {/* Search Bar & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* SEARCH BAR INPUT */}
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search team by name..."
                value={teamSearchQuery}
                onChange={e => {
                  setTeamSearchQuery(e.target.value);
                  if (!isTeamsListOpen && e.target.value.trim() !== '') {
                    setIsTeamsListOpen(true);
                  }
                }}
                className="w-full bg-[#060c18] border border-slate-700/90 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all shadow-inner"
              />
              {teamSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTeamSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* SHOW TEAMS LIST BUTTON */}
            <button
              type="button"
              onClick={() => setIsTeamsListOpen(!isTeamsListOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border shadow-md active:translate-y-0.5 ${
                isTeamsListOpen
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 border-cyan-300 font-extrabold shadow-cyan-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Sliders className="w-4 h-4 text-cyan-300" />
              <span>{isTeamsListOpen ? 'Hide Teams' : 'Show Teams List'}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-slate-950 text-cyan-400 text-[10px] font-mono">
                {filteredTeamNames.length}
              </span>
            </button>

            {/* REFRESH BUTTON */}
            <button
              type="button"
              onClick={fetchTeamAnalyticsFromSupabase}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer active:translate-y-0.5"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* ADMIN ADD TEAM BUTTON */}
            {effectiveIsAdmin && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer font-['Orbitron']"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ ADD TEAM</span>
              </button>
            )}
          </div>
        </div>

        {/* EXPANDABLE TEAMS LIST GRID (WHEN TOGGLED OR SEARCHING) */}
        {(isTeamsListOpen || teamSearchQuery.trim() !== '') && (
          <div className="pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between pb-2 mb-2">
              <span className="text-[11px] font-black uppercase text-cyan-400 font-['Orbitron'] flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>CLICK A CLUB TO LOAD ANALYTICS</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {filteredTeamNames.length} matching club records
              </span>
            </div>

            {filteredTeamNames.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-xs">
                No teams found matching "<strong className="text-white">{teamSearchQuery}</strong>". Try another search keyword.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredTeamNames.map(tName => {
                  const profile = teams[tName];
                  const isSelected = selectedTeam === tName;
                  return (
                    <button
                      key={tName}
                      type="button"
                      onClick={() => setSelectedTeam(tName)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500 text-slate-950 font-black border-cyan-300 shadow-md scale-[1.02]'
                          : 'bg-[#060d1a] hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-cyan-500/40'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-md text-[10px] font-black flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-slate-950 text-cyan-300 shadow' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {profile?.badge || tName.slice(0, 3)}
                      </span>
                      <div className="truncate">
                        <div className="truncate font-black">{tName}</div>
                        <div className={`text-[9px] ${isSelected ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
                          {profile?.winRatePercent}% WR
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SELECTED TEAM OVERVIEW SOLID CARD */}
      <div className="bg-gradient-to-r from-[#0b1426] via-[#091222] to-[#070e1a] border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white shadow-[0_8px_24px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 font-black text-base font-['Orbitron'] shadow-inner">
            {currentTeam.badge}
          </div>
          <div>
            <h3 className="text-lg font-black text-white font-['Orbitron'] flex items-center gap-2">
              <span>{currentTeam.teamName}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {currentTeam.winRatePercent}% Win Rate
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentTeam.totalMatches} matches · {currentTeam.cleanSheets} clean sheets · {currentTeam.avgXG} Avg xG / match
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {currentTeam.avgXG >= 1.8 ? '🔥 High Attack' : '⚡ Balanced Form'}
          </span>
          {effectiveIsAdmin && (
            <button
              type="button"
              onClick={() => setTeamToDelete(currentTeam.teamName)}
              className="text-xs font-black uppercase px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/50 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Team</span>
            </button>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* ROW 1: INDEPENDENT SOLID CARDS (FORM TRENDS AREA + WIN-LOSS RATIO)   */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD A: PERFORMANCE FORM INDEX & xG TRENDS AREA CHART (2/3 Width) */}
        <div className="lg:col-span-2 bg-gradient-to-b from-[#0f1a2e] to-[#070e1a] border border-slate-700/80 shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-black text-white font-['Orbitron'] uppercase tracking-wide">
                Form Index & xG Trends
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Matchday Telemetry
            </span>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentTeam.trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="formGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f5d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00f5d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="matchday" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="formIndex" name="Form Rating Index" stroke="#00f5d4" strokeWidth={3} fillOpacity={1} fill="url(#formGradient)" />
                <Line type="monotone" dataKey="xGCreated" name="xG Created" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="xGConceded" name="xG Conceded" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD B: WIN / DRAW / LOSS RATIO DONUT PIE CHART (1/3 Width) */}
        <div className="bg-gradient-to-b from-[#0f1a2e] to-[#070e1a] border border-slate-700/80 shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-black text-white font-['Orbitron'] uppercase tracking-wide">
                Win - Loss Ratio
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Season Record
            </span>
          </div>

          <div className="w-full h-52 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={currentTeam.winRatio} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {currentTeam.winRatio.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#091222" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#091122', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-white font-['Orbitron']">{currentTeam.winRatePercent}%</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Wins Rate</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/80">
            {currentTeam.winRatio.map((item) => (
              <div key={item.name} className="bg-[#08101e] border border-slate-800 p-2 rounded-xl shadow-inner">
                <span className="text-[10px] font-bold block uppercase text-slate-400">{item.name}</span>
                <span className="text-sm font-black font-['Orbitron']" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* ROW 2: INDEPENDENT SOLID CARDS (GOALS BAR CHART + MATCHDAY HISTORY)   */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD C: GOALS SCORED VS CONCEDED BAR CHART */}
        <div className="bg-gradient-to-b from-[#0f1a2e] to-[#070e1a] border border-slate-700/80 shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-black text-white font-['Orbitron'] uppercase tracking-wide">
                Goals Scored vs Conceded
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Goal Margin
            </span>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentTeam.trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="matchday" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="goalsScored" name="Goals Scored" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="goalsConceded" name="Goals Conceded" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD D: MATCHDAY OPPONENT TACTICAL LOG */}
        <div className="bg-gradient-to-b from-[#0f1a2e] to-[#070e1a] border border-slate-700/80 shadow-[0_12px_32px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-black text-white font-['Orbitron'] uppercase tracking-wide">
                Matchday Tactical Log
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {currentTeam.trendData.length} Matches Logged
            </span>
          </div>

          <div className="overflow-y-auto max-h-60 pr-1 space-y-2 divide-y divide-slate-800/60">
            {currentTeam.trendData.map((m, idx) => (
              <div key={idx} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 shadow ${
                    m.result === 'W' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                    m.result === 'D' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                    'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}>
                    {m.result}
                  </span>
                  <div>
                    <span className="font-black text-white block">{m.opponent} ({m.matchday})</span>
                    <span className="text-[10px] text-slate-400">Scoreline: {m.goalsScored}-{m.goalsConceded}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-cyan-300 font-black font-mono block">{m.xGCreated} xG</span>
                  <span className="text-[10px] text-slate-400">Form: {m.formIndex}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* EXPLANATORY GUIDE MODAL (USER FRIENDLY & INFORMATIVE)                 */}
      {/* --------------------------------------------------------------------- */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1426] border border-cyan-500/40 w-full max-w-lg rounded-2xl p-6 shadow-2xl text-slate-200 space-y-4 relative font-['Plus_Jakarta_Sans',sans-serif]">
            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-cyan-400 font-['Orbitron'] font-extrabold text-base border-b border-slate-800 pb-3">
              <Info className="w-5 h-5" />
              <span>TEAM PERFORMANCE & ANALYTICS METRICS GUIDE</span>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-96 overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Target className="w-4 h-4" /> Expected Goals (xG)
                </div>
                <p>
                  xG measures the mathematical probability (0.00 to 1.00) of a shot resulting in a goal based on distance, angle, body part, and defensive pressure. An xG of 1.84 means the team was expected to score ~1.84 goals given chance quality.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Form Rating Index (0–100 Scale)
                </div>
                <p>
                  Calculates a rolling efficiency rating based on recent performance, goal conversion rate, press resistance, and defensive stability over the last 5 matches.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4" /> Win-Loss Ratio & Clean Sheets
                </div>
                <p>
                  Breakdown of total competitive victories, draws, and defeats across the season. Clean sheets indicate matches where 0 goals were conceded.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsInfoModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider cursor-pointer transition-colors"
            >
              GOT IT, CLOSE GUIDE
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* ADMIN ADD TEAM ANALYTICS FORM MODAL                                   */}
      {/* --------------------------------------------------------------------- */}
      {isAddModalOpen && effectiveIsAdmin && (
        <div className="fixed inset-0 z-[200] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1426] border border-emerald-500/50 w-full max-w-xl rounded-2xl p-6 shadow-2xl text-white space-y-4 relative font-['Plus_Jakarta_Sans',sans-serif] animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-400 font-['Orbitron'] font-extrabold text-base border-b border-slate-800 pb-3">
              <Plus className="w-5 h-5" />
              <span>POST NEW TEAM PERFORMANCE ANALYTICS</span>
            </div>

            <form onSubmit={handleAddTeamSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 font-['Orbitron']">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Real Madrid"
                    value={newTeam.teamName}
                    onChange={e => setNewTeam({ ...newTeam, teamName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 font-['Orbitron']">
                    Badge Abbreviation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RMA"
                    value={newTeam.badge}
                    onChange={e => setNewTeam({ ...newTeam, badge: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 font-['Orbitron']">
                    Wins
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newTeam.wins}
                    onChange={e => setNewTeam({ ...newTeam, wins: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 font-['Orbitron']">
                    Draws
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newTeam.draws}
                    onChange={e => setNewTeam({ ...newTeam, draws: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 font-['Orbitron']">
                    Losses
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newTeam.losses}
                    onChange={e => setNewTeam({ ...newTeam, losses: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 font-['Orbitron']">
                    Avg xG / Match
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTeam.avgXG}
                    onChange={e => setNewTeam({ ...newTeam, avgXG: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 font-['Orbitron']">
                    Clean Sheets
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newTeam.cleanSheets}
                    onChange={e => setNewTeam({ ...newTeam, cleanSheets: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 font-['Orbitron']">
                    Goal Diff
                  </label>
                  <input
                    type="number"
                    value={newTeam.goalDiff}
                    onChange={e => setNewTeam({ ...newTeam, goalDiff: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1 font-['Orbitron']">
                  Recent Opponents (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="vs TOR, vs NYC, vs MIA, vs CLB, vs LAFC"
                  value={newTeam.opponentsInput}
                  onChange={e => setNewTeam({ ...newTeam, opponentsInput: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-400"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Matchday trend charts will automatically generate xG and form indexes for these opponents.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wide shadow-lg shadow-emerald-500/20 cursor-pointer transition-all active:scale-95"
                >
                  {isLoading ? 'Posting to Supabase...' : 'Save & Publish Team Analytics'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* DELETE TEAM CONFIRMATION MODAL                                        */}
      {/* --------------------------------------------------------------------- */}
      {teamToDelete && (
        <div className="fixed inset-0 z-[220] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0c1322] border border-rose-500/50 w-full max-w-md rounded-2xl p-6 shadow-2xl text-white space-y-4 relative font-['Plus_Jakarta_Sans',sans-serif] animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setTeamToDelete(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white font-['Orbitron']">
                CONFIRM TEAM DELETION
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-rose-400">{teamToDelete}</strong> and all its associated matchday trend telemetry from Supabase?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTeamToDelete(null)}
                className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer transition-all active:scale-95"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={confirmDeleteTeam}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-xs font-['Orbitron'] tracking-wider shadow-lg shadow-rose-950/50 cursor-pointer transition-all active:scale-95"
              >
                CONFIRM DELETE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PerformanceAnalyticsChart;
