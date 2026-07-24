const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPublicProfile, setUsername } = require('../services/public.service');

const getProfile = asyncHandler(async (req, res) => {
  const profile = await getPublicProfile(req.params.username);
  if (!profile) throw new ApiError(404, 'Profile not found');
  res.json(profile);
});

const claimUsername = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ApiError(422, 'Validation failed', errors.array());

  try {
    const username = await setUsername(req.userId, req.body.username);
    res.json({ username });
  } catch (err) {
    throw new ApiError(err.statusCode ?? 500, err.message);
  }
});

module.exports = {
  getProfile,
  claimUsername,
  claimUsernameValidators: [
    body('username')
      .isString()
      .trim()
      .isLength({ min: 3, max: 32 })
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Username must be 3-32 characters: lowercase letters, numbers, and hyphens only'),
  ],
};
