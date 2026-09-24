const CONFIG = {
  timeout: 20000,
  allowedProtocols: new Set(["http:", "https:"]),
};

export async function onRequest(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);

  // Define Standard CORS Headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, POST",
    "Access-Control-Allow-Headers":
      "Origin, X-Requested-With, Content-Type, Accept, Range, Authorization",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Type, Content-Range, Accept-Ranges, Cache-Control, ETag, Last-Modified",
  };

  // --- 1. CORS Preflight Handling ---
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // --- 2. URL Extraction & Validation ---
  const rawUrl = reqUrl.searchParams.get("url");
  if (!rawUrl) {
    return Response.json(
      { error: "Missing 'url' query parameter" },
      { status: 400, headers: corsHeaders }
    );
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return Response.json(
      { error: "Invalid target URL format" },
      { status: 400, headers: corsHeaders }
    );
  }

  if (!CONFIG.allowedProtocols.has(targetUrl.protocol)) {
    return Response.json(
      { error: "Unsupported protocol scheme" },
      { status: 400, headers: corsHeaders }
    );
  }

  // --- 3. SSRF Safeguards ---
  const hostname = targetUrl.hostname.toLowerCase();
  const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal"]);
  const privateIPRegex = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/;

  if (blockedHosts.has(hostname) || privateIPRegex.test(hostname) || hostname.endsWith(".local")) {
    return Response.json(
      { error: "Access to private network targets is forbidden" },
      { status: 403, headers: corsHeaders }
    );
  }

  // Prevent self-looping
  if (hostname === reqUrl.hostname) {
    return Response.json(
      { error: "Loopback requests are prohibited" },
      { status: 400, headers: corsHeaders }
    );
  }

  // --- 4. Upstream Request Customization ---
  const proxyBaseUrl = `${reqUrl.protocol}//${reqUrl.host}${reqUrl.pathname}`;

  const upstreamHeaders = new Headers({
    "User-Agent":
      request.headers.get("user-agent") ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": request.headers.get("accept") || "*/*",
    "Accept-Language": request.headers.get("accept-language") || "en-US,en;q=0.9",
    "Referer": `${targetUrl.protocol}//${targetUrl.host}/`,
    "Origin": `${targetUrl.protocol}//${targetUrl.host}`,
  });

  if (request.headers.has("range")) {
    upstreamHeaders.set("Range", request.headers.get("range"));
  }
  if (request.headers.has("cookie")) {
    upstreamHeaders.set("Cookie", request.headers.get("cookie"));
  }

  // --- 5. Fetch Execution ---
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.timeout);

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: upstreamHeaders,
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timer);

    const contentType = upstreamResponse.headers.get("content-type") || "application/octet-stream";
    const lowerContentType = contentType.toLowerCase();

    // Prepare Base Response Headers
    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set("Content-Type", contentType);

    const forwardableHeaders = [
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "etag",
      "last-modified",
      "expires",
    ];

    forwardableHeaders.forEach((h) => {
      const val = upstreamResponse.headers.get(h);
      if (val) responseHeaders.set(h, val);
    });

    // Strip frame-blocking and CSP headers
    responseHeaders.delete("x-frame-options");
    responseHeaders.delete("content-security-policy");

    if (request.method === "HEAD" || !upstreamResponse.body) {
      return new Response(null, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    // --- 6. Intelligent Response Rewriting ---

    // A. HLS M3U8 Playlist Rewriter (Rewrites Relative Segment Paths)
    if (lowerContentType.includes("mpegurl") || targetUrl.pathname.endsWith(".m3u8")) {
      let playlistText = await upstreamResponse.text();
      const baseUrl = targetUrl.origin + targetUrl.pathname.substring(0, targetUrl.pathname.lastIndexOf("/") + 1);

      playlistText = playlistText.replace(/^(?!(?:#|https?:\/\/))(.+)$/gm, (match) => {
        const absoluteSegmentUrl = new URL(match, baseUrl).toString();
        return `${proxyBaseUrl}?url=${encodeURIComponent(absoluteSegmentUrl)}`;
      });

      const encoded = new TextEncoder().encode(playlistText);
      responseHeaders.set("Content-Length", encoded.byteLength.toString());

      return new Response(encoded, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    // B. HTML Rewriter (Injects Base Tag for Static Assets)
    if (lowerContentType.includes("text/html")) {
      let htmlText = await upstreamResponse.text();
      const baseTag = `<base href="${targetUrl.origin}${targetUrl.pathname}">`;

      if (htmlText.includes("<head>")) {
        htmlText = htmlText.replace("<head>", `<head>${baseTag}`);
      } else {
        htmlText = baseTag + htmlText;
      }

      const encoded = new TextEncoder().encode(htmlText);
      responseHeaders.set("Content-Length", encoded.byteLength.toString());

      return new Response(encoded, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    // C. Stream Binary Data (Video, Audio, Images, Octet-Streams)
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });

  } catch (error) {
    clearTimeout(timer);
    const isTimeout = error.name === "AbortError";
    return Response.json(
      {
        error: isTimeout ? "Upstream request timed out" : "Failed to fetch upstream resource",
        details: error.message,
      },
      {
        status: isTimeout ? 504 : 502,
        headers: corsHeaders,
      }
    );
  }
}
