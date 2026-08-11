const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // 'A' | 'B' | 'C' | 'D'
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const verificationQuestionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true, trim: true },
    options: { type: [optionSchema], required: true },
    // select: false prevents correctOption and explanation from being included
    // in default queries, guaranteeing they are never leaked to the client
    // during active verification.
    correctOption: { type: String, required: true, select: false },
    selectedOption: { type: String, default: null }, // User's answer, filled upon submission
    isCorrect: { type: Boolean, default: null },     // Evaluated upon submission
    explanation: { type: String, trim: true, default: '', select: false },
  }
);

const taskVerificationAttemptSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questions: {
      type: [verificationQuestionSchema],
      required: true,
      validate: {
        validator: function (val) {
          return val && val.length === 5;
        },
        message: 'A verification attempt must contain exactly 5 questions.',
      },
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TaskVerificationAttempt', taskVerificationAttemptSchema);