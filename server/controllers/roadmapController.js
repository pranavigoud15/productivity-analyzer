const Roadmap = require('../models/Roadmap');
const Task = require('../models/Task');
 
// ---------------------------------------------------------------------------
// Milestone generation. Rule-based: splits time between today and the
// goal's targetDate into weekly chunks. This is the seam a future
// Gemini-based generator replaces — same milestone shape in, same shape
// out, so nothing downstream needs to change.
// ---------------------------------------------------------------------------
 
function buildWeeklyMilestones(goalTitle, targetDate) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
 
  const end = new Date(targetDate);
  end.setHours(0, 0, 0, 0);
 
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerWeek));
 
  const milestones = [];
  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = new Date(start.getTime() + i * msPerWeek);
    const weekEndRaw = new Date(start.getTime() + (i + 1) * msPerWeek);
    const weekEnd = weekEndRaw > end ? end : weekEndRaw;
 
    milestones.push({
      weekNumber: i + 1,
      title: `Week ${i + 1}: ${goalTitle}`,
      description: '',
      startDate: weekStart,
      endDate: weekEnd,
      status: 'pending',
    });
  }
 
  return milestones;
}
 
// ---------------------------------------------------------------------------
// Auto Task Generation. Rule-based: one Task per milestone. Each created
// Task is linked back via goal/roadmap/milestone, and its _id is pushed
// into that milestone's `tasks` array.
// ---------------------------------------------------------------------------
 
async function generateTasksForMilestones(roadmap, goal) {
  for (const milestone of roadmap.milestones) {
    const task = await Task.create({
      user: roadmap.user,
      title: milestone.title,
      goal: goal._id,
      roadmap: roadmap._id,
      milestone: milestone._id,
      source: 'roadmap-generated',
    });
 
    milestone.tasks.push(task._id);
  }
 
  await roadmap.save();
}
 
// Called directly from goalController.createGoal — NOT an HTTP route
// handler. Takes a Mongoose Goal document, returns the created Roadmap.
exports.generateRoadmapForGoal = async (goal) => {
  const milestones = buildWeeklyMilestones(goal.title, goal.targetDate);
 
  const roadmap = await Roadmap.create({
    user: goal.user,
    goal: goal._id,
    title: `Roadmap: ${goal.title}`,
    generatedBy: 'rule-based',
    milestones,
  });
 
  // Task generation is a side effect of roadmap generation, same
  // resilience pattern as roadmap generation being a side effect of goal
  // creation — a failure here must not undo the roadmap that already
  // saved successfully.
  try {
    await generateTasksForMilestones(roadmap, goal);
  } catch (taskErr) {
    console.error('Auto task generation failed for roadmap', roadmap._id, taskErr);
  }
 
  return roadmap;
};
 
// ---------------------------------------------------------------------------
// Milestone progress sync. Called from taskController whenever a
// roadmap-linked task is completed/reopened or deleted. Not an HTTP route
// handler — exported for taskController to call directly.
// ---------------------------------------------------------------------------
 
function computeStatus(linkedTasks) {
  if (linkedTasks.length === 0) return 'pending';
  const completedCount = linkedTasks.filter((t) => t.completed).length;
  if (completedCount === 0) return 'pending';
  if (completedCount === linkedTasks.length) return 'completed';
  return 'in-progress';
}
 
// Recomputes a milestone's status from the current completion state of
// ALL tasks linked to it. Use when a linked task's `completed` field
// changes but the task itself still exists.
exports.syncMilestoneProgress = async (roadmapId, milestoneId) => {
  if (!roadmapId || !milestoneId) return;
 
  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) return;
 
  const milestone = roadmap.milestones.id(milestoneId);
  if (!milestone) return;
 
  const linkedTasks = await Task.find({ _id: { $in: milestone.tasks } });
  const newStatus = computeStatus(linkedTasks);
 
  if (milestone.status !== newStatus) {
    milestone.status = newStatus;
    milestone.completedAt = newStatus === 'completed' ? new Date() : null;
    await roadmap.save();
  }
};
 
// Removes a deleted task's id from its milestone's `tasks` array, then
// recomputes that milestone's status from the remaining linked tasks.
// Use when a linked task has just been deleted (it no longer exists, so
// syncMilestoneProgress's query would silently undercount without this).
exports.removeTaskFromMilestone = async (roadmapId, milestoneId, taskId) => {
  if (!roadmapId || !milestoneId) return;
 
  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) return;
 
  const milestone = roadmap.milestones.id(milestoneId);
  if (!milestone) return;
 
  milestone.tasks = milestone.tasks.filter((id) => String(id) !== String(taskId));
 
  const linkedTasks = await Task.find({ _id: { $in: milestone.tasks } });
  const newStatus = computeStatus(linkedTasks);
 
  milestone.status = newStatus;
  milestone.completedAt = newStatus === 'completed' ? new Date() : null;
 
  await roadmap.save();
};
 
// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------
 
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
    const roadmap = await Roadmap.findOne({ goal: req.params.goalId, user: req.user.id });
 
    if (!roadmap) {
      return res.status(404).json({ message: 'Roadmap not found for this goal' });
    }
 
    res.status(200).json(roadmap);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch roadmap' });
  }
};
 
// @desc   Manually toggle a milestone between pending and completed.
//         NOTE: once a milestone has linked tasks, the next task
//         completion/deletion will recompute and override this — this
//         endpoint is a manual override that doesn't persist past the
//         next task-driven sync.
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
 
    milestone.status = milestone.status === 'completed' ? 'pending' : 'completed';
    milestone.completedAt = milestone.status === 'completed' ? new Date() : null;
 
    await roadmap.save();
    res.status(200).json(roadmap);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update milestone' });
  }
};