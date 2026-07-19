const prisma = require('../config/prisma');
const { generationModel } = require('../config/gemini');
const { searchDocuments } = require('./vectorSearch.service');

const ADVISORY_PROMPT = (question, evidenceSummary, entitySummary) => `You are Helix, an AI digital identity assistant. Answer the user's question
using ONLY the evidence provided below. Be concrete: cite what evidence exists,
name specific gaps, and never fabricate documents that are not listed.

Question: "${question}"

Retrieved evidence (top matching documents):
${evidenceSummary || '(no matching documents found)'}

Skill/entity graph (name, depth tier, depth score):
${entitySummary || '(no entities recorded yet)'}

Respond in 3-5 sentences: state what evidence supports readiness, then state
the concrete gap(s), if any.`;

/**
 * GraphRAG advisory retrieval (plan.md Section 6, Module 5): combines pgvector
 * similarity search with the deterministic depth-score graph, and asks Gemini
 * to reason over both rather than returning a plain document list.
 */
async function answerAdvisoryQuery(userId, question) {
  const [documents, entities] = await Promise.all([
    searchDocuments(userId, question, 8),
    prisma.entity.findMany({ where: { userId }, select: { name: true, type: true, depthTier: true, depthScore: true } }),
  ]);

  const evidenceSummary = documents
    .map((d) => `- [${d.category}] similarity=${Number(d.similarity).toFixed(2)}: ${(d.extractedText || '').slice(0, 200)}`)
    .join('\n');

  const entitySummary = entities
    .map((e) => `- ${e.name} (${e.type}): ${e.depthTier}, score=${e.depthScore.toFixed(1)}`)
    .join('\n');

  const result = await generationModel.generateContent(ADVISORY_PROMPT(question, evidenceSummary, entitySummary));

  return {
    answer: result.response.text(),
    supportingDocuments: documents,
    supportingEntities: entities,
  };
}

module.exports = { answerAdvisoryQuery };
