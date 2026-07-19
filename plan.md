# Helix — AI-Powered Digital Identity System
### Technical Proposal & Implementation Plan
**Event:** MemoryVerse AI '26 (Wooble Platform) · **Track:** Intermediate · **Format:** Evaluation Only

---

## 1. Document Purpose

This document is the formal technical proposal for **Helix**, prepared in direct response to the hackathon problem statement recorded in `reference.txt`. It covers problem analysis, proposed solution, functional requirement mapping, system architecture, technology justification, development methodology, known technical constraints, and explicit alignment with the stated evaluation criteria. All requirements referenced below are sourced from `reference.txt` and are treated as the binding specification for this project.

---

## 2. Problem Statement (per hackathon brief)

As specified in `reference.txt`:

> "Every student builds a digital footprint throughout their academic and professional journey. Certificates, resumes, project reports, internship letters, portfolios, GitHub repositories, achievements, and learning records accumulate over time. Yet most of this information remains scattered across folders, emails, cloud drives, and devices... Traditional storage platforms can save files, but they cannot understand a person's journey."

The brief requires an AI-powered **Digital Identity System** built around five mandatory modules:

1. AI Data Ingestion
2. Intelligent Categorization
3. Relationship Engine
4. Digital Journey Timeline
5. Smart Retrieval System

And poses three key questions the system must answer:

1. **Intelligent Organization** — Can the system organize content without manual sorting?
2. **Knowledge Connections** — Can it identify and connect skills, projects, certifications, internships, and achievements?
3. **Instant Retrieval** — Can users retrieve any document instantly without searching folders?

Success metric (verbatim): *"I never have to search through folders again."*

---

## 3. Problem Analysis

Storage is a solved problem; interpretation is not. A folder full of correctly-named files still requires the user to remember what exists, judge how credible or current each item is, and manually connect it to the rest of their history. The brief explicitly separates these two capabilities — "Traditional storage platforms can save files, but they cannot understand a person's journey" — which means the evaluation is weighted toward *organization quality and AI technique* (65% combined; see Section 12), not file management mechanics.

Three structural gaps follow directly from the brief's own language:

- **Organization gap** — categorization must be automatic and semantically meaningful, not just filename sorting.
- **Connection gap** — relationships between artifacts (certification → skill → project → internship → career path) must be inferred, not manually tagged.
- **Retrieval gap** — retrieval must be natural-language and instant, with originals always accessible.

Helix is designed to satisfy all three gaps using the specific AI techniques the brief names as evaluation targets: **NLP, embeddings, vector databases, semantic search, and knowledge mapping**.

---

## 4. Proposed Solution — System Overview

**Helix** is a web application, built on React, Node.js/Express, and PostgreSQL, that ingests a user's academic and professional documents, extracts structured meaning from each using a large language model, generates vector embeddings for semantic search, and builds a persistent knowledge graph connecting skills, projects, certifications, internships, and achievements. A natural-language retrieval interface, backed by Retrieval-Augmented Generation (RAG) over the knowledge graph, allows the user to query their own history conversationally and receive evidence-based answers rather than a plain document list.

---

## 5. Functional Requirement Mapping

| # | Requirement (per `reference.txt`) | Helix Implementation |
|---|---|---|
| 1 | Upload certificates, resumes, project reports, internship letters, portfolio links, other documents | Multi-format upload endpoint (PDF, DOCX, image) + URL ingestion for portfolio/GitHub links |
| 2 | Auto-classify into Projects / Skills / Certifications / Internships / Achievements / Academics | LLM-based zero-shot classification with confidence scoring |
| 3 | Connect related data (Certification→Skill→Project→Internship→Career Path) | Graph construction from LLM-extracted entities, stored as typed relationship tables in PostgreSQL |
| 4 | Visual timeline of growth by year | Chronologically ordered timeline generated from extracted document dates |
| 5 | Natural-language search with originals always accessible | Vector similarity search (PostgreSQL + pgvector) + RAG answer generation, with a direct link to the source file on every result |

---

## 6. Module-Level Technical Design

### Module 1 — AI Data Ingestion Pipeline
**Objective:** Accept and normalize heterogeneous input formats with minimal manual effort.
**Implementation:**
- REST upload endpoint (`multipart/form-data` via Multer) supporting PDF, DOCX, PNG/JPG.
- Text extraction: `pdf-parse` (PDF), `mammoth` (DOCX), `Tesseract.js` OCR (scanned images/certificates).
- Secondary ingestion channels to reduce upload friction:
  - **Telegram Bot API** integration — a document forwarded to the bot is ingested automatically.
  - **GitHub REST API** (via Octokit) — connecting a GitHub account extracts repository README content, commit history, and language statistics as skill evidence.
