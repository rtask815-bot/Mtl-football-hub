import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Activity, X, Sparkles, Zap, ShieldCheck } from 'lucide-react';

export interface FuturisticLoaderProps {
  active: boolean;
  text?: string;
  progress?: number;
  subText?: string;
  minDuration?: number;
  onCancel?: () => void;
  canCancel?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FootballItem {
  id: number;
  x: number;
  y: number;
  targetPercent: number;
  swallowed: boolean;
  popped: boolean;
  popProgress: number; // 0 to 1 for pop animation
}

const LOADER_CACHE_KEY = 'mtl_loader_cache_v2';

export const FuturisticLoader: React.FC<FuturisticLoaderProps> = ({
  active,
  text = 'Loading match intelligence...',
  progress,
  subText = 'Please wait while we synchronize your data',
  minDuration = 300,
  onCancel,
  canCancel = true,
}) => {
  const [visible, setVisible] = useState(active);
  const [internalProgress, setInternalProgress] = useState(0);
  const [swallowedCount, setSwallowedCount] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mountTimeRef = useRef<number>(0);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check Local Storage Cache to prevent excessive loading
  const isCachedRecently = (): boolean => {
    try {
      const cached = localStorage.getItem(LOADER_CACHE_KEY);
      if (!cached) return false;
      const { timestamp } = JSON.parse(cached);
      // Cache valid for 10 minutes
      return Date.now() - timestamp < 10 * 60 * 1000;
    } catch {
      return false;
    }
  };

  const setCache = () => {
    try {
      localStorage.setItem(LOADER_CACHE_KEY, JSON.stringify({ timestamp: Date.now() }));
    } catch {}
  };

  useEffect(() => {
    if (active) {
      mountTimeRef.current = Date.now();
      setVisible(true);

      const cached = isCachedRecently();
      // If cached recently, fast-track progress to finish smoothly in ~300ms
      const speedMultiplier = cached ? 3.5 : 1;

      let currentVal = 0;
      const targetPercent = typeof progress === 'number' ? Math.min(100, Math.max(15, progress)) : 100;

      const interval = setInterval(() => {
        currentVal += (2.5 * speedMultiplier);
        if (currentVal >= targetPercent) {
          currentVal = targetPercent;
          clearInterval(interval);
          setCache();
        }
        setInternalProgress(Math.min(100, Math.round(currentVal)));
      }, 40);

      // Safety timeout (max 8s auto-dismiss)
      safetyTimeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 8000);

      return () => {
        clearInterval(interval);
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      };
    } else {
      setVisible(false);
    }
  }, [active, progress]);

