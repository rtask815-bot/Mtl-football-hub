import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION & SUPABASE INITIALIZATION ---
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInRmIjoibWZjZ2J3ZnJhbGlreXF4enhsamQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4MzU1NDA0NSwiZXhwIjoyMDk5MTMwMDQ1fQ.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- UTILITY FUNCTIONS ---
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
          throw new Error("Security Violation: Malicious payload detected by Security Hack Lock!");
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

function parseMatchDateTime(dateValue, timeValue) {
  try {
    let dateText = String(dateValue).trim();
    let timeText = String(timeValue).trim().replace(/(\.\d+)?$/, '');
    if (/^\d{2}:\d{2}$/.test(timeText)) timeText += ':00';
    const parsed = new Date(`${dateText}T${timeText}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch { return null; }
}

function getTeamBadge(teams) {
  if (!teams) return '⚽';
  const firstTeam = String(teams).split(/\s+vs\.?\s+/i)[0].trim();
  const words = firstTeam.split(/\s+/).filter(Boolean);
  return words.length >= 2 ? (words[0].charAt(0) + words[1].charAt(0)).toUpperCase() : firstTeam.substring(0, 3).toUpperCase();
}

export default function MatchHubApp() {
  // --- STATES ---
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState({
    role: 'user',
    username: 'not Signed in',
    email: '',
    odds_format: 'decimal',
    language: 'en',
    high_contrast: false
  });

  const [toasts, setToasts] = useState([]);
  const [loader, setLoader] = useState({ active: true, text: 'initializing secure intelligence core...', progress: 25 });
  const [dbError, setDbError] = useState(null);

  // Data Stores
  const [matchesData, setMatchesData] = useState([]);
  const [fixturesData, setFixturesData] = useState([]);
  const [trendingData, setTrendingData] = useState([]);
  const [liveMatchesData, setLiveMatchesData] = useState([]);
  const [matchCommentsStore, setMatchCommentsStore] = useState({});
  const [globalChatMessages, setGlobalChatMessages] = useState([]);
  const [matchChatStore, setMatchChatStore] = useState({});
  const [matchReactionsMap, setMatchReactionsMap] = useState({});

  // UI Navigation & Tab Control
  const [activeMatchTab, setActiveMatchTab] = useState('future');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);

  // Modals Management
  const [reactionUsersModal, setReactionUsersModal] = useState({ open: false, type: '', list: [] });
  const [googleIframeModal, setGoogleIframeModal] = useState({ open: false, query: '', src: 'about:blank' });
  const [dialingModal, setDialingModal] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [fullscreenMatchModal, setFullscreenMatchModal] = useState({ open: false, matchId: null });
  const [commentsModal, setCommentsModal] = useState({ open: false, matchId: null, teams: '' });
  const [matchChatModal, setMatchChatModal] = useState({ open: false, matchId: null, teams: '' });
  const [statsListModal, setStatsListModal] = useState({ open: false, title: '', dataset: [] });
  const [adminModal, setAdminModal] = useState({ open: false, section: '', item: null });

  // Inputs
  const [fullscreenCommentInput, setFullscreenCommentInput] = useState('');
  const [globalChatInput, setGlobalChatInput] = useState('');
  const [matchChatInput, setMatchChatInput] = useState('');
  const [adminFormData, setAdminFormData] = useState({});

  const canvasRef = useRef(null);

  // --- TOAST NOTIFICATION ---
  const showToast = useCallback((message, isError = true) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const showDatabaseError = useCallback((table, error, operation = 'READ') => {
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
      operation,
      table,
      diagnosis,
      action,
      details: JSON.stringify(error, null, 2)
    });
  }, []);

  // --- LONG PRESS HANDLER UTILITY ---
  const useLongPress = (callback, ms = 850) => {
    const timerRef = useRef(null);
    const isLongPress = useRef(false);

    const start = useCallback((e) => {
      e.stopPropagation();
      isLongPress.current = false;
      timerRef.current = setTimeout(() => {
        isLongPress.current = true;
        callback(e);
      }, ms);
    }, [callback, ms]);

    const stop = useCallback((e) => {
      e.stopPropagation();
      clearTimeout(timerRef.current);
    }, []);

    return {
      onMouseDown: start,
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchStart: start,
      onTouchEnd: stop,
      isLongPress
    };
  };

  // --- NATIVE 4D BACKGROUND ENGINE ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let mouseX = 0, mouseY = 0;
    const handleMouseMove = (e) => {
      mouseX = (e.clientX / width - 0.5) * 2;
      mouseY = (e.clientY / height - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const particleCount = 120;
    const particles = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * width * 1.5,
      y: (Math.random() - 0.5) * height * 1.5,
      z: Math.random() * 1000 + 1,
      size: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.5 ? '#10b981' : '#00f0ff'
    }));

    const vertices4D = [];
    for (let i = 0; i < 16; i++) {
      vertices4D.push([
        (i & 1) ? 1 : -1,
        (i & 2) ? 1 : -1,
        (i & 4) ? 1 : -1,
        (i & 8) ? 1 : -1
      ]);
    }

    let angleXY = 0, angleZW = 0, animId;

    const project4Dto2D = (point, aXY, aZW) => {
      let [x, y, z, w] = point;
      let cosXY = Math.cos(aXY), sinXY = Math.sin(aXY);
      let x1 = x * cosXY - y * sinXY;
      let y1 = x * sinXY + y * cosXY;
      let cosZW = Math.cos(aZW), sinZW = Math.sin(aZW);
      let z1 = z * cosZW - w * sinZW;
      let w1 = z * sinZW + w * cosZW;
      let wScale = 1 / (3 - w1);
      let zScale = 1 / (2.5 - z1 * wScale);
      let scaleFactor = Math.min(width, height) * 0.35;

      return {
        x: width / 2 + (x1 * wScale * zScale) * scaleFactor + mouseX * 30,
        y: height / 2 + (y1 * wScale * zScale) * scaleFactor + mouseY * 30
      };
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particleCount; i++) {
        let p = particles[i];
        p.z -= 0.8;
        if (p.z <= 0) p.z = 1000;
        let px = (p.x / p.z) * 400 + width / 2 + mouseX * 20;
        let py = (p.y / p.z) * 400 + height / 2 + mouseY * 20;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = (1 - p.z / 1000) * 0.6;
        ctx.beginPath();
        ctx.arc(px, py, p.size * (1000 / p.z) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      angleXY += 0.008 + mouseY * 0.005;
      angleZW += 0.012 + mouseX * 0.005;
      const projected = vertices4D.map(v => project4Dto2D(v, angleXY, angleZW));

      ctx.lineWidth = 1.2;
      for (let i = 0; i < 16; i++) {
        for (let j = i + 1; j < 16; j++) {
          let diff = 0;
          for (let k = 0; k < 4; k++) if (vertices4D[i][k] !== vertices4D[j][k]) diff++;
          if (diff === 1) {
            let p1 = projected[i], p2 = projected[j];
            let gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            gradient.addColorStop(0, '#10b981');
            gradient.addColorStop(1, '#00f0ff');
            ctx.strokeStyle = gradient;
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  // --- DATA FETCHING & REALTIME ---
  const normalizeMatch = useCallback((match) => {
    const parsedOdds = parseFloat(match.decimal_odds);
    const parsedHome = parseFloat(match.prob_home);
    const parsedDraw = parseFloat(match.prob_draw);
    const parsedAway = parseFloat(match.prob_away);
    const parsedStars = parseInt(match.confidence_stars, 10);
    const mId = String(match.id);
    const userReactions = matchReactionsMap[mId] || [];
    const computed = {
      fire: userReactions.filter(r => r.reaction === 'fire').length,
      heart: userReactions.filter(r => r.reaction === 'heart').length,
      dislike: userReactions.filter(r => r.reaction === 'dislike').length
    };
    const fallback = match.reactions && typeof match.reactions === 'object' ? match.reactions : { fire: 0, heart: 0, dislike: 0 };

    return {
      ...match,
      decimal_odds: Number.isFinite(parsedOdds) ? parsedOdds : null,
      prob_home: Number.isFinite(parsedHome) ? Math.max(0, Math.min(100, parsedHome)) : 0,
      prob_draw: Number.isFinite(parsedDraw) ? Math.max(0, Math.min(100, parsedDraw)) : 0,
      prob_away: Number.isFinite(parsedAway) ? Math.max(0, Math.min(100, parsedAway)) : 0,
      confidence_stars: Number.isFinite(parsedStars) ? Math.max(0, Math.min(5, parsedStars)) : 0,
      reactions: {
        fire: Math.max(computed.fire, Number(fallback.fire) || 0),
        heart: Math.max(computed.heart, Number(fallback.heart) || 0),
        dislike: Math.max(computed.dislike, Number(fallback.dislike) || 0)
      }
    };
  }, [matchReactionsMap]);

  const loadMatchesFromDB = useCallback(async () => {
    try {
      const { data, error } = await db.from('matches').select('*').order('created_at', { ascending: false });
      if (error) { showDatabaseError('matches', error, 'READ_MATCHES'); return; }
      setMatchesData(Array.isArray(data) ? data.map(normalizeMatch) : []);
    } catch (error) { showDatabaseError('matches', error, 'READ_MATCHES'); }
  }, [normalizeMatch, showDatabaseError]);

  const loadFixturesFromDB = useCallback(async () => {
    try {
      const { data, error } = await db.from('fixtures').select('*').order('match_date', { ascending: true });
      if (error) { showDatabaseError('fixtures', error, 'READ_FIXTURES'); return; }
      setFixturesData(Array.isArray(data) ? data.map(f => ({
        ...f,
        match_date: f.match_date ?? f.date ?? '',
        match_time: f.match_time ?? f.time ?? '',
        badge: f.badge || getTeamBadge(f.teams)
      })) : []);
    } catch (error) { showDatabaseError('fixtures', error, 'READ_FIXTURES'); }
  }, [showDatabaseError]);

  const loadTrendingFromDB = useCallback(async () => {
    try {
      const { data, error } = await db.from('trending').select('*').order('rank', { ascending: true });
      if (error) { showDatabaseError('trending', error, 'READ_TRENDING'); return; }
      setTrendingData(Array.isArray(data) ? data.map(t => ({
        ...t,
        rank: t.rank ?? '',
        title: t.title ?? '',
        comments_count: t.comments_count ?? t.comments ?? 0
      })) : []);
    } catch (error) { showDatabaseError('trending', error, 'READ_TRENDING'); }
  }, [showDatabaseError]);

  const loadDatabaseComments = useCallback(async () => {
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
  }, [showDatabaseError]);

  const loadDatabaseChats = useCallback(async () => {
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
          if (!msg.match_id) globalMsgs.push(parsed);
          else {
            const mId = String(msg.match_id);
            if (!matchStore[mId]) matchStore[mId] = [];
            matchStore[mId].push(parsed);
          }
        });
        setGlobalChatMessages(globalMsgs);
        setMatchChatStore(matchStore);
      }
    } catch (err) { showDatabaseError('chats', err, 'READ_CHATS'); }
  }, [showDatabaseError]);

  const loadDatabaseReactions = useCallback(async () => {
    try {
      const { data, error } = await db.from('reactions').select('*');
      if (error) { showDatabaseError('reactions', error, 'READ_REACTIONS'); return; }
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
    } catch (e) { showDatabaseError('reactions', e, 'READ_REACTIONS'); }
  }, [showDatabaseError]);

  // Check Authentication Session via Supabase Session Methods & Initialize App
  useEffect(() => {
    const fetchUserData = async (sessionUser) => {
      if (!sessionUser) {
        window.location.href = "auth.html";
        return;
      }

      setCurrentUser(sessionUser);

      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('username, name, email, role, is_admin, admin')
        .eq('id', sessionUser.id)
        .single();

      if (profileError) showDatabaseError('profiles', profileError, 'READ_PROFILE');

      const dbName = profile?.name || profile?.username;
      const username = dbName || sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User';
      const email = profile?.email || sessionUser.email || 'user@mtl.com';
      const isUserAdmin = profile?.role === 'admin' || profile?.is_admin === true || profile?.admin === true;

      setUserProfile(prev => ({
        ...prev,
        username,
        email,
        role: isUserAdmin ? 'admin' : 'user'
      }));

      setLoader({ text: "fetching neural feeds...", progress: 40 });
      await loadDatabaseReactions();
      await Promise.all([
        loadMatchesFromDB(),
        loadFixturesFromDB(),
        loadTrendingFromDB(),
        loadDatabaseComments(),
        loadDatabaseChats()
      ]);

      setLoader({ text: "sync complete", progress: 100 });
      setTimeout(() => setLoader(prev => ({ ...prev, active: false })), 300);
    };

    const initAuthSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await db.auth.getSession();
        if (sessionError || !session?.user) {
          window.location.href = "auth.html";
          return;
        }

        await fetchUserData(session.user);
      } catch (err) {
        showDatabaseError('auth.session', err, 'SESSION_EXCEPTION');
      }
    };

    initAuthSession();

    const { data: { subscription } } = db.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        window.location.href = "auth.html";
      } else if (session?.user) {
        await fetchUserData(session.user);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadDatabaseChats, loadDatabaseComments, loadDatabaseReactions, loadFixturesFromDB, loadMatchesFromDB, loadTrendingFromDB, showDatabaseError]);

  // Set Up Realtime Subscriptions
  useEffect(() => {
    const chatSub = db.channel('public:chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => loadDatabaseChats())
      .subscribe();

    const commentSub = db.channel('public:comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => loadDatabaseComments())
      .subscribe();

    const reactionSub = db.channel('public:reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, async () => {
        await loadDatabaseReactions();
        await loadMatchesFromDB();
      })
      .subscribe();

    return () => {
      db.removeChannel(chatSub);
      db.removeChannel(commentSub);
      db.removeChannel(reactionSub);
    };
  }, [loadDatabaseChats, loadDatabaseComments, loadDatabaseReactions, loadMatchesFromDB]);

  // Compute Live Matches Progress
  useEffect(() => {
    const updateLive = () => {
      const now = new Date();
      const live = matchesData.filter(m => {
        if (!m) return false;
        const status = String(m.status || '').trim().toUpperCase();
        if (['LIVE', 'IN_PLAY', 'IN-PLAY', 'PLAYING'].includes(status)) return true;
        if (['FT', 'FINISHED', 'FULL TIME', 'COMPLETED', 'POSTPONED', 'CANCELLED'].includes(status)) return false;
        if (!m.match_date || !m.match_time) return false;
        const kickoff = parseMatchDateTime(m.match_date, m.match_time);
        if (!kickoff) return false;
        const diff = now.getTime() - kickoff.getTime();
        return diff >= 0 && diff <= 120 * 60 * 1000;
      }).map(m => {
        let minuteStr = "LIVE";
        const status = String(m.status || '').toUpperCase();
        if (status === 'LIVE' && m.minute !== undefined && m.minute !== null) {
          minuteStr = `${Math.min(parseInt(m.minute, 10) || 0, 92)}'`;
        } else {
          const kickoff = parseMatchDateTime(m.match_date, m.match_time);
          if (kickoff) {
            const elapsed = Math.floor((Date.now() - kickoff.getTime()) / 60000);
            minuteStr = `${Math.min(Math.max(1, elapsed), 92)}'`;
          }
        }
        const minuteVal = parseInt(minuteStr, 10) || 0;

        return {
          ...m,
          league: m.league || m.competition || 'FOOTBALL',
          teams: m.teams || 'Unknown Teams',
          score: m.score || m.final_score || '0 - 0',
          minute: minuteStr,
          progress: Math.min(Math.round((minuteVal / 90) * 100), 100),
          details: m.live_details || m.details || m.analysis_text || 'Live match intelligence available.'
        };
      });
      setLiveMatchesData(live);
    };

    updateLive();
    const interval = setInterval(updateLive, 1000);
    return () => clearInterval(interval);
  }, [matchesData]);

  // --- INTERACTION HANDLERS ---
  const handleSignOut = async () => {
    await db.auth.signOut();
    window.location.href = "auth.html";
  };

  const openGoogleSearchIframe = (queryText) => {
    const aiQuery = encodeURIComponent(queryText);
    setGoogleIframeModal({
      open: true,
      query: queryText,
      src: `https://www.google.com/search?q=${aiQuery}&udm=14&udm=28&igu=1`
    });
  };

  const closeGoogleIframeModal = () => {
    setGoogleIframeModal({ open: false, query: '', src: 'about:blank' });
  };

  const openReactionUsersModal = (matchId, type) => {
    const list = (matchReactionsMap[String(matchId)] || []).filter(r => r.reaction === type);
    setReactionUsersModal({ open: true, type, list });
  };

  const handleReactToMatch = async (matchId, type) => {
    const mId = String(matchId);
    const userId = currentUser?.id || 'guest';
    const userReactions = matchReactionsMap[mId] || [];
    const userPrevReaction = userReactions.find(r => r.user_id === userId);

    let updatedMatches = [...matchesData];
    const matchIndex = updatedMatches.findIndex(m => String(m.id) === mId);
    if (matchIndex === -1) return;

    const match = { ...updatedMatches[matchIndex] };
    if (!match.reactions) match.reactions = { fire: 0, heart: 0, dislike: 0 };

    if (userPrevReaction) {
      if (userPrevReaction.reaction === type) {
        match.reactions[type] = Math.max(0, Number(match.reactions[type] || 0) - 1);
        try { await db.from('reactions').delete().eq('match_id', matchId).eq('user_id', userId); } catch (e) {}
      } else {
        const oldType = userPrevReaction.reaction;
        match.reactions[oldType] = Math.max(0, Number(match.reactions[oldType] || 0) - 1);
        match.reactions[type] = Number(match.reactions[type] || 0) + 1;
        try {
          await db.from('reactions').upsert([{ match_id: matchId, user_id: userId, username: userProfile.username, reaction_type: type }], { onConflict: 'match_id,user_id' });
        } catch (e) {}
      }
    } else {
      match.reactions[type] = Number(match.reactions[type] || 0) + 1;
      try {
        await db.from('reactions').insert([{ match_id: matchId, user_id: userId, username: userProfile.username, reaction_type: type }]);
      } catch (e) {}
    }

    updatedMatches[matchIndex] = match;
    setMatchesData(updatedMatches);
    await loadDatabaseReactions();
    try { await db.from('matches').update({ reactions: match.reactions }).eq('id', matchId); } catch (err) {}
  };

  // Comments Operations
  const submitFullscreenComment = async () => {
    if (!fullscreenCommentInput.trim() || !commentsModal.matchId) {
      showToast("Please enter a non-empty comment.");
      return;
    }
    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({
        match_id: commentsModal.matchId,
        username: userProfile.username,
        comment: fullscreenCommentInput.trim(),
        user_id: currentUser?.id
      });

      setLoader({ active: true, text: "Posting comment to database...", progress: 50 });
      const { error } = await db.from('comments').insert([sanitizedPayload]);
      if (error) {
        showDatabaseError('comments', error, 'INSERT_COMMENT');
        showToast("Failed to save comment.");
      } else {
        await loadDatabaseComments();
        showToast("Comment published successfully!", false);
        setFullscreenCommentInput('');
      }
    } catch (err) {
      showToast(err.message || "Error occurred while posting comment.");
    } finally {
      setLoader(prev => ({ ...prev, active: false }));
    }
  };

  const handleEditComment = async (commentId) => {
    const comments = matchCommentsStore[commentsModal.matchId] || [];
    const comment = comments.find(c => String(c.id) === String(commentId));
    if (!comment) return;

    const newText = prompt("Edit your comment:", comment.comment);
    if (newText === null) return;
    if (!newText.trim()) { showToast("Comment cannot be empty."); return; }

    try {
      const cleanText = sanitizeInput(newText.trim());
      const { error } = await db.from('comments').update({ comment: cleanText }).eq('id', commentId);
      if (error) { showDatabaseError('comments', error, 'UPDATE_COMMENT'); showToast("Failed to edit comment."); }
      else { await loadDatabaseComments(); showToast("Comment updated!", false); }
    } catch (e) { showDatabaseError('comments', e, 'UPDATE_COMMENT'); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const { error } = await db.from('comments').delete().eq('id', commentId);
      if (error) { showDatabaseError('comments', error, 'DELETE_COMMENT'); showToast("Failed to delete comment."); }
      else { await loadDatabaseComments(); showToast("Comment deleted.", false); }
    } catch (e) { showDatabaseError('comments', e, 'DELETE_COMMENT'); }
  };

  // Chat Operations
  const handleSendGlobalChatMessage = async () => {
    if (!globalChatInput.trim()) { showToast("Chat message cannot be empty."); return; }
    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({
        username: userProfile.username,
        message: globalChatInput.trim(),
        user_id: currentUser?.id
      });
      const { error } = await db.from('chats').insert([sanitizedPayload]);
      if (error) showDatabaseError('chats', error, 'INSERT_GLOBAL_CHAT');
      else { setGlobalChatInput(''); await loadDatabaseChats(); }
    } catch (err) { showToast(err.message || "Security exception blocked message."); }
  };

  const handleSendMatchChatMessage = async () => {
    if (!matchChatInput.trim() || !matchChatModal.matchId) { showToast("Chat message cannot be empty."); return; }
    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({
        match_id: matchChatModal.matchId,
        username: userProfile.username,
        message: matchChatInput.trim(),
        user_id: currentUser?.id
      });
      const { error } = await db.from('chats').insert([sanitizedPayload]);
      if (error) showDatabaseError('chats', error, 'INSERT_MATCH_CHAT');
      else { setMatchChatInput(''); await loadDatabaseChats(); }
    } catch (err) { showToast(err.message || "Security exception blocked message."); }
  };

  const handleEditChatMessage = async (chatId, isMatchChat) => {
    const list = isMatchChat ? matchChatStore[matchChatModal.matchId] || [] : globalChatMessages;
    const msg = list.find(m => String(m.id) === String(chatId));
    if (!msg) return;

    const newText = prompt("Edit message:", msg.text);
    if (newText === null) return;
    if (!newText.trim()) { showToast("Message cannot be empty."); return; }

    try {
      const cleanText = sanitizeInput(newText.trim());
      const { error } = await db.from('chats').update({ message: cleanText }).eq('id', chatId);
      if (error) showDatabaseError('chats', error, 'UPDATE_CHAT');
      else { await loadDatabaseChats(); showToast("Message edited.", false); }
    } catch (e) { showDatabaseError('chats', e, 'UPDATE_CHAT'); }
  };

  const handleDeleteChatMessage = async (chatId) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      const { error } = await db.from('chats').delete().eq('id', chatId);
      if (error) showDatabaseError('chats', error, 'DELETE_CHAT');
      else { await loadDatabaseChats(); showToast("Message deleted.", false); }
    } catch (e) { showDatabaseError('chats', e, 'DELETE_CHAT'); }
  };

  // Admin Actions
  const handleTriggerAdminModal = (section, item = null) => {
    let initialForm = {};
    if (section === 'matches') {
      initialForm = item ? { ...item } : { teams: '', league: '', type: 'free', decimal_odds: 1.5, prob_home: 50, prob_draw: 25, prob_away: 25, confidence_stars: 3, prediction: '', analysis_text: '', status: 'PENDING', match_date: '', match_time: '' };
    } else if (section === 'fixtures') {
      initialForm = item ? { ...item } : { teams: '', league: '', match_date: '', match_time: '' };
    } else if (section === 'trending') {
      initialForm = item ? { ...item } : { title: '', rank: 1, comments_count: 0 };
    }
    setAdminFormData(initialForm);
    setAdminModal({ open: true, section, item });
  };

  const handleSaveAdminEntry = async () => {
    const { section, item } = adminModal;
    setLoader({ active: true, text: "Saving Record...", progress: 50 });
    try {
      const sanitized = verifyHackLocksAndSanitize({ ...adminFormData });
      let error = null;
      if (item && item.id) {
        const { error: err } = await db.from(section).update(sanitized).eq('id', item.id);
        error = err;
      } else {
        const { error: err } = await db.from(section).insert([sanitized]);
        error = err;
      }

      if (error) {
        showDatabaseError(section, error, 'SAVE_ADMIN_ENTRY');
      } else {
        showToast("Record saved successfully!", false);
        setAdminModal({ open: false, section: '', item: null });
        if (section === 'matches') loadMatchesFromDB();
        if (section === 'fixtures') loadFixturesFromDB();
        if (section === 'trending') loadTrendingFromDB();
      }
    } catch (err) {
      showToast(err.message || "Failed to save record.");
    } finally {
      setLoader(prev => ({ ...prev, active: false }));
    }
  };

  const handleDeleteItem = async (section, id) => {
    if (!window.confirm(`Delete record from ${section}?`)) return;
    setLoader({ active: true, text: `Deleting ${section} record...`, progress: 50 });
    try {
      const { error } = await db.from(section).delete().eq('id', id);
      if (error) showDatabaseError(section, error, `DELETE_${section.toUpperCase()}`);
      else {
        showToast("Record removed.", false);
        if (section === 'matches') loadMatchesFromDB();
        if (section === 'fixtures') loadFixturesFromDB();
        if (section === 'trending') loadTrendingFromDB();
      }
    } catch (err) { showDatabaseError(section, err, `DELETE_${section.toUpperCase()}`); }
    finally { setLoader(prev => ({ ...prev, active: false })); }
  };

  // Odds Formatter
  const formatOdds = (decimalVal) => {
    const val = parseFloat(decimalVal);
    if (!Number.isFinite(val) || val <= 1) return 'N/A';
    if (userProfile.odds_format === 'fractional') return `${Math.round((val - 1) * 100)}/100`;
    if (userProfile.odds_format === 'american') return val >= 2.0 ? `+${Math.round((val - 1) * 100)}` : `-${Math.round(100 / (val - 1))}`;
    return val.toFixed(2);
  };

  // --- SUB-COMPONENTS FOR CARDS ---
  const LiveCard = ({ match }) => {
    const teamParts = String(match.teams || '').split(/\s+vs\.?\s+/i);
    const home = teamParts[0] || 'HOME';
    const away = teamParts[1] || 'AWAY';

    const longPressProps = useLongPress(() => openGoogleSearchIframe(`Live match results for ${match.teams}`));

    return (
      <div
        {...longPressProps}
        onClick={(e) => {
          if (!longPressProps.isLongPress.current) setFullscreenMatchModal({ open: true, matchId: match.id });
        }}
        className="pro-card p-5 relative overflow-hidden cursor-pointer animate-slide-in active"
      >
        <div className="flex justify-between items-center text-xs text-gray-400 mb-3 font-semibold">
          <span className="font-cyber hover:text-mtlGreen" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Match live summary ${match.teams}`); }}>
            {sanitizeInput(match.league)}
          </span>
          <span className="text-red-500 font-bold animate-pulse">● LIVE</span>
        </div>
        <div className="flex items-center justify-between my-4">
          <div className="text-center flex-1">
            <div className="w-10 h-10 mx-auto avatar-logo mb-1 font-cyber text-xs">{sanitizeInput(getTeamBadge(home))}</div>
            <span className="text-xs font-bold tracking-wide text-white">{sanitizeInput(home)}</span>
          </div>
          <div className="text-2xl font-extrabold tracking-wider px-2 font-cyber text-mtlGreen">- _ -</div>
          <div className="text-center flex-1">
            <div className="w-10 h-10 mx-auto avatar-logo mb-1 font-cyber text-xs">{sanitizeInput(getTeamBadge(away))}</div>
            <span className="text-xs font-bold tracking-wide text-white">{sanitizeInput(away)}</span>
          </div>
        </div>
        <div className="text-center text-xs font-semibold text-mtlGreen mb-2 font-cyber">{sanitizeInput(match.minute)} Minutes</div>
        <div className="water-progress-container mb-3">
          <div className="water-progress-bar" style={{ width: `${match.progress}%` }}></div>
        </div>
        <div className="text-[11px] text-gray-400 pt-2 border-t border-mtlCardBorder flex justify-between items-center">
          <span className="truncate">{sanitizeInput(match.details)}</span>
          {userProfile.role === 'admin' && (
            <div className="flex gap-1 ml-2">
              <button onClick={(e) => { e.stopPropagation(); handleTriggerAdminModal('matches', match); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded hover:bg-amber-500 hover:text-black">Edit</button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteItem('matches', match.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded hover:bg-red-600 hover:text-white">Delete</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const PredictionCard = ({ match }) => {
    const comments = matchCommentsStore[match.id] || [];
    const type = String(match.type || 'free');
    const typeClass = type.toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';
    const oddsText = match.decimal_odds !== null && match.decimal_odds !== undefined ? formatOdds(match.decimal_odds) : 'N/A';
    const probHome = Number(match.prob_home) || 0;
    const probDraw = Number(match.prob_draw) || 0;
    const probAway = Number(match.prob_away) || 0;

    const longPressProps = useLongPress(() => openGoogleSearchIframe(`Football Match Prediction for ${match.teams}`));

    const fireLongPress = useLongPress(() => openReactionUsersModal(match.id, 'fire'), 300);
    const heartLongPress = useLongPress(() => openReactionUsersModal(match.id, 'heart'), 300);
    const dislikeLongPress = useLongPress(() => openReactionUsersModal(match.id, 'dislike'), 300);

    return (
      <div {...longPressProps} className="pro-card p-5 flex flex-col justify-between space-y-4 cursor-pointer animate-slide-in active">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${typeClass}`}>{sanitizeInput(type)} Match</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-bold font-cyber">Odds: {sanitizeInput(oddsText)}</span>
              <span className="text-[10px] text-gray-400 font-mono">{sanitizeInput(match.match_date || '')} {sanitizeInput(match.match_time || '')}</span>
            </div>
          </div>
          <h4 className="font-extrabold text-base text-white tracking-wide font-cyber hover:text-mtlGreen" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Prediction summary for ${match.teams}`); }}>
            {sanitizeInput(match.teams || 'Unknown Match')}
          </h4>
          <p className="text-xs text-mtlGreen font-semibold">Prediction: {sanitizeInput(match.prediction || 'N/A')} ({stars})</p>
          <p className="text-xs text-gray-400 line-clamp-2">{sanitizeInput(match.analysis_text || 'Tactical breakdown in detailed view.')}</p>
        </div>

        <div className="space-y-1 bg-mtlDark p-3 rounded-xl border border-mtlCardBorder">
          <div className="flex justify-between text-[10px] font-bold text-gray-300">
            <span>Probability:</span>
            <span>H: {probHome}% | D: {probDraw}% | A: {probAway}%</span>
          </div>
          <div className="water-progress-container">
            <div className="water-progress-bar" style={{ width: `${probHome}%` }}></div>
          </div>
        </div>

        {/* Reaction Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            {...fireLongPress}
            onClick={(e) => { e.stopPropagation(); if (!fireLongPress.isLongPress.current) handleReactToMatch(match.id, 'fire'); }}
            className="bg-mtlDark border border-mtlCardBorder px-2.5 py-1 rounded-lg text-xs hover:border-mtlGreen flex items-center gap-1 transition"
          >
            🔥 <span>{match.reactions?.fire || 0}</span>
          </button>
          <button
            {...heartLongPress}
            onClick={(e) => { e.stopPropagation(); if (!heartLongPress.isLongPress.current) handleReactToMatch(match.id, 'heart'); }}
            className="bg-mtlDark border border-mtlCardBorder px-2.5 py-1 rounded-lg text-xs hover:border-mtlGreen flex items-center gap-1 transition"
          >
            ❤️ <span>{match.reactions?.heart || 0}</span>
          </button>
          <button
            {...dislikeLongPress}
            onClick={(e) => { e.stopPropagation(); if (!dislikeLongPress.isLongPress.current) handleReactToMatch(match.id, 'dislike'); }}
            className="bg-mtlDark border border-mtlCardBorder px-2.5 py-1 rounded-lg text-xs hover:border-mtlGreen flex items-center gap-1 transition"
          >
            👎 <span>{match.reactions?.dislike || 0}</span>
          </button>
        </div>

        {/* Comments Box */}
        <div
          onClick={(e) => { e.stopPropagation(); setCommentsModal({ open: true, matchId: match.id, teams: match.teams }); }}
          className="bg-mtlDark rounded-xl p-3 space-y-2 border border-mtlCardBorder hover:border-mtlGreen transition cursor-pointer"
        >
          <div className="flex justify-between items-center text-[11px] font-bold text-gray-300">
            <span>💬 Comments ({comments.length})</span>
            <span className="text-mtlGreen text-[10px] uppercase font-bold">🖥️ Fullscreen View ➔</span>
          </div>
          <div className="space-y-1.5 max-h-20 overflow-y-auto text-[11px]">
            {comments.length === 0 ? (
              <p className="text-gray-500 italic text-[10px]">No comments yet. Click to start discussion.</p>
            ) : (
              comments.slice(-2).map(c => (
                <div key={c.id} className="bg-mtlCard p-1.5 rounded border border-mtlCardBorder text-gray-300">
                  <span className="font-bold text-mtlGreen">{sanitizeInput(c.user)}:</span> {sanitizeInput(c.comment)}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-mtlCardBorder flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); setFullscreenMatchModal({ open: true, matchId: match.id }); }} className="bg-mtlGreen/10 border border-mtlGreen text-mtlGreen hover:bg-mtlGreen hover:text-black font-bold px-3 py-1.5 rounded-xl text-xs transition">🔍 Details</button>
            <button onClick={(e) => { e.stopPropagation(); setMatchChatModal({ open: true, matchId: match.id, teams: match.teams }); }} className="bg-mtlDark border border-mtlCardBorder px-3 py-1.5 rounded-xl text-xs text-gray-200 hover:text-mtlGreen transition flex items-center gap-1">💬 Telegram Chat</button>
          </div>
          {userProfile.role === 'admin' && (
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); handleTriggerAdminModal('matches', match); }} className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-amber-500 hover:text-black transition">Edit</button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteItem('matches', match.id); }} className="bg-red-600/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition">Delete</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const FixtureCard = ({ fix }) => {
    const longPressProps = useLongPress(() => openGoogleSearchIframe(`Football fixture data for ${fix.teams || ''} ${fix.league || ''}`));
    return (
      <div {...longPressProps} className="pro-card p-4 flex items-center justify-between cursor-pointer animate-slide-in active">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-mtlDark border border-mtlCardBorder flex items-center justify-center font-bold text-xs text-mtlGreen font-cyber">{sanitizeInput(fix.badge)}</div>
          <div>
            <h4 className="font-bold text-xs text-white hover:text-mtlGreen" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Fixture schedule ${fix.teams}`); }}>{sanitizeInput(fix.teams || 'Fixture')}</h4>
            <span className="text-[10px] text-gray-400">{sanitizeInput(fix.league || 'League')}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-mtlGreen block font-cyber">{sanitizeInput(fix.match_time || 'TBD')}</span>
            <span className="text-[10px] text-gray-500">{sanitizeInput(fix.match_date || 'TBD')}</span>
          </div>
          {userProfile.role === 'admin' && (
            <div className="flex gap-1 ml-2">
              <button onClick={(e) => { e.stopPropagation(); handleTriggerAdminModal('fixtures', fix); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">Edit</button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteItem('fixtures', fix.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white">Delete</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const TrendingCard = ({ item }) => {
    const longPressProps = useLongPress(() => openGoogleSearchIframe(`Football news updates on ${item.title || ''}`));
    return (
      <div {...longPressProps} className="pro-card p-4 flex items-center justify-between cursor-pointer animate-slide-in active">
        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold text-mtlGreen font-cyber">#{sanitizeInput(item.rank)}</span>
          <div>
            <h4 className="font-bold text-xs text-white hover:text-mtlGreen" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(item.title); }}>{sanitizeInput(item.title)}</h4>
            <span className="text-[10px] text-gray-500">💬 {Number(item.comments_count) || 6237} discussions</span>
          </div>
        </div>
        {userProfile.role === 'admin' && (
          <div className="flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); handleTriggerAdminModal('trending', item); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">Edit</button>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteItem('trending', item.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white">Delete</button>
          </div>
        )}
      </div>
    );
  };

  // Filtered Predictions List
  const now = new Date();
  const filteredPredictions = matchesData.filter(m => {
    const isFT = String(m.status || '').toUpperCase() === 'FT';
    const kickoff = parseMatchDateTime(m.match_date, m.match_time);
    const isPastDate = kickoff ? kickoff.getTime() < now.getTime() - (120 * 60 * 1000) : false;
    const isPastMatch = isFT || isPastDate;

    const matchesTab = activeMatchTab === 'past' ? isPastMatch : !isPastMatch;
    if (!matchesTab) return false;

    if (matchSearchQuery) {
      const query = matchSearchQuery.toLowerCase();
      const nameMatch = String(m.teams || '').toLowerCase().includes(query);
      const dateMatch = String(m.match_date || '').toLowerCase().includes(query);
      const timeMatch = String(m.match_time || '').toLowerCase().includes(query);
      const leagueMatch = String(m.league || '').toLowerCase().includes(query);
      return nameMatch || dateMatch || timeMatch || leagueMatch;
    }
    return true;
  });

  const activeFullscreenMatch = matchesData.find(m => String(m.id) === String(fullscreenMatchModal.matchId));

  return (
    <div className={`min-h-screen flex flex-col justify-between selection:bg-mtlGreen selection:text-black ${userProfile.high_contrast ? 'high-contrast-mode' : ''}`}>
      {/* Embedded Internal Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800;900&family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

        :root {
          --mtl-bg: #030712;
          --mtl-surface: #0b0f19;
          --mtl-dark: #070a12;
          --mtl-card: #111827;
          --mtl-card-border: #1f293d;
          --mtl-green: #10b981;
          --mtl-green-hover: #059669;
          --mtl-cyan: #00f0ff;
          --mtl-neon: #38bdf8;
        }

        body {
          background-color: var(--mtl-bg);
          color: #f3f4f6;
          font-family: 'Inter', sans-serif;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }

        .font-cyber {
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
        }

        .pro-card {
          background-color: var(--mtl-surface);
          border: 1px solid var(--mtl-card-border);
          border-radius: 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5);
        }

        .pro-card:hover {
          border-color: var(--mtl-green);
          box-shadow: 0 0 25px -5px rgba(16, 185, 129, 0.25);
          transform: translateY(-2px);
        }

        .avatar-logo {
          background: linear-gradient(135deg, #059669 0%, #10b981 50%, #00f0ff 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          font-weight: 900;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
        }

        .water-progress-container {
          width: 100%;
          height: 6px;
          background-color: var(--mtl-dark);
          border-radius: 9999px;
          overflow: hidden;
          border: 1px solid var(--mtl-card-border);
        }

        .water-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--mtl-green), var(--mtl-cyan));
          border-radius: 9999px;
          transition: width 0.5s ease-in-out;
        }

        .floating-loader-overlay {
          position: fixed;
          inset: 0;
          background: rgba(3, 7, 18, 0.85);
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

        .loader-card {
          background: var(--mtl-surface);
          border: 1px solid var(--mtl-green);
          padding: 2rem;
          border-radius: 1.5rem;
          width: 90%;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 0 40px rgba(16, 185, 129, 0.2);
        }

        .btn-see-more {
          background-color: rgba(16, 185, 129, 0.1);
          border: 1px solid var(--mtl-green);
          color: var(--mtl-green);
          font-weight: 700;
          font-size: 0.75rem;
          padding: 0.5rem 1rem;
          border-radius: 0.75rem;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-see-more:hover {
          background-color: var(--mtl-green);
          color: #000;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
        }

        .chat-bubble-me {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: #000;
          font-weight: 600;
          border-radius: 1rem 1rem 0 1rem;
        }

        .chat-bubble-other {
          background-color: var(--mtl-card);
          border: 1px solid var(--mtl-card-border);
          color: #e5e7eb;
          border-radius: 1rem 1rem 1rem 0;
        }

        .high-contrast-mode {
          --mtl-bg: #000000;
          --mtl-surface: #050505;
          --mtl-card: #0a0a0a;
          --mtl-card-border: #333333;
          --mtl-green: #00ff66;
        }

        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* 4D Background Canvas */}
      <canvas ref={canvasRef} id="bg-4d-canvas" className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 opacity-45" />

      <div className="app-content-wrapper flex flex-col min-h-screen justify-between relative z-10">
        
        {/* Toast Container */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-xl border text-xs font-bold font-cyber shadow-2xl flex items-center gap-2 transform transition-all duration-300 pointer-events-auto ${
                toast.isError ? 'bg-red-950/90 border-red-500/50 text-red-300' : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
              }`}
            >
              <span>{toast.isError ? '⚠️' : '✔️'}</span>
              <span>{sanitizeInput(toast.message)}</span>
            </div>
          ))}
        </div>

        {/* Floating Loader */}
        <div className={`floating-loader-overlay ${loader.active ? 'active' : ''}`}>
          <div className="loader-card space-y-4">
            <div className="flex items-center justify-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-cyber">QUANTUM SYNC</h4>
            </div>
            <p className="text-sm font-medium text-gray-200">{loader.text}</p>
            <div className="water-progress-container">
              <div className="water-progress-bar" style={{ width: `${loader.progress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Reacted Users Modal */}
        {reactionUsersModal.open && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-mtlSurface border border-mtlGreen rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative animate-slide-in active">
              <div className="flex justify-between items-center border-b border-mtlCardBorder pb-3">
                <h4 className="font-bold text-sm text-mtlGreen font-cyber">
                  REACTED WITH {reactionUsersModal.type.toUpperCase()}
                </h4>
                <button onClick={() => setReactionUsersModal({ open: false, type: '', list: [] })} className="text-gray-400 hover:text-white font-bold">✕</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                {reactionUsersModal.list.length === 0 ? (
                  <p className="text-gray-500 italic py-2">No users have put this reaction yet.</p>
                ) : (
                  reactionUsersModal.list.map((u, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-mtlDark rounded-lg border border-mtlCardBorder">
                      <div className="w-6 h-6 avatar-logo text-[10px] font-bold">{getFirstNameInitials(u.username)}</div>
                      <span className="text-xs font-semibold text-gray-200">{sanitizeInput(u.username)}</span>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => setReactionUsersModal({ open: false, type: '', list: [] })} className="w-full bg-mtlCard border border-mtlCardBorder text-gray-300 py-2 rounded-xl text-xs font-bold hover:text-white">Close</button>
            </div>
          </div>
        )}

        {/* Side Navigation Overlay */}
        {sideNavOpen && (
          <div onClick={() => setSideNavOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"></div>
        )}
        <aside className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-mtlSurface border-l border-mtlCardBorder z-50 transform transition-transform duration-300 ease-in-out flex flex-col justify-between p-6 shadow-2xl ${sideNavOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-mtlCardBorder pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 avatar-logo text-sm font-bold">{getFirstNameInitials(userProfile.username)}</div>
                <div>
                  <h3 className="font-extrabold text-sm text-white font-cyber">{sanitizeInput(userProfile.username)}</h3>
                  <span className="text-[10px] text-gray-400">{sanitizeInput(userProfile.email)}</span>
                </div>
              </div>
              <button onClick={() => setSideNavOpen(false)} className="w-8 h-8 rounded-full bg-mtlDark text-gray-400 hover:text-white flex items-center justify-center font-bold">✕</button>
            </div>

            <nav className="space-y-3">
              <a href="/dashboard" className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black transition text-xs font-bold">
                <span className="text-base">⬅️</span> Back to Dashboard
              </a>
              <button onClick={() => { setDialingModal(true); setSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-mtlCard border border-mtlCardBorder hover:border-mtlGreen hover:text-mtlGreen transition text-xs font-semibold text-gray-200">
                <span className="text-base">📞</span> Contact Centre
              </button>
              <button onClick={() => { setSettingsModal(true); setSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-mtlCard border border-mtlCardBorder hover:border-mtlGreen hover:text-mtlGreen transition text-xs font-semibold text-gray-200">
                <span className="text-base">⚙️</span> Preferences & Settings
              </button>
            </nav>
          </div>

          <div className="pt-6 border-t border-mtlCardBorder space-y-3">
            <button onClick={handleSignOut} className="w-full bg-red-950/60 text-red-300 border border-red-500/40 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-red-800 hover:text-white transition flex items-center justify-center gap-2">
              <span>❌</span> Sign Out
            </button>
          </div>
        </aside>

        {/* Header */}
        <header className="border-b border-mtlCardBorder bg-mtlSurface/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/dashboard" title="Back to Dashboard" className="w-9 h-9 rounded-xl bg-mtlCard border border-mtlCardBorder text-mtlGreen flex items-center justify-center font-bold text-sm hover:bg-mtlGreen hover:text-black transition">⬅️</a>
              <div onClick={() => setDialingModal(true)} className="w-10 h-10 avatar-logo text-lg cursor-pointer">
                {getFirstNameInitials(userProfile.username)}
              </div>
              <div>
                <h1 className="font-bold tracking-wider text-lg leading-tight font-cyber text-white">PREDICTIONS <span className="text-mtlGreen">HUB</span></h1>
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Feel Welcomed.</span>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
              <a href="/dashboard" className="flex items-center gap-2 text-mtlGreen border-b-2 border-mtlGreen pb-1 font-bold">DASHBOARD</a>
              <a href="#live-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">LIVE</a>
              <a href="#fixtures-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">FIXTURES</a>
              <a href="#db-matches-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">PREDICTIONS</a>
              <a href="#trending-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">COMMUNITY</a>
            </nav>

            <div className="flex items-center gap-3">
              <button onClick={() => setSideNavOpen(true)} title="Open Navigation Options" className="w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-200 flex items-center justify-center hover:text-mtlGreen transition">
                ☰
              </button>
              
              <div onClick={() => setSideNavOpen(true)} className="hidden md:flex items-center gap-3 bg-mtlCard border border-mtlCardBorder px-3 py-1.5 rounded-full cursor-pointer">
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
        <section className="relative overflow-hidden py-12 px-6 border-b border-mtlCardBorder bg-gradient-to-b from-mtlSurface to-mtlDark animate-slide-in">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <span className="text-xs uppercase tracking-[0.25em] text-mtlGreen font-bold bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">Sports Analytics & 4D Intelligence</span>
            <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight mt-3 uppercase font-cyber text-white">FOOTBALL <span className="text-mtlGreen">INTELLIGENCE</span></h2>
            <p className="text-gray-400 text-sm lg:text-base mt-2 max-w-2xl mx-auto font-sans font-medium">Real-time stats, AI match predictions, dynamic hotline dialing and secure encrypted feeds.</p>
          </div>
        </section>

        {/* Database Error Console */}
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

        {/* Main Grid Content */}
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">

          {/* Live Section */}
          <section id="live-section" className="animate-slide-in">
            <div className="flex items-center justify-between mb-6 section-header">
              <div>
                <h3 className="font-extrabold text-lg uppercase tracking-wide text-white font-cyber flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> LIVE MATCHES
                </h3>
                <span className="text-xs text-gray-400">{liveMatchesData.length} Active Matches</span>
              </div>
              <button onClick={() => setStatsListModal({ open: true, title: 'Live Games Directory', dataset: liveMatchesData })} className="btn-see-more">
                <span>SEE MORE MATCHES</span> ➔
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {liveMatchesData.length === 0 ? (
                <div className="col-span-3 text-center py-8 pro-card">
                  <p className="text-xs text-gray-400">No live matches currently in play.</p>
                </div>
              ) : (
                liveMatchesData.slice(0, 3).map(m => <LiveCard key={m.id} match={m} />)
              )}
            </div>
          </section>

          {/* Predictions Section */}
          <section id="db-matches-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 animate-slide-in shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 section-header">
              <div>
                <h3 onClick={() => openGoogleSearchIframe('Live database matches and football predictions')} className="text-lg font-extrabold uppercase tracking-wide text-white font-cyber cursor-pointer hover:text-mtlGreen transition">
                  ⚽ MATCHES & PREDICTIONS
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Hold match cards long press to trigger Google Search.</p>
              </div>
              <button onClick={() => setStatsListModal({ open: true, title: 'All Database Predictions', dataset: matchesData })} className="btn-see-more">
                <span>SEE MORE</span> ➔
              </button>
            </div>

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
              {filteredPredictions.length === 0 ? (
                <div className="col-span-3 text-center py-8 pro-card">
                  <p className="text-xs text-gray-400">No {activeMatchTab === 'past' ? 'past' : 'upcoming'} matches found matching query "{sanitizeInput(matchSearchQuery)}".</p>
                </div>
              ) : (
                filteredPredictions.slice(0, 3).map(m => <PredictionCard key={m.id} match={m} />)
              )}
            </div>

            {userProfile.role === 'admin' && (
              <div className="mt-6 pt-4 border-t border-mtlCardBorder flex justify-center">
                <button onClick={() => handleTriggerAdminModal('matches')} className="bg-mtlGreen text-black font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider hover:bg-emerald-600 transition flex items-center gap-2">
                  <span>➕</span> ADD PREDICTION
                </button>
              </div>
            )}
          </section>

          {/* Grid for Fixtures & Trending */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Fixtures */}
            <section id="fixtures-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 flex flex-col justify-between space-y-4 animate-slide-in shadow-2xl">
              <div>
                <div className="flex items-center justify-between mb-6 section-header">
                  <div>
                    <h3 onClick={() => openGoogleSearchIframe('Upcoming football fixtures schedule')} className="font-extrabold uppercase tracking-wide text-base text-white font-cyber cursor-pointer hover:text-mtlGreen transition">
                       UPCOMING FIXTURES
                    </h3>
                    <span className="text-xs text-gray-400">Upcoming fixtures</span>
                  </div>
                  <button onClick={() => setStatsListModal({ open: true, title: 'Complete Fixtures Schedule', dataset: fixturesData })} className="btn-see-more text-xs py-2 px-3.5">
                    <span>SEE MORE</span> ➔
                  </button>
                </div>
                <div className="space-y-4">
                  {fixturesData.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-500">No upcoming fixtures recorded.</div>
                  ) : (
                    fixturesData.slice(0, 3).map(f => <FixtureCard key={f.id} fix={f} />)
                  )}
                </div>
              </div>
              {userProfile.role === 'admin' && (
                <div className="pt-4 border-t border-mtlCardBorder flex justify-center">
                  <button onClick={() => handleTriggerAdminModal('fixtures')} className="bg-mtlCard border border-mtlGreen text-mtlGreen font-bold px-5 py-2 rounded-xl text-xs hover:bg-mtlGreen hover:text-black transition flex items-center gap-2">
                    <span>➕</span> ADD FIXTURE
                  </button>
                </div>
              )}
            </section>

            {/* Trending News */}
            <section id="trending-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 flex flex-col justify-between space-y-4 animate-slide-in shadow-2xl">
              <div>
                <div className="flex items-center justify-between mb-6 section-header">
                  <div>
                    <h3 onClick={() => openGoogleSearchIframe('Trending football news updates')} className="font-extrabold uppercase tracking-wide text-base text-white font-cyber cursor-pointer hover:text-mtlGreen transition">
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
                    trendingData.slice(0, 3).map(t => <TrendingCard key={t.id} item={t} />)
                  )}
                </div>
              </div>
              {userProfile.role === 'admin' && (
                <div className="pt-4 border-t border-mtlCardBorder flex justify-center">
                  <button onClick={() => handleTriggerAdminModal('trending')} className="bg-mtlCard border border-mtlGreen text-mtlGreen font-bold px-5 py-2 rounded-xl text-xs hover:bg-mtlGreen hover:text-black transition flex items-center gap-2">
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
              <a href="/dashboard" className="text-mtlGreen font-bold hover:underline">Dashboard</a>
              <a href="#" className="hover:text-mtlGreen">Privacy Policy</a>
              <a href="#" className="hover:text-mtlGreen">Terms of Service</a>
              <a href="#" onClick={() => setDialingModal(true)} className="hover:text-mtlGreen">Developed BY M. Lennox</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Google Iframe Modal */}
      {googleIframeModal.open && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col p-3 sm:p-6">
          <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-3 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-mtlGreen text-black font-extrabold flex items-center justify-center font-cyber">AI</div>
              <div>
                <h4 className="text-xs font-bold font-cyber text-mtlGreen">GOOGLE QUICK SEARCH</h4>
                <p className="text-[10px] text-gray-400 font-mono">Automated AI Mode: "{googleIframeModal.query}"</p>
              </div>
            </div>
            <button onClick={closeGoogleIframeModal} className="w-8 h-8 rounded-full bg-red-900/40 text-red-300 border border-red-500/30 flex items-center justify-center font-bold text-xs hover:bg-red-800">✕</button>
          </div>
          <div className="flex-1 rounded-2xl overflow-hidden border border-mtlCardBorder bg-white">
            <iframe title="Google Search AI" className="w-full h-full border-0" src={googleIframeModal.src}></iframe>
          </div>
        </div>
      )}

      {/* Global Telegram Chat Floating Drawer */}
      <div className="fixed bottom-6 right-6 z-40">
        <button onClick={() => setIsChatDrawerOpen(prev => !prev)} className="w-14 h-14 rounded-full bg-mtlGreen text-black flex items-center justify-center text-2xl font-bold shadow-lg hover:scale-105 transition transform">💬</button>
        {isChatDrawerOpen && (
          <div className="absolute bottom-20 right-0 w-80 sm:w-96 bg-mtlSurface border border-mtlCardBorder rounded-2xl shadow-2xl flex flex-col h-[480px] overflow-hidden">
            <div className="bg-mtlDark p-4 border-b border-mtlCardBorder flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-mtlGreen animate-pulse"></span>
                <h4 className="font-bold text-sm tracking-wide font-cyber text-white">Community Chat</h4>
              </div>
              <button onClick={() => setIsChatDrawerOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
              {globalChatMessages.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-8">Welcome to Telegram global chat!</div>
              ) : (
                globalChatMessages.map(msg => {
                  const isMe = currentUser && msg.user_id === currentUser.id;
                  const canEdit = userProfile.role === 'admin' || isMe;
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'} animate-slide-in active`}>
                      <div className="text-[9px] text-gray-400 mb-0.5 px-1 flex items-center gap-2">
                        <span>{sanitizeInput(msg.user)} • {sanitizeInput(msg.time)}</span>
                        {canEdit && (
                          <>
                            <button onClick={() => handleEditChatMessage(msg.id, false)} className="text-amber-400 hover:underline">Edit</button>
                            <button onClick={() => handleDeleteChatMessage(msg.id)} className="text-red-400 hover:underline">Delete</button>
                          </>
                        )}
                      </div>
                      <div className={`px-3.5 py-2 text-xs ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>
                        {sanitizeInput(msg.text)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-3 border-t border-mtlCardBorder bg-mtlDark flex gap-2">
              <input
                type="text"
                value={globalChatInput}
                onChange={(e) => setGlobalChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendGlobalChatMessage()}
                placeholder="Type Telegram message..."
                className="flex-1 bg-mtlCard border border-mtlCardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mtlGreen"
              />
              <button onClick={handleSendGlobalChatMessage} className="bg-mtlGreen text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-600 transition">Send</button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Comments Modal */}
      {commentsModal.open && (
        <div className="fixed inset-0 bg-mtlDark/95 backdrop-blur-xl z-50 p-4 md:p-10 overflow-y-auto flex flex-col justify-between">
          <div className="max-w-4xl w-full mx-auto bg-mtlSurface border border-mtlGreen/40 rounded-3xl p-6 md:p-8 shadow-2xl relative flex-1 flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between border-b border-mtlCardBorder pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center font-bold text-lg font-cyber">💬</div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-white font-cyber">Comments Stream: {sanitizeInput(commentsModal.teams)}</h3>
                  <p className="text-xs text-mtlGreen">Leave a comment.</p>
                </div>
              </div>
              <button onClick={() => setCommentsModal({ open: false, matchId: null, teams: '' })} className="w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[60vh]">
              {(matchCommentsStore[commentsModal.matchId] || []).length === 0 ? (
                <div className="text-center text-gray-500 py-12 text-xs font-medium">No comments posted for this match yet. Be the first to share analysis!</div>
              ) : (
                (matchCommentsStore[commentsModal.matchId] || []).map(c => {
                  const canEdit = userProfile.role === 'admin' || (currentUser && c.user_id === currentUser.id);
                  return (
                    <div key={c.id} className="bg-mtlCard border border-mtlCardBorder p-4 rounded-2xl space-y-2 flex gap-3 items-start animate-slide-in active">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs font-cyber flex-shrink-0">{getFirstNameInitials(c.user)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-mtlGreen font-cyber">{sanitizeInput(c.user)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">{sanitizeInput(c.time)}</span>
                            {canEdit && (
                              <>
                                <button onClick={() => handleEditComment(c.id)} className="text-[10px] text-amber-400 hover:underline">Edit</button>
                                <button onClick={() => handleDeleteComment(c.id)} className="text-[10px] text-red-400 hover:underline">Delete</button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-200 mt-1 leading-relaxed">{sanitizeInput(c.comment)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="bg-mtlDark p-4 rounded-2xl border border-mtlCardBorder space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Post Public Comment</h4>
              <div className="flex gap-3">
                <textarea
                  rows="2"
                  value={fullscreenCommentInput}
                  onChange={(e) => setFullscreenCommentInput(e.target.value)}
                  placeholder="Write detailed comment to be recorded in database..."
                  className="flex-1 bg-mtlCard border border-mtlCardBorder rounded-xl p-3 text-xs text-white focus:outline-none focus:border-mtlGreen"
                />
                <button onClick={submitFullscreenComment} className="bg-mtlGreen text-black font-extrabold px-6 py-2 rounded-xl text-xs hover:bg-emerald-600 transition self-end">Post Comment</button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-mtlCardBorder">
              <button onClick={() => setCommentsModal({ open: false, matchId: null, teams: '' })} className="btn-see-more">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Directory Modal */}
      {statsListModal.open && (
        <div className="fixed inset-0 bg-mtlDark/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">
          <div className="max-w-5xl mx-auto bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">
            <button onClick={() => setStatsListModal({ open: false, title: '', dataset: [] })} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
            <div className="space-y-6">
              <div className="border-b border-mtlCardBorder pb-4 section-header">
                <h3 className="text-2xl font-extrabold text-mtlGreen uppercase tracking-wider font-cyber">{statsListModal.title}</h3>
                <p className="text-xs text-gray-400 mt-1">Dataset display.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[65vh] overflow-y-auto pr-2">
                {statsListModal.dataset.length === 0 ? (
                  <div className="lg:col-span-3 text-center py-12 text-xs text-gray-500">No records registered.</div>
                ) : (
                  statsListModal.dataset.map((item, idx) => {
                    if (item.teams && item.prediction) return <PredictionCard key={item.id || idx} match={item} />;
                    if (item.teams && item.league) return <FixtureCard key={item.id || idx} fix={item} />;
                    if (item.title && item.rank !== undefined) return <TrendingCard key={item.id || idx} item={item} />;
                    if (item.teams && item.minute) return <LiveCard key={item.id || idx} match={item} />;
                    return null;
                  })
                )}
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-mtlCardBorder flex justify-end">
              <button onClick={() => setStatsListModal({ open: false, title: '', dataset: [] })} className="btn-see-more">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Match Details Modal */}
      {fullscreenMatchModal.open && activeFullscreenMatch && (
        <div className="fixed inset-0 bg-mtlDark/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">
          <div className="max-w-5xl mx-auto bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">
            <button onClick={() => setFullscreenMatchModal({ open: false, matchId: null })} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
            <div className="space-y-8">
              <div className="flex justify-between items-start border-b border-mtlCardBorder pb-6 section-header">
                <div>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${String(activeFullscreenMatch.type).toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>{sanitizeInput(activeFullscreenMatch.type || 'free')} INTEL</span>
                  <h2 onClick={() => openGoogleSearchIframe(`Live analysis ${activeFullscreenMatch.teams}`)} className="text-3xl lg:text-4xl font-extrabold text-white mt-2 font-cyber hover:text-mtlGreen cursor-pointer">{sanitizeInput(activeFullscreenMatch.teams)}</h2>
                  <p className="text-xs text-gray-400 mt-1 font-mono">Date: {sanitizeInput(activeFullscreenMatch.match_date || '')} | Kickoff: {sanitizeInput(activeFullscreenMatch.match_time || '')}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 uppercase tracking-widest block font-cyber">Confidence</span>
                  <span className="text-2xl">{'⭐'.repeat(Math.min(Number(activeFullscreenMatch.confidence_stars) || 0, 5))}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-mtlDark p-5 rounded-2xl border border-mtlCardBorder space-y-2">
                  <span className="text-xs text-mtlGreen font-bold uppercase tracking-wider font-cyber">Prediction</span>
                  <p className="text-xl font-extrabold text-white font-cyber">{sanitizeInput(activeFullscreenMatch.prediction || 'N/A')}</p>
                </div>
                <div className="bg-mtlDark p-5 rounded-2xl border border-mtlCardBorder space-y-2">
                  <span className="text-xs text-amber-400 font-bold uppercase tracking-wider font-cyber">Decimal Odds</span>
                  <p className="text-xl font-extrabold text-white font-cyber">{formatOdds(activeFullscreenMatch.decimal_odds)}</p>
                </div>
                <div className="bg-mtlDark p-5 rounded-2xl border border-mtlCardBorder space-y-2">
                  <span className="text-xs text-blue-400 font-bold uppercase tracking-wider font-cyber">Status & Score</span>
                  <p className="text-xl font-extrabold text-white font-cyber">{sanitizeInput(activeFullscreenMatch.status || 'PENDING')} ({sanitizeInput(activeFullscreenMatch.final_score || 'Awaiting')})</p>
                </div>
              </div>
              <div className="bg-mtlDark p-6 rounded-2xl border border-mtlCardBorder space-y-3">
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-mtlGreen font-cyber">Tactical Intelligence & Match Analysis</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{sanitizeInput(activeFullscreenMatch.analysis_text || 'No tactical analysis available.')}</p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-mtlCardBorder flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button onClick={() => { setMatchChatModal({ open: true, matchId: activeFullscreenMatch.id, teams: activeFullscreenMatch.teams }); setFullscreenMatchModal({ open: false, matchId: null }); }} className="bg-mtlCard border border-mtlCardBorder text-gray-200 px-4 py-2 rounded-xl text-xs hover:text-mtlGreen flex items-center gap-2">💬 Open Chat</button>
                <button onClick={() => setDialingModal(true)} className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:text-black transition">📞 Call</button>
              </div>
              <button onClick={() => setFullscreenMatchModal({ open: false, matchId: null })} className="btn-see-more">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Match Chat Modal */}
      {matchChatModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-mtlDark p-4 border-b border-mtlCardBorder flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-mtlGreen font-cyber">Telegram Match Thread: {sanitizeInput(matchChatModal.teams)}</h4>
                <p className="text-[10px] text-gray-400">Match discussion Group</p>
              </div>
              <button onClick={() => setMatchChatModal({ open: false, matchId: null, teams: '' })} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
              {(matchChatStore[matchChatModal.matchId] || []).length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-8">No messages in this match chat thread yet.</div>
              ) : (
                (matchChatStore[matchChatModal.matchId] || []).map(msg => {
                  const isMe = currentUser && msg.user_id === currentUser.id;
                  const canEdit = userProfile.role === 'admin' || isMe;
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'} animate-slide-in active`}>
                      <div className="text-[9px] text-gray-400 mb-0.5 px-1 flex items-center gap-2">
                        <span>{sanitizeInput(msg.user)} • {sanitizeInput(msg.time)}</span>
                        {canEdit && (
                          <>
                            <button onClick={() => handleEditChatMessage(msg.id, true)} className="text-amber-400 hover:underline">Edit</button>
                            <button onClick={() => handleDeleteChatMessage(msg.id)} className="text-red-400 hover:underline">Delete</button>
                          </>
                        )}
                      </div>
                      <div className={`px-3.5 py-2 text-xs ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>
                        {sanitizeInput(msg.text)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-3 border-t border-mtlCardBorder bg-mtlDark flex gap-2">
              <input
                type="text"
                value={matchChatInput}
                onChange={(e) => setMatchChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMatchChatMessage()}
                placeholder="Discuss this match..."
                className="flex-1 bg-mtlCard border border-mtlCardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mtlGreen"
              />
              <button onClick={handleSendMatchChatMessage} className="bg-mtlGreen text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-600 transition">Post</button>
            </div>
          </div>
        </div>
      )}

      {/* Dialing Call Centre Modal */}
      {dialingModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-2xl p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-mtlCardBorder pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center text-xl">📞</div>
                <div>
                  <h3 className="text-lg font-bold font-cyber text-white">Live Call Centre</h3>
                  <p className="text-xs text-gray-400">Direct call support +254716883895</p>
                </div>
              </div>
              <button onClick={() => setDialingModal(false)} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-mtlDark p-4 rounded-xl border border-mtlCardBorder space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-mtlGreen tracking-wider">WHATSAPP</span>
                  <h4 className="font-bold text-sm text-white mt-1">Chat on WhatsApp</h4>
                  <p className="text-xs text-gray-400">Message us directly on WhatsApp.</p>
                </div>
                <a href="https://wa.me/254716883895" target="_blank" rel="noreferrer" className="w-full bg-mtlGreen text-black text-center text-xs font-bold py-2.5 rounded-xl hover:bg-emerald-600 transition mt-3 block">💬 WhatsApp +254716883895</a>
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
            <div className="text-center pt-2"><button onClick={() => setDialingModal(false)} className="text-xs text-gray-400 hover:text-white">Close Call Centre</button></div>
          </div>
        </div>
      )}

      {/* Admin Operations Modal */}
      {adminModal.open && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-2xl p-8 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-mtlCardBorder pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-mtlGreen uppercase tracking-wider font-cyber">Admin Content Management</h3>
                <p className="text-xs text-gray-400">Insert or update Record into [{adminModal.section}]</p>
              </div>
              <button onClick={() => setAdminModal({ open: false, section: '', item: null })} className="text-gray-400 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {Object.keys(adminFormData).filter(key => key !== 'id' && key !== 'created_at' && key !== 'reactions').map(key => (
                <div key={key}>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{key.replace('_', ' ')}</label>
                  <input
                    type="text"
                    value={adminFormData[key] ?? ''}
                    onChange={(e) => setAdminFormData({ ...adminFormData, [key]: e.target.value })}
                    className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-mtlGreen"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4 border-t border-mtlCardBorder pt-4">
              <button onClick={() => setAdminModal({ open: false, section: '', item: null })} className="px-5 py-2.5 rounded-xl text-xs bg-gray-800 text-gray-300 hover:bg-gray-700">Cancel</button>
              <button onClick={handleSaveAdminEntry} className="px-6 py-2.5 rounded-xl text-xs bg-mtlGreen text-black font-extrabold hover:bg-emerald-600 transition">Save Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* User Preferences Modal */}
      {settingsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-mtlCardBorder pb-3">
              <h3 className="text-base font-bold text-mtlGreen uppercase tracking-wider font-cyber">User Preferences</h3>
              <button onClick={() => setSettingsModal(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">ODDS FORMAT</label>
                <select
                  value={userProfile.odds_format}
                  onChange={(e) => setUserProfile({ ...userProfile, odds_format: e.target.value })}
                  className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-white"
                >
                  <option value="decimal">Decimal (2.00)</option>
                  <option value="fractional">Fractional (1/1)</option>
                  <option value="american">American (+100)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">LANGUAGE</label>
                <select
                  value={userProfile.language}
                  onChange={(e) => setUserProfile({ ...userProfile, language: e.target.value })}
                  className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-white"
                >
                  <option value="en">English (EN)</option>
                  <option value="sw">Swahili (SW)</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-gray-300">CONTRAST MODE</span>
                <input
                  type="checkbox"
                  checked={userProfile.high_contrast}
                  onChange={(e) => setUserProfile({ ...userProfile, high_contrast: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500"
                />
              </div>
            </div>
            <button onClick={() => setSettingsModal(false)} className="w-full bg-mtlGreen text-black font-bold py-2 rounded-xl">Save & Close</button>
          </div>
        </div>
      )}

    </div>
  );
}
