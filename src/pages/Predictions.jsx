import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Predictions() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState({
    role: 'user',
    username: 'not Signed in',
    email: '',
    odds_format: 'decimal',
    language: 'en',
    high_contrast: false
  });

  const [activeMatchChatId, setActiveMatchChatId] = useState(null);
  const [activeCommentMatchId, setActiveCommentMatchId] = useState(null);
  const [activeAdminSection, setActiveAdminSection] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);

  const [matchesData, setMatchesData] = useState([]);
  const [fixturesData, setFixturesData] = useState([]);
  const [trendingData, setTrendingData] = useState([]);
  const [liveMatchesData, setLiveMatchesData] = useState([]);
  const [globalChatMessages, setGlobalChatMessages] = useState([]);
  const [matchCommentsStore, setMatchCommentsStore] = useState({});
  const [matchChatStore, setMatchChatStore] = useState({});
  const [matchReactionsMap, setMatchReactionsMap] = useState({});

  const [activeMatchTab, setActiveMatchTab] = useState('future');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');

  // Modal & UI Visibility states
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [isLoaderActive, setIsLoaderActive] = useState(true);
  const [loaderPromptText, setLoaderPromptText] = useState('initializing secure intelligence core...');
  const [loaderProgress, setLoaderProgress] = useState(25);
  const [reactionModalData, setReactionModalData] = useState({ isOpen: false, title: '', users: [] });
  const [googleModal, setGoogleModal] = useState({ isOpen: false, query: '', src: 'about:blank' });
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [commentsModal, setCommentsModal] = useState({ isOpen: false, matchId: '', title: '', subtitle: '' });
  const [statsModal, setStatsModal] = useState({ isOpen: false, title: '', dataset: [] });
  const [fullscreenMatchModal, setFullscreenMatchModal] = useState({ isOpen: false, matchId: null });
  const [matchChatModal, setMatchChatModal] = useState({ isOpen: false, matchId: null, title: '' });
  const [dialingModalOpen, setDialingModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [globalChatInput, setGlobalChatInput] = useState('');
  const [fullscreenCommentInput, setFullscreenCommentInput] = useState('');
  const [matchChatInput, setMatchChatInput] = useState('');

  useEffect(() => {
    const initApp = async () => {
      triggerFloatingLoader("establishing quantum sync...", 15);
      const authenticated = await checkUserSession();
      if (!authenticated) return;

      triggerFloatingLoader("fetching neural feeds...", 40);
      await loadDatabaseReactions();

      await Promise.all([
        loadMatchesFromDB(),
        loadFixturesFromDB(),
        loadTrendingFromDB(),
        loadDatabaseComments(),
        loadDatabaseChats()
      ]);

      updateLiveMatches();
      setupDatabaseRealtimeSubscriptions();

      triggerFloatingLoader("sync complete", 100);
      setTimeout(hideFloatingLoader, 300);
    };

    initApp();
    const liveInterval = setInterval(() => updateLiveMatches(), 1000);
    return () => clearInterval(liveInterval);
  }, []);

  // Intersection Observer equivalent effect for slide-in
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-slide-in').forEach(el => observer.observe(el));
  });

  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };

  const verifyHackLocksAndSanitize = (payload) => {
    if (typeof payload === 'object' && payload !== null) {
      for (let key in payload) {
        if (typeof payload[key] === 'string') {
          const low = payload[key].toLowerCase();
          if (low.includes('<script') || low.includes('javascript:') || low.includes('onerror=') || low.includes('onload=')) {
            showToast("🚨 XSS Injection Attempt Blocked by Security Hack Lock!");
            throw new Error("Security Violation: Malicious payload detected.");
          }
          payload[key] = sanitizeInput(payload[key]);
        }
      }
    }
    return payload;
  };

  const showToast = (message, isError = true) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const checkUserSession = async () => {
    try {
      const { data: { user }, error: userError } = await db.auth.getUser();
      if (userError || !user) {
        window.location.href = "auth.html";
        return false;
      }

      setCurrentUser(user);
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('username, name, email, role, is_admin, admin')
        .eq('id', user.id)
        .single();

      if (profileError) showDatabaseError('profiles', profileError, 'READ_PROFILE');

      const dbName = profile?.name || profile?.username;
      const username = dbName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const email = profile?.email || user.email || 'user@mtl.com';
      const isUserAdmin = profile?.role === 'admin' || profile?.is_admin === true || profile?.admin === true;
      const role = isUserAdmin ? 'admin' : 'user';

      setUserProfile(prev => ({ ...prev, username, email, role }));
      return true;
    } catch (err) {
      showDatabaseError('auth.session', err, 'SESSION_EXCEPTION');
      window.location.href = "auth.html";
      return false;
    }
  };

  const signOutUser = async () => {
    await db.auth.signOut();
    window.location.href = "auth.html";
  };

  const toggleSideNav = () => setIsSideNavOpen(!isSideNavOpen);

  const triggerFloatingLoader = (promptText, progressPercentage) => {
    if (promptText) setLoaderPromptText(promptText);
    if (progressPercentage !== undefined) setLoaderProgress(progressPercentage);
    setIsLoaderActive(true);
  };

  const hideFloatingLoader = () => setIsLoaderActive(false);

  const getFirstNameInitials = (name) => {
    if (!name) return 'MT';
    const cleanName = String(name).trim();
    const parts = cleanName.split(/\s+/);
    const firstName = parts[0];
    return firstName.length >= 2 ? firstName.substring(0, 2).toUpperCase() : firstName.charAt(0).toUpperCase();
  };

  const showDatabaseError = (table, error, operation = 'READ') => {
    let diagnosis = "Unspecified database failure.";
    let action = "Verify database connection and try again.";
    const code = error?.code || '';
    const message = error?.message || String(error);

    if (code === '42501' || message.includes('permission') || message.includes('policy')) {
      diagnosis = "Row-Level Security (RLS) Permission Denied.";
      action = "Check Supabase table policies.";
    } else {
      diagnosis = `Database error code: ${code || 'UNKNOWN'}`;
      action = "Check table structure or review Supabase operational logs.";
    }

    setDbError({
      title: `${operation} Operation Failed • Target Table: [${table}]`,
      diagnosis,
      action,
      details: JSON.stringify(error, null, 2)
    });
  };

  const hideDatabaseError = () => setDbError(null);

  const setupDatabaseRealtimeSubscriptions = () => {
    db.channel('public:chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, async () => {
        await loadDatabaseChats();
      })
      .subscribe();

    db.channel('public:comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async () => {
        await loadDatabaseComments();
      })
      .subscribe();

    db.channel('public:reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, async () => {
        await loadDatabaseReactions();
        await loadMatchesFromDB();
      })
      .subscribe();
  };

  const loadDatabaseReactions = async () => {
    try {
      const { data, error } = await db.from('reactions').select('*');
      if (error) { showDatabaseError('reactions', error, 'READ_REACTIONS'); return; }
      if (Array.isArray(data)) {
        const map = {};
        data.forEach(r => {
          const mId = String(r.match_id);
          if (!map[mId]) map[mId] = [];
          map[mId].push({ user_id: r.user_id, username: r.username || 'User', reaction: r.reaction_type });
        });
        setMatchReactionsMap(map);
      }
    } catch (e) { showDatabaseError('reactions', e, 'READ_REACTIONS'); }
  };

  const loadDatabaseComments = async () => {
    try {
      const { data, error } = await db.from('comments').select('*').order('created_at', { ascending: true });
      if (error) { showDatabaseError('comments', error, 'READ_COMMENTS'); return; }
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
    } catch (err) { showDatabaseError('comments', err, 'READ_COMMENTS'); }
  };

  const loadDatabaseChats = async () => {
    try {
      const { data, error } = await db.from('chats').select('*').order('created_at', { ascending: true });
      if (error) { showDatabaseError('chats', error, 'READ_CHATS'); return; }
      if (Array.isArray(data)) {
        const glob = [];
        const matchStore = {};
        data.forEach(msg => {
          const parsed = {
            id: msg.id,
            user_id: msg.user_id,
            user: msg.username || msg.user || 'User',
            text: msg.message || msg.text || '',
            time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
          };
          if (!msg.match_id) {
            glob.push(parsed);
          } else {
            const mId = String(msg.match_id);
            if (!matchStore[mId]) matchStore[mId] = [];
            matchStore[mId].push(parsed);
          }
        });
        setGlobalChatMessages(glob);
        setMatchChatStore(matchStore);
      }
    } catch (err) { showDatabaseError('chats', err, 'READ_CHATS'); }
  };

  const loadMatchesFromDB = async () => {
    try {
      const { data, error } = await db.from('matches').select('*').order('created_at', { ascending: false });
      if (error) { showDatabaseError('matches', error, 'READ_MATCHES'); return; }
      const normalized = Array.isArray(data) ? data.map(normalizeMatch) : [];
      setMatchesData(normalized);
    } catch (error) { showDatabaseError('matches', error, 'READ_MATCHES'); }
  };

  const normalizeMatch = (match) => {
    const parsedOdds = parseFloat(match.decimal_odds);
    const parsedHome = parseFloat(match.prob_home);
    const parsedDraw = parseFloat(match.prob_draw);
    const parsedAway = parseFloat(match.prob_away);
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
      decimal_odds: Number.isFinite(parsedOdds) ? parsedOdds : null,
      prob_home: Number.isFinite(parsedHome) ? Math.max(0, Math.min(100, parsedHome)) : 0,
      prob_draw: Number.isFinite(parsedDraw) ? Math.max(0, Math.min(100, parsedDraw)) : 0,
      prob_away: Number.isFinite(parsedAway) ? Math.max(0, Math.min(100, parsedAway)) : 0,
      confidence_stars: Number.isFinite(parsedStars) ? Math.max(0, Math.min(5, parsedStars)) : 0,
      reactions: {
        fire: Math.max(computedReactions.fire, Number(fallbackReactions.fire) || 0),
        heart: Math.max(computedReactions.heart, Number(fallbackReactions.heart) || 0),
        dislike: Math.max(computedReactions.dislike, Number(fallbackReactions.dislike) || 0)
      }
    };
  };

  const loadFixturesFromDB = async () => {
    try {
      const { data, error } = await db.from('fixtures').select('*').order('match_date', { ascending: true });
      if (error) { showDatabaseError('fixtures', error, 'READ_FIXTURES'); return; }
      const normalized = Array.isArray(data) ? data.map(normalizeFixture) : [];
      setFixturesData(normalized);
    } catch (error) { showDatabaseError('fixtures', error, 'READ_FIXTURES'); }
  };

  const normalizeFixture = (fix) => {
    const matchDate = fix.match_date ?? fix.date ?? '';
    const matchTime = fix.match_time ?? fix.time ?? '';
    return { ...fix, match_date: matchDate, match_time: matchTime, badge: fix.badge || getTeamBadge(fix.teams) };
  };

  const loadTrendingFromDB = async () => {
    try {
      const { data, error } = await db.from('trending').select('*').order('rank', { ascending: true });
      if (error) { showDatabaseError('trending', error, 'READ_TRENDING'); return; }
      const normalized = Array.isArray(data) ? data.map(normalizeTrending) : [];
      setTrendingData(normalized);
    } catch (error) { showDatabaseError('trending', error, 'READ_TRENDING'); }
  };

  const normalizeTrending = (item) => {
    return { ...item, rank: item.rank ?? '', title: item.title ?? '', comments_count: item.comments_count ?? item.comments ?? 0 };
  };

  const getTeamBadge = (teams) => {
    if (!teams) return '⚽';
    const firstTeam = String(teams).split(/\s+vs\.?\s+/i)[0].trim();
    const words = firstTeam.split(/\s+/).filter(Boolean);
    return words.length >= 2 ? (words[0].charAt(0) + words[1].charAt(0)).toUpperCase() : firstTeam.substring(0, 3).toUpperCase();
  };

  const updateLiveMatches = () => {
    const now = new Date();
    const live = matchesData.filter(m => isMatchCurrentlyLive(m, now)).map(buildLiveMatch);
    setLiveMatchesData(live);
  };

  const isMatchCurrentlyLive = (match, now = new Date()) => {
    if (!match) return false;
    const status = String(match.status || '').trim().toUpperCase();
    if (['LIVE', 'IN_PLAY', 'IN-PLAY', 'PLAYING'].includes(status)) return true;
    if (['FT', 'FINISHED', 'FULL TIME', 'COMPLETED', 'POSTPONED', 'CANCELLED'].includes(status)) return false;
    if (!match.match_date || !match.match_time) return false;
    const kickoff = parseMatchDateTime(match.match_date, match.match_time);
    if (!kickoff) return false;
    const diff = now.getTime() - kickoff.getTime();
    return diff >= 0 && diff <= 120 * 60 * 1000;
  };

  const parseMatchDateTime = (dateValue, timeValue) => {
    try {
      let dateText = String(dateValue).trim();
      let timeText = String(timeValue).trim().replace(/(\.\d+)?$/, '');
      if (/^\d{2}:\d{2}$/.test(timeText)) timeText += ':00';
      const parsed = new Date(`${dateText}T${timeText}`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch { return null; }
  };

  const calculateLiveMinute = (match) => {
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
  };

  const buildLiveMatch = (match) => {
    const minuteStr = calculateLiveMinute(match);
    const minuteVal = parseInt(minuteStr, 10) || 0;
    const progress = Math.min(Math.round((minuteVal / 90) * 100), 100);
    return {
      ...match,
      league: match.league || match.competition || 'FOOTBALL',
      teams: match.teams || 'Unknown Teams',
      score: match.score || match.final_score || '0 - 0',
      minute: minuteStr,
      progress,
      details: match.live_details || match.details || match.analysis_text || 'Live match intelligence available.'
    };
  };

  const formatOdds = (decimalVal) => {
    const val = parseFloat(decimalVal);
    if (!Number.isFinite(val) || val <= 1) return 'N/A';
    if (userProfile.odds_format === 'fractional') return `${Math.round((val - 1) * 100)}/100`;
    if (userProfile.odds_format === 'american') return val >= 2.0 ? `+${Math.round((val - 1) * 100)}` : `-${Math.round(100 / (val - 1))}`;
    return val.toFixed(2);
  };

  const openGoogleSearchIframe = (queryText) => {
    const aiQuery = encodeURIComponent(queryText);
    setGoogleModal({
      isOpen: true,
      query: `Automated AI Mode: "${queryText}"`,
      src: `https://www.google.com/search?q=${aiQuery}&udm=14&udm=28&igu=1`
    });
  };

  const attachCardLongPress = (searchQuery) => {
    let timer = null;
    const startTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        openGoogleSearchIframe(searchQuery);
      }, 850);
    };
    const clear = () => clearTimeout(timer);
    return {
      onMouseDown: startTimer,
      onMouseUp: clear,
      onMouseLeave: clear,
      onTouchStart: startTimer,
      onTouchEnd: clear,
      onTouchCancel: clear
    };
  };

  const reactToMatch = async (matchId, type) => {
    const match = matchesData.find(m => String(m.id) === String(matchId));
    if (!match) return;
    const mId = String(matchId);
    const currentReactionsMap = { ...matchReactionsMap };
    if (!currentReactionsMap[mId]) currentReactionsMap[mId] = [];

    const userId = currentUser?.id || 'guest';
    const userPrevReaction = currentReactionsMap[mId].find(r => r.user_id === userId);
    const newReactions = { ...(match.reactions || { fire: 0, heart: 0, dislike: 0 }) };

    if (userPrevReaction) {
      if (userPrevReaction.reaction === type) {
        newReactions[type] = Math.max(0, Number(newReactions[type] || 0) - 1);
        currentReactionsMap[mId] = currentReactionsMap[mId].filter(r => r.user_id !== userId);
        try { await db.from('reactions').delete().eq('match_id', matchId).eq('user_id', userId); } catch (e) {}
      } else {
        const oldType = userPrevReaction.reaction;
        newReactions[oldType] = Math.max(0, Number(newReactions[oldType] || 0) - 1);
        newReactions[type] = Number(newReactions[type] || 0) + 1;
        userPrevReaction.reaction = type;
        try {
          await db.from('reactions').upsert([{ match_id: matchId, user_id: userId, username: userProfile.username, reaction_type: type }], { onConflict: 'match_id,user_id' });
        } catch (e) {}
      }
    } else {
      newReactions[type] = Number(newReactions[type] || 0) + 1;
      currentReactionsMap[mId].push({ user_id: userId, username: userProfile.username, reaction: type });
      try {
        await db.from('reactions').insert([{ match_id: matchId, user_id: userId, username: userProfile.username, reaction_type: type }]);
      } catch (e) {}
    }

    setMatchReactionsMap(currentReactionsMap);
    setMatchesData(prev => prev.map(m => String(m.id) === String(matchId) ? { ...m, reactions: newReactions } : m));
    try { await db.from('matches').update({ reactions: newReactions }).eq('id', matchId); } catch (err) {}
  };

  const sendGlobalChatMessage = async () => {
    const text = globalChatInput.trim();
    if (!text) { showToast("Chat message cannot be empty."); return; }
    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({ username: userProfile.username, message: text, user_id: currentUser?.id });
      const { error } = await db.from('chats').insert([sanitizedPayload]);
      if (error) showDatabaseError('chats', error, 'INSERT_GLOBAL_CHAT');
      else await loadDatabaseChats();
    } catch (err) {
      showToast(err.message || "Security exception blocked message.");
    }
    setGlobalChatInput('');
  };

  const submitFullscreenComment = async () => {
    const text = fullscreenCommentInput.trim();
    if (!text || !activeCommentMatchId) { showToast("Please enter a non-empty comment."); return; }
    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({ match_id: activeCommentMatchId, username: userProfile.username, comment: text, user_id: currentUser?.id });
      triggerFloatingLoader("Posting comment to database...", 50);
      const { error } = await db.from('comments').insert([sanitizedPayload]);
      if (error) {
        showDatabaseError('comments', error, 'INSERT_COMMENT');
        showToast("Failed to save comment.");
      } else {
        await loadDatabaseComments();
        showToast("Comment published successfully!", false);
      }
    } catch (err) {
      showToast(err.message || "Error occurred while posting comment.");
    }
    setFullscreenCommentInput('');
    hideFloatingLoader();
  };

  // Filter matches based on tabs & search
  const now = new Date();
  const filteredMatches = matchesData.filter(m => {
    const isFT = String(m.status || '').toUpperCase() === 'FT';
    const kickoff = parseMatchDateTime(m.match_date, m.match_time);
    const isPastDate = kickoff ? kickoff.getTime() < now.getTime() - (120 * 60 * 1000) : false;
    const isPastMatch = isFT || isPastDate;
    return activeMatchTab === 'past' ? isPastMatch : !isPastMatch;
  }).filter(m => {
    if (!matchSearchQuery) return true;
    const query = matchSearchQuery.toLowerCase();
    return String(m.teams || '').toLowerCase().includes(query) ||
           String(m.match_date || '').toLowerCase().includes(query) ||
           String(m.match_time || '').toLowerCase().includes(query) ||
           String(m.league || '').toLowerCase().includes(query);
  });

  const initials = getFirstNameInitials(userProfile.username);

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-mtlGreen selection:text-black" style={{ backgroundColor: '#0b0f19', color: '#f9fafb', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Inline Styles */}
      <style>{`
        .holo-bg-container { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 0; overflow: hidden; opacity: 0.5; }
        .holo-grid { position: absolute; inset: -50%; background-image: linear-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.08) 1px, transparent 1px); background-size: 60px 60px; transform: perspective(600px) rotateX(65deg) scale(2.5); animation: holoGridRotate 25s linear infinite; }
        @keyframes holoGridRotate { 0% { transform: perspective(600px) rotateX(65deg) rotateZ(0deg) scale(2.5); } 100% { transform: perspective(600px) rotateX(65deg) rotateZ(360deg) scale(2.5); } }
        .holo-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.35; animation: orbFloat 12s ease-in-out infinite alternate; }
        .holo-orb-1 { width: 450px; height: 450px; background: #10b981; top: -10%; left: -10%; }
        .holo-orb-2 { width: 500px; height: 500px; background: #00f0ff; bottom: -15%; right: -10%; animation-delay: -4s; }
        .holo-orb-3 { width: 350px; height: 350px; background: #3b82f6; top: 40%; left: 30%; animation-delay: -8s; }
        @keyframes orbFloat { 0% { transform: translateY(0px) translateX(0px) scale(1); } 50% { transform: translateY(-50px) translateX(40px) scale(1.1); } 100% { transform: translateY(40px) translateX(-30px) scale(0.95); } }
        .app-content-wrapper { position: relative; z-index: 10; }
        .pro-card { background: linear-gradient(135deg, rgba(31, 41, 55, 0.9) 0%, rgba(17, 24, 39, 0.95) 100%); backdrop-filter: blur(12px); border: 1px solid rgba(75, 85, 99, 0.4); border-radius: 1rem; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); }
        .pro-card:hover { border-color: #10b981; transform: translateY(-4px) scale(1.01); box-shadow: 0 14px 30px -5px rgba(0, 0, 0, 0.6), 0 0 16px rgba(16, 185, 129, 0.25); }
        .section-header { border-left: 4px solid #10b981; padding-left: 0.75rem; }
        .btn-see-more { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-weight: 700; padding: 0.6rem 1.4rem; border-radius: 9999px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35); border: 1px solid rgba(255, 255, 255, 0.2); transition: all 0.25s ease; display: inline-flex; align-items: center; gap: 0.5rem; }
        .btn-see-more:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5); filter: brightness(110%); }
        .animate-slide-in { opacity: 0; transform: translateY(30px); transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slide-in.active { opacity: 1; transform: translateY(0); }
        .floating-loader-overlay { position: fixed; inset: 0; background: rgba(11, 15, 25, 0.85); backdrop-filter: blur(12px); z-index: 100; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
        .floating-loader-overlay.active { opacity: 1; pointer-events: auto; }
        .loader-card { background: #111827; border: 1px solid #00f0ff; box-shadow: 0 0 35px rgba(0, 240, 255, 0.25); border-radius: 1.25rem; padding: 1.75rem; width: 90%; max-width: 420px; text-align: center; }
        .water-progress-container { width: 100%; background: #1f2937; height: 16px; border-radius: 9999px; position: relative; overflow: hidden; border: 1px solid rgba(0, 240, 255, 0.3); box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6); }
        .water-progress-bar { height: 100%; width: 0%; background: linear-gradient(90deg, #10b981 0%, #00f0ff 50%, #10b981 100%); background-size: 200% 100%; position: relative; border-radius: 9999px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 12px rgba(0, 240, 255, 0.6); animation: fluidFlow 3s linear infinite; }
        @keyframes fluidFlow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        .avatar-logo { background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); color: #ffffff; font-weight: 800; display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 0 10px rgba(59, 130, 246, 0.4); }
        .chat-bubble-me { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; border-radius: 1rem 1rem 0.2rem 1rem; align-self: flex-end; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
        .chat-bubble-other { background-color: #1f2937; border: 1px solid rgba(75, 85, 99, 0.5); color: #f3f4f6; border-radius: 1rem 1rem 1rem 0.2rem; align-self: flex-start; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0b0f19; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>

      {/* Pure CSS 4D Interactive Holographic Background Container */}
      <div className="holo-bg-container">
        <div className="holo-grid"></div>
        <div className="holo-orb holo-orb-1"></div>
        <div className="holo-orb holo-orb-2"></div>
        <div className="holo-orb holo-orb-3"></div>
      </div>

      <div className="app-content-wrapper flex flex-col min-h-screen justify-between">

        {/* Error Toast Container */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className={`px-4 py-3 rounded-xl border text-xs font-bold shadow-2xl flex items-center gap-2 transform transition-all duration-300 pointer-events-auto ${t.isError ? 'bg-red-950/90 border-red-500/50 text-red-300' : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'}`}>
              <span>{t.isError ? '⚠️' : '✔️'}</span><span>{sanitizeInput(t.message)}</span>
            </div>
          ))}
        </div>

        {/* Floating Prompt Loader */}
        <div className={`floating-loader-overlay ${isLoaderActive ? 'active' : ''}`}>
          <div className="loader-card space-y-4">
            <div className="flex items-center justify-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#00f0ff] animate-ping"></span>
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#00f0ff]" style={{ fontFamily: 'Orbitron, sans-serif' }}>QUANTUM SYNC</h4>
            </div>
            <p className="text-sm font-medium text-gray-200">{loaderPromptText}</p>
            <div className="water-progress-container">
              <div className="water-progress-bar" style={{ width: `${loaderProgress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Reacted Users Floating Container List */}
        {reactionModalData.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#10b981] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative animate-slide-in active">
              <div className="flex justify-between items-center border-b border-[#374151] pb-3">
                <h4 className="font-bold text-sm text-[#10b981]" style={{ fontFamily: 'Orbitron, sans-serif' }}>{reactionModalData.title}</h4>
                <button onClick={() => setReactionModalData({ isOpen: false, title: '', users: [] })} className="text-gray-400 hover:text-white font-bold">✕</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                {reactionModalData.users.length === 0 ? (
                  <p className="text-gray-500 italic py-2">No users have put this reaction yet.</p>
                ) : (
                  reactionModalData.users.map((u, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-[#0b0f19] rounded-lg border border-[#374151]">
                      <div className="w-6 h-6 avatar-logo text-[10px] font-bold">{getFirstNameInitials(u.username)}</div>
                      <span className="text-xs font-semibold text-gray-200">{sanitizeInput(u.username)}</span>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => setReactionModalData({ isOpen: false, title: '', users: [] })} className="w-full bg-[#1f2937] border border-[#374151] text-gray-300 py-2 rounded-xl text-xs font-bold hover:text-white">Close</button>
            </div>
          </div>
        )}

        {/* Side Navigation Overlay Menu */}
        <div>
          <div onClick={toggleSideNav} className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity ${isSideNavOpen ? '' : 'hidden'}`}></div>
          <aside className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-[#111827] border-l border-[#374151] z-50 transform transition-transform duration-300 ease-in-out flex flex-col justify-between p-6 shadow-2xl ${isSideNavOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#374151] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 avatar-logo text-sm font-bold">{initials}</div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{userProfile.username}</h3>
                    <span className="text-[10px] text-gray-400">{userProfile.email}</span>
                  </div>
                </div>
                <button onClick={toggleSideNav} className="w-8 h-8 rounded-full bg-[#0b0f19] text-gray-400 hover:text-white flex items-center justify-center font-bold">✕</button>
              </div>

              <nav className="space-y-3">
                <a href="/dashboard" className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#10b981]/10 border border-[#10b981] text-[#10b981] hover:bg-[#10b981] hover:text-black transition text-xs font-bold">
                  <span className="text-base">⬅️</span> Back to Dashboard
                </a>
                <button onClick={() => { setDialingModalOpen(true); toggleSideNav(); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1f2937] border border-[#374151] hover:border-[#10b981] hover:text-[#10b981] transition text-xs font-semibold text-gray-200">
                  <span className="text-base">📞</span> Contact Centre
                </button>
                <button onClick={() => { setSettingsModalOpen(true); toggleSideNav(); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1f2937] border border-[#374151] hover:border-[#10b981] hover:text-[#10b981] transition text-xs font-semibold text-gray-200">
                  <span className="text-base">⚙️</span> Preferences & Settings
                </button>
              </nav>
            </div>

            <div className="pt-6 border-t border-[#374151] space-y-3">
              <button onClick={signOutUser} className="w-full bg-red-950/60 text-red-300 border border-red-500/40 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-red-800 hover:text-white transition flex items-center justify-center gap-2">
                <span>❌</span> Sign Out
              </button>
            </div>
          </aside>
        </div>

        <div>
          {/* Header */}
          <header className="border-b border-[#374151] bg-[#111827]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a href="/dashboard" title="Back to Dashboard" className="w-9 h-9 rounded-xl bg-[#1f2937] border border-[#374151] text-[#10b981] flex items-center justify-center font-bold text-sm hover:bg-[#10b981] hover:text-black transition">⬅️</a>
                <div className="w-10 h-10 avatar-logo text-lg cursor-pointer" onClick={() => setDialingModalOpen(true)}>{initials}</div>
                <div>
                  <h1 className="font-bold tracking-wider text-lg leading-tight text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>PREDICTIONS <span className="text-[#10b981]">HUB</span></h1>
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Feel Welcomed.</span>
                </div>
              </div>

              <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
                <a href="/dashboard" className="flex items-center gap-2 text-[#10b981] border-b-2 border-[#10b981] pb-1 font-bold">DASHBOARD</a>
                <a href="#live-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">LIVE</a>
                <a href="#fixtures-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">FIXTURES</a>
                <a href="#db-matches-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">PREDICTIONS</a>
                <a href="#trending-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">COMMUNITY</a>
              </nav>

              <div className="flex items-center gap-3">
                <button onClick={toggleSideNav} title="Open Navigation Options" className="w-10 h-10 rounded-full bg-[#1f2937] border border-[#374151] text-gray-200 flex items-center justify-center hover:text-[#10b981] transition">
                  ☰
                </button>
                
                <div className="hidden md:flex items-center gap-3 bg-[#1f2937] border border-[#374151] px-3 py-1.5 rounded-full cursor-pointer" onClick={toggleSideNav}>
                  <div className="w-7 h-7 avatar-logo text-xs">{initials}</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-200">{userProfile.username} ({userProfile.role.toUpperCase()})</span>
                    <span className="text-[9px] text-gray-400">{userProfile.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Banner */}
          <section className="relative overflow-hidden py-12 px-6 border-b border-[#374151] bg-gradient-to-b from-[#111827] to-[#0b0f19] animate-slide-in">
            <div className="max-w-7xl mx-auto text-center relative z-10">
              <span className="text-xs uppercase tracking-[0.25em] text-[#10b981] font-bold bg-[#10b981]/10 px-4 py-1.5 rounded-full border border-[#10b981]/20">Sports Analytics & 4D Intelligence</span>
              <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight mt-3 uppercase text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>FOOTBALL <span className="text-[#10b981]">INTELLIGENCE</span></h2>
              <p className="text-gray-400 text-sm lg:text-base mt-2 max-w-2xl mx-auto font-medium">Real-time stats, AI match predictions, dynamic hotline dialing and secure encrypted feeds.</p>
            </div>
          </section>

          {/* Detailed Database Error Console */}
          {dbError && (
            <div className="max-w-7xl mx-auto px-6 pt-6">
              <div className="bg-red-950/50 border border-red-500/40 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">⚠</div>
                    <div>
                      <h3 className="font-extrabold text-red-400 text-sm uppercase tracking-wider">DATABASE ERROR</h3>
                      <p className="text-xs text-gray-300 mt-1">{dbError.title}</p>
                    </div>
                  </div>
                  <button onClick={hideDatabaseError} className="text-gray-500 hover:text-white">✕</button>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-black/20 border border-red-500/10 rounded-xl p-3">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Diagnostic Reason</span>
                    <p className="text-xs text-red-300 mt-1 font-semibold">{dbError.diagnosis}</p>
                  </div>
                  <div className="bg-black/20 border border-red-500/10 rounded-xl p-3">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Recommended Fix</span>
                    <p className="text-xs text-gray-300 mt-1">{dbError.action}</p>
                  </div>
                  <div className="bg-black/20 border border-red-500/10 rounded-xl p-3">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Technical Trace</span>
                    <pre className="text-[10px] text-red-300 mt-1 whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-mono">{dbError.details}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Grid */}
          <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">

            {/* Live Section */}
            <section id="live-section" className="animate-slide-in">
              <div className="flex items-center justify-between mb-6 section-header">
                <div>
                  <h3 className="font-extrabold text-lg uppercase tracking-wide text-white flex items-center gap-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> LIVE MATCHES
                  </h3>
                  <span className="text-xs text-gray-400">{liveMatchesData.length} Matches Active</span>
                </div>
                <button onClick={() => setStatsModal({ isOpen: true, title: 'Live Games Directory', dataset: liveMatchesData })} className="btn-see-more">
                  <span>SEE MORE MATCHES</span> ➔
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {liveMatchesData.length === 0 ? (
                  <div className="col-span-3 text-center py-8 pro-card"><p className="text-xs text-gray-400">No live matches currently in play.</p></div>
                ) : (
                  liveMatchesData.slice(0, 3).map((match) => {
                    const teamParts = String(match.teams || '').split(/\s+vs\.?\s+/i);
                    const home = teamParts[0] || 'HOME';
                    const away = teamParts[1] || 'AWAY';
                    return (
                      <div key={match.id} {...attachCardLongPress(`Live match results for ${match.teams}`)} onClick={() => setFullscreenMatchModal({ isOpen: true, matchId: match.id })} className="pro-card p-5 relative overflow-hidden cursor-pointer animate-slide-in active">
                        <div className="flex justify-between items-center text-xs text-gray-400 mb-3 font-semibold">
                          <span className="hover:text-[#10b981]" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Match live summary ${sanitizeInput(match.teams)}`); }} style={{ fontFamily: 'Orbitron, sans-serif' }}>{sanitizeInput(match.league)}</span>
                          <span className="text-red-500 font-bold animate-pulse">● LIVE</span>
                        </div>
                        <div className="flex items-center justify-between my-4">
                          <div className="text-center flex-1">
                            <div className="w-10 h-10 mx-auto avatar-logo mb-1 text-xs" style={{ fontFamily: 'Orbitron, sans-serif' }}>{sanitizeInput(getTeamBadge(home))}</div>
                            <span className="text-xs font-bold tracking-wide text-white">{sanitizeInput(home)}</span>
                          </div>
                          <div className="text-2xl font-extrabold tracking-wider px-2 text-[#10b981]" style={{ fontFamily: 'Orbitron, sans-serif' }}>- _ -</div>
                          <div className="text-center flex-1">
                            <div className="w-10 h-10 mx-auto avatar-logo mb-1 text-xs" style={{ fontFamily: 'Orbitron, sans-serif' }}>{sanitizeInput(getTeamBadge(away))}</div>
                            <span className="text-xs font-bold tracking-wide text-white">{sanitizeInput(away)}</span>
                          </div>
                        </div>
                        <div className="text-center text-xs font-semibold text-[#10b981] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>{sanitizeInput(match.minute)} Minutes</div>
                        <div className="water-progress-container mb-3">
                          <div className="water-progress-bar" style={{ width: `${match.progress}%` }}></div>
                        </div>
                        <div className="text-[11px] text-gray-400 pt-2 border-t border-[#374151] flex justify-between items-center">
                          <span className="truncate">{sanitizeInput(match.details)}</span>
                          {userProfile.role === 'admin' && (
                            <div className="flex gap-1 ml-2">
                              <button onClick={(e) => { e.stopPropagation(); setActiveAdminSection('matches'); setEditingItemId(match.id); setAdminModalOpen(true); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded hover:bg-amber-500 hover:text-black">Edit</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Predictions Section */}
            <section id="db-matches-section" className="bg-[#111827] border border-[#374151] rounded-2xl p-6 animate-slide-in shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 section-header">
                <div>
                  <h3 className="text-lg font-extrabold uppercase tracking-wide text-white cursor-pointer hover:text-[#10b981] transition" style={{ fontFamily: 'Orbitron, sans-serif' }} onClick={() => openGoogleSearchIframe('Live database matches and football predictions')}>
                    ⚽ MATCHES & PREDICTIONS
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Hold match cards long press to trigger Google Search.</p>
                </div>
                <button onClick={() => setStatsModal({ isOpen: true, title: 'All Database Predictions', dataset: matchesData })} className="btn-see-more">
                  <span>SEE MORE</span> ➔
                </button>
              </div>

              {/* Controls Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 border-b border-[#374151] pb-4">
                <div className="flex items-center gap-2 bg-[#0b0f19] p-1.5 rounded-xl border border-[#374151] self-start">
                  <button onClick={() => setActiveMatchTab('future')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeMatchTab === 'future' ? 'bg-[#10b981] text-black' : 'text-gray-400 hover:text-white'}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    UPCOMING MATCHES
                  </button>
                  <button onClick={() => setActiveMatchTab('past')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeMatchTab === 'past' ? 'bg-[#10b981] text-black' : 'text-gray-400 hover:text-white'}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    PAST PREDICTIONS
                  </button>
                </div>

                <div className="relative flex-1 max-w-md">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-xs">🔍</span>
                  <input type="text" value={matchSearchQuery} onChange={(e) => setMatchSearchQuery(e.target.value)} placeholder="Search match by name, date (YYYY-MM-DD), or time..." className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl pl-8 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredMatches.length === 0 ? (
                  <div className="col-span-3 text-center py-10 pro-card"><p className="text-xs text-gray-400">No matches found matching query.</p></div>
                ) : (
                  filteredMatches.slice(0, 3).map((match) => {
                    const type = String(match.type || 'free');
                    const typeClass = type.toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                    const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';
                    const oddsText = match.decimal_odds !== null && match.decimal_odds !== undefined ? formatOdds(match.decimal_odds) : 'N/A';
                    const probHome = Number(match.prob_home) || 0;
                    const probDraw = Number(match.prob_draw) || 0;
                    const probAway = Number(match.prob_away) || 0;
                    const comments = matchCommentsStore[match.id] || [];

                    return (
                      <div key={match.id} {...attachCardLongPress(`Football Match Prediction for ${match.teams || ''}`)} className="pro-card p-5 flex flex-col justify-between space-y-4 cursor-pointer animate-slide-in active">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${typeClass}`}>{sanitizeInput(type)} Match</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-amber-400 font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>Odds: {sanitizeInput(oddsText)}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{sanitizeInput(match.match_date || '')} {sanitizeInput(match.match_time || '')}</span>
                            </div>
                          </div>
                          <h4 className="font-extrabold text-base text-white tracking-wide hover:text-[#10b981]" style={{ fontFamily: 'Orbitron, sans-serif' }} onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Prediction summary for ${sanitizeInput(match.teams)}`); }}>
                            {sanitizeInput(match.teams || 'Unknown Match')}
                          </h4>
                          <p className="text-xs text-[#10b981] font-semibold">Prediction: {sanitizeInput(match.prediction || 'N/A')} ({stars})</p>
                          <p className="text-xs text-gray-400 line-clamp-2">{sanitizeInput(match.analysis_text || 'Tactical breakdown in detailed view.')}</p>
                        </div>

                        <div className="space-y-1 bg-[#0b0f19] p-3 rounded-xl border border-[#374151]">
                          <div className="flex justify-between text-[10px] font-bold text-gray-300">
                            <span>Probability:</span>
                            <span>H: {probHome}% | D: {probDraw}% | A: {probAway}%</span>
                          </div>
                          <div className="water-progress-container">
                            <div className="water-progress-bar" style={{ width: `${probHome}%` }}></div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button onClick={(e) => { e.stopPropagation(); reactToMatch(match.id, 'fire'); }} className="bg-[#0b0f19] border border-[#374151] px-2.5 py-1 rounded-lg text-xs hover:border-[#10b981] flex items-center gap-1 transition">
                            🔥 <span>{match.reactions?.fire || 0}</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); reactToMatch(match.id, 'heart'); }} className="bg-[#0b0f19] border border-[#374151] px-2.5 py-1 rounded-lg text-xs hover:border-[#10b981] flex items-center gap-1 transition">
                            ❤️ <span>{match.reactions?.heart || 0}</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); reactToMatch(match.id, 'dislike'); }} className="bg-[#0b0f19] border border-[#374151] px-2.5 py-1 rounded-lg text-xs hover:border-[#10b981] flex items-center gap-1 transition">
                            👎 <span>{match.reactions?.dislike || 0}</span>
                          </button>
                        </div>

                        <div onClick={(e) => { e.stopPropagation(); setActiveCommentMatchId(match.id); setCommentsModal({ isOpen: true, matchId: match.id, title: `Comments Stream: ${match.teams || 'Match Thread'}`, subtitle: 'Leave a comment.' }); }} className="bg-[#0b0f19] rounded-xl p-3 space-y-2 border border-[#374151] hover:border-[#10b981] transition cursor-pointer">
                          <div className="flex justify-between items-center text-[11px] font-bold text-gray-300">
                            <span>💬 Comments ({comments.length})</span>
                            <span className="text-[#10b981] text-[10px] uppercase font-bold">🖥️ Fullscreen View ➔</span>
                          </div>
                          <div className="space-y-1.5 max-h-20 overflow-y-auto text-[11px]">
                            {comments.length === 0 ? <p className="text-gray-500 italic text-[10px]">No comments yet. Click to start discussion.</p> : ''}
                            {comments.slice(-2).map((c, idx) => (
                              <div key={idx} className="bg-[#1f2937] p-1.5 rounded border border-[#374151] text-gray-300"><span className="font-bold text-[#10b981]">{sanitizeInput(c.user)}:</span> {sanitizeInput(c.comment)}</div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#374151] flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setFullscreenMatchModal({ isOpen: true, matchId: match.id }); }} className="bg-[#10b981]/10 border border-[#10b981] text-[#10b981] hover:bg-[#10b981] hover:text-black font-bold px-3 py-1.5 rounded-xl text-xs transition">🔍 Details</button>
                            <button onClick={(e) => { e.stopPropagation(); setActiveMatchChatId(match.id); setMatchChatModal({ isOpen: true, matchId: match.id, title: `Telegram Chat: ${match.teams || ''}` }); }} className="bg-[#0b0f19] border border-[#374151] px-3 py-1.5 rounded-xl text-xs text-gray-200 hover:text-[#10b981] transition flex items-center gap-1">💬 Telegram Chat</button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {userProfile.role === 'admin' && (
                <div className="mt-6 pt-4 border-t border-[#374151] flex justify-center">
                  <button onClick={() => { setActiveAdminSection('matches'); setEditingItemId(null); setAdminModalOpen(true); }} className="bg-[#10b981] text-black font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider hover:bg-[#059669] transition flex items-center gap-2">
                    <span>➕</span> ADD PREDICTION
                  </button>
                </div>
              )}
            </section>

            {/* Grid for Fixtures & Trending */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Fixtures */}
              <section id="fixtures-section" className="bg-[#111827] border border-[#374151] rounded-2xl p-6 flex flex-col justify-between space-y-4 animate-slide-in shadow-2xl">
                <div>
                  <div className="flex items-center justify-between mb-6 section-header">
                    <div>
                      <h3 className="font-extrabold uppercase tracking-wide text-base text-white cursor-pointer hover:text-[#10b981] transition" style={{ fontFamily: 'Orbitron, sans-serif' }} onClick={() => openGoogleSearchIframe('Upcoming football fixtures schedule')}>
                         UPCOMING FIXTURES
                      </h3>
                      <span className="text-xs text-gray-400">Upcoming fixtures</span>
                    </div>
                    <button onClick={() => setStatsModal({ isOpen: true, title: 'Complete Fixtures Schedule', dataset: fixturesData })} className="btn-see-more text-xs py-2 px-3.5">
                      <span>SEE MORE</span> ➔
                    </button>
                  </div>
                  <div className="space-y-4">
                    {fixturesData.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-500">No upcoming fixtures recorded.</div>
                    ) : (
                      fixturesData.slice(0, 3).map((fix) => (
                        <div key={fix.id} {...attachCardLongPress(`Football fixture data for ${fix.teams || ''} ${fix.league || ''}`)} className="pro-card p-4 flex items-center justify-between cursor-pointer animate-slide-in active">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#0b0f19] border border-[#374151] flex items-center justify-center font-bold text-xs text-[#10b981]" style={{ fontFamily: 'Orbitron, sans-serif' }}>{sanitizeInput(fix.badge)}</div>
                            <div>
                              <h4 className="font-bold text-xs text-white hover:text-[#10b981]" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Fixture schedule ${sanitizeInput(fix.teams)}`); }}>{sanitizeInput(fix.teams || 'Fixture')}</h4>
                              <span className="text-[10px] text-gray-400">{sanitizeInput(fix.league || 'League')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xs font-bold text-[#10b981] block" style={{ fontFamily: 'Orbitron, sans-serif' }}>{sanitizeInput(fix.match_time || 'TBD')}</span>
                              <span className="text-[10px] text-gray-500">{sanitizeInput(fix.match_date || 'TBD')}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {userProfile.role === 'admin' && (
                  <div className="pt-4 border-t border-[#374151] flex justify-center">
                    <button onClick={() => { setActiveAdminSection('fixtures'); setEditingItemId(null); setAdminModalOpen(true); }} className="bg-[#1f2937] border border-[#10b981] text-[#10b981] font-bold px-5 py-2 rounded-xl text-xs hover:bg-[#10b981] hover:text-black transition flex items-center gap-2">
                      <span>➕</span> ADD FIXTURE
                    </button>
                  </div>
                )}
              </section>

              {/* Trending News */}
              <section id="trending-section" className="bg-[#111827] border border-[#374151] rounded-2xl p-6 flex flex-col justify-between space-y-4 animate-slide-in shadow-2xl">
                <div>
                  <div className="flex items-center justify-between mb-6 section-header">
                    <div>
                      <h3 className="font-extrabold uppercase tracking-wide text-base text-white cursor-pointer hover:text-[#10b981] transition" style={{ fontFamily: 'Orbitron, sans-serif' }} onClick={() => openGoogleSearchIframe('Trending football news updates')}>
                        🔥 TRENDING NEWS
                      </h3>
                      <span className="text-xs text-gray-400">What's trending.</span>
                    </div>
                    <button onClick={() => setStatsModal({ isOpen: true, title: 'All Trending News', dataset: trendingData })} className="btn-see-more text-xs py-2 px-3.5">
                      <span>SEE MORE</span> ➔
                    </button>
                  </div>
                  <div className="space-y-4">
                    {trendingData.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-500">No trending headlines.</div>
                    ) : (
                      trendingData.slice(0, 3).map((item) => (
                        <div key={item.id} {...attachCardLongPress(`Football news updates on ${item.title || ''}`)} className="pro-card p-4 flex items-center justify-between cursor-pointer animate-slide-in active">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-extrabold text-[#10b981]" style={{ fontFamily: 'Orbitron, sans-serif' }}>#{sanitizeInput(item.rank)}</span>
                            <div>
                              <h4 className="font-bold text-xs text-white hover:text-[#10b981]" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(sanitizeInput(item.title)); }}>{sanitizeInput(item.title)}</h4>
                              <span className="text-[10px] text-gray-500">💬 {Number(item.comments_count) || 6237} discussions</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {userProfile.role === 'admin' && (
                  <div className="pt-4 border-t border-[#374151] flex justify-center">
                    <button onClick={() => { setActiveAdminSection('trending'); setEditingItemId(null); setAdminModalOpen(true); }} className="bg-[#1f2937] border border-[#10b981] text-[#10b981] font-bold px-5 py-2 rounded-xl text-xs hover:bg-[#10b981] hover:text-black transition flex items-center gap-2">
                      <span>➕</span> ADD NEWS
                    </button>
                  </div>
                )}
              </section>

            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-[#374151] bg-[#111827] mt-16 py-8 px-6 text-center text-xs text-gray-400">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <p>© 2026 MTL Football Intelligence Hub. All rights reserved.</p>
              <div className="flex items-center gap-6">
                <a href="/dashboard" className="text-[#10b981] font-bold hover:underline">Dashboard</a>
                <a href="#" className="hover:text-[#10b981]">Privacy Policy</a>
                <a href="#" className="hover:text-[#10b981]">Terms of Service</a>
                <a href="#" onClick={() => setDialingModalOpen(true)} className="hover:text-[#10b981]">Developed BY M. Lennox</a>
              </div>
            </div>
          </footer>
        </div>

        {/* Google Iframe Modal Automated to AI MODE */}
        {googleModal.isOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col p-3 sm:p-6">
            <div className="bg-[#111827] border border-[#374151] rounded-2xl p-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#10b981] text-black font-extrabold flex items-center justify-center" style={{ fontFamily: 'Orbitron, sans-serif' }}>AI</div>
                <div>
                  <h4 className="text-xs font-bold text-[#10b981]" style={{ fontFamily: 'Orbitron, sans-serif' }}>GOOGLE QUICK SEARCH</h4>
                  <p className="text-[10px] text-gray-400 font-mono">{googleModal.query}</p>
                </div>
              </div>
              <button onClick={() => setGoogleModal({ isOpen: false, query: '', src: 'about:blank' })} className="w-8 h-8 rounded-full bg-red-900/40 text-red-300 border border-red-500/30 flex items-center justify-center font-bold text-xs hover:bg-red-800">✕</button>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-[#374151] bg-white">
              <iframe className="w-full h-full border-0" src={googleModal.src}></iframe>
            </div>
          </div>
        )}

        {/* Global Telegram-Style Chat Floating Drawer */}
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={() => setChatDrawerOpen(!chatDrawerOpen)} className="w-14 h-14 rounded-full bg-[#10b981] text-black flex items-center justify-center text-2xl font-bold shadow-lg hover:scale-105 transition transform">💬</button>
          <div className={`absolute bottom-20 right-0 w-80 sm:w-96 bg-[#111827] border border-[#374151] rounded-2xl shadow-2xl flex flex-col h-[480px] overflow-hidden ${chatDrawerOpen ? '' : 'hidden'}`}>
            <div className="bg-[#0b0f19] p-4 border-b border-[#374151] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
                <h4 className="font-bold text-sm tracking-wide text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>Community Chat</h4>
              </div>
              <button onClick={() => setChatDrawerOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
              {globalChatMessages.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-8">Welcome to Telegram global chat!</div>
              ) : (
                globalChatMessages.map((msg, idx) => {
                  const isMe = currentUser && msg.user_id === currentUser.id;
                  return (
                    <div key={idx} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'} animate-slide-in active`}>
                      <div className="text-[9px] text-gray-400 mb-0.5 px-1">{sanitizeInput(msg.user)} • {sanitizeInput(msg.time)}</div>
                      <div className={`px-3.5 py-2 text-xs ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>{sanitizeInput(msg.text)}</div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-3 border-t border-[#374151] bg-[#0b0f19] flex gap-2">
              <input type="text" value={globalChatInput} onChange={(e) => setGlobalChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendGlobalChatMessage()} placeholder="Type Telegram message..." className="flex-1 bg-[#1f2937] border border-[#374151] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]" />
              <button onClick={sendGlobalChatMessage} className="bg-[#10b981] text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-[#059669] transition">Send</button>
            </div>
          </div>
        </div>

        {/* Fullscreen Comments Modal */}
        {commentsModal.isOpen && (
          <div className="fixed inset-0 bg-[#0b0f19]/95 backdrop-blur-xl z-50 p-4 md:p-10 overflow-y-auto flex flex-col justify-between">
            <div className="max-w-4xl w-full mx-auto bg-[#111827] border border-[#10b981]/40 rounded-3xl p-6 md:p-8 shadow-2xl relative flex-1 flex flex-col justify-between space-y-6">
              
              <div className="flex items-center justify-between border-b border-[#374151] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#10b981]/20 border border-[#10b981] text-[#10b981] flex items-center justify-center font-bold text-lg" style={{ fontFamily: 'Orbitron, sans-serif' }}>💬</div>
                  <div>
                    <h3 className="text-lg md:text-xl font-extrabold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{commentsModal.title}</h3>
                    <p className="text-xs text-[#10b981]">{commentsModal.subtitle}</p>
                  </div>
                </div>
                <button onClick={() => setCommentsModal({ isOpen: false, matchId: '', title: '', subtitle: '' })} className="w-10 h-10 rounded-full bg-[#1f2937] border border-[#374151] text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[60vh]">
                {(!matchCommentsStore[commentsModal.matchId] || matchCommentsStore[commentsModal.matchId].length === 0) ? (
                  <div className="text-center text-gray-500 py-12 text-xs font-medium">No comments posted for this match yet. Be the first to share analysis!</div>
                ) : (
                  matchCommentsStore[commentsModal.matchId].map((c, idx) => (
                    <div key={idx} className="bg-[#1f2937] border border-[#374151] p-4 rounded-2xl space-y-2 flex gap-3 items-start animate-slide-in active">
                      <div className="w-9 h-9 rounded-full bg-[#10b981]/20 text-[#10b981] font-bold flex items-center justify-center text-xs flex-shrink-0" style={{ fontFamily: 'Orbitron, sans-serif' }}>{getFirstNameInitials(c.user)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#10b981]" style={{ fontFamily: 'Orbitron, sans-serif' }}>{sanitizeInput(c.user)}</span>
                          <span className="text-[10px] text-gray-500">{sanitizeInput(c.time)}</span>
                        </div>
                        <p className="text-xs text-gray-200 mt-1 leading-relaxed">{sanitizeInput(c.comment)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-[#0b0f19] p-4 rounded-2xl border border-[#374151] space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Post Public Comment</h4>
                <div className="flex gap-3">
                  <textarea value={fullscreenCommentInput} onChange={(e) => setFullscreenCommentInput(e.target.value)} rows="2" placeholder="Write detailed comment to be recorded in database..." className="flex-1 bg-[#1f2937] border border-[#374151] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#10b981]"></textarea>
                  <button onClick={submitFullscreenComment} className="bg-[#10b981] text-black font-extrabold px-6 py-2 rounded-xl text-xs hover:bg-[#059669] transition self-end">Post Comment</button>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#374151]">
                <button onClick={() => setCommentsModal({ isOpen: false, matchId: '', title: '', subtitle: '' })} className="btn-see-more">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* See More Directory Modal */}
        {statsModal.isOpen && (
          <div className="fixed inset-0 bg-[#0b0f19]/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">
            <div className="max-w-5xl mx-auto bg-[#111827] border border-[#374151] rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">
              <button onClick={() => setStatsModal({ isOpen: false, title: '', dataset: [] })} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-[#1f2937] border border-[#374151] text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              <div className="space-y-6">
                <div className="border-b border-[#374151] pb-4 section-header">
                  <h3 className="text-2xl font-extrabold text-[#10b981] uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>{statsModal.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">Dataset display.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[65vh] overflow-y-auto pr-2">
                  {statsModal.dataset.map((item, idx) => (
                    <div key={idx} className="pro-card p-4 space-y-2">
                      <h4 className="font-bold text-white text-sm" style={{ fontFamily: 'Orbitron, sans-serif' }}>{sanitizeInput(item.teams || item.title || 'Item')}</h4>
                      <p className="text-xs text-gray-400">{sanitizeInput(item.league || item.prediction || '')}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-[#374151] flex justify-end">
                <button onClick={() => setStatsModal({ isOpen: false, title: '', dataset: [] })} className="btn-see-more">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Match Details Modal */}
        {fullscreenMatchModal.isOpen && (
          <div className="fixed inset-0 bg-[#0b0f19]/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">
            <div className="max-w-5xl mx-auto bg-[#111827] border border-[#374151] rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">
              <button onClick={() => setFullscreenMatchModal({ isOpen: false, matchId: null })} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-[#1f2937] border border-[#374151] text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              <div className="space-y-8">
                {(() => {
                  const match = matchesData.find(m => String(m.id) === String(fullscreenMatchModal.matchId)) || liveMatchesData.find(m => String(m.id) === String(fullscreenMatchModal.matchId));
                  if (!match) return <p className="text-gray-400">Match details not found.</p>;
                  const type = String(match.type || 'free');
                  const typeClass = type.toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                  const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';
                  return (
                    <>
                      <div className="flex justify-between items-start border-b border-[#374151] pb-6 section-header">
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${typeClass}`}>{sanitizeInput(type)} INTEL</span>
                          <h2 className="text-3xl lg:text-4xl font-extrabold text-white mt-2 hover:text-[#10b981] cursor-pointer" style={{ fontFamily: 'Orbitron, sans-serif' }} onClick={() => openGoogleSearchIframe(`Live analysis ${sanitizeInput(match.teams)}`)}>{sanitizeInput(match.teams || 'Unknown Match')}</h2>
                          <p className="text-xs text-gray-400 mt-1 font-mono">Date: {sanitizeInput(match.match_date || '')} | Kickoff: {sanitizeInput(match.match_time || '')}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400 uppercase tracking-widest block" style={{ fontFamily: 'Orbitron, sans-serif' }}>Confidence</span>
                          <span className="text-2xl">{stars}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#0b0f19] p-5 rounded-2xl border border-[#374151] space-y-2">
                          <span className="text-xs text-[#10b981] font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>Prediction</span>
                          <p className="text-xl font-extrabold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{sanitizeInput(match.prediction || 'N/A')}</p>
                        </div>
                        <div className="bg-[#0b0f19] p-5 rounded-2xl border border-[#374151] space-y-2">
                          <span className="text-xs text-amber-400 font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>Decimal Odds</span>
                          <p className="text-xl font-extrabold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{formatOdds(match.decimal_odds)}</p>
                        </div>
                        <div className="bg-[#0b0f19] p-5 rounded-2xl border border-[#374151] space-y-2">
                          <span className="text-xs text-blue-400 font-bold uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>Status & Score</span>
                          <p className="text-xl font-extrabold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>{sanitizeInput(match.status || 'PENDING')} ({sanitizeInput(match.final_score || 'Awaiting')})</p>
                        </div>
                      </div>
                      <div className="bg-[#0b0f19] p-6 rounded-2xl border border-[#374151] space-y-3">
                        <h4 className="font-extrabold text-sm uppercase tracking-wider text-[#10b981]" style={{ fontFamily: 'Orbitron, sans-serif' }}>Tactical Intelligence & Match Analysis</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">{sanitizeInput(match.analysis_text || 'Detailed tactical breakdown not provided.')}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="mt-8 pt-6 border-t border-[#374151] flex justify-between items-center">
                <button onClick={() => setFullscreenMatchModal({ isOpen: false, matchId: null })} className="btn-see-more">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Match Chat Modal */}
        {matchChatModal.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#374151] rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="bg-[#0b0f19] p-4 border-b border-[#374151] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#10b981]" style={{ fontFamily: 'Orbitron, sans-serif' }}>{matchChatModal.title}</h4>
                  <p className="text-[10px] text-gray-400">Match discussion Group</p>
                </div>
                <button onClick={() => setMatchChatModal({ isOpen: false, matchId: null, title: '' })} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
                {(!matchChatStore[matchChatModal.matchId] || matchChatStore[matchChatModal.matchId].length === 0) ? (
                  <div className="text-center text-gray-500 text-xs py-8">No messages in this match chat yet. Start the conversation!</div>
                ) : (
                  matchChatStore[matchChatModal.matchId].map((msg, idx) => {
                    const isMe = currentUser && msg.user_id === currentUser.id;
                    return (
                      <div key={idx} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'} animate-slide-in active`}>
                        <div className="text-[9px] text-gray-400 mb-0.5 px-1">{sanitizeInput(msg.user)} • {sanitizeInput(msg.time)}</div>
                        <div className={`px-3.5 py-2 text-xs ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>{sanitizeInput(msg.text)}</div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="p-3 border-t border-[#374151] bg-[#0b0f19] flex gap-2">
                <input type="text" value={matchChatInput} onChange={(e) => setMatchChatInput(e.target.value)} onKeyDown={async (e) => {
                  if (e.key === 'Enter' && matchChatInput.trim()) {
                    await db.from('chats').insert([{ match_id: matchChatModal.matchId, username: userProfile.username, message: matchChatInput.trim(), user_id: currentUser?.id }]);
                    setMatchChatInput('');
                    await loadDatabaseChats();
                  }
                }} placeholder="Discuss this match..." className="flex-1 bg-[#1f2937] border border-[#374151] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]" />
                <button onClick={async () => {
                  if (matchChatInput.trim()) {
                    await db.from('chats').insert([{ match_id: matchChatModal.matchId, username: userProfile.username, message: matchChatInput.trim(), user_id: currentUser?.id }]);
                    setMatchChatInput('');
                    await loadDatabaseChats();
                  }
                }} className="bg-[#10b981] text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-[#059669] transition">Post</button>
              </div>
            </div>
          </div>
        )}

        {/* Hotline Modal */}
        {dialingModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#374151] rounded-2xl w-full max-w-2xl p-6 md:p-8 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-[#374151] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#10b981]/20 border border-[#10b981] text-[#10b981] flex items-center justify-center text-xl">📞</div>
                  <div>
                    <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>Live Call Centre</h3>
                    <p className="text-xs text-gray-400">Direct call support +254716883895</p>
                  </div>
                </div>
                <button onClick={() => setDialingModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0b0f19] p-4 rounded-xl border border-[#374151] space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#10b981] tracking-wider">WHATSAPP</span>
                    <h4 className="font-bold text-sm text-white mt-1">Chat on WhatsApp</h4>
                    <p className="text-xs text-gray-400">Message us directly on WhatsApp.</p>
                  </div>
                  <a href="https://wa.me/254716883895" target="_blank" rel="noreferrer" className="w-full bg-[#10b981] text-black text-center text-xs font-bold py-2.5 rounded-xl hover:bg-[#059669] transition mt-3 block">💬 WhatsApp +254716883895</a>
                </div>
                <div className="bg-[#0b0f19] p-4 rounded-xl border border-[#374151] space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">PHONE CALL</span>
                    <h4 className="font-bold text-sm text-white mt-1">Direct Phone Call</h4>
                    <p className="text-xs text-gray-400">Dial live support line directly from your device.</p>
                  </div>
                  <a href="tel:+254716883895" className="w-full bg-amber-500/10 border border-amber-500 text-amber-400 text-center text-xs font-bold py-2.5 rounded-xl hover:bg-amber-500 hover:text-black transition mt-3 block">📞 Call +254716883895</a>
                </div>
              </div>
              <div className="text-center pt-2"><button onClick={() => setDialingModalOpen(false)} className="text-xs text-gray-400 hover:text-white">Close Call Centre</button></div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {settingsModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#374151] rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-[#374151] pb-3">
                <h3 className="text-base font-bold text-[#10b981] uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>User Preferences</h3>
                <button onClick={() => setSettingsModalOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
              </div>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">ODDS FORMAT</label>
                  <select value={userProfile.odds_format} onChange={(e) => setUserProfile({ ...userProfile, odds_format: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white">
                    <option value="decimal">Decimal (2.00)</option>
                    <option value="fractional">Fractional (1/1)</option>
                    <option value="american">American (+100)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">LANGUAGE</label>
                  <select value={userProfile.language} onChange={(e) => setUserProfile({ ...userProfile, language: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white">
                    <option value="en">English (EN)</option>
                    <option value="sw">Swahili (SW)</option>
                  </select>
                </div>
              </div>
              <button onClick={() => setSettingsModalOpen(false)} className="w-full bg-[#10b981] text-black font-bold py-2 rounded-xl">Save & Close</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
