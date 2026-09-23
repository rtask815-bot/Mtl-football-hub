import React, { useEffect, useState } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useLocation
} from "react-router-dom";
import { createClient } from "@supabase/supabase-js";

import Gateway from "./pages/Gateway.jsx";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import GroupChats from "./pages/GroupChats.jsx";
import PastPredictions from "./pages/PastPredictions.jsx";
import Predictions from "./pages/Predictions.jsx";
import Aipredictions from "./pages/Aipredictions.jsx";
import Fixtures from "./pages/Fixtures.jsx";
import Live from "./pages/Live.jsx";
import Tv from "./pages/Tv.jsx";
import Clubs from "./pages/Clubs.jsx";
import Notifications from "./pages/Notifications.jsx";
import Trending from "./pages/Trending.jsx";

// Initialize Supabase Client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://dfcgbwfralikyqxzxlbd.supabase.co";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function SecurityHeadManager() {
    const location = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
        
        let metaRobots = document.querySelector('meta[name="robots"]');
        if (!metaRobots) {
            metaRobots = document.createElement('meta');
            metaRobots.name = "robots";
            document.head.appendChild(metaRobots);
        }
        metaRobots.content = "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";

        let siteVerification = document.querySelector('meta[name="google-site-verification"]');
        if (!siteVerification) {
            siteVerification = document.createElement('meta');
            siteVerification.name = "google-site-verification";
            siteVerification.content = "verified";
            document.head.appendChild(siteVerification);
        }
    }, [location]);

    return null;
}

// ProtectedRoute using Supabase Session Check
function ProtectedRoute({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        // 1. Check active Supabase session on load
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsAuthenticated(!!session);
        });

        // 2. Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Render loading indicator while session state resolves
    if (isAuthenticated === null) {
        return (
            <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#030308', color: '#fff' }}>
                Loading session...
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth" replace />;
    }

    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <SecurityHeadManager />
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

                {/* Fallback Redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