- All ingested content is normalized into a common `documents` record before downstream processing.

### Module 2 — Intelligent Categorization Engine
**Objective:** Classify each document into the six required categories with a measurable confidence signal, and distinguish superficial exposure from demonstrated competence — reliably, even when the underlying model output is malformed.
**Implementation:**
- LLM classification call (Google Gemini API, constrained JSON output via `responseSchema`) returns category, extracted entities (skills, issuer, dates), and a confidence score.
- **Output validation, not blind trust:** every LLM response is parsed defensively —
  1. The API call requests structured output (`response_mime_type: "application/json"` with an explicit schema) so the model is constrained at generation time.
  2. The response is validated against a strict schema (Zod) before use; `JSON.parse` failures and schema violations are caught, never allowed to propagate.
  3. On a first failure, the request is retried once with a corrective re-prompt. On a second failure, the document is stored with `category: "Uncategorized"`, `confidence: 0`, and a `needsReview` flag — the upload always succeeds even if classification does not.
  4. Malformed responses are logged for prompt refinement, but never crash the ingestion request.
- **Verifiability score** — rule-based, not model-judged: checks issuer domain patterns and presence of a verification link/QR reference in the source document.
- **Depth score** — see Module 3; computed as deterministic arithmetic over the relationship graph, not as a separate LLM judgment call.
- Low-confidence or `needsReview` classifications are surfaced in the UI for one-click user correction, which is logged and can be used to refine future classification prompts.

### Module 3 — Relationship Engine (Knowledge Graph)
**Objective:** Construct and maintain a graph connecting extracted entities, represent it as a living structure rather than a static snapshot, and score competence in a way that is transparent and reproducible rather than another AI opinion.
**Implementation:**
- Entities (`Skill`, `Project`, `Certification`, `Internship`, `Achievement`) are stored as graph nodes; typed, weighted edges (`CERTIFIES`, `APPLIES_TO`, `LED_TO`) connect them. A join table (`document_entities`) records which document is the evidence for which entity, tagged with an `evidence_type`.
- **Depth score — deterministic formula, not an AI guess.** The LLM's only role is factual extraction (identifying *which* entity a document is evidence for); the score itself is plain arithmetic computed in application code from the `document_entities` table:

  ```
  points(evidence)   = 1  if evidence_type = Certification
                      = 2  if evidence_type = Project
                      = 3  if evidence_type = Internship

  recency_multiplier = 1.00  if evidence age  < 12 months
                      = 0.50  if evidence age  12–24 months
                      = 0.25  if evidence age  > 24 months

  depth_score(entity) = Σ  points(evidence) × recency_multiplier(evidence)
                          over all evidence linked to that entity

  tier: depth_score < 2        → "Exposure"
        2 ≤ depth_score < 5    → "Working Knowledge"
        depth_score ≥ 5        → "Demonstrated Mastery"
  ```

  This is a single, fixed, published formula — reproducible from the raw data, independent of model variance, and explainable in one sentence to a reviewer: *"points per corroborating document, discounted by age."*
- **Temporal weighting (edge decay):** each edge carries a `weight` that increases when new corroborating evidence is added and decays over time (via a scheduled `node-cron` job using the same recency multiplier above) if a skill has no recent reinforcing activity, surfacing it as inactive/outdated.
- **Coherence scoring:** an LLM pass evaluates whether a user's documented path forms a consistent progression (e.g., certification → related project → related internship) and flags discontinuities. This is explicitly qualitative and kept separate from the deterministic depth score.
- **Gap detection:** the engine cross-references claimed skill categories against actual project evidence (via SQL joins on `document_entities`) and reports specific missing combinations (e.g., a "Data Science" claim with no project demonstrating both Python and SQL usage).

### Module 4 — Digital Journey Timeline
**Objective:** Present a chronological, evidence-backed view of the user's growth, and make the underlying narrative reusable.
**Implementation:**
- Timeline events are derived automatically from extracted document dates and grouped by year.
- An LLM summarization pass generates a short narrative description for each milestone and identifies inflection points (significant shifts in focus, e.g., a transition between domains). Narrative text is advisory/presentational only — it does not feed back into any scoring calculation.
- On-demand content generation: each timeline entry can be converted into a resume bullet point or a short professional post via a dedicated LLM prompt, giving the user a reusable output rather than a static display.

