const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const taskRoutes = require("./routes/taskRoutes");
const goalRoutes = require("./routes/goalRoutes");
const roadmapRoutes = require("./routes/roadmapRoutes");
const journalRoutes = require("./routes/journalRoutes");
const noteRoutes = require("./routes/noteRoutes");
const mockTestRoutes = require("./routes/mockTestRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const insightsRoutes = require('./routes/insightsRoutes');
const assistantRoutes = require("./routes/assistantRoutes");
const adminRoutes = require('./routes/adminRoutes');
const focusRoutes = require('./routes/focusRoutes');



const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const defaultOrigins = isProduction
  ? 'https://productivity-analyzer-two.vercel.app'
  : 'http://localhost:5173,http://127.0.0.1:5173';
const allowedOrigins = (process.env.CLIENT_URL || defaultOrigins)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/roadmaps", roadmapRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/mock-tests", mockTestRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use('/api/insights', insightsRoutes);
app.use("/api/assistant", assistantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/focus', focusRoutes);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.log("❌ MongoDB Error:", err.message);
  });

// Test Route
app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
