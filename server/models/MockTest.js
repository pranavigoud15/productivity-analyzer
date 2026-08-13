const mongoose = require('mongoose');

// A single option inside a question.
const optionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // 'A' | 'B' | 'C' | 'D'
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// A single question inside a mock test.
const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true, trim: true },
    options: { type: [optionSchema], required: true },
    correctOption: { type: String, required: true }, // 'A' | 'B' | 'C' | 'D'
    explanation: { type: String, trim: true, default: '' },
    // Future-ready: AI difficulty rating, topic tags, bloom's taxonomy level.
    aiMetadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: true }
);

const mockTestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
    },
    durationMinutes: { type: Number, required: true, min: 1 },
    questions: { type: [questionSchema], required: true },
    isPublished: { type: Boolean, default: true },
    // Minimum percentage (0-100) a user must score on an attempt for
    // automatic Practice Task Verification to mark the linked task
    // complete. Checked in automation/mockAutomation.js against
    // MockTestAttempt.percentage. Defaults to 60 for existing/seeded
    // tests that predate this field.
    passingPercentage: { type: Number, default: 60, min: 0, max: 100 },
    // Future-ready: AI generation provenance, leaderboard eligibility.
    aiMetadata: { type: mongoose.Schema.Types.Mixed, default: null },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      default: null,
    },
    roadmap: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Roadmap',
      default: null,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    source: {
      type: String,
      default: 'seed',
    },
    generationStatus: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'completed',
    },
    generationError: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Virtual — keeps totalQuestions always accurate without storing it.
mockTestSchema.virtual('totalQuestions').get(function () {
  return this.questions ? this.questions.length : 0;
})

mockTestSchema.set('toJSON', { virtuals: true });
mockTestSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MockTest', mockTestSchema);