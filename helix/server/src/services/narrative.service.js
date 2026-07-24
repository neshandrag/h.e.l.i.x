const { generateContent } = require('../config/gemini');

// Module 4 (plan.md Section 6): narrative text is presentational only and never
// feeds back into any scoring calculation (see the Depth score formula in
// scoring.service.js, which is deterministic and independent of this output).
async function generateMilestoneNarrative({ category, extractedText, eventDate }) {
  const prompt = `Write a single sentence (max 30 words) for a personal growth timeline milestone.
Category: ${category}. Milestone date: ${eventDate}.
Focus on what was completed (certification completion, internship period/end, project, achievement).
Do not mention uploading or files. Use the date as the event timing.
Document excerpt: """${(extractedText || '').slice(0, 500)}"""`;

  try {
    const result = await generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.warn(`[narrative.service] milestone narrative generation failed: ${err.message}`);
    const label = category || 'Milestone';
    if (category === 'Certifications') return `Completed a certification on ${eventDate}.`;
    if (category === 'Internships') return `Internship completed around ${eventDate}.`;
    if (category === 'Projects') return `Project milestone dated ${eventDate}.`;
    if (category === 'Achievements') return `Achievement recorded on ${eventDate}.`;
    return `${label} recorded on ${eventDate}.`;
  }
}

const CONTENT_PROMPTS = {
  resumeBullet: (excerpt) =>
    `Write one resume bullet point (max 25 words, action-verb led, quantify impact if possible) from this: """${excerpt}"""
Return ONLY the bullet text. No quotes, no markdown, no preamble.`,
  linkedinPost: (excerpt) =>
    `Write a short, professional LinkedIn post (3-4 sentences, first person) announcing this achievement: """${excerpt}"""
Return ONLY the post text. No hashtags overload, no markdown fences.`,
};

function cleanModelText(raw) {
  return String(raw || '')
    .trim()
    .replace(/^```[\w]*\n?|\n?```$/g, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function firstSentence(excerpt) {
  const flat = String(excerpt || '').replace(/\s+/g, ' ').trim();
  if (!flat) return 'this milestone';
  const cut = flat.match(/^(.{20,140}?[.!?])(?:\s|$)/);
  return (cut ? cut[1] : flat.slice(0, 140)).trim();
}

/** Always-available offline drafts so Generate never hard-fails on quota. */
function localReusableContent(kind, excerpt) {
  const focus = firstSentence(excerpt);
  if (kind === 'resumeBullet') {
    return `Delivered ${focus.replace(/^[A-Z]/, (c) => c.toLowerCase())}, strengthening evidence-backed skills for the next career step.`;
  }
  if (kind === 'linkedinPost') {
    return [
      `I'm proud to share a recent milestone in my journey: ${focus}`,
      'This experience deepened my skills and gave me clearer direction for what to build next.',
      "Always happy to connect with others working on similar paths — let's learn from each other.",
    ].join(' ');
  }
  throw new Error(`Unknown content kind: ${kind}`);
}

async function generateReusableContent(kind, excerpt) {
  if (!CONTENT_PROMPTS[kind]) throw new Error(`Unknown content kind: ${kind}`);
  if (!excerpt || !String(excerpt).trim()) {
    throw new Error('This milestone has no narrative yet — open Timeline again after documents finish processing.');
  }

  try {
    const result = await generateContent(CONTENT_PROMPTS[kind](excerpt));
    let text = '';
    try {
      text = cleanModelText(result.response.text());
    } catch (readErr) {
      console.warn(`[narrative.service] could not read model text: ${readErr.message}`);
    }
    if (text) return text;
    console.warn('[narrative.service] empty model output — using local draft');
  } catch (err) {
    console.warn(`[narrative.service] reusable content generation failed: ${err.message}`);
  }

  // Demo-safe fallback: never leave the Generate buttons broken when Gemini
  // is rate-limited or blocked.
  return localReusableContent(kind, excerpt);
}

module.exports = { generateMilestoneNarrative, generateReusableContent };
