const { body, query, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ingestDocument, reclassifyDocument } = require('../services/document.service');
const { importGithubProfile, listGithubRepos } = require('../services/github.service');
const { ingestPortfolioUrl } = require('../services/url.service');
const { createMilestoneFromDocument } = require('../services/timeline.service');
const { computeVerifiabilityScore } = require('../services/scoring.service');
const { normalizeConfidence } = require('../services/ai.service');

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
      documentDate: true,
      confidenceScore: true,
      verifiabilityScore: true,
      needsReview: true,
      sourceChannel: true,
      createdAt: true,
      timelineEvents: { select: { id: true }, take: 1 },
    },
  });

  // Refresh rule-based verifiability + normalize confidence so older rows
  // (strict scorer / 0–100 confidence) display correctly without re-upload.
  const refreshed = await Promise.all(
    documents.map(async (d) => {
      const confidenceScore = normalizeConfidence(d.confidenceScore);
      const verifiabilityScore = d.extractedText
        ? computeVerifiabilityScore({
          issuer: null,
          extractedText: d.extractedText,
          sourceChannel: d.sourceChannel,
        })
        : 0;

      const confidenceChanged = Math.abs((d.confidenceScore ?? 0) - confidenceScore) > 0.001;
      const verifiabilityChanged = Math.abs((d.verifiabilityScore ?? 0) - verifiabilityScore) > 0.001;

      if (confidenceChanged || verifiabilityChanged) {
        await prisma.document.update({
          where: { id: d.id },
          data: { confidenceScore, verifiabilityScore },
        });
      }

      return {
        ...d,
        confidenceScore,
        verifiabilityScore,
      };
    })
  );

  const withPreview = refreshed.map((d) => {
    const { timelineEvents, ...rest } = d;
    return {
      ...rest,
      extractedText: d.extractedText ? d.extractedText.slice(0, 220) : null,
      onTimeline: timelineEvents.length > 0,
    };
  });

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

// Secondary ingestion channel (plan.md Section 6, Module 1): list public
// non-fork repos so the client can let the user pick which ones to import.
const githubRepos = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const result = await listGithubRepos(req.query.username);
  res.json(result);
});

// Imports only the repositories named in `repos` (selected in the Connect UI).
const githubImport = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const result = await importGithubProfile(req.userId, req.body.username, req.body.repos);
  res.status(201).json(result);
});

// Module 1 portfolio links — scrape a public HTML page into the same pipeline.
const urlImport = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const result = await ingestPortfolioUrl(req.userId, req.body.url);
  res.status(201).json(result);
});

// Manual Module 4 hook — add an already-ingested document to the journey timeline.
const addToTimeline = asyncHandler(async (req, res) => {
  const document = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!document) throw new ApiError(404, 'Document not found');

  const { event, created } = await createMilestoneFromDocument(req.userId, document);
  res.status(created ? 201 : 200).json({ event, created });
});

module.exports = {
  upload,
  list,
  getById,
  reclassify,
  githubRepos,
  githubImport,
  urlImport,
  addToTimeline,
  githubReposValidators: [
    query('username').isString().trim().isLength({ min: 1, max: 39 }),
  ],
  githubImportValidators: [
    body('username').isString().trim().isLength({ min: 1, max: 39 }),
    body('repos').isArray({ min: 1, max: 10 }).withMessage('Select 1–10 repositories'),
    body('repos.*').isString().trim().isLength({ min: 1, max: 100 }),
  ],
  urlImportValidators: [body('url').isURL({ require_protocol: true }).withMessage('A valid http(s) URL is required')],
};
