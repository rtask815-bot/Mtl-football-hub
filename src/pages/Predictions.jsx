import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- SECURITY: LIGHTWEIGHT XSS SANITIZATION ---
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/javascript:/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '');
}

// --- CONFIGURATION & SUPABASE INITIALIZATION ---
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- HELPER FUNCTIONS ---
function getFirstNameInitials(name) {
  if (!name) return 'MT';
  const cleanName = sanitizeInput(String(name)).trim();
  const parts = cleanName.split(/\s+/);
  const firstName = parts[0];
  return firstName.length >= 2 ? firstName.substring(0, 2).toUpperCase() : firstName.charAt(0).toUpperCase();
}

function getTeamBadge(teams) {
  if (!teams) return '⚽';
  const cleanTeams = sanitizeInput(String(teams));
  const firstTeam = cleanTeams.split(/\s+vs\.?\s+/i)[0].trim();
  const words = firstTeam.split(/\s+/).filter(Boolean);
  return words.length >= 2 ? (words[0].charAt(0) + words[1].charAt(0)).toUpperCase() : firstTeam.substring(0, 3).toUpperCase();
}

function parseMatchDateTime(dateValue, timeValue) {
  try {
    let dateText = sanitizeInput(String(dateValue)).trim();
    let timeText = sanitizeInput(String(timeValue)).trim().replace(/(\.\d+)?$/, '');
    if (/^\d{2}:\d{2}$/.test(timeText)) timeText += ':00';
    const parsed = new Date(`${dateText}T${timeText}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

function calculateLiveMinute(match) {
  const status = sanitizeInput(String(match.status || '')).toUpperCase();
  if (status === 'LIVE' && match.minute !== undefined && match.minute !== null) {
    const parsedMin = parseInt(match.minute, 10) || 0;
    return `${Math.min(parsedMin, 92)}'`;
  }
  const kickoff = parseMatchDateTime(match.match_date, match.match_time);
  if (!kickoff) return "LIVE";

  const elapsed = Math.floor((Date.now() - kickoff.getTime()) / 60000);
  if (elapsed <= 0) return "1'";

  const cappedMinute = Math.min(elapsed, 92);
  return `${cappedMinute}'`;
}

function isMatchCurrentlyLive(match, now = new Date()) {
  if (!match) return false;
  const status = sanitizeInput(String(match.status || '')).trim().toUpperCase();
  if (['LIVE', 'IN_PLAY', 'IN-PLAY', 'PLAYING'].includes(status)) return true;
  if (['FT', 'FINISHED', 'FULL TIME', 'COMPLETED', 'POSTPONED', 'CANCELLED'].includes(status)) return false;
  if (!match.match_date || !match.match_time) return false;
  const kickoff = parseMatchDateTime(match.match_date, match.match_time);
  if (!kickoff) return false;
  const diff = now.getTime() - kickoff.getTime();
  return diff >= 0 && diff <= 120 * 60 * 1000;
}

function buildLiveMatch(match) {
  const minuteStr = calculateLiveMinute(match);
  const minuteVal = parseInt(minuteStr, 10) || 0;
  const progress = Math.min(Math.round((minuteVal / 90) * 100), 100);

  return {
    ...match,
    id: match.id,
    league: sanitizeInput(match.league || match.competition || 'FOOTBALL'),
    teams: sanitizeInput(match.teams || 'Unknown Teams'),
    score: sanitizeInput(match.score || match.final_score || '0 - 0'),
    minute: minuteStr,
    progress,
    details: sanitizeInput(match.live_details || match.details || match.analysis_text || 'Live match intelligence available.')
  };
}

// --- CUSTOM HOOK FOR LONG PRESS ---
function useLongPress(onLongPress, onClick, { delay = 850 } = {}) {
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);

  const start = (e) => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress(e);
    }, delay);
  };

  const clear = (e, shouldClick = true) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (shouldClick && !isLongPressRef.current && onClick) {
      onClick(e);
    }
  };

  return {
    onMouseDown: start,
    onMouseUp: (e) => clear(e, true),
    onMouseLeave: (e) => clear(e, false),
    onTouchStart: start,
    onTouchEnd: (e) => clear(e, true),
    onTouchCancel: (e) => clear(e, false),
  };
}

