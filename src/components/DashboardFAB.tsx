import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  X, 
  Search, 
  TrendingUp, 
  Tv, 
  MessageSquare, 
  Calendar,
  Sparkles
} from 'lucide-react';

interface DashboardFABProps {
  onQuickSearch: () => void;
  onNewPrediction?: () => void;
  onNavigate: (route: string) => void;
  isAdmin?: boolean;
}

export const DashboardFAB: React.FC<DashboardFABProps> = ({
  onQuickSearch,
  onNewPrediction,
  onNavigate,
  isAdmin = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const actions = [
    {
      id: 'search',
      label: 'Quick Search',
      description: 'Search match dossiers & stats',
      icon: <Search className="w-4 h-4 text-sky-400" />,
      color: 'hover:border-sky-500/50 hover:bg-sky-950/40',
      action: () => {
        setIsOpen(false);
        onQuickSearch();
      },
    },
    {
      id: 'prediction',
      label: 'New Prediction',
      description: 'Browse today’s value picks',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      color: 'hover:border-emerald-500/50 hover:bg-emerald-950/40',
      action: () => {
        setIsOpen(false);
        if (onNewPrediction) {
          onNewPrediction();
        } else {
          onNavigate('predictions');
        }
      },
    },
    {
      id: 'tv',
      label: 'Live Match TV',
      description: 'Ultra HD football broadcast',
      icon: <Tv className="w-4 h-4 text-red-400" />,
      color: 'hover:border-red-500/50 hover:bg-red-950/40',
      action: () => {
        setIsOpen(false);
        onNavigate('tv');
      },
    },
    {
      id: 'chats',
      label: 'Group Chats',
      description: 'Encrypted fan discussions',
      icon: <MessageSquare className="w-4 h-4 text-purple-400" />,
      color: 'hover:border-purple-500/50 hover:bg-purple-950/40',
      action: () => {
        setIsOpen(false);
        onNavigate('group-chats');
      },
    },
    {
      id: 'fixtures',
      label: 'Match Timetable',
      description: 'Upcoming kickoff schedule',
      icon: <Calendar className="w-4 h-4 text-amber-400" />,
      color: 'hover:border-amber-500/50 hover:bg-amber-950/40',
      action: () => {
        setIsOpen(false);
        onNavigate('fixtures');
      },
    },
  ];

  return (
    <div ref={fabRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Backdrop overlay when menu is open on mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200 -z-10"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Speed Dial Menu Items */}
      <div 
        className={`flex flex-col items-end gap-2.5 mb-3 transition-all duration-300 ease-out origin-bottom-right ${
          isOpen 
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        {actions.map((act, index) => (
          <button
            key={act.id}
            onClick={act.action}
            style={{
              transitionDelay: isOpen ? `${index * 35}ms` : '0ms',
            }}
            className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-left shadow-xl shadow-black/50 transition-all duration-200 cursor-pointer ${act.color} active:scale-95`}
          >
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                {act.label}
              </span>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline-block">
                {act.description}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {act.icon}
            </div>
          </button>
        ))}
      </div>

      {/* Main Trigger Floating Action Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close Quick Actions Menu" : "Open Quick Actions Menu"}
        title={isOpen ? "Close Menu" : "Quick Actions (Search, Predictions, Live TV)"}
        className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer border relative group ${
          isOpen
            ? 'bg-slate-800 border-slate-600 text-white rotate-90 shadow-slate-900/60'
            : 'bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 border-emerald-400/40 hover:scale-105 shadow-emerald-950/60'
        }`}
      >
        {/* Glow indicator pulse when closed */}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
        )}

        <div className="relative transition-transform duration-300">
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Sparkles className="w-6 h-6 text-slate-950 group-hover:rotate-12 transition-transform" />
          )}
        </div>
      </button>
    </div>
  );
};

export default DashboardFAB;
