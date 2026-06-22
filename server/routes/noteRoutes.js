const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createNote, getNotes, updateNote, deleteNote } = require('../controllers/noteController');
 
router.use(authMiddleware);
 
router.route('/').post(createNote).get(getNotes);
router.route('/:id').patch(updateNote).delete(deleteNote);
 
module.exports = router;