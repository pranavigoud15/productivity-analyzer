const Roadmap = require('../models/Roadmap');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
 
// ---------------------------------------------------------------------------
// Smart milestone naming. Rule-based today: keyword-matches the goal title
// against a small curated curriculum table. THIS is the entire swap surface
// for Gemini later — same contract (goal title in, ordered topic strings
// out), nothing downstream needs to know which one produced them.
// ---------------------------------------------------------------------------
 
const CURRICULA = [
  {
    id: 'java-placement',
    keywords: ['java'],
    topics: [
      'Java Fundamentals',
      'OOP Concepts',
      'Collections',
      'Arrays',
      'Strings',
      'Sliding Window',
      'Recursion & Backtracking',
      'Dynamic Programming',
      'Graphs',
      'System Design Basics',
      'Mock Interview Prep',
    ],
  },
  {
    id: 'mern-stack',
    keywords: ['mern', 'mean stack', 'full stack web'],
    topics: ['HTML & CSS', 'JavaScript', 'React Basics', 'Node.js', 'Express', 'MongoDB', 'REST APIs & Auth', 'Full Stack Project'],
  },
  {
    id: 'python-data',
    keywords: ['python', 'data science'],
    topics: [
      'Python Fundamentals',
      'Data Structures in Python',
      'OOP in Python',
      'NumPy & Pandas',
      'Data Visualization',
      'Intro to Machine Learning',
    ],
  },
];
 
// Returns an ordered topic list if the goal title matches a known
// curriculum, or null if it doesn't (caller falls back to generic
// naming — no curriculum match is not an error case).
function getMilestoneTopics(goalTitle) {
  const normalized = goalTitle.toLowerCase();
  const matched = CURRICULA.find((c) => c.keywords.some((kw) => normalized.includes(kw)));
  return matched ? matched.topics : null;
}
 
// Three distinct, intentionally different outcomes — not collapsed into
// one fallback:
//   1. No curriculum matched at all -> generic naming (today's behavior).
//   2. Curriculum matched, topic exists for this week -> use it.
//   3. Curriculum matched, but ran out before this week (roadmap is
//      longer than the curriculum) -> honest "Practice & Review" label
//      rather than pretending there's curated content, or silently
//      repeating an earlier topic.
function buildMilestoneTitle(goalTitle, weekIndex, topics) {
  if (!topics) {
    return `Week ${weekIndex + 1}: ${goalTitle}`;
  }
  const topic = topics[weekIndex];
  if (topic) {
    return `Week ${weekIndex + 1}: ${topic}`;
  }
  return `Week ${weekIndex + 1}: ${goalTitle} — Practice & Review`;
}
 
// ---------------------------------------------------------------------------
// Milestone generation. Rule-based: splits time between today and the
// goal's targetDate into weekly chunks, titled via buildMilestoneTitle.
// ---------------------------------------------------------------------------
 
function buildMilestonesForGoal(goal) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
 
  const end = new Date(goal.targetDate);
  end.setHours(0, 0, 0, 0);
 
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerWeek));
 
  const topics = getMilestoneTopics(goal.title);
 
  const milestones = [];
  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = new Date(start.getTime() + i * msPerWeek);
    const weekEndRaw = new Date(start.getTime() + (i + 1) * msPerWeek);
    const weekEnd = weekEndRaw > end ? end : weekEndRaw;
 
    milestones.push({
      weekNumber: i + 1,
      title: buildMilestoneTitle(goal.title, i, topics),
      description: '',
      startDate: weekStart,
      endDate: weekEnd,
      status: 'pending',
    });
  }
 
  return milestones;
}
 
// ---------------------------------------------------------------------------
// Auto Task Generation (unchanged from the previous milestone).
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
  const milestones = buildMilestonesForGoal(goal);
 
  const roadmap = await Roadmap.create({
    user: goal.user,
    goal: goal._id,
    title: `Roadmap: ${goal.title}`,
    generatedBy: 'rule-based',
    progress: 0,
    milestones,
  });
 
  try {
    await generateTasksForMilestones(roadmap, goal);
  } catch (taskErr) {
    console.error('Auto task generation failed for roadmap', roadmap._id, taskErr);
  }
 
  return roadmap;
};
 
