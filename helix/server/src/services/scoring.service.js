const prisma = require('../config/prisma');

// Fixed, published formula — see plan.md Section 6 (Module 3) and Section 11.
// The LLM only ever supplies *which* document is evidence for *which* entity
// (a factual extraction, see ai.service.js); everything below is plain arithmetic
// over that evidence, so the score is reproducible and auditable, not a model guess.
const EVIDENCE_POINTS = {
  CERTIFICATION: 1,
  PROJECT: 2,
  INTERNSHIP: 3,
  SKILL: 1,
  ACHIEVEMENT: 1,
};

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30;

function recencyMultiplier(evidenceDate) {
  const ageInMonths = (Date.now() - new Date(evidenceDate).getTime()) / MS_PER_MONTH;
  if (ageInMonths < 12) return 1.0;
  if (ageInMonths < 24) return 0.5;
  return 0.25;
}

function tierFor(score) {
  if (score >= 5) return 'DEMONSTRATED_MASTERY';
  if (score >= 2) return 'WORKING_KNOWLEDGE';
  return 'EXPOSURE';
}

/**
 * Recomputes depth_score and depth_tier for a single entity from its linked
 * document_entities evidence rows, and persists the result.
 */
async function recomputeDepthScore(entityId) {
  const evidence = await prisma.documentEntity.findMany({ where: { entityId } });

  const score = evidence.reduce((total, row) => {
    const points = EVIDENCE_POINTS[row.evidenceType] ?? 1;
    return total + points * recencyMultiplier(row.evidenceDate);
  }, 0);

  const depthTier = tierFor(score);

  return prisma.entity.update({
    where: { id: entityId },
    data: { depthScore: score, depthTier },
  });
}

// Rule-based, not model-judged — see plan.md Section 6 (Module 2).
// Checks for an institutional issuer domain and a verification link/QR reference
// in the extracted text; both are simple deterministic signals, not an AI opinion.
function computeVerifiabilityScore({ issuer, extractedText }) {
  let score = 0;
  if (issuer && /\.(edu|ac\.[a-z]{2}|org|gov)$|coursera|udemy|nptel|linkedin|microsoft|google|aws/i.test(issuer)) {
    score += 0.5;
  }
  if (extractedText && /(verify|verification|credential id|certificate id)\s*[:#]?\s*\S+/i.test(extractedText)) {
    score += 0.3;
  }
  if (extractedText && /https?:\/\/\S+/i.test(extractedText)) {
    score += 0.2;
  }
  return Math.min(1, score);
}

module.exports = { recomputeDepthScore, computeVerifiabilityScore, recencyMultiplier, tierFor };
