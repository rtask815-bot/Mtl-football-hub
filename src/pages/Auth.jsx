import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import * as THREE from "three";

// Supabase Initialization
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Allowed Model Priority List
const ALLOWED_MODELS = [
    "gpt-3.5-turbo-16k", "gpt-audio-mini-2025-10-06", "gpt-5-nano-2025-08-07", "gpt-5-nano",
    "gpt-realtime-mini", "gpt-realtime-2.1-mini", "gpt-realtime-mini-2025-12-15", "o3-2025-04-16",
    "gpt-audio-mini", "gpt-5-mini", "gpt-image-1.5", "gpt-audio-mini-2025-12-15", "gpt-5",
    "tts-1-hd-1106", "tts-1-hd", "gpt-4o-mini", "babbage-002", "sora-2", "sora-2-pro",
    "gpt-5-pro-2025-10-06", "o3", "gpt-4o-mini-tts", "gpt-5-pro", "gpt-4o-mini-tts-2025-12-15",
    "gpt-4o-mini-transcribe-2025-12-15", "gpt-4o-mini-transcribe-2025-03-20", "chatgpt-image-latest",
    "gpt-realtime-translate", "davinci-002", "gpt-5.2", "tts-1-1106", "tts-1",
    "gpt-5-search-api", "gpt-realtime-2", "gpt-5-search-api-2025-10-14", "chat-latest",
    "gpt-3.5-turbo", "gpt-3.5-turbo-0125", "gpt-3.5-turbo-1106", "gpt-4.1", "gpt-4.1-2025-04-14",
    "gpt-audio", "gpt-4.1-mini", "gpt-realtime-whisper", "gpt-4.1-mini-2025-04-14", "gpt-realtime",
    "gpt-realtime-2025-08-28", "gpt-4.1-nano-2025-04-14", "gpt-audio-2025-08-28", "gpt-4o",
    "gpt-4o-2024-05-13", "gpt-4o-2024-08-06", "gpt-4o-mini-transcribe", "gpt-4o-2024-11-20",
    "gpt-4o-mini-2024-07-18", "gpt-5-2025-08-07", "gpt-5-chat-latest", "gpt-5-codex",
    "gpt-image-1-mini", "gpt-5-mini-2025-08-07", "gpt-5.1-chat-latest", "gpt-5.1-codex",
    "gpt-4o-mini-search-preview", "gpt-5.1-codex-max", "gpt-4o-mini-search-preview-2025-03-11",
    "gpt-5.1-codex-mini", "o4-mini-2025-04-16", "gpt-5.2-2025-12-11", "o4-mini",
    "gpt-5.2-chat-latest", "gpt-5.2-codex", "gpt-image-2", "gpt-image-2-2026-04-21",
    "gpt-5.3-chat-latest", "omni-moderation-2024-09-26", "omni-moderation-latest",
    "gpt-3.5-turbo-instruct-0914", "gpt-5.2-pro", "gpt-5.4-mini-2026-03-17",
    "gpt-5.4-nano-2026-03-17", "gpt-5.4-2026-03-05", "gpt-5.4-pro-2026-03-05",
    "gpt-4o-transcribe-diarize", "o3-mini", "gpt-5.2-pro-2025-12-11", "gpt-3.5-turbo-instruct",
    "o3-mini-2025-01-31", "gpt-4.1-nano", "gpt-5.5-pro-2026-04-23", "text-embedding-3-small",
    "gpt-5.5-2026-04-23", "gpt-image-1", "text-embedding-3-large", "o1", "gpt-5.1",
    "o1-2024-12-17", "gpt-5.1-2025-11-13", "gpt-transcribe", "gpt-4o-search-preview-2025-03-11",
    "gpt-audio-1.5", "gpt-live-transcribe", "text-embedding-ada-002", "gpt-realtime-1.5",
    "gpt-4o-search-preview", "gpt-4o-mini-tts-2025-03-20", "gpt-4o-transcribe",
    "gpt-5.4-nano", "gpt-6-astra", "gpt-5.4-pro", "whisper-1", "gpt-5.6-terra",
    "gpt-5.5-pro", "gpt-5.6-luna", "gpt-5.6-sol", "gpt-5.5", "gpt-5.3-codex",
    "gpt-5.4-mini", "gpt-5.4", "gpt-realtime-2.1"
];

// Web Audio Synthesizer Engine
const playSound = (type = "ring") => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        if (type === "ring") {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = "sine";
            osc2.type = "triangle";
            osc1.frequency.setValueAtTime(880, ctx.currentTime);
            osc2.frequency.setValueAtTime(1760, ctx.currentTime);

            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(ctx.currentTime + 0.45);
            osc2.stop(ctx.currentTime + 0.45);
        } else if (type === "success") {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            osc.frequency.setValueAtTime(783.99, now + 0.2);
            osc.frequency.setValueAtTime(1046.50, now + 0.3);

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(now + 0.6);
        } else if (type === "error") {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.setValueAtTime(120, now + 0.15);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(now + 0.4);
        } else if (type === "click") {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(1200, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(now + 0.08);
        }
    } catch (e) {
        // Audio policy protection
    }
};

