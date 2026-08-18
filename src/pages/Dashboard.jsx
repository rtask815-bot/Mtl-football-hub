import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function PlaceholderPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const pageName = location.pathname.replace("/", "").toUpperCase() || "PAGE";

    return (
        <div className="placeholder-wrapper">
            <style>{`
                .placeholder-wrapper {
                    background-color: #030712;
                    color: #f9fafb;
                    font-family: 'Inter', sans-serif;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    text-align: center;
                }
                .placeholder-card {
                    background: rgba(17, 24, 39, 0.6);
                    backdrop-filter: blur(24px);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
                    border-radius: 24px;
                    padding: 48px 32px;
                    max-width: 480px;
                    width: 100%;
                }
                h1 {
                    font-family: 'Orbitron', sans-serif;
                    font-size: 22px;
                    font-weight: 800;
                    letter-spacing: 2px;
                    color: #00f5d4;
                    margin-bottom: 16px;
                }
                p {
                    font-size: 14px;
                    color: #9ca3af;
                    line-height: 1.6;
                    margin-bottom: 28px;
                }
                .btn-back {
                    background: linear-gradient(90deg, #1d4ed8, #0ea5e9);
                    border: none;
                    border-radius: 12px;
                    color: #ffffff;
                    padding: 14px 24px;
                    font-size: 13px;
                    font-weight: 700;
                    font-family: 'Orbitron', sans-serif;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                .btn-back:hover {
                    filter: brightness(1.15);
                    transform: translateY(-1px);
                }
            `}</style>
            <div className="placeholder-card">
                <h1>{pageName} UNDER DEVELOPMENT</h1>
                <p>This module is currently being configured within the MTL Neural Architecture. Check back soon for updates.</p>
                <button className="btn-back" onClick={() => navigate("/")}>RETURN TO GATEWAY</button>
            </div>
        </div>
    );
}
