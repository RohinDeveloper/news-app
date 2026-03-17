import { useState, useEffect, useCallback } from "react";

const DEFAULT_TOPICS = [
  { id: "ai", label: "AI & Tech" },
  { id: "science", label: "Science" },
  { id: "business", label: "Business" },
  { id: "climate", label: "Climate" },
  { id: "health", label: "Health" },
  { id: "geopolitics", label: "Geopolitics" },
  { id: "space", label: "Space" },
  { id: "startups", label: "Startups" },
];

function loadPrefs() {
  try {
    const saved = localStorage.getItem("newsai_prefs_v1");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { topics: DEFAULT_TOPICS, selected: ["ai", "science"] };
}

function savePrefs(topics, selected) {
  try {
    localStorage.setItem("newsai_prefs_v1", JSON.stringify({ topics, selected: [...selected] }));
  } catch {}
}

export default function App() {
  const [prefs] = useState(loadPrefs);
  const [topics, setTopics] = useState(prefs.topics);
  const [selected, setSelected] = useState(new Set(prefs.selected));
  const [customInput, setCustomInput] = useState("");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [whyOpen, setWhyOpen] = useState({});

  useEffect(() => {
    savePrefs(topics, selected);
  }, [topics, selected]);

  const toggleTopic = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (!val) return;
    const id = "custom_" + val.toLowerCase().replace(/\s+/g, "_");
    if (topics.find((t) => t.id === id)) { setCustomInput(""); return; }
    setTopics((prev) => [...prev, { id, label: val, custom: true }]);
    setSelected((prev) => new Set([...prev, id]));
    setCustomInput("");
  };

  const removeTopic = (id) => {
    setTopics((prev) => prev.filter((t) => t.id !== id));
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const fetchNews = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setWhyOpen({});

    const interests = topics.filter((t) => selected.has(t.id)).map((t) => t.label);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/news`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Server error");
      }

      const { articles } = await res.json();
      setArticles(articles);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loading, topics, selected]);

  const toggleWhy = (idx) =>
    setWhyOpen((prev) => ({ ...prev, [idx]: !prev[idx] }));

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.logo}>NewsAI</div>
          <div style={styles.tagline}>Curated by AI, tailored to you</div>
        </div>
        {lastRefresh && (
          <div style={styles.lastRefresh}>
            Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </header>

      <main style={styles.main}>
        {/* Interests panel */}
        <section style={styles.panel}>
          <div style={styles.panelLabel}>Your interests</div>
          <div style={styles.tags}>
            {topics.map((t) => (
              <div
                key={t.id}
                style={{ ...styles.tag, ...(selected.has(t.id) ? styles.tagActive : {}) }}
                onClick={() => toggleTopic(t.id)}
              >
                {t.label}
                {t.custom && (
                  <span
                    style={styles.tagRemove}
                    onClick={(e) => { e.stopPropagation(); removeTopic(t.id); }}
                  >×</span>
                )}
              </div>
            ))}
          </div>
          <div style={styles.customRow}>
            <input
              style={styles.input}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
              placeholder="Add a custom interest…"
              maxLength={40}
            />
            <button style={styles.addBtn} onClick={addCustom}>+ Add</button>
            <button
              style={{ ...styles.refreshBtn, ...(loading ? styles.refreshBtnDisabled : {}) }}
              onClick={fetchNews}
              disabled={loading}
            >
              {loading ? (
                <span style={styles.spinner} />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
              )}
              {loading ? "Loading…" : "Refresh feed"}
            </button>
          </div>
        </section>

        {/* Feed */}
        <section style={styles.feed}>
          {error && (
            <div style={styles.errorBox}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {!error && articles.length === 0 && !loading && (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>⌖</div>
              <div style={styles.emptyTitle}>Your feed is empty</div>
              <div style={styles.emptyText}>Select topics above and hit <em>Refresh feed</em> to load today's stories.</div>
            </div>
          )}

          {loading && articles.length === 0 && (
            <div style={styles.skeletonWrap}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ ...styles.skeleton, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}

          {articles.map((article, idx) => (
            <div
              key={idx}
              style={{ ...styles.card, animationDelay: `${idx * 0.07}s` }}
            >
              <div style={styles.cardTop}>
                <span style={styles.cardChip}>{article.topic}</span>
                <span style={styles.cardTime}>{article.time}</span>
              </div>
              <div style={styles.cardTitle}>{article.title}</div>
              <div style={styles.cardSummary}>{article.summary}</div>
              <div style={styles.cardActions}>
                <button
                  style={styles.whyBtn}
                  onClick={() => toggleWhy(idx)}
                >
                  {whyOpen[idx] ? "Hide reason" : "Why this story?"}
                </button>
                {article.url && (
                  <a href={article.url} target="_blank" rel="noopener noreferrer" style={styles.readMore}>
                    Read more ↗
                  </a>
                )}
              </div>
              {whyOpen[idx] && (
                <div style={styles.whyBox}>
                  <span style={styles.whyLabel}>✦ </span>
                  {article.why}
                </div>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "var(--bg)" },
  header: {
    display: "flex", alignItems: "flex-end", justifyContent: "space-between",
    padding: "2.5rem 2rem 1.5rem", borderBottom: "1px solid var(--border)",
    maxWidth: 860, margin: "0 auto",
  },
  logo: { fontFamily: "var(--font-display)", fontSize: 32, color: "var(--text)", letterSpacing: "-0.02em" },
  tagline: { fontSize: 13, color: "var(--text-dim)", marginTop: 2 },
  lastRefresh: { fontSize: 12, color: "var(--text-dim)" },
  main: { maxWidth: 860, margin: "0 auto", padding: "2rem" },
  panel: { marginBottom: "2rem" },
  panelLabel: { fontSize: 11, fontWeight: 500, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 },
  tags: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  tag: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 14px", borderRadius: 20,
    border: "1px solid var(--border)", fontSize: 13,
    cursor: "pointer", color: "var(--text-muted)",
    background: "var(--surface)", transition: "all 0.15s",
    userSelect: "none",
  },
  tagActive: {
    background: "var(--accent-bg)", color: "var(--accent)", border: "1px solid var(--accent-border)",
  },
  tagRemove: { fontSize: 16, lineHeight: 1, color: "var(--accent)", marginLeft: 2 },
  customRow: { display: "flex", gap: 8, alignItems: "center" },
  input: {
    flex: 1, padding: "8px 14px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--text)", fontSize: 13, outline: "none",
    transition: "border-color 0.15s",
  },
  addBtn: {
    padding: "8px 14px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)", background: "var(--surface)",
    color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
    whiteSpace: "nowrap", transition: "all 0.15s",
  },
  refreshBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 18px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--accent-border)", background: "var(--accent-bg)",
    color: "var(--accent)", fontSize: 13, cursor: "pointer",
    fontWeight: 500, whiteSpace: "nowrap", transition: "all 0.15s",
  },
  refreshBtnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  spinner: {
    display: "inline-block", width: 13, height: 13,
    border: "2px solid var(--accent-border)", borderTopColor: "var(--accent)",
    borderRadius: "50%", animation: "spin 0.7s linear infinite",
  },
  feed: {},
  errorBox: {
    padding: "14px 18px", borderRadius: "var(--radius)",
    background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)",
    color: "#e07c75", fontSize: 14, marginBottom: 16,
  },
  empty: { textAlign: "center", padding: "4rem 1rem" },
  emptyIcon: { fontSize: 32, marginBottom: 12, color: "var(--text-dim)" },
  emptyTitle: { fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 8, color: "var(--text-muted)" },
  emptyText: { fontSize: 14, color: "var(--text-dim)", lineHeight: 1.6 },
  skeletonWrap: { display: "flex", flexDirection: "column", gap: 12 },
  skeleton: {
    height: 120, borderRadius: "var(--radius)",
    background: "linear-gradient(90deg, var(--surface) 0%, var(--surface2) 50%, var(--surface) 100%)",
    backgroundSize: "200% 100%",
    animation: "pulse 1.4s ease-in-out infinite",
  },
  card: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "1.25rem 1.5rem",
    marginBottom: 12, animation: "fadeUp 0.35s ease both",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardChip: {
    fontSize: 11, fontWeight: 500, letterSpacing: "0.06em",
    textTransform: "uppercase", padding: "3px 8px", borderRadius: 20,
    background: "var(--accent-bg)", color: "var(--accent)", border: "1px solid var(--accent-border)",
  },
  cardTime: { fontSize: 12, color: "var(--text-dim)" },
  cardTitle: { fontFamily: "var(--font-display)", fontSize: 19, lineHeight: 1.3, color: "var(--text)", marginBottom: 8 },
  cardSummary: { fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 12 },
  cardActions: { display: "flex", alignItems: "center", gap: 12 },
  whyBtn: {
    fontSize: 12, color: "var(--text-muted)", background: "none",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
    padding: "4px 10px", cursor: "pointer", transition: "all 0.15s",
  },
  readMore: {
    fontSize: 12, color: "var(--accent)",
    border: "1px solid var(--accent-border)", borderRadius: "var(--radius-sm)",
    padding: "4px 10px", transition: "all 0.15s",
  },
  whyBox: {
    marginTop: 12, padding: "10px 14px",
    background: "var(--surface2)", borderLeft: "2px solid var(--accent)",
    borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
    fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6,
    animation: "fadeUp 0.2s ease both",
  },
  whyLabel: { color: "var(--accent)", fontWeight: 500 },
};
