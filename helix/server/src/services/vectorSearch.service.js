const prisma = require('../config/prisma');
const { generateEmbedding, toVectorLiteral } = require('./embedding.service');

/**
 * Semantic search over a user's documents using pgvector cosine distance (`<=>`).
 * Raw SQL is required here because Prisma has no native vector query builder
 * (plan.md Section 9). userId is parameterized to prevent SQL injection; the only
 * inline value is the vector literal, which is built from floats we generated
 * ourselves (never from user-controlled text), so it is not an injection vector.
 */
async function searchDocuments(userId, queryText, limit = 5) {
  const embedding = await generateEmbedding(queryText);
  const vectorLiteral = toVectorLiteral(embedding);

  return prisma.$queryRaw`
    SELECT id, category, file_url AS "fileUrl", extracted_text AS "extractedText",
           confidence_score AS "confidenceScore", verifiability_score AS "verifiabilityScore",
           needs_review AS "needsReview",
           1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM documents
    WHERE user_id = ${userId}::uuid AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit};
  `;
}

module.exports = { searchDocuments };
