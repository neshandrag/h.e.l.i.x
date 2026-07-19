# Helix — AI-Powered Digital Identity System

Built for **MemoryVerse AI '26** (Wooble Platform, Intermediate Track).

Helix ingests a student's scattered documents — certificates, resumes, project reports, internship letters — and turns them into a living, queryable knowledge graph: automatically categorized, scored for credibility and depth, connected across skills/projects/certifications/internships, narrated into a timeline, and retrievable through natural-language questions that reason over the evidence rather than just fetching files.

Full technical proposal, architecture, and evaluation-criteria alignment: **[`plan.md`](./plan.md)**.
Original hackathon brief and evaluation criteria: **[`reference.txt`](./reference.txt)**.
Differentiation strategy notes: **[`idea.txt`](./idea.txt)**.

## Repository structure

```
helix/
  server/   Express API — ingestion, classification, scoring, graph, retrieval (see helix/server/README.md)
  client/   React (Vite) frontend — dashboard, graph, timeline, ask (see helix/client/README.md)
plan.md         Technical proposal: problem analysis, architecture, tech stack, methodology, criteria alignment
reference.txt   Hackathon problem statement (binding requirements source)
idea.txt        Module-by-module differentiation notes
```

## Quick start

Requires Node.js 18+, a free [Supabase](https://supabase.com) Postgres project, a free [Google AI Studio](https://aistudio.google.com/apikey) API key, and a free [Cloudinary](https://cloudinary.com) account. No paid tier or credit card is required for any of these at hackathon scale — see `plan.md`, Section 11, for the specific free-tier limits and mitigations.

```bash
# Backend
cd helix/server
npm install
cp .env.example .env        # fill in DATABASE_URL, GEMINI_API_KEY, CLOUDINARY_*, JWT_SECRET
npx prisma migrate dev --name init
# then run prisma/sql/enable_vector.sql once against the Supabase database
npm run dev                 # http://localhost:5000

# Frontend (separate terminal)
cd helix/client
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

## Module → implementation map

| Module (per `reference.txt`) | Where it lives |
|---|---|
| 1. AI Data Ingestion | `helix/server/src/services/{extraction,document}.service.js`, `helix/client/src/components/UploadDropzone.jsx` |
| 2. Intelligent Categorization | `helix/server/src/services/{ai,scoring}.service.js` — schema-validated LLM classification + deterministic verifiability/depth scoring |
| 3. Relationship Engine | `helix/server/src/{jobs/decayJob.js, controllers/graph.controller.js}`, `helix/client/src/pages/Graph.jsx` |
| 4. Digital Journey Timeline | `helix/server/src/services/narrative.service.js`, `helix/client/src/pages/Timeline.jsx` |
| 5. Smart Retrieval System | `helix/server/src/services/{vectorSearch,retrieval}.service.js`, `helix/client/src/pages/Ask.jsx` |

## Tech stack

React · Framer Motion · React Flow · Express · PostgreSQL (Supabase) + `pgvector` · Prisma · Google Gemini API (classification, embeddings, reasoning) · Tesseract.js OCR · Cloudinary · Telegraf (Telegram capture channel) — full justification in `plan.md`, Section 7.

## Deliverables checklist (per `reference.txt`)

- [ ] Working prototype or demo video
- [x] GitHub repository with README (this file)
- [x] AI workflow / architecture diagram (`plan.md`, Section 8)
- [x] Thought process sheet (`plan.md`, Sections 2–6, 11)
