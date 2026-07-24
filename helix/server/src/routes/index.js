const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/documents', require('./documents.routes'));
router.use('/search', require('./search.routes'));
router.use('/graph', require('./graph.routes'));
router.use('/timeline', require('./timeline.routes'));
router.use('/public', require('./public.routes'));

router.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = router;
