const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const { getAnalytics, getUserSummary } = require('../controllers/adminController');
router.use(auth, admin);
router.get('/analytics', getAnalytics);
router.get('/users/:id', getUserSummary);
module.exports = router;
