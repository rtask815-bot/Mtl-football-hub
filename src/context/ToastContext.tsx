import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert 
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  timestamp: number;
}

export interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  showSuccess: () => {},
  showError: () => {},
  showInfo: () => {},
  showWarning: () => {},
  removeToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', title?: string, duration: number = 3800) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = {
        id,
        type,
        title: title || (type === 'success' ? 'SYSTEM CONFIRMED' : type === 'error' ? 'ACTION FAILED' : type === 'warning' ? 'SECURITY ALERT' : 'QUANTUM NOTICE'),
        message,
        duration,
        timestamp: Date.now(),
      };

      // Play subtle synth audio cue if Audio API available
      try {
        if (typeof window !== 'undefined' && window.AudioContext) {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          if (type === 'success') {
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
          } else if (type === 'error') {
            osc.frequency.setValueAtTime(320, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
          } else {
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            gain.gain.setValueAtTime(0.03, ctx.currentTime);
          }
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }
      } catch {}

      setToasts((prev) => [newToast, ...prev].slice(0, 4));

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const showSuccess = useCallback((message: string, title?: string) => showToast(message, 'success', title), [showToast]);
  const showError = useCallback((message: string, title?: string) => showToast(message, 'error', title), [showToast]);
  const showInfo = useCallback((message: string, title?: string) => showToast(message, 'info', title), [showToast]);
  const showWarning = useCallback((message: string, title?: string) => showToast(message, 'warning', title), [showToast]);

  // Expose to window.mtlToast for legacy scripts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).mtlToast = {
        show: showToast,
        success: showSuccess,
        error: showError,
        info: showInfo,
        warning: showWarning,
      };
    }
  }, [showToast, showSuccess, showError, showInfo, showWarning]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning, removeToast }}>
      {children}

      {/* FUTURISTIC TOAST CONTAINER OVERLAY */}
      <div 
        aria-live="polite" 
        className="fixed top-20 right-4 sm:right-6 z-[300] flex flex-col gap-3 max-w-md w-full pointer-events-none font-['Plus_Jakarta_Sans',sans-serif]"
      >
        {toasts.map((toast) => (
          <FuturisticToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const FuturisticToastItem: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        isSuccess
          ? 'bg-[#081b16]/95 border-emerald-500/60 text-emerald-100 glow-emerald-active animate-toast-pop'
          : isError
          ? 'bg-[#1c0a0e]/95 border-rose-500/70 text-rose-100 glow-rose-active animate-toast-pop animate-toast-shake'
          : isWarning
          ? 'bg-[#1f1606]/95 border-amber-500/60 text-amber-100 animate-toast-pop'
          : 'bg-[#09152a]/95 border-cyan-500/60 text-cyan-100 animate-toast-pop'
      }`}
    >
      {/* Background Laser Scanline Animation */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${
        isSuccess ? 'bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-500' :
        isError ? 'bg-gradient-to-r from-rose-500 via-red-300 to-rose-500' :
        isWarning ? 'bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500' :
        'bg-gradient-to-r from-cyan-500 via-blue-300 to-cyan-500'
      }`} />

      <div className="flex items-start justify-between gap-3">
        {/* ANIMATED ICON BADGE */}
        <div className="shrink-0 pt-0.5">
          {isSuccess && (
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/60">
              <svg className="w-6 h-6 stroke-emerald-400 fill-none stroke-[2.5]" viewBox="0 0 24 24">
                <path
                  className="animate-check-draw"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}

          {isError && (
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/60 animate-pulse">
              <AlertCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
          )}

          {isWarning && (
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-lg">
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            </div>
          )}

          {!isSuccess && !isError && !isWarning && (
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-lg">
              <Sparkles className="w-6 h-6 stroke-[2.5] animate-spin" />
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase font-['Orbitron'] tracking-wider ${
              isSuccess ? 'text-emerald-400' : isError ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-cyan-400'
            }`}>
              {toast.title}
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900/80 border border-slate-700 font-mono text-slate-400">
              LIVE
            </span>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
            {toast.message}
          </p>
        </div>

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* COUNTDOWN PROGRESS BAR */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900/80 overflow-hidden">
        <div
          className={`h-full transition-all duration-linear ${
            isSuccess ? 'bg-emerald-400' : isError ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-cyan-400'
          }`}
          style={{
            animation: `shrinkWidth ${toast.duration || 3800}ms linear forwards`,
          }}
        />
      </div>

      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default ToastContext;