  // Snake Football Canvas Renderer
  useEffect(() => {
    if (!visible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Define 5 Footballs placed along the progress line (x: 50 to 310)
    const totalBalls = 5;
    const footballs: FootballItem[] = Array.from({ length: totalBalls }).map((_, i) => ({
      id: i,
      x: 50 + (i * (width - 100) / (totalBalls - 1)),
      y: height / 2,
      targetPercent: (i + 1) * (100 / totalBalls),
      swallowed: false,
      popped: false,
      popProgress: 0
    }));

    const particles: Particle[] = [];

    // Helper to spawn pop particle burst
    const spawnPopParticles = (px: number, py: number) => {
      const colors = ['#10b981', '#34d399', '#06b6d4', '#f59e0b', '#ffffff'];
      for (let i = 0; i < 22; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4;
        particles.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 18 + Math.random() * 14,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 3.5
        });
      }
    };

    let animationTime = 0;

    const render = () => {
      animationTime += 0.05;
      ctx.clearRect(0, 0, width, height);

      // Track Background Bar
      ctx.beginPath();
      ctx.moveTo(30, height / 2);
      ctx.lineTo(width - 30, height / 2);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Track Glow Progress Line
      const snakeHeadX = 30 + (internalProgress / 100) * (width - 60);

      ctx.beginPath();
      ctx.moveTo(30, height / 2);
      ctx.lineTo(snakeHeadX, height / 2);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      let newlySwallowed = 0;

      // Draw & Update Footballs
      footballs.forEach((ball) => {
        if (!ball.swallowed && snakeHeadX >= ball.x - 6) {
          ball.swallowed = true;
          ball.popped = true;
          spawnPopParticles(ball.x, ball.y);
        }

        if (ball.swallowed) {
          newlySwallowed++;
          if (ball.popProgress < 1) {
            ball.popProgress += 0.15;
          }
        }

        // Draw Football if not swallowed or currently popping
        if (!ball.swallowed || ball.popProgress < 1) {
          ctx.save();
          ctx.translate(ball.x, ball.y);

          if (ball.popped) {
            // Pop Expansion & Dissolve Scale
            const popScale = 1 + ball.popProgress * 1.4;
            const popAlpha = Math.max(0, 1 - ball.popProgress);
            ctx.scale(popScale, popScale);
            ctx.globalAlpha = popAlpha;
          }

          // Draw Football Emoji / Icon
          ctx.font = '16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚽', 0, 0);

          ctx.restore();
        }
      });

      setSwallowedCount(newlySwallowed);

      // Draw Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }

      // Draw Growing Cyber Snake Body Segments
      const snakeBaseRadius = 7 + newlySwallowed * 1.5; // Snake grows bigger as it eats footballs!
      const snakeHeadY = height / 2 + Math.sin(animationTime * 3) * 3; // Slithering vertical motion

      // Draw Snake Tail & Body Segments
      const segmentCount = 6 + newlySwallowed * 2;
      for (let i = segmentCount; i >= 1; i--) {
        const segX = snakeHeadX - i * (6 + newlySwallowed * 0.4);
        const segY = height / 2 + Math.sin(animationTime * 3 - i * 0.3) * 3;
        const segRadius = Math.max(3, snakeBaseRadius * (1 - i / (segmentCount + 2)));

        if (segX >= 25) {
          ctx.beginPath();
          ctx.arc(segX, segY, segRadius, 0, Math.PI * 2);
          ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#059669';
          ctx.fill();
        }
      }

      // Draw Snake Cyber Head (Grows as balls are swallowed)
      ctx.save();
      ctx.translate(snakeHeadX, snakeHeadY);

      // Snake Glow Aura
      ctx.beginPath();
      ctx.arc(0, 0, snakeBaseRadius + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.fill();

      // Snake Head Main Shape
      ctx.beginPath();
      ctx.arc(0, 0, snakeBaseRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399';
      ctx.fill();

      // Snake Eyes (Glowing Cyan Cyber Eyes)
      ctx.beginPath();
      ctx.arc(2, -3, 2, 0, Math.PI * 2);
      ctx.arc(2, 3, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();

      // Snake Mouth Tongue Slither
      if (Math.sin(animationTime * 6) > 0) {
        ctx.beginPath();
        ctx.moveTo(snakeBaseRadius, 0);
        ctx.lineTo(snakeBaseRadius + 6, 0);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [visible, internalProgress]);

  const handleDismiss = () => {
    setVisible(false);
    if (onCancel) onCancel();
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-opacity duration-200 font-['Plus_Jakarta_Sans',sans-serif]"
      role="status"
      aria-live="polite"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-[#0b1326] border border-emerald-500/40 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-emerald-950/50 relative overflow-hidden transition-all duration-200 animate-in zoom-in-95">
        
        {/* Top Header Status */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block flex items-center gap-1">
                CYBER SNAKE ENGINE
                <Sparkles className="w-3 h-3 text-emerald-300" />
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                MTL Football Intelligence v3.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-xs font-black text-emerald-300">
              <span>{internalProgress}%</span>
            </div>

            {canCancel && (
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Cancel or dismiss loader"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title & Subtext */}
        <div className="py-4 text-center space-y-1.5">
          <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
            {text}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            {subText}
          </p>
        </div>

        {/* ANIMATED CANVAS: SNAKE SWALLOWING FOOTBALLS */}
        <div className="my-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 relative overflow-hidden flex flex-col items-center justify-center shadow-inner">
          <canvas
            ref={canvasRef}
            width={340}
            height={65}
            className="w-full h-auto max-w-[340px]"
          />

          <div className="flex items-center justify-between w-full px-2 text-[11px] font-bold text-slate-400 pt-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <Zap className="w-3 h-3 fill-current" />
              Footballs Swallowed: {swallowedCount} / 5
            </span>
            <span className="text-emerald-300 font-extrabold">
              {swallowedCount === 5 ? '💥 ALL BALLS CONSUMED!' : 'Slithering & Growing...'}
            </span>
          </div>
        </div>

        {/* ULTRA-SMOOTH PREMIUM PROGRESS BAR */}
        <div className="my-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Synchronizing Neural Uplink
            </span>
            <span className="text-emerald-400 font-mono font-bold tracking-wider">{internalProgress}%</span>
          </div>

          <div className="water-progress-container h-2.5">
            <div
              className="water-progress-bar"
              style={{ width: `${internalProgress}%` }}
            />
          </div>
        </div>

        {/* Checkpoint Status Rows */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs mb-3">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className={`w-3.5 h-3.5 ${swallowedCount >= 2 ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>Verifying Neural Protocol</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-400">
              {swallowedCount >= 2 ? 'Complete' : 'Processing'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <CheckCircle2 className={`w-3.5 h-3.5 ${swallowedCount >= 5 ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span>Caching & Synced to Local Storage</span>
            </span>
            <span className={`text-[11px] font-bold ${swallowedCount >= 5 ? 'text-emerald-400' : 'text-slate-500'}`}>
              {swallowedCount >= 5 ? 'Cached' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Cancel Button */}
        {canCancel && (
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2 px-4 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default FuturisticLoader;
