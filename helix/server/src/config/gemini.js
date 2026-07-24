const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('./env');

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// Prefer stable aliases with separate free-tier buckets. gemini-2.5-flash is
// last because it often exhausts a tiny 20 RPD cap during demos.
const GENERATION_MODELS = [
  env.GEMINI_MODEL,
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
].filter(Boolean);

const UNIQUE_GENERATION_MODELS = [...new Set(GENERATION_MODELS)];

const generationModel = genAI.getGenerativeModel({ model: UNIQUE_GENERATION_MODELS[0] });

// text-embedding-004 is deprecated; gemini-embedding-001 replaces it. Its native
// output is 3072-dim, so outputDimensionality is pinned to 768 to match the
// vector(768) column in prisma/sql/enable_vector.sql.
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

function isRetryableModelError(err) {
  const msg = err?.message || '';
  return (
    msg.includes('[429')
    || msg.includes('[404')
    || msg.includes('RESOURCE_EXHAUSTED')
    || msg.includes('Not Found')
    || msg.includes('quota')
    || msg.includes('overloaded')
    || msg.includes('Unavailable')
  );
}

/**
 * Runs generateContent across a model fallback list so a single model's free
 * quota (or retirement) doesn't take the whole product offline.
 */
async function generateContent(request) {
  let lastError;
  for (const modelName of UNIQUE_GENERATION_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      // eslint-disable-next-line no-await-in-loop
      const result = await model.generateContent(request);
      console.log(`[gemini] ok via ${modelName}`);
      return result;
    } catch (err) {
      lastError = err;
      console.warn(`[gemini] model "${modelName}" failed (${(err.message || '').split('\n')[0]}); trying next`);
      if (!isRetryableModelError(err) && UNIQUE_GENERATION_MODELS.indexOf(modelName) === UNIQUE_GENERATION_MODELS.length - 1) {
        throw err;
      }
      // Keep trying other models even on unexpected errors during demos.
    }
  }
  throw lastError || new Error('No Gemini generation models available');
}

module.exports = {
  genAI,
  generationModel,
  embeddingModel,
  generateContent,
  GENERATION_MODELS: UNIQUE_GENERATION_MODELS,
};