export default function PredictionsHub() {
  // --- STATE MANAGEMENT ---
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState({
    role: 'user',
    username: 'not Signed in',
    email: '',
    odds_format: 'decimal',
    language: 'en',
    high_contrast: false
  });

  // Data Store
  const [matchesData, setMatchesData] = useState([]);
  const [fixturesData, setFixturesData] = useState([]);
  const [trendingData, setTrendingData] = useState([]);
  const [liveMatchesData, setLiveMatchesData] = useState([]);
  const [globalChatMessages, setGlobalChatMessages] = useState([]);
  const [matchCommentsStore, setMatchCommentsStore] = useState({});
  const [matchChatStore, setMatchChatStore] = useState({});
  const [matchReactionsMap, setMatchReactionsMap] = useState({});

  // UI States & Tabs
  const [activeMatchTab, setActiveMatchTab] = useState('future');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [toasts, setToasts] = useState([]);

  // Loader State
  const [loader, setLoader] = useState({ active: true, text: 'connecting...', progress: 10 });

  // Database Error Console State
  const [dbError, setDbError] = useState(null);

  // Modals Active Item / Data States
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [isDialingOpen, setIsDialingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Dynamic Content Modals
  const [googleIframe, setGoogleIframe] = useState({ active: false, query: '' });
  const [reactionUsersModal, setReactionUsersModal] = useState({ active: false, type: '', matchId: null });
  const [fullscreenCommentsModal, setFullscreenCommentsModal] = useState({ active: false, matchId: null, teams: '' });
  const [statsListModal, setStatsListModal] = useState({ active: false, title: '', dataset: [] });
  const [fullscreenMatchModal, setFullscreenMatchModal] = useState({ active: false, matchId: null });
  const [matchChatModal, setMatchChatModal] = useState({ active: false, matchId: null, teams: '' });
  const [adminModal, setAdminModal] = useState({ active: false, section: null, itemId: null });

  // Form Inputs State
  const [globalChatInput, setGlobalChatInput] = useState('');
  const [matchChatInput, setMatchChatInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [adminFormData, setAdminFormData] = useState({});

  // --- TOAST TRIGGER ---
  const showToast = (message, isError = true) => {
    const id = Date.now();
    const cleanMsg = sanitizeInput(message);
    setToasts(prev => [...prev, { id, message: cleanMsg, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // --- DATABASE ERROR TRIGGER ---
  const showDatabaseError = (table, error, operation = 'READ') => {
    let diagnosis = "Unspecified database failure.";
    let action = "Verify database connection and try again.";
    const code = error?.code || '';
    const message = sanitizeInput(error?.message || String(error));

    if (code === '42501' || message.includes('permission') || message.includes('policy')) {
      diagnosis = "Row-Level Security (RLS) Permission Denied.";
      action = "Check Supabase table policies. Ensure read/write rules exist for authenticated or anon roles.";
    } else if (code === '23505' || message.includes('unique constraint')) {
      diagnosis = "Duplicate Key Conflict.";
      action = "Record already exists with this primary ID or unique constraint key.";
    } else if (code === 'PGRST301' || message.includes('JWT') || message.includes('token')) {
      diagnosis = "Authentication Session Expired / Invalid Token.";
      action = "Sign out and log in again to acquire a fresh JWT auth session.";
    } else if (code === '42P01' || message.includes('does not exist')) {
      diagnosis = "Database Table Schema Missing.";
      action = `Create the missing table '${table}' in your Supabase SQL editor.`;
    } else if (message.includes('FetchError') || message.includes('Failed to fetch')) {
      diagnosis = "Network Connection Interrupted.";
      action = "Check your internet connection.";
    } else {
      diagnosis = `Database error code: ${code || 'UNKNOWN'}`;
      action = "Check table structure or review Supabase operational logs.";
    }

    setDbError({
      table: sanitizeInput(table),
      operation: sanitizeInput(operation),
      diagnosis,
      action,
      details: sanitizeInput(JSON.stringify(error, null, 2))
    });
  };

  // --- NORMALIZATION HELPERS WITH SANITIZATION ---
  const normalizeMatch = (match, currentReactionsMap) => {
    const parsedOdds = parseFloat(match.decimal_odds);
    const parsedHome = parseFloat(match.prob_home);
    const parsedDraw = parseFloat(match.prob_draw);
    const parsedAway = parseFloat(match.prob_away);
    const parsedStars = parseInt(match.confidence_stars, 10);

    const mId = String(match.id);
    const userReactions = currentReactionsMap[mId] || [];
    const computedReactions = {
      fire: userReactions.filter(r => r.reaction === 'fire').length,
      heart: userReactions.filter(r => r.reaction === 'heart').length,
      dislike: userReactions.filter(r => r.reaction === 'dislike').length
    };

    const fallbackReactions = match.reactions && typeof match.reactions === 'object' ? match.reactions : { fire: 0, heart: 0, dislike: 0 };

    return {
      ...match,
      teams: sanitizeInput(match.teams),
      league: sanitizeInput(match.league),
      prediction: sanitizeInput(match.prediction),
      analysis_text: sanitizeInput(match.analysis_text),
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

  const normalizeFixture = (fix) => {
    const matchDate = sanitizeInput(fix.match_date ?? fix.date ?? '');
    const matchTime = sanitizeInput(fix.match_time ?? fix.time ?? '');
    const teams = sanitizeInput(fix.teams);
    return { ...fix, teams, match_date: matchDate, match_time: matchTime, badge: fix.badge ? sanitizeInput(fix.badge) : getTeamBadge(teams) };
  };

  const normalizeTrending = (item) => ({
    ...item,
    rank: item.rank ?? '',
    title: sanitizeInput(item.title ?? ''),
    comments_count: item.comments_count ?? item.comments ?? 0
  });

  // --- DATA FETCHERS ---
  const loadDatabaseReactions = async () => {
    try {
      const { data, error } = await db.from('reactions').select('*');
      if (error) { showDatabaseError('reactions', error, 'READ_REACTIONS'); return {}; }
      if (Array.isArray(data)) {
        const map = {};
        data.forEach(r => {
          const mId = String(r.match_id);
          if (!map[mId]) map[mId] = [];
          map[mId].push({ user_id: r.user_id, username: sanitizeInput(r.username || 'User'), reaction: r.reaction_type });
        });
        setMatchReactionsMap(map);
        return map;
      }
    } catch (e) {
      showDatabaseError('reactions', e, 'READ_REACTIONS');
    }
    return {};
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
            user: sanitizeInput(c.username || c.user || 'User'),
            comment: sanitizeInput(c.comment || c.text || ''),
            time: c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
          });
        });
        setMatchCommentsStore(store);
      }
    } catch (err) {
      showDatabaseError('comments', err, 'READ_COMMENTS');
    }
  };

  const loadDatabaseChats = async () => {
    try {
      const { data, error } = await db.from('chats').select('*').order('created_at', { ascending: true });
      if (error) { showDatabaseError('chats', error, 'READ_CHATS'); return; }
      if (Array.isArray(data)) {
        const globalMsgs = [];
        const matchStore = {};
        data.forEach(msg => {
          const parsed = {
            id: msg.id,
            user_id: msg.user_id,
            user: sanitizeInput(msg.username || msg.user || 'User'),
            text: sanitizeInput(msg.message || msg.text || ''),
            time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
          };
          if (!msg.match_id) {
            globalMsgs.push(parsed);
          } else {
            const mId = String(msg.match_id);
            if (!matchStore[mId]) matchStore[mId] = [];
            matchStore[mId].push(parsed);
          }
        });
        setGlobalChatMessages(globalMsgs);
        setMatchChatStore(matchStore);
      }
    } catch (err) {
      showDatabaseError('chats', err, 'READ_CHATS');
    }
  };

  const loadMatchesFromDB = async (reactionsMapToUse = matchReactionsMap) => {
    try {
      const { data, error } = await db.from('matches').select('*').order('created_at', { ascending: false });
      if (error) { showDatabaseError('matches', error, 'READ_MATCHES'); return; }
      const normalized = Array.isArray(data) ? data.map(m => normalizeMatch(m, reactionsMapToUse)) : [];
      setMatchesData(normalized);
    } catch (error) {
      showDatabaseError('matches', error, 'READ_MATCHES');
    }
  };

  const loadFixturesFromDB = async () => {
    try {
      const { data, error } = await db.from('fixtures').select('*').order('match_date', { ascending: true });
      if (error) { showDatabaseError('fixtures', error, 'READ_FIXTURES'); return; }
      setFixturesData(Array.isArray(data) ? data.map(normalizeFixture) : []);
    } catch (error) {
      showDatabaseError('fixtures', error, 'READ_FIXTURES');
    }
  };

  const loadTrendingFromDB = async () => {
    try {
      const { data, error } = await db.from('trending').select('*').order('rank', { ascending: true });
      if (error) { showDatabaseError('trending', error, 'READ_TRENDING'); return; }
      setTrendingData(Array.isArray(data) ? data.map(normalizeTrending) : []);
    } catch (error) {
      showDatabaseError('trending', error, 'READ_TRENDING');
    }
  };

  // --- AUTHENTICATION & INITIALIZATION ---
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

      if (profileError) {
        showDatabaseError('profiles', profileError, 'READ_PROFILE');
      }

      const dbName = profile?.name || profile?.username;
      const username = sanitizeInput(dbName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
      const email = sanitizeInput(profile?.email || user.email || 'user@mtl.com');
      const isUserAdmin = profile?.role === 'admin' || profile?.is_admin === true || profile?.admin === true;

      setUserProfile(prev => ({
        ...prev,
        username,
        email,
        role: isUserAdmin ? 'admin' : 'user'
      }));
      return true;
    } catch (err) {
      showDatabaseError('auth.session', err, 'SESSION_EXCEPTION');
      window.location.href = "auth.html";
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoader({ active: true, text: 'connecting...', progress: 10 });
      const authenticated = await checkUserSession();
      if (!authenticated) return;

      setLoader({ active: true, text: 'loading...', progress: 20 });
      const currentReactionsMap = await loadDatabaseReactions();

      await Promise.all([
        loadMatchesFromDB(currentReactionsMap),
        loadFixturesFromDB(),
        loadTrendingFromDB(),
        loadDatabaseComments(),
        loadDatabaseChats()
      ]);

      setLoader({ active: true, text: 'Complete', progress: 100 });
      setTimeout(() => setLoader(prev => ({ ...prev, active: false })), 200);
    };

    init();
  }, []);

  // Live Matches calculation interval & realtime sync
  useEffect(() => {
    const updateLive = () => {
      const now = new Date();
      const live = matchesData.filter(m => isMatchCurrentlyLive(m, now)).map(buildLiveMatch);
      setLiveMatchesData(live);
    };

    updateLive();
    const interval = setInterval(updateLive, 1000);
    return () => clearInterval(interval);
  }, [matchesData]);

  // Realtime Subscriptions
  useEffect(() => {
    const chatSub = db.channel('public:chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, async () => {
        await loadDatabaseChats();
      })
      .subscribe();

    const commentSub = db.channel('public:comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async () => {
        await loadDatabaseComments();
      })
      .subscribe();

    const reactionSub = db.channel('public:reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, async () => {
        const updatedMap = await loadDatabaseReactions();
        await loadMatchesFromDB(updatedMap);
      })
      .subscribe();

    return () => {
      db.removeChannel(chatSub);
      db.removeChannel(commentSub);
      db.removeChannel(reactionSub);
    };
  }, []);

  // --- ACTIONS & HANDLERS ---
  const signOutUser = async () => {
    await db.auth.signOut();
    window.location.href = "auth.html";
  };

  const openGoogleSearchIframe = (queryText) => {
    setGoogleIframe({ active: true, query: sanitizeInput(queryText) });
  };

  const closeGoogleIframeModal = () => {
    setGoogleIframe({ active: false, query: '' });
  };

  const reactToMatch = async (matchId, type) => {
    const match = matchesData.find(m => String(m.id) === String(matchId));
    if (!match) return;

    const mId = String(matchId);
    const currentReactions = matchReactionsMap[mId] ? [...matchReactionsMap[mId]] : [];
    const userId = currentUser?.id || 'guest';
    const userPrevReaction = currentReactions.find(r => r.user_id === userId);

    let updatedMatchReactions = { ...(match.reactions || { fire: 0, heart: 0, dislike: 0 }) };

    if (userPrevReaction) {
      if (userPrevReaction.reaction === type) {
        updatedMatchReactions[type] = Math.max(0, Number(updatedMatchReactions[type] || 0) - 1);
        const filteredMap = currentReactions.filter(r => r.user_id !== userId);
        setMatchReactionsMap(prev => ({ ...prev, [mId]: filteredMap }));

        try {
          const { error } = await db.from('reactions').delete().eq('match_id', matchId).eq('user_id', userId);
          if (error) showDatabaseError('reactions', error, 'DELETE_REACTION');
        } catch (e) { showDatabaseError('reactions', e, 'DELETE_REACTION'); }

      } else {
        const oldType = userPrevReaction.reaction;
        updatedMatchReactions[oldType] = Math.max(0, Number(updatedMatchReactions[oldType] || 0) - 1);
        updatedMatchReactions[type] = Number(updatedMatchReactions[type] || 0) + 1;

        const updatedUserMap = currentReactions.map(r => r.user_id === userId ? { ...r, reaction: type } : r);
        setMatchReactionsMap(prev => ({ ...prev, [mId]: updatedUserMap }));

        try {
          const { error } = await db.from('reactions').upsert([{
            match_id: matchId,
            user_id: userId,
            username: userProfile.username,
            reaction_type: type
          }], { onConflict: 'match_id,user_id' });
          if (error) showDatabaseError('reactions', error, 'UPSERT_REACTION');
        } catch (e) { showDatabaseError('reactions', e, 'UPSERT_REACTION'); }
      }
    } else {
      updatedMatchReactions[type] = Number(updatedMatchReactions[type] || 0) + 1;
      const newMapEntry = [...currentReactions, { user_id: userId, username: userProfile.username, reaction: type }];
      setMatchReactionsMap(prev => ({ ...prev, [mId]: newMapEntry }));

      try {
        const { error } = await db.from('reactions').insert([{
          match_id: matchId,
          user_id: userId,
          username: userProfile.username,
          reaction_type: type
        }]);
        if (error) showDatabaseError('reactions', error, 'INSERT_REACTION');
      } catch (e) { showDatabaseError('reactions', e, 'INSERT_REACTION'); }
    }

    setMatchesData(prev => prev.map(m => String(m.id) === String(matchId) ? { ...m, reactions: updatedMatchReactions } : m));

    try {
      await db.from('matches').update({ reactions: updatedMatchReactions }).eq('id', matchId);
    } catch (err) {}
  };

  const submitFullscreenComment = async () => {
    const sanitizedVal = sanitizeInput(commentInput.trim());
    if (!sanitizedVal || !fullscreenCommentsModal.matchId) {
      showToast("Please enter a non-empty comment.");
      return;
    }

    setLoader({ active: true, text: "Posting comment to database...", progress: 50 });

    try {
      const { error } = await db.from('comments').insert([{
        match_id: fullscreenCommentsModal.matchId,
        username: userProfile.username,
        comment: sanitizedVal,
        user_id: currentUser?.id
      }]);

      if (error) {
        showDatabaseError('comments', error, 'INSERT_COMMENT');
        showToast("Failed to save comment.");
      } else {
        await loadDatabaseComments();
        showToast("Comment published successfully!", false);
        setCommentInput('');
      }
    } catch (err) {
      showDatabaseError('comments', err, 'INSERT_COMMENT');
      showToast("Error occurred while posting comment.");
    } finally {
      setLoader(prev => ({ ...prev, active: false }));
    }
  };

  const editComment = async (commentId) => {
    const comments = matchCommentsStore[fullscreenCommentsModal.matchId] || [];
    const comment = comments.find(c => String(c.id) === String(commentId));
    if (!comment) return;

    const newText = prompt("Edit your comment:", comment.comment);
    if (newText === null) return;
    const sanitizedText = sanitizeInput(newText.trim());
    if (!sanitizedText) {
      showToast("Comment cannot be empty.");
      return;
    }

    try {
      const { error } = await db.from('comments').update({ comment: sanitizedText }).eq('id', commentId);
      if (error) {
        showDatabaseError('comments', error, 'UPDATE_COMMENT');
        showToast("Failed to edit comment.");
      } else {
        await loadDatabaseComments();
        showToast("Comment updated!", false);
      }
    } catch (e) {
      showDatabaseError('comments', e, 'UPDATE_COMMENT');
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const { error } = await db.from('comments').delete().eq('id', commentId);
      if (error) {
        showDatabaseError('comments', error, 'DELETE_COMMENT');
        showToast("Failed to delete comment.");
      } else {
        await loadDatabaseComments();
        showToast("Comment deleted.", false);
      }
    } catch (e) {
      showDatabaseError('comments', e, 'DELETE_COMMENT');
    }
  };

  const sendGlobalChatMessage = async () => {
    const sanitizedVal = sanitizeInput(globalChatInput.trim());
    if (!sanitizedVal) {
      showToast("Chat message cannot be empty.");
      return;
    }

    try {
      const { error } = await db.from('chats').insert([{
        username: userProfile.username,
        message: sanitizedVal,
        user_id: currentUser?.id
      }]);
      if (error) showDatabaseError('chats', error, 'INSERT_GLOBAL_CHAT');
      else {
        setGlobalChatInput('');
        await loadDatabaseChats();
      }
    } catch (err) {
      showDatabaseError('chats', err, 'INSERT_GLOBAL_CHAT');
    }
  };

  const sendMatchChatMessage = async () => {
    const sanitizedVal = sanitizeInput(matchChatInput.trim());
    if (!sanitizedVal || !matchChatModal.matchId) {
      showToast("Match message cannot be empty.");
      return;
    }

    try {
      const { error } = await db.from('chats').insert([{
        match_id: matchChatModal.matchId,
        username: userProfile.username,
        message: sanitizedVal,
        user_id: currentUser?.id
      }]);
      if (error) showDatabaseError('chats', error, 'INSERT_MATCH_CHAT');
      else {
        setMatchChatInput('');
        await loadDatabaseChats();
      }
    } catch (err) {
      showDatabaseError('chats', err, 'INSERT_MATCH_CHAT');
    }
  };

  const editChatMessage = async (chatId, isMatchChat) => {
    const msgStore = isMatchChat ? matchChatStore[matchChatModal.matchId] : globalChatMessages;
    const msg = msgStore.find(m => String(m.id) === String(chatId));
    if (!msg) return;

    const newText = prompt("Edit message:", msg.text);
    if (newText === null) return;
    const sanitizedVal = sanitizeInput(newText.trim());
    if (!sanitizedVal) {
      showToast("Message cannot be empty.");
      return;
    }

    try {
      const { error } = await db.from('chats').update({ message: sanitizedVal }).eq('id', chatId);
      if (error) showDatabaseError('chats', error, 'UPDATE_CHAT');
      else {
        await loadDatabaseChats();
        showToast("Message edited.", false);
      }
    } catch (e) {
      showDatabaseError('chats', e, 'UPDATE_CHAT');
    }
  };

  const deleteChatMessage = async (chatId) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      const { error } = await db.from('chats').delete().eq('id', chatId);
      if (error) showDatabaseError('chats', error, 'DELETE_CHAT');
      else {
        await loadDatabaseChats();
        showToast("Message deleted.", false);
      }
    } catch (e) {
      showDatabaseError('chats', e, 'DELETE_CHAT');
    }
  };

  const deleteMatchFromDB = async (id) => {
    setLoader({ active: true, text: "Deleting Match Record...", progress: 50 });
    try {
      const { error } = await db.from('matches').delete().eq('id', id);
      if (error) { showDatabaseError('matches', error, 'DELETE_MATCH'); return; }
      await loadMatchesFromDB();
      showToast("Match removed.", false);
    } catch (err) { showDatabaseError('matches', err, 'DELETE_MATCH'); }
    finally { setLoader(prev => ({ ...prev, active: false })); }
  };

  const deleteFixtureFromDB = async (id) => {
    setLoader({ active: true, text: "Deleting Fixture Record...", progress: 50 });
    try {
      const { error } = await db.from('fixtures').delete().eq('id', id);
      if (error) { showDatabaseError('fixtures', error, 'DELETE_FIXTURE'); return; }
      await loadFixturesFromDB();
      showToast("Fixture removed.", false);
    } catch (err) { showDatabaseError('fixtures', err, 'DELETE_FIXTURE'); }
    finally { setLoader(prev => ({ ...prev, active: false })); }
  };

  const deleteTrendingFromDB = async (id) => {
    setLoader({ active: true, text: "Deleting Headline...", progress: 50 });
    try {
      const { error } = await db.from('trending').delete().eq('id', id);
      if (error) { showDatabaseError('trending', error, 'DELETE_TRENDING'); return; }
      await loadTrendingFromDB();
      showToast("Headline removed.", false);
    } catch (err) { showDatabaseError('trending', err, 'DELETE_TRENDING'); }
    finally { setLoader(prev => ({ ...prev, active: false })); }
  };

  const openAdminModal = (section, itemId = null) => {
    let initialData = {};
    if (section === 'matches' && itemId) {
      initialData = matchesData.find(m => String(m.id) === String(itemId)) || {};
    } else if (section === 'fixtures' && itemId) {
      initialData = fixturesData.find(f => String(f.id) === String(itemId)) || {};
    } else if (section === 'trending' && itemId) {
      initialData = trendingData.find(t => String(t.id) === String(itemId)) || {};
    }
    setAdminFormData(initialData);
    setAdminModal({ active: true, section, itemId });
  };

  const saveAdminEntry = async () => {
    const { section, itemId } = adminModal;
    setLoader({ active: true, text: "Saving Record...", progress: 50 });

    try {
      let error = null;
      if (section === 'matches') {
        const payload = {
          teams: sanitizeInput(adminFormData.teams || ''),
          league: sanitizeInput(adminFormData.league || ''),
          match_date: sanitizeInput(adminFormData.match_date || ''),
          match_time: sanitizeInput(adminFormData.match_time || ''),
          prediction: sanitizeInput(adminFormData.prediction || ''),
          decimal_odds: adminFormData.decimal_odds ? parseFloat(adminFormData.decimal_odds) : null,
          prob_home: adminFormData.prob_home ? parseInt(adminFormData.prob_home, 10) : 0,
          prob_draw: adminFormData.prob_draw ? parseInt(adminFormData.prob_draw, 10) : 0,
          prob_away: adminFormData.prob_away ? parseInt(adminFormData.prob_away, 10) : 0,
          analysis_text: sanitizeInput(adminFormData.analysis_text || ''),
          confidence_stars: adminFormData.confidence_stars ? parseInt(adminFormData.confidence_stars, 10) : 3,
          type: sanitizeInput(adminFormData.type || 'free')
        };

        if (itemId) {
          ({ error } = await db.from('matches').update(payload).eq('id', itemId));
        } else {
          ({ error } = await db.from('matches').insert([payload]));
        }
        if (!error) await loadMatchesFromDB();

      } else if (section === 'fixtures') {
        const payload = {
          teams: sanitizeInput(adminFormData.teams || ''),
          league: sanitizeInput(adminFormData.league || ''),
          match_date: sanitizeInput(adminFormData.match_date || ''),
          match_time: sanitizeInput(adminFormData.match_time || '')
        };

        if (itemId) {
          ({ error } = await db.from('fixtures').update(payload).eq('id', itemId));
        } else {
          ({ error } = await db.from('fixtures').insert([payload]));
        }
        if (!error) await loadFixturesFromDB();

      } else if (section === 'trending') {
        const payload = {
          title: sanitizeInput(adminFormData.title || ''),
          rank: adminFormData.rank ? parseInt(adminFormData.rank, 10) : 1,
          comments_count: adminFormData.comments_count ? parseInt(adminFormData.comments_count, 10) : 0
        };

        if (itemId) {
          ({ error } = await db.from('trending').update(payload).eq('id', itemId));
        } else {
          ({ error } = await db.from('trending').insert([payload]));
        }
        if (!error) await loadTrendingFromDB();
      }

      if (error) {
        showDatabaseError(section, error, itemId ? 'UPDATE' : 'INSERT');
      } else {
        showToast("Saved successfully!", false);
        setAdminModal({ active: false, section: null, itemId: null });
      }
    } catch (e) {
      showDatabaseError(section, e, 'SAVE_EXCEPTION');
    } finally {
      setLoader(prev => ({ ...prev, active: false }));
    }
  };

  const formatOdds = (decimalVal) => {
    const val = parseFloat(decimalVal);
    if (!Number.isFinite(val) || val <= 1) return 'N/A';
    if (userProfile.odds_format === 'fractional') return `${Math.round((val - 1) * 100)}/100`;
    if (userProfile.odds_format === 'american') return val >= 2.0 ? `+${Math.round((val - 1) * 100)}` : `-${Math.round(100 / (val - 1))}`;
    return val.toFixed(2);
  };

  // --- FILTERED MATCHES SELECTION ---
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
      const query = sanitizeInput(matchSearchQuery).toLowerCase();
      filtered = filtered.filter(m => {
        const nameMatch = String(m.teams || '').toLowerCase().includes(query);
        const dateMatch = String(m.match_date || '').toLowerCase().includes(query);
        const timeMatch = String(m.match_time || '').toLowerCase().includes(query);
        const leagueMatch = String(m.league || '').toLowerCase().includes(query);
        return nameMatch || dateMatch || timeMatch || leagueMatch;
      });
    }

    return filtered;
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      backgroundColor: userProfile.high_contrast ? '#000000' : '#070a12',
      color: '#f9fafb',
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>

      {/* Embedded CSS Animations & Frames Injection */}
      <style>{`
        @keyframes fluidFill {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: perspective(1000px) rotateX(-12deg) translateY(30px); }
          to { opacity: 1; transform: perspective(1000px) rotateX(0deg) translateY(0); }
        }
        @keyframes waveAnimation {
          0% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(-25%) scaleY(1.2); }
          100% { transform: translateX(-50%) scaleY(1); }
        }
        .pro-card-framed {
          background: rgba(18, 26, 43, 0.75);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0, 230, 153, 0.2);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-color 0.3s ease, box-shadow 0.3s ease;
          animation: slideInUp 0.5s ease-out forwards;
        }
        .pro-card-framed:hover {
          transform: translateY(-6px) perspective(1000px) rotateX(2deg);
          border-color: rgba(0, 230, 153, 0.6);
          box-shadow: 0 20px 40px -15px rgba(0, 230, 153, 0.25);
        }
        .fluid-progress-container {
          position: relative;
          height: 10px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .fluid-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #00e699, #00b377, #38ef7d, #11998e);
          background-size: 200% 200%;
          animation: fluidFill 3s ease infinite;
          border-radius: 999px;
          transition: width 0.6s ease-in-out;
        }
        .floating-loader-overlay {
          position: fixed;
          inset: 0;
          background: rgba(7, 10, 18, 0.85);
          backdrop-filter: blur(12px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .floating-loader-overlay.active {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>

      {/* Toast Overlay */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            padding: '12px 16px',
            borderRadius: '12px',
            border: toast.isError ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(16, 185, 129, 0.5)',
            backgroundColor: toast.isError ? 'rgba(69, 10, 10, 0.95)' : 'rgba(6, 78, 59, 0.95)',
            color: toast.isError ? '#fca5a5' : '#6ee7b7',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'auto',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <span>{toast.isError ? '⚠️' : '✔️'}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Dynamic Fluid Loader */}
      <div className={`floating-loader-overlay ${loader.active ? 'active' : ''}`}>
        <div className="pro-card-framed" style={{ padding: '28px', maxWidth: '380px', width: '90%', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#00e699' }}></span>
            <h4 style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.1em', color: '#00e699', margin: 0 }}>SYSTEM ACTION</h4>
          </div>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#e5e7eb', marginBottom: '16px' }}>{loader.text}</p>
          <div className="fluid-progress-container">
            <div className="fluid-progress-bar" style={{ width: `${loader.progress}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div id="app-root">
        {/* Responsive Header */}
        <header style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(11, 15, 25, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '16px 24px'
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0, 230, 153, 0.15)',
                border: '1px solid #00e699',
                color: '#00e699',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                fontWeight: 'bold',
                cursor: 'pointer'
              }} onClick={() => setIsDialingOpen(true)}>
                {getFirstNameInitials(userProfile.username)}
              </div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.05em', color: '#fff', margin: 0 }}>
                  PREDICTIONS <span style={{ color: '#00e699' }}>HUB</span>
                </h1>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.15em' }}>Pro Sports Intelligence</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setIsSideNavOpen(true)} style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer'
              }}>☰</button>
            </div>
          </div>
        </header>

        {/* Hero Frame Banner */}
        <section style={{
          padding: '40px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'radial-gradient(circle at top, rgba(0,230,153,0.08) 0%, rgba(7,10,18,0) 70%)'
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
            <span style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: '#00e699',
              fontWeight: 'bold',
              backgroundColor: 'rgba(0, 230, 153, 0.1)',
              padding: '6px 16px',
              borderRadius: '999px',
              border: '1px solid rgba(0, 230, 153, 0.2)'
            }}>AI Match Engine & Live Intelligence</span>
            <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#fff', marginTop: '16px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              FOOTBALL <span style={{ color: '#00e699' }}>ANALYTICS</span>
            </h2>
          </div>
        </section>

        {/* Main Content Grid */}
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '48px' }}>

          {/* Live Matches Section */}
          <section id="live-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span> LIVE MATCHES
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {!liveMatchesData.length ? (
                <div className="pro-card-framed" style={{ padding: '32px', textAlign: 'center', gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>No live matches currently in play.</p>
                </div>
              ) : (
                liveMatchesData.slice(0, 3).map(match => (
                  <LiveMatchCard 
                    key={match.id} 
                    match={match} 
                    userProfile={userProfile}
                    openGoogleSearchIframe={openGoogleSearchIframe}
                    openFullscreenMatchModal={(id) => setFullscreenMatchModal({ active: true, matchId: id })}
                    triggerAdminEdit={(section, id) => openAdminModal(section, id)}
                    deleteMatchFromDB={deleteMatchFromDB}
                  />
                ))
              )}
            </div>
          </section>

          {/* Predictions Section */}
          <section id="db-matches-section" className="pro-card-framed" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>⚽ MATCH PREDICTIONS</h3>
                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Long-press any card to launch AI lookup</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button onClick={() => setActiveMatchTab('future')} style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: activeMatchTab === 'future' ? '#00e699' : 'rgba(255,255,255,0.05)',
                color: activeMatchTab === 'future' ? '#000' : '#9ca3af',
                border: 'none',
                cursor: 'pointer'
              }}>UPCOMING</button>
              <button onClick={() => setActiveMatchTab('past')} style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: activeMatchTab === 'past' ? '#00e699' : 'rgba(255,255,255,0.05)',
                color: activeMatchTab === 'past' ? '#000' : '#9ca3af',
                border: 'none',
                cursor: 'pointer'
              }}>PAST</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {(() => {
                const list = getFilteredMatches();
                if (!list.length) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', gridColumn: '1 / -1' }}>
                      No matches found.
                    </div>
                  );
                }
                return list.slice(0, 3).map(match => (
                  <MatchPredictionCard 
                    key={match.id}
                    match={match}
                    userProfile={userProfile}
                    comments={matchCommentsStore[match.id] || []}
                    reactToMatch={reactToMatch}
                    formatOdds={formatOdds}
                    openGoogleSearchIframe={openGoogleSearchIframe}
                    openReactionUsersModal={(matchId, type) => setReactionUsersModal({ active: true, matchId, type })}
                    openFullscreenCommentsModal={(matchId, teams) => setFullscreenCommentsModal({ active: true, matchId, teams })}
                    openFullscreenMatchModal={(id) => setFullscreenMatchModal({ active: true, matchId: id })}
                    openMatchChatModal={(matchId, teams) => setMatchChatModal({ active: true, matchId, teams })}
                    triggerAdminEdit={(section, id) => openAdminModal(section, id)}
                    deleteMatchFromDB={deleteMatchFromDB}
                  />
                ));
              })()}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

