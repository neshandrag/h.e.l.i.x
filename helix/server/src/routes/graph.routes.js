const { Router } = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { getGraph, getGaps, getCoherence } = require('../controllers/graph.controller');

const router = Router();

router.use(requireAuth);
router.get('/', getGraph);
router.get('/gaps', getGaps);
router.get('/coherence', getCoherence);

module.exports = router;
