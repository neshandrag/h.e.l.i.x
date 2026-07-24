const prisma = require('../config/prisma');
const { generateContent } = require('../config/gemini');
const { coherenceSchema } = require('../utils/aiSchemas');

// Module 3 (plan.md Section 6): "an LLM pass evaluates whether a user's
// documented path forms a consistent progression ... and flags discontinuities."
// Explicitly qualitative and kept separate from the deterministic depth score
// in scoring.service.js — this never feeds back into depth_score/depth_tier.
// Module 4 (plan.md Section 6): "identifies inflection points (significant
// shifts in focus, e.g., a transition between domains)". Computed as part of
// this same chronological LLM pass rather than a separate call — inflection
// detection and coherence scoring both require the same full ordered evidence
// list, and this keeps the "advisory only, never persisted" pattern in one
// place instead of duplicating it in narrative.service.js.
const COHERENCE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    coherenceScore: { type: 'number' },
    narrative: { type: 'string' },
    discontinuities: { type: 'array', items: { type: 'string' } },
    inflectionPoints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['date', 'description'],
      },
    },
  },
  required: ['coherenceScore', 'narrative', 'discontinuities', 'inflectionPoints'],
};

const COHERENCE_PROMPT = (timelineSummary) => `You are assessing whether a student's documented growth path is
coherent — i.e. each step plausibly builds on the last (certification leads to
a related project, a project leads to a related internship, etc.) rather than
being a disconnected pile of unrelated artifacts.

Chronological evidence (oldest first):
${timelineSummary || '(no documents yet)'}

Return ONLY the requested JSON:
- "coherenceScore": 0 to 1, where 1 is a fully consistent, connected progression.
- "narrative": one or two sentences summarizing the overall trajectory.
- "discontinuities": short strings naming specific gaps or unexplained jumps
  (e.g. "Jump from web development skills directly to a data science
  internship with no bridging project or coursework"). Empty array if none.
- "inflectionPoints": 0-3 specific dated entries from the evidence above that
  mark a meaningful turning point or step-change in trajectory (e.g. a first
  internship, or a pivot from one domain to another). Each entry has "date"
  (the evidence's date, YYYY-MM-DD) and "description" (why it's a turning
  point, under 20 words). Empty array if nothing stands out.`;

const FALLBACK_COHERENCE = {
  coherenceScore: 0.5,
  narrative: 'Not enough documented evidence yet to assess coherence.',
  discontinuities: [],
  inflectionPoints: [],
};

// Short in-memory cache so revisiting the Graph page doesn't burn free-tier
// quota on every load (coherence is advisory and does not need to be live).
const CACHE_TTL_MS = 15 * 60 * 1000;
const coherenceCache = new Map();

function parseAndValidate(rawText) {
  const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
  return coherenceSchema.parse(JSON.parse(cleaned));
}

async function callGemini(prompt) {
  const result = await generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: COHERENCE_RESPONSE_SCHEMA,
    },
  });
  return result.response.text();
}

/**
 * Computes (never persists — recomputed on demand, cheap enough at hackathon
 * scale) a coherence assessment over a user's full documented history.
 * Same reliability pattern as ai.service.js: schema-constrained generation,
 * one retry, safe fallback on repeated failure — never throws.
 */
async function computeCoherence(userId) {
  const cached = coherenceCache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  const documents = await prisma.document.findMany({
    where: { userId, extractedText: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { category: true, extractedText: true, createdAt: true },
  });

  if (documents.length < 2) {
    return { ...FALLBACK_COHERENCE, narrative: 'Add at least two documents to assess coherence.' };
  }

  const timelineSummary = documents
    .map((d) => `- [${d.createdAt.toISOString().slice(0, 10)}] (${d.category}) ${(d.extractedText || '').slice(0, 160)}`)
    .join('\n');

  const prompt = COHERENCE_PROMPT(timelineSummary);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const raw = await callGemini(
        attempt === 0
          ? prompt
          : `${prompt}\n\nYour previous response was not valid JSON matching the schema. Return ONLY valid JSON this time.`
      );
      const value = parseAndValidate(raw);
      coherenceCache.set(userId, { at: Date.now(), value });
      return value;
    } catch (err) {
      console.warn(`[coherence.service] attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  return FALLBACK_COHERENCE;
}

module.exports = { computeCoherence };
