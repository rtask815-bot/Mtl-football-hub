import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION & SUPABASE INITIALIZATION ---
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- HELPER FUNCTIONS ---
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

function parseMatchDateTime(dateValue, timeValue) {
  try {
    let dateText = String(dateValue).trim();
    let timeText = String(timeValue).trim().replace(/(\.\d+)?$/, '');
    if (/^\d{2}:\d{2}$/.test(timeText)) timeText += ':00';
    const parsed = new Date(`${dateText}T${timeText}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
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

  const cappedMinute = Math.min(elapsed, 92);
  return `${cappedMinute}'`;
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
  const [activeMatchTab, setActiveMatchTab] = useState('future'); // 'future' or 'past'
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
    setToasts(prev => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // --- DATABASE ERROR TRIGGER ---
  const showDatabaseError = (table, error, operation = 'READ') => {
    let diagnosis = "Unspecified database failure.";
    let action = "Verify database connection and try again.";
    const code = error?.code || '';
    const message = error?.message || String(error);

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
      table,
      operation,
      diagnosis,
      action,
      details: JSON.stringify(error, null, 2)
    });
  };

  // --- NORMALIZATION HELPERS ---
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
    const matchDate = fix.match_date ?? fix.date ?? '';
    const matchTime = fix.match_time ?? fix.time ?? '';
    return { ...fix, match_date: matchDate, match_time: matchTime, badge: fix.badge || getTeamBadge(fix.teams) };
  };

  const normalizeTrending = (item) => ({
    ...item,
    rank: item.rank ?? '',
    title: item.title ?? '',
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
          map[mId].push({ user_id: r.user_id, username: r.username || 'User', reaction: r.reaction_type });
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
            user: c.username || c.user || 'User',
            comment: c.comment || c.text || '',
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
            user: msg.username || msg.user || 'User',
            text: msg.message || msg.text || '',
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
      const username = dbName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const email = profile?.email || user.email || 'user@mtl.com';
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
    setGoogleIframe({ active: true, query: queryText });
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
        // Toggle Off
        updatedMatchReactions[type] = Math.max(0, Number(updatedMatchReactions[type] || 0) - 1);
        const filteredMap = currentReactions.filter(r => r.user_id !== userId);
        setMatchReactionsMap(prev => ({ ...prev, [mId]: filteredMap }));

        try {
          const { error } = await db.from('reactions').delete().eq('match_id', matchId).eq('user_id', userId);
          if (error) showDatabaseError('reactions', error, 'DELETE_REACTION');
        } catch (e) { showDatabaseError('reactions', e, 'DELETE_REACTION'); }

      } else {
        // Switch Type
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
      // Add New
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

    // Local State Update
    setMatchesData(prev => prev.map(m => String(m.id) === String(matchId) ? { ...m, reactions: updatedMatchReactions } : m));

    try {
      await db.from('matches').update({ reactions: updatedMatchReactions }).eq('id', matchId);
    } catch (err) {}
  };

  const submitFullscreenComment = async () => {
    if (!commentInput.trim() || !fullscreenCommentsModal.matchId) {
      showToast("Please enter a non-empty comment.");
      return;
    }

    setLoader({ active: true, text: "Posting comment to database...", progress: 50 });

    try {
      const { error } = await db.from('comments').insert([{
        match_id: fullscreenCommentsModal.matchId,
        username: userProfile.username,
        comment: commentInput.trim(),
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
    if (!newText.trim()) {
      showToast("Comment cannot be empty.");
      return;
    }

    try {
      const { error } = await db.from('comments').update({ comment: newText.trim() }).eq('id', commentId);
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
    if (!globalChatInput.trim()) {
      showToast("Chat message cannot be empty.");
      return;
    }

    try {
      const { error } = await db.from('chats').insert([{
        username: userProfile.username,
        message: globalChatInput.trim(),
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
    if (!matchChatInput.trim() || !matchChatModal.matchId) {
      showToast("Match message cannot be empty.");
      return;
    }

    try {
      const { error } = await db.from('chats').insert([{
        match_id: matchChatModal.matchId,
        username: userProfile.username,
        message: matchChatInput.trim(),
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
    if (!newText.trim()) {
      showToast("Message cannot be empty.");
      return;
    }

    try {
      const { error } = await db.from('chats').update({ message: newText.trim() }).eq('id', chatId);
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
          teams: adminFormData.teams || '',
          league: adminFormData.league || '',
          match_date: adminFormData.match_date || '',
          match_time: adminFormData.match_time || '',
          prediction: adminFormData.prediction || '',
          decimal_odds: adminFormData.decimal_odds ? parseFloat(adminFormData.decimal_odds) : null,
          prob_home: adminFormData.prob_home ? parseInt(adminFormData.prob_home, 10) : 0,
          prob_draw: adminFormData.prob_draw ? parseInt(adminFormData.prob_draw, 10) : 0,
          prob_away: adminFormData.prob_away ? parseInt(adminFormData.prob_away, 10) : 0,
          analysis_text: adminFormData.analysis_text || '',
          confidence_stars: adminFormData.confidence_stars ? parseInt(adminFormData.confidence_stars, 10) : 3,
          type: adminFormData.type || 'free'
        };

        if (itemId) {
          ({ error } = await db.from('matches').update(payload).eq('id', itemId));
        } else {
          ({ error } = await db.from('matches').insert([payload]));
        }
        if (!error) await loadMatchesFromDB();

      } else if (section === 'fixtures') {
        const payload = {
          teams: adminFormData.teams || '',
          league: adminFormData.league || '',
          match_date: adminFormData.match_date || '',
          match_time: adminFormData.match_time || ''
        };

        if (itemId) {
          ({ error } = await db.from('fixtures').update(payload).eq('id', itemId));
        } else {
          ({ error } = await db.from('fixtures').insert([payload]));
        }
        if (!error) await loadFixturesFromDB();

      } else if (section === 'trending') {
        const payload = {
          title: adminFormData.title || '',
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
      const query = matchSearchQuery.toLowerCase();
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
    <div className={`min-h-screen flex flex-col justify-between selection:bg-mtlGreen selection:text-black bg-[#0b0f19] text-[#f9fafb] font-sans ${userProfile.high_contrast ? 'high-contrast-mode' : ''}`}>
      
      {/* Toast Overlay */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-3 rounded-xl border text-xs font-bold font-cyber shadow-2xl flex items-center gap-2 transform transition-all duration-300 pointer-events-auto ${
            toast.isError ? 'bg-red-950/90 border-red-500/50 text-red-300' : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
          }`}>
            <span>{toast.isError ? '⚠️' : '✔️'}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Floating Prompt Loader */}
      <div className={`floating-loader-overlay ${loader.active ? 'active' : ''}`}>
        <div className="loader-card space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="w-3 h-3 rounded-full bg-futuristicNeon animate-ping"></span>
            <h4 className="text-xs font-bold uppercase tracking-widest text-futuristicNeon font-cyber">JUST A SECOND</h4>
          </div>
          <p className="text-sm font-medium text-gray-200">{loader.text}</p>
          <div className="water-progress-container">
            <div className="water-progress-bar" style={{ width: `${loader.progress}%` }}></div>
          </div>
        </div>
      </div>

      {/* Reacted Users Modal */}
      {reactionUsersModal.active && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-mtlSurface border border-mtlGreen rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-mtlCardBorder pb-3">
              <h4 className="font-bold text-sm text-mtlGreen font-cyber">REACTANTS</h4>
              <button onClick={() => setReactionUsersModal({ active: false, type: '', matchId: null })} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
              {(() => {
                const list = (matchReactionsMap[String(reactionUsersModal.matchId)] || []).filter(r => r.reaction === reactionUsersModal.type);
                if (!list.length) return <p className="text-gray-500 italic py-2">No users have put this reaction yet.</p>;
                return list.map((u, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-mtlDark rounded-lg border border-mtlCardBorder">
                    <div className="w-6 h-6 avatar-logo text-[10px] font-bold">{getFirstNameInitials(u.username)}</div>
                    <span className="text-xs font-semibold text-gray-200">{u.username}</span>
                  </div>
                ));
              })()}
            </div>
            <button onClick={() => setReactionUsersModal({ active: false, type: '', matchId: null })} className="w-full bg-mtlCard border border-mtlCardBorder text-gray-300 py-2 rounded-xl text-xs font-bold hover:text-white">Close</button>
          </div>
        </div>
      )}

      {/* Side Nav Menu Backdrop */}
      <div 
        onClick={() => setIsSideNavOpen(false)} 
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity ${isSideNavOpen ? 'block' : 'hidden'}`}
      ></div>

      {/* Side Navigation Menu */}
      <aside className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-mtlSurface border-l border-mtlCardBorder z-50 transform transition-transform duration-300 ease-in-out flex flex-col justify-between p-6 shadow-2xl ${isSideNavOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-mtlCardBorder pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 avatar-logo text-sm font-bold">{getFirstNameInitials(userProfile.username)}</div>
              <div>
                <h3 className="font-extrabold text-sm text-white font-cyber">{userProfile.username}</h3>
                <span className="text-[10px] text-gray-400">{userProfile.email}</span>
              </div>
            </div>
            <button onClick={() => setIsSideNavOpen(false)} className="w-8 h-8 rounded-full bg-mtlDark text-gray-400 hover:text-white flex items-center justify-center font-bold">✕</button>
          </div>

          <nav className="space-y-3">
            <button onClick={() => { setIsDialingOpen(true); setIsSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-mtlCard border border-mtlCardBorder hover:border-mtlGreen hover:text-mtlGreen transition text-xs font-semibold text-gray-200">
              <span className="text-base">📞</span> Contact Centre
            </button>
            <button onClick={() => { setIsSettingsOpen(true); setIsSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-mtlCard border border-mtlCardBorder hover:border-mtlGreen hover:text-mtlGreen transition text-xs font-semibold text-gray-200">
              <span className="text-base">⚙️</span> Preferences & Settings
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-mtlCardBorder space-y-3">
          <button onClick={signOutUser} className="w-full bg-red-950/60 text-red-300 border border-red-500/40 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-red-800 hover:text-white transition flex items-center justify-center gap-2">
            <span>❌</span> Sign Out
          </button>
        </div>
      </aside>

      <div id="app-root">
        {/* Header */}
        <header className="border-b border-mtlCardBorder bg-mtlSurface/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 avatar-logo text-lg cursor-pointer" onClick={() => setIsDialingOpen(true)}>
                {getFirstNameInitials(userProfile.username)}
              </div>
              <div>
                <h1 className="font-bold tracking-wider text-lg leading-tight font-cyber text-white">PREDICTIONS <span className="text-mtlGreen">HUB</span></h1>
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Feel Welcomed.</span>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
              <a href="#" className="flex items-center gap-2 text-mtlGreen border-b-2 border-mtlGreen pb-1">HOME</a>
              <a href="#live-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">LIVE</a>
              <a href="#fixtures-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">FIXTURES</a>
              <a href="#db-matches-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">PREDICTIONS</a>
              <a href="#trending-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">COMMUNITY</a>
            </nav>

            <div className="flex items-center gap-3">
              <button onClick={() => setIsSideNavOpen(true)} title="Open Navigation Options" className="w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-200 flex items-center justify-center hover:text-mtlGreen transition">
                ☰
              </button>

              <div className="hidden md:flex items-center gap-3 bg-mtlCard border border-mtlCardBorder px-3 py-1.5 rounded-full cursor-pointer" onClick={() => setIsSideNavOpen(true)}>
                <div className="w-7 h-7 avatar-logo text-xs">{getFirstNameInitials(userProfile.username)}</div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-200">{userProfile.username} ({userProfile.role.toUpperCase()})</span>
                  <span className="text-[9px] text-gray-400">{userProfile.email}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Banner */}
        <section className="relative overflow-hidden py-10 px-6 border-b border-mtlCardBorder bg-gradient-to-b from-mtlSurface to-mtlDark">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <span className="text-xs uppercase tracking-[0.25em] text-mtlGreen font-bold bg-mtlGreen/10 px-4 py-1.5 rounded-full border border-mtlGreen/20">Sports Analytics & Insights</span>
            <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight mt-3 uppercase font-cyber text-white">FOOTBALL <span className="text-mtlGreen">INTELLIGENCE</span></h2>
            <p className="text-gray-400 text-sm lg:text-base mt-2 max-w-2xl mx-auto font-sans font-medium">Real-time stats, AI match predictions, dynamic hotline dialing and complete feeds.</p>
          </div>
        </section>

        {/* Detailed Database Error Center */}
        {dbError && (
          <div className="max-w-7xl mx-auto px-6 pt-6">
            <div className="bg-red-950/50 border border-red-500/40 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">⚠</div>
                  <div>
                    <h3 className="font-extrabold text-red-400 text-sm uppercase tracking-wider">DATABASE ERROR</h3>
                    <p className="text-xs text-gray-300 mt-1">{dbError.operation} Operation Failed • Target Table: [{dbError.table}]</p>
                  </div>
                </div>
                <button onClick={() => setDbError(null)} className="text-gray-500 hover:text-white">✕</button>
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

        {/* Main Content Grid */}
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">

          {/* Live Section */}
          <section id="live-section">
            <div className="flex items-center justify-between mb-6 section-header">
              <div>
                <h3 className="font-extrabold text-lg uppercase tracking-wide text-white font-cyber flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> LIVE MATCHES
                </h3>
                <span className="text-xs text-gray-400">{liveMatchesData.length} Match{liveMatchesData.length === 1 ? '' : 'es'} Active</span>
              </div>
              <button onClick={() => setStatsListModal({ active: true, title: 'Live Games Directory', dataset: liveMatchesData })} className="btn-see-more">
                <span>SEE MORE MATCHES</span> ➔
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {!liveMatchesData.length ? (
                <div className="col-span-3 text-center py-8 pro-card">
                  <p className="text-xs text-gray-400">No live matches currently in play.</p>
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
          <section id="db-matches-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 section-header">
              <div>
                <h3 className="text-lg font-extrabold uppercase tracking-wide text-white font-cyber cursor-pointer hover:text-mtlGreen transition" onClick={() => openGoogleSearchIframe('Live database matches and football predictions')}>
                  ⚽ MATCHES & PREDICTIONS
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Hold match cards long press to trigger Google Search.</p>
              </div>
              <button onClick={() => setStatsListModal({ active: true, title: 'All Database Predictions', dataset: matchesData })} className="btn-see-more">
                <span>SEE MORE</span> ➔
              </button>
            </div>

            {/* Controls Row: Header Tabs & Match Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 border-b border-mtlCardBorder pb-4">
              <div className="flex items-center gap-2 bg-mtlDark p-1.5 rounded-xl border border-mtlCardBorder self-start">
                <button onClick={() => setActiveMatchTab('future')} className={`px-4 py-1.5 rounded-lg text-xs font-bold font-cyber transition ${activeMatchTab === 'future' ? 'bg-mtlGreen text-black' : 'text-gray-400 hover:text-white'}`}>
                  UPCOMING MATCHES
                </button>
                <button onClick={() => setActiveMatchTab('past')} className={`px-4 py-1.5 rounded-lg text-xs font-bold font-cyber transition ${activeMatchTab === 'past' ? 'bg-mtlGreen text-black' : 'text-gray-400 hover:text-white'}`}>
                  PAST PREDICTIONS
                </button>
              </div>

              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-xs">🔍</span>
                <input 
                  type="text" 
                  value={matchSearchQuery}
                  onChange={(e) => setMatchSearchQuery(e.target.value)} 
                  placeholder="Search match by name, date (YYYY-MM-DD), or time..." 
                  className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl pl-8 pr-4 py-2 text-xs text-white focus:outline-none focus:border-mtlGreen"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(() => {
                const list = getFilteredMatches();
                if (!list.length) {
                  return (
                    <div className="col-span-3 text-center py-10 pro-card">
                      <p className="text-xs text-gray-400">No {activeMatchTab === 'past' ? 'past' : 'upcoming'} matches found matching query "{matchSearchQuery}".</p>
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

            {userProfile.role === 'admin' && (
              <div className="mt-6 pt-4 border-t border-mtlCardBorder flex justify-center">
                <button onClick={() => openAdminModal('matches')} className="bg-mtlGreen text-black font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider hover:bg-mtlGreenHover transition flex items-center gap-2">
                  <span>➕</span> ADD PREDICTION
                </button>
              </div>
            )}
          </section>

          {/* Grid for Fixtures & Trending */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Fixtures Section */}
            <section id="fixtures-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-6 section-header">
                  <div>
                    <h3 className="font-extrabold uppercase tracking-wide text-base text-white font-cyber cursor-pointer hover:text-mtlGreen transition" onClick={() => openGoogleSearchIframe('Upcoming football fixtures schedule')}>
                       UPCOMING FIXTURES
                    </h3>
                    <span className="text-xs text-gray-400">Upcoming fixtures</span>
                  </div>
                  <button onClick={() => setStatsListModal({ active: true, title: 'Complete Fixtures Schedule', dataset: fixturesData })} className="btn-see-more text-xs py-2 px-3.5">
                    <span>SEE MORE</span> ➔
                  </button>
                </div>
                <div className="space-y-4">
                  {!fixturesData.length ? (
                    <div className="text-center py-8 text-xs text-gray-500">No upcoming fixtures recorded.</div>
                  ) : (
                    fixturesData.slice(0, 3).map(fix => (
                      <FixtureCard 
                        key={fix.id}
                        fixture={fix}
                        userProfile={userProfile}
                        openGoogleSearchIframe={openGoogleSearchIframe}
                        triggerAdminEdit={(section, id) => openAdminModal(section, id)}
                        deleteFixtureFromDB={deleteFixtureFromDB}
                      />
                    ))
                  )}
                </div>
              </div>
              {userProfile.role === 'admin' && (
                <div className="pt-4 border-t border-mtlCardBorder flex justify-center">
                  <button onClick={() => openAdminModal('fixtures')} className="bg-mtlCard border border-mtlGreen text-mtlGreen font-bold px-5 py-2 rounded-xl text-xs hover:bg-mtlGreen hover:text-black transition flex items-center gap-2">
                    <span>➕</span> ADD FIXTURE
                  </button>
                </div>
              )}
            </section>

            {/* Trending News Section */}
            <section id="trending-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-6 section-header">
                  <div>
                    <h3 className="font-extrabold uppercase tracking-wide text-base text-white font-cyber cursor-pointer hover:text-mtlGreen transition" onClick={() => openGoogleSearchIframe('Trending football news updates')}>
                      🔥 TRENDING NEWS
                    </h3>
                    <span className="text-xs text-gray-400">What's trending.</span>
                  </div>
                  <button onClick={() => setStatsListModal({ active: true, title: 'All Trending News', dataset: trendingData })} className="btn-see-more text-xs py-2 px-3.5">
                    <span>SEE MORE</span> ➔
                  </button>
                </div>
                <div className="space-y-4">
                  {!trendingData.length ? (
                    <div className="text-center py-8 text-xs text-gray-500">No trending headlines.</div>
                  ) : (
                    trendingData.slice(0, 3).map(item => (
                      <TrendingCard 
                        key={item.id}
                        item={item}
                        userProfile={userProfile}
                        openGoogleSearchIframe={openGoogleSearchIframe}
                        triggerAdminEdit={(section, id) => openAdminModal(section, id)}
                        deleteTrendingFromDB={deleteTrendingFromDB}
                      />
                    ))
                  )}
                </div>
              </div>
              {userProfile.role === 'admin' && (
                <div className="pt-4 border-t border-mtlCardBorder flex justify-center">
                  <button onClick={() => openAdminModal('trending')} className="bg-mtlCard border border-mtlGreen text-mtlGreen font-bold px-5 py-2 rounded-xl text-xs hover:bg-mtlGreen hover:text-black transition flex items-center gap-2">
                    <span>➕</span> ADD NEWS
                  </button>
                </div>
              )}
            </section>

          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-mtlCardBorder bg-mtlSurface mt-16 py-8 px-6 text-center text-xs text-gray-400">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p>© 2026 MTL Football Intelligence Hub. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-mtlGreen">Privacy Policy</a>
              <a href="#" className="hover:text-mtlGreen">Terms of Service</a>
              <a href="#" onClick={() => setIsDialingOpen(true)} className="hover:text-mtlGreen">Developed BY M. Lennox</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Google Iframe Search Modal */}
      {googleIframe.active && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col p-3 sm:p-6">
          <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-3 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-mtlGreen text-black font-extrabold flex items-center justify-center font-cyber">AI</div>
              <div>
                <h4 className="text-xs font-bold font-cyber text-mtlGreen">GOOGLE QUICK SEARCH</h4>
                <p className="text-[10px] text-gray-400 font-mono">Automated AI Mode: "{googleIframe.query}"</p>
              </div>
            </div>
            <button onClick={closeGoogleIframeModal} className="w-8 h-8 rounded-full bg-red-900/40 text-red-300 border border-red-500/30 flex items-center justify-center font-bold text-xs hover:bg-red-800">✕</button>
          </div>
          <div className="flex-1 rounded-2xl overflow-hidden border border-mtlCardBorder bg-white">
            <iframe 
              className="w-full h-full border-0" 
              src={`https://www.google.com/search?q=${encodeURIComponent(googleIframe.query)}&udm=14&udm=28&igu=1`}
              title="Google Search"
            ></iframe>
          </div>
        </div>
      )}

      {/* Global Community Chat Drawer */}
      <div className="fixed bottom-6 right-6 z-40">
        <button onClick={() => setIsChatOpen(prev => !prev)} className="w-14 h-14 rounded-full bg-mtlGreen text-black flex items-center justify-center text-2xl font-bold shadow-lg hover:scale-105 transition transform">💬</button>
        {isChatOpen && (
          <div className="absolute bottom-20 right-0 w-80 sm:w-96 bg-mtlSurface border border-mtlCardBorder rounded-2xl shadow-2xl flex flex-col h-[480px] overflow-hidden">
            <div className="bg-mtlDark p-4 border-b border-mtlCardBorder flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-mtlGreen animate-pulse"></span>
                <h4 className="font-bold text-sm tracking-wide font-cyber text-white">Community Chat</h4>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
              {!globalChatMessages.length ? (
                <div className="text-center text-gray-500 text-xs py-8">Welcome to Telegram global chat!</div>
              ) : (
                globalChatMessages.map(msg => (
                  <ChatBubble 
                    key={msg.id} 
                    msg={msg} 
                    isMatchChat={false}
                    currentUser={currentUser}
                    userProfile={userProfile}
                    editChatMessage={editChatMessage}
                    deleteChatMessage={deleteChatMessage}
                  />
                ))
              )}
            </div>

            <div className="p-3 border-t border-mtlCardBorder bg-mtlDark flex gap-2">
              <input 
                type="text" 
                value={globalChatInput}
                onChange={(e) => setGlobalChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendGlobalChatMessage()}
                placeholder="Type Telegram message..." 
                className="flex-1 bg-mtlCard border border-mtlCardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mtlGreen"
              />
              <button onClick={sendGlobalChatMessage} className="bg-mtlGreen text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-mtlGreenHover transition">Send</button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Comments Modal */}
      {fullscreenCommentsModal.active && (
        <div className="fixed inset-0 bg-mtlDark/95 backdrop-blur-xl z-50 p-4 md:p-10 overflow-y-auto flex flex-col justify-between">
          <div className="max-w-4xl w-full mx-auto bg-mtlSurface border border-mtlGreen/40 rounded-3xl p-6 md:p-8 shadow-2xl relative flex-1 flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between border-b border-mtlCardBorder pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-mtlGreen/20 border border-mtlGreen text-mtlGreen flex items-center justify-center font-bold text-lg font-cyber">💬</div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-white font-cyber">Comments Stream: {fullscreenCommentsModal.teams || 'Match Thread'}</h3>
                  <p className="text-xs text-mtlGreen">Leave a comment.</p>
                </div>
              </div>
              <button onClick={() => setFullscreenCommentsModal({ active: false, matchId: null, teams: '' })} className="w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[60vh]">
              {(() => {
                const comments = matchCommentsStore[fullscreenCommentsModal.matchId] || [];
                if (!comments.length) {
                  return <div className="text-center text-gray-500 py-12 text-xs font-medium">No comments posted for this match yet. Be the first to share analysis!</div>;
                }
                return comments.map(c => {
                  const canEdit = userProfile.role === 'admin' || (currentUser && c.user_id === currentUser.id);
                  return (
                    <div key={c.id} className="bg-mtlCard border border-mtlCardBorder p-4 rounded-2xl space-y-2 flex gap-3 items-start animate-slide-in">
                      <div className="w-9 h-9 rounded-full bg-mtlGreen/20 text-mtlGreen font-bold flex items-center justify-center text-xs font-cyber flex-shrink-0">{getFirstNameInitials(c.user)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-mtlGreen font-cyber">{c.user}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">{c.time}</span>
                            {canEdit && (
                              <>
                                <button onClick={() => editComment(c.id)} className="text-[10px] text-amber-400 hover:underline">Edit</button>
                                <button onClick={() => deleteComment(c.id)} className="text-[10px] text-red-400 hover:underline">Delete</button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-200 mt-1 leading-relaxed">{c.comment}</p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="bg-mtlDark p-4 rounded-2xl border border-mtlCardBorder space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Post Public Comment</h4>
              <div className="flex gap-3">
                <textarea 
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  rows="2" 
                  placeholder="Write detailed comment to be recorded in database..." 
                  className="flex-1 bg-mtlCard border border-mtlCardBorder rounded-xl p-3 text-xs text-white focus:outline-none focus:border-mtlGreen"
                ></textarea>
                <button onClick={submitFullscreenComment} className="bg-mtlGreen text-black font-extrabold px-6 py-2 rounded-xl text-xs hover:bg-mtlGreenHover transition self-end">Post Comment</button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-mtlCardBorder">
              <button onClick={() => setFullscreenCommentsModal({ active: false, matchId: null, teams: '' })} className="btn-see-more">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Directory / See More Modal */}
      {statsListModal.active && (
        <div className="fixed inset-0 bg-mtlDark/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">
          <div className="max-w-5xl mx-auto bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">
            <button onClick={() => setStatsListModal({ active: false, title: '', dataset: [] })} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
            <div className="space-y-6">
              <div className="border-b border-mtlCardBorder pb-4 section-header">
                <h3 className="text-2xl font-extrabold text-mtlGreen uppercase tracking-wider font-cyber">{statsListModal.title}</h3>
                <p className="text-xs text-gray-400 mt-1">Dataset display.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[65vh] overflow-y-auto pr-2">
                {!statsListModal.dataset?.length ? (
                  <div className="lg:col-span-3 text-center py-12 text-xs text-gray-500">No records registered.</div>
                ) : (
                  statsListModal.dataset.map((item, idx) => {
                    if (item.teams && item.prediction) {
                      return (
                        <MatchPredictionCard 
                          key={item.id || idx}
                          match={item}
                          userProfile={userProfile}
                          comments={matchCommentsStore[item.id] || []}
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
                      );
                    } else if (item.teams && item.league && !item.minute) {
                      return (
                        <FixtureCard 
                          key={item.id || idx}
                          fixture={item}
                          userProfile={userProfile}
                          openGoogleSearchIframe={openGoogleSearchIframe}
                          triggerAdminEdit={(section, id) => openAdminModal(section, id)}
                          deleteFixtureFromDB={deleteFixtureFromDB}
                        />
                      );
                    } else if (item.title && item.rank !== undefined) {
                      return (
                        <TrendingCard 
                          key={item.id || idx}
                          item={item}
                          userProfile={userProfile}
                          openGoogleSearchIframe={openGoogleSearchIframe}
                          triggerAdminEdit={(section, id) => openAdminModal(section, id)}
                          deleteTrendingFromDB={deleteTrendingFromDB}
                        />
                      );
                    } else if (item.teams && item.minute) {
                      return (
                        <LiveMatchCard 
                          key={item.id || idx}
                          match={item}
                          userProfile={userProfile}
                          openGoogleSearchIframe={openGoogleSearchIframe}
                          openFullscreenMatchModal={(id) => setFullscreenMatchModal({ active: true, matchId: id })}
                          triggerAdminEdit={(section, id) => openAdminModal(section, id)}
                          deleteMatchFromDB={deleteMatchFromDB}
                        />
                      );
                    }
                    return (
                      <div key={idx} className="pro-card p-4 space-y-2">
                        <h4 className="font-bold text-white text-sm font-cyber">{item.teams || item.title || 'Item'}</h4>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-mtlCardBorder flex justify-end">
              <button onClick={() => setStatsListModal({ active: false, title: '', dataset: [] })} className="btn-see-more">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Match Details Modal */}
      {fullscreenMatchModal.active && (() => {
        const match = matchesData.find(m => String(m.id) === String(fullscreenMatchModal.matchId));
        if (!match) return null;
        const type = String(match.type || 'free');
        const typeClass = type.toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';

        return (
          <div className="fixed inset-0 bg-mtlDark/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">
            <div className="max-w-5xl mx-auto bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">
              <button onClick={() => setFullscreenMatchModal({ active: false, matchId: null })} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              
              <div className="space-y-8">
                <div className="flex justify-between items-start border-b border-mtlCardBorder pb-6 section-header">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${typeClass}`}>{type} INTEL</span>
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-white mt-2 font-cyber hover:text-mtlGreen cursor-pointer" onClick={() => openGoogleSearchIframe(`Live analysis ${match.teams}`)}>{match.teams || 'Unknown Match'}</h2>
                    <p className="text-xs text-gray-400 mt-1 font-mono">Date: {match.match_date || ''} | Kickoff: {match.match_time || ''}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 uppercase tracking-widest block font-cyber">Confidence</span>
                    <span className="text-2xl">{stars}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-mtlDark p-5 rounded-2xl border border-mtlCardBorder space-y-2">
                    <span className="text-xs text-mtlGreen font-bold uppercase tracking-wider font-cyber">Prediction</span>
                    <p className="text-xl font-extrabold text-white font-cyber">{match.prediction || 'N/A'}</p>
                  </div>
                  <div className="bg-mtlDark p-5 rounded-2xl border border-mtlCardBorder space-y-2">
                    <span className="text-xs text-amber-400 font-bold uppercase tracking-wider font-cyber">Decimal Odds</span>
                    <p className="text-xl font-extrabold text-white font-cyber">{formatOdds(match.decimal_odds)}</p>
                  </div>
                  <div className="bg-mtlDark p-5 rounded-2xl border border-mtlCardBorder space-y-2">
                    <span className="text-xs text-blue-400 font-bold uppercase tracking-wider font-cyber">Status & Score</span>
                    <p className="text-xl font-extrabold text-white font-cyber">{match.status || 'PENDING'} ({match.final_score || 'Awaiting'})</p>
                  </div>
                </div>

                <div className="bg-mtlDark p-6 rounded-2xl border border-mtlCardBorder space-y-3">
                  <h4 className="font-extrabold text-sm uppercase tracking-wider text-mtlGreen font-cyber">Tactical Intelligence & Match Analysis</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{match.analysis_text || 'No tactical analysis available.'}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-mtlCardBorder flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button onClick={() => setMatchChatModal({ active: true, matchId: match.id, teams: match.teams })} className="bg-mtlCard border border-mtlCardBorder text-gray-200 px-4 py-2 rounded-xl text-xs hover:text-mtlGreen flex items-center gap-2">💬 Open Chat</button>
                  <button onClick={() => setIsDialingOpen(true)} className="bg-mtlGreen/10 border border-mtlGreen text-mtlGreen px-4 py-2 rounded-xl text-xs font-bold hover:bg-mtlGreen hover:text-black transition">📞 Call</button>
                </div>
                <button onClick={() => setFullscreenMatchModal({ active: false, matchId: null })} className="btn-see-more">Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Match Thread Telegram Chat Modal */}
      {matchChatModal.active && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-mtlDark p-4 border-b border-mtlCardBorder flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-mtlGreen font-cyber">Telegram Match Thread: {matchChatModal.teams}</h4>
                <p className="text-[10px] text-gray-400">Match discussion Group</p>
              </div>
              <button onClick={() => setMatchChatModal({ active: false, matchId: null, teams: '' })} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
              {(() => {
                const messages = matchChatStore[matchChatModal.matchId] || [];
                if (!messages.length) return <div className="text-center text-gray-500 text-xs py-8">No messages in this match chat thread yet.</div>;
                return messages.map(msg => (
                  <ChatBubble 
                    key={msg.id} 
                    msg={msg} 
                    isMatchChat={true}
                    currentUser={currentUser}
                    userProfile={userProfile}
                    editChatMessage={editChatMessage}
                    deleteChatMessage={deleteChatMessage}
                  />
                ));
              })()}
            </div>

            <div className="p-3 border-t border-mtlCardBorder bg-mtlDark flex gap-2">
              <input 
                type="text" 
                value={matchChatInput}
                onChange={(e) => setMatchChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMatchChatMessage()}
                placeholder="Discuss this match..." 
                className="flex-1 bg-mtlCard border border-mtlCardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mtlGreen"
              />
              <button onClick={sendMatchChatMessage} className="bg-mtlGreen text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-mtlGreenHover transition">Post</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Hotline Center Modal */}
      {isDialingOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-2xl p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-mtlCardBorder pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-mtlGreen/20 border border-mtlGreen text-mtlGreen flex items-center justify-center text-xl">📞</div>
                <div>
                  <h3 className="text-lg font-bold font-cyber text-white">Live Call Centre</h3>
                  <p className="text-xs text-gray-400">Direct call support +254716883895</p>
                </div>
              </div>
              <button onClick={() => setIsDialingOpen(false)} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-mtlDark p-4 rounded-xl border border-mtlCardBorder space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-mtlGreen tracking-wider">WHATSAPP</span>
                  <h4 className="font-bold text-sm text-white mt-1">Chat on WhatsApp</h4>
                  <p className="text-xs text-gray-400">Message us directly on WhatsApp.</p>
                </div>
                <a href="https://wa.me/254716883895" target="_blank" rel="noreferrer" className="w-full bg-mtlGreen text-black text-center text-xs font-bold py-2.5 rounded-xl hover:bg-mtlGreenHover transition mt-3 block">💬 WhatsApp +254716883895</a>
              </div>
              <div className="bg-mtlDark p-4 rounded-xl border border-mtlCardBorder space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">PHONE CALL</span>
                  <h4 className="font-bold text-sm text-white mt-1">Direct Phone Call</h4>
                  <p className="text-xs text-gray-400">Dial live support line directly from your device.</p>
                </div>
                <a href="tel:+254716883895" className="w-full bg-amber-500/10 border border-amber-500 text-amber-400 text-center text-xs font-bold py-2.5 rounded-xl hover:bg-amber-500 hover:text-black transition mt-3 block">📞 Call +254716883895</a>
              </div>
            </div>
            <div className="text-center pt-2">
              <button onClick={() => setIsDialingOpen(false)} className="text-xs text-gray-400 hover:text-white">Close Call Centre</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Admin Modal */}
      {adminModal.active && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-2xl p-8 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-mtlCardBorder pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-mtlGreen uppercase tracking-wider font-cyber">
                  {adminModal.itemId ? `Edit ${adminModal.section}` : `Add ${adminModal.section}`}
                </h3>
                <p className="text-xs text-gray-400">Insert or update Record</p>
              </div>
              <button onClick={() => setAdminModal({ active: false, section: null, itemId: null })} className="text-gray-400 hover:text-white font-bold text-xl">✕</button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {adminModal.section === 'matches' && (
                <>
                  <input type="text" placeholder="Teams (e.g. Chelsea vs Arsenal)" value={adminFormData.teams || ''} onChange={e => setAdminFormData({ ...adminFormData, teams: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                  <input type="text" placeholder="League / Competition" value={adminFormData.league || ''} onChange={e => setAdminFormData({ ...adminFormData, league: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={adminFormData.match_date || ''} onChange={e => setAdminFormData({ ...adminFormData, match_date: e.target.value })} className="bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                    <input type="time" value={adminFormData.match_time || ''} onChange={e => setAdminFormData({ ...adminFormData, match_time: e.target.value })} className="bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Prediction (e.g. Home Win)" value={adminFormData.prediction || ''} onChange={e => setAdminFormData({ ...adminFormData, prediction: e.target.value })} className="bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                    <input type="number" step="0.01" placeholder="Odds (e.g. 2.10)" value={adminFormData.decimal_odds || ''} onChange={e => setAdminFormData({ ...adminFormData, decimal_odds: e.target.value })} className="bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input type="number" placeholder="Home Prob %" value={adminFormData.prob_home || ''} onChange={e => setAdminFormData({ ...adminFormData, prob_home: e.target.value })} className="bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                    <input type="number" placeholder="Draw Prob %" value={adminFormData.prob_draw || ''} onChange={e => setAdminFormData({ ...adminFormData, prob_draw: e.target.value })} className="bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                    <input type="number" placeholder="Away Prob %" value={adminFormData.prob_away || ''} onChange={e => setAdminFormData({ ...adminFormData, prob_away: e.target.value })} className="bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                  </div>
                  <textarea placeholder="Tactical Analysis Text" rows="3" value={adminFormData.analysis_text || ''} onChange={e => setAdminFormData({ ...adminFormData, analysis_text: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white"></textarea>
                </>
              )}

              {adminModal.section === 'fixtures' && (
                <>
                  <input type="text" placeholder="Teams (e.g. Real Madrid vs Barcelona)" value={adminFormData.teams || ''} onChange={e => setAdminFormData({ ...adminFormData, teams: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                  <input type="text" placeholder="League / Competition" value={adminFormData.league || ''} onChange={e => setAdminFormData({ ...adminFormData, league: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={adminFormData.match_date || ''} onChange={e => setAdminFormData({ ...adminFormData, match_date: e.target.value })} className="bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                    <input type="time" value={adminFormData.match_time || ''} onChange={e => setAdminFormData({ ...adminFormData, match_time: e.target.value })} className="bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                  </div>
                </>
              )}

              {adminModal.section === 'trending' && (
                <>
                  <input type="text" placeholder="Headline / Title" value={adminFormData.title || ''} onChange={e => setAdminFormData({ ...adminFormData, title: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" placeholder="Rank (e.g. 1)" value={adminFormData.rank || ''} onChange={e => setAdminFormData({ ...adminFormData, rank: e.target.value })} className="bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                    <input type="number" placeholder="Comments Count" value={adminFormData.comments_count || ''} onChange={e => setAdminFormData({ ...adminFormData, comments_count: e.target.value })} className="bg-mtlDark border border-mtlCardBorder rounded-xl p-3 text-xs text-white" />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-4 border-t border-mtlCardBorder pt-4">
              <button onClick={() => setAdminModal({ active: false, section: null, itemId: null })} className="px-5 py-2.5 rounded-xl text-xs bg-gray-800 text-gray-300 hover:bg-gray-700">Cancel</button>
              <button onClick={saveAdminEntry} className="px-6 py-2.5 rounded-xl text-xs bg-mtlGreen text-black font-extrabold hover:bg-mtlGreenHover transition">Save Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* User Preferences & Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-mtlCardBorder pb-3">
              <h3 className="text-base font-bold text-mtlGreen uppercase tracking-wider font-cyber">User Preferences</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">ODDS FORMAT</label>
                <select value={userProfile.odds_format} onChange={e => setUserProfile({ ...userProfile, odds_format: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-white">
                  <option value="decimal">Decimal (2.00)</option>
                  <option value="fractional">Fractional (1/1)</option>
                  <option value="american">American (+100)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">LANGUAGE</label>
                <select value={userProfile.language} onChange={e => setUserProfile({ ...userProfile, language: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-white">
                  <option value="en">English (EN)</option>
                  <option value="sw">Swahili (SW)</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-gray-300">CONTRAST MODE</span>
                <input type="checkbox" checked={userProfile.high_contrast} onChange={e => setUserProfile({ ...userProfile, high_contrast: e.target.checked })} className="w-4 h-4 accent-mtlGreen" />
              </div>
            </div>
            <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-mtlGreen text-black font-bold py-2 rounded-xl">Save & Close</button>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// --- REUSABLE SUB-COMPONENTS ---
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
    <div {...longPressProps} className="pro-card p-5 relative overflow-hidden cursor-pointer animate-slide-in">
      <div className="flex justify-between items-center text-xs text-gray-400 mb-3 font-semibold">
        <span className="font-cyber hover:text-mtlGreen" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Match live summary ${match.teams}`); }}>
          {match.league}
        </span>
        <span className="text-red-500 font-bold animate-pulse">● LIVE</span>
      </div>
      <div className="flex items-center justify-between my-4">
        <div className="text-center flex-1">
          <div className="w-10 h-10 mx-auto avatar-logo mb-1 font-cyber text-xs">{getTeamBadge(home)}</div>
          <span className="text-xs font-bold tracking-wide text-white">{home}</span>
        </div>
        <div className="text-2xl font-extrabold tracking-wider px-2 font-cyber text-mtlGreen">- _ -</div>
        <div className="text-center flex-1">
          <div className="w-10 h-10 mx-auto avatar-logo mb-1 font-cyber text-xs">{getTeamBadge(away)}</div>
          <span className="text-xs font-bold tracking-wide text-white">{away}</span>
        </div>
      </div>
      <div className="text-center text-xs font-semibold text-mtlGreen mb-2 font-cyber">{match.minute} Minutes</div>
      <div className="water-progress-container mb-3">
        <div className="water-progress-bar" style={{ width: `${match.progress}%` }}></div>
      </div>
      <div className="text-[11px] text-gray-400 pt-2 border-t border-mtlCardBorder flex justify-between items-center">
        <span className="truncate">{match.details}</span>
        {userProfile.role === 'admin' && (
          <div className="flex gap-1 ml-2">
            <button onClick={(e) => { e.stopPropagation(); triggerAdminEdit('matches', match.id); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded hover:bg-amber-500 hover:text-black">Edit</button>
            <button onClick={(e) => { e.stopPropagation(); deleteMatchFromDB(match.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded hover:bg-red-600 hover:text-white">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchPredictionCard({ 
  match, 
  userProfile, 
  comments, 
  reactToMatch, 
  formatOdds, 
  openGoogleSearchIframe, 
  openReactionUsersModal, 
  openFullscreenCommentsModal, 
  openFullscreenMatchModal, 
  openMatchChatModal, 
  triggerAdminEdit, 
  deleteMatchFromDB 
}) {
  const isAdmin = userProfile.role === 'admin';
  const type = String(match.type || 'free');
  const typeClass = type.toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';
  const oddsText = match.decimal_odds !== null && match.decimal_odds !== undefined ? formatOdds(match.decimal_odds) : 'N/A';
  const probHome = Number(match.prob_home) || 0;
  const probDraw = Number(match.prob_draw) || 0;
  const probAway = Number(match.prob_away) || 0;

  const cardLongPress = useLongPress(() => openGoogleSearchIframe(`Football Match Prediction for ${match.teams || ''}`), null, { delay: 850 });

  const fireLongPress = useLongPress(() => openReactionUsersModal(match.id, 'fire'), (e) => { e.stopPropagation(); reactToMatch(match.id, 'fire'); }, { delay: 300 });
  const heartLongPress = useLongPress(() => openReactionUsersModal(match.id, 'heart'), (e) => { e.stopPropagation(); reactToMatch(match.id, 'heart'); }, { delay: 300 });
  const dislikeLongPress = useLongPress(() => openReactionUsersModal(match.id, 'dislike'), (e) => { e.stopPropagation(); reactToMatch(match.id, 'dislike'); }, { delay: 300 });

  return (
    <div {...cardLongPress} className="pro-card p-5 flex flex-col justify-between space-y-4 cursor-pointer animate-slide-in">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${typeClass}`}>{type} Match</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-400 font-bold font-cyber">Odds: {oddsText}</span>
            <span className="text-[10px] text-gray-400 font-mono">{match.match_date || ''} {match.match_time || ''}</span>
          </div>
        </div>
        <h4 className="font-extrabold text-base text-white tracking-wide font-cyber hover:text-mtlGreen" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Prediction summary for ${match.teams}`); }}>
          {match.teams || 'Unknown Match'}
        </h4>
        <p className="text-xs text-mtlGreen font-semibold">Prediction: {match.prediction || 'N/A'} ({stars})</p>
        <p className="text-xs text-gray-400 line-clamp-2">{match.analysis_text || 'Tactical breakdown in detailed view.'}</p>
      </div>

      <div className="space-y-1 bg-mtlDark p-3 rounded-xl border border-mtlCardBorder">
        <div className="flex justify-between text-[10px] font-bold text-gray-300">
          <span>Probability:</span>
          <span>H: {probHome}% | D: {probDraw}% | A: {probAway}%</span>
        </div>
        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden flex">
          <div style={{ width: `${probHome}%` }} className="bg-mtlGreen h-full"></div>
          <div style={{ width: `${probDraw}%` }} className="bg-amber-400 h-full"></div>
          <div style={{ width: `${probAway}%` }} className="bg-blue-500 h-full"></div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button {...fireLongPress} className="bg-mtlDark border border-mtlCardBorder px-2.5 py-1 rounded-lg text-xs hover:border-mtlGreen flex items-center gap-1 transition">
          🔥 <span>{match.reactions?.fire || 0}</span>
        </button>
        <button {...heartLongPress} className="bg-mtlDark border border-mtlCardBorder px-2.5 py-1 rounded-lg text-xs hover:border-mtlGreen flex items-center gap-1 transition">
          ❤️ <span>{match.reactions?.heart || 0}</span>
        </button>
        <button {...dislikeLongPress} className="bg-mtlDark border border-mtlCardBorder px-2.5 py-1 rounded-lg text-xs hover:border-mtlGreen flex items-center gap-1 transition">
          👎 <span>{match.reactions?.dislike || 0}</span>
        </button>
      </div>

      <div onClick={(e) => { e.stopPropagation(); openFullscreenCommentsModal(match.id, match.teams); }} className="bg-mtlDark rounded-xl p-3 space-y-2 border border-mtlCardBorder hover:border-mtlGreen transition cursor-pointer">
        <div className="flex justify-between items-center text-[11px] font-bold text-gray-300">
          <span>💬 Comments ({comments.length})</span>
          <span className="text-mtlGreen text-[10px] uppercase font-bold">🖥️ Fullscreen View ➔</span>
        </div>
        <div className="space-y-1.5 max-h-20 overflow-y-auto text-[11px]">
          {!comments.length ? (
            <p className="text-gray-500 italic text-[10px]">No comments yet. Click to start discussion.</p>
          ) : (
            comments.slice(-2).map((c, i) => (
              <div key={i} className="bg-mtlCard p-1.5 rounded border border-mtlCardBorder text-gray-300">
                <span className="font-bold text-mtlGreen">{c.user}:</span> {c.comment}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-mtlCardBorder flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); openFullscreenMatchModal(match.id); }} className="bg-mtlGreen/10 border border-mtlGreen text-mtlGreen hover:bg-mtlGreen hover:text-black font-bold px-3 py-1.5 rounded-xl text-xs transition">🔍 Details</button>
          <button onClick={(e) => { e.stopPropagation(); openMatchChatModal(match.id, match.teams || ''); }} className="bg-mtlDark border border-mtlCardBorder px-3 py-1.5 rounded-xl text-xs text-gray-200 hover:text-mtlGreen transition flex items-center gap-1">💬 Telegram Chat</button>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); triggerAdminEdit('matches', match.id); }} className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-amber-500 hover:text-black transition">Edit</button>
            <button onClick={(e) => { e.stopPropagation(); deleteMatchFromDB(match.id); }} className="bg-red-600/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

function FixtureCard({ fixture, userProfile, openGoogleSearchIframe, triggerAdminEdit, deleteFixtureFromDB }) {
  const longPressProps = useLongPress(() => openGoogleSearchIframe(`Football fixture data for ${fixture.teams || ''} ${fixture.league || ''}`), null, { delay: 850 });

  return (
    <div {...longPressProps} className="pro-card p-4 flex items-center justify-between cursor-pointer animate-slide-in">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-mtlDark border border-mtlCardBorder flex items-center justify-center font-bold text-xs text-mtlGreen font-cyber">{fixture.badge}</div>
        <div>
          <h4 className="font-bold text-xs text-white hover:text-mtlGreen" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Fixture schedule ${fixture.teams}`); }}>{fixture.teams || 'Fixture'}</h4>
          <span className="text-[10px] text-gray-400">{fixture.league || 'League'}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-xs font-bold text-mtlGreen block font-cyber">{fixture.match_time || 'TBD'}</span>
          <span className="text-[10px] text-gray-500">{fixture.match_date || 'TBD'}</span>
        </div>
        {userProfile.role === 'admin' && (
          <div className="flex gap-1 ml-2">
            <button onClick={(e) => { e.stopPropagation(); triggerAdminEdit('fixtures', fixture.id); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">Edit</button>
            <button onClick={(e) => { e.stopPropagation(); deleteFixtureFromDB(fixture.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TrendingCard({ item, userProfile, openGoogleSearchIframe, triggerAdminEdit, deleteTrendingFromDB }) {
  const longPressProps = useLongPress(() => openGoogleSearchIframe(`Football news updates on ${item.title || ''}`), null, { delay: 850 });

  return (
    <div {...longPressProps} className="pro-card p-4 flex items-center justify-between cursor-pointer animate-slide-in">
      <div className="flex items-center gap-3">
        <span className="text-sm font-extrabold text-mtlGreen font-cyber">#{item.rank}</span>
        <div>
          <h4 className="font-bold text-xs text-white hover:text-mtlGreen" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(item.title); }}>{item.title}</h4>
          <span className="text-[10px] text-gray-500">💬 {Number(item.comments_count) || 6237} discussions</span>
        </div>
      </div>
      {userProfile.role === 'admin' && (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); triggerAdminEdit('trending', item.id); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); deleteTrendingFromDB(item.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white">Delete</button>
        </div>
      )}
    </div>
  );
}

function ChatBubble({ msg, isMatchChat, currentUser, userProfile, editChatMessage, deleteChatMessage }) {
  const isMe = currentUser && msg.user_id === currentUser.id;
  const canEdit = userProfile.role === 'admin' || isMe;

  return (
    <div className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'} animate-slide-in`}>
      <div className="text-[9px] text-gray-400 mb-0.5 px-1 flex items-center gap-2">
        <span>{msg.user} • {msg.time}</span>
        {canEdit && (
          <>
            <button onClick={() => editChatMessage(msg.id, isMatchChat)} className="text-amber-400 hover:underline">Edit</button>
            <button onClick={() => deleteChatMessage(msg.id, isMatchChat)} className="text-red-400 hover:underline">Delete</button>
          </>
        )}
      </div>
      <div className={`px-3.5 py-2 text-xs ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>
        {msg.text}
      </div>
    </div>
  );
}
