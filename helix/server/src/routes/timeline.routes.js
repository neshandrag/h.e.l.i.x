const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  list,
  createFromDocument,
  generateContent,
  createValidators,
  generateValidators,
} = require('../controllers/timeline.controller');

const router = Router();

router.use(requireAuth);
router.get('/', list);
router.post('/', createValidators, createFromDocument);
router.post('/:id/generate', generateValidators, generateContent);

module.exports = router;
