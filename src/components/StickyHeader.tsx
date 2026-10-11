import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Activity,
  Tv,
  TrendingUp,
  Calendar,
  MessageSquare,
  Newspaper,
  Cpu,
  Search,
  Menu,
  X,
  User,
  LogOut,
  ChevronRight,
  Shield,
  Bell,
  Sun,
  Moon,
  BarChart2
} from 'lucide-react';
import { supabase } from '../config/supabase.ts';
import { useAuthSession } from '../App.tsx';
import GoogleSearchModal from './GoogleSearchModal.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { GoogleScoutTab } from '../utils/googleScout.ts';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: Activity },
  { name: 'Predictions', path: '/predictions', icon: TrendingUp },
  { name: 'Live TV', path: '/tv', icon: Tv, badge: 'LIVE' },
  { name: 'Fixtures', path: '/fixtures', icon: Calendar },
  { name: 'Discussions', path: '/group-chats', icon: MessageSquare },
  { name: 'News & Feed', path: '/news', icon: Newspaper },
  { name: 'Match Intelligence', path: '/ai-predictions', icon: Cpu },
];

export const StickyHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme, isDay } = useTheme();
  const { isAdmin } = useAuthSession();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('CF Montreal football scores');
  const [searchInitialTab, setSearchInitialTab] = useState<GoogleScoutTab>('gemini');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Monitor scroll position with smooth threshold transition
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      if (scrollPosition > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial scroll state
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global search keyboard shortcut (Cmd+K / Ctrl+K) & Custom Event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };

    const handleCustomSearchEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ query?: string; tab?: any }>;
      if (customEvent.detail?.query) {
        setSearchInitialQuery(customEvent.detail.query);
      }
      if (customEvent.detail?.tab) {
        setSearchInitialTab(customEvent.detail.tab);
      }
      setIsSearchOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-quick-search', handleCustomSearchEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-quick-search', handleCustomSearchEvent);
    };
  }, []);

  // Sync Supabase Auth session for user menu
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      navigate('/auth');
    } catch (e) {
      console.error('Sign out error:', e);
      navigate('/auth');
    }
  };

  const isCurrentActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Skip header on Gateway entry splash and Auth login page
  const isGateway = location.pathname === '/';
  const isAuth = location.pathname === '/auth';

  if (isGateway || isAuth) return null;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[100] w-full transition-all duration-200 font-['Plus_Jakarta_Sans',sans-serif] ${
          isScrolled
            ? 'bg-[#0a0f1d]/95 backdrop-blur-md border-b border-slate-800/90 shadow-xl shadow-black/80'
            : 'bg-[#0a0f1d]/90 backdrop-blur-md border-b border-slate-800/60 shadow-md'
        }`}
      >
        {/* Fixed 64px Height Main Navigation Bar */}
        <div className="h-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Brand Logo & Title - Physical Embossed Plaque */}
          <div className="flex items-center gap-3">
            <Link
              to={userEmail ? '/dashboard' : '/'}
              className="group flex items-center gap-2.5 text-decoration-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 rounded-xl p-1 transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#2a1d08] via-[#1a1205] to-[#0a0702] border border-amber-500/50 flex items-center justify-center text-amber-400 font-extrabold shadow-[0_1px_0_rgba(251,191,36,0.3)_inset,0_3px_8px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform">
                <span className="text-xs font-black tracking-wider">MTL</span>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  FOOTBALL HUB
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase -mt-0.5 hidden sm:block">
                  Match Intelligence & Live TV
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links - Recessed Physical Tray */}
          {!isAuth && !isGateway && (
            <nav className="hidden lg:flex items-center gap-1.5 bg-[#060912] p-1.5 rounded-xl border border-[#1e293b] shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.06)]">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isCurrentActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 text-decoration-none select-none ${
                      active
                        ? 'bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-amber-300 border border-amber-500/40 shadow-[0_1px_0_rgba(251,191,36,0.25)_inset,0_2px_6px_rgba(0,0,0,0.8)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c1220]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className={`text-[9px] px-1 py-0.2 rounded font-extrabold tracking-wider ${
                        active ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/80 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Action Icons & Profile - Machined Physical Controls */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${isDay ? 'Midnight' : 'Day'} mode`}
              title={`Switch to ${isDay ? 'Midnight' : 'High-Contrast Day'} mode`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-[#334155] hover:border-[#475569] text-slate-300 hover:text-white transition-all cursor-pointer text-xs font-semibold shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_4px_rgba(0,0,0,0.6)] active:translate-y-[1px]"
            >
              {isDay ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline text-[11px] font-bold text-amber-500">Day</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline text-[11px] font-bold text-slate-300">Midnight</span>
                </>
              )}
            </button>

            {/* Quick Search Trigger */}
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Quick Search"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-[#334155] hover:border-amber-500/40 text-slate-300 hover:text-white transition-all cursor-pointer text-xs font-semibold shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_4px_rgba(0,0,0,0.6)] active:translate-y-[1px]"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline text-slate-400">Search matches & intelligence...</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-bold bg-[#090d18] border border-slate-700 rounded text-slate-400 shadow-inner">
                ⌘K
              </kbd>
            </button>

            {/* User Profile / Authentication Menu */}
            {userEmail ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(prev => !prev)}
                  className="flex items-center gap-2 p-1 rounded-xl bg-gradient-to-b from-[#1e293b] to-[#0f172a] border border-[#334155] hover:border-amber-500/40 shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_4px_rgba(0,0,0,0.6)] transition-all cursor-pointer active:translate-y-[1px]"
                  aria-expanded={isUserMenuOpen}
                  title={userEmail}
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-xs shadow-inner">
                    {userEmail.charAt(0).toUpperCase()}
                  </div>
                </button>

                {/* Dropdown Profile Popup */}
                {isUserMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsUserMenuOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 text-xs">
                      <div className="px-3 py-2 border-b border-slate-800 mb-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Signed in as</div>
                        <div className="font-semibold text-white truncate">{userEmail}</div>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors font-bold"
                      >
                        <User className="w-4 h-4 text-emerald-400" />
                        My Profile & Status
                      </Link>
                      <Link
                        to="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Activity className="w-4 h-4 text-emerald-400" />
                        Dashboard Core
                      </Link>
                      <Link
                        to="/notifications"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Bell className="w-4 h-4 text-amber-400" />
                        Alerts & Notices
                      </Link>
                      <Link
                        to="/engagement"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors font-bold"
                      >
                        <BarChart2 className="w-4 h-4 text-cyan-400" />
                        Engagement Analytics
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-colors font-bold"
                        >
                          <Shield className="w-4 h-4 text-emerald-400" />
                          Management Desk
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors text-left cursor-pointer mt-1"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              !isAuth && (
                <Link
                  to="/auth"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
                >
                  Sign In
                </Link>
              )
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Navigation Drawer */}
        <div
          className={`lg:hidden transition-all duration-300 ease-in-out overflow-hidden border-t border-slate-800/80 bg-slate-950/98 backdrop-blur-xl ${
            isMobileMenuOpen ? 'max-h-[500px] opacity-100 py-3 px-4 shadow-2xl' : 'max-h-0 opacity-0 py-0 px-4'
          }`}
        >
          <div className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isCurrentActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-slate-950' : 'text-emerald-400'}`} />
                  <span className="truncate">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto text-[8px] px-1 py-0.2 bg-red-500 text-white rounded font-black">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            {/* Mobile Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
            >
              {isDay ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Day Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Midnight Mode</span>
                </>
              )}
            </button>

            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-bold text-emerald-400 hover:text-white cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Profile</span>
            </Link>

            <Link
              to="/engagement"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-bold text-cyan-400 hover:text-white cursor-pointer"
            >
              <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Engagement</span>
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-bold text-emerald-400 hover:text-white cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Panel</span>
              </Link>
            )}

            {userEmail && (
              <button 
                onClick={handleSignOut}
                className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Header height placeholder spacer to prevent content overlap */}
      <div className="h-16 w-full shrink-0" aria-hidden="true" />

      {/* Global Quick Search Modal */}
      <GoogleSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        initialQuery={searchInitialQuery}
        initialTab={searchInitialTab}
      />
    </>
  );
};

export default StickyHeader;
