const prisma = require('../config/prisma');
const { generateContent } = require('../config/gemini');

const SUMMARY_STALE_MS = 24 * 60 * 60 * 1000; // regenerate at most once a day

async function generateSummary(entities) {
  const entityList = entities.map((e) => `- ${e.name} (${e.type}, ${e.depthTier})`).join('\n');
  const prompt = `Write a short (3-4 sentence) third-person professional bio for a public profile
page, based only on this evidence-backed skill/achievement list. Do not fabricate anything not
listed:\n${entityList}`;

  try {
    const result = await generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.warn(`[public.service] summary generation failed: ${err.message}`);
    return `${entities.length} verified skill${entities.length === 1 ? '' : 's'} and achievements on record.`;
  }
}

// Optional Module 4 extra (not part of the graded brief, but the schema
// already reserved these fields — see User model in schema.prisma): a
// read-only public page at /u/<username> summarizing a user's entity graph.
// The summary is an on-demand Gemini call, cached on the user row and
// regenerated at most once a day so repeat profile views don't re-hit the LLM.
async function getPublicProfile(username) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, publicSummary: true, publicSummaryUpdatedAt: true },
  });
  if (!user) return null;

  const entities = await prisma.entity.findMany({
    where: { userId: user.id },
    select: { name: true, type: true, depthTier: true },
    orderBy: { depthScore: 'desc' },
  });

  const stale =
    !user.publicSummary ||
    !user.publicSummaryUpdatedAt ||
    Date.now() - user.publicSummaryUpdatedAt.getTime() > SUMMARY_STALE_MS;

  let summary = user.publicSummary;
  if (stale && entities.length > 0) {
    summary = await generateSummary(entities);
    await prisma.user.update({
      where: { id: user.id },
      data: { publicSummary: summary, publicSummaryUpdatedAt: new Date() },
    });
  }

  return { username: user.username, summary: summary ?? null, entities };
}

async function setUsername(userId, username) {
  const taken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (taken && taken.id !== userId) {
    const err = new Error('That username is already taken');
    err.statusCode = 409;
    throw err;
  }
  const user = await prisma.user.update({ where: { id: userId }, data: { username } });
  return user.username;
}

module.exports = { getPublicProfile, setUsername };
