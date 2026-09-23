import { URL } from "url";

const CONFIG = {
  timeout: 20000,
  maxRedirects: 5,
  allowedProtocols: new Set(["http:", "https:"]),
  allowedContentTypes: [
    "application/vnd.apple.mpegurl",
    "application/x-mpegurl",
    "video/",
    "audio/",
    "text/html",
    "text/css",
    "text/plain",
    "application/json",
    "application/javascript",
    "text/javascript",
    "application/octet-stream",
    "image/"
  ]
};

export default async function handler(req, res) {
  // --- 1. CORS Setup ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Range, Authorization"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Type, Content-Range, Accept-Ranges, Cache-Control, ETag, Last-Modified"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // --- 2. URL Extraction & Validation ---
  const rawUrl = req.query?.url;
  if (!rawUrl || typeof rawUrl !== "string") {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: "Invalid target URL format" });
  }

  if (!CONFIG.allowedProtocols.has(targetUrl.protocol)) {
    return res.status(400).json({ error: "Unsupported protocol scheme" });
  }

  // --- 3. SSRF Safeguards ---
  const hostname = targetUrl.hostname.toLowerCase();
  const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal"]);
  const privateIPRegex = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/;

  if (blockedHosts.has(hostname) || privateIPRegex.test(hostname) || hostname.endsWith(".local")) {
    return res.status(403).json({ error: "Access to private network targets is forbidden" });
  }

  // Prevent proxy self-looping
  const hostHeader = req.headers.host;
  if (hostHeader && hostname === hostHeader.split(":")[0]) {
    return res.status(400).json({ error: "Loopback requests are prohibited" });
  }

  // --- 4. Upstream Request Customization ---
  const proxyBaseUrl = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}${req.url.split("?")[0]}`;
  
  const headers = {
    "User-Agent":
      req.headers["user-agent"] ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": req.headers.accept || "*/*",
    "Accept-Language": req.headers["accept-language"] || "en-US,en;q=0.9",
    "Referer": `${targetUrl.protocol}//${targetUrl.host}/`,
    "Origin": `${targetUrl.protocol}//${targetUrl.host}`
  };

  if (req.headers.range) headers["Range"] = req.headers.range;
  if (req.headers.cookie) headers["Cookie"] = req.headers.cookie;

  // --- 5. Fetch Execution ---
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.timeout);

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      redirect: "follow",
      signal: controller.signal
    });

    clearTimeout(timer);

    const contentType = upstreamResponse.headers.get("content-type") || "application/octet-stream";
    const lowerContentType = contentType.toLowerCase();

    // Set Response Status and Headers
    res.status(upstreamResponse.status);
    res.setHeader("Content-Type", contentType);

    const forwardableHeaders = [
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "etag",
      "last-modified",
      "expires"
    ];

    forwardableHeaders.forEach((h) => {
      const val = upstreamResponse.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    // Remove frame block restriction
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");

    if (req.method === "HEAD" || !upstreamResponse.body) {
      return res.end();
    }

    // --- 6. Intelligent Response Handling ---

    // A. HLS M3U8 Playlist Rewriter (Fixes Relative Segment Paths)
    if (
      lowerContentType.includes("mpegurl") ||
      targetUrl.pathname.endsWith(".m3u8")
    ) {
      let playlistText = await upstreamResponse.text();
      const baseUrl = targetUrl.origin + targetUrl.pathname.substring(0, targetUrl.pathname.lastIndexOf("/") + 1);

      playlistText = playlistText.replace(/^(?!(?:#|https?:\/\/))(.+)$/gm, (match) => {
        const absoluteSegmentUrl = new URL(match, baseUrl).toString();
        return `${proxyBaseUrl}?url=${encodeURIComponent(absoluteSegmentUrl)}`;
      });

      res.setHeader("Content-Length", Buffer.byteLength(playlistText));
      return res.send(playlistText);
    }

    // B. HTML Rewriter (Fixes Base URLs for Relative Assets)
    if (lowerContentType.includes("text/html")) {
      let htmlText = await upstreamResponse.text();
      const baseTag = `<base href="${targetUrl.origin}${targetUrl.pathname}">`;
      
      if (htmlText.includes("<head>")) {
        htmlText = htmlText.replace("<head>", `<head>${baseTag}`);
      } else {
        htmlText = baseTag + htmlText;
      }

      res.setHeader("Content-Length", Buffer.byteLength(htmlText));
      return res.send(htmlText);
    }

    // C. Stream Binary/Media Data Directly (Video, Audio, Images)
    const reader = upstreamResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    return res.end();

  } catch (error) {
    clearTimeout(timer);
    if (!res.headersSent) {
      const isTimeout = error.name === "AbortError";
      return res.status(isTimeout ? 504 : 502).json({
        error: isTimeout ? "Upstream request timed out" : "Failed to fetch upstream resource",
        details: error.message
      });
    }
    res.end();
  }
}
