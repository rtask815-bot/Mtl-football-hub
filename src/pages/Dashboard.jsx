import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Plus, Clock, TrendingUp, Heart, Eye } from 'lucide-react';
import { supabase as db } from '../config/supabase.ts';
import { StorageCache, DEFAULT_MATCHES_BACKUP, DEFAULT_FIXTURES_BACKUP, DEFAULT_TRENDING_BACKUP } from '../config/storageCache.ts';
import { openGoogleScout } from '../utils/googleScout.ts';
import GoogleSearchModal from '../components/GoogleSearchModal.tsx';
import FuturisticLoader from '../components/FuturisticLoader.tsx';
import AlertBanner from '../components/AlertBanner.tsx';
import DashboardFAB from '../components/DashboardFAB.tsx';
import { PerformanceAnalyticsChart } from '../components/PerformanceAnalyticsChart.tsx';
import StatusReel from '../components/StatusReel.tsx';
import CreateStatusModal from '../components/CreateStatusModal.tsx';
import { fetchUserStatuses, subscribeUserStatuses, INITIAL_COMMUNITY_STATUSES, saveMatchReaction } from '../config/firebaseStore.ts';
import { 
  PhysicalCard, 
  TactileButton, 
  EmbossedIcon, 
  EngravedPlaque, 
  PhysicalOptionGrid,
  MaterialPanel 
} from '../components/physical/index.ts';
import { getTeamVisual, getFixtureTeamsVisuals, getMatchCardBg, getFixtureCardBg } from '../assets/visualsRegistry.ts';

