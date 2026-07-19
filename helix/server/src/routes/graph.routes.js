const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { getGraph, getGaps } = require('../controllers/graph.controller');

const router = Router();

router.use(requireAuth);
router.get('/', getGraph);
router.get('/gaps', getGaps);

module.exports = router;
