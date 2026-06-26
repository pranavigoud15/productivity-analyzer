const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  seedMockTests,
  getMockTests,
  getMockTestById,
  submitMockTest,
  getUserAttempts,
  getAttemptById,
  getMockTestStats,
} = require('../controllers/mockTestController');

router.use(authMiddleware);

// Seed (dev only — remove or guard with admin middleware in production)
router.post('/seed', seedMockTests);

// Tests
router.get('/', getMockTests);
router.get('/attempts', getUserAttempts);
router.get('/attempts/:attemptId', getAttemptById);
router.get('/:id', getMockTestById);
router.get('/:id/stats', getMockTestStats);
router.post('/:id/submit', submitMockTest);

module.exports = router;