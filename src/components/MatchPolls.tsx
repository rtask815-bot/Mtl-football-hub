import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  Award,
  Vote,
  BarChart2,
  PieChart as PieChartIcon,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Users,
  Flame,
  Radio,
  Share2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { supabase } from '../config/supabase.ts';

export interface MOTMPlayer {
  id: string;
  name: string;
  team: string;
  position: string;
  avatar: string;
  stats: string;
  votes: number;
}

export interface MatchPoll {
  id: string;
  matchTitle: string;
  competition: string;
  status: 'LIVE' | 'FINAL' | 'UPCOMING';
  category: 'MOTM' | 'TACTICS' | 'PREDICTION';
  totalVotes: number;
  userVotedId?: string;
  players: MOTMPlayer[];
}

const POLL_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1'];

const INITIAL_POLLS: MatchPoll[] = [
  {
    id: 'poll-motm-1',
    matchTitle: 'CF Montréal vs Inter Miami CF',
    competition: 'MLS Regular Season • Stade Saputo',
    status: 'LIVE',
    category: 'MOTM',
    totalVotes: 1420,
    players: [
      {
        id: 'p1',
        name: 'Josef Martínez',
        team: 'CF Montréal',
        position: 'Forward',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        stats: '2 Goals, 1 Assist, 4 Shots on Target',
        votes: 582
      },
      {
        id: 'p2',
        name: 'Lionel Messi',
        team: 'Inter Miami CF',
        position: 'Forward',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        stats: '1 Goal, 2 Key Passes',
        votes: 498
      },
      {
        id: 'p3',
        name: 'Samuel Piette',
        team: 'CF Montréal',
        position: 'Midfielder',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        stats: '94% Pass Accuracy, 6 Tackles',
        votes: 210
      },
      {
        id: 'p4',
        name: 'Jonathan Sirois',
        team: 'CF Montréal',
        position: 'Goalkeeper',
        avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
        stats: '7 Saves, 2 Claims',
        votes: 130
      }
    ]
  },
  {
    id: 'poll-motm-2',
    matchTitle: 'Arsenal vs Chelsea FC',
    competition: 'Premier League • Emirates Stadium',
    status: 'FINAL',
    category: 'MOTM',
    totalVotes: 2890,
    players: [
      {
        id: 'p5',
        name: 'Bukayo Saka',
        team: 'Arsenal',
        position: 'Winger',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
        stats: '1 Goal, 1 Assist, 5 Dribbles',
        votes: 1240
      },
      {
        id: 'p6',
        name: 'Declan Rice',
        team: 'Arsenal',
        position: 'Midfielder',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
        stats: '11 Interceptions, 88% Passes',
        votes: 820
      },
      {
        id: 'p7',
        name: 'Cole Palmer',
        team: 'Chelsea FC',
        position: 'Attacking Midfielder',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        stats: '1 Penalty Goal, 3 Chance Creates',
        votes: 610
      },
      {
        id: 'p8',
        name: 'William Saliba',
        team: 'Arsenal',
        position: 'Center Back',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        stats: 'Clean Sheet, 100% Aerial Duels',
        votes: 220
      }
    ]
  },
  {
    id: 'poll-tactics-1',
    matchTitle: 'CF Montréal Tactical Blueprint: Preferred Formation vs Toronto FC',
    competition: 'Canadian Classique Derby Poll',
    status: 'LIVE',
    category: 'TACTICS',
    totalVotes: 876,
    players: [
      {
        id: 't1',
        name: '3-4-2-1 High Press Attack',
        team: 'Tactical Setup A',
        position: 'Formation',
        avatar: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150',
        stats: 'Maximizes wing-back overlaps & forward pressing',
        votes: 412
      },
      {
        id: 't2',
        name: '4-3-3 Balanced Transition',
        team: 'Tactical Setup B',
        position: 'Formation',
        avatar: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150',
        stats: 'Mid-block control with rapid counter pivots',
        votes: 298
      },
      {
        id: 't3',
        name: '5-3-2 Low Block Counter',
        team: 'Tactical Setup C',
        position: 'Formation',
        avatar: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=150',
        stats: 'Defensive solidity away from home',
        votes: 166
      }
    ]
  }
];

