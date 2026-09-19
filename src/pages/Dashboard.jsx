import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

export default function Dashboard() {
  const navigate = useNavigate();

  // Navigation & Core States
  const [activeNav, setActiveNav] = useState('home');
  const [clock, setClock] = useState('00:00:00');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeSearchFilter, setActiveSearchFilter] = useState('prediction');
  
  // User Profile Details
  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState('Loading profile...');
  const [userEmail, setUserEmail] = useState('Checking session...');
  const [createdAt, setCreatedAt] = useState('N/A');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState({ role: 'user', odds_format: 'decimal', language: 'en', high_contrast: false });

  // Floating Google Search Iframe Modal
  const [googleQuery, setGoogleQuery] = useState('');
  const [iframeSrc, setIframeSrc] = useState('about:blank');
  
  // Toast state
  const [toast, setToast] = useState({ show: false, title: '', message: '', isError: false });
  const toastTimerRef = useRef(null);

  // Database Synced Feeds
  const [matchesData, setMatchesData] = useState([]);
  const [fixturesData, setFixturesData] = useState([]);
  const [trendingData, setTrendingData] = useState([]);
  const [liveMatchesData, setLiveMatchesData] = useState([]);
  const [globalChatMessages, setGlobalChatMessages] = useState([]);
  const [matchCommentsStore, setMatchCommentsStore] = useState({});
  const [matchChatStore, setMatchChatStore] = useState({});
  const [matchReactionsMap, setMatchReactionsMap] = useState({});

  // UI Tabs & Modals
  const [activeMatchTab, setActiveMatchTab] = useState('future');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [activeFullscreenMatch, setActiveFullscreenMatch] = useState(null);
  const [activeFullscreenCommentMatch, setActiveFullscreenCommentMatch] = useState(null);
  const [activeMatchChat, setActiveMatchChat] = useState(null);
  const [reactionModalData, setReactionModalData] = useState({ open: false, title: '', users: [] });
  const [statsModalData, setStatsModalData] = useState({ open: false, title: '', items: [] });
  const [adminModal, setAdminModal] = useState({ open: false, section: '', itemId: null, formData: {} });

  // Input states for comments/chats
  const [fullscreenCommentInput, setFullscreenCommentInput] = useState('');
  const [globalChatInput, setGlobalChatInput] = useState('');
  const [matchChatInput, setMatchChatInput] = useState('');

  // 3.js 4D Canvas Ref
  const canvasRef = useRef(null);

  // -------------------------------------------------------------
  // 1. INITIALIZATION & AUTHENTICATION
  // -------------------------------------------------------------
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setClock(new Date().toLocaleTimeString([], { hour12: false }));
    }, 1000);

    init4DAnimationEngine();

    const checkSessionAndInitialize = async () => {
      try {
        const { data: { session }, error: sessionError } = await db.auth.getSession();
        if (sessionError || !session) {
          navigate('/auth', { replace: true });
          return;
        }

        const user = session.user;
        setCurrentUser(user);
        setUserEmail(user.email || 'No Email Found');
        localStorage.setItem("mtl_auth_token", session.access_token);

        if (user.created_at) {
          setCreatedAt(new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }));
        }

        const { data: profile, error: profileError } = await db
          .from('profiles')
          .select('full_name, name, email, role, is_admin, admin')
          .eq('id', user.id)
          .maybeSingle();

        const dbName = profile?.full_name || profile?.name;
        const computedName = dbName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        setUserName(computedName);

        const isUserAdmin = profile?.role === 'admin' || profile?.is_admin === true || profile?.admin === true || user.email?.endsWith('@admin.com');
        setIsAdmin(isUserAdmin);
        setUserProfile(prev => ({ ...prev, role: isUserAdmin ? 'admin' : 'user', username: computedName, email: user.email }));

        // Initial Direct Supabase Load
        await loadAllDatabaseFeeds();

      } catch (err) {
        console.error("Session check exception:", err);
        navigate('/auth', { replace: true });
      }
    };

    checkSessionAndInitialize();

    // Supabase Realtime Subscriptions Sync
    const chatChannel = db.channel('public:chats')
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

    const matchesChannel = db.channel('public:matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, async () => {
        await loadMatchesFromDB();
      })
      .subscribe();

    const fixturesChannel = db.channel('public:fixtures')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, async () => {
        await loadFixturesFromDB();
      })
      .subscribe();

    const trendingChannel = db.channel('public:trending')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trending' }, async () => {
        await loadTrendingFromDB();
      })
      .subscribe();

    const liveRefreshTimer = setInterval(() => {
      updateLiveMatches();
    }, 5000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(liveRefreshTimer);
      db.removeChannel(chatChannel);
      db.removeChannel(commentsChannel);
      db.removeChannel(reactionsChannel);
      db.removeChannel(matchesChannel);
      db.removeChannel(fixturesChannel);
      db.removeChannel(trendingChannel);
    };
  }, [navigate]);

  // Sync Live matches status when matches change
  useEffect(() => {
    updateLiveMatches();
  }, [matchesData]);

  // -------------------------------------------------------------
  // 2. 4D THREE.JS BACKGROUND ANIMATION ENGINE
  // -------------------------------------------------------------
  const init4DAnimationEngine = () => {
    if (!canvasRef.current || !window.THREE) return;
    const THREE = window.THREE;

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
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
    };
  };

  // -------------------------------------------------------------
  // 3. DATABASE REACTION, COMMENT, CHAT & FEED LOADERS
  // -------------------------------------------------------------
  const loadAllDatabaseFeeds = async () => {
    await loadDatabaseReactions();
    await Promise.all([
      loadMatchesFromDB(),
      loadFixturesFromDB(),
      loadTrendingFromDB(),
      loadDatabaseComments(),
      loadDatabaseChats()
    ]);
  };

  const loadDatabaseReactions = async () => {
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
    } catch (e) { console.error("Error loading reactions", e); }
  };

  const loadMatchesFromDB = async () => {
    try {
      const { data, error } = await db.from('matches').select('*').order('created_at', { ascending: false });
      if (error) return;
      if (Array.isArray(data)) {
        const normalized = data.map(m => normalizeMatch(m));
        setMatchesData(normalized);
      }
    } catch (e) { console.error("Error loading matches", e); }
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
      if (error) return;
      if (Array.isArray(data)) {
        setFixturesData(data.map(fix => ({
          ...fix,
          match_date: fix.match_date ?? fix.date ?? '',
          match_time: fix.match_time ?? fix.time ?? '',
          badge: fix.badge || getTeamBadge(fix.teams)
        })));
      }
    } catch (e) { console.error("Error loading fixtures", e); }
  };

  const loadTrendingFromDB = async () => {
    try {
      const { data, error } = await db.from('trending').select('*').order('rank', { ascending: true });
      if (error) return;
      if (Array.isArray(data)) {
        setTrendingData(data.map(item => ({
          ...item,
          rank: item.rank ?? '',
          title: item.title ?? '',
          comments_count: item.comments_count ?? item.comments ?? 0
        })));
      }
    } catch (e) { console.error("Error loading trending", e); }
  };

  const loadDatabaseComments = async () => {
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
    } catch (e) { console.error("Error loading comments", e); }
  };

  const loadDatabaseChats = async () => {
    try {
      const { data, error } = await db.from('chats').select('*').order('created_at', { ascending: true });
      if (error) return;
      if (Array.isArray(data)) {
        const globals = [];
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
            globals.push(parsed);
          } else {
            const mId = String(msg.match_id);
            if (!matchStore[mId]) matchStore[mId] = [];
            matchStore[mId].push(parsed);
          }
        });
        setGlobalChatMessages(globals);
        setMatchChatStore(matchStore);
      }
    } catch (e) { console.error("Error loading chats", e); }
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
      id: match.id,
      league: match.league || match.competition || 'FOOTBALL',
      teams: match.teams || 'Unknown Teams',
      score: match.score || match.final_score || '0 - 0',
      minute: minuteStr,
      progress,
      details: match.live_details || match.details || match.analysis_text || 'Live match intelligence available.'
    };
  };

  const getTeamBadge = (teams) => {
    if (!teams) return '⚽';
    const firstTeam = String(teams).split(/\s+vs\.?\s+/i)[0].trim();
    const words = firstTeam.split(/\s+/).filter(Boolean);
    return words.length >= 2 ? (words[0].charAt(0) + words[1].charAt(0)).toUpperCase() : firstTeam.substring(0, 3).toUpperCase();
  };

  const getFirstNameInitials = (name) => {
    if (!name) return 'MT';
    const cleanName = String(name).trim();
    const parts = cleanName.split(/\s+/);
    const firstName = parts[0];
    return firstName.length >= 2 ? firstName.substring(0, 2).toUpperCase() : firstName.charAt(0).toUpperCase();
  };

  // -------------------------------------------------------------
  // 4. ACTION HANDLERS & SUPABASE MUTATIONS
  // -------------------------------------------------------------
  const showToast = (title, message, isError = false) => {
    setToast({ show: true, title, message, isError });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
  };

  const navigateTo = (route) => {
    setActiveNav(route);
    showToast("ROUTING", `Opening ${route.toUpperCase()}`);
    switch (route) {
      case 'fixtures': navigate('/fixtures'); break;
      case 'group-chat':
      case 'community': navigate('/group-chats'); break;
      case 'past-predictions': navigate('/past-predictions'); break;
      case 'ai-predictions': navigate('/ai-predictions'); break;
      case 'news': navigate('/news'); break;
      case 'clubs': navigate('/clubs'); break;
      case 'live': navigate('/live'); break;
      case 'trending': navigate('/trending'); break;
      case 'notifications': navigate('/notifications'); break;
      case 'predictions': navigate('/predictions'); break;
      case 'home':
      default: navigate('/dashboard'); break;
    }
  };

  const executeGoogleSearch = (queryOverride) => {
    const q = queryOverride || googleQuery.trim();
    if (!q) { showToast("SEARCH", "Enter a query first.", true); return; }
    const searchUrl = `https://www.google.com/search?igu=1&q=${encodeURIComponent(q + ' football ' + activeSearchFilter)}`;
    setIframeSrc(searchUrl);
    setIsSearchOpen(true);
    showToast("SEARCH", `Loading intelligence inside floating engine...`);
  };

  const reactToMatch = async (matchId, type) => {
    const match = matchesData.find(m => String(m.id) === String(matchId));
    if (!match) return;

    const mId = String(matchId);
    const userId = currentUser?.id || 'guest';
    const matchReactions = matchReactionsMap[mId] || [];
    const userPrevReaction = matchReactions.find(r => r.user_id === userId);

    let updatedReactions = { ...(match.reactions || { fire: 0, heart: 0, dislike: 0 }) };

    if (userPrevReaction) {
      if (userPrevReaction.reaction === type) {
        updatedReactions[type] = Math.max(0, Number(updatedReactions[type] || 0) - 1);
        try { await db.from('reactions').delete().eq('match_id', matchId).eq('user_id', userId); } catch (e) {}
      } else {
        const oldType = userPrevReaction.reaction;
        updatedReactions[oldType] = Math.max(0, Number(updatedReactions[oldType] || 0) - 1);
        updatedReactions[type] = Number(updatedReactions[type] || 0) + 1;
        try {
          await db.from('reactions').upsert([{ 
            match_id: matchId, 
            user_id: userId, 
            username: userName, 
            reaction_type: type 
          }], { onConflict: 'match_id,user_id' });
        } catch (e) {}
      }
    } else {
      updatedReactions[type] = Number(updatedReactions[type] || 0) + 1;
      try {
        await db.from('reactions').insert([{ 
          match_id: matchId, 
          user_id: userId, 
          username: userName, 
          reaction_type: type 
        }]);
      } catch (e) {}
    }

    try { await db.from('matches').update({ reactions: updatedReactions }).eq('id', matchId); } catch (err) {}
    await loadDatabaseReactions();
    await loadMatchesFromDB();
  };

  const submitFullscreenComment = async () => {
    if (!fullscreenCommentInput.trim() || !activeFullscreenCommentMatch) {
      showToast("COMMENT", "Please enter a comment.", true);
      return;
    }

    try {
      const payload = {
        match_id: activeFullscreenCommentMatch.id,
        username: userName,
        comment: sanitizeInput(fullscreenCommentInput.trim()),
        user_id: currentUser?.id
      };
      const { error } = await db.from('comments').insert([payload]);
      if (error) {
        showToast("ERROR", "Failed to save comment to database.", true);
      } else {
        showToast("SUCCESS", "Comment published!", false);
        setFullscreenCommentInput('');
        await loadDatabaseComments();
      }
    } catch (err) {
      showToast("ERROR", err.message || "Error submitting comment", true);
    }
  };

  const sendGlobalChatMessage = async () => {
    if (!globalChatInput.trim()) return;
    try {
      const payload = {
        username: userName,
        message: sanitizeInput(globalChatInput.trim()),
        user_id: currentUser?.id
      };
      const { error } = await db.from('chats').insert([payload]);
      if (!error) {
        setGlobalChatInput('');
        await loadDatabaseChats();
      }
    } catch (err) {
      showToast("ERROR", "Security exception sending message", true);
    }
  };

  const sendMatchChatMessage = async () => {
    if (!matchChatInput.trim() || !activeMatchChat) return;
    try {
      const payload = {
        match_id: activeMatchChat.id,
        username: userName,
        message: sanitizeInput(matchChatInput.trim()),
        user_id: currentUser?.id
      };
      const { error } = await db.from('chats').insert([payload]);
      if (!error) {
        setMatchChatInput('');
        await loadDatabaseChats();
      }
    } catch (err) {
      showToast("ERROR", "Security exception sending message", true);
    }
  };

  // Admin CRUD operations
  const saveAdminEntry = async () => {
    const { section, itemId, formData } = adminModal;
    try {
      if (section === 'matches') {
        const payload = {
          teams: sanitizeInput(formData.teams || ''),
          league: sanitizeInput(formData.league || ''),
          match_date: formData.match_date || '',
          match_time: formData.match_time || '',
          prediction: sanitizeInput(formData.prediction || ''),
          decimal_odds: parseFloat(formData.decimal_odds) || 2.0,
          prob_home: parseFloat(formData.prob_home) || 45,
          prob_draw: parseFloat(formData.prob_draw) || 25,
          prob_away: parseFloat(formData.prob_away) || 30,
          analysis_text: sanitizeInput(formData.analysis_text || '')
        };
        if (itemId) await db.from('matches').update(payload).eq('id', itemId);
        else await db.from('matches').insert([payload]);
        await loadMatchesFromDB();

      } else if (section === 'fixtures') {
        const payload = {
          teams: sanitizeInput(formData.teams || ''),
          league: sanitizeInput(formData.league || ''),
          match_date: formData.match_date || '',
          match_time: formData.match_time || '',
          badge: getTeamBadge(formData.teams)
        };
        if (itemId) await db.from('fixtures').update(payload).eq('id', itemId);
        else await db.from('fixtures').insert([payload]);
        await loadFixturesFromDB();

      } else if (section === 'trending') {
        const payload = {
          rank: parseInt(formData.rank, 10) || 1,
          title: sanitizeInput(formData.title || '')
        };
        if (itemId) await db.from('trending').update(payload).eq('id', itemId);
        else await db.from('trending').insert([payload]);
        await loadTrendingFromDB();
      }

      showToast("ADMIN", "Record successfully saved!", false);
      setAdminModal({ open: false, section: '', itemId: null, formData: {} });
    } catch (e) {
      showToast("ADMIN ERROR", "Failed to save database entry.", true);
    }
  };

  const deleteDatabaseRecord = async (table, id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await db.from(table).delete().eq('id', id);
      showToast("DELETED", `Record removed from ${table}`, false);
      if (table === 'matches') loadMatchesFromDB();
      if (table === 'fixtures') loadFixturesFromDB();
      if (table === 'trending') loadTrendingFromDB();
    } catch (e) {
      showToast("ERROR", `Failed to delete record from ${table}`, true);
    }
  };

  const logout = async () => {
    try {
      await db.auth.signOut();
      localStorage.removeItem("mtl_auth_token");
    } catch (err) { console.error(err); }
    setIsProfileOpen(false);
    showToast("SESSION", "Signed out successfully.");
    setTimeout(() => { navigate('/auth', { replace: true }); }, 800);
  };

  // Filtered Matches
  const filteredMatches = matchesData.filter(m => {
    const isFT = String(m.status || '').toUpperCase() === 'FT';
    const kickoff = parseMatchDateTime(m.match_date, m.match_time);
    const now = new Date();
    const isPastDate = kickoff ? kickoff.getTime() < now.getTime() - (120 * 60 * 1000) : false;
    const isPastMatch = isFT || isPastDate;

    if (activeMatchTab === 'past' && !isPastMatch) return false;
    if (activeMatchTab === 'future' && isPastMatch) return false;

    if (matchSearchQuery) {
      const q = matchSearchQuery.toLowerCase();
      return String(m.teams || '').toLowerCase().includes(q) ||
             String(m.league || '').toLowerCase().includes(q) ||
             String(m.match_date || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="dashboard-root">
      {/* 4D Three.js Holographic Background Canvas */}
      <canvas ref={canvasRef} id="bg-4d-canvas" className="fixed inset-0 pointer-events-none z-0" />
      <div className="background-grid"></div>
      <div className="scanline"></div>

      <style>{`
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100vh;
          background: #0a1422;
          overflow-x: hidden;
        }

        .dashboard-root * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          -webkit-tap-highlight-color: transparent;
          line-height: 1.45;
        }

        .dashboard-root {
          --bg: #0a1422;
          --bg-2: #101d2e;
          --surface: rgba(25, 40, 60, 0.95);
          --surface-strong: rgba(23, 38, 57, 0.99);
          --border: rgba(255, 255, 255, 0.15);
          --border-active: rgba(52, 211, 153, 0.85);
          --text: #ffffff;
          --muted: #c4d2e3;
          --dim: #91a4bb;
          --green: #4ade80;
          --cyan: #2dd4bf;
          --purple: #d8b4fe;
          --orange: #fb923c;
          --yellow: #fde047;
          --blue: #60a5fa;
          --pink: #fb7185;
          min-height: 100vh;
          width: 100%;
          max-width: 100vw;
          color: var(--text);
          background: 
            radial-gradient(circle at 50% -10%, rgba(16, 185, 129, .15), transparent 34%),
            radial-gradient(circle at 10% 30%, rgba(6, 182, 212, .08), transparent 25%),
            var(--bg);
          position: relative;
          overflow-x: hidden;
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
          background-image: linear-gradient(rgba(255, 255, 255, .02) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255, 255, 255, .02) 1px, transparent 1px);
          background-size: 35px 35px;
          mask-image: linear-gradient(to bottom, black, transparent 90%);
        }

        .scanline {
          position: fixed;
          left: 0;
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(16, 185, 129, .3), transparent);
          z-index: 2;
          animation: scan 8s linear infinite;
          pointer-events: none;
        }

        @keyframes scan {
          0% { top: -10%; opacity: 0; }
          10% { opacity: .6; }
          90% { opacity: .6; }
          100% { top: 110%; opacity: 0; }
        }

        .pro-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          backdrop-filter: blur(12px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }

        .pro-card:hover {
          border-color: var(--border-active);
          transform: translateY(-2px);
          box-shadow: 0 12px 40px 0 rgba(16, 185, 129, 0.15);
        }

        .water-progress-container {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }

        .water-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--green), var(--cyan));
          border-radius: 999px;
          transition: width 0.5s ease;
        }

        .chat-bubble-me {
          background: linear-gradient(135deg, #059669, #047857);
          color: white;
          border-radius: 14px 14px 2px 14px;
        }

        .chat-bubble-other {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          border: 1px solid var(--border);
          border-radius: 14px 14px 14px 2px;
        }

        .dashboard-header {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 50;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .logo-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #10b981, #047857);
          box-shadow: 0 0 15px rgba(16, 185, 129, .4);
          font-weight: 800;
          font-size: 14px;
        }

        .logo-sub {
          color: var(--green);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .logo-main {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .dashboard-nav {
          display: flex;
          gap: 18px;
        }

        .dashboard-nav a {
          color: var(--muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          transition: .2s ease;
          position: relative;
        }

        .dashboard-nav a:hover, .dashboard-nav a.active {
          color: white;
        }

        .dashboard-nav a.active::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -4px;
          height: 2px;
          background: var(--green);
          box-shadow: 0 0 6px var(--green);
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, .05);
          color: var(--muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: .2s;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, .1);
          color: white;
          border-color: var(--green);
        }

        .avatar-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1.5px solid var(--green);
          background: linear-gradient(135deg, #10b981, #065f46);
          color: white;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      {/* DASHBOARD HEADER */}
      <header className="dashboard-header border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="logo" onClick={() => navigateTo('home')}>
          <div className="logo-icon text-white">{getFirstNameInitials(userName)}</div>
          <div className="logo-text">
            <span className="logo-sub">MTL QUANTUM INTEL</span>
            <span className="logo-main text-white">MATCH PREDICTOR</span>
          </div>
        </div>

        <nav className="dashboard-nav hidden md:flex">
          <a href="#home" onClick={(e) => { e.preventDefault(); navigateTo('home'); }} className={activeNav === 'home' ? 'active' : ''}>Overview</a>
          <a href="#fixtures" onClick={(e) => { e.preventDefault(); navigateTo('fixtures'); }} className={activeNav === 'fixtures' ? 'active' : ''}>Fixtures</a>
          <a href="#live" onClick={(e) => { e.preventDefault(); navigateTo('live'); }} className={activeNav === 'live' ? 'active' : ''}>Live Sync</a>
          <a href="#community" onClick={(e) => { e.preventDefault(); navigateTo('community'); }} className={activeNav === 'community' ? 'active' : ''}>Telegram Chat</a>
          <a href="#trending" onClick={(e) => { e.preventDefault(); navigateTo('trending'); }} className={activeNav === 'trending' ? 'active' : ''}>Headlines</a>
        </nav>

        <div className="nav-actions">
          <button className="icon-btn" onClick={() => executeGoogleSearch("football matches today")}>
            🔍
          </button>
          <div className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30 hidden sm:block">
            {clock}
          </div>
          <button className="avatar-btn" onClick={() => setIsProfileOpen(!isProfileOpen)}>
            {getFirstNameInitials(userName)}
          </button>
        </div>
      </header>

      {/* USER PROFILE DRAWER / OVERLAY */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end" onClick={() => setIsProfileOpen(false)}>
          <div className="w-80 bg-slate-900 border-l border-white/15 p-6 h-full space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white tracking-wider">USER PROFILE</h3>
              <button onClick={() => setIsProfileOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-xl font-extrabold text-emerald-400 mx-auto">
                {getFirstNameInitials(userName)}
              </div>
              <div className="text-center">
                <h4 className="font-bold text-white text-base">{userName}</h4>
                <p className="text-xs text-gray-400">{userEmail}</p>
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${isAdmin ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {isAdmin ? 'ADMINISTRATOR' : 'PREMIUM MEMBER'}
                </span>
              </div>
              <div className="bg-slate-800/80 rounded-xl p-3 border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between text-gray-300"><span>Joined:</span><span className="font-mono text-white">{createdAt}</span></div>
                <div className="flex justify-between text-gray-300"><span>Odds Format:</span><span className="text-emerald-400 uppercase font-bold">{userProfile.odds_format}</span></div>
              </div>
              {isAdmin && (
                <div className="space-y-2">
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Admin Controls</p>
                  <button onClick={() => { setIsProfileOpen(false); setAdminModal({ open: true, section: 'matches', itemId: null, formData: {} }); }} className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-black py-2 rounded-xl text-xs font-bold transition">
                    + Add New Match
                  </button>
                  <button onClick={() => { setIsProfileOpen(false); setAdminModal({ open: true, section: 'fixtures', itemId: null, formData: {} }); }} className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-black py-2 rounded-xl text-xs font-bold transition">
                    + Add New Fixture
                  </button>
                  <button onClick={() => { setIsProfileOpen(false); setAdminModal({ open: true, section: 'trending', itemId: null, formData: {} }); }} className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500 hover:text-black py-2 rounded-xl text-xs font-bold transition">
                    + Add News Headline
                  </button>
                </div>
              )}
              <button onClick={logout} className="w-full bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white py-2.5 rounded-xl text-xs font-bold transition">
                Sign Out Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT DASHBOARD CONTAINER */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* FUTURISTIC PROMPT & INTEL HERO BANNER */}
        <section className="pro-card p-6 md:p-8 relative overflow-hidden bg-gradient-to-r from-slate-900/90 via-emerald-950/40 to-slate-900/90">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-widest">
                QUANTUM MATCH ENGINE • SYNC ACTIVE
              </span>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
                Direct Supabase Intelligence Feed
              </h1>
              <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                Welcome back, <span className="text-emerald-400 font-bold">{userName}</span>. All match predictions, real-time fixture schedules, live tracking, and telegram global chats are synchronized dynamically from your Supabase database.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button onClick={() => executeGoogleSearch("Premier League live scores")} className="bg-emerald-500 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20">
                🌐 Realtime Live Google Search
              </button>
              <button onClick={() => navigateTo('fixtures')} className="bg-slate-800 border border-white/15 text-white font-bold px-4 py-2.5 rounded-xl text-xs hover:border-emerald-400 transition">
                📅 View All Fixtures
              </button>
            </div>
          </div>
        </section>

        {/* LIVE SYNC MATCHES CONTAINER */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <h2 className="text-lg font-extrabold text-white tracking-wide">Live Matches</h2>
              <span className="text-xs text-gray-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-white/10">
                {liveMatchesData.length} Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {liveMatchesData.length === 0 ? (
              <div className="col-span-3 pro-card p-8 text-center">
                <p className="text-xs text-gray-400">No live matches currently in play in Supabase database.</p>
              </div>
            ) : (
              liveMatchesData.slice(0, 3).map(match => (
                <div key={match.id} className="pro-card p-5 cursor-pointer space-y-3" onClick={() => setActiveFullscreenMatch(match)}>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span className="font-bold text-emerald-400">{match.league}</span>
                    <span className="text-red-400 font-bold animate-pulse">● LIVE {match.minute}</span>
                  </div>
                  <div className="flex justify-between items-center my-2">
                    <div className="text-center flex-1">
                      <span className="text-xs font-bold text-white block">{match.teams.split(/vs\.?/i)[0]}</span>
                    </div>
                    <span className="text-xl font-extrabold text-emerald-400 font-mono px-2">{match.score}</span>
                    <div className="text-center flex-1">
                      <span className="text-xs font-bold text-white block">{match.teams.split(/vs\.?/i)[1] || 'AWAY'}</span>
                    </div>
                  </div>
                  <div className="water-progress-container">
                    <div className="water-progress-bar" style={{ width: `${match.progress}%` }}></div>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-1">{match.details}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* MAIN MATCH PREDICTIONS GRID */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-extrabold text-white">Match Predictions Feed</h2>
              <div className="flex bg-slate-900 border border-white/10 p-1 rounded-xl text-xs">
                <button onClick={() => setActiveMatchTab('future')} className={`px-3 py-1 rounded-lg font-bold transition ${activeMatchTab === 'future' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}>
                  Upcoming
                </button>
                <button onClick={() => setActiveMatchTab('past')} className={`px-3 py-1 rounded-lg font-bold transition ${activeMatchTab === 'past' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}>
                  Past Results
                </button>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <input 
                type="text" 
                placeholder="Search team or league..." 
                value={matchSearchQuery}
                onChange={(e) => setMatchSearchQuery(e.target.value)}
                className="bg-slate-900 border border-white/15 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-400 outline-none w-full md:w-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMatches.length === 0 ? (
              <div className="col-span-3 pro-card p-12 text-center space-y-2">
                <p className="text-sm font-bold text-gray-300">No predictions found.</p>
                <p className="text-xs text-gray-500">Try adjusting your search query or switching tabs.</p>
              </div>
            ) : (
              filteredMatches.map(match => {
                const comments = matchCommentsStore[match.id] || [];
                const typeClass = match.type === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                return (
                  <div key={match.id} className="pro-card p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${typeClass}`}>
                          {match.type || 'FREE'} MATCH
                        </span>
                        <span className="text-xs text-amber-400 font-bold font-mono">
                          Odds: {match.decimal_odds || 'N/A'}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-white hover:text-emerald-400 cursor-pointer" onClick={() => executeGoogleSearch(match.teams)}>
                        {match.teams}
                      </h3>
                      <p className="text-xs text-emerald-400 font-bold">Prediction: {match.prediction} {'⭐'.repeat(match.confidence_stars || 3)}</p>
                      <p className="text-xs text-gray-300 line-clamp-2">{match.analysis_text || 'Tactical analysis synchronized.'}</p>
                    </div>

                    <div className="space-y-1 bg-slate-900/80 p-3 rounded-xl border border-white/10">
                      <div className="flex justify-between text-[10px] text-gray-300 font-bold">
                        <span>Win Probability:</span>
                        <span>H: {match.prob_home}% | D: {match.prob_draw}% | A: {match.prob_away}%</span>
                      </div>
                      <div className="water-progress-container">
                        <div className="water-progress-bar" style={{ width: `${match.prob_home}%` }}></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => reactToMatch(match.id, 'fire')} className="bg-slate-900 border border-white/10 px-2.5 py-1 rounded-lg text-xs hover:border-emerald-400 flex items-center gap-1">
                        🔥 <span>{match.reactions?.fire || 0}</span>
                      </button>
                      <button onClick={() => reactToMatch(match.id, 'heart')} className="bg-slate-900 border border-white/10 px-2.5 py-1 rounded-lg text-xs hover:border-emerald-400 flex items-center gap-1">
                        ❤️ <span>{match.reactions?.heart || 0}</span>
                      </button>
                      <button onClick={() => reactToMatch(match.id, 'dislike')} className="bg-slate-900 border border-white/10 px-2.5 py-1 rounded-lg text-xs hover:border-emerald-400 flex items-center gap-1">
                        👎 <span>{match.reactions?.dislike || 0}</span>
                      </button>
                    </div>

                    <div onClick={() => setActiveFullscreenCommentMatch(match)} className="bg-slate-900/60 rounded-xl p-3 border border-white/10 hover:border-emerald-400 cursor-pointer space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-gray-300">
                        <span>💬 Comments ({comments.length})</span>
                        <span className="text-emerald-400 text-[10px]">Open Thread ➔</span>
                      </div>
                      {comments.length > 0 && (
                        <p className="text-[11px] text-gray-400 truncate">
                          <span className="text-emerald-400 font-bold">{comments[comments.length - 1].user}:</span> {comments[comments.length - 1].comment}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <div className="flex gap-2">
                        <button onClick={() => setActiveFullscreenMatch(match)} className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black text-xs font-bold px-3 py-1.5 rounded-xl transition">
                          🔍 Details
                        </button>
                        <button onClick={() => setActiveMatchChat(match)} className="bg-slate-800 border border-white/15 text-gray-300 hover:text-emerald-400 text-xs px-3 py-1.5 rounded-xl transition">
                          💬 Chat
                        </button>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => setAdminModal({ open: true, section: 'matches', itemId: match.id, formData: match })} className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">
                            Edit
                          </button>
                          <button onClick={() => deleteDatabaseRecord('matches', match.id)} className="text-[10px] bg-red-600/20 text-red-300 px-2 py-1 rounded hover:bg-red-600 hover:text-white">
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* TWO-COLUMN LAYOUT: FIXTURES & TRENDING HEADLINES */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* FIXTURES CONTAINER */}
          <div className="pro-card p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>📅</span> Upcoming Fixtures Feed
              </h2>
              <button onClick={() => navigateTo('fixtures')} className="text-xs text-emerald-400 font-bold hover:underline">
                View All ({fixturesData.length})
              </button>
            </div>
            <div className="space-y-3">
              {fixturesData.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No upcoming fixtures synced from database.</p>
              ) : (
                fixturesData.slice(0, 4).map(fix => (
                  <div key={fix.id} className="bg-slate-900/60 p-3.5 rounded-xl border border-white/10 flex items-center justify-between hover:border-emerald-400 transition cursor-pointer" onClick={() => executeGoogleSearch(fix.teams)}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">
                        {fix.badge}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white hover:text-emerald-400">{fix.teams}</h4>
                        <span className="text-[10px] text-gray-400">{fix.league}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 block font-mono">{fix.match_time || 'TBD'}</span>
                        <span className="text-[10px] text-gray-400">{fix.match_date || 'TBD'}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setAdminModal({ open: true, section: 'fixtures', itemId: fix.id, formData: fix })} className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">Edit</button>
                          <button onClick={() => deleteDatabaseRecord('fixtures', fix.id)} className="text-[10px] bg-red-600/20 text-red-300 px-2 py-0.5 rounded">Del</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TRENDING HEADLINES CONTAINER */}
          <div className="pro-card p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>🔥</span> Trending News Feeds
              </h2>
              <button onClick={() => navigateTo('trending')} className="text-xs text-emerald-400 font-bold hover:underline">
                View Headlines
              </button>
            </div>
            <div className="space-y-3">
              {trendingData.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No news headlines registered in database.</p>
              ) : (
                trendingData.slice(0, 4).map(item => (
                  <div key={item.id} className="bg-slate-900/60 p-3.5 rounded-xl border border-white/10 flex items-center justify-between hover:border-emerald-400 transition cursor-pointer" onClick={() => executeGoogleSearch(item.title)}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-emerald-400 font-mono">#{item.rank}</span>
                      <div>
                        <h4 className="text-xs font-bold text-white hover:text-emerald-400">{item.title}</h4>
                        <span className="text-[10px] text-gray-400">💬 {item.comments_count || 120} active readers</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setAdminModal({ open: true, section: 'trending', itemId: item.id, formData: item })} className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">Edit</button>
                        <button onClick={() => deleteDatabaseRecord('trending', item.id)} className="text-[10px] bg-red-600/20 text-red-300 px-2 py-0.5 rounded">Del</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </section>

        {/* TELEGRAM GLOBAL CHAT CONTAINER */}
        <section className="pro-card p-6 space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-white/10">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>✈️</span> Telegram Global Community Chat
            </h2>
            <span className="text-xs text-emerald-400 font-mono">Realtime Supabase Sync</span>
          </div>

          <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 h-64 overflow-y-auto space-y-3">
            {globalChatMessages.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-10">No messages in global community chat yet. Start the conversation!</p>
            ) : (
              globalChatMessages.map(msg => {
                const isMe = currentUser && msg.user_id === currentUser.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-gray-400 mb-0.5 px-1">{msg.user} • {msg.time}</span>
                    <div className={`px-3.5 py-2 text-xs max-w-md ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Write a message to global channel..." 
              value={globalChatInput}
              onChange={(e) => setGlobalChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendGlobalChatMessage()}
              className="bg-slate-900 border border-white/15 text-xs text-white px-4 py-2.5 rounded-xl focus:border-emerald-400 outline-none flex-1"
            />
            <button onClick={sendGlobalChatMessage} className="bg-emerald-500 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs hover:bg-emerald-400 transition">
              Send
            </button>
          </div>
        </section>

      </main>

      {/* ------------------------------------------------------------- */}
      {/* MODALS & FLOATING OVERLAYS CONTAINER */}
      {/* ------------------------------------------------------------- */}

      {/* FULLSCREEN MATCH DETAILS MODAL */}
      {activeFullscreenMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="pro-card max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto bg-slate-900">
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded">INTEL BREAKDOWN</span>
                <h2 className="text-2xl font-extrabold text-white mt-2">{activeFullscreenMatch.teams}</h2>
                <p className="text-xs text-gray-400 font-mono">Date: {activeFullscreenMatch.match_date} | Kickoff: {activeFullscreenMatch.match_time}</p>
              </div>
              <button onClick={() => setActiveFullscreenMatch(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-white/10">
                <span className="text-[10px] text-emerald-400 font-bold block">PREDICTION</span>
                <span className="text-sm font-extrabold text-white">{activeFullscreenMatch.prediction}</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-white/10">
                <span className="text-[10px] text-amber-400 font-bold block">ODDS</span>
                <span className="text-sm font-extrabold text-white">{activeFullscreenMatch.decimal_odds || 'N/A'}</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-white/10">
                <span className="text-[10px] text-cyan-400 font-bold block">CONFIDENCE</span>
                <span className="text-sm font-extrabold text-white">{'⭐'.repeat(activeFullscreenMatch.confidence_stars || 3)}</span>
              </div>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-white/10 space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase">Tactical Analysis & Match Breakdown</h4>
              <p className="text-xs text-gray-300 leading-relaxed">{activeFullscreenMatch.analysis_text || 'No tactical breakdown registered.'}</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { const m = activeFullscreenMatch; setActiveFullscreenMatch(null); setActiveMatchChat(m); }} className="bg-emerald-500 text-black font-bold px-4 py-2 rounded-xl text-xs">
                Open Telegram Chat Thread
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN COMMENTS MODAL */}
      {activeFullscreenCommentMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="pro-card max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col bg-slate-900">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">
                Comments: <span className="text-emerald-400">{activeFullscreenCommentMatch.teams}</span>
              </h3>
              <button onClick={() => setActiveFullscreenCommentMatch(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-slate-950/60 rounded-xl border border-white/10 min-h-[220px]">
              {(matchCommentsStore[activeFullscreenCommentMatch.id] || []).length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-10">No comments posted yet. Be the first to start discussion!</p>
              ) : (
                (matchCommentsStore[activeFullscreenCommentMatch.id] || []).map(c => (
                  <div key={c.id} className="bg-slate-800/80 p-3 rounded-xl border border-white/10 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-emerald-400">{c.user}</span>
                      <span className="text-gray-500">{c.time}</span>
                    </div>
                    <p className="text-xs text-gray-200">{c.comment}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <input 
                type="text" 
                placeholder="Write a comment..." 
                value={fullscreenCommentInput}
                onChange={(e) => setFullscreenCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitFullscreenComment()}
                className="bg-slate-800 border border-white/15 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-400 outline-none flex-1"
              />
              <button onClick={submitFullscreenComment} className="bg-emerald-500 text-black font-bold px-4 py-2 rounded-xl text-xs">
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TELEGRAM MATCH CHAT THREAD MODAL */}
      {activeMatchChat && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="pro-card max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col bg-slate-900">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">
                Telegram Thread: <span className="text-emerald-400">{activeMatchChat.teams}</span>
              </h3>
              <button onClick={() => setActiveMatchChat(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-950/60 rounded-xl border border-white/10 min-h-[250px]">
              {(matchChatStore[activeMatchChat.id] || []).length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-10">No chat messages for this match yet.</p>
              ) : (
                (matchChatStore[activeMatchChat.id] || []).map(msg => {
                  const isMe = currentUser && msg.user_id === currentUser.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[9px] text-gray-400 mb-0.5">{msg.user} • {msg.time}</span>
                      <div className={`px-3 py-1.5 text-xs max-w-xs ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Send match thread message..." 
                value={matchChatInput}
                onChange={(e) => setMatchChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMatchChatMessage()}
                className="bg-slate-800 border border-white/15 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-400 outline-none flex-1"
              />
              <button onClick={sendMatchChatMessage} className="bg-emerald-500 text-black font-bold px-4 py-2 rounded-xl text-xs">
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING GOOGLE SEARCH IFRAME ENGINE MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="pro-card max-w-4xl w-full h-[85vh] flex flex-col bg-slate-900">
            <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4">
              <div className="flex gap-2 flex-1">
                <input 
                  type="text" 
                  placeholder="Google intelligence search..." 
                  value={googleQuery} 
                  onChange={(e) => setGoogleQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeGoogleSearch()}
                  className="bg-slate-800 border border-white/15 text-xs text-white px-3 py-2 rounded-xl focus:border-emerald-400 outline-none w-full"
                />
                <button onClick={() => executeGoogleSearch()} className="bg-emerald-500 text-black font-bold px-4 py-2 rounded-xl text-xs">
                  Search
                </button>
              </div>
              <button onClick={() => setIsSearchOpen(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <iframe src={iframeSrc} title="Google Live Search Engine" className="w-full flex-1 border-0 bg-white" />
          </div>
        </div>
      )}

      {/* ADMIN EDIT / ADD FLOATING MODAL */}
      {adminModal.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="pro-card max-w-md w-full p-6 space-y-4 bg-slate-900 border border-amber-500/30">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-amber-400">
                {adminModal.itemId ? 'EDIT' : 'ADD NEW'} {adminModal.section.toUpperCase()}
              </h3>
              <button onClick={() => setAdminModal({ open: false, section: '', itemId: null, formData: {} })} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              {adminModal.section === 'matches' && (
                <>
                  <input type="text" placeholder="Teams (e.g. Chelsea vs Arsenal)" value={adminModal.formData.teams || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, teams: e.target.value } })} className="w-full bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl" />
                  <input type="text" placeholder="League" value={adminModal.formData.league || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, league: e.target.value } })} className="w-full bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={adminModal.formData.match_date || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, match_date: e.target.value } })} className="bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl" />
                    <input type="time" value={adminModal.formData.match_time || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, match_time: e.target.value } })} className="bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl" />
                  </div>
                  <input type="text" placeholder="Prediction" value={adminModal.formData.prediction || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, prediction: e.target.value } })} className="w-full bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl" />
                  <input type="number" step="0.01" placeholder="Decimal Odds" value={adminModal.formData.decimal_odds || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, decimal_odds: e.target.value } })} className="w-full bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl" />
                  <textarea placeholder="Tactical Analysis" value={adminModal.formData.analysis_text || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, analysis_text: e.target.value } })} className="w-full bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl h-20" />
                </>
              )}

              {adminModal.section === 'fixtures' && (
                <>
                  <input type="text" placeholder="Teams" value={adminModal.formData.teams || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, teams: e.target.value } })} className="w-full bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl" />
                  <input type="text" placeholder="League" value={adminModal.formData.league || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, league: e.target.value } })} className="w-full bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={adminModal.formData.match_date || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, match_date: e.target.value } })} className="bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl" />
                    <input type="time" value={adminModal.formData.match_time || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, match_time: e.target.value } })} className="bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl" />
                  </div>
                </>
              )}

              {adminModal.section === 'trending' && (
                <>
                  <input type="number" placeholder="Rank #" value={adminModal.formData.rank || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, rank: e.target.value } })} className="w-full bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl" />
                  <input type="text" placeholder="Headline Title" value={adminModal.formData.title || ''} onChange={(e) => setAdminModal({ ...adminModal, formData: { ...adminModal.formData, title: e.target.value } })} className="w-full bg-slate-800 border border-white/15 text-xs text-white p-2.5 rounded-xl" />
                </>
              )}
            </div>

            <button onClick={saveAdminEntry} className="w-full bg-amber-500 text-black font-extrabold py-2.5 rounded-xl text-xs hover:bg-amber-400 transition">
              Save Database Record
            </button>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION CONTAINER */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-xl border text-xs font-bold shadow-2xl flex items-center gap-2 ${toast.isError ? 'bg-red-950 border-red-500/50 text-red-300' : 'bg-emerald-950 border-emerald-500/50 text-emerald-300'}`}>
            <span>{toast.isError ? '⚠️' : '🔔'}</span>
            <div>
              <p className="font-extrabold uppercase">{toast.title}</p>
              <p className="font-normal text-[11px]">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
