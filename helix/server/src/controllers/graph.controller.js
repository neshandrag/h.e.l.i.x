const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

// Returns nodes/edges for the React Flow relationship graph (Module 3), including
// each entity's deterministic depth score/tier and each edge's decayed weight.
const getGraph = asyncHandler(async (req, res) => {
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
  const entities = await prisma.entity.findMany({
    where: { userId: req.userId, depthTier: 'EXPOSURE' },
    select: { id: true, name: true, type: true, depthScore: true },
  });

  res.json({ gaps: entities });
});

module.exports = { getGraph, getGaps };
