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
  CAREER_PATH: 1,
};

// Document category → evidence genre for the depth-score formula.
const CATEGORY_TO_EVIDENCE_TYPE = {
  Projects: 'PROJECT',
  Skills: 'SKILL',
  Certifications: 'CERTIFICATION',
  Internships: 'INTERNSHIP',
  Achievements: 'ACHIEVEMENT',
  Academics: 'SKILL',
};

const NEXT_TIER_AT = {
  EXPOSURE: 2,
  WORKING_KNOWLEDGE: 5,
  DEMONSTRATED_MASTERY: null,
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
 * Prefer the stronger corroboration signal. A skill extracted from an internship
 * letter should count as INTERNSHIP evidence (3 pts), not a bare SKILL mention (1).
 */
function evidenceTypeFor(category, entityType) {
  const fromCategory = CATEGORY_TO_EVIDENCE_TYPE[category] || null;
  const candidates = [fromCategory, entityType].filter(Boolean);
  if (candidates.length === 0) return 'SKILL';

  return candidates.reduce((best, next) => (
    (EVIDENCE_POINTS[next] ?? 1) > (EVIDENCE_POINTS[best] ?? 1) ? next : best
  ));
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

/**
 * Repair stale evidence genres (e.g. skills from internship docs stored as SKILL)
 * then recompute every affected entity's depth score.
 */
const repairMemo = new Map();

async function repairUserDepthScores(userId) {
  const cached = repairMemo.get(userId);
  if (cached && Date.now() - cached.at < 20_000) {
    return cached.result;
  }

  const links = await prisma.documentEntity.findMany({
    where: { document: { userId } },
    select: {
      id: true,
      entityId: true,
      evidenceType: true,
      document: { select: { category: true } },
      entity: { select: { type: true } },
    },
  });

  let changed = 0;
  for (const link of links) {
    const next = evidenceTypeFor(link.document.category, link.entity.type);
    if (next !== link.evidenceType) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.documentEntity.update({
        where: { id: link.id },
        data: { evidenceType: next },
      });
      changed += 1;
    }
  }

  const all = await prisma.entity.findMany({ where: { userId }, select: { id: true } });
  await Promise.all(all.map((e) => recomputeDepthScore(e.id)));
  const result = { repairedLinks: changed, entities: all.length };
  repairMemo.set(userId, { at: Date.now(), result });
  return result;
}

function depthProgress(score, tier) {
  const nextAt = NEXT_TIER_AT[tier] ?? NEXT_TIER_AT[tierFor(score)];
  const masteryTarget = 5;
  return {
    score: Number(score) || 0,
    tier: tier || tierFor(score),
    nextTierAt: nextAt,
    pointsToNext: nextAt == null ? 0 : Math.max(0, Number((nextAt - score).toFixed(2))),
    masteryPct: Math.min(100, Math.round(((Number(score) || 0) / masteryTarget) * 100)),
    nextPct: nextAt == null
      ? 100
      : Math.min(100, Math.round(((Number(score) || 0) / nextAt) * 100)),
  };
}

// Rule-based, not model-judged — see plan.md Section 6 (Module 2).
// Broader institutional / document signals so typical certs, offer letters,
// and GitHub evidence don't score 0 when issuer formatting varies.
function computeVerifiabilityScore({ issuer, extractedText, sourceChannel }) {
  const text = extractedText || '';
  const who = issuer || '';
  let score = 0;

  if (sourceChannel === 'GITHUB') score += 0.35;
  if (sourceChannel === 'TELEGRAM' || sourceChannel === 'EMAIL') score += 0.1;

  if (who) {
    if (/\.(edu|ac\.[a-z]{2}|org|gov)\b|coursera|udemy|nptel|linkedin|microsoft|google|aws|meta|ibm|oracle|cisco|nvidia|harvard|mit|stanford|iit|nit/i.test(who)) {
      score += 0.45;
    } else if (who.trim().length >= 3) {
      score += 0.2; // named issuer still adds some trust
    }
  }

  if (/(verify|verification|credential id|certificate id|credential url|badge url)\s*[:#]?\s*\S+/i.test(text)) {
    score += 0.25;
  }
  if (/https?:\/\/\S+/i.test(text) || /www\.\S+/i.test(text)) {
    score += 0.15;
  }
  if (/\b(certificate|certification|certified|internship|offer letter|appointment letter|transcript|degree)\b/i.test(text)) {
    score += 0.1;
  }
  if (/\b(20\d{2}|19\d{2})\b/.test(text)) {
    score += 0.05;
  }
  if (/\b(signed|authorized|director|hr manager|professor|registrar)\b/i.test(text)) {
    score += 0.1;
  }
  if (/github\.com\//i.test(text)) {
    score += 0.15;
  }

  return Math.min(1, Number(score.toFixed(2)));
}

module.exports = {
  recomputeDepthScore,
  repairUserDepthScores,
  computeVerifiabilityScore,
  recencyMultiplier,
  tierFor,
  evidenceTypeFor,
  depthProgress,
  EVIDENCE_POINTS,
  NEXT_TIER_AT,
};
