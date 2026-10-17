import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Layers,
  FileText,
  Swords,
  Users,
  Flame,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  X,
  ArrowRight,
  ShieldAlert,
  Send,
  Zap,
  Radio,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { soundEngine } from '../utils/soundEngine.ts';

export type AiGeneratorCategory = 'news' | 'fixtures' | 'matches' | 'comparisons' | 'team_stats' | 'trending';

interface GeminiAiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: AiGeneratorCategory;
  initialDate?: string;
  initialInstruction?: string;
  onAutoFill?: (data: any, category: AiGeneratorCategory) => void;
}

const CATEGORIES: { id: AiGeneratorCategory; label: string; icon: any; color: string; desc: string }[] = [
  { id: 'news', label: 'News & Editorial', icon: FileText, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', desc: 'Generate complete sports wire articles, summaries & tags' },
  { id: 'fixtures', label: 'Fixtures & Schedule', icon: Calendar, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10', desc: 'Upcoming matches, venues, referees & broadcast channels' },
  { id: 'matches', label: 'Match Predictions', icon: Zap, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10', desc: 'Odds, scores, confidence stars & xG tactical analysis' },
  { id: 'comparisons', label: 'Player Comparisons', icon: Swords, color: 'text-purple-400 border-purple-500/40 bg-purple-500/10', desc: 'Head-to-head radar metrics, goals, xG & tactical verdict' },
  { id: 'team_stats', label: 'Team Starts & Lineups', icon: Users, color: 'text-blue-400 border-blue-500/40 bg-blue-500/10', desc: 'Starting XI, tactical formations, roles & team styles' },
  { id: 'trending', label: 'Trending Topics', icon: Flame, color: 'text-rose-400 border-rose-500/40 bg-rose-500/10', desc: 'Viral social football discussions, tags & engagement scores' },
];

const SUGGESTIONS: Record<AiGeneratorCategory, string[]> = {
  news: [
    'CF Montréal tactical adjustments for Canadian Classique derby',
    'UEFA Champions League quarter-final high-pressing trends',
    'Premier League title race expected goals and squad rotation'
  ],
  fixtures: [
    'CF Montréal vs Toronto FC derby at Stade Saputo',
    'Arsenal vs Manchester City Premier League title clash',
    'Real Madrid vs Barcelona El Clásico at Santiago Bernabéu'
  ],
  matches: [
    'CF Montréal vs Inter Miami Eastern Conference showdown',
    'Bayern Munich vs Borussia Dortmund Der Klassiker',
    'Liverpool vs Chelsea high-tempo transition clash'
  ],
  comparisons: [
    'Erling Haaland vs Kylian Mbappé',
    'Jude Bellingham vs Phil Foden playmakers',
    'Vinicius Jr vs Bukayo Saka dynamic wingers'
  ],
  team_stats: [
    'CF Montréal 4-3-3 tactical starting XI vs Toronto FC',
    'Manchester City 3-2-4-1 buildup shape vs Arsenal',
    'Real Madrid 4-3-1-2 diamond midfield setup'
  ],
  trending: [
    'Canadian Classique referee stoppage controversy',
    'VAR goal-line handball debate in stoppage time',
    'Record-breaking transfer clause triggered by European giants'
  ]
};

export const GeminiAiGeneratorModal: React.FC<GeminiAiGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'news',
  initialDate,
  initialInstruction,
  onAutoFill
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AiGeneratorCategory>(initialCategory);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
  const [instruction, setInstruction] = useState<string>(initialInstruction || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
    if (initialDate) setSelectedDate(initialDate);
    if (initialInstruction) setInstruction(initialInstruction);
  }, [initialCategory, initialDate, initialInstruction, isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async (autoSave = false) => {
    if (loading) return;
    setLoading(true);
    setGeneratedData(null);
    setSaveSuccess(null);
    soundEngine.playTactileClick();

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          date: selectedDate,
          instruction: instruction.trim() || SUGGESTIONS[selectedCategory][0],
          autoSave
        })
      });

      const json = await res.json();
      if (json && json.data) {
        setGeneratedData(json.data);
        if (autoSave) {
          setSaveSuccess(`Generated & published directly to ${selectedCategory.toUpperCase()} database!`);
          window.dispatchEvent(new CustomEvent('mtl_data_updated', { detail: { category: selectedCategory } }));
        }
      }
    } catch (err) {
      console.error('Error generating data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!generatedData) return;
    navigator.clipboard.writeText(JSON.stringify(generatedData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToForm = () => {
    if (!generatedData) return;
    if (onAutoFill) {
      onAutoFill(generatedData, selectedCategory);
    }
    soundEngine.playTactileClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#091222] border-2 border-emerald-500/40 rounded-3xl w-full max-w-4xl p-5 sm:p-7 shadow-2xl shadow-black/80 flex flex-col max-h-[92vh] overflow-hidden relative">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-['Orbitron'] tracking-wider">
                  GEMINI AI FOOTBALL GENERATOR
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                  gemini-flash-latest
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate news, fixtures, matches, player comparisons & team starts based on date & instruction
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-6">
          
          {/* STEP 1: CATEGORY SELECTION */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-['Orbitron'] block mb-2.5">
              1. SELECT FOOTBALL CATEGORY
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CATEGORIES.map((c) => {
                const isSelected = selectedCategory === c.id;
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCategory(c.id);
                      setGeneratedData(null);
                      soundEngine.playTactileClick();
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${c.color} ring-2 ring-emerald-400/50 shadow-lg scale-[1.01]`
                        : 'bg-[#060e1a] border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">{c.label}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{c.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: DATE & INSTRUCTION CONFIGURATION */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* DATE SELECTION (4 cols) */}
            <div className="md:col-span-4 bg-[#060e1a] border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-['Orbitron'] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>2. TARGET DATE</span>
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-[#0a1424] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 cursor-pointer"
                >
                  Weekend
                </button>
              </div>
            </div>

            {/* INSTRUCTION INPUT & QUICK CHIPS (8 cols) */}
            <div className="md:col-span-8 bg-[#060e1a] border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-['Orbitron'] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3. INSTRUCTION & PROMPT TOPIC</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Teams, players, or scenario</span>
              </div>

              <input
                type="text"
                placeholder={SUGGESTIONS[selectedCategory][0]}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="w-full bg-[#0a1424] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS[selectedCategory].map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInstruction(s);
                      soundEngine.playTactileClick();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700/60 text-[10px] text-slate-300 transition-colors cursor-pointer text-left line-clamp-1"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* GENERATE ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => handleGenerate(false)}
              disabled={loading}
              className="w-full sm:flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'GEMINI AI ANALYZING & GENERATING...' : '✨ GENERATE WITH GEMINI AI'}</span>
            </button>

            <button
              onClick={() => handleGenerate(true)}
              disabled={loading}
              className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-[#0e1e35] hover:bg-[#142948] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-bold text-xs font-['Orbitron'] tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Generate and immediately publish to the live database feed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>GENERATE & PUBLISH DIRECTLY</span>
            </button>
          </div>

          {/* SAVE SUCCESS BANNER */}
          {saveSuccess && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {/* STEP 4: LIVE PREVIEW & AUTO-COMPLETE DISPLAY */}
          {generatedData && (
            <div className="bg-[#050b14] border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white font-['Orbitron'] tracking-wider uppercase">
                    GENERATED {selectedCategory.toUpperCase()} PREVIEW & DATA FIELDS
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                  </button>

                  {onAutoFill && (
                    <button
                      onClick={handleApplyToForm}
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold font-['Orbitron'] cursor-pointer"
                    >
                      Auto-Fill Form →
                    </button>
                  )}
                </div>
              </div>

              {/* RENDER PREVIEW BASED ON CATEGORY */}
              {selectedCategory === 'news' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Title</span>
                    <h3 className="text-sm font-extrabold text-white mt-0.5">{generatedData.title}</h3>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Summary</span>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">{generatedData.summary}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-mono">Category</span>
                      <span className="text-emerald-400 font-bold">{generatedData.category}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-mono">Author</span>
                      <span className="text-white font-medium">{generatedData.author}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-mono">Source</span>
                      <span className="text-white font-medium">{generatedData.source}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-mono">Badge</span>
                      <span className="text-cyan-400 font-bold">{generatedData.badgeText}</span>
                    </div>
                  </div>
                  {Array.isArray(generatedData.content) && (
                    <div className="pt-2">
                      <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Article Body</span>
                      <div className="space-y-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs leading-relaxed max-h-48 overflow-y-auto">
                        {generatedData.content.map((p: string, i: number) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedCategory === 'fixtures' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-base font-black text-white font-['Orbitron']">
                        {generatedData.homeTeam} vs {generatedData.awayTeam}
                      </span>
                      <span className="text-emerald-400 text-[11px] block mt-0.5">{generatedData.league}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-white font-bold block">{generatedData.matchDate || generatedData.match_date}</span>
                      <span className="text-slate-400 text-[11px]">{generatedData.matchTime || generatedData.match_time}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-mono">Stadium</span>
                      <span className="text-white font-medium line-clamp-1">{generatedData.stadium || generatedData.venue}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-mono">Channel</span>
                      <span className="text-cyan-400 font-medium line-clamp-1">{generatedData.channel || generatedData.broadcast}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-mono">Referee</span>
                      <span className="text-white font-medium line-clamp-1">{generatedData.referee || 'Appointed Referee'}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[9px] text-slate-400 block font-mono">Importance</span>
                      <span className="text-amber-400 font-bold line-clamp-1">{generatedData.importance || generatedData.round}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedCategory === 'matches' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-base font-black text-white font-['Orbitron']">{generatedData.teams}</span>
                      <span className="text-slate-400 text-[11px] block">{generatedData.league} • {generatedData.match_date} {generatedData.match_time}</span>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/40">
                        Odds: {generatedData.decimal_odds}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">AI Prediction Pick</span>
                    <p className="text-sm font-bold text-emerald-400">{generatedData.prediction}</p>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{generatedData.analysis_text}</p>
                  </div>
                </div>
              )}

              {selectedCategory === 'comparisons' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                      <h4 className="font-extrabold text-white text-sm font-['Orbitron']">{generatedData.player1?.name}</h4>
                      <p className="text-[10px] text-slate-400">{generatedData.player1?.team}</p>
                      <div className="mt-2 text-xs font-mono font-bold text-emerald-400">
                        {generatedData.player1?.goals} Goals • {generatedData.player1?.assists} Assists • {generatedData.player1?.overall} OVR
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                      <h4 className="font-extrabold text-white text-sm font-['Orbitron']">{generatedData.player2?.name}</h4>
                      <p className="text-[10px] text-slate-400">{generatedData.player2?.team}</p>
                      <div className="mt-2 text-xs font-mono font-bold text-cyan-400">
                        {generatedData.player2?.goals} Goals • {generatedData.player2?.assists} Assists • {generatedData.player2?.overall} OVR
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Tactical Analysis Verdict</span>
                    <p className="text-slate-300 leading-relaxed">{generatedData.tacticalVerdict}</p>
                    <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                      Verdict: {generatedData.winnerPick}
                    </div>
                  </div>
                </div>
              )}

              {selectedCategory === 'team_stats' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white font-['Orbitron']">{generatedData.teamName} vs {generatedData.opponentName}</h4>
                      <span className="text-emerald-400 text-xs font-mono">Formation: {generatedData.formation} • Coach: {generatedData.manager}</span>
                    </div>
                    <div className="text-right text-[11px] font-mono text-cyan-400">
                      xG: {generatedData.expectedGoals} • Poss: {generatedData.possessionExpected}%
                    </div>
                  </div>

                  {Array.isArray(generatedData.startingXI) && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Starting XI Squad</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {generatedData.startingXI.map((p: any, i: number) => (
                          <div key={i} className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
                            <span className="font-mono text-slate-400">#{p.number} {p.name}</span>
                            <span className="font-bold text-emerald-400">{p.position}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Tactical Style</span>
                    <p className="text-slate-300 mt-0.5">{generatedData.tacticalStyle}</p>
                  </div>
                </div>
              )}

              {selectedCategory === 'trending' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white">{generatedData.topic}</h4>
                      <span className="text-rose-400 font-mono text-xs">{generatedData.tag}</span>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 font-mono text-xs font-bold">
                        Score: {generatedData.score}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-300 leading-relaxed">{generatedData.summary}</p>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default GeminiAiGeneratorModal;
