import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// OpenAI API Key configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn("WARNING: OPENAI_API_KEY is not defined in environment variables.");
}

/**
 * Proxy Endpoint: Fetch Available Models
 * Matches frontend: GET /api/models
 */
app.get("/api/models", async (req, res) => {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error("Error fetching models:", err);
    return res.status(500).json({ error: { message: "Internal server error fetching models." } });
  }
});

/**
 * Proxy Endpoint: Chat Completions
 * Matches frontend: POST /api/chat
 */
app.post("/api/chat", async (req, res) => {
  const { model, messages, temperature, max_tokens } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: "Invalid payload: 'messages' must be an array." } });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || "gpt-3.5-turbo",
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
    console.error("Proxy Chat Error:", err);
    return res.status(500).json({
      error: { message: "Failed to communicate with OpenAI backend service." },
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
