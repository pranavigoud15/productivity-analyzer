const Roadmap    = require('../models/Roadmap');
const automation = require('../automation/automationService');
const {
  computeRoadmapProgress,
  cascadeToGoal,
} = require('../automation/roadmapAutomation');

// @desc   Get all roadmaps for the logged-in user
// @route  GET /api/roadmaps
exports.getRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(roadmaps);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch roadmaps' });
  }
};

// @desc   Get the roadmap linked to a specific goal
// @route  GET /api/roadmaps/goal/:goalId
exports.getRoadmapByGoal = async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({
      goal: req.params.goalId,
      user: req.user.id,
    });

    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found for this goal' });
    }

    res.status(200).json(roadmap);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch roadmap' });
  }
};

// @desc   Manually toggle a milestone between pending and completed.
//         Fires onMilestoneToggled automation event which keeps the
//         linked task in sync and cascades roadmap → goal progress.
// @route  PATCH /api/roadmaps/:roadmapId/milestones/:milestoneId/complete
exports.updateMilestoneStatus = async (req, res) => {
  try {
    const { roadmapId, milestoneId } = req.params;

    const roadmap = await Roadmap.findOne({ _id: roadmapId, user: req.user.id });
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found' });
    }

    const milestone = roadmap.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    // Toggle status
    const newStatus       = milestone.status === 'completed' ? 'pending' : 'completed';
    milestone.status      = newStatus;
    milestone.completedAt = newStatus === 'completed' ? new Date() : null;

    // Recompute roadmap progress synchronously so the response
    // reflects the new state immediately.
    roadmap.progress = computeRoadmapProgress(roadmap);
    await roadmap.save();

    // Cascade to goal synchronously as well — the client's Roadmap
    // page reads goal progress and we want it consistent on refresh.
    await cascadeToGoal(roadmap);

    // Fire automation event to keep linked task in sync.
    // Fire and forget — response is already correct above.
    automation.onMilestoneToggled(roadmapId, milestoneId, newStatus).catch(err =>
      console.error('[Automation] onMilestoneToggled error — milestoneId=', milestoneId, err)
    );

    res.status(200).json(roadmap);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update milestone' });
  }
};