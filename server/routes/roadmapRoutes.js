const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getRoadmaps,
  getRoadmapByGoal,
  updateMilestoneStatus,
} = require('../controllers/roadmapController');
 
router.use(authMiddleware);
 
router.get('/', getRoadmaps);
router.get('/goal/:goalId', getRoadmapByGoal);
router.patch('/:roadmapId/milestones/:milestoneId/complete', updateMilestoneStatus);
 
module.exports = router;
 