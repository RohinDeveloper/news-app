require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post("/api/news", async (req, res) => {
  const { interests } = req.body;

  if (!interests || !Array.isArray(interests) || interests.length === 0) {
    return res.status(400).json({ error: "interests must be a non-empty array" });
  }

  const interestStr = interests.join(", ");

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: `You are a news curator. Find the 4 most recent, interesting news stories from today covering: ${interestStr}.
Use web search to find real, current headlines. Respond ONLY with a valid JSON array, no markdown or preamble:
[{"topic":"<interest>","title":"<headline>","summary":"<one sentence>","time":"<e.g. 2 hours ago>","url":"<source URL or empty string>","why":"<one sentence explaining why this matches the user's interest in ${interestStr}>"}]
Return exactly 4 items. Use real, current news.`,
      messages: [
        { role: "user", content: `Find me 4 latest news stories for: ${interestStr}` }
      ]
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const clean = text.replace(/```json|```/g, "").trim();
    const articles = JSON.parse(clean);

    res.json({ articles });
  } catch (err) {
    console.error("Anthropic API error:", err);
    res.status(500).json({ error: "Failed to fetch news. Check your API key and try again." });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
