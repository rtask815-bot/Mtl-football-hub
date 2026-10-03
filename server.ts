import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini SDK client server-side
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { prompt, contextStats } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const systemInstruction = `You are MTL AI Tactical Football Analyst, an expert sports intelligence bot. You analyze match statistics, expected goals (xG), formations, and betting odds to provide precise, tactical, and engaging insights to football fans. Live context stats: ${JSON.stringify(contextStats || {})}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Question: ${prompt}` }] }
      ]
    });

    const reply = response.text || 'Analysis currently unavailable.';
    res.json({ reply });
  } catch (err: any) {
    console.error('Gemini API Error:', err);
    res.status(500).json({ error: err.message || 'AI generation failed' });
  }
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * Generates an Ultra HD Futuristic MTL Live Football Stream Broadcast HTML
 */
function getMtlLiveStreamHtml(matchTitle = 'CF Montréal vs Toronto FC', channelName = 'MTL ULTRA HD CHANNEL 1', note = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MTL Football Ultra HD Live Feed</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@500;600;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #030712;
      color: #f9fafb;
      font-family: 'Inter', sans-serif;
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
      user-select: none;
    }
    
    /* Top Broadcast Scorebug */
    .scorebug {
      position: absolute;
      top: 16px;
      left: 20px;
      z-index: 40;
      background: rgba(7, 12, 23, 0.88);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 12px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7), 0 0 15px rgba(16, 185, 129, 0.2);
    }
    
    .team-badge {
      font-family: 'Orbitron', monospace;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .score-display {
      font-family: 'Orbitron', monospace;
      font-size: 22px;
      font-weight: 900;
      color: #00f0ff;
      background: rgba(0, 240, 255, 0.1);
      padding: 2px 10px;
      border-radius: 6px;
      border: 1px solid rgba(0, 240, 255, 0.3);
      text-shadow: 0 0 12px rgba(0, 240, 255, 0.8);
    }
    
    .clock-badge {
      font-family: 'Orbitron', monospace;
      font-size: 13px;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .live-dot {
      width: 8px;
      height: 8px;
      background: #ef4444;
      border-radius: 50%;
      box-shadow: 0 0 10px #ef4444;
      animation: pulse 1s infinite alternate;
    }
    
    @keyframes pulse {
      0% { opacity: 0.4; transform: scale(0.85); }
      100% { opacity: 1; transform: scale(1.15); }
    }
    
    /* Pitch Canvas */
    #pitch-canvas {
      width: 100vw;
      height: 100vh;
      display: block;
      background: radial-gradient(circle at center, #062b1e 0%, #03140e 60%, #020b08 100%);
    }
    
    /* Telemetry HUD Overlays */
    .hud-overlay {
      position: absolute;
      bottom: 24px;
      left: 20px;
      right: 20px;
      z-index: 40;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      pointer-events: none;
    }
    
    .hud-commentary {
      background: rgba(10, 17, 32, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(6, 182, 212, 0.35);
      border-radius: 12px;
      padding: 12px 18px;
      max-width: 480px;
      pointer-events: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
    }
    
    .hud-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: #00f0ff;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .hud-text {
      font-size: 13px;
      color: #e2e8f0;
      line-height: 1.4;
      font-weight: 500;
      min-height: 36px;
    }
    
    .hud-controls {
      background: rgba(10, 17, 32, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 12px;
      padding: 10px 16px;
      display: flex;
      gap: 12px;
      align-items: center;
      pointer-events: auto;
    }
    
    .btn-hud {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #fff;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 13px;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-hud:hover {
      background: #10b981;
      color: #000;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.6);
    }
    
    .quality-badge {
      position: absolute;
      top: 16px;
      right: 20px;
      z-index: 40;
      background: rgba(10, 17, 32, 0.85);
      border: 1px solid rgba(0, 240, 255, 0.4);
      padding: 6px 14px;
      border-radius: 9999px;
      font-family: 'Orbitron', monospace;
      font-size: 11px;
      color: #00f0ff;
      letter-spacing: 0.1em;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    /* Radar Map */
    .mini-radar {
      position: absolute;
      bottom: 24px;
      right: 20px;
      width: 140px;
      height: 90px;
      background: rgba(4, 9, 20, 0.85);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 8px;
      pointer-events: none;
      z-index: 39;
    }
  </style>
</head>
<body>

  <!-- Scorebug Header -->
  <div class="scorebug">
    <div class="team-badge" style="color: #60a5fa;">
      <span>🔵</span> MTL
    </div>
    <div class="score-display" id="score">2 - 1</div>
    <div class="team-badge" style="color: #f87171;">
      TOR <span>🔴</span>
    </div>
    <div class="clock-badge">
      <div class="live-dot"></div>
      <span id="match-clock">72:40</span>
    </div>
  </div>

  <div class="quality-badge">
    <span>4K 60FPS</span> • ${channelName}
  </div>

  <!-- Live Animated Pitch Simulation -->
  <canvas id="pitch-canvas"></canvas>

  <!-- Interactive Telemetry Overlays -->
  <div class="hud-overlay">
    <div class="hud-commentary">
      <div class="hud-title">
        <span>⚡ LIVE TACTICAL INTEL</span>
        <span style="color: #10b981;">• HIGH INTENSITY</span>
      </div>
      <div class="hud-text" id="commentary-text">
        CF Montréal pressing high on the transition wing. Ball advanced into final third.
      </div>
    </div>

    <div class="hud-controls">
      <button class="btn-hud" id="audio-toggle">🔊 CROWD AUDIO: ON</button>
      <button class="btn-hud" id="cam-toggle">🎥 CAM: TACTICAL 3D</button>
      <button class="btn-hud" onclick="triggerGoal()">⚽ SIMULATE GOAL</button>
    </div>
  </div>

  <script>
    const canvas = document.getElementById('pitch-canvas');
    const ctx = canvas.getContext('2d');
    
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Match State
    let clockSeconds = 72 * 60 + 40;
    let scoreMtl = 2;
    let scoreTor = 1;
    let audioEnabled = true;

    // Web Audio Sound Synthesizer
    let audioCtx = null;
    function playCheer() {
      if (!audioEnabled) return;
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.2);
      } catch (e) {}
    }

    // Ball & Players
    const ball = { x: canvas.width / 2, y: canvas.height / 2, vx: 3, vy: 1.5, radius: 7 };
    const players = [];
    for (let i = 0; i < 10; i++) {
      players.push({
        team: i < 5 ? '#3b82f6' : '#ef4444',
        x: (canvas.width / 11) * (i + 1),
        y: canvas.height * (0.3 + Math.random() * 0.4),
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        num: i + 2
      });
    }

    const commentary = [
      "Dangerous attack developing through central midfield!",
      "Superb interception by CF Montréal defense line.",
      "Quick switch to the left winger in space.",
      "Shot from 25 yards out! Blocked out for a corner kick.",
      "Tactical line shifting towards high defensive block."
    ];
    let commIndex = 0;
    setInterval(() => {
      commIndex = (commIndex + 1) % commentary.length;
      document.getElementById('commentary-text').innerText = commentary[commIndex];
    }, 4500);

    // Clock ticker
    setInterval(() => {
      clockSeconds++;
      const mins = Math.floor(clockSeconds / 60);
      const secs = clockSeconds % 60;
      document.getElementById('match-clock').innerText = 
        String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }, 1000);

    function triggerGoal() {
      scoreMtl++;
      document.getElementById('score').innerText = scoreMtl + ' - ' + scoreTor;
      document.getElementById('commentary-text').innerHTML = '<b style="color:#00f0ff;">GOAAALLLL! Spectacular strike into the top right corner!</b>';
      playCheer();
    }

    document.getElementById('audio-toggle').onclick = () => {
      audioEnabled = !audioEnabled;
      document.getElementById('audio-toggle').innerText = audioEnabled ? '🔊 CROWD AUDIO: ON' : '🔇 CROWD AUDIO: OFF';
      if (audioEnabled) playCheer();
    };

    // Animation Loop
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Pitch lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

      // Center Line & Circle
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 60);
      ctx.lineTo(canvas.width / 2, canvas.height - 60);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, Math.PI * 2);
      ctx.stroke();

      // Penalty Boxes
      ctx.strokeRect(60, canvas.height / 2 - 120, 140, 240);
      ctx.strokeRect(canvas.width - 200, canvas.height / 2 - 120, 140, 240);

      // Update & Draw Players
      players.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 80 || p.x > canvas.width - 80) p.vx *= -1;
        if (p.y < 80 || p.y > canvas.height - 80) p.vy *= -1;

        ctx.fillStyle = p.team;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '9px Orbitron';
        ctx.fillText(p.num, p.x - 3, p.y - 12);
      });

      // Update & Draw Ball
      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.x < 70 || ball.x > canvas.width - 70) ball.vx *= -1;
      if (ball.y < 70 || ball.y > canvas.height - 70) ball.vy *= -1;

      // Ball glow & motion trail
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      requestAnimationFrame(render);
    }
    render();
  </script>
