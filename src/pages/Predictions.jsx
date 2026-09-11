import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ==========================================
// SUPABASE CONFIG & INITIALIZATION
// ==========================================
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// UTILITY FUNCTIONS & SECURITY
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

function parseMatchDateTime(dateValue, timeValue) {
  try {
    let dateText = String(dateValue).trim();
    let timeText = String(timeValue).trim().replace(/(\.\d+)?$/, '');
    if (/^\d{2}:\d{2}$/.test(timeText)) timeText += ':00';
    const parsed = new Date(`${dateText}T${timeText}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch { return null; }
}

export default function Predictions() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState({
    role: 'user',
    username: 'Loading...',
    email: '',
    odds_format: 'decimal',
    language: 'en',
    high_contrast: false
  });

  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("initializing secure intelligence core...");
  const [loadingProgress, setLoadingProgress] = useState(25);
  const [toasts, setToasts] = useState([]);
  const [dbError, setDbError] = useState(null);

  const [matchesData, setMatchesData] = useState([]);
  const [fixturesData, setFixturesData] = useState([]);
  const [trendingData, setTrendingData] = useState([]);
  const [liveMatchesData, setLiveMatchesData] = useState([]);

  const [activeMatchTab, setActiveMatchTab] = useState('future');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');

  // Modals & Drawers
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [dialingModalOpen, setDialingModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleQuery, setGoogleQuery] = useState('');
  
  const [reactionModalOpen, setReactionModalOpen] = useState(false);
  const [reactionModalData, setReactionModalData] = useState({ title: '', users: [] });

  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalTitle, setStatsModalTitle] = useState('');
  const [statsModalDataset, setStatsModalDataset] = useState([]);

  const [fullscreenMatchModalOpen, setFullscreenMatchModalOpen] = useState(false);
  const [activeFullscreenMatch, setActiveFullscreenMatch] = useState(null);

  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [activeCommentMatch, setActiveCommentMatch] = useState({ id: null, teams: '' });
  const [commentInput, setCommentInput] = useState('');

  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [globalChatMessages, setGlobalChatMessages] = useState([]);
  const [globalChatInput, setGlobalChatInput] = useState('');

  const [matchChatModalOpen, setMatchChatModalOpen] = useState(false);
  const [activeMatchChat, setActiveMatchChat] = useState({ id: null, teams: '' });
  const [matchChatMessages, setMatchChatMessages] = useState([]);
  const [matchChatInput, setMatchChatInput] = useState('');

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminSection, setAdminSection] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [adminFormData, setAdminFormData] = useState({});

  const [matchReactionsMap, setMatchReactionsMap] = useState({});
  const [matchCommentsStore, setMatchCommentsStore] = useState({});
  const [matchChatStore, setMatchChatStore] = useState({});

  const canvasRef = useRef(null);
  const globalChatScrollRef = useRef(null);
  const matchChatScrollRef = useRef(null);
  const commentsScrollRef = useRef(null);

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  const showToast = (message, isError = true) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // ==========================================
  // THREE.JS 4D BACKGROUND
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    const geometry = new THREE.TorusKnotGeometry(10, 3, 128, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      wireframe: true,
      roughness: 0.2,
      metalness: 0.8
    });
    const torusKnot = new THREE.Mesh(geometry, material);
    scene.add(torusKnot);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 700;
    const posArray = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 60;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.12,
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.7
    });
    const particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particleMesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00f0ff, 2, 50);
    pointLight.position.set(15, 15, 15);
    scene.add(pointLight);

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      torusKnot.rotation.x += 0.003 + mouseY * 0.1;
      torusKnot.rotation.y += 0.005 + mouseX * 0.1;
      particleMesh.rotation.y -= 0.001;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  // ==========================================
  // INITIAL DATA & SESSION FETCHING
  // ==========================================
  useEffect(() => {
    async function initializeApp() {
      try {
        setLoadingText("establishing quantum sync...");
        setLoadingProgress(15);
        
        const { data: { user }, error: userError } = await db.auth.getUser();
        if (userError || !user) {
          window.location.href = "auth.html";
          return;
        }

        setCurrentUser(user);

        setLoadingText("fetching neural feeds...");
        setLoadingProgress(40);

        const { data: profile } = await db
          .from('profiles')
          .select('username, name, email, role, is_admin, admin')
          .eq('id', user.id)
          .single();

        const dbName = profile?.name || profile?.username;
        const finalUsername = dbName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        const finalEmail = profile?.email || user.email || 'user@mtl.com';
        const isUserAdmin = profile?.role === 'admin' || profile?.is_admin === true || profile?.admin === true;

        setUserProfile({
          role: isUserAdmin ? 'admin' : 'user',
          username: finalUsername,
          email: finalEmail,
          odds_format: 'decimal',
          language: 'en',
          high_contrast: false
        });

        await loadAllDatabaseData();

        setLoadingText("sync complete");
        setLoadingProgress(100);
        setTimeout(() => setLoading(false), 300);
      } catch (err) {
        setDbError({ table: 'auth', error: err, operation: 'SESSION_INIT' });
        window.location.href = "auth.html";
      }
    }

    initializeApp();
  }, []);

  async function loadAllDatabaseData() {
    await Promise.all([
      loadDatabaseReactions(),
      loadMatchesFromDB(),
      loadFixturesFromDB(),
      loadTrendingFromDB(),
      loadDatabaseComments(),
      loadDatabaseChats()
    ]);
  }

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
        await loadDatabaseReactions();
        await loadMatchesFromDB();
      })
      .subscribe();

    return () => {
      db.removeChannel(chatSub);
      db.removeChannel(commentSub);
      db.removeChannel(reactionSub);
    };
  }, []);

  // Live Matches Refresh Interval
  useEffect(() => {
    const interval = setInterval(() => {
      updateLiveMatches();
    }, 1000);
    return () => clearInterval(interval);
  }, [matchesData]);

  // ==========================================
  // DATA LOADERS
  // ==========================================
  async function loadDatabaseReactions() {
    try {
      const { data, error } = await db.from('reactions').select('*');
      if (error) { setDbError({ table: 'reactions', error, operation: 'READ_REACTIONS' }); return; }
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
    } catch (e) { setDbError({ table: 'reactions', error: e, operation: 'READ_REACTIONS' }); }
  }

  async function loadDatabaseComments() {
    try {
      const { data, error } = await db.from('comments').select('*').order('created_at', { ascending: true });
      if (error) { setDbError({ table: 'comments', error, operation: 'READ_COMMENTS' }); return; }
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
    } catch (err) { setDbError({ table: 'comments', error: err, operation: 'READ_COMMENTS' }); }
  }

  async function loadDatabaseChats() {
    try {
      const { data, error } = await db.from('chats').select('*').order('created_at', { ascending: true });
      if (error) { setDbError({ table: 'chats', error, operation: 'READ_CHATS' }); return; }
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
    } catch (err) { setDbError({ table: 'chats', error: err, operation: 'READ_CHATS' }); }
  }

  async function loadMatchesFromDB() {
    try {
      const { data, error } = await db.from('matches').select('*').order('created_at', { ascending: false });
      if (error) { setDbError({ table: 'matches', error, operation: 'READ_MATCHES' }); return; }
      const normalized = Array.isArray(data) ? data.map(normalizeMatch) : [];
      setMatchesData(normalized);
    } catch (error) { setDbError({ table: 'matches', error, operation: 'READ_MATCHES' }); }
  }

  function normalizeMatch(match) {
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
  }

  async function loadFixturesFromDB() {
    try {
      const { data, error } = await db.from('fixtures').select('*').order('match_date', { ascending: true });
      if (error) { setDbError({ table: 'fixtures', error, operation: 'READ_FIXTURES' }); return; }
      const normalized = Array.isArray(data) ? data.map(normalizeFixture) : [];
      setFixturesData(normalized);
    } catch (error) { setDbError({ table: 'fixtures', error, operation: 'READ_FIXTURES' }); }
  }

  function normalizeFixture(fix) {
    const matchDate = fix.match_date ?? fix.date ?? '';
    const matchTime = fix.match_time ?? fix.time ?? '';
    return { ...fix, match_date: matchDate, match_time: matchTime, badge: fix.badge || getTeamBadge(fix.teams) };
  }

  async function loadTrendingFromDB() {
    try {
      const { data, error } = await db.from('trending').select('*').order('rank', { ascending: true });
      if (error) { setDbError({ table: 'trending', error, operation: 'READ_TRENDING' }); return; }
      const normalized = Array.isArray(data) ? data.map(normalizeTrending) : [];
      setTrendingData(normalized);
    } catch (error) { setDbError({ table: 'trending', error, operation: 'READ_TRENDING' }); }
  }

  function normalizeTrending(item) {
    return { ...item, rank: item.rank ?? '', title: item.title ?? '', comments_count: item.comments_count ?? item.comments ?? 0 };
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

  // ==========================================
  // FORMATTING & ACTIONS
  // ==========================================
  function formatOdds(decimalVal) {
    const val = parseFloat(decimalVal);
    if (!Number.isFinite(val) || val <= 1) return 'N/A';
    if (userProfile.odds_format === 'fractional') return `${Math.round((val - 1) * 100)}/100`;
    if (userProfile.odds_format === 'american') return val >= 2.0 ? `+${Math.round((val - 1) * 100)}` : `-${Math.round(100 / (val - 1))}`;
    return val.toFixed(2);
  }

  async function signOutUser() {
    await db.auth.signOut();
    window.location.href = "auth.html";
  }

  function openGoogleSearchIframe(queryText) {
    setGoogleQuery(queryText);
    setGoogleModalOpen(true);
  }

  // Reactions
  async function reactToMatch(matchId, type) {
    const match = matchesData.find(m => String(m.id) === String(matchId));
    if (!match) return;

    const mId = String(matchId);
    const currentMap = { ...matchReactionsMap };
    if (!currentMap[mId]) currentMap[mId] = [];

    const userId = currentUser?.id || 'guest';
    const userPrevIndex = currentMap[mId].findIndex(r => r.user_id === userId);

    const newReactions = { ...(match.reactions || { fire: 0, heart: 0, dislike: 0 }) };

    if (userPrevIndex !== -1) {
      const prevType = currentMap[mId][userPrevIndex].reaction;
      if (prevType === type) {
        newReactions[type] = Math.max(0, Number(newReactions[type] || 0) - 1);
        currentMap[mId].splice(userPrevIndex, 1);
        try { await db.from('reactions').delete().eq('match_id', matchId).eq('user_id', userId); } catch (e) {}
      } else {
        newReactions[prevType] = Math.max(0, Number(newReactions[prevType] || 0) - 1);
        newReactions[type] = Number(newReactions[type] || 0) + 1;
        currentMap[mId][userPrevIndex].reaction = type;
        try {
          await db.from('reactions').upsert([{
            match_id: matchId,
            user_id: userId,
            username: userProfile.username,
            reaction_type: type
          }], { onConflict: 'match_id,user_id' });
        } catch (e) {}
      }
    } else {
      newReactions[type] = Number(newReactions[type] || 0) + 1;
      currentMap[mId].push({ user_id: userId, username: userProfile.username, reaction: type });
      try {
        await db.from('reactions').insert([{
          match_id: matchId,
          user_id: userId,
          username: userProfile.username,
          reaction_type: type
        }]);
      } catch (e) {}
    }

    setMatchReactionsMap(currentMap);
    setMatchesData(prev => prev.map(m => String(m.id) === String(matchId) ? { ...m, reactions: newReactions } : m));

    try {
      await db.from('matches').update({ reactions: newReactions }).eq('id', matchId);
    } catch (err) {}
  }

  function handleReactionLongPress(matchId, type) {
    const emojiMap = { fire: '🔥 Fire', heart: '❤️ Heart', dislike: '👎 Dislike' };
    const matchReactions = matchReactionsMap[String(matchId)] || [];
    const usersForType = matchReactions.filter(r => r.reaction === type);
    setReactionModalData({
      title: `Reacted with ${emojiMap[type] || type}`,
      users: usersForType
    });
    setReactionModalOpen(true);
  }

  // Comments
  async function submitFullscreenComment() {
    const text = commentInput.trim();
    if (!text || !activeCommentMatch.id) {
      showToast("Please enter a non-empty comment.");
      return;
    }

    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({
        match_id: activeCommentMatch.id,
        username: userProfile.username,
        comment: text,
        user_id: currentUser?.id
      });

      const { error } = await db.from('comments').insert([sanitizedPayload]);
      if (error) {
        setDbError({ table: 'comments', error, operation: 'INSERT_COMMENT' });
        showToast("Failed to save comment.");
      } else {
        await loadDatabaseComments();
        showToast("Comment published successfully!", false);
        setCommentInput('');
      }
    } catch (err) {
      showToast(err.message || "Error occurred while posting comment.");
    }
  }

  async function deleteComment(commentId) {
    if (!confirm("Delete this comment?")) return;
    try {
      const { error } = await db.from('comments').delete().eq('id', commentId);
      if (error) setDbError({ table: 'comments', error, operation: 'DELETE_COMMENT' });
      else {
        await loadDatabaseComments();
        showToast("Comment deleted.", false);
      }
    } catch (e) { setDbError({ table: 'comments', error: e, operation: 'DELETE_COMMENT' }); }
  }

  // Chat
  async function sendGlobalChatMessage() {
    const text = globalChatInput.trim();
    if (!text) return;
    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({
        username: userProfile.username,
        message: text,
        user_id: currentUser?.id
      });
      const { error } = await db.from('chats').insert([sanitizedPayload]);
      if (error) setDbError({ table: 'chats', error, operation: 'INSERT_GLOBAL_CHAT' });
      else {
        await loadDatabaseChats();
        setGlobalChatInput('');
        if (globalChatScrollRef.current) {
          globalChatScrollRef.current.scrollTop = globalChatScrollRef.current.scrollHeight;
        }
      }
    } catch (err) {
      showToast(err.message || "Security exception blocked message.");
    }
  }

  async function sendMatchChatMessage() {
    const text = matchChatInput.trim();
    if (!text || !activeMatchChat.id) return;
    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({
        match_id: activeMatchChat.id,
        username: userProfile.username,
        message: text,
        user_id: currentUser?.id
      });
      const { error } = await db.from('chats').insert([sanitizedPayload]);
      if (error) setDbError({ table: 'chats', error, operation: 'INSERT_MATCH_CHAT' });
      else {
        await loadDatabaseChats();
        setMatchChatInput('');
        if (matchChatScrollRef.current) {
          matchChatScrollRef.current.scrollTop = matchChatScrollRef.current.scrollHeight;
        }
      }
    } catch (err) {
      showToast(err.message || "Security violation blocked message.");
    }
  }

  async function deleteChatMessage(chatId) {
    if (!confirm("Delete this message?")) return;
    try {
      const { error } = await db.from('chats').delete().eq('id', chatId);
      if (error) setDbError({ table: 'chats', error, operation: 'DELETE_CHAT' });
      else await loadDatabaseChats();
    } catch (e) { setDbError({ table: 'chats', error: e, operation: 'DELETE_CHAT' }); }
  }

  // Admin Operations
  async function deleteMatchFromDB(id) {
    if (!confirm("Delete this match?")) return;
    try {
      const { error } = await db.from('matches').delete().eq('id', id);
      if (error) setDbError({ table: 'matches', error, operation: 'DELETE_MATCH' });
      else {
        await loadMatchesFromDB();
        showToast("Match removed.", false);
      }
    } catch (err) { setDbError({ table: 'matches', error: err, operation: 'DELETE_MATCH' }); }
  }

  async function deleteFixtureFromDB(id) {
    if (!confirm("Delete this fixture?")) return;
    try {
      const { error } = await db.from('fixtures').delete().eq('id', id);
      if (error) setDbError({ table: 'fixtures', error, operation: 'DELETE_FIXTURE' });
      else {
        await loadFixturesFromDB();
        showToast("Fixture removed.", false);
      }
    } catch (err) { setDbError({ table: 'fixtures', error: err, operation: 'DELETE_FIXTURE' }); }
  }

  async function deleteTrendingFromDB(id) {
    if (!confirm("Delete this trending headline?")) return;
    try {
      const { error } = await db.from('trending').delete().eq('id', id);
      if (error) setDbError({ table: 'trending', error, operation: 'DELETE_TRENDING' });
      else {
        await loadTrendingFromDB();
        showToast("Headline removed.", false);
      }
    } catch (err) { setDbError({ table: 'trending', error: err, operation: 'DELETE_TRENDING' }); }
  }

  function openAdminModal(section, item = null) {
    setAdminSection(section);
    setEditingItem(item);
    setAdminFormData(item || {});
    setAdminModalOpen(true);
  }

  async function saveAdminEntry() {
    try {
      verifyHackLocksAndSanitize(adminFormData);
      let error = null;
      if (adminSection === 'matches') {
        if (editingItem?.id) {
          const { error: err } = await db.from('matches').update(adminFormData).eq('id', editingItem.id);
          error = err;
        } else {
          const { error: err } = await db.from('matches').insert([adminFormData]);
          error = err;
        }
        await loadMatchesFromDB();
      } else if (adminSection === 'fixtures') {
        if (editingItem?.id) {
          const { error: err } = await db.from('fixtures').update(adminFormData).eq('id', editingItem.id);
          error = err;
        } else {
          const { error: err } = await db.from('fixtures').insert([adminFormData]);
          error = err;
        }
        await loadFixturesFromDB();
      } else if (adminSection === 'trending') {
        if (editingItem?.id) {
          const { error: err } = await db.from('trending').update(adminFormData).eq('id', editingItem.id);
          error = err;
        } else {
          const { error: err } = await db.from('trending').insert([adminFormData]);
          error = err;
        }
        await loadTrendingFromDB();
      }

      if (error) {
        showToast("Failed to save entry.");
      } else {
        showToast("Entry saved successfully!", false);
        setAdminModalOpen(false);
      }
    } catch (e) {
      showToast(e.message || "Security violation detected.");
    }
  }

  // Filtered Matches
  const now = new Date();
  const filteredMatches = matchesData.filter(m => {
    const isFT = String(m.status || '').toUpperCase() === 'FT';
    const kickoff = parseMatchDateTime(m.match_date, m.match_time);
    const isPastDate = kickoff ? kickoff.getTime() < now.getTime() - (120 * 60 * 1000) : false;
    const isPastMatch = isFT || isPastDate;

    const matchesTabCondition = activeMatchTab === 'past' ? isPastMatch : !isPastMatch;
    if (!matchesTabCondition) return false;

    if (!matchSearchQuery) return true;
    const q = matchSearchQuery.toLowerCase();
    return (
      String(m.teams || '').toLowerCase().includes(q) ||
      String(m.match_date || '').toLowerCase().includes(q) ||
      String(m.match_time || '').toLowerCase().includes(q) ||
      String(m.league || '').toLowerCase().includes(q)
    );
  });

  const initials = getFirstNameInitials(userProfile.username);

  return (
    <div className={`min-h-screen flex flex-col justify-between selection:bg-mtlGreen selection:text-black ${userProfile.high_contrast ? 'high-contrast-mode' : ''}`} style={{ backgroundColor: '#0b0f19', color: '#f9fafb', fontFamily: "'Inter', sans-serif" }}>
      
      {/* 4D Background Canvas */}
      <canvas ref={canvasRef} id="bg-4d-canvas" className="fixed top-0 left-0 w-screen h-screen pointer-events-none z-0 opacity-45" />

      <div className="app-content-wrapper flex flex-col min-h-screen justify-between relative z-10">

        {/* Toasts */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className={`px-4 py-3 rounded-xl border text-xs font-bold font-cyber shadow-2xl flex items-center gap-2 pointer-events-auto transition-all ${
              t.isError ? 'bg-red-950/90 border-red-500/50 text-red-300' : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
            }`}>
              <span>{t.isError ? '⚠️' : '✔️'}</span>
              <span>{sanitizeInput(t.message)}</span>
            </div>
          ))}
        </div>

        {/* Floating Loader */}
        <div className={`fixed inset-0 bg-[#0b0f19]/85 backdrop-blur-md z-100 flex items-center justify-center transition-opacity duration-300 ${loading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="bg-[#111827] border border-[#00f0ff] shadow-[0_0_35px_rgba(0,240,255,0.25)] rounded-2xl p-7 w-[90%] max-w-[420px] text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#00f0ff] animate-ping" />
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#00f0ff] font-cyber">QUANTUM SYNC</h4>
            </div>
            <p className="text-sm font-medium text-gray-200">{loadingText}</p>
            <div className="w-full bg-[#1f2937] h-4 rounded-full relative overflow-hidden border border-[#00f0ff]/30 shadow-inner">
              <div className="h-full bg-gradient-to-r from-[#10b981] via-[#00f0ff] to-[#10b981] bg-[length:200%_100%] rounded-full transition-all duration-600 animate-[fluidFlow_3s_linear_infinite]" style={{ width: `${loadingProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Reaction Users Modal */}
        {reactionModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#10b981] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-[#374151] pb-3">
                <h4 className="font-bold text-sm text-[#10b981] font-cyber">{reactionModalData.title}</h4>
                <button onClick={() => setReactionModalOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                {reactionModalData.users.length === 0 ? (
                  <p className="text-gray-500 italic py-2">No users have put this reaction yet.</p>
                ) : (
                  reactionModalData.users.map((u, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-[#0b0f19] rounded-lg border border-[#374151]">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#10b981] text-white flex items-center justify-center text-[10px] font-bold">{getFirstNameInitials(u.username)}</div>
                      <span className="text-xs font-semibold text-gray-200">{sanitizeInput(u.username)}</span>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => setReactionModalOpen(false)} className="w-full bg-[#1f2937] border border-[#374151] text-gray-300 py-2 rounded-xl text-xs font-bold hover:text-white">Close</button>
            </div>
          </div>
        )}

        {/* Side Nav Drawer */}
        {sideNavOpen && <div onClick={() => setSideNavOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity" />}
        <aside className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-[#111827] border-l border-[#374151] z-50 transform transition-transform duration-300 ease-in-out flex flex-col justify-between p-6 shadow-2xl ${sideNavOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#374151] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#10b981] text-white font-extrabold flex items-center justify-center text-sm">{initials}</div>
                <div>
                  <h3 className="font-extrabold text-sm text-white font-cyber">{userProfile.username}</h3>
                  <span className="text-[10px] text-gray-400">{userProfile.email}</span>
                </div>
              </div>
              <button onClick={() => setSideNavOpen(false)} className="w-8 h-8 rounded-full bg-[#0b0f19] text-gray-400 hover:text-white flex items-center justify-center font-bold">✕</button>
            </div>

            <nav className="space-y-3">
              <a href="/dashboard" className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#10b981]/10 border border-[#10b981] text-[#10b981] hover:bg-[#10b981] hover:text-black transition text-xs font-bold">
                <span className="text-base">⬅️</span> Back to Dashboard
              </a>
              <button onClick={() => { setDialingModalOpen(true); setSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1f2937] border border-[#374151] hover:border-[#10b981] hover:text-[#10b981] transition text-xs font-semibold text-gray-200">
                <span className="text-base">📞</span> Contact Centre
              </button>
              <button onClick={() => { setSettingsModalOpen(true); setSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1f2937] border border-[#374151] hover:border-[#10b981] hover:text-[#10b981] transition text-xs font-semibold text-gray-200">
                <span className="text-base">⚙️</span> Preferences & Settings
              </button>
            </nav>
          </div>

          <div className="pt-6 border-t border-[#374151]">
            <button onClick={signOutUser} className="w-full bg-red-950/60 text-red-300 border border-red-500/40 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-red-800 hover:text-white transition flex items-center justify-center gap-2">
              <span>❌</span> Sign Out
            </button>
          </div>
        </aside>

        {/* Main Application Container */}
        <div id="app-root" className="flex flex-col min-h-screen justify-between">
          
          {/* Header */}
          <header className="border-b border-[#374151] bg-[#111827]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a href="/dashboard" title="Back to Dashboard" className="w-9 h-9 rounded-xl bg-[#1f2937] border border-[#374151] text-[#10b981] flex items-center justify-center font-bold text-sm hover:bg-[#10b981] hover:text-black transition">⬅️</a>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#10b981] text-white font-extrabold flex items-center justify-center text-lg cursor-pointer" onClick={() => setDialingModalOpen(true)}>{initials}</div>
                <div>
                  <h1 className="font-bold tracking-wider text-lg leading-tight font-cyber text-white">PREDICTIONS <span className="text-[#10b981]">HUB</span></h1>
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
                <button onClick={() => setSideNavOpen(true)} title="Open Navigation Options" className="w-10 h-10 rounded-full bg-[#1f2937] border border-[#374151] text-gray-200 flex items-center justify-center hover:text-[#10b981] transition">
                  ☰
                </button>
                
                <div className="hidden md:flex items-center gap-3 bg-[#1f2937] border border-[#374151] px-3 py-1.5 rounded-full cursor-pointer" onClick={() => setSideNavOpen(true)}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#10b981] text-white font-extrabold flex items-center justify-center text-xs">{initials}</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-200">{userProfile.username} ({userProfile.role.toUpperCase()})</span>
                    <span className="text-[9px] text-gray-400">{userProfile.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Banner */}
          <section className="relative overflow-hidden py-12 px-6 border-b border-[#374151] bg-gradient-to-b from-[#111827] to-[#0b0f19]">
            <div className="max-w-7xl mx-auto text-center relative z-10">
              <span className="text-xs uppercase tracking-[0.25em] text-[#10b981] font-bold bg-[#10b981]/10 px-4 py-1.5 rounded-full border border-[#10b981]/20">Sports Analytics & 4D Intelligence</span>
              <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight mt-3 uppercase font-cyber text-white">FOOTBALL <span className="text-[#10b981]">INTELLIGENCE</span></h2>
              <p className="text-gray-400 text-sm lg:text-base mt-2 max-w-2xl mx-auto font-sans font-medium">Real-time stats, AI match predictions, dynamic hotline dialing and secure encrypted feeds.</p>
            </div>
          </section>

          {/* Database Error Banner */}
          {dbError && (
            <div className="max-w-7xl mx-auto px-6 pt-6 w-full">
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
                    <p className="text-xs text-red-300 mt-1 font-semibold">{dbError.error?.code === '42501' ? 'Row-Level Security (RLS) Permission Denied.' : `Database error code: ${dbError.error?.code || 'UNKNOWN'}`}</p>
                  </div>
                  <div className="bg-black/20 border border-red-500/10 rounded-xl p-3">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Recommended Fix</span>
                    <p className="text-xs text-gray-300 mt-1">{dbError.error?.code === '42501' ? 'Check Supabase table policies.' : 'Check table structure or review Supabase operational logs.'}</p>
                  </div>
                  <div className="bg-black/20 border border-red-500/10 rounded-xl p-3">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500">Technical Trace</span>
                    <pre className="text-[10px] text-red-300 mt-1 whitespace-pre-wrap break-words max-h-32 overflow-y-auto font-mono">{JSON.stringify(dbError.error, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Grid */}
          <main className="max-w-7xl mx-auto px-6 py-8 space-y-12 w-full">

            {/* Live Matches Section */}
            <section id="live-section">
              <div className="flex items-center justify-between mb-6 border-l-4 border-[#10b981] pl-3">
                <div>
                  <h3 className="font-extrabold text-lg uppercase tracking-wide text-white font-cyber flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> LIVE MATCHES
                  </h3>
                  <span className="text-xs text-gray-400">{liveMatchesData.length} Matches Active</span>
                </div>
                <button onClick={() => { setStatsModalTitle('Live Games Directory'); setStatsModalDataset(liveMatchesData); setStatsModalOpen(true); }} className="bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-bold py-2 px-5 rounded-full shadow-[0_4px_15px_rgba(16,185,129,0.35)] border border-white/20 transition hover:-translate-y-0.5 flex items-center gap-2 text-xs">
                  <span>SEE MORE MATCHES</span> ➔
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {liveMatchesData.length === 0 ? (
                  <div className="col-span-3 text-center py-8 bg-[#111827] border border-[#374151] rounded-2xl"><p className="text-xs text-gray-400">No live matches currently in play.</p></div>
                ) : (
                  liveMatchesData.map((match) => {
                    const teamParts = String(match.teams || '').split(/\s+vs\.?\s+/i);
                    const home = teamParts[0] || 'HOME';
                    const away = teamParts[1] || 'AWAY';
                    return (
                      <div key={match.id} onClick={() => { setActiveFullscreenMatch(match); setFullscreenMatchModalOpen(true); }} className="bg-gradient-to-br from-[#1f2937]/90 to-[#111827]/95 backdrop-blur-md border border-[#374151]/40 rounded-2xl p-5 relative overflow-hidden cursor-pointer transition hover:border-[#10b981] hover:-translate-y-1 shadow-xl">
                        <div className="flex justify-between items-center text-xs text-gray-400 mb-3 font-semibold">
                          <span className="font-cyber hover:text-[#10b981]" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Match live summary ${sanitizeInput(match.teams)}`); }}>{sanitizeInput(match.league)}</span>
                          <span className="text-red-500 font-bold animate-pulse">● LIVE</span>
                        </div>
                        <div className="flex items-center justify-between my-4">
                          <div className="text-center flex-1">
                            <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-[#3b82f6] to-[#10b981] text-white flex items-center justify-center font-cyber text-xs mb-1 font-bold">{getTeamBadge(home)}</div>
                            <span className="text-xs font-bold tracking-wide text-white">{sanitizeInput(home)}</span>
                          </div>
                          <div className="text-2xl font-extrabold tracking-wider px-2 font-cyber text-[#10b981]">- _ -</div>
                          <div className="text-center flex-1">
                            <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-[#3b82f6] to-[#10b981] text-white flex items-center justify-center font-cyber text-xs mb-1 font-bold">{getTeamBadge(away)}</div>
                            <span className="text-xs font-bold tracking-wide text-white">{sanitizeInput(away)}</span>
                          </div>
                        </div>
                        <div className="text-center text-xs font-semibold text-[#10b981] mb-2 font-cyber">{match.minute} Minutes</div>
                        <div className="w-full bg-[#1f2937] h-4 rounded-full relative overflow-hidden border border-[#00f0ff]/30 shadow-inner mb-3">
                          <div className="h-full bg-gradient-to-r from-[#10b981] via-[#00f0ff] to-[#10b981] rounded-full" style={{ width: `${match.progress}%` }} />
                        </div>
                        <div className="text-[11px] text-gray-400 pt-2 border-t border-[#374151] flex justify-between items-center">
                          <span className="truncate">{sanitizeInput(match.details)}</span>
                          {userProfile.role === 'admin' && (
                            <div className="flex gap-1 ml-2">
                              <button onClick={(e) => { e.stopPropagation(); openAdminModal('matches', match); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded hover:bg-amber-500 hover:text-black">Edit</button>
                              <button onClick={(e) => { e.stopPropagation(); deleteMatchFromDB(match.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded hover:bg-red-600 hover:text-white">Delete</button>
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
            <section id="db-matches-section" className="bg-[#111827] border border-[#374151] rounded-2xl p-6 shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-l-4 border-[#10b981] pl-3">
                <div>
                  <h3 className="text-lg font-extrabold uppercase tracking-wide text-white font-cyber cursor-pointer hover:text-[#10b981] transition" onClick={() => openGoogleSearchIframe('Live database matches and football predictions')}>
                    ⚽ MATCHES & PREDICTIONS
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Hold match cards long press to trigger Google Search.</p>
                </div>
                <button onClick={() => { setStatsModalTitle('All Database Predictions'); setStatsModalDataset(matchesData); setStatsModalOpen(true); }} className="bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-bold py-2 px-5 rounded-full shadow-[0_4px_15px_rgba(16,185,129,0.35)] border border-white/20 transition hover:-translate-y-0.5 flex items-center gap-2 text-xs">
                  <span>SEE MORE</span> ➔
                </button>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 border-b border-[#374151] pb-4">
                <div className="flex items-center gap-2 bg-[#0b0f19] p-1.5 rounded-xl border border-[#374151] self-start">
                  <button onClick={() => setActiveMatchTab('future')} className={`px-4 py-1.5 rounded-lg text-xs font-bold font-cyber transition ${activeMatchTab === 'future' ? 'bg-[#10b981] text-black' : 'text-gray-400 hover:text-white'}`}>
                    UPCOMING MATCHES
                  </button>
                  <button onClick={() => setActiveMatchTab('past')} className={`px-4 py-1.5 rounded-lg text-xs font-bold font-cyber transition ${activeMatchTab === 'past' ? 'bg-[#10b981] text-black' : 'text-gray-400 hover:text-white'}`}>
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
                  <div className="col-span-3 text-center py-10 bg-[#111827] border border-[#374151] rounded-2xl"><p className="text-xs text-gray-400">No matches found matching query.</p></div>
                ) : (
                  filteredMatches.map((match) => {
                    const type = String(match.type || 'free');
                    const typeClass = type.toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                    const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';
                    const oddsText = match.decimal_odds !== null && match.decimal_odds !== undefined ? formatOdds(match.decimal_odds) : 'N/A';
                    const probHome = Number(match.prob_home) || 0;
                    const probDraw = Number(match.prob_draw) || 0;
                    const probAway = Number(match.prob_away) || 0;
                    const comments = matchCommentsStore[match.id] || [];

                    return (
                      <div key={match.id} className="bg-gradient-to-br from-[#1f2937]/90 to-[#111827]/95 backdrop-blur-md border border-[#374151]/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 cursor-pointer transition hover:border-[#10b981] hover:-translate-y-1 shadow-xl">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${typeClass}`}>{sanitizeInput(type)} Match</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-amber-400 font-bold font-cyber">Odds: {sanitizeInput(oddsText)}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{sanitizeInput(match.match_date || '')} {sanitizeInput(match.match_time || '')}</span>
                            </div>
                          </div>
                          <h4 className="font-extrabold text-base text-white tracking-wide font-cyber hover:text-[#10b981]" onClick={() => openGoogleSearchIframe(`Prediction summary for ${sanitizeInput(match.teams)}`)}>
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
                          <div className="w-full bg-[#1f2937] h-4 rounded-full relative overflow-hidden border border-[#00f0ff]/30 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-[#10b981] via-[#00f0ff] to-[#10b981] rounded-full" style={{ width: `${probHome}%` }} />
                          </div>
                        </div>

                        {/* Reactions Bar */}
                        <div className="flex items-center gap-2 pt-1">
                          {['fire', 'heart', 'dislike'].map((rType) => {
                            const emoji = rType === 'fire' ? '🔥' : rType === 'heart' ? '❤️' : '👎';
                            const count = match.reactions?.[rType] || 0;
                            return (
                              <button key={rType} onClick={() => reactToMatch(match.id, rType)} onContextMenu={(e) => { e.preventDefault(); handleReactionLongPress(match.id, rType); }} className="bg-[#0b0f19] border border-[#374151] px-2.5 py-1 rounded-lg text-xs hover:border-[#10b981] flex items-center gap-1 transition">
                                <span>{emoji}</span> <span>{count}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Comments Preview */}
                        <div onClick={() => { setActiveCommentMatch({ id: match.id, teams: match.teams }); setCommentsModalOpen(true); }} className="bg-[#0b0f19] rounded-xl p-3 space-y-2 border border-[#374151] hover:border-[#10b981] transition cursor-pointer">
                          <div className="flex justify-between items-center text-[11px] font-bold text-gray-300">
                            <span>💬 Comments ({comments.length})</span>
                            <span className="text-[#10b981] text-[10px] uppercase font-bold">🖥️ Fullscreen View ➔</span>
                          </div>
                          <div className="space-y-1.5 max-h-20 overflow-y-auto text-[11px]">
                            {comments.length === 0 ? (
                              <p className="text-gray-500 italic text-[10px]">No comments yet. Click to start discussion.</p>
                            ) : (
                              comments.slice(-2).map((c, idx) => (
                                <div key={idx} className="bg-[#1f2937] p-1.5 rounded border border-[#374151] text-gray-300">
                                  <span className="font-bold text-[#10b981]">{sanitizeInput(c.user)}:</span> {sanitizeInput(c.comment)}
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#374151] flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setActiveFullscreenMatch(match); setFullscreenMatchModalOpen(true); }} className="bg-[#10b981]/10 border border-[#10b981] text-[#10b981] hover:bg-[#10b981] hover:text-black font-bold px-3 py-1.5 rounded-xl text-xs transition">🔍 Details</button>
                            <button onClick={() => { setActiveMatchChat({ id: match.id, teams: match.teams }); setMatchChatModalOpen(true); }} className="bg-[#0b0f19] border border-[#374151] px-3 py-1.5 rounded-xl text-xs text-gray-200 hover:text-[#10b981] transition flex items-center gap-1">💬 Telegram Chat</button>
                          </div>
                          {userProfile.role === 'admin' && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => openAdminModal('matches', match)} className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-amber-500 hover:text-black transition">Edit</button>
                              <button onClick={() => deleteMatchFromDB(match.id)} className="bg-red-600/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition">Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {userProfile.role === 'admin' && (
                <div className="mt-6 pt-4 border-t border-[#374151] flex justify-center">
                  <button onClick={() => openAdminModal('matches')} className="bg-[#10b981] text-black font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider hover:bg-[#059669] transition flex items-center gap-2">
                    <span>➕</span> ADD PREDICTION
                  </button>
                </div>
              )}
            </section>

            {/* Fixtures & Trending Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Fixtures */}
              <section id="fixtures-section" className="bg-[#111827] border border-[#374151] rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-2xl">
                <div>
                  <div className="flex items-center justify-between mb-6 border-l-4 border-[#10b981] pl-3">
                    <div>
                      <h3 className="font-extrabold uppercase tracking-wide text-base text-white font-cyber cursor-pointer hover:text-[#10b981] transition" onClick={() => openGoogleSearchIframe('Upcoming football fixtures schedule')}>
                        📅 UPCOMING FIXTURES
                      </h3>
                      <span className="text-xs text-gray-400">Upcoming fixtures</span>
                    </div>
                    <button onClick={() => { setStatsModalTitle('Complete Fixtures Schedule'); setStatsModalDataset(fixturesData); setStatsModalOpen(true); }} className="bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-bold py-2 px-3.5 rounded-full shadow border border-white/20 transition text-xs flex items-center gap-1">
                      <span>SEE MORE</span> ➔
                    </button>
                  </div>

                  <div className="space-y-4">
                    {fixturesData.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-500">No upcoming fixtures recorded.</div>
                    ) : (
                      fixturesData.slice(0, 3).map((fix) => (
                        <div key={fix.id} className="bg-gradient-to-br from-[#1f2937]/90 to-[#111827]/95 backdrop-blur-md border border-[#374151]/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition hover:border-[#10b981]">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#0b0f19] border border-[#374151] flex items-center justify-center font-bold text-xs text-[#10b981] font-cyber">{sanitizeInput(fix.badge)}</div>
                            <div>
                              <h4 className="font-bold text-xs text-white hover:text-[#10b981]" onClick={() => openGoogleSearchIframe(`Fixture schedule ${sanitizeInput(fix.teams)}`)}>{sanitizeInput(fix.teams || 'Fixture')}</h4>
                              <span className="text-[10px] text-gray-400">{sanitizeInput(fix.league || 'League')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-xs font-bold text-[#10b981] block font-cyber">{sanitizeInput(fix.match_time || 'TBD')}</span>
                              <span className="text-[10px] text-gray-500">{sanitizeInput(fix.match_date || 'TBD')}</span>
                            </div>
                            {userProfile.role === 'admin' && (
                              <div className="flex gap-1 ml-2">
                                <button onClick={() => openAdminModal('fixtures', fix)} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">Edit</button>
                                <button onClick={() => deleteFixtureFromDB(fix.id)} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white">Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {userProfile.role === 'admin' && (
                  <div className="pt-4 border-t border-[#374151] flex justify-center">
                    <button onClick={() => openAdminModal('fixtures')} className="bg-[#1f2937] border border-[#10b981] text-[#10b981] font-bold px-5 py-2 rounded-xl text-xs hover:bg-[#10b981] hover:text-black transition flex items-center gap-2">
                      <span>➕</span> ADD FIXTURE
                    </button>
                  </div>
                )}
              </section>

              {/* Trending News */}
              <section id="trending-section" className="bg-[#111827] border border-[#374151] rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-2xl">
                <div>
                  <div className="flex items-center justify-between mb-6 border-l-4 border-[#10b981] pl-3">
                    <div>
                      <h3 className="font-extrabold uppercase tracking-wide text-base text-white font-cyber cursor-pointer hover:text-[#10b981] transition" onClick={() => openGoogleSearchIframe('Trending football news updates')}>
                        🔥 TRENDING NEWS
                      </h3>
                      <span className="text-xs text-gray-400">What's trending.</span>
                    </div>
                    <button onClick={() => { setStatsModalTitle('All Trending News'); setStatsModalDataset(trendingData); setStatsModalOpen(true); }} className="bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-bold py-2 px-3.5 rounded-full shadow border border-white/20 transition text-xs flex items-center gap-1">
                      <span>SEE MORE</span> ➔
                    </button>
                  </div>

                  <div className="space-y-4">
                    {trendingData.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-500">No trending headlines.</div>
                    ) : (
                      trendingData.slice(0, 3).map((item) => (
                        <div key={item.id} className="bg-gradient-to-br from-[#1f2937]/90 to-[#111827]/95 backdrop-blur-md border border-[#374151]/40 rounded-2xl p-4 flex items-center justify-between transition hover:border-[#10b981]">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-extrabold text-[#10b981] font-cyber">#{sanitizeInput(item.rank)}</span>
                            <div>
                              <h4 className="font-bold text-xs text-white hover:text-[#10b981] cursor-pointer" onClick={() => openGoogleSearchIframe(item.title)}>{sanitizeInput(item.title)}</h4>
                              <span className="text-[10px] text-gray-500">💬 {Number(item.comments_count) || 6237} discussions</span>
                            </div>
                          </div>
                          {userProfile.role === 'admin' && (
                            <div className="flex gap-1">
                              <button onClick={() => openAdminModal('trending', item)} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">Edit</button>
                              <button onClick={() => deleteTrendingFromDB(item.id)} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white">Delete</button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {userProfile.role === 'admin' && (
                  <div className="pt-4 border-t border-[#374151] flex justify-center">
                    <button onClick={() => openAdminModal('trending')} className="bg-[#1f2937] border border-[#10b981] text-[#10b981] font-bold px-5 py-2 rounded-xl text-xs hover:bg-[#10b981] hover:text-black transition flex items-center gap-2">
                      <span>➕</span> ADD NEWS
                    </button>
                  </div>
                )}
              </section>

            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-[#374151] bg-[#111827] mt-16 py-8 px-6 text-center text-xs text-gray-400 w-full">
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

        {/* Google Iframe Modal */}
        {googleModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col p-3 sm:p-6">
            <div className="bg-[#111827] border border-[#374151] rounded-2xl p-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#10b981] text-black font-extrabold flex items-center justify-center font-cyber">AI</div>
                <div>
                  <h4 className="text-xs font-bold font-cyber text-[#10b981]">GOOGLE QUICK SEARCH</h4>
                  <p className="text-[10px] text-gray-400 font-mono">Automated AI Mode: "{googleQuery}"</p>
                </div>
              </div>
              <button onClick={() => setGoogleModalOpen(false)} className="w-8 h-8 rounded-full bg-red-900/40 text-red-300 border border-red-500/30 flex items-center justify-center font-bold text-xs hover:bg-red-800">✕</button>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-[#374151] bg-white">
              <iframe className="w-full h-full border-0" src={`https://www.google.com/search?q=${encodeURIComponent(googleQuery)}&udm=14&udm=28&igu=1`} title="Google Search" />
            </div>
          </div>
        )}

        {/* Global Chat Floating Drawer */}
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={() => setChatDrawerOpen(!chatDrawerOpen)} className="w-14 h-14 rounded-full bg-[#10b981] text-black flex items-center justify-center text-2xl font-bold shadow-lg hover:scale-105 transition transform">💬</button>
          
          <div className={`absolute bottom-20 right-0 w-80 sm:w-96 bg-[#111827] border border-[#374151] rounded-2xl shadow-2xl flex flex-col h-[480px] overflow-hidden ${chatDrawerOpen ? 'flex' : 'hidden'}`}>
            <div className="bg-[#0b0f19] p-4 border-b border-[#374151] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                <h4 className="font-bold text-sm tracking-wide font-cyber text-white">Community Chat</h4>
              </div>
              <button onClick={() => setChatDrawerOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>
            
            <div ref={globalChatScrollRef} className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
              {globalChatMessages.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-8">Welcome to Telegram global chat!</div>
              ) : (
                globalChatMessages.map((msg) => {
                  const isMe = currentUser && msg.user_id === currentUser.id;
                  const canEdit = userProfile.role === 'admin' || isMe;
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className="text-[9px] text-gray-400 mb-0.5 px-1 flex items-center gap-2">
                        <span>{sanitizeInput(msg.user)} • {sanitizeInput(msg.time)}</span>
                        {canEdit && (
                          <button onClick={() => deleteChatMessage(msg.id)} className="text-red-400 hover:underline">Delete</button>
                        )}
                      </div>
                      <div className={`px-3.5 py-2 text-xs ${isMe ? 'bg-gradient-to-r from-[#059669] to-[#10b981] text-white rounded-2xl rounded-tr-sm shadow' : 'bg-[#1f2937] border border-[#374151] text-gray-100 rounded-2xl rounded-tl-sm shadow'}`}>
                        {sanitizeInput(msg.text)}
                      </div>
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
        {commentsModalOpen && (
          <div className="fixed inset-0 bg-[#0b0f19]/95 backdrop-blur-xl z-50 p-4 md:p-10 overflow-y-auto flex flex-col justify-between">
            <div className="max-w-4xl w-full mx-auto bg-[#111827] border border-[#10b981]/40 rounded-3xl p-6 md:p-8 shadow-2xl relative flex-1 flex flex-col justify-between space-y-6">
              
              <div className="flex items-center justify-between border-b border-[#374151] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#10b981]/20 border border-[#10b981] text-[#10b981] flex items-center justify-center font-bold text-lg font-cyber">💬</div>
                  <div>
                    <h3 className="text-lg md:text-xl font-extrabold text-white font-cyber">Comments Stream: {activeCommentMatch.teams}</h3>
                    <p className="text-xs text-[#10b981]">Leave a comment.</p>
                  </div>
                </div>
                <button onClick={() => setCommentsModalOpen(false)} className="w-10 h-10 rounded-full bg-[#1f2937] border border-[#374151] text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              </div>

              <div ref={commentsScrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[60vh]">
                {(!matchCommentsStore[activeCommentMatch.id] || matchCommentsStore[activeCommentMatch.id].length === 0) ? (
                  <div className="text-center text-gray-500 py-12 text-xs font-medium">No comments posted for this match yet. Be the first to share analysis!</div>
                ) : (
                  matchCommentsStore[activeCommentMatch.id].map((c) => {
                    const canEdit = userProfile.role === 'admin' || (currentUser && c.user_id === currentUser.id);
                    return (
                      <div key={c.id} className="bg-[#1f2937] border border-[#374151] p-4 rounded-2xl space-y-2 flex gap-3 items-start">
                        <div className="w-9 h-9 rounded-full bg-[#10b981]/20 text-[#10b981] font-bold flex items-center justify-center text-xs font-cyber flex-shrink-0">{getFirstNameInitials(c.user)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#10b981] font-cyber">{sanitizeInput(c.user)}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500">{sanitizeInput(c.time)}</span>
                              {canEdit && (
                                <button onClick={() => deleteComment(c.id)} className="text-[10px] text-red-400 hover:underline">Delete</button>
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

              <div className="bg-[#0b0f19] p-4 rounded-2xl border border-[#374151] space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Post Public Comment</h4>
                <div className="flex gap-3">
                  <textarea value={commentInput} onChange={(e) => setCommentInput(e.target.value)} rows={2} placeholder="Write detailed comment to be recorded in database..." className="flex-1 bg-[#1f2937] border border-[#374151] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#10b981]" />
                  <button onClick={submitFullscreenComment} className="bg-[#10b981] text-black font-extrabold px-6 py-2 rounded-xl text-xs hover:bg-[#059669] transition self-end">Post Comment</button>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#374151]">
                <button onClick={() => setCommentsModalOpen(false)} className="bg-[#10b981] text-black font-bold px-6 py-2.5 rounded-full text-xs">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* See More Directory Modal */}
        {statsModalOpen && (
          <div className="fixed inset-0 bg-[#0b0f19]/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">
            <div className="max-w-5xl mx-auto bg-[#111827] border border-[#374151] rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">
              <button onClick={() => setStatsModalOpen(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-[#1f2937] border border-[#374151] text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              <div className="space-y-6">
                <div className="border-b border-[#374151] pb-4 border-l-4 border-[#10b981] pl-3">
                  <h3 className="text-2xl font-extrabold text-[#10b981] uppercase tracking-wider font-cyber">{statsModalTitle}</h3>
                  <p className="text-xs text-gray-400 mt-1">Dataset display.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[65vh] overflow-y-auto pr-2">
                  {statsModalDataset.map((item, idx) => (
                    <div key={idx} className="bg-[#1f2937] border border-[#374151] p-4 rounded-xl space-y-2">
                      <h4 className="font-bold text-white text-sm font-cyber">{sanitizeInput(item.teams || item.title || 'Item')}</h4>
                      <p className="text-xs text-gray-400">{sanitizeInput(item.league || item.prediction || item.match_date || '')}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-[#374151] flex justify-end">
                <button onClick={() => setStatsModalOpen(false)} className="bg-[#10b981] text-black font-bold px-6 py-2.5 rounded-full text-xs">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Match Details Modal */}
        {fullscreenMatchModalOpen && activeFullscreenMatch && (
          <div className="fixed inset-0 bg-[#0b0f19]/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">
            <div className="max-w-5xl mx-auto bg-[#111827] border border-[#374151] rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">
              <button onClick={() => setFullscreenMatchModalOpen(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-[#1f2937] border border-[#374151] text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              
              <div className="space-y-8">
                <div className="flex justify-between items-start border-b border-[#374151] pb-6 border-l-4 border-[#10b981] pl-3">
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">INTEL</span>
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-white mt-2 font-cyber hover:text-[#10b981] cursor-pointer" onClick={() => openGoogleSearchIframe(`Live analysis ${sanitizeInput(activeFullscreenMatch.teams)}`)}>{sanitizeInput(activeFullscreenMatch.teams || 'Unknown Match')}</h2>
                    <p className="text-xs text-gray-400 mt-1 font-mono">Date: {sanitizeInput(activeFullscreenMatch.match_date || '')} | Kickoff: {sanitizeInput(activeFullscreenMatch.match_time || '')}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 uppercase tracking-widest block font-cyber">Confidence</span>
                    <span className="text-2xl">{'⭐'.repeat(Math.min(Number(activeFullscreenMatch.confidence_stars) || 0, 5))}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#0b0f19] p-5 rounded-2xl border border-[#374151] space-y-2">
                    <span className="text-xs text-[#10b981] font-bold uppercase tracking-wider font-cyber">Prediction</span>
                    <p className="text-xl font-extrabold text-white font-cyber">{sanitizeInput(activeFullscreenMatch.prediction || 'N/A')}</p>
                  </div>
                  <div className="bg-[#0b0f19] p-5 rounded-2xl border border-[#374151] space-y-2">
                    <span className="text-xs text-amber-400 font-bold uppercase tracking-wider font-cyber">Decimal Odds</span>
                    <p className="text-xl font-extrabold text-white font-cyber">{formatOdds(activeFullscreenMatch.decimal_odds)}</p>
                  </div>
                  <div className="bg-[#0b0f19] p-5 rounded-2xl border border-[#374151] space-y-2">
                    <span className="text-xs text-blue-400 font-bold uppercase tracking-wider font-cyber">Status & Score</span>
                    <p className="text-xl font-extrabold text-white font-cyber">{sanitizeInput(activeFullscreenMatch.status || 'PENDING')} ({sanitizeInput(activeFullscreenMatch.final_score || 'Awaiting')})</p>
                  </div>
                </div>

                <div className="bg-[#0b0f19] p-6 rounded-2xl border border-[#374151] space-y-3">
                  <h4 className="font-extrabold text-sm uppercase tracking-wider text-[#10b981] font-cyber">Tactical Intelligence & Match Analysis</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{sanitizeInput(activeFullscreenMatch.analysis_text || 'No tactical analysis available.')}</p>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[#374151] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button onClick={() => { setFullscreenMatchModalOpen(false); setActiveMatchChat({ id: activeFullscreenMatch.id, teams: activeFullscreenMatch.teams }); setMatchChatModalOpen(true); }} className="bg-[#1f2937] border border-[#374151] text-gray-200 px-4 py-2 rounded-xl text-xs hover:text-[#10b981] flex items-center gap-2">💬 Open Chat</button>
                  <button onClick={() => setDialingModalOpen(true)} className="bg-[#10b981]/10 border border-[#10b981] text-[#10b981] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#10b981] hover:text-black transition">📞 Call</button>
                </div>
                <button onClick={() => setFullscreenMatchModalOpen(false)} className="bg-[#10b981] text-black font-bold px-6 py-2.5 rounded-full text-xs">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Match Telegram Chat Modal */}
        {matchChatModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#374151] rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="bg-[#0b0f19] p-4 border-b border-[#374151] flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#10b981] font-cyber">Telegram Match Thread: {activeMatchChat.teams}</h4>
                  <p className="text-[10px] text-gray-400">Match discussion Group</p>
                </div>
                <button onClick={() => setMatchChatModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>
              </div>
              
              <div ref={matchChatScrollRef} className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
                {(!matchChatStore[activeMatchChat.id] || matchChatStore[activeMatchChat.id].length === 0) ? (
                  <div className="text-center text-gray-500 text-xs py-8">No messages in this match chat thread yet.</div>
                ) : (
                  matchChatStore[activeMatchChat.id].map((msg) => {
                    const isMe = currentUser && msg.user_id === currentUser.id;
                    const canEdit = userProfile.role === 'admin' || isMe;
                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div className="text-[9px] text-gray-400 mb-0.5 px-1 flex items-center gap-2">
                          <span>{sanitizeInput(msg.user)} • {sanitizeInput(msg.time)}</span>
                          {canEdit && (
                            <button onClick={() => deleteChatMessage(msg.id)} className="text-red-400 hover:underline">Delete</button>
                          )}
                        </div>
                        <div className={`px-3.5 py-2 text-xs ${isMe ? 'bg-gradient-to-r from-[#059669] to-[#10b981] text-white rounded-2xl rounded-tr-sm shadow' : 'bg-[#1f2937] border border-[#374151] text-gray-100 rounded-2xl rounded-tl-sm shadow'}`}>
                          {sanitizeInput(msg.text)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="p-3 border-t border-[#374151] bg-[#0b0f19] flex gap-2">
                <input type="text" value={matchChatInput} onChange={(e) => setMatchChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMatchChatMessage()} placeholder="Discuss this match..." className="flex-1 bg-[#1f2937] border border-[#374151] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]" />
                <button onClick={sendMatchChatMessage} className="bg-[#10b981] text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-[#059669] transition">Post</button>
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
                    <h3 className="text-lg font-bold font-cyber text-white">Live Call Centre</h3>
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

        {/* Admin Content Management Modal */}
        {adminModalOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#374151] rounded-2xl w-full max-w-2xl p-8 space-y-6 shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-[#374151] pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-[#10b981] uppercase tracking-wider font-cyber">Admin Content Management</h3>
                  <p className="text-xs text-gray-400">Insert or update Record [{adminSection}]</p>
                </div>
                <button onClick={() => setAdminModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-xl">✕</button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-xs">
                {adminSection === 'matches' && (
                  <>
                    <div>
                      <label className="block text-gray-400 mb-1">Teams (e.g. Arsenal vs Chelsea)</label>
                      <input type="text" value={adminFormData.teams || ''} onChange={(e) => setAdminFormData({ ...adminFormData, teams: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">League</label>
                      <input type="text" value={adminFormData.league || ''} onChange={(e) => setAdminFormData({ ...adminFormData, league: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 mb-1">Match Date (YYYY-MM-DD)</label>
                        <input type="text" value={adminFormData.match_date || ''} onChange={(e) => setAdminFormData({ ...adminFormData, match_date: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">Match Time (HH:MM)</label>
                        <input type="text" value={adminFormData.match_time || ''} onChange={(e) => setAdminFormData({ ...adminFormData, match_time: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-gray-400 mb-1">Prediction</label>
                        <input type="text" value={adminFormData.prediction || ''} onChange={(e) => setAdminFormData({ ...adminFormData, prediction: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">Decimal Odds</label>
                        <input type="number" step="0.01" value={adminFormData.decimal_odds || ''} onChange={(e) => setAdminFormData({ ...adminFormData, decimal_odds: parseFloat(e.target.value) })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">Confidence Stars (1-5)</label>
                        <input type="number" min="1" max="5" value={adminFormData.confidence_stars || ''} onChange={(e) => setAdminFormData({ ...adminFormData, confidence_stars: parseInt(e.target.value, 10) })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Analysis Text</label>
                      <textarea rows={3} value={adminFormData.analysis_text || ''} onChange={(e) => setAdminFormData({ ...adminFormData, analysis_text: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                    </div>
                  </>
                )}

                {adminSection === 'fixtures' && (
                  <>
                    <div>
                      <label className="block text-gray-400 mb-1">Teams</label>
                      <input type="text" value={adminFormData.teams || ''} onChange={(e) => setAdminFormData({ ...adminFormData, teams: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">League</label>
                      <input type="text" value={adminFormData.league || ''} onChange={(e) => setAdminFormData({ ...adminFormData, league: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 mb-1">Match Date</label>
                        <input type="text" value={adminFormData.match_date || ''} onChange={(e) => setAdminFormData({ ...adminFormData, match_date: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">Match Time</label>
                        <input type="text" value={adminFormData.match_time || ''} onChange={(e) => setAdminFormData({ ...adminFormData, match_time: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                      </div>
                    </div>
                  </>
                )}

                {adminSection === 'trending' && (
                  <>
                    <div>
                      <label className="block text-gray-400 mb-1">Headline Title</label>
                      <input type="text" value={adminFormData.title || ''} onChange={(e) => setAdminFormData({ ...adminFormData, title: e.target.value })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Rank (#)</label>
                      <input type="number" value={adminFormData.rank || ''} onChange={(e) => setAdminFormData({ ...adminFormData, rank: parseInt(e.target.value, 10) })} className="w-full bg-[#0b0f19] border border-[#374151] rounded-xl p-2.5 text-white" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-4 border-t border-[#374151] pt-4">
                <button onClick={() => setAdminModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs bg-gray-800 text-gray-300 hover:bg-gray-700">Cancel</button>
                <button onClick={saveAdminEntry} className="px-6 py-2.5 rounded-xl text-xs bg-[#10b981] text-black font-extrabold hover:bg-[#059669] transition">Save Entry</button>
              </div>
            </div>
          </div>
        )}

        {/* User Preferences Settings Modal */}
        {settingsModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] border border-[#374151] rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-[#374151] pb-3">
                <h3 className="text-base font-bold text-[#10b981] uppercase tracking-wider font-cyber">User Preferences</h3>
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
                <div className="flex items-center justify-between pt-2">
                  <span className="text-gray-300">CONTRAST MODE</span>
                  <input type="checkbox" checked={userProfile.high_contrast} onChange={(e) => setUserProfile({ ...userProfile, high_contrast: e.target.checked })} className="w-4 h-4 accent-[#10b981]" />
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