// ==========================================
// --- REUSABLE FRAMED SUB-COMPONENTS ---
// ==========================================

function LiveMatchCard({ match, userProfile, openGoogleSearchIframe, openFullscreenMatchModal, triggerAdminEdit, deleteMatchFromDB }) {
  const longPressProps = useLongPress(
    () => openGoogleSearchIframe(`Live match results for ${match.teams}`),
    () => openFullscreenMatchModal(match.id),
    { delay: 850 }
  );

  const teamParts = String(match.teams || '').split(/\s+vs\.?\s+/i);
  const home = teamParts[0] || 'HOME';
  const away = teamParts[1] || 'AWAY';

  return (
    <div {...longPressProps} className="pro-card-framed" style={{ padding: '20px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginBottom: '12px' }}>
        <span>{match.league}</span>
        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>● LIVE</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', display: 'block' }}>{home}</span>
        </div>
        <div style={{ fontSize: '18px', fontWeight: '900', color: '#00e699' }}>VS</div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', display: 'block' }}>{away}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: '11px', color: '#00e699', marginBottom: '8px', fontWeight: 'bold' }}>{match.minute}</div>
      <div className="fluid-progress-container">
        <div className="fluid-progress-bar" style={{ width: `${match.progress}%` }}></div>
      </div>
    </div>
  );
}

function MatchPredictionCard({ match, userProfile, comments, reactToMatch, formatOdds, openGoogleSearchIframe, openReactionUsersModal, openFullscreenCommentsModal, openFullscreenMatchModal, openMatchChatModal, triggerAdminEdit, deleteMatchFromDB }) {
  const cardLongPress = useLongPress(() => openGoogleSearchIframe(`Football Match Prediction for ${match.teams || ''}`), null, { delay: 850 });

  return (
    <div {...cardLongPress} className="pro-card-framed" style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <span style={{ color: '#00e699', fontWeight: 'bold' }}>{match.league}</span>
        <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Odds: {formatOdds(match.decimal_odds)}</span>
      </div>
      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#fff', margin: 0 }}>{match.teams}</h4>
      <p style={{ fontSize: '12px', color: '#00e699', margin: 0, fontWeight: '600' }}>Prediction: {match.prediction}</p>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', display: 'flex', gap: '8px' }}>
        <button onClick={() => reactToMatch(match.id, 'fire')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>🔥 {match.reactions?.fire || 0}</button>
        <button onClick={() => reactToMatch(match.id, 'heart')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}>❤️ {match.reactions?.heart || 0}</button>
      </div>
    </div>
  );
}
