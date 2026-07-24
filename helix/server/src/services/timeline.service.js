const prisma = require('../config/prisma');
const { generateMilestoneNarrative } = require('./narrative.service');

const MONTHS = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
  september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10,
  december: 11, dec: 11,
};

function parseLooseDate(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();

  const iso = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmy = cleaned.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    let year = +dmy[3];
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, +dmy[2] - 1, +dmy[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const monthDayYear = cleaned.match(
    /^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$|^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$|^([A-Za-z]+)\.?\s+(\d{4})$/
  );
  if (monthDayYear) {
    if (monthDayYear[1] && monthDayYear[2] && monthDayYear[3]) {
      const month = MONTHS[monthDayYear[2].toLowerCase()];
      if (month == null) return null;
      const d = new Date(Date.UTC(+monthDayYear[3], month, +monthDayYear[1]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (monthDayYear[4] && monthDayYear[5] && monthDayYear[6]) {
      const month = MONTHS[monthDayYear[4].toLowerCase()];
      if (month == null) return null;
      const d = new Date(Date.UTC(+monthDayYear[6], month, +monthDayYear[5]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (monthDayYear[7] && monthDayYear[8]) {
      const month = MONTHS[monthDayYear[7].toLowerCase()];
      if (month == null) return null;
      const d = new Date(Date.UTC(+monthDayYear[8], month, 1));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }

  const fallback = new Date(cleaned);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Picks the milestone date from certification completion / issue date, or the
 * end of an internship duration window, falling back to classified documentDate
 * then upload time. Brief Module 4: chronology must reflect the journey, not
 * when the file was uploaded.
 */
function inferEventDate(document) {
  if (document.documentDate) return new Date(document.documentDate);

  const text = document.extractedText || '';
  const category = document.category || '';

  const patterns = [
    // Cert completion / issue
    /(?:completed|completion(?:\s+date)?|awarded|issued(?:\s+on)?|dated|date\s*[:\-])\s*[:\-]?\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\.?\s+[0-9]{4}|[A-Za-z]+\.?\s+[0-9]{1,2},?\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|[A-Za-z]+\.?\s+[0-9]{4})/i,
    // Internship / employment end of range: "from … to …" / "Jun 2024 – Aug 2024"
    /(?:from|between)\s+[^\n.]{0,48}?(?:to|until|–|-|—)\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\.?\s+[0-9]{4}|[A-Za-z]+\.?\s+[0-9]{1,2},?\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2}|[A-Za-z]+\.?\s+[0-9]{4})/i,
    /([A-Za-z]+\.?\s+[0-9]{4})\s*(?:to|–|-|—)\s*([A-Za-z]+\.?\s+[0-9]{4})/i,
  ];

  for (const re of patterns) {
    const match = text.match(re);
    if (!match) continue;
    // For "A to B" month ranges, prefer the end date (group 2 when present).
    const raw = match[2] || match[1];
    const parsed = parseLooseDate(raw);
    if (parsed) return parsed;
  }

  // Category-aware last resort: first clear calendar date in the text.
  if (category === 'Certifications' || category === 'Internships' || category === 'Achievements') {
    const anyDate = text.match(
      /\b([0-9]{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)[a-z]*\.?\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})\b/i
    );
    if (anyDate) {
      const parsed = parseLooseDate(anyDate[1]);
      if (parsed) return parsed;
    }
  }

  return new Date(document.createdAt);
}

function isEligibleForTimeline(document) {
  if (document.needsReview) return false;
  if (!document.extractedText?.trim()) return false;
  return true;
}

/**
 * Materializes a TimelineEvent from a document (Module 4). Idempotent per
 * document — returns the existing event if one is already linked.
 */
async function createMilestoneFromDocument(userId, document) {
  const existing = await prisma.timelineEvent.findFirst({
    where: { userId, linkedDocumentId: document.id },
  });
  if (existing) return { event: existing, created: false };

  const eventDate = inferEventDate(document);
  const eventDateIso = eventDate.toISOString().slice(0, 10);

  const narrative = await generateMilestoneNarrative({
    category: document.category,
    extractedText: document.extractedText,
    eventDate: eventDateIso,
  });

  const event = await prisma.timelineEvent.create({
    data: {
      userId,
      eventDate,
      narrative,
      linkedDocumentId: document.id,
    },
  });

  return { event, created: true };
}

/**
 * Auto-builds a journey milestone after successful classification — no user
 * action required (brief Module 4).
 */
async function maybeAutoCreateMilestone(userId, document) {
  if (!isEligibleForTimeline(document)) return null;
  try {
    const { event, created } = await createMilestoneFromDocument(userId, document);
    return created ? event : null;
  } catch (err) {
    console.warn(`[timeline.service] auto-milestone failed for ${document.id}: ${err.message}`);
    return null;
  }
}

/**
 * Backfills milestones for every classified document that is not yet on the
 * timeline. Called when the Journey Timeline is opened so existing uploads
 * (certs, internships, projects) appear by their evidence dates automatically.
 */
async function syncTimelineFromDocuments(userId) {
  const documents = await prisma.document.findMany({
    where: {
      userId,
      needsReview: false,
      NOT: { extractedText: null },
    },
    include: { timelineEvents: { select: { id: true }, take: 1 } },
    orderBy: { createdAt: 'asc' },
  });

  const missing = documents.filter((d) => d.timelineEvents.length === 0 && d.extractedText?.trim());
  let created = 0;

  for (const document of missing) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await createMilestoneFromDocument(userId, document);
      if (result.created) created += 1;
    } catch (err) {
      console.warn(`[timeline.service] sync skipped ${document.id}: ${err.message}`);
    }
  }

  return { scanned: documents.length, created };
}

module.exports = {
  createMilestoneFromDocument,
  maybeAutoCreateMilestone,
  syncTimelineFromDocuments,
  inferEventDate,
};
