import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Award,
  Zap,
  CheckCircle2,
  Bookmark,
  Share2,
  Sliders,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Trash2,
  ChevronRight,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  Lock,
  Unlock,
  Info,
  Clock,
  Sparkles,
  BarChart2,
  X
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { useAuthSession } from '../App.tsx';
import UniversalFAB from '../components/UniversalFAB.tsx';
import FuturisticLoader from '../components/FuturisticLoader.tsx';
import {
  PlayerStats,
  PlayerComparisonRecord,
  PitchFormAlignmentRecord,
  INITIAL_PREMIER_PLAYERS,
  fetchRealPlayers,
  savePlayerToFirebase,
  fetchSavedPlayerComparisons,
  savePlayerComparisonToFirebase,
  deletePlayerComparisonFromFirebase,
  fetchPitchFormAlignment,
  updatePitchFormAlignmentInFirebase
} from '../config/firebaseStore.ts';

export default function PlayerComparison() {
  const navigate = useNavigate();
  const { user, isAdmin, userProfile } = useAuthSession();

  // Data States
  const [players, setPlayers] = useState<PlayerStats[]>(INITIAL_PREMIER_PLAYERS);
  const [selectedP1Id, setSelectedP1Id] = useState<string>('haaland-erling');
  const [selectedP2Id, setSelectedP2Id] = useState<string>('mbappe-kylian');
  const [savedComparisons, setSavedComparisons] = useState<PlayerComparisonRecord[]>([]);
  const [pitchAlignment, setPitchAlignment] = useState<PitchFormAlignmentRecord | null>(null);

  // UI States
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'scoring' | 'playmaking' | 'defense' | 'physical'>('all');
  const [searchP1, setSearchP1] = useState<string>('');
  const [searchP2, setSearchP2] = useState<string>('');
  const [posFilter, setPosFilter] = useState<string>('ALL');
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [comparisonNote, setComparisonNote] = useState<string>('');
  const [savingComparison, setSavingComparison] = useState<boolean>(false);
  
  // Custom Player Modal
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState<boolean>(false);
  const [newPlayerForm, setNewPlayerForm] = useState<Partial<PlayerStats>>({
    name: '',
    club: '',
    league: 'Premier League',
    nationality: '',
    position: 'Forward',
    age: 23,
    matchesPlayed: 100,
    careerGoals: 45,
    careerAssists: 20,
    defensiveRating: 60,
    tacklesWon: 80,
    interceptions: 50,
    cleanSheets: 0,
    passAccuracy: 82,
    keyPasses: 110,
    aerialDuelsWonRate: 55,
    dribbleSuccessRate: 65,
    shotConversionRate: 20,
    formRating: 8.5,
    overallRating: 85,
    photoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=500&q=80'
  });

  // Admin Pitch Form Alignment Edit State
  const [isAdminEditPitchOpen, setIsAdminEditPitchOpen] = useState<boolean>(false);
  const [adminPitchForm, setAdminPitchForm] = useState<Partial<PitchFormAlignmentRecord>>({});
  const [updatingPitch, setUpdatingPitch] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);

  const notify = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ title, message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Initial Data Load
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [loadedPlayers, loadedComparisons, loadedAlignment] = await Promise.all([
          fetchRealPlayers(),
          fetchSavedPlayerComparisons(),
          fetchPitchFormAlignment()
        ]);

        if (loadedPlayers && loadedPlayers.length > 0) {
          setPlayers(loadedPlayers);
        }
        setSavedComparisons(loadedComparisons);
        setPitchAlignment(loadedAlignment);
        setAdminPitchForm(loadedAlignment);
      } catch (err) {
        console.warn('Player comparison load notice:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Current Selected Players
  const player1 = useMemo(() => {
    return players.find(p => p.id === selectedP1Id) || players[0] || INITIAL_PREMIER_PLAYERS[0];
  }, [players, selectedP1Id]);

  const player2 = useMemo(() => {
    return players.find(p => p.id === selectedP2Id) || players[1] || INITIAL_PREMIER_PLAYERS[1];
  }, [players, selectedP2Id]);

  // Swap Players
  const handleSwapPlayers = () => {
    const temp = selectedP1Id;
    setSelectedP1Id(selectedP2Id);
    setSelectedP2Id(temp);
  };

  // Filtered Players for Dropdowns
  const filteredPlayersP1 = useMemo(() => {
    return players.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchP1.toLowerCase()) ||
                          p.club.toLowerCase().includes(searchP1.toLowerCase());
      const matchPos = posFilter === 'ALL' || p.position.toUpperCase().startsWith(posFilter);
      return matchSearch && matchPos;
    });
  }, [players, searchP1, posFilter]);

  const filteredPlayersP2 = useMemo(() => {
    return players.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchP2.toLowerCase()) ||
                          p.club.toLowerCase().includes(searchP2.toLowerCase());
      const matchPos = posFilter === 'ALL' || p.position.toUpperCase().startsWith(posFilter);
      return matchSearch && matchPos;
    });
  }, [players, searchP2, posFilter]);

  // Radar Data for Recharts
  const radarData = useMemo(() => {
    if (!player1 || !player2) return [];

    return [
      {
        subject: 'Scoring',
        p1: Math.min(100, Math.round((player1.goalsPerMatch * 100) + (player1.shotConversionRate * 0.8))),
        p2: Math.min(100, Math.round((player2.goalsPerMatch * 100) + (player2.shotConversionRate * 0.8))),
        fullMark: 100
      },
      {
        subject: 'Playmaking',
        p1: Math.min(100, Math.round((player1.assistsPerMatch * 130) + (player1.passAccuracy * 0.5))),
        p2: Math.min(100, Math.round((player2.assistsPerMatch * 130) + (player2.passAccuracy * 0.5))),
        fullMark: 100
      },
      {
        subject: 'Defense',
        p1: player1.defensiveRating || 40,
        p2: player2.defensiveRating || 40,
        fullMark: 100
      },
      {
        subject: 'Aerial & Duals',
        p1: player1.aerialDuelsWonRate || 50,
        p2: player2.aerialDuelsWonRate || 50,
        fullMark: 100
      },
      {
        subject: 'Dribbling',
        p1: player1.dribbleSuccessRate || 60,
        p2: player2.dribbleSuccessRate || 60,
        fullMark: 100
      },
      {
        subject: 'Tactical Form',
        p1: Math.round(player1.formRating * 10),
        p2: Math.round(player2.formRating * 10),
        fullMark: 100
      }
    ];
  }, [player1, player2]);

  // Tactical Algorithmic Verdict
  const tacticalVerdict = useMemo(() => {
    if (!player1 || !player2) return '';

    const p1Score = (player1.careerGoals * 1.2) + (player1.careerAssists * 0.9) + (player1.defensiveRating * 1.1);
    const p2Score = (player2.careerGoals * 1.2) + (player2.careerAssists * 0.9) + (player2.defensiveRating * 1.1);

    if (player1.position !== player2.position) {
      return `${player1.name} operates primarily as a tactical ${player1.position} while ${player2.name} anchors the ${player2.position} zone. ${player1.name} provides ${player1.goalsPerMatch > player2.goalsPerMatch ? 'lethal offensive finishing' : 'balanced structural presence'}, whereas ${player2.name} dominates in ${player2.defensiveRating > player1.defensiveRating ? 'defensive duel recovery' : 'possession distribution'}.`;
    }

    if (player1.goalsPerMatch > player2.goalsPerMatch + 0.15) {
      return `${player1.name} showcases distinct direct goal efficiency with ${player1.goalsPerMatch.toFixed(2)} goals/game. However, ${player2.name} counters with ${player2.defensiveRating > player1.defensiveRating ? 'superior defensive work-rate' : 'higher playmaking ball-retention'}.`;
    } else if (player2.goalsPerMatch > player1.goalsPerMatch + 0.15) {
      return `${player2.name} demonstrates higher offensive output (${player2.goalsPerMatch.toFixed(2)} vs ${player1.goalsPerMatch.toFixed(2)}), with ${player1.name} offering ${player1.passAccuracy > player2.passAccuracy ? 'sharper pass security' : 'defensive resilience'}.`;
    }

    return `Remarkably balanced statistical profile. ${player1.name} (${player1.overallRating} OVR) and ${player2.name} (${player2.overallRating} OVR) perform at elite tiers, differentiated by slight margins in ${player1.defensiveRating > player2.defensiveRating ? `${player1.name}'s defensive stability` : `${player2.name}'s defensive impact`}.`;
  }, [player1, player2]);

  // Save Comparison to Firebase
  const handleSaveComparison = async () => {
    if (!player1 || !player2) return;
    setSavingComparison(true);
    try {
      const record = await savePlayerComparisonToFirebase({
        userId: user?.id || 'scout_user',
        userName: userProfile?.username || user?.email?.split('@')[0] || 'Scout',
        player1Id: player1.id,
        player2Id: player2.id,
        player1Name: player1.name,
        player2Name: player2.name,
        comparisonNote: comparisonNote.trim(),
        verdict: tacticalVerdict,
      });

      setSavedComparisons(prev => [record, ...prev]);
      setIsSaveModalOpen(false);
      setComparisonNote('');
      notify('Comparison Saved', `${player1.name} vs ${player2.name} analysis recorded to Firebase!`, 'success');
    } catch (err: any) {
      notify('Save Failed', err.message || 'Could not save comparison to Firebase', 'error');
    } finally {
      setSavingComparison(false);
    }
  };

  // Delete Saved Comparison
  const handleDeleteSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deletePlayerComparisonFromFirebase(id);
      setSavedComparisons(prev => prev.filter(c => c.id !== id));
      notify('Removed', 'Comparison record deleted', 'success');
    } catch {}
  };

  // Create Custom Player
  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerForm.name || !newPlayerForm.club) {
      notify('Incomplete', 'Please provide player name and club', 'error');
      return;
    }

    const id = `p_${newPlayerForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}_${Date.now()}`;
    const matches = Number(newPlayerForm.matchesPlayed) || 1;
    const goals = Number(newPlayerForm.careerGoals) || 0;
    const assists = Number(newPlayerForm.careerAssists) || 0;

    const fullPlayer: PlayerStats = {
      id,
      name: newPlayerForm.name,
      club: newPlayerForm.club,
      league: newPlayerForm.league || 'Premier League',
      nationality: newPlayerForm.nationality || 'International',
      position: (newPlayerForm.position as any) || 'Forward',
      photoUrl: newPlayerForm.photoUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=500&q=80',
      age: Number(newPlayerForm.age) || 24,
      matchesPlayed: matches,
      careerGoals: goals,
      careerAssists: assists,
      goalsPerMatch: parseFloat((goals / matches).toFixed(2)),
      assistsPerMatch: parseFloat((assists / matches).toFixed(2)),
      minutesPerGoal: goals > 0 ? Math.round((matches * 90) / goals) : 0,
      passAccuracy: Number(newPlayerForm.passAccuracy) || 80,
      keyPasses: Number(newPlayerForm.keyPasses) || 50,
      defensiveRating: Number(newPlayerForm.defensiveRating) || 50,
      tacklesWon: Number(newPlayerForm.tacklesWon) || 40,
      interceptions: Number(newPlayerForm.interceptions) || 20,
      cleanSheets: Number(newPlayerForm.cleanSheets) || 0,
      aerialDuelsWonRate: Number(newPlayerForm.aerialDuelsWonRate) || 50,
      dribbleSuccessRate: Number(newPlayerForm.dribbleSuccessRate) || 60,
      shotConversionRate: Number(newPlayerForm.shotConversionRate) || 18,
      formRating: Number(newPlayerForm.formRating) || 8.0,
      overallRating: Number(newPlayerForm.overallRating) || 85,
      pitchZones: {
        attackingThird: 85,
        midfieldControl: 75,
        defensiveSolidity: 60,
        pressingIntensity: 80,
        creativity: 80,
        physicality: 80,
      },
      updatedAt: new Date().toISOString()
    };

    try {
      await savePlayerToFirebase(fullPlayer);
      setPlayers(prev => [fullPlayer, ...prev]);
      setSelectedP2Id(fullPlayer.id);
      setIsAddPlayerModalOpen(false);
      notify('Player Registered', `${fullPlayer.name} saved to Firebase and selected!`, 'success');
    } catch (err: any) {
      notify('Failed', err.message || 'Could not save player', 'error');
    }
  };

  // Admin Save Pitch Form Alignment
  const handleSavePitchAlignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      notify('Access Denied', 'Only verified administrators can update the Pitch Form Alignment Index.', 'error');
      return;
    }

    setUpdatingPitch(true);
    try {
      const adminName = userProfile?.username || user?.email || 'Verified Tactical Admin';
      const updated = await updatePitchFormAlignmentInFirebase({
        alignmentIndex: Number(adminPitchForm.alignmentIndex) || 88,
        formation: adminPitchForm.formation || '4-3-3 Dynamic Overload',
        pitchStatus: adminPitchForm.pitchStatus || 'OPTIMAL',
        tacticalNotes: adminPitchForm.tacticalNotes || '',
        zoneRatings: {
          attackingThird: Number(adminPitchForm.zoneRatings?.attackingThird) || 90,
          midfieldPivot: Number(adminPitchForm.zoneRatings?.midfieldPivot) || 85,
          defensiveBlock: Number(adminPitchForm.zoneRatings?.defensiveBlock) || 82,
          flankWidth: Number(adminPitchForm.zoneRatings?.flankWidth) || 88,
          pressIntensity: Number(adminPitchForm.zoneRatings?.pressIntensity) || 90,
          transitionSpeed: Number(adminPitchForm.zoneRatings?.transitionSpeed) || 85,
        }
      }, adminName);

      setPitchAlignment(updated);
      setIsAdminEditPitchOpen(false);
      notify('Pitch Form Index Updated', `Alignment Index set to ${updated.alignmentIndex}/100 and published to Firebase!`, 'success');
    } catch (err: any) {
      notify('Update Blocked', err.message || 'Permission denied: Admin clearance required.', 'error');
    } finally {
      setUpdatingPitch(false);
    }
  };

  // Helper for winner comparison styling
  const compareStat = (val1: number, val2: number, higherIsBetter: boolean = true) => {
    if (val1 === val2) return { p1Win: false, p2Win: false };
    if (higherIsBetter) {
      return { p1Win: val1 > val2, p2Win: val2 > val1 };
    }
    return { p1Win: val1 < val2, p2Win: val2 < val1 };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <FuturisticLoader active={true} text="LOADING PLAYER TELEMETRY..." subText="SYNCHRONIZING WITH FIREBASE" progress={90} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 pt-4 px-3 sm:px-6 max-w-7xl mx-auto relative font-sans">
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3.5 rounded-xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 transition-all transform animate-in slide-in-from-top-4 ${
          notification.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100 shadow-emerald-950/50'
            : 'bg-rose-950/90 border-rose-500/60 text-rose-100 shadow-rose-950/50'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <p className="font-bold text-sm">{notification.title}</p>
            <p className="text-xs opacity-90">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Firebase Live Sync
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
                Scout Pro Edition
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-emerald-400" />
              Tactical Player Comparison Engine
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Side-by-side career analytics across scoring efficiency, distribution, defensive ratings, and physical impact. Backed by real Firebase Firestore persistence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all hover:scale-102 active:scale-98"
            >
              <Bookmark className="w-4 h-4" />
              Save Comparison
            </button>
            <button
              onClick={() => setIsSavedDrawerOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              History ({savedComparisons.length})
            </button>
            <button
              onClick={() => setIsAddPlayerModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/70 text-indigo-200 border border-indigo-700/60 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              Add Custom Player
            </button>
          </div>
        </div>

        {/* Quick Comparison Presets */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 shrink-0 font-mono flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Classique Matchups:
          </span>
          <button
            onClick={() => { setSelectedP1Id('haaland-erling'); setSelectedP2Id('mbappe-kylian'); }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 whitespace-nowrap transition-colors"
          >
            Haaland vs Mbappé
          </button>
          <button
            onClick={() => { setSelectedP1Id('salah-mohamed'); setSelectedP2Id('saka-bukayo'); }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 whitespace-nowrap transition-colors"
          >
            Salah vs Saka
          </button>
          <button
            onClick={() => { setSelectedP1Id('vandijk-virgil'); setSelectedP2Id('saliba-william'); }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 whitespace-nowrap transition-colors"
          >
            Van Dijk vs Saliba (DEF)
          </button>
          <button
            onClick={() => { setSelectedP1Id('debruyne-kevin'); setSelectedP2Id('rodri-hernandez'); }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 whitespace-nowrap transition-colors"
          >
            De Bruyne vs Rodri (MID)
          </button>
          <button
            onClick={() => { setSelectedP1Id('martinez-josef'); setSelectedP2Id('piette-samuel'); }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 whitespace-nowrap transition-colors"
          >
            Martínez vs Piette (MTL)
          </button>
        </div>
      </div>

      {/* Player Selectors & Position Filter */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 items-center">
        {/* Player 1 Selection */}
        <div className="md:col-span-5 bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-lg relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Player One (Primary)
            </span>
            <span className="text-xs text-slate-400 font-mono">{player1?.position}</span>
          </div>

          <div className="relative mb-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by player or club..."
              value={searchP1}
              onChange={(e) => setSearchP1(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedP1Id}
            onChange={(e) => setSelectedP1Id(e.target.value)}
            className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {filteredPlayersP1.map((p) => (
              <option key={`p1-${p.id}`} value={p.id}>
                {p.name} — {p.club} ({p.position}, {p.overallRating} OVR)
              </option>
            ))}
          </select>
        </div>

        {/* Swap Button */}
        <div className="md:col-span-2 flex justify-center">
          <button
            onClick={handleSwapPlayers}
            title="Swap Player Sides"
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-950/50 transition-transform active:scale-90 hover:scale-110"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Player 2 Selection */}
        <div className="md:col-span-5 bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-lg relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              Player Two (Comparison)
            </span>
            <span className="text-xs text-slate-400 font-mono">{player2?.position}</span>
          </div>

          <div className="relative mb-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by player or club..."
              value={searchP2}
              onChange={(e) => setSearchP2(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={selectedP2Id}
            onChange={(e) => setSelectedP2Id(e.target.value)}
            className="w-full bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {filteredPlayersP2.map((p) => (
              <option key={`p2-${p.id}`} value={p.id}>
                {p.name} — {p.club} ({p.position}, {p.overallRating} OVR)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dual Player Visual Identity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Player 1 Card */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/20 border-2 border-emerald-500/40 p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={player1.photoUrl}
                  alt={player1.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md shadow-emerald-950/50"
                  onError={(e) => {
                    (e.target as any).src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=500&q=80';
                  }}
                />
                <span className="absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs shadow-md">
                  {player1.overallRating} OVR
                </span>
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{player1.name}</h2>
                <p className="text-emerald-400 font-medium text-sm">{player1.club}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                  <span>{player1.league}</span>
                  <span>•</span>
                  <span>{player1.nationality}</span>
                  <span>•</span>
                  <span>Age {player1.age}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                Form {player1.formRating}/10
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">{player1.matchesPlayed} Matches</p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800/80 text-center font-mono text-xs">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-[10px]">GOALS</div>
              <div className="text-emerald-400 font-bold text-base">{player1.careerGoals}</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-[10px]">ASSISTS</div>
              <div className="text-emerald-400 font-bold text-base">{player1.careerAssists}</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-[10px]">DEF RATING</div>
              <div className="text-emerald-400 font-bold text-base">{player1.defensiveRating}</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-[10px]">GOAL/90</div>
              <div className="text-emerald-400 font-bold text-base">{player1.goalsPerMatch.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Player 2 Card */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/20 border-2 border-indigo-500/40 p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={player2.photoUrl}
                  alt={player2.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-400 shadow-md shadow-indigo-950/50"
                  onError={(e) => {
                    (e.target as any).src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=500&q=80';
                  }}
                />
                <span className="absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full bg-indigo-500 text-white font-black text-xs shadow-md">
                  {player2.overallRating} OVR
                </span>
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{player2.name}</h2>
                <p className="text-indigo-400 font-medium text-sm">{player2.club}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                  <span>{player2.league}</span>
                  <span>•</span>
                  <span>{player2.nationality}</span>
                  <span>•</span>
                  <span>Age {player2.age}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-xs">
                <Flame className="w-3.5 h-3.5 text-indigo-400" />
                Form {player2.formRating}/10
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">{player2.matchesPlayed} Matches</p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800/80 text-center font-mono text-xs">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-[10px]">GOALS</div>
              <div className="text-indigo-400 font-bold text-base">{player2.careerGoals}</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-[10px]">ASSISTS</div>
              <div className="text-indigo-400 font-bold text-base">{player2.careerAssists}</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-[10px]">DEF RATING</div>
              <div className="text-indigo-400 font-bold text-base">{player2.defensiveRating}</div>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-[10px]">GOAL/90</div>
              <div className="text-indigo-400 font-bold text-base">{player2.goalsPerMatch.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hexagonal Tactical Radar Chart & AI Verdict */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Radar Chart */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-400" />
                Multidimensional Tactical Radar
              </h3>
              <p className="text-xs text-slate-400">Scoring, distribution, defensive index and athletic prowess</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                {player1.name.split(' ')[0]}
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                {player2.name.split(' ')[0]}
              </span>
            </div>
          </div>

          <div className="w-full h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar
                  name={player1.name}
                  dataKey="p1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.4}
                />
                <Radar
                  name={player2.name}
                  dataKey="p2"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Tactical Verdict & Summary Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Algorithmic Scout Verdict</h3>
                <span className="text-[11px] font-mono text-slate-400 uppercase">Automated Performance Evaluation</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 mb-4">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                "{tacticalVerdict}"
              </p>
            </div>

            {/* Matchup Differentiators */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
                <span className="text-slate-400">Higher Goal Output:</span>
                <span className={`font-bold ${player1.goalsPerMatch >= player2.goalsPerMatch ? 'text-emerald-400' : 'text-indigo-400'}`}>
                  {player1.goalsPerMatch >= player2.goalsPerMatch ? player1.name : player2.name} ({(Math.max(player1.goalsPerMatch, player2.goalsPerMatch)).toFixed(2)}/match)
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
                <span className="text-slate-400">Playmaking Assist Edge:</span>
                <span className={`font-bold ${player1.assistsPerMatch >= player2.assistsPerMatch ? 'text-emerald-400' : 'text-indigo-400'}`}>
                  {player1.assistsPerMatch >= player2.assistsPerMatch ? player1.name : player2.name} ({(Math.max(player1.assistsPerMatch, player2.assistsPerMatch)).toFixed(2)}/match)
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
                <span className="text-slate-400">Defensive Rating Lead:</span>
                <span className={`font-bold ${player1.defensiveRating >= player2.defensiveRating ? 'text-emerald-400' : 'text-indigo-400'}`}>
                  {player1.defensiveRating >= player2.defensiveRating ? player1.name : player2.name} ({Math.max(player1.defensiveRating, player2.defensiveRating)}/100)
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
                <span className="text-slate-400">Ball Retention (Pass Acc):</span>
                <span className={`font-bold ${player1.passAccuracy >= player2.passAccuracy ? 'text-emerald-400' : 'text-indigo-400'}`}>
                  {player1.passAccuracy >= player2.passAccuracy ? player1.name : player2.name} ({Math.max(player1.passAccuracy, player2.passAccuracy)}%)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Audit status: Synced</span>
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
            >
              Bookmark in Hub <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Categories Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {[
          { key: 'all', label: 'All Statistics' },
          { key: 'scoring', label: 'Scoring & Goals' },
          { key: 'playmaking', label: 'Playmaking & Assists' },
          { key: 'defense', label: 'Defensive Ratings & Tackles' },
          { key: 'physical', label: 'Physicality & Duels' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeCategory === tab.key
                ? 'bg-slate-100 text-slate-950 shadow-md font-bold'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Side-by-Side Stat Progress Bars */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl mb-8">
        <div className="grid grid-cols-12 text-xs font-mono uppercase text-slate-400 pb-3 border-b border-slate-800 mb-4 px-2">
          <div className="col-span-4 text-left font-bold text-emerald-400">{player1.name}</div>
          <div className="col-span-4 text-center font-bold text-slate-300">Metric</div>
          <div className="col-span-4 text-right font-bold text-indigo-400">{player2.name}</div>
        </div>

        <div className="space-y-4">
          {/* Helper Component for Stat Row */}
          {[
            {
              cat: 'scoring',
              label: 'Total Career Goals',
              v1: player1.careerGoals,
              v2: player2.careerGoals,
              format: (v: number) => v.toLocaleString(),
              max: Math.max(player1.careerGoals, player2.careerGoals, 100) * 1.15,
              higher: true
            },
            {
              cat: 'scoring',
              label: 'Goals Per Match',
              v1: player1.goalsPerMatch,
              v2: player2.goalsPerMatch,
              format: (v: number) => v.toFixed(2),
              max: 1.2,
              higher: true
            },
            {
              cat: 'scoring',
              label: 'Minutes Per Goal',
              v1: player1.minutesPerGoal,
              v2: player2.minutesPerGoal,
              format: (v: number) => `${v} min`,
              max: Math.max(player1.minutesPerGoal, player2.minutesPerGoal, 200) * 1.1,
              higher: false // Lower minutes per goal is superior!
            },
            {
              cat: 'scoring',
              label: 'Shot Conversion Rate',
              v1: player1.shotConversionRate,
              v2: player2.shotConversionRate,
              format: (v: number) => `${v}%`,
              max: 40,
              higher: true
            },
            {
              cat: 'playmaking',
              label: 'Career Assists',
              v1: player1.careerAssists,
              v2: player2.careerAssists,
              format: (v: number) => v.toLocaleString(),
              max: Math.max(player1.careerAssists, player2.careerAssists, 50) * 1.2,
              higher: true
            },
            {
              cat: 'playmaking',
              label: 'Assists Per Match',
              v1: player1.assistsPerMatch,
              v2: player2.assistsPerMatch,
              format: (v: number) => v.toFixed(2),
              max: 0.6,
              higher: true
            },
            {
              cat: 'playmaking',
              label: 'Pass Accuracy',
              v1: player1.passAccuracy,
              v2: player2.passAccuracy,
              format: (v: number) => `${v}%`,
              max: 100,
              higher: true
            },
            {
              cat: 'playmaking',
              label: 'Key Passes / Chances Created',
              v1: player1.keyPasses,
              v2: player2.keyPasses,
              format: (v: number) => v.toLocaleString(),
              max: Math.max(player1.keyPasses, player2.keyPasses, 200) * 1.15,
              higher: true
            },
            {
              cat: 'defense',
              label: 'Defensive Rating (0-100)',
              v1: player1.defensiveRating,
              v2: player2.defensiveRating,
              format: (v: number) => `${v}`,
              max: 100,
              higher: true
            },
            {
              cat: 'defense',
              label: 'Tackles Won',
              v1: player1.tacklesWon,
              v2: player2.tacklesWon,
              format: (v: number) => v.toLocaleString(),
              max: Math.max(player1.tacklesWon, player2.tacklesWon, 200) * 1.15,
              higher: true
            },
            {
              cat: 'defense',
              label: 'Interceptions',
              v1: player1.interceptions,
              v2: player2.interceptions,
              format: (v: number) => v.toLocaleString(),
              max: Math.max(player1.interceptions, player2.interceptions, 100) * 1.15,
              higher: true
            },
            {
              cat: 'defense',
              label: 'Clean Sheets Anchored',
              v1: player1.cleanSheets,
              v2: player2.cleanSheets,
              format: (v: number) => v.toLocaleString(),
              max: Math.max(player1.cleanSheets, player2.cleanSheets, 50) * 1.2,
              higher: true
            },
            {
              cat: 'physical',
              label: 'Aerial Duels Won %',
              v1: player1.aerialDuelsWonRate,
              v2: player2.aerialDuelsWonRate,
              format: (v: number) => `${v}%`,
              max: 100,
              higher: true
            },
            {
              cat: 'physical',
              label: 'Dribble Success %',
              v1: player1.dribbleSuccessRate,
              v2: player2.dribbleSuccessRate,
              format: (v: number) => `${v}%`,
              max: 100,
              higher: true
            },
            {
              cat: 'physical',
              label: 'Current Season Form Rating',
              v1: player1.formRating,
              v2: player2.formRating,
              format: (v: number) => `${v}/10`,
              max: 10,
              higher: true
            },
          ]
            .filter(item => activeCategory === 'all' || item.cat === activeCategory)
            .map((stat, idx) => {
              const { p1Win, p2Win } = compareStat(stat.v1, stat.v2, stat.higher);
              const p1Percent = Math.min(100, Math.round((stat.v1 / stat.max) * 100));
              const p2Percent = Math.min(100, Math.round((stat.v2 / stat.max) * 100));

              return (
                <div key={idx} className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors">
                  <div className="grid grid-cols-12 items-center text-xs sm:text-sm font-semibold mb-2">
                    {/* Player 1 Stat */}
                    <div className="col-span-3 text-left font-mono flex items-center gap-1.5">
                      {p1Win && <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      <span className={p1Win ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {stat.format(stat.v1)}
                      </span>
                    </div>

                    {/* Metric Label */}
                    <div className="col-span-6 text-center text-slate-300 font-medium text-xs sm:text-sm">
                      {stat.label}
                    </div>

                    {/* Player 2 Stat */}
                    <div className="col-span-3 text-right font-mono flex items-center justify-end gap-1.5">
                      <span className={p2Win ? 'text-indigo-400 font-bold' : 'text-slate-400'}>
                        {stat.format(stat.v2)}
                      </span>
                      {p2Win && <Award className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </div>
                  </div>

                  {/* Dual Bar Display */}
                  <div className="grid grid-cols-2 gap-2 h-2.5">
                    {/* Left bar (fills right to left) */}
                    <div className="w-full bg-slate-900 rounded-full h-full flex justify-end overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          p1Win ? 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-emerald-600/60'
                        }`}
                        style={{ width: `${p1Percent}%` }}
                      ></div>
                    </div>

                    {/* Right bar (fills left to right) */}
                    <div className="w-full bg-slate-900 rounded-full h-full flex justify-start overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          p2Win ? 'bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-indigo-600/60'
                        }`}
                        style={{ width: `${p2Percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PITCH FORM ALIGNMENT INDEX (EDITABLE ONLY BY ADMINS) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/20 border-2 border-emerald-500/30 p-5 sm:p-7 shadow-2xl relative overflow-hidden mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Live Tactical Telemetry
              </span>
              {isAdmin ? (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Admin Calibration Clearance
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Admin Protected Metric
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              Tactical Pitch Form Alignment Index
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time spatial pitch synchronization mapping team compactness, flank overloads, and pressing transition lines.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin ? (
              <button
                onClick={() => {
                  setAdminPitchForm(pitchAlignment || {});
                  setIsAdminEditPitchOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all hover:scale-102"
              >
                <Sliders className="w-4 h-4 text-white" />
                Calibrate Index (Admin Only)
              </button>
            ) : (
              <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>Editable strictly by verified admins</span>
              </div>
            )}
          </div>
        </div>

        {/* Pitch Graphic with Live Tactical Metrics Overlay */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Visual Football Pitch */}
          <div className="lg:col-span-7 bg-emerald-950/50 border-2 border-emerald-600/40 rounded-2xl p-4 relative overflow-hidden shadow-inner">
            {/* Field Grass Stripes Pattern */}
            <div className="w-full h-64 sm:h-80 bg-gradient-to-b from-emerald-900 to-green-900 relative rounded-xl border border-emerald-500/40 overflow-hidden shadow-2xl flex flex-col justify-between">
              {/* Pitch Markings */}
              {/* Penalty box top */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-48 h-16 border-b-2 border-x-2 border-emerald-200/40 rounded-b-lg"></div>
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-2 border-emerald-200/40 rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-emerald-200/80 rounded-full"></div>
              </div>
              {/* Center Line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-200/40"></div>
              {/* Penalty box bottom */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-48 h-16 border-t-2 border-x-2 border-emerald-200/40 rounded-t-lg"></div>

              {/* Tactical Zone Visual Overlays */}
              <div className="relative z-10 p-3 h-full flex flex-col justify-between pointer-events-none">
                {/* Attacking Third */}
                <div className="flex items-center justify-between text-[11px] font-mono text-emerald-100 bg-emerald-950/60 backdrop-blur-sm p-1.5 px-3 rounded-lg border border-emerald-500/30">
                  <span className="font-bold">ATTACKING OVERLOAD</span>
                  <span className="text-emerald-400 font-bold">{pitchAlignment?.zoneRatings.attackingThird || 92}% Synced</span>
                </div>

                {/* Midfield Transition */}
                <div className="flex items-center justify-between text-[11px] font-mono text-emerald-100 bg-indigo-950/60 backdrop-blur-sm p-1.5 px-3 rounded-lg border border-indigo-500/30">
                  <span className="font-bold">MIDFIELD PIVOT CONTROL</span>
                  <span className="text-indigo-300 font-bold">{pitchAlignment?.zoneRatings.midfieldPivot || 86}% Synced</span>
                </div>

                {/* Defensive Block */}
                <div className="flex items-center justify-between text-[11px] font-mono text-emerald-100 bg-slate-950/70 backdrop-blur-sm p-1.5 px-3 rounded-lg border border-slate-700">
                  <span className="font-bold">DEFENSIVE COMPACTNESS</span>
                  <span className="text-amber-300 font-bold">{pitchAlignment?.zoneRatings.defensiveBlock || 84}% Synced</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 text-xs font-mono text-emerald-300/80 px-1">
              <span>Formation: <strong className="text-white">{pitchAlignment?.formation || '4-3-3 Attacking'}</strong></span>
              <span>Updated: {pitchAlignment?.updatedAt ? new Date(pitchAlignment.updatedAt).toLocaleDateString() : 'Active'}</span>
            </div>
          </div>

          {/* Alignment Index Telemetry Gauges */}
          <div className="lg:col-span-5 space-y-4">
            {/* Primary Index Card */}
            <div className="bg-slate-950/80 border border-emerald-500/40 rounded-2xl p-4 text-center relative overflow-hidden">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">
                Pitch Form Alignment Rating
              </div>
              <div className="text-5xl font-black text-emerald-400 font-mono tracking-tight flex items-center justify-center gap-2">
                {pitchAlignment?.alignmentIndex || 88}
                <span className="text-xl text-slate-500 font-normal">/100</span>
              </div>
              <div className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold">
                STATUS: {pitchAlignment?.pitchStatus || 'OPTIMAL'}
              </div>
              <p className="text-xs text-slate-400 mt-3 italic">
                "{pitchAlignment?.tacticalNotes || 'Tactical units synchronized across half spaces.'}"
              </p>
            </div>

            {/* Individual Sector Ratings */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Flank Width & Inverted Space:</span>
                <span className="font-mono font-bold text-emerald-400">{pitchAlignment?.zoneRatings.flankWidth || 89}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>High Press Intensity:</span>
                <span className="font-mono font-bold text-indigo-400">{pitchAlignment?.zoneRatings.pressIntensity || 91}%</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Counter-Transition Speed:</span>
                <span className="font-mono font-bold text-amber-400">{pitchAlignment?.zoneRatings.transitionSpeed || 87}%</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-slate-400 font-mono text-[11px]">
                <span>Certified By:</span>
                <span className="text-slate-300">{pitchAlignment?.updatedBy || 'Tactical Board Admin'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SAVE COMPARISON MODAL (SAVES TO FIREBASE) */}
      {/* ========================================================================= */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsSaveModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Save Comparison</h3>
                <p className="text-xs text-slate-400">Store this side-by-side match analysis into Firebase</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 text-xs font-mono">
              <div className="text-slate-400">MATCHUP:</div>
              <div className="text-white font-bold text-sm mt-0.5">
                {player1.name} vs {player2.name}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Custom Scouting Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={comparisonNote}
                onChange={(e) => setComparisonNote(e.target.value)}
                placeholder="e.g., Note on tactical positioning, summer transfer target comparison, high press efficacy..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingComparison}
                onClick={handleSaveComparison}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
              >
                {savingComparison ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save to Firebase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SAVED COMPARISONS HISTORY DRAWER */}
      {/* ========================================================================= */}
      {isSavedDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full p-5 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Saved Comparisons</h3>
                </div>
                <button
                  onClick={() => setIsSavedDrawerOpen(false)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {savedComparisons.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Bookmark className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                  <p className="text-sm font-semibold">No saved comparisons yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click "Save Comparison" on any player matchup to record it in Firebase.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedComparisons.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedP1Id(c.player1Id);
                        setSelectedP2Id(c.player2Id);
                        setIsSavedDrawerOpen(false);
                      }}
                      className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 hover:border-emerald-500/40 cursor-pointer transition-all group relative"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                            {c.player1Name} vs {c.player2Name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {new Date(c.savedAt).toLocaleDateString()} by {c.userName}
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeleteSaved(c.id, e)}
                          title="Delete Record"
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {c.comparisonNote && (
                        <p className="text-xs text-slate-300 mt-2 bg-slate-900/60 p-2 rounded-lg italic border border-slate-800">
                          "{c.comparisonNote}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsSavedDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD CUSTOM PLAYER TO FIREBASE */}
      {/* ========================================================================= */}
      {isAddPlayerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddPlayerModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Register Player to Hub</h3>
                <p className="text-xs text-slate-400">Add player metrics to Firebase Firestore catalogue</p>
              </div>
            </div>

            <form onSubmit={handleCreatePlayer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Player Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lamine Yamal"
                    value={newPlayerForm.name}
                    onChange={(e) => setNewPlayerForm({ ...newPlayerForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Club Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FC Barcelona"
                    value={newPlayerForm.club}
                    onChange={(e) => setNewPlayerForm({ ...newPlayerForm, club: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Position</label>
                  <select
                    value={newPlayerForm.position}
                    onChange={(e) => setNewPlayerForm({ ...newPlayerForm, position: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="Forward">Forward</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Defender">Defender</option>
                    <option value="Goalkeeper">Goalkeeper</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Age</label>
                  <input
                    type="number"
                    value={newPlayerForm.age}
                    onChange={(e) => setNewPlayerForm({ ...newPlayerForm, age: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Overall (OVR)</label>
                  <input
                    type="number"
                    value={newPlayerForm.overallRating}
                    onChange={(e) => setNewPlayerForm({ ...newPlayerForm, overallRating: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Matches Played</label>
                  <input
                    type="number"
                    value={newPlayerForm.matchesPlayed}
                    onChange={(e) => setNewPlayerForm({ ...newPlayerForm, matchesPlayed: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Career Goals</label>
                  <input
                    type="number"
                    value={newPlayerForm.careerGoals}
                    onChange={(e) => setNewPlayerForm({ ...newPlayerForm, careerGoals: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Career Assists</label>
                  <input
                    type="number"
                    value={newPlayerForm.careerAssists}
                    onChange={(e) => setNewPlayerForm({ ...newPlayerForm, careerAssists: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Defensive Rating (0-100)</label>
                  <input
                    type="number"
                    value={newPlayerForm.defensiveRating}
                    onChange={(e) => setNewPlayerForm({ ...newPlayerForm, defensiveRating: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Pass Accuracy %</label>
                  <input
                    type="number"
                    value={newPlayerForm.passAccuracy}
                    onChange={(e) => setNewPlayerForm({ ...newPlayerForm, passAccuracy: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Photo Image URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newPlayerForm.photoUrl}
                  onChange={(e) => setNewPlayerForm({ ...newPlayerForm, photoUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPlayerModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Save to Firebase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADMIN PITCH FORM ALIGNMENT INDEX CALIBRATION */}
      {/* ========================================================================= */}
      {isAdminEditPitchOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsAdminEditPitchOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Admin Pitch Form Calibration
                </h3>
                <p className="text-xs text-amber-300/80 font-mono">
                  Clearance: {user?.email || 'Verified Admin'} • Writes to Firebase
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePitchAlignment} className="space-y-4 text-xs">
              {/* Overall Alignment Index Slider */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-bold text-slate-200">Pitch Form Alignment Index</label>
                  <span className="text-xl font-mono font-bold text-emerald-400">
                    {adminPitchForm.alignmentIndex ?? 88} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adminPitchForm.alignmentIndex ?? 88}
                  onChange={(e) => setAdminPitchForm({ ...adminPitchForm, alignmentIndex: Number(e.target.value) })}
                  className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Formation & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Tactical Formation</label>
                  <select
                    value={adminPitchForm.formation ?? '4-3-3 Dynamic Overload'}
                    onChange={(e) => setAdminPitchForm({ ...adminPitchForm, formation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="4-3-3 Dynamic Overload">4-3-3 Dynamic Overload</option>
                    <option value="4-2-3-1 High Press">4-2-3-1 High Press</option>
                    <option value="3-5-2 Fluid Wingbacks">3-5-2 Fluid Wingbacks</option>
                    <option value="4-4-2 Diamond Block">4-4-2 Diamond Block</option>
                    <option value="3-4-2-1 Asymmetric Attack">3-4-2-1 Asymmetric Attack</option>
                    <option value="5-3-2 Low Block Counter">5-3-2 Low Block Counter</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Pitch Status</label>
                  <select
                    value={adminPitchForm.pitchStatus ?? 'OPTIMAL'}
                    onChange={(e) => setAdminPitchForm({ ...adminPitchForm, pitchStatus: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  >
                    <option value="OPTIMAL">OPTIMAL</option>
                    <option value="COMPACT">COMPACT</option>
                    <option value="OVERLOADED">OVERLOADED</option>
                    <option value="DISRUPTED">DISRUPTED</option>
                  </select>
                </div>
              </div>

              {/* Zone Ratings Sliders */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200 block mb-1">Tactical Pitch Zone Calibration</span>
                
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Attacking Third Overload:</span>
                    <span className="font-mono text-emerald-400">{adminPitchForm.zoneRatings?.attackingThird ?? 92}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={adminPitchForm.zoneRatings?.attackingThird ?? 92}
                    onChange={(e) => setAdminPitchForm({
                      ...adminPitchForm,
                      zoneRatings: { ...(adminPitchForm.zoneRatings as any), attackingThird: Number(e.target.value) }
                    })}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Midfield Pivot Control:</span>
                    <span className="font-mono text-indigo-400">{adminPitchForm.zoneRatings?.midfieldPivot ?? 86}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={adminPitchForm.zoneRatings?.midfieldPivot ?? 86}
                    onChange={(e) => setAdminPitchForm({
                      ...adminPitchForm,
                      zoneRatings: { ...(adminPitchForm.zoneRatings as any), midfieldPivot: Number(e.target.value) }
                    })}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Defensive Block Compactness:</span>
                    <span className="font-mono text-amber-400">{adminPitchForm.zoneRatings?.defensiveBlock ?? 84}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={adminPitchForm.zoneRatings?.defensiveBlock ?? 84}
                    onChange={(e) => setAdminPitchForm({
                      ...adminPitchForm,
                      zoneRatings: { ...(adminPitchForm.zoneRatings as any), defensiveBlock: Number(e.target.value) }
                    })}
                    className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>High Press Intensity:</span>
                    <span className="font-mono text-rose-400">{adminPitchForm.zoneRatings?.pressIntensity ?? 91}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={adminPitchForm.zoneRatings?.pressIntensity ?? 91}
                    onChange={(e) => setAdminPitchForm({
                      ...adminPitchForm,
                      zoneRatings: { ...(adminPitchForm.zoneRatings as any), pressIntensity: Number(e.target.value) }
                    })}
                    className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Admin Tactical Notes */}
              <div>
                <label className="text-slate-300 font-semibold mb-1 block">Admin Tactical Assessment Notes</label>
                <textarea
                  rows={3}
                  value={adminPitchForm.tacticalNotes ?? ''}
                  onChange={(e) => setAdminPitchForm({ ...adminPitchForm, tacticalNotes: e.target.value })}
                  placeholder="Official tactical assessment and pitch alignment notes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminEditPitchOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPitch}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
                >
                  {updatingPitch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Save Alignment to Firebase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <UniversalFAB />
    </div>
  );
}
