const mongoose = require('mongoose');

// Stores the user's answer for each question alongside the correct answer
// so results can be reconstructed without joining back to the test.
const questionResultSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    questionText: { type: String, required: true },
    options: { type: mongoose.Schema.Types.Mixed, required: true }, // [{label,text}]
    correctOption: { type: String, required: true },
    selectedOption: { type: String, default: null }, // null = unanswered
    isCorrect: { type: Boolean, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const mockTestAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mockTest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MockTest',
      required: true,
    },
    // Denormalised for Insights / Leaderboard / AI without joins.
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, required: true },
    title: { type: String, required: true },

    // Score fields.
    score: { type: Number, required: true },          // raw correct count
    totalQuestions: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    incorrectCount: { type: Number, required: true },
    unansweredCount: { type: Number, required: true },
    percentage: { type: Number, required: true },     // 0-100, rounded to 2dp

    // Timing.
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
    timeTakenSeconds: { type: Number, required: true },

    // Per-question breakdown — full detail for results page and AI analysis.
    questionResults: { type: [questionResultSchema], required: true },

    // Future-ready: AI insights, weakness tags, roadmap suggestions.
    aiInsights: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// Index for fast per-user history queries and leaderboard aggregations.
mockTestAttemptSchema.index({ user: 1, mockTest: 1 });
mockTestAttemptSchema.index({ user: 1, subject: 1 });
mockTestAttemptSchema.index({ percentage: -1 }); // leaderboard-ready

module.exports = mongoose.model('MockTestAttempt', mockTestAttemptSchema);