const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { generateNote } = require('../controllers/aiNoteController');

router.use(authMiddleware);

router.post('/generate-note', generateNote);

module.exports = router;