### Module 5 — Smart Retrieval System (Semantic Search + RAG)
**Objective:** Provide instant natural-language access to documents and enable reasoning over the user's full history, satisfying the brief's explicit requirement for semantic search and RAG.
**Implementation:**
- Every document is embedded using Google Gemini's `gemini-embedding-001` model, requested at a fixed 768-dimensional output (via the `outputDimensionality` parameter, since the model's native output is 3072-dimensional), and indexed via **PostgreSQL's `pgvector` extension**.
- Standard retrieval: natural-language queries ("show my AI projects", "show my latest resume") are embedded and matched via cosine similarity (`<=>` operator), returning ranked results with direct links to original files.
- **Advisory retrieval (GraphRAG):** for reasoning queries ("Am I ready for a Data Science internship?"), the system combines vector search results with a graph traversal over the Relationship Engine (Module 3) — including deterministic depth scores — and passes both as context to the LLM, returning an evidence-based answer that explicitly states available proof and identified gaps, rather than a plain document list.

---

## 7. Technology Stack

All components below are available at zero cost at hackathon scale.

| Layer | Technology | Justification |
|---|---|---|
| Frontend framework | React.js (Vite) | Industry-standard, component-driven, fast dev cycle |
| Styling | Tailwind CSS | Utility-first, rapid consistent styling |
| Animation | Framer Motion | Declarative, production-grade animation library for React |
| Graph visualization | React Flow | Purpose-built for interactive node/edge graphs |
| Analytics charts | Recharts | Standard React charting library for skill/category breakdowns |
| HTTP client | Axios | Standard promise-based client for API communication |
| Backend runtime | Node.js + Express.js | Minimal, well-documented REST layer; hosts scheduled jobs and channel webhooks (Telegram) |
| Database | **PostgreSQL** (hosted free via **Supabase**, 500 MB) | Relational integrity for the graph/join-table model; no artificial per-project index cap |
| Vector search | **pgvector** extension (bundled free on Supabase, all tiers) | Native SQL cosine-similarity search; comfortably handles the vector volume of a hackathon-scale dataset within the 500 MB free allowance |
| ORM | Prisma | Type-safe schema/migrations, widely adopted in current Node.js/Postgres projects |
| Authentication | JWT + bcrypt | Stateless, industry-standard auth, framework-agnostic |
| File storage | Cloudinary (free tier, 25 GB) | Stores original uploaded documents/images; originals remain directly downloadable |
| File handling | Multer | Standard multipart upload middleware for Express |
| Output validation | Zod | Schema validation for LLM JSON responses before they are trusted by the application |
| Security middleware | Helmet, CORS, express-validator | Baseline API hardening and input validation |
| Document parsing | pdf-parse, mammoth | Standard text extraction for PDF/DOCX |
| OCR | Tesseract.js | Open-source OCR for scanned certificates/images |
| LLM & embeddings | **Google Gemini API** (`gemini-2.5-flash` for classification/reasoning/generation; `gemini-embedding-001` at 768 dimensions for vector embeddings) | Single, free-tier provider covering both generation and embedding needs under one API key. `gemini-2.0-flash` and `text-embedding-004` were the original choices but were retired/left with zero free-tier quota on new API keys as of mid-2026; verified working alternatives above against a live key before implementation |
| Secondary ingestion | Telegram Bot API, GitHub REST API (Octokit) | Official, well-documented, free APIs |
| Scheduled processing | node-cron | Periodic recalculation of edge decay and coherence scores |
| Version control / CI | Git, GitHub | Required deliverable format (Code Repository) |
| Deployment | Vercel (frontend), Render (backend), Supabase (database) | Free-tier hosting sufficient for a working deployed prototype |

---

## 8. System Architecture

