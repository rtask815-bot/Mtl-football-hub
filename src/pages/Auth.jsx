import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

// Supabase Initialization
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GROQ_API_KEY = "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";
const TARGET_MODEL = "llama-3.3-70b-versatile";

export default function Auth() {
    const navigate = useNavigate();

    // State Management
    const [authMode, setAuthMode] = useState("login"); // 'login' or 'register'
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

    // Loaders, Modals, and Advanced Security/Features
    const [isLoading, setIsLoading] = useState(false);
    const [loaderText, setLoaderText] = useState("connecting...");
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [phoneInput, setPhoneInput] = useState("");
    const [nameInput, setNameInput] = useState("");
    const [otpInput, setOtpInput] = useState("");
    const [resendLock, setResendLock] = useState(false);
    const authStateRef = useRef({ phone: "", name: "" });

    // Enhanced Features: Biometric simulation / Session Persistence Toggle
    const [rememberDevice, setRememberDevice] = useState(true);

    // Chat Console States
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatQuery, setChatQuery] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [isChatProcessing, setIsChatProcessing] = useState(false);
    const chatFeedRef = useRef(null);

    // Refs for animations
    const canvasRef = useRef(null);
    const glowRef = useRef(null);

    // Dynamic Header Rotating Text
    useEffect(() => {
        const aiTexts = ["Welcome to the community", "let's earn together"];
        const interval = setInterval(() => {
            setAiTextIndex((prev) => (prev + 1) % aiTexts.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Mouse Cursor Glow Tracker
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

    // ============================================================
    // SPACESHIP VIEWPORT 3D CANVAS ANIMATION (Optimized & Interactive)
    // ============================================================
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        let animationFrameId;
        let W = window.innerWidth;
        let H = window.innerHeight;
        const FOV = 350;
        const shipSpeed = 12;

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
            targetOffsetX = -mouseX * 100;
            targetOffsetY = -mouseY * 60;
        };
        window.addEventListener('mousemove', handleMouseMove);

        // Initialize 3D Stars
        const NUM_STARS = Math.min(800, Math.floor((W * H) / 1500));
        const stars3D = Array.from({ length: NUM_STARS }, () => ({
            x: (Math.random() - 0.5) * 3000,
            y: (Math.random() - 0.5) * 3000,
            z: Math.random() * 2000 + 10,
            size: Math.random() * 1.5 + 0.5,
            color: Math.random() > 0.8 ? '#8edcff' : Math.random() > 0.9 ? '#ffb366' : '#ffffff'
        }));

        const spacePlanets = [
            { x: -600, y: -200, z: 1800, r: 160, color1: '#2255aa', color2: '#0b1d3a', atmosphere: '#00e2ff' },
            { x: 800, y: 350, z: 2800, r: 240, color1: '#aa4422', color2: '#3d1205', atmosphere: '#ff7733' }
        ];

        const renderFrame = () => {
            currentOffsetX += (targetOffsetX - currentOffsetX) * 0.05;
            currentOffsetY += (targetOffsetY - currentOffsetY) * 0.05;

            const cx = W / 2 + currentOffsetX;
            const cy = H / 2 + currentOffsetY;

            const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H));
            bgGrad.addColorStop(0, '#04091a');
            bgGrad.addColorStop(0.6, '#02040b');
            bgGrad.addColorStop(1, '#000103');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            // Render Planets
            for (let p of spacePlanets) {
                p.z -= shipSpeed * 0.3;
                if (p.z <= -200) p.z = 3500;
                let k = FOV / p.z;
                let px = p.x * k + cx;
                let py = p.y * k + cy;
                let size = p.r * k;
                if (px + size * 2 > 0 && px - size * 2 < W && py + size * 2 > 0 && py - size * 2 < H) {
                    let atmoGrad = ctx.createRadialGradient(px, py, size * 0.9, px, py, size * 1.25);
                    atmoGrad.addColorStop(0, p.atmosphere);
                    atmoGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = atmoGrad;
                    ctx.beginPath();
                    ctx.arc(px, py, size * 1.25, 0, Math.PI * 2);
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

            // Render Stars
            for (let s of stars3D) {
                s.z -= shipSpeed;
                if (s.z <= 1) {
                    s.z = 2000;
                    s.x = (Math.random() - 0.5) * 3000;
                    s.y = (Math.random() - 0.5) * 3000;
                }
                let k = FOV / s.z;
                let px = s.x * k + cx;
                let py = s.y * k + cy;
                if (px >= 0 && px <= W && py >= 0 && py <= H) {
                    let size = (1 - s.z / 2000) * s.size * 2;
                    let alpha = Math.min(1, (1 - s.z / 2000) * 1.2);
                    let prevK = FOV / (s.z + shipSpeed * 1.5);
                    let prevX = s.x * prevK + cx;
                    let prevY = s.y * prevK + cy;

                    ctx.strokeStyle = s.color;
                    ctx.globalAlpha = alpha;
                    ctx.lineWidth = Math.max(0.5, size * 0.8);
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

    // Password Strength Meter Handler
    useEffect(() => {
        let score = 0;
        if (regPassword.length >= 6) score++;
        if (/[A-Z]/.test(regPassword)) score++;
        if (/[0-9]/.test(regPassword)) score++;
        if (/[^A-Za-z0-9]/.test(regPassword)) score++;
        setPasswordScore(score);
    }, [regPassword]);

    // Check Active Session on Mount
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setActiveSessionUser(session.user);
                setShowSessionModal(true);
            }
        };
        checkSession();
    }, []);

    const triggerSecureTransition = (targetPath, outputText) => {
        setLoaderText(outputText);
        setIsLoading(true);
        setTimeout(() => {
            navigate(targetPath);
        }, 2200);
    };

    // Toast Notification Utility
    const showToast = (message, type = "info") => {
        document.querySelectorAll(".mtl-toast").forEach((t) => t.remove());
        const el = document.createElement("div");
        el.className = "mtl-toast";
        const theme = type === "success" 
            ? { border: "#00f5d4", glow: "rgba(0,245,212,0.2)" } 
            : type === "error" 
            ? { border: "#ef4444", glow: "rgba(239,68,68,0.2)" } 
            : { border: "#38bdf8", glow: "rgba(56,189,248,0.2)" };

        Object.assign(el.style, {
            position: "fixed", top: "24px", right: "24px", width: "340px", maxWidth: "90vw",
            padding: "18px", borderRadius: "16px", background: "rgba(17, 24, 39, 0.95)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            boxShadow: `0 20px 40px rgba(0,0,0,.5), 0 0 15px ${theme.glow}`,
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

    // OTP Handlers
    const isValidE164 = (phone) => /^\+[1-9]\d{6,14}$/.test(phone);
    const normalizeOtpError = (error) => {
        const msg = (error?.message || "").toLowerCase();
        if (msg.includes("21608") || msg.includes("unverified")) return "This number has not verified by our system. Please use a verified phone number or sign in using other methods.";
        if (msg.includes("invalid")) return "Incorrect verification code. Please try again.";
        if (msg.includes("rate") || msg.includes("limit")) return "Too many attempts. Please wait a moment and try again.";
        return "Verification service is currently unavailable. Please try again later.";
    };

    const handleStartOtpFlow = async () => {
        if (!phoneInput || !nameInput) return showToast("Please fill all fields", "warning");
        if (!isValidE164(phoneInput)) return showToast("Invalid phone format", "error");

        authStateRef.current = { phone: phoneInput, name: nameInput };
        showToast("Sending secure OTP...", "info");

        const { error } = await supabase.auth.signInWithOtp({
            phone: phoneInput,
            options: { data: { full_name: nameInput } }
        });
        if (error) return showToast(normalizeOtpError(error), "error");
        showToast("OTP delivered successfully", "success");
    };

    const handleVerifyOtpFlow = async () => {
        if (!otpInput) return showToast("Enter verification code", "warning");
        showToast("Verifying identity...", "info");

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
            navigate("/dashboard");
        }, 900);
    };

    const handleResendOtp = async () => {
        if (resendLock) return showToast("Please wait...", "info");
        setResendLock(true);
        showToast("Resending OTP...", "info");

        const { error } = await supabase.auth.signInWithOtp({
            phone: authStateRef.current.phone,
            options: { data: { full_name: authStateRef.current.name } }
        });
        if (error) {
            setResendLock(false);
            return showToast(normalizeOtpError(error), "error");
        }
        showToast("OTP resent", "success");
        setTimeout(() => setResendLock(false), 15000);
    };

    // Authentication Actions
    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) return showToast("REQUIRED IDENTITIES MISSING", "warning");
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            showToast("Account connected successfully ✔️", "success");
            localStorage.setItem("user", JSON.stringify(data.user));
            if (data.session?.access_token) {
                localStorage.setItem("mtl_auth_token", data.session.access_token);
            }
            triggerSecureTransition("/dashboard", "processing...");
        } catch (err) {
            showToast(err.message, "error");
            setIsLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!username || !regEmail || !regPassword) return showToast("KINDLY CAPTURE ALL REQUIRED IDENTITY VECTORS", "warning");
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: regEmail,
                password: regPassword,
                options: { data: { username } }
            });
            if (error) throw error;
            showToast("NEW USER REGISTERED", "success");
            setAuthMode("login");
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin }
        });
        if (error) showToast(error.message, "error");
    };

    // Chat Assistant Handlers with Session Recognition
    const getActiveSessionIdentity = () => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                const name = parsed.user_metadata?.username || parsed.user_metadata?.full_name || parsed.email?.split("@")[0];
                const emailVal = parsed.email;
                return { name: name || "Operator", email: emailVal || "Unregistered" };
            } catch (e) {
                return { name: "Operator", email: "Unknown" };
            }
        }
        if (activeSessionUser) {
            const name = activeSessionUser.user_metadata?.username || activeSessionUser.user_metadata?.full_name || activeSessionUser.email?.split("@")[0];
            return { name: name || "Operator", email: activeSessionUser.email || "Unregistered" };
        }
        return { name: "GUEST OPERATOR", email: "Guest Session" };
    };

    const openChatConsole = () => {
        if (!isChatOpen) {
            const identity = getActiveSessionIdentity();
            const currentTimestampString = new Date().toLocaleString();
            setChatMessages([
                {
                    role: "system",
                    content: `You are Mr Mourice, MTL Football Predictions Authorization dashboard technician. User Name: ${identity.name}, Email: ${identity.email}. Use internal dashboard knowledge context layers. Be concise, structured, and helpful. Analysis Temporal Benchmark Timestamp: "${currentTimestampString}".`
                },
                { role: "bubble-ai", text: `Hello ${identity.name} (${identity.email}), how are you doing today?` }
            ]);
            setIsChatOpen(true);
        } else {
            setIsChatOpen(false);
        }
    };

    const executeNeuralGrokQuery = async () => {
        const prompt = chatQuery.trim();
        if (!prompt || isChatProcessing) return;

        setIsChatProcessing(true);
        const newMessages = [...chatMessages, { role: "bubble-user", text: prompt }];
        setChatMessages(newMessages);
        setChatQuery("");

        try {
            const apiMessages = newMessages.map(m => ({
                role: m.role === "bubble-user" ? "user" : m.role === "bubble-ai" ? "assistant" : "system",
                content: m.text
            }));

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: TARGET_MODEL,
                    messages: apiMessages,
                    temperature: 0.5,
                    max_tokens: 600,
                    stream: false
                })
            });

            const raw = await response.text();
            if (!response.ok) {
                setChatMessages(prev => [...prev, { role: "bubble-ai", text: `System Error ${response.status}: ${raw}` }]);
                return;
            }

            const data = JSON.parse(raw);
            const output = data?.choices?.[0]?.message?.content || "No response received.";
            setChatMessages(prev => [...prev, { role: "bubble-ai", text: output }]);
        } catch (err) {
            setChatMessages(prev => [...prev, { role: "bubble-ai", text: "Network error: Unable to reach AI service." }]);
        } finally {
            setIsChatProcessing(false);
            if (chatFeedRef.current) {
                chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
            }
        }
    };

    const aiTexts = ["Welcome to the community", "let's earn together"];

    return (
        <div className="auth-page-wrapper">
            <style>{`
                :root {
                    --bg-dark: #030712;
                    --card-bg: rgba(17, 24, 39, 0.6);
                    --neon-cyan: #00f5d4;
                    --neon-blue: #38bdf8;
                    --neon-purple: #a855f7;
                    --text-main: #f9fafb;
                    --text-muted: #9ca3af;
                    --border-glow: rgba(56, 189, 248, 0.15);
                    --glass-border: rgba(255, 255, 255, 0.06);
                }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                .auth-page-wrapper {
                    background-color: var(--bg-dark);
                    color: var(--text-main);
                    font-family: 'Inter', sans-serif;
                    min-height: 100dvh;
                    width: 100%;
                    overflow-x: hidden;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                }
                #particles { position: fixed; inset: 0; z-index: 1; pointer-events: none; }
                .cursor-glow {
                    position: fixed; width: 500px; height: 500px;
                    background: radial-gradient(circle, rgba(168, 85, 247, 0.08), transparent 70%);
                    border-radius: 50%; pointer-events: none; z-index: 2;
                    transform: translate(-50%, -50%); transition: width 0.3s, height 0.3s;
                }
                .auth-container {
                    position: relative; z-index: 10; width: 100%; max-width: 460px; padding: 24px;
                    display: flex; flex-direction: column; justify-content: center;
                }
                .auth-card {
                    background: var(--card-bg); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
                    border: 1px solid var(--glass-border);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 50px rgba(56, 189, 248, 0.03);
                    border-radius: 24px; padding: 40px 32px; width: 100%; position: relative; overflow: hidden;
                }
                .auth-card::before {
                    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px;
                    background: linear-gradient(90deg, transparent, var(--neon-blue), var(--neon-purple), transparent);
                }
                .auth-header { text-align: center; margin-bottom: 32px; }
                .auth-header h1 {
                    font-family: 'Orbitron', sans-serif; font-size: 26px; font-weight: 900; letter-spacing: 2px;
                    background: linear-gradient(135deg, #ffffff 40%, var(--neon-blue));
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;
                }
                #aiText {
                    font-size: 11px; font-family: 'Orbitron', sans-serif; letter-spacing: 2px;
                    text-transform: uppercase; color: var(--neon-cyan); height: 16px;
                    text-shadow: 0 0 10px rgba(0, 245, 212, 0.3);
                }
                .nav-switch {
                    display: flex; background: rgba(0, 0, 0, 0.4); padding: 4px;
                    border-radius: 12px; border: 1px solid var(--glass-border); margin-bottom: 28px;
                }
                .nav-switch button {
                    flex: 1; background: transparent; border: none; color: var(--text-muted);
                    padding: 12px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;
                    border-radius: 9px; cursor: pointer; transition: all 0.25s ease;
                }
                .nav-switch button.active {
                    color: #ffffff; background: rgba(56, 189, 248, 0.12);
                    border: 1px solid rgba(56, 189, 248, 0.25); text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
                }
                .form-group { margin-bottom: 20px; position: relative; }
                .form-group label {
                    display: block; font-size: 11px; font-weight: 700; text-transform: uppercase;
                    letter-spacing: 1.5px; color: var(--text-muted); margin-bottom: 8px;
                }
                .input-wrapper { position: relative; display: flex; align-items: center; width: 100%; }
                .form-control {
                    width: 100%; padding: 14px 16px; background: rgba(3, 7, 18, 0.6);
                    border: 1px solid var(--glass-border); border-radius: 12px; color: #ffffff;
                    font-size: 14px; font-family: 'Inter', sans-serif; transition: all 0.3s ease;
                }
                .form-control:focus {
                    outline: none; border-color: var(--neon-blue);
                    box-shadow: 0 0 20px rgba(56, 189, 248, 0.15); background: rgba(3, 7, 18, 0.85);
                }
                .password-toggle {
                    position: absolute; right: 16px; font-size: 11px; font-weight: 700;
                    font-family: 'Orbitron', sans-serif; letter-spacing: 0.5px; color: var(--neon-blue);
                    background: transparent; border: none; cursor: pointer;
                }
                .extra-options-row {
                    display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 12px;
                }
                .remember-me-label {
                    display: flex; align-items: center; gap: 6px; color: var(--text-muted); cursor: pointer;
                }
                .forgot-password-link { font-weight: 600; color: var(--text-muted); text-decoration: none; transition: color 0.2s ease; }
                .forgot-password-link:hover { color: var(--neon-blue); text-shadow: 0 0 8px rgba(56, 189, 248, 0.4); }
                #strengthMeter { display: flex; gap: 6px; margin-top: 8px; }
                .strength-bar { flex: 1; height: 4px; border-radius: 2px; background-color: rgba(255, 255, 255, 0.05); transition: background-color 0.4s ease; }
                .btn-prime {
                    width: 100%; padding: 15px; background: linear-gradient(90deg, #1d4ed8, #0ea5e9);
                    border: none; border-radius: 12px; color: #ffffff; font-size: 14px; font-weight: 700;
                    letter-spacing: 1px; font-family: 'Orbitron', sans-serif; cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); margin-top: 8px;
                    box-shadow: 0 4px 20px rgba(29, 78, 216, 0.3);
                }
                .btn-prime:hover:not(:disabled) {
                    transform: translateY(-1px); box-shadow: 0 6px 24px rgba(14, 165, 233, 0.45); filter: brightness(1.15);
                }
                .btn-prime:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
                .auth-divider {
                    display: flex; align-items: center; text-align: center; margin: 28px 0;
                    font-size: 11px; color: var(--text-muted); letter-spacing: 2px; text-transform: uppercase;
                    font-family: 'Orbitron', sans-serif;
                }
                .auth-divider::before, .auth-divider::after { content: ''; flex: 1; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
                .auth-divider:not(:empty)::before { margin-right: 1em; }
                .auth-divider:not(:empty)::after { margin-left: 1em; }
                .btn-secondary-group { display: flex; flex-direction: column; gap: 12px; }
                .btn-alt {
                    width: 100%; padding: 13px; background: rgba(255, 255, 255, 0.02);
                    border: 1px solid var(--glass-border); border-radius: 12px; color: #ffffff;
                    font-size: 13px; font-weight: 600; display: flex; align-items: center;
                    justify-content: center; gap: 12px; cursor: pointer; transition: all 0.25s ease;
                }
                .btn-alt:hover {
                    background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.15);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                }

                /* ============================================================
                   Animated Section Dividers for Modals
                   ============================================================ */
                .animated-section-divider {
                    position: relative;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, var(--neon-blue), var(--neon-purple), transparent);
                    background-size: 200% 100%;
                    animation: dividerShimmer 3s linear infinite;
                    margin: 16px 0;
                }
                @keyframes dividerShimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                .premium-modal-overlay {
                    position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
                    background: rgba(2, 6, 23, 0.8); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
                    z-index: 99999; padding: 20px;
                }
                .premium-modal-card {
                    width: 100%; max-width: 400px; padding: 32px; border-radius: 24px;
                    background: linear-gradient(145deg, rgba(17, 24, 39, 0.98), rgba(3, 7, 18, 0.99));
                    border: 1px solid rgba(56, 189, 248, 0.2); box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.05);
                    color: #ffffff; position: relative; overflow: hidden;
                }
                #globalProcessLoader {
                    position: fixed; inset: 0; background: var(--bg-dark); z-index: 100000;
                    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px;
                }
                .spinner-ring {
                    width: 56px; height: 56px; border: 3px solid rgba(56, 189, 248, 0.08);
                    border-top-color: var(--neon-blue); border-radius: 50%; animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                #loaderText {
                    font-family: 'Orbitron', sans-serif; font-size: 13px; letter-spacing: 4px;
                    color: var(--neon-blue); text-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
                }
                #chatLauncherBtn {
                    position: fixed; bottom: 24px; right: 24px; z-index: 999; width: 56px; height: 56px;
                    border-radius: 50%; background: linear-gradient(135deg, var(--neon-purple), #2563eb);
                    border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(168, 85, 247, 0.35);
                    display: flex; align-items: center; justify-content: center; cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                #chatLauncherBtn:hover { transform: scale(1.06) rotate(5deg); box-shadow: 0 15px 35px rgba(168, 85, 247, 0.5); }
                #aiChatConsole {
                    position: fixed; bottom: 96px; right: 24px; width: 380px; height: 520px;
                    max-width: calc(100vw - 48px); max-height: calc(100dvh - 130px);
                    background: rgba(10, 15, 30, 0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(168, 85, 247, 0.2); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
                    border-radius: 20px; z-index: 1000; display: flex; flex-direction: column; overflow: hidden;
                    transform: translateY(20px) scale(0.96); opacity: 0; pointer-events: none;
                    transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
                }
                #aiChatConsole.open { transform: translateY(0) scale(1); opacity: 1; pointer-events: auto; }
                .chat-header {
                    padding: 18px; background: rgba(168, 85, 247, 0.08);
                    border-bottom: 1px solid rgba(168, 85, 247, 0.15); display: flex; justify-content: space-between; align-items: center;
                }
                .chat-title h3 { font-family: 'Orbitron', sans-serif; font-size: 13px; letter-spacing: 1.5px; color: #ffffff; }
                .chat-title p { font-size: 11px; color: var(--neon-purple); margin-top: 2px; }
                #closeChatConsole { background: transparent; border: none; color: var(--text-muted); font-size: 22px; cursor: pointer; }
                #chatFeedStream { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
                .chat-bubble { max-width: 85%; padding: 12px 16px; border-radius: 14px; font-size: 13.5px; line-height: 1.55; word-wrap: break-word; }
                .bubble-ai { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); align-self: flex-start; color: #f3f4f6; }
                .bubble-user { background: linear-gradient(135deg, var(--neon-purple), #1d4ed8); align-self: flex-end; color: #ffffff; }
                .chat-input-area { padding: 14px; border-top: 1px solid rgba(255, 255, 255, 0.05); display: flex; gap: 10px; background: rgba(0, 0, 0, 0.25); }
                #chatUserQuery {
                    flex: 1; background: rgba(3, 7, 18, 0.7); border: 1px solid var(--glass-border);
                    border-radius: 10px; padding: 12px; color: #ffffff; font-size: 13.5px; font-family: 'Inter', sans-serif;
                }
                #chatUserQuery:focus { outline: none; border-color: var(--neon-purple); }
                #chatSendPayloadBtn {
                    background: var(--neon-purple); border: none; border-radius: 10px; padding: 0 18px;
                    color: #ffffff; font-weight: 700; font-family: 'Orbitron', sans-serif; font-size: 11px; cursor: pointer;
                }
                @keyframes mtlSlideIn{ from{ transform: translateX(120px); opacity:0; } to{ transform: translateX(0); opacity:1; } }
                @keyframes mtlSlideOut{ to{ transform: translateX(120px); opacity:0; } }
                @media (max-width: 480px) {
                    .auth-card { padding: 32px 20px; border-radius: 20px; }
                    #aiChatConsole { right: 16px; bottom: 84px; width: calc(100vw - 32px); }
                }
            `}</style>

            <canvas id="particles" ref={canvasRef}></canvas>
            <div className="cursor-glow" ref={glowRef}></div>

            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <h1>MTL FOOTBALL HUB </h1>
                        <div id="aiText">{aiTexts[aiTextIndex]}</div>
                    </div>

                    <div className="nav-switch">
                        <button 
                            className={authMode === "login" ? "active" : ""} 
                            onClick={() => setAuthMode("login")}
                        >
                            SIGN IN
                        </button>
                        <button 
                            className={authMode === "register" ? "active" : ""} 
                            onClick={() => setAuthMode("register")}
                        >
                            REGISTER
                        </button>
                    </div>

                    {authMode === "login" ? (
                        <form onSubmit={handleLogin} id="loginBox">
                            <div className="form-group">
                                <label>User Email</label>
                                <div className="input-wrapper">
                                    <input 
                                        type="email" 
                                        className="form-control" 
                                        placeholder="name@domain.tech"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Cipher Key (password)</label>
                                <div className="input-wrapper">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        className="form-control" 
                                        placeholder="••••••••"
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
                                <div className="extra-options-row">
                                    <label className="remember-me-label">
                                        <input 
                                            type="checkbox" 
                                            checked={rememberDevice} 
                                            onChange={(e) => setRememberDevice(e.target.checked)} 
                                        /> 
                                        Remember Device
                                    </label>
                                    <a href="/reset-password" onClick={(e) => { e.preventDefault(); navigate("/reset-password"); }} className="forgot-password-link">RESET PASSWORD</a>
                                </div>
                            </div>
                            <button type="submit" className="btn-prime" disabled={isLoading}>LOGIN</button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} id="registerBox">
                            <div className="form-group">
                                <label>USERNAME</label>
                                <div className="input-wrapper">
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="operator_01"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>EMAIL</label>
                                <div className="input-wrapper">
                                    <input 
                                        type="email" 
                                        className="form-control" 
                                        placeholder="operator@domain.tech"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>PASSWORD</label>
                                <div className="input-wrapper">
                                    <input 
                                        type={showRegPassword ? "text" : "password"} 
                                        className="form-control" 
                                        placeholder="••••••••"
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
                    )}

                    <div className="auth-divider">ALTERNATIVES</div>

                    <div className="btn-secondary-group">
                        <button type="button" onClick={handleGoogleLogin} className="btn-alt">
                            <svg width="16" height="16" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            Sign in With Google
                        </button>
                        <button type="button" onClick={() => setIsOtpModalOpen(true)} className="btn-alt">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            Out-Of-Band OTP Signin
                        </button>
                    </div>
                </div>
            </div>

            {showSessionModal && activeSessionUser && (
                <div className="premium-modal-overlay">
                    <div className="premium-modal-card" style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "Orbitron", fontSize: "16px", fontWeight: "800", letterSpacing: "1px" }}>Active Session Found</div>
                        <div className="animated-section-divider"></div>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "14px 0" }}>
                            An active session currently exists for <br />
                            <strong style={{ color: "var(--neon-blue)" }}>{activeSessionUser.email}</strong>
                            {activeSessionUser.user_metadata?.username && (
                                <> ({activeSessionUser.user_metadata.username})</>
                            )}
                        </p>
                        <div className="animated-section-divider"></div>
                        <button 
                            onClick={() => {
                                localStorage.setItem("user", JSON.stringify(activeSessionUser));
                                triggerSecureTransition("/dashboard", "REDIRECTING...");
                            }} 
                            className="btn-prime" 
                            style={{ marginBottom: "12px" }}
                        >
                            Continue to Dashboard
                        </button>
                        <button 
                            onClick={async () => {
                                await supabase.auth.signOut();
                                localStorage.removeItem("user");
                                localStorage.removeItem("mtl_auth_token");
                                setShowSessionModal(false);
                            }} 
                            className="btn-alt" 
                            style={{ fontSize: "12px", padding: "10px", borderColor: "rgba(239, 68, 68, 0.3)", color: "#ef4444" }}
                        >
                            Sign in with Another Account
                        </button>
                    </div>
                </div>
            )}

            {isOtpModalOpen && (
                <div className="premium-modal-overlay">
                    <div className="premium-modal-card">
                        <div style={{ fontFamily: "Orbitron", fontSize: "16px", fontWeight: "800", letterSpacing: "1px" }}>Identity Validation</div>
                        <div className="animated-section-divider"></div>
                        <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginBottom: "20px" }}>Verification requires multi-factor system checks.</p>

                        <div className="form-group">
                            <label>Phone number</label>
                            <input 
                                className="form-control" 
                                placeholder="+254700000000" 
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>User Name</label>
                            <input 
                                className="form-control" 
                                placeholder="Full Name" 
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                            />
                        </div>

                        <button onClick={handleStartOtpFlow} className="btn-prime" style={{ marginBottom: "16px" }}>Request Token Dispatch</button>
                        <div className="animated-section-divider"></div>

                        <div className="form-group">
                            <label>Received Verification Token</label>
                            <input 
                                className="form-control" 
                                placeholder="Enter 6-digit code" 
                                style={{ borderColor: "rgba(34,197,94,0.3)" }}
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value)}
                            />
                        </div>

                        <button onClick={handleVerifyOtpFlow} className="btn-prime" style={{ background: "linear-gradient(90deg, #16a34a, #22c55e)", boxShadow: "0 4px 15px rgba(22,163,74,0.3)", marginBottom: "10px" }}>Verify Node Authorization</button>
                        <button onClick={handleResendOtp} className="btn-alt" style={{ fontSize: "12px", padding: "10px", marginBottom: "10px" }}>Resend Request</button>
                        <button onClick={() => setIsOtpModalOpen(false)} className="btn-alt" style={{ background: "transparent", borderColor: "rgba(255,255,255,0.1)", fontSize: "12px", padding: "10px", color: "var(--text-muted)" }}>Abort Verification</button>
                    </div>
                </div>
            )}

            {isLoading && (
                <div id="globalProcessLoader">
                    <div className="spinner-ring"></div>
                    <div id="loaderText">{loaderText}</div>
                </div>
            )}

            <button id="chatLauncherBtn" onClick={openChatConsole} title="Query Terminal Assistant">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            </button>

            <div id="aiChatConsole" className={isChatOpen ? "open" : ""}>
                <div className="chat-header">
                    <div className="chat-title">
                        <h3>ASISTANT</h3>
                        <p>{getActiveSessionIdentity().name} ({getActiveSessionIdentity().email})</p>
                    </div>
                    <button id="closeChatConsole" onClick={() => setIsChatOpen(false)}>&times;</button>
                </div>
                <div id="chatFeedStream" ref={chatFeedRef}>
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`chat-bubble ${msg.role}`}>
                            {msg.text}
                        </div>
                    ))}
                    {isChatProcessing && (
                        <div className="chat-bubble bubble-ai">
                            <div className="typing-indicator"><span></span><span></span><span></span></div>
                        </div>
                    )}
                </div>
                <div className="chat-input-area">
                    <input 
                        type="text" 
                        id="chatUserQuery" 
                        placeholder="Ask Miss Vallery a question..." 
                        autoComplete="off"
                        value={chatQuery}
                        onChange={(e) => setChatQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && executeNeuralGrokQuery()}
                    />
                    <button id="chatSendPayloadBtn" onClick={executeNeuralGrokQuery}>SEND</button>
                </div>
            </div>
        </div>
    );
}
