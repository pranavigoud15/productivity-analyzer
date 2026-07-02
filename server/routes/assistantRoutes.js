const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/assistantController");
const authMiddleware = require("../middleware/authMiddleware");

// Auth applied at router level — consistent with all other route files
router.use(authMiddleware);

router.post("/chat", chat);

module.exports = router;