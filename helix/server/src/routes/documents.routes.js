const { Router } = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth.middleware');
const { upload, list, getById } = require('../controllers/documents.controller');

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]);

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
    return cb(null, true);
  },
});

const router = Router();

router.use(requireAuth);
router.post('/', multerUpload.single('file'), upload);
router.get('/', list);
router.get('/:id', getById);

module.exports = router;
