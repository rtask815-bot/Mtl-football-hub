import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase directly with credentials
const SUPABASE_URL = "https://dfcgbwfralikyqxzxlbd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CONFIG = Object.freeze({
    // Standard endpoint without .js for Vercel/Next.js/Express compatibility
    proxyApiBase: "/api/proxy",
    defaultTargetUrl: "https://www.famelack.com/tv/sports/rSbwbBDpFexSew",
    cropTop: 60,
    loadTimeout: 15000,
    controlsDuration: 5000,
    dashboardRoute: "/dashboard",
    authRoute: "/auth"
});

export default function Tv({ targetWebsite = CONFIG.defaultTargetUrl }) {
    // Dynamic Proxy URL generator helper with URL validation
    const getProxyUrl = useCallback((target) => {
        try {
            const validTarget = new URL(target).toString();
            const encodedUrl = encodeURIComponent(validTarget);
            return `${CONFIG.proxyApiBase}?url=${encodedUrl}`;
        } catch {
            return null;
        }
    }, []);

    // Session & Component State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [streamSrc, setStreamSrc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingText, setLoadingText] = useState("Authenticating Session...");
    const [isLoaded, setIsLoaded] = useState(false);

    // Status State
    const [statusState, setStatusState] = useState({
        text: "Connecting",
        type: "loading",
        visible: true
    });

    // Controls & UI State
    const [controlsVisible, setControlsVisible] = useState(false);
    const [controlsPermanentlyHidden, setControlsPermanentlyHidden] = useState(false);
    const [iframeCrop, setIframeCrop] = useState(CONFIG.cropTop);

    // Error State
    const [errorState, setErrorState] = useState({
        visible: false,
        title: "Stream unavailable",
        message: "The stream could not be loaded."
    });

    // Toast State
    const [toasts, setToasts] = useState([]);

    // Refs
    const appRef = useRef(null);
    const loadTimerRef = useRef(null);
    const controlsTimerRef = useRef(null);
    const liveStatusTimerRef = useRef(null);
    const abortControllerRef = useRef(null);
    const isLoadedRef = useRef(isLoaded);

    useEffect(() => {
        isLoadedRef.current = isLoaded;
    }, [isLoaded]);

    const createToast = useCallback((text, isError = false) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, text, isError, fadingOut: false }]);

        setTimeout(() => {
            setToasts(prev =>
                prev.map(t => t.id === id ? { ...t, fadingOut: true } : t)
            );
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 300);
        }, 4000);
    }, []);

    const hideControls = useCallback(() => {
        setControlsVisible(false);
    }, []);

    const showControls = useCallback(() => {
        if (controlsPermanentlyHidden) return;
        setControlsVisible(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(hideControls, CONFIG.controlsDuration);
    }, [controlsPermanentlyHidden, hideControls]);

    const updateIframeLayout = useCallback(() => {
        const width = window.visualViewport ? window.visualViewport.width : window.innerWidth;
        let crop = CONFIG.cropTop;
        if (width <= 360) crop = 48;
        setIframeCrop(crop);
    }, []);

    const showError = useCallback((title, message) => {
        setIsLoading(false);
        setErrorState({
            visible: true,
            title,
            message
        });
        setStatusState({ text: "Unavailable", type: "error", visible: true });
        createToast(title, true);
    }, [createToast]);

    // Reload stream with full preflight check and authentication verification
    const reloadStream = useCallback(async (automatic = false) => {
        if (!navigator.onLine) {
            showError("Offline", "Please check your internet connection and try again.");
            return;
        }

        // Cancel any pending preflight requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // 1. Verify URL Validity
        const baseUrl = getProxyUrl(targetWebsite);
        if (!baseUrl) {
            showError("Invalid Stream URL", "The target URL configured for this stream is invalid.");
            return;
        }

        // 2. Retrieve & Check Supabase Session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            setIsAuthenticated(false);
            showError("Authentication Required", "Please log in with Supabase to view this stream.");
            return;
        }

        setIsAuthenticated(true);
        setErrorState(prev => ({ ...prev, visible: false }));
        setIsLoaded(false);
        setIsLoading(true);
        setLoadingText(automatic ? "Connecting Stream..." : "Reloading Stream...");
        setStatusState({
            text: automatic ? "Reconnecting" : "Loading",
            type: "loading",
            visible: true
        });

        const fullProxyUrl = `${baseUrl}&_t=${Date.now()}`;

        // 3. Perform Preflight Ping to `/api/proxy` to ensure server route exists & works
        try {
            const response = await fetch(fullProxyUrl, {
                method: 'HEAD',
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error("Proxy route not found. Ensure your API endpoint exists at /api/proxy.");
                } else if (response.status === 403) {
                    throw new Error("Access forbidden by backend proxy server.");
                } else {
                    throw new Error(`Proxy server returned HTTP status ${response.status}`);
                }
            }

            // Route exists and succeeded: Load stream in iframe
            setStreamSrc(fullProxyUrl);
            updateIframeLayout();

            if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
            loadTimerRef.current = setTimeout(() => {
                if (!isLoadedRef.current && navigator.onLine) {
                    showError("Timeout", "Provider failed to respond within the allowed time limit.");
                }
            }, CONFIG.loadTimeout);

        } catch (fetchErr) {
            if (fetchErr.name === 'AbortError') return; // Cancelled intentionally
            showError("Proxy Connection Error", fetchErr.message || "Failed to establish proxy connection.");
        }
    }, [getProxyUrl, targetWebsite, updateIframeLayout, showError]);

    const handleFrameLoad = () => {
        if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
        setIsLoading(false);
        setIsLoaded(true);
        setErrorState(prev => ({ ...prev, visible: false }));
        setStatusState({ text: "Connected", type: "connected", visible: true });
        showControls();
        createToast("Stream initialized successfully");

        if (liveStatusTimerRef.current) clearTimeout(liveStatusTimerRef.current);
        liveStatusTimerRef.current = setTimeout(() => {
            setStatusState(prev => ({ ...prev, text: "Live", visible: false }));
        }, 3000);
    };

    const navigateToDashboard = () => {
        if (window.router && typeof window.router.push === 'function') {
            window.router.push(CONFIG.dashboardRoute);
        } else {
            window.location.href = CONFIG.dashboardRoute;
        }
    };

    const navigateToAuth = () => {
        if (window.router && typeof window.router.push === 'function') {
            window.router.push(CONFIG.authRoute);
        } else {
            window.location.href = CONFIG.authRoute;
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            if (appRef.current && appRef.current.requestFullscreen) {
                appRef.current.requestFullscreen().catch(() => createToast("Fullscreen restricted", true));
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // Supabase Auth listener & Event registration
    useEffect(() => {
        const handleOnline = () => {
            setStatusState({ text: "Online", type: "connected", visible: true });
            createToast("Connection restored");
            reloadStream(true);
        };

        const handleOffline = () => {
            setStatusState({ text: "Offline", type: "offline", visible: true });
            createToast("Network disconnected", true);
        };

        const handleResize = () => {
            updateIframeLayout();
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        window.addEventListener("resize", handleResize);

        updateIframeLayout();

        // Initial Auth Verification
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error || !session) {
                setIsAuthenticated(false);
                showError("Authentication Required", "Please log in to view this stream.");
            } else {
                setIsAuthenticated(true);
                reloadStream(true);
            }
        });

        // Listen for explicit auth state updates without creating infinite reload loops
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) {
                setIsAuthenticated(true);
                // ONLY trigger reload on fresh sign-ins (prevents loop on token refreshes/mounts)
                if (event === 'SIGNED_IN') {
                    reloadStream(true);
                }
            } else {
                setIsAuthenticated(false);
                setStreamSrc(null);
                showError("Authentication Required", "Please log in with Supabase to view this stream.");
            }
        });

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("resize", handleResize);
            subscription?.unsubscribe();

            if (abortControllerRef.current) abortControllerRef.current.abort();
            if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
            if (liveStatusTimerRef.current) clearTimeout(liveStatusTimerRef.current);
        };
    }, [createToast, reloadStream, updateIframeLayout, showError]);

    return (
        <main className="stream-app" id="streamApp" ref={appRef}>
            <style>{`
                :root {
                    --bg: #030308;
                    --panel: rgba(12,14,24,.85);
                    --panel2: rgba(22,27,46,.75);
                    --text: #ffffff;
                    --muted: #828ba2;
                    --accent: #00f0ff;
                    --accent-glow: rgba(0,240,255,.4);
                    --danger: #ff0055;
                    --danger-glow: rgba(255,0,85,.4);
                    --success: #00ff88;
                    --warning: #ffaa00;
                    --radius: 16px;
                    --safe-top: env(safe-area-inset-top, 0px);
                    --safe-right: env(safe-area-inset-right, 0px);
                    --safe-bottom: env(safe-area-inset-bottom, 0px);
                    --safe-left: env(safe-area-inset-left, 0px);
                }

                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    -webkit-tap-highlight-color: transparent;
                }

                .stream-app {
                    position: fixed;
                    inset: 0;
                    width: 100%;
                    height: 100dvh;
                    min-height: 100svh;
                    background: #000;
                    overflow: hidden;
                    perspective: 1000px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    color: var(--text);
                }

                .app-bar {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: calc(56px + var(--safe-top));
                    padding-top: var(--safe-top);
                    padding-left: calc(12px + var(--safe-left));
                    padding-right: calc(12px + var(--safe-right));
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: linear-gradient(180deg, rgba(3,3,8,0.95) 0%, rgba(3,3,8,0.4) 80%, transparent 100%);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    z-index: 45;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                }

                .app-bar-title {
                    font-size: 16px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                    color: var(--text);
                    text-shadow: 0 0 10px rgba(0,240,255,0.3);
                }

                .back-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 14px;
                    border-radius: 12px;
                    background: var(--panel2);
                    border: 1px solid rgba(0,240,255,0.3);
                    color: var(--text);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 10px var(--accent-glow);
                    transition: all 0.25s ease;
                    text-decoration: none;
                }

                .back-button:hover {
                    background: rgba(0,240,255,0.25);
                    border-color: var(--accent);
                    color: var(--accent);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.6), 0 0 15px var(--accent-glow);
                }

                .back-button:active { transform: scale(0.95); }

                .stream-viewport {
                    position: absolute;
                    inset: 0;
                    top: calc(56px + var(--safe-top));
                    width: 100%;
                    height: calc(100% - 56px - var(--safe-top));
                    overflow: hidden;
                    background: #000;
                    isolation: isolate;
                }

                .stream-frame {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    border: 0;
                    outline: 0;
                    background: #000;
                    display: block;
                    overflow: hidden;
                }

                .banner-3d {
                    position: absolute;
                    top: calc(68px + var(--safe-top));
                    left: 50%;
                    transform: translateX(-50%) rotateX(10deg) translateZ(0);
                    transform-style: preserve-3d;
                    z-index: 35;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 18px;
                    background: linear-gradient(135deg,rgba(0,240,255,.15),rgba(15,15,26,.85));
                    border: 1px solid rgba(0,240,255,.3);
                    border-radius: 20px;
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    box-shadow: 0 10px 30px rgba(0,0,0,.8),0 0 15px var(--accent-glow);
                    transition: transform .4s cubic-bezier(.175,.885,.32,1.275);
                }

                .banner-3d:hover {
                    transform: translateX(-50%) rotateX(0deg) translateZ(10px) scale(1.02);
                }

                .banner-title {
                    font-size: 12px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    background: linear-gradient(90deg,#fff,var(--accent));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    text-transform: uppercase;
                }

                .loading-screen {
                    position: absolute;
                    inset: 0;
                    z-index: 20;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 24px;
                    background: radial-gradient(circle at center, rgba(10,14,30,1) 0%, rgba(3,3,8,1) 100%);
                    transition: opacity .4s ease, visibility .4s ease;
                }

                .loading-screen.hidden {
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                }

                .futuristic-loader {
                    position: relative;
                    width: 80px;
                    height: 80px;
                    transform-style: preserve-3d;
                    perspective: 500px;
                }

                .ring {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    border: 2px solid transparent;
                }

                .ring-1 {
                    border-top-color: var(--accent);
                    border-bottom-color: var(--accent);
                    animation: rotate1 1.5s linear infinite;
                    filter: drop-shadow(0 0 8px var(--accent));
                }

                .ring-2 {
                    border-left-color: var(--danger);
                    border-right-color: var(--danger);
                    animation: rotate2 2s linear infinite;
                    filter: drop-shadow(0 0 8px var(--danger));
                }

                .ring-3 {
                    border: 2px dashed rgba(255,255,255,.3);
                    animation: rotate3 4s linear infinite;
                }

                .core-glow {
                    position: absolute;
                    inset: 25%;
                    background: var(--accent);
                    border-radius: 50%;
                    filter: blur(8px);
                    animation: pulse-core 1.2s ease-in-out infinite alternate;
                }

                @keyframes rotate1 {
                    0% { transform: rotateX(35deg) rotateY(-45deg) rotateZ(0deg); }
                    100% { transform: rotateX(35deg) rotateY(-45deg) rotateZ(360deg); }
                }

                @keyframes rotate2 {
                    0% { transform: rotateX(50deg) rotateY(10deg) rotateZ(0deg); }
                    100% { transform: rotateX(50deg) rotateY(10deg) rotateZ(-360deg); }
                }

                @keyframes rotate3 {
                    0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
                    100% { transform: rotateX(0deg) rotateY(0deg) rotateZ(360deg); }
                }

                @keyframes pulse-core {
                    0% { opacity: .2; transform: scale(.8); }
                    100% { opacity: .8; transform: scale(1.2); }
                }

                @keyframes status-pulse {
                    0% { opacity: 0.4; }
                    50% { opacity: 1.0; }
                    100% { opacity: 0.4; }
                }

                .loading-text {
                    max-width: 85%;
                    text-align: center;
                    color: #e0e6ed;
                    font-size: 13px;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    font-weight: 600;
                }

                .status {
                    position: absolute;
                    z-index: 30;
                    top: calc(68px + var(--safe-top));
                    left: calc(12px + var(--safe-left));
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    padding: 7px 12px;
                    border-radius: 999px;
                    background: rgba(8,10,18,.75);
                    border: 1px solid rgba(255,255,255,.1);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: .5px;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity .25s ease;
                }

                .status.visible { opacity: 1; }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--success);
                    box-shadow: 0 0 8px var(--success);
                }

                .status.loading .status-dot {
                    background: var(--warning);
                    box-shadow: 0 0 8px var(--warning);
                    animation: status-pulse 1s infinite;
                }

                .status.error .status-dot {
                    background: var(--danger);
                    box-shadow: 0 0 8px var(--danger);
                }

                .status.offline .status-dot {
                    background: #777;
                    box-shadow: none;
                }

                .controls {
                    position: absolute;
                    z-index: 40;
                    left: 50%;
                    bottom: calc(18px + var(--safe-bottom));
                    transform: translate(-50%,20px) rotateX(15deg);
                    transform-style: preserve-3d;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 8px 12px;
                    background: var(--panel);
                    border: 1px solid rgba(0,240,255,.2);
                    border-radius: var(--radius);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    box-shadow: 0 20px 50px rgba(0,0,0,.9), 0 0 20px rgba(0,240,255,.1);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity .3s ease, transform .3s cubic-bezier(.175,.885,.32,1.275);
                }

                .controls.visible {
                    opacity: 1;
                    transform: translate(-50%,0) rotateX(0deg);
                    pointer-events: auto;
                }

                .control-button {
                    min-width: 42px;
                    height: 42px;
                    border: 0;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--panel2);
                    border: 1px solid rgba(255,255,255,.05);
                    color: #fff;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all .2s ease;
                }

                .control-button:hover {
                    background: rgba(0,240,255,.2);
                    border-color: var(--accent);
                    color: var(--accent);
                    box-shadow: 0 0 10px var(--accent-glow);
                    transform: translateY(-2px);
                }

                .control-button:active { transform: scale(.92); }

                .toast-container {
                    position: absolute;
                    top: calc(110px + var(--safe-top));
                    right: calc(16px + var(--safe-right));
                    z-index: 60;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    pointer-events: none;
                    perspective: 400px;
                }

                .toast {
                    pointer-events: auto;
                    min-width: 220px;
                    padding: 12px 16px;
                    border-radius: 12px;
                    background: rgba(12,16,28,.9);
                    border: 1px solid rgba(0,240,255,.3);
                    color: #fff;
                    font-size: 12px;
                    font-weight: 600;
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    box-shadow: 0 15px 35px rgba(0,0,0,.7), 0 0 10px var(--accent-glow);
                    transform: rotateY(-20deg) translateZ(-30px);
                    opacity: 0;
                    animation: toastIn .4s cubic-bezier(.175,.885,.32,1.275) forwards;
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }

                .toast.error-toast {
                    border-color: rgba(255,0,85,.4);
                    box-shadow: 0 15px 35px rgba(0,0,0,.7), 0 0 10px var(--danger-glow);
                }

                @keyframes toastIn {
                    to {
                        opacity: 1;
                        transform: rotateY(0deg) translateZ(0);
                    }
                }

                .error-panel {
                    position: absolute;
                    z-index: 50;
                    left: 50%;
                    top: 50%;
                    width: min(92%,440px);
                    transform: translate(-50%,-50%) scale(.9);
                    padding: 28px;
                    border-radius: 24px;
                    background: linear-gradient(160deg,rgba(20,24,40,.95),rgba(6,8,15,.98));
                    border: 1px solid rgba(255,255,255,.12);
                    box-shadow: 0 30px 90px rgba(0,0,0,.8), 0 0 30px rgba(0,0,0,.5);
                    text-align: center;
                    display: none;
                    transition: transform .3s ease;
                }

                .error-panel.visible {
                    display: block;
                    transform: translate(-50%,-50%) scale(1);
                }

                .error-icon { font-size: 36px; margin-bottom: 12px; }
                .error-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
                .error-message { color: var(--muted); line-height: 1.5; font-size: 13px; }

                .error-actions {
                    margin-top: 20px;
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                }

                .action-button {
                    border: 0;
                    border-radius: 12px;
                    padding: 12px 20px;
                    background: var(--accent);
                    color: #000;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    box-shadow: 0 0 15px var(--accent-glow);
                    transition: all .2s ease;
                }

                .action-button:hover { transform: translateY(-2px); }
                .action-button.secondary { background: rgba(255,255,255,.1); color: #fff; box-shadow: none; }
            `}</style>

            <header className="app-bar">
                <button
                    id="backButton"
                    className="back-button"
                    aria-label="Back to Dashboard"
                    onClick={navigateToDashboard}
                >
                    <span>‹</span> Back
                </button>
                <h1 className="app-bar-title">Mtl TV room</h1>
                <div style={{ width: '60px' }}></div>
            </header>

            <div className="banner-3d">
                <span className="status-dot"></span>
                <span className="banner-title">Famelack Engine 3.0</span>
            </div>

            <div className="toast-container" id="toastContainer">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`toast ${toast.isError ? 'error-toast' : ''}`}
                        style={toast.fadingOut ? { opacity: 0, transform: 'translateY(-10px)' } : {}}
                    >
                        {toast.text}
                    </div>
                ))}
            </div>

            <section className="stream-viewport" id="streamViewport">
                {isAuthenticated && streamSrc && (
                    <iframe
                        id="streamFrame"
                        className="stream-frame"
                        title="Famelack live sports stream"
                        src={streamSrc}
                        loading="eager"
                        referrerPolicy="no-referrer"
                        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
                        allowFullScreen
                        onLoad={handleFrameLoad}
                        style={{
                            height: `calc(100% + ${iframeCrop}px)`,
                            transform: `translateY(-${iframeCrop}px)`
                        }}
                    ></iframe>
                )}
            </section>

            <div
                id="loadingScreen"
                className={`loading-screen ${!isLoading ? 'hidden' : ''}`}
                role="status"
            >
                <div className="futuristic-loader">
                    <div className="core-glow"></div>
                    <div className="ring ring-1"></div>
                    <div className="ring ring-2"></div>
                    <div className="ring ring-3"></div>
                </div>
                <div id="loadingText" className="loading-text">{loadingText}</div>
            </div>

            <div
                id="status"
                className={`status ${statusState.type} ${statusState.visible ? 'visible' : ''}`}
                aria-live="polite"
            >
                <span id="statusDot" className="status-dot"></span>
                <span id="statusText">{statusState.text}</span>
            </div>

            <nav
                id="controls"
                className={`controls ${controlsVisible ? 'visible' : ''}`}
                aria-label="Stream controls"
            >
                <button
                    id="reloadButton"
                    className="control-button"
                    type="button"
                    title="Reload stream"
                    onClick={() => reloadStream(false)}
                >
                    ↻
                </button>
                <button
                    id="fullscreenButton"
                    className="control-button"
                    type="button"
                    title="Fullscreen"
                    onClick={toggleFullscreen}
                >
                    ⛶
                </button>
                <button
                    id="openButton"
                    className="control-button"
                    type="button"
                    title="Open stream directly"
                    onClick={() => window.open(targetWebsite, "_blank", "noopener,noreferrer")}
                >
                    ↗
                </button>
                <button
                    id="hideControlsButton"
                    className="control-button"
                    type="button"
                    title="Hide controls"
                    onClick={() => {
                        setControlsPermanentlyHidden(true);
                        hideControls();
                    }}
                >
                    ×
                </button>
            </nav>

            <section
                id="errorPanel"
                className={`error-panel ${errorState.visible ? 'visible' : ''}`}
                role="alert"
            >
                <div id="errorIcon" className="error-icon">⚠️</div>
                <h2 id="errorTitle" className="error-title">{errorState.title}</h2>
                <p id="errorMessage" className="error-message">{errorState.message}</p>
                <div className="error-actions">
                    {!isAuthenticated ? (
                        <button
                            id="loginButton"
                            className="action-button"
                            type="button"
                            onClick={navigateToAuth}
                        >
                            Log In
                        </button>
                    ) : (
                        <button
                            id="retryButton"
                            className="action-button"
                            type="button"
                            onClick={() => reloadStream(false)}
                        >
                            Try Again
                        </button>
                    )}
                    <button
                        id="directButton"
                        className="action-button secondary"
                        type="button"
                        onClick={() => window.open(targetWebsite, "_blank", "noopener,noreferrer")}
                    >
                        Open Provider
                    </button>
                </div>
            </section>
        </main>
    );
}
