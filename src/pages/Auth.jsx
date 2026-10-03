import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabase.ts";

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

// Sanitization utility to strip specific vendor hints
const sanitizeText = (str) => {
    if (!str) return "";
    return String(str)
        .replace(/supabase/gi, "Identity Service")
        .replace(/postgres(ql)?/gi, "System Database")
        .replace(/postgrest/gi, "Database API")
        .replace(/p2002/gi, "UNIQUE_CONSTRAINT_EXISTS");
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

    // Diagnostic Error Details State
    const [authErrorDetails, setAuthErrorDetails] = useState(null);

    // Toast State
    const [toastMessage, setToastMessage] = useState(null);
    const [toastType, setToastType] = useState("info");

    // Existing Session Prompt States
    const [activeSessionUser, setActiveSessionUser] = useState(null);
    const [showSessionModal, setShowSessionModal] = useState(false);

    // Loaders, Modals, and Security
    const [isLoading, setIsLoading] = useState(false);
    const [loaderText, setLoaderText] = useState("connecting...");
    const [loadProgress, setLoadProgress] = useState(0);

    // Navigation Pending Route Target
    const pendingTargetRef = useRef(null);

    // Dynamic Model Tier Selection State
    const [selectedModel, setSelectedModel] = useState("gpt-3.5-turbo");

    // Voice Input State Management
    const [activeVoiceTarget, setActiveVoiceTarget] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const recognitionRef = useRef(null);

    // Refs for visual cues and dynamic heights
    const glowRef = useRef(null);
    const formContainerRef = useRef(null);
    const [formHeight, setFormHeight] = useState("auto");

    // Synchronized progress tracking ref for 60fps WebGL updates
    const targetProgressRef = useRef(0);

    const showToast = (msg, type = "info") => {
        setToastMessage(sanitizeText(msg));
        setToastType(type);
        playSound(type === "error" ? "error" : "click");
        setTimeout(() => {
            setToastMessage(null);
        }, 5000);
    };

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
    }, [authMode, showPassword, showRegPassword, regPassword, checkingSession, authErrorDetails]);

    // Resolve Active Model Tier
    useEffect(() => {
        const resolveActiveModel = async () => {
            try {
                const res = await fetch("/api/models", { method: "GET" });
                if (!res.ok) return;
                const data = await res.json();
                const availableModels = new Set(data?.data?.map((m) => m.id) || []);
                
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
            };

            recognition.onresult = (event) => {
                let current = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    current += event.results[i][0].transcript;
                }
                setInterimTranscript(current);

                if (event.results[0].isFinal) {
                    const cleanVal = current.trim().replace(/\.$/, "");
                    if (activeVoiceTarget === "email") setEmail(cleanVal.toLowerCase());
                    else if (activeVoiceTarget === "username") setUsername(cleanVal);
                    else if (activeVoiceTarget === "regEmail") setRegEmail(cleanVal.toLowerCase());
                    
                    setIsListening(false);
                    setInterimTranscript("");
                    showToast(`Voice captured: "${cleanVal}"`, "success");
                }
            };

            recognitionRef.current = recognition;
        }
    }, [activeVoiceTarget]);

    const toggleVoiceInput = (targetField) => {
        playSound("click");
        if (!recognitionRef.current) {
            return showToast("Speech recognition is not supported in this browser.", "warning");
        }

        if (isListening && activeVoiceTarget === targetField) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setActiveVoiceTarget(targetField);
            setInterimTranscript("");
            setIsListening(true);
            try {
                recognitionRef.current.start();
            } catch (e) {
                // Voice re-start guard
            }
        }
    };

    const triggerSecureTransition = (targetRoute, loaderMessage) => {
        setIsLoading(true);
        setLoaderText(loaderMessage);
        setLoadProgress(0);
        pendingTargetRef.current = targetRoute;

        let current = 0;
        const interval = setInterval(() => {
            current += Math.floor(Math.random() * 14) + 6;
            if (current >= 100) {
                current = 100;
                setLoadProgress(100);
                clearInterval(interval);
                playSound("success");
                setTimeout(() => {
                    setIsLoading(false);
                    if (pendingTargetRef.current) {
                        navigate(pendingTargetRef.current);
                    }
                }, 600);
            } else {
                setLoadProgress(current);
            }
        }, 80);
    };

    // =========================================================================
    // AUTHENTICATION & REGISTRATION HANDLERS (STRICT CASE-INSENSITIVE EMAIL)
    // =========================================================================
    const handleLogin = async (e) => {
        e.preventDefault();
        playSound("click");
        setAuthErrorDetails(null);

        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !password) {
            return showToast("REQUIRED IDENTITIES MISSING", "warning");
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password
            });
            if (error) throw error;

            if (data?.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
            }
            if (data?.session?.access_token) {
                localStorage.setItem("mtl_auth_token", data.session.access_token);
            }

            triggerSecureTransition("/dashboard", "processing connection...");
        } catch (err) {
            const sanitizedMsg = sanitizeText(err.message || "Invalid authentication credentials");
            showToast(sanitizedMsg, "error");

            setAuthErrorDetails({
                title: "AUTHENTICATION FAILURE",
                message: sanitizedMsg,
                code: err.status || err.code || 401,
                isDbError: false,
                email: cleanEmail,
                timestamp: new Date().toISOString(),
                diagnosis: "The central authentication service was unable to verify the provided credentials.",
                troubleshooting: [
                    "Ensure email syntax is valid and free of typos.",
                    "Verify your password corresponds to your registered user profile.",
                    "If you haven't registered an account yet, switch to the REGISTER tab above."
                ],
                rawDetails: sanitizeText(JSON.stringify(err, Object.getOwnPropertyNames(err)))
            });
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        playSound("click");
        setAuthErrorDetails(null);

        const cleanRegEmail = regEmail.trim().toLowerCase();
        const cleanUsername = username.trim();

        if (!cleanUsername || !cleanRegEmail || !regPassword) {
            return showToast("KINDLY CAPTURE ALL REQUIRED IDENTITY VECTORS", "warning");
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email: cleanRegEmail,
                password: regPassword,
                options: { data: { username: cleanUsername } }
            });
            if (error) throw error;

            if (data?.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
            }
            if (data?.session?.access_token) {
                localStorage.setItem("mtl_auth_token", data.session.access_token);
            }

            showToast("Account Created Successfully! Redirecting to dashboard...", "success");
            triggerSecureTransition("/dashboard", "initializing new user profile...");
        } catch (err) {
            const sanitizedMsg = sanitizeText(err.message || "Database error saving new user");
            showToast(sanitizedMsg, "error");

            setAuthErrorDetails({
                title: "DATABASE REGISTRATION FAILURE",
                message: sanitizedMsg,
                code: err.status || err.code || 500,
                isDbError: true,
                email: cleanRegEmail,
                username: cleanUsername,
                timestamp: new Date().toISOString(),
                diagnosis: "The database returned a server or validation error while saving the new user profile.",
                troubleshooting: [
                    "Ensure email syntax is valid and password meets minimum character requirements (min 6 characters).",
                    "Check if this email address is already registered in the user system.",
                    "Verify network connectivity and retry registration."
                ],
                rawDetails: sanitizeText(JSON.stringify(err, Object.getOwnPropertyNames(err)))
            });
        }
    };

    const handleGoogleLogin = async () => {
        playSound("click");
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin }
        });
        if (error) showToast(sanitizeText(error.message), "error");
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
        return { name: "User", email: "developer01@gmail.com" };
    };

    const aiTexts = ["Welcome to the community", "let's earn together"];

    // Floating Voice Listening Overlay Component
    const renderListeningOverlay = (targetName) => {
        if (isListening && activeVoiceTarget === targetName) {
            return (
                <div className="mtl-toast listening-toast-container">
                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
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
                    --card-bg: linear-gradient(160deg, rgba(15, 23, 42, 0.90), rgba(6, 11, 25, 0.94));
                    --neon-cyan: #00f5d4;
                    --neon-blue: #38bdf8;
                    --neon-purple: #a855f7;
                    --text-main: #f8fafc;
                    --text-muted: #94a3b8;
                    --border-glow: rgba(56, 189, 248, 0.25);
                    --glass-border: rgba(255, 255, 255, 0.12);
                }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                
                .auth-page-wrapper {
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

                .fullscreen-stadium-canvas-container {
                    position: fixed;
                    inset: 0;
                    width: 100vw;
                    height: 100vh;
                    z-index: 0;
                    pointer-events: none;
                }

                .cursor-glow {
                    position: fixed; width: 600px; height: 600px;
                    background: radial-gradient(circle, rgba(0, 245, 212, 0.07), rgba(168, 85, 247, 0.05), transparent 70%);
                    border-radius: 50%; pointer-events: none; z-index: 2;
                    transform: translate(-50%, -50%); transition: width 0.3s, height 0.3s;
                }

                .auth-container {
                    position: relative; z-index: 10; width: 100%; max-width: 480px; padding: 20px;
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
                    border-radius: 28px; padding: 38px 30px; width: 100%; position: relative; overflow: visible;
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
                
                .auth-header { text-align: center; margin-bottom: 28px; }
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
                    border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 24px;
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

                .form-group { margin-bottom: 18px; position: relative; }
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
                
                .password-toggle {
                    background: transparent; border: none; color: var(--neon-cyan);
                    font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 800;
                    letter-spacing: 1px; cursor: pointer; padding: 0 8px; flex-shrink: 0;
                }
                #strengthMeter {
                    display: flex; gap: 4px; height: 4px; margin-top: 8px; width: 100%;
                }
                .strength-bar {
                    flex: 1; height: 100%; background: rgba(255, 255, 255, 0.1); border-radius: 2px; transition: background-color 0.3s;
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
                    display: flex; align-items: center; text-align: center; margin: 24px 0;
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

                /* Diagnostic Error Details Console Card */
                .diagnostic-error-card {
                    margin-top: 20px;
                    background: rgba(15, 23, 42, 0.95);
                    border: 1px solid rgba(239, 68, 68, 0.5);
                    box-shadow: 0 10px 30px rgba(239, 68, 68, 0.15);
                    border-radius: 16px;
                    padding: 18px;
                    color: #f8fafc;
                    animation: mtlSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .diagnostic-title {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 12px;
                    font-weight: 900;
                    letter-spacing: 1.5px;
                    color: #f87171;
                    margin-bottom: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .diagnostic-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    font-size: 11px;
                    color: #94a3b8;
                    margin-bottom: 12px;
                    border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
                    padding-bottom: 8px;
                }
                .diagnostic-narrative {
                    font-size: 12.5px;
                    line-height: 1.5;
                    color: #cbd5e1;
                    margin-bottom: 12px;
                }
                .diagnostic-list {
                    margin-left: 16px;
                    margin-bottom: 14px;
                    font-size: 12px;
                    color: #94a3b8;
                    line-height: 1.6;
                }
                .diagnostic-btn-group {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .diagnostic-btn {
                    padding: 8px 12px;
                    font-size: 11px;
                    font-weight: 800;
                    font-family: 'Orbitron', sans-serif;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    background: #1e293b;
                    color: #f1f5f9;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .diagnostic-btn:hover {
                    background: #334155;
                    border-color: rgba(0, 245, 212, 0.4);
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
                    position: fixed; inset: 0; background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px); z-index: 100000;
                    display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
                    padding-bottom: 40px;
                }

                .stadium-hud-card {
                    width: 440px; max-width: 90vw; background: rgba(15, 23, 42, 0.92);
                    border: 1px solid rgba(0, 245, 212, 0.4); border-radius: 24px; padding: 22px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 245, 212, 0.2); 
                    display: flex; flex-direction: column; gap: 12px;
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

                /* Floating Toast Banner */
                .mtl-toast-floating {
                    position: fixed; top: 20px; right: 20px; z-index: 999999;
                    background: #0f172a; border: 1px solid rgba(0, 245, 212, 0.5);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 245, 212, 0.2);
                    border-radius: 14px; padding: 14px 20px; color: #ffffff; font-size: 13px;
                    font-weight: 700; display: flex; align-items: center; gap: 12px;
                    animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes toastSlideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

                @keyframes mtlSlideIn{ from{ transform: translateX(120px); opacity:0; } to{ transform: translateX(0); opacity:1; } }
                
                @media (max-width: 480px) {
                    .auth-card { padding: 30px 20px; border-radius: 22px; }
                }
            `}</style>

            <div className="cursor-glow" ref={glowRef}></div>

            {/* FLOATING TOAST NOTIFICATION */}
            {toastMessage && (
                <div className="mtl-toast-floating" style={{ borderColor: toastType === "error" ? "#ef4444" : toastType === "warning" ? "#f59e0b" : "var(--neon-cyan)" }}>
                    <span style={{ color: toastType === "error" ? "#ef4444" : toastType === "warning" ? "#f59e0b" : "var(--neon-cyan)" }}>
                        {toastType === "error" ? "❌" : toastType === "warning" ? "⚠️" : "⚡"}
                    </span>
                    <span>{toastMessage}</span>
                </div>
            )}

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

            {/* FULL-SCREEN STADIUM PROCESS LOADER */}
            {isLoading && (
                <div id="globalProcessLoader">
                    <div className="stadium-hud-card">
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

            {/* VERIFYING SESSION STATE */}
            {checkingSession ? (
                <div style={{ position: "relative", zIndex: 10, color: "var(--neon-cyan)", fontFamily: "Orbitron", fontSize: "12px", letterSpacing: "3px" }}>
                    VERIFYING SESSION NODE...
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
                                onClick={() => { playSound("click"); setAuthMode("login"); setAuthErrorDetails(null); }}
                            >
                                SIGN IN
                            </button>
                            <button 
                                className={authMode === "register" ? "active" : ""} 
                                onClick={() => { playSound("click"); setAuthMode("register"); setAuthErrorDetails(null); }}
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
                                                placeholder="Type email here"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value.toLowerCase())}
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
                                                placeholder="Enter username"
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
                                        <label>EMAIL ADDRESS</label>
                                        <div className="input-wrapper">
                                            <input 
                                                type="email" 
                                                className="form-control" 
                                                placeholder="Enter email"
                                                value={regEmail}
                                                onChange={(e) => setRegEmail(e.target.value.toLowerCase())}
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
                                        <label>CREATE PASSWORD</label>
                                        <div className="input-wrapper">
                                            <input 
                                                type={showRegPassword ? "text" : "password"} 
                                                className="form-control" 
                                                placeholder="Enter password"
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

                        {/* DETAILED DIAGNOSTIC ERROR CONSOLE (NO VENDOR SPECIFIC HINTS) */}
                        {authErrorDetails && (
                            <div className="diagnostic-error-card">
                                <div className="diagnostic-title">
                                    <span>⚠️ {authErrorDetails.title}</span>
                                    <span style={{ fontSize: '10px', color: '#fca5a5' }}>CODE {authErrorDetails.code}</span>
                                </div>
                                <div className="diagnostic-meta">
                                    <span>User: <strong>{authErrorDetails.email}</strong></span>
                                    {authErrorDetails.username && <span>Name: <strong>{authErrorDetails.username}</strong></span>}
                                    <span>Time: {new Date(authErrorDetails.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="diagnostic-narrative">{authErrorDetails.diagnosis}</p>
                                <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px', color: 'var(--neon-cyan)', marginBottom: '6px', fontFamily: 'Orbitron' }}>
                                    RECOMMENDED ACTION ITEMS:
                                </div>
                                <ul className="diagnostic-list">
                                    {authErrorDetails.troubleshooting.map((step, idx) => (
                                        <li key={idx}>{step}</li>
                                    ))}
                                </ul>
                                <div className="diagnostic-btn-group">
                                    <button 
                                        type="button" 
                                        className="diagnostic-btn"
                                        onClick={() => {
                                            navigator.clipboard.writeText(JSON.stringify(authErrorDetails, null, 2));
                                            showToast("Diagnostic payload copied to clipboard", "success");
                                        }}
                                    >
                                        📋 COPY DIAGNOSTIC PAYLOAD
                                    </button>
                                    <button 
                                        type="button" 
                                        className="diagnostic-btn"
                                        style={{ color: '#ef4444' }}
                                        onClick={() => setAuthErrorDetails(null)}
                                    >
                                        ✕ DISMISS
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="auth-divider">OR CONNECT VIA</div>

                        <div className="btn-secondary-group">
                            <button className="btn-alt" onClick={handleGoogleLogin}>
                                CONTINUATION WITH GOOGLE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
