import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  X, 
  Search, 
  TrendingUp, 
  Tv, 
  MessageSquare, 
  Calendar,
  Sparkles,
  ArrowLeft,
  RotateCw,
  Sliders,
  User,
  Menu,
  Shield,
  Bell,
  Activity
} from 'lucide-react';

export interface FABAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  color?: string;
  onClick: () => void;
}

interface UniversalFABProps {
  customActions?: FABAction[];
  onQuickSearch?: () => void;
  onRefresh?: () => void;
  onToggleSideMenu?: () => void;
  onOpenProfile?: () => void;
  onNewAction?: () => void;
  newActionLabel?: string;
  showBackToDashboard?: boolean;
}

export const UniversalFAB: React.FC<UniversalFABProps> = ({
  customActions,
  onQuickSearch,
  onRefresh,
  onToggleSideMenu,
  onOpenProfile,
  onNewAction,
  newActionLabel = 'New Action',
  showBackToDashboard = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const fabRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Built-in actions
  const defaultActions: FABAction[] = [];

  if (customActions && customActions.length > 0) {
    defaultActions.push(...customActions);
  }

  if (onToggleSideMenu) {
    defaultActions.push({
      id: 'sidemenu',
      label: 'Channel Drawer',
      description: 'Toggle side navigation menu',
      icon: <Menu className="w-4 h-4 text-cyan-400" />,
      color: 'hover:border-cyan-500/50 hover:bg-cyan-950/40',
      onClick: () => {
        setIsOpen(false);
        onToggleSideMenu();
      },
    });
  }

  if (onNewAction) {
    defaultActions.push({
      id: 'new_action',
      label: newActionLabel,
      description: 'Create new item or conversation',
      icon: <Plus className="w-4 h-4 text-emerald-400" />,
      color: 'hover:border-emerald-500/50 hover:bg-emerald-950/40',
      onClick: () => {
        setIsOpen(false);
        onNewAction();
      },
    });
  }

  if (onOpenProfile) {
    defaultActions.push({
      id: 'profile',
      label: 'Account Dossier',
      description: 'View user profile & credentials',
      icon: <User className="w-4 h-4 text-amber-400" />,
      color: 'hover:border-amber-500/50 hover:bg-amber-950/40',
      onClick: () => {
        setIsOpen(false);
        onOpenProfile();
      },
    });
  }

  if (onRefresh) {
    defaultActions.push({
      id: 'refresh',
      label: 'Synchronize Data',
      description: 'Refresh feeds & telemetry',
      icon: <RotateCw className="w-4 h-4 text-teal-400" />,
      color: 'hover:border-teal-500/50 hover:bg-teal-950/40',
      onClick: () => {
        setIsOpen(false);
        onRefresh();
      },
    });
  }

  if (onQuickSearch) {
    defaultActions.push({
      id: 'search',
      label: 'Quick Search',
      description: 'Search match intel & statistics',
      icon: <Search className="w-4 h-4 text-sky-400" />,
      color: 'hover:border-sky-500/50 hover:bg-sky-950/40',
      onClick: () => {
        setIsOpen(false);
        onQuickSearch();
      },
    });
  }

  if (showBackToDashboard) {
    defaultActions.push({
      id: 'dashboard',
      label: 'Back to Dashboard',
      description: 'Return to intelligence center',
      icon: <ArrowLeft className="w-4 h-4 text-emerald-400" />,
      color: 'hover:border-emerald-500/50 hover:bg-emerald-950/40',
      onClick: () => {
        setIsOpen(false);
        navigate('/dashboard');
      },
    });
  }

  return (
    <div
      ref={fabRef}
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-auto font-['Plus_Jakarta_Sans',sans-serif]"
    >
      {/* Actions Drawer Overlay */}
      {isOpen && (
        <div className="mb-3.5 flex flex-col gap-2.5 items-end animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900/95 border border-slate-800 backdrop-blur-xl rounded-2xl p-2.5 shadow-2xl shadow-black/80 w-64 max-w-[85vw] space-y-1">
            <div className="px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Quick Functions
              </span>
              <span className="text-[9px] text-slate-500 font-mono">MTL v2.4</span>
            </div>

            {defaultActions.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={act.onClick}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border border-transparent transition-all duration-150 text-left group bg-slate-800/40 hover:bg-slate-800 ${act.color || 'hover:border-emerald-500/50'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-950/80 border border-slate-700/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                  {act.icon}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                    {act.label}
                  </span>
                  {act.description && (
                    <span className="text-[10px] text-slate-400 truncate">
                      {act.description}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close quick actions menu' : 'Open quick actions menu'}
        className={`group relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden ${
          isOpen
            ? 'bg-slate-900 text-emerald-400 border border-emerald-500/60 shadow-emerald-950/80 scale-95'
            : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 text-slate-950 hover:scale-108 active:scale-95 shadow-lg shadow-emerald-500/40 hover:shadow-cyan-400/50 hover:border-emerald-300'
        }`}
      >
        {/* Ambient background glow & sweep */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />

        {isOpen ? (
          <X className="w-6 h-6 stroke-[2.5] transition-transform duration-300 rotate-90" />
        ) : (
          <div className="relative flex items-center justify-center">
            {/* Cyber Universal Command Nexus Icon */}
            <svg 
              className="w-7 h-7 text-slate-950 drop-shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              {/* Outer holographic orbital nodes */}
              <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
              <circle cx="12" cy="3" r="1.5" fill="currentColor" />
              <circle cx="12" cy="21" r="1.5" fill="currentColor" />
              <circle cx="3" cy="12" r="1.5" fill="currentColor" />
              <circle cx="21" cy="12" r="1.5" fill="currentColor" />
              {/* Core connection rays */}
              <path d="M12 4.5V9M12 15v4.5M4.5 12H9M15 12h4.5" />
              {/* Diagonal cyber accents */}
              <path d="m6.5 6.5 2.5 2.5m6 6 2.5 2.5m0-11-2.5 2.5m-6 6-2.5 2.5" opacity="0.6" strokeWidth="1.8" />
            </svg>
            
            {/* Real-time status pulse dot */}
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
            </span>
          </div>
        )}
      </button>
    </div>
  );
};

export default UniversalFAB;
