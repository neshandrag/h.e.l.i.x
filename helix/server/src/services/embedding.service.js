const { embeddingModel } = require('../config/gemini');

async function generateEmbedding(text) {
  const result = await embeddingModel.embedContent(text.slice(0, 8000));
  return result.embedding.values; // number[768]
}

// Formats a JS number array as the pgvector literal Postgres expects, e.g. '[0.1,0.2,...]'.
// Used with prisma.$queryRaw since Prisma has no native vector type (plan.md Section 9 note).
function toVectorLiteral(embedding) {
  return `[${embedding.join(',')}]`;
}

module.exports = { generateEmbedding, toVectorLiteral };
