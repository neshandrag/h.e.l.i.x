const { generateContent } = require('../config/gemini');
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
internships, achievements, career paths) as the "entities" array. Use type
CAREER_PATH for target roles, job titles, or career directions named in the
document (e.g. "Software Engineer", "Data Scientist track"). Extract the issuing
organization as "issuer" if present, and the document's effective date (ISO 8601,
YYYY-MM-DD) as "documentDate" if determinable. Set "confidence" between 0 and 1.

Document text:
"""
${text.slice(0, 8000)}
"""`;

const HEURISTIC_RULES = [
  { category: 'Internships', re: /\b(internship|intern\b|offer letter|appointment letter|stipend)\b/i, confidence: 0.72 },
  { category: 'Certifications', re: /\b(certificate|certification|certified|credential|course completion)\b/i, confidence: 0.7 },
  { category: 'Projects', re: /\b(repository:|readme|github\.com\/|project report|built with|tech stack)\b/i, confidence: 0.68 },
  { category: 'Achievements', re: /\b(hackathon|winner|award|prize|olympiad|competition)\b/i, confidence: 0.65 },
  { category: 'Skills', re: /\b(skills?|proficien|programming languages?|technologies)\b/i, confidence: 0.55 },
  { category: 'Academics', re: /\b(transcript|semester|cgpa|gpa|university|college|degree)\b/i, confidence: 0.6 },
];

function heuristicClassify(text) {
  const sample = text || '';
  for (const rule of HEURISTIC_RULES) {
    if (rule.re.test(sample)) {
      return {
        category: rule.category,
        confidence: rule.confidence,
        issuer: null,
        documentDate: null,
        entities: [],
        needsReview: true,
      };
    }
  }
  return {
    category: 'Academics',
    confidence: 0.25,
    issuer: null,
    documentDate: null,
    entities: [],
    needsReview: true,
  };
}

function normalizeConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  // Tolerate models that return 0–100 instead of 0–1.
  const normalized = n > 1 ? n / 100 : n;
  return Math.max(0, Math.min(1, normalized));
}

function parseAndValidate(rawText) {
  const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/```$/, '');
  const parsed = JSON.parse(cleaned);
  const validated = classificationSchema.parse(parsed);
  return {
    ...validated,
    confidence: normalizeConfidence(validated.confidence),
  };
}

async function callGemini(prompt) {
  const result = await generateContent({
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
 * output — falls back to keyword heuristics (still needsReview) rather than
 * leaving the upload as an empty Academics stub.
 */
async function classifyDocument(text) {
  if (!text?.trim()) return heuristicClassify('');

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
      const needsReview = validated.confidence < 0.55;
      return { ...validated, needsReview };
    } catch (err) {
      console.warn(`[ai.service] classification attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  console.warn('[ai.service] using heuristic classification fallback');
  return heuristicClassify(text);
}

module.exports = { classifyDocument, heuristicClassify, normalizeConfidence };
