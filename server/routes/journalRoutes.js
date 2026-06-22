const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createJournalEntry, getJournalEntries, deleteJournalEntry } = require('../controllers/journalController');
 
router.use(authMiddleware);
 
router.route('/').post(createJournalEntry).get(getJournalEntries);
router.delete('/:id', deleteJournalEntry);
 
module.exports = router;