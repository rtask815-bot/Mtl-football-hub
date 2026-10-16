import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { supabase } from "../config/supabase.ts";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config/env.ts";
import FuturisticLoader from "../components/FuturisticLoader.tsx";

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

    // Navigation Pending Route Target
    const pendingTargetRef = useRef(null);

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

    // Refs for visual cues and dynamic heights
    const glowRef = useRef(null);
    const formContainerRef = useRef(null);
    const threeContainerRef = useRef(null);
    const [formHeight, setFormHeight] = useState("auto");

    // Synchronized progress tracking ref for 60fps WebGL updates
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
        const updateHeight = () => {
            if (formContainerRef.current) {
                const currentChild = formContainerRef.current.querySelector(".form-fade-pane.active");
                if (currentChild && currentChild.scrollHeight > 0) {
                    setFormHeight(`${currentChild.scrollHeight}px`);
                } else {
                    setFormHeight("auto");
                }
            }
        };
        updateHeight();
        const timer = setTimeout(updateHeight, 50);
        return () => clearTimeout(timer);
    }, [authMode, showPassword, showRegPassword, regPassword, checkingSession]);

    // Dynamic Mobile Viewport Resize Handler
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

    // High-Performance Static Background & Video Backdrop Engine
    useEffect(() => {
        // Static background mode active - zero CPU/GPU animation loops.
    }, []);

    // Password Strength Evaluator
    useEffect(() => {
        let score = 0;
        if (regPassword.length >= 6) score++;
        if (/[A-Z]/.test(regPassword)) score++;
        if (/[0-9]/.test(regPassword)) score++;
        if (/[^A-Za-z0-9]/.test(regPassword)) score++;
        setPasswordScore(score);
    }, [regPassword]);

    // Speech Recognition Setup
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

    // Strictly Synchronized Transition Gate Engine
    const triggerSecureTransition = (targetPath, outputText) => {
        pendingTargetRef.current = targetPath;
        setLoaderText(outputText);
        setLoadProgress(0);
        setIsLoading(true);
        playSound("ring");

        const totalDuration = 1000; // Snappy 1s
        const intervalTime = 20;   // ms
        const increment = 100 / (totalDuration / intervalTime);

        const progressInterval = setInterval(() => {
            setLoadProgress((prev) => {
                const nextVal = prev + increment;
                if (nextVal >= 100) {
                    clearInterval(progressInterval);
                    
                    playSound("success");
                    setTimeout(() => {
                        setIsLoading(false);
                        if (pendingTargetRef.current) {
                            navigate(pendingTargetRef.current);
                        }
                    }, 200);
                    
                    return 100;
                }
                return nextVal;
            });
        }, intervalTime);
    };

    // FUTURISTIC NOTIFICATION TOAST ENGINE
    const showToast = (message, type = "info") => {
        if (type === "success") playSound("success");
        else if (type === "error") playSound("error");
        else playSound("ring");

        document.querySelectorAll(".mtl-toast").forEach((t) => t.remove());
        const el = document.createElement("div");
        el.className = "mtl-toast";
        
        const theme = type === "success" 
            ? { border: "#00f5d4", glow: "rgba(0, 245, 212, 0.4)", icon: "⚡" } 
            : type === "error" 
            ? { border: "#f43f5e", glow: "rgba(244, 63, 94, 0.4)", icon: "⚠" } 
            : { border: "#38bdf8", glow: "rgba(56, 189, 248, 0.4)", icon: "ℹ" };

        Object.assign(el.style, {
            position: "fixed", top: "28px", right: "28px", width: "360px", maxWidth: "92vw",
            padding: "16px 20px", borderRadius: "18px", 
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(3, 7, 18, 0.98))",
            backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            boxShadow: `0 20px 50px rgba(0,0,0,.8), 0 0 25px ${theme.glow}`,
            zIndex: "999999", display: "flex", alignItems: "center", gap: "14px",
            border: `1px solid ${theme.border}`, 
            animation: "mtlSlideIn .4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            fontFamily: "Inter, sans-serif", color: "#f8fafc"
        });

        el.innerHTML = `
            <div style="width:38px; height:38px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid ${theme.border}; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">
                ${theme.icon}
            </div>
            <div style="flex:1;">
                <div style="font-size:10px; font-weight:900; letter-spacing:2px; margin-bottom:3px; color:${theme.border}; font-family: 'Orbitron', sans-serif;">
                    NOTIFICATION // ${type.toUpperCase()}
                </div>
                <div style="font-size:13px; line-height:1.4; color:#e2e8f0; font-weight:500;">${message}</div>
            </div>
        `;
        document.body.appendChild(el);
        setTimeout(() => {
            el.style.animation = "mtlSlideOut .3s ease-in forwards";
            setTimeout(() => el.remove(), 300);
        }, 5000);
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
        try {
            const redirectUrl = `${window.location.origin}/dashboard`;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: redirectUrl
                }
            });
            if (error) {
                showToast(error.message, "error");
            }
        } catch (error) {
            console.error("Supabase Google sign in error:", error);
            showToast(error.message || "Failed to sign in with Google via Supabase.", "error");
        }
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

    const aiTexts = ["Welcome to the community", "let's earn together"];

    // Floating Voice Listening Overlay Component
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
                    --card-bg: linear-gradient(160deg, rgba(15, 23, 42, 0.92), rgba(6, 11, 25, 0.96));
                    --neon-cyan: #00f5d4;
                    --neon-blue: #38bdf8;
                    --neon-purple: #a855f7;
                    --text-main: #f8fafc;
                    --text-muted: #94a3b8;
                    --border-glow: rgba(56, 189, 248, 0.25);
                    --glass-border: rgba(255, 255, 255, 0.12);
                }
                .auth-page-wrapper {
                    box-sizing: border-box;
                    background: transparent;
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
                }

                .cursor-glow {
                    position: fixed; width: 600px; height: 600px;
                    background: radial-gradient(circle, rgba(0, 245, 212, 0.07), rgba(168, 85, 247, 0.05), transparent 70%);
                    border-radius: 50%; pointer-events: none; z-index: 2;
                    transform: translate(-50%, -50%); transition: width 0.3s, height 0.3s;
                }

                .auth-container {
                    position: relative; z-index: 10; width: 100%; max-width: 460px; padding: 24px;
                    display: flex; flex-direction: column; justify-content: center;
                    perspective: 1000px;
                    animation: containerFloatIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes containerFloatIn {
                    from { opacity: 0; transform: translateY(40px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                
                .auth-card {
                    background: var(--card-bg); 
                    backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
                    border: 1px solid var(--glass-border);
                    box-shadow: 
                        0 25px 50px rgba(0, 0, 0, 0.85),
                        0 2px 0 rgba(255, 255, 255, 0.1) inset,
                        0 0 40px rgba(0, 245, 212, 0.06);
                    border-radius: 28px; padding: 42px 34px; width: 100%; position: relative; overflow: visible;
                    transition: box-shadow 0.4s ease, border-color 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .auth-card:hover {
                    border-color: rgba(0, 245, 212, 0.35);
                    box-shadow: 
                        0 30px 60px rgba(0, 0, 0, 0.9),
                        0 2px 0 rgba(255, 255, 255, 0.2) inset,
                        0 0 60px rgba(0, 245, 212, 0.12);
                }
                .auth-card::before {
                    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 3px;
                    background: linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-blue), var(--neon-purple), transparent);
                    border-top-left-radius: 28px; border-top-right-radius: 28px;
                }
                
                .auth-header { text-align: center; margin-bottom: 32px; }
                .auth-header h1 {
                    font-family: 'Orbitron', sans-serif; font-size: 26px; font-weight: 900; letter-spacing: 2.5px;
                    background: linear-gradient(135deg, #ffffff 30%, var(--neon-cyan) 70%, var(--neon-blue));
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;
                }
                #aiText {
                    font-size: 11px; font-family: 'Orbitron', sans-serif; letter-spacing: 2px;
                    text-transform: uppercase; color: var(--neon-cyan); height: 16px;
                    text-shadow: 0 0 12px rgba(0, 245, 212, 0.5);
                }

                .nav-switch {
                    display: flex; background: #030712; padding: 6px;
                    border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 28px;
                    position: relative; box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.8);
                }
                .nav-switch button {
                    flex: 1; background: transparent; border: none; color: var(--text-muted);
                    padding: 12px; font-size: 12.5px; font-weight: 800; letter-spacing: 1px;
                    border-radius: 12px; cursor: pointer; transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    font-family: 'Orbitron', sans-serif;
                }
                .nav-switch button.active {
                    color: #ffffff; 
                    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
                    border: 1px solid rgba(0, 245, 212, 0.5); 
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 245, 212, 0.3);
                    text-shadow: 0 0 10px rgba(0, 245, 212, 0.8);
                }

                .form-switch-wrapper {
                    position: relative; width: 100%; overflow: hidden;
                    transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .form-fade-pane {
                    position: absolute; top: 0; left: 0; width: 100%; opacity: 0; pointer-events: none;
                    transform: translateX(20px); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .form-fade-pane.active {
                    position: relative; opacity: 1; pointer-events: auto; transform: translateX(0);
                }

                .form-group { margin-bottom: 20px; position: relative; }
                .form-group label {
                    display: block; font-size: 10.5px; font-weight: 800; text-transform: uppercase;
                    letter-spacing: 1.8px; color: var(--text-muted); margin-bottom: 8px;
                    font-family: 'Orbitron', sans-serif;
                }
                .input-wrapper { position: relative; display: flex; align-items: center; width: 100%; gap: 8px; }
                
                .form-control {
                    width: 100%; padding: 14px 16px; background: #030712;
                    border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; color: #ffffff;
                    font-size: 14px; font-family: 'Inter', sans-serif; transition: all 0.3s ease;
                    box-shadow: inset 0 2px 6px rgba(0,0,0,0.8);
                }
                .form-control:focus {
                    outline: none; border-color: var(--neon-cyan);
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.9), 0 0 20px rgba(0, 245, 212, 0.25); 
                    background: #020617;
                }
                
                .google-voice-btn {
                    position: relative; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
                    border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 10px; width: 42px; height: 42px;
                    display: flex; align-items: center; justify-content: center; cursor: pointer;
                    flex-shrink: 0; transition: all 0.25s ease;
                }
                .google-voice-btn:hover { border-color: var(--neon-cyan); transform: translateY(-2px); }
                .google-voice-bars { display: flex; align-items: center; gap: 2px; height: 16px; }
                .google-voice-bar { width: 3px; background: var(--text-muted); border-radius: 2px; }

                .btn-prime {
                    width: 100%; padding: 16px; 
                    background: linear-gradient(180deg, #00f5d4 0%, #0284c7 100%);
                    border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 14px; color: #020617; font-size: 13px; font-weight: 900;
                    letter-spacing: 1.5px; font-family: 'Orbitron', sans-serif; cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); margin-top: 10px;
                    box-shadow: 0 8px 20px rgba(0, 245, 212, 0.3);
                }
                .btn-prime:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 28px rgba(0, 245, 212, 0.5);
                    filter: brightness(1.08);
                }
                
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
                    width: 100%; padding: 13px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
                    border: 1px solid var(--glass-border); border-radius: 12px; color: #ffffff;
                    font-size: 12.5px; font-weight: 700; display: flex; align-items: center;
                    justify-content: center; gap: 12px; cursor: pointer; transition: all 0.25s ease;
                }
                .btn-alt:hover {
                    background: linear-gradient(180deg, #334155 0%, #1e293b 100%);
                    border-color: rgba(0, 245, 212, 0.3);
                    transform: translateY(-2px);
                }
                
                .premium-modal-overlay {
                    position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
                    background: rgba(2, 6, 23, 0.88); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
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
                    border: 1px solid rgba(0, 245, 212, 0.35); box-shadow: 0 35px 70px rgba(0, 0, 0, 0.9), 0 0 60px rgba(0, 245, 212, 0.15);
                    color: #ffffff; position: relative; overflow: visible;
                }

                #globalProcessLoader {
                    position: fixed; inset: 0; background: rgba(2, 6, 23, 0.97); backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px); z-index: 100000;
                    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px;
                    padding: 24px;
                }

                .robot-race-card {
                    width: 440px; max-width: 90vw; background: rgba(15, 23, 42, 0.9);
                    border: 1px solid rgba(0, 245, 212, 0.4); border-radius: 24px; padding: 20px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 245, 212, 0.2); 
                    display: flex; flex-direction: column; align-items: center; gap: 14px;
                }

                .robot-3d-canvas-container {
                    width: 100%; height: 140px; border-radius: 16px; background: #020617;
                    border: 1px solid rgba(56, 189, 248, 0.2); overflow: hidden; position: relative;
                }

                .futuristic-progress-track {
                    width: 100%; height: 14px; background: #030712; border-radius: 10px;
                    border: 1px solid rgba(56, 189, 248, 0.3); overflow: hidden; position: relative;
                }

                .futuristic-progress-fill {
                    height: 100%; background: linear-gradient(90deg, #0ea5e9, #00f5d4, #a855f7);
                    box-shadow: 0 0 15px rgba(0, 245, 212, 0.8); transition: width 0.05s linear;
                }

                .loader-counter-text {
                    font-family: 'Orbitron', sans-serif; font-size: 26px; font-weight: 900;
                    color: var(--neon-cyan); text-shadow: 0 0 16px rgba(0, 245, 212, 0.7);
                }
                #loaderText {
                    font-family: 'Orbitron', sans-serif; font-size: 12px; letter-spacing: 3px;
                    color: var(--neon-blue); text-transform: uppercase;
                }

                @keyframes mtlSlideIn{ from{ transform: translateX(120px); opacity:0; } to{ transform: translateX(0); opacity:1; } }
                @keyframes mtlSlideOut{ to{ transform: translateX(120px); opacity:0; } }
                
                @media (max-width: 480px) {
                    .auth-card { padding: 34px 22px; border-radius: 22px; }
                }
            `}</style>

            <div className="cursor-glow" ref={glowRef}></div>

            {/* INTELLIGENT SESSION PROMPT MODAL */}
            {showSessionModal && (
                <div className="premium-modal-overlay">
                    <div className="premium-modal-card">
                        <div style={{ textAlign: "center", marginBottom: "24px" }}>
                            <div style={{ fontSize: "11px", fontWeight: "900", color: "var(--neon-cyan)", fontFamily: "Orbitron", letterSpacing: "2.5px", marginBottom: "10px" }}>
                                INTELLIGENT SESSION DETECTED
                            </div>
                            <h2 style={{ fontSize: "22px", fontWeight: "900", fontFamily: "Orbitron", marginBottom: "12px", background: "linear-gradient(135deg, #fff, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                                WELCOME BACK, {getActiveSessionIdentity().name.toUpperCase()}!
                            </h2>
                            <p style={{ fontSize: "13.5px", color: "var(--text-muted)", lineHeight: "1.6" }}>
                                You are currently signed in as <br />
                                <strong style={{ color: "var(--neon-cyan)", fontSize: "14px" }}>{getActiveSessionIdentity().email}</strong>.
                            </p>
                            <p style={{ fontSize: "13px", color: "#e2e8f0", marginTop: "10px" }}>
                                Would you like to continue with this account or use another account?
                            </p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <button 
                                className="btn-prime" 
                                onClick={() => {
                                    setShowSessionModal(false);
                                    triggerSecureTransition("/dashboard", "Resuming user session...");
                                }}
                            >
                                CONTINUE WITH THIS ACCOUNT
                            </button>
                            <button 
                                className="btn-alt" 
                                onClick={async () => {
                                    playSound("click");
                                    await supabase.auth.signOut();
                                    localStorage.removeItem("user");
                                    localStorage.removeItem("mtl_auth_token");
                                    setActiveSessionUser(null);
                                    setShowSessionModal(false);
                                    setAuthMode("login");
                                    showToast("Please enter credentials for your account.", "info");
                                }}
                            >
                                SIGN IN WITH ANOTHER ACCOUNT
                            </button>
                            <button 
                                className="btn-alt" 
                                style={{ borderColor: "rgba(168, 85, 247, 0.4)", background: "rgba(168, 85, 247, 0.08)" }}
                                onClick={async () => {
                                    playSound("click");
                                    await supabase.auth.signOut();
                                    localStorage.removeItem("user");
                                    localStorage.removeItem("mtl_auth_token");
                                    setActiveSessionUser(null);
                                    setShowSessionModal(false);
                                    setAuthMode("register");
                                    showToast("Fill details to create a new profile.", "info");
                                }}
                            >
                                REGISTER ANOTHER ACCOUNT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UNIFIED FUTURISTIC QUANTUM LOADER */}
            <FuturisticLoader
                active={isLoading || checkingSession}
                text={checkingSession ? "VERIFYING QUANTUM SESSION..." : (loaderText || "AUTHENTICATING NODE...")}
                progress={checkingSession ? 88 : loadProgress}
                subText={checkingSession ? "AUTHENTICATING NODE SECURITY" : "SECURITY CLEARANCE PROTOCOL"}
            />

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

                        {/* Animated Smooth Height Container */}
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
                                                placeholder="e.g. alex.mercer@mtlfootball.com (Required for account access)"
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
                                                placeholder="e.g. Min 6 characters e.g. Pass123! (Required for authentication)"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required 
                                            />
                                            <button 
                                                type="button" 
                                                className="password-toggle"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? "HIDE" : "SHOW"}
                                            </button>
                                        </div>
                                    </div>

                                    <button type="submit" className="btn-prime">AUTHENTICATE</button>
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
                                                placeholder="e.g. Alex Mercer or @alex_scout (Required for community profile)"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>EMAIL ADDRESS</label>
                                        <div className="input-wrapper">
                                            <input 
                                                type="email" 
                                                className="form-control" 
                                                placeholder="e.g. alex.mercer@mtlfootball.com (Required for alerts & recovery)"
                                                value={regEmail}
                                                onChange={(e) => setRegEmail(e.target.value)}
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>CREATE PASSWORD</label>
                                        <div className="input-wrapper">
                                            <input 
                                                type={showRegPassword ? "text" : "password"} 
                                                className="form-control" 
                                                placeholder="e.g. Min 6 characters with numbers & symbols (Required for security)"
                                                value={regPassword}
                                                onChange={(e) => setRegPassword(e.target.value)}
                                                required 
                                            />
                                            <button 
                                                type="button" 
                                                className="password-toggle"
                                                onClick={() => setShowRegPassword(!showRegPassword)}
                                            >
                                                {showRegPassword ? "HIDE" : "SHOW"}
                                            </button>
                                        </div>
                                        <div id="strengthMeter">
                                            <div className="strength-bar" style={{ backgroundColor: passwordScore >= 1 ? '#ef4444' : '' }}></div>
                                            <div className="strength-bar" style={{ backgroundColor: passwordScore >= 2 ? '#f59e0b' : '' }}></div>
                                            <div className="strength-bar" style={{ backgroundColor: passwordScore >= 3 ? '#3b82f6' : '' }}></div>
                                            <div className="strength-bar" style={{ backgroundColor: passwordScore >= 4 ? '#00f5d4' : '' }}></div>
                                        </div>
                                    </div>

                                    <button type="submit" className="btn-prime">CREATE PROFILE</button>
                                </form>
                            </div>
                        </div>

                        <div className="auth-divider">OR CONNECT VIA</div>

                        <div className="btn-secondary-group">
                            <button className="btn-alt flex items-center justify-center gap-3 font-bold" onClick={handleGoogleLogin}>
                                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ width: '20px', height: '20px', display: 'block' }}>
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                    <path fill="none" d="M0 0h48v48H0z"></path>
                                </svg>
                                <span>SIGN IN WITH GOOGLE</span>
                            </button>
                        </div>
                    </div>
                </div>
        </div>
    );
}
