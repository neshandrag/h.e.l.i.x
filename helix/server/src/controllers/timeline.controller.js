const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateReusableContent } = require('../services/narrative.service');
const { createMilestoneFromDocument, syncTimelineFromDocuments } = require('../services/timeline.service');

const list = asyncHandler(async (req, res) => {
  // Auto-build journey from classified docs (certs, internships, etc.) so the
  // timeline never depends on a manual "Add to timeline" click.
  await syncTimelineFromDocuments(req.userId);

  const events = await prisma.timelineEvent.findMany({
    where: { userId: req.userId },
    orderBy: { eventDate: 'asc' },
    include: {
      linkedDocument: {
        select: { id: true, category: true, sourceChannel: true, fileUrl: true },
      },
    },
  });
  res.json({
    events: events.map((e) => ({
      id: e.id,
      eventDate: e.eventDate,
      narrative: e.narrative,
      linkedDocumentId: e.linkedDocumentId,
      category: e.linkedDocument?.category ?? null,
      sourceChannel: e.linkedDocument?.sourceChannel ?? null,
      sourceUrl: e.linkedDocument?.fileUrl ?? null,
    })),
  });
});

// Materializes a TimelineEvent from an existing document, generating its
// narrative text via Gemini (Module 4, "Auto-Narrative").
const createFromDocument = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const document = await prisma.document.findFirst({
    where: { id: req.body.documentId, userId: req.userId },
  });
  if (!document) throw new ApiError(404, 'Document not found');

  const { event, created } = await createMilestoneFromDocument(req.userId, document);
  res.status(created ? 201 : 200).json({ event, created });
});

// One-click reusable output generation (Module 4): resume bullet / LinkedIn post.
const generateContent = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const event = await prisma.timelineEvent.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!event) throw new ApiError(404, 'Timeline event not found');

  try {
    const content = await generateReusableContent(req.body.kind, event.narrative);
    res.json({ kind: req.body.kind, content });
  } catch (err) {
    throw new ApiError(503, err.message);
  }
});

module.exports = {
  list,
  createFromDocument,
  generateContent,
  createValidators: [body('documentId').isUUID()],
  generateValidators: [body('kind').isIn(['resumeBullet', 'linkedinPost'])],
};
