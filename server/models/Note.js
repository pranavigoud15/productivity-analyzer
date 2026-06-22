const mongoose = require('mongoose');
 
const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    // Future-ready: open slot for AI Insights (tag suggestions,
    // summarization). Shape intentionally left open until that feature
    // exists.
    aiInsights: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);
 
module.exports = mongoose.model('Note', noteSchema);