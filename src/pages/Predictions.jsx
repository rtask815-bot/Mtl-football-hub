import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function MTLFootballHub() {
  // Modal & Drawer State
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);
  const [isDialingModalOpen, setIsDialingModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleSearchQuery, setGoogleSearchQuery] = useState('');
  
  // Data & Filtering State
  const [activeMatchTab, setActiveMatchTab] = useState('future');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loaderStatus, setLoaderStatus] = useState({ active: true, text: 'establishing quantum sync...', progress: 25 });
  
  const canvasRef = useRef(null);

  // Initialize Three.js Canvas
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

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoaderStatus({ active: true, text: 'fetching neural feeds...', progress: 60 });
      
      const { data: matchesData } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
      const { data: fixturesData } = await supabase.from('fixtures').select('*').order('match_date', { ascending: true });
      const { data: trendingData } = await supabase.from('trending').select('*').order('rank', { ascending: true });

      if (matchesData) setMatches(matchesData);
      if (fixturesData) setFixtures(fixturesData);
      if (trendingData) setTrending(trendingData);

      setLoaderStatus({ active: true, text: 'sync complete', progress: 100 });
      setTimeout(() => setLoaderStatus({ active: false, text: '', progress: 0 }), 400);
    };

    fetchData();
  }, []);

  const openGoogleSearch = (queryText) => {
    setGoogleSearchQuery(queryText);
    setIsGoogleModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-mtlGreen selection:text-black bg-[#0b0f19] text-[#f9fafb]">
      {/* 4D Background Canvas */}
      <canvas ref={canvasRef} id="bg-4d-canvas" />

      <div className="app-content-wrapper flex flex-col min-h-screen justify-between">
        
        {/* Floating Loader */}
        <div className={`floating-loader-overlay ${loaderStatus.active ? 'active' : ''}`}>
          <div className="loader-card space-y-4">
            <div className="flex items-center justify-center gap-3">
              <span className="w-3 h-3 rounded-full bg-futuristicNeon animate-ping"></span>
              <h4 className="text-xs font-bold uppercase tracking-widest text-futuristicNeon font-cyber">QUANTUM SYNC</h4>
            </div>
            <p className="text-sm font-medium text-gray-200">{loaderStatus.text}</p>
            <div className="water-progress-container">
              <div className="water-progress-bar" style={{ width: `${loaderStatus.progress}%` }}></div>
            </div>
          </div>
        </div>

        {/* Side Navigation Menu */}
        {isSideNavOpen && (
          <div onClick={() => setIsSideNavOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity" />
        )}
        <aside className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-mtlSurface border-l border-mtlCardBorder z-50 transform ${isSideNavOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out flex flex-col justify-between p-6 shadow-2xl`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-mtlCardBorder pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 avatar-logo text-sm font-bold">MT</div>
                <div>
                  <h3 className="font-extrabold text-sm text-white font-cyber">User</h3>
                  <span className="text-[10px] text-gray-400">user@gmail.com</span>
                </div>
              </div>
              <button onClick={() => setIsSideNavOpen(false)} className="w-8 h-8 rounded-full bg-mtlDark text-gray-400 hover:text-white flex items-center justify-center font-bold">✕</button>
            </div>
            <nav className="space-y-3">
              <button onClick={() => { setIsDialingModalOpen(true); setIsSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-mtlCard border border-mtlCardBorder hover:border-mtlGreen hover:text-mtlGreen transition text-xs font-semibold text-gray-200">
                <span className="text-base">📞</span> Contact Centre
              </button>
              <button onClick={() => { setIsSettingsModalOpen(true); setIsSideNavOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-mtlCard border border-mtlCardBorder hover:border-mtlGreen hover:text-mtlGreen transition text-xs font-semibold text-gray-200">
                <span className="text-base">⚙️</span> Preferences & Settings
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <div id="app-root">
          <header className="border-b border-mtlCardBorder bg-mtlSurface/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 avatar-logo text-lg cursor-pointer" onClick={() => setIsDialingModalOpen(true)}>MT</div>
                <div>
                  <h1 className="font-bold tracking-wider text-lg leading-tight font-cyber text-white">PREDICTIONS <span className="text-mtlGreen">HUB</span></h1>
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Feel Welcomed.</span>
                </div>
              </div>

              <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
                <a href="#dashboard" className="flex items-center gap-2 text-mtlGreen border-b-2 border-mtlGreen pb-1 font-bold">DASHBOARD</a>
                <a href="#live-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">LIVE</a>
                <a href="#fixtures-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">FIXTURES</a>
                <a href="#db-matches-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">PREDICTIONS</a>
                <a href="#trending-section" className="flex items-center gap-2 text-gray-400 hover:text-white transition">COMMUNITY</a>
              </nav>

              <div className="flex items-center gap-3">
                <button onClick={() => setIsSideNavOpen(true)} className="w-10 h-10 rounded-full bg-mtlCard border border-mtlCardBorder text-gray-200 flex items-center justify-center hover:text-mtlGreen transition">
                  ☰
                </button>
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

          {/* Predictions Section */}
          <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">
            <section id="db-matches-section" className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-6 shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 section-header">
                <div>
                  <h3 className="text-lg font-extrabold uppercase tracking-wide text-white font-cyber cursor-pointer hover:text-mtlGreen transition" onClick={() => openGoogleSearch('Live database matches and football predictions')}>
                    ⚽ MATCHES & PREDICTIONS
                  </h3>
                </div>
              </div>

              {/* Controls Row */}
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

              {/* Matches Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {matches.length === 0 ? (
                  <div className="col-span-3 text-center py-8 text-xs text-gray-500">Loading matches...</div>
                ) : (
                  matches.map((match) => (
                    <div key={match.id} className="pro-card p-5 flex flex-col justify-between space-y-4 cursor-pointer">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{match.type || 'Free'} Match</span>
                          <span className="text-xs text-amber-400 font-bold font-cyber">Odds: {match.decimal_odds || 'N/A'}</span>
                        </div>
                        <h4 className="font-extrabold text-base text-white tracking-wide font-cyber hover:text-mtlGreen" onClick={() => openGoogleSearch(`Prediction summary for ${match.teams}`)}>
                          {match.teams}
                        </h4>
                        <p className="text-xs text-mtlGreen font-semibold">Prediction: {match.prediction || 'N/A'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </main>

          {/* Footer */}
          <footer className="border-t border-mtlCardBorder bg-mtlSurface mt-16 py-8 px-6 text-center text-xs text-gray-400">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <p>© 2026 MTL Football Intelligence Hub. All rights reserved.</p>
              <div className="flex items-center gap-6">
                <a href="#dashboard" className="text-mtlGreen font-bold hover:underline">Dashboard</a>
                <button onClick={() => setIsDialingModalOpen(true)} className="hover:text-mtlGreen">Developed BY M. Lennox</button>
              </div>
            </div>
          </footer>
        </div>

        {/* Google Iframe Search Modal */}
        {isGoogleModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col p-3 sm:p-6">
            <div className="bg-mtlSurface border border-mtlCardBorder rounded-2xl p-3 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-mtlGreen text-black font-extrabold flex items-center justify-center font-cyber">AI</div>
                <div>
                  <h4 className="text-xs font-bold font-cyber text-mtlGreen">GOOGLE QUICK SEARCH</h4>
                  <p className="text-[10px] text-gray-400 font-mono">Automated AI Mode: "{googleSearchQuery}"</p>
                </div>
              </div>
              <button onClick={() => setIsGoogleModalOpen(false)} className="w-8 h-8 rounded-full bg-red-900/40 text-red-300 border border-red-500/30 flex items-center justify-center font-bold text-xs hover:bg-red-800">✕</button>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-mtlCardBorder bg-white">
              <iframe className="w-full h-full border-0" title="Google AI Quick Search" src={`https://www.google.com/search?q=${encodeURIComponent(googleSearchQuery)}&udm=14&udm=28&igu=1`} />
            </div>
          </div>
        )}

        {/* Dialing Hotline Modal */}
        {isDialingModalOpen && (
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
                <button onClick={() => setIsDialingModalOpen(false)} className="text-gray-400 hover:text-white font-bold text-lg">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a href="https://wa.me/254716883895" target="_blank" rel="noreferrer" className="bg-mtlDark p-4 rounded-xl border border-mtlCardBorder hover:border-mtlGreen transition">
                  <span className="text-[10px] font-bold uppercase text-mtlGreen tracking-wider">WHATSAPP</span>
                  <h4 className="font-bold text-sm text-white mt-1">Chat on WhatsApp</h4>
                </a>
                <a href="tel:+254716883895" className="bg-mtlDark p-4 rounded-xl border border-mtlCardBorder hover:border-amber-400 transition">
                  <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">PHONE CALL</span>
                  <h4 className="font-bold text-sm text-white mt-1">Direct Phone Call</h4>
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
