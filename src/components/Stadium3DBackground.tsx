import React, { useEffect, useRef, memo } from "react";
import * as THREE from "three";

function Stadium3DBackgroundComponent() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        let width = window.innerWidth;
        let height = window.innerHeight;

        // --- THREE.JS SCENE INITIALIZATION ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020617);
        scene.fog = new THREE.FogExp2(0x020617, 0.012);

        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(0, 8, 22);

        let renderer: THREE.WebGLRenderer | null = null;
        try {
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: "high-performance",
                alpha: false
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // Clear existing elements & attach
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            container.appendChild(renderer.domElement);
        } catch (e) {
            console.warn("WebGL initialization fallback:", e);
            return;
        }

        const canvasEl = renderer.domElement;

        // --- WEBGL CONTEXT LOSS SAFETY ---
        let isContextLost = false;
        const handleContextLost = (event: Event) => {
            event.preventDefault();
            isContextLost = true;
        };
        const handleContextRestored = () => {
            isContextLost = false;
        };

        canvasEl.addEventListener("webglcontextlost", handleContextLost, false);
        canvasEl.addEventListener("webglcontextrestored", handleContextRestored, false);

        // --- STADIUM LIGHTING ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        scene.add(ambientLight);

        const mainPitchLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
        mainPitchLight.position.set(12, 30, 20);
        mainPitchLight.castShadow = true;
        mainPitchLight.shadow.mapSize.width = 1024;
        mainPitchLight.shadow.mapSize.height = 1024;
        scene.add(mainPitchLight);

        // 4 Corner Stadium Floodlight Towers
        const floodLightPositions: [number, number, number][] = [
            [-28, 22, -32],
            [28, 22, -32],
            [-28, 22, 32],
            [28, 22, 32]
        ];

        floodLightPositions.forEach(([fx, fy, fz]) => {
            const towerGeo = new THREE.CylinderGeometry(0.4, 0.7, 22, 8);
            const towerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });
            const tower = new THREE.Mesh(towerGeo, towerMat);
            tower.position.set(fx, fy / 2, fz);
            scene.add(tower);

            const panelGeo = new THREE.BoxGeometry(4, 2, 0.6);
            const panelMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.set(fx, fy, fz);
            panel.lookAt(0, 0, 0);
            scene.add(panel);

            const spot = new THREE.SpotLight(0x00f5d4, 3.5, 75, Math.PI / 3.8, 0.4, 1);
            spot.position.set(fx, fy, fz);
            spot.target.position.set(0, 0, 0);
            scene.add(spot);
            scene.add(spot.target);
        });

        // --- GREEN FOOTBALL PITCH & MARKINGS ---
        const pitchGroup = new THREE.Group();

        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "#0c5025";
            ctx.fillRect(0, 0, 1024, 1024);

            ctx.fillStyle = "#15803d";
            for (let i = 0; i < 1024; i += 128) {
                ctx.fillRect(0, i, 1024, 64);
            }

            ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
            for (let j = 0; j < 3000; j++) {
                const rx = Math.random() * 1024;
                const ry = Math.random() * 1024;
                ctx.fillRect(rx, ry, 2, 2);
            }
        }

        const grassTexture = new THREE.CanvasTexture(canvas);
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        grassTexture.repeat.set(2, 6);

        const pitchGeo = new THREE.PlaneGeometry(70, 110);
        const pitchMat = new THREE.MeshStandardMaterial({
            map: grassTexture,
            roughness: 0.5,
            metalness: 0.1
        });
        const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
        pitchMesh.rotation.x = -Math.PI / 2;
        pitchMesh.receiveShadow = true;
        pitchGroup.add(pitchMesh);

        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const createLine = (w: number, h: number, x: number, z: number, rotY = 0) => {
            const lineGeo = new THREE.PlaneGeometry(w, h);
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.rotation.x = -Math.PI / 2;
            line.rotation.z = rotY;
            line.position.set(x, 0.03, z);
            pitchGroup.add(line);
        };

        createLine(46, 0.45, 0, 48);
        createLine(46, 0.45, 0, -48);
        createLine(0.45, 96, -23, 0);
        createLine(0.45, 96, 23, 0);

        createLine(46, 0.35, 0, 0);
        const circleGeo = new THREE.RingGeometry(8, 8.35, 64);
        const circleMesh = new THREE.Mesh(circleGeo, lineMat);
        circleMesh.rotation.x = -Math.PI / 2;
        circleMesh.position.set(0, 0.04, 0);
        pitchGroup.add(circleMesh);

        const centerSpot = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), lineMat);
        centerSpot.rotation.x = -Math.PI / 2;
        centerSpot.position.set(0, 0.04, 0);
        pitchGroup.add(centerSpot);

        const createPenaltyArea = (pz: number) => {
            const sign = pz > 0 ? 1 : -1;
            createLine(26, 0.35, 0, pz - sign * 18);
            createLine(0.35, 18, -13, pz - sign * 9);
            createLine(0.35, 18, 13, pz - sign * 9);

            createLine(14, 0.3, 0, pz - sign * 6);
            createLine(0.3, 6, -7, pz - sign * 3);
            createLine(0.3, 6, 7, pz - sign * 3);

            const spot = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32), lineMat);
            spot.rotation.x = -Math.PI / 2;
            spot.position.set(0, 0.04, pz - sign * 12);
            pitchGroup.add(spot);
        };

        createPenaltyArea(48);
        createPenaltyArea(-48);

        scene.add(pitchGroup);

        // --- GOAL POSTS AT BOTH ENDS ---
        const createGoalPostAssembly = (gz: number, rotY = 0) => {
            const goalGroup = new THREE.Group();
            const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.1 });
            const netMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, wireframe: true, transparent: true, opacity: 0.45 });

            const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.8), postMat);
            leftPost.position.set(-5, 2.4, 0);
            const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.8), postMat);
            rightPost.position.set(5, 2.4, 0);

            const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 10.2), postMat);
            crossbar.rotation.z = Math.PI / 2;
            crossbar.position.set(0, 4.8, 0);

            const netGeo = new THREE.BoxGeometry(10.0, 4.7, 3.8);
            const goalNet = new THREE.Mesh(netGeo, netMat);
            goalNet.position.set(0, 2.35, -1.9);

            goalGroup.add(leftPost);
            goalGroup.add(rightPost);
            goalGroup.add(crossbar);
            goalGroup.add(goalNet);

            goalGroup.rotation.y = rotY;
            goalGroup.position.set(0, 0, gz);
            scene.add(goalGroup);
        };

        createGoalPostAssembly(-48, 0);
        createGoalPostAssembly(48, Math.PI);

        // --- STADIUM STANDS ---
        const stadiumGroup = new THREE.Group();
        const hoardGeo = new THREE.BoxGeometry(46, 1.4, 0.5);
        const hoardMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });

        const hoardBack = new THREE.Mesh(hoardGeo, hoardMat);
        hoardBack.position.set(0, 0.7, -49.5);
        stadiumGroup.add(hoardBack);

        const hoardFront = new THREE.Mesh(hoardGeo, hoardMat);
        hoardFront.position.set(0, 0.7, 49.5);
        stadiumGroup.add(hoardFront);

        for (let row = 0; row < 12; row++) {
            const standGeo = new THREE.BoxGeometry(60, 1.3, 2.2);
            const standMat = new THREE.MeshStandardMaterial({
                color: row % 2 === 0 ? 0x0f172a : 0x0284c7,
                roughness: 0.7
            });

            const standB = new THREE.Mesh(standGeo, standMat);
            standB.position.set(0, 1 + row * 1.2, -51 - row * 2.0);
            stadiumGroup.add(standB);

            const standF = new THREE.Mesh(standGeo, standMat);
            standF.position.set(0, 1 + row * 1.2, 51 + row * 2.0);
            stadiumGroup.add(standF);
        }
        scene.add(stadiumGroup);

        // --- ATMOSPHERIC PARTICLES ---
        const particleCount = 150;
        const particleGeo = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);

        for (let p = 0; p < particleCount * 3; p += 3) {
            particlePositions[p] = (Math.random() - 0.5) * 80;
            particlePositions[p + 1] = Math.random() * 25 + 2;
            particlePositions[p + 2] = (Math.random() - 0.5) * 100;
        }

        particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0x00f5d4,
            size: 0.35,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        // --- HUMANOID PLAYER & SOCCER BALL ON PITCH ---
        const playerGroup = new THREE.Group();
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
        const jerseyMat = new THREE.MeshStandardMaterial({ color: 0x00f5d4, roughness: 0.3, metalness: 0.2 });
        const shortsMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });

        const hips = new THREE.Group();
        hips.position.y = 2.1;
        playerGroup.add(hips);

        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.55), jerseyMat);
        chest.position.y = 0.65;
        hips.add(chest);

        const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 0.52), shortsMat);
        shorts.position.y = 0.0;
        hips.add(shorts);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 24), skinMat);
        head.position.y = 1.62;
        hips.add(head);

        playerGroup.position.set(-2, 0, 10);
        scene.add(playerGroup);

        const ballGroup = new THREE.Group();
        const ballGeo = new THREE.SphereGeometry(0.38, 32, 32);
        const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
        const ballMesh = new THREE.Mesh(ballGeo, ballMat);
        ballGroup.add(ballMesh);

        const ballOverlay = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.383, 1),
            new THREE.MeshBasicMaterial({ color: 0x0f172a, wireframe: true })
        );
        ballGroup.add(ballOverlay);
        ballGroup.position.set(0, 0.38, 8);
        scene.add(ballGroup);

        // --- INDEPENDENT NON-BLOCKING ANIMATION LOOP ---
        let animFrameId: number;

        const renderFrame = () => {
            if (isContextLost || !renderer) return;

            // Pause animation when tab is inactive to preserve resources
            if (!document.hidden) {
                const time = Date.now() * 0.00015;

                camera.position.x = Math.sin(time) * 22;
                camera.position.z = Math.cos(time) * 22 + 10;
                camera.position.y = 7.5 + Math.sin(time * 2) * 1.5;
                camera.lookAt(0, 1.2, 0);

                ballGroup.rotation.y += 0.01;
                ballGroup.position.x = Math.sin(time * 3) * 1.5;

                const positions = particleGeo.attributes.position.array as Float32Array;
                for (let i = 1; i < particleCount * 3; i += 3) {
                    positions[i] -= 0.02;
                    if (positions[i] < 0) positions[i] = 25;
                }
                particleGeo.attributes.position.needsUpdate = true;

                renderer.render(scene, camera);
            }

            animFrameId = requestAnimationFrame(renderFrame);
        };

        renderFrame();

        const handleResize = () => {
            if (!renderer) return;
            width = window.innerWidth;
            height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };

        window.addEventListener("resize", handleResize, { passive: true });

        return () => {
            window.removeEventListener("resize", handleResize);
            canvasEl.removeEventListener("webglcontextlost", handleContextLost);
            canvasEl.removeEventListener("webglcontextrestored", handleContextRestored);
            cancelAnimationFrame(animFrameId);
            if (renderer) {
                if (container && container.contains(canvasEl)) {
                    container.removeChild(canvasEl);
                }
                renderer.dispose();
            }
        };
    }, []);

    return (
        <div 
            ref={containerRef} 
            className="fixed inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: -10, pointerEvents: "none" }}
        />
    );
}

// Memoize so React page re-renders never destroy or reset the background canvas
export default memo(Stadium3DBackgroundComponent);
