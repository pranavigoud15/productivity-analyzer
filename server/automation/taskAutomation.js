const Task    = require('../models/Task');
const Roadmap = require('../models/Roadmap');
const { syncMilestoneProgress } = require('./roadmapAutomation');

/**
 * Marks a roadmap-linked task as completed (one-way — does not toggle).
 * Idempotent: if already completed, skips the save and cascade.
 * Used by mockAutomation when a mock test completion should close a task.
 */
async function completeLinkedTask(taskId) {
  if (!taskId) return null;

  const task = await Task.findById(taskId);
  if (!task) {
    console.log(`[Automation] Task not found — taskId=${taskId}`);
    return null;
  }

  if (task.completed) {
    console.log(`[Automation] Task already completed — skipping taskId=${taskId}`);
    return task;
  }

  task.completed   = true;
  task.completedAt = new Date();
  await task.save();

  console.log(`[Automation] Task Completed — taskId=${task._id} title="${task.title}"`);

  // Cascade into milestone → roadmap → goal if this task is roadmap-linked
  if (task.roadmap && task.milestone) {
    try {
      await syncMilestoneProgress(task.roadmap, task.milestone);
    } catch (err) {
      console.error(`[Automation] Milestone sync failed for taskId=${task._id}`, err);
    }
  }

  return task;
}

/**
 * Finds the roadmap-generated task linked to a specific milestone and
 * marks it complete. Used when a milestone is manually toggled to
 * completed so its task stays in sync.
 */
async function completeTaskForMilestone(roadmapId, milestoneId) {
  if (!roadmapId || !milestoneId) return;

  const task = await Task.findOne({
    roadmap:   roadmapId,
    milestone: milestoneId,
    source:    'roadmap-generated',
  });

  if (!task) return;

  if (task.completed) {
    console.log(`[Automation] Milestone task already completed — milestoneId=${milestoneId}`);
    return;
  }

  task.completed   = true;
  task.completedAt = new Date();
  await task.save();

  console.log(`[Automation] Task Completed (via milestone) — taskId=${task._id} milestoneId=${milestoneId}`);
}

/**
 * Finds the task linked to a specific milestone and marks it incomplete.
 * Used when a milestone is toggled back to pending.
 */
async function uncompleteTaskForMilestone(roadmapId, milestoneId) {
  if (!roadmapId || !milestoneId) return;

  const task = await Task.findOne({
    roadmap:   roadmapId,
    milestone: milestoneId,
    source:    'roadmap-generated',
  });

  if (!task) return;
  if (!task.completed) return;

  task.completed   = false;
  task.completedAt = null;
  await task.save();

  console.log(`[Automation] Task Uncompleted (via milestone rollback) — taskId=${task._id} milestoneId=${milestoneId}`);
}

/**
 * Returns all roadmap-generated tasks for a roadmap, grouped by
 * milestoneId. Used by mockAutomation to locate a task to close
 * after a mock test submission.
 */
async function getTasksForRoadmap(roadmapId) {
  return Task.find({
    roadmap: roadmapId,
    source:  'roadmap-generated',
  }).lean();
}

module.exports = {
  completeLinkedTask,
  completeTaskForMilestone,
  uncompleteTaskForMilestone,
  getTasksForRoadmap,
};