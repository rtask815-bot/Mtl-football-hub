import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ==========================================
// SUPABASE CLIENT INITIALIZATION
// ==========================================
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function PredictionHub() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState({
    role: 'user',
    username: 'not Signed in',
    email: '',
    odds_format: 'decimal',
    language: 'en',
    high_contrast: false
  });

  const [matchesData, setMatchesData] = useState([]);
  const [fixturesData, setFixturesData] = useState([]);
  const [trendingData, setTrendingData] = useState([]);
  const [liveMatchesData, setLiveMatchesData] = useState([]);

  const [globalChatMessages, setGlobalChatMessages] = useState([]);
  const [matchCommentsStore, setMatchCommentsStore] = useState({});
  const [matchChatStore, setMatchChatStore] = useState({});
  const [matchReactionsMap, setMatchReactionsMap] = useState({});

  // UI States & Modals
  const [activeMatchTab, setActiveMatchTab] = useState('future');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [loaderState, setLoaderState] = useState({ active: true, text: 'initializing secure intelligence core...', progress: 25 });
  const [toastList, setToastList] = useState([]);
  const [databaseError, setDatabaseError] = useState(null);

  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [dialingModalOpen, setDialingModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [googleModal, setGoogleModal] = useState({ open: false, query: '', url: 'about:blank' });
  const [reactionUsersModal, setReactionUsersModal] = useState({ open: false, title: '', users: [] });
  const [statsListModal, setStatsListModal] = useState({ open: false, title: '', dataset: [] });
  const [fullscreenMatchModal, setFullscreenMatchModal] = useState({ open: false, matchId: null });
  const [fullscreenCommentsModal, setFullscreenCommentsModal] = useState({ open: false, matchId: null, teams: '' });
  const [matchChatModal, setMatchChatModal] = useState({ open: false, matchId: null, teams: '' });

  // Admin Modal States
  const [adminModal, setAdminModal] = useState({ open: false, section: null, itemId: null, formData: {} });

  // Inputs
  const [globalChatInput, setGlobalChatInput] = useState('');
  const [fullscreenCommentInput, setFullscreenCommentInput] = useState('');
  const [matchChatInput, setMatchChatInput] = useState('');

  // ==========================================
  // SESSION CHECK & INITIAL LOAD (Auth logic)
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    async function initializeApp() {
      triggerLoader("establishing quantum sync...", 15);
      const authenticated = await checkUserSession();
      if (!authenticated || !isMounted) return;

      triggerLoader("fetching neural feeds...", 40);
      await loadDatabaseReactions();

      await Promise.all([
        loadMatchesFromDB(),
        loadFixturesFromDB(),
        loadTrendingFromDB(),
        loadDatabaseComments(),
        loadDatabaseChats()
      ]);

      triggerLoader("sync complete", 100);
      setTimeout(() => {
        if (isMounted) setLoaderState(prev => ({ ...prev, active: false }));
      }, 300);
    }

    initializeApp();

    const interval = setInterval(() => {
      updateLiveMatches();
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Realtime Subscriptions
  useEffect(() => {
    const chatsChannel = db.channel('public:chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, async () => {
        await loadDatabaseChats();
      })
      .subscribe();

    const commentsChannel = db.channel('public:comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async () => {
        await loadDatabaseComments();
      })
      .subscribe();

    const reactionsChannel = db.channel('public:reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, async () => {
        await loadDatabaseReactions();
        await loadMatchesFromDB();
      })
      .subscribe();

    return () => {
      db.removeChannel(chatsChannel);
      db.removeChannel(commentsChannel);
      db.removeChannel(reactionsChannel);
    };
  }, []);

  // Update live matches whenever matchesData updates
  useEffect(() => {
    updateLiveMatches();
  }, [matchesData]);

  // ==========================================
  // AUTH & SESSION CHECK LOGIC (From auth.jsx)
  // ==========================================
  async function checkUserSession() {
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

      if (profileError) showDatabaseErrorState('profiles', profileError, 'READ_PROFILE');

      const dbName = profile?.name || profile?.username;
      const username = dbName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const email = profile?.email || user.email || 'user@mtl.com';
      const isUserAdmin = profile?.role === 'admin' || profile?.is_admin === true || profile?.admin === true;
      const role = isUserAdmin ? 'admin' : 'user';

      setUserProfile(prev => ({ ...prev, username, email, role }));
      return true;
    } catch (err) {
      showDatabaseErrorState('auth.session', err, 'SESSION_EXCEPTION');
      window.location.href = "auth.html";
      return false;
    }
  }

  async function signOutUser() {
    await db.auth.signOut();
    window.location.href = "auth.html";
  }

  // ==========================================
  // SECURITY & SANITIZATION
  // ==========================================
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
            showToast("🚨 XSS Injection Attempt Blocked by Security Hack Lock!");
            throw new Error("Security Violation: Malicious payload detected.");
          }
          payload[key] = sanitizeInput(payload[key]);
        }
      }
    }
    return payload;
  }

  function showToast(message, isError = true) {
    const id = Date.now() + Math.random();
    setToastList(prev => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToastList(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }

  function triggerLoader(text, progress) {
    setLoaderState({ active: true, text, progress });
  }

  function showDatabaseErrorState(table, error, operation) {
    setDatabaseError({
      table,
      operation,
      title: `${operation} Operation Failed • Target Table: [${table}]`,
      diagnosis: error?.code === '42501' || error?.message?.includes('permission') ? "Row-Level Security (RLS) Permission Denied." : `Database error code: ${error?.code || 'UNKNOWN'}`,
      action: error?.code === '42501' ? "Check Supabase table policies." : "Check table structure or review Supabase logs.",
      details: JSON.stringify(error, null, 2)
    });
  }

  // ==========================================
  // DATA FETCHING & NORMALIZATION
  // ==========================================
  async function loadDatabaseReactions() {
    try {
      const { data, error } = await db.from('reactions').select('*');
      if (error) { showDatabaseErrorState('reactions', error, 'READ_REACTIONS'); return; }
      if (Array.isArray(data)) {
        const map = {};
        data.forEach(r => {
          const mId = String(r.match_id);
          if (!map[mId]) map[mId] = [];
          map[mId].push({ user_id: r.user_id, username: r.username || 'User', reaction: r.reaction_type });
        });
        setMatchReactionsMap(map);
      }
    } catch (e) { showDatabaseErrorState('reactions', e, 'READ_REACTIONS'); }
  }

  async function loadDatabaseComments() {
    try {
      const { data, error } = await db.from('comments').select('*').order('created_at', { ascending: true });
      if (error) { showDatabaseErrorState('comments', error, 'READ_COMMENTS'); return; }
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
    } catch (err) { showDatabaseErrorState('comments', err, 'READ_COMMENTS'); }
  }

  async function loadDatabaseChats() {
    try {
      const { data, error } = await db.from('chats').select('*').order('created_at', { ascending: true });
      if (error) { showDatabaseErrorState('chats', error, 'READ_CHATS'); return; }
      if (Array.isArray(data)) {
        const gChat = [];
        const mChat = {};
        data.forEach(msg => {
          const parsed = {
            id: msg.id,
            user_id: msg.user_id,
            user: msg.username || msg.user || 'User',
            text: msg.message || msg.text || '',
            time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
          };
          if (!msg.match_id) {
            gChat.push(parsed);
          } else {
            const mId = String(msg.match_id);
            if (!mChat[mId]) mChat[mId] = [];
            mChat[mId].push(parsed);
          }
        });
        setGlobalChatMessages(gChat);
        setMatchChatStore(mChat);
      }
    } catch (err) { showDatabaseErrorState('chats', err, 'READ_CHATS'); }
  }

  async function loadMatchesFromDB() {
    try {
      const { data, error } = await db.from('matches').select('*').order('created_at', { ascending: false });
      if (error) { showDatabaseErrorState('matches', error, 'READ_MATCHES'); return; }
      const normalized = Array.isArray(data) ? data.map(m => normalizeMatch(m, matchReactionsMap)) : [];
      setMatchesData(normalized);
    } catch (error) { showDatabaseErrorState('matches', error, 'READ_MATCHES'); }
  }

  function normalizeMatch(match, reactionsMap = matchReactionsMap) {
    const parsedOdds = parseFloat(match.decimal_odds);
    const parsedHome = parseFloat(match.prob_home);
    const parsedDraw = parseFloat(match.prob_draw);
    const parsedAway = parseFloat(match.prob_away);
    const parsedStars = parseInt(match.confidence_stars, 10);

    const mId = String(match.id);
    const userReactions = reactionsMap[mId] || [];
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
  }

  async function loadFixturesFromDB() {
    try {
      const { data, error } = await db.from('fixtures').select('*').order('match_date', { ascending: true });
      if (error) { showDatabaseErrorState('fixtures', error, 'READ_FIXTURES'); return; }
      const normalized = Array.isArray(data) ? data.map(f => ({ ...f, match_date: f.match_date ?? f.date ?? '', match_time: f.match_time ?? f.time ?? '', badge: f.badge || getTeamBadge(f.teams) })) : [];
      setFixturesData(normalized);
    } catch (error) { showDatabaseErrorState('fixtures', error, 'READ_FIXTURES'); }
  }

  async function loadTrendingFromDB() {
    try {
      const { data, error } = await db.from('trending').select('*').order('rank', { ascending: true });
      if (error) { showDatabaseErrorState('trending', error, 'READ_TRENDING'); return; }
      const normalized = Array.isArray(data) ? data.map(t => ({ ...t, rank: t.rank ?? '', title: t.title ?? '', comments_count: t.comments_count ?? t.comments ?? 0 })) : [];
      setTrendingData(normalized);
    } catch (error) { showDatabaseErrorState('trending', error, 'READ_TRENDING'); }
  }

  // ==========================================
  // LIVE MATCH CALCULATIONS
  // ==========================================
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
      league: match.league || match.competition || 'FOOTBALL',
      teams: match.teams || 'Unknown Teams',
      score: match.score || match.final_score || '0 - 0',
      minute: minuteStr,
      progress,
      details: match.live_details || match.details || match.analysis_text || 'Live match intelligence available.'
    };
  }

  function getTeamBadge(teams) {
    if (!teams) return '⚽';
    const firstTeam = String(teams).split(/\s+vs\.?\s+/i)[0].trim();
    const words = firstTeam.split(/\s+/).filter(Boolean);
    return words.length >= 2 ? (words[0].charAt(0) + words[1].charAt(0)).toUpperCase() : firstTeam.substring(0, 3).toUpperCase();
  }

  function getFirstNameInitials(name) {
    if (!name) return 'MT';
    const cleanName = String(name).trim();
    const parts = cleanName.split(/\s+/);
    const firstName = parts[0];
    return firstName.length >= 2 ? firstName.substring(0, 2).toUpperCase() : firstName.charAt(0).toUpperCase();
  }

  function formatOdds(decimalVal) {
    const val = parseFloat(decimalVal);
    if (!Number.isFinite(val) || val <= 1) return 'N/A';
    if (userProfile.odds_format === 'fractional') return `${Math.round((val - 1) * 100)}/100`;
    if (userProfile.odds_format === 'american') return val >= 2.0 ? `+${Math.round((val - 1) * 100)}` : `-${Math.round(100 / (val - 1))}`;
    return val.toFixed(2);
  }

  // ==========================================
  // INTERACTIONS & ACTIONS
  // ==========================================
  function openGoogleSearchIframe(queryText) {
    setGoogleModal({
      open: true,
      query: `Automated AI Mode: "${queryText}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(queryText)}&udm=14&udm=28&igu=1`
    });
  }

  async function reactToMatch(matchId, type) {
    const match = matchesData.find(m => String(m.id) === String(matchId));
    if (!match) return;

    const mId = String(matchId);
    const currentMap = { ...matchReactionsMap };
    if (!currentMap[mId]) currentMap[mId] = [];

    const userId = currentUser?.id || 'guest';
    const userPrevReaction = currentMap[mId].find(r => r.user_id === userId);
    const newReactions = { ...(match.reactions || { fire: 0, heart: 0, dislike: 0 }) };

    if (userPrevReaction) {
      if (userPrevReaction.reaction === type) {
        newReactions[type] = Math.max(0, Number(newReactions[type] || 0) - 1);
        currentMap[mId] = currentMap[mId].filter(r => r.user_id !== userId);
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
      currentMap[mId].push({ user_id: userId, username: userProfile.username, reaction: type });
      try {
        await db.from('reactions').insert([{ match_id: matchId, user_id: userId, username: userProfile.username, reaction_type: type }]);
      } catch (e) {}
    }

    setMatchReactionsMap(currentMap);
    setMatchesData(prev => prev.map(m => String(m.id) === String(matchId) ? { ...m, reactions: newReactions } : m));

    try { await db.from('matches').update({ reactions: newReactions }).eq('id', matchId); } catch (err) {}
  }

  async function sendGlobalChatMessage() {
    const text = globalChatInput.trim();
    if (!text) { showToast("Chat message cannot be empty."); return; }
    try {
      const sanitized = verifyHackLocksAndSanitize({ username: userProfile.username, message: text, user_id: currentUser?.id });
      const { error } = await db.from('chats').insert([sanitized]);
      if (error) showDatabaseErrorState('chats', error, 'INSERT_GLOBAL_CHAT');
      else await loadDatabaseChats();
    } catch (err) { showToast(err.message || "Security exception blocked message."); }
    setGlobalChatInput('');
  }

  async function submitFullscreenComment() {
    const text = fullscreenCommentInput.trim();
    if (!text || !fullscreenCommentsModal.matchId) { showToast("Please enter a non-empty comment."); return; }
    try {
      const sanitized = verifyHackLocksAndSanitize({ match_id: fullscreenCommentsModal.matchId, username: userProfile.username, comment: text, user_id: currentUser?.id });
      triggerLoader("Posting comment to database...", 50);
      const { error } = await db.from('comments').insert([sanitized]);
      if (error) {
        showDatabaseErrorState('comments', error, 'INSERT_COMMENT');
        showToast("Failed to save comment.");
      } else {
        await loadDatabaseComments();
        showToast("Comment published successfully!", false);
      }
    } catch (err) { showToast(err.message || "Error occurred while posting comment."); }
    setFullscreenCommentInput('');
    setLoaderState(prev => ({ ...prev, active: false }));
  }

  async function sendMatchChatMessage() {
    const text = matchChatInput.trim();
    if (!text || !matchChatModal.matchId) { showToast("Match message cannot be empty."); return; }
    try {
      const sanitized = verifyHackLocksAndSanitize({ match_id: matchChatModal.matchId, username: userProfile.username, message: text, user_id: currentUser?.id });
      const { error } = await db.from('chats').insert([sanitized]);
      if (error) showDatabaseErrorState('chats', error, 'INSERT_MATCH_CHAT');
      else await loadDatabaseChats();
    } catch (err) { showToast(err.message || "Security violation blocked message."); }
    setMatchChatInput('');
  }

  async function deleteMatchFromDB(id) {
    triggerLoader("Deleting Match Record...", 50);
    try {
      const { error } = await db.from('matches').delete().eq('id', id);
      if (error) { showDatabaseErrorState('matches', error, 'DELETE_MATCH'); return; }
      await loadMatchesFromDB();
      showToast("Match removed.", false);
    } catch (err) { showDatabaseErrorState('matches', err, 'DELETE_MATCH'); }
    finally { setLoaderState(prev => ({ ...prev, active: false })); }
  }

  async function deleteFixtureFromDB(id) {
    triggerLoader("Deleting Fixture Record...", 50);
    try {
      const { error } = await db.from('fixtures').delete().eq('id', id);
      if (error) { showDatabaseErrorState('fixtures', error, 'DELETE_FIXTURE'); return; }
      await loadFixturesFromDB();
      showToast("Fixture removed.", false);
    } catch (err) { showDatabaseErrorState('fixtures', err, 'DELETE_FIXTURE'); }
    finally { setLoaderState(prev => ({ ...prev, active: false })); }
  }

  async function deleteTrendingFromDB(id) {
    triggerLoader("Deleting Headline...", 50);
    try {
      const { error } = await db.from('trending').delete().eq('id', id);
      if (error) { showDatabaseErrorState('trending', error, 'READ_TRENDING'); return; }
      await loadTrendingFromDB();
      showToast("Headline removed.", false);
    } catch (err) { showDatabaseErrorState('trending', err, 'READ_TRENDING'); }
    finally { setLoaderState(prev => ({ ...prev, active: false })); }
  }

  async function saveAdminEntry() {
    const { section, itemId, formData } = adminModal;
    triggerLoader("Saving record...", 50);
    try {
      const sanitized = verifyHackLocksAndSanitize(formData);
      let error = null;
      if (itemId) {
        const { error: err } = await db.from(section).update(sanitized).eq('id', itemId);
        error = err;
      } else {
        const { error: err } = await db.from(section).insert([sanitized]);
        error = err;
      }

      if (error) {
        showDatabaseErrorState(section, error, itemId ? 'UPDATE' : 'INSERT');
        showToast("Operation failed.");
      } else {
        showToast("Entry saved successfully!", false);
        setAdminModal({ open: false, section: null, itemId: null, formData: {} });
        if (section === 'matches') await loadMatchesFromDB();
        if (section === 'fixtures') await loadFixturesFromDB();
        if (section === 'trending') await loadTrendingFromDB();
      }
    } catch (e) { showToast(e.message || "Validation error."); }
    setLoaderState(prev => ({ ...prev, active: false }));
  }

  // Filter matches
  const filteredMatches = matchesData.filter(m => {
    const isFT = String(m.status || '').toUpperCase() === 'FT';
    const kickoff = parseMatchDateTime(m.match_date, m.match_time);
    const isPastDate = kickoff ? kickoff.getTime() < Date.now() - (120 * 60 * 1000) : false;
    const isPastMatch = isFT || isPastDate;
    const matchesTab = activeMatchTab === 'past' ? isPastMatch : !isPastMatch;

    if (!matchSearchQuery) return matchesTab;
    const q = matchSearchQuery.toLowerCase();
    return matchesTab && (
      String(m.teams || '').toLowerCase().includes(q) ||
      String(m.match_date || '').toLowerCase().includes(q) ||
      String(m.match_time || '').toLowerCase().includes(q) ||
      String(m.league || '').toLowerCase().includes(q)
    );
  });

  const initials = getFirstNameInitials(userProfile.username);
  const isAdmin = userProfile.role === 'admin';

  return (
    <div className={`min-h-screen flex flex-col justify-between selection:bg-mtlGreen selection:text-black ${userProfile.high_contrast ? 'high-contrast-mode' : ''}`} style={{ backgroundColor: '#0b0f19', color: '#f9fafb', fontFamily: "'Inter', sans-serif" }}>
      
      {/* CSS STYLES INJECTION */}
      <style>{`
        body { background-color: #0b0f19; color: #f9fafb; font-family: 'Inter', sans-serif; user-select: none; overflow-x: hidden; }
        .solid-pro-background { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 0; background: radial-gradient(circle at 50% 20%, #111827 0%, #0b0f19 70%, #030712 100%); }
        .app-content-wrapper { position: relative; z-index: 10; }
        .pro-card { background: linear-gradient(135deg, rgba(31, 41, 55, 0.9) 0%, rgba(17, 24, 39, 0.95) 100%); backdrop-filter: blur(12px); border: 1px solid rgba(75, 85, 99, 0.4); border-radius: 1rem; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); }
        .pro-card:hover { border-color: #10b981; transform: translateY(-4px) scale(1.01); box-shadow: 0 14px 30px -5px rgba(0, 0, 0, 0.6), 0 0 16px rgba(16, 185, 129, 0.25); }
        .section-header { border-left: 4px solid #10b981; padding-left: 0.75rem; }
        .btn-see-more { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-weight: 700; padding: 0.6rem 1.4rem; border-radius: 9999px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35); border: 1px solid rgba(255, 255, 255, 0.2); transition: all 0.25s ease; display: inline-flex; align-items: center; gap: 0.5rem; }
        .btn-see-more:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5); filter: brightness(110%); }
        .animate-slide-in { opacity: 0; transform: translateY(30px); animation: slideInKey 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideInKey { to { opacity: 1; transform: translateY(0); } }
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
        .high-contrast-mode { filter: contrast(140%) brightness(110%); }
      `}</style>

      {/* Solid Professional Background */}
      <div className="solid-pro-background"></div>

      <div className="app-content-wrapper flex flex-col min-h-screen justify-between">

        {/* Error Toast Container */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
          {toastList.map(t => (
            <div key={t.id} className={`px-4 py-3 rounded-xl border text-xs font-bold font-cyber shadow-2xl flex items-center gap-2 transform transition-all duration-300 pointer-events-auto ${t.isError ? 'bg-red-950/90 border-red-500/50 text-red-300' : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'}`}>
              <span>{t.isError ? '⚠️' : '✔️'}</span><span>{t.message}</span>
            </div>
          ))}
        </div>

        {/* Floating Prompt Loader */}
        <div className={`floating-loader-overlay ${loaderState.active ? 'active' : ''}`}>
          <div className="loader-card space-y-4">
            <div className="flex items-center justify-center gap-3">
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping"></span>
              <h4 className="text-xs font-bold uppercase tracking-widest text-cyan-400 font-cyber">QUANTUM SYNC</h4>
            </div>
            <p className="text-sm font-medium text-gray-200">{loaderState.text}</p>
            <div className="water-progress-container">
              <div className="water-progress-bar" style={{ width: `${loaderState.progress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Reacted Users Floating Container List */}
        {reactionUsersModal.open && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-emerald-500 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative animate-slide-in">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <h4 className="font-bold text-sm text-emerald-500 font-cyber">{reactionUsersModal.title}</h4>
                <button onClick={() => setReactionUsersModal({ open: false, title: '', users: [] })} className="text-gray-400 hover:text-white font-bold">✕</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                {reactionUsersModal.users.length === 0 ? (
                  <p className="text-gray-500 italic py-2">No users have put this reaction yet.</p>
                ) : (
                  reactionUsersModal.users.map((u, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-950 rounded-lg border border-gray-800">
                      <div className="w-6 h-6 avatar-logo text-[10px] font-bold">{getFirstNameInitials(u.username)}</div>
                      <span className="text-xs font-semibold text-gray-200">{sanitizeInput(u.username)}</span>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => setReactionUsersModal({ open: false, title: '', users: [] })} className="w-full bg-gray-800 border border-gray-700 text-gray-300 py-2 rounded-xl text-xs font-bold hover:text-white">Close</button>
            </div>
          </div>
        )}

        {/* Side Navigation Overlay Menu */}
        {sideNavOpen && <div onClick={() => setSideNavOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"></div>}
        <aside className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-gray-900 border-l border-gray-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col justify-between p-6 shadow-2xl ${sideNavOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 avatar-logo text-sm font-bold">{initials}</div>
                <div>
                  <h3 className="font-extrabold text-sm text-white font-cyber">{userProfile.username}</h3>
                  <span className="text-[10px] text-gray-400">{userProfile.email}</span>
                </div>
              </div>
              <button onClick={() => setSideNavOpen(false)} className="w-8 h-8 rounded-full bg-gray-950 text-gray-400 hover:text-white flex items-center justify-center font-bold">✕</button>
            </div>

            <nav className="space-y-3">
              <a href="/dashboard" className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-black transition text-xs font-bold">
                <span className="text-base">⬅️</span> Back to Dashboard
              </a>
              <button onClick={() => { setDialingModalOpen(true); setSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-emerald-500 hover:text-emerald-500 transition text-xs font-semibold text-gray-200">
                <span className="text-base">📞</span> Contact Centre
              </button>
              <button onClick={() => { setSettingsModalOpen(true); setSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-emerald-500 hover:text-emerald-500 transition text-xs font-semibold text-gray-200">
                <span className="text-base">⚙️</span> Preferences & Settings
              </button>
            </nav>
          </div>

          <div className="pt-6 border-t border-gray-800 space-y-3">
            <button onClick={signOutUser} className="w-full bg-red-950/60 text-red-300 border border-red-500/40 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-red-800 hover:text-white transition flex items-center justify-center gap-2">
              <span>❌</span> Sign Out
            </button>
          </div>
        </aside>

        {/* MAIN APP ROOT */}
        <div id="app-root">
          {/* Header */}
          <header className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a href="/dashboard" title="Back to Dashboard" className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 text-emerald-500 flex items-center justify-center font-bold text-sm hover:bg-emerald-500 hover:text-black transition">⬅️</a>
                <div className="w-10 h-10 avatar-logo text-lg cursor-pointer" onClick={() => setDialingModalOpen(true)}>{initials}</div>
                <div>
                  <h1 className="font-bold tracking-wider text-lg leading-tight font-cyber text-white">PREDICTIONS <span className="text-emerald-500">HUB</span></h1>
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Feel Welcomed.</span>
                </div>
              </div>

              <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
                <a href="/dashboard" className="flex items-center gap-2 text-emerald-500 border-b-2 border-emerald-500 pb-1 font-bold">DASHBOARD</a>
                <a href="#live-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">LIVE</a>
                <a href="#fixtures-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">FIXTURES</a>
                <a href="#db-matches-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">PREDICTIONS</a>
                <a href="#trending-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">COMMUNITY</a>
              </nav>

              <div className="flex items-center gap-3">
                <button onClick={() => setSideNavOpen(true)} title="Open Navigation Options" className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 text-gray-200 flex items-center justify-center hover:text-emerald-500 transition">
                  ☰
                </button>
                <div className="hidden md:flex items-center gap-3 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-full cursor-pointer" onClick={() => setSideNavOpen(true)}>
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
          <section className="relative overflow-hidden py-12 px-6 border-b border-gray-800 bg-gradient-to-b from-gray-900 to-[#0b0f19] animate-slide-in">
            <div className="max-w-7xl mx-auto text-center relative z-10">
              <span className="text-xs uppercase tracking-[0.25em] text-emerald-500 font-bold bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">Sports Analytics Intelligence</span>
              <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight mt-3 uppercase font-cyber text-white">FOOTBALL <span className="text-emerald-500">INTELLIGENCE</span></h2>
              <p className="text-gray-400 text-sm lg:text-base mt-2 max-w-2xl mx-auto font-sans font-medium">Real-time stats, AI match predictions, dynamic hotline dialing and secure encrypted feeds.</p>
            </div>
          </section>

          {/* Database Error Console */}
          {databaseError && (
            <div className="max-w-7xl mx-auto px-6 pt-6">
              <div className="bg-red-950/50 border border-red-500/40 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">⚠</div>
                    <div>
                      <h3 className="font-extrabold text-red-400 text-sm uppercase tracking-wider">DATABASE ERROR</h3>
                      <p className="text-xs text-gray-300 mt-1">{databaseError.title}</p>
                    </div>
                  </div>
                  <button onClick={() => setDatabaseError(null)} className="text-gray-500 hover:text-white">✕</button>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-black/20 border border-red-500/10 rounded-xl p-3">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Diagnostic Reason</span>
                    <p className="text-xs text-red-300 mt-1 font-semibold">{databaseError.diagnosis}</p>
                  </div>
                  <div className="bg-black/20 border border-red-500/10 rounded-xl p-3">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Recommended Fix</span>
                    <p className="text-xs text-gray-300 mt-1">{databaseError.action}</p>
                  </div>
                  <div className="bg-black/20 border border-red-500/10 rounded-xl p-3">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Technical Trace</span>
                    <pre className="text-[10px] text-red-300 mt-1 whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-mono">{databaseError.details}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">

            {/* Live Matches Section */}
            <section id="live-section" className="animate-slide-in">
              <div className="flex items-center justify-between mb-6 section-header">
                <div>
                  <h3 className="font-extrabold text-lg uppercase tracking-wide text-white font-cyber flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> LIVE MATCHES
                  </h3>
                  <span className="text-xs text-gray-400">{liveMatchesData.length} Matches Active</span>
                </div>
                <button onClick={() => setStatsListModal({ open: true, title: 'Live Games Directory', dataset: liveMatchesData })} className="btn-see-more">
                  <span>SEE MORE MATCHES</span> ➔
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {liveMatchesData.length === 0 ? (
                  <div className="col-span-3 text-center py-8 pro-card"><p className="text-xs text-gray-400">No live matches currently in play.</p></div>
                ) : (
                  liveMatchesData.slice(0, 3).map(match => {
                    const teamParts = String(match.teams || '').split(/\s+vs\.?\s+/i);
                    const home = teamParts[0] || 'HOME';
                    const away = teamParts[1] || 'AWAY';
                    return (
                      <div key={match.id} onClick={() => setFullscreenMatchModal({ open: true, matchId: match.id })} className="pro-card p-5 relative overflow-hidden cursor-pointer animate-slide-in">
                        <div className="flex justify-between items-center text-xs text-gray-400 mb-3 font-semibold">
                          <span className="font-cyber hover:text-emerald-500" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Match live summary ${match.teams}`); }}>{sanitizeInput(match.league)}</span>
                          <span className="text-red-500 font-bold animate-pulse">● LIVE</span>
                        </div>
                        <div className="flex items-center justify-between my-4">
                          <div className="text-center flex-1">
                            <div className="w-10 h-10 mx-auto avatar-logo mb-1 font-cyber text-xs">{sanitizeInput(getTeamBadge(home))}</div>
                            <span className="text-xs font-bold tracking-wide text-white">{sanitizeInput(home)}</span>
                          </div>
                          <div className="text-2xl font-extrabold tracking-wider px-2 font-cyber text-emerald-500">- _ -</div>
                          <div className="text-center flex-1">
                            <div className="w-10 h-10 mx-auto avatar-logo mb-1 font-cyber text-xs">{sanitizeInput(getTeamBadge(away))}</div>
                            <span className="text-xs font-bold tracking-wide text-white">{sanitizeInput(away)}</span>
                          </div>
                        </div>
                        <div className="text-center text-xs font-semibold text-emerald-500 mb-2 font-cyber">{sanitizeInput(match.minute)} Minutes</div>
                        <div className="water-progress-container mb-3">
                          <div className="water-progress-bar" style={{ width: `${match.progress}%` }}></div>
                        </div>
                        <div className="text-[11px] text-gray-400 pt-2 border-t border-gray-800 flex justify-between items-center">
                          <span className="truncate">{sanitizeInput(match.details)}</span>
                          {isAdmin && (
                            <div className="flex gap-1 ml-2" onClick={e => e.stopPropagation()}>
                              <button onClick={() => setAdminModal({ open: true, section: 'matches', itemId: match.id, formData: match })} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded hover:bg-amber-500 hover:text-black">Edit</button>
                              <button onClick={() => deleteMatchFromDB(match.id)} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded hover:bg-red-600 hover:text-white">Delete</button>
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
            <section id="db-matches-section" className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-slide-in shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 section-header">
                <div>
                  <h3 className="text-lg font-extrabold uppercase tracking-wide text-white font-cyber cursor-pointer hover:text-emerald-500 transition" onClick={() => openGoogleSearchIframe('Live database matches and football predictions')}>
                    ⚽ MATCHES & PREDICTIONS
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">AI-backed prediction feed.</p>
                </div>
                <button onClick={() => setStatsListModal({ open: true, title: 'All Database Predictions', dataset: matchesData })} className="btn-see-more">
                  <span>SEE MORE</span> ➔
                </button>
              </div>

              {/* Controls Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 border-b border-gray-800 pb-4">
                <div className="flex items-center gap-2 bg-[#0b0f19] p-1.5 rounded-xl border border-gray-800 self-start">
                  <button onClick={() => setActiveMatchTab('future')} className={`px-4 py-1.5 rounded-lg text-xs font-bold font-cyber transition ${activeMatchTab === 'future' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}>
                    UPCOMING MATCHES
                  </button>
                  <button onClick={() => setActiveMatchTab('past')} className={`px-4 py-1.5 rounded-lg text-xs font-bold font-cyber transition ${activeMatchTab === 'past' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}>
                    PAST PREDICTIONS
                  </button>
                </div>

                <div className="relative flex-1 max-w-md">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 text-xs">🔍</span>
                  <input type="text" value={matchSearchQuery} onChange={e => setMatchSearchQuery(e.target.value)} placeholder="Search match by name, date (YYYY-MM-DD), or time..." className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl pl-8 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredMatches.length === 0 ? (
                  <div className="col-span-3 text-center py-10 pro-card"><p className="text-xs text-gray-400">No matches found.</p></div>
                ) : (
                  filteredMatches.slice(0, 3).map(match => {
                    const type = String(match.type || 'free');
                    const typeClass = type.toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                    const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';
                    const oddsText = formatOdds(match.decimal_odds);
                    const comments = matchCommentsStore[match.id] || [];

                    return (
                      <div key={match.id} className="pro-card p-5 flex flex-col justify-between space-y-4 cursor-pointer animate-slide-in">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${typeClass}`}>{sanitizeInput(type)} Match</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-amber-400 font-bold font-cyber">Odds: {sanitizeInput(oddsText)}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{sanitizeInput(match.match_date || '')} {sanitizeInput(match.match_time || '')}</span>
                            </div>
                          </div>
                          <h4 className="font-extrabold text-base text-white tracking-wide font-cyber hover:text-emerald-500" onClick={() => openGoogleSearchIframe(`Prediction summary for ${match.teams}`)}>
                            {sanitizeInput(match.teams || 'Unknown Match')}
                          </h4>
                          <p className="text-xs text-emerald-500 font-semibold">Prediction: {sanitizeInput(match.prediction || 'N/A')} ({stars})</p>
                          <p className="text-xs text-gray-400 line-clamp-2">{sanitizeInput(match.analysis_text || 'Tactical breakdown in detailed view.')}</p>
                        </div>

                        <div className="space-y-1 bg-[#0b0f19] p-3 rounded-xl border border-gray-800">
                          <div className="flex justify-between text-[10px] font-bold text-gray-300">
                            <span>Probability:</span>
                            <span>H: {match.prob_home}% | D: {match.prob_draw}% | A: {match.prob_away}%</span>
                          </div>
                          <div className="water-progress-container">
                            <div className="water-progress-bar" style={{ width: `${match.prob_home}%` }}></div>
                          </div>
                        </div>

                        {/* Reactions bar */}
                        <div className="flex items-center gap-2 pt-1">
                          <button onClick={() => reactToMatch(match.id, 'fire')} className="bg-[#0b0f19] border border-gray-800 px-2.5 py-1 rounded-lg text-xs hover:border-emerald-500 flex items-center gap-1 transition">
                            🔥 <span>{match.reactions?.fire || 0}</span>
                          </button>
                          <button onClick={() => reactToMatch(match.id, 'heart')} className="bg-[#0b0f19] border border-gray-800 px-2.5 py-1 rounded-lg text-xs hover:border-emerald-500 flex items-center gap-1 transition">
                            ❤️ <span>{match.reactions?.heart || 0}</span>
                          </button>
                          <button onClick={() => reactToMatch(match.id, 'dislike')} className="bg-[#0b0f19] border border-gray-800 px-2.5 py-1 rounded-lg text-xs hover:border-emerald-500 flex items-center gap-1 transition">
                            👎 <span>{match.reactions?.dislike || 0}</span>
                          </button>
                        </div>

                        {/* Comments preview */}
                        <div onClick={() => setFullscreenCommentsModal({ open: true, matchId: match.id, teams: match.teams })} className="bg-[#0b0f19] rounded-xl p-3 space-y-2 border border-gray-800 hover:border-emerald-500 transition cursor-pointer">
                          <div className="flex justify-between items-center text-[11px] font-bold text-gray-300">
                            <span>💬 Comments ({comments.length})</span>
                            <span className="text-emerald-500 text-[10px] uppercase font-bold">🖥️ Fullscreen ➔</span>
                          </div>
                          <div className="space-y-1.5 max-h-20 overflow-y-auto text-[11px]">
                            {comments.length === 0 ? <p className="text-gray-500 italic text-[10px]">No comments yet. Click to start discussion.</p> : null}
                            {comments.slice(-2).map((c, i) => (
                              <div key={i} className="bg-gray-800 p-1.5 rounded border border-gray-700 text-gray-300">
                                <span className="font-bold text-emerald-500">{sanitizeInput(c.user)}:</span> {sanitizeInput(c.comment)}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setFullscreenMatchModal({ open: true, matchId: match.id })} className="bg-emerald-500/10 border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-black font-bold px-3 py-1.5 rounded-xl text-xs transition">🔍 Details</button>
                            <button onClick={() => setMatchChatModal({ open: true, matchId: match.id, teams: match.teams })} className="bg-[#0b0f19] border border-gray-800 px-3 py-1.5 rounded-xl text-xs text-gray-200 hover:text-emerald-500 transition flex items-center gap-1">💬 Telegram Chat</button>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => setAdminModal({ open: true, section: 'matches', itemId: match.id, formData: match })} className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-amber-500 hover:text-black transition">Edit</button>
                              <button onClick={() => deleteMatchFromDB(match.id)} className="bg-red-600/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition">Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {isAdmin && (
                <div className="mt-6 pt-4 border-t border-gray-800 flex justify-center">
                  <button onClick={() => setAdminModal({ open: true, section: 'matches', itemId: null, formData: {} })} className="bg-emerald-500 text-black font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider hover:bg-emerald-600 transition flex items-center gap-2">
                    <span>➕</span> ADD PREDICTION
                  </button>
                </div>
              )}
            </section>

            {/* Grid for Fixtures & Trending */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Fixtures Section */}
              <section id="fixtures-section" className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 animate-slide-in shadow-2xl">
                <div>
                  <div className="flex items-center justify-between mb-6 section-header">
                    <div>
                      <h3 className="font-extrabold uppercase tracking-wide text-base text-white font-cyber cursor-pointer hover:text-emerald-500 transition" onClick={() => openGoogleSearchIframe('Upcoming football fixtures schedule')}>
                        📅 UPCOMING FIXTURES
                      </h3>
                      <span className="text-xs text-gray-400">Upcoming schedule</span>
                    </div>
                    <button onClick={() => setStatsListModal({ open: true, title: 'Complete Fixtures Schedule', dataset: fixturesData })} className="btn-see-more text-xs py-2 px-3.5">
                      <span>SEE MORE</span> ➔
                    </button>
                  </div>
                  <div className="space-y-4">
                    {fixturesData.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-500">No upcoming fixtures recorded.</div>
                    ) : (
                      fixturesData.slice(0, 3).map(fix => (
                        <div key={fix.id} className="pro-card p-4 flex items-center justify-between cursor-pointer animate-slide-in">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#0b0f19] border border-gray-800 flex items-center justify-center font-bold text-xs text-emerald-500 font-cyber">{sanitizeInput(fix.badge)}</div>
                            <div>
                              <h4 className="font-bold text-xs text-white hover:text-emerald-500" onClick={() => openGoogleSearchIframe(`Fixture schedule ${fix.teams}`)}>{sanitizeInput(fix.teams || 'Fixture')}</h4>
                              <span className="text-[10px] text-gray-400">{sanitizeInput(fix.league || 'League')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xs font-bold text-emerald-500 block font-cyber">{sanitizeInput(fix.match_time || 'TBD')}</span>
                              <span className="text-[10px] text-gray-500">{sanitizeInput(fix.match_date || 'TBD')}</span>
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1 ml-2">
                                <button onClick={() => setAdminModal({ open: true, section: 'fixtures', itemId: fix.id, formData: fix })} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">Edit</button>
                                <button onClick={() => deleteFixtureFromDB(fix.id)} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white">Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="pt-4 border-t border-gray-800 flex justify-center">
                    <button onClick={() => setAdminModal({ open: true, section: 'fixtures', itemId: null, formData: {} })} className="bg-gray-800 border border-emerald-500 text-emerald-500 font-bold px-5 py-2 rounded-xl text-xs hover:bg-emerald-500 hover:text-black transition flex items-center gap-2">
                      <span>➕</span> ADD FIXTURE
                    </button>
                  </div>
                )}
              </section>

              {/* Trending News Section */}
              <section id="trending-section" className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 animate-slide-in shadow-2xl">
                <div>
                  <div className="flex items-center justify-between mb-6 section-header">
                    <div>
                      <h3 className="font-extrabold uppercase tracking-wide text-base text-white font-cyber cursor-pointer hover:text-emerald-500 transition" onClick={() => openGoogleSearchIframe('Trending football news updates')}>
                        🔥 TRENDING NEWS
                      </h3>
                      <span className="text-xs text-gray-400">What's trending.</span>
                    </div>
                    <button onClick={() => setStatsListModal({ open: true, title: 'All Trending News', dataset: trendingData })} className="btn-see-more text-xs py-2 px-3.5">
                      <span>SEE MORE</span> ➔
                    </button>
                  </div>
                  <div className="space-y-4">
                    {trendingData.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-500">No trending headlines.</div>
                    ) : (
                      trendingData.slice(0, 3).map(item => (
                        <div key={item.id} className="pro-card p-4 flex items-center justify-between cursor-pointer animate-slide-in">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-extrabold text-emerald-500 font-cyber">#{sanitizeInput(item.rank)}</span>
                            <div>
                              <h4 className="font-bold text-xs text-white hover:text-emerald-500" onClick={() => openGoogleSearchIframe(item.title)}>{sanitizeInput(item.title)}</h4>
                              <span className="text-[10px] text-gray-500">💬 {Number(item.comments_count) || 6237} discussions</span>
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <button onClick={() => setAdminModal({ open: true, section: 'trending', itemId: item.id, formData: item })} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">Edit</button>
                              <button onClick={() => deleteTrendingFromDB(item.id)} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white">Delete</button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="pt-4 border-t border-gray-800 flex justify-center">
                    <button onClick={() => setAdminModal({ open: true, section: 'trending', itemId: null, formData: {} })} className="bg-gray-800 border border-emerald-500 text-emerald-500 font-bold px-5 py-2 rounded-xl text-xs hover:bg-emerald-500 hover:text-black transition flex items-center gap-2">
                      <span>➕</span> ADD NEWS
                    </button>
                  </div>
                )}
              </section>

            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-gray-800 bg-gray-900 mt-16 py-8 px-6 text-center text-xs text-gray-400">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <p>© 2026 MTL Football Intelligence Hub. All rights reserved.</p>
              <div className="flex items-center gap-6">
                <a href="/dashboard" className="text-emerald-500 font-bold hover:underline">Dashboard</a>
                <a href="#" className="hover:text-emerald-500">Privacy Policy</a>
                <a href="#" className="hover:text-emerald-500">Terms of Service</a>
                <a href="#" onClick={() => setDialingModalOpen(true)} className="hover:text-emerald-500">Developed BY M. Lennox</a>
              </div>
            </div>
          </footer>
        </div>

        {/* MODALS */}

        {/* Google Iframe Modal */}
        {googleModal.open && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col p-3 sm:p-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-black font-extrabold flex items-center justify-center font-cyber">AI</div>
                <div>
                  <h4 className="text-xs font-bold font-cyber text-emerald-500">GOOGLE QUICK SEARCH</h4>
                  <p className="text-[10px] text-gray-400 font-mono">{googleModal.query}</p>
                </div>
              </div>
              <button onClick={() => setGoogleModal({ open: false, query: '', url: 'about:blank' })} className="w-8 h-8 rounded-full bg-red-900/40 text-red-300 border border-red-500/30 flex items-center justify-center font-bold text-xs hover:bg-red-800">✕</button>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-gray-800 bg-white">
              <iframe className="w-full h-full border-0" src={googleModal.url} title="Google Search AI"></iframe>
            </div>
          </div>
        )}

        {/* Global Telegram Chat Drawer */}
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={() => setChatDrawerOpen(!chatDrawerOpen)} className="w-14 h-14 rounded-full bg-emerald-500 text-black flex items-center justify-center text-2xl font-bold shadow-lg hover:scale-105 transition transform">💬</button>
          {chatDrawerOpen && (
            <div className="absolute bottom-20 right-0 w-80 sm:w-96 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col h-[480px] overflow-hidden">
              <div className="bg-[#0b0f19] p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h4 className="font-bold text-sm tracking-wide font-cyber text-white">Community Chat</h4>
                </div>
                <button onClick={() => setChatDrawerOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
                {globalChatMessages.length === 0 ? (
                  <div className="text-center text-gray-500 text-xs py-8">Welcome to Telegram global chat!</div>
                ) : (
                  globalChatMessages.map((msg, i) => {
                    const isMe = currentUser && msg.user_id === currentUser.id;
                    return (
                      <div key={i} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div className="text-[9px] text-gray-400 mb-0.5 px-1">{sanitizeInput(msg.user)} • {sanitizeInput(msg.time)}</div>
                        <div className={`px-3.5 py-2 text-xs ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>{sanitizeInput(msg.text)}</div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-3 border-t border-gray-800 bg-[#0b0f19] flex gap-2">
                <input type="text" value={globalChatInput} onChange={e => setGlobalChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendGlobalChatMessage()} placeholder="Type Telegram message..." className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
                <button onClick={sendGlobalChatMessage} className="bg-emerald-500 text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-600 transition">Send</button>
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Comments Modal */}
        {fullscreenCommentsModal.open && (
          <div className="fixed inset-0 bg-[#0b0f19]/95 backdrop-blur-xl z-50 p-4 md:p-10 overflow-y-auto flex flex-col justify-between">
            <div className="max-w-4xl w-full mx-auto bg-gray-900 border border-emerald-500/40 rounded-3xl p-6 md:p-8 shadow-2xl relative flex-1 flex flex-col justify-between space-y-6">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-500 flex items-center justify-center font-bold text-lg font-cyber">💬</div>
                  <div>
                    <h3 className="text-lg md:text-xl font-extrabold text-white font-cyber">Comments Stream: {fullscreenCommentsModal.teams}</h3>
                    <p className="text-xs text-emerald-500">Leave a comment.</p>
                  </div>
                </div>
                <button onClick={() => setFullscreenCommentsModal({ open: false, matchId: null, teams: '' })} className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[60vh]">
                {(!matchCommentsStore[fullscreenCommentsModal.matchId] || matchCommentsStore[fullscreenCommentsModal.matchId].length === 0) ? (
                  <div className="text-center text-gray-500 py-12 text-xs font-medium">No comments posted for this match yet. Be the first to share analysis!</div>
                ) : (
                  matchCommentsStore[fullscreenCommentsModal.matchId].map((c, i) => (
                    <div key={i} className="bg-gray-800 border border-gray-700 p-4 rounded-2xl space-y-2 flex gap-3 items-start">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-xs font-cyber flex-shrink-0">{getFirstNameInitials(c.user)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-emerald-500 font-cyber">{sanitizeInput(c.user)}</span>
                          <span className="text-[10px] text-gray-500">{sanitizeInput(c.time)}</span>
                        </div>
                        <p className="text-xs text-gray-200 mt-1 leading-relaxed">{sanitizeInput(c.comment)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="bg-[#0b0f19] p-4 rounded-2xl border border-gray-800 space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Post Public Comment</h4>
                <div className="flex gap-3">
                  <textarea rows="2" value={fullscreenCommentInput} onChange={e => setFullscreenCommentInput(e.target.value)} placeholder="Write detailed comment to be recorded in database..." className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"></textarea>
                  <button onClick={submitFullscreenComment} className="bg-emerald-500 text-black font-extrabold px-6 py-2 rounded-xl text-xs hover:bg-emerald-600 transition self-end">Post Comment</button>
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-gray-800">
                <button onClick={() => setFullscreenCommentsModal({ open: false, matchId: null, teams: '' })} className="btn-see-more">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* See More Directory Modal */}
        {statsListModal.open && (
          <div className="fixed inset-0 bg-[#0b0f19]/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">
            <div className="max-w-5xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">
              <button onClick={() => setStatsListModal({ open: false, title: '', dataset: [] })} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              <div className="space-y-6">
                <div className="border-b border-gray-800 pb-4 section-header">
                  <h3 className="text-2xl font-extrabold text-emerald-500 uppercase tracking-wider font-cyber">{statsListModal.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">Dataset display.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[65vh] overflow-y-auto pr-2">
                  {statsListModal.dataset.length === 0 ? (
                    <div className="col-span-3 text-center py-12 text-xs text-gray-500">No records registered.</div>
                  ) : (
                    statsListModal.dataset.map((item, idx) => (
                      <div key={idx} className="pro-card p-4 space-y-2">
                        <h4 className="font-bold text-white text-sm font-cyber">{sanitizeInput(item.teams || item.title || 'Item')}</h4>
                        <p className="text-xs text-gray-400">{sanitizeInput(item.league || item.prediction || '')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-800 flex justify-end">
                <button onClick={() => setStatsListModal({ open: false, title: '', dataset: [] })} className="btn-see-more">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Match Details Modal */}
        {fullscreenMatchModal.open && (() => {
          const match = matchesData.find(m => String(m.id) === String(fullscreenMatchModal.matchId)) || liveMatchesData.find(m => String(m.id) === String(fullscreenMatchModal.matchId));
          if (!match) return null;
          const type = String(match.type || 'free');
          const typeClass = type.toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';
          return (
            <div className="fixed inset-0 bg-[#0b0f19]/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">
              <div className="max-w-5xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">
                <button onClick={() => setFullscreenMatchModal({ open: false, matchId: null })} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
                <div className="space-y-8">
                  <div className="flex justify-between items-start border-b border-gray-800 pb-6 section-header">
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${typeClass}`}>{sanitizeInput(type)} INTEL</span>
                      <h2 className="text-3xl lg:text-4xl font-extrabold text-white mt-2 font-cyber hover:text-emerald-500 cursor-pointer" onClick={() => openGoogleSearchIframe(`Live analysis ${match.teams}`)}>{sanitizeInput(match.teams || 'Unknown Match')}</h2>
                      <p className="text-xs text-gray-400 mt-1 font-mono">Date: {sanitizeInput(match.match_date || '')} | Kickoff: {sanitizeInput(match.match_time || '')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400 uppercase tracking-widest block font-cyber">Confidence</span>
                      <span className="text-2xl">{stars}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#0b0f19] p-5 rounded-2xl border border-gray-800 space-y-2">
                      <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider font-cyber">Prediction</span>
                      <p className="text-xl font-extrabold text-white font-cyber">{sanitizeInput(match.prediction || 'N/A')}</p>
                    </div>
                    <div className="bg-[#0b0f19] p-5 rounded-2xl border border-gray-800 space-y-2">
                      <span className="text-xs text-amber-400 font-bold uppercase tracking-wider font-cyber">Decimal Odds</span>
                      <p className="text-xl font-extrabold text-white font-cyber">{formatOdds(match.decimal_odds)}</p>
                    </div>
                    <div className="bg-[#0b0f19] p-5 rounded-2xl border border-gray-800 space-y-2">
                      <span className="text-xs text-blue-400 font-bold uppercase tracking-wider font-cyber">Status & Score</span>
                      <p className="text-xl font-extrabold text-white font-cyber">{sanitizeInput(match.status || 'PENDING')} ({sanitizeInput(match.final_score || 'Awaiting')})</p>
                    </div>
                  </div>
                  <div className="bg-[#0b0f19] p-6 rounded-2xl border border-gray-800 space-y-3">
                    <h4 className="font-extrabold text-sm uppercase tracking-wider text-emerald-500 font-cyber">Tactical Intelligence & Match Analysis</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">{sanitizeInput(match.analysis_text || 'No tactical analysis available.')}</p>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-800 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setMatchChatModal({ open: true, matchId: match.id, teams: match.teams })} className="bg-gray-800 border border-gray-700 text-gray-200 px-4 py-2 rounded-xl text-xs hover:text-emerald-500 flex items-center gap-2">💬 Open Chat</button>
                    <button onClick={() => setDialingModalOpen(true)} className="bg-emerald-500/10 border border-emerald-500 text-emerald-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:text-black transition">📞 Call</button>
                  </div>
                  <button onClick={() => setFullscreenMatchModal({ open: false, matchId: null })} className="btn-see-more">Close</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Match Chat Modal */}
        {matchChatModal.open && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="bg-[#0b0f19] p-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-emerald-500 font-cyber">Telegram Match Thread: {matchChatModal.teams}</h4>
                  <p className="text-[10px] text-gray-400">Match discussion Group</p>
                </div>
                <button onClick={() => setMatchChatModal({ open: false, matchId: null, teams: '' })} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
                {(!matchChatStore[matchChatModal.matchId] || matchChatStore[matchChatModal.matchId].length === 0) ? (
                  <div className="text-center text-gray-500 text-xs py-8">No messages in this match chat thread yet.</div>
                ) : (
                  matchChatStore[matchChatModal.matchId].map((msg, i) => {
                    const isMe = currentUser && msg.user_id === currentUser.id;
                    return (
                      <div key={i} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div className="text-[9px] text-gray-400 mb-0.5 px-1">{sanitizeInput(msg.user)} • {sanitizeInput(msg.time)}</div>
                        <div className={`px-3.5 py-2 text-xs ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>{sanitizeInput(msg.text)}</div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-3 border-t border-gray-800 bg-[#0b0f19] flex gap-2">
                <input type="text" value={matchChatInput} onChange={e => setMatchChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMatchChatMessage()} placeholder="Discuss this match..." className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
                <button onClick={sendMatchChatMessage} className="bg-emerald-500 text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-600 transition">Post</button>
              </div>
            </div>
          </div>
        )}

        {/* Hotline Modal */}
        {dialingModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl p-6 md:p-8 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-500 flex items-center justify-center text-xl">📞</div>
                  <div>
                    <h3 className="text-lg font-bold font-cyber text-white">Live Call Centre</h3>
                    <p className="text-xs text-gray-400">Direct call support +254716883895</p>
                  </div>
                </div>
                <button onClick={() => setDialingModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0b0f19] p-4 rounded-xl border border-gray-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-500 tracking-wider">WHATSAPP</span>
                    <h4 className="font-bold text-sm text-white mt-1">Chat on WhatsApp</h4>
                    <p className="text-xs text-gray-400">Message us directly on WhatsApp.</p>
                  </div>
                  <a href="https://wa.me/254716883895" target="_blank" rel="noreferrer" className="w-full bg-emerald-500 text-black text-center text-xs font-bold py-2.5 rounded-xl hover:bg-emerald-600 transition mt-3 block">💬 WhatsApp +254716883895</a>
                </div>
                <div className="bg-[#0b0f19] p-4 rounded-xl border border-gray-800 space-y-2 flex flex-col justify-between">
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

        {/* Admin Modal */}
        {adminModal.open && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl p-8 space-y-6 shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-emerald-500 uppercase tracking-wider font-cyber">Admin Content Management</h3>
                  <p className="text-xs text-gray-400">Insert or update Record [{adminModal.section}]</p>
                </div>
                <button onClick={() => setAdminModal({ open: false, section: null, itemId: null, formData: {} })} className="text-gray-400 hover:text-white font-bold text-xl">✕</button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {Object.keys(adminModal.formData).map((key) => {
                  if (['id', 'created_at', 'reactions'].includes(key)) return null;
                  return (
                    <div key={key} className="space-y-1">
                      <label className="text-xs text-gray-400 uppercase font-bold">{key}</label>
                      <input
                        type="text"
                        value={adminModal.formData[key] ?? ''}
                        onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, [key]: e.target.value } })}
                        className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end gap-4 border-t border-gray-800 pt-4">
                <button onClick={() => setAdminModal({ open: false, section: null, itemId: null, formData: {} })} className="px-5 py-2.5 rounded-xl text-xs bg-gray-800 text-gray-300 hover:bg-gray-700">Cancel</button>
                <button onClick={saveAdminEntry} className="px-6 py-2.5 rounded-xl text-xs bg-emerald-500 text-black font-extrabold hover:bg-emerald-600 transition">Save Entry</button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {settingsModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <h3 className="text-base font-bold text-emerald-500 uppercase tracking-wider font-cyber">User Preferences</h3>
                <button onClick={() => setSettingsModalOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
              </div>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">ODDS FORMAT</label>
                  <select value={userProfile.odds_format} onChange={e => setUserProfile({ ...userProfile, odds_format: e.target.value })} className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-2.5 text-white">
                    <option value="decimal">Decimal (2.00)</option>
                    <option value="fractional">Fractional (1/1)</option>
                    <option value="american">American (+100)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">LANGUAGE</label>
                  <select value={userProfile.language} onChange={e => setUserProfile({ ...userProfile, language: e.target.value })} className="w-full bg-[#0b0f19] border border-gray-800 rounded-xl p-2.5 text-white">
                    <option value="en">English (EN)</option>
                    <option value="sw">Swahili (SW)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-300">CONTRAST MODE</span>
                  <input type="checkbox" checked={userProfile.high_contrast} onChange={e => setUserProfile({ ...userProfile, high_contrast: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
                </div>
              </div>
              <button onClick={() => setSettingsModalOpen(false)} className="w-full bg-emerald-500 text-black font-bold py-2 rounded-xl">Save & Close</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
