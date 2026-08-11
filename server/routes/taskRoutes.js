const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {
  createTask,
  getTasks,
  updateTask,
  completeTask,
  deleteTask,
} = require('../controllers/taskController');

const {
  startVerification,
  submitVerification,
} = require('../controllers/verificationController');

router.use(authMiddleware);

router.route('/').post(createTask).get(getTasks);
router.route('/:id').patch(updateTask).delete(deleteTask);
router.patch('/:id/complete', completeTask);

router.post('/:id/verify/start', startVerification);
router.post('/:id/verify/submit', submitVerification);

module.exports = router;