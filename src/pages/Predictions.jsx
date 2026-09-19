import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as THREE from 'three';

// --- Supabase Config & Client ---
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Helper Utilities ---
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

function verifyHackLocksAndSanitize(payload, showToast) {
  if (typeof payload === 'object' && payload !== null) {
    for (let key in payload) {
      if (typeof payload[key] === 'string') {
        const low = payload[key].toLowerCase();
        if (low.includes('<script') || low.includes('javascript:') || low.includes('onerror=') || low.includes('onload=')) {
          if (showToast) showToast("🚨 Malicious Attempt Blocked by Security Hack Lock!");
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
  
  const cappedMinute = Math.min(elapsed, 92);
  return `${cappedMinute}'`;
}

function buildLiveMatch(match) {
  const minuteStr = calculateLiveMinute(match);
  const minuteVal = parseInt(minuteStr, 10) || 0;
  const progress = Math.min(Math.round((minuteVal / 90) * 100), 100);

  return {
    ...match,
    id: match.id,
    league: match.league || match.competition || 'FOOTBALL',
    teams: match.teams || 'Teams not selected',
    score: match.score || match.final_score || '- _ -',
    minute: minuteStr, 
    progress,
    details: match.live_details || match.details || match.analysis_text || 'Live match available.'
  };
}

export default function PrePage() {
  // --- States ---
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState({ role: 'user', username: 'not Signed in', email: '', odds_format: 'decimal', language: 'en', high_contrast: false });
  
  // Data States
  const [matchesData, setMatchesData] = useState([]);
  const [fixturesData, setFixturesData] = useState([]);
  const [trendingData, setTrendingData] = useState([]);
  const [liveMatchesData, setLiveMatchesData] = useState([]);
  const [globalChatMessages, setGlobalChatMessages] = useState([]);
  const [matchCommentsStore, setMatchCommentsStore] = useState({});
  const [matchChatStore, setMatchChatStore] = useState({});
  const [matchReactionsMap, setMatchReactionsMap] = useState({});

  // Navigation & Controls States
  const [activeMatchTab, setActiveMatchTab] = useState('future');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [contrastMode, setContrastMode] = useState(false);

  // Floating Loader & Toasts State
  const [loader, setLoader] = useState({ active: true, promptText: 'loading...' });
  const [toasts, setToasts] = useState([]);
  const [dbError, setDbError] = useState(null);

  // Modals States
  const [reactionModal, setReactionModal] = useState({ open: false, title: '', matchId: null, type: '' });
  const [googleIframeModal, setGoogleIframeModal] = useState({ open: false, query: '' });
  const [globalChatOpen, setGlobalChatOpen] = useState(false);
  const [commentsModal, setCommentsModal] = useState({ open: false, matchId: null, teams: '' });
  const [statsModal, setStatsModal] = useState({ open: false, title: '', dataset: [] });
  const [fullscreenMatchModal, setFullscreenMatchModal] = useState({ open: false, match: null });
  const [matchChatModal, setMatchChatModal] = useState({ open: false, matchId: null, teams: '' });
  const [dialingModalOpen, setDialingModalOpen] = useState(false);
  const [adminModal, setAdminModal] = useState({ open: false, section: null, editingItemId: null });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Inputs Ref / State Controls
  const [fullscreenCommentInput, setFullscreenCommentInput] = useState('');
  const [globalChatInput, setGlobalChatInput] = useState('');
  const [matchChatInput, setMatchChatInput] = useState('');
  const [adminFormFields, setAdminFormFields] = useState({});

  const canvasRef = useRef(null);

  // --- Toast Trigger ---
  const showToast = (message, isError = true) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  // --- Database Error Handler ---
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

  // --- Loader Helper ---
  const triggerFloatingLoader = (promptText) => {
    setLoader({
      active: true,
      promptText: promptText || 'Processing...'
    });
  };

  const hideFloatingLoader = () => {
    setLoader(prev => ({ ...prev, active: false }));
  };

  // --- Three.js Background Animation ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

  // --- Slide-In Observer ---
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-slide-in').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [matchesData, fixturesData, trendingData, liveMatchesData]);

  // --- Normalizer Methods ---
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

  const normalizeFixture = (fix) => {
    const matchDate = fix.match_date ?? fix.date ?? '';
    const matchTime = fix.match_time ?? fix.time ?? '';
    return { ...fix, match_date: matchDate, match_time: matchTime, badge: fix.badge || getTeamBadge(fix.teams) };
  };

  const normalizeTrending = (item) => {
    return { ...item, rank: item.rank ?? '', title: item.title ?? '', comments_count: item.comments_count ?? item.comments ?? 0 };
  };

  // --- Fetch Operations ---
  const loadDatabaseReactions = async () => {
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
    } catch (err) { showDatabaseError('chats', err, 'READ_CHATS'); }
  };

  const loadMatchesFromDB = async () => {
    try {
      const { data, error } = await db.from('matches').select('*').order('created_at', { ascending: false });
      if (error) { showDatabaseError('matches', error, 'READ_MATCHES'); return; }
      const loaded = Array.isArray(data) ? data.map(normalizeMatch) : [];
      setMatchesData(loaded);
    } catch (error) { showDatabaseError('matches', error, 'READ_MATCHES'); }
  };

  const loadFixturesFromDB = async () => {
    try {
      const { data, error } = await db.from('fixtures').select('*').order('match_date', { ascending: true });
      if (error) { showDatabaseError('fixtures', error, 'READ_FIXTURES'); return; }
      setFixturesData(Array.isArray(data) ? data.map(normalizeFixture) : []);
    } catch (error) { showDatabaseError('fixtures', error, 'READ_FIXTURES'); }
  };

  const loadTrendingFromDB = async () => {
    try {
      const { data, error } = await db.from('trending').select('*').order('rank', { ascending: true });
      if (error) { showDatabaseError('trending', error, 'READ_TRENDING'); return; }
      setTrendingData(Array.isArray(data) ? data.map(normalizeTrending) : []);
    } catch (error) { showDatabaseError('trending', error, 'READ_TRENDING'); }
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

  // --- Initializing App Lifecycle ---
  useEffect(() => {
    let intervalId;
    async function init() {
      triggerFloatingLoader("connection completed");
      const authenticated = await checkUserSession();
      if (!authenticated) return;

      triggerFloatingLoader("loading data...");
      await loadDatabaseReactions();

      await Promise.all([
        loadMatchesFromDB(),
        loadFixturesFromDB(),
        loadTrendingFromDB(),
        loadDatabaseComments(),
        loadDatabaseChats()
      ]);

      // Subscriptions
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

      triggerFloatingLoader("SYNC COMPLETE!");
      setTimeout(hideFloatingLoader, 400);
    }

    init();

    intervalId = setInterval(() => {
      const now = new Date();
      setMatchesData(prev => {
        const live = prev.filter(m => isMatchCurrentlyLive(m, now)).map(buildLiveMatch);
        setLiveMatchesData(live);
        return prev;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Update Live matches whenever matchesData is re-fetched
  useEffect(() => {
    const now = new Date();
    const live = matchesData.filter(m => isMatchCurrentlyLive(m, now)).map(buildLiveMatch);
    setLiveMatchesData(live);
  }, [matchesData]);

  // --- User Handlers & Actions ---
  const signOutUser = async () => {
    await db.auth.signOut();
    window.location.href = "auth.html";
  };

  const toggleSideNav = () => setSideNavOpen(prev => !prev);

  const toggleContrastMode = () => {
    setContrastMode(prev => !prev);
    setUserProfile(prev => ({ ...prev, high_contrast: !prev.high_contrast }));
  };

  const updateProfileSettings = (e) => {
    const { id, value } = e.target;
    if (id === 'pref-odds-format') setUserProfile(prev => ({ ...prev, odds_format: value }));
    if (id === 'pref-language') setUserProfile(prev => ({ ...prev, language: value }));
  };

  const formatOdds = (decimalVal) => {
    const val = parseFloat(decimalVal);
    if (!Number.isFinite(val) || val <= 1) return 'N/A';
    if (userProfile.odds_format === 'fractional') return `${Math.round((val - 1) * 100)}/100`;
    if (userProfile.odds_format === 'american') return val >= 2.0 ? `+${Math.round((val - 1) * 100)}` : `-${Math.round(100 / (val - 1))}`;
    return val.toFixed(2);
  };

  const openGoogleSearchIframe = (queryText) => {
    setGoogleIframeModal({ open: true, query: queryText });
  };

  const closeGoogleIframeModal = () => {
    setGoogleIframeModal({ open: false, query: '' });
  };

  const openReactionUsersModal = (matchId, type) => {
    const emojiMap = { fire: '🔥 Fire', heart: '❤️ Heart', dislike: '👎 Dislike' };
    setReactionModal({
      open: true,
      title: `Reacted with ${emojiMap[type] || type}`,
      matchId,
      type
    });
  };

  const closeReactionUsersModal = () => {
    setReactionModal({ open: false, title: '', matchId: null, type: '' });
  };

  const reactToMatch = async (matchId, type) => {
    const match = matchesData.find(m => String(m.id) === String(matchId));
    if (!match) return;

    const mId = String(matchId);
    const currentReactions = { ...matchReactionsMap };
    if (!currentReactions[mId]) currentReactions[mId] = [];

    const userId = currentUser?.id || 'guest';
    const userPrevReaction = currentReactions[mId].find(r => r.user_id === userId);

    const updatedMatch = { ...match, reactions: { ...(match.reactions || { fire: 0, heart: 0, dislike: 0 }) } };

    if (userPrevReaction) {
      if (userPrevReaction.reaction === type) {
        updatedMatch.reactions[type] = Math.max(0, Number(updatedMatch.reactions[type] || 0) - 1);
        currentReactions[mId] = currentReactions[mId].filter(r => r.user_id !== userId);
        
        try { 
          await db.from('reactions').delete().eq('match_id', matchId).eq('user_id', userId); 
        } catch (e) {}
      } else {
        const oldType = userPrevReaction.reaction;
        updatedMatch.reactions[oldType] = Math.max(0, Number(updatedMatch.reactions[oldType] || 0) - 1);
        updatedMatch.reactions[type] = Number(updatedMatch.reactions[type] || 0) + 1;
        userPrevReaction.reaction = type;

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
      updatedMatch.reactions[type] = Number(updatedMatch.reactions[type] || 0) + 1;
      currentReactions[mId].push({ user_id: userId, username: userProfile.username, reaction: type });

      try {
        await db.from('reactions').insert([{ 
          match_id: matchId, 
          user_id: userId, 
          username: userProfile.username, 
          reaction_type: type 
        }]);
      } catch (e) {}
    }

    setMatchReactionsMap(currentReactions);
    setMatchesData(prev => prev.map(m => String(m.id) === String(matchId) ? updatedMatch : m));

    try { 
      await db.from('matches').update({ reactions: updatedMatch.reactions }).eq('id', matchId); 
    } catch (err) {}
  };

  // --- Comment Methods ---
  const openFullscreenCommentsModal = (matchId, teams) => {
    setCommentsModal({ open: true, matchId, teams });
  };

  const closeFullscreenCommentsModal = () => {
    setCommentsModal({ open: false, matchId: null, teams: '' });
  };

  const submitFullscreenComment = async () => {
    const text = fullscreenCommentInput.trim();
    if (!text || !commentsModal.matchId) {
      showToast("Please enter a non-empty comment.");
      return;
    }

    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({
        match_id: commentsModal.matchId,
        username: userProfile.username,
        comment: text,
        user_id: currentUser?.id
      }, showToast);

      triggerFloatingLoader("posting Comment");
      const { error } = await db.from('comments').insert([sanitizedPayload]);

      if (error) {
        showDatabaseError('comments', error, 'INSERT_COMMENT');
        showToast("Failed to save comment.");
      } else {
        await loadDatabaseComments();
        showToast("Comment posted successfully!", false);
      }
    } catch (err) {
      showToast(err.message || "Error occurred while posting comment.");
    }

    setFullscreenCommentInput('');
    hideFloatingLoader();
  };

  const editComment = async (commentId) => {
    const comments = matchCommentsStore[commentsModal.matchId] || [];
    const comment = comments.find(c => String(c.id) === String(commentId));
    if (!comment) return;

    const newText = prompt("Edit comment:", comment.comment);
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
    } catch (e) { showDatabaseError('comments', e, 'DELETE_COMMENT'); }
  };

  // --- Global Chat Actions ---
  const sendGlobalChatMessage = async () => {
    const text = globalChatInput.trim();
    if (!text) {
      showToast("Chat message cannot be empty.");
      return;
    }

    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({ 
        username: userProfile.username, 
        message: text, 
        user_id: currentUser?.id 
      }, showToast);

      const { error } = await db.from('chats').insert([sanitizedPayload]);
      if (error) showDatabaseError('chats', error, 'INSERT_GLOBAL_CHAT');
      else await loadDatabaseChats();
    } catch (err) {
      showToast(err.message || "Security exception blocked message.");
    }

    setGlobalChatInput('');
  };

  // --- Match Chat Actions ---
  const openMatchChatModal = (matchId, teams) => {
    setMatchChatModal({ open: true, matchId, teams });
  };

  const closeMatchChatModal = () => {
    setMatchChatModal({ open: false, matchId: null, teams: '' });
  };

  const sendMatchChatMessage = async () => {
    const text = matchChatInput.trim();
    if (!text || !matchChatModal.matchId) {
      showToast("Chat message cannot be empty.");
      return;
    }

    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({ 
        match_id: matchChatModal.matchId,
        username: userProfile.username, 
        message: text, 
        user_id: currentUser?.id 
      }, showToast);

      const { error } = await db.from('chats').insert([sanitizedPayload]);
      if (error) showDatabaseError('chats', error, 'INSERT_MATCH_CHAT');
      else await loadDatabaseChats();
    } catch (err) {
      showToast(err.message || "Security exception blocked message.");
    }

    setMatchChatInput('');
  };

  const editChatMessage = async (chatId, isMatchChat) => {
    const activeId = isMatchChat ? matchChatModal.matchId : null;
    let msgStore = isMatchChat ? (matchChatStore[activeId] || []) : globalChatMessages;
    const msg = msgStore.find(m => String(m.id) === String(chatId));
    if (!msg) return;

    const newText = prompt("Edit message:", msg.text);
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
  };

  const deleteChatMessage = async (chatId, isMatchChat) => {
    if (!window.confirm("Delete this message?")) return;

    try { 
      const { error } = await db.from('chats').delete().eq('id', chatId); 
      if (error) showDatabaseError('chats', error, 'DELETE_CHAT');
      else {
        await loadDatabaseChats();
        showToast("Message deleted.", false);
      }
    } catch (e) { showDatabaseError('chats', e, 'DELETE_CHAT'); }
  };

  // --- Admin Methods ---
  const openFloatingAdminModal = (section, editingId = null) => {
    let initialFields = {};
    if (section === 'matches') {
      const item = editingId ? matchesData.find(m => String(m.id) === String(editingId)) : null;
      initialFields = {
        teams: item?.teams || '',
        league: item?.league || '',
        prediction: item?.prediction || '',
        decimal_odds: item?.decimal_odds || '',
        type: item?.type || 'free',
        match_date: item?.match_date || '',
        match_time: item?.match_time || '',
        prob_home: item?.prob_home || '',
        prob_draw: item?.prob_draw || '',
        prob_away: item?.prob_away || '',
        confidence_stars: item?.confidence_stars || 5,
        analysis_text: item?.analysis_text || '',
        status: item?.status || 'PENDING',
        final_score: item?.final_score || ''
      };
    } else if (section === 'fixtures') {
      const item = editingId ? fixturesData.find(f => String(f.id) === String(editingId)) : null;
      initialFields = {
        teams: item?.teams || '',
        league: item?.league || '',
        match_date: item?.match_date || '',
        match_time: item?.match_time || ''
      };
    } else if (section === 'trending') {
      const item = editingId ? trendingData.find(t => String(t.id) === String(editingId)) : null;
      initialFields = {
        rank: item?.rank || '',
        title: item?.title || '',
        comments_count: item?.comments_count || 0
      };
    }

    setAdminFormFields(initialFields);
    setAdminModal({ open: true, section, editingItemId: editingId });
  };

  const closeAdminFloatingModal = () => {
    setAdminModal({ open: false, section: null, editingItemId: null });
    setAdminFormFields({});
  };

  const triggerAdminEdit = (section, id) => {
    openFloatingAdminModal(section, id);
  };

  const saveAdminEntry = async () => {
    const { section, editingItemId } = adminModal;
    try {
      const cleanPayload = verifyHackLocksAndSanitize({ ...adminFormFields }, showToast);
      triggerFloatingLoader("Saving data...");

      let table = section;
      let error = null;

      if (editingItemId) {
        const res = await db.from(table).update(cleanPayload).eq('id', editingItemId);
        error = res.error;
      } else {
        const res = await db.from(table).insert([cleanPayload]);
        error = res.error;
      }

      if (error) {
        showDatabaseError(table, error, editingItemId ? 'UPDATE' : 'INSERT');
      } else {
        showToast(`Record ${editingItemId ? 'updated' : 'created'} successfully!`, false);
        closeAdminFloatingModal();
        if (section === 'matches') await loadMatchesFromDB();
        if (section === 'fixtures') await loadFixturesFromDB();
        if (section === 'trending') await loadTrendingFromDB();
      }
    } catch (err) {
      showToast(err.message || "Failed to save data.");
    } finally {
      hideFloatingLoader();
    }
  };

  const deleteMatchFromDB = async (id) => {
    triggerFloatingLoader("Deleting Match Record...");
    try {
      const { error } = await db.from('matches').delete().eq('id', id);
      if (error) { showDatabaseError('matches', error, 'DELETE_MATCH'); return; }
      await loadMatchesFromDB();
      showToast("Match deleted.", false);
    } catch (err) { showDatabaseError('matches', err, 'DELETE_MATCH'); }
    finally { hideFloatingLoader(); }
  };

  const deleteFixtureFromDB = async (id) => {
    triggerFloatingLoader("Deleting Fixture Record...");
    try {
      const { error } = await db.from('fixtures').delete().eq('id', id);
      if (error) { showDatabaseError('fixtures', error, 'DELETE_FIXTURE'); return; }
      await loadFixturesFromDB();
      showToast("Fixture removed.", false);
    } catch (err) { showDatabaseError('fixtures', err, 'DELETE_FIXTURE'); }
    finally { hideFloatingLoader(); }
  };

  const deleteTrendingFromDB = async (id) => {
    triggerFloatingLoader("Deleting Headline...");
    try {
      const { error } = await db.from('trending').delete().eq('id', id);
      if (error) { showDatabaseError('trending', error, 'READ_TRENDING'); return; }
      await loadTrendingFromDB();
      showToast("Headline removed.", false);
    } catch (err) { showDatabaseError('trending', err, 'READ_TRENDING'); }
    finally { hideFloatingLoader(); }
  };

  // --- Fullscreen & Directory Modals ---
  const openFullscreenMatchModal = (matchId) => {
    const match = matchesData.find(m => String(m.id) === String(matchId));
    if (!match) return;
    setFullscreenMatchModal({ open: true, match });
  };

  const closeFullscreenMatchModal = () => {
    setFullscreenMatchModal({ open: false, match: null });
  };

  const openMatchChatModalFromFullscreen = () => {
    if (fullscreenMatchModal.match) {
      openMatchChatModal(fullscreenMatchModal.match.id, fullscreenMatchModal.match.teams);
    }
  };

  const openStatsListModal = (title, dataset) => {
    setStatsModal({ open: true, title, dataset });
  };

  const closeStatsListModal = () => {
    setStatsModal({ open: false, title: '', dataset: [] });
  };

  // --- Card Renderers ---
  const renderLiveMatchCard = (match, isLastCard = false) => {
    const teamParts = String(match.teams || '').split(/\s+vs\.?\s+/i);
    const home = teamParts[0] || 'HOME';
    const away = teamParts[1] || 'AWAY';

    return (
      <div 
        key={match.id} 
        className="bg-[#0f172a] rounded-2xl p-5 border border-cyan-500/20 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/60 hover:shadow-[0_15px_40px_rgba(0,240,255,0.2)] flex flex-col justify-between"
        onClick={() => openFullscreenMatchModal(match.id)}
      >
        <div>
          <div className="flex justify-between items-center text-xs text-slate-400 mb-3 font-semibold">
            <span 
              className="font-mono hover:text-cyan-400 transition" 
              onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Match live summary ${match.teams}`); }}
            >
              {match.league}
            </span>
            <span className="text-rose-500 font-bold animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> LIVE
            </span>
          </div>
          <div className="flex items-center justify-between my-4">
            <div className="text-center flex-1">
              <div className="w-10 h-10 mx-auto rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center font-extrabold text-cyan-400 mb-1 text-xs shadow-inner">{getTeamBadge(home)}</div>
              <span className="text-xs font-bold tracking-wide text-white block truncate">{home}</span>
            </div>
            <div className="text-xl font-black tracking-wider px-2 font-mono text-cyan-400 bg-cyan-950/40 py-1 rounded-lg border border-cyan-500/30">{match.score || '0 - 0'}</div>
            <div className="text-center flex-1">
              <div className="w-10 h-10 mx-auto rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center font-extrabold text-cyan-400 mb-1 text-xs shadow-inner">{getTeamBadge(away)}</div>
              <span className="text-xs font-bold tracking-wide text-white block truncate">{away}</span>
            </div>
          </div>
          <div className="text-center text-xs font-semibold text-emerald-400 mb-2 font-mono">{match.minute} Minutes</div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500" style={{ width: `${match.progress}%` }}></div>
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 pt-3 mt-3 border-t border-slate-800 flex justify-between items-center">
            <span className="truncate pr-2">{match.details}</span>
            {userProfile.role === 'admin' && (
              <div className="flex gap-1 ml-2 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); triggerAdminEdit('matches', match.id); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded hover:bg-amber-500 hover:text-black transition font-semibold">Edit</button>
                <button onClick={(e) => { e.stopPropagation(); deleteMatchFromDB(match.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded hover:bg-red-600 hover:text-white transition font-semibold">Delete</button>
              </div>
            )}
          </div>
          {isLastCard && (
            <div className="mt-4 pt-3 border-t border-cyan-500/30 flex justify-end">
              <button 
                onClick={(e) => { e.stopPropagation(); openStatsListModal('Live Games Directory', liveMatchesData); }} 
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:scale-102 transition-transform flex items-center justify-center gap-2"
              >
                <span>SEE MORE MATCHES</span> ➔
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMatchPredictionCard = (match, isLastCard = false) => {
    const isAdmin = userProfile && userProfile.role === 'admin';
    const comments = matchCommentsStore[match.id] || [];
    const type = String(match.type || 'free');
    const typeClass = type.toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';
    const oddsText = match.decimal_odds !== null && match.decimal_odds !== undefined ? formatOdds(match.decimal_odds) : 'N/A';
    const probHome = Number(match.prob_home) || 0;
    const probDraw = Number(match.prob_draw) || 0;
    const probAway = Number(match.prob_away) || 0;

    return (
      <div key={match.id} className="bg-[#0f172a] rounded-2xl p-5 border border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between space-y-4 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-[0_15px_30px_rgba(16,185,129,0.15)]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${typeClass}`}>{type} Match</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-bold font-mono">Odds: {oddsText}</span>
              <span className="text-[10px] text-slate-400 font-mono">{match.match_date || ''} {match.match_time || ''}</span>
            </div>
          </div>
          <h4 
            className="font-extrabold text-base text-white tracking-wide font-mono hover:text-emerald-400 transition" 
            onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Prediction summary for ${match.teams}`); }}
          >
            {match.teams || 'Unknown Match'}
          </h4>
          <p className="text-xs text-emerald-400 font-semibold">Prediction: {match.prediction || 'N/A'} ({stars})</p>
          <p className="text-xs text-slate-400 line-clamp-2">{match.analysis_text || 'Tactical breakdown in detailed view.'}</p>
        </div>

        <div className="space-y-1 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
          <div className="flex justify-between text-[10px] font-bold text-slate-300">
            <span>Probability:</span>
            <span>H: {probHome}% | D: {probDraw}% | A: {probAway}%</span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${probHome}%` }}></div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button 
            onClick={(e) => { e.stopPropagation(); reactToMatch(match.id, 'fire'); }}
            onContextMenu={(e) => { e.preventDefault(); openReactionUsersModal(match.id, 'fire'); }}
            className="bg-slate-900 border border-slate-700/60 hover:border-emerald-500 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition text-slate-200"
          >
            🔥 <span>{match.reactions?.fire || 0}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); reactToMatch(match.id, 'heart'); }}
            onContextMenu={(e) => { e.preventDefault(); openReactionUsersModal(match.id, 'heart'); }}
            className="bg-slate-900 border border-slate-700/60 hover:border-emerald-500 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition text-slate-200"
          >
            ❤️ <span>{match.reactions?.heart || 0}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); reactToMatch(match.id, 'dislike'); }}
            onContextMenu={(e) => { e.preventDefault(); openReactionUsersModal(match.id, 'dislike'); }}
            className="bg-slate-900 border border-slate-700/60 hover:border-emerald-500 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition text-slate-200"
          >
            👎 <span>{match.reactions?.dislike || 0}</span>
          </button>
        </div>

        <div 
          onClick={(e) => { e.stopPropagation(); openFullscreenCommentsModal(match.id, match.teams); }} 
          className="bg-slate-950/60 rounded-xl p-3 space-y-2 border border-slate-800/60 hover:border-emerald-500/50 transition cursor-pointer"
        >
          <div className="flex justify-between items-center text-[11px] font-bold text-slate-300">
            <span>({comments.length}) comments</span>
            <span className="text-emerald-400 text-[10px] uppercase font-bold">Fullscreen ➔</span>
          </div>
          <div className="space-y-1.5 max-h-20 overflow-y-auto text-[11px]">
            {comments.length === 0 ? <p className="text-slate-500 italic text-[10px]">No comments yet. Click to start discussion.</p> : null}
            {comments.slice(-1).map((c, i) => (
              <div key={i} className="bg-slate-900 p-1.5 rounded border border-slate-800 text-slate-300">
                <span className="font-bold text-emerald-400">{c.user}:</span> {c.comment}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); openFullscreenMatchModal(match.id); }} 
                className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black font-bold px-3 py-1.5 rounded-xl text-xs transition"
              >
                🔍 Details
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); openMatchChatModal(match.id, match.teams || ''); }} 
                className="bg-slate-900 border border-slate-700/60 px-3 py-1.5 rounded-xl text-xs text-slate-200 hover:text-emerald-400 transition flex items-center gap-1"
              >
                Group Chats
              </button>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); triggerAdminEdit('matches', match.id); }} className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-amber-500 hover:text-black transition">Edit</button>
                <button onClick={(e) => { e.stopPropagation(); deleteMatchFromDB(match.id); }} className="bg-red-600/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition">Delete</button>
              </div>
            )}
          </div>

          {isLastCard && (
            <div className="mt-4 pt-3 border-t border-emerald-500/30 flex justify-end">
              <button 
                onClick={(e) => { e.stopPropagation(); openStatsListModal('All Database Predictions', matchesData); }} 
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-102 transition-transform flex items-center justify-center gap-2"
              >
                <span>SEE MORE PREDICTIONS</span> ➔
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFixtureCard = (fix, isLastCard = false) => {
    return (
      <div key={fix.id} className="bg-[#0f172a] rounded-xl p-4 border border-slate-800 flex flex-col space-y-3 cursor-pointer transition-all duration-300 hover:border-cyan-500/50 hover:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-xs text-cyan-400 font-mono shadow-inner">{fix.badge}</div>
            <div>
              <h4 className="font-bold text-xs text-white hover:text-cyan-400 transition" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Fixture schedule ${fix.teams}`); }}>{fix.teams || 'Fixture'}</h4>
              <span className="text-[10px] text-slate-400">{fix.league || 'League'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400 block font-mono">{fix.match_time || 'TBD'}</span>
              <span className="text-[10px] text-slate-500">{fix.match_date || 'TBD'}</span>
            </div>
            {userProfile.role === 'admin' && (
              <div className="flex gap-1 ml-2">
                <button onClick={(e) => { e.stopPropagation(); triggerAdminEdit('fixtures', fix.id); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black transition font-semibold">Edit</button>
                <button onClick={(e) => { e.stopPropagation(); deleteFixtureFromDB(fix.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white transition font-semibold">Delete</button>
              </div>
            )}
          </div>
        </div>

        {isLastCard && (
          <div className="pt-2 border-t border-cyan-500/30 flex justify-end">
            <button 
              onClick={(e) => { e.stopPropagation(); openStatsListModal('Complete Fixtures Schedule', fixturesData); }} 
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:scale-102 transition-transform flex items-center justify-center gap-2"
            >
              <span>SEE MORE FIXTURES</span> ➔
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderTrendingCard = (item, isLastCard = false) => {
    return (
      <div key={item.id} className="bg-[#0f172a] rounded-xl p-4 border border-slate-800 flex flex-col space-y-3 cursor-pointer transition-all duration-300 hover:border-amber-500/50 hover:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-amber-400 font-mono">#{item.rank}</span>
            <div>
              <h4 className="font-bold text-xs text-white hover:text-amber-400 transition" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(item.title); }}>{item.title}</h4>
              <span className="text-[10px] text-slate-500">💬 {Number(item.comments_count) || 6237} discussions</span>
            </div>
          </div>
          {userProfile.role === 'admin' && (
            <div className="flex gap-1">
              <button onClick={(e) => { e.stopPropagation(); triggerAdminEdit('trending', item.id); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black transition font-semibold">Edit</button>
              <button onClick={(e) => { e.stopPropagation(); deleteTrendingFromDB(item.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white transition font-semibold">Delete</button>
            </div>
          )}
        </div>

        {isLastCard && (
          <div className="pt-2 border-t border-amber-500/30 flex justify-end">
            <button 
              onClick={(e) => { e.stopPropagation(); openStatsListModal('All Trending News', trendingData); }} 
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:scale-102 transition-transform flex items-center justify-center gap-2"
            >
              <span>SEE MORE NEWS</span> ➔
            </button>
          </div>
        )}
      </div>
    );
  };

  // Filtered Predictions List calculation
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
      const q = matchSearchQuery.toLowerCase();
      filtered = filtered.filter(m => {
        const nameMatch = String(m.teams || '').toLowerCase().includes(q);
        const dateMatch = String(m.match_date || '').toLowerCase().includes(q);
        const timeMatch = String(m.match_time || '').toLowerCase().includes(q);
        const leagueMatch = String(m.league || '').toLowerCase().includes(q);
        return nameMatch || dateMatch || timeMatch || leagueMatch;
      });
    }

    return filtered;
  };

  return (
    <div className={`min-h-screen bg-[#060911] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black ${contrastMode ? 'contrast-200 bg-black' : ''}`}>
      {/* 4D Background Canvas */}
      <canvas ref={canvasRef} id="bg-4d-canvas" className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 opacity-40" />

      <div className="app-content-wrapper flex flex-col min-h-screen justify-between relative z-10">

        {/* Error Toast Container */}
        <div id="toast-container" className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div 
              key={t.id} 
              className={`px-5 py-4 rounded-2xl border-2 text-xs font-black font-mono shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-3 pointer-events-auto backdrop-blur-xl transition-all duration-300 animate-bounce ${
                t.isError 
                  ? 'bg-red-950/90 border-red-500 text-red-200 shadow-red-900/50' 
                  : 'bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-emerald-900/50'
              }`}
            >
              <span className="text-base">{t.isError ? '⚠️' : '⚡'}</span>
              <div className="flex flex-col">
                <span className="uppercase text-[10px] tracking-widest text-slate-400">{t.isError ? 'System Directive Warning' : 'Directive Acknowledged'}</span>
                <span>{t.message}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Futuristic Floating Loader with Heartbeat Animation */}
        <div id="floating-loader" className={`fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${loader.active ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="bg-[#0b0f19] border-2 border-cyan-500/60 rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-[0_0_60px_rgba(0,240,255,0.3)] text-center transform transition-transform duration-300 relative overflow-hidden">
            <div className="flex justify-center items-center py-2">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping"></div>
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.5)] animate-[pulse_1s_infinite]">
                  <span className="text-3xl animate-[bounce_0.8s_infinite]">💰</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-cyan-400 font-mono">LOADING DATA</h4>
              <p id="loader-prompt-text" className="text-sm font-bold text-slate-200 uppercase tracking-wide font-mono">{loader.promptText}</p>
            </div>
          </div>
        </div>

        {/* Reacted Users Floating Container List */}
        {reactionModal.open && (
          <div id="reaction-users-modal" className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-[#0f172a] border-2 border-emerald-500/50 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative my-auto">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h4 className="font-bold text-sm text-emerald-400 font-mono">{reactionModal.title}</h4>
                <button onClick={closeReactionUsersModal} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                {(() => {
                  const matchReactions = matchReactionsMap[String(reactionModal.matchId)] || [];
                  const usersForType = matchReactions.filter(r => r.reaction === reactionModal.type);
                  if (!usersForType.length) return <p className="text-slate-500 italic py-2">No users have put this reaction yet.</p>;
                  return usersForType.map((u, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">{getFirstNameInitials(u.username)}</div>
                      <span className="text-xs font-semibold text-slate-200">{u.username}</span>
                    </div>
                  ));
                })()}
              </div>
              <button onClick={closeReactionUsersModal} className="w-full bg-slate-900 border border-slate-800 text-slate-300 py-2 rounded-xl text-xs font-bold hover:text-white transition">Close</button>
            </div>
          </div>
        )}

        {/* Side Navigation Overlay Menu */}
        <div 
          id="side-nav-backdrop" 
          onClick={toggleSideNav} 
          className={`${sideNavOpen ? '' : 'hidden'} fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity`}
        />
        <aside 
          id="side-nav-menu" 
          className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-[#0f172a] border-l border-slate-800 z-50 transform ${sideNavOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out flex flex-col justify-between p-6 shadow-2xl`}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-sm font-bold">{getFirstNameInitials(userProfile.username)}</div>
                <div>
                  <h3 className="font-extrabold text-sm text-white font-mono">{userProfile.username}</h3>
                  <span className="text-[10px] text-slate-400">{userProfile.email}</span>
                </div>
              </div>
              <button onClick={toggleSideNav} className="w-8 h-8 rounded-full bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center font-bold">✕</button>
            </div>

            <nav className="space-y-3">
              <button onClick={() => { setDialingModalOpen(true); toggleSideNav(); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:text-emerald-400 transition text-xs font-semibold text-slate-200">
                <span className="text-base">📞</span> Contact Centre
              </button>
              <button onClick={() => { setSettingsModalOpen(true); toggleSideNav(); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:text-emerald-400 transition text-xs font-semibold text-slate-200">
                <span className="text-base">⚙️</span> Preferences & Settings
              </button>
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-800 space-y-3">
            <button onClick={signOutUser} className="w-full bg-red-950/60 text-red-300 border border-red-500/40 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider hover:bg-red-800 hover:text-white transition flex items-center justify-center gap-2">
              <span>❌</span> Sign Out
            </button>
          </div>
        </aside>

        <div id="app-root" className="space-y-12 pb-16">
          {/* Header */}
          <header className="border-b border-slate-800/80 bg-[#0b0f19]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              
              {/* Brand Logo Left End */}
              <div className="flex items-center gap-3">
                <div id="brand-logo" className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 text-slate-950 font-black flex items-center justify-center text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer" onClick={() => setDialingModalOpen(true)}>
                  {getFirstNameInitials(userProfile.username)}
                </div>
                <div>
                  <h1 className="font-bold tracking-wider text-lg leading-tight font-mono text-white">PREDICTIONS <span className="text-emerald-400">HUB</span></h1>
                </div>
              </div>

              {/* Center Nav */}
              <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
                <a href="/dashboard" className="flex items-center gap-2 text-emerald-400 border-b-2 border-emerald-400 pb-1 font-bold">DASHBOARD</a>
                <a href="#live-section" className="flex items-center gap-2 text-slate-400 hover:text-white transition">LIVE</a>
                <a href="#fixtures-section" className="flex items-center gap-2 text-slate-400 hover:text-white transition">FIXTURES</a>
                <a href="#db-matches-section" className="flex items-center gap-2 text-slate-400 hover:text-white transition">PREDICTIONS</a>
                <a href="#trending-section" className="flex items-center gap-2 text-slate-400 hover:text-white transition">COMMUNITY</a>
              </nav>

              {/* Right Controls and Trailing Back Button */}
              <div className="flex items-center gap-3">
                <div id="user-profile-badge" className="hidden md:flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full cursor-pointer hover:border-slate-700 transition" onClick={toggleSideNav}>
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">{getFirstNameInitials(userProfile.username)}</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-200">{userProfile.username} ({userProfile.role.toUpperCase()})</span>
                    <span className="text-[9px] text-slate-400">{userProfile.email}</span>
                  </div>
                </div>

                <button onClick={toggleSideNav} title="Open Navigation Options" className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 flex items-center justify-center hover:text-emerald-400 transition">
                  ☰
                </button>

                {/* Professional Back Button located at FURTHEST END */}
                <a 
                  href="/dashboard" 
                  title="Back to Dashboard" 
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 transition-transform duration-200"
                >
                  <span>Back</span>
                  <span></span>
                </a>
              </div>
            </div>
          </header>

          {/* Banner */}
          <section className="relative overflow-hidden py-12 px-6 border-b border-slate-800/80 bg-gradient-to-b from-[#0f172a] to-[#090d16] animate-slide-in">
            <div className="max-w-7xl mx-auto text-center relative z-10 space-y-3">
              <span className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-bold bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">Sports Analytics & 4D Intelligence</span>
              <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight uppercase font-mono text-white">FOOTBALL <span className="text-emerald-400">INTELLIGENCE</span></h2>
            </div>
          </section>

          {/* Detailed Database Error Console */}
          {dbError && (
            <div id="database-error-center" className="max-w-7xl mx-auto px-6 my-6">
              <div className="bg-gradient-to-r from-red-950 to-slate-950 border-2 border-red-500/80 rounded-2xl p-6 shadow-[0_0_40px_rgba(239,68,68,0.3)] space-y-4">
                <div className="flex items-start justify-between gap-4 border-b border-red-900/50 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl animate-pulse">🚨</span>
                    <div>
                      <h3 className="font-extrabold text-red-400 text-sm uppercase tracking-widest font-mono">SYSTEM ALERT</h3>
                      <p className="text-xs text-slate-300 font-semibold">{dbError.title}</p>
                    </div>
                  </div>
                  <button onClick={hideDatabaseError} className="bg-red-900/30 text-red-400 border border-red-500/40 px-3 py-1 rounded-lg text-xs hover:bg-red-800 hover:text-white transition font-bold">Acknowledge</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-black/60 border border-red-500/30 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-red-400 font-bold block font-mono">Root Diagnostic</span>
                    <p className="text-xs text-slate-200 font-medium">{dbError.diagnosis}</p>
                  </div>
                  <div className="bg-black/60 border border-red-500/30 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block font-mono">Action Directive</span>
                    <p className="text-xs text-slate-200 font-medium">{dbError.action}</p>
                  </div>
                  <div className="bg-black/60 border border-red-500/30 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold block font-mono">Payload Trace</span>
                    <pre className="text-[10px] text-red-300 whitespace-pre-wrap break-words max-h-24 overflow-y-auto font-mono">{dbError.details}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Grid */}
          <main className="max-w-7xl mx-auto px-6 space-y-16">

            {/* Live Section */}
            <section id="live-section" className="bg-[#0b101d] border border-cyan-500/30 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-8">
              <div className="flex items-center justify-between section-header border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-extrabold text-xl uppercase tracking-wider text-white font-mono flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span> LIVE MATCHES
                  </h3>
                  <span className="text-xs text-cyan-400 font-semibold">{liveMatchesData.length} Matches currently active</span>
                </div>
              </div>
              <div id="live-matches-container" className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {liveMatchesData.length === 0 ? (
                  <div className="col-span-3 text-center py-12 bg-[#0f172a] rounded-2xl border border-slate-800"><p className="text-xs text-slate-400">No live matches currently in play.</p></div>
                ) : (
                  liveMatchesData.slice(0, 3).map((m, idx) => renderLiveMatchCard(m, idx === Math.min(2, liveMatchesData.length - 1)))
                )}
              </div>
            </section>

            {/* Predictions Section */}
            <section id="db-matches-section" className="bg-[#0b101d] border border-emerald-500/30 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 section-header border-b border-slate-800 pb-4">
                <div>
                  <h3 
                    className="text-xl font-extrabold uppercase tracking-wider text-white font-mono cursor-pointer hover:text-emerald-400 transition" 
                    onClick={() => openGoogleSearchIframe('Live database matches and football predictions')}
                  >
                    ⚽ MATCHES & PREDICTIONS
                  </h3>
                </div>
              </div>

              {/* Controls Row: Header Tabs & Match Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                {/* Header Tab Buttons */}
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800 self-start">
                  <button 
                    onClick={() => setActiveMatchTab('past')} 
                    className={`px-5 py-2 rounded-xl text-xs font-bold font-mono transition ${activeMatchTab === 'past' ? 'bg-emerald-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    PAST PREDICTIONS
                  </button>
                  <button 
                    onClick={() => setActiveMatchTab('future')} 
                    className={`px-5 py-2 rounded-xl text-xs font-bold font-mono transition ${activeMatchTab === 'future' ? 'bg-emerald-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    UPCOMING MATCHES
                  </button>
                </div>

                {/* Match Search Input with Placeholder Directive */}
                <div className="relative flex-1 max-w-md">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 text-xs">🔍</span>
                  <input 
                    type="text" 
                    value={matchSearchQuery} 
                    onChange={(e) => setMatchSearchQuery(e.target.value)} 
                    placeholder="Enter team, date (YYYY-MM-DD), or league directive to filter..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
                  />
                </div>
              </div>

              <div id="matches-container" className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                {(() => {
                  const filtered = getFilteredMatches();
                  if (!filtered.length) {
                    return (
                      <div className="col-span-3 text-center py-12 bg-[#0f172a] rounded-2xl border border-slate-800">
                        <p className="text-xs text-slate-400">No {activeMatchTab === 'past' ? 'past' : 'upcoming'} matches found matching query "{matchSearchQuery}".</p>
                      </div>
                    );
                  }
                  const displayItems = filtered.slice(0, 3);
                  return displayItems.map((m, idx) => renderMatchPredictionCard(m, idx === displayItems.length - 1));
                })()}
              </div>

              {userProfile.role === 'admin' && (
                <div className="pt-4 border-t border-slate-800 flex justify-center">
                  <button onClick={() => openFloatingAdminModal('matches')} className="bg-emerald-500 text-black font-extrabold px-8 py-3 rounded-2xl text-xs uppercase tracking-wider hover:bg-emerald-400 transition flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    <span>➕</span> ADD PREDICTION
                  </button>
                </div>
              )}
            </section>

            {/* Grid for Fixtures & Trending */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Fixtures Section */}
              <section id="fixtures-section" className="bg-[#0b101d] border border-cyan-500/30 rounded-3xl p-8 flex flex-col justify-between space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 section-header">
                    <div>
                      <h3 
                        className="font-extrabold uppercase tracking-wider text-lg text-white font-mono cursor-pointer hover:text-cyan-400 transition" 
                        onClick={() => openGoogleSearchIframe('Upcoming football fixtures schedule')}
                      >
                        UPCOMING FIXTURES
                      </h3>
                      <span className="text-xs text-slate-400">Organized Fixtures Directive</span>
                    </div>
                  </div>
                  <div id="fixtures-container" className="space-y-4">
                    {fixturesData.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500">No upcoming fixtures recorded.</div>
                    ) : (
                      fixturesData.slice(0, 3).map((f, idx) => renderFixtureCard(f, idx === Math.min(2, fixturesData.length - 1)))
                    )}
                  </div>
                </div>
                {userProfile.role === 'admin' && (
                  <div className="pt-4 border-t border-slate-800 flex justify-center">
                    <button onClick={() => openFloatingAdminModal('fixtures')} className="bg-slate-900 border border-cyan-500 text-cyan-400 font-bold px-6 py-2.5 rounded-2xl text-xs hover:bg-cyan-500 hover:text-black transition flex items-center gap-2">
                      <span>➕</span> ADD FIXTURE
                    </button>
                  </div>
                )}
              </section>

              {/* Trending News Section */}
              <section id="trending-section" className="bg-[#0b101d] border border-amber-500/30 rounded-3xl p-8 flex flex-col justify-between space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 section-header">
                    <div>
                      <h3 
                        className="font-extrabold uppercase tracking-wider text-lg text-white font-mono cursor-pointer hover:text-amber-400 transition" 
                        onClick={() => openGoogleSearchIframe('Trending football news updates')}
                      >
                        🔥 TRENDING NEWS
                      </h3>
                      <span className="text-xs text-slate-400">Discussions Feed</span>
                    </div>
                  </div>
                  <div id="trending-container" className="space-y-4">
                    {trendingData.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500">No trending headlines.</div>
                    ) : (
                      trendingData.slice(0, 3).map((t, idx) => renderTrendingCard(t, idx === Math.min(2, trendingData.length - 1)))
                    )}
                  </div>
                </div>
                {userProfile.role === 'admin' && (
                  <div className="pt-4 border-t border-slate-800 flex justify-center">
                    <button onClick={() => openFloatingAdminModal('trending')} className="bg-slate-900 border border-amber-500 text-amber-400 font-bold px-6 py-2.5 rounded-2xl text-xs hover:bg-amber-500 hover:text-black transition flex items-center gap-2">
                      <span>➕</span> ADD NEWS
                    </button>
                  </div>
                )}
              </section>

            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-800 bg-[#0b0f19] mt-16 py-8 px-6 text-center text-xs text-slate-400">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <p>© 2026 MTL Football Intelligence Hub. All rights reserved.</p>
              <div className="flex items-center gap-6">
                <a href="/dashboard" className="text-emerald-400 font-bold hover:underline">Dashboard</a>
                <a href="#" className="hover:text-emerald-400 transition">Privacy Policy</a>
                <a href="#" className="hover:text-emerald-400 transition">Terms of Service</a>
                <a href="#" onClick={() => setDialingModalOpen(true)} className="hover:text-emerald-400 transition">Developed BY M. Lennox</a>
              </div>
            </div>
          </footer>
        </div>

        {/* Google Iframe Modal Automated to AI MODE */}
        {googleIframeModal.open && (
          <div id="google-iframe-modal" className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col p-4 sm:p-8 my-auto">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 mb-3 flex items-center justify-between shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-black font-extrabold flex items-center justify-center font-mono">MTL</div>
                <div>
                  <h4 className="text-xs font-bold font-mono text-emerald-400">QUICK SEARCH</h4>
                  <p id="google-search-query-display" className="text-[10px] text-slate-400 font-mono">"{googleIframeModal.query}"</p>
                </div>
              </div>
              <button onClick={closeGoogleIframeModal} className="w-8 h-8 rounded-full bg-red-900/40 text-red-300 border border-red-500/30 flex items-center justify-center font-bold text-xs hover:bg-red-800 transition">✕</button>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-slate-800 bg-white shadow-2xl">
              <iframe id="google-search-iframe" className="w-full h-full border-0" src={`https://www.google.com/search?q=${encodeURIComponent(googleIframeModal.query)}&udm=14&udm=28&igu=1`}></iframe>
            </div>
          </div>
        )}

        {/* Global Chat Floating Drawer */}
        <div id="floating-chat-container" className="fixed bottom-6 right-6 z-40">
          <button onClick={() => setGlobalChatOpen(prev => !prev)} className="w-14 h-14 rounded-full bg-emerald-500 text-black flex items-center justify-center text-2xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 transition transform">💬</button>
          <div id="chat-drawer" className={`${globalChatOpen ? '' : 'hidden'} absolute bottom-20 right-0 w-80 sm:w-96 bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[480px] overflow-hidden`}>
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <button onClick={() => setGlobalChatOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            
            <div id="global-chat-messages" className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
              {globalChatMessages.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-8">Welcome !</div>
              ) : (
                globalChatMessages.map(msg => {
                  const isMe = currentUser && msg.user_id === currentUser.id;
                  const canEdit = userProfile.role === 'admin' || isMe;
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className="text-[9px] text-slate-400 mb-0.5 px-1 flex items-center gap-2">
                        <span>{msg.user} • {msg.time}</span>
                        {canEdit && (
                          <>
                            <button onClick={() => editChatMessage(msg.id, false)} className="text-amber-400 hover:underline">Edit</button>
                            <button onClick={() => deleteChatMessage(msg.id, false)} className="text-red-400 hover:underline">Delete</button>
                          </>
                        )}
                      </div>
                      <div className={`px-3.5 py-2 text-xs rounded-2xl border ${isMe ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30 rounded-tr-none' : 'bg-slate-900 text-slate-200 border-slate-800 rounded-tl-none'}`}>{msg.text}</div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
              <input 
                type="text" 
                value={globalChatInput} 
                onChange={(e) => setGlobalChatInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && sendGlobalChatMessage()} 
                placeholder="Enter text here..." 
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
              <button onClick={sendGlobalChatMessage} className="bg-emerald-500 text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-400 transition">Send</button>
            </div>
          </div>
        </div>

        {/* Fullscreen Comments Modal */}
        {commentsModal.open && (
          <div id="fullscreen-comments-modal" className="fixed inset-0 bg-[#060911]/95 backdrop-blur-2xl z-50 p-6 md:p-12 overflow-y-auto flex flex-col justify-between">
            <div className="max-w-4xl w-full mx-auto bg-[#0f172a] border-2 border-emerald-500/50 rounded-3xl p-6 md:p-8 shadow-[0_0_80px_rgba(0,0,0,0.9)] relative flex-1 flex flex-col justify-between space-y-6 my-auto">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center font-bold text-lg font-mono"></div>
                  <div>
                    <h3 className="text-lg md:text-xl font-extrabold text-white font-mono">{commentsModal.teams || 'Match Thread'}</h3>
                    <p className="text-xs text-emerald-400">Leave a comment.</p>
                  </div>
                </div>
                <button onClick={closeFullscreenCommentsModal} className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              </div>

              <div id="fullscreen-comments-list" className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[60vh]">
                {(() => {
                  const comments = matchCommentsStore[commentsModal.matchId] || [];
                  if (!comments.length) {
                    return <div className="text-center text-slate-500 py-12 text-xs font-medium">No comments posted for this match yet. Be the first to share your analysis !</div>;
                  }
                  return comments.map(c => {
                    const canEdit = userProfile.role === 'admin' || (currentUser && c.user_id === currentUser.id);
                    return (
                      <div key={c.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2 flex gap-3 items-start">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs font-mono flex-shrink-0">{getFirstNameInitials(c.user)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-emerald-400 font-mono">{c.user}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500">{c.time}</span>
                              {canEdit && (
                                <>
                                  <button onClick={() => editComment(c.id)} className="text-[10px] text-amber-400 hover:underline">Edit</button>
                                  <button onClick={() => deleteComment(c.id)} className="text-[10px] text-red-400 hover:underline">Delete</button>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-200 mt-1 leading-relaxed">{c.comment}</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Post a Comment</h4>
                <div className="flex gap-3">
                  <textarea 
                    value={fullscreenCommentInput} 
                    onChange={(e) => setFullscreenCommentInput(e.target.value)} 
                    rows="2" 
                    placeholder="Enter detailed match comment directive for record..." 
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <button onClick={submitFullscreenComment} className="bg-emerald-500 text-black font-extrabold px-6 py-2 rounded-xl text-xs hover:bg-emerald-400 transition self-end">Post Comment</button>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button onClick={closeFullscreenCommentsModal} className="bg-slate-900 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs hover:text-white transition">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* See More Directory Modal */}
        {statsModal.open && (
          <div id="stats-list-modal" className="fixed inset-0 bg-[#060911]/95 backdrop-blur-2xl z-50 overflow-y-auto p-6 md:p-12">
            <div className="max-w-5xl mx-auto bg-[#0f172a] border-2 border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between my-auto">
              <button onClick={closeStatsListModal} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-4 section-header">
                  <h3 className="text-2xl font-extrabold text-emerald-400 uppercase tracking-wider font-mono">{statsModal.title}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[65vh] overflow-y-auto pr-2">
                  {!statsModal.dataset || !statsModal.dataset.length ? (
                    <div className="lg:col-span-3 text-center py-12 text-xs text-slate-500">No records registered.</div>
                  ) : (
                    statsModal.dataset.map((item, i) => {
                      if (item.teams && item.prediction) return renderMatchPredictionCard(item);
                      if (item.teams && item.league) return renderFixtureCard(item);
                      if (item.title && item.rank !== undefined) return renderTrendingCard(item);
                      if (item.teams && item.minute) return renderLiveMatchCard(item);
                      return (
                        <div key={i} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                          <h4 className="font-bold text-white text-sm font-mono">{item.teams || item.title || 'Item'}</h4>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
                <button onClick={closeStatsListModal} className="bg-slate-900 border border-slate-800 text-slate-300 px-5 py-2 rounded-xl text-xs hover:text-white transition">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Match Details Modal */}
        {fullscreenMatchModal.open && fullscreenMatchModal.match && (
          <div id="fullscreen-match-modal" className="fixed inset-0 bg-[#060911]/95 backdrop-blur-2xl z-50 overflow-y-auto p-6 md:p-12">
            <div className="max-w-5xl mx-auto bg-[#0f172a] border-2 border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between my-auto">
              <button onClick={closeFullscreenMatchModal} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              <div id="fullscreen-match-content" className="space-y-8">
                {(() => {
                  const match = fullscreenMatchModal.match;
                  const type = String(match.type || 'free');
                  const typeClass = type.toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                  const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';

                  return (
                    <>
                      <div className="flex justify-between items-start border-b border-slate-800 pb-6 section-header">
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${typeClass}`}>{type} INTEL</span>
                          <h2 
                            className="text-3xl lg:text-4xl font-extrabold text-white mt-2 font-mono hover:text-emerald-400 cursor-pointer transition" 
                            onClick={() => openGoogleSearchIframe(`Live analysis ${match.teams}`)}
                          >
                            {match.teams || 'Unknown Match'}
                          </h2>
                          <p className="text-xs text-slate-400 mt-1 font-mono">Date: {match.match_date || ''} | Kickoff: {match.match_time || ''}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 uppercase tracking-widest block font-mono">Confidence</span>
                          <span className="text-2xl">{stars}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                          <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider font-mono">Prediction</span>
                          <p className="text-xl font-extrabold text-white font-mono">{match.prediction || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                          <span className="text-xs text-amber-400 font-bold uppercase tracking-wider font-mono">Decimal Odds</span>
                          <p className="text-xl font-extrabold text-white font-mono">{formatOdds(match.decimal_odds)}</p>
                        </div>
                        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                          <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider font-mono">Status & Score</span>
                          <p className="text-xl font-extrabold text-white font-mono">{match.status || 'PENDING'} ({match.final_score || 'Awaiting'})</p>
                        </div>
                      </div>
                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
                        <h4 className="font-extrabold text-sm uppercase tracking-wider text-emerald-400 font-mono">Tactical Analysis Feed</h4>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{match.analysis_text || 'No tactical breakdown provided.'}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button onClick={openMatchChatModalFromFullscreen} className="bg-slate-900 border border-slate-800 text-slate-200 px-4 py-2 rounded-xl text-xs hover:text-emerald-400 transition flex items-center gap-2">💬 Open Chat</button>
                  <button onClick={() => setDialingModalOpen(true)} className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:text-black transition">📞 Call</button>
                </div>
                <button onClick={closeFullscreenMatchModal} className="bg-slate-900 border border-slate-800 text-slate-300 px-5 py-2 rounded-xl text-xs hover:text-white transition">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Match Chat Modal */}
        {matchChatModal.open && (
          <div id="match-chat-modal" className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-[#0f172a] border-2 border-slate-800 rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl my-auto">
              <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-emerald-400 font-mono">{matchChatModal.teams}</h4>
                  <p className="text-[10px] text-slate-400">Match discussion Group</p>
                </div>
                <button onClick={closeMatchChatModal} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
              </div>
              
              <div id="match-chat-messages" className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
                {(() => {
                  const msgs = matchChatStore[matchChatModal.matchId] || [];
                  if (!msgs.length) return <div className="text-center text-slate-500 text-xs py-8">Start a discussion for this match!</div>;
                  return msgs.map(msg => {
                    const isMe = currentUser && msg.user_id === currentUser.id;
                    const canEdit = userProfile.role === 'admin' || isMe;
                    return (
                      <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                        <div className="text-[9px] text-slate-400 mb-0.5 px-1 flex items-center gap-2">
                          <span>{msg.user} • {msg.time}</span>
                          {canEdit && (
                            <>
                              <button onClick={() => editChatMessage(msg.id, true)} className="text-amber-400 hover:underline">Edit</button>
                              <button onClick={() => deleteChatMessage(msg.id, true)} className="text-red-400 hover:underline">Delete</button>
                            </>
                          )}
                        </div>
                        <div className={`px-3.5 py-2 text-xs rounded-2xl border ${isMe ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30 rounded-tr-none' : 'bg-slate-900 text-slate-200 border-slate-800 rounded-tl-none'}`}>{msg.text}</div>
                      </div>
                    );
                  });
                })()}
              </div>
              
              <div className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
                <input 
                  type="text" 
                  value={matchChatInput} 
                  onChange={(e) => setMatchChatInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && sendMatchChatMessage()} 
                  placeholder="Enter match discussion directive..." 
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
                <button onClick={sendMatchChatMessage} className="bg-emerald-500 text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-400 transition">Post</button>
              </div>
            </div>
          </div>
        )}

        {/* Hotline Modal */}
        {dialingModalOpen && (
          <div id="dialing-modal" className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-[#0f172a] border-2 border-slate-800 rounded-3xl w-full max-w-2xl p-6 md:p-8 space-y-6 shadow-2xl my-auto">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center text-xl">📞</div>
                  <div>
                    <h3 className="text-lg font-bold font-mono text-white">Live Call Centre</h3>
                    <p className="text-xs text-slate-400">Direct call support</p>
                  </div>
                </div>
                <button onClick={() => setDialingModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">WHATSAPP</span>
                    <h4 className="font-bold text-sm text-white mt-1">Chat on WhatsApp</h4>
                    <p className="text-xs text-slate-400">Message us directly on WhatsApp.</p>
                  </div>
                  <a href="https://wa.me/254716883895" target="_blank" rel="noopener noreferrer" className="w-full bg-emerald-500 text-black text-center text-xs font-bold py-2.5 rounded-xl hover:bg-emerald-400 transition mt-3 block">💬 WhatsApp +254716883895</a>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">PHONE CALL</span>
                    <h4 className="font-bold text-sm text-white mt-1">Direct Phone Call</h4>
                    <p className="text-xs text-slate-400">Dial live support line directly from your device.</p>
                  </div>
                  <a href="tel:+254716883895" className="w-full bg-amber-500/10 border border-amber-500 text-amber-400 text-center text-xs font-bold py-2.5 rounded-xl hover:bg-amber-500 hover:text-black transition mt-3 block">📞 Call +254716883895</a>
                </div>
              </div>
              <div className="text-center pt-2">
                <button onClick={() => setDialingModalOpen(false)} className="text-xs text-slate-400 hover:text-white">Close Call Centre</button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Floating Container */}
        {adminModal.open && (
          <div id="admin-floating-modal" className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-[#0f172a] border-2 border-slate-800 rounded-3xl w-full max-w-2xl p-8 space-y-6 shadow-2xl relative my-auto">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-emerald-400 uppercase tracking-wider font-mono">Admin Content Management</h3>
                  <p className="text-xs text-slate-400">Insert or update Record for {adminModal.section}</p>
                </div>
                <button onClick={closeAdminFloatingModal} className="text-slate-400 hover:text-white font-bold text-xl">✕</button>
              </div>
              
              <div id="admin-modal-form-fields" className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {Object.keys(adminFormFields).map((fieldKey) => (
                  <div key={fieldKey}>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1">{fieldKey.replace('_', ' ')}</label>
                    <input 
                      type="text" 
                      value={adminFormFields[fieldKey]} 
                      onChange={(e) => setAdminFormFields({ ...adminFormFields, [fieldKey]: e.target.value })} 
                      placeholder={`Enter ${fieldKey.replace('_', ' ')} directive...`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4 border-t border-slate-800 pt-4">
                <button onClick={closeAdminFloatingModal} className="px-5 py-2.5 rounded-xl text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 transition">Cancel</button>
                <button onClick={saveAdminEntry} className="px-6 py-2.5 rounded-xl text-xs bg-emerald-500 text-black font-extrabold hover:bg-emerald-400 transition">Save Entry</button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {settingsModalOpen && (
          <div id="settings-modal" className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-[#0f172a] border-2 border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl my-auto">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-emerald-400 uppercase tracking-wider font-mono">User Preferences</h3>
                <button onClick={() => setSettingsModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
              </div>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Odds Format</label>
                  <select id="pref-odds-format" value={userProfile.odds_format} onChange={updateProfileSettings} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500">
                    <option value="decimal">Decimal (e.g. 1.85)</option>
                    <option value="fractional">Fractional (e.g. 85/100)</option>
                    <option value="american">American (e.g. -118)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Language Directive</label>
                  <select id="pref-language" value={userProfile.language} onChange={updateProfileSettings} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500">
                    <option value="en">English</option>
                    <option value="sw">Swahili</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-300 font-semibold">High Contrast View</span>
                  <button onClick={toggleContrastMode} className={`px-4 py-1.5 rounded-xl font-bold transition ${contrastMode ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300'}`}>{contrastMode ? 'ON' : 'OFF'}</button>
                </div>
              </div>
              <button onClick={() => setSettingsModalOpen(false)} className="w-full bg-emerald-500 text-black py-2.5 rounded-xl font-extrabold text-xs hover:bg-emerald-400 transition">Save & Close</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
