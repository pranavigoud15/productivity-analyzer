const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {
  createGoal,
  getGoals,
  updateGoal,
  completeGoal,
  deleteGoal,
} = require('../controllers/goalController');

router.use(authMiddleware);

router.route('/').post(createGoal).get(getGoals);
router.route('/:id').patch(updateGoal).delete(deleteGoal);
router.patch('/:id/complete', completeGoal);

module.exports = router;