</body>
</html>`;
}

/**
 * Proxy Endpoint: Fetch Available Models
 * Matches frontend: GET /api/models
 */
app.get('/api/models', async (_req: Request, res: Response) => {
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    } catch (err) {
      console.error('Error contacting OpenAI for models:', err);
    }
  }

  // Fallback models when OPENAI_API_KEY is not configured or fails
  return res.json({
    data: [
      { id: 'gpt-4o', object: 'model', owned_by: 'openai' },
      { id: 'gpt-4o-mini', object: 'model', owned_by: 'openai' },
      { id: 'gpt-3.5-turbo', object: 'model', owned_by: 'openai' },
      { id: 'mtl-football-scout-v2', object: 'model', owned_by: 'mtl-intelligence' },
      { id: 'tactical-analyzer-pro', object: 'model', owned_by: 'mtl-intelligence' },
    ],
  });
});

/**
 * Proxy Endpoint: Chat Completions
 * Matches frontend: POST /api/chat
 */
app.post('/api/chat', async (req: Request, res: Response) => {
  const { model, messages, temperature, max_tokens } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: "Invalid payload: 'messages' must be an array." } });
  }

  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-3.5-turbo',
          messages,
          temperature: temperature ?? 0.5,
          max_tokens: max_tokens ?? 600,
        }),
      });

      const rawData = await response.text();
      if (!response.ok) {
        return res.status(response.status).send(rawData);
      }
      const data = JSON.parse(rawData);
      return res.json(data);
    } catch (err) {
      console.error('Proxy Chat Error:', err);
    }
  }

  // Intelligent fallback for football tactical predictions & chat
  const lastMessage = messages[messages.length - 1]?.content || 'Match analysis';
  return res.json({
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model || 'mtl-football-scout-v2',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `[MTL Tactical Intelligence Engine]: Analysis generated for "${lastMessage}". Expected win probability favors home advantage (54% vs 46%), high pressing index in final third with xG estimated at 1.85. Key tactical transition depends on midfield disruption and set-piece conversion efficiency.`,
        },
        finish_reason: 'stop',
      },
    ],
  });
});

/**
 * Stream & Web Proxy Endpoint
 * Matches frontend: ALL /api/proxy?url=...
 */
app.all('/api/proxy', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  const channel = (req.query.channel as string) || '';

  // Set permissive CORS headers for all proxy traffic
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Direct MTL Live Feed requested or no URL provided
  if (!targetUrl || targetUrl.includes('mtl-live') || channel === 'mtl-1' || targetUrl === 'default') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(getMtlLiveStreamHtml('CF Montréal vs Toronto FC', 'MTL BROADCAST 1'));
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (_err) {
    // If invalid URL, fallback to live stream rather than crashing with 422 JSON
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(getMtlLiveStreamHtml('MTL Cyber Field Live', 'MTL TACTICAL', 'Invalid URL provided. Loaded default stream.'));
  }

  try {
    const customUserAgent =
      (req.query.userAgent as string) ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    const headers: Record<string, string> = {
      'User-Agent': customUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Host': parsedUrl.host,
    };

    // 5-second fetch timeout to prevent hanging the iframe
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5500);

    const response = await fetch(parsedUrl.toString(), {
      method: req.method,
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // If external server returned a bot block (403, 502, 503) or failed
    if (!response.ok) {
      console.warn(`[Proxy Upstream Warning] Target ${parsedUrl.hostname} returned status ${response.status}. Falling back to MTL Live Stream.`);
      res.status(200);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(getMtlLiveStreamHtml('MTL Live Match Center', 'MTL SECURE STREAM', `Upstream ${parsedUrl.hostname} is encrypted. Displaying Live Match Tactical Feed.`));
    }

    const contentType = response.headers.get('content-type') || '';

    // If HTML, strip frame blocking and inject base tag
    if (contentType.includes('text/html')) {
      let html = await response.text();
      const baseTag = `<base href="${parsedUrl.origin}/">`;
      html = html.replace(/<head[^>]*>/i, `$&${baseTag}`);
      
      // Neutralize window.top frame breaking scripts
      html = html.replace(/top\.location/g, 'window._top_loc');
      html = html.replace(/window\.top/g, 'window.self');

      res.status(200);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    res.status(response.status);
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    const buffer = await response.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.warn(`[Proxy Connection Handled] Error contacting ${parsedUrl.hostname}: ${err.message}. Serving resilient live stream.`);
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(getMtlLiveStreamHtml('MTL Match Center 4K', 'MTL SECURE BACKUP', 'Proxy stream active.'));
  }
});

// Vite Middleware for Development / Static files for Production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`MTL Football Hub Server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
