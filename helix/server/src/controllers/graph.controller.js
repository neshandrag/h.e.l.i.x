const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { computeCoherence } = require('../services/coherence.service');
const { repairUserDepthScores, depthProgress } = require('../services/scoring.service');

// Returns nodes/edges for the React Flow relationship graph (Module 3), including
// each entity's deterministic depth score/tier and each edge's decayed weight.
const getGraph = asyncHandler(async (req, res) => {
  await repairUserDepthScores(req.userId);

  const [entities, relationships] = await Promise.all([
    prisma.entity.findMany({ where: { userId: req.userId } }),
    prisma.relationship.findMany({
      where: { sourceEntity: { userId: req.userId } },
    }),
  ]);

  res.json({
    nodes: entities.map((e) => ({
      id: e.id,
      type: e.type,
      name: e.name,
      depthScore: e.depthScore,
      depthTier: e.depthTier,
      ...depthProgress(e.depthScore, e.depthTier),
    })),
    edges: relationships.map((r) => ({
      id: r.id,
      source: r.sourceEntityId,
      target: r.targetEntityId,
      type: r.type,
      weight: r.weight,
    })),
  });
});

// Gap detection (plan.md Section 6, Module 3): entities with weak or missing
// corroborating evidence, surfaced explicitly rather than left implicit in the graph.
const getGaps = asyncHandler(async (req, res) => {
  await repairUserDepthScores(req.userId);

  const entities = await prisma.entity.findMany({
    where: { userId: req.userId, depthTier: 'EXPOSURE' },
    select: {
      id: true,
      name: true,
      type: true,
      depthScore: true,
      depthTier: true,
      _count: { select: { documentEntities: true } },
    },
    orderBy: { depthScore: 'asc' },
  });

  res.json({
    gaps: entities.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      depthScore: e.depthScore,
      depthTier: e.depthTier,
      evidenceCount: e._count.documentEntities,
      ...depthProgress(e.depthScore, e.depthTier),
    })),
  });
});

// Coherence scoring (plan.md Section 6, Module 3): qualitative LLM assessment
// of whether the user's documented path forms a consistent progression,
// kept explicitly separate from the deterministic depth score above.
const getCoherence = asyncHandler(async (req, res) => {
  const coherence = await computeCoherence(req.userId);
  res.json(coherence);
});

module.exports = { getGraph, getGaps, getCoherence };
