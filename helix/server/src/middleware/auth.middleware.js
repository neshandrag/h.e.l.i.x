const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// A validly-signed JWT can still reference a user that no longer exists (e.g.
// the dev database was reset while a browser session held an old token) —
// without this check, the first write hits a raw foreign-key constraint error
// deep in Prisma instead of a clean 401 telling the client to re-authenticate.
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length);

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true } });
  if (!user) {
    throw new ApiError(401, 'Session no longer valid — please sign in again');
  }

  req.userId = payload.sub;
  next();
});

module.exports = { requireAuth };
