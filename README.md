⚽ MTL Football Hub

<div align="center">MTL FOOTBALL HUB

"Football • Intelligence • Analytics • Community"

The football universe engineered into one digital experience.

<br>"Status" (https://img.shields.io/badge/Status-Active%20Development-00ff88?style=for-the-badge)
"React" (https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react)
"JavaScript" (https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript)
"Vite" (https://img.shields.io/badge/Vite-Fast-646CFF?style=for-the-badge&logo=vite)

</div>

🧬 The Concept

MTL Football Hub is a next-generation football platform combining:

              ⚽ FOOTBALL
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
      NEWS      ANALYTICS   COMMUNITY
        │          │          │
        ▼          ▼          ▼
     FIXTURES   PREDICTION   FORUMS
        │          │          │
        └──────────┼──────────┘
                   ▼
          FOOTBALL INTELLIGENCE

The objective is simple:

«Don't just watch football. Understand it. Analyse it. Discuss it. Predict it.

const ball = {
    x: 100,
    y: 100,
    vx: 2.4,
    vy: 1.8,
    radius: 12
};

function animateBall() {
    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x < 0 || ball.x > canvas.width) {
        ball.vx *= -1;
    }

    if (ball.y < 0 || ball.y > canvas.height) {
        ball.vy *= -1;
    }

    requestAnimationFrame(animateBall);
}

animateBall();

The result is a subtle autonomous football motion layer behind the interface.

---

⌨️ Typewriter Intelligence

System messages and football telemetry can appear character-by-character.

Example:

> INITIALIZING FOOTBALL INTELLIGENCE...
> LOADING FIXTURES...
> ANALYSING TEAM FORM...
> CALCULATING PERFORMANCE METRICS...
> MATCH ENGINE READY.

class Particle {
    constructor(canvas) {
        this.canvas = canvas;

        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;

        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;

        this.size = Math.random() * 2 + 0.5;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > this.canvas.width) {
            this.vx *= -1;
        }

        if (this.y < 0 || this.y > this.canvas.height) {
            this.vy *= -1;
        }
    }
}


.live-indicator {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    animation: livePulse 1.2s infinite;
}

@keyframes livePulse {
    0% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(1.7);
        opacity: 0.35;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}

function animateCounter(element, target, duration = 1200) {

    let start = 0;
    const increment = target / (duration / 16);

    function update() {
        start += increment;

        if (start >= target) {
            element.textContent = target;
            return;
        }

        element.textContent = Math.floor(start);

        requestAnimationFrame(update);
    }

    update();
}

animateCounter(
    document.querySelector("#possession"),
    68
);

Example:

POSSESSION

68%
██████████████████████████████████


┌─────────────────────────────────┐
│                                 │
│       ⚽ MATCH ANALYSIS         │
│                                 │
│       ◉ CALCULATING...          │
│                                 │
│       ███████░░░░░░░            │
│                                 │
│       FORM ................ OK  │
│       PLAYERS ............. OK  │
│       TACTICS ............. OK  │
│       STATISTICS .......... OK  │
│                                 │
└─────────────────────────────────┘



┌─────────────────────────────────────┐
│       AI MATCH PROJECTION            │
├─────────────────────────────────────┤
│                                     │
│  HOME          DRAW          AWAY   │
│  52%           27%           21%    │
│                                     │
│  ████████████░░░░░                  │
│                                     │
│  CONFIDENCE: 78%                    │
│                                     │
└─────────────────────────────────────┘


function drawPitch(ctx, width, height) {


       ●          ●

             ●

  ●                     ●

             ⚽

      ●             ●

             ●


.match-card {
    transition:
        transform 0.3s ease,
        box-shadow 0.3s ease;
}

.match-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 15px 40px rgba(0, 255, 150, 0.15);
}

Gradient Glow

.ai-card {
    animation: glow 3s ease-in-out infinite;
}

@keyframes glow {

    0% {
        box-shadow: 0 0 10px rgba(0, 255, 150, 0.08);
    }

    50% {
        box-shadow: 0 0 35px rgba(0, 255, 150, 0.22);
    }

    100% {
        box-shadow: 0 0 10px rgba(0, 255, 150, 0.08);
    }
}



                USER
                 │
                 ▼
        ┌─────────────────┐
        │ MTL FOOTBALL HUB │
        └────────┬────────┘
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
     NEWS      MATCHES   PLAYERS
       │         │         │
       └─────────┼─────────┘
                 ▼
          DATA PROCESSING
                 │
                 ▼
        ANALYTICS ENGINE
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
      FORM     TACTICS   STATS
        │        │        │
        └────────┼────────┘
                 ▼
           AI / ML LAYER
                 │
                 ▼
         FOOTBALL INSIGHTS



🗺️ Roadmap

PHASE 01
████████████████████  Foundation

PHASE 02
████████████░░░░░░░░  Football Data

PHASE 03
████████░░░░░░░░░░░░  Analytics

PHASE 04
██████░░░░░░░░░░░░░░  AI Intelligence

PHASE 05
████░░░░░░░░░░░░░░░░  Community

PHASE 06
██░░░░░░░░░░░░░░░░░░  Global Scale


        ✦             ·

              ⚽
        ╱           ╲
      ●               ●

 ───────────────────────────

       MTL FOOTBALL HUB

     LIVE INTELLIGENCE

       ████████████

   ⚡ MATCH ANALYSIS READY

 ───────────────────────────

       ● LIVE   67'
       
       TEAM A   2 — 1   TEAM B



git clone https://github.com/YOUR-USERNAME/MTL-football-hub.git

cd MTL-football-hub

npm install

npm run dev

Create your feature:

git checkout -b feature/your-feature

Commit:

git add .
git commit -m "Add: animated match intelligence"

Push:

git push origin feature/your-feature

Then open a Pull Request.





<div align="center">⚽ MTL FOOTBALL HUB

Built for fans. Powered by data. Driven by football.

"NEWS • DATA • ANALYTICS • PREDICTIONS • COMMUNITY"

<br>⭐ Star the repository if you believe football deserves better technology.

</div>
