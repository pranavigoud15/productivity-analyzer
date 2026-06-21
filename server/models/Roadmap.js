const mongoose = require('mongoose');
 
const milestoneSchema = new mongoose.Schema({
  weekNumber: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
  },
  completedAt: {
    type: Date,
    default: null,
  },
  // Future-ready: populated once Auto Task Generation exists. Empty for now.
  tasks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
  ],
  // Future-ready: shape intentionally left open until AI Resource
  // Recommendation exists and we know what Gemini actually returns.
  // Locking in a {title,url,source} structure now would be guessing.
  resources: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  // Future-ready: linked once Auto Mock Tests exists.
  mockTest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MockTest',
    default: null,
  },
});
 
const roadmapSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // One roadmap per goal — enforced at the DB level.
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // 'rule-based' today. 'gemini' / 'groq' once AI generation (with
    // Groq as fallback) replaces the weekly-split algorithm — same
    // milestone shape either way, so nothing downstream needs to change.
    generatedBy: {
      type: String,
      enum: ['rule-based', 'gemini', 'groq'],
      default: 'rule-based',
    },
    // Future-ready: filled in once Gemini/Groq generation is wired up.
    // Stays null under the current rule-based implementation.
    aiMetadata: {
      model: { type: String, default: null },
      generatedAt: { type: Date, default: null },
    },
    milestones: [milestoneSchema],
  },
  { timestamps: true }
);
 
module.exports = mongoose.model('Roadmap', roadmapSchema);