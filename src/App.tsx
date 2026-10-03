import React, { useEffect, useState, createContext, useContext } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useLocation
} from "react-router-dom";
import Gateway from "./pages/Gateway.jsx";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import GroupChats from "./pages/GroupChats.tsx";
import PastPredictions from "./pages/PastPredictions.jsx";
import Predictions from "./pages/Predictions.jsx";
import Aipredictions from "./pages/Aipredictions.jsx";
import Fixtures from "./pages/Fixtures.jsx";
import Live from "./pages/Live.jsx";
import Tv from "./pages/Tv.jsx";
import Clubs from "./pages/Clubs.jsx";
import Notifications from "./pages/Notifications.jsx";
import Trending from "./pages/Trending.jsx";
import News from "./pages/News.tsx";
import AdminControlPanel from "./pages/AdminControlPanel.tsx";
import Engagement from "./pages/Engagement.tsx";
import { supabase } from "./config/supabase.ts";
import FuturisticLoader from "./components/FuturisticLoader.tsx";
import StickyHeader from "./components/StickyHeader.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
export { supabase };

// Fast Global Auth Context for zero-latency page transitions
interface AuthContextType {
    isAuthenticated: boolean | null;
    user: any;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: null,
    user: null,
});

export const useAuthSession = () => useContext(AuthContext);

function AuthSessionProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => {
        const storedToken = localStorage.getItem("mtl_auth_token") || localStorage.getItem("user");
        return storedToken ? true : null;
    });
    const [user, setUser] = useState<any>(() => {
        try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    useEffect(() => {
        let isMounted = true;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!isMounted) return;
            if (session?.user) {
                setIsAuthenticated(true);
                setUser(session.user);
                localStorage.setItem("user", JSON.stringify(session.user));
                if (session.access_token) {
                    localStorage.setItem("mtl_auth_token", session.access_token);
                }
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!isMounted) return;
            if (session?.user) {
                setIsAuthenticated(true);
                setUser(session.user);
                localStorage.setItem("user", JSON.stringify(session.user));
                if (session.access_token) {
                    localStorage.setItem("mtl_auth_token", session.access_token);
                }
            } else if (event === "SIGNED_OUT" || !session) {
                setIsAuthenticated(false);
                setUser(null);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, user }}>
            {children}
        </AuthContext.Provider>
    );
}

function SecurityHeadManager() {
    const location = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
        
        let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
        if (!metaRobots) {
            metaRobots = document.createElement('meta');
            metaRobots.name = "robots";
            document.head.appendChild(metaRobots);
        }
        metaRobots.content = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";

        let siteVerification = document.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement | null;
        if (!siteVerification) {
            siteVerification = document.createElement('meta');
            siteVerification.name = "google-site-verification";
            siteVerification.content = "verified";
            document.head.appendChild(siteVerification);
        }
    }, [location]);

    return null;
}

// Zero-Delay ProtectedRoute
function ProtectedRoute({ children }: { children: React.ReactElement }) {
    const { isAuthenticated } = useAuthSession();

    // Render loading indicator strictly only during initial cold application boot
    if (isAuthenticated === null) {
        return (
            <FuturisticLoader active={true} text="VERIFYING QUANTUM SESSION..." subText="AUTHENTICATING NODE" progress={85} />
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth" replace />;
    }

    return children;
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthSessionProvider>
                <BrowserRouter>
                    <SecurityHeadManager />
                    <StickyHeader />
                    <main className="relative min-h-[calc(100vh-64px)] w-full transition-opacity duration-150 ease-out">
                        <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<Gateway />} />
                            <Route path="/auth" element={<Auth />} />

                            {/* Protected Core Dashboard Routes */}
                            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                            {/* Feature Modules */}
                            <Route path="/group-chats" element={<ProtectedRoute><GroupChats /></ProtectedRoute>} />
                            <Route path="/tv" element={<ProtectedRoute><Tv /></ProtectedRoute>} />
                            <Route path="/past-predictions" element={<ProtectedRoute><PastPredictions /></ProtectedRoute>} />
                            <Route path="/predictions" element={<ProtectedRoute><Predictions /></ProtectedRoute>} />
                            <Route path="/ai-predictions" element={<ProtectedRoute><Aipredictions /></ProtectedRoute>} />
                            <Route path="/fixtures" element={<ProtectedRoute><Fixtures /></ProtectedRoute>} />
                            <Route path="/live" element={<ProtectedRoute><Live /></ProtectedRoute>} />
                            <Route path="/clubs" element={<ProtectedRoute><Clubs /></ProtectedRoute>} />
                            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                            <Route path="/trending" element={<ProtectedRoute><Trending /></ProtectedRoute>} />
                            <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
                            <Route path="/engagement" element={<ProtectedRoute><Engagement /></ProtectedRoute>} />
                            <Route path="/activity" element={<ProtectedRoute><Engagement /></ProtectedRoute>} />
                            <Route path="/admin" element={<ProtectedRoute><AdminControlPanel /></ProtectedRoute>} />
                            <Route path="/admin-control-panel" element={<ProtectedRoute><AdminControlPanel /></ProtectedRoute>} />

                            {/* Fallback Redirect */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                </BrowserRouter>
            </AuthSessionProvider>
        </ThemeProvider>
    );
}
