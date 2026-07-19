# Helix API Server

Express/PostgreSQL backend implementing the five modules specified in `reference.txt` and detailed in [`plan.md`](../../plan.md) at the repository root: AI ingestion, categorization (with schema-validated LLM output), a deterministic-depth-score relationship graph, an AI-narrated journey timeline, and GraphRAG-based semantic retrieval.

## Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) project (Postgres + `pgvector`, no credit card required)
- A free [Google AI Studio](https://aistudio.google.com/apikey) API key — **create it from AI Studio, not the Cloud Console**, so the project is never switched into billing mode
- A free [Cloudinary](https://cloudinary.com) account for original-file storage

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, GEMINI_API_KEY, CLOUDINARY_*, JWT_SECRET

npx prisma migrate dev --name init   # creates all tables except the vector column
# then run prisma/sql/enable_vector.sql once against your Supabase database
# (Supabase SQL Editor, or `psql "$DATABASE_URL" -f prisma/sql/enable_vector.sql`)

npm run dev   # starts the API on http://localhost:5000
```

## Why a separate SQL step for the vector column

Prisma has no native `vector` type, so `embedding` is declared as `Unsupported("vector(768)")` in `prisma/schema.prisma` and is intentionally excluded from `prisma migrate`. `prisma/sql/enable_vector.sql` adds the column and its `ivfflat` cosine-similarity index directly. This is documented explicitly (see `plan.md`, Section 9) rather than hidden, since it's the one place the ORM and the vector database diverge.

## Project structure

```
src/
  config/       env validation, Prisma client, Gemini client, Cloudinary config
  routes/       Express routers (thin — validation + wiring only)
  controllers/  request handlers
  services/     business logic:
                  ai.service.js          — Gemini classification, schema-validated, retry + fallback
                  embedding.service.js   — Gemini text-embedding-004 wrapper
                  scoring.service.js     — deterministic verifiability + depth-score formulas
                  extraction.service.js  — PDF/DOCX/OCR text extraction
                  document.service.js    — full ingestion pipeline orchestration
                  vectorSearch.service.js— pgvector cosine similarity search
                  retrieval.service.js   — GraphRAG advisory retrieval
                  narrative.service.js   — timeline narration + resume/LinkedIn generation
  jobs/         node-cron scheduled decay/coherence recalculation
  middleware/   JWT auth guard, centralized error handler
  utils/        ApiError, asyncHandler, Zod schemas for LLM output validation
prisma/
  schema.prisma       relational + graph data model (plan.md, Section 9)
  sql/enable_vector.sql
```

## API reference

All routes except `/auth/*` and `/health` require `Authorization: Bearer <token>`.

| Method | Route | Module | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create an account, returns a JWT |
| POST | `/api/auth/login` | — | Authenticate, returns a JWT |
| POST | `/api/documents` | 1, 2 | Upload a file (`multipart/form-data`, field `file`); runs the full extract → classify → score → embed → link pipeline |
| GET | `/api/documents` | 1 | List the current user's documents |
| GET | `/api/documents/:id` | 1, 3 | Get one document with its linked entities |
| GET | `/api/graph` | 3 | Relationship graph nodes/edges for visualization |
| GET | `/api/graph/gaps` | 3 | Entities stuck at `EXPOSURE` depth tier (coverage gaps) |
| GET | `/api/timeline` | 4 | List timeline events |
| POST | `/api/timeline` | 4 | `{ documentId }` — materialize a narrated milestone from a document |
| POST | `/api/timeline/:id/generate` | 4 | `{ kind: "resumeBullet" \| "linkedinPost" }` — one-click reusable content |
| POST | `/api/search` | 5 | `{ query, limit? }` — plain semantic search |
| POST | `/api/search/ask` | 5 | `{ question }` — GraphRAG advisory retrieval (reasoning over evidence + graph) |

## Notes on reliability (see `plan.md`, Section 11)

- Every Gemini classification call requests constrained JSON output (`responseSchema`), is validated with Zod, retried once on failure, and falls back to `category: "Uncategorized"`, `needsReview: true` rather than throwing — an upload never fails because the model returned malformed output.
- `depthScore` on `Entity` is never set by the LLM. It's recomputed by `scoring.service.js` from the `document_entities` evidence table using the fixed formula documented in `plan.md`, Section 6 (Module 3).
