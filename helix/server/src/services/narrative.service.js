const { generationModel } = require('../config/gemini');

// Module 4 (plan.md Section 6): narrative text is presentational only and never
// feeds back into any scoring calculation (see the Depth score formula in
// scoring.service.js, which is deterministic and independent of this output).
async function generateMilestoneNarrative({ category, extractedText, eventDate }) {
  const prompt = `Write a single sentence (max 30 words) describing this milestone for a
personal growth timeline. Category: ${category}. Date: ${eventDate}.
Document excerpt: """${(extractedText || '').slice(0, 500)}"""`;

  const result = await generationModel.generateContent(prompt);
  return result.response.text().trim();
}

const CONTENT_PROMPTS = {
  resumeBullet: (excerpt) =>
    `Write one resume bullet point (max 25 words, action-verb led, quantify impact if possible) from this: """${excerpt}"""`,
  linkedinPost: (excerpt) =>
    `Write a short, professional LinkedIn post (3-4 sentences, first person) announcing this achievement: """${excerpt}"""`,
};

async function generateReusableContent(kind, excerpt) {
  const promptBuilder = CONTENT_PROMPTS[kind];
  if (!promptBuilder) throw new Error(`Unknown content kind: ${kind}`);

  const result = await generationModel.generateContent(promptBuilder(excerpt));
  return result.response.text().trim();
}

module.exports = { generateMilestoneNarrative, generateReusableContent };
