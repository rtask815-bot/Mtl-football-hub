import React, { useEffect, useState, useRef } from "react";
import * as THREE from 'three';
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabase.ts";

export default function Gateway() {
    const navigate = useNavigate();
    const [telemetryText, setTelemetryText] = useState("Connecting...");
    const [buttonText, setButtonText] = useState("connecting...");
    const [isTerminalFading, setIsTerminalFading] = useState(false);
    const [hasActiveSession, setHasActiveSession] = useState(false);

    const threeContainerRef = useRef(null);
    const ambientAudioRef = useRef(null);
    const goalAudioRef = useRef(null);
    const pulseTriggerRef = useRef(null);

    // Three.js 3D Backdrop & Interactive Experience
    useEffect(() => {
        const container = threeContainerRef.current;
        if (!container) return;

        let isMounted = true;
        let animationFrameId;

        // Scene, Camera, Renderer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 6;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Group for 3D Tactical Sphere & Nodes
        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        // 1. Geodesic Football Wireframe Lattice
        const sphereGeo = new THREE.IcosahedronGeometry(2.4, 2);
        const wireframeGeo = new THREE.WireframeGeometry(sphereGeo);
        const wireframeMat = new THREE.LineBasicMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.45,
            linewidth: 1
        });
        const sphereLines = new THREE.LineSegments(wireframeGeo, wireframeMat);
        globeGroup.add(sphereLines);

        // 2. Vertex Points (Tactical Stadium Coordinates)
        const vertices = sphereGeo.attributes.position.array;
        const ptsGeo = new THREE.BufferGeometry();
        ptsGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        const ptsMat = new THREE.PointsMaterial({
            color: 0x00f5d4,
            size: 0.08,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        const spherePoints = new THREE.Points(ptsGeo, ptsMat);
        globeGroup.add(spherePoints);

        // 3. Inner Core Geodesic Wireframe
        const innerGeo = new THREE.IcosahedronGeometry(1.6, 1);
        const innerWireframe = new THREE.WireframeGeometry(innerGeo);
        const innerMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.35
        });
        const innerCore = new THREE.LineSegments(innerWireframe, innerMat);
        globeGroup.add(innerCore);

        // 4. Tactical Orbit Rings
        const ringGeo1 = new THREE.TorusGeometry(3.2, 0.015, 16, 100);
        const ringMat1 = new THREE.MeshBasicMaterial({
            color: 0x00f5d4,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
        ring1.rotation.x = Math.PI / 3;
        ring1.rotation.y = Math.PI / 6;
        globeGroup.add(ring1);

        const ringGeo2 = new THREE.TorusGeometry(3.6, 0.012, 16, 100);
        const ringMat2 = new THREE.MeshBasicMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
        ring2.rotation.x = -Math.PI / 4;
        ring2.rotation.y = Math.PI / 3;
        globeGroup.add(ring2);

        // 5. Starfield / Floating Stadium Particles
        const particleCount = 450;
        const particlePositions = new Float32Array(particleCount * 3);
        const particleScales = new Float32Array(particleCount);

        for (let i = 0; i < particleCount * 3; i += 3) {
            particlePositions[i] = (Math.random() - 0.5) * 22;
            particlePositions[i + 1] = (Math.random() - 0.5) * 22;
            particlePositions[i + 2] = (Math.random() - 0.5) * 16 - 2;
            particleScales[i / 3] = Math.random() * 0.04 + 0.02;
        }

        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0x10b981,
            size: 0.05,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending
        });
        const particleSystem = new THREE.Points(particleGeo, particleMat);
        scene.add(particleSystem);

        // Interactive Mouse/Touch Parallax
        let mouseX = 0;
        let mouseY = 0;
        let targetRotX = 0;
        let targetRotY = 0;

        const handlePointerMove = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            mouseX = (clientX / window.innerWidth) * 2 - 1;
            mouseY = -(clientY / window.innerHeight) * 2 + 1;
            targetRotY = mouseX * 0.45;
            targetRotX = -mouseY * 0.45;
        };

        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        window.addEventListener('touchmove', handlePointerMove, { passive: true });

        // Pulse trigger on click / tap
        let pulseIntensity = 0;
        pulseTriggerRef.current = () => {
            pulseIntensity = 1.0;
        };

        // Resize handler
        const handleResize = () => {
            if (!isMounted || !renderer) return;
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        // Animation Loop
        let clock = new THREE.Clock();
        const animate = () => {
            if (!isMounted) return;
            const delta = clock.getDelta();
            const elapsed = clock.getElapsedTime();

            // Smooth damping rotation
            globeGroup.rotation.y += (targetRotY - globeGroup.rotation.y) * 0.05 + 0.003;
            globeGroup.rotation.x += (targetRotX - globeGroup.rotation.x) * 0.05;
            
            // Rings secondary rotation
            ring1.rotation.z += 0.004;
            ring2.rotation.z -= 0.003;
            innerCore.rotation.y -= 0.006;
            innerCore.rotation.x += 0.004;

            // Background floating particles slow drift
            particleSystem.rotation.y = elapsed * 0.02;
            particleSystem.rotation.x = Math.sin(elapsed * 0.03) * 0.05;

            // Handle pulse shockwave
            if (pulseIntensity > 0) {
                const scale = 1 + pulseIntensity * 0.25;
                globeGroup.scale.set(scale, scale, scale);
                wireframeMat.color.setHex(0x00f5d4);
                wireframeMat.opacity = 0.45 + pulseIntensity * 0.4;
                ptsMat.size = 0.08 + pulseIntensity * 0.1;
                pulseIntensity -= delta * 1.5;
                if (pulseIntensity <= 0) {
                    pulseIntensity = 0;
                    wireframeMat.color.setHex(0x10b981);
                    wireframeMat.opacity = 0.45;
                    ptsMat.size = 0.08;
                    globeGroup.scale.set(1, 1, 1);
                }
            }

            renderer.render(scene, camera);
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            isMounted = false;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('resize', handleResize);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            // Cleanup Three.js geometries and materials
            sphereGeo.dispose();
            wireframeGeo.dispose();
            wireframeMat.dispose();
            ptsGeo.dispose();
            ptsMat.dispose();
            innerGeo.dispose();
            innerWireframe.dispose();
            innerMat.dispose();
            ringGeo1.dispose();
            ringMat1.dispose();
            ringGeo2.dispose();
            ringMat2.dispose();
            particleGeo.dispose();
            particleMat.dispose();
            renderer.dispose();

            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    // Session check sequence
    useEffect(() => {
        let isMounted = true;

        const verifySupabaseSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (!isMounted) return;

                const active = !error && session !== null;
                setHasActiveSession(active);

                const sequences = [
                    "Requesting Secure Connection...",
                    "Validating cryptographic token integrity...",
                    "Synchronizing...",
                    active ? "Secure session detected..." : "Performing device posture check...",
                    active ? "Routing to encrypted authorization page..." : "Security clearance verified."
                ];

                let step = 0;
                const textInterval = setInterval(() => {
                    if (step < sequences.length - 1 && isMounted) {
                        step++;
                        setTelemetryText(sequences[step]);
                    }
                }, 550);

                const timeoutId = setTimeout(() => {
                    clearInterval(textInterval);
                    if (!isMounted) return;
                    if (active) {
                        setTelemetryText("Redirecting to dashboard...");
                        setIsTerminalFading(true);
                        setTimeout(() => navigate("/dashboard"), 400);
                    } else {
                        setTelemetryText("Proceed to authentication.");
                        setButtonText("CONTINUE");
                    }
                }, 3000);

                return () => {
                    clearInterval(textInterval);
                    clearTimeout(timeoutId);
                };
            } catch (err) {
                if (!isMounted) return;
                setTelemetryText("Proceed to authentication.");
                setButtonText("CONTINUE");
            }
        };

        verifySupabaseSession();

        return () => {
            isMounted = false;
        };
    }, [navigate]);

    const startAudioLandscape = () => {
        const ambient = ambientAudioRef.current;
        if (ambient && ambient.paused) {
            ambient.volume = 0.12;
            ambient.play().catch(() => {});
        }
    };

    const handleGatewayNavigation = async () => {
        startAudioLandscape();
        if (pulseTriggerRef.current) pulseTriggerRef.current();
        
        setTelemetryText("Handshaking secure tunnel...");
        setIsTerminalFading(true);

        const { data: { session } } = await supabase.auth.getSession();

        setTimeout(() => {
            if (session) {
                navigate("/dashboard");
            } else {
                navigate("/auth");
            }
        }, 400);
    };

    const triggerAdvancedAnimation = () => {
        startAudioLandscape();
        if (pulseTriggerRef.current) {
            pulseTriggerRef.current();
        }
        
        const speaker = goalAudioRef.current;
        if (speaker) {
            speaker.currentTime = 0;
            speaker.volume = 0.4;
            speaker.play().catch(() => {});
        }

        setTelemetryText("MTL QUANTUM PULSE ACTIVE");
    };

    return (
        <>
            <style>{`
                :root {
                    --brand-primary: #3b82f6;
                    --brand-neon: #00f5d4;
                    --brand-gold: #ffb703;
                    --surface-glass: rgba(6, 12, 28, 0.82);
                    --border-glass: rgba(0, 245, 212, 0.25);
                    --neon-glow: 0 0 30px rgba(0, 245, 212, 0.25), 0 0 60px rgba(59, 130, 246, 0.15);
                }

                .gateway-viewport {
                    box-sizing: border-box;
                    position: fixed;
                    inset: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: #010307;
                    color: #f8fafc;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    perspective: 1400px;
                    padding: clamp(0.5rem, 3vw, 2rem);
                    overflow: hidden;
                }

                .three-bg-canvas {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    pointer-events: none;
                }

                .bg-canvas {
                    position: absolute;
                    inset: 0;
                    z-index: -5;
                    background: radial-gradient(circle at 50% 50%, #071736 0%, #010307 100%);
                }

                .cyber-matrix-overlay {
                    position: absolute;
                    inset: 0;
                    z-index: -4;
                    opacity: 0.08;
                    mix-blend-mode: overlay;
                    pointer-events: none;
                    width: 100%;
                    height: 100%;
                }

                .telemetry-grid {
                    position: absolute;
                    inset: -100px;
                    z-index: -3;
                    background-image: 
                        linear-gradient(rgba(0, 245, 212, 0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 245, 212, 0.04) 1px, transparent 1px);
                    background-size: clamp(30px, 6vw, 60px) clamp(30px, 6vw, 60px);
                    transform: rotateX(35deg);
                    transform-origin: center center;
                    animation: gridScroll 20s linear infinite;
                }

                @keyframes gridScroll {
                    from { transform: rotateX(35deg) translateY(0); }
                    to { transform: rotateX(35deg) translateY(60px); }
                }

                .nebula {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(120px);
                    opacity: 0.25;
                    z-index: -2;
                    mix-blend-mode: screen;
                    animation: nebulaMorph 15s ease-in-out infinite alternate;
                }

                .nebula.alpha {
                    width: clamp(300px, 70vw, 600px);
                    height: clamp(300px, 70vw, 600px);
                    background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
                    top: -15%;
                    left: -10%;
                }

                .nebula.beta {
                    width: clamp(250px, 65vw, 550px);
                    height: clamp(250px, 65vw, 550px);
                    background: radial-gradient(circle, rgba(0, 245, 212, 0.35) 0%, transparent 70%);
                    bottom: -15%;
                    right: -10%;
                    animation-delay: -5s;
                }

                @keyframes nebulaMorph {
                    0% { transform: scale(1) translate(0px, 0px) rotate(0deg); }
                    100% { transform: scale(1.15) translate(20px, -20px) rotate(10deg); }
                }

                .hud-terminal {
                    position: relative;
                    z-index: 10;
                    width: 100%;
                    max-width: 420px;
                    max-height: 92vh;
                    padding: clamp(1.5rem, 4vw, 2.75rem) clamp(1rem, 3vw, 2.25rem);
                    background: var(--surface-glass);
                    border: 1px solid var(--border-glass);
                    backdrop-filter: blur(30px);
                    -webkit-backdrop-filter: blur(30px);
                    border-radius: 28px;
                    box-shadow: 0 35px 80px -25px rgba(0, 0, 0, 0.98), var(--neon-glow);
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    overflow-y: auto;
                    scrollbar-width: none;
                    opacity: 0;
                    transform: scale(0.94) translateY(10px);
                    animation: terminalEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .hud-terminal.fading {
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    opacity: 0 !important;
                    transform: scale(0.92) translateY(-10px) !important;
                }

                .hud-terminal::-webkit-scrollbar {
                    display: none;
                }

                @keyframes terminalEntrance {
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }

                .hud-terminal::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 15%;
                    width: 70%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, var(--brand-neon), var(--brand-primary), transparent);
                    box-shadow: 0 0 20px var(--brand-neon);
                }

                .hologram-stage {
                    position: relative;
                    width: clamp(70px, 15vw, 90px);
                    height: clamp(70px, 15vw, 90px);
                    margin-bottom: clamp(1rem, 3vh, 1.75rem);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    flex-shrink: 0;
                    transition: transform 0.3s ease;
                }

                .hologram-stage:hover {
                    transform: scale(1.08);
                }

                .core-node {
                    width: 18px;
                    height: 18px;
                    background-color: #ffffff;
                    border-radius: 50%;
                    box-shadow: 0 0 20px #fff, 0 0 35px var(--brand-neon);
                    z-index: 5;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .hologram-stage:hover .core-node {
                    transform: scale(1.3);
                    box-shadow: 0 0 25px #fff, 0 0 50px var(--brand-neon), 0 0 70px var(--brand-gold);
                }

                .holo-ring {
                    position: absolute;
                    border-radius: 50%;
                    border: 2px solid transparent;
                    mix-blend-mode: screen;
                }

                .holo-ring.outer {
                    width: 100%;
                    height: 100%;
                    border-top-color: var(--brand-primary);
                    border-bottom-color: rgba(59, 130, 246, 0.15);
                    animation: spinRing 3s linear infinite;
                }

                .holo-ring.inner {
                    width: 72%;
                    height: 72%;
                    border-right-color: var(--brand-neon);
                    border-left-color: rgba(0, 245, 212, 0.15);
                    animation: spinRingReverse 2s linear infinite;
                }

                @keyframes spinRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes spinRingReverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }

                .gateway-title {
                    font-size: clamp(1.25rem, 4vw, 1.5rem);
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    color: #ffffff;
                    margin-bottom: 0.25rem;
                    text-transform: uppercase;
                    background: linear-gradient(180deg, #ffffff 30%, #94a3b8 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .sub-bar {
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    font-size: clamp(0.6rem, 2vw, 0.68rem);
                    color: var(--brand-neon);
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    margin-bottom: clamp(1.2rem, 3vh, 1.75rem);
                    font-weight: 700;
                    opacity: 0.85;
                }

                .status-container {
                    display: inline-flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(2, 6, 15, 0.75);
                    padding: clamp(10px, 2vh, 12px) 16px;
                    border-radius: 14px;
                    border: 1px solid rgba(0, 245, 212, 0.15);
                    width: 100%;
                    margin-bottom: clamp(1.2rem, 3vh, 1.75rem);
                    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.5);
                }

                .pulse-indicator {
                    width: 8px;
                    height: 8px;
                    background-color: var(--brand-neon);
                    border-radius: 50%;
                    box-shadow: 0 0 12px var(--brand-neon);
                    animation: pulseState 1s infinite ease-in-out alternate;
                    flex-shrink: 0;
                }

                @keyframes pulseState {
                    0% { transform: scale(0.7); opacity: 0.3; }
                    100% { transform: scale(1.3); opacity: 1; }
                }

                .telemetry-text {
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    font-size: clamp(0.68rem, 2vw, 0.75rem);
                    font-weight: 600;
                    color: #cbd5e1;
                    letter-spacing: 0.03em;
                    text-align: left;
                    flex-grow: 1;
                    word-break: break-word;
                }

                .action-tray {
                    width: 100%;
                    opacity: 0;
                    transform: translateY(12px);
                    animation: trayReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.8s forwards;
                }

                @keyframes trayReveal {
                    to { opacity: 1; transform: translateY(0); }
                }

                .gate-btn {
                    width: 100%;
                    padding: clamp(0.75rem, 2vh, 0.95rem) 1.5rem;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(0, 245, 212, 0.2) 100%);
                    border: 1px solid rgba(0, 245, 212, 0.5);
                    border-radius: 14px;
                    color: #ffffff;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    font-size: clamp(0.8rem, 2.2vw, 0.88rem);
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    box-shadow: 0 4px 20px rgba(0, 245, 212, 0.15);
                }

                .gate-btn::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                    transform: translateX(-100%);
                    transition: transform 0.6s ease;
                }

                .gate-btn:hover::after {
                    transform: translateX(100%);
                }

                .gate-btn:hover {
                    border-color: var(--brand-neon);
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(0, 245, 212, 0.3) 100%);
                    box-shadow: 0 0 25px rgba(0, 245, 212, 0.4);
                    transform: translateY(-2px);
                }

                .gate-btn:active {
                    transform: translateY(0);
                }

                .btn-icon {
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    color: var(--brand-neon);
                    font-weight: 800;
                    transition: transform 0.3s ease;
                }

                .gate-btn:hover .btn-icon {
                    transform: translateX(4px);
                }
            `}</style>

            <div className="gateway-viewport">
                <div className="bg-canvas"></div>
                <div className="telemetry-grid"></div>

                <svg className="cyber-matrix-overlay" xmlns="http://www.w3.org/2000/svg">
                    <filter id="noiseFilter">
                        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
                        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.06 0"/>
                    </filter>
                    <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
                </svg>

                <div className="nebula alpha"></div>
                <div className="nebula beta"></div>

                {/* Interactive Three.js 3D Backdrop Canvas Container */}
                <div ref={threeContainerRef} className="three-bg-canvas" />

                <audio id="ambientStadium" ref={ambientAudioRef} loop>
                    <source src="/stadium_crowd.mp3" type="audio/mpeg" />
                </audio>
                <audio id="commentatorGoal" ref={goalAudioRef}>
                    <source src="/commentator_cheer.mp3" type="audio/mpeg" />
                </audio>

                <div className={`hud-terminal ${isTerminalFading ? "fading" : ""}`}>
                    <div className="hologram-stage" onClick={triggerAdvancedAnimation} title="Tap for 3D Quantum Pulse">
                        <div className="core-node"></div>
                        <div className="holo-ring outer"></div>
                        <div className="holo-ring inner"></div>
                    </div>
                    
                    <h1 className="gateway-title">MTL FOOTBALL HUB</h1>
                    <div className="sub-bar"> Intelligence Community Center </div>
                    
                    <div className="status-container">
                        <div className="pulse-indicator"></div>
                        <div className="telemetry-text">{telemetryText}</div>
                    </div>

                    <div className="action-tray">
                        <button className="gate-btn" id="gatewayBtn" onClick={handleGatewayNavigation}>
                            <span>{buttonText}</span>
                            <span className="btn-icon">&gt;&gt;</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
