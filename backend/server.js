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

async function searchDuckDuckGo(query) {
  // Use DuckDuckGo's HTML search and parse results
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " news")}&kl=us-en`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NewsAI/1.0)",
      "Accept": "text/html"
    }
  });
  const html = await response.text();

  // Extract results using regex
  const results = [];
  const linkRegex = /class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  const snippetRegex = /class="result__snippet"[^>]*>([^<]+)</g;

  const links = [...html.matchAll(linkRegex)].slice(0, 8);
  const snippets = [...html.matchAll(snippetRegex)].map(m => m[1]);

  for (let i = 0; i < links.length; i++) {
    let url = links[i][1];
    const title = links[i][2].trim();

    // DuckDuckGo sometimes wraps URLs, decode them
    if (url.includes("uddg=")) {
      try {
        const urlParams = new URLSearchParams(url.split("?")[1]);
        url = decodeURIComponent(urlParams.get("uddg") || url);
      } catch {}
    }

    // Skip DDG internal links
    if (url.startsWith("/") || url.includes("duckduckgo.com")) continue;

    // Extract source domain
    let source = "";
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      source = domain.split(".")[0];
      source = source.charAt(0).toUpperCase() + source.slice(1);
    } catch { source = "News"; }

    if (title && url.startsWith("http")) {
      results.push({ source, title, url, snippet: snippets[i] || "" });
    }
    if (results.length >= 5) break;
  }

  return results;
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

// Real links via DuckDuckGo search
app.post("/api/links", async (req, res) => {
  const { title, topic } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });

  try {
    const links = await searchDuckDuckGo(`${title} ${topic}`);
    if (links.length > 0) {
      return res.json({ links });
    }
    // Fallback: try a broader search with just key words
    const words = title.split(" ").slice(0, 5).join(" ");
    const fallbackLinks = await searchDuckDuckGo(words);
    res.json({ links: fallbackLinks });
  } catch (err) {
    console.error("Links error:", err);
    res.status(500).json({ error: "Failed to fetch links." });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