export default function Auth() {
    const navigate = useNavigate();

    // Session Verification First Gate State
    const [checkingSession, setCheckingSession] = useState(true);

    // State Management - Default view logic
    const [authMode, setAuthMode] = useState(() => {
        const hasExistingAccount = localStorage.getItem("user") || localStorage.getItem("mtl_auth_token");
        return hasExistingAccount ? "login" : "register";
    });
    
    const [aiTextIndex, setAiTextIndex] = useState(0);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    
    // Password visibility states
    const [showPassword, setShowPassword] = useState(false);
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [passwordScore, setPasswordScore] = useState(0);

    // Existing Session Prompt States
    const [activeSessionUser, setActiveSessionUser] = useState(null);
    const [showSessionModal, setShowSessionModal] = useState(false);

    // Loaders, Modals, and Security
    const [isLoading, setIsLoading] = useState(false);
    const [loaderText, setLoaderText] = useState("connecting...");
    const [loadProgress, setLoadProgress] = useState(0);
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [phoneInput, setPhoneInput] = useState("");
    const [nameInput, setNameInput] = useState("");
    const [otpInput, setOtpInput] = useState("");
    const [resendLock, setResendLock] = useState(false);
    const authStateRef = useRef({ phone: "", name: "" });

    // Enhanced Features
    const [rememberDevice, setRememberDevice] = useState(true);

    // Dynamic Model Tier Selection State
    const [selectedModel, setSelectedModel] = useState("gpt-3.5-turbo");

    // Chat Console States
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatQuery, setChatQuery] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [isChatProcessing, setIsChatProcessing] = useState(false);
    const chatFeedRef = useRef(null);

    // Voice Input State Management
    const [activeVoiceTarget, setActiveVoiceTarget] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const recognitionRef = useRef(null);

    // Dynamic Mobile Viewport Resizing for Virtual Keyboard
    const [keyboardPadding, setKeyboardPadding] = useState(0);

    // Refs for background animations and layout smooth transitions
    const canvasRef = useRef(null);
    const glowRef = useRef(null);
    const formContainerRef = useRef(null);
    const threeContainerRef = useRef(null);
    const [formHeight, setFormHeight] = useState("auto");

    // Smooth Anti-Contradiction Ref
    const targetProgressRef = useRef(0);

    useEffect(() => {
        targetProgressRef.current = loadProgress;
    }, [loadProgress]);

    // Session Check Gate Logic
    useEffect(() => {
        let isMounted = true;
        const verifySessionFirst = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!isMounted) return;

                if (session?.user) {
                    setActiveSessionUser(session.user);
                    setShowSessionModal(true);
                    playSound("ring");
                }
            } catch (err) {
                // Session verify fallback
            } finally {
                if (isMounted) setCheckingSession(false);
            }
        };
        verifySessionFirst();
        return () => { isMounted = false; };
    }, []);

    // Smooth Form Switch Container Height Measurement
    useEffect(() => {
        if (formContainerRef.current) {
            const currentChild = formContainerRef.current.querySelector(".form-fade-pane.active");
            if (currentChild) {
                setFormHeight(`${currentChild.scrollHeight}px`);
            }
        }
    }, [authMode, showPassword, showRegPassword, regPassword, checkingSession]);

    // Dynamic Visual Viewport Resize Handler
    useEffect(() => {
        const handleVisualViewportResize = () => {
            if (window.visualViewport) {
                const currentHeight = window.visualViewport.height;
                const innerHeight = window.innerHeight;
                const offset = innerHeight - currentHeight;
                setKeyboardPadding(offset > 0 ? offset : 0);
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", handleVisualViewportResize);
            window.visualViewport.addEventListener("scroll", handleVisualViewportResize);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener("resize", handleVisualViewportResize);
                window.visualViewport.removeEventListener("scroll", handleVisualViewportResize);
            }
        };
    }, []);

    // Resolve Active Model Tier
    useEffect(() => {
        const resolveActiveModel = async () => {
            try {
                const res = await fetch("/api/models", { method: "GET" });
                if (!res.ok) return;
                const data = await res.json();
                const availableModels = new Set(data?.data?.map(m => m.id) || []);
                
                const activeChoice = ALLOWED_MODELS.find(m => availableModels.has(m));
                if (activeChoice) {
                    setSelectedModel(activeChoice);
                }
            } catch (err) {
                setSelectedModel("gpt-3.5-turbo");
            }
        };
        resolveActiveModel();
    }, []);

    // Dynamic Header Text Rotation
    useEffect(() => {
        const aiTexts = ["Welcome to the community", "let's earn together"];
        const interval = setInterval(() => {
            setAiTextIndex((prev) => (prev + 1) % aiTexts.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Cursor Glow Tracking
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (glowRef.current) {
                glowRef.current.style.left = `${e.clientX}px`;
                glowRef.current.style.top = `${e.clientY}px`;
            }
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    // Canvas Background FX Engine - Space VFX
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        let animationFrameId;
        let W = window.innerWidth;
        let H = window.innerHeight;
        const FOV = 350;
        const shipSpeed = 14;

        const handleResize = () => {
            W = window.innerWidth;
            H = window.innerHeight;
            canvas.width = W;
            canvas.height = H;
        };
        handleResize();
        window.addEventListener('resize', handleResize);

        let targetOffsetX = 0;
        let targetOffsetY = 0;
        let currentOffsetX = 0;
        let currentOffsetY = 0;

        const handleMouseMove = (e) => {
            const mouseX = (e.clientX - W / 2) / (W / 2);
            const mouseY = (e.clientY - H / 2) / (H / 2);
            targetOffsetX = -mouseX * 120;
            targetOffsetY = -mouseY * 80;
        };
        window.addEventListener('mousemove', handleMouseMove);

        const NUM_STARS = Math.min(900, Math.floor((W * H) / 1400));
        const stars3D = Array.from({ length: NUM_STARS }, () => ({
            x: (Math.random() - 0.5) * 3500,
            y: (Math.random() - 0.5) * 3500,
            z: Math.random() * 2000 + 10,
            size: Math.random() * 1.8 + 0.5,
            color: Math.random() > 0.75 ? '#00f5d4' : Math.random() > 0.85 ? '#a855f7' : '#ffffff'
        }));

        const spacePlanets = [
            { x: -700, y: -250, z: 1800, r: 180, color1: '#00f5d4', color2: '#0b1d3a', atmosphere: '#00e2ff' },
            { x: 900, y: 400, z: 2800, r: 260, color1: '#a855f7', color2: '#2a085c', atmosphere: '#d8b4fe' }
        ];

        const renderFrame = () => {
            currentOffsetX += (targetOffsetX - currentOffsetX) * 0.05;
            currentOffsetY += (targetOffsetY - currentOffsetY) * 0.05;

            const cx = W / 2 + currentOffsetX;
            const cy = H / 2 + currentOffsetY;

            const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H));
            bgGrad.addColorStop(0, '#050b1e');
            bgGrad.addColorStop(0.5, '#020511');
            bgGrad.addColorStop(1, '#000103');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            for (let p of spacePlanets) {
                p.z -= shipSpeed * 0.3;
                if (p.z <= -200) p.z = 3500;
                let k = FOV / p.z;
                let px = p.x * k + cx;
                let py = p.y * k + cy;
                let size = p.r * k;
                if (px + size * 2 > 0 && px - size * 2 < W && py + size * 2 > 0 && py - size * 2 < H) {
                    let atmoGrad = ctx.createRadialGradient(px, py, size * 0.85, px, py, size * 1.3);
                    atmoGrad.addColorStop(0, p.atmosphere);
                    atmoGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = atmoGrad;
                    ctx.beginPath();
                    ctx.arc(px, py, size * 1.3, 0, Math.PI * 2);
                    ctx.fill();

                    let pGrad = ctx.createRadialGradient(px - size * 0.3, py - size * 0.3, size * 0.1, px, py, size);
                    pGrad.addColorStop(0, p.color1);
                    pGrad.addColorStop(0.7, p.color2);
                    pGrad.addColorStop(1, '#000000');
                    ctx.fillStyle = pGrad;
                    ctx.beginPath();
                    ctx.arc(px, py, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            for (let s of stars3D) {
                s.z -= shipSpeed;
                if (s.z <= 1) {
                    s.z = 2000;
                    s.x = (Math.random() - 0.5) * 3500;
                    s.y = (Math.random() - 0.5) * 3500;
                }
                let k = FOV / s.z;
                let px = s.x * k + cx;
                let py = s.y * k + cy;
                if (px >= 0 && px <= W && py >= 0 && py <= H) {
                    let size = (1 - s.z / 2000) * s.size * 2;
                    let alpha = Math.min(1, (1 - s.z / 2000) * 1.2);
                    let prevK = FOV / (s.z + shipSpeed * 1.8);
                    let prevX = s.x * prevK + cx;
                    let prevY = s.y * prevK + cy;

                    ctx.strokeStyle = s.color;
                    ctx.globalAlpha = alpha;
                    ctx.lineWidth = Math.max(0.6, size * 0.9);
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(prevX, prevY);
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                }
            }

            animationFrameId = requestAnimationFrame(renderFrame);
        };

        renderFrame();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    // HIGH-PERFORMANCE 4D THREE.JS ROBOT CHASE ANIMATION WITH LOCALSTORAGE LOGIC CACHING
    useEffect(() => {
        if (!isLoading || !threeContainerRef.current) return;

        const container = threeContainerRef.current;
        const width = container.clientWidth || 380;
        const height = container.clientHeight || 120;

        // Save and recover state logic from LocalStorage to avoid initial stuttering
        const cachedAnimState = localStorage.getItem("mtl_3d_anim_cache_v2");
        let localTimeOffset = 0;
        if (cachedAnimState) {
            try {
                const parsed = JSON.parse(cachedAnimState);
                localTimeOffset = parsed.lastPhase || 0;
            } catch(e){}
        }

        // Three.js Scene Initialization
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.set(0, 3, 10);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const cyanLight = new THREE.PointLight(0x00f5d4, 2, 20);
        cyanLight.position.set(-5, 5, 5);
        scene.add(cyanLight);

        const purpleLight = new THREE.PointLight(0xa855f7, 2, 20);
        purpleLight.position.set(5, 5, -5);
        scene.add(purpleLight);

        // 1. Grid Track
        const gridHelper = new THREE.GridHelper(40, 20, 0x00f5d4, 0x38bdf8);
        gridHelper.position.y = -1;
        scene.add(gridHelper);

        // 2. Robot Assembly (Joints & Limbs)
        const robotGroup = new THREE.Group();

        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.5);
        const cyanMat = new THREE.MeshStandardMaterial({ color: 0x00f5d4, metalness: 0.8, roughness: 0.2 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
        const purpleMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, metalness: 0.7, roughness: 0.3 });
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });

        const torso = new THREE.Mesh(torsoGeo, darkMat);
        torso.position.y = 0.5;
        robotGroup.add(torso);

        // Arc Core
        const coreGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(0, 0.6, 0.26);
        robotGroup.add(core);

        // Head
        const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const head = new THREE.Mesh(headGeo, cyanMat);
        head.position.y = 1.3;
        robotGroup.add(head);

        // Visor Eye
        const visorGeo = new THREE.BoxGeometry(0.4, 0.1, 0.2);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.3, 0.25);
        robotGroup.add(visor);

        // Limbs & Joints
        const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8);
        
        // Left Leg
        const leftLegPivot = new THREE.Group();
        leftLegPivot.position.set(-0.25, 0, 0);
        const leftLeg = new THREE.Mesh(legGeo, purpleMat);
        leftLeg.position.y = -0.4;
        leftLegPivot.add(leftLeg);
        robotGroup.add(leftLegPivot);

        // Right Leg
        const rightLegPivot = new THREE.Group();
        rightLegPivot.position.set(0.25, 0, 0);
        const rightLeg = new THREE.Mesh(legGeo, cyanMat);
        rightLeg.position.y = -0.4;
        rightLegPivot.add(rightLeg);
        robotGroup.add(rightLegPivot);

        // Arms
        const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.7);
        
        const leftArmPivot = new THREE.Group();
        leftArmPivot.position.set(-0.5, 0.8, 0);
        const leftArm = new THREE.Mesh(armGeo, cyanMat);
        leftArm.position.y = -0.35;
        leftArmPivot.add(leftArm);
        robotGroup.add(leftArmPivot);

        const rightArmPivot = new THREE.Group();
        rightArmPivot.position.set(0.5, 0.8, 0);
        const rightArm = new THREE.Mesh(armGeo, purpleMat);
        rightArm.position.y = -0.35;
        rightArmPivot.add(rightArm);
        robotGroup.add(rightArmPivot);

        scene.add(robotGroup);

        // 3. Trolley carrying Money & Football Prediction Success Target
        const trolleyGroup = new THREE.Group();

        // Basket
        const basketGeo = new THREE.BoxGeometry(1.2, 0.6, 0.8);
        const wireMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, wireframe: true });
        const basket = new THREE.Mesh(basketGeo, wireMat);
        basket.position.y = 0.3;
        trolleyGroup.add(basket);

        // Trolley Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        [-0.4, 0.4].forEach(x => {
            [-0.3, 0.3].forEach(z => {
                const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(x, 0, z);
                trolleyGroup.add(wheel);
            });
        });

        // Money Stacks inside Trolley
        const cashGeo = new THREE.BoxGeometry(0.4, 0.25, 0.2);
        const cashMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 });
        const cashStack = new THREE.Mesh(cashGeo, cashMat);
        cashStack.position.set(-0.25, 0.2, 0);
        trolleyGroup.add(cashStack);

        // Football Predictions Ball inside Trolley
        const ballGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
        const football = new THREE.Mesh(ballGeo, ballMat);
        football.position.set(0.25, 0.25, 0);
        trolleyGroup.add(football);

        // Floating Target Halo
        const haloGeo = new THREE.RingGeometry(0.7, 0.8, 32);
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 0.05;
        trolleyGroup.add(halo);

        scene.add(trolleyGroup);

        // Smooth Physics Matrix
        let animFrameId;
        let phase = localTimeOffset;
        let smoothCurrentProgress = targetProgressRef.current;

        const animate3D = () => {
            // Anti-contradiction linear progress interpolation (lerp)
            smoothCurrentProgress += (targetProgressRef.current - smoothCurrentProgress) * 0.08;

            const remainingPercent = Math.max(0, 100 - smoothCurrentProgress);
            const speedFactor = 0.05 + (remainingPercent / 100) * 0.15;
            phase += speedFactor;

            // X-Axis Positional Bounds
            const minX = -4.5;
            const maxX = 3.5;
            const currentX = minX + (maxX - minX) * (smoothCurrentProgress / 100);

            // Robot Position & Bounce
            robotGroup.position.x = currentX;
            robotGroup.position.y = -0.2 + Math.abs(Math.sin(phase * 2)) * 0.15;

            // Smooth Leg & Arm IK Swings
            leftLegPivot.rotation.x = Math.sin(phase) * 0.85;
            rightLegPivot.rotation.x = -Math.sin(phase) * 0.85;
            leftArmPivot.rotation.x = -Math.sin(phase) * 0.75;
            rightArmPivot.rotation.x = Math.sin(phase) * 0.75;

            // Trolley Motion ahead of Robot
            trolleyGroup.position.x = currentX + 1.8;
            trolleyGroup.position.y = -0.6 + Math.sin(phase * 3) * 0.03;

            // Football Spin & Money Hover Effect inside Trolley
            football.rotation.y += 0.05;
            football.rotation.x += 0.03;
            cashStack.position.y = 0.2 + Math.sin(phase * 2) * 0.04;

            // Dynamic Camera Chasing Interpolation
            camera.position.x += (currentX * 0.5 - camera.position.x) * 0.05;
            camera.lookAt(currentX, 0, 0);

            // Render Frame
            renderer.render(scene, camera);

            // Save logic state to local storage to eliminate reload stutter
            localStorage.setItem("mtl_3d_anim_cache_v2", JSON.stringify({ lastPhase: phase % (Math.PI * 100) }));

            animFrameId = requestAnimationFrame(animate3D);
        };

        animate3D();

        const handleResize = () => {
            if (!container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animFrameId);
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, [isLoading]);

    // Password Strength Evaluator
    useEffect(() => {
        let score = 0;
        if (regPassword.length >= 6) score++;
        if (/[A-Z]/.test(regPassword)) score++;
        if (/[0-9]/.test(regPassword)) score++;
        if (/[^A-Za-z0-9]/.test(regPassword)) score++;
        setPasswordScore(score);
    }, [regPassword]);

    // Speech Recognition Core Setup
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onerror = () => {
                setIsListening(false);
                setActiveVoiceTarget(null);
                setInterimTranscript("");
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, []);

    const toggleVoiceInput = (targetName, onAutoSend = null) => {
        playSound("click");
        if (!recognitionRef.current) {
            showToast("Speech recognition is not supported in this browser.", "error");
            return;
        }

        if (isListening && activeVoiceTarget === targetName) {
            recognitionRef.current.stop();
            setIsListening(false);
            setActiveVoiceTarget(null);
            setInterimTranscript("");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
        }

        setActiveVoiceTarget(targetName);
        setInterimTranscript("");
        setIsListening(true);

        recognitionRef.current.onresult = (event) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            setInterimTranscript(transcript);
            
            if (targetName === "email") setEmail(transcript);
            else if (targetName === "password") setPassword(transcript);
            else if (targetName === "username") setUsername(transcript);
            else if (targetName === "regEmail") setRegEmail(transcript);
            else if (targetName === "regPassword") setRegPassword(transcript);
            else if (targetName === "phoneInput") setPhoneInput(transcript);
            else if (targetName === "nameInput") setNameInput(transcript);
            else if (targetName === "otpInput") setOtpInput(transcript);
            else if (targetName === "chatQuery") {
                setChatQuery(transcript);
                if (event.results[0].isFinal && onAutoSend) {
                    setTimeout(() => {
                        onAutoSend(transcript);
                    }, 400);
                }
            }
        };

        try {
            recognitionRef.current.start();
        } catch (e) {
            setIsListening(false);
            setActiveVoiceTarget(null);
        }
    };

    const triggerSecureTransition = (targetPath, outputText) => {
        setLoaderText(outputText);
        setLoadProgress(0);
        setIsLoading(true);
        playSound("ring");

        const duration = 2400;
        const intervalTime = 30;
        const step = 100 / (duration / intervalTime);

        const progressInterval = setInterval(() => {
            setLoadProgress((prev) => {
                if (prev + step >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                return prev + step;
            });
        }, intervalTime);

        setTimeout(() => {
            playSound("success");
            navigate(targetPath);
        }, duration);
    };

    const showToast = (message, type = "info") => {
        if (type === "success") playSound("success");
        else if (type === "error") playSound("error");
        else playSound("ring");

        document.querySelectorAll(".mtl-toast").forEach((t) => t.remove());
        const el = document.createElement("div");
        el.className = "mtl-toast";
        const theme = type === "success" 
            ? { border: "#00f5d4", glow: "rgba(0,245,212,0.3)" } 
            : type === "error" 
            ? { border: "#ef4444", glow: "rgba(239,68,68,0.3)" } 
            : { border: "#38bdf8", glow: "rgba(56,189,248,0.3)" };

        Object.assign(el.style, {
            position: "fixed", top: "24px", right: "24px", width: "340px", maxWidth: "90vw",
            padding: "18px", borderRadius: "16px", background: "rgba(10, 15, 30, 0.95)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            boxShadow: `0 20px 40px rgba(0,0,0,.6), 0 0 20px ${theme.glow}`,
            zIndex: "999999", display: "flex", alignItems: "center", gap: "12px",
            border: `1px solid ${theme.border}`, animation: "mtlSlideIn .4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            fontFamily: "Inter, sans-serif", color: "#f3f4f6"
        });

        el.innerHTML = `
            <div style="flex:1;">
                <div style="font-size:11px; font-weight:800; letter-spacing:2px; margin-bottom:4px; color:${theme.border}; font-family: 'Orbitron';">${type.toUpperCase()} RESPONSE</div>
                <div style="font-size:13px; line-height:1.5;">${message}</div>
            </div>
        `;
        document.body.appendChild(el);
        setTimeout(() => {
            el.style.animation = "mtlSlideOut .3s ease-in forwards";
            setTimeout(() => el.remove(), 300);
        }, 6000);
    };

    const isValidE164 = (phone) => /^\+[1-9]\d{6,14}$/.test(phone);
    const normalizeOtpError = (error) => {
        const msg = (error?.message || "").toLowerCase();
        if (msg.includes("21608") || msg.includes("unverified")) return "This number has not been verified. Use a verified number or standard authorization.";
        if (msg.includes("invalid")) return "Incorrect token code. Try again.";
        if (msg.includes("rate") || msg.includes("limit")) return "Too many attempts. Wait a moment.";
        return "Verification service temporarily unavailable.";
    };

    const handleStartOtpFlow = async () => {
        playSound("click");
        if (!phoneInput || !nameInput) return showToast("Please fill all fields", "warning");
        if (!isValidE164(phoneInput)) return showToast("Invalid phone format", "error");

        authStateRef.current = { phone: phoneInput, name: nameInput };
        showToast("Sending OTP token...", "info");

        const { error } = await supabase.auth.signInWithOtp({
            phone: phoneInput,
            options: { data: { full_name: nameInput } }
        });
        if (error) return showToast(normalizeOtpError(error), "error");
        showToast("OTP delivered successfully", "success");
    };

    const handleVerifyOtpFlow = async () => {
        playSound("click");
        if (!otpInput) return showToast("Enter verification code", "warning");
        showToast("Verifying node identity...", "info");

        const { data, error } = await supabase.auth.verifyOtp({
            phone: authStateRef.current.phone,
            token: otpInput,
            type: "sms"
        });
        if (error) return showToast(normalizeOtpError(error), "error");

        const verifiedName = data?.session?.user?.user_metadata?.full_name || authStateRef.current.name || "User";
        if (data?.session?.access_token) {
            localStorage.setItem("mtl_auth_token", data.session.access_token);
        }
        showToast(`Welcome ${verifiedName}`, "success");
        setTimeout(() => {
            setIsOtpModalOpen(false);
            triggerSecureTransition("/dashboard", "Redirecting to Dashboard...");
        }, 600);
    };

    const handleResendOtp = async () => {
        playSound("click");
        if (resendLock) return showToast("Please wait...", "info");
        setResendLock(true);
        showToast("Resending request...", "info");

        const { error } = await supabase.auth.signInWithOtp({
            phone: authStateRef.current.phone,
            options: { data: { full_name: authStateRef.current.name } }
        });
        if (error) {
            setResendLock(false);
            return showToast(normalizeOtpError(error), "error");
        }
        showToast("OTP resent successfully", "success");
        setTimeout(() => setResendLock(false), 15000);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        playSound("click");
        if (!email || !password) return showToast("REQUIRED IDENTITIES MISSING", "warning");
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            localStorage.setItem("user", JSON.stringify(data.user));
            if (data.session?.access_token) {
                localStorage.setItem("mtl_auth_token", data.session.access_token);
            }
            triggerSecureTransition("/dashboard", "processing connection...");
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        playSound("click");
        if (!username || !regEmail || !regPassword) return showToast("KINDLY CAPTURE ALL REQUIRED IDENTITY VECTORS", "warning");
        try {
            const { data, error } = await supabase.auth.signUp({
                email: regEmail,
                password: regPassword,
                options: { data: { username } }
            });
            if (error) throw error;
            
            if (data?.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
            }
            if (data?.session?.access_token) {
                localStorage.setItem("mtl_auth_token", data.session.access_token);
            }

            showToast("Account Created Successfully! Redirecting to dashboard...", "success");
            triggerSecureTransition("/dashboard", "initializing new user node...");
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    const handleGoogleLogin = async () => {
        playSound("click");
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin }
        });
        if (error) showToast(error.message, "error");
    };

    const getActiveSessionIdentity = () => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                return {
                    name: parsed.user_metadata?.username || parsed.user_metadata?.full_name || parsed.email?.split("@")[0] || "Operator",
                    email: parsed.email || "No email registered"
                };
            } catch (e) {
                return { name: "Operator", email: "guest@mtl.tech" };
            }
        }
        if (activeSessionUser) {
            return {
                name: activeSessionUser.user_metadata?.username || activeSessionUser.user_metadata?.full_name || activeSessionUser.email?.split("@")[0] || "Operator",
                email: activeSessionUser.email || "No email registered"
            };
        }
        return { name: "user", email: "developer01@gmail.com" };
    };

    const openChatConsole = () => {
        playSound("click");
        if (!isChatOpen) {
            const identity = getActiveSessionIdentity();
            const currentTimestampString = new Date().toLocaleString();
            setChatMessages([
                {
                    role: "system",
                    text: `You are Mr Mourice, MTL Football Predictions Authorization dashboard technician. Connected User Identity Name: "${identity.name}", Email: "${identity.email}". Use internal dashboard knowledge context layers. Be concise, structured, and helpful. Analysis Temporal Benchmark Timestamp: "${currentTimestampString}". Active System Model Tier: ${selectedModel}.`
                },
                { role: "assistant", text: `Hello ${identity.name} (${identity.email}), how are you doing today?` }
            ]);
            setIsChatOpen(true);
        } else {
            setIsChatOpen(false);
        }
    };

    const executeNeuralGrokQuery = async (customPrompt = null) => {
        playSound("click");
        const prompt = customPrompt !== null ? customPrompt : chatQuery.trim();
        if (!prompt || isChatProcessing) return;

        setIsChatProcessing(true);
        const newMessages = [...chatMessages, { role: "user", text: prompt }];
        setChatMessages(newMessages);
        setChatQuery("");

        try {
            const apiMessages = newMessages.map(m => ({
                role: m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "system",
                content: m.text
            }));

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: selectedModel || "gpt-3.5-turbo",
                    messages: apiMessages,
                    temperature: 0.5,
                    max_tokens: 600
                })
            });

            const raw = await response.text();
            if (!response.ok) {
                let parseFailText = raw;
                try {
                    const parsedErr = JSON.parse(raw);
                    parseFailText = parsedErr.error?.message || raw;
                } catch(e){}
                setChatMessages(prev => [...prev, { role: "assistant", text: `System Notice (${response.status}): ${parseFailText}` }]);
                return;
            }

            const data = JSON.parse(raw);
            const output = data?.choices?.[0]?.message?.content || "No response received.";
            setChatMessages(prev => [...prev, { role: "assistant", text: output }]);
            playSound("ring");
        } catch (err) {
            setChatMessages(prev => [...prev, { role: "assistant", text: "Network error: Unable to reach AI service directly due to browser CORS configuration. Ensure backend proxy is active." }]);
        } finally {
            setIsChatProcessing(false);
            if (chatFeedRef.current) {
                chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
            }
        }
    };

    const aiTexts = ["Welcome to the community", "let's earn together"];

    // Floating Listening Container
    const renderListeningOverlay = (targetName) => {
        if (isListening && activeVoiceTarget === targetName) {
            return (
                <div className="mtl-toast listening-toast-container">
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '2px', marginBottom: '4px', color: 'var(--neon-cyan)', fontFamily: 'Orbitron' }}>
                                VOICE STREAMING ACTIVE
                            </div>
                            <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#f3f4f6' }}>
                                {interimTranscript ? `"${interimTranscript}"` : "Listening... speak now"}
                            </div>
                        </div>
                        <div className="decorated-listening-waves">
                            <div className="decorated-wave-bar" style={{ height: '6px' }}></div>
                            <div className="decorated-wave-bar" style={{ height: '14px' }}></div>
                            <div className="decorated-wave-bar" style={{ height: '8px' }}></div>
                            <div className="decorated-wave-bar" style={{ height: '16px' }}></div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="auth-page-wrapper">
            <style>{`
                :root {
                    --bg-dark: #020617;
                    --card-bg: rgba(15, 23, 42, 0.65);
                    --neon-cyan: #00f5d4;
                    --neon-blue: #38bdf8;
                    --neon-purple: #a855f7;
                    --text-main: #f8fafc;
                    --text-muted: #94a3b8;
                    --border-glow: rgba(56, 189, 248, 0.25);
                    --glass-border: rgba(255, 255, 255, 0.08);
                }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                
                .auth-page-wrapper {
                    background-color: var(--bg-dark);
                    color: var(--text-main);
                    font-family: 'Inter', sans-serif;
                    min-height: 100dvh;
                    width: 100%;
                    overflow-y: auto;
                    overflow-x: hidden;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    padding: 24px 0;
                    animation: pageBackgroundPulse 15s ease infinite alternate;
                }
                @keyframes pageBackgroundPulse {
                    0% { filter: brightness(1); }
                    100% { filter: brightness(1.12); }
                }
                #particles { position: fixed; inset: 0; z-index: 1; pointer-events: auto; }
                .cursor-glow {
                    position: fixed; width: 550px; height: 550px;
                    background: radial-gradient(circle, rgba(0, 245, 212, 0.08), rgba(168, 85, 247, 0.08), transparent 70%);
                    border-radius: 50%; pointer-events: none; z-index: 2;
                    transform: translate(-50%, -50%); transition: width 0.3s, height 0.3s;
                    animation: cursorGlowPulse 4s ease-in-out infinite alternate;
                }
                @keyframes cursorGlowPulse {
                    0% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.9); }
                    100% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                }

                .auth-container {
                    position: relative; z-index: 10; width: 100%; max-width: 460px; padding: 24px;
                    display: flex; flex-direction: column; justify-content: center;
                    perspective: 1000px;
                    animation: containerFloatIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes containerFloatIn {
                    from { opacity: 0; transform: translateY(50px) scale(0.95) rotateX(10deg); }
                    to { opacity: 1; transform: translateY(0) scale(1) rotateX(0deg); }
                }
                .auth-card {
                    background: var(--card-bg); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
                    border: 1px solid var(--glass-border);
                    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.85), 0 0 50px rgba(0, 245, 212, 0.05);
                    border-radius: 28px; padding: 42px 34px; width: 100%; position: relative; overflow: visible;
                    transition: box-shadow 0.4s ease, border-color 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    transform-style: preserve-3d;
                }
                .auth-card:hover {
                    border-color: rgba(0, 245, 212, 0.3);
                    box-shadow: 0 35px 70px -10px rgba(0, 0, 0, 0.9), 0 0 70px rgba(0, 245, 212, 0.12);
                }
                .auth-card::before {
                    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 3px;
                    background: linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-blue), var(--neon-purple), transparent);
                    animation: cardGlowSlide 3s linear infinite;
                    border-top-left-radius: 28px; border-top-right-radius: 28px;
                }
                @keyframes cardGlowSlide {
                    0% { opacity: 0.6; background-position: -200% 0; }
                    100% { opacity: 1; background-position: 200% 0; }
                }
                .auth-header { text-align: center; margin-bottom: 32px; }
                .auth-header h1 {
                    font-family: 'Orbitron', sans-serif; font-size: 26px; font-weight: 900; letter-spacing: 2.5px;
                    background: linear-gradient(135deg, #ffffff 30%, var(--neon-cyan) 70%, var(--neon-blue));
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;
                    animation: headerTitlePulse 3s ease-in-out infinite alternate;
                }
                @keyframes headerTitlePulse {
                    0% { text-shadow: 0 0 12px rgba(0, 245, 212, 0.2); filter: drop-shadow(0 0 2px var(--neon-cyan)); }
                    100% { text-shadow: 0 0 30px rgba(0, 245, 212, 0.7); filter: drop-shadow(0 0 8px var(--neon-cyan)); }
                }
                #aiText {
                    font-size: 11px; font-family: 'Orbitron', sans-serif; letter-spacing: 2px;
                    text-transform: uppercase; color: var(--neon-cyan); height: 16px;
                    text-shadow: 0 0 12px rgba(0, 245, 212, 0.5);
                    animation: hologramFlicker 2.5s ease-in-out infinite alternate;
                }
                @keyframes hologramFlicker {
                    0%, 100% { opacity: 0.95; transform: scale(1); }
                    50% { opacity: 0.75; transform: scale(0.98); }
                    80% { opacity: 1; transform: scale(1.02); }
                }
                .nav-switch {
                    display: flex; background: rgba(3, 7, 18, 0.6); padding: 5px;
                    border-radius: 14px; border: 1px solid var(--glass-border); margin-bottom: 28px;
                    position: relative; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
                }
                .nav-switch button {
                    flex: 1; background: transparent; border: none; color: var(--text-muted);
                    padding: 12px; font-size: 12.5px; font-weight: 800; letter-spacing: 1px;
                    border-radius: 10px; cursor: pointer; transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    font-family: 'Orbitron', sans-serif;
                }
                .nav-switch button.active {
                    color: #ffffff; background: linear-gradient(135deg, rgba(0, 245, 212, 0.2), rgba(56, 189, 248, 0.2));
                    border: 1px solid rgba(0, 245, 212, 0.4); text-shadow: 0 0 10px rgba(0, 245, 212, 0.8);
                    box-shadow: 0 0 20px rgba(0, 245, 212, 0.2);
                    animation: tabActiveGlow 2s ease infinite alternate;
                }
                @keyframes tabActiveGlow {
                    0% { box-shadow: 0 0 8px rgba(0, 245, 212, 0.2); }
                    100% { box-shadow: 0 0 22px rgba(0, 245, 212, 0.5); }
                }

                .form-switch-wrapper {
                    position: relative;
                    width: 100%;
                    overflow: hidden;
                    transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .form-fade-pane {
                    position: absolute;
                    top: 0; left: 0; width: 100%;
                    opacity: 0;
                    pointer-events: none;
                    transform: translateX(30px) scale(0.96) rotateY(-5deg);
                    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .form-fade-pane.active {
                    position: relative;
                    opacity: 1;
                    pointer-events: auto;
                    transform: translateX(0) scale(1) rotateY(0deg);
                }

                .form-group { 
                    margin-bottom: 20px; 
                    position: relative;
                    scroll-margin-top: 15px;
                    scroll-margin-bottom: 15px;
                    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .form-group:focus-within {
                    transform: translateY(-2px);
                    z-index: 15;
                }
                .form-group label {
                    display: block; font-size: 10.5px; font-weight: 800; text-transform: uppercase;
                    letter-spacing: 1.8px; color: var(--text-muted); margin-bottom: 8px;
                    font-family: 'Orbitron', sans-serif;
                }
                .input-wrapper { position: relative; display: flex; align-items: center; width: 100%; gap: 8px; }
                .form-control {
                    width: 100%; padding: 14px 16px; background: rgba(3, 7, 18, 0.7);
                    border: 1px solid var(--glass-border); border-radius: 12px; color: #ffffff;
                    font-size: 14px; font-family: 'Inter', sans-serif; transition: all 0.3s ease;
                }
                .form-control:focus {
                    outline: none; border-color: var(--neon-cyan);
                    box-shadow: 0 0 25px rgba(0, 245, 212, 0.2); background: rgba(3, 7, 18, 0.9);
                }
                .password-toggle {
                    position: absolute; right: 54px; font-size: 10px; font-weight: 800;
                    font-family: 'Orbitron', sans-serif; letter-spacing: 1px; color: var(--neon-cyan);
                    background: transparent; border: none; cursor: pointer; z-index: 3;
                    transition: all 0.2s;
                }
                .password-toggle:hover { text-shadow: 0 0 8px var(--neon-cyan); }
                
                .google-voice-btn {
                    position: relative; background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--glass-border); border-radius: 10px; width: 42px; height: 42px;
                    display: flex; align-items: center; justify-content: center; cursor: pointer;
                    flex-shrink: 0; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .google-voice-btn:hover {
                    background: rgba(0, 245, 212, 0.12); border-color: var(--neon-cyan);
                    box-shadow: 0 0 18px rgba(0, 245, 212, 0.4); transform: scale(1.06);
                }
                .google-voice-btn.listening {
                    background: linear-gradient(135deg, rgba(0, 245, 212, 0.25), rgba(168, 85, 247, 0.25));
                    border-color: var(--neon-cyan);
                    box-shadow: 0 0 30px rgba(0, 245, 212, 0.6), inset 0 0 12px rgba(0, 245, 212, 0.4);
                    animation: futuristicPulseMic 1.2s ease-in-out infinite alternate;
                }
                @keyframes futuristicPulseMic {
                    0% { transform: scale(1); box-shadow: 0 0 18px rgba(0, 245, 212, 0.4); }
                    100% { transform: scale(1.1); box-shadow: 0 0 35px rgba(0, 245, 212, 0.9), 0 0 15px rgba(168, 85, 247, 0.6); }
                }
                .google-voice-bars { display: flex; align-items: center; gap: 2px; height: 16px; }
                .google-voice-bar { width: 3px; background: var(--text-muted); border-radius: 2px; transition: height 0.2s ease; }
                .google-voice-btn.listening .google-voice-bar { background: var(--neon-cyan); animation: voiceBarDance 0.6s ease-in-out infinite alternate; }
                .google-voice-btn.listening .google-voice-bar:nth-child(1) { animation-delay: 0.1s; }
                .google-voice-btn.listening .google-voice-bar:nth-child(2) { animation-delay: 0.3s; }
                .google-voice-btn.listening .google-voice-bar:nth-child(3) { animation-delay: 0.2s; }
                .google-voice-btn.listening .google-voice-bar:nth-child(4) { animation-delay: 0.4s; }

                @keyframes voiceBarDance {
                    0% { height: 4px; box-shadow: 0 0 2px var(--neon-cyan); }
                    100% { height: 18px; box-shadow: 0 0 10px var(--neon-cyan); }
                }

                .listening-toast-container {
                    position: absolute; top: calc(100% + 8px); left: 0; right: 0;
                    width: 100% !important; max-width: 100% !important; padding: 14px 18px !important;
                    border-radius: 16px !important; background: rgba(10, 15, 30, 0.96) !important;
                    backdrop-filter: blur(20px) !important; -webkit-backdrop-filter: blur(20px) !important;
                    box-shadow: 0 20px 40px rgba(0,0,0,.6), 0 0 20px rgba(0, 245, 212, 0.3) !important;
                    z-index: 100 !important; border: 1px solid var(--neon-cyan) !important;
                    animation: overlayFloatPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important;
                }

                @keyframes overlayFloatPop {
                    0% { opacity: 0; transform: translateY(-8px) scale(0.96); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }

                .decorated-listening-waves { display: flex; align-items: center; gap: 3px; height: 16px; }
                .decorated-wave-bar {
                    width: 3px; background: var(--neon-cyan); border-radius: 2px;
                    animation: voiceBarDance 0.6s ease-in-out infinite alternate;
                }
                .decorated-wave-bar:nth-child(1) { animation-delay: 0.1s; }
                .decorated-wave-bar:nth-child(2) { animation-delay: 0.3s; }
                .decorated-wave-bar:nth-child(3) { animation-delay: 0.2s; }
                .decorated-wave-bar:nth-child(4) { animation-delay: 0.4s; }

                .extra-options-row { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 12px; }
                .remember-me-label { display: flex; align-items: center; gap: 8px; color: var(--text-muted); cursor: pointer; }
                .forgot-password-link { font-weight: 700; color: var(--text-muted); text-decoration: none; transition: all 0.2s ease; font-family: 'Orbitron', sans-serif; font-size: 10px; letter-spacing: 0.5px; }
                .forgot-password-link:hover { color: var(--neon-cyan); text-shadow: 0 0 10px rgba(0, 245, 212, 0.6); }
                #strengthMeter { display: flex; gap: 6px; margin-top: 10px; }
                .strength-bar { flex: 1; height: 4px; border-radius: 2px; background-color: rgba(255, 255, 255, 0.05); transition: background-color 0.4s ease; }
                
                .btn-prime {
                    width: 100%; padding: 15px; background: linear-gradient(90deg, #0ea5e9, #00f5d4, #a855f7);
                    background-size: 200% 100%; border: none; border-radius: 14px; color: #020617; font-size: 13px; font-weight: 900;
                    letter-spacing: 1.5px; font-family: 'Orbitron', sans-serif; cursor: pointer;
                    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); margin-top: 10px;
                    box-shadow: 0 6px 25px rgba(0, 245, 212, 0.35); transform: perspective(500px) translateZ(0);
                }
                .btn-prime:hover:not(:disabled) {
                    background-position: 100% 0; transform: perspective(500px) translateY(-3px) translateZ(10px);
                    box-shadow: 0 12px 35px rgba(0, 245, 212, 0.6); filter: brightness(1.1);
                }
                .btn-prime:active { transform: perspective(500px) translateY(1px) translateZ(-2px); }
                .btn-prime:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
                
                .auth-divider {
                    display: flex; align-items: center; text-align: center; margin: 28px 0;
                    font-size: 10.5px; color: var(--text-muted); letter-spacing: 2.5px; text-transform: uppercase;
                    font-family: 'Orbitron', sans-serif; font-weight: 700;
                }
                .auth-divider::before, .auth-divider::after { content: ''; flex: 1; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
                .auth-divider:not(:empty)::before { margin-right: 1em; }
                .auth-divider:not(:empty)::after { margin-left: 1em; }
                
                .btn-secondary-group { display: flex; flex-direction: column; gap: 12px; }
                .btn-alt {
                    width: 100%; padding: 13px; background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--glass-border); border-radius: 12px; color: #ffffff;
                    font-size: 12.5px; font-weight: 700; display: flex; align-items: center;
                    justify-content: center; gap: 12px; cursor: pointer; transition: all 0.3s ease;
                    transform: perspective(500px) translateZ(0);
                }
                .btn-alt:hover {
                    background: rgba(255, 255, 255, 0.06); border-color: rgba(0, 245, 212, 0.3);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4), 0 0 15px rgba(0, 245, 212, 0.15);
                    transform: perspective(500px) translateY(-2px) translateZ(6px);
                }
                .btn-alt:active { transform: perspective(500px) translateY(1px) translateZ(-1px); }
                
                .premium-modal-overlay {
                    position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
                    background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    z-index: 99999; padding: 20px;
                    animation: modalFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .premium-modal-card {
                    width: 100%; max-width: 440px; padding: 34px; border-radius: 28px;
                    background: linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(3, 7, 18, 0.99));
                    border: 1px solid rgba(0, 245, 212, 0.3); box-shadow: 0 35px 70px rgba(0, 0, 0, 0.9), 0 0 60px rgba(0, 245, 212, 0.12);
                    color: #ffffff; position: relative; overflow: visible;
                    animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes modalSlideUp {
                    from { transform: translateY(40px) scale(0.96); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }

                /* Futuristic 4D Three.js Robot Race Progress Loader */
                #globalProcessLoader {
                    position: fixed; inset: 0; background: rgba(2, 6, 23, 0.97); backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px); z-index: 100000;
                    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px;
                    animation: fadeInLoader 0.3s ease; padding: 24px;
                }
                @keyframes fadeInLoader { from { opacity: 0; } to { opacity: 1; } }

                .robot-race-card {
                    width: 440px; max-width: 90vw; background: rgba(15, 23, 42, 0.85);
                    border: 1px solid rgba(0, 245, 212, 0.4); border-radius: 24px; padding: 20px;
                    box-shadow: 0 0 50px rgba(0, 245, 212, 0.2); display: flex; flex-direction: column; align-items: center; gap: 14px;
                }

                .robot-3d-canvas-container {
                    width: 100%; height: 140px; border-radius: 16px; background: rgba(2, 6, 23, 0.9);
                    border: 1px solid rgba(56, 189, 248, 0.2); overflow: hidden; position: relative;
                }

                .futuristic-progress-track {
                    width: 100%; height: 12px; background: rgba(3, 7, 18, 0.9); border-radius: 10px;
                    border: 1px solid rgba(56, 189, 248, 0.3); overflow: hidden; position: relative;
                }

                .futuristic-progress-fill {
                    height: 100%; background: linear-gradient(90deg, #0ea5e9, #00f5d4, #a855f7);
                    box-shadow: 0 0 15px rgba(0, 245, 212, 0.8); transition: width 0.1s linear;
                }

                .loader-counter-text {
                    font-family: 'Orbitron', sans-serif; font-size: 26px; font-weight: 900;
                    color: var(--neon-cyan); text-shadow: 0 0 16px rgba(0, 245, 212, 0.7);
                }
                #loaderText {
                    font-family: 'Orbitron', sans-serif; font-size: 12px; letter-spacing: 3px;
                    color: var(--neon-blue); text-transform: uppercase;
                    text-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
                }

                #chatLauncherBtn {
                    position: fixed; bottom: 24px; right: 24px; z-index: 999; width: 58px; height: 58px;
                    border-radius: 50%; background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
                    border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 10px 30px rgba(0, 245, 212, 0.4);
                    display: flex; align-items: center; justify-content: center; cursor: pointer; color: #020617;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    animation: launcherPulse 4s ease-in-out infinite alternate;
                }
                @keyframes launcherPulse {
                    0% { box-shadow: 0 10px 30px rgba(0, 245, 212, 0.4), 0 0 0 0 rgba(0, 245, 212, 0.4); }
                    100% { box-shadow: 0 15px 40px rgba(0, 245, 212, 0.6), 0 0 0 14px rgba(0, 245, 212, 0); }
                }
                #chatLauncherBtn:hover { transform: scale(1.08) rotate(8deg); box-shadow: 0 15px 40px rgba(0, 245, 212, 0.7); }
                
                #aiChatConsole {
                    position: fixed; bottom: 24px; right: 24px; width: 380px; height: 520px;
                    max-width: calc(100vw - 32px); max-height: calc(100dvh - 120px - ${keyboardPadding}px);
                    background: rgba(10, 15, 30, 0.96); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(0, 245, 212, 0.3); box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
                    border-radius: 24px; z-index: 1000; display: flex; flex-direction: column; overflow: hidden;
                    transform: translateY(20px) scale(0.96); opacity: 0; pointer-events: none;
                    transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                #aiChatConsole.open { transform: translateY(0) scale(1); opacity: 1; pointer-events: auto; }
                .chat-header {
                    padding: 18px; background: rgba(0, 245, 212, 0.08);
                    border-bottom: 1px solid rgba(0, 245, 212, 0.15); display: flex; justify-content: space-between; align-items: center;
                    flex-shrink: 0;
                }
                .chat-title h3 { font-family: 'Orbitron', sans-serif; font-size: 13px; letter-spacing: 1.5px; color: #ffffff; }
                .chat-title p { font-size: 11px; color: var(--neon-cyan); margin-top: 2px; }
                #closeChatConsole { background: transparent; border: none; color: var(--text-muted); font-size: 22px; cursor: pointer; transition: color 0.2s; }
                #closeChatConsole:hover { color: #ffffff; }
                
                #chatFeedStream { 
                    flex: 1 1 auto; padding: 20px; overflow-y: auto; display: flex; 
                    flex-direction: column; gap: 14px; scroll-behavior: smooth; 
                }
                .chat-bubble { max-width: 85%; padding: 12px 16px; border-radius: 14px; font-size: 13.5px; line-height: 1.55; word-wrap: break-word; animation: bubblePopIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                @keyframes bubblePopIn { from { opacity: 0; transform: translateY(10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .assistant { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); align-self: flex-start; color: #f3f4f6; }
                .user { background: linear-gradient(135deg, var(--neon-cyan), #0284c7); align-self: flex-end; color: #020617; font-weight: 600; }
                .system { display: none; }
                
                .chat-input-area { 
                    padding: 14px; border-top: 1px solid rgba(255, 255, 255, 0.06); 
                    display: flex; flex-direction: column; gap: 10px; 
                    background: rgba(0, 0, 0, 0.4); position: relative; bottom: 0; flex-shrink: 0;
                }
                #chatUserQuery {
                    flex: 1; background: rgba(3, 7, 18, 0.8); border: 1px solid var(--glass-border);
                    border-radius: 10px; padding: 12px; color: #ffffff; font-size: 13.5px; font-family: 'Inter', sans-serif;
                }
                #chatUserQuery:focus { outline: none; border-color: var(--neon-cyan); }
                #chatSendPayloadBtn {
                    background: var(--neon-cyan); border: none; border-radius: 10px; padding: 0 18px;
                    color: #020617; font-weight: 900; font-family: 'Orbitron', sans-serif; font-size: 11px; cursor: pointer;
                    transform: perspective(500px) translateZ(0); transition: all 0.2s ease;
                }
                #chatSendPayloadBtn:hover {
                    transform: perspective(500px) translateY(-1px) translateZ(4px);
                    box-shadow: 0 6px 18px rgba(0, 245, 212, 0.5);
                }
                @keyframes mtlSlideIn{ from{ transform: translateX(120px); opacity:0; } to{ transform: translateX(0); opacity:1; } }
                @keyframes mtlSlideOut{ to{ transform: translateX(120px); opacity:0; } }
                @media (max-width: 480px) {
                    .auth-card { padding: 34px 22px; border-radius: 22px; }
                    #aiChatConsole { right: 16px; width: calc(100vw - 32px); }
                }
            `}</style>

            <canvas id="particles" ref={canvasRef}></canvas>
            <div className="cursor-glow" ref={glowRef}></div>

            {/* Global Smooth Process Loader Overlaid with 4D Three.js Animation */}
            {isLoading && (
                <div id="globalProcessLoader">
                    <div className="robot-race-card">
                        <div className="robot-3d-canvas-container" ref={threeContainerRef}></div>
                        
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span id="loaderText">{loaderText}</span>
                            <span className="loader-counter-text">{Math.round(loadProgress)}%</span>
                        </div>

                        <div className="futuristic-progress-track">
                            <div className="futuristic-progress-fill" style={{ width: `${loadProgress}%` }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* IF STILL VERIFYING SESSION, SHOW CLEAN NEON LOADING HOLDER */}
            {checkingSession ? (
                <div style={{ position: "relative", zIndex: 10, color: "var(--neon-cyan)", fontFamily: "Orbitron", fontSize: "12px", letterSpacing: "3px" }}>
                    VERIFYING NODE SESSION...
                </div>
            ) : (
                <div className="auth-container">
                    <div className="auth-card">
                        <div className="auth-header">
                            <h1>MTL FOOTBALL HUB</h1>
                            <div id="aiText">{aiTexts[aiTextIndex]}</div>
                        </div>

                        <div className="nav-switch">
                            <button 
                                className={authMode === "login" ? "active" : ""} 
                                onClick={() => { playSound("click"); setAuthMode("login"); }}
                            >
                                SIGN IN
                            </button>
                            <button 
                                className={authMode === "register" ? "active" : ""} 
                                onClick={() => { playSound("click"); setAuthMode("register"); }}
                            >
                                REGISTER
                            </button>
                        </div>

                        {/* Smooth Animated Height Wrapper */}
                        <div className="form-switch-wrapper" ref={formContainerRef} style={{ height: formHeight }}>
                            {/* SIGN IN FORM PANE */}
                            <div className={`form-fade-pane ${authMode === "login" ? "active" : ""}`}>
                                <form onSubmit={handleLogin} id="loginBox">
                                    <div className="form-group">
                                        <label>User Email</label>
                                        <div className="input-wrapper">
                                            <input 
                                                type="email" 
                                                className="form-control" 
                                                placeholder="Type email here"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required 
                                            />
                                            <button 
                                                type="button" 
                                                className={`google-voice-btn ${isListening && activeVoiceTarget === "email" ? "listening" : ""}`}
                                                onClick={() => toggleVoiceInput("email")}
                                                title="Google Voice Type"
                                            >
                                                <div className="google-voice-bars">
                                                    <div className="google-voice-bar" style={{height: '6px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '12px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '8px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '14px'}}></div>
                                                </div>
                                            </button>
                                        </div>
                                        {renderListeningOverlay("email")}
                                    </div>
                                    <div className="form-group">
                                        <label>PASSWORD</label>
                                        <div className="input-wrapper">
                                            <input 
                                                type={showPassword ? "text" : "password"} 
                                                className="form-control" 
                                                placeholder="Type password here"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required 
                                            />
                                            <button 
                                                type="button" 
                                                className="password-toggle"
                                                onClick={() => { playSound("click"); setShowPassword(!showPassword); }}
                                            >
                                                {showPassword ? "HIDE" : "SHOW"}
                                            </button>
                                            <button 
                                                type="button" 
                                                className={`google-voice-btn ${isListening && activeVoiceTarget === "password" ? "listening" : ""}`}
                                                onClick={() => toggleVoiceInput("password")}
                                                title="Google Voice Type"
                                            >
                                                <div className="google-voice-bars">
                                                    <div className="google-voice-bar" style={{height: '6px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '12px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '8px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '14px'}}></div>
                                                </div>
                                            </button>
                                        </div>
                                        {renderListeningOverlay("password")}
                                        <div className="extra-options-row">
                                            <label className="remember-me-label">
                                                <input 
                                                    type="checkbox" 
                                                    checked={rememberDevice} 
                                                    onChange={(e) => setRememberDevice(e.target.checked)} 
                                                /> Remember me
                                            </label>
                                            <a href="/reset-password" onClick={(e) => { e.preventDefault(); navigate("/reset-password"); }} className="forgot-password-link">RESET PASSWORD</a>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn-prime" disabled={isLoading}>LOGIN</button>
                                </form>
                            </div>

                            {/* REGISTER FORM PANE */}
                            <div className={`form-fade-pane ${authMode === "register" ? "active" : ""}`}>
                                <form onSubmit={handleRegister} id="registerBox">
                                    <div className="form-group">
                                        <label>USERNAME</label>
                                        <div className="input-wrapper">
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                placeholder="Type username here"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                required 
                                            />
                                            <button 
                                                type="button" 
                                                className={`google-voice-btn ${isListening && activeVoiceTarget === "username" ? "listening" : ""}`}
                                                onClick={() => toggleVoiceInput("username")}
                                                title="Google Voice Type"
                                            >
                                                <div className="google-voice-bars">
                                                    <div className="google-voice-bar" style={{height: '6px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '12px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '8px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '14px'}}></div>
                                                </div>
                                            </button>
                                        </div>
                                        {renderListeningOverlay("username")}
                                    </div>
                                    <div className="form-group">
                                        <label>EMAIL</label>
                                        <div className="input-wrapper">
                                            <input 
                                                type="email" 
                                                className="form-control" 
                                                placeholder="Type email here"
                                                value={regEmail}
                                                onChange={(e) => setRegEmail(e.target.value)}
                                                required 
                                            />
                                            <button 
                                                type="button" 
                                                className={`google-voice-btn ${isListening && activeVoiceTarget === "regEmail" ? "listening" : ""}`}
                                                onClick={() => toggleVoiceInput("regEmail")}
                                                title="Google Voice Type"
                                            >
                                                <div className="google-voice-bars">
                                                    <div className="google-voice-bar" style={{height: '6px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '12px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '8px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '14px'}}></div>
                                                </div>
                                            </button>
                                        </div>
                                        {renderListeningOverlay("regEmail")}
                                    </div>
                                    <div className="form-group">
                                        <label>PASSWORD</label>
                                        <div className="input-wrapper">
                                            <input 
                                                type={showRegPassword ? "text" : "password"} 
                                                className="form-control" 
                                                placeholder="Type password here"
                                                value={regPassword}
                                                onChange={(e) => setRegPassword(e.target.value)}
                                                required 
                                            />
                                            <button 
                                                type="button" 
                                                className="password-toggle"
                                                onClick={() => { playSound("click"); setShowRegPassword(!showRegPassword); }}
                                            >
                                                {showRegPassword ? "HIDE" : "SHOW"}
                                            </button>
                                            <button 
                                                type="button" 
                                                className={`google-voice-btn ${isListening && activeVoiceTarget === "regPassword" ? "listening" : ""}`}
                                                onClick={() => toggleVoiceInput("regPassword")}
                                                title="Google Voice Type"
                                            >
                                                <div className="google-voice-bars">
                                                    <div className="google-voice-bar" style={{height: '6px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '12px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '8px'}}></div>
                                                    <div className="google-voice-bar" style={{height: '14px'}}></div>
                                                </div>
                                            </button>
                                        </div>
                                        {renderListeningOverlay("regPassword")}
                                        <div id="strengthMeter">
                                            {[0, 1, 2, 3].map((index) => {
                                                let bg = "rgba(255, 255, 255, 0.05)";
                                                if (index < passwordScore) {
                                                    if (passwordScore <= 1) bg = "#ef4444";
                                                    else if (passwordScore <= 3) bg = "#f59e0b";
                                                    else bg = "var(--neon-cyan)";
                                                }
                                                return <div key={index} className="strength-bar" style={{ backgroundColor: bg }}></div>;
                                            })}
                                        </div>
                                    </div>
                                    <button type="submit" className="btn-prime" disabled={isLoading}>REGISTER</button>
                                </form>
                            </div>
                        </div>

                        <div className="auth-divider">ALTERNATIVES</div>

                        <div className="btn-secondary-group">
                            <button type="button" onClick={handleGoogleLogin} className="btn-alt">
                                <svg width="16" height="16" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                Continue with Google
                            </button>
                            <button type="button" onClick={() => setIsOtpModalOpen(true)} className="btn-alt">
                                Access via Phone OTP
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OTP Modal */}
            {isOtpModalOpen && (
                <div className="premium-modal-overlay">
                    <div className="premium-modal-card">
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '18px', color: 'var(--neon-cyan)', marginBottom: '16px' }}>PHONE AUTHORIZATION</h2>
                        <div className="form-group">
                            <label>FULL NAME</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder="e.g. Alex Mercer" 
                                value={nameInput} 
                                onChange={(e) => setNameInput(e.target.value)} 
                            />
                        </div>
                        <div className="form-group">
                            <label>PHONE NUMBER (E.164 Format)</label>
                            <input 
                                type="tel" 
                                className="form-control" 
                                placeholder="+1234567890" 
                                value={phoneInput} 
                                onChange={(e) => setPhoneInput(e.target.value)} 
                            />
                        </div>
                        <button type="button" className="btn-prime" onClick={handleStartOtpFlow}>REQUEST CODE</button>

                        <div className="animated-section-divider"></div>

                        <div className="form-group">
                            <label>ENTER 6-DIGIT CODE</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder="123456" 
                                value={otpInput} 
                                onChange={(e) => setOtpInput(e.target.value)} 
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" className="btn-prime" onClick={handleVerifyOtpFlow}>VERIFY</button>
                            <button type="button" className="btn-alt" onClick={handleResendOtp} disabled={resendLock}>RESEND</button>
                        </div>
                        <button 
                            type="button" 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', marginTop: '16px', width: '100%', cursor: 'pointer', fontFamily: 'Orbitron', fontSize: '11px' }} 
                            onClick={() => setIsOtpModalOpen(false)}
                        >
                            CLOSE
                        </button>
                    </div>
                </div>
            )}

            {/* Active Session Verification Modal */}
            {showSessionModal && (
                <div className="premium-modal-overlay">
                    <div className="premium-modal-card">
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: '18px', color: 'var(--neon-cyan)', marginBottom: '8px' }}>ACTIVE SESSION DETECTED</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                            Welcome back, <strong style={{ color: '#fff' }}>{getActiveSessionIdentity().name}</strong>. An active authenticated session was found.
                        </p>
                        <button 
                            type="button" 
                            className="btn-prime" 
                            onClick={() => triggerSecureTransition("/dashboard", "Resuming authenticated session...")}
                        >
                            CONTINUE TO DASHBOARD
                        </button>
                        <button 
                            type="button" 
                            className="btn-alt" 
                            style={{ marginTop: '10px' }} 
                            onClick={async () => {
                                await supabase.auth.signOut();
                                localStorage.removeItem("user");
                                localStorage.removeItem("mtl_auth_token");
                                setShowSessionModal(false);
                            }}
                        >
                            LOG OUT & SWITCH ACCOUNT
                        </button>
                    </div>
                </div>
            )}

            {/* AI Assistant Chat Console Floating Launch Button */}
            <button id="chatLauncherBtn" onClick={openChatConsole} title="Ask Technician AI">
                🤖
            </button>

            {/* AI Chat Console */}
            <div id="aiChatConsole" className={isChatOpen ? "open" : ""}>
                <div className="chat-header">
                    <div className="chat-title">
                        <h3>MR MOURICE</h3>
                        <p>Dashboard Tech & Football Predictions Helper</p>
                    </div>
                    <button id="closeChatConsole" onClick={() => setIsChatOpen(false)}>×</button>
                </div>
                <div id="chatFeedStream" ref={chatFeedRef}>
                    {chatMessages.map((m, idx) => (
                        <div key={idx} className={`chat-bubble ${m.role}`}>
                            {m.text}
                        </div>
                    ))}
                </div>
                <div className="chat-input-area">
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="text" 
                            id="chatUserQuery" 
                            placeholder="Ask about matches or predictions..." 
                            value={chatQuery} 
                            onChange={(e) => setChatQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") executeNeuralGrokQuery(); }}
                        />
                        <button 
                            type="button" 
                            className={`google-voice-btn ${isListening && activeVoiceTarget === "chatQuery" ? "listening" : ""}`}
                            onClick={() => toggleVoiceInput("chatQuery", (autoText) => executeNeuralGrokQuery(autoText))}
                        >
                            <div className="google-voice-bars">
                                <div className="google-voice-bar" style={{height: '6px'}}></div>
                                <div className="google-voice-bar" style={{height: '12px'}}></div>
                                <div className="google-voice-bar" style={{height: '8px'}}></div>
                                <div className="google-voice-bar" style={{height: '14px'}}></div>
                            </div>
                        </button>
                        <button id="chatSendPayloadBtn" onClick={() => executeNeuralGrokQuery()}>
                            SEND
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
