import React, {
    useState,
    useEffect,
    useRef,
    useCallback
} from 'react';

import { createClient } from '@supabase/supabase-js';

/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://dfcgbwfralikyqxzxlbd.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkZmNnYndmcmFsaWt5cXh6bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTAwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMW9jVQI-fvfqLhnGM32WbZmipSjLdGA4";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   CONFIGURATION
========================================================= */

const CONFIG = Object.freeze({

    /* Cloudflare Pages Function */
    proxyApiBase: "/api/proxy",

    /* Provider */
    defaultTargetUrl:
        "https://www.betika.com.gh/streams",

    /* UI */
    cropTop: 60,

    /* Timers */
    loadTimeout: 20000,
    proxyTimeout: 15000,
    controlsDuration: 5000,
    toastDuration: 4500,

    /* Navigation */
    dashboardRoute: "/dashboard",
    authRoute: "/auth",

    /* Retry */
    maxAutomaticRetries: 3,
    retryDelay: 1500
});


/* =========================================================
   HELPERS
========================================================= */

function getErrorMessage(error, fallback = "Unknown error.") {

    if (!error) return fallback;

    if (typeof error === "string") {
        return error;
    }

    if (error.message) {
        return String(error.message);
    }

    try {
        return JSON.stringify(error);
    } catch {
        return fallback;
    }
}


function getNetworkInformation() {

    try {

        const connection =
            navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;

        if (!connection) {
            return {
                type: "Unknown",
                effectiveType: "Unknown",
                downlink: "Unknown",
                rtt: "Unknown"
            };
        }

        return {
            type: connection.type || "Unknown",
            effectiveType:
                connection.effectiveType || "Unknown",
            downlink:
                connection.downlink != null
                    ? `${connection.downlink} Mbps`
                    : "Unknown",
            rtt:
                connection.rtt != null
                    ? `${connection.rtt} ms`
                    : "Unknown"
        };

    } catch {
        return {
            type: "Unknown",
            effectiveType: "Unknown",
            downlink: "Unknown",
            rtt: "Unknown"
        };
    }
}


function getBrowserInfo() {

    return {
        online: navigator.onLine,
        userAgent: navigator.userAgent,
        language: navigator.language || "Unknown",
        platform: navigator.platform || "Unknown",
        viewport:
            `${window.innerWidth}x${window.innerHeight}`,
        pixelRatio:
            window.devicePixelRatio || 1,
        network: getNetworkInformation()
    };
}


/* =========================================================
   COMPONENT
========================================================= */

