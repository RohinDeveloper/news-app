require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

app.post("/api/news", async (req, res) => {
  const { interests } = req.body;

  if (!interests || !Array.isArray(interests) || interests.length === 0) {
    return res.status(400).json({ error: "interests must be a non-empty array" });
  }

  const interestStr = interests.join(", ");

  const prompt = `You are a news curator. Based on your knowledge of recent world events, find 4 interesting and recent news stories covering these topics: ${interestStr}.

Respond ONLY with a valid JSON array with no markdown, no code fences, no preamble:
[{"topic":"<one of the interests>","title":"<realistic news headline>","summary":"<one sentence summary>","time":"<e.g. 2 hours ago>","url":"","why":"<one sentence explaining why this matches the user's interest in ${interestStr}>"}]

Return exactly 4 items. Make the headlines realistic and specific.`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);
      return res.status(500).json({ error: data.error?.message || "Groq API error" });
    }

    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const articles = JSON.parse(clean);

    res.json({ articles });
  } catch (err) {
    console.error("Groq error:", err);
    res.status(500).json({ error: "Failed to fetch news. Check your API key and try again." });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
