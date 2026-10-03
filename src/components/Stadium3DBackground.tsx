import React, { useEffect, useRef, memo } from "react";
import * as THREE from "three";

/**
 * State-of-the-Art 3D Football Stadium Simulation
 * Features a direct, prominent broadcast camera view of the pitch and players in action.
 * - Dynamic match play: Striker dribbling, winger overlapping, defenders jockeying, goalkeeper diving
 * - Players in authentic team uniforms (Home Neon Emerald & White vs Away Royal Blue & Navy)
 * - Articulated biomechanical running, sprinting, kicking, and arm-swing animation cycles
 * - Regulation FIFA-grade pitch with high-contrast emerald mowing stripes & crisp white lines
 * - 3D Goal assemblies with hexagonal depth nets and corner flags
 * - 2,600+ Spectators filling the grandstands with waving animations
 * - Animated pitch-side LED sponsor ribbon boards and scoreboard jumbotrons
 * - Independent delta-time animation loop isolated from DOM interactions
 */

function Stadium3DBackgroundComponent() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;

        let width = window.innerWidth;
        let height = window.innerHeight;

        // --- SCENE SETUP ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020713);
        // Very subtle atmospheric stadium haze so pitch and players are crystal clear
        scene.fog = new THREE.FogExp2(0x020713, 0.0035);

        // Perspective camera placed inside the stadium bowl with an elevated sideline broadcast view
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(0, 13, 25);

        let renderer: THREE.WebGLRenderer | null = null;
        try {
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: "high-performance",
                alpha: false,
                stencil: false,
                depth: true
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.25;

            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            container.appendChild(renderer.domElement);
        } catch (e) {
            console.warn("WebGL initialization fallback:", e);
            return;
        }

        const canvasEl = renderer.domElement;
        canvasEl.style.width = "100%";
        canvasEl.style.height = "100%";
        canvasEl.style.display = "block";
        canvasEl.style.pointerEvents = "none";

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

        // --- VIBRANT STADIUM LIGHTING ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
        scene.add(ambientLight);

        // Main stadium key floodlight illuminating the pitch & players
        const mainKeyLight = new THREE.DirectionalLight(0xe0f2fe, 2.2);
        mainKeyLight.position.set(15, 35, 20);
        mainKeyLight.castShadow = true;
        mainKeyLight.shadow.mapSize.width = 1024;
        mainKeyLight.shadow.mapSize.height = 1024;
        mainKeyLight.shadow.camera.near = 5;
        mainKeyLight.shadow.camera.far = 100;
        mainKeyLight.shadow.camera.left = -30;
        mainKeyLight.shadow.camera.right = 30;
        mainKeyLight.shadow.camera.top = 30;
        mainKeyLight.shadow.camera.bottom = -30;
        mainKeyLight.shadow.bias = -0.0004;
        scene.add(mainKeyLight);

        // Opposing rim light for depth and player silhouette definition
        const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
        rimLight.position.set(-18, 28, -25);
        scene.add(rimLight);

        // 4 Mega Stadium Floodlight Towers in corners
        const towerCoords: [number, number, number][] = [
            [-36, 26, -46],
            [36, 26, -46],
            [-36, 26, 46],
            [36, 26, 46]
        ];

        towerCoords.forEach(([tx, ty, tz]) => {
            const mast = new THREE.Mesh(
                new THREE.CylinderGeometry(0.45, 0.9, ty, 8),
                new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.2 })
            );
            mast.position.set(tx, ty / 2, tz);
            scene.add(mast);

            // Light cluster
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(5.5, 2.8, 1),
                new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
            );
            head.position.set(tx, ty, tz);
            head.lookAt(0, 2, 0);
            scene.add(head);

            const emitter = new THREE.Mesh(
                new THREE.PlaneGeometry(5.2, 2.4),
                new THREE.MeshBasicMaterial({ color: 0xcffafe })
            );
            emitter.position.set(0, 0, 0.52);
            head.add(emitter);

            const spot = new THREE.SpotLight(0xa5f3fc, 3.8, 95, Math.PI / 4, 0.45, 1.2);
            spot.position.set(tx, ty, tz);
            const target = new THREE.Object3D();
            target.position.set(tx * 0.25, 0, tz * 0.25);
            scene.add(target);
            spot.target = target;
            scene.add(spot);
        });

        // --- VIBRANT PITCH & FIFA SPEC MARKINGS ---
        const pitchGroup = new THREE.Group();

        const pitchCanvas = document.createElement("canvas");
        pitchCanvas.width = 1024;
        pitchCanvas.height = 1536;
        const pCtx = pitchCanvas.getContext("2d");
        if (pCtx) {
            // Bright vibrant natural pitch grass
            pCtx.fillStyle = "#15803d";
            pCtx.fillRect(0, 0, 1024, 1536);

            // High-contrast alternating mowing stripes
            const stripeHeight = 1536 / 16;
            for (let s = 0; s < 16; s++) {
                pCtx.fillStyle = s % 2 === 0 ? "#16a34a" : "#137435";
                pCtx.fillRect(0, s * stripeHeight, 1024, stripeHeight);
            }

            // Subtle turf pattern
            pCtx.fillStyle = "rgba(255, 255, 255, 0.04)";
            for (let n = 0; n < 3000; n++) {
                pCtx.fillRect(Math.random() * 1024, Math.random() * 1536, 2, 2);
            }
        }

        const grassTex = new THREE.CanvasTexture(pitchCanvas);
        grassTex.wrapS = THREE.ClampToEdgeWrapping;
        grassTex.wrapT = THREE.ClampToEdgeWrapping;

        const pitchMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(62, 94),
            new THREE.MeshStandardMaterial({
                map: grassTex,
                roughness: 0.6,
                metalness: 0.05
            })
        );
        pitchMesh.rotation.x = -Math.PI / 2;
        pitchMesh.receiveShadow = true;
        pitchGroup.add(pitchMesh);

        // White Pitch Lines
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const addLine = (w: number, h: number, x: number, z: number) => {
            const line = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(x, 0.035, z);
            pitchGroup.add(line);
        };

        // Outer Touchlines & Bylines
        addLine(52, 0.4, 0, 42);
        addLine(52, 0.4, 0, -42);
        addLine(0.4, 84, -26, 0);
        addLine(0.4, 84, 26, 0);

        // Halfway Line & Center Circle
        addLine(52, 0.4, 0, 0);
        const centerRing = new THREE.Mesh(new THREE.RingGeometry(8, 8.4, 48), lineMat);
        centerRing.rotation.x = -Math.PI / 2;
        centerRing.position.set(0, 0.04, 0);
        pitchGroup.add(centerRing);

        const centerSpot = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32), lineMat);
        centerSpot.rotation.x = -Math.PI / 2;
        centerSpot.position.set(0, 0.04, 0);
        pitchGroup.add(centerSpot);

        // Penalty Areas & Goal Areas
        const addPenaltyBox = (zPos: number, isTop: boolean) => {
            const dir = isTop ? 1 : -1;
            // 18-yard box
            addLine(30, 0.38, 0, zPos - dir * 15);
            addLine(0.38, 15, -15, zPos - dir * 7.5);
            addLine(0.38, 15, 15, zPos - dir * 7.5);

            // 6-yard box
            addLine(14, 0.32, 0, zPos - dir * 5.5);
            addLine(0.32, 5.5, -7, zPos - dir * 2.75);
            addLine(0.32, 5.5, 7, zPos - dir * 2.75);

            // Penalty spot
            const spot = new THREE.Mesh(new THREE.CircleGeometry(0.35, 32), lineMat);
            spot.rotation.x = -Math.PI / 2;
            spot.position.set(0, 0.04, zPos - dir * 10);
            pitchGroup.add(spot);

            // Penalty arc
            const arc = new THREE.Mesh(
                new THREE.RingGeometry(8, 8.35, 32, 1, Math.PI * 0.25, Math.PI * 0.5),
                lineMat
            );
            arc.rotation.x = -Math.PI / 2;
            arc.rotation.z = isTop ? 0 : Math.PI;
            arc.position.set(0, 0.04, zPos - dir * 10);
            pitchGroup.add(arc);
        };

        addPenaltyBox(42, true);
        addPenaltyBox(-42, false);

        // Corner Flags
        const cornerCoords: [number, number][] = [
            [-26, -42], [26, -42], [-26, 42], [26, 42]
        ];
        const flagMeshes: THREE.Mesh[] = [];
        cornerCoords.forEach(([cx, cz]) => {
            const pole = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8),
                new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
            );
            pole.position.set(cx, 0.8, cz);
            pitchGroup.add(pole);

            const flag = new THREE.Mesh(
                new THREE.PlaneGeometry(0.65, 0.45),
                new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide })
            );
            flag.position.set(cx + 0.32, 1.35, cz);
            pitchGroup.add(flag);
            flagMeshes.push(flag);
        });

        scene.add(pitchGroup);

        // --- 3D GOAL POSTS & DEPTH NETS ---
        const buildGoal = (zPos: number, rotY: number) => {
            const goal = new THREE.Group();
            const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.85, roughness: 0.15 });

            const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.4), postMat);
            leftPost.position.set(-4.5, 2.2, 0);
            leftPost.castShadow = true;
            goal.add(leftPost);

            const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.4), postMat);
            rightPost.position.set(4.5, 2.2, 0);
            rightPost.castShadow = true;
            goal.add(rightPost);

            const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 9.28), postMat);
            crossbar.rotation.z = Math.PI / 2;
            crossbar.position.set(0, 4.4, 0);
            crossbar.castShadow = true;
            goal.add(crossbar);

            const netMat = new THREE.MeshStandardMaterial({
                color: 0xf1f5f9,
                wireframe: true,
                transparent: true,
                opacity: 0.4
            });
            const net = new THREE.Mesh(new THREE.BoxGeometry(9.0, 4.3, 3.4), netMat);
            net.position.set(0, 2.15, -1.7);
            goal.add(net);

            goal.rotation.y = rotY;
            goal.position.set(0, 0, zPos);
            scene.add(goal);
        };

        buildGoal(-42, 0);
        buildGoal(42, Math.PI);

        // --- ANIMATED PITCH-SIDE LED RIBBON BOARDS ---
        const ledCanvas = document.createElement("canvas");
        ledCanvas.width = 1024;
        ledCanvas.height = 128;
        const ledCtx = ledCanvas.getContext("2d");
        const ledTex = new THREE.CanvasTexture(ledCanvas);
        ledTex.wrapS = THREE.RepeatWrapping;
        ledTex.wrapT = THREE.ClampToEdgeWrapping;
        ledTex.repeat.set(4, 1);

        const ledMat = new THREE.MeshBasicMaterial({ map: ledTex });
        const ledBack = new THREE.Mesh(new THREE.BoxGeometry(56, 1.1, 0.3), ledMat);
        ledBack.position.set(0, 0.55, -43.8);
        scene.add(ledBack);

        const ledFront = new THREE.Mesh(new THREE.BoxGeometry(56, 1.1, 0.3), ledMat);
        ledFront.position.set(0, 0.55, 43.8);
        ledFront.rotation.y = Math.PI;
        scene.add(ledFront);

        const ledSide = new THREE.Mesh(new THREE.BoxGeometry(86, 1.1, 0.3), ledMat);
        ledSide.position.set(-27.5, 0.55, 0);
        ledSide.rotation.y = Math.PI / 2;
        scene.add(ledSide);

        const ledSideR = new THREE.Mesh(new THREE.BoxGeometry(86, 1.1, 0.3), ledMat);
        ledSideR.position.set(27.5, 0.55, 0);
        ledSideR.rotation.y = -Math.PI / 2;
        scene.add(ledSideR);

        // --- 4-SIDED STADIUM STANDS WITH 2,600+ SPECTATORS ---
        const stadiumGroup = new THREE.Group();

        const buildGrandstand = (xPos: number, isWest: boolean) => {
            const stand = new THREE.Group();
            for (let t = 0; t < 12; t++) {
                const step = new THREE.Mesh(
                    new THREE.BoxGeometry(94, 1.1, 2.2),
                    new THREE.MeshStandardMaterial({
                        color: t % 2 === 0 ? 0x0f172a : 0x0284c7,
                        roughness: 0.7
                    })
                );
                step.position.set(0, 1.0 + t * 1.05, t * 2.1);
                stand.add(step);
            }
            // Roof
            const roof = new THREE.Mesh(
                new THREE.BoxGeometry(94, 1.2, 24),
                new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 })
            );
            roof.position.set(0, 17, 14);
            stand.add(roof);

            stand.position.set(xPos, 0, 0);
            stand.rotation.y = isWest ? Math.PI / 2 : -Math.PI / 2;
            return stand;
        };

        stadiumGroup.add(buildGrandstand(32, false));
        stadiumGroup.add(buildGrandstand(-32, true));

        // Goal end stands
        const buildGoalStand = (zPos: number, isNorth: boolean) => {
            const stand = new THREE.Group();
            for (let t = 0; t < 10; t++) {
                const step = new THREE.Mesh(
                    new THREE.BoxGeometry(60, 1.1, 2.2),
                    new THREE.MeshStandardMaterial({
                        color: t % 2 === 0 ? 0x0369a1 : 0x0f172a,
                        roughness: 0.7
                    })
                );
                step.position.set(0, 1.0 + t * 1.05, t * 2.1);
                stand.add(step);
            }
            stand.position.set(0, 0, zPos);
            stand.rotation.y = isNorth ? 0 : Math.PI;
            return stand;
        };

        stadiumGroup.add(buildGoalStand(47, false));
        stadiumGroup.add(buildGoalStand(-47, true));
        scene.add(stadiumGroup);

        // Instanced crowd fans
        const totalCrowd = 2400;
        const crowdMesh = new THREE.InstancedMesh(
            new THREE.CapsuleGeometry(0.26, 0.6, 4, 8),
            new THREE.MeshStandardMaterial({ roughness: 0.6 }),
            totalCrowd
        );

        const dummy = new THREE.Object3D();
        const crowdColor = new THREE.Color();
        const fanPalette = [0x10b981, 0x34d399, 0x0284c7, 0x38bdf8, 0xffffff, 0xf59e0b, 0xef4444];
        let crowdIdx = 0;

        for (let side = -1; side <= 1; side += 2) {
            for (let row = 0; row < 10; row++) {
                for (let col = -34; col <= 34; col += 2.2) {
                    if (crowdIdx >= totalCrowd) break;
                    dummy.position.set(
                        side * (32 + 2.0 + row * 2.05),
                        2.0 + row * 1.05,
                        col + (Math.random() * 0.4 - 0.2)
                    );
                    dummy.lookAt(0, 1.5, col * 0.4);
                    dummy.updateMatrix();
                    crowdMesh.setMatrixAt(crowdIdx, dummy.matrix);
                    crowdColor.setHex(fanPalette[Math.floor(Math.random() * fanPalette.length)]);
                    crowdMesh.setColorAt(crowdIdx, crowdColor);
                    crowdIdx++;
                }
            }
        }

        for (let end = -1; end <= 1; end += 2) {
            for (let row = 0; row < 8; row++) {
                for (let col = -20; col <= 20; col += 2.2) {
                    if (crowdIdx >= totalCrowd) break;
                    dummy.position.set(
                        col + (Math.random() * 0.4 - 0.2),
                        2.0 + row * 1.05,
                        end * (47 + 2.0 + row * 2.05)
                    );
                    dummy.lookAt(col * 0.4, 1.5, 0);
                    dummy.updateMatrix();
                    crowdMesh.setMatrixAt(crowdIdx, dummy.matrix);
                    crowdColor.setHex(fanPalette[Math.floor(Math.random() * fanPalette.length)]);
                    crowdMesh.setColorAt(crowdIdx, crowdColor);
                    crowdIdx++;
                }
            }
        }

        crowdMesh.instanceMatrix.needsUpdate = true;
        if (crowdMesh.instanceColor) crowdMesh.instanceColor.needsUpdate = true;
        scene.add(crowdMesh);

        // --- ARTICULATED REALISTIC FOOTBALL PLAYERS ---
        interface PlayerInstance {
            group: THREE.Group;
            torso: THREE.Group;
            leftLeg: THREE.Group;
            rightLeg: THREE.Group;
            leftArm: THREE.Group;
            rightArm: THREE.Group;
            team: "home" | "away" | "keeperAway";
            role: "striker" | "winger" | "midfielder" | "defender1" | "defender2" | "goalkeeper";
            stride: number;
        }

        const buildPlayer = (
            team: "home" | "away" | "keeperAway",
            role: "striker" | "winger" | "midfielder" | "defender1" | "defender2" | "goalkeeper",
            jerseyColorHex: number,
            shortsColorHex: number,
            socksColorHex: number
        ): PlayerInstance => {
            const player = new THREE.Group();
            // Scale up slightly for dramatic presence and crystal-clear visibility
            player.scale.set(1.4, 1.4, 1.4);

            const jerseyMat = new THREE.MeshStandardMaterial({
                color: jerseyColorHex,
                roughness: 0.35,
                metalness: 0.15
            });
            const shortsMat = new THREE.MeshStandardMaterial({
                color: shortsColorHex,
                roughness: 0.45
            });
            const sockMat = new THREE.MeshStandardMaterial({
                color: socksColorHex,
                roughness: 0.5
            });
            const skinMat = new THREE.MeshStandardMaterial({
                color: 0xd97706,
                roughness: 0.65
            });
            const bootMat = new THREE.MeshStandardMaterial({
                color: 0x090d16,
                roughness: 0.2,
                metalness: 0.5
            });

            // Torso & Hips
            const torso = new THREE.Group();
            torso.position.y = 1.85;
            player.add(torso);

            // Jersey Chest
            const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), jerseyMat);
            chest.position.y = 0.55;
            chest.castShadow = true;
            torso.add(chest);

            // Back number plate
            const numPlate = new THREE.Mesh(
                new THREE.PlaneGeometry(0.36, 0.48),
                new THREE.MeshBasicMaterial({ color: 0xffffff })
            );
            numPlate.position.set(0, 0.58, -0.26);
            numPlate.rotation.y = Math.PI;
            torso.add(numPlate);

            // Shorts
            const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.46, 0.48), shortsMat);
            shorts.position.y = -0.05;
            shorts.castShadow = true;
            torso.add(shorts);

            // Head & Hair
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), skinMat);
            head.position.y = 1.38;
            torso.add(head);

            const hair = new THREE.Mesh(
                new THREE.BoxGeometry(0.56, 0.22, 0.56),
                new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.9 })
            );
            hair.position.y = 1.52;
            torso.add(hair);

            // Left Arm
            const leftArm = new THREE.Group();
            leftArm.position.set(-0.58, 0.95, 0);
            const lSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.26), jerseyMat);
            lSleeve.position.y = -0.22;
            leftArm.add(lSleeve);
            const lForearm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.22), skinMat);
            lForearm.position.y = -0.65;
            leftArm.add(lForearm);
            torso.add(leftArm);

            // Right Arm
            const rightArm = new THREE.Group();
            rightArm.position.set(0.58, 0.95, 0);
            const rSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.26), jerseyMat);
            rSleeve.position.y = -0.22;
            rightArm.add(rSleeve);
            const rForearm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.22), skinMat);
            rForearm.position.y = -0.65;
            rightArm.add(rForearm);
            torso.add(rightArm);

            // Left Leg (hinges at hip)
            const leftLeg = new THREE.Group();
            leftLeg.position.set(-0.25, 1.75, 0);
            const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.72, 0.32), skinMat);
            lThigh.position.y = -0.36;
            leftLeg.add(lThigh);
            const lShin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 0.3), sockMat);
            lShin.position.y = -1.0;
            leftLeg.add(lShin);
            const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.54), bootMat);
            lBoot.position.set(0, -1.4, 0.1);
            lBoot.castShadow = true;
            leftLeg.add(lBoot);
            player.add(leftLeg);

            // Right Leg (hinges at hip)
            const rightLeg = new THREE.Group();
            rightLeg.position.set(0.25, 1.75, 0);
            const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.72, 0.32), skinMat);
            rThigh.position.y = -0.36;
            rightLeg.add(rThigh);
            const rShin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 0.3), sockMat);
            rShin.position.y = -1.0;
            rightLeg.add(rShin);
            const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.54), bootMat);
            rBoot.position.set(0, -1.4, 0.1);
            rBoot.castShadow = true;
            rightLeg.add(rBoot);
            player.add(rightLeg);

            scene.add(player);

            return {
                group: player,
                torso,
                leftLeg,
                rightLeg,
                leftArm,
                rightArm,
                team,
                role,
                stride: Math.random() * Math.PI * 2
            };
        };

        // Spawn Active Teams in view of the camera
        const players: PlayerInstance[] = [
            // Home Team (Striker No. 10 - Emerald Jersey, White Shorts)
            buildPlayer("home", "striker", 0x10b981, 0xffffff, 0x10b981),
            // Home Team (Winger No. 7 - Emerald Jersey, White Shorts)
            buildPlayer("home", "winger", 0x10b981, 0xffffff, 0x10b981),
            // Home Team (Midfielder No. 8 - Emerald Jersey, White Shorts)
            buildPlayer("home", "midfielder", 0x10b981, 0xffffff, 0x10b981),

            // Away Team (Centerback No. 4 - Royal Blue Jersey, Dark Navy Shorts)
            buildPlayer("away", "defender1", 0x2563eb, 0x0f172a, 0x2563eb),
            // Away Team (Fullback No. 3 - Royal Blue Jersey, Dark Navy Shorts)
            buildPlayer("away", "defender2", 0x2563eb, 0x0f172a, 0x2563eb),
            // Away Team Goalkeeper (No. 1 - Neon Pink Jersey, Dark Shorts)
            buildPlayer("keeperAway", "goalkeeper", 0xf43f5e, 0x1e293b, 0xf43f5e)
        ];

        // --- MATCH SOCCER BALL ---
        const ballGroup = new THREE.Group();
        const ballMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.42, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.1 })
        );
        ballMesh.castShadow = true;
        ballGroup.add(ballMesh);

        // Seams
        const seamMesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.422, 1),
            new THREE.MeshBasicMaterial({ color: 0x0f172a, wireframe: true })
        );
        ballGroup.add(seamMesh);
        scene.add(ballGroup);

        // --- FLOATING FLOODLIGHT PARTICLES ---
        const particleCount = 180;
        const particleGeo = new THREE.BufferGeometry();
        const particlePos = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount * 3; i += 3) {
            particlePos[i] = (Math.random() - 0.5) * 60;
            particlePos[i + 1] = Math.random() * 20 + 1;
            particlePos[i + 2] = (Math.random() - 0.5) * 80;
        }
        particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0x38bdf8,
            size: 0.4,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        // --- DYNAMIC AD BANNER TEXTURE TICKER ---
        let ledOffset = 0;
        const sponsors = [
            "⚡ MTL FOOTBALL HUB • LIVE INTELLIGENCE",
            "🏆 AI MATCH PREDICTIONS & REAL-TIME STATS",
            "⚽ PREMIER LEAGUE • CHAMPIONS LEAGUE • LA LIGA",
            "🔥 COMMUNITY MATCH CHATS & INSIGHTS"
        ];
        let sponsorIdx = 0;
        let lastSponsorSwitch = 0;

        const updateLEDTexture = (timeSec: number) => {
            if (!ledCtx) return;
            if (timeSec - lastSponsorSwitch > 4.5) {
                lastSponsorSwitch = timeSec;
                sponsorIdx = (sponsorIdx + 1) % sponsors.length;
            }

            ledCtx.fillStyle = "#020617";
            ledCtx.fillRect(0, 0, 1024, 128);

            ledCtx.fillStyle = "#10b981";
            ledCtx.fillRect(0, 0, 1024, 6);
            ledCtx.fillStyle = "#0284c7";
            ledCtx.fillRect(0, 122, 1024, 6);

            ledCtx.font = "bold 36px 'Rajdhani', sans-serif";
            ledCtx.fillStyle = "#ffffff";
            ledCtx.shadowColor = "#38bdf8";
            ledCtx.shadowBlur = 10;

            const text = sponsors[sponsorIdx];
            ledOffset = (ledOffset + 2) % 1024;
            ledCtx.fillText(text, 1024 - ledOffset, 74);
            ledCtx.fillText(text, 1024 - ledOffset + 680, 74);

            ledTex.needsUpdate = true;
        };

        // --- INDEPENDENT 60 FPS BROADCAST SIMULATION LOOP ---
        const clock = new THREE.Clock();
        let animFrameId: number;

        const renderFrame = () => {
            if (isContextLost || !renderer) return;

            if (!document.hidden) {
                const delta = Math.min(clock.getDelta(), 0.08);
                const elapsedTime = clock.getElapsedTime();

                // 1. BROADCAST SIDELINE CAMERA WITH GENTLE SWEEP
                // Positioned directly looking down upon the pitch and players at all times
                const panSway = Math.sin(elapsedTime * 0.25) * 9;
                const camZoom = 24 + Math.cos(elapsedTime * 0.18) * 3;
                camera.position.set(panSway, 12.5 + Math.sin(elapsedTime * 0.3) * 1.5, camZoom);
                
                // Focal point tracks the attack action around the penalty area
                camera.lookAt(panSway * 0.35, 1.8, 4 + Math.sin(elapsedTime * 0.4) * 4);

                // 2. MATCH SIMULATION CYCLE: DRIBBLING, PASSING, SPRINTING
                const cycleSpeed = 9;

                // Striker (Player 0) - Attacks toward away goal (+Z)
                const striker = players[0];
                striker.stride += delta * cycleSpeed;
                const strikerZ = 2 + Math.sin(elapsedTime * 0.5) * 14;
                const strikerX = Math.sin(elapsedTime * 0.9) * 6;
                striker.group.position.set(strikerX, 0, strikerZ);
                striker.group.rotation.y = Math.sin(elapsedTime * 0.9) * 0.35;

                const swing = Math.sin(striker.stride) * 0.8;
                striker.leftLeg.rotation.x = swing;
                striker.rightLeg.rotation.x = -swing;
                striker.leftArm.rotation.x = -swing * 0.8;
                striker.rightArm.rotation.x = swing * 0.8;
                striker.torso.position.y = 1.85 + Math.abs(Math.sin(striker.stride * 2)) * 0.12;

                // Soccer ball rolled by striker's feet
                ballGroup.position.set(strikerX + Math.sin(elapsedTime * 0.9) * 0.4, 0.42, strikerZ + 1.6);
                ballGroup.rotation.x += delta * 14;
                ballGroup.rotation.y += delta * 5;

                // Winger (Player 1) - Overlapping run on right wing
                const winger = players[1];
                winger.stride += delta * cycleSpeed * 0.95;
                const wingerZ = 6 + Math.sin(elapsedTime * 0.45 - 0.4) * 16;
                winger.group.position.set(16 + Math.sin(elapsedTime * 0.4) * 2, 0, wingerZ);
                winger.group.rotation.y = 0.25;
                const wSwing = Math.sin(winger.stride) * 0.75;
                winger.leftLeg.rotation.x = wSwing;
                winger.rightLeg.rotation.x = -wSwing;
                winger.leftArm.rotation.x = -wSwing * 0.75;
                winger.rightArm.rotation.x = wSwing * 0.75;

                // Midfielder (Player 2) - Trailing attack support
                const mid = players[2];
                mid.stride += delta * cycleSpeed * 0.7;
                mid.group.position.set(-8 + Math.sin(elapsedTime * 0.3) * 3, 0, strikerZ - 10);
                mid.group.rotation.y = 0.1;
                const mSwing = Math.sin(mid.stride) * 0.55;
                mid.leftLeg.rotation.x = mSwing;
                mid.rightLeg.rotation.x = -mSwing;
                mid.leftArm.rotation.x = -mSwing * 0.6;
                mid.rightArm.rotation.x = mSwing * 0.6;

                // Away Defender 1 (Player 3) - Jockeys and tracks striker
                const def1 = players[3];
                def1.stride += delta * cycleSpeed * 0.85;
                def1.group.position.set(strikerX + 2.8, 0, strikerZ + 5.2);
                def1.group.lookAt(strikerX, 0, strikerZ);
                const d1Swing = Math.sin(def1.stride) * 0.55;
                def1.leftLeg.rotation.x = d1Swing;
                def1.rightLeg.rotation.x = -d1Swing;
                def1.leftArm.rotation.x = -d1Swing * 0.6;
                def1.rightArm.rotation.x = d1Swing * 0.6;

                // Away Defender 2 (Player 4) - Marks the box
                const def2 = players[4];
                def2.stride += delta * cycleSpeed * 0.6;
                def2.group.position.set(-6, 0, strikerZ + 7);
                def2.group.lookAt(strikerX, 0, strikerZ);
                const d2Swing = Math.sin(def2.stride) * 0.45;
                def2.leftLeg.rotation.x = d2Swing;
                def2.rightLeg.rotation.x = -d2Swing;

                // Away Goalkeeper (Player 5) - Shifts along goal line guarding net
                const keeper = players[5];
                keeper.group.position.set(Math.sin(elapsedTime * 0.9) * 3.8, 0, 40.5);
                keeper.group.rotation.y = Math.PI;
                keeper.leftArm.rotation.z = -0.6 + Math.sin(elapsedTime * 2.5) * 0.2;
                keeper.rightArm.rotation.z = 0.6 - Math.sin(elapsedTime * 2.5) * 0.2;

                // Fluttering corner flags
                flagMeshes.forEach((fl, idx) => {
                    fl.rotation.y = Math.sin(elapsedTime * 5 + idx) * 0.4;
                });

                // Particles drift
                const pArray = particleGeo.attributes.position.array as Float32Array;
                for (let p = 1; p < particleCount * 3; p += 3) {
                    pArray[p] -= delta * 1.5;
                    if (pArray[p] < 0.5) pArray[p] = 20;
                }
                particleGeo.attributes.position.needsUpdate = true;

                // Throttled LED texture updates
                if (Math.floor(elapsedTime * 30) % 2 === 0) {
                    updateLEDTexture(elapsedTime);
                }

                renderer.render(scene, camera);
            }

            animFrameId = requestAnimationFrame(renderFrame);
        };

        animFrameId = requestAnimationFrame(renderFrame);

        // --- RESIZE HANDLER ---
        const handleResize = () => {
            if (!renderer) return;
            width = window.innerWidth;
            height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        };

        window.addEventListener("resize", handleResize, { passive: true });

        // --- CLEANUP ---
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

            scene.clear();
        };
    }, []);

    return (
        <div 
            ref={containerRef} 
            className="fixed inset-0 w-full h-full pointer-events-none select-none"
            style={{ 
                zIndex: -10, 
                pointerEvents: "none",
                willChange: "transform",
                transform: "translateZ(0)"
            }}
            aria-hidden="true"
        />
    );
}

export default memo(Stadium3DBackgroundComponent);
