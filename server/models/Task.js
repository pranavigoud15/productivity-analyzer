const mongoose = require('mongoose');
 
const taskSchema = new mongoose.Schema(
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
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Below: all optional, null for manually-created tasks. Only set on
    // tasks auto-generated from a roadmap milestone.
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
    // The _id of the specific milestone subdocument inside
    // Roadmap.milestones this task was generated from. Not a `ref` —
    // milestones live inside Roadmap, not their own collection, so this
    // can't be populated directly. Look it up via
    // roadmap.milestones.id(milestoneId) instead.
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    source: {
      type: String,
      enum: ['manual', 'roadmap-generated'],
      default: 'manual',
    },
  },
  { timestamps: true }
);
 
module.exports = mongoose.model('Task', taskSchema);