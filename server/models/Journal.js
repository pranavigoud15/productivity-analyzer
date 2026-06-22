const mongoose = require('mongoose');
 
const MOODS = ['great', 'good', 'okay', 'low', 'stressed'];
 
const journalSchema = new mongoose.Schema(
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
      required: true,
      trim: true,
    },
    mood: {
      type: String,
      enum: MOODS,
      default: 'okay',
    },
    studyHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    // The calendar date this entry is FOR — distinct from createdAt (when
    // the record was inserted). User-settable for back-filling a
    // previous day. Journal streak is computed from this field, not
    // createdAt.
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Future-ready: open slot for whatever AI Insights eventually
    // computes (sentiment, keywords, summary). Shape intentionally left
    // open until that feature exists.
    aiInsights: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);
 
const Journal = mongoose.model('Journal', journalSchema);
Journal.MOODS = MOODS;
 
module.exports = Journal;