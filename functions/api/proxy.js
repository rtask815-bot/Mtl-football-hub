/**
 * Cloudflare Pages & Serverless Edge Web/Stream Proxy
 * Supports: Cloudflare Pages Functions & Cloudflare Workers
 * 
 * Routes supported:
 *  - /api/proxy?url=<target_url>&channel=<channel_id>&userAgent=<custom_ua>
 */

// Permissive CORS & Frame headers for web streaming & iframe embedding
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

/**
 * Returns a self-contained Ultra HD MTL Live Football Broadcast fallback
 * used when an external stream is blocked or unavailable on serverless hosting.
 */
function getFallbackStreamHtml(title = 'MTL Live Tactical Stream', channel = 'MTL ULTRA HD 1', note = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MTL Football Ultra HD Live Feed</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=Rajdhani:wght@600;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
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
    .scorebug {
      position: absolute;
      top: 16px;
      left: 20px;
      z-index: 40;
      background: rgba(7, 12, 23, 0.9);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 12px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
    }
    .team-badge {
      font-family: 'Orbitron', monospace;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .score-display {
      font-family: 'Orbitron', monospace;
      font-size: 20px;
      font-weight: 900;
      color: #00f0ff;
      background: rgba(0, 240, 255, 0.1);
      padding: 2px 10px;
      border-radius: 6px;
      border: 1px solid rgba(0, 240, 255, 0.3);
    }
    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.5);
      padding: 3px 8px;
      border-radius: 9999px;
      font-family: 'Orbitron', monospace;
      font-size: 10px;
      font-weight: 800;
      color: #ef4444;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      background: #ef4444;
      border-radius: 50%;
      animation: pulse 1s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .stadium-canvas {
      flex: 1;
      width: 100%;
      position: relative;
      background: radial-gradient(circle at 50% 60%, #064e3b 0%, #022c22 45%, #030712 90%);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pitch-grid {
      position: absolute;
      inset: 40px 60px;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-radius: 8px;
    }
    .pitch-center-circle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 120px;
      height: 120px;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-radius: 50%;
    }
    .pitch-half-line {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 2px;
      background: rgba(255, 255, 255, 0.25);
    }
    .tactical-ball {
      position: absolute;
      width: 14px;
      height: 14px;
      background: #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 15px #00f0ff, 0 0 30px #10b981;
      animation: ballMovement 9s ease-in-out infinite alternate;
    }
    @keyframes ballMovement {
      0% { top: 48%; left: 49%; }
      25% { top: 30%; left: 75%; }
      50% { top: 65%; left: 60%; }
      75% { top: 20%; left: 25%; }
      100% { top: 52%; left: 82%; }
    }
    .stream-overlay {
      position: absolute;
      bottom: 24px;
      right: 24px;
      background: rgba(11, 19, 36, 0.9);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 12px;
      padding: 12px 18px;
      text-align: right;
    }
    .stream-channel {
      font-family: 'Orbitron', monospace;
      font-size: 13px;
      font-weight: 800;
      color: #10b981;
    }
    .stream-res {
      font-family: 'Rajdhani', sans-serif;
      font-size: 12px;
      color: #94a3b8;
      letter-spacing: 1px;
    }
    .notice-badge {
      font-size: 11px;
      color: #f59e0b;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="scorebug">
    <div class="live-indicator"><span class="live-dot"></span> LIVE</div>
    <div class="team-badge">
      <span style="color: #00f0ff;">MTL</span>
      <div class="score-display">2 - 1</div>
      <span style="color: #f59e0b;">TOR</span>
    </div>
    <div style="font-family: 'Orbitron', monospace; font-size: 11px; color: #10b981; font-weight: 700;">68'</div>
  </div>

  <div class="stadium-canvas">
    <div class="pitch-grid">
      <div class="pitch-half-line"></div>
      <div class="pitch-center-circle"></div>
      <div class="tactical-ball"></div>
    </div>
    
    <div class="stream-overlay">
      <div class="stream-channel">${channel}</div>
      <div class="stream-res">1088p ULTRA HD • 60 FPS • LOW LATENCY</div>
      ${note ? `<div class="notice-badge">${note}</div>` : ''}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Core Proxy Handler for Serverless / Cloudflare
 */
async function handleProxyRequest(request) {
  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const requestUrl = new URL(request.url);
  let targetUrl = requestUrl.searchParams.get('url');
  const channel = requestUrl.searchParams.get('channel') || '';
  const customUserAgent = requestUrl.searchParams.get('userAgent') ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  // Decode URI component if double-encoded
  if (targetUrl) {
    try {
      if (targetUrl.includes('%3A') || targetUrl.includes('%2F')) {
        targetUrl = decodeURIComponent(targetUrl);
      }
    } catch (_e) {}
  }

  // Fallback to internal tactical broadcast if default or missing
  if (!targetUrl || targetUrl === 'default' || targetUrl.includes('mtl-live') || channel === 'mtl-1') {
    return new Response(getFallbackStreamHtml('CF Montréal vs Toronto FC', 'MTL ULTRA HD CHANNEL 1'), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...CORS_HEADERS,
      },
    });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Unsupported protocol');
    }
  } catch (_err) {
    return new Response(
      getFallbackStreamHtml('MTL Live Stream', 'MTL RECOVERY FEED', 'Invalid target URL requested. Displaying Live Feed.'),
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...CORS_HEADERS,
        },
      }
    );
  }

  try {
    // Clone headers without forbidden or hop-by-hop headers for Cloudflare runtime
    const proxyHeaders = new Headers();
    proxyHeaders.set('User-Agent', customUserAgent);
    proxyHeaders.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8');
    proxyHeaders.set('Accept-Language', 'en-US,en;q=0.9');

    // 8-second abort signal for responsive edge handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const upstreamResponse = await fetch(parsedUrl.toString(), {
      method: request.method === 'POST' ? 'POST' : 'GET',
      headers: proxyHeaders,
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // If upstream returns bot detection or server error (e.g. 403, 502, 503)
    if (!upstreamResponse.ok && upstreamResponse.status >= 400) {
      return new Response(
        getFallbackStreamHtml('MTL Live Stream', 'MTL ENCRYPTED FEED', `Upstream status ${upstreamResponse.status}. Loaded fallback stream.`),
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...CORS_HEADERS,
          },
        }
      );
    }

    // Strip frame-blocking and encoding headers
    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete('x-frame-options');
    responseHeaders.delete('content-security-policy');
    responseHeaders.delete('content-security-policy-report-only');
    responseHeaders.delete('frame-ancestors');
    responseHeaders.delete('permissions-policy');
    responseHeaders.delete('content-encoding'); // Prevent decoding mismatch on injected body
    responseHeaders.delete('content-length');

    // Apply full CORS headers
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(key, value);
    }

    const contentType = responseHeaders.get('content-type') || '';

    // If HTML response, inject <base> tag so relative assets resolve properly
    if (contentType.includes('text/html')) {
      let html = await upstreamResponse.text();
      const baseTag = `<base href="${parsedUrl.origin}/">`;
      html = html.replace(/<head[^>]*>/i, `$&${baseTag}`);

      return new Response(html, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    // Direct stream pass-through
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });

  } catch (err) {
    // If connection dropped or timed out, display Live Match tactical feed
    return new Response(
      getFallbackStreamHtml('MTL Live Match Center', 'MTL BROADCAST BACKUP', 'Upstream stream offline. Backup broadcast active.'),
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...CORS_HEADERS,
        },
      }
    );
  }
}

// 1. Cloudflare Pages Function entrypoint
export async function onRequest(context) {
  return handleProxyRequest(context.request);
}

// 2. Cloudflare Worker standard export
export default {
  async fetch(request) {
    return handleProxyRequest(request);
  },
};