```
                 ┌───────────────────────────────────────────┐
                 │              INGESTION LAYER                 │
                 │  Manual Upload │ Telegram Bot │ GitHub API   │
                 └────────────────────┬──────────────────────┘
                                      ▼
                 ┌───────────────────────────────────────────┐
                 │             EXTRACTION LAYER                 │
                 │  pdf-parse / mammoth / Tesseract.js OCR       │
                 │  → normalized text + metadata                 │
                 └────────────────────┬──────────────────────┘
                                      ▼
                 ┌───────────────────────────────────────────┐
                 │           AI PROCESSING LAYER (Gemini)       │
                 │  • Category classification (schema-validated) │
                 │  • Entity extraction (skills, dates, issuer)  │
                 │  • Vector embedding generation                 │
                 │  • Coherence scoring (qualitative, LLM)        │
                 └────────────────────┬──────────────────────┘
                                      ▼
                 ┌───────────────────────────────────────────┐
                 │   DETERMINISTIC SCORING LAYER (app code)      │
                 │  • Verifiability score (rule-based)            │
                 │  • Depth score (fixed arithmetic formula)      │
                 └────────────────────┬──────────────────────┘
                                      ▼
                 ┌───────────────────────────────────────────┐
                 │     POSTGRESQL (SUPABASE) + pgvector          │
                 │  documents │ entities │ relationships          │
                 │  document_entities │ timeline_events │ users   │
                 └───────┬───────────────────────┬───────────────┘
                         ▼                       ▼
        ┌───────────────────────────┐  ┌───────────────────────────────┐
        │  DECAY & COHERENCE ENGINE   │  │   RETRIEVAL ENGINE (GraphRAG)    │
        │  (node-cron scheduled job)  │  │   pgvector search + graph join   │
        │  • edge weight decay         │  │   + Gemini reasoning              │
        │  • gap detection              │  │   → advisory / evidence-based     │
        └──────────────┬────────────┘  │      answers                       │
                        └──────────────┴───────┬───────────────────────────┘
                                                ▼
                 ┌───────────────────────────────────────────┐
                 │              EXPRESS.JS API LAYER             │
                 │  Auth │ Documents │ Graph │ Timeline │ Search  │
                 └────────────────────┬──────────────────────┘
                                      ▼
                 ┌───────────────────────────────────────────┐
                 │        REACT.JS FRONTEND (Framer Motion)      │
                 │  Dashboard │ Relationship Graph (React Flow)   │
                 │  Journey Timeline │ Natural-Language Search     │
                 └───────────────────────────────────────────┘
```

---

## 9. Data Model (PostgreSQL Schema)

| Table | Key Fields | Purpose |
|---|---|---|
| `users` | `id`, `email`, `password_hash`, `telegram_chat_id`, `github_username` | Authentication and connected-channel identity |
| `documents` | `id`, `user_id` (FK), `file_url`, `extracted_text`, `category`, `confidence_score`, `verifiability_score`, `embedding vector(768)`, `source_channel`, `needs_review`, `created_at` | Canonical record for every ingested artifact; single vector column indexed with pgvector |
| `entities` | `id`, `user_id` (FK), `type` (Skill/Project/Certification/Internship/Achievement), `name`, `depth_score`, `depth_tier`, `updated_at` | Graph nodes; `depth_score` recomputed by the deterministic formula (Section 6, Module 3) |
| `document_entities` | `document_id` (FK), `entity_id` (FK), `evidence_type`, `evidence_date` | Join table recording which document is evidence for which entity — the direct input to the depth-score formula |
| `relationships` | `id`, `source_entity_id` (FK), `target_entity_id` (FK), `type`, `weight`, `last_reinforced_at` | Typed, weighted, decaying graph edges |
| `timeline_events` | `id`, `user_id` (FK), `event_date`, `narrative`, `linked_document_id` (FK) | Derived, narrated milestones |

**Note on referential design:** depth score and edge weight are both derived columns, recomputed from `document_entities` rather than stored as opaque model output — any reviewer can re-derive them directly from the raw evidence rows using the formula in Section 6.

---

## 10. Development Methodology

Iterative, module-sequenced development over the seven-day submission window, with the core ingestion-to-retrieval loop functional before optional ingestion channels are layered on.

| Day | Deliverable |
|---|---|
| 1 | Schema/migrations (Prisma), authentication, manual upload → extraction → LLM classification (with schema validation) → storage (core loop functional end-to-end) |
| 2 | Verifiability scoring, embedding generation, pgvector index configuration on Supabase |
| 3 | Relationship Engine: entity extraction, `document_entities` linking, deterministic depth-score computation, edge decay job, coherence and gap detection |
| 4 | Journey Timeline UI and narrative/content generation |
| 5 | GraphRAG retrieval engine and natural-language search interface |
| 6 | Secondary ingestion channels (Telegram bot, GitHub connect); UI animation pass (Framer Motion) |
| 7 | Deployment, README, architecture diagram, thought-process sheet, demo video recording |

Risk mitigation: manual upload remains the primary, guaranteed-functional ingestion path; Telegram/GitHub integrations are additive and can be deprioritized without affecting core module compliance if time is constrained.

---

## 11. Technical Constraints & Mitigations

Documented explicitly so evaluators can see known limitations were considered, not overlooked.

