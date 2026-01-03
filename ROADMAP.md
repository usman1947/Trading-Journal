**Caliber AI ROADMAP**

---

**#1 Weekly Performance Coach**
Aggregates your week's trades, calculates stats (win rate, total R, avg winner/loser), and sends to LLM to generate a coaching summary with observations and suggestions.
Skills: Data aggregation, basic prompting

**#2 Emotional Pattern Detection**
Run sentiment analysis on journal notes, score each entry, correlate sentiment scores with trade outcomes. Surface patterns like "negative tone before trade = worse results."
Skills: Sentiment analysis (can use LLM), correlation

---

**#3 Ask Your Journal (RAG)**
Embed all journal entries into vectors, store in vector DB. When you ask a question, retrieve relevant entries and feed to LLM for answer. "When do I overtrade?" pulls matching entries and synthesizes insight.
Skills: Embeddings, vector DB (pgvector/Chroma), RAG retrieval

**#4 Tilt Detector**
Analyze trade timestamps and frequency within sessions. Flag clusters of rapid trades after losses. Combine with sentiment from journal notes to confirm emotional state.
Skills: Time-series anomaly detection, sentiment, pattern rules

---

**#5 Comparative Session Analysis**
User asks "compare my green days vs red days." System pulls both cohorts, extracts features (time of day, setup types, hold duration, sentiment), runs comparison, LLM narrates differences.
Skills: Cohort segmentation, feature extraction, comparative analysis

**#6 Setup Profiler**
Cluster trades by multiple dimensions (setup type, ticker, session, duration). Calculate stats per cluster. LLM interprets which clusters are your edge vs. leak.
Skills: Clustering logic, multi-dimensional grouping, statistical summaries

**#7 Market Condition Correlator**
Pull external data (VIX, SPY trend, volume) and tag each trading day. Join with your trades, calculate performance per regime. Surface where your edge exists or disappears.
Skills: External API integration, data enrichment, regime classification

---