export default function Tv({
    targetWebsite = CONFIG.defaultTargetUrl
}) {

    /* =====================================================
       STATE
    ===================================================== */

    const [isAuthenticated, setIsAuthenticated] =
        useState(false);

    const [streamSrc, setStreamSrc] =
        useState(null);

    const [isLoading, setIsLoading] =
        useState(true);

    const [loadingText, setLoadingText] =
        useState("Authenticating Session...");

    const [isLoaded, setIsLoaded] =
        useState(false);

    const [iframeLoaded, setIframeLoaded] =
        useState(false);

    const [retryCount, setRetryCount] =
        useState(0);

    const [connectionTime, setConnectionTime] =
        useState(null);


    /* =====================================================
       CONNECTION STATE
    ===================================================== */

    const [connectionState, setConnectionState] =
        useState("AUTHENTICATING");


    /*
       Possible values:

       AUTHENTICATING
       AUTHENTICATED
       CHECKING_PROXY
       PROXY_CONNECTED
       LOADING_PLAYER
       PLAYER_LOADED
       READY
       OFFLINE
       ERROR
       CANCELLED
    */


    /* =====================================================
       STATUS
    ===================================================== */

    const [statusState, setStatusState] =
        useState({
            text: "Authenticating",
            type: "loading",
            visible: true
        });


    /* =====================================================
       CONTROLS
    ===================================================== */

    const [controlsVisible, setControlsVisible] =
        useState(false);

    const [controlsPermanentlyHidden, setControlsPermanentlyHidden] =
        useState(false);

    const [iframeCrop, setIframeCrop] =
        useState(CONFIG.cropTop);


    /* =====================================================
       ERROR STATE
    ===================================================== */

    const [errorState, setErrorState] =
        useState({
            visible: false,
            title: "Stream unavailable",
            message:
                "The stream could not be loaded.",
            code: "",
            details: "",
            stage: ""
        });


    /* =====================================================
       DIAGNOSTICS
    ===================================================== */

    const [diagnostics, setDiagnostics] =
        useState({
            auth: "Pending",
            proxy: "Pending",
            player: "Pending",
            network: navigator.onLine
                ? "Online"
                : "Offline",
            lastError: null
        });


    /* =====================================================
       TOASTS
    ===================================================== */

    const [toasts, setToasts] =
        useState([]);


    /* =====================================================
       REFS
    ===================================================== */

    const appRef =
        useRef(null);

    const iframeRef =
        useRef(null);

    const loadTimerRef =
        useRef(null);

    const proxyTimerRef =
        useRef(null);

    const controlsTimerRef =
        useRef(null);

    const liveStatusTimerRef =
        useRef(null);

    const abortControllerRef =
        useRef(null);

    const mountedRef =
        useRef(false);

    const isLoadedRef =
        useRef(false);

    const initializationRef =
        useRef(false);

    const reloadSequenceRef =
        useRef(0);

    const retryTimerRef =
        useRef(null);

    const initializationStartRef =
        useRef(null);

    const lastToastRef =
        useRef({});


    /* =====================================================
       KEEP REF IN SYNC
    ===================================================== */

    useEffect(() => {

        isLoadedRef.current =
            isLoaded;

    }, [isLoaded]);


    /* =====================================================
       TOAST SYSTEM
    ===================================================== */

    const createToast = useCallback(
        (text, isError = false) => {

            /*
             * Prevent identical messages from appearing
             * repeatedly within a short period.
             */

            const now = Date.now();

            const last =
                lastToastRef.current[text];

            if (last && now - last < 1200) {
                return;
            }

            lastToastRef.current[text] = now;

            const id =
                `${Date.now()}-${Math.random()}`;

            setToasts(prev => [
                ...prev,
                {
                    id,
                    text,
                    isError,
                    fadingOut: false
                }
            ]);

            setTimeout(() => {

                setToasts(prev =>
                    prev.map(toast =>
                        toast.id === id
                            ? {
                                ...toast,
                                fadingOut: true
                            }
                            : toast
                    )
                );

                setTimeout(() => {

                    setToasts(prev =>
                        prev.filter(
                            toast =>
                                toast.id !== id
                        )
                    );

                }, 350);

            }, CONFIG.toastDuration);
        },
        []
    );


    /* =====================================================
       CONTROLS
    ===================================================== */

    const hideControls = useCallback(() => {

        setControlsVisible(false);

    }, []);


    const showControls = useCallback(() => {

        if (controlsPermanentlyHidden) {
            return;
        }

        setControlsVisible(true);

        if (controlsTimerRef.current) {
            clearTimeout(
                controlsTimerRef.current
            );
        }

        controlsTimerRef.current =
            setTimeout(
                hideControls,
                CONFIG.controlsDuration
            );

    }, [
        controlsPermanentlyHidden,
        hideControls
    ]);


    /* =====================================================
       IFRAME LAYOUT
    ===================================================== */

    const updateIframeLayout =
        useCallback(() => {

            const width =
                window.visualViewport
                    ? window.visualViewport.width
                    : window.innerWidth;

            let crop =
                CONFIG.cropTop;

            if (width <= 320) {
                crop = 42;
            } else if (width <= 360) {
                crop = 48;
            } else if (width <= 480) {
                crop = 54;
            }

            setIframeCrop(crop);

        }, []);


    /* =====================================================
       PROXY URL
    ===================================================== */

    const getProxyUrl =
        useCallback((target) => {

            try {

                if (!target) {
                    return null;
                }

                const validTarget =
                    new URL(target);

                if (
                    validTarget.protocol !==
                        "http:" &&
                    validTarget.protocol !==
                        "https:"
                ) {
                    return null;
                }

                const encoded =
                    encodeURIComponent(
                        validTarget.toString()
                    );

                return (
                    `${CONFIG.proxyApiBase}?url=${encoded}`
                );

            } catch {

                return null;
            }

        }, []);


    /* =====================================================
       ERROR HANDLER
    ===================================================== */

    const showError = useCallback(
        (
            title,
            message,
            code = "UNKNOWN",
            details = "",
            stage = "UNKNOWN"
        ) => {

            console.error(
                `[MTL TV ERROR] ${code}`,
                {
                    title,
                    message,
                    details,
                    stage,
                    browser:
                        getBrowserInfo()
                }
            );

            setIsLoading(false);

            setConnectionState("ERROR");

            setErrorState({
                visible: true,
                title,
                message,
                code,
                details,
                stage
            });

            setStatusState({
                text: "Unavailable",
                type: "error",
                visible: true
            });

            setDiagnostics(prev => ({
                ...prev,
                lastError: code
            }));

            createToast(
                `${title}: ${message}`,
                true
            );

        },
        [createToast]
    );


    /* =====================================================
       AUTH ERROR
    ===================================================== */

    const handleAuthenticationError =
        useCallback(
            (error) => {

                setIsAuthenticated(false);

                setDiagnostics(prev => ({
                    ...prev,
                    auth: "Failed"
                }));

                if (!navigator.onLine) {

                    showError(
                        "Authentication Unavailable",
                        "Your device is currently offline. Supabase authentication cannot be verified until an internet connection is restored.",
                        "AUTH_OFFLINE",
                        "",
                        "AUTHENTICATION"
                    );

                    return;
                }

                if (error) {

                    const message =
                        getErrorMessage(
                            error,
                            "Supabase session verification failed."
                        );

                    showError(
                        "Authentication Error",
                        message,
                        "SUPABASE_AUTH_ERROR",
                        "The application could not verify your Supabase session.",
                        "AUTHENTICATION"
                    );

                    return;
                }

                showError(
                    "Authentication Required",
                    "No active Supabase session was found. Please log in before opening the TV room.",
                    "NO_SESSION",
                    "The TV room requires an authenticated session.",
                    "AUTHENTICATION"
                );

            },
            [showError]
        );


    /* =====================================================
       HTTP ERROR TRANSLATOR
    ===================================================== */

    const getHttpError =
        useCallback(
            async (response) => {

                let serverMessage = "";

                try {

                    const contentType =
                        response.headers.get(
                            "content-type"
                        ) || "";

                    if (
                        contentType.includes(
                            "application/json"
                        )
                    ) {

                        const json =
                            await response.json();

                        serverMessage =
                            json?.error ||
                            json?.message ||
                            json?.detail ||
                            "";

                    } else {

                        const text =
                            await response.text();

                        serverMessage =
                            text
                                .replace(
                                    /<[^>]*>/g,
                                    " "
                                )
                                .replace(
                                    /\s+/g,
                                    " "
                                )
                                .trim()
                                .slice(0, 500);
                    }

                } catch {
                    serverMessage = "";
                }


                switch (response.status) {

                    case 400:
                        return {
                            title:
                                "Bad Proxy Request",
                            message:
                                serverMessage ||
                                "The Cloudflare proxy rejected the request because the target URL or request parameters are invalid.",
                            code:
                                "PROXY_400",
                            details:
                                "HTTP 400 Bad Request."
                        };

                    case 401:
                        return {
                            title:
                                "Proxy Authentication Required",
                            message:
                                serverMessage ||
                                "The proxy requires authentication or the current authorization is not accepted.",
                            code:
                                "PROXY_401",
                            details:
                                "HTTP 401 Unauthorized."
                        };

                    case 403:
                        return {
                            title:
                                "Proxy Access Denied",
                            message:
                                serverMessage ||
                                "The request was forbidden by Cloudflare, the proxy, or the upstream provider.",
                            code:
                                "PROXY_403",
                            details:
                                "HTTP 403 Forbidden."
                        };

                    case 404:
                        return {
                            title:
                                "Proxy Endpoint Not Found",
                            message:
                                serverMessage ||
                                "The Cloudflare Pages Function '/api/proxy' could not be found.",
                            code:
                                "PROXY_404",
                            details:
                                "Check that functions/api/proxy.js exists and was deployed."
                        };

                    case 405:
                        return {
                            title:
                                "HTTP Method Not Allowed",
                            message:
                                serverMessage ||
                                "The Cloudflare proxy does not accept the requested HTTP method.",
                            code:
                                "PROXY_405",
                            details:
                                "The updated player uses GET rather than HEAD."
                        };

                    case 408:
                        return {
                            title:
                                "Proxy Request Timeout",
                            message:
                                serverMessage ||
                                "The Cloudflare proxy took too long to process the request.",
                            code:
                                "PROXY_408",
                            details:
                                "HTTP 408 Request Timeout."
                        };

                    case 409:
                        return {
                            title:
                                "Proxy Conflict",
                            message:
                                serverMessage ||
                                "The proxy rejected the request because of a request conflict.",
                            code:
                                "PROXY_409",
                            details:
                                "HTTP 409 Conflict."
                        };

                    case 410:
                        return {
                            title:
                                "Stream Endpoint Gone",
                            message:
                                serverMessage ||
                                "The requested upstream resource is no longer available.",
                            code:
                                "PROXY_410",
                            details:
                                "HTTP 410 Gone."
                        };

                    case 415:
                        return {
                            title:
                                "Unsupported Media Type",
                            message:
                                serverMessage ||
                                "The proxy or upstream server rejected the request format.",
                            code:
                                "PROXY_415",
                            details:
                                "HTTP 415 Unsupported Media Type."
                        };

                    case 421:
                        return {
                            title:
                                "Misdirected Request",
                            message:
                                serverMessage ||
                                "The request was sent to an endpoint that cannot serve this target.",
                            code:
                                "PROXY_421",
                            details:
                                "HTTP 421 Misdirected Request."
                        };

                    case 425:
                        return {
                            title:
                                "Request Not Ready",
                            message:
                                serverMessage ||
                                "The upstream server rejected the request because it considered it too early.",
                            code:
                                "PROXY_425",
                            details:
                                "HTTP 425 Too Early."
                        };

                    case 429:
                        return {
                            title:
                                "Too Many Requests",
                            message:
                                serverMessage ||
                                "The proxy or upstream provider is rate-limiting requests. Wait a moment and try again.",
                            code:
                                "PROXY_429",
                            details:
                                "HTTP 429 Too Many Requests."
                        };

                    case 451:
                        return {
                            title:
                                "Content Unavailable",
                            message:
                                serverMessage ||
                                "The requested resource is unavailable due to a legal or regional restriction.",
                            code:
                                "PROXY_451",
                            details:
                                "HTTP 451 Unavailable For Legal Reasons."
                        };

                    case 500:
                        return {
                            title:
                                "Cloudflare Function Error",
                            message:
                                serverMessage ||
                                "The Cloudflare proxy encountered an internal server error.",
                            code:
                                "PROXY_500",
                            details:
                                "HTTP 500 Internal Server Error."
                        };

                    case 501:
                        return {
                            title:
                                "Proxy Feature Unsupported",
                            message:
                                serverMessage ||
                                "The proxy does not support the operation required by the request.",
                            code:
                                "PROXY_501",
                            details:
                                "HTTP 501 Not Implemented."
                        };

                    case 502:
                        return {
                            title:
                                "Bad Gateway",
                            message:
                                serverMessage ||
                                "Cloudflare could not obtain a valid response from the upstream provider.",
                            code:
                                "PROXY_502",
                            details:
                                "HTTP 502 Bad Gateway."
                        };

                    case 503:
                        return {
                            title:
                                "Proxy Service Unavailable",
                            message:
                                serverMessage ||
                                "The Cloudflare Function or upstream service is temporarily unavailable.",
                            code:
                                "PROXY_503",
                            details:
                                "HTTP 503 Service Unavailable."
                        };

                    case 504:
                        return {
                            title:
                                "Gateway Timeout",
                            message:
                                serverMessage ||
                                "The upstream stream provider did not respond within the permitted time.",
                            code:
                                "PROXY_504",
                            details:
                                "HTTP 504 Gateway Timeout."
                        };

                    case 505:
                        return {
                            title:
                                "HTTP Version Unsupported",
                            message:
                                serverMessage ||
                                "The upstream server rejected the HTTP version used by the request.",
                            code:
                                "PROXY_505",
                            details:
                                "HTTP 505."
                        };

                    default:
                        return {
                            title:
                                "Proxy HTTP Error",
                            message:
                                serverMessage ||
                                `The proxy returned HTTP ${response.status}.`,
                            code:
                                `PROXY_HTTP_${response.status}`,
                            details:
                                response.statusText ||
                                "Unexpected HTTP response."
                        };
                }

            },
            []
        );


    /* =====================================================
       CLEANUP TIMERS
    ===================================================== */

    const clearAllTimers =
        useCallback(() => {

            if (loadTimerRef.current) {
                clearTimeout(
                    loadTimerRef.current
                );
                loadTimerRef.current = null;
            }

            if (proxyTimerRef.current) {
                clearTimeout(
                    proxyTimerRef.current
                );
                proxyTimerRef.current = null;
            }

            if (controlsTimerRef.current) {
                clearTimeout(
                    controlsTimerRef.current
                );
                controlsTimerRef.current = null;
            }

            if (liveStatusTimerRef.current) {
                clearTimeout(
                    liveStatusTimerRef.current
                );
                liveStatusTimerRef.current = null;
            }

            if (retryTimerRef.current) {
                clearTimeout(
                    retryTimerRef.current
                );
                retryTimerRef.current = null;
            }

        }, []);


    /* =====================================================
       MAIN STREAM INITIALIZATION
    ===================================================== */

    const reloadStream =
        useCallback(
            async (automatic = false) => {

                if (!mountedRef.current) {
                    return;
                }

                /*
                 * Generate a unique request ID.
                 *
                 * Any older request becomes invalid once
                 * a newer request begins.
                 */

                const requestId =
                    ++reloadSequenceRef.current;

                console.log(
                    `[MTL TV] Starting request ${requestId}`,
                    {
                        automatic,
                        targetWebsite
                    }
                );


                /* -----------------------------------------
                   NETWORK
                ----------------------------------------- */

                if (!navigator.onLine) {

                    showError(
                        "No Internet Connection",
                        "Your device appears to be offline. Check Wi-Fi or mobile data and try again.",
                        "NETWORK_OFFLINE",
                        "navigator.onLine returned false.",
                        "NETWORK"
                    );

                    return;
                }


                /* -----------------------------------------
                   ABORT PREVIOUS REQUEST
                ----------------------------------------- */

                if (
                    abortControllerRef.current
                ) {

                    abortControllerRef.current.abort();
                }

                const controller =
                    new AbortController();

                abortControllerRef.current =
                    controller;


                /* -----------------------------------------
                   RESET
                ----------------------------------------- */

                clearAllTimers();

                setIsLoading(true);

                setIsLoaded(false);

                setIframeLoaded(false);

                isLoadedRef.current = false;

                setStreamSrc(null);

                setErrorState(prev => ({
                    ...prev,
                    visible: false
                }));

                setDiagnostics({
                    auth: "Checking",
                    proxy: "Pending",
                    player: "Pending",
                    network: "Online",
                    lastError: null
                });

                initializationStartRef.current =
                    performance.now();


                /* -----------------------------------------
                   URL VALIDATION
                ----------------------------------------- */

                if (!targetWebsite) {

                    showError(
                        "Missing Stream URL",
                        "No stream provider URL has been configured.",
                        "URL_MISSING",
                        "targetWebsite is empty or undefined.",
                        "CONFIGURATION"
                    );

                    return;
                }


                let parsedTarget;

                try {

                    parsedTarget =
                        new URL(targetWebsite);

                } catch {

                    showError(
                        "Malformed Stream URL",
                        `The configured stream URL is invalid: ${targetWebsite}`,
                        "URL_INVALID",
                        "The browser could not parse targetWebsite as a valid URL.",
                        "CONFIGURATION"
                    );

                    return;
                }


                if (
                    parsedTarget.protocol !==
                        "http:" &&
                    parsedTarget.protocol !==
                        "https:"
                ) {

                    showError(
                        "Unsupported URL Protocol",
                        `The stream URL uses '${parsedTarget.protocol}', but only HTTP and HTTPS are supported.`,
                        "URL_PROTOCOL_UNSUPPORTED",
                        "",
                        "CONFIGURATION"
                    );

                    return;
                }


                /* -----------------------------------------
                   PROXY URL
                ----------------------------------------- */

                const baseProxyUrl =
                    getProxyUrl(targetWebsite);

                if (!baseProxyUrl) {

                    showError(
                        "Proxy URL Generation Failed",
                        "The application could not construct a valid Cloudflare proxy URL.",
                        "PROXY_URL_INVALID",
                        `Target: ${targetWebsite}`,
                        "CONFIGURATION"
                    );

                    return;
                }


                /* -----------------------------------------
                   AUTHENTICATION
                ----------------------------------------- */

                setConnectionState(
                    "AUTHENTICATING"
                );

                setStatusState({
                    text: "Authenticating",
                    type: "loading",
                    visible: true
                });

                setLoadingText(
                    "Authenticating Session..."
                );


                let sessionResult;

                try {

                    sessionResult =
                        await supabase.auth.getSession();

                } catch (authException) {

                    if (
                        controller.signal.aborted
                    ) {
                        return;
                    }

                    handleAuthenticationError(
                        authException
                    );

                    return;
                }


                if (
                    requestId !==
                    reloadSequenceRef.current
                ) {
                    return;
                }


                const session =
                    sessionResult?.data?.session;

                const sessionError =
                    sessionResult?.error;


                if (
                    sessionError ||
                    !session
                ) {

                    handleAuthenticationError(
                        sessionError
                    );

                    return;
                }


                setIsAuthenticated(true);

                setConnectionState(
                    "AUTHENTICATED"
                );

                setDiagnostics(prev => ({
                    ...prev,
                    auth: "Authenticated"
                }));


                /* -----------------------------------------
                   PROXY
                ----------------------------------------- */

                setConnectionState(
                    "CHECKING_PROXY"
                );

                setStatusState({
                    text: automatic
                        ? "Reconnecting"
                        : "Checking Proxy",
                    type: "loading",
                    visible: true
                });

                setLoadingText(
                    "Connecting Cloudflare Proxy..."
                );

                setDiagnostics(prev => ({
                    ...prev,
                    proxy: "Checking"
                }));


                const fullProxyUrl =
                    `${baseProxyUrl}&_t=${Date.now()}&request=${requestId}`;


                /*
                 * Browser-level timeout.
                 */

                proxyTimerRef.current =
                    setTimeout(() => {

                        if (
                            !controller.signal.aborted
                        ) {

                            controller.abort();

                            showError(
                                "Proxy Connection Timeout",
                                "Cloudflare did not respond within the allowed time.",
                                "PROXY_TIMEOUT",
                                `Timeout: ${CONFIG.proxyTimeout}ms`,
                                "PROXY"
                            );
                        }

                    }, CONFIG.proxyTimeout);


                let response;

                try {

                    /*
                     * GET only.
                     *
                     * Avoid the previous HEAD → GET
                     * race/compatibility problem.
                     */

                    response =
                        await fetch(
                            fullProxyUrl,
                            {
                                method: "GET",
                                signal:
                                    controller.signal,
                                cache:
                                    "no-store",
                                credentials:
                                    "same-origin",
                                redirect:
                                    "follow",
                                headers: {
                                    Accept:
                                        "text/html,application/xhtml+xml,*/*"
                                }
                            }
                        );

                } catch (fetchError) {

                    if (
                        fetchError?.name ===
                        "AbortError"
                    ) {
                        return;
                    }

                    console.error(
                        "[MTL TV] Fetch failure:",
                        fetchError
                    );


                    if (!navigator.onLine) {

                        showError(
                            "Network Connection Lost",
                            "The internet connection was lost while contacting the Cloudflare proxy.",
                            "NETWORK_LOST",
                            getErrorMessage(
                                fetchError
                            ),
                            "PROXY"
                        );

                        return;
                    }


                    /*
                     * TypeError from fetch commonly means
                     * network failure or browser security/CORS
                     * rejection.
                     */

                    if (
                        fetchError instanceof
                        TypeError
                    ) {

                        showError(
                            "Cannot Reach Cloudflare Proxy",
                            "The browser could not complete the proxy request. This may be caused by DNS, CORS, network filtering, an unavailable Cloudflare deployment, or a browser security restriction.",
                            "FETCH_TYPE_ERROR",
                            getErrorMessage(
                                fetchError
                            ),
                            "PROXY"
                        );

                        return;
                    }


                    showError(
                        "Proxy Request Failed",
                        getErrorMessage(
                            fetchError,
                            "The Cloudflare proxy request failed."
                        ),
                        "FETCH_FAILED",
                        "",
                        "PROXY"
                    );

                    return;
                }


                if (
                    proxyTimerRef.current
                ) {

                    clearTimeout(
                        proxyTimerRef.current
                    );

                    proxyTimerRef.current =
                        null;
                }


                if (
                    requestId !==
                    reloadSequenceRef.current
                ) {
                    return;
                }


                /* -----------------------------------------
                   HTTP RESPONSE
                ----------------------------------------- */

                if (!response) {

                    showError(
                        "Empty Proxy Response",
                        "The browser received no usable response from Cloudflare.",
                        "PROXY_EMPTY_RESPONSE",
                        "",
                        "PROXY"
                    );

                    return;
                }


                if (!response.ok) {

                    const httpError =
                        await getHttpError(
                            response
                        );

                    showError(
                        httpError.title,
                        httpError.message,
                        httpError.code,
                        httpError.details,
                        "PROXY"
                    );

                    setDiagnostics(prev => ({
                        ...prev,
                        proxy: "Failed"
                    }));

                    return;
                }


                /* -----------------------------------------
                   SUCCESSFUL PROXY RESPONSE
                ----------------------------------------- */

                setConnectionState(
                    "PROXY_CONNECTED"
                );

                setDiagnostics(prev => ({
                    ...prev,
                    proxy: "Connected"
                }));

                setStatusState({
                    text: "Proxy Connected",
                    type: "connected",
                    visible: true
                });

                setLoadingText(
                    "Loading Stream Player..."
                );


                /*
                 * Check content type.
                 *
                 * A proxy returning JSON when the iframe
                 * expects HTML is usually an error even if
                 * HTTP status is 200.
                 */

                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";


                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {

                    let jsonMessage =
                        "The proxy returned JSON instead of the expected stream page.";

                    try {

                        /*
                         * Clone so the original response
                         * remains untouched.
                         */

                        const cloned =
                            response.clone();

                        const json =
                            await cloned.json();

                        jsonMessage =
                            json?.error ||
                            json?.message ||
                            jsonMessage;

                    } catch {}


                    showError(
                        "Proxy Returned an Error Response",
                        jsonMessage,
                        "PROXY_JSON_RESPONSE",
                        `Content-Type: ${contentType}`,
                        "PROXY"
                    );

                    return;
                }


                /* -----------------------------------------
                   PLAYER
                ----------------------------------------- */

                setConnectionState(
                    "LOADING_PLAYER"
                );

                setDiagnostics(prev => ({
                    ...prev,
                    player: "Loading"
                }));


                /*
                 * Remove old iframe first.
                 *
                 * This guarantees a clean iframe lifecycle.
                 */

                setStreamSrc(null);


                /*
                 * Give React a render cycle before
                 * creating the new iframe.
                 */

                requestAnimationFrame(() => {

                    if (
                        requestId !==
                        reloadSequenceRef.current
                    ) {
                        return;
                    }

                    if (!mountedRef.current) {
                        return;
                    }

                    updateIframeLayout();

                    setStreamSrc(
                        fullProxyUrl
                    );

                });


                /* -----------------------------------------
                   IFRAME TIMEOUT
                ----------------------------------------- */

                loadTimerRef.current =
                    setTimeout(() => {

                        if (
                            requestId !==
                            reloadSequenceRef.current
                        ) {
                            return;
                        }

                        if (
                            !isLoadedRef.current
                        ) {

                            showError(
                                "Player Load Timeout",
                                "Cloudflare responded successfully, but the stream player did not finish loading within 20 seconds.",
                                "PLAYER_TIMEOUT",
                                "The iframe did not trigger its load event before the timeout.",
                                "PLAYER"
                            );
                        }

                    }, CONFIG.loadTimeout);

            },
            [
                targetWebsite,
                getProxyUrl,
                clearAllTimers,
                showError,
                handleAuthenticationError,
                getHttpError,
                updateIframeLayout
            ]
        );


    /* =====================================================
       IFRAME LOAD
    ===================================================== */

    const handleFrameLoad =
        useCallback(() => {

            console.log(
                "[MTL TV] Iframe loaded."
            );


            if (
                loadTimerRef.current
            ) {

                clearTimeout(
                    loadTimerRef.current
                );

                loadTimerRef.current =
                    null;
            }


            if (
                !mountedRef.current
            ) {
                return;
            }


            const elapsed =
                initializationStartRef.current
                    ? Math.round(
                        performance.now() -
                        initializationStartRef.current
                    )
                    : null;


            setConnectionTime(
                elapsed
            );

            setIsLoading(false);

            setIsLoaded(true);

            isLoadedRef.current = true;

            setIframeLoaded(true);

            setConnectionState(
                "PLAYER_LOADED"
            );

            setDiagnostics(prev => ({
                ...prev,
                player: "Loaded"
            }));

            setErrorState(prev => ({
                ...prev,
                visible: false
            }));


            setStatusState({
                text: "Player Loaded",
                type: "connected",
                visible: true
            });


            showControls();

            createToast(
                "Stream player loaded"
            );


            /*
             * Important:
             *
             * We deliberately do NOT say "LIVE".
             *
             * Cross-origin iframe onLoad only proves that
             * the iframe document loaded.
             */

            if (
                liveStatusTimerRef.current
            ) {

                clearTimeout(
                    liveStatusTimerRef.current
                );
            }


            liveStatusTimerRef.current =
                setTimeout(() => {

                    if (
                        mountedRef.current
                    ) {

                        setConnectionState(
                            "READY"
                        );

                        setDiagnostics(prev => ({
                            ...prev,
                            player: "Ready"
                        }));

                        setStatusState({
                            text: "Player Ready",
                            type: "connected",
                            visible: true
                        });
                    }

                }, 2500);

        }, [
            createToast,
            showControls
        ]);


    /* =====================================================
       IFRAME ERROR
    ===================================================== */

    const handleFrameError =
        useCallback(() => {

            console.error(
                "[MTL TV] Iframe failed to load."
            );

            setIframeLoaded(false);

            setDiagnostics(prev => ({
                ...prev,
                player: "Failed"
            }));

            showError(
                "Stream Frame Error",
                "The browser could not load the stream page inside the player frame.",
                "IFRAME_LOAD_ERROR",
                "Possible causes include framing restrictions, upstream failure, browser security policy, or an invalid proxy response.",
                "PLAYER"
            );

        }, [showError]);


    /* =====================================================
       NAVIGATION
    ===================================================== */

    const navigateToDashboard =
        useCallback(() => {

            if (
                window.router &&
                typeof window.router.push ===
                    "function"
            ) {

                window.router.push(
                    CONFIG.dashboardRoute
                );

            } else {

                window.location.href =
                    CONFIG.dashboardRoute;
            }

        }, []);


    const navigateToAuth =
        useCallback(() => {

            if (
                window.router &&
                typeof window.router.push ===
                    "function"
            ) {

                window.router.push(
                    CONFIG.authRoute
                );

            } else {

                window.location.href =
                    CONFIG.authRoute;
            }

        }, []);


    /* =====================================================
       FULLSCREEN
    ===================================================== */

    const toggleFullscreen =
        useCallback(async () => {

            try {

                if (
                    !document.fullscreenElement
                ) {

                    if (
                        !appRef.current ||
                        !appRef.current
                            .requestFullscreen
                    ) {

                        createToast(
                            "Fullscreen is not supported by this browser.",
                            true
                        );

                        return;
                    }

                    await appRef.current
                        .requestFullscreen();

                } else {

                    if (
                        document.exitFullscreen
                    ) {

                        await document
                            .exitFullscreen();
                    }
                }

            } catch (error) {

                console.error(
                    "[MTL TV] Fullscreen error:",
                    error
                );

                createToast(
                    "Fullscreen was blocked by the browser.",
                    true
                );
            }

        }, [createToast]);


    /* =====================================================
       DIRECT PROVIDER
    ===================================================== */

    const openProvider =
        useCallback(() => {

            try {

                const url =
                    new URL(targetWebsite);

                const opened =
                    window.open(
                        url.toString(),
                        "_blank",
                        "noopener,noreferrer"
                    );

                if (!opened) {

                    createToast(
                        "The browser blocked the new tab.",
                        true
                    );
                }

            } catch {

                createToast(
                    "The configured provider URL is invalid.",
                    true
                );
            }

        }, [
            targetWebsite,
            createToast
        ]);


    /* =====================================================
       AUTOMATIC RETRY
    ===================================================== */

    const automaticRetry =
        useCallback(() => {

            if (!mountedRef.current) {
                return;
            }

            if (!navigator.onLine) {
                return;
            }

            setRetryCount(prev => {

                const next =
                    prev + 1;

                if (
                    next >
                    CONFIG.maxAutomaticRetries
                ) {

                    return prev;
                }

                return next;
            });


            if (
                retryTimerRef.current
            ) {

                clearTimeout(
                    retryTimerRef.current
                );
            }


            retryTimerRef.current =
                setTimeout(() => {

                    if (
                        mountedRef.current
                    ) {

                        reloadStream(true);
                    }

                }, CONFIG.retryDelay);

        }, [reloadStream]);


    /* =====================================================
       NETWORK + AUTH LIFECYCLE
    ===================================================== */

    useEffect(() => {

        mountedRef.current = true;


        const handleOnline = () => {

            if (!mountedRef.current) {
                return;
            }

            setDiagnostics(prev => ({
                ...prev,
                network: "Online"
            }));

            setStatusState({
                text: "Connection Restored",
                type: "connected",
                visible: true
            });

            createToast(
                "Internet connection restored"
            );


            /*
             * Don't immediately hammer the endpoint.
             */

            setTimeout(() => {

                if (
                    mountedRef.current
                ) {

                    reloadStream(true);
                }

            }, 700);

        };


        const handleOffline = () => {

            if (!mountedRef.current) {
                return;
            }

            setDiagnostics(prev => ({
                ...prev,
                network: "Offline"
            }));

            setStatusState({
                text: "Offline",
                type: "offline",
                visible: true
            });

            createToast(
                "Internet connection lost",
                true
            );

        };


        const handleResize = () => {
            updateIframeLayout();
        };


        const handleVisibilityChange = () => {

            if (
                document.visibilityState ===
                "visible"
            ) {

                updateIframeLayout();
            }

        };


        window.addEventListener(
            "online",
            handleOnline
        );

        window.addEventListener(
            "offline",
            handleOffline
        );

        window.addEventListener(
            "resize",
            handleResize
        );

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );


        updateIframeLayout();


        /* =================================================
           ONE INITIAL AUTH CHECK
        ================================================= */

        if (!initializationRef.current) {

            initializationRef.current =
                true;

            reloadStream(true);
        }


        /* =================================================
           AUTH STATE LISTENER
        ================================================= */

        const {
            data: {
                subscription
            }
        } =
            supabase.auth.onAuthStateChange(
                (event, session) => {

                    if (
                        !mountedRef.current
                    ) {
                        return;
                    }


                    console.log(
                        "[MTL TV] Supabase auth event:",
                        event
                    );


                    if (session) {

                        setIsAuthenticated(
                            true
                        );


                        /*
                         * Only explicitly signed-in users
                         * need an immediate reload.
                         *
                         * TOKEN_REFRESHED must not
                         * continuously recreate the iframe.
                         */

                        if (
                            event ===
                            "SIGNED_IN"
                        ) {

                            reloadStream(true);
                        }


                    } else {

                        setIsAuthenticated(
                            false
                        );

                        setStreamSrc(null);

                        setIsLoading(false);

                        setConnectionState(
                            "ERROR"
                        );

                        setDiagnostics(prev => ({
                            ...prev,
                            auth: "Signed Out",
                            proxy: "Stopped",
                            player: "Stopped"
                        }));

                        showError(
                            "Authentication Required",
                            "Your Supabase session has ended. Please log in again to access the TV room.",
                            "SESSION_EXPIRED",
                            "",
                            "AUTHENTICATION"
                        );
                    }

                }
            );


        return () => {

            mountedRef.current =
                false;


            window.removeEventListener(
                "online",
                handleOnline
            );

            window.removeEventListener(
                "offline",
                handleOffline
            );

            window.removeEventListener(
                "resize",
                handleResize
            );

            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );


            subscription?.unsubscribe();


            if (
                abortControllerRef.current
            ) {

                abortControllerRef.current
                    .abort();
            }


            clearAllTimers();

        };

    }, [
        createToast,
        reloadStream,
        updateIframeLayout,
        showError,
        clearAllTimers
    ]);


    /* =====================================================
       CSS
    ===================================================== */

    return (
        <main
            className="stream-app"
            id="streamApp"
            ref={appRef}
        >

            <style>{`

                :root {
                    --bg: #030308;
                    --panel: rgba(12,14,24,.88);
                    --panel2: rgba(22,27,46,.78);
                    --text: #ffffff;
                    --muted: #828ba2;

                    --accent: #00f0ff;
                    --accent-glow:
                        rgba(0,240,255,.4);

                    --danger: #ff0055;
                    --danger-glow:
                        rgba(255,0,85,.4);

                    --success: #00ff88;
                    --warning: #ffaa00;

                    --radius: 16px;

                    --safe-top:
                        env(safe-area-inset-top, 0px);

                    --safe-right:
                        env(safe-area-inset-right, 0px);

                    --safe-bottom:
                        env(safe-area-inset-bottom, 0px);

                    --safe-left:
                        env(safe-area-inset-left, 0px);
                }


                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    -webkit-tap-highlight-color:
                        transparent;
                }


                html,
                body,
                #root {
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    background: #000;
                    overflow: hidden;
                }


                body {
                    font-family:
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        Roboto,
                        Helvetica,
                        Arial,
                        sans-serif;

                    color: var(--text);
                }


                button {
                    font-family: inherit;
                }


                .stream-app {
                    position: fixed;
                    inset: 0;

                    width: 100%;
                    height: 100dvh;
                    min-height: 100svh;

                    background:
                        radial-gradient(
                            circle at 50% 40%,
                            #070b19 0%,
                            #020208 55%,
                            #000 100%
                        );

                    overflow: hidden;

                    perspective: 1000px;
                    color: var(--text);
                }


                /* =========================================
                   APP BAR
                ========================================= */

                .app-bar {
                    position: absolute;

                    top: 0;
                    left: 0;
                    right: 0;

                    height:
                        calc(
                            56px +
                            var(--safe-top)
                        );

                    padding-top:
                        var(--safe-top);

                    padding-left:
                        calc(
                            12px +
                            var(--safe-left)
                        );

                    padding-right:
                        calc(
                            12px +
                            var(--safe-right)
                        );

                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    background:
                        linear-gradient(
                            180deg,
                            rgba(3,3,8,.97) 0%,
                            rgba(3,3,8,.55) 75%,
                            transparent 100%
                        );

                    backdrop-filter:
                        blur(12px);

                    -webkit-backdrop-filter:
                        blur(12px);

                    z-index: 45;

                    border-bottom:
                        1px solid
                        rgba(255,255,255,.08);
                }


                .app-bar-title {
                    font-size: 16px;
                    font-weight: 700;
                    letter-spacing: .5px;

                    color: var(--text);

                    text-shadow:
                        0 0 10px
                        rgba(0,240,255,.3);
                }


                .back-button {
                    display: inline-flex;
                    align-items: center;

                    gap: 6px;

                    padding: 8px 14px;

                    border-radius: 12px;

                    background:
                        var(--panel2);

                    border:
                        1px solid
                        rgba(0,240,255,.3);

                    color: var(--text);

                    font-size: 13px;
                    font-weight: 600;

                    cursor: pointer;

                    backdrop-filter:
                        blur(16px);

                    -webkit-backdrop-filter:
                        blur(16px);

                    box-shadow:
                        0 4px 15px
                        rgba(0,0,0,.5),
                        0 0 10px
                        var(--accent-glow);

                    transition:
                        all .25s ease;
                }


                .back-button:hover {
                    background:
                        rgba(0,240,255,.25);

                    border-color:
                        var(--accent);

                    color:
                        var(--accent);

                    transform:
                        translateY(-1px);

                    box-shadow:
                        0 6px 20px
                        rgba(0,0,0,.6),
                        0 0 15px
                        var(--accent-glow);
                }


                .back-button:active {
                    transform: scale(.95);
                }


                /* =========================================
                   STREAM VIEWPORT
                ========================================= */

                .stream-viewport {
                    position: absolute;

                    inset: 0;

                    top:
                        calc(
                            56px +
                            var(--safe-top)
                        );

                    width: 100%;

                    height:
                        calc(
                            100% -
                            56px -
                            var(--safe-top)
                        );

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


                /* =========================================
                   ENGINE BANNER
                ========================================= */

                .banner-3d {
                    position: absolute;

                    top:
                        calc(
                            68px +
                            var(--safe-top)
                        );

                    left: 50%;

                    transform:
                        translateX(-50%)
                        rotateX(10deg);

                    transform-style:
                        preserve-3d;

                    z-index: 35;

                    display: flex;
                    align-items: center;

                    gap: 12px;

                    padding: 8px 18px;

                    background:
                        linear-gradient(
                            135deg,
                            rgba(0,240,255,.15),
                            rgba(15,15,26,.85)
                        );

                    border:
                        1px solid
                        rgba(0,240,255,.3);

                    border-radius: 20px;

                    backdrop-filter:
                        blur(16px);

                    -webkit-backdrop-filter:
                        blur(16px);

                    box-shadow:
                        0 10px 30px
                        rgba(0,0,0,.8),
                        0 0 15px
                        var(--accent-glow);
                }


                .banner-title {
                    font-size: 12px;
                    font-weight: 800;

                    letter-spacing: 1px;

                    background:
                        linear-gradient(
                            90deg,
                            #fff,
                            var(--accent)
                        );

                    -webkit-background-clip:
                        text;

                    -webkit-text-fill-color:
                        transparent;

                    text-transform:
                        uppercase;
                }


                /* =========================================
                   LOADER
                ========================================= */

                .loading-screen {
                    position: absolute;

                    inset: 0;

                    z-index: 20;

                    display: flex;

                    flex-direction: column;

                    align-items: center;

                    justify-content: center;

                    gap: 24px;

                    background:
                        radial-gradient(
                            circle at center,
                            rgba(10,14,30,1) 0%,
                            rgba(3,3,8,1) 100%
                        );

                    transition:
                        opacity .4s ease,
                        visibility .4s ease;
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

                    transform-style:
                        preserve-3d;

                    perspective: 500px;
                }


                .ring {
                    position: absolute;

                    inset: 0;

                    border-radius: 50%;

                    border:
                        2px solid transparent;
                }


                .ring-1 {
                    border-top-color:
                        var(--accent);

                    border-bottom-color:
                        var(--accent);

                    animation:
                        rotate1 1.5s
                        linear infinite;

                    filter:
                        drop-shadow(
                            0 0 8px
                            var(--accent)
                        );
                }


                .ring-2 {
                    border-left-color:
                        var(--danger);

                    border-right-color:
                        var(--danger);

                    animation:
                        rotate2 2s
                        linear infinite;

                    filter:
                        drop-shadow(
                            0 0 8px
                            var(--danger)
                        );
                }


                .ring-3 {
                    border:
                        2px dashed
                        rgba(255,255,255,.3);

                    animation:
                        rotate3 4s
                        linear infinite;
                }


                .core-glow {
                    position: absolute;

                    inset: 25%;

                    background:
                        var(--accent);

                    border-radius: 50%;

                    filter:
                        blur(8px);

                    animation:
                        pulse-core
                        1.2s
                        ease-in-out
                        infinite
                        alternate;
                }


                @keyframes rotate1 {
                    from {
                        transform:
                            rotateX(35deg)
                            rotateY(-45deg)
                            rotateZ(0deg);
                    }

                    to {
                        transform:
                            rotateX(35deg)
                            rotateY(-45deg)
                            rotateZ(360deg);
                    }
                }


                @keyframes rotate2 {
                    from {
                        transform:
                            rotateX(50deg)
                            rotateY(10deg)
                            rotateZ(0deg);
                    }

                    to {
                        transform:
                            rotateX(50deg)
                            rotateY(10deg)
                            rotateZ(-360deg);
                    }
                }


                @keyframes rotate3 {
                    from {
                        transform:
                            rotateZ(0deg);
                    }

                    to {
                        transform:
                            rotateZ(360deg);
                    }
                }


                @keyframes pulse-core {
                    from {
                        opacity: .2;
                        transform: scale(.8);
                    }

                    to {
                        opacity: .8;
                        transform: scale(1.2);
                    }
                }


                .loading-text {
                    max-width: 85%;

                    text-align: center;

                    color: #e0e6ed;

                    font-size: 13px;

                    letter-spacing: 1px;

                    text-transform:
                        uppercase;

                    font-weight: 600;
                }


                /* =========================================
                   STATUS
                ========================================= */

                .status {
                    position: absolute;

                    z-index: 30;

                    top:
                        calc(
                            68px +
                            var(--safe-top)
                        );

                    left:
                        calc(
                            12px +
                            var(--safe-left)
                        );

                    display: flex;

                    align-items: center;

                    gap: 7px;

                    padding: 7px 12px;

                    border-radius: 999px;

                    background:
                        rgba(8,10,18,.78);

                    border:
                        1px solid
                        rgba(255,255,255,.1);

                    backdrop-filter:
                        blur(12px);

                    -webkit-backdrop-filter:
                        blur(12px);

                    font-size: 11px;

                    font-weight: 700;

                    letter-spacing: .5px;

                    opacity: 0;

                    pointer-events: none;

                    transition:
                        opacity .25s ease;
                }


                .status.visible {
                    opacity: 1;
                }


                .status-dot {
                    width: 8px;
                    height: 8px;

                    flex: 0 0 auto;

                    border-radius: 50%;

                    background:
                        var(--success);

                    box-shadow:
                        0 0 8px
                        var(--success);
                }


                .status.loading .status-dot {
                    background:
                        var(--warning);

                    box-shadow:
                        0 0 8px
                        var(--warning);

                    animation:
                        status-pulse
                        1s infinite;
                }


                .status.error .status-dot {
                    background:
                        var(--danger);

                    box-shadow:
                        0 0 8px
                        var(--danger);
                }


                .status.offline .status-dot {
                    background: #777;
                    box-shadow: none;
                }


                @keyframes status-pulse {
                    0% {
                        opacity: .4;
                    }

                    50% {
                        opacity: 1;
                    }

                    100% {
                        opacity: .4;
                    }
                }


                /* =========================================
                   CONTROLS
                ========================================= */

                .controls {
                    position: absolute;

                    z-index: 40;

                    left: 50%;

                    bottom:
                        calc(
                            18px +
                            var(--safe-bottom)
                        );

                    transform:
                        translate(-50%,20px)
                        rotateX(15deg);

                    transform-style:
                        preserve-3d;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    gap: 8px;

                    padding: 8px 12px;

                    background:
                        var(--panel);

                    border:
                        1px solid
                        rgba(0,240,255,.2);

                    border-radius:
                        var(--radius);

                    backdrop-filter:
                        blur(20px);

                    -webkit-backdrop-filter:
                        blur(20px);

                    box-shadow:
                        0 20px 50px
                        rgba(0,0,0,.9),
                        0 0 20px
                        rgba(0,240,255,.1);

                    opacity: 0;

                    pointer-events: none;

                    transition:
                        opacity .3s ease,
                        transform .3s
                        cubic-bezier(
                            .175,
                            .885,
                            .32,
                            1.275
                        );
                }


                .controls.visible {
                    opacity: 1;

                    transform:
                        translate(-50%,0)
                        rotateX(0deg);

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

                    background:
                        var(--panel2);

                    color: #fff;

                    font-size: 16px;

                    cursor: pointer;

                    transition:
                        all .2s ease;
                }


                .control-button:hover {
                    background:
                        rgba(0,240,255,.2);

                    border-color:
                        var(--accent);

                    color:
                        var(--accent);

                    box-shadow:
                        0 0 10px
                        var(--accent-glow);

                    transform:
                        translateY(-2px);
                }


                .control-button:active {
                    transform:
                        scale(.92);
                }


                /* =========================================
                   TOASTS
                ========================================= */

                .toast-container {
                    position: absolute;

                    top:
                        calc(
                            110px +
                            var(--safe-top)
                        );

                    right:
                        calc(
                            16px +
                            var(--safe-right)
                        );

                    z-index: 60;

                    display: flex;

                    flex-direction: column;

                    gap: 10px;

                    pointer-events: none;

                    perspective: 400px;

                    max-width:
                        min(
                            420px,
                            calc(100vw - 32px)
                        );
                }


                .toast {
                    pointer-events: auto;

                    min-width: 220px;

                    padding: 12px 16px;

                    border-radius: 12px;

                    background:
                        rgba(12,16,28,.94);

                    border:
                        1px solid
                        rgba(0,240,255,.3);

                    color: #fff;

                    font-size: 12px;

                    font-weight: 600;

                    backdrop-filter:
                        blur(16px);

                    -webkit-backdrop-filter:
                        blur(16px);

                    box-shadow:
                        0 15px 35px
                        rgba(0,0,0,.7),
                        0 0 10px
                        var(--accent-glow);

                    animation:
                        toastIn
                        .4s
                        cubic-bezier(
                            .175,
                            .885,
                            .32,
                            1.275
                        )
                        forwards;

                    transition:
                        opacity .3s ease,
                        transform .3s ease;
                }


                .toast.error-toast {
                    border-color:
                        rgba(255,0,85,.4);

                    box-shadow:
                        0 15px 35px
                        rgba(0,0,0,.7),
                        0 0 10px
                        var(--danger-glow);
                }


                @keyframes toastIn {
                    from {
                        opacity: 0;
                        transform:
                            translateY(-10px)
                            rotateY(-15deg);
                    }

                    to {
                        opacity: 1;
                        transform:
                            translateY(0)
                            rotateY(0);
                    }
                }


                /* =========================================
                   ERROR PANEL
                ========================================= */

                .error-panel {
                    position: absolute;

                    z-index: 50;

                    left: 50%;
                    top: 50%;

                    width:
                        min(
                            92%,
                            460px
                        );

                    max-height:
                        82vh;

                    overflow-y: auto;

                    transform:
                        translate(-50%,-50%)
                        scale(.9);

                    padding: 28px;

                    border-radius: 24px;

                    background:
                        linear-gradient(
                            160deg,
                            rgba(20,24,40,.97),
                            rgba(6,8,15,.99)
                        );

                    border:
                        1px solid
                        rgba(255,255,255,.12);

                    box-shadow:
                        0 30px 90px
                        rgba(0,0,0,.8),
                        0 0 30px
                        rgba(0,0,0,.5);

                    text-align: center;

                    display: none;

                    transition:
                        transform .3s ease;
                }


                .error-panel.visible {
                    display: block;

                    transform:
                        translate(-50%,-50%)
                        scale(1);
                }


                .error-icon {
                    font-size: 36px;
                    margin-bottom: 12px;
                }


                .error-title {
                    font-size: 18px;
                    font-weight: 700;

                    margin-bottom: 8px;
                }


                .error-message {
                    color:
                        var(--muted);

                    line-height: 1.5;

                    font-size: 13px;

                    word-break:
                        break-word;
                }


                .error-code {
                    display: inline-block;

                    margin-top: 12px;

                    padding: 5px 9px;

                    border-radius: 8px;

                    background:
                        rgba(255,255,255,.06);

                    color:
                        #aeb7ca;

                    font-family:
                        "JetBrains Mono",
                        "Courier New",
                        monospace;

                    font-size: 10px;

                    letter-spacing:
                        .5px;
                }


                .error-details {
                    margin-top: 12px;

                    padding: 10px;

                    border-radius: 10px;

                    background:
                        rgba(0,0,0,.25);

                    color:
                        #788399;

                    font-size: 10px;

                    line-height: 1.45;

                    text-align: left;

                    word-break:
                        break-word;
                }


                .error-actions {
                    margin-top: 20px;

                    display: flex;

                    flex-wrap: wrap;

                    gap: 10px;

                    justify-content: center;
                }


                .action-button {
                    border: 0;

                    border-radius: 12px;

                    padding:
                        12px 20px;

                    background:
                        var(--accent);

                    color: #000;

                    font-weight: 700;

                    font-size: 13px;

                    cursor: pointer;

                    box-shadow:
                        0 0 15px
                        var(--accent-glow);

                    transition:
                        all .2s ease;
                }


                .action-button:hover {
                    transform:
                        translateY(-2px);
                }


                .action-button.secondary {
                    background:
                        rgba(255,255,255,.1);

                    color: #fff;

                    box-shadow: none;
                }


                /* =========================================
                   DIAGNOSTIC PANEL
                ========================================= */

                .diagnostics {
                    position: absolute;

                    left: 12px;

                    bottom:
                        calc(
                            18px +
                            var(--safe-bottom)
                        );

                    z-index: 35;

                    max-width:
                        calc(100vw - 24px);

                    padding: 8px 10px;

                    border-radius: 10px;

                    background:
                        rgba(4,6,12,.7);

                    border:
                        1px solid
                        rgba(255,255,255,.06);

                    backdrop-filter:
                        blur(10px);

                    -webkit-backdrop-filter:
                        blur(10px);

                    color:
                        #69758e;

                    font-family:
                        "JetBrains Mono",
                        "Courier New",
                        monospace;

                    font-size: 9px;

                    line-height: 1.5;

                    pointer-events: none;

                    opacity: .7;
                }


                .diagnostics strong {
                    color: #9ca8be;
                }


                /* =========================================
                   MOBILE
                ========================================= */

                @media (max-width: 600px) {

                    .app-bar-title {
                        font-size: 15px;
                    }


                    .banner-3d {
                        max-width:
                            calc(100vw - 150px);

                        padding:
                            7px 12px;

                        gap: 8px;
                    }


                    .banner-title {
                        font-size: 10px;
                    }


                    .toast-container {
                        top:
                            calc(
                                106px +
                                var(--safe-top)
                            );

                        right: 10px;
                    }


                    .toast {
                        min-width: 0;

                        width:
                            min(
                                330px,
                                calc(
                                    100vw - 20px
                                )
                            );
                    }


                    .diagnostics {
                        display: none;
                    }


                    .error-panel {
                        padding: 22px;

                        width:
                            calc(
                                100% - 24px
                            );
                    }


                    .controls {
                        bottom:
                            calc(
                                12px +
                                var(--safe-bottom)
                            );
                    }

                }


                @media (max-height: 600px) {

                    .error-panel {
                        top: 54%;
                        max-height: 78vh;
                    }


                    .futuristic-loader {
                        width: 64px;
                        height: 64px;
                    }

                }

            `}</style>


            {/* =================================================
                APP BAR
            ================================================= */}

            <header className="app-bar">

                <button
                    id="backButton"
                    className="back-button"
                    aria-label="Back to Dashboard"
                    onClick={
                        navigateToDashboard
                    }
                >
                    <span>‹</span>
                    Back
                </button>


                <h1 className="app-bar-title">
                    Mtl TV room
                </h1>


                <div
                    style={{
                        width: "60px"
                    }}
                />

            </header>


            {/* =================================================
                ENGINE BANNER
            ================================================= */}

            <div className="banner-3d">

                <span className="status-dot" />

                <span className="banner-title">
                    Famelack Engine 3.0
                </span>

            </div>


            {/* =================================================
                TOASTS
            ================================================= */}

            <div
                className="toast-container"
                id="toastContainer"
            >

                {toasts.map(toast => (

                    <div
                        key={toast.id}
                        className={
                            `toast ${
                                toast.isError
                                    ? "error-toast"
                                    : ""
                            }`
                        }
                        style={
                            toast.fadingOut
                                ? {
                                    opacity: 0,
                                    transform:
                                        "translateY(-10px)"
                                }
                                : {}
                        }
                    >
                        {toast.text}
                    </div>

                ))}

            </div>


            {/* =================================================
                STREAM VIEWPORT
            ================================================= */}

            <section
                className="stream-viewport"
                id="streamViewport"
            >

                {isAuthenticated &&
                    streamSrc && (

                    <iframe
                        ref={iframeRef}
                        id="streamFrame"
                        className="stream-frame"
                        title="Famelack live sports stream"

                        src={streamSrc}

                        loading="eager"

                        referrerPolicy="no-referrer"

                        sandbox="
                            allow-scripts
                            allow-same-origin
                            allow-presentation
                            allow-forms
                            allow-popups
                            allow-popups-to-escape-sandbox
                        "

                        allow="
                            autoplay;
                            encrypted-media;
                            fullscreen;
                            picture-in-picture;
                            clipboard-write
                        "

                        allowFullScreen

                        onLoad={
                            handleFrameLoad
                        }

                        onError={
                            handleFrameError
                        }

                        style={{
                            height:
                                `calc(
                                    100% +
                                    ${iframeCrop}px
                                )`,

                            transform:
                                `translateY(
                                    -${iframeCrop}px
                                )`
                        }}
                    />

                )}

            </section>


            {/* =================================================
                LOADING SCREEN
            ================================================= */}

            <div
                id="loadingScreen"

                className={
                    `loading-screen ${
                        !isLoading
                            ? "hidden"
                            : ""
                    }`
                }

                role="status"
                aria-live="polite"
            >

                <div
                    className="futuristic-loader"
                >

                    <div
                        className="core-glow"
                    />

                    <div
                        className="ring ring-1"
                    />

                    <div
                        className="ring ring-2"
                    />

                    <div
                        className="ring ring-3"
                    />

                </div>


                <div
                    id="loadingText"
                    className="loading-text"
                >
                    {loadingText}
                </div>

            </div>


            {/* =================================================
                STATUS
            ================================================= */}

            <div
                id="status"

                className={
                    `status ${
                        statusState.type
                    } ${
                        statusState.visible
                            ? "visible"
                            : ""
                    }`
                }

                aria-live="polite"
            >

                <span
                    id="statusDot"
                    className="status-dot"
                />

                <span id="statusText">
                    {statusState.text}
                </span>

            </div>


            {/* =================================================
                DIAGNOSTICS
            ================================================= */}

            {!errorState.visible && (

                <div
                    className="diagnostics"
                    aria-hidden="true"
                >

                    <div>
                        <strong>AUTH:</strong>{" "}
                        {diagnostics.auth}
                    </div>

                    <div>
                        <strong>PROXY:</strong>{" "}
                        {diagnostics.proxy}
                    </div>

                    <div>
                        <strong>PLAYER:</strong>{" "}
                        {diagnostics.player}
                    </div>

                    <div>
                        <strong>NETWORK:</strong>{" "}
                        {diagnostics.network}
                    </div>

                    {connectionTime != null && (

                        <div>
                            <strong>LOAD:</strong>{" "}
                            {connectionTime}ms
                        </div>

                    )}

                </div>

            )}


            {/* =================================================
                CONTROLS
            ================================================= */}

            <nav
                id="controls"

                className={
                    `controls ${
                        controlsVisible
                            ? "visible"
                            : ""
                    }`
                }

                aria-label="Stream controls"
            >

                <button
                    id="reloadButton"
                    className="control-button"
                    type="button"
                    title="Reload stream"
                    aria-label="Reload stream"

                    onClick={() => {

                        setRetryCount(0);

                        reloadStream(false);

                    }}
                >
                    ↻
                </button>


                <button
                    id="fullscreenButton"
                    className="control-button"
                    type="button"
                    title="Fullscreen"
                    aria-label="Fullscreen"

                    onClick={
                        toggleFullscreen
                    }
                >
                    ⛶
                </button>


                <button
                    id="openButton"
                    className="control-button"
                    type="button"
                    title="Open provider"
                    aria-label="Open provider"

                    onClick={
                        openProvider
                    }
                >
                    ↗
                </button>


                <button
                    id="hideControlsButton"
                    className="control-button"
                    type="button"
                    title="Hide controls"
                    aria-label="Hide controls"

                    onClick={() => {

                        setControlsPermanentlyHidden(
                            true
                        );

                        hideControls();

                    }}
                >
                    ×
                </button>

            </nav>


            {/* =================================================
                ERROR PANEL
            ================================================= */}

            <section
                id="errorPanel"

                className={
                    `error-panel ${
                        errorState.visible
                            ? "visible"
                            : ""
                    }`
                }

                role="alert"
                aria-live="assertive"
            >

                <div
                    id="errorIcon"
                    className="error-icon"
                >
                    ⚠️
                </div>


                <h2
                    id="errorTitle"
                    className="error-title"
                >
                    {errorState.title}
                </h2>


                <p
                    id="errorMessage"
                    className="error-message"
                >
                    {errorState.message}
                </p>


                {errorState.code && (

                    <div
                        className="error-code"
                    >
                        {errorState.code}
                    </div>

                )}


                {errorState.details && (

                    <div
                        className="error-details"
                    >
                        <strong>
                            Diagnostic:
                        </strong>

                        <br />

                        {errorState.details}

                    </div>

                )}


                <div
                    className="error-actions"
                >

                    {!isAuthenticated ? (

                        <button
                            id="loginButton"
                            className="action-button"
                            type="button"

                            onClick={
                                navigateToAuth
                            }
                        >
                            Log In
                        </button>

                    ) : (

                        <button
                            id="retryButton"
                            className="action-button"
                            type="button"

                            onClick={() => {

                                setRetryCount(0);

                                reloadStream(false);

                            }}
                        >
                            Try Again
                        </button>

                    )}


                    <button
                        id="directButton"
                        className="action-button secondary"
                        type="button"

                        onClick={
                            openProvider
                        }
                    >
                        Open Provider
                    </button>

                </div>


                {retryCount > 0 && (

                    <div
                        style={{
                            marginTop: "12px",
                            fontSize: "10px",
                            color: "#68748a"
                        }}
                    >
                        Retry attempt:{" "}
                        {retryCount}/
                        {CONFIG.maxAutomaticRetries}
                    </div>

                )}

            </section>

        </main>
    );
}