| Constraint | Detail | Mitigation |
|---|---|---|
| Supabase free-tier database size | 500 MB storage cap on the free Postgres instance | Sufficient for a hackathon-scale dataset (comfortably several hundred thousand embedding vectors at 768 dimensions); documented as a scaling boundary, not a functional blocker for the demo |
| Free-tier project inactivity pause | Supabase free projects pause after 7 days without activity | A scheduled keep-alive ping (or a manual restart before judging) prevents the database from being paused at evaluation time |
| LLM output can be malformed or non-JSON | Language models occasionally return text that fails to parse as valid JSON, which would otherwise crash the ingestion pipeline | Constrained generation via `responseSchema`, defensive `try/catch` + Zod validation on every LLM call, one automatic re-prompt retry, and a safe fallback (`Uncategorized`, `needsReview: true`) so a malformed response degrades gracefully instead of failing the upload |
| Competence scoring must be explainable | An LLM-estimated "how skilled is this person" score is unverifiable and can vary between runs | Depth score is computed with the fixed arithmetic formula in Section 6 (Module 3) over `document_entities`, not inferred by the model — reproducible, auditable, and explainable to judges in one sentence |

---

## 12. Deliverables Plan (per `reference.txt`, all four required)

| Deliverable | Plan |
|---|---|
| Working prototype or demo video | Deployed prototype (Vercel + Render + Supabase) with a recorded demo video as backup |
| GitHub repository with README | Public repository with setup instructions, environment variable documentation, and module-by-module description |
| AI workflow / architecture diagram | Derived from Section 8 of this document |
| Thought process sheet | Derived from Sections 2–6 and 11 of this document (problem analysis, per-module design rationale, and known constraints) |

---

## 13. Evaluation Criteria Alignment

Per `reference.txt`, submissions are scored as follows:

| Criteria | Weight | Helix Alignment |
|---|---|---|
| Quality of AI organization, categorization & retrieval | 40% | Automatic six-category classification with confidence scoring and graceful degradation on model error; verifiability and depth scoring add a credibility dimension beyond label assignment; GraphRAG retrieval answers reasoning queries in addition to fetch queries |
| Use of AI/ML techniques (embeddings, NLP, semantic search, knowledge mapping) | 25% | LLM-based NLP extraction and classification; vector embeddings indexed via PostgreSQL/pgvector; explicit knowledge graph with typed, weighted, temporally-decaying relationships |
| Innovation, usefulness, UX | 20% | Multi-channel low-friction ingestion (Telegram, GitHub); decay/coherence modeling surfaces information no competing "storage + tags" system captures; one-click resume/content generation from timeline entries |
| Clarity of explanation, architecture, thought process | 15% | This document: explicit requirement mapping, layered architecture diagram, per-module technical rationale, documented constraints, and criteria-by-criteria alignment |

---

## 14. Comparative Analysis

| Capability | Cloud Storage (Drive/Dropbox) | Portfolio Tools (LinkedIn/Notion) | Baseline "RAG + Storage" Hackathon Submission | **Helix** |
|---|---|---|---|---|
| File storage | Yes | Yes | Yes | Yes |
| Automatic categorization | No | No | Yes (label only) | Yes, with confidence, verifiability, and depth scoring |
| Requires full manual upload effort | Yes | Yes | Yes | Reduced — supplementary passive channels (Telegram, GitHub) |
| Models skill freshness over time | No | No | No | Yes — temporal decay on relationship edges |
| Detects gaps in claimed competencies | No | No | No | Yes — coherence and gap detection |
| Answers reasoning queries (not just fetch) | No | No | No | Yes — GraphRAG advisory retrieval |
| Competence score is explainable/reproducible | N/A | N/A | N/A (if present, typically opaque LLM output) | Yes — fixed arithmetic formula over evidence, not a model guess |
| Produces reusable output artifacts | No | Manual | No | Yes — generated resume bullets / summaries from timeline entries |

---

## 15. Conclusion

Helix satisfies every mandatory module specified in `reference.txt` while extending each with a technically substantiated capability — trust/depth-aware categorization, a temporally-weighted relationship graph, narrative-generating timelines, and reasoning-capable retrieval — directly targeting the AI/ML technique and organization-quality criteria that together account for 65% of the evaluation score. The technology stack (React, Node.js/Express, PostgreSQL with pgvector, Google Gemini API) is composed entirely of standard, well-documented, free-tier tools, and the design explicitly accounts for its own failure modes — malformed model output, free-tier storage limits, and the need for an explainable competence score — keeping the implementation reproducible and verifiable by reviewers within the constraints of the submission window.
