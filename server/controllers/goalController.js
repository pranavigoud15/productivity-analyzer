const Goal     = require('../models/Goal');
const Roadmap  = require('../models/Roadmap');
const Task     = require('../models/Task');
const automation = require('../automation/automationService');

// @desc   Create a goal. Fires onGoalCreated automation event which
//         generates the roadmap and all milestone tasks automatically.
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
      user:        req.user.id,
      title:       title.trim(),
      description: description?.trim() || '',
      targetDate,
    });

    // Fire and forget — goal creation must succeed even if automation fails.
    automation.onGoalCreated(goal).catch(err =>
      console.error('[Automation] onGoalCreated error — goalId=', goal._id, err)
    );

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

// @desc   Update a goal's title, description, or targetDate.
//         Does NOT accept `status` or `progress` — both are automation-
//         only fields now. `progress` is written exclusively by
//         roadmapAutomation.cascadeToGoal as part of the Task → Milestone
//         → Roadmap → Goal cascade; `status`/`completedAt` transition
//         only inside that same cascade. Neither is settable here.
// @route  PATCH /api/goals/:id
exports.updateGoal = async (req, res) => {
  try {
    const { title, description, targetDate } = req.body;
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
    if (targetDate   !== undefined) goal.targetDate  = targetDate;

    await goal.save();
    res.status(200).json(goal);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update goal' });
  }
};

// @desc   Manual goal completion is disabled. Goals are completed
//         exclusively through the automation cascade — when all roadmap
//         milestones reach 'completed', roadmapAutomation.cascadeToGoal
//         sets status/progress/completedAt automatically. This route is
//         kept (rather than removed) so existing clients get a clear
//         403 instead of a 404, but it performs no mutation.
// @route  PATCH /api/goals/:id/complete
exports.completeGoal = async (req, res) => {
  return res.status(403).json({
    message: 'Goal completion is automatic once all roadmap milestones are met.',
  });
};

// @desc   Delete a goal, its linked roadmap, and all roadmap-generated
//         tasks. Manual tasks are never touched.
// @route  DELETE /api/goals/:id
exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    await Roadmap.findOneAndDelete({ goal: goal._id, user: req.user.id });
    await Task.deleteMany({ goal: goal._id, user: req.user.id });

    res.status(200).json({ message: 'Goal deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete goal' });
  }
};