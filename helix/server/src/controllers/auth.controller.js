const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateCode } = require('../utils/telegramLinkCodes');

const SALT_ROUNDS = 12;

function signToken(userId) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const { email, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({ data: { email, passwordHash } });

  res.status(201).json({
    token: signToken(user.id),
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      githubUsername: user.githubUsername,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid email or password');

  res.json({
    token: signToken(user.id),
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      githubUsername: user.githubUsername,
    },
  });
});

// Full account + identity snapshot for the Profile UI.
const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      username: true,
      githubUsername: true,
      telegramChatId: true,
      publicSummary: true,
      publicSummaryUpdatedAt: true,
      createdAt: true,
      _count: {
        select: {
          documents: true,
          entities: true,
          timelineEvents: true,
        },
      },
    },
  });
  if (!user) throw new ApiError(401, 'Session no longer valid — please sign in again');

  const [documentsByCategory, entitiesByType, recentDocuments, topEntities] = await Promise.all([
    prisma.document.groupBy({
      by: ['category'],
      where: { userId: req.userId },
      _count: { _all: true },
    }),
    prisma.entity.groupBy({
      by: ['type'],
      where: { userId: req.userId },
      _count: { _all: true },
    }),
    prisma.document.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, category: true, createdAt: true, sourceChannel: true, needsReview: true },
    }),
    prisma.entity.findMany({
      where: { userId: req.userId },
      orderBy: { depthScore: 'desc' },
      take: 8,
      select: { id: true, name: true, type: true, depthTier: true, depthScore: true },
    }),
  ]);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      githubUsername: user.githubUsername,
      telegramLinked: Boolean(user.telegramChatId),
      publicSummary: user.publicSummary,
      publicSummaryUpdatedAt: user.publicSummaryUpdatedAt,
      createdAt: user.createdAt,
      counts: {
        documents: user._count.documents,
        entities: user._count.entities,
        timelineEvents: user._count.timelineEvents,
      },
      documentsByCategory: documentsByCategory.map((row) => ({
        category: row.category ?? 'Uncategorized',
        count: row._count._all,
      })),
      entitiesByType: entitiesByType.map((row) => ({
        type: row.type,
        count: row._count._all,
      })),
      recentDocuments,
      topEntities,
    },
  });
});

// Generates a short-lived one-time code the user sends to the Helix Telegram
// bot as "/link <code>" to connect that chat as an ingestion channel
// (plan.md Section 6, Module 1; see telegram.service.js and telegramLinkCodes.js).
const telegramLinkCode = asyncHandler(async (req, res) => {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new ApiError(503, 'Telegram ingestion is not configured on this server (missing TELEGRAM_BOT_TOKEN)');
  }

  const code = generateCode(req.userId);
  res.json({ code, expiresInSeconds: 600, instructions: 'In Telegram, message the Helix bot: /link ' + code });
});

module.exports = { register, login, me, telegramLinkCode };
