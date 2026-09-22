export default async function handler(req, res) {
  const targetUrl = "https://famelack.com/tv/sports/rSbwbBDpFexSew";

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
        "Referer": "https://famelack.com/"
      }
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");

    const data = await response.text();
    res.status(200).send(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to proxy stream" });
  }
}
