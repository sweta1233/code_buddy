# CodeBuddy 🤖

**Your AI coding mentor & all-in-one portfolio tracker** — a Codolio-style coding profile aggregator with a GenAI twist: a LangGraph mentor that knows your stats, and an AI study-plan builder that drafts, critiques and refines a personalized day-wise plan.

![stack](https://img.shields.io/badge/Next.js%2016-FastAPI%20%2B%20LangGraph%20%2B%20Gemini-teal)

## What it does

| Feature | Details |
|---|---|
| 🔄 **Multi-platform sync** | LeetCode (GraphQL), Codeforces (REST), CodeChef & GeeksforGeeks (best-effort scrape). Auto-sync every 6h + manual "Sync now". Historical snapshots for progress charts. |
| 📊 **Mission-control dashboard** | Total solved, E/M/H donut, topic-strength radar, rating history, GitHub-style 52-week heatmap, streaks, recent solves, AI weekly insight. |
| 🤖 **AI Mentor chat** | LangGraph ReAct agent (Gemini) with 8 tools over *your* data — `get_my_stats`, `query_solved`, semantic `search_my_problems` (RAG over your Chroma-indexed submissions), contest history, upcoming contests, `explain_topic` (RAG over bundled DSA notes), plan read/update. Streams over SSE. |
| 🗓️ **AI Study Plan generator** | The headline feature. A second LangGraph pipeline: analyze your weak/strong topics → draft plan (structured output) → self-critique → refine → save as an interactive day/week checklist you can tick off. |
| 📚 **DSA sheet trackers** | Blind 75, NeetCode 150, Striver SDE starter — with per-question done/revision status and progress %. |
| 🏆 **Contest calendar** | Upcoming Codeforces + LeetCode contests, cached hourly. |
| 👤 **Public portfolio** | Shareable `/u/<username>` page — no login needed. |
| 📄 **Resume builder** | One-click PDF from your synced stats (two templates). |

## Architecture

```
frontend/  Next.js 16 (App Router) + Tailwind 4 + shadcn/ui + Recharts
backend/   FastAPI (Python 3.14, uv) + SQLAlchemy 2 + SQLite
             ├── app/services/platforms/   # LC / CF / CC / GfG adapters
             ├── app/ai/                   # LangGraph mentor + planner, Chroma RAG, tools
             ├── app/api/routers/          # auth, platforms, stats, ai, plans, sheets, contests, public, resume
             └── APScheduler               # 6h auto-sync, hourly contest cache
```

**GenAI pipeline**
- Every sync embeds solved problems into a **per-user Chroma collection** (`gemini-embedding-001`).
- A **shared knowledge base** (~26 curated DSA pattern notes) is embedded once at startup.
- **Mentor graph**: `agent ⇄ tools` loop (LangGraph `ToolNode`), streams tokens via SSE.
- **Planner graph**: brief (computed analytics) → draft (`with_structured_output`) → critique → refine → persist.

## Setup

### Prerequisites
- Python 3.14+, [uv](https://docs.astral.sh/uv/), Node 20+

### 1. Backend
```bash
cd backend
uv sync                                   # install dependencies
# create .env (see below)
uv run uvicorn app.main:app --port 8000 --reload
```

`.env` in `backend/`:
```
GOOGLE_API_KEY=AIza...        # from https://aistudio.google.com/apikey (free tier works)
SECRET_KEY=<random hex>       # python -c "import secrets; print(secrets.token_hex(32))"
GEMINI_MODEL=gemini-2.5-flash
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

### 3. Use it
1. Register → connect your handles on **Platforms** (sync starts automatically).
2. Watch the **Dashboard** fill up.
3. Ask the **AI Mentor** things like *"which topic am I weakest in?"*
4. Generate your **AI Study Plan** (goal + target date + hours/day).
5. Track **DSA sheets**, browse **contests**, build your **resume**, share `/u/<username>`.

## Notes & limits
- **Gemini free tier**: expect mild rate limits; the app batches embeddings and caches aggressively.
- **CodeChef / GfG** have no official APIs — their scrapers are best-effort and fail gracefully (other platforms unaffected).
- SQLite keeps setup zero-config; swap `DATABASE_URL` for Postgres in production.
- AI features degrade gracefully without a valid `GOOGLE_API_KEY` (everything else keeps working).

## Roadmap ideas
- Codeforces problem recommendations via RAG over problem tags
- Friends & leaderboards
- GitHub commit tracking
- Browser extension
