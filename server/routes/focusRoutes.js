const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { recordCompletedSession } = require('../controllers/focusController');
router.use(auth);
router.post('/sessions', recordCompletedSession);
module.exports = router;
