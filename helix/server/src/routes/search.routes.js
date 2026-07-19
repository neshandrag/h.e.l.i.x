const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { search, ask, searchValidators, askValidators } = require('../controllers/search.controller');

const router = Router();

router.use(requireAuth);
router.post('/', searchValidators, search);
router.post('/ask', askValidators, ask);

module.exports = router;
