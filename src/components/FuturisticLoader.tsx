import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Clock, Cpu } from 'lucide-react';

export interface FuturisticLoaderProps {
  active: boolean;
  text?: string;
  subText?: string;
  progress?: number;
  estimatedSeconds?: number;
  dataSize?: number;
  onComplete?: () => void;
}

export const FuturisticLoader: React.FC<FuturisticLoaderProps> = ({
  active,
  text = 'INITIALIZING QUANTUM HUB...',
  subText = 'SYNCHRONIZING MATCH INTELLIGENCE STREAM',
  estimatedSeconds,
  dataSize,
  onComplete,
}) => {
  // Compute approximated countdown duration based on dataSize or estimatedSeconds
  const computeMaxDurationSeconds = () => {
    if (estimatedSeconds && estimatedSeconds > 0) return estimatedSeconds;
    if (dataSize && dataSize > 0) {
      return Math.min(8.0, Math.max(1.5, Number((1.2 + (dataSize / 100) * 0.5).toFixed(1))));
    }
    return 2.5; // Default approximated time
  };

  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [maxMs, setMaxMs] = useState<number>(2500);
  const [visible, setVisible] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (active) {
      const durationMs = computeMaxDurationSeconds() * 1000;
      setMaxMs(durationMs);
      setTimeLeftMs(durationMs);
      setVisible(true);

      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      const stepMs = 50;
      intervalRef.current = setInterval(() => {
        setTimeLeftMs((prev) => {
          const next = prev - stepMs;
          if (next <= 0) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            // Close ONLY when countdown reaches zero
            setTimeout(() => {
              setVisible(false);
              if (onComplete) onComplete();
            }, 100);
            return 0;
          }
          return next;
        });
      }, stepMs);
    }
  }, [active, estimatedSeconds, dataSize]);

  // Handle eventual unmount cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  // Format time as 00:02.5
  const totalSeconds = Math.floor(timeLeftMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const deciseconds = Math.floor((timeLeftMs % 1000) / 100);

  const formattedClock = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${deciseconds}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#030712]/90 backdrop-blur-md transition-opacity duration-300 animate-in fade-in">
      <div className="relative w-full max-w-md mx-4 p-8 rounded-3xl bg-gradient-to-b from-[#081222] to-[#040914] border border-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden">
        {/* Cyber Grid Glows */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center space-y-6 relative z-10 font-['Plus_Jakarta_Sans',sans-serif]">
          
          {/* FUTURISTIC CIRCULAR HOLOGRAPHIC COUNTDOWN CLOCK */}
          <div className="relative flex items-center justify-center w-36 h-36">
            {/* Rotating Holographic Hud Rings */}
            <div className="absolute inset-0 rounded-full border-4 border-dashed border-cyan-400/20 animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-2 rounded-full border-2 border-cyan-400/40 animate-[spin_5s_linear_infinite]" />
            <div className="absolute inset-4 rounded-full border-t-2 border-b-2 border-cyan-400 animate-spin" />

            {/* Inner Clock Core Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5">
              <Clock className="w-5 h-5 text-cyan-400 animate-pulse" />
              <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-wider">
                {formattedClock}
              </span>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-widest font-['Orbitron']">
                TIME REMAINING
              </span>
            </div>
          </div>

          {/* Title & Subtext */}
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-extrabold text-white tracking-widest font-['Orbitron'] uppercase flex items-center justify-center gap-2">
              <span>{text}</span>
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
            </h3>
            <p className="text-[11px] text-cyan-300/80 font-semibold tracking-wider">
              {subText}
            </p>
          </div>

          {/* Approx Time Directive Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#040a16] border border-cyan-500/30 text-[10px] font-mono font-bold text-slate-300 shadow-inner">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>ESTIMATED DATA SYNC: {(maxMs / 1000).toFixed(1)}s</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FuturisticLoader;
