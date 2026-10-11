import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tv,
  Radio,
  Globe,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  Sparkles,
  MessageSquare,
  Calendar,
  TrendingUp,
  Volume2,
  Info,
  ExternalLink,
  Wifi,
  X,
  ChevronUp,
  ChevronDown,
  Home,
  Sliders,
  Cpu
} from 'lucide-react';
import FloatingBackButton from '../components/FloatingBackButton.tsx';
import { 
  PhysicalCard, 
  TactileButton, 
  EmbossedIcon, 
  EngravedPlaque, 
  PhysicalOptionGrid 
} from '../components/physical/index.ts';

export default function TvPage() {
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  // Famelack stream modes
  const [streamMode, setStreamMode] = useState('tv'); // 'tv', 'globe', 'radio'
  const [streamUrl, setStreamUrl] = useState('https://famelack.com/tv');
  const [isLoading, setIsLoading] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [showTitleBar, setShowTitleBar] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showFloatingDock, setShowFloatingDock] = useState(true);
  const [ping, setPing] = useState(16);

  // Switch between Famelack streaming modes
  const handleModeChange = (mode) => {
    setIsLoading(true);
    setStreamMode(mode);

    let url = 'https://famelack.com/tv';
    if (mode === 'globe') url = 'https://famelack.com/';
    if (mode === 'radio') url = 'https://famelack.com/radio';

    setStreamUrl(url);

    // Short loading transition
    setTimeout(() => {
      setIsLoading(false);
    }, 600);
  };

  // Reload current iframe stream
  const reloadStream = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      const current = streamUrl;
      setStreamUrl('about:blank');
      setTimeout(() => {
        setStreamUrl(current);
        setIsLoading(false);
      }, 300);
    } else {
      setIsLoading(false);
    }
  };

  // Native browser fullscreen toggle
  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsNativeFullscreen(true);
      }).catch(err => {
        console.warn('Native fullscreen request:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsNativeFullscreen(false);
      }).catch(() => {});
    }
  };

  // Ping jitter ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setPing(prev => Math.max(12, Math.min(32, prev + (Math.floor(Math.random() * 5) - 2))));
    }, 4500);

    const onFullscreenChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black select-none font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. OUR CUSTOM MTL TV TITLE BAR (COVERS & HIDES FAMELACK TITLE) */}
      {/* ------------------------------------------------------------- */}
      <header 
        className={`fixed top-0 inset-x-0 h-14 bg-[#080d17]/95 backdrop-blur-md border-b border-[#1e293b] z-40 transition-transform duration-300 flex items-center justify-between px-3 sm:px-5 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_8px_30px_rgba(0,0,0,0.85)] ${
          showTitleBar ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        {/* Precision Milled Top Chamfer Highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden="true" />

        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-gradient-to-b from-[#1e293b] to-[#0f172a] hover:border-amber-500/40 text-slate-200 border border-[#334155] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_4px_rgba(0,0,0,0.6)] transition-all cursor-pointer text-xs font-bold active:translate-y-[1px]"
            title="Back to Dashboard"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Hub</span>
          </button>

          <EmbossedIcon mount="gold" size="sm" icon={<Tv className="w-4 h-4 text-amber-400" />} />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-black text-white tracking-wider flex items-center gap-1.5">
                <span>MTL FOOTBALL TV</span>
                <span className="text-[10px] text-amber-400 font-mono hidden md:inline">• ULTRA HD</span>
              </h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#070b14] border border-red-500/50 text-red-400 text-[9px] font-extrabold uppercase shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Famelack Worldwide Live Streaming Node • 1,000+ Channels
            </p>
          </div>
        </div>

        {/* Center: Physical Segmented Option Selector */}
        <div className="hidden sm:block">
          <PhysicalOptionGrid
            layout="segmented"
            value={streamMode}
            onChange={(val) => handleModeChange(val)}
            options={[
              { id: 'tv', label: 'Live TV', icon: <Tv className="w-3.5 h-3.5" /> },
              { id: 'globe', label: '3D Globe', icon: <Globe className="w-3.5 h-3.5" /> },
              { id: 'radio', label: 'Radio', icon: <Radio className="w-3.5 h-3.5" /> },
            ]}
          />
        </div>

        {/* Right: Quick Tools */}
        <div className="flex items-center gap-2">
          {/* Latency Pill */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#070b14] border border-[#1e293b] text-[10px] font-mono text-emerald-400 shadow-inner">
            <Wifi className="w-3 h-3" />
            <span>{ping}ms</span>
          </div>

          {/* Reload Stream */}
          <button
            onClick={reloadStream}
            className="p-2 rounded-xl bg-gradient-to-b from-[#1e293b] to-[#0f172a] hover:border-amber-500/40 text-slate-300 hover:text-white border border-[#334155] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_4px_rgba(0,0,0,0.6)] transition-all cursor-pointer active:translate-y-[1px]"
            title="Reload Broadcast Stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Audio Unmute Tip Button */}
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-2 rounded-xl bg-gradient-to-b from-[#1e293b] to-[#0f172a] hover:border-amber-500/40 text-slate-300 hover:text-white border border-[#334155] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_4px_rgba(0,0,0,0.6)] transition-all cursor-pointer active:translate-y-[1px]"
            title="Stream Guide & Audio Tips"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Browser Native Fullscreen */}
          <button
            onClick={toggleNativeFullscreen}
            className="p-2 rounded-xl bg-gradient-to-b from-[#1e293b] to-[#0f172a] hover:border-amber-500/40 text-slate-300 hover:text-white border border-[#334155] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_4px_rgba(0,0,0,0.6)] transition-all cursor-pointer active:translate-y-[1px]"
            title={isNativeFullscreen ? "Exit Fullscreen" : "Native Fullscreen"}
          >
            {isNativeFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-400" />}
          </button>

          {/* Hide Title Bar Toggle */}
          <button
            onClick={() => setShowTitleBar(false)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition-colors"
            title="Hide Title Bar (100% Fullscreen)"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. REVEAL TITLE BAR TAB (WHEN HIDDEN)                         */}
      {/* ------------------------------------------------------------- */}
      {!showTitleBar && (
        <button
          onClick={() => setShowTitleBar(true)}
          className="fixed top-0 left-1/2 -translate-x-1/2 z-40 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-t-0 border-emerald-500/40 rounded-b-xl px-4 py-1 flex items-center gap-1.5 text-[10px] font-bold shadow-lg transition-all"
        >
          <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
          <span>Show MTL TV Bar</span>
        </button>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. FULLSCREEN FAMELACK IFRAME CONTAINER                       */}
      {/* ------------------------------------------------------------- */}
      <div className={`w-full h-full bg-black relative flex flex-col ${showTitleBar ? 'pt-14' : 'pt-0'} transition-all duration-300`}>
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-white">
            <div className="w-12 h-12 rounded-2xl border-2 border-emerald-500/30 border-t-emerald-400 animate-spin flex items-center justify-center">
              <Tv className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-bold font-['Orbitron'] tracking-widest text-emerald-400 uppercase">
              TUNING FAMELACK LIVE FEED...
            </span>
          </div>
        )}

        {/* Famelack Live Stream Iframe */}
        <iframe
          ref={iframeRef}
          src={streamUrl}
          title="Famelack Fullscreen Live TV"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture; display-capture; clipboard-write; microphone; camera; geolocation; web-share"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full border-0 bg-black block absolute inset-0"
        />
      </div>

      {/* DEDICATED FLOATING BACK FAB OVER FULLSCREEN LIVE TV */}
      <FloatingBackButton
        onClick={() => navigate('/dashboard')}
        label="Back to Hub"
        position="bottom-left"
        zIndex={60}
      />

      {/* ------------------------------------------------------------- */}
      {/* 4. USEFUL FLOATING ACTION BUTTONS (DOCK)                       */}
      {/* ------------------------------------------------------------- */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 pointer-events-auto">
        
        {/* Expanded Floating Buttons Menu */}
        {showFloatingDock && (
          <div className="flex flex-col gap-2 p-2 bg-[#091222]/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
            
            {/* Predictions Hub Button */}
            <button
              onClick={() => navigate('/predictions')}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-800 text-xs font-bold transition-all shadow cursor-pointer group"
              title="Open Match Predictions"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:text-slate-950" />
              <span>Predictions Hub</span>
            </button>

            {/* AI Predictions Button */}
            <button
              onClick={() => navigate('/ai-predictions')}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 border border-slate-800 text-xs font-bold transition-all shadow cursor-pointer group"
              title="Open AI Predictions & Win-Loss Recharts"
            >
              <Cpu className="w-4 h-4 text-cyan-400 group-hover:text-slate-950" />
              <span>AI Predictions</span>
            </button>

            {/* Live Matches & Scoreboards */}
            <button
              onClick={() => navigate('/live')}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-red-500 hover:text-white text-slate-200 border border-slate-800 text-xs font-bold transition-all shadow cursor-pointer group"
              title="Live Match Radar & Scores"
            >
              <Radio className="w-4 h-4 text-red-400 group-hover:text-white" />
              <span>Live Radar Scores</span>
            </button>

            {/* Fixtures Schedule */}
            <button
              onClick={() => navigate('/fixtures')}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-800 text-xs font-bold transition-all shadow cursor-pointer group"
              title="Upcoming Match Fixtures"
            >
              <Calendar className="w-4 h-4 text-amber-400 group-hover:text-slate-950" />
              <span>Match Fixtures</span>
            </button>

            {/* Fan Group Chats */}
            <button
              onClick={() => navigate('/group-chats')}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-indigo-500 hover:text-white text-slate-200 border border-slate-800 text-xs font-bold transition-all shadow cursor-pointer group"
              title="Live Fan Discussion Lounge"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400 group-hover:text-white" />
              <span>Fan Lounge Chat</span>
            </button>

            {/* Return to Dashboard */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold transition-all shadow cursor-pointer"
              title="Return to Main Dashboard"
            >
              <Home className="w-4 h-4 text-slate-400" />
              <span>Main Dashboard</span>
            </button>
          </div>
        )}

        {/* Master Floating Toggle Button */}
        <button
          onClick={() => setShowFloatingDock(!showFloatingDock)}
          className={`p-3.5 rounded-2xl font-black text-xs shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border ${
            showFloatingDock
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 border-emerald-300 shadow-emerald-500/30'
              : 'bg-slate-900/95 hover:bg-slate-800 text-white border-slate-700/80 shadow-black/80'
          }`}
          title="Toggle Navigation & Live Tools Dock"
        >
          {showFloatingDock ? <X className="w-5 h-5 stroke-[2.5]" /> : <Sliders className="w-5 h-5 text-emerald-400 stroke-[2.5]" />}
        </button>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. STREAM GUIDE & AUDIO UNMUTE HELPER MODAL                   */}
      {/* ------------------------------------------------------------- */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1426] border border-cyan-500/40 w-full max-w-md rounded-2xl p-6 shadow-2xl text-slate-200 space-y-4 relative">
            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-cyan-400 font-['Orbitron'] font-extrabold text-base border-b border-slate-800 pb-3">
              <Info className="w-5 h-5 text-emerald-400" />
              <span>FAMELACK LIVE TV GUIDE</span>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4" /> Unmuting Live Audio
                </span>
                <p>
                  Modern web browsers mute video autoplay by default. Simply click anywhere inside the Famelack video screen or hit the volume icon in the player to unmute full stadium audio.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" /> Channel Surfing & 3D Globe
                </span>
                <p>
                  Use the mode selector at the top bar to switch between <strong>Live TV</strong>, the interactive <strong>3D Globe</strong> (browse streams by spinning the world), and <strong>Live Sports Radio</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Maximize2 className="w-4 h-4" /> Fullscreen Viewing
                </span>
                <p>
                  Use the top right fullscreen button to go browser-fullscreen, and use the chevron button to collapse the MTL title bar for 100% immersive match viewing.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider transition-colors cursor-pointer"
            >
              ENJOY STREAM
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
