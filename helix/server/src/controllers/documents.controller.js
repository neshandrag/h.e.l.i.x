const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ingestDocument, reclassifyDocument } = require('../services/document.service');
const { importGithubProfile } = require('../services/github.service');

const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded (expected multipart field "file")');

  const document = await ingestDocument({
    userId: req.userId,
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
  });

  res.status(201).json({ document });
});

const list = asyncHandler(async (req, res) => {
  const documents = await prisma.document.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileUrl: true,
      extractedText: true,
      category: true,
      confidenceScore: true,
      verifiabilityScore: true,
      needsReview: true,
      sourceChannel: true,
      createdAt: true,
    },
  });

  // Preview only — full text is available via GET /documents/:id if ever needed.
  const withPreview = documents.map((d) => ({
    ...d,
    extractedText: d.extractedText ? d.extractedText.slice(0, 200) : null,
  }));

  res.json({ documents: withPreview });
});

const getById = asyncHandler(async (req, res) => {
  const document = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { documentEntities: { include: { entity: true } } },
  });

  if (!document) throw new ApiError(404, 'Document not found');

  res.json({ document });
});

// Retries classification for a document stuck at needsReview (most commonly
// a transient Gemini failure or free-tier quota exhaustion — see
// document.service.js). Never requires re-uploading the original file.
const reclassify = asyncHandler(async (req, res) => {
  try {
    const document = await reclassifyDocument(req.userId, req.params.id);
    res.json({ document });
  } catch (err) {
    if (err.message === 'Document not found') throw new ApiError(404, err.message);
    throw new ApiError(422, err.message);
  }
});

// Secondary ingestion channel (plan.md Section 6, Module 1): imports a user's
// public GitHub repositories as evidence documents. Works unauthenticated
// against GitHub's public API (60 req/hr); GITHUB_TOKEN (see env.js,
// github.service.js) is optional and only raises that ceiling to 5000/hr.
const githubImport = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const result = await importGithubProfile(req.userId, req.body.username);
  res.status(201).json(result);
});

module.exports = {
  upload,
  list,
  getById,
  reclassify,
  githubImport,
  githubImportValidators: [body('username').isString().trim().isLength({ min: 1, max: 39 })],
};
