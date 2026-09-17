import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE CLIENT INITIALIZATION ---
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIicwcyIsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- UTILITY & SECURITY FUNCTIONS ---
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
    let timeText = String(timeValue).trim().replace(/(.\d+)?$/, '');
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

export default function App() {
  // State definitions
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

  const [activeMatchTab, setActiveMatchTab] = useState('future');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');

  // UI Control Modals & Overlays
  const [toasts, setToasts] = useState([]);
  const [loader, setLoader] = useState({ active: true, text: 'initializing secure intelligence core...', progress: 15 });
  const [dbError, setDbError] = useState(null);
  const [sideNavOpen, setSideNavOpen] = useState(false);

  const [reactionUsersModal, setReactionUsersModal] = useState({ open: false, type: '', matchId: null });
  const [googleIframeModal, setGoogleIframeModal] = useState({ open: false, query: '' });
  const [globalChatOpen, setGlobalChatOpen] = useState(false);
  const [globalChatInput, setGlobalChatInput] = useState('');

  const [fullscreenCommentsModal, setFullscreenCommentsModal] = useState({ open: false, matchId: null, teams: '' });
  const [fullscreenCommentInput, setFullscreenCommentInput] = useState('');

  const [statsListModal, setStatsListModal] = useState({ open: false, title: '', dataset: [] });
  const [fullscreenMatchModal, setFullscreenMatchModal] = useState({ open: false, match: null });
  const [matchChatModal, setMatchChatModal] = useState({ open: false, matchId: null, teams: '' });
  const [matchChatInput, setMatchChatInput] = useState('');

  const [dialingModalOpen, setDialingModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [adminModal, setAdminModal] = useState({ open: false, section: null, item: null });

  // Admin Form States
  const [adminFormData, setAdminFormData] = useState({});

  const canvasRef = useRef(null);

  // Toast Function
  const showToast = (message, isError = true) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
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
      table,
      operation,
      diagnosis,
      action,
      details: JSON.stringify(error, null, 2)
    });
  };

  // --- 4D THREE.JS CANVAS ANIMATION ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
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
    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      torusKnot.rotation.x += 0.003 + mouseY * 0.1;
      torusKnot.rotation.y += 0.005 + mouseX * 0.1;
      particleMesh.rotation.y -= 0.001;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // --- INITIAL DATA & SUPABASE SESSION GUARD ---
  useEffect(() => {
    async function initApp() {
      setLoader({ active: true, text: 'validating Supabase session...', progress: 15 });

      const authenticated = await checkUserSession();
      if (!authenticated) return; // Strict session check failure redirection handled inside checkUserSession

      setLoader({ active: true, text: 'fetching neural feeds...', progress: 40 });
      await loadDatabaseReactions();

      await Promise.all([
        loadMatchesFromDB(),
        loadFixturesFromDB(),
        loadTrendingFromDB(),
        loadDatabaseComments(),
        loadDatabaseChats()
      ]);

      setLoader({ active: true, text: 'sync complete', progress: 100 });
      setTimeout(() => setLoader((prev) => ({ ...prev, active: false })), 300);
    }

    initApp();

    const channelChats = db.channel('public:chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, loadDatabaseChats)
      .subscribe();

    const channelComments = db.channel('public:comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, loadDatabaseComments)
      .subscribe();

    const channelReactions = db.channel('public:reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, async () => {
        await loadDatabaseReactions();
        await loadMatchesFromDB();
      })
      .subscribe();

    return () => {
      db.removeChannel(channelChats);
      db.removeChannel(channelComments);
      db.removeChannel(channelReactions);
    };
  }, []);

  // Live match dynamic updater interval
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

  async function checkUserSession() {
    try {
      const { data: { session }, error: sessionError } = await db.auth.getSession();
      if (sessionError || !session || !session.user) {
        window.location.href = "auth.html";
        return false;
      }

      const user = session.user;
      setCurrentUser(user);

      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('username, name, email, role, is_admin, admin')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        showDatabaseError('profiles', profileError, 'READ_PROFILE');
      }

      const dbName = profile?.name || profile?.username;
      const username = dbName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const email = profile?.email || user.email || 'user@mtl.com';
      const isUserAdmin = profile?.role === 'admin' || profile?.is_admin === true || profile?.admin === true;

      setUserProfile((prev) => ({
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
  }

  async function signOutUser() {
    await db.auth.signOut();
    window.location.href = "auth.html";
  }

  // --- DATABASE DATA LOADERS ---
  async function loadDatabaseReactions() {
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
  }

  async function loadDatabaseComments() {
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
  }

  async function loadDatabaseChats() {
    try {
      const { data, error } = await db.from('chats').select('*').order('created_at', { ascending: true });
      if (error) { showDatabaseError('chats', error, 'READ_CHATS'); return; }
      if (Array.isArray(data)) {
        const globals = [];
        const matches = {};
        data.forEach(msg => {
          const parsed = {
            id: msg.id,
            user_id: msg.user_id,
            user: msg.username || msg.user || 'User',
            text: msg.message || msg.text || '',
            time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'
          };
          if (!msg.match_id) {
            globals.push(parsed);
          } else {
            const mId = String(msg.match_id);
            if (!matches[mId]) matches[mId] = [];
            matches[mId].push(parsed);
          }
        });
        setGlobalChatMessages(globals);
        setMatchChatStore(matches);
      }
    } catch (err) { showDatabaseError('chats', err, 'READ_CHATS'); }
  }

  async function loadMatchesFromDB() {
    try {
      const { data, error } = await db.from('matches').select('*').order('created_at', { ascending: false });
      if (error) { showDatabaseError('matches', error, 'READ_MATCHES'); return; }
      setMatchesData(Array.isArray(data) ? data.map(normalizeMatch) : []);
    } catch (error) { showDatabaseError('matches', error, 'READ_MATCHES'); }
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
      if (error) { showDatabaseError('fixtures', error, 'READ_FIXTURES'); return; }
      setFixturesData(Array.isArray(data) ? data.map(normalizeFixture) : []);
    } catch (error) { showDatabaseError('fixtures', error, 'READ_FIXTURES'); }
  }

  function normalizeFixture(fix) {
    const matchDate = fix.match_date ?? fix.date ?? '';
    const matchTime = fix.match_time ?? fix.time ?? '';
    return { ...fix, match_date: matchDate, match_time: matchTime, badge: fix.badge || getTeamBadge(fix.teams) };
  }

  async function loadTrendingFromDB() {
    try {
      const { data, error } = await db.from('trending').select('*').order('rank', { ascending: true });
      if (error) { showDatabaseError('trending', error, 'READ_TRENDING'); return; }
      setTrendingData(Array.isArray(data) ? data.map(normalizeTrending) : []);
    } catch (error) { showDatabaseError('trending', error, 'READ_TRENDING'); }
  }

  function normalizeTrending(item) {
    return { ...item, rank: item.rank ?? '', title: item.title ?? '', comments_count: item.comments_count ?? item.comments ?? 0 };
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

  // --- INTERACTION & MUTATION HANDLERS ---
  function openGoogleSearchIframe(queryText) {
    setGoogleIframeModal({ open: true, query: queryText });
  }

  function formatOdds(decimalVal) {
    const val = parseFloat(decimalVal);
    if (!Number.isFinite(val) || val <= 1) return 'N/A';
    if (userProfile.odds_format === 'fractional') return `${Math.round((val - 1) * 100)}/100`;
    if (userProfile.odds_format === 'american') return val >= 2.0 ? `+${Math.round((val - 1) * 100)}` : `-${Math.round(100 / (val - 1))}`;
    return val.toFixed(2);
  }

  async function reactToMatch(matchId, type) {
    const mId = String(matchId);
    const userId = currentUser?.id || 'guest';
    const currentReactions = matchReactionsMap[mId] || [];
    const userPrev = currentReactions.find(r => r.user_id === userId);

    let updatedReactions = [...currentReactions];

    if (userPrev) {
      if (userPrev.reaction === type) {
        updatedReactions = updatedReactions.filter(r => r.user_id !== userId);
        try { await db.from('reactions').delete().eq('match_id', matchId).eq('user_id', userId); } catch (e) {}
      } else {
        userPrev.reaction = type;
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
      updatedReactions.push({ user_id: userId, username: userProfile.username, reaction: type });
      try {
        await db.from('reactions').insert([{
          match_id: matchId,
          user_id: userId,
          username: userProfile.username,
          reaction_type: type
        }]);
      } catch (e) {}
    }

    setMatchReactionsMap(prev => ({ ...prev, [mId]: updatedReactions }));
  }

  async function submitFullscreenComment() {
    if (!fullscreenCommentInput.trim() || !fullscreenCommentsModal.matchId) {
      showToast("Please enter a non-empty comment.");
      return;
    }

    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({
        match_id: fullscreenCommentsModal.matchId,
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
      }
    } catch (err) {
      showToast(err.message || "Error occurred while posting comment.");
    } finally {
      setFullscreenCommentInput('');
      setLoader(prev => ({ ...prev, active: false }));
    }
  }

  async function editComment(commentId) {
    const comments = matchCommentsStore[fullscreenCommentsModal.matchId] || [];
    const comment = comments.find(c => String(c.id) === String(commentId));
    if (!comment) return;

    const newText = window.prompt("Edit your comment:", comment.comment);
    if (newText === null) return;
    if (newText.trim() === '') {
      showToast("Comment cannot be empty.");
      return;
    }

    try {
      const cleanText = sanitizeInput(newText.trim());
      const { error } = await db.from('comments').update({ comment: cleanText }).eq('id', commentId);
      if (error) {
        showDatabaseError('comments', error, 'UPDATE_COMMENT');
        showToast("Failed to edit comment.");
      } else {
        await loadDatabaseComments();
        showToast("Comment updated!", false);
      }
    } catch (e) { showDatabaseError('comments', e, 'UPDATE_COMMENT'); }
  }

  async function deleteComment(commentId) {
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
    } catch (e) { showDatabaseError('comments', e, 'DELETE_COMMENT'); }
  }

  async function sendGlobalChatMessage() {
    if (!globalChatInput.trim()) {
      showToast("Chat message cannot be empty.");
      return;
    }

    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({
        username: userProfile.username,
        message: globalChatInput.trim(),
        user_id: currentUser?.id
      });

      const { error } = await db.from('chats').insert([sanitizedPayload]);
      if (error) showDatabaseError('chats', error, 'INSERT_GLOBAL_CHAT');
      else await loadDatabaseChats();
    } catch (err) {
      showToast(err.message || "Security exception blocked message.");
    }

    setGlobalChatInput('');
  }

  async function sendMatchChatMessage() {
    if (!matchChatInput.trim() || !matchChatModal.matchId) {
      showToast("Match message cannot be empty.");
      return;
    }

    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({
        match_id: matchChatModal.matchId,
        username: userProfile.username,
        message: matchChatInput.trim(),
        user_id: currentUser?.id
      });

      const { error } = await db.from('chats').insert([sanitizedPayload]);
      if (error) showDatabaseError('chats', error, 'INSERT_MATCH_CHAT');
      else await loadDatabaseChats();
    } catch (err) {
      showToast(err.message || "Security violation blocked message.");
    }

    setMatchChatInput('');
  }

  async function editChatMessage(chatId, isMatchChat) {
    let msgStore = isMatchChat ? matchChatStore[matchChatModal.matchId] : globalChatMessages;
    const msg = msgStore?.find(m => String(m.id) === String(chatId));
    if (!msg) return;

    const newText = window.prompt("Edit message:", msg.text);
    if (newText === null) return;
    if (newText.trim() === '') {
      showToast("Message cannot be empty.");
      return;
    }

    try {
      const cleanText = sanitizeInput(newText.trim());
      const { error } = await db.from('chats').update({ message: cleanText }).eq('id', chatId);
      if (error) showDatabaseError('chats', error, 'UPDATE_CHAT');
      else {
        await loadDatabaseChats();
        showToast("Message edited.", false);
      }
    } catch (e) { showDatabaseError('chats', e, 'UPDATE_CHAT'); }
  }

  async function deleteChatMessage(chatId) {
    if (!window.confirm("Delete this message?")) return;

    try {
      const { error } = await db.from('chats').delete().eq('id', chatId);
      if (error) showDatabaseError('chats', error, 'DELETE_CHAT');
      else {
        await loadDatabaseChats();
        showToast("Message deleted.", false);
      }
    } catch (e) { showDatabaseError('chats', e, 'DELETE_CHAT'); }
  }

  async function deleteMatchFromDB(id) {
    setLoader({ active: true, text: "Deleting Match Record...", progress: 50 });
    try {
      const { error } = await db.from('matches').delete().eq('id', id);
      if (error) { showDatabaseError('matches', error, 'DELETE_MATCH'); return; }
      await loadMatchesFromDB();
      showToast("Match removed.", false);
    } catch (err) { showDatabaseError('matches', err, 'DELETE_MATCH'); }
    finally { setLoader(prev => ({ ...prev, active: false })); }
  }

  async function deleteFixtureFromDB(id) {
    setLoader({ active: true, text: "Deleting Fixture Record...", progress: 50 });
    try {
      const { error } = await db.from('fixtures').delete().eq('id', id);
      if (error) { showDatabaseError('fixtures', error, 'DELETE_FIXTURE'); return; }
      await loadFixturesFromDB();
      showToast("Fixture removed.", false);
    } catch (err) { showDatabaseError('fixtures', err, 'DELETE_FIXTURE'); }
    finally { setLoader(prev => ({ ...prev, active: false })); }
  }

  async function deleteTrendingFromDB(id) {
    setLoader({ active: true, text: "Deleting Headline...", progress: 50 });
    try {
      const { error } = await db.from('trending').delete().eq('id', id);
      if (error) { showDatabaseError('trending', error, 'READ_TRENDING'); return; }
      await loadTrendingFromDB();
      showToast("Headline removed.", false);
    } catch (err) { showDatabaseError('trending', err, 'READ_TRENDING'); }
    finally { setLoader(prev => ({ ...prev, active: false })); }
  }

  // --- ADMIN MODAL & SAVE HANDLER ---
  function openAdminModal(section, item = null) {
    setAdminModal({ open: true, section, item });
    if (section === 'matches') {
      setAdminFormData({
        teams: item?.teams || '',
        league: item?.league || '',
        match_date: item?.match_date || '',
        match_time: item?.match_time || '',
        prediction: item?.prediction || '',
        decimal_odds: item?.decimal_odds || '',
        prob_home: item?.prob_home || '',
        prob_draw: item?.prob_draw || '',
        prob_away: item?.prob_away || '',
        type: item?.type || 'free',
        confidence_stars: item?.confidence_stars || 3,
        analysis_text: item?.analysis_text || ''
      });
    } else if (section === 'fixtures') {
      setAdminFormData({
        teams: item?.teams || '',
        league: item?.league || '',
        match_date: item?.match_date || '',
        match_time: item?.match_time || ''
      });
    } else if (section === 'trending') {
      setAdminFormData({
        rank: item?.rank || '',
        title: item?.title || '',
        comments_count: item?.comments_count || 0
      });
    }
  }

  async function saveAdminEntry() {
    setLoader({ active: true, text: "Saving Admin Data...", progress: 50 });
    try {
      const payload = verifyHackLocksAndSanitize({ ...adminFormData });
      let err = null;

      if (adminModal.section === 'matches') {
        if (adminModal.item?.id) {
          const { error } = await db.from('matches').update(payload).eq('id', adminModal.item.id);
          err = error;
        } else {
          const { error } = await db.from('matches').insert([payload]);
          err = error;
        }
        await loadMatchesFromDB();
      } else if (adminModal.section === 'fixtures') {
        if (adminModal.item?.id) {
          const { error } = await db.from('fixtures').update(payload).eq('id', adminModal.item.id);
          err = error;
        } else {
          const { error } = await db.from('fixtures').insert([payload]);
          err = error;
        }
        await loadFixturesFromDB();
      } else if (adminModal.section === 'trending') {
        if (adminModal.item?.id) {
          const { error } = await db.from('trending').update(payload).eq('id', adminModal.item.id);
          err = error;
        } else {
          const { error } = await db.from('trending').insert([payload]);
          err = error;
        }
        await loadTrendingFromDB();
      }

      if (err) {
        showDatabaseError(adminModal.section, err, 'WRITE');
        showToast("Save Failed.");
      } else {
        showToast("Saved successfully!", false);
        setAdminModal({ open: false, section: null, item: null });
      }
    } catch (e) {
      showToast(e.message || "Security exception");
    } finally {
      setLoader(prev => ({ ...prev, active: false }));
    }
  }

  // Filtered Predictions Calculation
  const getFilteredMatches = () => {
    const now = new Date();
    let filtered = matchesData.filter(m => {
      const isFT = String(m.status || '').toUpperCase() === 'FT';
      const kickoff = parseMatchDateTime(m.match_date, m.match_time);
      const isPastDate = kickoff ? kickoff.getTime() < now.getTime() - (120 * 60 * 1000) : false;
      const isPastMatch = isFT || isPastDate;
      return activeMatchTab === 'past' ? isPastMatch : !isPastMatch;
    });

    if (matchSearchQuery.trim()) {
      const query = matchSearchQuery.trim().toLowerCase();
      filtered = filtered.filter(m => {
        return (
          String(m.teams || '').toLowerCase().includes(query) ||
          String(m.match_date || '').toLowerCase().includes(query) ||
          String(m.match_time || '').toLowerCase().includes(query) ||
          String(m.league || '').toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  };

  return (
    <>
      <style>{`
        :root {
          --mtlGreen: #00ff75;
          --mtlDark: #080c14;
          --mtlSurface: #0e1626;
          --mtlCard: #111c2d;
          --mtlCardBorder: rgba(36, 51, 77, 0.7);
          --mtlGreenHover: #00d866;
          --futuristicNeon: #00f0ff;
        }
        .high-contrast-mode { filter: contrast(1.25); }
        
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #080c14; }
        ::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: #00ff75; }

        .pro-card {
          background: rgba(14, 22, 38, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid var(--mtlCardBorder);
          border-radius: 1rem;
          padding: 1.25rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .pro-card:hover {
          transform: translateY(-2px);
          border-color: rgba(0, 255, 117, 0.45);
          box-shadow: 0 14px 38px rgba(0, 255, 117, 0.08), 0 0 15px rgba(0, 255, 117, 0.03);
        }
        .avatar-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, var(--mtlGreen), #064d2c 55%, var(--mtlDark));
          border: 1px solid rgba(0, 255, 117, 0.5);
          color: white;
          box-shadow: 0 0 15px rgba(0, 255, 117, 0.15);
        }
        .btn-see-more {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(0, 255, 117, 0.12);
          border: 1px solid rgba(0, 255, 117, 0.4);
          color: var(--mtlGreen);
          padding: 0.5rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-see-more:hover {
          background: var(--mtlGreen);
          color: black;
          box-shadow: 0 0 15px rgba(0, 255, 117, 0.35);
        }
        .water-progress-container {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.07);
          border-radius: 9999px;
          overflow: hidden;
        }
        .water-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #064d2c, var(--mtlGreen));
          border-radius: 9999px;
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .floating-loader-overlay {
          position: fixed;
          inset: 0;
          background: rgba(8, 12, 20, 0.88);
          backdrop-filter: blur(10px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease;
        }
        .floating-loader-overlay.active {
          opacity: 1;
          pointer-events: auto;
        }
        .loader-card {
          background: var(--mtlSurface);
          border: 1px solid var(--mtlCardBorder);
          padding: 2rem;
          border-radius: 1.25rem;
          width: 320px;
          text-align: center;
          box-shadow: 0 25px 60px rgba(0,0,0,0.6);
        }
        .chat-bubble-me {
          background: rgba(0, 255, 117, 0.16);
          border: 1px solid rgba(0, 255, 117, 0.35);
          border-radius: 1rem 1rem 0.25rem 1rem;
          color: white;
        }
        .chat-bubble-other {
          background: #131f33;
          border: 1px solid rgba(36, 51, 77, 0.8);
          border-radius: 1rem 1rem 1rem 0.25rem;
          color: #f3f4f6;
        }
      `}</style>

      <div className={`min-h-screen flex flex-col justify-between selection:bg-mtlGreen selection:text-black ${userProfile.high_contrast ? 'high-contrast-mode' : ''} bg-[#080c14] text-white font-sans`}>
        <canvas ref={canvasRef} id="bg-4d-canvas" className="fixed top-0 left-0 w-screen h-screen pointer-events-none z-0 opacity-40" />

        <div className="app-content-wrapper flex flex-col min-h-screen justify-between relative z-10">
          <div id="toast-container" className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
              <div
                key={t.id}
                className={`px-4 py-3 rounded-xl border text-xs font-bold shadow-2xl flex items-center gap-2.5 pointer-events-auto transition-all duration-300 ${
                  t.isError ? 'bg-red-950/95 border-red-500/50 text-red-200' : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
                }`}
              >
                <span>{t.isError ? '⚠️' : '✔️'}</span>
                <span>{sanitizeInput(t.message)}</span>
              </div>
            ))}
          </div>

          <div className={`floating-loader-overlay ${loader.active ? 'active' : ''}`}>
            <div className="loader-card space-y-4">
              <div className="flex items-center justify-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-futuristicNeon animate-ping"></span>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#00f0ff] font-mono">QUANTUM SYNC</h4>
              </div>
              <p className="text-sm font-medium text-gray-200">{loader.text}</p>
              <div className="water-progress-container">
                <div className="water-progress-bar" style={{ width: `${loader.progress}%` }}></div>
              </div>
            </div>
          </div>

          {reactionUsersModal.open && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#0e1626] border border-[#00ff75]/50 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative">
                <div className="flex justify-between items-center border-b border-[#24334d] pb-3">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-[#00ff75] font-mono">
                    REACTANTS ({reactionUsersModal.type.toUpperCase()})
                  </h4>
                  <button onClick={() => setReactionUsersModal({ open: false, type: '', matchId: null })} className="text-gray-400 hover:text-white font-bold w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5">✕</button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto text-xs pr-1">
                  {(matchReactionsMap[String(reactionUsersModal.matchId)] || []).filter(r => r.reaction === reactionUsersModal.type).length === 0 ? (
                    <p className="text-gray-500 italic py-4 text-center">No reactions recorded yet.</p>
                  ) : (
                    (matchReactionsMap[String(reactionUsersModal.matchId)] || [])
                      .filter(r => r.reaction === reactionUsersModal.type)
                      .map((u, i) => (
                        <div key={i} className="flex items-center gap-2.5 p-2.5 bg-[#080c14] rounded-xl border border-[#24334d]">
                          <div className="w-6 h-6 avatar-logo text-[10px] font-bold">{getFirstNameInitials(u.username)}</div>
                          <span className="text-xs font-semibold text-gray-200">{sanitizeInput(u.username)}</span>
                        </div>
                      ))
                  )}
                </div>
                <button onClick={() => setReactionUsersModal({ open: false, type: '', matchId: null })} className="w-full bg-[#111c2d] border border-[#24334d] text-gray-300 py-2.5 rounded-xl text-xs font-bold hover:text-white hover:border-[#00ff75]/40 transition">Close</button>
              </div>
            </div>
          )}

          {sideNavOpen && (
            <div onClick={() => setSideNavOpen(false)} className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 transition-opacity"></div>
          )}
          <aside className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-[#0e1626] border-l border-[#24334d] z-50 transform ${sideNavOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-out flex flex-col justify-between p-6 shadow-2xl`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#24334d] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 avatar-logo text-sm font-bold">{getFirstNameInitials(userProfile.username)}</div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{userProfile.username}</h3>
                    <span className="text-[11px] text-gray-400 font-mono">{userProfile.email}</span>
                  </div>
                </div>
                <button onClick={() => setSideNavOpen(false)} className="w-8 h-8 rounded-lg bg-[#080c14] text-gray-400 hover:text-white flex items-center justify-center font-bold">✕</button>
              </div>

              <nav className="space-y-2">
                <a href="/dashboard" className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#00ff75]/10 border border-[#00ff75]/40 text-[#00ff75] hover:bg-[#00ff75] hover:text-black transition text-xs font-bold">
                  <span>⬅️</span> Back to Dashboard
                </a>
                <button onClick={() => { setDialingModalOpen(true); setSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#111c2d] border border-[#24334d] hover:border-[#00ff75]/50 hover:text-[#00ff75] transition text-xs font-semibold text-gray-200">
                  <span>📞</span> Contact Centre
                </button>
                <button onClick={() => { setSettingsModalOpen(true); setSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#111c2d] border border-[#24334d] hover:border-[#00ff75]/50 hover:text-[#00ff75] transition text-xs font-semibold text-gray-200">
                  <span>⚙️</span> Preferences & Settings
                </button>
              </nav>
            </div>

            <div className="pt-6 border-t border-[#24334d]">
              <button onClick={signOutUser} className="w-full bg-red-950/50 text-red-300 border border-red-500/35 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-red-800 hover:text-white transition flex items-center justify-center gap-2">
                <span>❌</span> Sign Out
              </button>
            </div>
          </aside>

          <div id="app-root">
            <header className="border-b border-[#24334d] bg-[#0e1626]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <a href="/dashboard" title="Back to Dashboard" className="w-9 h-9 rounded-xl bg-[#111c2d] border border-[#24334d] text-[#00ff75] flex items-center justify-center font-bold text-xs hover:bg-[#00ff75] hover:text-black transition">⬅️</a>
                  <div className="w-10 h-10 avatar-logo text-sm cursor-pointer" onClick={() => setDialingModalOpen(true)}>
                    {getFirstNameInitials(userProfile.username)}
                  </div>
                  <div>
                    <h1 className="font-extrabold tracking-wide text-base leading-tight text-white uppercase">PREDICTIONS <span className="text-[#00ff75]">HUB</span></h1>
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-mono">Neural Feed Active</span>
                  </div>
                </div>

                <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold tracking-wider uppercase">
                  <a href="/dashboard" className="text-[#00ff75] border-b-2 border-[#00ff75] pb-1 font-bold">DASHBOARD</a>
                  <a href="#live-section" className="text-gray-400 hover:text-white transition">LIVE</a>
                  <a href="#fixtures-section" className="text-gray-400 hover:text-white transition">FIXTURES</a>
                  <a href="#db-matches-section" className="text-gray-400 hover:text-white transition">PREDICTIONS</a>
                  <a href="#trending-section" className="text-gray-400 hover:text-white transition">COMMUNITY</a>
                </nav>

                <div className="flex items-center gap-3">
                  <button onClick={() => setSideNavOpen(true)} title="Menu" className="w-10 h-10 rounded-xl bg-[#111c2d] border border-[#24334d] text-gray-200 flex items-center justify-center hover:border-[#00ff75]/40 hover:text-[#00ff75] transition">
                    ☰
                  </button>
                    
                  <div className="hidden md:flex items-center gap-2.5 bg-[#111c2d] border border-[#24334d] px-3 py-1.5 rounded-full cursor-pointer hover:border-[#00ff75]/40 transition" onClick={() => setSideNavOpen(true)}>
                    <div className="w-6 h-6 avatar-logo text-[10px]">{getFirstNameInitials(userProfile.username)}</div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-200 leading-tight">{userProfile.username}</span>
                      <span className="text-[9px] text-[#00ff75] uppercase font-mono">{userProfile.role}</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <section className="relative overflow-hidden py-10 px-6 border-b border-[#24334d] bg-gradient-to-b from-[#0e1626] to-[#080c14]">
              <div className="max-w-7xl mx-auto text-center relative z-10 space-y-3">
                <span className="inline-block text-[11px] uppercase tracking-[0.22em] text-[#00ff75] font-extrabold bg-[#00ff75]/10 px-4 py-1.5 rounded-full border border-[#00ff75]/25">
                  Sports Analytics & 4D Intelligence
                </span>
                <h2 className="text-2xl sm:text-4xl font-black tracking-tight uppercase text-white">FOOTBALL <span className="text-[#00ff75]">INTELLIGENCE</span></h2>
                <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto font-normal leading-relaxed">Real-time stats, AI match predictions, dynamic hotline dialing and secure encrypted feeds.</p>
              </div>
            </section>

            {dbError && (
              <div className="max-w-7xl mx-auto px-6 pt-6">
                <div className="bg-red-950/60 border border-red-500/45 rounded-2xl p-5 shadow-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 text-sm font-bold">⚠</div>
                      <div>
                        <h3 className="font-extrabold text-red-400 text-xs uppercase tracking-widest font-mono">DATABASE ERROR TRACE</h3>
                        <p className="text-xs text-gray-300 mt-0.5">{dbError.operation} Failed • Target Table: <code className="text-red-300 bg-black/30 px-1.5 py-0.5 rounded">{dbError.table}</code></p>
                      </div>
                    </div>
                    <button onClick={() => setDbError(null)} className="text-gray-400 hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5">✕</button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-black/30 border border-red-500/15 rounded-xl p-3.5 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Diagnostic Reason</span>
                      <p className="text-xs text-red-300 font-semibold">{dbError.diagnosis}</p>
                    </div>
                    <div className="bg-black/30 border border-red-500/15 rounded-xl p-3.5 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Recommended Fix</span>
                      <p className="text-xs text-gray-300">{dbError.action}</p>
                    </div>
                    <div className="bg-black/30 border border-red-500/15 rounded-xl p-3.5 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Technical Trace</span>
                      <pre className="text-[10px] text-red-300 whitespace-pre-wrap break-words max-h-24 overflow-y-auto font-mono">{dbError.details}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
              <section id="live-section">
                <div className="flex items-center justify-between mb-5 section-header">
                  <div>
                    <h3 className="font-extrabold text-base uppercase tracking-wider text-white flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span> LIVE MATCHES
                    </h3>
                    <span className="text-xs text-gray-400 font-mono mt-0.5 block">{liveMatchesData.length} Matches Active</span>
                  </div>
                  <button onClick={() => setStatsListModal({ open: true, title: 'Live Games Directory', dataset: liveMatchesData })} className="btn-see-more">
                    <span>SEE MORE MATCHES</span> ➔
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {liveMatchesData.length === 0 ? (
                    <div className="col-span-3 text-center py-10 pro-card">
                      <p className="text-xs text-gray-400">No live matches currently in play.</p>
                    </div>
                  ) : (
                    liveMatchesData.slice(0, 3).map((match) => {
                      const home = String(match.teams).split(/\s+vs\.?\s+/i)[0] || 'HOME';
                      const away = String(match.teams).split(/\s+vs\.?\s+/i)[1] || 'AWAY';
                      return (
                        <div
                          key={match.id}
                          onClick={() => setFullscreenMatchModal({ open: true, match })}
                          className="pro-card relative overflow-hidden cursor-pointer space-y-4"
                        >
                          <div className="flex justify-between items-center text-xs text-gray-400 font-semibold">
                            <span className="hover:text-[#00ff75] transition font-mono text-[11px]" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Match live summary ${match.teams}`); }}>
                              {sanitizeInput(match.league)}
                            </span>
                            <span className="text-red-400 font-bold font-mono text-[11px] bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">● LIVE</span>
                          </div>
                          
                          <div className="flex items-center justify-between my-3 py-1">
                            <div className="text-center flex-1 space-y-1.5">
                              <div className="w-10 h-10 mx-auto avatar-logo text-xs font-bold">{getTeamBadge(home)}</div>
                              <span className="text-xs font-bold tracking-tight text-white block truncate px-1">{sanitizeInput(home)}</span>
                            </div>
                            <div className="text-xl font-black tracking-widest px-2 font-mono text-[#00ff75]">- _ -</div>
                            <div className="text-center flex-1 space-y-1.5">
                              <div className="w-10 h-10 mx-auto avatar-logo text-xs font-bold">{getTeamBadge(away)}</div>
                              <span className="text-xs font-bold tracking-tight text-white block truncate px-1">{sanitizeInput(away)}</span>
                            </div>
                          </div>

                          <div className="space-y-1.5 bg-[#080c14]/60 p-3 rounded-xl border border-[#24334d]/60">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-gray-400">Match Clock</span>
                              <span className="font-bold text-[#00ff75] font-mono">{match.minute}</span>
                            </div>
                            <div className="water-progress-container">
                              <div className="water-progress-bar" style={{ width: `${match.progress}%` }}></div>
                            </div>
                          </div>

                          <div className="text-[11px] text-gray-400 pt-3 border-t border-[#24334d]/80 flex justify-between items-center">
                            <span className="truncate pr-2">{sanitizeInput(match.details)}</span>
                            {userProfile.role === 'admin' && (
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button onClick={(e) => { e.stopPropagation(); openAdminModal('matches', match); }} className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg hover:bg-amber-500 hover:text-black font-semibold">Edit</button>
                                <button onClick={(e) => { e.stopPropagation(); deleteMatchFromDB(match.id); }} className="text-[10px] bg-red-600/15 text-red-300 border border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-600 hover:text-white font-semibold">Del</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section id="db-matches-section" className="bg-[#0e1626]/90 backdrop-blur-md border border-[#24334d] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#24334d] pb-5">
                  <div>
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white hover:text-[#00ff75] transition cursor-pointer" onClick={() => openGoogleSearchIframe('Live database matches and football predictions')}>
                      ⚽ MATCHES & PREDICTIONS
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Click team names to run automated search inspection.</p>
                  </div>
                  <button onClick={() => setStatsListModal({ open: true, title: 'All Database Predictions', dataset: matchesData })} className="btn-see-more">
                    <span>SEE MORE</span> ➔
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 bg-[#080c14] p-1.5 rounded-xl border border-[#24334d] self-start">
                    <button onClick={() => setActiveMatchTab('future')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeMatchTab === 'future' ? 'bg-[#00ff75] text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                      UPCOMING MATCHES
                    </button>
                    <button onClick={() => setActiveMatchTab('past')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${activeMatchTab === 'past' ? 'bg-[#00ff75] text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                      PAST PREDICTIONS
                    </button>
                  </div>

                  <div className="relative flex-1 max-w-sm">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 text-xs">🔍</span>
                    <input
                      type="text"
                      value={matchSearchQuery}
                      onChange={(e) => setMatchSearchQuery(e.target.value)}
                      placeholder="Search match, date (YYYY-MM-DD), or league..."
                      className="w-full bg-[#080c14] border border-[#24334d] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff75] transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {getFilteredMatches().length === 0 ? (
                    <div className="col-span-3 text-center py-12 pro-card">
                      <p className="text-xs text-gray-400">No matches found matching query "{matchSearchQuery}".</p>
                    </div>
                  ) : (
                    getFilteredMatches().slice(0, 3).map((match) => {
                      const comments = matchCommentsStore[match.id] || [];
                      const typeClass = String(match.type).toLowerCase() === 'premium' 
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/35' 
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35';
                      const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';
                      const oddsText = match.decimal_odds !== null && match.decimal_odds !== undefined ? formatOdds(match.decimal_odds) : 'N/A';

                      return (
                        <div key={match.id} className="pro-card flex flex-col justify-between space-y-4">
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase font-mono ${typeClass}`}>{sanitizeInput(match.type || 'free')}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-amber-400 font-bold font-mono">Odds: {oddsText}</span>
                                <span className="text-[10px] text-gray-400 font-mono">{sanitizeInput(match.match_date)} {sanitizeInput(match.match_time)}</span>
                              </div>
                            </div>
                            <h4 className="font-extrabold text-sm sm:text-base text-white tracking-tight hover:text-[#00ff75] transition cursor-pointer line-clamp-1" onClick={() => openGoogleSearchIframe(`Prediction summary for ${match.teams}`)}>
                              {sanitizeInput(match.teams)}
                            </h4>
                            <div className="flex items-center justify-between text-xs bg-[#080c14]/50 p-2.5 rounded-lg border border-[#24334d]/50">
                              <span className="text-[#00ff75] font-semibold truncate pr-2">Pred: {sanitizeInput(match.prediction)}</span>
                              <span className="flex-shrink-0 text-[11px]">{stars}</span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{sanitizeInput(match.analysis_text || 'Tactical breakdown in detailed view.')}</p>
                          </div>

                          <div className="space-y-1.5 bg-[#080c14] p-3 rounded-xl border border-[#24334d]">
                            <div className="flex justify-between text-[10px] font-bold text-gray-300 font-mono">
                              <span>Win Probability:</span>
                              <span>H: {match.prob_home}% | D: {match.prob_draw}% | A: {match.prob_away}%</span>
                            </div>
                            <div className="water-progress-container">
                              <div className="water-progress-bar" style={{ width: `${match.prob_home}%` }}></div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button onClick={() => reactToMatch(match.id, 'fire')} className="bg-[#080c14] border border-[#24334d] px-2.5 py-1 rounded-lg text-xs hover:border-[#00ff75]/50 flex items-center gap-1 transition">
                              🔥 <span className="font-mono text-[11px]">{match.reactions?.fire || 0}</span>
                            </button>
                            <button onClick={() => reactToMatch(match.id, 'heart')} className="bg-[#080c14] border border-[#24334d] px-2.5 py-1 rounded-lg text-xs hover:border-[#00ff75]/50 flex items-center gap-1 transition">
                              ❤️ <span className="font-mono text-[11px]">{match.reactions?.heart || 0}</span>
                            </button>
                            <button onClick={() => reactToMatch(match.id, 'dislike')} className="bg-[#080c14] border border-[#24334d] px-2.5 py-1 rounded-lg text-xs hover:border-[#00ff75]/50 flex items-center gap-1 transition">
                              👎 <span className="font-mono text-[11px]">{match.reactions?.dislike || 0}</span>
                            </button>
                          </div>

                          <div onClick={() => setFullscreenCommentsModal({ open: true, matchId: match.id, teams: match.teams })} className="bg-[#080c14] rounded-xl p-3 space-y-2 border border-[#24334d] hover:border-[#00ff75]/50 transition cursor-pointer">
                            <div className="flex justify-between items-center text-[11px] font-bold text-gray-300">
                              <span>💬 Comments ({comments.length})</span>
                              <span className="text-[#00ff75] text-[10px] uppercase font-bold tracking-wider">Fullscreen View ➔</span>
                            </div>
                            <div className="space-y-1.5 max-h-20 overflow-y-auto text-[11px] pr-1">
                              {comments.length === 0 ? <p className="text-gray-500 italic text-[10px]">No comments yet. Click to start discussion.</p> : null}
                              {comments.slice(-2).map((c) => (
                                <div key={c.id} className="bg-[#111c2d] p-1.5 rounded-lg border border-[#24334d]/60 text-gray-300 truncate">
                                  <span className="font-bold text-[#00ff75]">{sanitizeInput(c.user)}:</span> {sanitizeInput(c.comment)}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-[#24334d] flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button onClick={() => setFullscreenMatchModal({ open: true, match })} className="bg-[#00ff75]/15 border border-[#00ff75]/40 text-[#00ff75] hover:bg-[#00ff75] hover:text-black font-bold px-3 py-1.5 rounded-xl text-xs transition">🔍 Details</button>
                              <button onClick={() => setMatchChatModal({ open: true, matchId: match.id, teams: match.teams })} className="bg-[#080c14] border border-[#24334d] px-3 py-1.5 rounded-xl text-xs text-gray-200 hover:text-[#00ff75] hover:border-[#00ff75]/40 transition flex items-center gap-1">💬 Chat</button>
                            </div>
                            {userProfile.role === 'admin' && (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => openAdminModal('matches', match)} className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-amber-500 hover:text-black transition">Edit</button>
                                <button onClick={() => deleteMatchFromDB(match.id)} className="bg-red-600/15 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition">Del</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {userProfile.role === 'admin' && (
                  <div className="pt-4 border-t border-[#24334d] flex justify-center">
                    <button onClick={() => openAdminModal('matches')} className="bg-[#00ff75] text-black font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider hover:bg-[#00d866] transition flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,117,0.3)]">
                      <span>➕</span> ADD PREDICTION
                    </button>
                  </div>
                )}
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section id="fixtures-section" className="bg-[#0e1626]/90 backdrop-blur-md border border-[#24334d] rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-5 shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-5 section-header">
                      <div>
                        <h3 className="font-extrabold uppercase tracking-wider text-base text-white hover:text-[#00ff75] transition cursor-pointer" onClick={() => openGoogleSearchIframe('Upcoming football fixtures schedule')}>
                          UPCOMING FIXTURES
                        </h3>
                        <span className="text-xs text-gray-400 font-mono mt-0.5 block">Schedule roster</span>
                      </div>
                      <button onClick={() => setStatsListModal({ open: true, title: 'Complete Fixtures Schedule', dataset: fixturesData })} className="btn-see-more">
                        <span>SEE MORE</span> ➔
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {fixturesData.length === 0 ? (
                        <div className="text-center py-10 text-xs text-gray-500 pro-card">Loading fixtures...</div>
                      ) : (
                        fixturesData.slice(0, 3).map((fix) => (
                          <div key={fix.id} className="pro-card p-3.5 flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <div className="w-9 h-9 rounded-xl bg-[#080c14] border border-[#24334d] flex items-center justify-center font-bold text-xs text-[#00ff75] font-mono flex-shrink-0">{sanitizeInput(fix.badge)}</div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-white hover:text-[#00ff75] transition truncate" onClick={() => openGoogleSearchIframe(`Fixture schedule ${fix.teams}`)}>{sanitizeInput(fix.teams)}</h4>
                                <span className="text-[10px] text-gray-400 font-mono truncate block">{sanitizeInput(fix.league)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <span className="text-xs font-bold text-[#00ff75] block font-mono">{sanitizeInput(fix.match_time)}</span>
                                <span className="text-[10px] text-gray-500 font-mono">{sanitizeInput(fix.match_date)}</span>
                              </div>
                              {userProfile.role === 'admin' && (
                                <div className="flex gap-1 ml-1">
                                  <button onClick={() => openAdminModal('fixtures', fix)} className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">Edit</button>
                                  <button onClick={() => deleteFixtureFromDB(fix.id)} className="text-[10px] bg-red-600/15 text-red-300 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white">Del</button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {userProfile.role === 'admin' && (
                    <div className="pt-4 border-t border-[#24334d] flex justify-center">
                      <button onClick={() => openAdminModal('fixtures')} className="bg-[#111c2d] border border-[#00ff75]/50 text-[#00ff75] font-bold px-5 py-2 rounded-xl text-xs hover:bg-[#00ff75] hover:text-black transition flex items-center gap-2">
                        <span>➕</span> ADD FIXTURE
                      </button>
                    </div>
                  )}
                </section>

                <section id="trending-section" className="bg-[#0e1626]/90 backdrop-blur-md border border-[#24334d] rounded-2xl p-6 sm:p-7 flex flex-col justify-between space-y-5 shadow-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-5 section-header">
                      <div>
                        <h3 className="font-extrabold uppercase tracking-wider text-base text-white hover:text-[#00ff75] transition cursor-pointer" onClick={() => openGoogleSearchIframe('Trending football news updates')}>
                          🔥 TRENDING NEWS
                        </h3>
                        <span className="text-xs text-gray-400 font-mono mt-0.5 block">Community pulse</span>
                      </div>
                      <button onClick={() => setStatsListModal({ open: true, title: 'All Trending News', dataset: trendingData })} className="btn-see-more">
                        <span>SEE MORE</span> ➔
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {trendingData.length === 0 ? (
                        <div className="text-center py-10 text-xs text-gray-500 pro-card">Loading news...</div>
                      ) : (
                        trendingData.slice(0, 3).map((item) => (
                          <div key={item.id} className="pro-card p-3.5 flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <span className="text-xs font-black text-[#00ff75] font-mono w-7 flex-shrink-0">#{sanitizeInput(item.rank)}</span>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-white hover:text-[#00ff75] transition truncate" onClick={() => openGoogleSearchIframe(item.title)}>{sanitizeInput(item.title)}</h4>
                                <span className="text-[10px] text-gray-400 font-mono">💬 {Number(item.comments_count) || 6237} discussions</span>
                              </div>
                            </div>
                            {userProfile.role === 'admin' && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => openAdminModal('trending', item)} className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">Edit</button>
                                <button onClick={() => deleteTrendingFromDB(item.id)} className="text-[10px] bg-red-600/15 text-red-300 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white">Del</button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {userProfile.role === 'admin' && (
                    <div className="pt-4 border-t border-[#24334d] flex justify-center">
                      <button onClick={() => openAdminModal('trending')} className="bg-[#111c2d] border border-[#00ff75]/50 text-[#00ff75] font-bold px-5 py-2 rounded-xl text-xs hover:bg-[#00ff75] hover:text-black transition flex items-center gap-2">
                        <span>➕</span> ADD NEWS
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </main>

            <footer className="border-t border-[#24334d] bg-[#0e1626]/90 mt-16 py-8 px-6 text-xs text-gray-400">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="font-mono text-[11px]">© 2026 MTL Football Intelligence Hub. All rights reserved.</p>
                <div className="flex items-center gap-6 font-semibold">
                  <a href="/dashboard" className="text-[#00ff75] hover:underline">Dashboard</a>
                  <a href="#" className="hover:text-white transition">Privacy Policy</a>
                  <a href="#" className="hover:text-white transition">Terms of Service</a>
                  <button onClick={() => setDialingModalOpen(true)} className="hover:text-[#00ff75] transition font-mono text-[11px]">Dev: M. Lennox</button>
                </div>
              </div>
            </footer>
          </div>

          {googleIframeModal.open && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col p-4 sm:p-8">
              <div className="bg-[#0e1626] border border-[#24334d] rounded-2xl p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00ff75] text-black font-extrabold flex items-center justify-center font-mono text-xs">AI</div>
                  <div>
                    <h4 className="text-xs font-bold text-[#00ff75] font-mono">GOOGLE QUICK SEARCH</h4>
                    <p className="text-[11px] text-gray-400 font-mono truncate max-w-xs sm:max-w-md">Query: "{googleIframeModal.query}"</p>
                  </div>
                </div>
                <button onClick={() => setGoogleIframeModal({ open: false, query: '' })} className="w-8 h-8 rounded-full bg-red-950 text-red-300 border border-red-500/35 flex items-center justify-center font-bold text-xs hover:bg-red-800 transition">✕</button>
              </div>
              <div className="flex-1 rounded-2xl overflow-hidden border border-[#24334d] bg-white shadow-2xl">
                <iframe
                  className="w-full h-full border-0"
                  src={`https://www.google.com/search?q=${encodeURIComponent(googleIframeModal.query)}&udm=14&igu=1`}
                  title="Google Quick Search"
                />
              </div>
            </div>
          )}

          <div className="fixed bottom-6 right-6 z-40">
            <button onClick={() => setGlobalChatOpen(!globalChatOpen)} className="w-14 h-14 rounded-full bg-[#00ff75] text-black flex items-center justify-center text-xl font-bold shadow-[0_0_25px_rgba(0,255,117,0.4)] hover:scale-105 active:scale-95 transition transform">💬</button>
              
            {globalChatOpen && (
              <div className="absolute bottom-20 right-0 w-80 sm:w-96 bg-[#0e1626] border border-[#24334d] rounded-2xl shadow-2xl flex flex-col h-[480px] overflow-hidden backdrop-blur-xl">
                <div className="bg-[#080c14] p-4 border-b border-[#24334d] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00ff75] animate-pulse"></span>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-white">Community Chat</h4>
                  </div>
                  <button onClick={() => setGlobalChatOpen(false)} className="text-gray-400 hover:text-white font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-white/5">✕</button>
                </div>
                  
                <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
                  {globalChatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs py-10 font-mono">Welcome to Telegram global chat!</div>
                  ) : (
                    globalChatMessages.map(msg => {
                      const isMe = currentUser && msg.user_id === currentUser.id;
                      const canEdit = userProfile.role === 'admin' || isMe;
                      return (
                        <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                          <div className="text-[10px] text-gray-400 mb-1 px-1 flex items-center gap-2 font-mono">
                            <span>{sanitizeInput(msg.user)} • {sanitizeInput(msg.time)}</span>
                            {canEdit && (
                              <div className="flex gap-1.5">
                                <button onClick={() => editChatMessage(msg.id, false)} className="text-amber-400 hover:underline">Edit</button>
                                <button onClick={() => deleteChatMessage(msg.id)} className="text-red-400 hover:underline">Del</button>
                              </div>
                            )}
                          </div>
                          <div className={`px-3.5 py-2 text-xs leading-relaxed ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>
                            {sanitizeInput(msg.text)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                  
                <div className="p-3 border-t border-[#24334d] bg-[#080c14] flex gap-2">
                  <input
                    type="text"
                    value={globalChatInput}
                    onChange={(e) => setGlobalChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendGlobalChatMessage()}
                    placeholder="Type message..."
                    className="flex-1 bg-[#111c2d] border border-[#24334d] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff75]"
                  />
                  <button onClick={sendGlobalChatMessage} className="bg-[#00ff75] text-black font-extrabold px-4 py-2 rounded-xl text-xs hover:bg-[#00d866] transition">Send</button>
                </div>
              </div>
            )}
          </div>

          {fullscreenCommentsModal.open && (
            <div className="fixed inset-0 bg-[#080c14]/95 backdrop-blur-xl z-50 p-4 sm:p-10 overflow-y-auto flex flex-col justify-between">
              <div className="max-w-4xl w-full mx-auto bg-[#0e1626] border border-[#00ff75]/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative flex-1 flex flex-col justify-between space-y-6">
                <div className="flex items-center justify-between border-b border-[#24334d] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#00ff75]/15 border border-[#00ff75]/40 text-[#00ff75] flex items-center justify-center font-bold text-base">💬</div>
                    <div>
                      <h3 className="text-base sm:text-xl font-extrabold text-white">Comments Stream: {fullscreenCommentsModal.teams}</h3>
                      <p className="text-xs text-[#00ff75] font-mono mt-0.5">Verified public match record.</p>
                    </div>
                  </div>
                  <button onClick={() => setFullscreenCommentsModal({ open: false, matchId: null, teams: '' })} className="w-10 h-10 rounded-full bg-[#111c2d] border border-[#24334d] text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 max-h-[55vh]">
                  {(matchCommentsStore[fullscreenCommentsModal.matchId] || []).length === 0 ? (
                    <div className="text-center text-gray-500 py-16 text-xs font-medium pro-card">No comments posted for this match yet. Share your analysis!</div>
                  ) : (
                    (matchCommentsStore[fullscreenCommentsModal.matchId] || []).map(c => {
                      const canEdit = userProfile.role === 'admin' || (currentUser && c.user_id === currentUser.id);
                      return (
                        <div key={c.id} className="bg-[#111c2d]/80 border border-[#24334d] p-4 rounded-2xl space-y-2 flex gap-3.5 items-start">
                          <div className="w-9 h-9 rounded-full bg-[#00ff75]/15 border border-[#00ff75]/30 text-[#00ff75] font-bold flex items-center justify-center text-xs flex-shrink-0">{getFirstNameInitials(c.user)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-[#00ff75] truncate">{sanitizeInput(c.user)}</span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] text-gray-500 font-mono">{sanitizeInput(c.time)}</span>
                                {canEdit && (
                                  <>
                                    <button onClick={() => editComment(c.id)} className="text-[10px] text-amber-400 hover:underline">Edit</button>
                                    <button onClick={() => deleteComment(c.id)} className="text-[10px] text-red-400 hover:underline">Del</button>
                                  </>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-200 mt-1.5 leading-relaxed break-words">{sanitizeInput(c.comment)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="bg-[#080c14] p-4 sm:p-5 rounded-2xl border border-[#24334d] space-y-3">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">Post Public Comment</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <textarea
                      rows={2}
                      value={fullscreenCommentInput}
                      onChange={(e) => setFullscreenCommentInput(e.target.value)}
                      placeholder="Write detailed analytical comment..."
                      className="flex-1 bg-[#111c2d] border border-[#24334d] rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff75] resize-none"
                    />
                    <button onClick={submitFullscreenComment} className="bg-[#00ff75] text-black font-extrabold px-6 py-2.5 rounded-xl text-xs hover:bg-[#00d866] transition self-end sm:self-auto flex-shrink-0 shadow-md">Post Comment</button>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-[#24334d]">
                  <button onClick={() => setFullscreenCommentsModal({ open: false, matchId: null, teams: '' })} className="btn-see-more">Close View</button>
                </div>
              </div>
            </div>
          )}

          {statsListModal.open && (
            <div className="fixed inset-0 bg-[#080c14]/95 backdrop-blur-md z-50 overflow-y-auto p-4 sm:p-10">
              <div className="max-w-5xl mx-auto bg-[#0e1626] border border-[#24334d] rounded-2xl p-6 sm:p-8 shadow-2xl relative min-h-[80vh] flex flex-col justify-between">
                <button onClick={() => setStatsListModal({ open: false, title: '', dataset: [] })} className="absolute top-6 right-6 w-9 h-9 rounded-full bg-[#111c2d] border border-[#24334d] text-gray-400 hover:text-white flex items-center justify-center font-bold">✕</button>
                <div className="space-y-6">
                  <div className="border-b border-[#24334d] pb-4">
                    <h3 className="text-xl sm:text-2xl font-black text-[#00ff75] uppercase tracking-wider">{statsListModal.title}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-1">Directory count: {statsListModal.dataset.length} records</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
                    {statsListModal.dataset.length === 0 ? (
                      <div className="lg:col-span-3 text-center py-16 text-xs text-gray-500 pro-card">No records registered in active namespace.</div>
                    ) : (
                      statsListModal.dataset.map((item, idx) => (
                        <div key={idx} className="pro-card space-y-2">
                          <h4 className="font-bold text-white text-xs sm:text-sm">{sanitizeInput(item.teams || item.title || 'Record Item')}</h4>
                          {item.prediction && <p className="text-xs text-[#00ff75] font-semibold">Pred: {item.prediction}</p>}
                          {item.league && <p className="text-[11px] text-gray-400 font-mono">{item.league}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="mt-8 pt-5 border-t border-[#24334d] flex justify-end">
                  <button onClick={() => setStatsListModal({ open: false, title: '', dataset: [] })} className="btn-see-more">Close Directory</button>
                </div>
              </div>
            </div>
          )}

          {fullscreenMatchModal.open && fullscreenMatchModal.match && (
            <div className="fixed inset-0 bg-[#080c14]/95 backdrop-blur-md z-50 overflow-y-auto p-4 sm:p-10">
              <div className="max-w-5xl mx-auto bg-[#0e1626] border border-[#24334d] rounded-2xl p-6 sm:p-10 shadow-2xl relative min-h-[80vh] flex flex-col justify-between space-y-8">
                <button onClick={() => setFullscreenMatchModal({ open: false, match: null })} className="absolute top-6 right-6 w-9 h-9 rounded-full bg-[#111c2d] border border-[#24334d] text-gray-400 hover:text-white flex items-center justify-center font-bold">✕</button>
                  
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-[#24334d] pb-6">
                    <div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase font-mono bg-[#00ff75]/15 text-[#00ff75] border border-[#00ff75]/35">
                        {fullscreenMatchModal.match.type || 'free'} INTEL
                      </span>
                      <h2 className="text-2xl sm:text-4xl font-black text-white mt-3 hover:text-[#00ff75] transition cursor-pointer" onClick={() => openGoogleSearchIframe(`Live analysis ${fullscreenMatchModal.match.teams}`)}>
                        {sanitizeInput(fullscreenMatchModal.match.teams)}
                      </h2>
                      <p className="text-xs text-gray-400 mt-1 font-mono">Date: {fullscreenMatchModal.match.match_date} | Kickoff: {fullscreenMatchModal.match.match_time}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-mono">Confidence Rating</span>
                      <span className="text-xl sm:text-2xl mt-1 block">{'⭐'.repeat(Math.min(Number(fullscreenMatchModal.match.confidence_stars || 0), 5)) || '—'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-[#080c14] p-5 rounded-2xl border border-[#24334d] space-y-1.5">
                      <span className="text-[11px] text-[#00ff75] font-bold uppercase tracking-wider font-mono">AI Prediction</span>
                      <p className="text-lg sm:text-xl font-black text-white">{sanitizeInput(fullscreenMatchModal.match.prediction || 'N/A')}</p>
                    </div>
                    <div className="bg-[#080c14] p-5 rounded-2xl border border-[#24334d] space-y-1.5">
                      <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider font-mono">Decimal Odds</span>
                      <p className="text-lg sm:text-xl font-black text-white font-mono">{formatOdds(fullscreenMatchModal.match.decimal_odds)}</p>
                    </div>
                    <div className="bg-[#080c14] p-5 rounded-2xl border border-[#24334d] space-y-1.5">
                      <span className="text-[11px] text-blue-400 font-bold uppercase tracking-wider font-mono">Status & Score</span>
                      <p className="text-lg sm:text-xl font-black text-white font-mono">{sanitizeInput(fullscreenMatchModal.match.status || 'PENDING')} ({sanitizeInput(fullscreenMatchModal.match.final_score || 'Awaiting')})</p>
                    </div>
                  </div>

                  <div className="bg-[#080c14] p-6 rounded-2xl border border-[#24334d] space-y-3">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#00ff75] font-mono">Tactical Intelligence & Match Analysis</h4>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">{sanitizeInput(fullscreenMatchModal.match.analysis_text || 'No tactical analysis available.')}</p>
                  </div>
                </div>

                <div className="pt-5 border-t border-[#24334d] flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setMatchChatModal({ open: true, matchId: fullscreenMatchModal.match.id, teams: fullscreenMatchModal.match.teams }); setFullscreenMatchModal({ open: false, match: null }); }} className="bg-[#111c2d] border border-[#24334d] text-gray-200 px-4 py-2 rounded-xl text-xs hover:text-[#00ff75] hover:border-[#00ff75]/40 transition flex items-center gap-1.5">💬 Open Chat</button>
                    <button onClick={() => setDialingModalOpen(true)} className="bg-[#00ff75]/15 border border-[#00ff75]/40 text-[#00ff75] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#00ff75] hover:text-black transition">📞 Call Support</button>
                  </div>
                  <button onClick={() => setFullscreenMatchModal({ open: false, match: null })} className="btn-see-more">Close</button>
                </div>
              </div>
            </div>
          )}

          {matchChatModal.open && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#0e1626] border border-[#24334d] rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="bg-[#080c14] p-4 border-b border-[#24334d] flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#00ff75] font-mono">Match Thread: {matchChatModal.teams}</h4>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">Encrypted match context group</p>
                  </div>
                  <button onClick={() => setMatchChatModal({ open: false, matchId: null, teams: '' })} className="text-gray-400 hover:text-white font-bold w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5">✕</button>
                </div>
                  
                <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
                  {(matchChatStore[matchChatModal.matchId] || []).length === 0 ? (
                    <div className="text-center text-gray-500 text-xs py-12 font-mono">No messages in this match chat thread yet.</div>
                  ) : (
                    (matchChatStore[matchChatModal.matchId] || []).map((msg) => {
                      const isMe = currentUser && msg.user_id === currentUser.id;
                      const canEdit = userProfile.role === 'admin' || isMe;
                      return (
                        <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                          <div className="text-[10px] text-gray-400 mb-1 px-1 flex items-center gap-2 font-mono">
                            <span>{sanitizeInput(msg.user)} • {sanitizeInput(msg.time)}</span>
                            {canEdit && (
                              <div className="flex gap-1.5">
                                <button onClick={() => editChatMessage(msg.id, true)} className="text-amber-400 hover:underline">Edit</button>
                                <button onClick={() => deleteChatMessage(msg.id)} className="text-red-400 hover:underline">Del</button>
                              </div>
                            )}
                          </div>
                          <div className={`px-3.5 py-2 text-xs leading-relaxed ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>
                            {sanitizeInput(msg.text)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                  
                <div className="p-3 border-t border-[#24334d] bg-[#080c14] flex gap-2">
                  <input
                    type="text"
                    value={matchChatInput}
                    onChange={(e) => setMatchChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMatchChatMessage()}
                    placeholder="Discuss this match..."
                    className="flex-1 bg-[#111c2d] border border-[#24334d] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff75]"
                  />
                  <button onClick={sendMatchChatMessage} className="bg-[#00ff75] text-black font-extrabold px-5 py-2 rounded-xl text-xs hover:bg-[#00d866] transition">Post</button>
                </div>
              </div>
            </div>
          )}

          {dialingModalOpen && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#0e1626] border border-[#24334d] rounded-2xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="flex justify-between items-center border-b border-[#24334d] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00ff75]/15 border border-[#00ff75]/40 text-[#00ff75] flex items-center justify-center text-lg">📞</div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white">Live Call Centre</h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">+254716883895 Direct Desk</p>
                    </div>
                  </div>
                  <button onClick={() => setDialingModalOpen(false)} className="text-gray-400 hover:text-white font-bold w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5">✕</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#080c14] p-4 rounded-xl border border-[#24334d] space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-[#00ff75] tracking-widest font-mono">WHATSAPP</span>
                      <h4 className="font-bold text-xs text-white mt-1">Instant Chat</h4>
                      <p className="text-xs text-gray-400 mt-1">Direct message support queue.</p>
                    </div>
                    <a href="https://wa.me/254716883895" target="_blank" rel="noopener noreferrer" className="w-full bg-[#00ff75] text-black text-center text-xs font-bold py-2.5 rounded-xl hover:bg-[#00d866] transition block">💬 WhatsApp Desk</a>
                  </div>
                  <div className="bg-[#080c14] p-4 rounded-xl border border-[#24334d] space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-widest font-mono">PHONE CALL</span>
                      <h4 className="font-bold text-xs text-white mt-1">Direct Dial</h4>
                      <p className="text-xs text-gray-400 mt-1">Real-time voice engineering line.</p>
                    </div>
                    <a href="tel:+254716883895" className="w-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-center text-xs font-bold py-2.5 rounded-xl hover:bg-amber-500 hover:text-black transition block">📞 Dial +254716883895</a>
                  </div>
                </div>
                <div className="text-center pt-2">
                  <button onClick={() => setDialingModalOpen(false)} className="text-xs text-gray-400 hover:text-white transition">Close Call Centre</button>
                </div>
              </div>
            </div>
          )}

          {settingsModalOpen && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#0e1626] border border-[#24334d] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
                <div className="flex justify-between items-center border-b border-[#24334d] pb-3">
                  <h3 className="text-sm font-bold text-[#00ff75] uppercase tracking-wider font-mono">User Preferences</h3>
                  <button onClick={() => setSettingsModalOpen(false)} className="text-gray-400 hover:text-white font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-white/5">✕</button>
                </div>
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1.5 font-mono text-[11px] uppercase">ODDS FORMAT</label>
                    <select
                      value={userProfile.odds_format}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, odds_format: e.target.value }))}
                      className="w-full bg-[#080c14] border border-[#24334d] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#00ff75]"
                    >
                      <option value="decimal">Decimal (2.00)</option>
                      <option value="fractional">Fractional (1/1)</option>
                      <option value="american">American (+100)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1.5 font-mono text-[11px] uppercase">LANGUAGE</label>
                    <select
                      value={userProfile.language}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full bg-[#080c14] border border-[#24334d] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#00ff75]"
                    >
                      <option value="en">English (EN)</option>
                      <option value="sw">Swahili (SW)</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between pt-1 bg-[#080c14] p-3 rounded-xl border border-[#24334d]">
                    <span className="text-gray-300 font-semibold">HIGH CONTRAST MODE</span>
                    <input
                      type="checkbox"
                      checked={userProfile.high_contrast}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, high_contrast: e.target.checked }))}
                      className="w-4 h-4 accent-[#00ff75] cursor-pointer"
                    />
                  </div>
                </div>
                <button onClick={() => setSettingsModalOpen(false)} className="w-full bg-[#00ff75] text-black font-extrabold py-2.5 rounded-xl text-xs hover:bg-[#00d866] transition shadow-md">Save & Close</button>
              </div>
            </div>
          )}

          {adminModal.open && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#0e1626] border border-[#00ff75]/40 rounded-2xl w-full max-w-2xl p-6 sm:p-8 space-y-5 shadow-2xl relative">
                <div className="flex justify-between items-center border-b border-[#24334d] pb-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-[#00ff75] uppercase tracking-wider">
                      {adminModal.item ? `Edit ${adminModal.section}` : `Add ${adminModal.section}`}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">Database Write Record</p>
                  </div>
                  <button onClick={() => setAdminModal({ open: false, section: null, item: null })} className="text-gray-400 hover:text-white font-bold text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5">✕</button>
                </div>
                  
                <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-2 text-xs">
                  {adminModal.section === 'matches' && (
                    <>
                      <input
                        type="text"
                        placeholder="Teams (e.g. Chelsea vs Arsenal)"
                        value={adminFormData.teams || ''}
                        onChange={(e) => setAdminFormData(prev => ({ ...prev, teams: e.target.value }))}
                        className="w-full bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white focus:outline-none focus:border-[#00ff75]"
                      />
                      <input
                        type="text"
                        placeholder="League / Competition"
                        value={adminFormData.league || ''}
                        onChange={(e) => setAdminFormData(prev => ({ ...prev, league: e.target.value }))}
                        className="w-full bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white focus:outline-none focus:border-[#00ff75]"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="date"
                          value={adminFormData.match_date || ''}
                          onChange={(e) => setAdminFormData(prev => ({ ...prev, match_date: e.target.value }))}
                          className="bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white"
                        />
                        <input
                          type="time"
                          value={adminFormData.match_time || ''}
                          onChange={(e) => setAdminFormData(prev => ({ ...prev, match_time: e.target.value }))}
                          className="bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Prediction (e.g. Home Win / Over 2.5)"
                        value={adminFormData.prediction || ''}
                        onChange={(e) => setAdminFormData(prev => ({ ...prev, prediction: e.target.value }))}
                        className="w-full bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white focus:outline-none focus:border-[#00ff75]"
                      />
                      <div className="grid grid-cols-4 gap-2">
                        <input type="number" step="0.01" placeholder="Decimal Odds" value={adminFormData.decimal_odds || ''} onChange={(e) => setAdminFormData(prev => ({ ...prev, decimal_odds: e.target.value }))} className="bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white" />
                        <input type="number" placeholder="Prob Home %" value={adminFormData.prob_home || ''} onChange={(e) => setAdminFormData(prev => ({ ...prev, prob_home: e.target.value }))} className="bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white" />
                        <input type="number" placeholder="Prob Draw %" value={adminFormData.prob_draw || ''} onChange={(e) => setAdminFormData(prev => ({ ...prev, prob_draw: e.target.value }))} className="bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white" />
                        <input type="number" placeholder="Prob Away %" value={adminFormData.prob_away || ''} onChange={(e) => setAdminFormData(prev => ({ ...prev, prob_away: e.target.value }))} className="bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <select value={adminFormData.type || 'free'} onChange={(e) => setAdminFormData(prev => ({ ...prev, type: e.target.value }))} className="bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white">
                          <option value="free">Free Prediction</option>
                          <option value="premium">Premium VIP</option>
                        </select>
                        <input type="number" min="1" max="5" placeholder="Confidence Stars (1-5)" value={adminFormData.confidence_stars || 3} onChange={(e) => setAdminFormData(prev => ({ ...prev, confidence_stars: e.target.value }))} className="bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white" />
                      </div>
                      <textarea rows={3} placeholder="Detailed tactical intelligence/analysis..." value={adminFormData.analysis_text || ''} onChange={(e) => setAdminFormData(prev => ({ ...prev, analysis_text: e.target.value }))} className="w-full bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white resize-none" />
                    </>
                  )}

                  {adminModal.section === 'fixtures' && (
                    <>
                      <input type="text" placeholder="Teams" value={adminFormData.teams || ''} onChange={(e) => setAdminFormData(prev => ({ ...prev, teams: e.target.value }))} className="w-full bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white" />
                      <input type="text" placeholder="League" value={adminFormData.league || ''} onChange={(e) => setAdminFormData(prev => ({ ...prev, league: e.target.value }))} className="w-full bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white" />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="date" value={adminFormData.match_date || ''} onChange={(e) => setAdminFormData(prev => ({ ...prev, match_date: e.target.value }))} className="bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white" />
                        <input type="time" value={adminFormData.match_time || ''} onChange={(e) => setAdminFormData(prev => ({ ...prev, match_time: e.target.value }))} className="bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white" />
                      </div>
                    </>
                  )}

                  {adminModal.section === 'trending' && (
                    <>
                      <input type="number" placeholder="Rank (#)" value={adminFormData.rank || ''} onChange={(e) => setAdminFormData(prev => ({ ...prev, rank: e.target.value }))} className="w-full bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white" />
                      <input type="text" placeholder="Headline Title" value={adminFormData.title || ''} onChange={(e) => setAdminFormData(prev => ({ ...prev, title: e.target.value }))} className="w-full bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white" />
                      <input type="number" placeholder="Comments Count" value={adminFormData.comments_count || 0} onChange={(e) => setAdminFormData(prev => ({ ...prev, comments_count: e.target.value }))} className="w-full bg-[#080c14] border border-[#24334d] rounded-xl p-3 text-white" />
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#24334d]">
                  <button onClick={() => setAdminModal({ open: false, section: null, item: null })} className="px-5 py-2.5 rounded-xl bg-[#111c2d] border border-[#24334d] text-gray-300 text-xs font-bold hover:text-white">Cancel</button>
                  <button onClick={saveAdminEntry} className="px-6 py-2.5 rounded-xl bg-[#00ff75] text-black text-xs font-extrabold hover:bg-[#00d866] transition shadow-md">Save Record</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
