import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createClient } from '@supabase/supabase-js';

// --- STYLES & THEME INJECTION ---
const EMBEDDED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800;900&family=Rajdhani:wght@500;600;700&display=swap');
  
  :root {
    --mtl-green: #10b981;
    --mtl-green-hover: #059669;
    --mtl-dark: #090d16;
    --mtl-surface: #0f172a;
    --mtl-card: #1e293b;
    --mtl-card-border: rgba(255, 255, 255, 0.1);
  }

  body { margin: 0; background-color: var(--mtl-dark); color: #fff; font-family: 'Rajdhani', sans-serif; overflow-x: hidden; }
  .font-cyber { font-family: 'Orbitron', sans-serif; }
  .high-contrast-mode { filter: contrast(130%) brightness(110%); }

  .pro-card {
    background: linear-gradient(135deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.8) 100%);
    border: 1px solid var(--mtl-card-border);
    border-radius: 1rem;
    backdrop-filter: blur(12px);
    transition: all 0.3s ease;
  }
  .pro-card:hover { border-color: var(--mtl-green); transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.15); }

  .avatar-logo {
    background: linear-gradient(135deg, #10b981 0%, #047857 100%);
    color: #000;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
  }

  .btn-see-more {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: var(--mtl-green);
    padding: 0.5rem 1rem;
    border-radius: 0.75rem;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-see-more:hover { background: var(--mtl-green); color: #000; }

  .water-progress-container { width: 100%; background: rgba(255,255,255,0.05); height: 6px; border-radius: 999px; overflow: hidden; }
  .water-progress-bar { height: 100%; background: linear-gradient(90deg, #10b981, #00f0ff); transition: width 0.4s ease; }

  .chat-bubble-me { background: #10b981; color: #000; font-weight: 600; border-radius: 1rem 1rem 0 1rem; }
  .chat-bubble-other { background: #1e293b; color: #fff; border: 1px solid var(--mtl-card-border); border-radius: 1rem 1rem 1rem 0; }

  .floating-loader-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
    z-0: 9999; display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
  }
  .floating-loader-overlay.active { opacity: 1; pointer-events: auto; }
  .loader-card { background: #0f172a; border: 1px solid var(--mtl-green); padding: 2rem; border-radius: 1.5rem; text-align: center; max-width: 320px; width: 90%; }
`;

// --- SUPABASE CLIENT INITIALIZATION ---
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- UTILITY & SECURITY FUNCTIONS ---
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
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
  const firstTeam = String(teams).split(/\s+vs.?\s+/i)[0].trim();
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
  return `${Math.min(elapsed, 92)}'`;
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
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState({ role: 'user', username: 'not Signed in', email: '', odds_format: 'decimal', language: 'en', high_contrast: false });
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
  const [adminFormData, setAdminFormData] = useState({});

  const canvasRef = useRef(null);

  const showToast = (message, isError = true) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, isError }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const showDatabaseError = (table, error, operation = 'READ') => {
    let diagnosis = "Unspecified database failure.", action = "Verify database connection and try again.";
    const code = error?.code || '', message = error?.message || String(error);
    if (code === '42501' || message.includes('permission') || message.includes('policy')) {
      diagnosis = "Row-Level Security (RLS) Permission Denied."; action = "Check Supabase table policies.";
    } else { diagnosis = `Database error code: ${code || 'UNKNOWN'}`; action = "Check table structure or review Supabase operational logs."; }
    setDbError({ table, operation, diagnosis, action, details: JSON.stringify(error, null, 2) });
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    const torusKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(10, 3, 128, 32), new THREE.MeshStandardMaterial({ color: 0x10b981, wireframe: true, roughness: 0.2, metalness: 0.8 }));
    scene.add(torusKnot);

    const posArray = new Float32Array(700 * 3);
    for (let i = 0; i < 700 * 3; i++) posArray[i] = (Math.random() - 0.5) * 60;
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMesh = new THREE.Points(particleGeo, new THREE.PointsMaterial({ size: 0.12, color: 0x00f0ff, transparent: true, opacity: 0.7 }));
    scene.add(particleMesh);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const pointLight = new THREE.PointLight(0x00f0ff, 2, 50);
    pointLight.position.set(15, 15, 15);
    scene.add(pointLight);

    let mouseX = 0, mouseY = 0;
    const handleMouseMove = (e) => { mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5; mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5; };
    const handleResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener('mousemove', handleMouseMove); window.addEventListener('resize', handleResize);

    let animId;
    function animate() { animId = requestAnimationFrame(animate); torusKnot.rotation.x += 0.003 + mouseY * 0.1; torusKnot.rotation.y += 0.005 + mouseX * 0.1; particleMesh.rotation.y -= 0.001; renderer.render(scene, camera); }
    animate();

    return () => { cancelAnimationFrame(animId); window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('resize', handleResize); renderer.dispose(); };
  }, []);

  useEffect(() => {
    async function initApp() {
      setLoader({ active: true, text: 'establishing quantum sync...', progress: 15 });
      const authenticated = await checkUserSession();
      if (!authenticated) return;
      setLoader({ active: true, text: 'fetching neural feeds...', progress: 40 });
      await loadDatabaseReactions();
      await Promise.all([loadMatchesFromDB(), loadFixturesFromDB(), loadTrendingFromDB(), loadDatabaseComments(), loadDatabaseChats()]);
      setLoader({ active: true, text: 'sync complete', progress: 100 });
      setTimeout(() => setLoader((prev) => ({ ...prev, active: false })), 300);
    }
    initApp();

    const cChats = db.channel('public:chats').on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, loadDatabaseChats).subscribe();
    const cComments = db.channel('public:comments').on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, loadDatabaseComments).subscribe();
    const cReactions = db.channel('public:reactions').on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, async () => { await loadDatabaseReactions(); await loadMatchesFromDB(); }).subscribe();

    return () => { db.removeChannel(cChats); db.removeChannel(cComments); db.removeChannel(cReactions); };
  }, []);

  useEffect(() => {
    const updateLive = () => { const now = new Date(); setLiveMatchesData(matchesData.filter(m => isMatchCurrentlyLive(m, now)).map(buildLiveMatch)); };
    updateLive(); const interval = setInterval(updateLive, 1000);
    return () => clearInterval(interval);
  }, [matchesData]);

  async function checkUserSession() {
    try {
      const { data: { user }, error: userError } = await db.auth.getUser();
      if (userError || !user) { window.location.href = "auth.html"; return false; }
      setCurrentUser(user);
      const { data: profile, error: profileError } = await db.from('profiles').select('username, name, email, role, is_admin, admin').eq('id', user.id).single();
      if (profileError) showDatabaseError('profiles', profileError, 'READ_PROFILE');
      const username = profile?.name || profile?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const email = profile?.email || user.email || 'user@mtl.com';
      const isUserAdmin = profile?.role === 'admin' || profile?.is_admin === true || profile?.admin === true;
      setUserProfile((prev) => ({ ...prev, username, email, role: isUserAdmin ? 'admin' : 'user' }));
      return true;
    } catch (err) { showDatabaseError('auth.session', err, 'SESSION_EXCEPTION'); window.location.href = "auth.html"; return false; }
  }

  async function signOutUser() { await db.auth.signOut(); window.location.href = "auth.html"; }

  async function loadDatabaseReactions() {
    try {
      const { data, error } = await db.from('reactions').select('*');
      if (error) return showDatabaseError('reactions', error, 'READ_REACTIONS');
      if (Array.isArray(data)) {
        const map = {}; data.forEach(r => { const mId = String(r.match_id); if (!map[mId]) map[mId] = []; map[mId].push({ user_id: r.user_id, username: r.username || 'User', reaction: r.reaction_type }); });
        setMatchReactionsMap(map);
      }
    } catch (e) { showDatabaseError('reactions', e, 'READ_REACTIONS'); }
  }

  async function loadDatabaseComments() {
    try {
      const { data, error } = await db.from('comments').select('*').order('created_at', { ascending: true });
      if (error) return showDatabaseError('comments', error, 'READ_COMMENTS');
      if (Array.isArray(data)) {
        const store = {}; data.forEach(c => { const mId = String(c.match_id || c.matchId); if (!store[mId]) store[mId] = []; store[mId].push({ id: c.id, user_id: c.user_id, user: c.username || c.user || 'User', comment: c.comment || c.text || '', time: c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now' }); });
        setMatchCommentsStore(store);
      }
    } catch (err) { showDatabaseError('comments', err, 'READ_COMMENTS'); }
  }

  async function loadDatabaseChats() {
    try {
      const { data, error } = await db.from('chats').select('*').order('created_at', { ascending: true });
      if (error) return showDatabaseError('chats', error, 'READ_CHATS');
      if (Array.isArray(data)) {
        const globals = [], matches = {};
        data.forEach(msg => {
          const parsed = { id: msg.id, user_id: msg.user_id, user: msg.username || msg.user || 'User', text: msg.message || msg.text || '', time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now' };
          if (!msg.match_id) globals.push(parsed);
          else { const mId = String(msg.match_id); if (!matches[mId]) matches[mId] = []; matches[mId].push(parsed); }
        });
        setGlobalChatMessages(globals); setMatchChatStore(matches);
      }
    } catch (err) { showDatabaseError('chats', err, 'READ_CHATS'); }
  }

  async function loadMatchesFromDB() {
    try {
      const { data, error } = await db.from('matches').select('*').order('created_at', { ascending: false });
      if (error) return showDatabaseError('matches', error, 'READ_MATCHES');
      setMatchesData(Array.isArray(data) ? data.map(normalizeMatch) : []);
    } catch (error) { showDatabaseError('matches', error, 'READ_MATCHES'); }
  }

  function normalizeMatch(match) {
    const parsedOdds = parseFloat(match.decimal_odds), parsedHome = parseFloat(match.prob_home), parsedDraw = parseFloat(match.prob_draw), parsedAway = parseFloat(match.prob_away), parsedStars = parseInt(match.confidence_stars, 10);
    const mId = String(match.id), userReactions = matchReactionsMap[mId] || [];
    const computedReactions = { fire: userReactions.filter(r => r.reaction === 'fire').length, heart: userReactions.filter(r => r.reaction === 'heart').length, dislike: userReactions.filter(r => r.reaction === 'dislike').length };
    const fallbackReactions = match.reactions && typeof match.reactions === 'object' ? match.reactions : { fire: 0, heart: 0, dislike: 0 };
    return {
      ...match,
      decimal_odds: Number.isFinite(parsedOdds) ? parsedOdds : null,
      prob_home: Number.isFinite(parsedHome) ? Math.max(0, Math.min(100, parsedHome)) : 0,
      prob_draw: Number.isFinite(parsedDraw) ? Math.max(0, Math.min(100, parsedDraw)) : 0,
      prob_away: Number.isFinite(parsedAway) ? Math.max(0, Math.min(100, parsedAway)) : 0,
      confidence_stars: Number.isFinite(parsedStars) ? Math.max(0, Math.min(5, parsedStars)) : 0,
      reactions: { fire: Math.max(computedReactions.fire, Number(fallbackReactions.fire) || 0), heart: Math.max(computedReactions.heart, Number(fallbackReactions.heart) || 0), dislike: Math.max(computedReactions.dislike, Number(fallbackReactions.dislike) || 0) }
    };
  }

  async function loadFixturesFromDB() {
    try {
      const { data, error } = await db.from('fixtures').select('*').order('match_date', { ascending: true });
      if (error) return showDatabaseError('fixtures', error, 'READ_FIXTURES');
      setFixturesData(Array.isArray(data) ? data.map(normalizeFixture) : []);
    } catch (error) { showDatabaseError('fixtures', error, 'READ_FIXTURES'); }
  }

  function normalizeFixture(fix) {
    return { ...fix, match_date: fix.match_date ?? fix.date ?? '', match_time: fix.match_time ?? fix.time ?? '', badge: fix.badge || getTeamBadge(fix.teams) };
  }

  async function loadTrendingFromDB() {
    try {
      const { data, error } = await db.from('trending').select('*').order('rank', { ascending: true });
      if (error) return showDatabaseError('trending', error, 'READ_TRENDING');
      setTrendingData(Array.isArray(data) ? data.map(normalizeTrending) : []);
    } catch (error) { showDatabaseError('trending', error, 'READ_TRENDING'); }
  }

  function normalizeTrending(item) { return { ...item, rank: item.rank ?? '', title: item.title ?? '', comments_count: item.comments_count ?? item.comments ?? 0 }; }

  function buildLiveMatch(match) {
    const minuteStr = calculateLiveMinute(match), minuteVal = parseInt(minuteStr, 10) || 0;
    return { ...match, id: match.id, league: match.league || match.competition || 'FOOTBALL', teams: match.teams || 'Unknown Teams', score: match.score || match.final_score || '0 - 0', minute: minuteStr, progress: Math.min(Math.round((minuteVal / 90) * 100), 100), details: match.live_details || match.details || match.analysis_text || 'Live match intelligence available.' };
  }

  function openGoogleSearchIframe(queryText) { setGoogleIframeModal({ open: true, query: queryText }); }

  function formatOdds(decimalVal) {
    const val = parseFloat(decimalVal);
    if (!Number.isFinite(val) || val <= 1) return 'N/A';
    if (userProfile.odds_format === 'fractional') return `${Math.round((val - 1) * 100)}/100`;
    if (userProfile.odds_format === 'american') return val >= 2.0 ? `+${Math.round((val - 1) * 100)}` : `-${Math.round(100 / (val - 1))}`;
    return val.toFixed(2);
  }

  async function reactToMatch(matchId, type) {
    const mId = String(matchId), userId = currentUser?.id || 'guest', currentReactions = matchReactionsMap[mId] || [], userPrev = currentReactions.find(r => r.user_id === userId);
    let updatedReactions = [...currentReactions];
    if (userPrev) {
      if (userPrev.reaction === type) {
        updatedReactions = updatedReactions.filter(r => r.user_id !== userId);
        try { await db.from('reactions').delete().eq('match_id', matchId).eq('user_id', userId); } catch (e) {}
      } else {
        userPrev.reaction = type;
        try { await db.from('reactions').upsert([{ match_id: matchId, user_id: userId, username: userProfile.username, reaction_type: type }], { onConflict: 'match_id,user_id' }); } catch (e) {}
      }
    } else {
      updatedReactions.push({ user_id: userId, username: userProfile.username, reaction: type });
      try { await db.from('reactions').insert([{ match_id: matchId, user_id: userId, username: userProfile.username, reaction_type: type }]); } catch (e) {}
    }
    setMatchReactionsMap(prev => ({ ...prev, [mId]: updatedReactions }));
  }

  async function submitFullscreenComment() {
    if (!fullscreenCommentInput.trim() || !fullscreenCommentsModal.matchId) return showToast("Please enter a non-empty comment.");
    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({ match_id: fullscreenCommentsModal.matchId, username: userProfile.username, comment: fullscreenCommentInput.trim(), user_id: currentUser?.id });
      setLoader({ active: true, text: "Posting comment to database...", progress: 50 });
      const { error } = await db.from('comments').insert([sanitizedPayload]);
      if (error) { showDatabaseError('comments', error, 'INSERT_COMMENT'); showToast("Failed to save comment."); }
      else { await loadDatabaseComments(); showToast("Comment published successfully!", false); }
    } catch (err) { showToast(err.message || "Error occurred while posting comment."); }
    finally { setFullscreenCommentInput(''); setLoader(prev => ({ ...prev, active: false })); }
  }

  async function editComment(commentId) {
    const comments = matchCommentsStore[fullscreenCommentsModal.matchId] || [], comment = comments.find(c => String(c.id) === String(commentId));
    if (!comment) return;
    const newText = prompt("Edit your comment:", comment.comment);
    if (newText === null || newText.trim() === '') return showToast("Comment cannot be empty.");
    try {
      const { error } = await db.from('comments').update({ comment: sanitizeInput(newText.trim()) }).eq('id', commentId);
      if (error) { showDatabaseError('comments', error, 'UPDATE_COMMENT'); showToast("Failed to edit comment."); }
      else { await loadDatabaseComments(); showToast("Comment updated!", false); }
    } catch (e) { showDatabaseError('comments', e, 'UPDATE_COMMENT'); }
  }

  async function deleteComment(commentId) {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const { error } = await db.from('comments').delete().eq('id', commentId);
      if (error) { showDatabaseError('comments', error, 'DELETE_COMMENT'); showToast("Failed to delete comment."); }
      else { await loadDatabaseComments(); showToast("Comment deleted.", false); }
    } catch (e) { showDatabaseError('comments', e, 'DELETE_COMMENT'); }
  }

  async function sendGlobalChatMessage() {
    if (!globalChatInput.trim()) return showToast("Chat message cannot be empty.");
    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({ username: userProfile.username, message: globalChatInput.trim(), user_id: currentUser?.id });
      const { error } = await db.from('chats').insert([sanitizedPayload]);
      if (error) showDatabaseError('chats', error, 'INSERT_GLOBAL_CHAT');
      else await loadDatabaseChats();
    } catch (err) { showToast(err.message || "Security exception blocked message."); }
    setGlobalChatInput('');
  }

  async function sendMatchChatMessage() {
    if (!matchChatInput.trim() || !matchChatModal.matchId) return showToast("Match message cannot be empty.");
    try {
      const sanitizedPayload = verifyHackLocksAndSanitize({ match_id: matchChatModal.matchId, username: userProfile.username, message: matchChatInput.trim(), user_id: currentUser?.id });
      const { error } = await db.from('chats').insert([sanitizedPayload]);
      if (error) showDatabaseError('chats', error, 'INSERT_MATCH_CHAT');
      else await loadDatabaseChats();
    } catch (err) { showToast(err.message || "Security violation blocked message."); }
    setMatchChatInput('');
  }

  async function editChatMessage(chatId, isMatchChat) {
    let msgStore = isMatchChat ? matchChatStore[matchChatModal.matchId] : globalChatMessages;
    const msg = msgStore?.find(m => String(m.id) === String(chatId));
    if (!msg) return;
    const newText = prompt("Edit message:", msg.text);
    if (newText === null || newText.trim() === '') return showToast("Message cannot be empty.");
    try {
      const { error } = await db.from('chats').update({ message: sanitizeInput(newText.trim()) }).eq('id', chatId);
      if (error) showDatabaseError('chats', error, 'UPDATE_CHAT');
      else { await loadDatabaseChats(); showToast("Message edited.", false); }
    } catch (e) { showDatabaseError('chats', e, 'UPDATE_CHAT'); }
  }

  async function deleteChatMessage(chatId) {
    if (!window.confirm("Delete this message?")) return;
    try {
      const { error } = await db.from('chats').delete().eq('id', chatId);
      if (error) showDatabaseError('chats', error, 'DELETE_CHAT');
      else { await loadDatabaseChats(); showToast("Message deleted.", false); }
    } catch (e) { showDatabaseError('chats', e, 'DELETE_CHAT'); }
  }

  async function deleteMatchFromDB(id) {
    setLoader({ active: true, text: "Deleting Match Record...", progress: 50 });
    try {
      const { error } = await db.from('matches').delete().eq('id', id);
      if (error) return showDatabaseError('matches', error, 'DELETE_MATCH');
      await loadMatchesFromDB(); showToast("Match removed.", false);
    } catch (err) { showDatabaseError('matches', err, 'DELETE_MATCH'); }
    finally { setLoader(prev => ({ ...prev, active: false })); }
  }

  async function deleteFixtureFromDB(id) {
    setLoader({ active: true, text: "Deleting Fixture Record...", progress: 50 });
    try {
      const { error } = await db.from('fixtures').delete().eq('id', id);
      if (error) return showDatabaseError('fixtures', error, 'DELETE_FIXTURE');
      await loadFixturesFromDB(); showToast("Fixture removed.", false);
    } catch (err) { showDatabaseError('fixtures', err, 'DELETE_FIXTURE'); }
    finally { setLoader(prev => ({ ...prev, active: false })); }
  }

  async function deleteTrendingFromDB(id) {
    setLoader({ active: true, text: "Deleting Headline...", progress: 50 });
    try {
      const { error } = await db.from('trending').delete().eq('id', id);
      if (error) return showDatabaseError('trending', error, 'READ_TRENDING');
      await loadTrendingFromDB(); showToast("Headline removed.", false);
    } catch (err) { showDatabaseError('trending', err, 'READ_TRENDING'); }
    finally { setLoader(prev => ({ ...prev, active: false })); }
  }

  function openAdminModal(section, item = null) {
    setAdminModal({ open: true, section, item });
    if (section === 'matches') {
      setAdminFormData({ teams: item?.teams || '', league: item?.league || '', match_date: item?.match_date || '', match_time: item?.match_time || '', prediction: item?.prediction || '', decimal_odds: item?.decimal_odds || '', prob_home: item?.prob_home || '', prob_draw: item?.prob_draw || '', prob_away: item?.prob_away || '', type: item?.type || 'free', confidence_stars: item?.confidence_stars || 3, analysis_text: item?.analysis_text || '' });
    } else if (section === 'fixtures') {
      setAdminFormData({ teams: item?.teams || '', league: item?.league || '', match_date: item?.match_date || '', match_time: item?.match_time || '' });
    } else if (section === 'trending') {
      setAdminFormData({ rank: item?.rank || '', title: item?.title || '', comments_count: item?.comments_count || 0 });
    }
  }

  async function saveAdminEntry() {
    setLoader({ active: true, text: "Saving Admin Data...", progress: 50 });
    try {
      const payload = verifyHackLocksAndSanitize({ ...adminFormData });
      let err = null;
      if (adminModal.section === 'matches') {
        const { error } = adminModal.item?.id ? await db.from('matches').update(payload).eq('id', adminModal.item.id) : await db.from('matches').insert([payload]); err = error; await loadMatchesFromDB();
      } else if (adminModal.section === 'fixtures') {
        const { error } = adminModal.item?.id ? await db.from('fixtures').update(payload).eq('id', adminModal.item.id) : await db.from('fixtures').insert([payload]); err = error; await loadFixturesFromDB();
      } else if (adminModal.section === 'trending') {
        const { error } = adminModal.item?.id ? await db.from('trending').update(payload).eq('id', adminModal.item.id) : await db.from('trending').insert([payload]); err = error; await loadTrendingFromDB();
      }
      if (err) { showDatabaseError(adminModal.section, err, 'WRITE'); showToast("Save Failed."); }
      else { showToast("Saved successfully!", false); setAdminModal({ open: false, section: null, item: null }); }
    } catch (e) { showToast(e.message || "Security exception"); }
    finally { setLoader(prev => ({ ...prev, active: false })); }
  }

  const getFilteredMatches = () => {
    const now = new Date();
    let filtered = matchesData.filter(m => {
      const isFT = String(m.status || '').toUpperCase() === 'FT';
      const kickoff = parseMatchDateTime(m.match_date, m.match_time);
      const isPastMatch = isFT || (kickoff ? kickoff.getTime() < now.getTime() - (120 * 60 * 1000) : false);
      return activeMatchTab === 'past' ? isPastMatch : !isPastMatch;
    });
    if (matchSearchQuery.trim()) {
      const query = matchSearchQuery.trim().toLowerCase();
      filtered = filtered.filter(m => String(m.teams || '').toLowerCase().includes(query) || String(m.match_date || '').toLowerCase().includes(query) || String(m.match_time || '').toLowerCase().includes(query) || String(m.league || '').toLowerCase().includes(query));
    }
    return filtered;
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} className={userProfile.high_contrast ? 'high-contrast-mode' : ''}>
      <style>{EMBEDDED_STYLES}</style>
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0, opacity: 0.45 }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between' }}>
        {/* Toast Container */}
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
          {toasts.map(t => (
            <div key={t.id} style={{ padding: '12px 16px', borderRadius: '12px', border: t.isError ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(16,185,129,0.5)', background: t.isError ? 'rgba(69,10,10,0.9)' : 'rgba(6,78,59,0.9)', color: t.isError ? '#fca5a5' : '#6ee7b7', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'auto' }}>
              <span>{t.isError ? '⚠️ ' : '✔️ '}{t.message}</span>
            </div>
          ))}
        </div>

        {/* Floating Loader */}
        <div className={`floating-loader-overlay ${loader.active ? 'active' : ''}`}>
          <div className="loader-card">
            <h4 className="font-cyber" style={{ fontSize: '12px', color: '#10b981', margin: '0 0 8px 0' }}>QUANTUM SYNC</h4>
            <p style={{ fontSize: '14px', margin: '0 0 16px 0', color: '#e2e8f0' }}>{loader.text}</p>
            <div className="water-progress-container"><div className="water-progress-bar" style={{ width: `${loader.progress}%` }}></div></div>
          </div>
        </div>

        {/* Reaction Users Modal */}
        {reactionUsersModal.open && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justify: 'center', padding: '16px' }}>
            <div style={{ background: '#0f172a', border: '1px solid #10b981', borderRadius: '16px', width: '100%', maxWidth: '380px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '12px' }}>
                <h4 className="font-cyber" style={{ margin: 0, color: '#10b981', fontSize: '14px' }}>REACTANTS ({reactionUsersModal.type.toUpperCase()})</h4>
                <button onClick={() => setReactionUsersModal({ open: false, type: '', matchId: null })} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(matchReactionsMap[String(reactionUsersModal.matchId)] || []).filter(r => r.reaction === reactionUsersModal.type).map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: '#090d16', borderRadius: '8px' }}>
                    <div className="avatar-logo" style={{ width: '24px', height: '24px', fontSize: '10px' }}>{getFirstNameInitials(u.username)}</div>
                    <span style={{ fontSize: '12px', color: '#e2e8f0' }}>{u.username}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Sidebar */}
        <aside style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '320px', maxWidth: '85vw', background: '#0f172a', borderLeft: '1px solid rgba(255,255,255,0.1)', zIndex: 50, transform: sideNavOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="avatar-logo" style={{ width: '40px', height: '40px' }}>{getFirstNameInitials(userProfile.username)}</div>
                <div><h3 className="font-cyber" style={{ margin: 0, fontSize: '14px' }}>{userProfile.username}</h3><span style={{ fontSize: '10px', color: '#94a3b8' }}>{userProfile.email}</span></div>
              </div>
              <button onClick={() => setSideNavOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => { setDialingModalOpen(true); setSideNavOpen(false); }} className="btn-see-more" style={{ width: '100%', textAlign: 'left' }}>📞 Contact Centre</button>
              <button onClick={() => { setSettingsModalOpen(true); setSideNavOpen(false); }} className="btn-see-more" style={{ width: '100%', textAlign: 'left' }}>⚙️ Preferences & Settings</button>
            </nav>
          </div>
          <button onClick={signOutUser} style={{ width: '100%', background: 'rgba(153,27,27,0.4)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>Sign Out</button>
        </aside>

        {/* Header */}
        <header style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', sticky: 'top', zIndex: 40, padding: '16px 24px' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar-logo" style={{ width: '40px', height: '40px', cursor: 'pointer' }} onClick={() => setDialingModalOpen(true)}>{getFirstNameInitials(userProfile.username)}</div>
              <div>
                <h1 className="font-cyber" style={{ margin: 0, fontSize: '18px', color: '#fff' }}>PREDICTIONS <span style={{ color: '#10b981' }}>HUB</span></h1>
                <span style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '1px' }}>Feel Welcomed.</span>
              </div>
            </div>
            <button onClick={() => setSideNavOpen(true)} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer' }}>☰</button>
          </div>
        </header>

        {/* Banner */}
        <section style={{ padding: '48px 24px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(180deg, #0f172a 0%, #090d16 100%)' }}>
          <h2 className="font-cyber" style={{ fontSize: '36px', margin: '12px 0', color: '#fff' }}>FOOTBALL <span style={{ color: '#10b981' }}>INTELLIGENCE</span></h2>
          <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>Real-time stats, AI match predictions, dynamic hotline dialing and secure encrypted feeds.</p>
        </section>

        {/* Database Error Alert */}
        {dbError && (
          <div style={{ maxWidth: '1280px', margin: '24px auto 0', padding: '0 24px' }}>
            <div style={{ background: 'rgba(69,10,10,0.5)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '16px', padding: '20px' }}>
              <h3 style={{ margin: 0, color: '#f87171', fontSize: '14px' }}>DATABASE ERROR: {dbError.operation}</h3>
              <p style={{ color: '#e2e8f0', fontSize: '12px', margin: '8px 0' }}>{dbError.diagnosis}</p>
              <button onClick={() => setDbError(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Main Section */}
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '48px', width: '100%', boxSizing: 'border-box' }}>
          
          {/* Live Matches */}
          <section id="live-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className="font-cyber" style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></span> LIVE MATCHES
              </h3>
              <button onClick={() => setStatsListModal({ open: true, title: 'Live Games Directory', dataset: liveMatchesData })} className="btn-see-more">SEE MORE MATCHES ➔</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {liveMatchesData.length === 0 ? (
                <div className="pro-card" style={{ padding: '32px', textAlign: 'center', gridColumn: '1 / -1' }}><p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>No live matches currently in play.</p></div>
              ) : (
                liveMatchesData.slice(0, 3).map((match) => (
                  <div key={match.id} className="pro-card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setFullscreenMatchModal({ open: true, match })}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                      <span>{match.league}</span><span style={{ color: '#ef4444', fontWeight: 'bold' }}>● LIVE</span>
                    </div>
                    <div style={{ textAlign: 'center', margin: '16px 0' }}>
                      <div className="font-cyber" style={{ fontSize: '20px', color: '#10b981', fontWeight: 'bold' }}>{match.teams}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{match.minute}</div>
                    </div>
                    <div className="water-progress-container"><div className="water-progress-bar" style={{ width: `${match.progress}%` }}></div></div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Predictions & Matches */}
          <section id="db-matches-section" className="pro-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="font-cyber" style={{ margin: 0, fontSize: '18px' }}>⚽ MATCHES & PREDICTIONS</h3>
              <button onClick={() => setStatsListModal({ open: true, title: 'All Database Predictions', dataset: matchesData })} className="btn-see-more">SEE MORE ➔</button>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <button onClick={() => setActiveMatchTab('future')} className="btn-see-more" style={{ background: activeMatchTab === 'future' ? '#10b981' : '', color: activeMatchTab === 'future' ? '#000' : '' }}>UPCOMING</button>
              <button onClick={() => setActiveMatchTab('past')} className="btn-see-more" style={{ background: activeMatchTab === 'past' ? '#10b981' : '', color: activeMatchTab === 'past' ? '#000' : '' }}>PAST</button>
              <input type="text" value={matchSearchQuery} onChange={(e) => setMatchSearchQuery(e.target.value)} placeholder="Search matches..." style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: '12px', flex: 1, minWidth: '200px' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {getFilteredMatches().slice(0, 3).map((match) => (
                <div key={match.id} className="pro-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4 className="font-cyber" style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{match.teams}</h4>
                    <p style={{ margin: 0, color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>Prediction: {match.prediction}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => reactToMatch(match.id, 'fire')} style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>🔥 {match.reactions?.fire || 0}</button>
                    <button onClick={() => reactToMatch(match.id, 'heart')} style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}>❤️ {match.reactions?.heart || 0}</button>
                  </div>
                  <button onClick={() => setFullscreenCommentsModal({ open: true, matchId: match.id, teams: match.teams })} className="btn-see-more">💬 View Comments</button>
                </div>
              ))}
            </div>
          </section>

        </main>

        {/* Telegram Global Floating Chat Button */}
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 40 }}>
          <button onClick={() => setGlobalChatOpen(!globalChatOpen)} style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#10b981', border: 'none', fontSize: '24px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>💬</button>
        </div>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: '#0f172a', padding: '32px 24px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
          <p>© 2026 MTL Football Intelligence Hub. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
