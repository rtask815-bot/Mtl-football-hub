import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase as db } from '../config/supabase.ts';
import { StorageCache, DEFAULT_MATCHES_BACKUP, DEFAULT_FIXTURES_BACKUP, DEFAULT_TRENDING_BACKUP } from '../config/storageCache.ts';
import { openGoogleScout } from '../utils/googleScout.ts';
import GoogleSearchModal from '../components/GoogleSearchModal.tsx';
import FuturisticLoader from '../components/FuturisticLoader.tsx';
import AdContainer from '../components/AdContainer.tsx';
import AlertBanner from '../components/AlertBanner.tsx';
import DashboardFAB from '../components/DashboardFAB.tsx';
import { PerformanceAnalyticsChart } from '../components/PerformanceAnalyticsChart.tsx';
import StatusReel from '../components/StatusReel.tsx';
import { fetchUserStatuses, subscribeUserStatuses, INITIAL_COMMUNITY_STATUSES, saveMatchReaction } from '../config/firebaseStore.ts';
import HorizontalScrollRow from '../components/HorizontalScrollRow.tsx';

export default function Dashboard() {
  const navigate = useNavigate();

  // Nav & Clock States
  const [clock, setClock] = useState('00:00:00');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeSearchFilter, setActiveSearchFilter] = useState('prediction');

  // User & Profile States
  const [currentUser, setCurrentUser] = useState(null);
  const [dashboardStatuses, setDashboardStatuses] = useState(INITIAL_COMMUNITY_STATUSES);
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
      if (!error && Array.isArray(data)) {
        setMatchesData(data.map(normalizeMatch));
      } else {
        setMatchesData([]);
      }
    } catch (error) {
      console.error(error);
      setMatchesData([]);
    }
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
      if (!error && Array.isArray(data)) {
        setFixturesData(data.map(f => ({
          ...f,
          match_date: f.match_date ?? f.date ?? '',
          match_time: f.match_time ?? f.time ?? '',
          badge: f.badge || getTeamBadge(f.teams)
        })));
      } else {
        setFixturesData([]);
      }
    } catch (error) {
      console.error(error);
      setFixturesData([]);
    }
  }

  async function loadTrendingFromDB() {
    try {
      const { data, error } = await db.from('trending').select('*').order('rank', { ascending: true });
      if (!error && Array.isArray(data)) {
        setTrendingData(data.map(item => ({
          ...item,
          rank: item.rank ?? '',
          title: item.title ?? item.topic ?? '',
          comments_count: item.comments_count ?? item.posts_count ?? 0
        })));
      } else {
        setTrendingData([]);
      }
    } catch (error) {
      console.error(error);
      setTrendingData([]);
    }
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
    <div className="dashboard-root">
      <style>{`
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100vh;
          background: transparent !important;
          overflow-x: hidden;
        }

        .dashboard-root {
          box-sizing: border-box;
          --bg: transparent;
          --bg-2: #101d2e;
          --surface: rgba(23, 38, 57, 0.95);
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
          background: transparent;
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
          padding: 12px 16px 16px 16px;
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
          margin-bottom: 16px;
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
        
        {/* MATCH INTELLIGENCE BANNER */}
        <section className="cyber-banner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 800, letterSpacing: '1px' }}>● IMMEDIATE LANDING DASHBOARD</span>
              <h2 style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>Match Intelligence Hub</h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', maxWidth: '600px' }}>
                Summary overview of top match predictions, upcoming fixture details, and real-time community discussions.
              </p>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-cyber" onClick={() => setAdminModalState({ open: true, section: 'matches', item: null })}>+ Match</button>
                <button className="btn-cyber" onClick={() => setAdminModalState({ open: true, section: 'fixtures', item: null })}>+ Fixture</button>
                <button className="btn-cyber" onClick={() => setAdminModalState({ open: true, section: 'trending', item: null })}>+ News</button>
              </div>
            )}
          </div>
        </section>

        {/* 1. UPPER SECTION: DASHBOARD CARD BUTTONS (EASILY ACCESSIBLE AT THE TOP WITH LEFT & RIGHT SCROLL) */}
        <section className="upper-section-buttons" style={{ marginBottom: '28px' }}>
          <HorizontalScrollRow
            title={
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#34d399', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚡ DASHBOARD NAVIGATION & MODULES</span>
              </h3>
            }
            subtitle="Click or scroll left and right to launch any hub module"
          >
            {/* User Profile & Status */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-emerald-400 hover:scale-102 transition-all shadow-lg" onClick={() => navigate('/profile')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>PROFILE</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>User Profile & Status</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Bio, clubs & match card status</div>
              </div>
            </div>

            {/* 1. Match Predictions */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-emerald-400 hover:scale-102 transition-all shadow-lg" onClick={() => navigateTo('predictions')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>ODDS</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>Match Predictions</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Full odds & insights</div>
              </div>
            </div>

            {/* 2. Other Apps */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-emerald-400 hover:scale-102 transition-all shadow-lg" onClick={() => navigateTo('clubs')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.4)' }}>PORTALS</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>Other Apps</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Betting, predictions & virtuals</div>
              </div>
            </div>

            {/* 2. AI Predictions */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-cyan-400 hover:scale-102 transition-all shadow-lg" onClick={() => navigateTo('ai-predictions')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)' }}>AI MODEL</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>AI Predictions</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Neural win-rate models</div>
              </div>
            </div>

            {/* 3. Live TV */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-rose-400 hover:scale-102 transition-all shadow-lg" onClick={() => navigateTo('tv')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.5)' }}>LIVE</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>LIVE TV</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Watch live streams</div>
              </div>
            </div>

            {/* 4. Fixtures Grid */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-emerald-400 hover:scale-102 transition-all shadow-lg" onClick={() => navigateTo('fixtures')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>CALENDAR</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>Fixtures & Tables</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Schedules & kickoffs</div>
              </div>
            </div>

            {/* 5. Group Chats */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-teal-400 hover:scale-102 transition-all shadow-lg" onClick={() => navigateTo('group-chats')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(45, 212, 191, 0.2)', color: '#2dd4bf', border: '1px solid rgba(45, 212, 191, 0.4)' }}>CHAT</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>Group Chats</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Join fan communities</div>
              </div>
            </div>

            {/* 6. Direct Messages & News */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-amber-400 hover:scale-102 transition-all shadow-lg" onClick={() => navigateTo('news')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(251, 146, 60, 0.2)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.4)' }}>INTEL</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>News & Direct Feed</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Direct chat & news</div>
              </div>
            </div>

            {/* 7. Past Predictions Archive */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-purple-400 hover:scale-102 transition-all shadow-lg" onClick={() => navigateTo('past-predictions')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}>HISTORY</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>Past Predictions</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Historical match records</div>
              </div>
            </div>

            {/* 8. Live In-Play Scores */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-yellow-400 hover:scale-102 transition-all shadow-lg" onClick={() => navigateTo('live')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.4)' }}>IN-PLAY</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>Live Matches</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Real-time match scores</div>
              </div>
            </div>

            {/* 9. Trending Discussions */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-rose-400 hover:scale-102 transition-all shadow-lg" onClick={() => navigateTo('trending')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.4)' }}>HOT</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>Trending Topics</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Viral debriefs & news</div>
              </div>
            </div>

            {/* 11. Notifications */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-amber-400 hover:scale-102 transition-all shadow-lg" onClick={() => navigateTo('notifications')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>ALERTS</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>System Notices</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Match alerts & bullet</div>
              </div>
            </div>

            {/* 12. Google Scout Modal */}
            <div className="hub-card min-w-[210px] w-[220px] shrink-0 p-5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-blue-400 hover:scale-102 transition-all shadow-lg" onClick={() => setIsSearchOpen(true)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <svg className="card-icon-svg w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)' }}>SEARCH</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div className="title" style={{ fontSize: '14px', fontWeight: 800 }}>Google Scout</div>
                <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>Live web & intel search</div>
              </div>
            </div>
          </HorizontalScrollRow>
        </section>

        {/* WHATSAPP-STYLE MATCH PREDICTION STATUS REEL */}
        <div style={{ marginBottom: '24px' }}>
          <StatusReel
            statuses={dashboardStatuses}
            currentUser={currentUser}
            userProfile={userProfile}
            onRefreshStatuses={async () => {
              const list = await fetchUserStatuses();
              if (Array.isArray(list)) setDashboardStatuses(list);
            }}
          />
        </div>

        {/* DYNAMIC SOURCED ADMOB BANNER CONTAINER */}
        <div style={{ marginBottom: '28px' }}>
          <AdContainer
            adUnitId="ca-app-pub-8492019482018471/dashboard_banner"
            onAction={() => navigateTo('tv')}
          />
        </div>

        {/* 2. AI MATCH INSIGHT CONTAINER */}
        <section className="pro-card" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 800, letterSpacing: '1px' }}>● NEURAL TACTICAL PREDICTION ENGINE</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>⚡ AI Match Insights & Tactical Analytics</h3>
            </div>
            <button className="btn-cyber" onClick={() => navigateTo('ai-predictions')}>
              AI Model Predictions →
            </button>
          </div>

          {/* RECHARTS / D3 PERFORMANCE ANALYTICS & WIN-LOSS RATIO VISUALIZATION */}
          <div style={{ marginBottom: '20px' }}>
            <PerformanceAnalyticsChart isAdmin={isAdmin} />
          </div>

          {/* TOP AI MATCH PREDICTION CARDS */}
          <div>
            <HorizontalScrollRow
              title="Featured AI Match Predictions"
              subtitle="Scroll left and right to inspect match predictions and probabilities"
            >
              {getFilteredMatches().slice(0, 6).length === 0 ? (
                <div style={{ textTransform: 'uppercase', textAlign: 'center', padding: '30px', color: 'var(--muted)', fontSize: '12px', width: '100%' }}>
                  No summary matches available right now.
                </div>
              ) : (
                getFilteredMatches().slice(0, 6).map(match => (
                  <div key={match.id} className="min-w-[340px] sm:min-w-[400px] w-[400px] shrink-0 p-5 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-emerald-400 hover:scale-[1.01] transition-all shadow-xl space-y-3">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)' }}>
                      <span style={{ color: 'var(--green)', fontWeight: 800, letterSpacing: '0.5px' }}>{match.league || 'LEAGUE'}</span>
                      <span style={{ fontWeight: 600 }}>{match.match_date} • {match.match_time}</span>
                    </div>
                    
                    <h3 
                      style={{ fontSize: '16px', fontWeight: 800, cursor: 'pointer', lineHeight: '1.3' }} 
                      title="Click to search on Google"
                      onClick={() => openGoogleScout(match.teams + ' match intelligence ' + (match.league || ''))}
                      className="hover:text-emerald-400 transition-colors inline-flex items-center gap-2 w-full"
                    >
                      <span className="truncate">{match.teams}</span>
                      <Search className="w-4 h-4 text-cyan-400 opacity-80 shrink-0" />
                    </h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', background: '#101d2e', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span>Prediction: <strong style={{ color: '#34d399' }}>{match.prediction}</strong></span>
                      <span style={{ color: 'var(--amber)', fontWeight: 800, background: 'rgba(245,158,11,0.15)', padding: '3px 8px', borderRadius: '6px' }}>Odds: {formatOdds(match.decimal_odds)}</span>
                    </div>

                    {/* Probability Distribution */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                        <span>Probability Distribution</span>
                        <span>H: {match.prob_home}% | D: {match.prob_draw}% | A: {match.prob_away}%</span>
                      </div>
                      <div className="water-progress-container h-2.5">
                        <div className="water-progress-bar" style={{ width: `${match.prob_home}%` }} />
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => reactToMatch(match.id, 'fire')}>🔥 {match.reactions?.fire || 0}</button>
                        <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => reactToMatch(match.id, 'heart')}>❤️ {match.reactions?.heart || 0}</button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-outline px-3 py-1.5 text-xs" onClick={() => setActiveCommentMatch(match)}>💬 ({(matchCommentsStore[match.id] || []).length})</button>
                        <button className="btn-cyber px-4 py-1.5 text-xs font-bold" onClick={() => setActiveMatchDetail(match)}>Details</button>
                        {isAdmin && (
                          <button className="btn-outline px-3 py-1.5 text-xs" style={{ color: 'var(--red)' }} onClick={() => deleteRecord('matches', match.id)}>Delete</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </HorizontalScrollRow>

            {/* CLEAR PROMINENT SEE MORE BUTTON */}
            <button className="see-more-btn" onClick={() => navigateTo('predictions')}>
              View All Predictions Page →
            </button>
          </div>
        </section>

        {/* 3. NEWS SUMMARY CONTAINER */}
        <section className="pro-card" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#fb923c', fontWeight: 800, letterSpacing: '1px' }}>● BREAKING FOOTBALL INTEL</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>🔥 News Summary</h3>
            </div>
            <button className="btn-cyber" style={{ background: 'linear-gradient(135deg, #fb923c, #ea580c)', color: '#fff' }} onClick={() => navigateTo('news')}>
              Explore Full News Feed →
            </button>
          </div>

          <HorizontalScrollRow
            title="Latest Headlines"
            subtitle="Scroll left and right to read top football news"
          >
            {trendingData.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '20px', width: '100%' }}>No trending stories.</div>
            ) : (
              trendingData.slice(0, 8).map(news => (
                <div key={news.id} className="min-w-[340px] sm:min-w-[380px] w-[380px] shrink-0 p-5 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-amber-400 hover:scale-[1.01] transition-all shadow-xl flex items-start gap-3.5">
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#fb923c', background: 'rgba(251, 146, 60, 0.18)', border: '1px solid rgba(251, 146, 60, 0.3)', padding: '8px 12px', borderRadius: '10px' }} className="shrink-0">#{news.rank}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div 
                      style={{ fontSize: '14px', fontWeight: 700, cursor: 'pointer', lineHeight: '1.5' }} 
                      title="Click to search on Google"
                      onClick={() => openGoogleScout(news.title, 'news')}
                      className="hover:text-amber-400 transition-colors inline-flex items-center gap-2 line-clamp-2 w-full"
                    >
                      <span className="line-clamp-2">{news.title}</span>
                      <Search className="w-4 h-4 text-amber-400 opacity-80 shrink-0 mt-0.5" />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px', fontWeight: 600 }} className="flex items-center gap-3">
                      <span>💬 {news.comments_count} interactions</span>
                      <span className="text-amber-400/80 font-bold">• Breaking Intel</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </HorizontalScrollRow>

          {/* CLEAR PROMINENT SEE MORE BUTTON */}
          <button className="see-more-btn" onClick={() => navigateTo('news')}>
            See More News Stories →
          </button>
        </section>

        {/* 4. FIXTURE SUMMARY CONTAINER */}
        <section className="pro-card" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 800, letterSpacing: '1px' }}>● UPCOMING MATCH SCHEDULE</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>📅 Fixture Summary</h3>
            </div>
            <button className="btn-cyber" style={{ background: 'linear-gradient(135deg, #0284c7, #38bdf8)', color: '#fff' }} onClick={() => navigateTo('fixtures')}>
              Full Fixtures Calendar →
            </button>
          </div>

          <HorizontalScrollRow
            title="Upcoming Kickoffs"
            subtitle="Scroll left and right to view upcoming match fixtures"
          >
            {fixturesData.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '20px', width: '100%' }}>No upcoming fixtures.</div>
            ) : (
              fixturesData.slice(0, 8).map(fix => (
                <div key={fix.id} className="min-w-[320px] sm:min-w-[380px] w-[380px] shrink-0 p-5 rounded-2xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 hover:scale-[1.01] transition-all shadow-xl flex items-center justify-between gap-3">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '38px', height: '38px', background: '#101d2e', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'var(--green)' }} className="shrink-0 shadow-md">
                      {fix.badge}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div 
                        style={{ fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
                        title="Click to search on Google"
                        onClick={() => openGoogleScout(fix.teams + ' ' + (fix.league || '') + ' fixture schedule')}
                        className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 truncate w-full"
                      >
                        <span className="truncate">{fix.teams}</span>
                        <Search className="w-3.5 h-3.5 text-cyan-400 opacity-80 shrink-0" />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, marginTop: '2px' }} className="truncate">{fix.league}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', shrink: 0, marginLeft: '10px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 800, background: 'rgba(16,185,129,0.15)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.3)' }}>{fix.match_time}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px', fontWeight: 600 }}>{fix.match_date}</div>
                  </div>
                </div>
              ))
            )}
          </HorizontalScrollRow>

          {/* CLEAR PROMINENT SEE MORE BUTTON */}
          <button className="see-more-btn" onClick={() => navigateTo('fixtures')}>
            See More Fixtures →
          </button>
        </section>

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

    </div>
  );
}
