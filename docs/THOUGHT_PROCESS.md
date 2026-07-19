# Helix — Thought Process

Problem analysis, design rationale, key decisions, and known constraints. Derived from `plan.md` (Sections 2–6, 11) and updated to reflect what actually shipped versus what was originally scoped.

## 1. Reframing the problem

The brief in `reference.txt` draws a sharp line: *"Traditional storage platforms can save files, but they cannot understand a person's journey."* Storage is a solved problem. The actual gap is interpretation — a folder full of correctly-named files still requires a human to remember what exists, judge how credible each item is, and manually connect it to everything else.

That reframing produced three concrete gaps to design against, not just "build an upload form":

- **Organization gap** — categorization has to be semantically meaningful, not filename sorting.
- **Connection gap** — relationships between artifacts (certification → skill → project → internship) have to be *inferred*, not manually tagged by the user.
- **Retrieval gap** — retrieval has to be natural-language and instant, with originals always one click away.

Everything below is a decision made in service of one of those three gaps.

## 2. Why an LLM does classification, but never does scoring

Early on there was a tempting shortcut: ask the LLM "how skilled is this person at X, 0–10?" and store that. It was rejected. An LLM competence score is unverifiable and drifts between runs on identical input — a reviewer (or a user) has no way to check it, and it would silently change if the underlying model changed.

Instead, the LLM's job is narrowed to **factual extraction only**: *which* document is evidence for *which* skill/project/certification. Everything downstream — the depth score, the tier, the verifiability score — is plain arithmetic in `scoring.service.js`, computed from that evidence:

```
points(evidence)   = 1 (Certification) | 2 (Project) | 3 (Internship)
recency_multiplier = 1.00 (<12mo) | 0.50 (12–24mo) | 0.25 (>24mo)
depth_score(entity) = Σ points × recency_multiplier
```

This is explainable in one sentence to anyone looking at the code, and reproducible — the same evidence always produces the same score, and any reviewer can re-derive it directly from the `document_entities` table without re-running the model. Where the model's judgment genuinely is needed — assessing whether someone's overall path is a *coherent progression* rather than a scattered pile of unrelated artifacts — that stays clearly labeled as qualitative (`coherence.service.js`) and is never allowed to influence the deterministic score. Keeping those two concerns structurally separate was a deliberate constraint, not an oversight.

## 3. Reliability: LLMs return malformed output, and that can't take the app down

Confirmed early: a schema-constrained Gemini call can still occasionally return output that doesn't parse. The mitigation, applied everywhere the app calls out to Gemini for structured data (`ai.service.js`, `coherence.service.js`):

1. Request constrained JSON at generation time (`responseSchema`).
2. Re-validate with Zod regardless — never trust the API's own claim that it followed the schema.
3. One automatic retry with a corrective re-prompt on failure.
4. On a second failure, degrade to a safe, explicit fallback (`needsReview: true`, `confidence: 0`) rather than throwing. **The upload always succeeds**, even when classification doesn't.

The same pattern applies one layer down: text extraction itself can fail on a legitimate file (an encrypted PDF, a corrupt upload). `document.service.js` wraps extraction independently, so an extraction failure also degrades gracefully — the original file is preserved, `extractedText: null`, `needsReview: true` — instead of failing the whole request. Two independent points of external unreliability (the parser, the model), two independent fallback paths, neither one crashes the pipeline.

## 4. Ingestion: manual upload is the guaranteed path; everything else is additive

Manual upload was built and hardened first, deliberately, because it's the only ingestion path with zero external dependency risk beyond the LLM/DB/storage the app already needs. Telegram and GitHub were added afterward as lower-friction *supplementary* channels — a document forwarded to a bot, or a GitHub profile pulled in with one click — specifically because the brief's own framing ("scattered across folders, emails, cloud drives, devices") implies reducing upload friction matters, not just processing whatever gets uploaded.

Both secondary channels are designed to degrade to a no-op rather than a hard failure if unconfigured:
- **GitHub import** works unauthenticated against GitHub's public API out of the box (60 requests/hour); an optional token only raises that ceiling.
- **Telegram** requires a bot token to do anything at all, but the server logs "disabled" and starts normally without one — it was never allowed to become a hard dependency for the core app to run.

The Telegram account-linking design (a short-lived one-time code, redeemed via `/link <code>` in the bot) is intentionally in-memory rather than a database table — codes are single-use and expire in 10 minutes, so losing them on a server restart is harmless. That's documented in the code as a known simplification, not a hidden one; a horizontally-scaled deployment would move it to Redis or Postgres.

## 5. Retrieval: two distinct query shapes need two distinct answers

Testing against the brief's own example queries ("show my AI projects" vs. "Am I ready for a Data Science internship?") surfaced that these are not the same kind of question. The first is a *fetch* — rank documents by similarity, return them. The second is a *reasoning* question that a plain document list doesn't actually answer.

Rather than force both through one code path, retrieval splits in two:
- **Standard search** (`POST /api/search`) — pure pgvector cosine-similarity ranking, fast, no LLM call on the hot path beyond query embedding.
- **Advisory retrieval / GraphRAG** (`POST /api/search/ask`) — pulls the top vector-search matches *and* the relevant slice of the knowledge graph (entities, depth scores) into one prompt, and asks Gemini to reason over both together, stating concretely what evidence exists and what's missing rather than fabricating an answer.

This is the same underlying insight as the scoring decision in Section 2: use the graph and the deterministic scores as ground truth the model reasons *over*, not something the model invents from scratch.

## 6. Known constraints, stated rather than hidden

- **Free-tier database size (500 MB)** — comfortably sufficient for a personal-scale dataset (hundreds of thousands of 768-dim vectors), documented as a scaling boundary rather than a functional blocker.
- **Free-tier project inactivity pause** — the hosted Postgres instance can pause after a period of inactivity; mitigated with a keep-alive ping or a manual restart before a live demo.
- **Prisma has no native vector type** — `embedding` is declared `Unsupported("vector(768)")` in the schema and added via a raw SQL migration step instead of the normal Prisma migration flow. This is the one place the ORM and the vector database diverge, so it's called out explicitly in `helix/server/README.md` rather than left as a surprise.
- **In-memory Telegram link codes** — see Section 4; a real production deployment would move this to shared storage.
- **Coherence scores are not cached** — recomputed on every request. Fine at the current dataset size; would need caching or a scheduled precompute (piggybacking on the existing nightly decay job) at larger scale.
