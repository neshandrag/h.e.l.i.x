# Helix — AI-Powered Digital Identity System

Every student builds a digital footprint over their academic and professional life. Certificates, resumes, project reports, internship letters, portfolios, GitHub repositories, achievements, learning records. They pile up across folders, emails, cloud drives, and devices, and as years pass they get harder to locate, connect, and show to anyone.

Traditional storage can save the files. It can't understand the journey.

Helix is a system that reads what you upload, works out what it actually means, and connects it to everything else you've done — so the skills, projects, certifications, internships, and achievements in your history stop being a pile of separate files and start being one connected picture of your growth.

The goal is simple: you should never have to search through folders again.

Full technical proposal: [`plan.md`](plan.md) · Architecture and diagrams: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Design rationale: [`docs/THOUGHT_PROCESS.md`](docs/THOUGHT_PROCESS.md)

---

## What it does

**Module 1 — AI Data Ingestion.** Upload certificates, resumes, project reports, internship letters, or other documents directly (PDF, DOCX, scanned image with OCR). Or skip the upload step entirely — forward a document to the Helix Telegram bot, or import a GitHub profile and let it pull evidence straight from your repositories.

**Module 2 — Intelligent Categorization.** Every document is automatically classified into Projects, Skills, Certifications, Internships, Achievements, or Academics, with a confidence score and a separate verifiability score. Nothing is sorted by hand.

**Module 3 — Relationship Engine.** Certification connects to skill. Skill connects to project. Project connects to internship. These connections are inferred automatically from the evidence, not tagged manually, and they form a real knowledge graph — one that fades over time if a skill has no recent supporting evidence, and that can tell you where your documented path has gaps or breaks in the story.

**Module 4 — Digital Journey Timeline.** A chronological, narrated view of your growth, built automatically from document dates. Any milestone can be turned into a resume bullet or a short professional post with one click.

**Module 5 — Smart Retrieval System.** Ask in plain language — "show my AI projects," "show my latest resume," "am I ready for a Data Science internship?" — and get back either the matching documents or a reasoned, evidence-based answer, always with a direct link to the original file.

## How it's built

- **NLP** — an LLM (Google Gemini) reads each document, classifies it, and extracts the skills/projects/certifications it's evidence for.
- **Embeddings** — every document is embedded (`gemini-embedding-001`, 768 dimensions) for semantic search.
- **Vector database** — PostgreSQL with the `pgvector` extension stores and searches those embeddings directly in SQL.
- **Semantic search** — natural-language queries are embedded and matched against documents by cosine similarity.
- **RAG** — reasoning questions are answered by combining vector search results with the knowledge graph and handing both to the LLM as context, so answers are grounded in actual evidence instead of invented.
- **Knowledge mapping** — the Relationship Engine is a real graph: typed, weighted edges between entities, decaying over time, visualized with React Flow.

Nothing here is guessed by the model and trusted blindly — see [`docs/THOUGHT_PROCESS.md`](docs/THOUGHT_PROCESS.md) for why classification, scoring, and reasoning are deliberately kept as separate, checkable steps.

---

## Running it

Two independent apps, two `.env` files.

```bash
# 1. Backend
cd helix/server
npm install
cp .env.example .env      # fill in DATABASE_URL, GEMINI_API_KEY, CLOUDINARY_*, JWT_SECRET
npx prisma migrate dev --name init
psql "$DATABASE_URL" -f prisma/sql/enable_vector.sql   # adds the pgvector column + index
npm run dev                # http://localhost:5000

# 2. Frontend (separate terminal)
cd helix/client
npm install
cp .env.example .env       # VITE_API_URL if the server isn't on localhost:5000
npm run dev                 # http://localhost:5173
```

Full setup detail, API reference, and environment variable documentation live in [`helix/server/README.md`](helix/server/README.md) and [`helix/client/README.md`](helix/client/README.md).

Manual upload works the moment the app is running. Two extra ingestion channels are optional on top of it:

- **GitHub import** works immediately, no setup required — it uses GitHub's public API unauthenticated. Add `GITHUB_TOKEN` in `helix/server/.env` only if you want a higher rate limit.
- **Telegram bot** needs `TELEGRAM_BOT_TOKEN` in `helix/server/.env` (free, from [@BotFather](https://t.me/BotFather)). Without it, the server just starts normally and Telegram ingestion stays off.

---

## Stack

React (Vite), Tailwind, Framer Motion, and React Flow on the frontend. Node.js/Express and Prisma on the backend. PostgreSQL with `pgvector` (hosted on Supabase) as the one datastore for both relational data and vector search. Google Gemini for classification, embeddings, and generation. Cloudinary for original-file storage. Full justification for each choice: [`plan.md`, Section 7](plan.md#7-technology-stack).

## Repository layout

```
helix/
  client/   React frontend (Dashboard, Graph, Timeline, Ask pages)
  server/   Express API (services/ holds all the AI/ML logic)
docs/
  ARCHITECTURE.md      system diagram + module-level design
  THOUGHT_PROCESS.md   problem analysis, decisions, trade-offs, constraints
plan.md                 original technical proposal (superset of the above)
reference.txt            the product brief this project responds to
```
