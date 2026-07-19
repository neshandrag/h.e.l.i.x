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

// The reasoning call (generateContent) is the one step here without a cheap,
// deterministic fallback — unlike ai.service.js's classification, there's no
// safe default "answer" to guess. If it fails (transient error, quota — see
// docs/THOUGHT_PROCESS.md), the retrieval half (vector search + graph query)
// already succeeded and is real, useful data on its own, so it's still
// returned rather than failing the whole request over the LLM step alone.
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

  let answer;
  try {
    const result = await generationModel.generateContent(ADVISORY_PROMPT(question, evidenceSummary, entitySummary));
    answer = result.response.text();
  } catch (err) {
    console.warn(`[retrieval.service] advisory reasoning failed: ${err.message}`);
    answer =
      documents.length > 0 || entities.length > 0
        ? "I couldn't generate a reasoned answer right now (the AI service is temporarily unavailable), but here's the matching evidence I found — see below."
        : "I couldn't generate a reasoned answer right now (the AI service is temporarily unavailable), and no matching evidence was found either.";
  }

  return {
    answer,
    supportingDocuments: documents,
    supportingEntities: entities,
  };
}

module.exports = { answerAdvisoryQuery };
