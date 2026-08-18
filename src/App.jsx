import React, { useEffect, useState } from "react";
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
import GroupChats from "./pages/GroupChats.jsx";
import PastPredictions from "./pages/PastPredictions.jsx";
import Fixtures from "./pages/Fixtures.jsx";

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

function ProtectedRoute({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    
    useEffect(() => {
        const token = localStorage.getItem("mtl_auth_token");
        if (!token) {
            setIsAuthenticated(false);
        }
    }, []);

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
                <Route path="/" element={<Gateway />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/group-chats" element={<ProtectedRoute><GroupChats /></ProtectedRoute>} />
                <Route path="/past-predictions" element={<ProtectedRoute><PastPredictions /></ProtectedRoute>} />
                <Route path="/fixtures" element={<ProtectedRoute><Fixtures /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
