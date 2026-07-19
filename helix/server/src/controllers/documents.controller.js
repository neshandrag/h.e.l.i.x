const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ingestDocument } = require('../services/document.service');

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
      category: true,
      confidenceScore: true,
      verifiabilityScore: true,
      needsReview: true,
      sourceChannel: true,
      createdAt: true,
    },
  });

  res.json({ documents });
});

const getById = asyncHandler(async (req, res) => {
  const document = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { documentEntities: { include: { entity: true } } },
  });

  if (!document) throw new ApiError(404, 'Document not found');

  res.json({ document });
});

module.exports = { upload, list, getById };
