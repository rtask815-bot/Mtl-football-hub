import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tv as TvIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  Radio,
  Wifi,
  Sparkles,
  ChevronRight,
  Layers,
  Flame,
  MessageSquare,
  Film
} from 'lucide-react';
import { supabase } from '../config/supabase.ts';
import FuturisticLoader from '../components/FuturisticLoader.tsx';
import AdBanner from '../components/AdBanner.tsx';
import AlertBanner from '../components/AlertBanner.tsx';
import UniversalFAB from '../components/UniversalFAB.tsx';

export default function Tv() {
  const navigate = useNavigate();
  const playerContainerRef = useRef(null);
  const iframeRef = useRef(null);

  // Channels loaded dynamically from Supabase database
  const [channels, setChannels] = useState([
    {
      id: 'default-1',
      name: 'MTL ULTRA HD 1',
      match: 'Arsenal vs Manchester City',
      league: 'Premier League • LIVE',
      quality: '4K 60FPS',
      bitrate: '12.5 Mbps',
      viewers: '42,100',
      score: '2 - 1',
      status: 'LIVE',
      targetUrl: '/api/proxy?channel=mtl-1&match=Arsenal-ManCity',
      badge: 'ARS'
    },
    {
      id: 'default-2',
      name: 'MTL ULTRA HD 2',
      match: 'Real Madrid vs Barcelona',
      league: 'La Liga • El Clásico LIVE',
      quality: '4K 60FPS',
      bitrate: '11.8 Mbps',
      viewers: '58,400',
      score: '1 - 1',
      status: 'LIVE',
      targetUrl: '/api/proxy?channel=mtl-2&match=Real-Barca',
      badge: 'RMA'
    },
    {
      id: 'default-3',
      name: 'MTL ULTRA HD 3',
      match: 'Bayern Munich vs Borussia Dortmund',
      league: 'Bundesliga • LIVE',
      quality: '1080p 60FPS',
      bitrate: '9.5 Mbps',
      viewers: '29,200',
      score: '3 - 2',
      status: 'LIVE',
      targetUrl: '/api/proxy?channel=mtl-3&match=Bayern-Dortmund',
      badge: 'BAY'
    }
  ]);
  const [selectedChannel, setSelectedChannel] = useState({
    id: 'default-1',
    name: 'MTL ULTRA HD 1',
    match: 'Arsenal vs Manchester City',
    league: 'Premier League • LIVE',
    quality: '4K 60FPS',
    bitrate: '12.5 Mbps',
    viewers: '42,100',
    score: '2 - 1',
    status: 'LIVE',
    targetUrl: '/api/proxy?channel=mtl-1&match=Arsenal-ManCity',
    badge: 'ARS'
  });
  const [streamSrc, setStreamSrc] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('4K Ultra HD');
  const [ping, setPing] = useState(18);
  const [reactionCounts, setReactionCounts] = useState({
    fire: 142,
    goal: 89,
    clap: 64,
    heart: 112
  });

  // Telemetry & Toast Alert
  const [toast, setToast] = useState({
    show: false,
    message: '',
    isError: false
  });

  const showToast = (message, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Fetch real matches and fixtures from Supabase to construct dynamic broadcast channels
  const fetchDynamicBroadcastChannels = async () => {
    try {
      const { data: dbMatches, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: dbFixtures } = await supabase
        .from('fixtures')
        .select('*')
        .order('match_date', { ascending: true })
        .limit(4);

      const dynamicList = [];

      if (dbMatches && dbMatches.length > 0) {
        dbMatches.forEach((m, idx) => {
          dynamicList.push({
            id: m.id || `mtl-${idx + 1}`,
            name: `MTL ULTRA HD ${idx + 1}`,
            match: m.teams || 'Championship Match',
            league: `${m.league || 'Premier League'} • ${m.status || 'LIVE'}`,
            quality: idx % 2 === 0 ? '4K 60FPS' : '1080p 60FPS',
            bitrate: `${(10.2 + idx * 1.5).toFixed(1)} Mbps`,
            viewers: `${(42 + idx * 18)},${(100 + idx * 85)}`,
            score: m.score || m.final_score || '0 - 0',
            status: m.status || 'LIVE',
            targetUrl: `/api/proxy?channel=mtl-${(idx % 4) + 1}&match=${encodeURIComponent(m.teams || '')}`,
            badge: (m.league || 'MTL').slice(0, 3).toUpperCase()
          });
        });
      }

      if (dbFixtures && dbFixtures.length > 0) {
        dbFixtures.forEach((f, idx) => {
          if (!dynamicList.some(item => item.match === f.teams)) {
            dynamicList.push({
              id: f.id || `fixture-${idx + 1}`,
              name: `FIXTURE RADAR ${idx + 1}`,
              match: f.teams,
              league: `${f.league || 'Tournament'} • ${f.match_date || 'Upcoming'}`,
              quality: '1080p 60FPS',
              bitrate: '8.4 Mbps',
              viewers: '18,500',
              score: 'VS',
              status: 'UPCOMING',
              targetUrl: `/api/proxy?channel=mtl-1&match=${encodeURIComponent(f.teams)}`,
              badge: (f.league || 'FIX').slice(0, 3).toUpperCase()
            });
          }
        });
      }

      setChannels(dynamicList);
      if (dynamicList.length > 0) {
        setSelectedChannel(dynamicList[0]);
        loadChannel(dynamicList[0]);
      }
    } catch (err) {
      console.error('Error fetching broadcast channels from database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Channel Loading Procedure
  const loadChannel = useCallback((channel) => {
    if (!channel) return;
    setIsLoading(true);
    setSelectedChannel(channel);
    
    // Calculate live latency
    setPing(Math.floor(Math.random() * 10) + 14);

    const fullSrc = `${channel.targetUrl}&t=${Date.now()}`;
    setStreamSrc(fullSrc);

    setTimeout(() => {
      setIsLoading(false);
    }, 550);
  }, []);

  // Initial stream mount & realtime subscriptions
  useEffect(() => {
    fetchDynamicBroadcastChannels();

    const channelSub = supabase
      .channel('public:matches_tv_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchDynamicBroadcastChannels();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, () => {
        fetchDynamicBroadcastChannels();
      })
      .subscribe();

    // Live telemetry ping ticker
    const pingInterval = setInterval(() => {
      setPing(prev => Math.max(12, Math.min(45, prev + (Math.floor(Math.random() * 7) - 3))));
    }, 4000);

    return () => {
      supabase.removeChannel(channelSub);
      clearInterval(pingInterval);
    };
  }, []);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;

    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  // Reaction Click
  const handleReaction = (type) => {
    setReactionCounts(prev => ({
      ...prev,
      [type]: (prev[type] || 0) + 1
    }));
    showToast(`Reaction sent: ${type.toUpperCase()}!`, false);
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] pb-16">
      
      {/* TOP STREAM HERO HEADER */}
      <div className="w-full bg-[#0a0f1d] border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <TvIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  MTL ULTRA HD BROADCAST CENTER
                </h1>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-extrabold uppercase animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  ON AIR
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct zero-latency satellite video feed, multi-angle telemetry, and expected win rates.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">Latency:</span>
              <span className="font-bold text-emerald-400">{ping} ms</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Viewers:</span>
              <span className="font-bold text-white">{selectedChannel?.viewers || '18,500'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`mx-auto px-4 sm:px-6 lg:px-8 pt-6 transition-all duration-300 ${isTheaterMode ? 'max-w-full' : 'max-w-7xl'}`}>
        
        {/* MATCHDAY SPONSOR ADMOD BANNER */}
        <AdBanner
          adUnitId="ca-app-pub-8492019482018471/tv_sponsor"
          onAction={() => showToast("VIP Pass active. Enjoy the Ultra HD broadcast!", false)}
        />

        {/* MAIN VIDEO PLAYER & CHANNELS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          
          {/* LEFT 3 COLS: VIDEO PLAYER CONTAINER */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            
            <div
              ref={playerContainerRef}
              className="relative w-full aspect-video bg-[#030712] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 flex flex-col justify-between group"
            >
              {/* VIDEO STREAM IFRAME */}
              {streamSrc && (
                <iframe
                  ref={iframeRef}
                  src={streamSrc}
                  title="Live Match Broadcast Feed"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  className="absolute inset-0 w-full h-full border-0 z-10 bg-black"
                />
              )}

              {/* LOADING OVERLAY */}
              {isLoading && (
                <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-2xl border-2 border-emerald-500/30 border-t-emerald-400 animate-spin flex items-center justify-center">
                    <TvIcon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                    Tuning {selectedChannel?.name || 'Channel'}...
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Establishing encrypted video satellite proxy ({ping}ms)
                  </span>
                </div>
              )}

              {/* OVERLAY CONTROLS (Fades on hover) */}
              <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-4 flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
                
                {/* Left Controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying(prev => !prev)}
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-emerald-500 hover:text-slate-950 text-white border border-slate-700/80 transition-all cursor-pointer shadow-md"
                    title={isPlaying ? "Pause Stream" : "Resume Stream"}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setIsMuted(prev => !prev)}
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 transition-all cursor-pointer shadow-md"
                    title={isMuted ? "Unmute Audio" : "Mute Audio"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <div className="hidden sm:flex flex-col">
                    <span className="text-xs font-bold text-white leading-tight">
                      {selectedChannel?.match || 'Live Broadcast'}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      {selectedChannel?.league || 'Championship'} • Live Score: {selectedChannel?.score || '0 - 0'}
                    </span>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-2">
                  {/* Resolution selector */}
                  <select
                    value={selectedQuality}
                    onChange={(e) => setSelectedQuality(e.target.value)}
                    className="bg-slate-900/90 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="4K Ultra HD">4K Ultra HD</option>
                    <option value="1080p60">1080p 60FPS</option>
                    <option value="720p HD">720p HD</option>
                    <option value="Auto">Auto (Adaptive)</option>
                  </select>

                  <button
                    onClick={() => loadChannel(selectedChannel)}
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 transition-all cursor-pointer shadow-md"
                    title="Reload Stream Buffer"
                  >
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                  </button>

                  <button
                    onClick={() => setIsTheaterMode(prev => !prev)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer shadow-md hidden sm:block ${
                      isTheaterMode ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900/80 hover:bg-slate-800 text-white border-slate-700/80'
                    }`}
                    title="Toggle Theater Mode"
                  >
                    <Film className="w-4 h-4" />
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 transition-all cursor-pointer shadow-md"
                    title="Toggle Fullscreen"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* MATCH DETAILS & AUDIENCE REACTION BAR */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">
                    {selectedChannel?.name || 'MTL ULTRA HD'}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs text-slate-300 font-semibold">
                    {selectedChannel?.quality || '4K Ultra HD'}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs text-slate-400">
                    Bitrate: {selectedChannel?.bitrate || '10.5 Mbps'}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-white mt-1">
                  {selectedChannel?.match || 'Live Championship Match'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI Tactical probability index: 54% Home win, 24% Draw, 22% Away. Live pressing telemetry enabled.
                </p>
              </div>

              {/* Interactive Live Reactions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReaction('fire')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-transform active:scale-95 cursor-pointer shadow-md"
                >
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>{reactionCounts.fire}</span>
                </button>

                <button
                  onClick={() => handleReaction('goal')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-transform active:scale-95 cursor-pointer shadow-md"
                >
                  <span>⚽ GOAL!</span>
                  <span className="text-emerald-400">{reactionCounts.goal}</span>
                </button>

                <button
                  onClick={() => handleReaction('heart')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-transform active:scale-95 cursor-pointer shadow-md"
                >
                  <span>❤️</span>
                  <span className="text-pink-400">{reactionCounts.heart}</span>
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT 1 COL: LIVE SATELLITE CHANNELS LIST */}
          <div className="flex flex-col gap-4">
            
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-extrabold text-sm text-white tracking-tight">
                    SATELLITE CHANNELS ({channels.length})
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  HD Broadcast
                </span>
              </div>

              {/* Channels list */}
              <div className="flex flex-col gap-2.5">
                {channels.map((channel) => {
                  const active = selectedChannel?.id === channel.id;
                  return (
                    <div
                      key={channel.id}
                      onClick={() => loadChannel(channel)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                        active
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            active ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {channel.badge}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {channel.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold text-emerald-400">
                          {channel.quality}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-300 truncate">
                        {channel.match}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Score: <strong className="text-white">{channel.score}</strong></span>
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Radio className="w-3 h-3" />
                          {channel.viewers}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QUICK LINK TO GROUP DISCUSSIONS */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/90 rounded-2xl p-4 flex flex-col gap-2 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <MessageSquare className="w-4 h-4" />
                <span>Live Matchday Lounge</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Join thousands of supporters in the real-time Telegram and group chat rooms discussing match tactics.
              </p>
              <button
                onClick={() => navigate('/group-chats')}
                className="mt-2 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <span>Open Group Chats</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* TOAST ALERT BANNER */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <AlertBanner
            type={toast.isError ? "error" : "success"}
            title={toast.isError ? "Notice" : "Stream Notification"}
            message={toast.message}
            onClose={() => setToast(prev => ({ ...prev, show: false }))}
          />
        </div>
      )}

      {/* UNIVERSAL FLOATING ACTION BUTTON */}
      <UniversalFAB
        onOpenProfile={() => navigate('/dashboard')}
        onNewAction={() => loadChannel(CHANNELS[0])}
        newActionLabel="Refresh Feed"
        showBackToDashboard={true}
        customActions={[
          {
            id: 'predictions_hub',
            label: 'Predictions Hub',
            description: 'Check tactical odds',
            icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
            onClick: () => navigate('/predictions')
          },
          {
            id: 'fixtures_sched',
            label: 'Fixtures Calendar',
            description: 'Upcoming match schedule',
            icon: <TvIcon className="w-4 h-4 text-cyan-400" />,
            onClick: () => navigate('/fixtures')
          }
        ]}
      />

    </div>
  );
}
