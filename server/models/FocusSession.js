const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  durationSeconds: { type: Number, required: true, min: 1 },
  completedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('FocusSession', focusSessionSchema);
