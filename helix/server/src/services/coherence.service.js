const prisma = require('../config/prisma');
const { generationModel } = require('../config/gemini');
const { coherenceSchema } = require('../utils/aiSchemas');

// Module 3 (plan.md Section 6): "an LLM pass evaluates whether a user's
// documented path forms a consistent progression ... and flags discontinuities."
// Explicitly qualitative and kept separate from the deterministic depth score
// in scoring.service.js — this never feeds back into depth_score/depth_tier.
const COHERENCE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    coherenceScore: { type: 'number' },
    narrative: { type: 'string' },
    discontinuities: { type: 'array', items: { type: 'string' } },
  },
  required: ['coherenceScore', 'narrative', 'discontinuities'],
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
  internship with no bridging project or coursework"). Empty array if none.`;

const FALLBACK_COHERENCE = {
  coherenceScore: 0.5,
  narrative: 'Not enough documented evidence yet to assess coherence.',
  discontinuities: [],
};

function parseAndValidate(rawText) {
  const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
  return coherenceSchema.parse(JSON.parse(cleaned));
}

async function callGemini(prompt) {
  const result = await generationModel.generateContent({
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
      return parseAndValidate(raw);
    } catch (err) {
      console.warn(`[coherence.service] attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  return FALLBACK_COHERENCE;
}

module.exports = { computeCoherence };
