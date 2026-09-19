import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as THREE from 'three';

// --- STYLESHEET INJECTION ---
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800;900&family=Rajdhani:wght@500;600;700&display=swap');

  :root {
    --mtl-surface: #0f172a;
    --mtl-dark: #090d16;
    --mtl-card: #162032;
    --mtl-card-border: #1e293b;
    --mtl-green: #10b981;
    --mtl-green-hover: #059669;
    --mtl-accent: #3b82f6;
  }

  body {
    background-color: var(--mtl-dark);
    color: #f8fafc;
    font-family: 'Rajdhani', sans-serif;
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }

  .font-cyber {
    font-family: 'Orbitron', sans-serif;
  }

  /* 4D Canvas Layering */
  #bg-4d-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 0;
    pointer-events: none;
    opacity: 0.35;
  }

  .app-content-wrapper {
    position: relative;
    z-index: 10;
  }

  /* Custom Color Classes */
  .bg-mtlSurface { background-color: var(--mtl-surface); }
  .bg-mtlDark { background-color: var(--mtl-dark); }
  .bg-mtlCard { background-color: var(--mtl-card); }
  .border-mtlCardBorder { border-color: var(--mtl-card-border); }
  .text-mtlGreen { color: var(--mtl-green); }
  .bg-mtlGreen { background-color: var(--mtl-green); }
  .bg-mtlGreen\/10 { background-color: rgba(16, 185, 129, 0.1); }
  .border-mtlGreen { border-color: var(--mtl-green); }
  .border-mtlGreen\/20 { border-color: rgba(16, 185, 129, 0.2); }
  .border-mtlGreen\/40 { border-color: rgba(16, 185, 129, 0.4); }
  .text-mtlAccent { color: var(--mtl-accent); }
  .bg-mtlAccent { background-color: var(--mtl-accent); }

  /* Premium Cards & UI Glassmorphism */
  .pro-card {
    background: rgba(22, 32, 50, 0.75);
    backdrop-filter: blur(12px);
    border: 1px solid var(--mtl-card-border);
    border-radius: 1rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .pro-card:hover {
    border-color: var(--mtl-green);
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.15);
  }

  .avatar-logo {
    background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
    color: #000;
    font-weight: 900;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
    flex-shrink: 0;
  }

  .btn-see-more {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid var(--mtl-green);
    color: var(--mtl-green);
    padding: 0.5rem 1rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 800;
    font-family: 'Orbitron', sans-serif;
    transition: all 0.2s ease;
  }

  .btn-see-more:hover {
    background: var(--mtl-green);
    color: #000;
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
  }

  /* Chat Bubbles */
  .chat-bubble-me {
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid rgba(16, 185, 129, 0.4);
    color: #f8fafc;
    border-radius: 1rem 1rem 0 1rem;
    align-self: flex-end;
  }

  .chat-bubble-other {
    background: var(--mtl-card);
    border: 1px solid var(--mtl-card-border);
    color: #cbd5e1;
    border-radius: 1rem 1rem 1rem 0;
    align-self: flex-start;
  }

  /* Loader Styling */
  .floating-loader-overlay {
    position: fixed;
    inset: 0;
    background: rgba(9, 13, 22, 0.85);
    backdrop-filter: blur(10px);
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
    text-align: center;
    max-width: 320px;
    width: 90%;
    box-shadow: 0 0 30px rgba(16, 185, 129, 0.2);
  }

  .water-progress-container {
    width: 100%;
    height: 6px;
    background: var(--mtl-card-border);
    border-radius: 9999px;
    overflow: hidden;
  }

  .water-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #00f0ff);
    transition: width 0.4s ease;
  }

  /* High Contrast Mode Override */
  .high-contrast-mode {
    --mtl-surface: #000000;
    --mtl-dark: #000000;
    --mtl-card: #0a0a0a;
    --mtl-card-border: #ffffff;
    --mtl-green: #00ff66;
    color: #ffffff;
  }
