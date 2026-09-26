export async function onRequest(context) {
  const { request } = context;
  const urlParams = new URL(request.url).searchParams;
  const targetUrl = urlParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing 'url' parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Fetch upstream stream content
    const upstreamResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0",
        "Accept": request.headers.get("Accept") || "*/*",
      },
    });

    // 2. Clone headers and remove frame-blocking restrictions
    const headers = new Headers(upstreamResponse.headers);
    headers.delete("x-frame-options");
    headers.delete("content-security-policy");
    headers.delete("content-security-policy-report-only");

    // 3. Set permissive CORS rules for frontend consumption
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "*");

    const contentType = headers.get("content-type") || "";

    // 4. If HTML, inject <base> tag so relative CSS/JS paths resolve properly
    if (contentType.includes("text/html")) {
      let html = await upstreamResponse.text();
      const baseUrl = new URL(targetUrl).origin;
      const baseTag = `<head><base href="${baseUrl}/">`;

      if (html.includes("<head>")) {
        html = html.replace("<head>", baseTag);
      } else {
        html = baseTag + html;
      }

      return new Response(html, {
        status: upstreamResponse.status,
        headers,
      });
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
