const { generationModel } = require('../config/gemini');

// Module 4 (plan.md Section 6): narrative text is presentational only and never
// feeds back into any scoring calculation (see the Depth score formula in
// scoring.service.js, which is deterministic and independent of this output).
// Unlike ai.service.js's classification, there's no schema to validate here —
// the failure mode that matters is the Gemini call itself failing (quota,
// transient error), so the fallback is a plain deterministic sentence rather
// than leaving the milestone without any narrative at all.
async function generateMilestoneNarrative({ category, extractedText, eventDate }) {
  const prompt = `Write a single sentence (max 30 words) describing this milestone for a
personal growth timeline. Category: ${category}. Date: ${eventDate}.
Document excerpt: """${(extractedText || '').slice(0, 500)}"""`;

  try {
    const result = await generationModel.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.warn(`[narrative.service] milestone narrative generation failed: ${err.message}`);
    return `${category} milestone recorded on ${eventDate}.`;
  }
}

const CONTENT_PROMPTS = {
  resumeBullet: (excerpt) =>
    `Write one resume bullet point (max 25 words, action-verb led, quantify impact if possible) from this: """${excerpt}"""`,
  linkedinPost: (excerpt) =>
    `Write a short, professional LinkedIn post (3-4 sentences, first person) announcing this achievement: """${excerpt}"""`,
};

// No safe deterministic fallback exists for on-demand content generation (a
// resume bullet can't be faked) — a failure here is surfaced as a clean,
// catchable error instead of a raw provider error, so the controller can
// return a user-facing "try again" message instead of leaking Gemini's
// internal error text (see documents/timeline controllers).
async function generateReusableContent(kind, excerpt) {
  const promptBuilder = CONTENT_PROMPTS[kind];
  if (!promptBuilder) throw new Error(`Unknown content kind: ${kind}`);

  try {
    const result = await generationModel.generateContent(promptBuilder(excerpt));
    return result.response.text().trim();
  } catch (err) {
    console.warn(`[narrative.service] reusable content generation failed: ${err.message}`);
    throw new Error('Content generation is temporarily unavailable — please try again shortly.');
  }
}

module.exports = { generateMilestoneNarrative, generateReusableContent };
