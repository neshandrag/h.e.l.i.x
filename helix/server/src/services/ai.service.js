const { generationModel } = require('../config/gemini');
const { classificationSchema, CLASSIFICATION_CATEGORIES, ENTITY_TYPES } = require('../utils/aiSchemas');

const CLASSIFICATION_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: CLASSIFICATION_CATEGORIES },
    confidence: { type: 'number' },
    issuer: { type: 'string', nullable: true },
    documentDate: { type: 'string', nullable: true },
    entities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ENTITY_TYPES },
          name: { type: 'string' },
        },
        required: ['type', 'name'],
      },
    },
  },
  required: ['category', 'confidence', 'entities'],
};

const CLASSIFICATION_PROMPT = (text) => `You are a document classifier for a digital identity system.
Read the document text below and return ONLY the requested JSON.

Classify it into exactly one category: ${CLASSIFICATION_CATEGORIES.join(', ')}.
Extract concrete entities it provides evidence for (skills, projects, certifications,
internships, achievements) as the "entities" array. Extract the issuing
organization as "issuer" if present, and the document's effective date (ISO 8601,
YYYY-MM-DD) as "documentDate" if determinable. Set "confidence" between 0 and 1.

Document text:
"""
${text.slice(0, 8000)}
"""`;

// The fallback returned when the model output cannot be trusted after one retry.
// The upload is preserved and flagged for manual review rather than discarded —
// see plan.md Section 11, "LLM output can be malformed or non-JSON".
const FALLBACK_CLASSIFICATION = {
  category: 'Academics',
  confidence: 0,
  issuer: null,
  documentDate: null,
  entities: [],
  needsReview: true,
};

function parseAndValidate(rawText) {
  // Gemini's JSON mode is expected to return clean JSON, but models can still wrap
  // output in prose or code fences under some configurations — strip defensively.
  const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
  const parsed = JSON.parse(cleaned);
  return classificationSchema.parse(parsed);
}

async function callGemini(prompt) {
  const result = await generationModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: CLASSIFICATION_RESPONSE_SCHEMA,
    },
  });
  return result.response.text();
}

/**
 * Classifies a document's extracted text. Never throws on malformed model
 * output — degrades to FALLBACK_CLASSIFICATION with needsReview: true instead,
 * per the reliability requirement in plan.md Section 6 (Module 2).
 */
async function classifyDocument(text) {
  const prompt = CLASSIFICATION_PROMPT(text);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const raw = await callGemini(
        attempt === 0
          ? prompt
          : `${prompt}\n\nYour previous response was not valid JSON matching the schema. Return ONLY valid JSON this time.`
      );
      const validated = parseAndValidate(raw);
      return { ...validated, needsReview: false };
    } catch (err) {
      console.warn(`[ai.service] classification attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  return FALLBACK_CLASSIFICATION;
}

module.exports = { classifyDocument };
