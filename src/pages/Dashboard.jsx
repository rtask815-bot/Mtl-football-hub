import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInRefiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function Dashboard() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Nav & Clock States
  const [clock, setClock] = useState('00:00:00');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeSearchFilter, setActiveSearchFilter] = useState('prediction');

  // User & Profile States
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState({
    username: 'Member',
    email: '',
    role: 'user',
    createdAt: 'N/A'
  });
  const [isAdmin, setIsAdmin] = useState(false);

  // Database Synced Containers Data
  const [matchesData, setMatchesData] = useState([]);
  const [fixturesData, setFixturesData] = useState([]);
  const [trendingData, setTrendingData] = useState([]);
  const [liveMatchesData, setLiveMatchesData] = useState([]);
  const [matchCommentsStore, setMatchCommentsStore] = useState({});
  const [matchReactionsMap, setMatchReactionsMap] = useState({});

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
  toastTimerRef = useRef(null);

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
      triggerFloatingLoader("initializing landing summary grid...", 10);
      
      const sessionValid = await checkUserSession();
      if (!sessionValid) return;

      triggerFloatingLoader("fetching neural feeds...", 40);
      await loadDatabaseReactions();

      await Promise.all([
        loadMatchesFromDB(),
        loadFixturesFromDB(),
        loadTrendingFromDB(),
        loadDatabaseComments()
      ]);

      setupDatabaseRealtimeSubscriptions();
      triggerFloatingLoader("quantum link established", 100);
      setTimeout(hideFloatingLoader, 300);
    }

    initializeSystem();

    const liveTimer = setInterval(() => {
      updateLiveMatches();
    }, 1000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(liveTimer);
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    updateLiveMatches();
  }, [matchesData]);

  // 4D Background Canvas Animation Engine
  useEffect(() => {
    if (!canvasRef.current || !window.THREE) return;

    const THREE = window.THREE;
    const canvas = canvasRef.current;
    
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
    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      torusKnot.rotation.x += 0.003 + mouseY * 0.1;
      torusKnot.rotation.y += 0.005 + mouseX * 0.1;
      particleMesh.rotation.y -= 0.001;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. AUTH & SESSION CONTROL (SUPABASE SESSION VERIFICATION)
  // ---------------------------------------------------------------------------
  async function checkUserSession() {
    try {
      // Query direct session state from Supabase Client
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
      const isUserAdmin = profile?.role === 'admin' || profile?.is_admin === true || profile?.admin === true || email.endsWith('@admin.com');

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

    db.channel('public:matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, async () => {
        await loadMatchesFromDB();
      })
      .subscribe();

    db.channel('public:fixtures')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, async () => {
        await loadFixturesFromDB();
      })
      .subscribe();

    db.channel('public:trending')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trending' }, async () => {
        await loadTrendingFromDB();
      })
      .subscribe();
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
      if (error) return;
      if (Array.isArray(data)) {
        setMatchesData(data.map(normalizeMatch));
      }
    } catch (error) { console.error(error); }
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
      if (error) return;
      if (Array.isArray(data)) {
        setFixturesData(data.map(f => ({
          ...f,
          match_date: f.match_date ?? f.date ?? '',
          match_time: f.match_time ?? f.time ?? '',
          badge: f.badge || getTeamBadge(f.teams)
        })));
      }
    } catch (error) { console.error(error); }
  }

  async function loadTrendingFromDB() {
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
    } catch (error) { console.error(error); }
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

    try {
      await db.from('reactions').insert([{ 
        match_id: matchId, 
        user_id: userId, 
        username: userProfile.username, 
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
          teams: document.getElementById('admin-teams').value.trim(),
          league: document.getElementById('admin-league').value.trim(),
          match_date: document.getElementById('admin-date').value.trim(),
          match_time: document.getElementById('admin-time').value.trim(),
          prediction: document.getElementById('admin-prediction').value.trim(),
          decimal_odds: parseFloat(document.getElementById('admin-odds').value) || 2.0,
          prob_home: parseFloat(document.getElementById('admin-prob-home').value) || 45,
          prob_draw: parseFloat(document.getElementById('admin-prob-draw').value) || 25,
          prob_away: parseFloat(document.getElementById('admin-prob-away').value) || 30,
          analysis_text: document.getElementById('admin-analysis').value.trim()
        });

        if (item?.id) {
          await db.from('matches').update(payload).eq('id', item.id);
        } else {
          await db.from('matches').insert([payload]);
        }
        await loadMatchesFromDB();

      } else if (section === 'fixtures') {
        const payload = verifyHackLocksAndSanitize({
          teams: document.getElementById('admin-teams').value.trim(),
          league: document.getElementById('admin-league').value.trim(),
          match_date: document.getElementById('admin-date').value.trim(),
          match_time: document.getElementById('admin-time').value.trim(),
          badge: getTeamBadge(document.getElementById('admin-teams').value)
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
    setIsSearchOpen(true);
    const q = query || googleQuery || 'todays top predictions';
    setIframeSrc(`https://www.google.com/search?igu=1&q=${encodeURIComponent(q)}`);
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
          background: #0a1422;
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
          padding: 16px;
        }

        .dashboard-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          backdrop-filter: blur(12px);
          margin-bottom: 24px;
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
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .water-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #34d399);
          transition: width 0.4s ease;
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

      {/* 4D Background Canvas */}
      <canvas ref={canvasRef} id="bg-4d-canvas" />
      <div className="background-grid" />

      {/* Main Dashboard Layout */}
      <div className="dashboard-wrapper">
        
        {/* HEADER: APP TITLE & PROFILE LOGO BUTTON ONLY */}
        <header className="dashboard-header">
          <div className="logo-box" onClick={() => navigateTo('home')}>
            <div className="logo-badge">{getFirstNameInitials(userProfile.username)}</div>
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>MTL QUANTUM</h1>
              <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700 }}>MATCH INTELLIGENCE SUMMARY</span>
            </div>
          </div>

          <button 
            className="profile-logo-btn" 
            onClick={() => setIsProfileOpen(true)} 
            title={`Profile (${userProfile.role.toUpperCase()})`}
          >
            {getFirstNameInitials(userProfile.username)}
          </button>
        </header>

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

        {/* TAB BUTTON CARDS-GRID */}
        <div className="hub-grid">
          <div className="hub-card" onClick={() => navigateTo('group-chats')}>
            <svg className="card-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            <div>
              <div className="title">Group Chats</div>
              <div className="sub">Join community channels</div>
            </div>
          </div>

          <div className="hub-card" onClick={() => navigateTo('predictions')}>
            <svg className="card-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            <div>
              <div className="title">Match Predictions</div>
              <div className="sub">Full odds & insights</div>
            </div>
          </div>

          <div className="hub-card" onClick={() => navigateTo('ai-predictions')}>
            <svg className="card-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <div className="title">AI Predictions</div>
              <div className="sub">Neural network models</div>
            </div>
          </div>

          <div className="hub-card" onClick={() => navigateTo('fixtures')}>
            <svg className="card-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div>
              <div className="title">Fixtures Grid</div>
              <div className="sub">Schedules & kickoffs</div>
            </div>
          </div>

          <div className="hub-card" onClick={() => navigateTo('past-predictions')}>
            <svg className="card-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="title">Past Predictions</div>
              <div className="sub">Historical match records</div>
            </div>
          </div>

          <div className="hub-card" onClick={() => navigateTo('tv')}>
            <svg className="card-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <div>
              <div className="title">LIVE TV</div>
              <div className="sub">Watch live broadcasts</div>
            </div>
          </div>
        </div>

        {/* MAIN SUMMARY SECTION GRID */}
        <div className="main-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          
          {/* COLUMN 1: TOP 3 MATCH SUMMARY CARDS */}
          <div className="match-col" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="pro-card">
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800 }}>⚡ TOP 3 MATCH PREDICTIONS</h3>
                <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Showing immediate summary matches</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {getFilteredMatches().slice(0, 3).length === 0 ? (
                  <div style={{ textTransform: 'uppercase', textAlign: 'center', padding: '30px', color: 'var(--muted)', fontSize: '12px' }}>
                    No summary matches available right now.
                  </div>
                ) : (
                  getFilteredMatches().slice(0, 3).map(match => (
                    <div key={match.id} style={{ background: '#0a1422', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)' }}>
                        <span style={{ color: 'var(--green)', fontWeight: 700 }}>{match.league || 'LEAGUE'}</span>
                        <span>{match.match_date} • {match.match_time}</span>
                      </div>
                      
                      <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '8px 0', cursor: 'pointer' }} onClick={() => setActiveMatchDetail(match)}>
                        {match.teams}
                      </h3>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', background: '#101d2e', padding: '8px 12px', borderRadius: '8px' }}>
                        <span>Prediction: <strong>{match.prediction}</strong></span>
                        <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Odds: {formatOdds(match.decimal_odds)}</span>
                      </div>

                      {/* Probability Distribution */}
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', marginBottom: '4px' }}>
                          <span>Probability</span>
                          <span>H: {match.prob_home}% | D: {match.prob_draw}% | A: {match.prob_away}%</span>
                        </div>
                        <div className="water-progress-container">
                          <div className="water-progress-bar" style={{ width: `${match.prob_home}%` }} />
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-outline" onClick={() => reactToMatch(match.id, 'fire')}>🔥 {match.reactions?.fire || 0}</button>
                          <button className="btn-outline" onClick={() => reactToMatch(match.id, 'heart')}>❤️ {match.reactions?.heart || 0}</button>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-outline" onClick={() => setActiveCommentMatch(match)}>💬 Comments ({(matchCommentsStore[match.id] || []).length})</button>
                          <button className="btn-cyber" onClick={() => setActiveMatchDetail(match)}>Details</button>
                          {isAdmin && (
                            <button className="btn-outline" style={{ color: 'var(--red)' }} onClick={() => deleteRecord('matches', match.id)}>Delete</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button className="see-more-btn" onClick={() => navigateTo('predictions')}>
                View All Predictions Page →
              </button>
            </div>
          </div>

          {/* COLUMN 2: 4 FIXTURES & 4 TRENDING NEWS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="pro-card">
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800 }}>📅 FIXTURES GOOGLE SEARCH (4)</h3>
                <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Upcoming football match schedule</span>
              </div>

              <div style={{ flex: 1 }}>
                {fixturesData.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', padding: '12px' }}>No upcoming fixtures.</div>
                ) : (
                  fixturesData.slice(0, 4).map(fix => (
                    <div key={fix.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a1422', padding: '10px', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', background: '#101d2e', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'var(--green)' }}>
                          {fix.badge}
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700 }}>{fix.teams}</div>
                          <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{fix.league}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>{fix.match_time}</div>
                        <div style={{ fontSize: '9px', color: 'var(--muted)' }}>{fix.match_date}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button className="see-more-btn" onClick={() => navigateTo('fixtures')}>
                See More Fixtures →
              </button>
            </div>

            <div className="pro-card">
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800 }}>🔥 TRENDING NEWS (4)</h3>
                <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Top football stories and transfers</span>
              </div>

              <div style={{ flex: 1 }}>
                {trendingData.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', padding: '12px' }}>No trending stories.</div>
                ) : (
                  trendingData.slice(0, 4).map(news => (
                    <div key={news.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0a1422', padding: '10px', borderRadius: '10px', marginBottom: '8px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--green)' }}>#{news.rank}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} onClick={() => openSearchModal(news.title)}>{news.title}</div>
                        <div style={{ fontSize: '10px', color: 'var(--muted)' }}>💬 {news.comments_count} interactions</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button className="see-more-btn" onClick={() => navigateTo('news')}>
                See More News →
              </button>
            </div>

          </div>
        </div>
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

      {/* FLOATING AI SEARCH MODAL */}
      {isSearchOpen && (
        <div className="modal-overlay" onClick={() => setIsSearchOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '900px', height: '80vh' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input 
                type="text" 
                placeholder="Search web predictions..." 
                value={googleQuery} 
                onChange={(e) => setGoogleQuery(e.target.value)}
                style={{ flex: 1, background: '#0a1422', border: '1px solid var(--border)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <button className="btn-cyber" onClick={executeGoogleSearch}>Search</button>
              <button className="btn-outline" onClick={() => setIsSearchOpen(false)}>✕</button>
            </div>
            <iframe src={iframeSrc} style={{ width: '100%', height: 'calc(100% - 60px)', border: 'none', borderRadius: '10px' }} title="Google Search Engine" />
          </div>
        </div>
      )}

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

      {/* FLOATING QUANTUM LOADER NOTIFICATION */}
      {loader.active && (
        <div className="floating-loader">
          <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>{loader.text}</div>
          <div className="water-progress-container" style={{ marginTop: '6px', width: '150px' }}>
            <div className="water-progress-bar" style={{ width: `${loader.progress}%` }} />
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION CONTAINER */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.isError ? '#ef4444' : '#10b981',
          color: '#000',
          fontWeight: 800,
          fontSize: '12px',
          padding: '12px 20px',
          borderRadius: '10px',
          zIndex: 3000,
          boxShadow: '0 10px 20px rgba(0,0,0,0.5)'
        }}>
          {toast.message}
        </div>
      )}

    </div>
  );
}
