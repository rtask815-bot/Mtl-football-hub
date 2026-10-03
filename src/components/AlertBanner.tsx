import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X, Sparkles } from 'lucide-react';

export interface AlertBannerProps {
  type?: 'error' | 'success' | 'info' | 'warning';
  title?: string;
  message: string;
  onClose?: () => void;
  actionText?: string;
  onAction?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'error',
  title,
  message,
  onClose,
  actionText,
  onAction,
}) => {
  const isSuccess = type === 'success';
  const isError = type === 'error';
  const isWarning = type === 'warning';

  return (
    <div
      className={`relative w-full p-4 rounded-2xl border backdrop-blur-md transition-all duration-300 shadow-xl my-3 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] ${
        isSuccess
          ? 'bg-[#081c16]/90 border-emerald-500/50 text-emerald-100 glow-emerald-active animate-toast-pop'
          : isError
          ? 'bg-[#1e0a0d]/90 border-rose-500/60 text-rose-100 glow-rose-active animate-toast-pop animate-toast-shake'
          : isWarning
          ? 'bg-[#1f1606]/90 border-amber-500/50 text-amber-100 animate-toast-pop'
          : 'bg-[#09152a]/90 border-cyan-500/50 text-cyan-100 animate-toast-pop'
      }`}
    >
      {/* Laser Top Border Beam */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${
        isSuccess ? 'bg-gradient-to-r from-emerald-500 via-teal-300 to-emerald-500' :
        isError ? 'bg-gradient-to-r from-rose-500 via-red-300 to-rose-500' :
        isWarning ? 'bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500' :
        'bg-gradient-to-r from-cyan-500 via-blue-300 to-cyan-500'
      }`} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Animated Icon Badge */}
          <div className="shrink-0 pt-0.5">
            {isSuccess && (
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-lg">
                <svg className="w-5 h-5 stroke-emerald-400 fill-none stroke-[2.5]" viewBox="0 0 24 24">
                  <path className="animate-check-draw" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {isError && (
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-400 shadow-lg animate-pulse">
                <AlertCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
            )}

            {isWarning && (
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-lg">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
            )}

            {!isSuccess && !isError && !isWarning && (
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-lg">
                <Sparkles className="w-5 h-5 stroke-[2.5] animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-0.5">
            <h4 className={`text-xs font-black font-['Orbitron'] uppercase tracking-wider ${
              isSuccess ? 'text-emerald-400' : isError ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-cyan-400'
            }`}>
              {title || (isSuccess ? 'SYSTEM CONFIRMED' : isError ? 'ACTION FAILED' : isWarning ? 'SECURITY NOTICE' : 'QUANTUM INFORMATION')}
            </h4>
            <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actionText && onAction && (
            <button
              onClick={onAction}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase font-['Orbitron'] tracking-wider shadow-md transition-all cursor-pointer ${
                isSuccess ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' :
                isError ? 'bg-rose-500 text-white hover:bg-rose-400' :
                isWarning ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' :
                'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              }`}
            >
              {actionText}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              aria-label="Close alert"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;
