const prisma = require('../config/prisma');

// Directed edge inference rules (plan.md, Section 6, Module 3: "Certification →
// Skill, Skill → Project, Project → Internship"). When two entity types below
// co-occur as evidence on the same document, a typed edge is created/reinforced
// between them. Order matters: [fromType, toType, edgeType].
// Brief Module 3: Certification → Skill → Project → Internship → Career Path.
const EDGE_RULES = [
  ['CERTIFICATION', 'SKILL', 'CERTIFIES'],
  ['SKILL', 'PROJECT', 'APPLIES_TO'],
  ['SKILL', 'INTERNSHIP', 'APPLIES_TO'],
  ['PROJECT', 'INTERNSHIP', 'LED_TO'],
  ['INTERNSHIP', 'ACHIEVEMENT', 'LED_TO'],
  ['INTERNSHIP', 'CAREER_PATH', 'LED_TO'],
  ['PROJECT', 'CAREER_PATH', 'LED_TO'],
  ['ACHIEVEMENT', 'CAREER_PATH', 'LED_TO'],
];

const WEIGHT_INCREMENT = 0.25;
const MAX_WEIGHT = 2.0;

// Reinforces an existing edge (more corroborating evidence = stronger tie) or
// creates it at base weight — the "increases with new evidence" half of the
// temporal weighting model (decayJob.js handles the decay half).
async function upsertEdge(sourceEntityId, targetEntityId, type) {
  const existing = await prisma.relationship.findUnique({
    where: { sourceEntityId_targetEntityId_type: { sourceEntityId, targetEntityId, type } },
  });

  if (existing) {
    return prisma.relationship.update({
      where: { id: existing.id },
      data: {
        weight: Math.min(MAX_WEIGHT, existing.weight + WEIGHT_INCREMENT),
        lastReinforcedAt: new Date(),
      },
    });
  }

  return prisma.relationship.create({
    data: { sourceEntityId, targetEntityId, type, weight: 1.0 },
  });
}

/**
 * Builds/reinforces relationship edges between the entities a single document
 * provided evidence for. Called after linkEntities() in document.service.js
 * so newly upserted entities (and any pre-existing ones the same skill matched
 * against) are all resolved to ids first.
 */
async function buildRelationships(entityRecords) {
  for (const [fromType, toType, edgeType] of EDGE_RULES) {
    const sources = entityRecords.filter((e) => e.type === fromType);
    const targets = entityRecords.filter((e) => e.type === toType);

    for (const source of sources) {
      for (const target of targets) {
        if (source.id === target.id) continue;
        // eslint-disable-next-line no-await-in-loop
        await upsertEdge(source.id, target.id, edgeType);
      }
    }
  }
}

module.exports = { buildRelationships };
