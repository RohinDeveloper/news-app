require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

async function groq(prompt) {
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
  if (!response.ok) throw new Error(data.error?.message || "Groq API error");
  const text = data.choices?.[0]?.message?.content || "";
  return text.replace(/```json|```/g, "").trim();
}

// Standard news feed
app.post("/api/news", async (req, res) => {
  const { interests } = req.body;
  if (!interests || !Array.isArray(interests) || interests.length === 0)
    return res.status(400).json({ error: "interests must be a non-empty array" });

  const interestStr = interests.join(", ");
  const prompt = `You are a news curator. Find 4 recent, interesting news stories covering: ${interestStr}.
Respond ONLY with a valid JSON array, no markdown or preamble:
[{"topic":"<one of the interests>","title":"<headline>","summary":"<one sentence>","time":"<e.g. 2 hours ago>","why":"<one sentence explaining relevance to ${interestStr}>"}]
Return exactly 4 items with realistic, specific headlines.`;

  try {
    const clean = await groq(prompt);
    const articles = JSON.parse(clean);
    res.json({ articles });
  } catch (err) {
    console.error("News error:", err);
    res.status(500).json({ error: "Failed to fetch news. Check your API key and try again." });
  }
});

// Personalised For You feed
app.post("/api/foryou", async (req, res) => {
  const { interests, recentTopics } = req.body;
  const interestStr = interests?.join(", ") || "general news";
  const historyStr = recentTopics?.length > 0
    ? `The user has recently read articles about: ${[...new Set(recentTopics)].join(", ")}. Weight these topics more heavily.`
    : "No reading history yet — use their stated interests.";

  const prompt = `You are a personalised news curator. Curate 4 news stories for a user.
Their stated interests: ${interestStr}.
${historyStr}
Pick stories that best match both their stated interests and reading history. Vary the topics.
Respond ONLY with a valid JSON array, no markdown or preamble:
[{"topic":"<topic>","title":"<headline>","summary":"<one sentence>","time":"<e.g. 3 hours ago>","why":"<one sentence explaining why this was picked for them>"}]
Return exactly 4 items with realistic, specific headlines.`;

  try {
    const clean = await groq(prompt);
    const articles = JSON.parse(clean);
    res.json({ articles });
  } catch (err) {
    console.error("For You error:", err);
    res.status(500).json({ error: "Failed to fetch personalised feed." });
  }
});

// Related links for a clicked article
app.post("/api/links", async (req, res) => {
  const { title, topic } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });

  const prompt = `A user clicked on this news article: "${title}" (topic: ${topic}).
Generate 5 realistic related article links from well-known news sources like NYT, BBC, Reuters, The Guardian, Washington Post, CNN, Bloomberg, AP News, Wired, TechCrunch etc.
Respond ONLY with a valid JSON array, no markdown or preamble:
[{"source":"<publication name>","title":"<related article headline>","url":"<realistic URL using the correct domain for that publication>"}]
Return exactly 5 items. Use real publication domains (nytimes.com, bbc.com, reuters.com, theguardian.com, washingtonpost.com, cnn.com, bloomberg.com, apnews.com, wired.com, techcrunch.com etc). Make the URLs realistic but they don't need to be real pages.`;

  try {
    const clean = await groq(prompt);
    const links = JSON.parse(clean);
    res.json({ links });
  } catch (err) {
    console.error("Links error:", err);
    res.status(500).json({ error: "Failed to fetch links." });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
