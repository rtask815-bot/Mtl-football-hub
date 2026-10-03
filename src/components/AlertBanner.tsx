import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

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
  const configs = {
    error: {
      bg: 'bg-red-950/40 border-red-800/60',
      icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />,
      titleColor: 'text-red-300',
      textColor: 'text-red-200/90',
      btnColor: 'bg-red-500 hover:bg-red-400 text-white',
    },
    success: {
      bg: 'bg-emerald-950/40 border-emerald-800/60',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
      titleColor: 'text-emerald-300',
      textColor: 'text-emerald-200/90',
      btnColor: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
    },
    warning: {
      bg: 'bg-amber-950/40 border-amber-800/60',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
      titleColor: 'text-amber-300',
      textColor: 'text-amber-200/90',
      btnColor: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
    },
    info: {
      bg: 'bg-sky-950/40 border-sky-800/60',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />,
      titleColor: 'text-sky-300',
      textColor: 'text-sky-200/90',
      btnColor: 'bg-sky-500 hover:bg-sky-400 text-slate-950',
    },
  };

  const current = configs[type];

  return (
    <div className={`w-full p-4 rounded-xl border ${current.bg} flex items-start justify-between gap-3 shadow-sm transition-all duration-200 my-3`}>
      <div className="flex items-start gap-3 flex-1">
        {current.icon}
        <div className="space-y-0.5">
          {title && <h4 className={`text-sm font-semibold ${current.titleColor}`}>{title}</h4>}
          <p className={`text-xs sm:text-sm leading-relaxed ${current.textColor}`}>{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actionText && onAction && (
          <button
            onClick={onAction}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${current.btnColor} transition-colors cursor-pointer`}
          >
            {actionText}
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            aria-label="Close alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertBanner;
