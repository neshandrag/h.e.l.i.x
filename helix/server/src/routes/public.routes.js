const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { getProfile, claimUsername, claimUsernameValidators } = require('../controllers/public.controller');

const router = Router();

// Claiming a username requires auth; viewing a profile is intentionally public
// (that's the point — a shareable link with no login wall).
router.post('/username', requireAuth, claimUsernameValidators, claimUsername);
router.get('/:username', getProfile);

module.exports = router;