`;

// --- CONFIGURATION & CONSTANTS ---
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";  
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";  

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

export default function MTLFootballHub() {  
  // --- STATE MANAGEMENT ---
  const [currentUser, setCurrentUser] = useState(null);  
  const [userProfile, setUserProfile] = useState({  
    role: 'user', username: 'not Signed in', email: '', odds_format: 'decimal', language: 'en', high_contrast: false  
  });  

  // Data Stores  
  const [matchesData, setMatchesData] = useState([]);  
  const [fixturesData, setFixturesData] = useState([]);  
  const [trendingData, setTrendingData] = useState([]);  
  const [liveMatchesData, setLiveMatchesData] = useState([]);  
  const [globalChatMessages, setGlobalChatMessages] = useState([]);  
  const [matchCommentsStore, setMatchCommentsStore] = useState({});  
  const [matchChatStore, setMatchChatStore] = useState({});  
  const [matchReactionsMap, setMatchReactionsMap] = useState({});  

  // UI Control State  
  const [activeMatchTab, setActiveMatchTab] = useState('future');  
  const [matchSearchQuery, setMatchSearchQuery] = useState('');  
  const [toastList, setToastList] = useState([]);  

  // Loader & Error State  
  const [loader, setLoader] = useState({ active: true, text: 'initializing secure intelligence core...', progress: 15 });  
  const [dbError, setDbError] = useState(null);  

  // Navigation & Modals State  
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);  
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);  
  const [globalChatInput, setGlobalChatInput] = useState('');  

  // Active Modal States & Targets  
  const [googleSearchModal, setGoogleSearchModal] = useState({ open: false, query: '' });  
  const [reactionUsersModal, setReactionUsersModal] = useState({ open: false, title: 'REACTANTS', list: [] });  
  const [statsListModal, setStatsListModal] = useState({ open: false, title: '', type: null, data: [] });  
  const [fullscreenMatchModal, setFullscreenMatchModal] = useState({ open: false, match: null });  
  const [fullscreenCommentsModal, setFullscreenCommentsModal] = useState({ open: false, matchId: null, text: '' });  
  const [matchChatModal, setMatchChatModal] = useState({ open: false, matchId: null, input: '' });  
  const [dialingModal, setDialingModal] = useState(false);  
  const [settingsModal, setSettingsModal] = useState(false);  
  const [adminModal, setAdminModal] = useState({ open: false, section: null, editingItem: null, formData: {} });  

  const canvasRef = useRef(null);  

  // --- HELPER NOTIFICATIONS & ERRORS ---
  const showToast = (message, isError = true) => {  
    const id = Date.now() + Math.random();  
    setToastList(prev => [...prev, { id, message, isError }]);  
    setTimeout(() => {  
      setToastList(prev => prev.filter(t => t.id !== id));  
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
      title: `${operation} Operation Failed • Target Table: [${table}]`,  
      diagnosis,  
      action,  
      details: JSON.stringify(error, null, 2)  
    });  
  };  

  // --- ODD FORMATTER ---
  const formatOdds = (decimalOdds) => {  
    if (decimalOdds === null || decimalOdds === undefined) return 'N/A';  
    const fmt = userProfile.odds_format;  
    if (fmt === 'fractional') {  
      const frac = decimalOdds - 1;  
      if (Math.abs(frac - 1) < 0.05) return '1/1';  
      if (Math.abs(frac - 0.5) < 0.05) return '1/2';  
      if (Math.abs(frac - 1.5) < 0.05) return '3/2';  
      return `${frac.toFixed(1)}/1`;  
    }  
    if (fmt === 'american') {  
      if (decimalOdds >= 2.0) {  
        const american = Math.round((decimalOdds - 1) * 100);  
        return `+${american}`;  
      } else {  
        const american = Math.round(-100 / (decimalOdds - 1));  
        return `${american}`;  
      }  
    }  
    return Number(decimalOdds).toFixed(2);  
  };  

  // --- NORMALIZATION & MAPPING ---
  const normalizeMatch = (match, reactionsMap = matchReactionsMap) => {  
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
  };  

  const normalizeFixture = (fix) => {  
    const matchDate = fix.match_date ?? fix.date ?? '';  
    const matchTime = fix.match_time ?? fix.time ?? '';  
    return { ...fix, match_date: matchDate, match_time: matchTime, badge: fix.badge || getTeamBadge(fix.teams) };  
  };  

  const normalizeTrending = (item) => {  
    return { ...item, rank: item.rank ?? '', title: item.title ?? '', comments_count: item.comments_count ?? item.comments ?? 0 };  
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

  // --- DATABASE DATA LOADERS ---
  const loadDatabaseReactions = async () => {  
    try {  
      const { data, error } = await db.from('reactions').select('*');  
      if (error) { showDatabaseError('reactions', error, 'READ_REACTIONS'); return {}; }  
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
        return map;  
      }  
    } catch (e) { showDatabaseError('reactions', e, 'READ_REACTIONS'); }  
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
    } catch (err) { showDatabaseError('comments', err, 'READ_COMMENTS'); }  
  };  

  const loadDatabaseChats = async () => {  
    try {  
      const { data, error } = await db.from('chats').select('*').order('created_at', { ascending: true });  
      if (error) { showDatabaseError('chats', error, 'READ_CHATS'); return; }  
      if (Array.isArray(data)) {  
        const gChats = [];  
        const mChats = {};  
        data.forEach(msg => {  
          const parsed = {  
            id: msg.id,  
            user_id: msg.user_id,  
            user: msg.username || msg.user || 'User',  
            text: msg.message || msg.text || '',  
            time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'  
          };  
          if (!msg.match_id) {  
            gChats.push(parsed);  
          } else {  
            const mId = String(msg.match_id);  
            if (!mChats[mId]) mChats[mId] = [];  
            mChats[mId].push(parsed);  
          }  
        });  
        setGlobalChatMessages(gChats);  
        setMatchChatStore(mChats);  
      }  
    } catch (err) { showDatabaseError('chats', err, 'READ_CHATS'); }  
  };  

  const loadMatchesFromDB = async (currentReactionsMap = matchReactionsMap) => {  
    try {  
      const { data, error } = await db.from('matches').select('*').order('created_at', { ascending: false });  
      if (error) { showDatabaseError('matches', error, 'READ_MATCHES'); return; }  
      const normalized = Array.isArray(data) ? data.map(m => normalizeMatch(m, currentReactionsMap)) : [];  
      setMatchesData(normalized);  
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

  const signOutUser = async () => {  
    await db.auth.signOut();  
    window.location.href = "auth.html";  
  };  

  // --- INITIALIZATION & REALTIME LIFECYCLES ---
  useEffect(() => {  
    let animationFrameId;  
    let renderer, scene, camera, torusKnot, particleMesh;  

    if (canvasRef.current) {  
      const canvas = canvasRef.current;  
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });  
      renderer.setSize(window.innerWidth, window.innerHeight);  
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));  

      scene = new THREE.Scene();  
      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);  
      camera.position.z = 30;  

      const geometry = new THREE.TorusKnotGeometry(10, 3, 128, 32);  
      const material = new THREE.MeshStandardMaterial({  
        color: 0x10b981,  
        wireframe: true,  
        roughness: 0.2,  
        metalness: 0.8  
      });  
      torusKnot = new THREE.Mesh(geometry, material);  
      scene.add(torusKnot);  

      const particlesGeometry = new THREE.BufferGeometry();  
      const particlesCount = 700;  
      const posArray = new Float32Array(particlesCount * 3);  
      for(let i = 0; i < particlesCount * 3; i++) {  
        posArray[i] = (Math.random() - 0.5) * 60;  
      }  
      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));  
      const particlesMaterial = new THREE.PointsMaterial({  
        size: 0.12,  
        color: 0x00f0ff,  
        transparent: true,  
        opacity: 0.7  
      });  
      particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);  
      scene.add(particleMesh);  

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);  
      scene.add(ambientLight);  
      const pointLight = new THREE.PointLight(0x00f0ff, 2, 50);  
      pointLight.position.set(15, 15, 15);  
      scene.add(pointLight);  

      let mouseX = 0, mouseY = 0;  
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
      };  
    }  
  }, []);  

  useEffect(() => {  
    async function initApp() {  
      setLoader({ active: true, text: "establishing quantum sync...", progress: 15 });  
      const authenticated = await checkUserSession();  
      if (!authenticated) return;  

      setLoader({ active: true, text: "fetching neural feeds...", progress: 40 });  
      const rMap = await loadDatabaseReactions();  

      await Promise.all([  
        loadMatchesFromDB(rMap),  
        loadFixturesFromDB(),  
        loadTrendingFromDB(),  
        loadDatabaseComments(),  
        loadDatabaseChats()  
      ]);  

      setLoader({ active: true, text: "sync complete", progress: 100 });  
      setTimeout(() => setLoader(prev => ({ ...prev, active: false })), 300);  
    }  

    initApp();  

    const chatSub = db.channel('public:chats')  
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, async () => {  
        await loadDatabaseChats();  
      }).subscribe();  

    const commentsSub = db.channel('public:comments')  
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async () => {  
        await loadDatabaseComments();  
      }).subscribe();  

    const reactionsSub = db.channel('public:reactions')  
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, async () => {  
        const rMap = await loadDatabaseReactions();  
        await loadMatchesFromDB(rMap);  
      }).subscribe();  

    const liveTimer = setInterval(() => {  
      setMatchesData(prev => [...prev]);  
    }, 1000);  

    return () => {  
      db.removeChannel(chatSub);  
      db.removeChannel(commentsSub);  
      db.removeChannel(reactionsSub);  
      clearInterval(liveTimer);  
    };  
  }, []);  

  useEffect(() => {  
    const now = new Date();  
    const live = matchesData.filter(m => isMatchCurrentlyLive(m, now)).map(buildLiveMatch);  
    setLiveMatchesData(live);  
  }, [matchesData]);  

  // --- ACTIONS & HANDLERS ---
  const openGoogleSearchIframe = (query) => {  
    setGoogleSearchModal({  
      open: true,  
      query,  
      src: `https://www.google.com/search?q=${encodeURIComponent(query)}&igu=1`  
    });  
  };  

  const reactToMatch = async (matchId, reactionType) => {  
    if (!currentUser) return;  
    try {  
      const mId = String(matchId);  
      const userReactions = matchReactionsMap[mId] || [];  
      const existing = userReactions.find(r => r.user_id === currentUser.id && r.reaction === reactionType);  

      if (existing) {  
        await db.from('reactions').delete().match({ match_id: matchId, user_id: currentUser.id, reaction_type: reactionType });  
      } else {  
        const payload = verifyHackLocksAndSanitize({  
          match_id: matchId,  
          user_id: currentUser.id,  
          username: userProfile.username,  
          reaction_type: reactionType  
        });  
        await db.from('reactions').insert([payload]);  
      }  
      const updatedMap = await loadDatabaseReactions();  
      await loadMatchesFromDB(updatedMap);  
    } catch (e) {  
      showDatabaseError('reactions', e, 'WRITE_REACTION');  
    }  
  };  

  const openReactionUsersModal = (matchId, reactionType) => {  
    const mId = String(matchId);  
    const userReactions = matchReactionsMap[mId] || [];  
    const filtered = userReactions.filter(r => r.reaction === reactionType);  
    setReactionUsersModal({  
      open: true,  
      title: `${reactionType.toUpperCase()} REACTANTS`,  
      list: filtered  
    });  
  };  

  const sendGlobalChatMessage = async () => {  
    if (!globalChatInput.trim() || !currentUser) return;  
    try {  
      const payload = verifyHackLocksAndSanitize({  
        user_id: currentUser.id,  
        username: userProfile.username,  
        message: globalChatInput.trim()  
      });  
      const { error } = await db.from('chats').insert([payload]);  
      if (error) { showDatabaseError('chats', error, 'POST_GLOBAL_CHAT'); return; }  
      setGlobalChatInput('');  
      await loadDatabaseChats();  
    } catch (err) { showDatabaseError('chats', err, 'POST_GLOBAL_CHAT'); }  
  };  

  const sendMatchChatMessage = async () => {  
    if (!matchChatModal.input.trim() || !currentUser || !matchChatModal.matchId) return;  
    try {  
      const payload = verifyHackLocksAndSanitize({  
        match_id: matchChatModal.matchId,  
        user_id: currentUser.id,  
        username: userProfile.username,  
        message: matchChatModal.input.trim()  
      });  
      const { error } = await db.from('chats').insert([payload]);  
      if (error) { showDatabaseError('chats', error, 'POST_MATCH_CHAT'); return; }  
      setMatchChatModal(prev => ({ ...prev, input: '' }));  
      await loadDatabaseChats();  
    } catch (err) { showDatabaseError('chats', err, 'POST_MATCH_CHAT'); }  
  };  

  const submitFullscreenComment = async () => {  
    if (!fullscreenCommentsModal.text.trim() || !currentUser || !fullscreenCommentsModal.matchId) return;  
    try {  
      const payload = verifyHackLocksAndSanitize({  
        match_id: fullscreenCommentsModal.matchId,  
        user_id: currentUser.id,  
        username: userProfile.username,  
        comment: fullscreenCommentsModal.text.trim()  
      });  
      const { error } = await db.from('comments').insert([payload]);  
      if (error) { showDatabaseError('comments', error, 'POST_COMMENT'); return; }  
      setFullscreenCommentsModal(prev => ({ ...prev, text: '' }));  
      await loadDatabaseComments();  
    } catch (err) { showDatabaseError('comments', err, 'POST_COMMENT'); }  
  };  

  const openFloatingAdminModal = (section, editingItemId = null) => {  
    let formData = {};  
    if (editingItemId) {  
      if (section === 'matches') formData = { ...matchesData.find(m => String(m.id) === String(editingItemId)) };  
      if (section === 'fixtures') formData = { ...fixturesData.find(f => String(f.id) === String(editingItemId)) };  
      if (section === 'trending') formData = { ...trendingData.find(t => String(t.id) === String(editingItemId)) };  
    }  
    setAdminModal({ open: true, section, editingItem: editingItemId, formData });  
  };  

  const saveAdminEntry = async () => {  
    const { section, editingItem, formData } = adminModal;  
    try {  
      const payload = verifyHackLocksAndSanitize({ ...formData });  
      if (editingItem) {  
        const { error } = await db.from(section).update(payload).eq('id', editingItem);  
        if (error) throw error;  
        showToast(`Updated entry in ${section}`, false);  
      } else {  
        const { error } = await db.from(section).insert([payload]);  
        if (error) throw error;  
        showToast(`Added new entry to ${section}`, false);  
      }  

      setAdminModal({ open: false, section: null, editingItem: null, formData: {} });  
      if (section === 'matches') await loadMatchesFromDB();  
      if (section === 'fixtures') await loadFixturesFromDB();  
      if (section === 'trending') await loadTrendingFromDB();  
    } catch (err) {  
      showDatabaseError(section, err, editingItem ? 'UPDATE' : 'INSERT');  
    }  
  };  

  const deleteMatchFromDB = async (id) => {  
    if (!window.confirm("Are you sure you want to delete this match record?")) return;  
    try {  
      const { error } = await db.from('matches').delete().eq('id', id);  
      if (error) throw error;  
      showToast("Match removed", false);  
      await loadMatchesFromDB();  
    } catch (e) { showDatabaseError('matches', e, 'DELETE'); }  
  };  

  const deleteFixtureFromDB = async (id) => {  
    if (!window.confirm("Are you sure you want to delete this fixture?")) return;  
    try {  
      const { error } = await db.from('fixtures').delete().eq('id', id);  
      if (error) throw error;  
      showToast("Fixture removed", false);  
      await loadFixturesFromDB();  
    } catch (e) { showDatabaseError('fixtures', e, 'DELETE'); }  
  };  

  const deleteTrendingFromDB = async (id) => {  
    if (!window.confirm("Are you sure you want to delete this news headline?")) return;  
    try {  
      const { error } = await db.from('trending').delete().eq('id', id);  
      if (error) throw error;  
      showToast("News removed", false);  
      await loadTrendingFromDB();  
    } catch (e) { showDatabaseError('trending', e, 'DELETE'); }  
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

  const activeCommentsMatch = matchesData.find(m => String(m.id) === String(fullscreenCommentsModal.matchId));  

  return (  
    <div className={`min-h-screen flex flex-col justify-between selection:bg-mtlGreen selection:text-black ${userProfile.high_contrast ? 'high-contrast-mode' : ''}`}>  
        
      {/* Dynamic Injection of Missing Styles */}
      <style>{globalStyles}</style>

      {/* 4D Background Canvas */}  
      <canvas ref={canvasRef} id="bg-4d-canvas"></canvas>  

      <div className="app-content-wrapper flex flex-col min-h-screen justify-between">  
          
        {/* Toast Container */}  
        <div id="toast-container" className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">  
          {toastList.map(t => (  
            <div key={t.id} className={`px-4 py-3 rounded-xl border text-xs font-bold font-cyber shadow-2xl flex items-center gap-2 pointer-events-auto transition-all duration-300 ${t.isError ? 'bg-red-950/90 border-red-500/50 text-red-300' : 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'}`}>  
              <span>{t.isError ? '⚠️' : '✔️'}</span>  
              <span>{sanitizeInput(t.message)}</span>  
            </div>  
          ))}  
        </div>  

        {/* Floating Quantum Sync Loader */}  
        <div id="floating-loader" className={`floating-loader-overlay ${loader.active ? 'active' : ''}`}>  
          <div className="loader-card space-y-4">  
            <div className="flex items-center justify-center gap-3">  
              <span className="w-3 h-3 rounded-full bg-mtlGreen animate-ping"></span>  
              <h4 className="text-xs font-bold uppercase tracking-widest text-mtlGreen font-cyber">QUANTUM SYNC</h4>  
            </div>  
            <p id="loader-prompt-text" className="text-sm font-medium text-gray-200">{loader.text}</p>  
            <div className="water-progress-container">  
              <div id="loader-progress" className="water-progress-bar" style={{ width: `${loader.progress}%` }}></div>  
            </div>  
          </div>  
        </div>  

        {/* Reacted Users Modal */}  
        {reactionUsersModal.open && (  
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">  
            <div className="bg-mtlSurface border border-mtlGreen rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative">  
              <div className="flex justify-between items-center border-b border-mtlCardBorder pb-3">  
                <h4 className="font-bold text-sm text-mtlGreen font-cyber">{reactionUsersModal.title}</h4>  
                <button onClick={() => setReactionUsersModal({ open: false, title: 'REACTANTS', list: [] })} className="text-gray-400 hover:text-white font-bold">✕</button>  
              </div>  
              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">  
                {reactionUsersModal.list.length === 0 ? (  
                  <p className="text-gray-400 text-center py-4">No users found for this reaction.</p>  
                ) : (  
                  reactionUsersModal.list.map((u, i) => (  
                    <div key={i} className="flex items-center justify-between bg-mtlDark p-2 rounded-xl border border-mtlCardBorder">  
                      <span className="text-gray-200 font-semibold">{sanitizeInput(u.username)}</span>  
                      <span className="text-[10px] text-mtlGreen font-cyber">AUTHENTICATED</span>  
                    </div>  
                  ))  
                )}  
              </div>  
              <button onClick={() => setReactionUsersModal({ open: false, title: 'REACTANTS', list: [] })} className="w-full bg-mtlCard border border-mtlCardBorder text-gray-300 py-2 rounded-xl text-xs font-bold hover:text-white">Close</button>  
            </div>  
          </div>  
        )}  

        {/* Side Navigation Overlay Menu */}  
        <div   
          onClick={() => setIsSideNavOpen(false)}   
          className={`${isSideNavOpen ? '' : 'hidden'} fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity`}  
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
              <button onClick={() => { setDialingModal(true); setIsSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-mtlCard border border-mtlCardBorder hover:border-mtlGreen hover:text-mtlGreen transition text-xs font-semibold text-gray-200">  
                <span className="text-base">📞</span> Contact Centre  
              </button>  
              <button onClick={() => { setSettingsModal(true); setIsSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-mtlCard border border-mtlCardBorder hover:border-mtlGreen hover:text-mtlGreen transition text-xs font-semibold text-gray-200">  
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

        {/* App Root Container */}  
        <div id="app-root">  

          {/* Header */}  
          <header className="border-b border-mtlCardBorder bg-mtlSurface/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">  
            <div className="max-w-7xl mx-auto flex items-center justify-between">  
              <div className="flex items-center gap-3">  
                <a href="/dashboard" title="Back to Dashboard" className="w-9 h-9 rounded-xl bg-mtlCard border border-mtlCardBorder text-mtlGreen flex items-center justify-center font-bold text-sm hover:bg-mtlGreen hover:text-black transition">⬅️</a>  
                <div className="w-10 h-10 avatar-logo text-lg cursor-pointer" onClick={() => setDialingModal(true)}>{getFirstNameInitials(userProfile.username)}</div>  
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
                      <p className="text-xs text-gray-300 mt-1">{dbError.title}</p>  
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

          {/* Main Grid */}  
          <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">  

            {/* Live Section */}  
            <section id="live-section">  
              <div className="flex items-center justify-between mb-6">  
                <div>  
                  <h3 className="font-extrabold text-lg uppercase tracking-wide text-white font-cyber flex items-center gap-2">  
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> LIVE MATCHES  
                  </h3>  
                  <span className="text-xs text-gray-400">{liveMatchesData.length} Active Match{liveMatchesData.length === 1 ? '' : 'es'}</span>  
                </div>  
                <button onClick={() => setStatsListModal({ open: true, title: 'Live Games Directory', type: 'live', data: liveMatchesData })} className="btn-see-more">  
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
                      <CardWithLongPress   
                        key={match.id}   
                        className="pro-card p-5 relative overflow-hidden cursor-pointer"  
                        onClick={() => setFullscreenMatchModal({ open: true, match })}  
                        onLongPress={() => openGoogleSearchIframe(`Live match results for ${match.teams}`)}  
                      >  
                        <div className="flex justify-between items-center text-xs text-gray-400 mb-3 font-semibold">  
                          <span className="font-cyber hover:text-mtlGreen" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(`Match live summary ${match.teams}`); }}>{sanitizeInput(match.league)}</span>  
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
                              <button onClick={(e) => { e.stopPropagation(); openFloatingAdminModal('matches', match.id); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded hover:bg-amber-500 hover:text-black">Edit</button>  
                              <button onClick={(e) => { e.stopPropagation(); deleteMatchFromDB(match.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded hover:bg-red-600 hover:text-white">Delete</button>  
                            </div>  
                          )}  
                        </div>  
                      </CardWithLongPress>  
                    );  
                  })  
                )}  
              </div>  
            </section>  

            {/* Predictions Section */}  
            <section id="db-matches-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 shadow-2xl">  
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">  
                <div>  
                  <h3 className="text-lg font-extrabold uppercase tracking-wide text-white font-cyber cursor-pointer hover:text-mtlGreen transition" onClick={() => openGoogleSearchIframe('Live database matches and football predictions')}>  
                    ⚽ MATCHES & PREDICTIONS  
                  </h3>  
                  <p className="text-xs text-gray-400 mt-0.5">Hold match cards long press to trigger Google Search.</p>  
                </div>  
                <button onClick={() => setStatsListModal({ open: true, title: 'All Database Predictions', type: 'matches', data: matchesData })} className="btn-see-more">  
                  <span>SEE MORE</span> ➔  
                </button>  
              </div>  

              {/* Controls Row */}  
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

              {/* Matches Grid */}  
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">  
                {getFilteredMatches().length === 0 ? (  
                  <div className="col-span-3 text-center py-10 pro-card"><p className="text-xs text-gray-400">No {activeMatchTab === 'past' ? 'past' : 'upcoming'} matches found matching query "{sanitizeInput(matchSearchQuery)}".</p></div>  
                ) : (  
                  getFilteredMatches().slice(0, 3).map(match => {  
                    const comments = matchCommentsStore[match.id] || [];  
                    const typeClass = String(match.type || 'free').toLowerCase() === 'premium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';  
                    const stars = Number(match.confidence_stars) > 0 ? '⭐'.repeat(Math.min(Number(match.confidence_stars), 5)) : '—';  

                    return (  
                      <CardWithLongPress   
                        key={match.id}   
                        className="pro-card p-5 flex flex-col justify-between space-y-4 cursor-pointer"  
                        onLongPress={() => openGoogleSearchIframe(`Football Match Prediction for ${match.teams || ''}`)}  
                      >  
                        <div>  
                          <div className="flex justify-between items-center mb-3 text-xs">  
                            <span className="text-gray-400 font-semibold font-cyber uppercase tracking-wider">{sanitizeInput(match.league || 'LEAGUE')}</span>  
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-cyber ${typeClass}`}>{sanitizeInput(match.type || 'FREE')}</span>  
                          </div>  
                          <h4 className="font-extrabold text-sm text-white hover:text-mtlGreen transition cursor-pointer" onClick={(e) => { e.stopPropagation(); setFullscreenMatchModal({ open: true, match }); }}>{sanitizeInput(match.teams || 'Match Teams')}</h4>  
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">  
                            <span>📅 {sanitizeInput(match.match_date || 'TBD')}</span>  
                            <span>⏰ {sanitizeInput(match.match_time || 'TBD')}</span>  
                          </div>  
                        </div>  

                        <div className="bg-mtlDark p-3 rounded-xl border border-mtlCardBorder space-y-2">  
                          <div className="flex justify-between items-center text-xs">  
                            <span className="text-gray-400">Tip / Pick:</span>  
                            <span className="font-bold text-mtlGreen font-cyber">{sanitizeInput(match.prediction || 'N/A')}</span>  
                          </div>  
                          <div className="flex justify-between items-center text-xs">  
                            <span className="text-gray-400">Odds:</span>  
                            <span className="font-bold text-white font-cyber">{formatOdds(match.decimal_odds)}</span>  
                          </div>  
                          <div className="flex justify-between items-center text-xs">  
                            <span className="text-gray-400">Confidence:</span>  
                            <span className="text-xs">{stars}</span>  
                          </div>  
                          <div className="space-y-1 pt-1">  
                            <div className="flex justify-between text-[10px] text-gray-400 font-mono">  
                              <span>H: {match.prob_home}%</span>  
                              <span>D: {match.prob_draw}%</span>  
                              <span>A: {match.prob_away}%</span>  
                            </div>  
                            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden flex">  
                              <div className="bg-mtlGreen h-full" style={{ width: `${match.prob_home}%` }}></div>  
                              <div className="bg-amber-400 h-full" style={{ width: `${match.prob_draw}%` }}></div>  
                              <div className="bg-mtlAccent h-full" style={{ width: `${match.prob_away}%` }}></div>  
                            </div>  
                          </div>  
                        </div>  

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-mtlCardBorder">  
                          <div className="flex items-center gap-2">  
                            <ButtonWithLongPress   
                              className="bg-mtlDark border border-mtlCardBorder px-2.5 py-1 rounded-lg text-xs hover:border-mtlGreen flex items-center gap-1 transition"  
                              onClick={(e) => { e.stopPropagation(); reactToMatch(match.id, 'fire'); }}  
                              onLongPress={() => openReactionUsersModal(match.id, 'fire')}  
                            >  
                              🔥 <span>{match.reactions?.fire || 0}</span>  
                            </ButtonWithLongPress>  
                            <ButtonWithLongPress   
                              className="bg-mtlDark border border-mtlCardBorder px-2.5 py-1 rounded-lg text-xs hover:border-mtlGreen flex items-center gap-1 transition"  
                              onClick={(e) => { e.stopPropagation(); reactToMatch(match.id, 'heart'); }}  
                              onLongPress={() => openReactionUsersModal(match.id, 'heart')}  
                            >  
                              ❤️ <span>{match.reactions?.heart || 0}</span>  
                            </ButtonWithLongPress>  
                            <ButtonWithLongPress   
                              className="bg-mtlDark border border-mtlCardBorder px-2.5 py-1 rounded-lg text-xs hover:border-mtlGreen flex items-center gap-1 transition"  
                              onClick={(e) => { e.stopPropagation(); reactToMatch(match.id, 'dislike'); }}  
                              onLongPress={() => openReactionUsersModal(match.id, 'dislike')}  
                            >  
                              👎 <span>{match.reactions?.dislike || 0}</span>  
                            </ButtonWithLongPress>  
                          </div>  

                          <button onClick={(e) => { e.stopPropagation(); setFullscreenCommentsModal({ open: true, matchId: match.id, text: '' }); }} className="text-gray-400 hover:text-white flex items-center gap-1">  
                            💬 <span>{comments.length}</span>  
                          </button>  
                        </div>  

                        {userProfile.role === 'admin' && (  
                          <div className="pt-2 border-t border-mtlCardBorder flex justify-end gap-2">  
                            <button onClick={(e) => { e.stopPropagation(); openFloatingAdminModal('matches', match.id); }} className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-lg hover:bg-amber-500 hover:text-black">Edit</button>  
                            <button onClick={(e) => { e.stopPropagation(); deleteMatchFromDB(match.id); }} className="text-xs bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-lg hover:bg-red-600 hover:text-white">Delete</button>  
                          </div>  
                        )}  
                      </CardWithLongPress>  
                    );  
                  })  
                )}  
              </div>  

              {userProfile.role === 'admin' && (  
                <div className="mt-6 pt-4 border-t border-mtlCardBorder flex justify-center">  
                  <button onClick={() => openFloatingAdminModal('matches')} className="bg-mtlGreen text-black font-extrabold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider transition flex items-center gap-2">  
                    <span>➕</span> ADD PREDICTION  
                  </button>  
                </div>  
              )}  
            </section>  

            {/* Grid for Fixtures & Trending */}  
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">  
                
              {/* Fixtures */}  
              <section id="fixtures-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-2xl">  
                <div>  
                  <div className="flex items-center justify-between mb-6">  
                    <div>  
                      <h3 className="font-extrabold uppercase tracking-wide text-base text-white font-cyber cursor-pointer hover:text-mtlGreen transition" onClick={() => openGoogleSearchIframe('Upcoming football fixtures schedule')}>  
                         UPCOMING FIXTURES  
                      </h3>  
                      <span className="text-xs text-gray-400">Upcoming fixtures</span>  
                    </div>  
                    <button onClick={() => setStatsListModal({ open: true, title: 'Complete Fixtures Schedule', type: 'fixtures', data: fixturesData })} className="btn-see-more text-xs py-2 px-3.5">  
                      <span>SEE MORE</span> ➔  
                    </button>  
                  </div>  
                  <div className="space-y-4">  
                    {fixturesData.length === 0 ? (  
                      <div className="text-center py-8 text-xs text-gray-500">No upcoming fixtures recorded.</div>  
                    ) : (  
                      fixturesData.slice(0, 3).map(fix => (  
                        <CardWithLongPress   
                          key={fix.id}   
                          className="pro-card p-4 flex items-center justify-between cursor-pointer"  
                          onLongPress={() => openGoogleSearchIframe(`Football fixture data for ${fix.teams || ''} ${fix.league || ''}`)}  
                        >  
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
                                <button onClick={(e) => { e.stopPropagation(); openFloatingAdminModal('fixtures', fix.id); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">Edit</button>  
                                <button onClick={(e) => { e.stopPropagation(); deleteFixtureFromDB(fix.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white">Delete</button>  
                              </div>  
                            )}  
                          </div>  
                        </CardWithLongPress>  
                      ))  
                    )}  
                  </div>  
                </div>  
                {userProfile.role === 'admin' && (  
                  <div className="pt-4 border-t border-mtlCardBorder flex justify-center">  
                    <button onClick={() => openFloatingAdminModal('fixtures')} className="bg-mtlCard border border-mtlGreen text-mtlGreen font-bold px-5 py-2 rounded-xl text-xs hover:bg-mtlGreen hover:text-black transition flex items-center gap-2">  
                      <span>➕</span> ADD FIXTURE  
                    </button>  
                  </div>  
                )}  
              </section>  

              {/* Trending News */}  
              <section id="trending-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-2xl">  
                <div>  
                  <div className="flex items-center justify-between mb-6">  
                    <div>  
                      <h3 className="font-extrabold uppercase tracking-wide text-base text-white font-cyber cursor-pointer hover:text-mtlGreen transition" onClick={() => openGoogleSearchIframe('Trending football news updates')}>  
                        🔥 TRENDING NEWS  
                      </h3>  
                      <span className="text-xs text-gray-400">What's trending.</span>  
                    </div>  
                    <button onClick={() => setStatsListModal({ open: true, title: 'All Trending News', type: 'trending', data: trendingData })} className="btn-see-more text-xs py-2 px-3.5">  
                      <span>SEE MORE</span> ➔  
                    </button>  
                  </div>  
                  <div className="space-y-4">  
                    {trendingData.length === 0 ? (  
                      <div className="text-center py-8 text-xs text-gray-500">No trending headlines.</div>  
                    ) : (  
                      trendingData.slice(0, 3).map(item => (  
                        <CardWithLongPress   
                          key={item.id}   
                          className="pro-card p-4 flex items-center justify-between cursor-pointer"  
                          onLongPress={() => openGoogleSearchIframe(`Football news updates on ${item.title || ''}`)}  
                        >  
                          <div className="flex items-center gap-3">  
                            <span className="text-sm font-extrabold text-mtlGreen font-cyber">#{sanitizeInput(item.rank)}</span>  
                            <div>  
                              <h4 className="font-bold text-xs text-white hover:text-mtlGreen" onClick={(e) => { e.stopPropagation(); openGoogleSearchIframe(item.title); }}>{sanitizeInput(item.title)}</h4>  
                              <span className="text-[10px] text-gray-500">💬 {Number(item.comments_count) || 6237} discussions</span>  
                            </div>  
                          </div>  
                          {userProfile.role === 'admin' && (  
                            <div className="flex gap-1">  
                              <button onClick={(e) => { e.stopPropagation(); openFloatingAdminModal('trending', item.id); }} className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500 hover:text-black">Edit</button>  
                              <button onClick={(e) => { e.stopPropagation(); deleteTrendingFromDB(item.id); }} className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600 hover:text-white">Delete</button>  
                            </div>  
                          )}  
                        </CardWithLongPress>  
                      ))  
                    )}  
                  </div>  
                </div>  
                {userProfile.role === 'admin' && (  
                  <div className="pt-4 border-t border-mtlCardBorder flex justify-center">  
                    <button onClick={() => openFloatingAdminModal('trending')} className="bg-mtlCard border border-mtlGreen text-mtlGreen font-bold px-5 py-2 rounded-xl text-xs hover:bg-mtlGreen hover:text-black transition flex items-center gap-2">  
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
                <a href="#" onClick={(e) => { e.preventDefault(); setDialingModal(true); }} className="hover:text-mtlGreen">Developed BY M. Lennox</a>  
              </div>  
            </div>  
          </footer>  
        </div>  

        {/* Google Iframe Modal */}  
        {googleSearchModal.open && (  
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col p-3 sm:p-6">  
            <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-3 mb-3 flex items-center justify-between">  
              <div className="flex items-center gap-3">  
                <div className="w-8 h-8 rounded-lg bg-mtlGreen text-black font-extrabold flex items-center justify-center font-cyber">AI</div>  
                <div>  
                  <h4 className="text-xs font-bold font-cyber text-mtlGreen">GOOGLE QUICK SEARCH</h4>  
                  <p className="text-[10px] text-gray-400 font-mono">query: {googleSearchModal.query}</p>  
                </div>  
              </div>  
              <button onClick={() => setGoogleSearchModal({ open: false, query: '' })} className="w-8 h-8 rounded-full bg-red-900/40 text-red-300 border border-red-500/30 flex items-center justify-center font-bold text-xs hover:bg-red-800">✕</button>  
            </div>  
            <div className="flex-1 rounded-2xl overflow-hidden border border-mtlCardBorder bg-white">  
              <iframe className="w-full h-full border-0" src={googleSearchModal.src} title="Google Search"></iframe>  
            </div>  
          </div>  
        )}  

        {/* Global Telegram-Style Chat Drawer */}  
        <div id="floating-chat-container" className="fixed bottom-6 right-6 z-40">  
          <button onClick={() => setIsChatDrawerOpen(!isChatDrawerOpen)} className="w-14 h-14 rounded-full bg-mtlGreen text-black flex items-center justify-center text-2xl font-bold shadow-lg hover:scale-105 transition transform">💬</button>  
          <div className={`${isChatDrawerOpen ? '' : 'hidden'} absolute bottom-20 right-0 w-80 sm:w-96 bg-mtlSurface border border-mtlCardBorder rounded-2xl shadow-2xl flex flex-col h-[480px] overflow-hidden`}>  
            <div className="bg-mtlDark p-4 border-b border-mtlCardBorder flex items-center justify-between">  
              <div className="flex items-center gap-2">  
                <span className="w-2.5 h-2.5 rounded-full bg-mtlGreen animate-pulse"></span>  
                <h4 className="font-bold text-sm tracking-wide font-cyber text-white">Community Chat</h4>  
              </div>  
              <button onClick={() => setIsChatDrawerOpen(false)} className="text-gray-400 hover:text-white font-bold">✕</button>  
            </div>  
              
            <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">  
              {globalChatMessages.length === 0 ? (  
                <p className="text-gray-500 text-center my-auto">No messages yet. Start conversation!</p>  
              ) : (  
                globalChatMessages.map((msg, i) => {  
                  const isMe = currentUser && msg.user_id === currentUser.id;  
                  return (  
                    <div key={i} className={`p-3 max-w-[80%] ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>  
                      <div className="flex justify-between gap-2 mb-1 text-[10px] opacity-80">  
                        <span className="font-bold">{sanitizeInput(msg.user)}</span>  
                        <span>{msg.time}</span>  
                      </div>  
                      <p className="break-words">{sanitizeInput(msg.text)}</p>  
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
                onKeyDown={(e) => e.key === 'Enter' && sendGlobalChatMessage()}   
                placeholder="Type Telegram message..."   
                className="flex-1 bg-mtlCard border border-mtlCardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mtlGreen"  
              />  
              <button onClick={sendGlobalChatMessage} className="bg-mtlGreen text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-600 transition">Send</button>  
            </div>  
          </div>  
        </div>  

        {/* Fullscreen Comments Modal */}  
        {fullscreenCommentsModal.open && (  
          <div className="fixed inset-0 bg-mtlDark/95 backdrop-blur-xl z-50 p-4 md:p-10 overflow-y-auto flex flex-col justify-between">  
            <div className="max-w-4xl w-full mx-auto bg-mtlSurface border border-mtlGreen/40 rounded-3xl p-6 md:p-8 shadow-2xl relative flex-1 flex flex-col justify-between space-y-6">  
                
              <div className="flex items-center justify-between border-b border-mtlCardBorder pb-4">  
                <div className="flex items-center gap-3">  
                  <div className="w-10 h-10 rounded-2xl bg-mtlGreen/20 border border-mtlGreen text-mtlGreen flex items-center justify-center font-bold text-lg font-cyber">💬</div>  
                  <div>  
                    <h3 className="text-lg md:text-xl font-extrabold text-white font-cyber">{activeCommentsMatch ? activeCommentsMatch.teams : 'Match Comments'}</h3>  
                    <p className="text-xs text-mtlGreen">Leave a public analysis comment.</p>  
                  </div>  
                </div>  
                <button onClick={() => setFullscreenCommentsModal({ open: false, matchId: null, text: '' })} className="w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>  
              </div>  

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[60vh]">  
                {(matchCommentsStore[fullscreenCommentsModal.matchId] || []).length === 0 ? (  
                  <p className="text-gray-500 text-center py-10 text-xs">No comments recorded yet. Be the first!</p>  
                ) : (  
                  (matchCommentsStore[fullscreenCommentsModal.matchId] || []).map((c, idx) => (  
                    <div key={idx} className="bg-mtlCard border border-mtlCardBorder rounded-2xl p-4 space-y-2">  
                      <div className="flex justify-between items-center text-xs">  
                        <span className="font-bold text-mtlGreen font-cyber">{sanitizeInput(c.user)}</span>  
                        <span className="text-[10px] text-gray-500">{c.time}</span>  
                      </div>  
                      <p className="text-xs text-gray-200 leading-relaxed">{sanitizeInput(c.comment)}</p>  
                    </div>  
                  ))  
                )}  
              </div>  

              <div className="bg-mtlDark p-4 rounded-2xl border border-mtlCardBorder space-y-3">  
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Post Public Comment</h4>  
                <div className="flex gap-3">  
                  <textarea   
                    rows={2}   
                    value={fullscreenCommentsModal.text}   
                    onChange={(e) => setFullscreenCommentsModal(prev => ({ ...prev, text: e.target.value }))}   
                    placeholder="Write detailed comment to be recorded in database..."   
                    className="flex-1 bg-mtlCard border border-mtlCardBorder rounded-xl p-3 text-xs text-white focus:outline-none focus:border-mtlGreen"  
                  />  
                  <button onClick={submitFullscreenComment} className="bg-mtlGreen text-black font-extrabold px-6 py-2 rounded-xl text-xs hover:bg-emerald-600 transition self-end">Post Comment</button>  
                </div>  
              </div>  

              <div className="flex justify-end pt-2 border-t border-mtlCardBorder">  
                <button onClick={() => setFullscreenCommentsModal({ open: false, matchId: null, text: '' })} className="btn-see-more">Close</button>  
              </div>  
            </div>  
          </div>  
        )}  

        {/* See More Directory Modal */}  
        {statsListModal.open && (  
          <div className="fixed inset-0 bg-mtlDark/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">  
            <div className="max-w-5xl mx-auto bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">  
              <button onClick={() => setStatsListModal({ open: false, title: '', type: null, data: [] })} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>  
              <div className="space-y-6">  
                <div className="border-b border-mtlCardBorder pb-4">  
                  <h3 className="text-2xl font-extrabold text-mtlGreen uppercase tracking-wider font-cyber">{statsListModal.title}</h3>  
                  <p className="text-xs text-gray-400 mt-1">Full dataset category view.</p>  
                </div>  

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[65vh] overflow-y-auto pr-2">  
                  {statsListModal.data.map((item, index) => (  
                    <div key={index} className="pro-card p-4 space-y-2">  
                      <h4 className="font-bold text-sm text-white">{sanitizeInput(item.teams || item.title || `Entry #${index + 1}`)}</h4>  
                      <p className="text-xs text-gray-400">{sanitizeInput(item.league || item.match_date || item.details || '')}</p>  
                    </div>  
                  ))}  
                </div>  
              </div>  
              <div className="mt-8 pt-6 border-t border-mtlCardBorder flex justify-end">  
                <button onClick={() => setStatsListModal({ open: false, title: '', type: null, data: [] })} className="btn-see-more">Close</button>  
              </div>  
            </div>  
          </div>  
        )}  

        {/* Fullscreen Match Details Modal */}  
        {fullscreenMatchModal.open && fullscreenMatchModal.match && (  
          <div className="fixed inset-0 bg-mtlDark/95 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-10">  
            <div className="max-w-5xl mx-auto bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 md:p-10 shadow-2xl relative min-h-[85vh] flex flex-col justify-between">  
              <button onClick={() => setFullscreenMatchModal({ open: false, match: null })} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-400 hover:text-white flex items-center justify-center text-lg font-bold">✕</button>  
              <div className="space-y-8">  
                <div className="border-b border-mtlCardBorder pb-4">  
                  <span className="text-xs font-cyber text-mtlGreen">{sanitizeInput(fullscreenMatchModal.match.league)}</span>  
                  <h3 className="text-2xl font-extrabold text-white mt-1 font-cyber">{sanitizeInput(fullscreenMatchModal.match.teams)}</h3>  
                </div>  

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">  
                  <div className="bg-mtlDark p-5 rounded-2xl border border-mtlCardBorder space-y-3">  
                    <h4 className="font-bold text-sm text-mtlGreen font-cyber">MATCH METRICS</h4>  
                    <div className="text-xs space-y-2 text-gray-300">  
                      <div className="flex justify-between"><span>Status:</span><span className="font-bold text-white font-cyber">{fullscreenMatchModal.match.status || 'SCHEDULED'}</span></div>  
                      <div className="flex justify-between"><span>Kickoff Date:</span><span>{fullscreenMatchModal.match.match_date}</span></div>  
                      <div className="flex justify-between"><span>Kickoff Time:</span><span>{fullscreenMatchModal.match.match_time}</span></div>  
                      <div className="flex justify-between"><span>Prediction:</span><span className="font-bold text-mtlGreen">{fullscreenMatchModal.match.prediction}</span></div>  
                      <div className="flex justify-between"><span>Decimal Odds:</span><span>{formatOdds(fullscreenMatchModal.match.decimal_odds)}</span></div>  
                    </div>  
                  </div>  

                  <div className="bg-mtlDark p-5 rounded-2xl border border-mtlCardBorder space-y-3">  
                    <h4 className="font-bold text-sm text-mtlGreen font-cyber">PROBABILITY BREAKDOWN</h4>  
                    <div className="space-y-3 text-xs">  
                      <div>  
                        <div className="flex justify-between mb-1"><span>Home Win</span><span>{fullscreenMatchModal.match.prob_home}%</span></div>  
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden"><div className="bg-mtlGreen h-full" style={{ width: `${fullscreenMatchModal.match.prob_home}%` }}></div></div>  
                      </div>  
                      <div>  
                        <div className="flex justify-between mb-1"><span>Draw</span><span>{fullscreenMatchModal.match.prob_draw}%</span></div>  
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden"><div className="bg-amber-400 h-full" style={{ width: `${fullscreenMatchModal.match.prob_draw}%` }}></div></div>  
                      </div>  
                      <div>  
                        <div className="flex justify-between mb-1"><span>Away Win</span><span>{fullscreenMatchModal.match.prob_away}%</span></div>  
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden"><div className="bg-mtlAccent h-full" style={{ width: `${fullscreenMatchModal.match.prob_away}%` }}></div></div>  
                      </div>  
                    </div>  
                  </div>  
                </div>  
              </div>  

              <div className="mt-8 pt-6 border-t border-mtlCardBorder flex justify-between items-center">  
                <div className="flex items-center gap-3">  
                  <button onClick={() => { setMatchChatModal({ open: true, matchId: fullscreenMatchModal.match.id, input: '' }); setFullscreenMatchModal({ open: false, match: null }); }} className="bg-mtlCard border border-mtlCardBorder text-gray-200 px-4 py-2 rounded-xl text-xs hover:text-mtlGreen flex items-center gap-2">💬 Open Chat</button>  
                  <button onClick={() => setDialingModal(true)} className="bg-mtlGreen/10 border border-mtlGreen text-mtlGreen px-4 py-2 rounded-xl text-xs font-bold hover:bg-mtlGreen hover:text-black transition">📞 Call</button>  
                </div>  
                <button onClick={() => setFullscreenMatchModal({ open: false, match: null })} className="btn-see-more">Close</button>  
              </div>  
            </div>  
          </div>  
        )}  

        {/* Match Group Chat Modal */}  
        {matchChatModal.open && (  
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">  
            <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">  
              <div className="bg-mtlDark p-4 border-b border-mtlCardBorder flex items-center justify-between">  
                <div>  
                  <h4 className="font-bold text-sm text-mtlGreen font-cyber">Match Discussion Group</h4>  
                  <p className="text-[10px] text-gray-400">Match ID #{matchChatModal.matchId}</p>  
                </div>  
                <button onClick={() => setMatchChatModal({ open: false, matchId: null, input: '' })} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>  
              </div>  
                
              <div className="flex-1 p-4 overflow-y-auto flex flex-col space-y-3 text-xs">  
                {(matchChatStore[matchChatModal.matchId] || []).length === 0 ? (  
                  <p className="text-gray-500 text-center my-auto">No match discussions yet. Start chatting!</p>  
                ) : (  
                  (matchChatStore[matchChatModal.matchId] || []).map((msg, i) => {  
                    const isMe = currentUser && msg.user_id === currentUser.id;  
                    return (  
                      <div key={i} className={`p-3 max-w-[80%] ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>  
                        <div className="flex justify-between gap-2 mb-1 text-[10px] opacity-80">  
                          <span className="font-bold">{sanitizeInput(msg.user)}</span>  
                          <span>{msg.time}</span>  
                        </div>  
                        <p className="break-words">{sanitizeInput(msg.text)}</p>  
                      </div>  
                    );  
                  })  
                )}  
              </div>  
                
              <div className="p-3 border-t border-mtlCardBorder bg-mtlDark flex gap-2">  
                <input   
                  type="text"   
                  value={matchChatModal.input}   
                  onChange={(e) => setMatchChatModal(prev => ({ ...prev, input: e.target.value }))}   
                  onKeyDown={(e) => e.key === 'Enter' && sendMatchChatMessage()}   
                  placeholder="Discuss this match..."   
                  className="flex-1 bg-mtlCard border border-mtlCardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mtlGreen"  
                />  
                <button onClick={sendMatchChatMessage} className="bg-mtlGreen text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-600 transition">Post</button>  
              </div>  
            </div>  
          </div>  
        )}  

        {/* Call Centre Hotline Modal */}  
        {dialingModal && (  
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

        {/* Floating Admin CRUD Modal */}  
        {adminModal.open && (  
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">  
            <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl w-full max-w-2xl p-8 space-y-6 shadow-2xl relative">  
              <div className="flex justify-between items-center border-b border-mtlCardBorder pb-4">  
                <div>  
                  <h3 className="text-xl font-extrabold text-mtlGreen uppercase tracking-wider font-cyber">Admin Content Management</h3>  
                  <p className="text-xs text-gray-400">{adminModal.editingItem ? 'Edit Existing Record' : 'Insert New Record'} [{adminModal.section}]</p>  
                </div>  
                <button onClick={() => setAdminModal({ open: false, section: null, editingItem: null, formData: {} })} className="text-gray-400 hover:text-white font-bold text-xl">✕</button>  
              </div>  

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">  
                {adminModal.section === 'matches' && (  
                  <>  
                    <div>  
                      <label className="block text-xs font-bold text-gray-400 mb-1">TEAMS (e.g. Arsenal vs Chelsea)</label>  
                      <input type="text" value={adminModal.formData.teams || ''} onChange={(e) => setAdminModal(p => ({ ...p, formData: { ...p.formData, teams: e.target.value } }))} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />  
                    </div>  
                    <div>  
                      <label className="block text-xs font-bold text-gray-400 mb-1">LEAGUE</label>  
                      <input type="text" value={adminModal.formData.league || ''} onChange={(e) => setAdminModal(p => ({ ...p, formData: { ...p.formData, league: e.target.value } }))} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />  
                    </div>  
                    <div className="grid grid-cols-2 gap-4">  
                      <div>  
                        <label className="block text-xs font-bold text-gray-400 mb-1">MATCH DATE</label>  
                        <input type="date" value={adminModal.formData.match_date || ''} onChange={(e) => setAdminModal(p => ({ ...p, formData: { ...p.formData, match_date: e.target.value } }))} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />  
                      </div>  
                      <div>  
                        <label className="block text-xs font-bold text-gray-400 mb-1">MATCH TIME</label>  
                        <input type="text" placeholder="HH:MM" value={adminModal.formData.match_time || ''} onChange={(e) => setAdminModal(p => ({ ...p, formData: { ...p.formData, match_time: e.target.value } }))} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />  
                      </div>  
                    </div>  
                    <div className="grid grid-cols-2 gap-4">  
                      <div>  
                        <label className="block text-xs font-bold text-gray-400 mb-1">PREDICTION / PICK</label>  
                        <input type="text" value={adminModal.formData.prediction || ''} onChange={(e) => setAdminModal(p => ({ ...p, formData: { ...p.formData, prediction: e.target.value } }))} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />  
                      </div>  
                      <div>  
                        <label className="block text-xs font-bold text-gray-400 mb-1">DECIMAL ODDS</label>  
                        <input type="number" step="0.01" value={adminModal.formData.decimal_odds || ''} onChange={(e) => setAdminModal(p => ({ ...p, formData: { ...p.formData, decimal_odds: e.target.value } }))} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />  
                      </div>  
                    </div>  
                  </>  
                )}  

                {adminModal.section === 'fixtures' && (  
                  <>  
                    <div>  
                      <label className="block text-xs font-bold text-gray-400 mb-1">FIXTURE TEAMS</label>  
                      <input type="text" value={adminModal.formData.teams || ''} onChange={(e) => setAdminModal(p => ({ ...p, formData: { ...p.formData, teams: e.target.value } }))} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />  
                    </div>  
                    <div>  
                      <label className="block text-xs font-bold text-gray-400 mb-1">LEAGUE</label>  
                      <input type="text" value={adminModal.formData.league || ''} onChange={(e) => setAdminModal(p => ({ ...p, formData: { ...p.formData, league: e.target.value } }))} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />  
                    </div>  
                    <div className="grid grid-cols-2 gap-4">  
                      <div>  
                        <label className="block text-xs font-bold text-gray-400 mb-1">DATE</label>  
                        <input type="date" value={adminModal.formData.match_date || ''} onChange={(e) => setAdminModal(p => ({ ...p, formData: { ...p.formData, match_date: e.target.value } }))} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />  
                      </div>  
                      <div>  
                        <label className="block text-xs font-bold text-gray-400 mb-1">TIME</label>  
                        <input type="text" value={adminModal.formData.match_time || ''} onChange={(e) => setAdminModal(p => ({ ...p, formData: { ...p.formData, match_time: e.target.value } }))} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />  
                      </div>  
                    </div>  
                  </>  
                )}  

                {adminModal.section === 'trending' && (  
                  <>  
                    <div>  
                      <label className="block text-xs font-bold text-gray-400 mb-1">HEADLINE TITLE</label>  
                      <input type="text" value={adminModal.formData.title || ''} onChange={(e) => setAdminModal(p => ({ ...p, formData: { ...p.formData, title: e.target.value } }))} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />  
                    </div>  
                    <div>  
                      <label className="block text-xs font-bold text-gray-400 mb-1">RANK (1-10)</label>  
                      <input type="number" value={adminModal.formData.rank || ''} onChange={(e) => setAdminModal(p => ({ ...p, formData: { ...p.formData, rank: e.target.value } }))} className="w-full bg-mtlDark border border-mtlCardBorder rounded-xl p-2.5 text-xs text-white" />  
                    </div>  
                  </>  
                )}  
              </div>  

              <div className="flex justify-end gap-4 border-t border-mtlCardBorder pt-4">  
                <button onClick={() => setAdminModal({ open: false, section: null, editingItem: null, formData: {} })} className="px-5 py-2.5 rounded-xl text-xs bg-gray-800 text-gray-300 hover:bg-gray-700">Cancel</button>  
                <button onClick={saveAdminEntry} className="px-6 py-2.5 rounded-xl text-xs bg-mtlGreen text-black font-extrabold hover:bg-emerald-600 transition">Save Entry</button>  
              </div>  
            </div>  
          </div>  
        )}  

        {/* User Settings Modal */}  
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
                    onChange={(e) => setUserProfile(p => ({ ...p, odds_format: e.target.value }))}   
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
                    onChange={(e) => setUserProfile(p => ({ ...p, language: e.target.value }))}   
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
                    onChange={(e) => setUserProfile(p => ({ ...p, high_contrast: e.target.checked }))}   
                    className="w-4 h-4 accent-mtlGreen"  
                  />  
                </div>  
              </div>  
              <button onClick={() => setSettingsModal(false)} className="w-full bg-mtlGreen text-black font-bold py-2 rounded-xl">Save & Close</button>  
            </div>  
          </div>  
        )}  

      </div>  
    </div>  
  );  
}  

// --- COMPONENT SUB-HELPERS FOR LONG-PRESS HANDLING ---
function CardWithLongPress({ children, className, onClick, onLongPress }) {  
  const timerRef = useRef(null);  
  const isLongPressRef = useRef(false);  

  const handleTouchStart = () => {  
    isLongPressRef.current = false;  
    timerRef.current = setTimeout(() => {  
      isLongPressRef.current = true;  
      if (onLongPress) onLongPress();  
    }, 600);  
  };  

  const handleTouchEnd = () => {  
    clearTimeout(timerRef.current);  
  };  

  const handleClick = (e) => {  
    if (isLongPressRef.current) {  
      e.stopPropagation();  
      e.preventDefault();  
      return;  
    }  
    if (onClick) onClick(e);  
  };  

  return (  
    <div   
      className={className}  
      onClick={handleClick}  
      onMouseDown={handleTouchStart}  
      onTouchStart={handleTouchStart}  
      onMouseUp={handleTouchEnd}  
      onTouchEnd={handleTouchEnd}  
    >  
      {children}  
    </div>  
  );  
}  

function ButtonWithLongPress({ children, className, onClick, onLongPress }) {  
  const timerRef = useRef(null);  
  const isLongPressRef = useRef(false); // Fixed: wrap initial value in useRef()

  const handleTouchStart = () => {  
    isLongPressRef.current = false;  
    timerRef.current = setTimeout(() => {  
      isLongPressRef.current = true;  
      if (onLongPress) onLongPress();  
    }, 600);  
  };  

  const handleTouchEnd = () => {  
    clearTimeout(timerRef.current);  
  };  

  const handleClick = (e) => {  
    if (isLongPressRef.current) {  
      e.stopPropagation();  
      e.preventDefault();  
      return;  
    }  
    if (onClick) onClick(e);  
  };  

  return (  
    <button   
      className={className}  
      onClick={handleClick}  
      onMouseDown={handleTouchStart}  
      onTouchStart={handleTouchStart}  
      onMouseUp={handleTouchEnd}  
      onTouchEnd={handleTouchEnd}  
    >  
      {children}  
    </button>  
  );  
}
