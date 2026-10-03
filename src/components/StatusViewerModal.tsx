import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  Eye, 
  TrendingUp, 
  Star, 
  Clock, 
  ShieldCheck, 
  Download,
  Film,
  Camera,
  Volume2,
  VolumeX,
  Play,
  Pause
} from 'lucide-react';
import { MatchCardStatus, recordStatusView, toggleStatusLike } from '../config/firebaseStore.ts';
import { AiHelperService } from '../config/aiHelper.ts';

interface StatusViewerModalProps {
  statuses: MatchCardStatus[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onStatusUpdated?: () => void;
}

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  statuses,
  initialIndex = 0,
  isOpen,
  onClose,
  currentUserId = 'guest',
  onStatusUpdated
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressTimerRef = useRef<any>(null);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), statuses.length - 1));
      setProgress(0);
      setIsPlaying(true);
    }
  }, [isOpen, initialIndex, statuses.length]);

  const activeStatus = statuses[currentIndex];

  // Set like state for current status & record view
  useEffect(() => {
    if (activeStatus) {
      setIsLiked(Boolean(activeStatus.likers?.includes(currentUserId)));
      setLikeCount(activeStatus.likesCount || 0);

      // Record view in DB
      recordStatusView(activeStatus.id, currentUserId);
    }
  }, [activeStatus?.id, currentUserId]);

  // Story progress timer
  const isVideoReel = activeStatus?.statusType === 'reel' || activeStatus?.mediaType === 'video';
  const durationMs = isVideoReel ? 12000 : 7000;

  useEffect(() => {
    if (!isOpen || !activeStatus || isPaused || !isPlaying) return;

    const intervalMs = 60;
    const increment = 100 / (durationMs / intervalMs);

    progressTimerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < statuses.length - 1) {
            setCurrentIndex(c => c + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isOpen, currentIndex, isPaused, isPlaying, statuses.length, onClose, activeStatus, durationMs]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
      if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, statuses.length, isPlaying]);

  if (!isOpen || !activeStatus) return null;

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      setIsPlaying(true);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(p => !p);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => (newLiked ? prev + 1 : Math.max(0, prev - 1)));
    await toggleStatusLike(activeStatus.id, currentUserId);
    if (onStatusUpdated) onStatusUpdated();
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}h ago`;
      return 'Yesterday';
    } catch {
      return 'Recently';
    }
  };

  // Card theme gradients
  const getThemeGradient = (color?: string) => {
    switch (color) {
      case 'cyan':
        return 'from-cyan-950/95 via-slate-900 to-black border-cyan-500/40 text-cyan-300';
      case 'purple':
        return 'from-purple-950/95 via-slate-900 to-black border-purple-500/40 text-purple-300';
      case 'amber':
        return 'from-amber-950/95 via-slate-900 to-black border-amber-500/40 text-amber-300';
      case 'rose':
        return 'from-rose-950/95 via-slate-900 to-black border-rose-500/40 text-rose-300';
      case 'emerald':
      default:
        return 'from-emerald-950/95 via-slate-900 to-black border-emerald-500/40 text-emerald-300';
    }
  };

  const statusTypeLabel = activeStatus.statusType === 'reel' || activeStatus.mediaType === 'video'
    ? 'MATCH REEL'
    : activeStatus.statusType === 'image' || (activeStatus.mediaType === 'image' && !activeStatus.predictedScore)
    ? 'IMAGE STATUS'
    : 'MATCH PREDICTION';

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center select-none"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* BACKGROUND BLURRED ART */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {activeStatus.mediaUrl && !isVideoReel ? (
          <img src={activeStatus.mediaUrl} alt="" className="w-full h-full object-cover blur-3xl scale-125" />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-emerald-900 via-indigo-900 to-cyan-900 blur-3xl" />
        )}
      </div>

      {/* MAIN STORY CONTAINER */}
      <div className="relative w-full max-w-md h-[92vh] sm:h-[86vh] max-h-[840px] bg-[#070c16] rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl flex flex-col justify-between">
        
        {/* TOP STORY HEADER & PROGRESS BARS */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/90 via-black/60 to-transparent space-y-3">
          
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5 w-full">
            {statuses.map((_, idx) => (
              <div 
                key={idx} 
                className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
              >
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-75"
                  style={{
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author Header Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-emerald-400 via-cyan-400 to-indigo-500 shadow-md">
                <img 
                  src={activeStatus.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeStatus.userId}`} 
                  alt={activeStatus.userName}
                  className="w-full h-full rounded-full object-cover bg-slate-900"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-xs sm:text-sm font-['Plus_Jakarta_Sans']">
                    {activeStatus.userName}
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                    {statusTypeLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{formatTimeAgo(activeStatus.createdAt)}</span>
                  <span>•</span>
                  <span className="text-slate-300 font-bold truncate max-w-[140px]">{activeStatus.matchFixture}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {isVideoReel && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(m => !m);
                  }}
                  className="p-2 rounded-full bg-black/60 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute audio' : 'Mute audio'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 rounded-full bg-black/60 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* TAP NAVIGATION ZONES (Left / Right) */}
        <div 
          onClick={handlePrev}
          className="absolute left-0 top-20 bottom-24 w-1/4 z-20 cursor-pointer flex items-center justify-start pl-2 opacity-0 hover:opacity-80 transition-opacity"
        >
          <div className="p-2 rounded-full bg-black/60 text-white">
            <ChevronLeft className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={handleNext}
          className="absolute right-0 top-20 bottom-24 w-1/4 z-20 cursor-pointer flex items-center justify-end pr-2 opacity-0 hover:opacity-80 transition-opacity"
        >
          <div className="p-2 rounded-full bg-black/60 text-white">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>

        {/* ================================================================== */}
        {/* CENTER BODY: 3 ADAPTIVE PRESENTATION LAYOUTS */}
        {/* ================================================================== */}
        
        {/* 1. REEL STATUS PRESENTATION (Full Video Player) */}
        {isVideoReel && activeStatus.mediaUrl ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden" onClick={togglePlayPause}>
            <video
              ref={videoRef}
              src={activeStatus.mediaUrl}
              autoPlay
              loop
              playsInline
              muted={isMuted}
              className="w-full h-full object-cover"
            />

            {/* Play/Pause Center Indicator */}
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-black/70 border border-white/40 flex items-center justify-center text-white">
                  <Play className="w-8 h-8 fill-white ml-1" />
                </div>
              </div>
            )}

            {/* Reel Overlay Details at Bottom */}
            <div className="absolute bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/70 to-transparent space-y-2 pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-300 border border-purple-400/50 text-[10px] font-bold font-mono">
                  {activeStatus.league || 'REEL HIGHLIGHT'}
                </span>
                <span className="text-xs font-black text-white font-['Orbitron']">
                  {activeStatus.matchFixture}
                </span>
              </div>

              {activeStatus.predictionPick && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  <span>{activeStatus.predictionPick}</span>
                </div>
              )}

              {activeStatus.caption && (
                <p className="text-xs text-slate-100 font-medium leading-snug drop-shadow-md">
                  "{activeStatus.caption}"
                </p>
              )}
            </div>
          </div>
        ) : activeStatus.statusType === 'image' && activeStatus.mediaUrl ? (
          /* 2. IMAGE STATUS PRESENTATION */
          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
            <img
              src={activeStatus.mediaUrl}
              alt={activeStatus.matchFixture}
              className="w-full h-full object-cover"
            />

            {/* Gradient Overlay for Text */}
            <div className="absolute bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent space-y-2 pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 text-[10px] font-bold font-mono">
                  {activeStatus.league || 'MATCH PHOTO'}
                </span>
                <span className="text-xs font-black text-white font-['Orbitron']">
                  {activeStatus.matchFixture}
                </span>
              </div>

              {activeStatus.predictedScore && (
                <div className="inline-block px-3 py-1 rounded-xl bg-black/80 border border-slate-700 text-xs font-mono font-black text-cyan-400">
                  PREDICTION: {activeStatus.predictedScore}
                </div>
              )}

              {activeStatus.caption && (
                <p className="text-xs text-slate-100 font-medium leading-snug drop-shadow-md">
                  "{activeStatus.caption}"
                </p>
              )}
            </div>
          </div>
        ) : (
          /* 3. FUTURISTIC NEON MATCH PREDICTION CARD */
          <div className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-6 pt-24 pb-20 overflow-y-auto">
            <div className={`p-6 rounded-3xl bg-gradient-to-br ${getThemeGradient(activeStatus.themeColor)} border shadow-2xl relative overflow-hidden transition-all duration-300 space-y-4`}>
              
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-[10px] font-extrabold uppercase tracking-wider text-slate-300 font-['Orbitron']">
                  {activeStatus.league || 'LEAGUE INTELLIGENCE'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  MATCH CARD
                </span>
              </div>

              {/* Match Fixture Title */}
              <div className="text-center my-2">
                <h2 className="text-lg sm:text-xl font-black text-white font-['Orbitron'] tracking-tight">
                  {activeStatus.matchFixture}
                </h2>
              </div>

              {/* Predicted Score Spotlight */}
              {activeStatus.predictedScore && (
                <div className="my-3 p-3.5 rounded-2xl bg-black/60 border border-slate-800/90 text-center shadow-inner">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest block mb-1">
                    PREDICTED SCORELINE
                  </span>
                  <div className="text-3xl font-black font-['Orbitron'] tracking-widest text-emerald-400">
                    {activeStatus.predictedScore}
                  </div>
                </div>
              )}

              {/* Prediction Pick & Odds */}
              <div className="space-y-2 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    TACTICAL TIP
                  </span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: activeStatus.confidenceStars || 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{activeStatus.predictionPick}</span>
                </div>

                {activeStatus.decimalOdds && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Decimal Value</span>
                    <span className="font-mono font-black text-emerald-400">
                      {activeStatus.decimalOdds.toFixed(2)}x Odds
                    </span>
                  </div>
                )}
              </div>

              {/* Author Commentary */}
              {activeStatus.caption && (
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60">
                  <p className="text-xs text-slate-200 italic leading-relaxed">
                    "{activeStatus.caption}"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM ACTION BAR: Views, Likes, Download & Interactions */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-3.5 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-white">{activeStatus.viewsCount || 1}</span>
            <span>views</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const speechText = `${activeStatus.matchFixture}. Prediction: ${activeStatus.predictionPick}. Predicted score: ${activeStatus.predictedScore || 'Pending'}. Commentary: ${activeStatus.caption || 'No commentary.'}`;
                AiHelperService.speakText(speechText);
              }}
              className="p-2 rounded-full bg-slate-900/80 border border-slate-800 text-cyan-400 hover:text-white transition-colors cursor-pointer"
              title="Listen to status prediction using Google Text-to-Speech"
            >
              <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
            </button>

            {activeStatus.mediaUrl && (
              <a
                href={activeStatus.mediaUrl}
                download={`MTL_${activeStatus.statusType || 'status'}_${activeStatus.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
                title="Download media file"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                isLiked 
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-lg shadow-rose-950/50' 
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span className="text-xs font-bold">{likeCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusViewerModal;
