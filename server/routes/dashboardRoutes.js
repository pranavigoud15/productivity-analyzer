const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const {
  getDashboard,
  getDashboardSummary,
} = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", authMiddleware, getDashboard);
router.get("/summary", authMiddleware, getDashboardSummary);

module.exports = router;