export default function Dashboard() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Nav & Clock States
  const [clock, setClock] = useState('00:00:00');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeSearchFilter, setActiveSearchFilter] = useState('prediction');

  // User & Profile States
  const [currentUser, setCurrentUser] = useState(null);
  const [dashboardStatuses, setDashboardStatuses] = useState(INITIAL_COMMUNITY_STATUSES);
  const [isCreateStatusOpen, setIsCreateStatusOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(() => {
    const cached = StorageCache.get('profile');
    return {
      username: cached?.username || 'Member',
      email: cached?.email || '',
      role: cached?.is_admin || cached?.is_global_admin ? 'admin' : 'user',
      createdAt: 'N/A'
    };
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const rawUser = localStorage.getItem('user');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        const email = (u?.email || '').toLowerCase();
        if (email === 'lennoxmourice@gmail.com' || email === 'moricetonnylennox@gmail.com' || email.endsWith('@admin.com')) {
          return true;
        }
      }
      const cached = StorageCache.get('profile');
      return Boolean(cached?.is_admin || cached?.is_global_admin || cached?.role === 'admin' || cached?.admin);
    } catch {
      return false;
    }
  });

  // Database Synced Containers Data (Instant LocalStore Cache Priming)
  const [matchesData, setMatchesData] = useState(() => {
    const cached = StorageCache.get('matches', DEFAULT_MATCHES_BACKUP);
    return Array.isArray(cached) && cached.length > 0 ? cached : DEFAULT_MATCHES_BACKUP;
  });
  const [fixturesData, setFixturesData] = useState(() => {
    const cached = StorageCache.get('fixtures', DEFAULT_FIXTURES_BACKUP);
    return Array.isArray(cached) && cached.length > 0 ? cached : DEFAULT_FIXTURES_BACKUP;
  });
  const [trendingData, setTrendingData] = useState(() => {
    const cached = StorageCache.get('trending', DEFAULT_TRENDING_BACKUP);
    return Array.isArray(cached) && cached.length > 0 ? cached : DEFAULT_TRENDING_BACKUP;
  });
  const [liveMatchesData, setLiveMatchesData] = useState([]);
  const [matchCommentsStore, setMatchCommentsStore] = useState(() => StorageCache.get('comments_store', {}));
  const [matchReactionsMap, setMatchReactionsMap] = useState(() => StorageCache.get('reactions_map', {}));

  // Search & Modal States
  const [activeMatchTab, setActiveMatchTab] = useState('future');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [googleQuery, setGoogleQuery] = useState('');
  const [iframeSrc, setIframeSrc] = useState('about:blank');
  
  // Active Interactive Modals
  const [activeCommentMatch, setActiveCommentMatch] = useState(null);
  const [activeMatchDetail, setActiveMatchDetail] = useState(null);
  const [adminModalState, setAdminModalState] = useState({ open: false, section: null, item: null });

  // Inputs
  const [commentInput, setCommentInput] = useState('');
  
  // Toast & Loader
  const [toast, setToast] = useState({ show: false, message: '', isError: false });
  const [loader, setLoader] = useState({ active: false, text: '', progress: 0 });
  const toastTimerRef = useRef(null);

  // ---------------------------------------------------------------------------
  // 1. INITIALIZATION & LIFECYCLE HOOKS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setClock(now.toLocaleTimeString([], { hour12: false }));
    }, 1000);

    let isMounted = true;

    async function initializeSystem() {
      // Background quiet sync without full page blocking loader
      const sessionValid = await checkUserSession();
      if (!sessionValid) return;

      await loadDatabaseReactions();

      await Promise.all([
        loadMatchesFromDB(),
        loadFixturesFromDB(),
        loadTrendingFromDB(),
        loadDatabaseComments(),
        fetchUserStatuses().then(st => { if (isMounted && Array.isArray(st)) setDashboardStatuses(st); })
      ]);

      if (!isMounted) return;
      activeChannels = setupDatabaseRealtimeSubscriptions();
    }

    let activeChannels = [];
    initializeSystem();

    // Listen for background global data sync events
    const handleGlobalSync = (e) => {
      const { key, data } = e.detail || {};
      if (key === 'matches' && Array.isArray(data)) {
        setMatchesData(data.map(normalizeMatch));
      } else if (key === 'fixtures' && Array.isArray(data)) {
        setFixturesData(data);
      } else if (key === 'trending' && Array.isArray(data)) {
        setTrendingData(data);
      }
    };
    window.addEventListener('mtl_data_synced', handleGlobalSync);

    // Listen for auth state changes globally
    const { data: { subscription: authSubscription } } = db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/auth', { replace: true });
      } else if (session?.user) {
        setCurrentUser(session.user);
      }
    });

    const liveTimer = setInterval(() => {
      updateLiveMatches();
    }, 1000);

    const unsubStatuses = subscribeUserStatuses((st) => {
      if (isMounted && Array.isArray(st)) setDashboardStatuses(st);
    });

    return () => {
      clearInterval(clockInterval);
      clearInterval(liveTimer);
      unsubStatuses();
      window.removeEventListener('mtl_data_synced', handleGlobalSync);
      authSubscription?.unsubscribe();
      if (activeChannels && activeChannels.length > 0) {
        activeChannels.forEach(ch => {
          try { db.removeChannel(ch); } catch (_) {}
        });
      }
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    updateLiveMatches();
  }, [matchesData]);

  // High-Performance Static Background & Video Backdrop Engine
  useEffect(() => {
    // Static background mode active - zero CPU/GPU animation loops to prevent hungs, glitches and loading lag.
  }, []);

  // ---------------------------------------------------------------------------
  // 2. AUTH & SESSION CONTROL (SUPABASE SESSION BASED)
  // ---------------------------------------------------------------------------
  async function checkUserSession() {
    try {
      // Check active session directly from Supabase Client
      const { data: { session }, error: sessionError } = await db.auth.getSession();
      
      if (sessionError || !session || !session.user) {
        navigate('/auth', { replace: true });
        return false;
      }

      const user = session.user;
      setCurrentUser(user);
      const email = user.email || 'user@mtl.com';

      const { data: profile } = await db
        .from('profiles')
        .select('username, name, full_name, email, role, is_admin, admin')
        .eq('id', user.id)
        .maybeSingle();

      const username = profile?.full_name || profile?.name || profile?.username || user.user_metadata?.full_name || email.split('@')[0];
      const isUserAdmin = Boolean(
        profile?.role === 'admin' || 
        profile?.is_admin === true || 
        profile?.admin === true || 
        profile?.is_global_admin === true ||
        email.endsWith('@admin.com') ||
        email.toLowerCase() === 'lennoxmourice@gmail.com' ||
        email.toLowerCase() === 'moricetonnylennox@gmail.com'
      );

      setUserProfile({
        username,
        email: profile?.email || email,
        role: isUserAdmin ? 'admin' : 'user',
        createdAt: user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'
      });
      setIsAdmin(isUserAdmin);

      return true;
    } catch (err) {
      navigate('/auth', { replace: true });
      return false;
    }
  }

  async function signOutUser() {
    await db.auth.signOut();
    showToast("Signed out successfully. Redirecting...", false);
    setTimeout(() => navigate('/auth', { replace: true }), 600);
  }

  // ---------------------------------------------------------------------------
  // 3. UI HELPERS & SECURITY LOCKS
  // ---------------------------------------------------------------------------
  function showToast(message, isError = true) {
    setToast({ show: true, message, isError });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
  }

  function handleStatusCreated(newStatus) {
    setDashboardStatuses(prev => [newStatus, ...prev.filter(s => s.id !== newStatus.id)]);
    showToast("Status published live across all registered users!", false);
    fetchUserStatuses().then(list => {
      if (Array.isArray(list)) setDashboardStatuses(list);
    });
  }

  const myStatus = dashboardStatuses.find(s => {
    if (currentUser?.id && s.userId === currentUser.id) return true;
    if (userProfile?.username && s.userName && s.userName.toLowerCase() === userProfile.username.toLowerCase()) return true;
    return false;
  });

  function triggerFloatingLoader(text, progress) {
    setLoader({ active: true, text, progress });
  }

  function hideFloatingLoader() {
    setLoader(prev => ({ ...prev, active: false }));
  }

  function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  function verifyHackLocksAndSanitize(payload) {
    if (typeof payload === 'object' && payload !== null) {
      for (let key in payload) {
        if (typeof payload[key] === 'string') {
          const low = payload[key].toLowerCase();
          if (low.includes('<script') || low.includes('javascript:') || low.includes('onerror=') || low.includes('onload=')) {
            showToast("🚨 XSS Injection Attempt Blocked!");
            throw new Error("Security Violation: Malicious payload detected.");
          }
          payload[key] = sanitizeInput(payload[key]);
        }
      }
    }
    return payload;
  }

  function getFirstNameInitials(name) {
    if (!name) return 'MT';
    const cleanName = String(name).trim();
    const parts = cleanName.split(/\s+/);
    const firstName = parts[0];
    return firstName.length >= 2 ? firstName.substring(0, 2).toUpperCase() : firstName.charAt(0).toUpperCase();
  }

  function getTeamBadge(teams) {
    if (!teams) return '⚽';
    const firstTeam = String(teams).split(/\s+vs\.?\s+/i)[0].trim();
    const words = firstTeam.split(/\s+/).filter(Boolean);
    return words.length >= 2 ? (words[0].charAt(0) + words[1].charAt(0)).toUpperCase() : firstTeam.substring(0, 3).toUpperCase();
  }

  function formatOdds(decimalVal) {
    const val = parseFloat(decimalVal);
    if (!Number.isFinite(val) || val <= 1) return 'N/A';
    return val.toFixed(2);
  }

  // ---------------------------------------------------------------------------
  // 4. SUPABASE DATABASE SYNC & REALTIME SUBSCRIPTIONS
  // ---------------------------------------------------------------------------
  function setupDatabaseRealtimeSubscriptions() {
    const channels = [];

    const chComments = db.channel(`dashboard-comments-${Math.random().toString(36).substring(2, 9)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async () => {
        await loadDatabaseComments();
      })
      .subscribe();
    channels.push(chComments);

    const chReactions = db.channel(`dashboard-reactions-${Math.random().toString(36).substring(2, 9)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, async () => {
        await loadDatabaseReactions();
        await loadMatchesFromDB();
      })
      .subscribe();
    channels.push(chReactions);

    const chMatches = db.channel(`dashboard-matches-${Math.random().toString(36).substring(2, 9)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, async () => {
        await loadMatchesFromDB();
      })
      .subscribe();
    channels.push(chMatches);

    const chFixtures = db.channel(`dashboard-fixtures-${Math.random().toString(36).substring(2, 9)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, async () => {
        await loadFixturesFromDB();
      })
      .subscribe();
    channels.push(chFixtures);

    const chTrending = db.channel(`dashboard-trending-${Math.random().toString(36).substring(2, 9)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trending' }, async () => {
        await loadTrendingFromDB();
      })
      .subscribe();
    channels.push(chTrending);

    return channels;
  }

  async function loadDatabaseReactions() {
    try {
      const { data, error } = await db.from('reactions').select('*');
      if (error) return;
      if (Array.isArray(data)) {
        const map = {};
        data.forEach(r => {
          const mId = String(r.match_id);
          if (!map[mId]) map[mId] = [];
          map[mId].push({
            user_id: r.user_id,
            username: r.username || 'User',
            reaction: r.reaction_type
          });
        });
        setMatchReactionsMap(map);
      }
    } catch (e) { console.error(e); }
  }

  async function loadDatabaseComments() {
    try {
      const { data, error } = await db.from('comments').select('*').order('created_at', { ascending: true });
      if (error) return;
      if (Array.isArray(data)) {
        const store = {};
        data.forEach(c => {
          const mId = String(c.match_id || c.matchId);
          if (!store[mId]) store[mId] = [];
          store[mId].push({
            id: c.id,
            user_id: c.user_id,
            user: c.username || c.user || 'User',
            comment: c.comment || c.text || '',
            time: c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
          });
        });
        setMatchCommentsStore(store);
      }
    } catch (err) { console.error(err); }
  }

  async function loadMatchesFromDB() {
    try {
      const { data, error } = await db.from('matches').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        setMatchesData(data.map(normalizeMatch));
        return;
      }
    } catch (error) {}

    // Fallback to cache / default backup
    try {
      const fallback = StorageCache.get('matches', DEFAULT_MATCHES_BACKUP);
      if (Array.isArray(fallback) && fallback.length > 0) {
        setMatchesData(fallback.map(normalizeMatch));
      }
    } catch (e) {}
  }

  function normalizeMatch(match) {
    const parsedOdds = parseFloat(match.decimal_odds);
    const parsedHome = parseFloat(match.prob_home || match.home_win_prob);
    const parsedDraw = parseFloat(match.prob_draw || match.draw_prob);
    const parsedAway = parseFloat(match.prob_away || match.away_win_prob);
    const parsedStars = parseInt(match.confidence_stars, 10);

    const mId = String(match.id);
    const userReactions = matchReactionsMap[mId] || [];
    const computedReactions = {
      fire: userReactions.filter(r => r.reaction === 'fire').length,
      heart: userReactions.filter(r => r.reaction === 'heart').length,
      dislike: userReactions.filter(r => r.reaction === 'dislike').length
    };

    const fallbackReactions = match.reactions && typeof match.reactions === 'object' ? match.reactions : { fire: 0, heart: 0, dislike: 0 };

    return {
      ...match,
      decimal_odds: Number.isFinite(parsedOdds) ? parsedOdds : 1.95,
      prob_home: Number.isFinite(parsedHome) ? Math.max(0, Math.min(100, parsedHome)) : 50,
      prob_draw: Number.isFinite(parsedDraw) ? Math.max(0, Math.min(100, parsedDraw)) : 25,
      prob_away: Number.isFinite(parsedAway) ? Math.max(0, Math.min(100, parsedAway)) : 25,
      confidence_stars: Number.isFinite(parsedStars) ? Math.max(0, Math.min(5, parsedStars)) : 4,
      reactions: {
        fire: Math.max(computedReactions.fire, Number(fallbackReactions.fire) || 0),
        heart: Math.max(computedReactions.heart, Number(fallbackReactions.heart) || 0),
        dislike: Math.max(computedReactions.dislike, Number(fallbackReactions.dislike) || 0)
      }
    };
  }

  async function loadFixturesFromDB() {
    try {
      const { data, error } = await db.from('fixtures').select('*').order('match_date', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        setFixturesData(data.map(f => ({
          ...f,
          match_date: f.match_date ?? f.date ?? '',
          match_time: f.match_time ?? f.time ?? '',
          badge: f.badge || getTeamBadge(f.teams)
        })));
        return;
      }
    } catch (error) {}

    try {
      const fallback = StorageCache.get('fixtures', DEFAULT_FIXTURES_BACKUP);
      if (Array.isArray(fallback) && fallback.length > 0) {
        setFixturesData(fallback.map(f => ({
          ...f,
          match_date: f.match_date ?? f.date ?? '',
          match_time: f.match_time ?? f.time ?? '',
          badge: f.badge || getTeamBadge(f.teams)
        })));
      }
    } catch (e) {}
  }

  async function loadTrendingFromDB() {
    try {
      const { data, error } = await db.from('trending').select('*').order('rank', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        setTrendingData(data.map(item => ({
          ...item,
          rank: item.rank ?? '',
          title: item.title ?? item.topic ?? '',
          comments_count: item.comments_count ?? item.posts_count ?? 0
        })));
        return;
      }
    } catch (error) {}

    try {
      const fallback = StorageCache.get('trending', DEFAULT_TRENDING_BACKUP);
      if (Array.isArray(fallback) && fallback.length > 0) {
        setTrendingData(fallback.map(item => ({
          ...item,
          rank: item.rank ?? '',
          title: item.title ?? item.topic ?? '',
          comments_count: item.comments_count ?? item.posts_count ?? 0
        })));
      }
    } catch (e) {}
  }

  // Live Matches Engine Logic
  function updateLiveMatches() {
    const now = new Date();
    const live = matchesData.filter(m => isMatchCurrentlyLive(m, now)).map(buildLiveMatch);
    setLiveMatchesData(live);
  }

  function isMatchCurrentlyLive(match, now = new Date()) {
    if (!match) return false;
    const status = String(match.status || '').trim().toUpperCase();
    if (['LIVE', 'IN_PLAY', 'IN-PLAY', 'PLAYING'].includes(status)) return true;
    if (['FT', 'FINISHED', 'FULL TIME', 'COMPLETED', 'POSTPONED', 'CANCELLED'].includes(status)) return false;
    if (!match.match_date || !match.match_time) return false;
    const kickoff = parseMatchDateTime(match.match_date, match.match_time);
    if (!kickoff) return false;
    const diff = now.getTime() - kickoff.getTime();
    return diff >= 0 && diff <= 120 * 60 * 1000;
  }

  function parseMatchDateTime(dateValue, timeValue) {
    try {
      let dateText = String(dateValue).trim();
      let timeText = String(timeValue).trim().replace(/(\.\d+)?$/, '');
      if (/^\d{2}:\d{2}$/.test(timeText)) timeText += ':00';
      const parsed = new Date(`${dateText}T${timeText}`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch { return null; }
  }

  function calculateLiveMinute(match) {
    const status = String(match.status || '').toUpperCase();
    if (status === 'LIVE' && match.minute !== undefined && match.minute !== null) {
      const parsedMin = parseInt(match.minute, 10) || 0;
      return `${Math.min(parsedMin, 92)}'`;
    }
    const kickoff = parseMatchDateTime(match.match_date, match.match_time);
    if (!kickoff) return "LIVE";
    
    const elapsed = Math.floor((Date.now() - kickoff.getTime()) / 60000);
    if (elapsed <= 0) return "1'";
    return `${Math.min(elapsed, 92)}'`;
  }

  function buildLiveMatch(match) {
    const minuteStr = calculateLiveMinute(match);
    const minuteVal = parseInt(minuteStr, 10) || 0;
    const progress = Math.min(Math.round((minuteVal / 90) * 100), 100);

    return {
      ...match,
      id: match.id,
      league: match.league || match.competition || 'FOOTBALL',
      teams: match.teams || 'Unknown Teams',
      score: match.score || match.final_score || '0 - 0',
      minute: minuteStr, 
      progress,
      details: match.live_details || match.details || match.analysis_text || 'Live match intelligence available.'
    };
  }

  // ---------------------------------------------------------------------------
  // 5. INTERACTIVE EVENT HANDLERS & DB MUTATIONS
  // ---------------------------------------------------------------------------
  async function reactToMatch(matchId, type) {
    const mId = String(matchId);
    const userId = currentUser?.id || 'guest';

    setMatchesData(prevMatches => prevMatches.map(m => {
      if (String(m.id) === mId) {
        const reactions = { ...(m.reactions || { fire: 0, heart: 0, dislike: 0 }) };
        reactions[type] = (reactions[type] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    }));

    // Save to Firebase Firestore & backend database
    try {
      await saveMatchReaction(mId, type, userId);
    } catch (e) {}

    try {
      const isValidUuid = typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      await db.from('reactions').insert([{ 
        match_id: String(matchId), 
        user_id: isValidUuid ? userId : null, 
        username: userProfile?.username || 'Fan', 
        reaction_type: type 
      }]);
    } catch (e) { console.error(e); }
  }

  async function submitComment() {
    if (!commentInput.trim() || !activeCommentMatch) return;
    
    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({
        match_id: activeCommentMatch.id,
        username: userProfile.username,
        comment: commentInput.trim(),
        user_id: currentUser?.id
      });

      triggerFloatingLoader("posting commentary...", 50);
      const { error } = await db.from('comments').insert([sanitizedPayload]);

      if (!error) {
        showToast("Comment published successfully!", false);
        setCommentInput('');
        await loadDatabaseComments();
      } else {
        showToast("Failed to post comment.");
      }
    } catch (err) {
      showToast(err.message || "Security exception on posting comment.");
    } finally {
      hideFloatingLoader();
    }
  }

  async function saveAdminEntry(e) {
    e.preventDefault();
    const section = adminModalState.section;
    const item = adminModalState.item;

    try {
      triggerFloatingLoader("persisting record...", 60);

      if (section === 'matches') {
        const payload = verifyHackLocksAndSanitize({
          teams: document.getElementById('admin-teams')?.value?.trim() || 'Team A vs Team B',
          league: document.getElementById('admin-league')?.value?.trim() || 'Premier League',
          match_date: document.getElementById('admin-date')?.value?.trim() || new Date().toISOString().split('T')[0],
          match_time: document.getElementById('admin-time')?.value?.trim() || '20:00',
          prediction: document.getElementById('admin-prediction')?.value?.trim() || 'Home Win',
          decimal_odds: parseFloat(document.getElementById('admin-odds')?.value) || 2.0,
          prob_home: parseFloat(document.getElementById('admin-prob-home')?.value) || 45,
          prob_draw: parseFloat(document.getElementById('admin-prob-draw')?.value) || 25,
          prob_away: parseFloat(document.getElementById('admin-prob-away')?.value) || 30,
          analysis_text: document.getElementById('admin-analysis')?.value?.trim() || 'Match analysis pending.'
        });

        if (item?.id) {
          await db.from('matches').update(payload).eq('id', item.id);
        } else {
          await db.from('matches').insert([payload]);
        }
        await loadMatchesFromDB();

      } else if (section === 'fixtures') {
        const payload = verifyHackLocksAndSanitize({
          teams: document.getElementById('admin-teams')?.value?.trim() || 'Team A vs Team B',
          league: document.getElementById('admin-league')?.value?.trim() || 'Premier League',
          match_date: document.getElementById('admin-date')?.value?.trim() || new Date().toISOString().split('T')[0],
          match_time: document.getElementById('admin-time')?.value?.trim() || '20:00',
          badge: getTeamBadge(document.getElementById('admin-teams')?.value || '')
        });

        if (item?.id) {
          await db.from('fixtures').update(payload).eq('id', item.id);
        } else {
          await db.from('fixtures').insert([payload]);
        }
        await loadFixturesFromDB();

      } else if (section === 'trending') {
        const payload = verifyHackLocksAndSanitize({
          rank: parseInt(document.getElementById('admin-rank').value, 10) || 1,
          title: document.getElementById('admin-title').value.trim()
        });

        if (item?.id) {
          await db.from('trending').update(payload).eq('id', item.id);
        } else {
          await db.from('trending').insert([payload]);
        }
        await loadTrendingFromDB();
      }

      showToast("Database entry saved!", false);
      setAdminModalState({ open: false, section: null, item: null });
    } catch (err) {
      showToast(err.message || "Failed to save record.");
    } finally {
      hideFloatingLoader();
    }
  }

  async function deleteRecord(table, id) {
    if (!confirm(`Are you sure you want to delete this record from [${table}]?`)) return;
    try {
      triggerFloatingLoader(`Removing from ${table}...`, 50);
      await db.from(table).delete().eq('id', id);
      if (table === 'matches') await loadMatchesFromDB();
      if (table === 'fixtures') await loadFixturesFromDB();
      if (table === 'trending') await loadTrendingFromDB();
      showToast("Record removed from database.", false);
    } catch (err) {
      showToast("Delete operation failed.");
    } finally {
      hideFloatingLoader();
    }
  }

  const openSearchModal = (query = '') => {
    const q = query || googleQuery || 'todays top predictions';
    setGoogleQuery(q);
    setIsSearchOpen(true);
  };

  const executeGoogleSearch = () => {
    if (!googleQuery.trim()) { showToast("Enter a search term."); return; }
    setIframeSrc(`https://www.google.com/search?igu=1&q=${encodeURIComponent(googleQuery + ' football ' + activeSearchFilter)}`);
  };

  const navigateTo = (route) => {
    const routeMap = {
      fixtures: '/fixtures',
      community: '/group-chats',
      'group-chats': '/group-chats',
      'past-predictions': '/past-predictions',
      'ai-predictions': '/ai-predictions',
      news: '/news',
      tv: '/tv',
      live: '/live',
      trending: '/trending',
      notifications: '/notifications',
      predictions: '/predictions',
      clubs: '/clubs',
      'other-apps': '/clubs',
      home: '/dashboard'
    };
    navigate(routeMap[route] || '/dashboard');
  };

  const getFilteredMatches = () => {
    const now = new Date();
    let filtered = matchesData.filter(m => {
      const isFT = String(m.status || '').toUpperCase() === 'FT';
      const kickoff = parseMatchDateTime(m.match_date, m.match_time);
      const isPastDate = kickoff ? kickoff.getTime() < now.getTime() - (120 * 60 * 1000) : false;
      const isPastMatch = isFT || isPastDate;
      return activeMatchTab === 'past' ? isPastMatch : !isPastMatch;
    });

    if (matchSearchQuery) {
      const query = matchSearchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        String(m.teams || '').toLowerCase().includes(query) ||
        String(m.match_date || '').toLowerCase().includes(query) ||
        String(m.league || '').toLowerCase().includes(query)
      );
    }
    return filtered;
  };

  return (
    <div className="dashboard-root dashboard-view-transition">
      <style>{`
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100vh;
          background: transparent;
          overflow-x: hidden;
        }

        .dashboard-root {
          box-sizing: border-box;
          --bg: transparent;
          --bg-2: rgba(16, 29, 46, 0.72);
          --surface: rgba(16, 29, 46, 0.75);
          --border: rgba(255, 255, 255, 0.12);
          --border-green: rgba(16, 185, 129, 0.6);
          --text: #ffffff;
          --muted: #c4d2e3;
          --green: #10b981;
          --green-glow: rgba(16, 185, 129, 0.35);
          --amber: #f59e0b;
          --red: #ef4444;
          --blue: #3b82f6;
          min-height: 100vh;
          width: 100%;
          color: var(--text);
          position: relative;
          background: #0a1422;
        }

        #bg-4d-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 0;
          pointer-events: none;
        }

        .background-grid {
          position: fixed;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 35px 35px;
        }

        .dashboard-wrapper {
          position: relative;
          z-index: 10;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 16px 24px 16px;
        }

        /* UPDATED MINIMAL APP BAR */
        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          backdrop-filter: blur(12px);
          margin-bottom: 24px;
        }

        .logo-box {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .logo-badge {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #10b981, #047857);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #000;
          box-shadow: 0 0 15px var(--green-glow);
        }

        .profile-logo-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #3b82f6);
          border: 2px solid rgba(255, 255, 255, 0.2);
          color: #000;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 0 12px var(--green-glow);
        }

        .profile-logo-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 20px var(--green-glow);
          border-color: var(--green);
        }

        .cyber-banner {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.02));
          border: 1px solid var(--border-green);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        /* TAB NAVIGATION HUB CARDS-GRID */
        .hub-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .hub-card {
          background: rgba(16, 29, 46, 0.85);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.25s ease;
          position: relative;
          backdrop-filter: blur(8px);
        }

        .hub-card:hover {
          border-color: var(--green);
          transform: translateY(-3px);
          background: rgba(16, 185, 129, 0.08);
          box-shadow: 0 8px 20px var(--green-glow);
        }

        .hub-card .card-icon-svg {
          width: 26px;
          height: 26px;
          stroke: var(--green);
          margin-bottom: 12px;
          transition: stroke 0.2s;
        }

        .hub-card:hover .card-icon-svg {
          stroke: #34d399;
        }

        .hub-card .title {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
        }

        .hub-card .sub {
          font-size: 10px;
          color: var(--muted);
          margin-top: 2px;
        }

        .pro-card {
          background: #101d2e;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .pro-card:hover {
          border-color: var(--green);
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.15);
        }

        .btn-cyber {
          background: var(--green);
          color: #000;
          font-weight: 700;
          font-size: 12px;
          padding: 8px 16px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .btn-cyber:hover {
          background: #34d399;
          box-shadow: 0 0 15px var(--green-glow);
          transform: translateY(-1px);
        }

        .btn-outline {
          background: transparent;
          color: var(--text);
          border: 1px solid var(--border);
          font-weight: 600;
          font-size: 12px;
          padding: 8px 14px;
          border-radius: 10px;
          cursor: pointer;
          transition: 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btn-outline:hover {
          border-color: var(--green);
          color: var(--green);
        }

        /* ENHANCED PROMINENT SEE-MORE BUTTONS */
        .see-more-btn {
          width: 100%;
          padding: 12px;
          margin-top: 14px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.03));
          border: 1px solid var(--border-green);
          border-radius: 10px;
          color: var(--green);
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .see-more-btn:hover {
          background: var(--green);
          color: #000;
          box-shadow: 0 4px 15px var(--green-glow);
          transform: translateY(-2px);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5, 10, 18, 0.85);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .modal-content {
          background: #101d2e;
          border: 1px solid var(--border-green);
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        }

        .floating-loader {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #101d2e;
          border: 1px solid var(--green);
          border-radius: 12px;
          padding: 12px 20px;
          z-index: 2000;
          box-shadow: 0 10px 30px var(--green-glow);
        }

        .water-progress-container {
          width: 100%;
          height: 8px;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
        }

        .water-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #059669 0%, #10b981 50%, #34d399 100%);
          border-radius: 9999px;
          position: relative;
          transition: width 0.75s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.45);
        }

        .water-progress-bar::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: progress-shimmer 2.4s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes progress-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @media (max-width: 900px) {
          .main-content-grid {
            grid-template-columns: 1fr !important;
          }
          .match-col {
            grid-column: span 1 !important;
          }
        }
      `}</style>

      <div className="background-grid" />

      {/* Main Dashboard Layout */}
      <div className="dashboard-wrapper">
        
        {/* 3D PHYSICAL MATCH INTELLIGENCE SHOWCASE DECK */}
        <section className="mb-6">
          <PhysicalCard variant="carbon" withBolts={true} className="p-5 sm:p-6">
            <div className="w-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
                <span className="text-[11px] font-black tracking-widest text-emerald-300 uppercase">
                  MTL FOOTBALL INTELLIGENCE CHASSIS
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                Match Intelligence Command
              </h1>
              
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed mb-4">
                Precision manufactured odds calculations, real-time match fixtures, verified neural score predictions, and encrypted community fan rooms.
              </p>

              {/* Tactile Hardware Metric Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                <div className="p-3 rounded-xl bg-[#070b14] border border-[#1e293b] shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)]">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Matches</div>
                  <div className="text-sm sm:text-base font-extrabold text-white tabular-nums mt-0.5">
                    {matchesData.length} LIVE/FIX
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#070b14] border border-[#1e293b] shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)]">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Accuracy Ratio</div>
                  <div className="text-sm sm:text-base font-extrabold text-amber-400 tabular-nums mt-0.5">
                    87.4%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#070b14] border border-[#1e293b] shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)]">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Status Broadcast</div>
                  <div className="text-sm sm:text-base font-extrabold text-emerald-400 tabular-nums mt-0.5">
                    24H REEL
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#070b14] border border-[#1e293b] shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)]">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Community Feed</div>
                  <div className="text-sm sm:text-base font-extrabold text-cyan-400 tabular-nums mt-0.5">
                    {dashboardStatuses.length} ACTIVE
                  </div>
                </div>
              </div>

              {/* Admin Physical Triggers */}
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#1e293b]">
                  <TactileButton variant="emerald" size="sm" onClick={() => setAdminModalState({ open: true, section: 'matches', item: null })}>
                    + Create Match
                  </TactileButton>
                  <TactileButton variant="gold" size="sm" onClick={() => setAdminModalState({ open: true, section: 'fixtures', item: null })}>
                    + Add Fixture
                  </TactileButton>
                  <TactileButton variant="obsidian" size="sm" onClick={() => setAdminModalState({ open: true, section: 'trending', item: null })}>
                    + Post Story
                  </TactileButton>
                </div>
              )}
            </div>
          </PhysicalCard>
        </section>

        {/* ==================================================================== */}
        {/* REAL MATCH STATUS CARDS & COMMUNITY STORIES (MATCHES PROFILE CONTAINER) */}
        {/* ==================================================================== */}
        <section className="mb-8 space-y-6 animate-in fade-in duration-150">
          <div className="bg-[#0b1322] border border-slate-800/90 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 relative overflow-hidden">
            {/* Precision Milled Top Chamfer */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" aria-hidden="true" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-white font-['Orbitron'] flex items-center gap-2.5 uppercase tracking-wider">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  REAL MATCH STATUS CARDS (STORED IN FIREBASE)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Every status is a verified match prediction card stored in Firestore and viewable like WhatsApp Stories for 24 hours.
                </p>
              </div>

              <button
                onClick={() => setIsCreateStatusOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs font-['Orbitron'] tracking-wider shadow-lg shadow-emerald-950/40 transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>ADD MATCH STATUS</span>
              </button>
            </div>

            {/* Circular Reel Bar */}
            <StatusReel
              statuses={dashboardStatuses}
              currentUser={currentUser}
              userProfile={userProfile}
              disableViewerModal={true}
              onStatusClick={() => navigate('/profile')}
              onRefreshStatuses={async () => {
                const list = await fetchUserStatuses();
                if (Array.isArray(list)) setDashboardStatuses(list);
              }}
            />

            {/* My Status Spotlight */}
            {myStatus ? (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-black border border-cyan-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-['Orbitron'] font-bold text-cyan-400 uppercase tracking-wider">
                      YOUR PUBLISHED STATUS IS LIVE IN FIREBASE
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Expires in 24 hours</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">{myStatus.league}</span>
                    <h3 className="text-lg sm:text-xl font-black text-white font-['Orbitron']">{myStatus.matchFixture}</h3>
                    <div className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>{myStatus.predictionPick}</span>
                    </div>
                    {myStatus.caption && (
                      <p className="text-xs text-slate-300 italic pt-1">"{myStatus.caption}"</p>
                    )}
                  </div>

                  {myStatus.predictedScore && (
                    <div className="bg-black/50 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">PREDICTED SCORE</span>
                      <div className="text-3xl font-black font-['Orbitron'] text-cyan-300 my-1">{myStatus.predictedScore}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{myStatus.decimalOdds ? Number(myStatus.decimalOdds).toFixed(2) : '2.00'}x Odds</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-cyan-300 font-semibold">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      {myStatus.viewsCount || 1} Views
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-rose-300 font-semibold">
                      <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                      {myStatus.likesCount || 0} Likes
                    </span>
                  </div>

                  <button
                    onClick={() => navigate('/profile')}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs font-['Orbitron'] transition-colors cursor-pointer"
                  >
                    VIEW ON PROFILE
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4 rounded-3xl bg-slate-900/50 border border-dashed border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase font-['Orbitron']">
                  NO ACTIVE STATUS CARD PUBLISHED
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Post your prediction for upcoming fixtures! It will be stored in Firebase and rendered across the community WhatsApp status reels.
                </p>
                <button
                  onClick={() => setIsCreateStatusOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-emerald-400 transition-colors"
                >
                  Post Match Status Now
                </button>
              </div>
            )}

            {/* Real Status Cards List */}
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-black text-slate-300 font-['Orbitron'] uppercase tracking-wider flex items-center gap-2">
                <span>ACTIVE COMMUNITY STATUSES</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono text-[10px]">
                  {dashboardStatuses.length}
                </span>
              </h3>

              {dashboardStatuses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {dashboardStatuses.map((st, i) => (
                    <div
                      key={st.id || i}
                      onClick={() => navigate('/profile')}
                      className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer shadow-lg space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={st.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${st.userId}`}
                            alt={st.userName}
                            className="w-8 h-8 rounded-full object-cover bg-slate-800 border border-slate-700"
                          />
                          <span className="text-xs font-bold text-white truncate max-w-[120px]">{st.userName}</span>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 font-mono">
                          {st.predictedScore || (st.statusType === 'reel' ? 'REEL' : st.statusType === 'image' ? 'IMAGE' : 'PICK')}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-mono block">{st.league}</span>
                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                          {st.matchFixture}
                        </h4>
                        <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{st.predictionPick}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-cyan-400" />
                            {st.viewsCount || 1}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-400" />
                            {st.likesCount || 0}
                          </span>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold">{st.decimalOdds ? Number(st.decimalOdds).toFixed(2) : '2.00'}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                  No active community match statuses in the database. Be the first to publish one!
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ALL AVAILABLE PAGES NAVIGATION HUB GRID - PHYSICAL TACTILE TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
          {/* User Profile & Status */}
          <PhysicalCard variant="obsidian" interactive={true} onClick={() => navigate('/profile')} className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between w-full mb-3">
              <EmbossedIcon mount="badge" size="sm" icon={
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              } />
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-inner">
                PROFILE
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Profile & Status</div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Bio & match reels</div>
            </div>
          </PhysicalCard>

          {/* 1. Match Predictions */}
          <PhysicalCard variant="obsidian" interactive={true} onClick={() => navigateTo('predictions')} className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between w-full mb-3">
              <EmbossedIcon mount="gold" size="sm" icon={
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              } />
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-inner">
                ODDS
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Predictions</div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Full odds & insights</div>
            </div>
          </PhysicalCard>

          {/* 2. Other Apps */}
          <PhysicalCard variant="obsidian" interactive={true} onClick={() => navigateTo('clubs')} className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between w-full mb-3">
              <EmbossedIcon mount="badge" size="sm" icon={
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
              } />
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-inner">
                PORTALS
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Other Apps</div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Betting & virtuals</div>
            </div>
          </PhysicalCard>

          {/* 3. AI Predictions */}
          <PhysicalCard variant="obsidian" interactive={true} onClick={() => navigateTo('ai-predictions')} className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between w-full mb-3">
              <EmbossedIcon mount="badge" size="sm" icon={
                <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              } />
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-inner">
                AI MODEL
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">AI Predictions</div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Neural win-rates</div>
            </div>
          </PhysicalCard>

          {/* 4. Live TV */}
          <PhysicalCard variant="obsidian" interactive={true} onClick={() => navigateTo('tv')} className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between w-full mb-3">
              <EmbossedIcon mount="badge" size="sm" icon={
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              } />
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 shadow-inner">
                LIVE
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">LIVE TV</div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Sports streams</div>
            </div>
          </PhysicalCard>

          {/* 5. Fixtures Grid */}
          <PhysicalCard variant="obsidian" interactive={true} onClick={() => navigateTo('fixtures')} className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between w-full mb-3">
              <EmbossedIcon mount="badge" size="sm" icon={
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              } />
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-inner">
                CALENDAR
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Fixtures</div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Schedules & times</div>
            </div>
          </PhysicalCard>

          {/* 6. Group Chats */}
          <PhysicalCard variant="obsidian" interactive={true} onClick={() => navigateTo('group-chats')} className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between w-full mb-3">
              <EmbossedIcon mount="badge" size="sm" icon={
                <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              } />
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 shadow-inner">
                CHAT
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Discussions</div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Fan communities</div>
            </div>
          </PhysicalCard>

          {/* 7. News & Feed */}
          <PhysicalCard variant="obsidian" interactive={true} onClick={() => navigateTo('news')} className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between w-full mb-3">
              <EmbossedIcon mount="badge" size="sm" icon={
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              } />
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30 shadow-inner">
                INTEL
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">News & Feed</div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Transfers & feed</div>
            </div>
          </PhysicalCard>

          {/* 8. Past Predictions */}
          <PhysicalCard variant="obsidian" interactive={true} onClick={() => navigateTo('past-predictions')} className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between w-full mb-3">
              <EmbossedIcon mount="badge" size="sm" icon={
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              } />
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-inner">
                HISTORY
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Past Records</div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Historical outcomes</div>
            </div>
          </PhysicalCard>

          {/* 9. Live Matches */}
          <PhysicalCard variant="obsidian" interactive={true} onClick={() => navigateTo('live')} className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between w-full mb-3">
              <EmbossedIcon mount="badge" size="sm" icon={
                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              } />
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 shadow-inner">
                IN-PLAY
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Live Matches</div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">In-play football</div>
            </div>
          </PhysicalCard>

          {/* 10. Trending */}
          <PhysicalCard variant="obsidian" interactive={true} onClick={() => navigateTo('trending')} className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between w-full mb-3">
              <EmbossedIcon mount="badge" size="sm" icon={
                <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              } />
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-inner">
                HOT
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Trending</div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Debriefs & debates</div>
            </div>
          </PhysicalCard>

          {/* 11. Google Scout Search */}
          <PhysicalCard variant="obsidian" interactive={true} onClick={() => setIsSearchOpen(true)} className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between w-full mb-3">
              <EmbossedIcon mount="gold" size="sm" icon={
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              } />
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-inner">
                SEARCH
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Google Scout</div>
              <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Live web scout</div>
            </div>
          </PhysicalCard>
        </div>

        {/* RECHARTS / D3 PERFORMANCE ANALYTICS & WIN-LOSS RATIO VISUALIZATION */}
        <div style={{ marginBottom: '24px' }}>
          <PerformanceAnalyticsChart isAdmin={isAdmin} />
        </div>

        {/* MAIN SUMMARY SECTION GRID */}
        <div className="main-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          
          {/* COLUMN 1: TOP 3 MATCH SUMMARY CARDS - PHYSICAL CHASSIS */}
          <div className="match-col" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <MaterialPanel texture="machined" withHeaderPlate={false} className="p-5">
              <div className="mb-4">
                <EngravedPlaque 
                  title="TOP 3 MATCH PREDICTIONS" 
                  subtitle="Immediate manufactured odds & verified AI intelligence"
                  variant="gold"
                  size="sm"
                />
              </div>

              {/* TOP 3 MATCH CARDS ONLY */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {getFilteredMatches().slice(0, 3).length === 0 ? (
                  <div style={{ textTransform: 'uppercase', textAlign: 'center', padding: '30px', color: 'var(--muted)', fontSize: '12px' }}>
                    No summary matches available right now.
                  </div>
                ) : (
                  getFilteredMatches().slice(0, 3).map(match => (
                    <PhysicalCard key={match.id} variant="obsidian" bgImage={getMatchCardBg(match.id || match.teams)} withSpecularEdge={true} className="p-4">
                      <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                        <span className="text-amber-400 font-extrabold tracking-wider uppercase">{match.league || 'LEAGUE'}</span>
                        <span className="font-mono tabular-nums text-slate-400">{match.match_date} • {match.match_time}</span>
                      </div>
                      
                      {/* Physical Recessed Team Badges Bay */}
                      {(() => {
                        const teamsVis = getFixtureTeamsVisuals(match.teams);
                        return (
                          <div className="flex items-center gap-3 my-2.5 p-2 rounded-xl bg-[#060a14] border border-[#1e293b] shadow-inner">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg bg-black/60 border border-amber-500/30 p-0.5 overflow-hidden shadow-inner shrink-0 flex items-center justify-center">
                                <img src={teamsVis.home.logoUrl} alt={teamsVis.home.name} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                              </div>
                              <span className="text-xs font-bold text-white truncate">{teamsVis.home.name}</span>
                            </div>
                            <span className="text-[10px] font-black text-amber-400 font-mono px-2 py-0.5 rounded bg-black/80 border border-amber-500/30">VS</span>
                            <div className="flex items-center justify-end gap-2 min-w-0 flex-1 text-right">
                              <span className="text-xs font-bold text-white truncate">{teamsVis.away.name}</span>
                              <div className="w-8 h-8 rounded-lg bg-black/60 border border-cyan-500/30 p-0.5 overflow-hidden shadow-inner shrink-0 flex items-center justify-center">
                                <img src={teamsVis.away.logoUrl} alt={teamsVis.away.name} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <h3 
                        style={{ fontSize: '15px', fontWeight: 800, margin: '6px 0', cursor: 'pointer' }} 
                        title="Click to search on Google"
                        onClick={() => openGoogleScout(match.teams + ' match intelligence ' + (match.league || ''))}
                        className="hover:text-amber-300 transition-colors inline-flex items-center gap-1.5 text-white"
                      >
                        <span>{match.teams}</span>
                        <Search className="w-3.5 h-3.5 text-amber-400 opacity-80" />
                      </h3>

                      {/* Recessed Inset Bay for Odds & Prediction */}
                      <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-[#060912] border border-[#1e293b] shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] my-3">
                        <span className="text-slate-200">Prediction: <strong className="text-amber-300 font-bold ml-1">{match.prediction}</strong></span>
                        <span className="text-amber-400 font-extrabold tracking-tight px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                          Odds: {formatOdds(match.decimal_odds)}
                        </span>
                      </div>

                      {/* Probability Distribution */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
                          <span>Win Probability Distribution</span>
                          <span className="font-mono tabular-nums text-slate-300">H: {match.prob_home}% | D: {match.prob_draw}% | A: {match.prob_away}%</span>
                        </div>
                        <div className="water-progress-container">
                          <div className="water-progress-bar" style={{ width: `${match.prob_home}%` }} />
                        </div>
                      </div>

                      {/* Card Actions - Tactile Triggers */}
                      <div className="flex flex-wrap justify-between items-center gap-2 mt-3 pt-3 border-t border-[#1e293b]">
                        <div className="flex items-center gap-2">
                          <TactileButton 
                            variant="obsidian" 
                            size="sm" 
                            active={Boolean(matchReactionsMap[String(match.id)]?.some(r => r.user_id === (currentUser?.id || 'guest') && r.reaction === 'fire'))}
                            onClick={() => reactToMatch(match.id, 'fire')}
                            className="!text-xs !py-1.5 !px-2.5 min-h-[34px] hover:!border-amber-400/60"
                          >
                            🔥 <span className="font-mono tabular-nums font-bold ml-1">{match.reactions?.fire || 0}</span>
                          </TactileButton>
                          <TactileButton 
                            variant="obsidian" 
                            size="sm" 
                            active={Boolean(matchReactionsMap[String(match.id)]?.some(r => r.user_id === (currentUser?.id || 'guest') && r.reaction === 'heart'))}
                            onClick={() => reactToMatch(match.id, 'heart')}
                            className="!text-xs !py-1.5 !px-2.5 min-h-[34px] hover:!border-rose-400/60"
                          >
                            ❤️ <span className="font-mono tabular-nums font-bold ml-1">{match.reactions?.heart || 0}</span>
                          </TactileButton>
                        </div>

                        <div className="flex items-center gap-2">
                          <TactileButton 
                            variant="obsidian" 
                            size="sm" 
                            onClick={() => setActiveCommentMatch(match)}
                            className="!text-xs !py-1.5 !px-2.5 min-h-[34px]"
                          >
                            💬 <span className="hidden sm:inline">Comments</span> ({(matchCommentsStore[match.id] || []).length})
                          </TactileButton>
                          <TactileButton 
                            variant="emerald" 
                            size="sm" 
                            onClick={() => setActiveMatchDetail(match)}
                            className="!text-xs !py-1.5 !px-3 min-h-[34px] font-bold"
                          >
                            Details
                          </TactileButton>
                          {isAdmin && (
                            <TactileButton 
                              variant="obsidian" 
                              size="sm" 
                              onClick={() => deleteRecord('matches', match.id)}
                              className="!text-xs !py-1.5 !px-2.5 min-h-[34px] !text-red-400 hover:!border-red-500 hover:!bg-red-950/40"
                            >
                              Delete
                            </TactileButton>
                          )}
                        </div>
                      </div>
                    </PhysicalCard>
                  ))
                )}
              </div>

              {/* CLEAR PROMINENT SEE MORE BUTTON */}
              <button type="button" className="see-more-btn" onClick={() => navigateTo('predictions')}>
                View All Predictions Page →
              </button>
            </MaterialPanel>
          </div>

          {/* COLUMN 2: 4 FIXTURES & 4 TRENDING NEWS - PHYSICAL PANELS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 4 FIXTURES SUMMARY CONTAINER - PHYSICAL PANEL */}
            <MaterialPanel texture="machined" withHeaderPlate={false} className="p-4 sm:p-5">
              <div className="mb-3">
                <EngravedPlaque 
                  title="FIXTURES SCOUT (4)" 
                  subtitle="Upcoming kickoff schedule"
                  variant="titanium"
                  size="sm"
                />
              </div>

              <div style={{ flex: 1 }}>
                {fixturesData.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', padding: '12px' }}>No upcoming fixtures.</div>
                ) : (
                  fixturesData.slice(0, 4).map(fix => (
                    <PhysicalCard key={fix.id} variant="obsidian" bgImage={getFixtureCardBg(fix.id || fix.teams)} interactive={true} className="p-2.5 mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {(() => {
                          const vis = getTeamVisual(fix.teams);
                          return (
                            <div className="w-8 h-8 rounded-lg bg-black/60 border border-amber-500/30 p-0.5 overflow-hidden shadow-inner flex items-center justify-center shrink-0">
                              <img src={vis.logoUrl} alt={vis.name} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                            </div>
                          );
                        })()}
                        <div className="min-w-0">
                          <div 
                            title="Click to search on Google"
                            onClick={() => openGoogleScout(fix.teams + ' ' + (fix.league || '') + ' fixture schedule')}
                            className="text-xs font-bold text-white hover:text-amber-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer truncate"
                          >
                            <span className="truncate">{fix.teams}</span>
                            <Search className="w-3 h-3 text-amber-400 opacity-70 shrink-0" />
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium truncate">{fix.league}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <div className="text-xs text-amber-400 font-bold font-mono tabular-nums">{fix.match_time}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{fix.match_date}</div>
                      </div>
                    </PhysicalCard>
                  ))
                )}
              </div>

              {/* CLEAR PROMINENT SEE MORE BUTTON */}
              <button type="button" className="see-more-btn" onClick={() => navigateTo('fixtures')}>
                See More Fixtures →
              </button>
            </MaterialPanel>

            {/* 4 TRENDING NEWS CONTAINER - PHYSICAL PANEL */}
            <MaterialPanel texture="machined" withHeaderPlate={false} className="p-4 sm:p-5">
              <div className="mb-3">
                <EngravedPlaque 
                  title="TRENDING INTEL (4)" 
                  subtitle="Verified club & transfer stories"
                  variant="gold"
                  size="sm"
                />
              </div>

              <div style={{ flex: 1 }}>
                {trendingData.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', padding: '12px' }}>No trending stories.</div>
                ) : (
                  trendingData.slice(0, 4).map(news => (
                    <PhysicalCard key={news.id} variant="obsidian" interactive={true} className="p-2.5 mb-2 flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 font-['Orbitron'] shadow-md ${
                        news.rank === 1 ? 'rank-badge-gold' : news.rank === 2 ? 'rank-badge-silver' : news.rank === 3 ? 'rank-badge-bronze' : 'rank-badge-neon'
                      }`}>
                        {String(news.rank).padStart(2, '0')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div 
                          title="Click to search on Google"
                          onClick={() => openGoogleScout(news.title, 'news')}
                          className="text-xs font-bold text-white hover:text-amber-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer truncate"
                        >
                          <span className="truncate">{news.title}</span>
                          <Search className="w-3 h-3 text-amber-400 opacity-70 shrink-0" />
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">💬 {news.comments_count} interactions</div>
                      </div>
                    </PhysicalCard>
                  ))
                )}
              </div>

              {/* CLEAR PROMINENT SEE MORE BUTTON */}
              <button type="button" className="see-more-btn" onClick={() => navigateTo('news')}>
                See More News →
              </button>
            </MaterialPanel>

          </div>
        </div>
      </div>

      {/* MODALS SECTION */}
      {activeCommentMatch && (
        <div className="modal-overlay" onClick={() => setActiveCommentMatch(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Comments: {activeCommentMatch.teams}</h3>
              <button className="btn-outline" onClick={() => setActiveCommentMatch(null)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
              {(matchCommentsStore[activeCommentMatch.id] || []).length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>No commentary posted yet.</div>
              ) : (
                (matchCommentsStore[activeCommentMatch.id] || []).map((c, i) => (
                  <div key={i} style={{ background: '#0a1422', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--green)', fontWeight: 700 }}>
                      <span>{c.user}</span>
                      <span>{c.time}</span>
                    </div>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Type commentary..." 
                value={commentInput} 
                onChange={(e) => setCommentInput(e.target.value)}
                style={{ flex: 1, background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <button className="btn-cyber" onClick={submitComment}>Post</button>
            </div>
          </div>
        </div>
      )}

      {/* MATCH DETAIL MODAL */}
      {activeMatchDetail && (
        <div className="modal-overlay" onClick={() => setActiveMatchDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{activeMatchDetail.teams}</h3>
              <button className="btn-outline" onClick={() => setActiveMatchDetail(null)}>✕</button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
              League: {activeMatchDetail.league} | Kickoff: {activeMatchDetail.match_date} {activeMatchDetail.match_time}
            </div>
            <div style={{ background: '#0a1422', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
              <h4 style={{ color: 'var(--green)', fontSize: '12px', fontWeight: 700 }}>TACTICAL ANALYSIS</h4>
              <p style={{ fontSize: '13px', marginTop: '6px', lineHeight: '1.5' }}>
                {activeMatchDetail.analysis_text || 'No tactical details available for this match.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE CUSTOM SEARCH ENGINE MODAL */}
      <GoogleSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        initialQuery={googleQuery || 'CF Montreal match intelligence'}
      />

      {/* ADMIN EDIT / ADD FLOATING MODAL */}
      {adminModalState.open && (
        <div className="modal-overlay" onClick={() => setAdminModalState({ open: false, section: null, item: null })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>
              {adminModalState.item ? 'Edit' : 'Add'} Database Entry ({adminModalState.section.toUpperCase()})
            </h3>
            
            <form onSubmit={saveAdminEntry} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {adminModalState.section === 'matches' && (
                <>
                  <input id="admin-teams" placeholder="Teams (e.g. Chelsea vs Arsenal)" defaultValue={adminModalState.item?.teams || ''} required style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                  <input id="admin-league" placeholder="League" defaultValue={adminModalState.item?.league || ''} required style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="date" id="admin-date" defaultValue={adminModalState.item?.match_date || ''} required style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                    <input type="time" id="admin-time" defaultValue={adminModalState.item?.match_time || ''} required style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                  </div>
                  <input id="admin-prediction" placeholder="Prediction" defaultValue={adminModalState.item?.prediction || ''} required style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                  <input id="admin-odds" type="number" step="0.01" placeholder="Decimal Odds" defaultValue={adminModalState.item?.decimal_odds || ''} required style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <input id="admin-prob-home" type="number" placeholder="Home Prob %" defaultValue={adminModalState.item?.prob_home || ''} style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                    <input id="admin-prob-draw" type="number" placeholder="Draw Prob %" defaultValue={adminModalState.item?.prob_draw || ''} style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                    <input id="admin-prob-away" type="number" placeholder="Away Prob %" defaultValue={adminModalState.item?.prob_away || ''} style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                  </div>
                  <textarea id="admin-analysis" placeholder="Tactical Analysis" defaultValue={adminModalState.item?.analysis_text || ''} rows="3" style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                </>
              )}

              {adminModalState.section === 'fixtures' && (
                <>
                  <input id="admin-teams" placeholder="Teams" defaultValue={adminModalState.item?.teams || ''} required style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                  <input id="admin-league" placeholder="League" defaultValue={adminModalState.item?.league || ''} required style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="date" id="admin-date" defaultValue={adminModalState.item?.match_date || ''} required style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                    <input type="time" id="admin-time" defaultValue={adminModalState.item?.match_time || ''} required style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                  </div>
                </>
              )}

              {adminModalState.section === 'trending' && (
                <>
                  <input id="admin-rank" type="number" placeholder="Rank" defaultValue={adminModalState.item?.rank || ''} required style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                  <input id="admin-title" placeholder="News Headline" defaultValue={adminModalState.item?.title || ''} required style={{ background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn-outline" onClick={() => setAdminModalState({ open: false, section: null, item: null })}>Cancel</button>
                <button type="submit" className="btn-cyber">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {isProfileOpen && (
        <div className="modal-overlay" onClick={() => setIsProfileOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>User Profile</h3>
              <button className="btn-outline" onClick={() => setIsProfileOpen(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div>Username: <strong>{userProfile.username}</strong></div>
              <div>Email: <strong>{userProfile.email}</strong></div>
              <div>Role: <strong style={{ color: 'var(--green)' }}>{userProfile.role.toUpperCase()}</strong></div>
              <div>Joined: <strong>{userProfile.createdAt}</strong></div>
            </div>
            <button className="btn-cyber" style={{ background: 'var(--red)', color: '#fff', width: '100%', marginTop: '20px' }} onClick={signOutUser}>Sign Out</button>
          </div>
        </div>
      )}

      {/* UNIFIED FUTURISTIC QUANTUM LOADER */}
      <FuturisticLoader
        active={loader.active}
        text={loader.text}
        progress={loader.progress}
        subText="DASHBOARD PROTOCOL"
      />

      {/* UNIFIED TOAST & ALERT NOTIFICATION CONTAINER */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 max-w-sm w-full shadow-2xl">
          <AlertBanner
            type={toast.isError ? "error" : "success"}
            title={toast.isError ? "Notice" : "Success"}
            message={toast.message}
            onClose={() => setToast(prev => ({ ...prev, show: false }))}
          />
        </div>
      )}

      {/* FLOATING ACTION BUTTON (FAB) FOR QUICK ACCESS */}
      <DashboardFAB
        onQuickSearch={() => {
          setActiveSearchFilter('prediction');
          setIsSearchOpen(true);
        }}
        onNewPrediction={() => {
          if (isAdmin) {
            setAdminModalState({ open: true, section: 'matches', item: null });
          } else {
            navigateTo('predictions');
          }
        }}
        onNavigate={(route) => navigateTo(route)}
        isAdmin={isAdmin}
      />

      {/* CREATE STATUS MODAL */}
      {isCreateStatusOpen && (
        <CreateStatusModal
          isOpen={isCreateStatusOpen}
          onClose={() => setIsCreateStatusOpen(false)}
          currentUser={currentUser}
          userProfile={userProfile}
          onStatusCreated={handleStatusCreated}
        />
      )}

    </div>
  );
}