// ---------------------------------------------------------------------------
// Progress cascade: Milestone -> Roadmap -> Goal.
// ---------------------------------------------------------------------------
 
function computeMilestoneStatus(linkedTasks) {
  if (linkedTasks.length === 0) return 'pending';
  const completedCount = linkedTasks.filter((t) => t.completed).length;
  if (completedCount === 0) return 'pending';
  if (completedCount === linkedTasks.length) return 'completed';
  return 'in-progress';
}
 
function computeRoadmapProgress(roadmap) {
  const milestones = roadmap.milestones || [];
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.status === 'completed').length;
  return Math.round((completed / milestones.length) * 100);
}
 
// The missing link: pushes a roadmap's current aggregate progress onto
// its linked Goal, and keeps Goal.status in sync with whether that
// progress has reached 100%. Exported so any future milestone-mutating
// code path (not just the three below) can call it directly.
//
// Note: once a goal has a roadmap, its progress is meant to always equal
// the roadmap's — a manual progress-slider edit via PATCH /api/goals/:id
// will be overwritten by the next task-driven sync, same accepted
// tradeoff as the existing manual-milestone-toggle-vs-auto-sync case.
exports.cascadeToGoal = async (roadmap) => {
  if (!roadmap || !roadmap.goal) return;
 
  const goal = await Goal.findById(roadmap.goal);
  if (!goal) return;
 
  const progress = computeRoadmapProgress(roadmap);
  goal.progress = progress;
 
  if (progress === 100 && goal.status !== 'completed') {
    goal.status = 'completed';
    goal.completedAt = new Date();
  } else if (progress < 100 && goal.status === 'completed') {
    goal.status = 'active';
    goal.completedAt = null;
  }
 
  await goal.save();
};
 
// Recomputes a milestone's status from the current completion state of
// ALL tasks linked to it, then cascades the new roadmap-wide progress up
// to the Goal. Called from taskController.completeTask — signature
// unchanged from before this milestone.
exports.syncMilestoneProgress = async (roadmapId, milestoneId) => {
  if (!roadmapId || !milestoneId) return;
 
  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) return;
 
  const milestone = roadmap.milestones.id(milestoneId);
  if (!milestone) return;
 
  const linkedTasks = await Task.find({ _id: { $in: milestone.tasks } });
  const newStatus = computeMilestoneStatus(linkedTasks);
 
  if (milestone.status !== newStatus) {
    milestone.status = newStatus;
    milestone.completedAt = newStatus === 'completed' ? new Date() : null;
  }
 
  // Always recompute and save roadmap progress, even if this specific
  // milestone's status didn't change — keeps the cascade correct without
  // depending on this function's internal change-detection.
  roadmap.progress = computeRoadmapProgress(roadmap);
  await roadmap.save();
  await exports.cascadeToGoal(roadmap);
};
 
// Removes a deleted task's id from its milestone's tasks array, then
// recomputes status, roadmap progress, and cascades to the Goal. Called
// from taskController.deleteTask — signature unchanged.
exports.removeTaskFromMilestone = async (roadmapId, milestoneId, taskId) => {
  if (!roadmapId || !milestoneId) return;
 
  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) return;
 
  const milestone = roadmap.milestones.id(milestoneId);
  if (!milestone) return;
 
  milestone.tasks = milestone.tasks.filter((id) => String(id) !== String(taskId));
 
  const linkedTasks = await Task.find({ _id: { $in: milestone.tasks } });
  const newStatus = computeMilestoneStatus(linkedTasks);
 
  milestone.status = newStatus;
  milestone.completedAt = newStatus === 'completed' ? new Date() : null;
 
  roadmap.progress = computeRoadmapProgress(roadmap);
  await roadmap.save();
  await exports.cascadeToGoal(roadmap);
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
 
// @desc   Manually toggle a milestone between pending and completed, then
//         cascade the resulting roadmap progress up to the Goal.
//         NOTE: once a milestone has linked tasks, the next task
//         completion/deletion will recompute and override this.
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
 
    roadmap.progress = computeRoadmapProgress(roadmap);
    await roadmap.save();
    await exports.cascadeToGoal(roadmap);
 
    res.status(200).json(roadmap);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update milestone' });
  }
};