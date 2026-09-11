import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as THREE from 'three';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- UTILITY & SANITIZATION FUNCTIONS ---
function sanitizeInput(input: any) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function verifyHackLocksAndSanitize(payload: any) {
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

function getFirstNameInitials(name: string) {
  if (!name) return 'MT';
  const cleanName = String(name).trim();
  const parts = cleanName.split(/\s+/);
  const firstName = parts[0];
  return firstName.length >= 2 ? firstName.substring(0, 2).toUpperCase() : firstName.charAt(0).toUpperCase();
}

function getTeamBadge(teams: string) {
  if (!teams) return '⚽';
  const firstTeam = String(teams).split(/\s+vs\.?\s+/i)[0].trim();
  const words = firstTeam.split(/\s+/).filter(Boolean);
  return words.length >= 2 ? (words[0].charAt(0) + words[1].charAt(0)).toUpperCase() : firstTeam.substring(0, 3).toUpperCase();
}

function parseMatchDateTime(dateValue: any, timeValue: any) {
  try {
    let dateText = String(dateValue).trim();
    let timeText = String(timeValue).trim().replace(/(\.\d+)?$/, '');
    if (/^\d{2}:\d{2}$/.test(timeText)) timeText += ':00';
    const parsed = new Date(`${dateText}T${timeText}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch { return null; }
}

function calculateLiveMinute(match: any) {
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

export default function MTLFootballFansHub() {
  // --- STATES ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{
    role: string;
    username: string;
    email: string;
    odds_format: string;
    language: string;
    high_contrast: boolean;
  }>({
    role: 'user',
    username: 'not Signed in',
    email: '',
    odds_format: 'decimal',
    language: 'en',
    high_contrast: false
  });

  // Data Stores
  const [matchesData, setMatchesData] = useState<any[]>([]);
  const [fixturesData, setFixturesData] = useState<any[]>([]);
  const [trendingData, setTrendingData] = useState<any[]>([]);
  const [liveMatchesData, setLiveMatchesData] = useState<any[]>([]);
  const [globalChatMessages, setGlobalChatMessages] = useState<any[]>([]);
  const [matchCommentsStore, setMatchCommentsStore] = useState<Record<string, any[]>>({});
  const [matchChatStore, setMatchChatStore] = useState<Record<string, any[]>>({});
  const [matchReactionsMap, setMatchReactionsMap] = useState<Record<string, any[]>>({});

  // UI Control States
  const [activeMatchTab, setActiveMatchTab] = useState<'future' | 'past'>('future');
  const [matchSearchQuery, setMatchSearchQuery] = useState<string>('');
  const [isSideNavOpen, setIsSideNavOpen] = useState<boolean>(false);
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState<boolean>(false);
  const [globalChatInput, setGlobalChatInput] = useState<string>('');
  
  // Loader State
  const [loaderState, setLoaderState] = useState<{ active: boolean; text: string; progress: number }>({
    active: true,
    text: 'initializing secure intelligence core...',
    progress: 15
  });

  // Toast State
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; isError: boolean }>>([]);

  // Database Error Diagnostic State
  const [dbError, setDbError] = useState<{ show: boolean; title: string; diagnosis: string; action: string; details: string }>({
    show: false, title: '', diagnosis: '', action: '', details: ''
  });

  // Modal States
  const [reactionModal, setReactionModal] = useState<{ show: boolean; title: string; list: any[] }>({ show: false, title: '', list: [] });
  const [googleIframeModal, setGoogleIframeModal] = useState<{ show: boolean; query: string }>({ show: false, query: '' });
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [dialingModalOpen, setDialingModalOpen] = useState<boolean>(false);
  
  // Fullscreen Comments Modal
  const [fullscreenCommentsModal, setFullscreenCommentsModal] = useState<{ show: boolean; matchId: string; matchTitle: string }>({ show: false, matchId: '', matchTitle: '' });
  const [fullscreenCommentInput, setFullscreenCommentInput] = useState<string>('');

  // Stats List Directory Modal
  const [statsListModal, setStatsListModal] = useState<{ show: boolean; title: string; data: any[]; type: 'live' | 'matches' | 'fixtures' | 'trending' | null }>({ show: false, title: '', data: [], type: null });

  // Match Details Modal
  const [fullscreenMatchModal, setFullscreenMatchModal] = useState<{ show: boolean; matchData: any }>({ show: false, matchData: null });

  // Match Chat Modal
  const [matchChatModal, setMatchChatModal] = useState<{ show: boolean; matchId: string; matchTitle: string }>({ show: false, matchId: '', matchTitle: '' });
  const [matchChatInput, setMatchChatInput] = useState<string>('');

  // Admin Floating Modal
  const [adminModal, setAdminModal] = useState<{ show: boolean; section: string | null; editingItem: any }>({ show: false, section: null, editingItem: null });
  const [adminFormState, setAdminFormState] = useState<Record<string, any>>({});

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- TOAST DISPATCHER ---
  const showToast = (message: string, isError = true) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // --- DB ERROR HANDLER ---
  const showDatabaseError = (table: string, error: any, operation = 'READ') => {
    const title = `${operation} Operation Failed • Target Table: [${table}]`;
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
      show: true,
      title,
      diagnosis,
      action,
      details: JSON.stringify(error, null, 2)
    });
  };

  // --- THREE.JS 4D ANIMATION ENGINE ---
  useEffect(() => {
    if (!canvasRef.current) return;
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
    const handleMouseMove = (e: MouseEvent) => {
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

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      torusKnot.rotation.x += 0.003 + mouseY * 0.1;
      torusKnot.rotation.y += 0.005 + mouseX * 0.1;
      particleMesh.rotation.y -= 0.001;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, []);

  // --- INITIALIZATION & SESSION CHECK ---
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

      setupDatabaseRealtimeSubscriptions();
      
      triggerFloatingLoader("sync complete", 100);
      setTimeout(hideFloatingLoader, 300);
    };

    initApp();
  }, []);

  // --- LIVE REFRESH LOOP & UPDATES ---
  useEffect(() => {
    updateLiveMatches();
    const interval = setInterval(() => {
      updateLiveMatches();
    }, 1000);
    return () => clearInterval(interval);
  }, [matchesData, matchReactionsMap]);

  const triggerFloatingLoader = (promptText: string, progressPercentage: number) => {
    setLoaderState({ active: true, text: promptText, progress: progressPercentage });
  };

  const hideFloatingLoader = () => {
    setLoaderState(prev => ({ ...prev, active: false }));
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

  const signOutUser = async () => {
    await db.auth.signOut();
    window.location.href = "auth.html";
  };

  // --- REALTIME SUBSCRIPTIONS ---
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

  // --- DATA FETCHING FUNCTIONS ---
  const loadDatabaseReactions = async () => {
    try {
      const { data, error } = await db.from('reactions').select('*');
      if (error) { showDatabaseError('reactions', error, 'READ_REACTIONS'); return; }
      if (Array.isArray(data)) {
        const map: Record<string, any[]> = {};
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
        const store: Record<string, any[]> = {};
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
        const globalMsgs: any[] = [];
        const matchMsgs: Record<string, any[]> = {};
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
            if (!matchMsgs[mId]) matchMsgs[mId] = [];
            matchMsgs[mId].push(parsed);
          }
        });
        setGlobalChatMessages(globalMsgs);
        setMatchChatStore(matchMsgs);
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

  const normalizeMatch = (match: any) => {
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
      setFixturesData(Array.isArray(data) ? data.map(normalizeFixture) : []);
    } catch (error) { showDatabaseError('fixtures', error, 'READ_FIXTURES'); }
  };

  const normalizeFixture = (fix: any) => {
    const matchDate = fix.match_date ?? fix.date ?? '';
    const matchTime = fix.match_time ?? fix.time ?? '';
    return { ...fix, match_date: matchDate, match_time: matchTime, badge: fix.badge || getTeamBadge(fix.teams) };
  };

  const loadTrendingFromDB = async () => {
    try {
      const { data, error } = await db.from('trending').select('*').order('rank', { ascending: true });
      if (error) { showDatabaseError('trending', error, 'READ_TRENDING'); return; }
      setTrendingData(Array.isArray(data) ? data.map(normalizeTrending) : []);
    } catch (error) { showDatabaseError('trending', error, 'READ_TRENDING'); }
  };

  const normalizeTrending = (item: any) => {
    return { ...item, rank: item.rank ?? '', title: item.title ?? '', comments_count: item.comments_count ?? item.comments ?? 0 };
  };

  // --- LIVE MATCH ENGINE LOGIC ---
  const updateLiveMatches = () => {
    const now = new Date();
    const liveMatches = matchesData.filter(m => isMatchCurrentlyLive(m, now)).map(buildLiveMatch);
    setLiveMatchesData(liveMatches);
  };

  const isMatchCurrentlyLive = (match: any, now = new Date()) => {
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

  const buildLiveMatch = (match: any) => {
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

  // --- ODD FORMATTING ---
  const formatOdds = (val: number) => {
    if (userProfile.odds_format === 'fractional') {
      return `${Math.round(val - 1)}/1`;
    } else if (userProfile.odds_format === 'american') {
      return val >= 2 ? `+${Math.round((val - 1) * 100)}` : `-${Math.round(100 / (val - 1))}`;
    }
    return val.toFixed(2);
  };

  // --- USER ACTION HANDLERS ---
  const openGoogleSearchIframe = (query: string) => {
    setGoogleIframeModal({
      show: true,
      query: `https://www.google.com/search?q=${encodeURIComponent(query)}&igu=1`
    });
  };

  const closeGoogleIframeModal = () => {
    setGoogleIframeModal({ show: false, query: '' });
  };

  const sendGlobalChatMessage = async () => {
    if (!globalChatInput.trim()) return;
    try {
      const payload = verifyHackLocksAndSanitize({
        user_id: currentUser?.id,
        username: userProfile.username,
        message: globalChatInput.trim()
      });

      const { error } = await db.from('chats').insert([payload]);
      if (error) showDatabaseError('chats', error, 'INSERT_GLOBAL_CHAT');
      else setGlobalChatInput('');
    } catch (err: any) {
      showToast(err.message || 'Failed to send chat message');
    }
  };

  const sendMatchChatMessage = async () => {
    if (!matchChatInput.trim() || !matchChatModal.matchId) return;
    try {
      const payload = verifyHackLocksAndSanitize({
        match_id: matchChatModal.matchId,
        user_id: currentUser?.id,
        username: userProfile.username,
        message: matchChatInput.trim()
      });

      const { error } = await db.from('chats').insert([payload]);
      if (error) showDatabaseError('chats', error, 'INSERT_MATCH_CHAT');
      else setMatchChatInput('');
    } catch (err: any) {
      showToast(err.message || 'Failed to send match comment');
    }
  };

  const submitFullscreenComment = async () => {
    if (!fullscreenCommentInput.trim() || !fullscreenCommentsModal.matchId) return;
    try {
      const payload = verifyHackLocksAndSanitize({
        match_id: fullscreenCommentsModal.matchId,
        user_id: currentUser?.id,
        username: userProfile.username,
        comment: fullscreenCommentInput.trim()
      });

      const { error } = await db.from('comments').insert([payload]);
      if (error) showDatabaseError('comments', error, 'INSERT_COMMENT');
      else setFullscreenCommentInput('');
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment');
    }
  };

  const reactToMatch = async (matchId: string, reactionType: string) => {
    if (!currentUser) return;
    try {
      const { data: existing } = await db.from('reactions')
        .select('id, reaction_type')
        .eq('match_id', matchId)
        .eq('user_id', currentUser.id)
        .single();

      if (existing) {
        if (existing.reaction_type === reactionType) {
          await db.from('reactions').delete().eq('id', existing.id);
        } else {
          await db.from('reactions').update({ reaction_type: reactionType }).eq('id', existing.id);
        }
      } else {
        await db.from('reactions').insert([{
          match_id: matchId,
          user_id: currentUser.id,
          username: userProfile.username,
          reaction_type: reactionType
        }]);
      }
      await loadDatabaseReactions();
      await loadMatchesFromDB();
    } catch (err) {
      showDatabaseError('reactions', err, 'MUTATE_REACTION');
    }
  };

  const showReactedUsers = (matchId: string, reactionType: string) => {
    const matchReacts = matchReactionsMap[String(matchId)] || [];
    const filtered = matchReacts.filter(r => r.reaction === reactionType);
    setReactionModal({
      show: true,
      title: `${reactionType.toUpperCase()} REACTANTS`,
      list: filtered
    });
  };

  // --- LONG PRESS DIRECTIVE LOGIC ---
  const useLongPress = (callback: () => void, ms = 600) => {
    const timerRef = useRef<any>(null);

    const start = (e: React.MouseEvent | React.TouchEvent) => {
      timerRef.current = setTimeout(() => {
        callback();
      }, ms);
    };

    const stop = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    return {
      onMouseDown: start,
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchStart: start,
      onTouchEnd: stop
    };
  };

  // --- ADMIN ACTIONS & MUTATIONS ---
  const openFloatingAdminModal = (section: string, itemItem: any = null) => {
    setAdminModal({ show: true, section, editingItem: itemItem });
    if (itemItem) {
      setAdminFormState({ ...itemItem });
    } else {
      setAdminFormState({});
    }
  };

  const closeAdminFloatingModal = () => {
    setAdminModal({ show: false, section: null, editingItem: null });
    setAdminFormState({});
  };

  const saveAdminEntry = async () => {
    const { section, editingItem } = adminModal;
    if (!section) return;

    try {
      const sanitized = verifyHackLocksAndSanitize({ ...adminFormState });

      if (editingItem && editingItem.id) {
        const { error } = await db.from(section).update(sanitized).eq('id', editingItem.id);
        if (error) showDatabaseError(section, error, 'UPDATE');
      } else {
        const { error } = await db.from(section).insert([sanitized]);
        if (error) showDatabaseError(section, error, 'INSERT');
      }

      closeAdminFloatingModal();
      if (section === 'matches') await loadMatchesFromDB();
      if (section === 'fixtures') await loadFixturesFromDB();
      if (section === 'trending') await loadTrendingFromDB();
    } catch (err: any) {
      showToast(err.message || 'Save operation failed');
    }
  };

  const deleteMatchFromDB = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this prediction?")) return;
    const { error } = await db.from('matches').delete().eq('id', id);
    if (error) showDatabaseError('matches', error, 'DELETE');
    else await loadMatchesFromDB();
  };

  const deleteFixtureFromDB = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this fixture?")) return;
    const { error } = await db.from('fixtures').delete().eq('id', id);
    if (error) showDatabaseError('fixtures', error, 'DELETE');
    else await loadFixturesFromDB();
  };

  const deleteTrendingFromDB = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this news?")) return;
    const { error } = await db.from('trending').delete().eq('id', id);
    if (error) showDatabaseError('trending', error, 'DELETE');
    else await loadTrendingFromDB();
  };

  // --- FILTERED MATCHES COMPUTES ---
  const now = new Date();
  const filteredMatches = matchesData.filter(m => {
    const isFT = String(m.status || '').toUpperCase() === 'FT';
    const kickoff = parseMatchDateTime(m.match_date, m.match_time);
    const isPastDate = kickoff ? kickoff.getTime() < now.getTime() - (120 * 60 * 1000) : false;
    const isPastMatch = isFT || isPastDate;
    return activeMatchTab === 'past' ? isPastMatch : !isPastMatch;
  }).filter(m => {
    if (!matchSearchQuery) return true;
    const nameMatch = String(m.teams || '').toLowerCase().includes(matchSearchQuery.toLowerCase());
    const dateMatch = String(m.match_date || '').toLowerCase().includes(matchSearchQuery.toLowerCase());
    const timeMatch = String(m.match_time || '').toLowerCase().includes(matchSearchQuery.toLowerCase());
    const leagueMatch = String(m.league || '').toLowerCase().includes(matchSearchQuery.toLowerCase());
    return nameMatch || dateMatch || timeMatch || leagueMatch;
  });

  return (
    <div className={`min-h-screen flex flex-col justify-between selection:bg-mtlGreen selection:text-black bg-[#0b0f19] text-[#f9fafb] font-sans overflow-x-hidden ${userProfile.high_contrast ? 'high-contrast-mode' : ''}`}>
      
      {/* 4D Interactive Background Canvas */}
      <canvas ref={canvasRef} id="bg-4d-canvas" className="fixed top-0 left-0 w-screen h-screen pointer-events-none z-0 opacity-45" />

      <div className="app-content-wrapper relative z-10 flex flex-col min-h-screen justify-between">

        {/* Error Toast Container */}
        <div id="toast-container" className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
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

        {/* Floating Prompt Loader */}
        <div className={`floating-loader-overlay fixed inset-0 bg-[#0b0f19]/85 backdrop-blur-md z-[100] flex items-center justify-center transition-opacity duration-300 ${loaderState.active ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="loader-card bg-[#111827] border border-[#00f0ff] shadow-[0_0_35px_rgba(0,240,255,0.25)] rounded-[1.25rem] p-7 w-[90%] max-w-[420px] text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <span className="w-3 h-3 rounded-full bg-futuristicNeon animate-ping"></span>
              <h4 className="text-xs font-bold uppercase tracking-widest text-futuristicNeon font-cyber">QUANTUM SYNC</h4>
            </div>
            <p className="text-sm font-medium text-gray-200">{loaderState.text}</p>
            <div className="water-progress-container w-full bg-[#1f2937] h-[16px] rounded-full relative overflow-hidden border border-[#00f0ff]/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
              <div className="water-progress-bar h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(0,240,255,0.6)]" style={{ width: `${loaderState.progress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Reacted Users Floating Container Modal */}
        {reactionModal.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-mtlSurface border border-mtlGreen rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-mtlCardBorder pb-3">
                <h4 className="font-bold text-sm text-mtlGreen font-cyber">{reactionModal.title}</h4>
                <button onClick={() => setReactionModal({ show: false, title: '', list: [] })} className="text-gray-400 hover:text-white font-bold">✕</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                {reactionModal.list.length === 0 ? (
                  <p className="text-gray-400 text-center py-2">No users found.</p>
                ) : (
                  reactionModal.list.map((u, i) => (
                    <div key={i} className="flex justify-between items-center bg-mtlCard p-2 rounded border border-mtlCardBorder">
                      <span className="text-gray-200 font-semibold">{sanitizeInput(u.username)}</span>
                      <span className="text-mtlGreen font-bold">{sanitizeInput(u.reaction)}</span>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => setReactionModal({ show: false, title: '', list: [] })} className="w-full bg-mtlCard border border-mtlCardBorder text-gray-300 py-2 rounded-xl text-xs font-bold hover:text-white">Close</button>
            </div>
          </div>
        )}

        {/* Side Navigation Overlay Menu */}
        <div
          onClick={() => setIsSideNavOpen(false)}
          className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity ${isSideNavOpen ? 'block' : 'hidden'}`}
        />
        <aside className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-mtlSurface border-l border-mtlCardBorder z-50 transform ${isSideNavOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out flex flex-col justify-between p-6 shadow-2xl`}>
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
              <a href="/dashboard" className="w-full flex items-center gap-3 p-3 rounded-xl bg-mtlGreen/10 border border-mtlGreen text-mtlGreen hover:bg-mtlGreen hover:text-black transition text-xs font-bold">
                <span className="text-base">⬅️</span> Back to Dashboard
              </a>
              <button onClick={() => { setDialingModalOpen(true); setIsSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-mtlCard border border-mtlCardBorder hover:border-mtlGreen hover:text-mtlGreen transition text-xs font-semibold text-gray-200">
                <span className="text-base">📞</span> Contact Centre
              </button>
              <button onClick={() => { setSettingsModalOpen(true); setIsSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-mtlCard border border-mtlCardBorder hover:border-mtlGreen hover:text-mtlGreen transition text-xs font-semibold text-gray-200">
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

        {/* Application Root Content */}
        <div id="app-root">
          {/* Header */}
          <header className="border-b border-mtlCardBorder bg-mtlSurface/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <a href="/dashboard" title="Back to Dashboard" className="w-9 h-9 rounded-xl bg-mtlCard border border-mtlCardBorder text-mtlGreen flex items-center justify-center font-bold text-sm hover:bg-mtlGreen hover:text-black transition">⬅️</a>
                <div className="w-10 h-10 avatar-logo text-lg cursor-pointer" onClick={() => setDialingModalOpen(true)}>
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

          {/* Banner */}
          <section className="relative overflow-hidden py-12 px-6 border-b border-mtlCardBorder bg-gradient-to-b from-mtlSurface to-mtlDark">
            <div className="max-w-7xl mx-auto text-center relative z-10">
              <span className="text-xs uppercase tracking-[0.25em] text-mtlGreen font-bold bg-mtlGreen/10 px-4 py-1.5 rounded-full border border-mtlGreen/20">Sports Analytics & 4D Intelligence</span>
              <h2 className="text-3xl lg:text-5xl font-extrabold tracking-tight mt-3 uppercase font-cyber text-white">FOOTBALL <span class="text-mtlGreen">INTELLIGENCE</span></h2>
              <p className="text-gray-400 text-sm lg:text-base mt-2 max-w-2xl mx-auto font-sans font-medium">Real-time stats, AI match predictions, dynamic hotline dialing and secure encrypted feeds.</p>
            </div>
          </section>

          {/* Detailed Database Error Console */}
          {dbError.show && (
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
                  <button onClick={() => setDbError(prev => ({ ...prev, show: false }))} className="text-gray-500 hover:text-white">✕</button>
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
            <section id="live-section">
              <div className="flex items-center justify-between mb-6 section-header">
                <div>
                  <h3 className="font-extrabold text-lg uppercase tracking-wide text-white font-cyber flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> LIVE MATCHES
                  </h3>
                  <span className="text-xs text-gray-400">{liveMatchesData.length} Matches Active</span>
                </div>
                <button
                  onClick={() => setStatsListModal({ show: true, title: 'Live Games Directory', data: liveMatchesData, type: 'live' })}
                  className="btn-see-more"
                >
                  <span>SEE MORE MATCHES</span> ➔
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {liveMatchesData.length === 0 ? (
                  <div className="col-span-3 text-center py-8 pro-card">
                    <p className="text-xs text-gray-400">No live matches currently in play.</p>
                  </div>
                ) : (
                  liveMatchesData.slice(0, 3).map((match) => {
                    const teamParts = String(match.teams || '').split(/\s+vs\.?\s+/i);
                    const home = teamParts[0] || 'HOME';
                    const away = teamParts[1] || 'AWAY';
                    const longPressProps = useLongPress(() => openGoogleSearchIframe(`Live match results for ${match.teams}`));

                    return (
                      <div
                        key={match.id}
                        {...longPressProps}
                        onClick={() => setFullscreenMatchModal({ show: true, matchData: match })}
                        className="pro-card p-5 relative overflow-hidden cursor-pointer"
                      >
                        <div className="flex justify-between items-center text-xs text-gray-400 mb-3 font-semibold">
                          <span
                            className="font-cyber hover:text-mtlGreen"
                            onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Match live summary ${match.teams}`); }}
                          >
                            {sanitizeInput(match.league)}
                          </span>
                          <span className="text-red-500 font-bold animate-pulse">● LIVE</span>
                        </div>
                        <div className="flex items-center justify-between my-4">
                          <div className="text-center flex-1">
                            <div className="w-10 h-10 mx-auto avatar-logo mb-1 font-cyber text-xs">{getTeamBadge(home)}</div>
                            <span className="text-xs font-bold tracking-wide text-white">{sanitizeInput(home)}</span>
                          </div>
                          <div className="text-2xl font-extrabold tracking-wider px-2 font-cyber text-mtlGreen">- _ -</div>
                          <div className="text-center flex-1">
                            <div className="w-10 h-10 mx-auto avatar-logo mb-1 font-cyber text-xs">{getTeamBadge(away)}</div>
                            <span className="text-xs font-bold tracking-wide text-white">{sanitizeInput(away)}</span>
                          </div>
                        </div>
                        <div className="text-center text-xs font-semibold text-mtlGreen mb-2 font-cyber">{sanitizeInput(match.minute)} Minutes</div>
                        <div className="water-progress-container mb-3 w-full bg-[#1f2937] h-[16px] rounded-full relative overflow-hidden border border-[#00f0ff]/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                          <div className="water-progress-bar h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(0,240,255,0.6)]" style={{ width: `${match.progress}%` }}></div>
                        </div>
                        <div className="text-[11px] text-gray-400 pt-2 border-t border-mtlCardBorder flex justify-between items-center">
                          <span className="truncate">{sanitizeInput(match.details)}</span>
                          {userProfile.role === 'admin' && (
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); openFloatingAdminModal('matches', match); }}
                                className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded hover:bg-amber-500 hover:text-black"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteMatchFromDB(match.id); }}
                                className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded hover:bg-red-600 hover:text-white"
                              >
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

            {/* Predictions Section */}
            <section id="db-matches-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 section-header">
                <div>
                  <h3
                    className="text-lg font-extrabold uppercase tracking-wide text-white font-cyber cursor-pointer hover:text-mtlGreen transition"
                    onClick={() => openGoogleSearchIframe('Live database matches and football predictions')}
                  >
                    ⚽ MATCHES & PREDICTIONS
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Hold match cards long press to trigger Google Search.</p>
                </div>
                <button
                  onClick={() => setStatsListModal({ show: true, title: 'All Database Predictions', data: matchesData, type: 'matches' })}
                  className="btn-see-more"
                >
                  <span>SEE MORE</span> ➔
                </button>
              </div>

              {/* Controls Row: Tabs & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 border-b border-mtlCardBorder pb-4">
                <div className="flex items-center gap-2 bg-mtlDark p-1.5 rounded-xl border border-mtlCardBorder self-start">
                  <button
                    onClick={() => setActiveMatchTab('future')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold font-cyber transition ${activeMatchTab === 'future' ? 'bg-mtlGreen text-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    UPCOMING MATCHES
                  </button>
                  <button
                    onClick={() => setActiveMatchTab('past')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold font-cyber transition ${activeMatchTab === 'past' ? 'bg-mtlGreen text-black' : 'text-gray-400 hover:text-white'}`}
                  >
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
                {filteredMatches.length === 0 ? (
                  <div className="col-span-3 text-center py-10 pro-card">
                    <p className="text-xs text-gray-400">No {activeMatchTab === 'past' ? 'past' : 'upcoming'} matches found.</p>
                  </div>
                ) : (
                  filteredMatches.slice(0, 3).map((match) => {
                    const comments = matchCommentsStore[match.id] || [];
                    const type = String(match.type || 'free');
                    const typeClass = type.toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                    const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';
                    const oddsText = match.decimal_odds !== null && match.decimal_odds !== undefined ? formatOdds(match.decimal_odds) : 'N/A';
                    
                    const longPressCardProps = useLongPress(() => openGoogleSearchIframe(`Football Match Prediction for ${match.teams}`));
                    const longPressFireProps = useLongPress(() => showReactedUsers(match.id, 'fire'));
                    const longPressHeartProps = useLongPress(() => showReactedUsers(match.id, 'heart'));
                    const longPressDislikeProps = useLongPress(() => showReactedUsers(match.id, 'dislike'));

                    return (
                      <div key={match.id} {...longPressCardProps} className="pro-card p-5 flex flex-col justify-between space-y-4 cursor-pointer">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${typeClass}`}>{sanitizeInput(type)} Match</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-amber-400 font-bold font-cyber">Odds: {oddsText}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{sanitizeInput(match.match_date || '')} {sanitizeInput(match.match_time || '')}</span>
                            </div>
                          </div>
                          <h4
                            className="font-extrabold text-base text-white tracking-wide font-cyber hover:text-mtlGreen"
                            onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Prediction summary for ${match.teams}`); }}
                          >
                            {sanitizeInput(match.teams || 'Unknown Match')}
                          </h4>
                          <p className="text-xs text-mtlGreen font-semibold">Prediction: {sanitizeInput(match.prediction || 'N/A')} ({stars})</p>
                          <p className="text-xs text-gray-400 line-clamp-2">{sanitizeInput(match.analysis_text || 'Tactical breakdown in detailed view.')}</p>
                        </div>

                        <div className="space-y-1 bg-mtlDark p-3 rounded-xl border border-mtlCardBorder">
                          <div className="flex justify-between text-[10px] font-bold text-gray-300">
                            <span>Probability:</span>
                            <span>H: {match.prob_home}% | D: {match.prob_draw}% | A: {match.prob_away}%</span>
                          </div>
                          <div className="water-progress-container w-full bg-[#1f2937] h-[16px] rounded-full relative overflow-hidden border border-[#00f0ff]/30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                            <div className="water-progress-bar h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(0,240,255,0.6)]" style={{ width: `${match.prob_home}%` }}></div>
                          </div>
                        </div>

                        {/* Reaction Bar */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            {...longPressFireProps}
                            onClick={(e) => { e.stopPropagation(); reactToMatch(match.id, 'fire'); }}
                            className="bg-mtlDark border border-mtlCardBorder px-2.5 py-1 rounded-lg text-xs hover:border-mtlGreen flex items-center gap-1 transition"
                          >
                            🔥 <span>{match.reactions?.fire || 0}</span>
                          </button>
                          <button
                            {...longPressHeartProps}
                            onClick={(e) => { e.stopPropagation(); reactToMatch(match.id, 'heart'); }}
                            className="bg-mtlDark border border-mtlCardBorder px-2.5 py-1 rounded-lg text-xs hover:border-mtlGreen flex items-center gap-1 transition"
                          >
                            ❤️ <span>{match.reactions?.heart || 0}</span>
                          </button>
                          <button
                            {...longPressDislikeProps}
                            onClick={(e) => { e.stopPropagation(); reactToMatch(match.id, 'dislike'); }}
                            className="bg-mtlDark border border-mtlCardBorder px-2.5 py-1 rounded-lg text-xs hover:border-mtlGreen flex items-center gap-1 transition"
                          >
                            👎 <span>{match.reactions?.dislike || 0}</span>
                          </button>
                        </div>

                        {/* Comments Block */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setFullscreenCommentsModal({ show: true, matchId: match.id, matchTitle: match.teams });
                          }}
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
                              comments.slice(-2).map((c, idx) => (
                                <div key={idx} className="bg-mtlCard p-1.5 rounded border border-mtlCardBorder text-gray-300">
                                  <span className="font-bold text-mtlGreen">{sanitizeInput(c.user)}:</span> {sanitizeInput(c.comment)}
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="pt-2 border-t border-mtlCardBorder flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setFullscreenMatchModal({ show: true, matchData: match }); }}
                              className="bg-mtlGreen/10 border border-mtlGreen text-mtlGreen hover:bg-mtlGreen hover:text-black font-bold px-3 py-1.5 rounded-xl text-xs transition"
                            >
                              🔍 Details
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMatchChatModal({ show: true, matchId: match.id, matchTitle: match.teams }); }}
                              className="bg-mtlDark border border-mtlCardBorder text-gray-300 hover:text-mtlGreen font-bold px-3 py-1.5 rounded-xl text-xs transition"
                            >
                              💬 Chat
                            </button>
                          </div>
                          {userProfile.role === 'admin' && (
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); openFloatingAdminModal('matches', match); }}
                                className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteMatchFromDB(match.id); }}
                                className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white"
                              >
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

              {userProfile.role === 'admin' && (
                <div className="mt-6 pt-4 border-t border-mtlCardBorder flex justify-center">
                  <button
                    onClick={() => openFloatingAdminModal('matches')}
                    className="bg-mtlGreen text-black font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider hover:bg-mtlGreenHover transition flex items-center gap-2"
                  >
                    <span>➕</span> ADD PREDICTION
                  </button>
                </div>
              )}
            </section>

            {/* Grid for Fixtures & Trending */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Fixtures Section */}
              <section id="fixtures-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-2xl">
                <div>
                  <div className="flex items-center justify-between mb-6 section-header">
                    <div>
                      <h3
                        className="font-extrabold uppercase tracking-wide text-base text-white font-cyber cursor-pointer hover:text-mtlGreen transition"
                        onClick={() => openGoogleSearchIframe('Upcoming football fixtures schedule')}
                      >
                         UPCOMING FIXTURES
                      </h3>
                      <span className="text-xs text-gray-400">Upcoming fixtures</span>
                    </div>
                    <button
                      onClick={() => setStatsListModal({ show: true, title: 'Complete Fixtures Schedule', data: fixturesData, type: 'fixtures' })}
                      className="btn-see-more text-xs py-2 px-3.5"
                    >
                      <span>SEE MORE</span> ➔
                    </button>
                  </div>

                  <div className="space-y-4">
                    {fixturesData.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-500">No upcoming fixtures recorded.</div>
                    ) : (
                      fixturesData.slice(0, 3).map((fix) => {
                        const longPressProps = useLongPress(() => openGoogleSearchIframe(`Football fixture data for ${fix.teams} ${fix.league}`));

                        return (
                          <div key={fix.id} {...longPressProps} className="pro-card p-4 flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-mtlDark border border-mtlCardBorder flex items-center justify-center font-bold text-xs text-mtlGreen font-cyber">
                                {sanitizeInput(fix.badge)}
                              </div>
                              <div>
                                <h4
                                  className="font-bold text-xs text-white hover:text-mtlGreen"
                                  onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Fixture schedule ${fix.teams}`); }}
                                >
                                  {sanitizeInput(fix.teams || 'Fixture')}
                                </h4>
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
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openFloatingAdminModal('fixtures', fix); }}
                                    className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteFixtureFromDB(fix.id); }}
                                    className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white"
                                  >
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
                </div>

                {userProfile.role === 'admin' && (
                  <div className="pt-4 border-t border-mtlCardBorder flex justify-center">
                    <button
                      onClick={() => openFloatingAdminModal('fixtures')}
                      className="bg-mtlCard border border-mtlGreen text-mtlGreen font-bold px-5 py-2 rounded-xl text-xs hover:bg-mtlGreen hover:text-black transition flex items-center gap-2"
                    >
                      <span>➕</span> ADD FIXTURE
                    </button>
                  </div>
                )}
              </section>

              {/* Trending News Section */}
              <section id="trending-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-2xl">
                <div>
                  <div className="flex items-center justify-between mb-6 section-header">
                    <div>
                      <h3
                        className="font-extrabold uppercase tracking-wide text-base text-white font-cyber cursor-pointer hover:text-mtlGreen transition"
                        onClick={() => openGoogleSearchIframe('Trending football news updates')}
                      >
                        🔥 TRENDING NEWS
                      </h3>
                      <span className="text-xs text-gray-400">What's trending.</span>
                    </div>
                    <button
                      onClick={() => setStatsListModal({ show: true, title: 'All Trending News', data: trendingData, type: 'trending' })}
                      className="btn-see-more text-xs py-2 px-3.5"
                    >
                      <span>SEE MORE</span> ➔
                    </button>
                  </div>

                  <div className="space-y-4">
                    {trendingData.length === 0 ? (
                      <div className="text-center py-8 text-xs text-gray-500">No trending headlines.</div>
                    ) : (
                      trendingData.slice(0, 3).map((item) => {
                        const longPressProps = useLongPress(() => openGoogleSearchIframe(`Football news updates on ${item.title}`));

                        return (
                          <div key={item.id} {...longPressProps} className="pro-card p-4 flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-extrabold text-mtlGreen font-cyber">#{sanitizeInput(item.rank)}</span>
                              <div>
                                <h4
                                  className="font-bold text-xs text-white hover:text-mtlGreen"
                                  onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(item.title); }}
                                >
                                  {sanitizeInput(item.title)}
                                </h4>
                                <span className="text-[10px] text-gray-500">💬 {Number(item.comments_count) || 6237} discussions</span>
                              </div>
                            </div>
                            {userProfile.role === 'admin' && (
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openFloatingAdminModal('trending', item); }}
                                  className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deleteTrendingFromDB(item.id); }}
                                  className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {userProfile.role === 'admin' && (
                  <div className="pt-4 border-t border-mtlCardBorder flex justify-center">
                    <button
                      onClick={() => openFloatingAdminModal('trending')}
                      className="bg-mtlCard border border-mtlGreen text-mtlGreen font-bold px-5 py-2 rounded-xl text-xs hover:bg-mtlGreen hover:text-black transition flex items-center gap-2"
                    >
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
                <a href="#" onClick={() => setDialingModalOpen(true)} className="hover:text-mtlGreen">Developed BY M. Lennox</a>
              </div>
            </div>
          </footer>
        </div>

        {/* Google Quick Search Iframe Modal */}
        {googleIframeModal.show && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col p-3 sm:p-6">
            <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-mtlGreen text-black font-extrabold flex items-center justify-center font-cyber">AI</div>
                <div>
                  <h4 className="text-xs font-bold font-cyber text-mtlGreen">GOOGLE QUICK SEARCH</h4>
                  <p className="text-[10px] text-gray-400 font-mono">connected.</p>
                </div>
              </div>
              <button onClick={closeGoogleIframeModal} className="w-8 h-8 rounded-full bg-red-900/40 text-red-300 border border-red-500/30 flex items-center justify-center font-bold text-xs hover:bg-red-800">✕</button>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-mtlCardBorder bg-white">
              <iframe className="w-full h-full border-0" src={googleIframeModal.query}></iframe>
            </div>
          </div>
        )}

        {/* Global Telegram-Style Chat Floating Drawer */}
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsGlobalChatOpen(!isGlobalChatOpen)}
            className="w-14 h-14 rounded-full bg-mtlGreen text-black flex items-center justify-center text-2xl font-bold shadow-lg hover:scale-105 transition transform"
          >
            💬
          </button>
          {isGlobalChatOpen && (
            <div className="absolute bottom-20 right-0 w-80 sm:w-96 bg-mtlSurface border border-mtlCardBorder rounded-2xl shadow-2xl flex flex-col h-[480px] overflow-hidden">
              <div className="bg-mtlDark p-4 border-b border-mtlCardBorder flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-mtlGreen animate-pulse"></span>
                  <h4 className="font-bold text-sm tracking-wide font-cyber text-white">Community Chat</h4>
                </div>
                <button onClick={() => setIsGlobalChatOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
                {globalChatMessages.map((msg) => {
                  const isMe = msg.user_id === currentUser?.id;
                  return (
                    <div key={msg.id} className={`p-3 max-w-[80%] ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>
                      <div className="font-bold text-[10px] mb-0.5">{sanitizeInput(msg.user)}</div>
                      <div>{sanitizeInput(msg.text)}</div>
                      <div className="text-[9px] text-right mt-1 opacity-70">{msg.time}</div>
                    </div>
                  );
                })}
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
        {fullscreenCommentsModal.show && (
          <div className="fixed inset-0 bg-mtlDark/95 backdrop-blur-xl z-50 p-4 md:p-10 overflow-y-auto flex flex-col justify-between">
            <div className="max-w-4xl w-full mx-auto bg-mtlSurface border border-mtlGreen/40 rounded-3xl p-6 md:p-8 shadow-2xl relative flex-1 flex flex-col justify-between space-y-6">
              
              <div className="flex items-center justify-between border-b border-mtlCardBorder pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-mtlGreen/20 border border-mtlGreen text-mtlGreen flex items-center justify-center font-bold text-lg font-cyber">💬</div>
                  <div>
                    <h3 className="text-lg md:text-xl font-extrabold text-white font-cyber">{sanitizeInput(fullscreenCommentsModal.matchTitle)}</h3>
                    <p className="text-xs text-mtlGreen">Leave a comment.</p>
                  </div>
                </div>
                <button onClick={() => setFullscreenCommentsModal({ show: false, matchId: '', matchTitle: '' })} className="w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[60vh]">
                {(matchCommentsStore[fullscreenCommentsModal.matchId] || []).map((c) => (
                  <div key={c.id} className="bg-mtlDark p-3 rounded-xl border border-mtlCardBorder">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-mtlGreen">{sanitizeInput(c.user)}</span>
                      <span className="text-[10px] text-gray-500">{c.time}</span>
                    </div>
                    <p className="text-xs text-gray-200">{sanitizeInput(c.comment)}</p>
                  </div>
                ))}
              </div>

              <div className="bg-mtlDark p-4 rounded-2xl border border-mtlCardBorder space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Post Public Comment</h4>
                <div className="flex gap-3">
                  <textarea
                    rows={2}
                    value={fullscreenCommentInput}
                    onChange={(e) => setFullscreenCommentInput(e.target.value)}
                    placeholder="Write detailed comment to be recorded in database..."
                    className="flex-1 bg-mtlCard border border-mtlCardBorder rounded-xl p-3 text-xs text-white focus:outline-none focus:border-mtlGreen"
                  />
                  <button onClick={submitFullscreenComment} className="bg-mtlGreen text-black font-extrabold px-6 py-2 rounded-xl text-xs hover:bg-mtlGreenHover transition self-end">Post Comment</button>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-mtlCardBorder">
                <button onClick={() => setFullscreenCommentsModal({ show: false, matchId: '', matchTitle: '' })} className="btn-see-more">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* See More Directory Modal */}
        {statsListModal.show && (
          <div className="fixed inset-0 bg-mtlDark/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">
            <div className="max-w-5xl mx-auto bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">
              <button onClick={() => setStatsListModal({ show: false, title: '', data: [], type: null })} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              <div className="space-y-6">
                <div className="border-b border-mtlCardBorder pb-4 section-header">
                  <h3 className="text-2xl font-extrabold text-mtlGreen uppercase tracking-wider font-cyber">{statsListModal.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">Dataset display.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[65vh] overflow-y-auto pr-2">
                  {statsListModal.data.map((item, idx) => (
                    <div key={idx} className="bg-mtlCard p-4 rounded-xl border border-mtlCardBorder space-y-2">
                      <h4 className="font-bold text-sm text-white">{sanitizeInput(item.teams || item.title || 'Record')}</h4>
                      <p className="text-xs text-gray-400">{sanitizeInput(item.league || item.details || item.prediction || '')}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-mtlCardBorder flex justify-end">
                <button onClick={() => setStatsListModal({ show: false, title: '', data: [], type: null })} className="btn-see-more">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Match Details Modal */}
        {fullscreenMatchModal.show && fullscreenMatchModal.matchData && (
          <div className="fixed inset-0 bg-mtlDark/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">
            <div className="max-w-5xl mx-auto bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">
              <button onClick={() => setFullscreenMatchModal({ show: false, matchData: null })} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>
              <div className="space-y-8">
                <div className="border-b border-mtlCardBorder pb-4">
                  <span className="text-xs text-mtlGreen font-cyber uppercase font-bold">{sanitizeInput(fullscreenMatchModal.matchData.league)}</span>
                  <h2 className="text-2xl font-extrabold text-white font-cyber mt-1">{sanitizeInput(fullscreenMatchModal.matchData.teams)}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-mtlDark p-4 rounded-xl border border-mtlCardBorder space-y-2">
                    <h4 className="text-xs font-bold text-mtlGreen uppercase">Match Details</h4>
                    <p className="text-xs text-gray-300">{sanitizeInput(fullscreenMatchModal.matchData.analysis_text || fullscreenMatchModal.matchData.details || 'No detailed analysis provided.')}</p>
                  </div>
                  <div className="bg-mtlDark p-4 rounded-xl border border-mtlCardBorder space-y-2">
                    <h4 className="text-xs font-bold text-mtlGreen uppercase">Prediction Specs</h4>
                    <p className="text-xs text-gray-300">Prediction: {sanitizeInput(fullscreenMatchModal.matchData.prediction || 'N/A')}</p>
                    <p className="text-xs text-gray-300">Odds: {fullscreenMatchModal.matchData.decimal_odds ? formatOdds(fullscreenMatchModal.matchData.decimal_odds) : 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-mtlCardBorder flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const m = fullscreenMatchModal.matchData;
                      setFullscreenMatchModal({ show: false, matchData: null });
                      setMatchChatModal({ show: true, matchId: m.id, matchTitle: m.teams });
                    }}
                    className="bg-mtlCard border border-mtlCardBorder text-gray-200 px-4 py-2 rounded-xl text-xs hover:text-mtlGreen flex items-center gap-2"
                  >
                    💬 Open Chat
                  </button>
                  <button onClick={() => setDialingModalOpen(true)} className="bg-mtlGreen/10 border border-mtlGreen text-mtlGreen px-4 py-2 rounded-xl text-xs font-bold hover:bg-mtlGreen hover:text-black transition">
                    📞 Call
                  </button>
                </div>
                <button onClick={() => setFullscreenMatchModal({ show: false, matchData: null })} className="btn-see-more">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Match Chat Modal */}
        {matchChatModal.show && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="bg-mtlDark p-4 border-b border-mtlCardBorder flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-mtlGreen font-cyber">{sanitizeInput(matchChatModal.matchTitle)}</h4>
                  <p className="text-[10px] text-gray-400">Match discussion Group</p>
                </div>
                <button onClick={() => setMatchChatModal({ show: false, matchId: '', matchTitle: '' })} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">
                {(matchChatStore[matchChatModal.matchId] || []).map((msg) => {
                  const isMe = msg.user_id === currentUser?.id;
                  return (
                    <div key={msg.id} className={`p-3 max-w-[80%] ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>
                      <div className="font-bold text-[10px] mb-0.5">{sanitizeInput(msg.user)}</div>
                      <div>{sanitizeInput(msg.text)}</div>
                      <div className="text-[9px] text-right mt-1 opacity-70">{msg.time}</div>
                    </div>
                  );
                })}
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

        {/* Hotline Contact Centre Modal */}
        {dialingModalOpen && (
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
                <button onClick={() => setDialingModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>
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
              <div className="text-center pt-2"><button onClick={() => setDialingModalOpen(false)} className="text-xs text-gray-400 hover:text-white">Close Call Centre</button></div>
            </div>
          </div>
        )}

        {/* Admin Content Management Modal */}
        {adminModal.show && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-2xl p-8 space-y-6 shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-mtlCardBorder pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-mtlGreen uppercase tracking-wider font-cyber">Admin Content Management</h3>
                  <p className="text-xs text-gray-400">Insert or update Record</p>
                </div>
                <button onClick={closeAdminFloatingModal} className="text-gray-400 hover:text-white font-bold text-xl">✕</button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {adminModal.section === 'matches' && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">TEAMS (e.g. Chelsea vs Arsenal)</label>
                      <input type="text" value={adminFormState.teams || ''} onChange={(e) => setAdminFormState({ ...adminFormState, teams: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">LEAGUE</label>
                      <input type="text" value={adminFormState.league || ''} onChange={(e) => setAdminFormState({ ...adminFormState, league: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">PREDICTION</label>
                      <input type="text" value={adminFormState.prediction || ''} onChange={(e) => setAdminFormState({ ...adminFormState, prediction: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">ODDS</label>
                        <input type="number" step="0.01" value={adminFormState.decimal_odds || ''} onChange={(e) => setAdminFormState({ ...adminFormState, decimal_odds: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">TYPE (free/premium)</label>
                        <input type="text" value={adminFormState.type || ''} onChange={(e) => setAdminFormState({ ...adminFormState, type: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />
                      </div>
                    </div>
                  </>
                )}

                {adminModal.section === 'fixtures' && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">TEAMS</label>
                      <input type="text" value={adminFormState.teams || ''} onChange={(e) => setAdminFormState({ ...adminFormState, teams: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">LEAGUE</label>
                      <input type="text" value={adminFormState.league || ''} onChange={(e) => setAdminFormState({ ...adminFormState, league: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">MATCH DATE</label>
                        <input type="date" value={adminFormState.match_date || ''} onChange={(e) => setAdminFormState({ ...adminFormState, match_date: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">MATCH TIME</label>
                        <input type="time" value={adminFormState.match_time || ''} onChange={(e) => setAdminFormState({ ...adminFormState, match_time: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />
                      </div>
                    </div>
                  </>
                )}

                {adminModal.section === 'trending' && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">TITLE</label>
                      <input type="text" value={adminFormState.title || ''} onChange={(e) => setAdminFormState({ ...adminFormState, title: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">RANK (#)</label>
                      <input type="number" value={adminFormState.rank || ''} onChange={(e) => setAdminFormState({ ...adminFormState, rank: e.target.value })} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-4 border-t border-mtlCardBorder pt-4">
                <button onClick={closeAdminFloatingModal} className="px-5 py-2.5 rounded-xl text-xs bg-gray-800 text-gray-300 hover:bg-gray-700">Cancel</button>
                <button onClick={saveAdminEntry} className="px-6 py-2.5 rounded-xl text-xs bg-mtlGreen text-black font-extrabold hover:bg-mtlGreenHover transition">Save Entry</button>
              </div>
            </div>
          </div>
        )}

        {/* User Settings Modal */}
        {settingsModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-mtlCardBorder pb-3">
                <h3 className="text-base font-bold text-mtlGreen uppercase tracking-wider font-cyber">User Preferences</h3>
                <button onClick={() => setSettingsModalOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
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
                    className="w-4 h-4 accent-mtlGreen"
                  />
                </div>
              </div>
              <button onClick={() => setSettingsModalOpen(false)} className="w-full bg-mtlGreen text-black font-bold py-2 rounded-xl">Save & Close</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
