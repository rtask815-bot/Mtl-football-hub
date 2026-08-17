import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

/* ============================================================
   SUPABASE
   ============================================================ */

const SUPABASE_URL =
    "https://dfcgbwfralikyqxzxlbd.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* ============================================================
   AUTH COMPONENT
   ============================================================ */

export default function Auth() {

    const navigate = useNavigate();

    /* --------------------------------------------------------
       AUTH STATE
       -------------------------------------------------------- */

    const [mode, setMode] = useState("login");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [username, setUsername] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");

    const [showLoginPassword, setShowLoginPassword] =
        useState(false);

    const [showRegisterPassword, setShowRegisterPassword] =
        useState(false);

    const [loading, setLoading] = useState(false);

    const [loaderText, setLoaderText] =
        useState("CONNECTING...");

    const [showLoader, setShowLoader] =
        useState(false);

    const [aiText, setAiText] =
        useState("CONNECTING...");

    /* --------------------------------------------------------
       OTP STATE
       -------------------------------------------------------- */

    const [showOtpModal, setShowOtpModal] =
        useState(false);

    const [phone, setPhone] = useState("");
    const [fullName, setFullName] = useState("");
    const [otp, setOtp] = useState("");

    const [otpSending, setOtpSending] =
        useState(false);

    const [otpVerifying, setOtpVerifying] =
        useState(false);

    const [resendLock, setResendLock] =
        useState(false);

    /* --------------------------------------------------------
       CHAT STATE
       -------------------------------------------------------- */

    const [chatOpen, setChatOpen] =
        useState(false);

    const [chatInput, setChatInput] =
        useState("");

    const [chatMessages, setChatMessages] =
        useState([]);

    const [chatProcessing, setChatProcessing] =
        useState(false);

    const chatFeedRef = useRef(null);

    const conversationHistory = useRef([]);


    /* ========================================================
       TOAST SYSTEM
       ======================================================== */

    const [toastData, setToastData] = useState(null);

    const toast = useCallback((message, type = "info") => {

        setToastData({
            id: Date.now(),
            message,
            type
        });

        window.setTimeout(() => {
            setToastData(null);
        }, 6000);

    }, []);


    /* ========================================================
       AI STATUS TEXT
       ======================================================== */

    useEffect(() => {

        const messages = [
            "WELCOME TO THE COMMUNITY",
            "LET'S EARN TOGETHER",
            "SECURE NODE INITIALIZED",
            "PREDICTION NETWORK ONLINE",
            "MTL INTELLIGENCE ACTIVE"
        ];

        let index = 0;

        const interval = window.setInterval(() => {

            index = (index + 1) % messages.length;

            setAiText(messages[index]);

        }, 3000);

        return () => window.clearInterval(interval);

    }, []);


    /* ========================================================
       CURSOR GLOW
       ======================================================== */

    const [cursor, setCursor] = useState({
        x: -500,
        y: -500
    });

    useEffect(() => {

        // Mouse only. Touch devices don't need cursor tracking.
        const handleMouseMove = (event) => {

            setCursor({
                x: event.clientX,
                y: event.clientY
            });

        };

        window.addEventListener(
            "mousemove",
            handleMouseMove,
            { passive: true }
        );

        return () => {
            window.removeEventListener(
                "mousemove",
                handleMouseMove
            );
        };

    }, []);


    /* ========================================================
       PASSWORD STRENGTH
       ======================================================== */

    const passwordStrength = useMemo(() => {

        const value = regPassword;

        let score = 0;

        if (value.length >= 6) score++;
        if (/[A-Z]/.test(value)) score++;
        if (/[0-9]/.test(value)) score++;
        if (/[^A-Za-z0-9]/.test(value)) score++;

        return score;

    }, [regPassword]);


    /* ========================================================
       SECURE TRANSITION
       ======================================================== */

    const secureNavigate = useCallback(
        (path, text = "REDIRECTING...") => {

            setLoaderText(text);
            setShowLoader(true);

            window.setTimeout(() => {
                navigate(path, { replace: true });
            }, 1200);

        },
        [navigate]
    );


    /* ========================================================
       SESSION CHECK
       ======================================================== */

    useEffect(() => {

        let mounted = true;

        const checkSession = async () => {

            const {
                data: { session }
            } = await supabase.auth.getSession();

            if (!mounted) return;

            if (session) {

                localStorage.setItem(
                    "user",
                    JSON.stringify(session.user)
                );

                secureNavigate(
                    "/dashboard",
                    "ACTIVE SESSION DETECTED..."
                );
            }
        };

        checkSession();

        const {
            data: listener
        } = supabase.auth.onAuthStateChange(
            (_event, session) => {

                if (session) {

                    localStorage.setItem(
                        "user",
                        JSON.stringify(session.user)
                    );

                }

            }
        );

        return () => {

            mounted = false;

            listener?.subscription?.unsubscribe();

        };

    }, [secureNavigate]);


    /* ========================================================
       LOGIN
       ======================================================== */

    const handleLogin = async (event) => {

        event.preventDefault();

        if (!email || !password) {
            toast(
                "REQUIRED IDENTITIES MISSING",
                "warning"
            );
            return;
        }

        setLoading(true);

        try {

            const {
                data,
                error
            } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password
            });

            if (error) throw error;

            if (data?.user) {

                localStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );
            }

            toast(
                "ACCOUNT CONNECTED SUCCESSFULLY",
                "success"
            );

            secureNavigate(
                "/dashboard",
                "AUTHENTICATING NODE..."
            );

        } catch (error) {

            toast(
                error?.message ||
                "AUTHENTICATION FAILED",
                "error"
            );

        } finally {

            setLoading(false);

        }
    };


    /* ========================================================
       REGISTER
       ======================================================== */

    const handleRegister = async (event) => {

        event.preventDefault();

        if (!username || !regEmail || !regPassword) {

            toast(
                "KINDLY CAPTURE ALL REQUIRED IDENTITY VECTORS",
                "warning"
            );

            return;
        }

        if (regPassword.length < 6) {

            toast(
                "PASSWORD MUST CONTAIN AT LEAST 6 CHARACTERS",
                "warning"
            );

            return;
        }

        setLoading(true);

        try {

            const {
                data,
                error
            } = await supabase.auth.signUp({

                email: regEmail.trim(),

                password: regPassword,

                options: {
                    data: {
                        username: username.trim()
                    }
                }

            });

            if (error) throw error;

            if (data?.session) {

                localStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );

                toast(
                    "ACCOUNT CREATED SUCCESSFULLY",
                    "success"
                );

                secureNavigate(
                    "/dashboard",
                    "INITIALIZING USER NODE..."
                );

            } else {

                toast(
                    "REGISTRATION COMPLETE — CHECK YOUR EMAIL",
                    "success"
                );

                setMode("login");

                setEmail(regEmail);

                setPassword("");

            }

        } catch (error) {

            toast(
                error?.message ||
                "REGISTRATION FAILED",
                "error"
            );

        } finally {

            setLoading(false);

        }
    };


    /* ========================================================
       GOOGLE AUTH
       ======================================================== */

    const handleGoogleLogin = async () => {

        setLoading(true);

        try {

            const {
                error
            } = await supabase.auth.signInWithOAuth({

                provider: "google",

                options: {
                    redirectTo:
                        `${window.location.origin}/dashboard`
                }

            });

            if (error) throw error;

        } catch (error) {

            toast(
                error?.message ||
                "GOOGLE AUTHENTICATION FAILED",
                "error"
            );

            setLoading(false);
        }
    };


    /* ========================================================
       OTP HELPERS
       ======================================================== */

    const isValidE164 = (value) => {

        return /^\+[1-9]\d{6,14}$/.test(
            value.trim()
        );

    };


    const normalizeOtpError = (error) => {

        const message =
            (error?.message || "").toLowerCase();

        if (
            message.includes("21608") ||
            message.includes("unverified")
        ) {

            return (
                "This number has not been verified by the " +
                "verification service."
            );

        }

        if (message.includes("invalid")) {
            return "Incorrect verification code.";
        }

        if (
            message.includes("rate") ||
            message.includes("limit")
        ) {

            return (
                "Too many attempts. Please wait before trying again."
            );

        }

        return (
            error?.message ||
            "Verification service unavailable."
        );

    };


    /* ========================================================
       SEND OTP
       ======================================================== */

    const handleSendOtp = async () => {

        if (!phone || !fullName) {

            toast(
                "PLEASE COMPLETE ALL IDENTITY FIELDS",
                "warning"
            );

            return;
        }

        if (!isValidE164(phone)) {

            toast(
                "INVALID E.164 PHONE FORMAT",
                "error"
            );

            return;
        }

        setOtpSending(true);

        try {

            const {
                error
            } = await supabase.auth.signInWithOtp({

                phone: phone.trim(),

                options: {
                    data: {
                        full_name: fullName.trim()
                    }
                }

            });

            if (error) throw error;

            toast(
                "OTP DELIVERED SUCCESSFULLY",
                "success"
            );

        } catch (error) {

            toast(
                normalizeOtpError(error),
                "error"
            );

        } finally {

            setOtpSending(false);

        }
    };


    /* ========================================================
       VERIFY OTP
       ======================================================== */

    const handleVerifyOtp = async () => {

        if (!otp.trim()) {

            toast(
                "ENTER VERIFICATION CODE",
                "warning"
            );

            return;
        }

        setOtpVerifying(true);

        try {

            const {
                data,
                error
            } = await supabase.auth.verifyOtp({

                phone: phone.trim(),

                token: otp.trim(),

                type: "sms"

            });

            if (error) throw error;

            if (data?.user) {

                localStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );

            }

            toast(
                "IDENTITY VERIFIED",
                "success"
            );

            setShowOtpModal(false);

            secureNavigate(
                "/dashboard",
                "NODE AUTHORIZATION COMPLETE..."
            );

        } catch (error) {

            toast(
                normalizeOtpError(error),
                "error"
            );

        } finally {

            setOtpVerifying(false);

        }
    };


    /* ========================================================
       RESEND OTP
       ======================================================== */

    const handleResendOtp = async () => {

        if (resendLock) {

            toast(
                "PLEASE WAIT BEFORE RESENDING",
                "info"
            );

            return;
        }

        if (!phone) {

            toast(
                "PHONE NUMBER REQUIRED",
                "warning"
            );

            return;
        }

        setResendLock(true);

        try {

            const {
                error
            } = await supabase.auth.signInWithOtp({

                phone,

                options: {
                    data: {
                        full_name: fullName
                    }
                }

            });

            if (error) throw error;

            toast(
                "OTP RESENT",
                "success"
            );

        } catch (error) {

            toast(
                normalizeOtpError(error),
                "error"
            );

        } finally {

            window.setTimeout(() => {
                setResendLock(false);
            }, 15000);

        }
    };


    /* ========================================================
       CHAT
       ======================================================== */

    useEffect(() => {

        if (!chatOpen) return;

        if (chatMessages.length === 0) {

            const stored =
                localStorage.getItem("user");

            let identity = "GUEST USER";

            if (stored) {

                try {

                    const user = JSON.parse(stored);

                    identity =
                        user?.user_metadata?.username ||
                        user?.user_metadata?.full_name ||
                        user?.email?.split("@")[0] ||
                        "GUEST USER";

                } catch {
                    identity = "GUEST USER";
                }
            }

            setChatMessages([
                {
                    role: "ai",
                    text:
                        `Hello ${identity}, how are you doing today?`
                }
            ]);

            conversationHistory.current = [
                {
                    role: "system",
                    content:
                        "You are the MTL Football Predictions " +
                        "dashboard assistant. Be concise, " +
                        "structured, technical and helpful."
                }
            ];
        }

    }, [chatOpen, chatMessages.length]);


    useEffect(() => {

        if (chatFeedRef.current) {

            chatFeedRef.current.scrollTop =
                chatFeedRef.current.scrollHeight;

        }

    }, [chatMessages, chatProcessing]);


    /* ========================================================
       AI REQUEST
       ======================================================== */

    const executeAiQuery = async () => {

        const prompt = chatInput.trim();

        if (!prompt || chatProcessing) return;

        setChatInput("");

        setChatMessages((previous) => [
            ...previous,
            {
                role: "user",
                text: prompt
            }
        ]);

        conversationHistory.current.push({
            role: "user",
            content: prompt
        });

        setChatProcessing(true);

        try {

            /*
             * IMPORTANT:
             *
             * Do NOT put your Groq API key here.
             *
             * Browser JavaScript is public.
             *
             * Your Cloudflare Worker should expose:
             *
             * POST /api/chat
             *
             * and keep GROQ_API_KEY in a Worker secret.
             */

            const response = await fetch(
                "/api/chat",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        messages:
                            conversationHistory.current
                    })
                }
            );

            if (!response.ok) {

                throw new Error(
                    `AI service returned ${response.status}`
                );

            }

            const data =
                await response.json();

            const output =
                data?.message ||
                data?.choices?.[0]?.message?.content ||
                "No response received.";

            setChatMessages((previous) => [
                ...previous,
                {
                    role: "ai",
                    text: output
                }
            ]);

            conversationHistory.current.push({
                role: "assistant",
                content: output
            });

        } catch (error) {

            setChatMessages((previous) => [
                ...previous,
                {
                    role: "ai",
                    text:
                        "Network error: unable to reach AI service."
                }
            ]);

        } finally {

            setChatProcessing(false);

        }
    };


    /* ========================================================
       PARTICLE ENGINE
       ======================================================== */

    const canvasRef = useRef(null);

    useEffect(() => {

        const canvas = canvasRef.current;

        if (!canvas) return;

        const context =
            canvas.getContext("2d");

        if (!context) return;

        let animationFrame;

        let width = 0;
        let height = 0;

        const particles = [];

        const isMobile =
            window.matchMedia(
                "(max-width: 600px)"
            ).matches;

        const particleCount =
            isMobile ? 42 : 85;


        const resize = () => {

            const ratio =
                Math.min(
                    window.devicePixelRatio || 1,
                    2
                );

            width = window.innerWidth;
            height = window.innerHeight;

            canvas.width =
                width * ratio;

            canvas.height =
                height * ratio;

            canvas.style.width =
                `${width}px`;

            canvas.style.height =
                `${height}px`;

            context.setTransform(
                ratio,
                0,
                0,
                ratio,
                0,
                0
            );

        };


        resize();

        window.addEventListener(
            "resize",
            resize,
            { passive: true }
        );


        for (
            let i = 0;
            i < particleCount;
            i++
        ) {

            particles.push({

                x:
                    Math.random() * width,

                y:
                    Math.random() * height,

                dx:
                    (Math.random() - 0.5) * 0.4,

                dy:
                    (Math.random() - 0.5) * 0.4,

                size:
                    Math.random() * 1.8 + 0.4

            });

        }


        const animate = () => {

            context.clearRect(
                0,
                0,
                width,
                height
            );


            particles.forEach((particle) => {

                particle.x += particle.dx;
                particle.y += particle.dy;


                if (
                    particle.x < 0 ||
                    particle.x > width
                ) {

                    particle.dx *= -1;

                }


                if (
                    particle.y < 0 ||
                    particle.y > height
                ) {

                    particle.dy *= -1;

                }


                context.beginPath();

                context.fillStyle =
                    "rgba(0,245,212,0.20)";

                context.arc(
                    particle.x,
                    particle.y,
                    particle.size,
                    0,
                    Math.PI * 2
                );

                context.fill();

            });


            for (
                let i = 0;
                i < particles.length;
                i++
            ) {

                for (
                    let j = i + 1;
                    j < particles.length;
                    j++
                ) {

                    const dx =
                        particles[i].x -
                        particles[j].x;

                    const dy =
                        particles[i].y -
                        particles[j].y;

                    const distance =
                        Math.sqrt(
                            dx * dx +
                            dy * dy
                        );


                    if (distance < 130) {

                        const opacity =
                            Math.max(
                                0,
                                0.05 -
                                distance / 2600
                            );

                        context.beginPath();

                        context.strokeStyle =
                            `rgba(168,85,247,${opacity})`;

                        context.lineWidth = 0.8;

                        context.moveTo(
                            particles[i].x,
                            particles[i].y
                        );

                        context.lineTo(
                            particles[j].x,
                            particles[j].y
                        );

                        context.stroke();

                    }

                }

            }

            animationFrame =
                requestAnimationFrame(
                    animate
                );

        };


        animate();


        return () => {

            cancelAnimationFrame(
                animationFrame
            );

            window.removeEventListener(
                "resize",
                resize
            );

        };

    }, []);


    /* ========================================================
       JSX
       ======================================================== */

    return (

        <div className="auth-page">

            {/* ==================================================
                INLINE CSS
               ================================================== */}

            <style>{`

                :root {
                    --bg-dark: #030712;
                    --card-bg: rgba(17,24,39,.60);

                    --neon-cyan: #00f5d4;
                    --neon-blue: #38bdf8;
                    --neon-purple: #a855f7;

                    --text-main: #f9fafb;
                    --text-muted: #9ca3af;

                    --glass-border:
                        rgba(255,255,255,.07);
                }


                * {
                    box-sizing: border-box;
                }


                html,
                body,
                #root {
                    margin: 0;
                    min-height: 100%;
                    width: 100%;
                }


                body {
                    background: var(--bg-dark);
                }


                button,
                input {
                    font: inherit;
                }


                button {
                    -webkit-tap-highlight-color:
                        transparent;
                }


                .auth-page {
                    min-height: 100dvh;
                    width: 100%;
                    position: relative;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    padding:
                        max(20px, env(safe-area-inset-top))
                        max(20px, env(safe-area-inset-right))
                        max(20px, env(safe-area-inset-bottom))
                        max(20px, env(safe-area-inset-left));

                    overflow-x: hidden;

                    background:
                        radial-gradient(
                            circle at 50% -10%,
                            rgba(56,189,248,.08),
                            transparent 45%
                        ),
                        #030712;

                    color: var(--text-main);

                    font-family:
                        Inter,
                        system-ui,
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;
                }


                .auth-page::before {
                    content: "";
                    position: fixed;
                    inset: 0;

                    pointer-events: none;

                    background:
                        linear-gradient(
                            rgba(255,255,255,.012) 1px,
                            transparent 1px
                        ),
                        linear-gradient(
                            90deg,
                            rgba(255,255,255,.012) 1px,
                            transparent 1px
                        );

                    background-size:
                        42px 42px;

                    mask-image:
                        linear-gradient(
                            to bottom,
                            black,
                            transparent 90%
                        );
                }


                .particles {
                    position: fixed;
                    inset: 0;

                    width: 100%;
                    height: 100%;

                    z-index: 1;
                    pointer-events: none;
                }


                .cursor-glow {
                    position: fixed;

                    width: 500px;
                    height: 500px;

                    left: ${cursor.x}px;
                    top: ${cursor.y}px;

                    transform:
                        translate(-50%, -50%);

                    background:
                        radial-gradient(
                            circle,
                            rgba(168,85,247,.08),
                            transparent 70%
                        );

                    border-radius: 50%;

                    pointer-events: none;

                    z-index: 2;

                    transition:
                        left .08s linear,
                        top .08s linear;
                }


                .auth-container {
                    position: relative;
                    z-index: 10;

                    width: 100%;
                    max-width: 460px;

                    padding: 16px;
                }


                .auth-card {
                    width: 100%;

                    position: relative;
                    overflow: hidden;

                    padding: 40px 32px;

                    border-radius: 24px;

                    background:
                        var(--card-bg);

                    border:
                        1px solid var(--glass-border);

                    backdrop-filter:
                        blur(24px);

                    -webkit-backdrop-filter:
                        blur(24px);

                    box-shadow:
                        0 25px 50px -12px
                        rgba(0,0,0,.7),
                        0 0 50px
                        rgba(56,189,248,.03);
                }


                .auth-card::before {
                    content: "";

                    position: absolute;

                    top: 0;
                    left: 0;

                    width: 100%;
                    height: 2px;

                    background:
                        linear-gradient(
                            90deg,
                            transparent,
                            var(--neon-blue),
                            var(--neon-purple),
                            transparent
                        );
                }


                .auth-header {
                    text-align: center;

                    margin-bottom: 32px;
                }


                .auth-header h1 {
                    margin: 0 0 8px;

                    font-family:
                        Orbitron,
                        system-ui,
                        sans-serif;

                    font-size:
                        clamp(
                            20px,
                            5vw,
                            26px
                        );

                    line-height: 1.2;

                    font-weight: 900;

                    letter-spacing:
                        clamp(
                            1px,
                            .4vw,
                            2px
                        );

                    background:
                        linear-gradient(
                            135deg,
                            #fff 40%,
                            var(--neon-blue)
                        );

                    -webkit-background-clip:
                        text;

                    background-clip: text;

                    -webkit-text-fill-color:
                        transparent;
                }


                .ai-text {
                    min-height: 16px;

                    font-family:
                        Orbitron,
                        system-ui,
                        sans-serif;

                    font-size: 10px;

                    letter-spacing: 2px;

                    color:
                        var(--neon-cyan);

                    text-shadow:
                        0 0 10px
                        rgba(0,245,212,.3);
                }


                .nav-switch {
                    display: flex;

                    padding: 4px;

                    margin-bottom: 28px;

                    border-radius: 12px;

                    background:
                        rgba(0,0,0,.4);

                    border:
                        1px solid
                        var(--glass-border);
                }


                .nav-switch button {
                    flex: 1;

                    border: 0;

                    border-radius: 9px;

                    padding: 12px;

                    background:
                        transparent;

                    color:
                        var(--text-muted);

                    cursor: pointer;

                    font-size: 13px;
                    font-weight: 700;

                    letter-spacing: .5px;

                    transition:
                        .25s ease;
                }


                .nav-switch button.active {
                    color: #fff;

                    background:
                        rgba(56,189,248,.12);

                    border:
                        1px solid
                        rgba(56,189,248,.25);

                    box-shadow:
                        0 0 20px
                        rgba(56,189,248,.05);
                }


                .form-group {
                    margin-bottom: 20px;
                }


                .form-group label {
                    display: block;

                    margin-bottom: 8px;

                    color:
                        var(--text-muted);

                    font-size: 11px;

                    font-weight: 700;

                    text-transform:
                        uppercase;

                    letter-spacing:
                        1.5px;
                }


                .input-wrapper {
                    position: relative;
                    width: 100%;
                }


                .form-control {
                    width: 100%;

                    min-height: 48px;

                    padding:
                        14px 16px;

                    border:
                        1px solid
                        var(--glass-border);

                    border-radius: 12px;

                    background:
                        rgba(3,7,18,.6);

                    color: #fff;

                    font-size: 14px;

                    transition:
                        .3s ease;

                    -webkit-appearance: none;
                }


                .input-wrapper
                .form-control {
                    padding-right: 70px;
                }


                .form-control::placeholder {
                    color:
                        rgba(156,163,175,.55);
                }


                .form-control:focus {
                    outline: none;

                    border-color:
                        var(--neon-blue);

                    background:
                        rgba(3,7,18,.85);

                    box-shadow:
                        0 0 20px
                        rgba(56,189,248,.15);
                }


                .password-toggle {
                    position: absolute;

                    top: 50%;
                    right: 14px;

                    transform:
                        translateY(-50%);

                    border: 0;

                    background: transparent;

                    color:
                        var(--neon-blue);

                    font-family:
                        Orbitron,
                        system-ui,
                        sans-serif;

                    font-size: 10px;

                    font-weight: 700;

                    cursor: pointer;
                }


                .forgot-password {
                    display: flex;
                    justify-content: flex-end;

                    margin-top: 8px;
                }


                .forgot-password button {
                    border: 0;
                    background: transparent;

                    color:
                        var(--text-muted);

                    font-size: 12px;
                    font-weight: 600;

                    cursor: pointer;
                }


                .forgot-password button:hover {
                    color:
                        var(--neon-blue);
                }


                .strength-meter {
                    display: flex;
                    gap: 6px;

                    margin-top: 8px;
                }


                .strength-bar {
                    flex: 1;

                    height: 4px;

                    border-radius: 3px;

                    background:
                        rgba(255,255,255,.05);

                    transition:
                        .3s ease;
                }


                .btn-prime {
                    width: 100%;

                    min-height: 48px;

                    margin-top: 8px;

                    padding: 14px;

                    border: 0;
                    border-radius: 12px;

                    color: #fff;

                    background:
                        linear-gradient(
                            90deg,
                            #1d4ed8,
                            #0ea5e9
                        );

                    box-shadow:
                        0 4px 20px
                        rgba(29,78,216,.3);

                    font-family:
                        Orbitron,
                        system-ui,
                        sans-serif;

                    font-size: 13px;

                    font-weight: 700;

                    letter-spacing: 1px;

                    cursor: pointer;

                    transition:
                        .3s ease;
                }


                .btn-prime:hover:not(:disabled) {
                    transform:
                        translateY(-1px);

                    filter:
                        brightness(1.15);

                    box-shadow:
                        0 6px 24px
                        rgba(14,165,233,.45);
                }


                .btn-prime:disabled {
                    opacity: .45;
                    cursor: not-allowed;
                }


                .auth-divider {
                    display: flex;
                    align-items: center;

                    margin: 28px 0;

                    color:
                        var(--text-muted);

                    font-family:
                        Orbitron,
                        system-ui,
                        sans-serif;

                    font-size: 10px;

                    letter-spacing: 2px;
                }


                .auth-divider::before,
                .auth-divider::after {
                    content: "";

                    flex: 1;

                    height: 1px;

                    background:
                        rgba(255,255,255,.08);
                }


                .auth-divider::before {
                    margin-right: 14px;
                }


                .auth-divider::after {
                    margin-left: 14px;
                }


                .secondary-group {
                    display: flex;

                    flex-direction: column;

                    gap: 12px;
                }


                .btn-alt {
                    width: 100%;

                    min-height: 46px;

                    padding: 12px;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    gap: 12px;

                    border:
                        1px solid
                        var(--glass-border);

                    border-radius: 12px;

                    background:
                        rgba(255,255,255,.02);

                    color: #fff;

                    cursor: pointer;

                    font-size: 13px;
                    font-weight: 600;

                    transition:
                        .25s ease;
                }


                .btn-alt:hover {
                    background:
                        rgba(255,255,255,.06);

                    border-color:
                        rgba(255,255,255,.15);
                }


                /* ================================================
                   OTP MODAL
                   ================================================ */

                .modal-overlay {
                    position: fixed;
                    inset: 0;

                    z-index: 5000;

                    display: flex;

                    align-items: center;
                    justify-content: center;

                    padding: 20px;

                    background:
                        rgba(2,6,23,.82);

                    backdrop-filter:
                        blur(16px);

                    -webkit-backdrop-filter:
                        blur(16px);
                }


                .modal-card {
                    width: 100%;
                    max-width: 420px;

                    max-height:
                        calc(100dvh - 40px);

                    overflow-y: auto;

                    padding: 30px;

                    border:
                        1px solid
                        rgba(56,189,248,.2);

                    border-radius: 24px;

                    background:
                        linear-gradient(
                            145deg,
                            rgba(17,24,39,.98),
                            rgba(3,7,18,.99)
                        );

                    box-shadow:
                        0 30px 60px
                        rgba(0,0,0,.8);
                }


                .modal-card h2 {
                    margin: 0 0 6px;

                    font-family:
                        Orbitron,
                        system-ui,
                        sans-serif;

                    font-size: 20px;

                    letter-spacing: 1px;
                }


                .modal-description {
                    margin: 0 0 20px;

                    color:
                        var(--text-muted);

                    font-size: 12px;

                    line-height: 1.6;
                }


                .modal-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }


                /* ================================================
                   LOADER
                   ================================================ */

                .global-loader {
                    position: fixed;
                    inset: 0;

                    z-index: 9000;

                    display: flex;

                    align-items: center;
                    justify-content: center;

                    flex-direction: column;

                    gap: 24px;

                    background:
                        #030712;
                }


                .spinner-ring {
                    width: 56px;
                    height: 56px;

                    border:
                        3px solid
                        rgba(56,189,248,.08);

                    border-top-color:
                        var(--neon-blue);

                    border-radius: 50%;

                    animation:
                        spin .8s linear infinite;
                }


                @keyframes spin {
                    to {
                        transform:
                            rotate(360deg);
                    }
                }


                .loader-text {
                    color:
                        var(--neon-blue);

                    font-family:
                        Orbitron,
                        system-ui,
                        sans-serif;

                    font-size: 12px;

                    letter-spacing: 4px;
                }


                /* ================================================
                   CHAT
                   ================================================ */

                .chat-launcher {
                    position: fixed;

                    right:
                        max(
                            20px,
                            env(safe-area-inset-right)
                        );

                    bottom:
                        max(
                            20px,
                            env(safe-area-inset-bottom)
                        );

                    z-index: 1000;

                    width: 56px;
                    height: 56px;

                    display: flex;

                    align-items: center;
                    justify-content: center;

                    border-radius: 50%;

                    border:
                        1px solid
                        rgba(255,255,255,.15);

                    background:
                        linear-gradient(
                            135deg,
                            var(--neon-purple),
                            #2563eb
                        );

                    color: #fff;

                    cursor: pointer;

                    box-shadow:
                        0 10px 30px
                        rgba(168,85,247,.35);

                    transition:
                        .3s ease;
                }


                .chat-launcher:hover {
                    transform:
                        scale(1.06);
                }


                .chat-console {
                    position: fixed;

                    right: 24px;
                    bottom: 96px;

                    z-index: 999;

                    width: 380px;

                    height: 520px;

                    max-width:
                        calc(100vw - 32px);

                    max-height:
                        calc(100dvh - 120px);

                    display: flex;
                    flex-direction: column;

                    overflow: hidden;

                    border:
                        1px solid
                        rgba(168,85,247,.2);

                    border-radius: 20px;

                    background:
                        rgba(10,15,30,.96);

                    backdrop-filter:
                        blur(20px);

                    box-shadow:
                        0 20px 50px
                        rgba(0,0,0,.65);

                    transform:
                        translateY(20px)
                        scale(.96);

                    opacity: 0;

                    pointer-events: none;

                    transition:
                        .3s ease;
                }


                .chat-console.open {
                    transform:
                        translateY(0)
                        scale(1);

                    opacity: 1;

                    pointer-events:
                        auto;
                }


                .chat-header {
                    padding: 16px 18px;

                    display: flex;

                    justify-content:
                        space-between;

                    align-items: center;

                    border-bottom:
                        1px solid
                        rgba(168,85,247,.15);

                    background:
                        rgba(168,85,247,.08);
                }


                .chat-title h3 {
                    margin: 0;

                    font-family:
                        Orbitron,
                        system-ui,
                        sans-serif;

                    font-size: 13px;

                    letter-spacing: 1.5px;
                }


                .chat-title p {
                    margin: 3px 0 0;

                    color:
                        var(--neon-purple);

                    font-size: 11px;
                }


                .chat-close {
                    border: 0;
                    background: transparent;

                    color:
                        var(--text-muted);

                    font-size: 22px;

                    cursor: pointer;
                }


                .chat-feed {
                    flex: 1;

                    padding: 18px;

                    overflow-y: auto;

                    display: flex;

                    flex-direction: column;

                    gap: 12px;
                }


                .chat-bubble {
                    max-width: 85%;

                    padding:
                        11px 14px;

                    border-radius: 14px;

                    font-size: 13px;

                    line-height: 1.55;

                    white-space: pre-wrap;
                }


                .bubble-ai {
                    align-self: flex-start;

                    color:
                        #f3f4f6;

                    background:
                        rgba(255,255,255,.03);

                    border:
                        1px solid
                        rgba(255,255,255,.05);
                }


                .bubble-user {
                    align-self: flex-end;

                    color: #fff;

                    background:
                        linear-gradient(
                            135deg,
                            var(--neon-purple),
                            #1d4ed8
                        );
                }


                .chat-input-area {
                    display: flex;

                    gap: 8px;

                    padding: 12px;

                    border-top:
                        1px solid
                        rgba(255,255,255,.05);

                    background:
                        rgba(0,0,0,.25);
                }


                .chat-input {
                    flex: 1;

                    min-width: 0;

                    padding: 11px;

                    border:
                        1px solid
                        var(--glass-border);

                    border-radius: 10px;

                    background:
                        rgba(3,7,18,.7);

                    color: #fff;

                    outline: none;
                }


                .chat-send {
                    border: 0;

                    border-radius: 10px;

                    padding:
                        0 16px;

                    background:
                        var(--neon-purple);

                    color: #fff;

                    font-family:
                        Orbitron,
                        system-ui,
                        sans-serif;

                    font-size: 10px;

                    cursor: pointer;
                }


                .typing {
                    display: flex;
                    gap: 4px;
                }


                .typing span {
                    width: 6px;
                    height: 6px;

                    border-radius: 50%;

                    background:
                        var(--text-muted);

                    animation:
                        bounce 1.3s
                        infinite ease-in-out;
                }


                .typing span:nth-child(2) {
                    animation-delay:
                        -.2s;
                }


                .typing span:nth-child(3) {
                    animation-delay:
                        -.4s;
                }


                @keyframes bounce {

                    0%,
                    80%,
                    100% {
                        transform:
                            scale(0);
                    }

                    40% {
                        transform:
                            scale(1);
                    }

                }


                /* ================================================
                   TOAST
                   ================================================ */

                .toast {
                    position: fixed;

                    top:
                        max(
                            18px,
                            env(safe-area-inset-top)
                        );

                    right:
                        max(
                            18px,
                            env(safe-area-inset-right)
                        );

                    z-index: 99999;

                    width: 340px;

                    max-width:
                        calc(100vw - 36px);

                    padding: 16px;

                    border-radius: 16px;

                    background:
                        rgba(17,24,39,.96);

                    backdrop-filter:
                        blur(16px);

                    box-shadow:
                        0 20px 40px
                        rgba(0,0,0,.5);

                    animation:
                        toastIn .35s
                        cubic-bezier(
                            .16,
                            1,
                            .3,
                            1
                        );
                }


                .toast-title {
                    margin-bottom: 4px;

                    font-family:
                        Orbitron,
                        system-ui,
                        sans-serif;

                    font-size: 10px;

                    font-weight: 800;

                    letter-spacing: 2px;
                }


                .toast-message {
                    color:
                        #f3f4f6;

                    font-size: 13px;

                    line-height: 1.5;
                }


                @keyframes toastIn {

                    from {
                        transform:
                            translateX(120px);

                        opacity: 0;
                    }

                    to {
                        transform:
                            translateX(0);

                        opacity: 1;
                    }

                }


                /* ================================================
                   MOBILE
                   ================================================ */

                @media (max-width: 600px) {

                    .auth-page {
                        align-items:
                            flex-start;

                        padding-top:
                            max(
                                20px,
                                env(safe-area-inset-top)
                            );

                        padding-bottom:
                            90px;
                    }


                    .auth-container {
                        padding: 8px;
                    }


                    .auth-card {
                        padding:
                            30px 20px;

                        border-radius: 20px;
                    }


                    .cursor-glow {
                        display: none;
                    }


                    .chat-console {
                        right: 16px;
                        left: 16px;

                        bottom: 86px;

                        width:
                            auto;

                        max-width:
                            none;
                    }


                    .chat-launcher {
                        width: 52px;
                        height: 52px;
                    }


                    .modal-card {
                        padding:
                            24px 20px;

                        border-radius: 20px;
                    }

                }


                @media (max-width: 360px) {

                    .auth-card {
                        padding:
                            24px 16px;
                    }


                    .auth-header h1 {
                        font-size: 18px;
                    }


                    .nav-switch button {
                        font-size: 11px;
                    }

                }


                @media (prefers-reduced-motion: reduce) {

                    *,
                    *::before,
                    *::after {
                        animation-duration:
                            .01ms !important;

                        animation-iteration-count:
                            1 !important;

                        transition-duration:
                            .01ms !important;
                    }

                    .cursor-glow {
                        display: none;
                    }

                }

            `}</style>


            {/* ==================================================
                BACKGROUND
               ================================================== */}

            <canvas
                ref={canvasRef}
                className="particles"
                aria-hidden="true"
            />

            <div
                className="cursor-glow"
                aria-hidden="true"
            />


            {/* ==================================================
                AUTH CARD
               ================================================== */}

            <main className="auth-container">

                <section className="auth-card">

                    <header className="auth-header">

                        <h1>
                            MTL FOOTBALL PREDICTIONS
                        </h1>

                        <div className="ai-text">
                            {aiText}
                        </div>

                    </header>


                    {/* TABS */}

                    <div
                        className="nav-switch"
                        role="tablist"
                    >

                        <button
                            type="button"
                            role="tab"
                            aria-selected={
                                mode === "login"
                            }
                            className={
                                mode === "login"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setMode("login")
                            }
                        >
                            SIGN IN
                        </button>

                        <button
                            type="button"
                            role="tab"
                            aria-selected={
                                mode === "register"
                            }
                            className={
                                mode === "register"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setMode("register")
                            }
                        >
                            REGISTER
                        </button>

                    </div>


                    {/* ==================================================
                        LOGIN
                       ================================================== */}

                    {mode === "login" && (

                        <form
                            onSubmit={handleLogin}
                        >

                            <div className="form-group">

                                <label>
                                    USER EMAIL
                                </label>

                                <input
                                    type="email"
                                    className="form-control"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(
                                            event.target.value
                                        )
                                    }
                                    placeholder="name@domain.tech"
                                    autoComplete="email"
                                    inputMode="email"
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    CIPHER KEY
                                </label>

                                <div className="input-wrapper">

                                    <input
                                        type={
                                            showLoginPassword
                                                ? "text"
                                                : "password"
                                        }
                                        className="form-control"
                                        value={password}
                                        onChange={(event) =>
                                            setPassword(
                                                event.target.value
                                            )
                                        }
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() =>
                                            setShowLoginPassword(
                                                value => !value
                                            )
                                        }
                                    >
                                        {showLoginPassword
                                            ? "HIDE"
                                            : "SHOW"}
                                    </button>

                                </div>


                                <div className="forgot-password">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                "/reset-password"
                                            )
                                        }
                                    >
                                        RESET PASSWORD
                                    </button>

                                </div>

                            </div>


                            <button
                                type="submit"
                                className="btn-prime"
                                disabled={loading}
                            >
                                {loading
                                    ? "AUTHENTICATING..."
                                    : "LOGIN"}
                            </button>

                        </form>

                    )}


                    {/* ==================================================
                        REGISTER
                       ================================================== */}

                    {mode === "register" && (

                        <form
                            onSubmit={handleRegister}
                        >

                            <div className="form-group">

                                <label>
                                    USERNAME
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    value={username}
                                    onChange={(event) =>
                                        setUsername(
                                            event.target.value
                                        )
                                    }
                                    placeholder="operator_01"
                                    autoComplete="username"
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    EMAIL
                                </label>

                                <input
                                    type="email"
                                    className="form-control"
                                    value={regEmail}
                                    onChange={(event) =>
                                        setRegEmail(
                                            event.target.value
                                        )
                                    }
                                    placeholder="operator@domain.tech"
                                    autoComplete="email"
                                    inputMode="email"
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    PASSWORD
                                </label>

                                <div className="input-wrapper">

                                    <input
                                        type={
                                            showRegisterPassword
                                                ? "text"
                                                : "password"
                                        }
                                        className="form-control"
                                        value={regPassword}
                                        onChange={(event) =>
                                            setRegPassword(
                                                event.target.value
                                            )
                                        }
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() =>
                                            setShowRegisterPassword(
                                                value => !value
                                            )
                                        }
                                    >
                                        {showRegisterPassword
                                            ? "HIDE"
                                            : "SHOW"}
                                    </button>

                                </div>


                                <div className="strength-meter">

                                    {[0, 1, 2, 3].map(
                                        (index) => {

                                            let background =
                                                "rgba(255,255,255,.05)";

                                            if (
                                                index <
                                                passwordStrength
                                            ) {

                                                if (
                                                    passwordStrength <= 1
                                                ) {
                                                    background =
                                                        "#ef4444";
                                                } else if (
                                                    passwordStrength <= 3
                                                ) {
                                                    background =
                                                        "#f59e0b";
                                                } else {
                                                    background =
                                                        "var(--neon-cyan)";
                                                }

                                            }

                                            return (

                                                <div
                                                    key={index}
                                                    className="strength-bar"
                                                    style={{
                                                        background
                                                    }}
                                                />

                                            );

                                        }
                                    )}

                                </div>

                            </div>


                            <button
                                type="submit"
                                className="btn-prime"
                                disabled={loading}
                            >
                                {loading
                                    ? "CREATING NODE..."
                                    : "REGISTER"}
                            </button>

                        </form>

                    )}


                    {/* DIVIDER */}

                    <div className="auth-divider">
                        ALTERNATIVES
                    </div>


                    {/* ALTERNATIVE AUTH */}

                    <div className="secondary-group">

                        <button
                            type="button"
                            className="btn-alt"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >

                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />

                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />

                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                />

                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />

                            </svg>

                            SIGN IN WITH GOOGLE

                        </button>


                        <button
                            type="button"
                            className="btn-alt"
                            onClick={() =>
                                setShowOtpModal(true)
                            }
                        >

                            <span>
                                ☎
                            </span>

                            OUT-OF-BAND OTP SIGNIN

                        </button>

                    </div>

                </section>

            </main>


            {/* ==================================================
                OTP MODAL
               ================================================== */}

            {showOtpModal && (

                <div
                    className="modal-overlay"
                    role="dialog"
                    aria-modal="true"
                >

                    <div className="modal-card">

                        <h2>
                            IDENTITY VALIDATION
                        </h2>

                        <p className="modal-description">
                            Verification requires multi-factor
                            system checks.
                        </p>


                        <div className="form-group">

                            <label>
                                PHONE NUMBER
                            </label>

                            <input
                                type="tel"
                                className="form-control"
                                value={phone}
                                onChange={(event) =>
                                    setPhone(
                                        event.target.value
                                    )
                                }
                                placeholder="+254700000000"
                                inputMode="tel"
                                autoComplete="tel"
                            />

                        </div>


                        <div className="form-group">

                            <label>
                                USER NAME
                            </label>

                            <input
                                type="text"
                                className="form-control"
                                value={fullName}
                                onChange={(event) =>
                                    setFullName(
                                        event.target.value
                                    )
                                }
                                placeholder="Full Name"
                                autoComplete="name"
                            />

                        </div>


                        <div className="modal-actions">

                            <button
                                type="button"
                                className="btn-prime"
                                onClick={handleSendOtp}
                                disabled={otpSending}
                            >
                                {otpSending
                                    ? "DISPATCHING..."
                                    : "REQUEST TOKEN DISPATCH"}
                            </button>


                            <input
                                type="text"
                                className="form-control"
                                value={otp}
                                onChange={(event) =>
                                    setOtp(
                                        event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6)
                                    )
                                }
                                placeholder="Enter 6-digit code"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                            />


                            <button
                                type="button"
                                className="btn-prime"
                                onClick={handleVerifyOtp}
                                disabled={otpVerifying}
                                style={{
                                    background:
                                        "linear-gradient(90deg,#16a34a,#22c55e)"
                                }}
                            >
                                {otpVerifying
                                    ? "VERIFYING..."
                                    : "VERIFY NODE AUTHORIZATION"}
                            </button>


                            <button
                                type="button"
                                className="btn-alt"
                                onClick={handleResendOtp}
                                disabled={resendLock}
                            >
                                {resendLock
                                    ? "WAIT..."
                                    : "RESEND REQUEST"}
                            </button>


                            <button
                                type="button"
                                className="btn-alt"
                                onClick={() =>
                                    setShowOtpModal(false)
                                }
                            >
                                ABORT VERIFICATION
                            </button>

                        </div>

                    </div>

                </div>

            )}


            {/* ==================================================
                LOADER
               ================================================== */}

            {showLoader && (

                <div className="global-loader">

                    <div className="spinner-ring" />

                    <div className="loader-text">
                        {loaderText}
                    </div>

                </div>

            )}


            {/* ==================================================
                AI CHAT
               ================================================== */}

            <button
                type="button"
                className="chat-launcher"
                onClick={() =>
                    setChatOpen(
                        value => !value
                    )
                }
                aria-label="Open AI assistant"
            >

                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >

                    <path
                        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    />

                </svg>

            </button>


            <aside
                className={
                    `chat-console ${
                        chatOpen ? "open" : ""
                    }`
                }
                aria-hidden={!chatOpen}
            >

                <header className="chat-header">

                    <div className="chat-title">

                        <h3>
                            ASSISTANT
                        </h3>

                        <p>
                            AI Support
                        </p>

                    </div>

                    <button
                        type="button"
                        className="chat-close"
                        onClick={() =>
                            setChatOpen(false)
                        }
                        aria-label="Close assistant"
                    >
                        ×
                    </button>

                </header>


                <div
                    className="chat-feed"
                    ref={chatFeedRef}
                >

                    {chatMessages.map(
                        (message, index) => (

                            <div
                                key={index}
                                className={
                                    `chat-bubble ${
                                        message.role === "user"
                                            ? "bubble-user"
                                            : "bubble-ai"
                                    }`
                                }
                            >
                                {message.text}
                            </div>

                        )
                    )}


                    {chatProcessing && (

                        <div className="chat-bubble bubble-ai">

                            <div className="typing">

                                <span />
                                <span />
                                <span />

                            </div>

                        </div>

                    )}

                </div>


                <div className="chat-input-area">

                    <input
                        type="text"
                        className="chat-input"
                        value={chatInput}
                        onChange={(event) =>
                            setChatInput(
                                event.target.value
                            )
                        }
                        onKeyDown={(event) => {

                            if (
                                event.key === "Enter" &&
                                !event.shiftKey
                            ) {

                                event.preventDefault();

                                executeAiQuery();

                            }

                        }}
                        placeholder="Ask Miss Vallery..."
                        autoComplete="off"
                    />


                    <button
                        type="button"
                        className="chat-send"
                        onClick={executeAiQuery}
                        disabled={chatProcessing}
                    >
                        SEND
                    </button>

                </div>

            </aside>


            {/* ==================================================
                TOAST
               ================================================== */}

            {toastData && (

                <div
                    className="toast"
                    style={{
                        border:
                            `1px solid ${
                                toastData.type === "success"
                                    ? "#00f5d4"
                                    : toastData.type === "error"
                                        ? "#ef4444"
                                        : "#38bdf8"
                            }`
                    }}
                >

                    <div
                        className="toast-title"
                        style={{
                            color:
                                toastData.type === "success"
                                    ? "#00f5d4"
                                    : toastData.type === "error"
                                        ? "#ef4444"
                                        : "#38bdf8"
                        }}
                    >
                        {toastData.type.toUpperCase()}
                        {" RESPONSE"}
                    </div>

                    <div className="toast-message">
                        {toastData.message}
                    </div>

                </div>

            )}

        </div>
    );
}
