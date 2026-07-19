const cron = require('node-cron');
const prisma = require('../config/prisma');
const { recencyMultiplier, recomputeDepthScore } = require('../services/scoring.service');

// Nightly job: reinforcement/decay for relationship edges and depth-score refresh
// for every entity, per plan.md Section 6 (Module 3, "Temporal weighting").
async function runDecayPass() {
  const relationships = await prisma.relationship.findMany();

  await Promise.all(
    relationships.map((rel) =>
      prisma.relationship.update({
        where: { id: rel.id },
        data: { weight: recencyMultiplier(rel.lastReinforcedAt) },
      })
    )
  );

  const entities = await prisma.entity.findMany({ select: { id: true } });
  await Promise.all(entities.map((e) => recomputeDepthScore(e.id)));

  console.log(`[decayJob] recalculated ${relationships.length} edges and ${entities.length} entities`);
}

function scheduleDecayJob() {
  // Runs once daily at 02:00 server time.
  cron.schedule('0 2 * * *', () => {
    runDecayPass().catch((err) => console.error('[decayJob] failed:', err));
  });
}

module.exports = { scheduleDecayJob, runDecayPass };
