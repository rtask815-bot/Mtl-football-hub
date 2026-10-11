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
import UserProfile from "./pages/UserProfile.tsx";
import { supabase } from "./config/supabase.ts";
import { StorageCache } from "./config/storageCache.ts";
import { startGlobalBackgroundSync } from "./config/storageCache.ts";
import FuturisticLoader from "./components/FuturisticLoader.tsx";
import StickyHeader from "./components/StickyHeader.tsx";
import OfflineIndicator from "./components/OfflineIndicator.tsx";
import FloatingBackButton from "./components/FloatingBackButton.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { SpotlightProvider } from "./components/physical/SpotlightProvider.tsx";
export { supabase };

// Fast Global Auth Context for zero-latency page transitions
export interface AuthContextType {
    isAuthenticated: boolean | null;
    user: any;
    userProfile: any;
    isAdmin: boolean;
    refreshAuthProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: null,
    user: null,
    userProfile: null,
    isAdmin: false,
    refreshAuthProfile: async () => {},
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

    const [userProfile, setUserProfile] = useState<any>(() => {
        try {
            return StorageCache.get('profile', null);
        } catch {
            return null;
        }
    });

    const [isAdmin, setIsAdmin] = useState<boolean>(() => {
        try {
            const raw = localStorage.getItem("user");
            if (raw) {
                const u = JSON.parse(raw);
                const email = (u?.email || '').toLowerCase();
                if (email === 'deveper3651@gmail.com' || email === 'lennoxmourice@gmail.com' || email === 'moricetonnylennox@gmail.com' || email.endsWith('@admin.com')) {
                    return true;
                }
            }
            const p = StorageCache.get('profile', null);
            return Boolean(p?.is_admin || p?.is_global_admin || p?.role === 'admin' || p?.admin);
        } catch {
            return false;
        }
    });

    // Helper to fetch profile claims strictly from Supabase
    const syncUserProfileAndClaims = async (sessionUser: any) => {
        if (!sessionUser) {
            setIsAdmin(false);
            setUserProfile(null);
            return;
        }
        try {
            const email = (sessionUser.email || '').toLowerCase();
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionUser.id)
                .maybeSingle();

            const isUserAdmin = Boolean(
                profile?.role === 'admin' ||
                profile?.is_admin === true ||
                profile?.admin === true ||
                profile?.is_global_admin === true ||
                email.endsWith('@admin.com') ||
                email === 'deveper3651@gmail.com' ||
                email === 'lennoxmourice@gmail.com' ||
                email === 'moricetonnylennox@gmail.com'
            );

            const activeProfile = profile || { email, username: email.split('@')[0], role: isUserAdmin ? 'admin' : 'member' };
            setUserProfile(activeProfile);
            setIsAdmin(isUserAdmin);
            StorageCache.set('profile', activeProfile);
            localStorage.setItem('mtl_is_admin', String(isUserAdmin));
        } catch (err) {
            console.warn('Auth claims sync warning:', err);
            setIsAdmin(false);
        }
    };

    const refreshAuthProfile = async () => {
        if (user) {
            await syncUserProfileAndClaims(user);
        }
    };

    useEffect(() => {
        let isMounted = true;

        // Initialize 30s background data sync engine across whole app
        startGlobalBackgroundSync();

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!isMounted) return;
            if (session?.user) {
                setIsAuthenticated(true);
                setUser(session.user);
                localStorage.setItem("user", JSON.stringify(session.user));
                if (session.access_token) {
                    localStorage.setItem("mtl_auth_token", session.access_token);
                }
                syncUserProfileAndClaims(session.user);
            } else {
                setIsAuthenticated(false);
                setUser(null);
                setUserProfile(null);
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
                syncUserProfileAndClaims(session.user);
            } else if (event === "SIGNED_OUT" || !session) {
                setIsAuthenticated(false);
                setUser(null);
                setUserProfile(null);
                setIsAdmin(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, userProfile, isAdmin, refreshAuthProfile }}>
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

// Zero-Delay ProtectedRoute: only shows loader on initial cold web boot
function ProtectedRoute({ children }: { children: React.ReactElement }) {
    const { isAuthenticated } = useAuthSession();

    if (isAuthenticated === null) {
        return (
            <FuturisticLoader active={true} text="SYNCHRONIZING HUB..." subText="VERIFYING QUANTUM SESSION" progress={85} />
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth" replace />;
    }

    return children;
}

// Zero-Delay AdminRoute: strictly limits admin sections to authenticated admins
function AdminRoute({ children }: { children: React.ReactElement }) {
    const { isAuthenticated, isAdmin } = useAuthSession();

    if (isAuthenticated === null) {
        return <FuturisticLoader active={true} text="VERIFYING SECURITY CLEARANCE..." progress={85} />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth" replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

function MainContentWrapper({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const isFullBleed = location.pathname === '/' || location.pathname === '/auth';

    return (
        <main className={`relative min-h-[calc(100vh-64px)] w-full transition-opacity duration-150 ease-out ${isFullBleed ? 'pt-0' : 'pt-16'}`}>
            {children}
        </main>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthSessionProvider>
                <SpotlightProvider>
                    <BrowserRouter>
                        <SecurityHeadManager />
                        <StickyHeader />
                        <OfflineIndicator />
                        <FloatingBackButton />
                        <MainContentWrapper>
                            <Routes>
                                {/* Public Routes */}
                                <Route path="/" element={<Gateway />} />
                                <Route path="/auth" element={<Auth />} />

                                {/* Protected Core Dashboard Routes */}
                                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                                <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />

                                {/* Feature Modules */}
                                <Route path="/group-chats" element={<ProtectedRoute><GroupChats /></ProtectedRoute>} />
                                <Route path="/tv" element={<ProtectedRoute><Tv /></ProtectedRoute>} />
                                <Route path="/past-predictions" element={<ProtectedRoute><PastPredictions /></ProtectedRoute>} />
                                <Route path="/predictions" element={<ProtectedRoute><Predictions /></ProtectedRoute>} />
                                <Route path="/ai-predictions" element={<ProtectedRoute><Aipredictions /></ProtectedRoute>} />
                                <Route path="/fixtures" element={<ProtectedRoute><Fixtures /></ProtectedRoute>} />
                                <Route path="/live" element={<ProtectedRoute><Live /></ProtectedRoute>} />
                                <Route path="/clubs" element={<ProtectedRoute><Clubs /></ProtectedRoute>} />
                                <Route path="/other-apps" element={<ProtectedRoute><Clubs /></ProtectedRoute>} />
                                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                                <Route path="/trending" element={<ProtectedRoute><Trending /></ProtectedRoute>} />
                                <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
                                <Route path="/engagement" element={<ProtectedRoute><Engagement /></ProtectedRoute>} />
                                <Route path="/activity" element={<ProtectedRoute><Engagement /></ProtectedRoute>} />
                                <Route path="/admin" element={<AdminRoute><AdminControlPanel /></AdminRoute>} />
                                <Route path="/admin-control-panel" element={<AdminRoute><AdminControlPanel /></AdminRoute>} />

                                {/* Fallback Redirect */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </MainContentWrapper>
                    </BrowserRouter>
                </SpotlightProvider>
            </AuthSessionProvider>
        </ThemeProvider>
    );
}
