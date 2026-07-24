const { Router } = require('express');
const { body } = require('express-validator');
const { register, login, me, telegramLinkCode } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

const credentialValidators = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

router.post('/register', credentialValidators, register);
router.post('/login', credentialValidators, login);
router.get('/me', requireAuth, me);
router.post('/telegram/link-code', requireAuth, telegramLinkCode);

module.exports = router;
