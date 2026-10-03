import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, X } from 'lucide-react';

export interface FloatingBackButtonProps {
  to?: string;
  label?: string;
  onClick?: () => void;
  position?: 'bottom-left' | 'bottom-right' | 'top-left';
  zIndex?: number;
  showOnDashboard?: boolean;
  isCloseAction?: boolean;
}

export const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({
  to,
  label,
  onClick,
  position = 'bottom-left',
  zIndex = 50,
  showOnDashboard = false,
  isCloseAction = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // If on Dashboard or Gateway and not configured to show, don't show
  const isHome = location.pathname === '/dashboard' || location.pathname === '/';
  if (isHome && !showOnDashboard && !onClick) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
      return;
    }
    if (to) {
      navigate(to);
      return;
    }
    // Default smart back: if history exists go back, otherwise go to dashboard
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  // Position styles
  let positionClasses = 'bottom-6 left-6';
  if (position === 'bottom-right') positionClasses = 'bottom-6 right-24';
  if (position === 'top-left') positionClasses = 'top-18 left-6';

  const displayLabel = label || (isCloseAction ? 'Close' : 'Back');

  return (
    <div
      style={{ zIndex }}
      className={`fixed ${positionClasses} pointer-events-auto font-['Plus_Jakarta_Sans',sans-serif]`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={displayLabel}
        className="group flex items-center gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-[#091222]/90 hover:bg-[#0e1a30] text-slate-200 hover:text-white border border-slate-700/80 hover:border-emerald-500/70 shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-black/80"
        title={displayLabel}
      >
        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700/70 group-hover:border-emerald-500/50 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-emerald-500/20 transition-colors">
          {isCloseAction ? (
            <X className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-transform group-hover:rotate-90" />
          ) : (
            <ArrowLeft className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-transform group-hover:-translate-x-0.5" />
          )}
        </div>

        <div className="hidden sm:flex flex-col items-start text-left leading-tight">
          <span className="text-[11px] font-black font-['Orbitron'] text-white group-hover:text-emerald-300 tracking-wider">
            {displayLabel.toUpperCase()}
          </span>
          <span className="text-[9px] text-slate-400 font-medium">
            {isCloseAction ? 'Exit Viewer' : 'Return Previous'}
          </span>
        </div>
      </button>
    </div>
  );
};

export default FloatingBackButton;
