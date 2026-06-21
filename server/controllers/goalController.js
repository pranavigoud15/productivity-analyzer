const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const Task = require('../models/Task');
const { generateRoadmapForGoal } = require('./roadmapController');
 
// @desc   Create a goal. Automatically generates a weekly roadmap
//         immediately after the goal is created.
// @route  POST /api/goals
exports.createGoal = async (req, res) => {
  try {
    const { title, description, targetDate } = req.body;
 
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!targetDate) {
      return res.status(400).json({ message: 'Target date is required' });
    }
 
    const goal = await Goal.create({
      user: req.user.id,
      title: title.trim(),
      description: description?.trim() || '',
      targetDate,
    });
 
    // Roadmap generation is a side effect, not a precondition — if it
    // fails for any reason, the goal itself must still be created
    // successfully. Log and continue rather than failing the request.
    try {
      await generateRoadmapForGoal(goal);
    } catch (roadmapErr) {
      console.error('Roadmap generation failed for goal', goal._id, roadmapErr);
    }
 
    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create goal' });
  }
};
 
// @desc   Get all goals for the logged-in user
// @route  GET /api/goals
exports.getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(goals);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch goals' });
  }
};
 
// @desc   Update a goal's title, description, targetDate, or progress.
//         Does NOT accept `status` — completion is handled exclusively
//         by completeGoal below.
// @route  PATCH /api/goals/:id
exports.updateGoal = async (req, res) => {
  try {
    const { title, description, targetDate, progress } = req.body;
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });
 
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
 
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ message: 'Title cannot be empty' });
      }
      goal.title = title.trim();
    }
    if (description !== undefined) goal.description = description.trim();
    if (targetDate !== undefined) goal.targetDate = targetDate;
    if (progress !== undefined) {
      const clamped = Math.min(100, Math.max(0, Number(progress)));
      if (Number.isNaN(clamped)) {
        return res.status(400).json({ message: 'Progress must be a number' });
      }
      goal.progress = clamped;
    }
 
    await goal.save();
    res.status(200).json(goal);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update goal' });
  }
};
 
// @desc   Mark a goal complete. Sets status, progress to 100, and
//         completedAt — the single place this transition happens.
// @route  PATCH /api/goals/:id/complete
exports.completeGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });
 
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
 
    goal.status = 'completed';
    goal.progress = 100;
    goal.completedAt = new Date();
 
    await goal.save();
    res.status(200).json(goal);
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark goal complete' });
  }
};
 
// @desc   Delete a goal, its linked roadmap, and any tasks auto-generated
//         from that roadmap's milestones.
// @route  DELETE /api/goals/:id
exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user.id });
 
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
 
    await Roadmap.findOneAndDelete({ goal: goal._id, user: req.user.id });
    // Manual tasks never have `goal` set, so this only ever removes
    // roadmap-generated tasks — manually created tasks are untouched.
    await Task.deleteMany({ goal: goal._id, user: req.user.id });
 
    res.status(200).json({ message: 'Goal deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete goal' });
  }
};
