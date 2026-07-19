const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('./env');

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// gemini-2.0-flash has a 0 free-tier quota on newer API keys as of mid-2026;
// gemini-2.5-flash is the current free-tier generation model.
const generationModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
// text-embedding-004 is deprecated; gemini-embedding-001 replaces it. Its native
// output is 3072-dim, so outputDimensionality is pinned to 768 to match the
// vector(768) column in prisma/sql/enable_vector.sql.
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

module.exports = { genAI, generationModel, embeddingModel };