// Custom Recharts Tooltip
const PollChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-xl text-xs space-y-1 z-50">
        <div className="font-['Orbitron'] font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
          <span>{data.name}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
            {data.percentage}%
          </span>
        </div>
        <div className="text-slate-400 text-[11px] font-mono">
          Team: <span className="text-slate-200">{data.team}</span>
        </div>
        <div className="text-emerald-400 font-mono font-bold">
          {data.votes.toLocaleString()} votes ({data.percentage}%)
        </div>
      </div>
    );
  }
  return null;
};

export default function MatchPolls() {
  const [polls, setPolls] = useState<MatchPoll[]>(() => {
    try {
      const saved = localStorage.getItem('mtl_match_polls');
      return saved ? JSON.parse(saved) : INITIAL_POLLS;
    } catch {
      return INITIAL_POLLS;
    }
  });

  const [activePollId, setActivePollId] = useState<string>('poll-motm-1');
  const [chartView, setChartView] = useState<'bar' | 'pie'>('bar');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'MOTM' | 'TACTICS'>('ALL');
  const [votedNotice, setVotedNotice] = useState<string | null>(null);

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mtl_match_polls', JSON.stringify(polls));
    } catch (e) {
      console.error('Failed to save match polls:', e);
    }
  }, [polls]);

  const activePoll = polls.find(p => p.id === activePollId) || polls[0];

  // Handle user vote action
  const handleVote = async (pollId: string, playerId: string) => {
    setPolls(prevPolls =>
      prevPolls.map(poll => {
        if (poll.id !== pollId) return poll;

        // If user already voted for this player, do nothing
        if (poll.userVotedId === playerId) return poll;

        const previousVotedId = poll.userVotedId;

        const updatedPlayers = poll.players.map(player => {
          if (player.id === playerId) {
            return { ...player, votes: player.votes + 1 };
          }
          if (previousVotedId && player.id === previousVotedId) {
            return { ...player, votes: Math.max(0, player.votes - 1) };
          }
          return player;
        });

        const newTotal = previousVotedId ? poll.totalVotes : poll.totalVotes + 1;

        return {
          ...poll,
          totalVotes: newTotal,
          userVotedId: playerId,
          players: updatedPlayers
        };
      })
    );

    const votedPlayer = activePoll.players.find(p => p.id === playerId);
    setVotedNotice(`Vote recorded for ${votedPlayer?.name || 'nominee'}!`);
    setTimeout(() => setVotedNotice(null), 3500);

    // Optionally record vote in Supabase if connection exists
    try {
      await supabase.from('match_votes').insert([
        { poll_id: pollId, candidate_id: playerId, created_at: new Date().toISOString() }
      ]);
    } catch {
      // Graceful fallback to local state
    }
  };

  // Transform players into chart-friendly data format
  const chartData = activePoll.players.map((player, index) => {
    const percentage = activePoll.totalVotes > 0
      ? Number(((player.votes / activePoll.totalVotes) * 100).toFixed(1))
      : 0;
    return {
      id: player.id,
      name: player.name,
      team: player.team,
      votes: player.votes,
      percentage,
      fill: POLL_COLORS[index % POLL_COLORS.length]
    };
  });

  const filteredPolls = polls.filter(p => categoryFilter === 'ALL' || p.category === categoryFilter);

  return (
    <div className="bg-[#091120] border border-slate-800/90 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black tracking-widest uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
              <Award className="w-3 h-3 text-emerald-400" />
              MATCHDAY ENGAGEMENT POLLS
            </span>
            <span className="text-slate-600 text-xs">•</span>
            <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400 animate-spin" /> LIVE RECHARTS VIZ
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-white font-['Orbitron'] tracking-wide flex items-center gap-2.5">
            <span>MAN OF THE MATCH & TACTICAL POLLS</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Vote for official match performers, analyze live fan consensus, and view dynamic Recharts distributions.
          </p>
        </div>

        {/* Category Filters & Chart Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#060c18] border border-slate-800 rounded-2xl p-1">
            {(['ALL', 'MOTM', 'TACTICS'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'ALL' ? 'All Polls' : cat === 'MOTM' ? 'Man of Match' : 'Tactics'}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-[#060c18] border border-slate-800 rounded-2xl p-1">
            <button
              onClick={() => setChartView('bar')}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                chartView === 'bar'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Bar Chart View"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartView('pie')}
              className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                chartView === 'pie'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Pie Chart View"
            >
              <PieChartIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* VOTE CONFIRMATION BANNER */}
      {votedNotice && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{votedNotice}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">REALTIME SYNCED</span>
        </div>
      )}

      {/* POLL SELECTION CAROUSEL */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {filteredPolls.map(poll => {
          const isActive = poll.id === activePollId;
          return (
            <button
              key={poll.id}
              onClick={() => setActivePollId(poll.id)}
              className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-gradient-to-b from-[#0d1c33] to-[#081224] border-emerald-500/50 shadow-lg shadow-emerald-950/30'
                  : 'bg-[#060c18] border-slate-800/80 hover:border-slate-700 hover:bg-[#081020]'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${
                  poll.status === 'LIVE'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {poll.status}
                </span>
                <span className="text-slate-400">{poll.totalVotes.toLocaleString()} votes</span>
              </div>
              <div className="font-bold text-xs text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
                {poll.matchTitle}
              </div>
              <div className="text-[10px] text-slate-400 line-clamp-1 mt-1 font-mono">
                {poll.competition}
              </div>
            </button>
          );
        })}
      </div>

      {/* MAIN POLL DETAIL & VISUALIZATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        
        {/* LEFT COLUMN: CANDIDATES / VOTING CARDS (7 COLS) */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Vote className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white font-['Orbitron'] uppercase tracking-wider">
                {activePoll.category === 'MOTM' ? 'MAN OF THE MATCH NOMINEES' : 'TACTICAL OPTIONS'}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Select candidate to submit vote
            </span>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
            {activePoll.players.map(player => {
              const isVoted = activePoll.userVotedId === player.id;
              const percentage = activePoll.totalVotes > 0
                ? ((player.votes / activePoll.totalVotes) * 100).toFixed(1)
                : '0.0';

              return (
                <div
                  key={player.id}
                  onClick={() => handleVote(activePoll.id, player.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isVoted
                      ? 'bg-gradient-to-r from-emerald-950/40 via-[#0a182d] to-[#081224] border-emerald-500/70 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                      : 'bg-[#060c18] border-slate-800/80 hover:border-slate-700 hover:bg-[#081020]'
                  }`}
                >
                  {/* Background Progress Fill Indicator */}
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 transition-all duration-500 pointer-events-none"
                    style={{ width: `${percentage}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="w-11 h-11 rounded-2xl object-cover border-2 border-slate-700 group-hover:border-emerald-400 transition-colors shadow-md"
                        />
                        {isVoted && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[10px] shadow-sm">
                            ✓
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-white truncate group-hover:text-emerald-300 transition-colors">
                            {player.name}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-800 text-slate-300 shrink-0">
                            {player.team}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">
                          {player.stats}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <div className="text-base font-black text-white font-['Orbitron'] flex items-center gap-1">
                        <span>{percentage}%</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {player.votes.toLocaleString()} votes
                      </div>
                      <button
                        className={`mt-2 px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase font-['Orbitron'] transition-all ${
                          isVoted
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/50'
                            : 'bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-300'
                        }`}
                      >
                        {isVoted ? 'Voted' : 'Vote'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: RECHARTS REALTIME VISUALIZATION (5 COLS) */}
        <div className="lg:col-span-5 bg-[#060c18] border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between shadow-inner">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white font-['Orbitron'] uppercase tracking-wider">
                  REAL-TIME RESULT DISTRIBUTION
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                RECHARTS VIZ
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Live breakdown of total votes ({activePoll.totalVotes.toLocaleString()} responses recorded).
            </p>

            {/* CHART DISPLAY */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartView === 'bar' ? (
                  <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} unit="%" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} width={100} />
                    <Tooltip content={<PollChartTooltip />} />
                    <Bar dataKey="percentage" name="Vote Share" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="percentage"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<PollChartTooltip />} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* CANDIDATE LEGEND */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
            {chartData.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.fill }} />
                  <span className="text-slate-300 font-medium truncate max-w-[140px]">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="text-slate-400">{item.votes} votes</span>
                  <span className="font-extrabold text-white">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
