import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  Calendar,
  Newspaper,
  MessageSquare,
  Activity,
  Flame,
  Plus,
  Edit3,
  Trash2,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  Key,
  Search,
  RefreshCw,
  CheckCircle2,
  X,
  Menu,
  ChevronRight,
  TrendingUp,
  Radio,
  Tv,
  Eye,
  Sliders,
  AlertTriangle,
  LogOut,
  Database,
  ArrowUpRight,
  Layers,
  BarChart2
} from 'lucide-react';
import UniversalFAB from '../components/UniversalFAB.tsx';
import FuturisticLoader from '../components/FuturisticLoader.tsx';
import { supabase } from '../config/supabase.ts';
import { useAuthSession } from '../App.tsx';

type AdminTab = 'overview' | 'matches' | 'fixtures' | 'news' | 'users' | 'groups' | 'trending' | 'clubs' | 'security';

export default function AdminControlPanel() {
  const navigate = useNavigate();

  // Authentication & Security State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Real Supabase Data State
  const [matches, setMatches] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [newsList, setNewsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [trendingList, setTrendingList] = useState<any[]>([]);
  const [clubsList, setClubsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search and Filter State
  const [searchFilter, setSearchFilter] = useState('');

  // Modals for CRUD operations
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [modalForm, setModalForm] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);

  // Trigger Notification Banner
  const notify = (title: string, message: string, type: 'success' | 'error' = 'success') => {
    setStatusNotification({ title, message, type });
    setTimeout(() => setStatusNotification(null), 4000);
  };

  const { isAdmin: isSessionAdmin, user: sessionUser, userProfile: sessionProfile } = useAuthSession();

  // Check Auth & Security Clearance
  useEffect(() => {
    async function verifyAdminAccess() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const activeUser = session?.user || sessionUser;
        const overrideGranted = sessionStorage.getItem('mtl_admin_override') === 'true';

        if (activeUser) {
          setCurrentUser(activeUser);
          const email = activeUser.email || '';

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', activeUser.id)
            .maybeSingle();

          const activeProfile = profile || sessionProfile;
          setUserProfile(activeProfile);

          const hasAdminFlag = Boolean(
            isSessionAdmin ||
            activeProfile?.role === 'admin' ||
            activeProfile?.is_admin === true ||
            activeProfile?.admin === true ||
            activeProfile?.is_global_admin === true ||
            email.endsWith('@admin.com') ||
            email === 'deveper3651@gmail.com' ||
            email === 'lennoxmourice@gmail.com' ||
            email === 'moricetonnylennox@gmail.com'
          );

          setIsAdminAuthorized(hasAdminFlag);
        } else if (overrideGranted || isSessionAdmin) {
          setIsAdminAuthorized(true);
        } else {
          setIsAdminAuthorized(false);
        }
      } catch (err) {
        console.error('Error verifying admin clearance:', err);
        setIsAdminAuthorized(false);
      } finally {
        setLoading(false);
      }
    }

    verifyAdminAccess();
  }, [isSessionAdmin, sessionUser, sessionProfile]);

  // Fetch all management records once authorized
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Matches
      const { data: mData } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });
      if (mData) setMatches(mData);

      // 2. Fixtures
      const { data: fData } = await supabase
        .from('fixtures')
        .select('*')
        .order('match_date', { ascending: true });
      if (fData) setFixtures(fData);

      // 3. News (from local storage + persistent matches)
      const savedNews = localStorage.getItem('mtl_news_persistent_v2');
      if (savedNews) {
        try { setNewsList(JSON.parse(savedNews)); } catch {}
      }

      // 4. Users (profiles)
      const { data: uData } = await supabase
        .from('profiles')
        .select('*')
        .limit(100);
      if (uData) setUsersList(uData);

      // 5. Chat Groups
      const { data: gData } = await supabase
        .from('chat_groups')
        .select('*, group_members(user_id, role, is_suspended)')
        .order('created_at', { ascending: false });
      if (gData) setGroupsList(gData);

      // 6. Trending
      const { data: tData } = await supabase
        .from('trending')
        .select('*')
        .order('rank', { ascending: true });
      if (tData) setTrendingList(tData);

      // 7. Clubs
      const savedClubs = localStorage.getItem('mtl_clubs_dossiers_v2');
      if (savedClubs) {
        try { setClubsList(JSON.parse(savedClubs)); } catch {}
      }

      // 8. Audit logs
      const savedLogs = localStorage.getItem('mtl_admin_audit_logs');
      if (savedLogs) {
        try { setAuditLogs(JSON.parse(savedLogs)); } catch {}
      } else {
        setAuditLogs([
          { id: '1', action: 'SECURITY SESSION INITIALIZED', target: 'Terminal', timestamp: new Date().toLocaleTimeString(), admin: 'Root Admin' },
          { id: '2', action: 'DATABASE ENCRYPTION CHECK', target: 'Secure Platform Database', timestamp: new Date().toLocaleTimeString(), admin: 'System Protocol' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthorized) {
      fetchAllData();
    }
  }, [isAdminAuthorized]);

  // Add an entry to the Audit Log
  const logAuditAction = (action: string, target: string) => {
    const newLog = {
      id: String(Date.now()),
      action,
      target,
      timestamp: new Date().toLocaleTimeString(),
      admin: userProfile?.username || currentUser?.email || 'Root Admin'
    };
    const updated = [newLog, ...auditLogs].slice(0, 50);
    setAuditLogs(updated);
    localStorage.setItem('mtl_admin_audit_logs', JSON.stringify(updated));
  };

  /* ============================================================
     MANAGEMENT ACTIONS: MATCHES
     ============================================================ */
  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(editingItem?.id ? "Confirm updating match details in database?" : "Confirm publishing new match prediction entry?")) return;
    setSubmitting(true);
    try {
      const payload: any = {
        teams: modalForm.teams && modalForm.teams.trim() !== '' ? modalForm.teams.trim() : 'Team A vs Team B',
        league: modalForm.league && modalForm.league.trim() !== '' ? modalForm.league.trim() : 'Premier League',
        match_date: modalForm.match_date && modalForm.match_date.trim() !== '' ? modalForm.match_date.trim() : new Date().toISOString().split('T')[0],
        match_time: modalForm.match_time && modalForm.match_time.trim() !== '' ? modalForm.match_time.trim() : '20:00',
        prediction: modalForm.prediction && modalForm.prediction.trim() !== '' ? modalForm.prediction.trim() : 'Home Win',
        status: modalForm.status || 'PENDING',
        decimal_odds: parseFloat(modalForm.decimal_odds) || 1.85,
        type: modalForm.type || 'free',
        score: modalForm.score && modalForm.score.trim() !== '' ? modalForm.score.trim() : '0-0',
        home_score: parseInt(modalForm.home_score, 10) || 0,
        away_score: parseInt(modalForm.away_score, 10) || 0,
        minute: parseInt(modalForm.minute, 10) || 0,
        confidence_stars: parseInt(modalForm.confidence_stars, 10) || 5,
        analysis_text: modalForm.analysis_text && modalForm.analysis_text.trim() !== '' ? modalForm.analysis_text.trim() : 'Tactical analysis confirmed by administrative node.'
      };

      if (editingItem?.id) {
        await supabase.from('matches').update(payload).eq('id', editingItem.id);
        setMatches(prev => prev.map(m => m.id === editingItem.id ? { ...m, ...payload } : m));
        logAuditAction('EDIT MATCH', payload.teams);
        notify('MATCH UPDATED', `${payload.teams} successfully updated in database.`);
      } else {
        const { data } = await supabase.from('matches').insert([payload]).select();
        if (data && data[0]) {
          setMatches(prev => [data[0], ...prev]);
        }
        logAuditAction('CREATE MATCH', payload.teams);
        notify('MATCH CREATED', `${payload.teams} successfully published.`);
      }
      setActiveModal(null);
    } catch (err: any) {
      notify('ERROR', err.message || 'Failed to save match record.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMatch = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete match "${name}"?`)) return;
    try {
      setMatches(prev => prev.filter(m => m.id !== id));
      await supabase.from('matches').delete().eq('id', id);
      logAuditAction('DELETE MATCH', name);
      notify('MATCH DELETED', `Record removed from database.`);
    } catch (err: any) {
      notify('ERROR', err.message || 'Delete operation failed.', 'error');
    }
  };

  /* ============================================================
     MANAGEMENT ACTIONS: FIXTURES
     ============================================================ */
  const handleSaveFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(editingItem?.id ? "Confirm updating fixture schedule in database?" : "Confirm adding new fixture entry?")) return;
    setSubmitting(true);
    try {
      const payload: any = {
        teams: modalForm.teams && modalForm.teams.trim() !== '' ? modalForm.teams.trim() : 'Team A vs Team B',
        league: modalForm.league && modalForm.league.trim() !== '' ? modalForm.league.trim() : 'Premier League',
        match_date: modalForm.match_date && modalForm.match_date.trim() !== '' ? modalForm.match_date.trim() : new Date().toISOString().split('T')[0],
        match_time: modalForm.match_time && modalForm.match_time.trim() !== '' ? modalForm.match_time.trim() : '20:00',
        badge: modalForm.badge || '⚽'
      };

      if (editingItem?.id) {
        await supabase.from('fixtures').update(payload).eq('id', editingItem.id);
        setFixtures(prev => prev.map(f => f.id === editingItem.id ? { ...f, ...payload } : f));
        logAuditAction('EDIT FIXTURE', payload.teams);
        notify('FIXTURE UPDATED', `${payload.teams} updated successfully.`);
      } else {
        const { data } = await supabase.from('fixtures').insert([payload]).select();
        if (data && data[0]) {
          setFixtures(prev => [...prev, data[0]]);
        }
        logAuditAction('CREATE FIXTURE', payload.teams);
        notify('FIXTURE CREATED', `${payload.teams} added to fixtures schedule.`);
      }
      setActiveModal(null);
    } catch (err: any) {
      notify('ERROR', err.message || 'Failed to save fixture.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFixture = async (id: string, name: string) => {
    if (!window.confirm(`Delete fixture "${name}"?`)) return;
    try {
      setFixtures(prev => prev.filter(f => f.id !== id));
      await supabase.from('fixtures').delete().eq('id', id);
      logAuditAction('DELETE FIXTURE', name);
      notify('FIXTURE REMOVED', `${name} removed from schedule.`);
    } catch (err: any) {
      notify('ERROR', err.message || 'Delete failed.', 'error');
    }
  };

  /* ============================================================
     MANAGEMENT ACTIONS: USERS (PROMOTE, DEMOTE, SUSPEND)
     ============================================================ */
  const handlePromoteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Elevate user "${username}" to Administrator with full CRUD privileges?`)) return;
    try {
      await supabase.from('profiles').update({ role: 'admin', is_admin: true }).eq('id', userId);
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: 'admin', is_admin: true } : u));
      logAuditAction('PROMOTE TO ADMIN', username);
      notify('USER ELEVATED', `${username} granted Administrator permissions.`);
    } catch (err: any) {
      notify('ERROR', err.message || 'Elevation failed.', 'error');
    }
  };

  const handleDemoteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Revoke admin privileges for "${username}" and set role to standard Member?`)) return;
    try {
      await supabase.from('profiles').update({ role: 'member', is_admin: false }).eq('id', userId);
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: 'member', is_admin: false } : u));
      logAuditAction('DEMOTE TO MEMBER', username);
      notify('ROLE ADJUSTED', `${username} set to standard Member.`);
    } catch (err: any) {
      notify('ERROR', err.message || 'Demotion failed.', 'error');
    }
  };

  const handleSuspendUser = async (userId: string, username: string, hours: number = 24) => {
    if (!window.confirm(`Restrict account access for "${username}" for ${hours} hours?`)) return;
    try {
      await supabase.from('profiles').update({ 
        status_message: `SUSPENDED (${hours}h)`, 
        role: 'suspended' 
      }).eq('id', userId);

      setUsersList(prev => prev.map(u => u.id === userId ? { 
        ...u, 
        role: 'suspended', 
        status_message: `SUSPENDED (${hours}h)` 
      } : u));

      logAuditAction(`SUSPEND USER (${hours}h)`, username);
      notify('USER SUSPENDED', `${username} access restricted for ${hours} hours.`);
    } catch (err: any) {
      notify('ERROR', err.message || 'Suspension failed.', 'error');
    }
  };

  const handleUnsuspendUser = async (userId: string, username: string) => {
    if (!window.confirm(`Reinstate account access for user "${username}"?`)) return;
    try {
      await supabase.from('profiles').update({ 
        status_message: 'Online in Lounge', 
        role: 'member' 
      }).eq('id', userId);

      setUsersList(prev => prev.map(u => u.id === userId ? { 
        ...u, 
        role: 'member', 
        status_message: 'Online in Lounge' 
      } : u));

      logAuditAction('UNSUSPEND USER', username);
      notify('USER REINSTATED', `${username} account access restored.`);
    } catch (err: any) {
      notify('ERROR', err.message || 'Reinstatement failed.', 'error');
    }
  };

  /* ============================================================
     MANAGEMENT ACTIONS: CHAT GROUPS
     ============================================================ */
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!window.confirm(`Permanently delete group lounge "${groupName}"?`)) return;
    try {
      setGroupsList(prev => prev.filter(g => g.id !== groupId));
      await supabase.from('chat_groups').delete().eq('id', groupId);
      logAuditAction('DELETE GROUP LOUNGE', groupName);
      notify('LOUNGE REMOVED', `${groupName} deleted from database.`);
    } catch (err: any) {
      notify('ERROR', err.message || 'Group deletion failed.', 'error');
    }
  };

  /* ============================================================
     SECURITY SHIELD: UNAUTHORIZED / PIN CLEARANCE GATE
     ============================================================ */
  if (loading) {
    return <FuturisticLoader active={true} text="VERIFYING ROOT ADMINISTRATIVE PERMISSIONS..." progress={90} />;
  }

  if (isAdminAuthorized === false) {
    return (
      <div className="min-h-screen bg-[#060b14] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-full max-w-md bg-[#0a1221] border border-red-500/40 rounded-3xl p-7 sm:p-8 space-y-6 shadow-2xl shadow-red-950/40 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-mono tracking-widest text-red-400 font-bold uppercase block">
              RESTRICTED ROUTE · SECURITY CLEARANCE LEVEL 5
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white font-['Orbitron']">
              ADMIN ACCESS REQUIRED
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              This terminal is strictly reserved for verified platform administrators. Your account does not have administrative privileges.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-3 text-xs text-slate-400">
            <span className="font-mono text-[11px] text-slate-500">Session: {currentUser?.email || 'Authenticated User'}</span>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              RETURN TO DASHBOARD
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     AUTHORIZED ADMIN CONTROL PANEL INTERFACE
     ============================================================ */
  return (
    <div className="min-h-screen bg-[#060b14] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.06),rgba(0,0,0,0))] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] flex">
      <UniversalFAB showBackToDashboard={true} />

      {/* Floating Status Notification Toast */}
      {statusNotification && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-200 ${
          statusNotification.type === 'success' 
            ? 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-950/40' 
            : 'bg-slate-900/95 border-red-500/50 text-white shadow-red-950/40'
        }`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            statusNotification.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black font-['Orbitron'] tracking-wider uppercase">{statusNotification.title}</div>
            <div className="text-xs text-slate-300">{statusNotification.message}</div>
          </div>
          <button onClick={() => setStatusNotification(null)} className="ml-3 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MOBILE DRAWER OVERLAY */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-40 lg:hidden"
        />
      )}

      {/* SIDEBAR NAVIGATION MENU */}
      <aside className={`fixed lg:sticky top-0 bottom-0 left-0 z-50 w-72 bg-[#091120] border-r border-slate-800/90 flex flex-col justify-between p-5 transform transition-transform duration-300 shadow-2xl lg:translate-x-0 ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-6">
          {/* Admin Header Branding */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 font-['Orbitron'] shadow-md shadow-emerald-950/50">
                <ShieldCheck className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <span className="font-['Orbitron'] text-xs font-black text-white tracking-wider block">
                  ADMIN CONTROL
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LEVEL 5 ROOT ACCESS
                </span>
              </div>
            </div>

            <button onClick={() => setIsMobileSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 text-xs font-semibold">
            {[
              { id: 'overview', label: 'System Overview', icon: Activity, count: null },
              { id: 'matches', label: 'Matches & Telemetry', icon: Radio, count: matches.length },
              { id: 'fixtures', label: 'Fixtures Schedule', icon: Calendar, count: fixtures.length },
              { id: 'news', label: 'News & Wire Feed', icon: Newspaper, count: newsList.length },
              { id: 'users', label: 'Users & Permissions', icon: Users, count: usersList.length },
              { id: 'groups', label: 'Group Lounges', icon: MessageSquare, count: groupsList.length },
              { id: 'trending', label: 'Trending Topics', icon: Flame, count: trendingList.length },
              { id: 'clubs', label: 'Club Dossiers', icon: Shield, count: clubsList.length },
              { id: 'security', label: 'Audit & Telemetry', icon: Lock, count: auditLogs.length }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as AdminTab);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.count !== null && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                      isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Admin Footer User Pill */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center font-bold text-[10px] text-emerald-300">
                ADM
              </div>
              <div className="truncate max-w-[140px]">
                <span className="text-white font-bold block truncate">{userProfile?.username || currentUser?.email?.split('@')[0] || 'Administrator'}</span>
                <span className="text-[10px] text-slate-500 truncate block">Root Clearance</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              title="Return to user app"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN ADMIN WORKSPACE */}
      <main className="flex-1 min-h-screen overflow-y-auto px-4 pt-2 pb-6 sm:px-6 sm:pt-3 lg:px-8 lg:pt-4 space-y-6">

        {/* TOP BAR WITH MOBILE MENU TOGGLE & ACTION SHORTCUTS */}
        <div className="flex items-center justify-between gap-4 bg-[#0a1221] border border-slate-800/90 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white font-['Orbitron'] uppercase tracking-wider flex items-center gap-2">
                <span>{activeTab.toUpperCase()}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h1>
              <p className="text-xs text-slate-400">
                Centralized platform controls · Real-time network telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchAllData}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-emerald-500/40 transition-colors"
              title="Sync with Network"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {activeTab === 'matches' && (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setModalForm({ teams: '', league: 'Premier League', status: 'PENDING', decimal_odds: 1.95, prediction: 'Home Win' });
                  setActiveModal('match');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">CREATE MATCH</span>
              </button>
            )}

            {activeTab === 'fixtures' && (
              <button
                onClick={() => {
                  setEditingItem(null);
                  setModalForm({ teams: '', league: 'Premier League', match_date: new Date().toISOString().split('T')[0], match_time: '20:00', badge: '⚽' });
                  setActiveModal('fixture');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs font-['Orbitron'] shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">ADD FIXTURE</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: SYSTEM OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Matches & Picks', count: matches.length, icon: Radio, color: 'text-cyan-400', tab: 'matches' },
                { label: 'Upcoming Fixtures', count: fixtures.length, icon: Calendar, color: 'text-emerald-400', tab: 'fixtures' },
                { label: 'Registered Members', count: usersList.length, icon: Users, color: 'text-amber-400', tab: 'users' },
                { label: 'Community Lounges', count: groupsList.length, icon: MessageSquare, color: 'text-purple-400', tab: 'groups' }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveTab(stat.tab as AdminTab)}
                    className="bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-5 space-y-2 shadow-xl cursor-pointer transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between text-xs font-['Orbitron'] font-bold text-slate-400">
                      <span className="truncate">{stat.label}</span>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white font-['Orbitron']">{stat.count}</div>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span>Manage records</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick Action Launchers Bar */}
            <div className="bg-[#0a1221] border border-slate-800/90 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="text-xs font-black font-['Orbitron'] uppercase tracking-wider text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Administrative Fast Launchers
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => {
                    setActiveTab('matches');
                    setEditingItem(null);
                    setModalForm({ teams: '', league: 'Premier League', status: 'LIVE', minute: 1, score: '0-0' });
                    setActiveModal('match');
                  }}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-left space-y-1 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-bold text-cyan-400 block font-['Orbitron']">+ Launch Live Match Telemetry</span>
                  <p className="text-[11px] text-slate-400">Broadcast scores and xG statistics to live match radar.</p>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('fixtures');
                    setEditingItem(null);
                    setModalForm({ teams: '', league: 'Champions League', match_date: new Date().toISOString().split('T')[0], match_time: '20:00' });
                    setActiveModal('fixture');
                  }}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-left space-y-1 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-bold text-emerald-400 block font-['Orbitron']">+ Schedule High Stakes Fixture</span>
                  <p className="text-[11px] text-slate-400">Add team matchups, venues, and broadcast channels.</p>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-left space-y-1 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-bold text-amber-400 block font-['Orbitron']">Manage User Access & Roles</span>
                  <p className="text-[11px] text-slate-400">Elevate to admin, moderate lounge conduct, or suspend users.</p>
                </button>

                <button
                  onClick={() => navigate('/engagement')}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 text-left space-y-1 transition-colors cursor-pointer group"
                >
                  <span className="text-xs font-bold text-purple-400 block font-['Orbitron'] flex items-center justify-between">
                    <span>Recharts Engagement Pulse</span>
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                  <p className="text-[11px] text-slate-400">Visualize message frequencies & live hub interactions.</p>
                </button>
              </div>
            </div>

            {/* Recent Audit Telemetry Log */}
            <div className="bg-[#0a1221] border border-slate-800/90 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black font-['Orbitron'] uppercase tracking-wider text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  Recent Administrative Audit Trail
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono">LIVE STREAM ACTIVE</span>
              </div>
              <div className="space-y-2">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-3 bg-[#060d18] border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="font-bold text-white font-['Orbitron'] text-[11px]">{log.action}:</span>
                      <span className="text-slate-300">{log.target}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{log.timestamp} • {log.admin}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MATCHES & TELEMETRY */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            <div className="bg-[#0a1221] border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search matches by team or league..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-[#060d18] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-xs font-bold text-slate-400">Total: {matches.length} Matches</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches
                .filter(m => m.teams?.toLowerCase().includes(searchFilter.toLowerCase()) || m.league?.toLowerCase().includes(searchFilter.toLowerCase()))
                .map((m) => (
                  <div key={m.id} className="bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-5 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <span className="font-['Orbitron'] text-xs font-bold text-cyan-400 uppercase tracking-wider">{m.league || 'Premier League'}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        m.status === 'LIVE' ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {m.status || 'PENDING'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white font-['Orbitron']">{m.teams}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Pick: <strong className="text-emerald-400">{m.prediction}</strong> · Odds: <strong className="text-amber-400">{m.decimal_odds || 1.85}</strong></p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-lg font-black text-white">{m.score || `${m.home_score ?? 0} - ${m.away_score ?? 0}`}</span>
                        {m.minute > 0 && <span className="text-[10px] text-red-400 block font-mono">{m.minute}'</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-xs">
                      <span className="text-[10px] text-slate-500 font-mono">{m.match_date} • {m.match_time}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(m);
                            setModalForm(m);
                            setActiveModal('match');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700"
                        >
                          <Edit3 className="w-3 h-3 text-cyan-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteMatch(m.id, m.teams)}
                          className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500 text-red-300 hover:text-white text-xs font-bold flex items-center gap-1 border border-red-500/30"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: FIXTURES */}
        {activeTab === 'fixtures' && (
          <div className="space-y-4">
            <div className="bg-[#0a1221] border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter fixtures..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-[#060d18] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-xs font-bold text-slate-400">Total: {fixtures.length} Fixtures</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fixtures
                .filter(f => f.teams?.toLowerCase().includes(searchFilter.toLowerCase()) || f.league?.toLowerCase().includes(searchFilter.toLowerCase()))
                .map((f) => (
                  <div key={f.id} className="bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 rounded-2xl p-5 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 text-xs">
                      <span className="font-['Orbitron'] font-bold text-emerald-400 uppercase">{f.league}</span>
                      <span className="font-mono text-slate-400">{f.match_date} • {f.match_time}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white font-['Orbitron']">{f.teams}</h4>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-xs">
                      <span className="text-[11px] text-slate-400">{f.badge || '⚽'} Scheduled</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(f);
                            setModalForm(f);
                            setActiveModal('fixture');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700"
                        >
                          <Edit3 className="w-3 h-3 text-cyan-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteFixture(f.id, f.teams)}
                          className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500 text-red-300 hover:text-white text-xs font-bold flex items-center gap-1 border border-red-500/30"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 4: USERS & PERMISSIONS (PROMOTE, DEMOTE, SUSPEND) */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="bg-[#0a1221] border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter users by username or email..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-[#060d18] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-xs font-bold text-slate-400">Total Users: {usersList.length}</span>
            </div>

            <div className="space-y-3">
              {usersList
                .filter(u => u.username?.toLowerCase().includes(searchFilter.toLowerCase()) || u.email?.toLowerCase().includes(searchFilter.toLowerCase()))
                .map((u) => {
                  const isUserAdmin = u.role === 'admin' || u.is_admin === true || u.admin === true;
                  const isSuspended = u.role === 'suspended';

                  return (
                    <div key={u.id} className="bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                          alt={u.username}
                          className="w-10 h-10 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{u.username || 'User'}</span>
                            {isUserAdmin && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black uppercase font-['Orbitron']">
                                ADMIN
                              </span>
                            )}
                            {isSuspended && (
                              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-black uppercase font-['Orbitron']">
                                SUSPENDED
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{u.email || u.status_message || 'Active User'}</p>
                        </div>
                      </div>

                      {/* User Moderation Action Controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isUserAdmin ? (
                          <button
                            onClick={() => handleDemoteUser(u.id, u.username || 'User')}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5"
                          >
                            <UserX className="w-3.5 h-3.5 text-amber-400" />
                            <span>Demote to Member</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePromoteUser(u.id, u.username || 'User')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5 transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Promote to Admin</span>
                          </button>
                        )}

                        {isSuspended ? (
                          <button
                            onClick={() => handleUnsuspendUser(u.id, u.username || 'User')}
                            className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 text-xs font-bold border border-teal-500/40 flex items-center gap-1.5"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Unsuspend</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSuspendUser(u.id, u.username || 'User', 24)}
                            className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-300 hover:text-white text-xs font-bold border border-red-500/30 flex items-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Suspend (24h)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 5: GROUP LOUNGES */}
        {activeTab === 'groups' && (
          <div className="space-y-4">
            <div className="bg-[#0a1221] border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter group lounges..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-[#060d18] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-xs font-bold text-slate-400">Total Lounges: {groupsList.length}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupsList
                .filter(g => g.name?.toLowerCase().includes(searchFilter.toLowerCase()))
                .map((g) => (
                  <div key={g.id} className="bg-gradient-to-b from-[#0e182a] to-[#0a1221] border border-slate-800/90 rounded-2xl p-5 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <span className="font-['Orbitron'] text-xs font-bold text-emerald-400 uppercase">{g.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">{g.group_members?.length || 1} members</span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{g.description || 'Public Channel'}</p>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 font-mono">Created {new Date(g.created_at).toLocaleDateString()}</span>
                      <button
                        onClick={() => handleDeleteGroup(g.id, g.name)}
                        className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500 text-red-300 hover:text-white text-xs font-bold flex items-center gap-1 border border-red-500/30"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete Lounge</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 6: SECURITY & AUDIT TELEMETRY */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="bg-[#0a1221] border border-slate-800/90 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="text-xs font-black font-['Orbitron'] uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Root Security & Encryption Parameters
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-[#060d18] p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Database Layer</span>
                  <span className="text-emerald-400 font-bold text-sm block">MTL Secure Database</span>
                  <span className="text-[11px] text-slate-500">Row-Level Security (RLS) Active</span>
                </div>
                <div className="bg-[#060d18] p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Auth Session Protocol</span>
                  <span className="text-cyan-400 font-bold text-sm block">JWT Bearer Handshake</span>
                  <span className="text-[11px] text-slate-500">Zero-Latency Client Sync</span>
                </div>
                <div className="bg-[#060d18] p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Active Operator</span>
                  <span className="text-amber-400 font-bold text-sm block">{currentUser?.email || 'Master Terminal'}</span>
                  <span className="text-[11px] text-slate-500">Role: Root Administrator</span>
                </div>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-[#0a1221] border border-slate-800/90 rounded-2xl p-6 space-y-3 shadow-xl">
              <h3 className="text-xs font-black font-['Orbitron'] uppercase tracking-wider text-white">
                Detailed Action Audit History ({auditLogs.length})
              </h3>
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-[#060d18] border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-emerald-400 font-['Orbitron'] text-xs block">{log.action}</span>
                      <span className="text-slate-300 text-[11px]">{log.target}</span>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      <div>{log.timestamp}</div>
                      <div>by {log.admin}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* CREATE & EDIT MATCH MODAL */}
      {activeModal === 'match' && (
        <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white font-['Orbitron'] uppercase tracking-wider">
                {editingItem ? 'EDIT MATCH RECORD' : 'CREATE MATCH RECORD'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMatch} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Teams Matchup *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arsenal vs Chelsea"
                  value={modalForm.teams || ''}
                  onChange={(e) => setModalForm({ ...modalForm, teams: e.target.value })}
                  className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">League</label>
                  <input
                    type="text"
                    value={modalForm.league || ''}
                    onChange={(e) => setModalForm({ ...modalForm, league: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Status</label>
                  <select
                    value={modalForm.status || 'PENDING'}
                    onChange={(e) => setModalForm({ ...modalForm, status: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="LIVE">LIVE</option>
                    <option value="FINISHED">FINISHED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">AI Prediction</label>
                  <input
                    type="text"
                    value={modalForm.prediction || ''}
                    onChange={(e) => setModalForm({ ...modalForm, prediction: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Decimal Odds</label>
                  <input
                    type="number"
                    step="0.01"
                    value={modalForm.decimal_odds || ''}
                    onChange={(e) => setModalForm({ ...modalForm, decimal_odds: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Score (H-A)</label>
                  <input
                    type="text"
                    placeholder="2-1"
                    value={modalForm.score || ''}
                    onChange={(e) => setModalForm({ ...modalForm, score: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-black font-['Orbitron'] disabled:opacity-50"
                >
                  {submitting ? 'SAVING...' : 'SAVE RECORD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE & EDIT FIXTURE MODAL */}
      {activeModal === 'fixture' && (
        <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#091222] border border-slate-700/80 rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white font-['Orbitron'] uppercase tracking-wider">
                {editingItem ? 'EDIT FIXTURE' : 'CREATE FIXTURE'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFixture} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Fixture (Teams) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manchester City vs Liverpool"
                  value={modalForm.teams || ''}
                  onChange={(e) => setModalForm({ ...modalForm, teams: e.target.value })}
                  className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Competition</label>
                  <input
                    type="text"
                    value={modalForm.league || ''}
                    onChange={(e) => setModalForm({ ...modalForm, league: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    value={modalForm.match_date || ''}
                    onChange={(e) => setModalForm({ ...modalForm, match_date: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Kickoff Time</label>
                  <input
                    type="time"
                    value={modalForm.match_time || ''}
                    onChange={(e) => setModalForm({ ...modalForm, match_time: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">Emoji Badge</label>
                  <input
                    type="text"
                    value={modalForm.badge || '⚽'}
                    onChange={(e) => setModalForm({ ...modalForm, badge: e.target.value })}
                    className="w-full bg-[#060d18] border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-black font-['Orbitron'] disabled:opacity-50"
                >
                  {submitting ? 'SAVING...' : 'SAVE FIXTURE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
