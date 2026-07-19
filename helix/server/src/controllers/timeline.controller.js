const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateMilestoneNarrative, generateReusableContent } = require('../services/narrative.service');

const list = asyncHandler(async (req, res) => {
  const events = await prisma.timelineEvent.findMany({
    where: { userId: req.userId },
    orderBy: { eventDate: 'asc' },
  });
  res.json({ events });
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

  const narrative = await generateMilestoneNarrative({
    category: document.category,
    extractedText: document.extractedText,
    eventDate: document.createdAt.toISOString().slice(0, 10),
  });

  const event = await prisma.timelineEvent.create({
    data: {
      userId: req.userId,
      eventDate: document.createdAt,
      narrative,
      linkedDocumentId: document.id,
    },
  });

  res.status(201).json({ event });
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
    res.json({ content });
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
