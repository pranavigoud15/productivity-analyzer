/**
 * automationService.js
 *
 * Central event bus for the automation layer.
 * Controllers call ONLY these named events — never import roadmapAutomation,
 * taskAutomation, or mockAutomation directly.
 *
 * Event contract:
 *   onGoalCreated(goal)                          → generate roadmap + tasks
 *   onRoadmapCreated(roadmap, goal)              → generate tasks
 *   onTaskCompleted(task)                        → sync milestone → roadmap → goal
 *   onTaskDeleted(task)                          → remove from milestone → cascade
 *   onMilestoneToggled(roadmapId, milestoneId, newStatus) → sync task + cascade
 *   onMockTestCompleted(userId, attempt)         → link task + cascade
 *
 * All handlers are fire-and-forget safe: errors are caught and logged
 * here so they never propagate back to the HTTP response.
 */

const roadmapAutomation = require('./roadmapAutomation');
const taskAutomation    = require('./taskAutomation');
const mockAutomation    = require('./mockAutomation');
const { scheduleRoadmapMockTestGeneration } = require('../services/roadmapMockTestService');

// ── Goal events ───────────────────────────────────────────────────────────────

/**
 * Fired after a Goal document is created.
 * Generates the roadmap (idempotent) then generates tasks for every
 * milestone (idempotent — skips milestones that already have a task).
 */
async function onGoalCreated(goal) {
  console.log(`[Automation] Goal Created — goalId=${goal._id} title="${goal.title}"`);
  try {
    const roadmap = await roadmapAutomation.generateRoadmapForGoal(goal);
    await roadmapAutomation.generateTasksForRoadmap(roadmap, goal);
    scheduleRoadmapMockTestGeneration(roadmap._id, goal);
  } catch (err) {
    console.error(`[Automation] onGoalCreated failed — goalId=${goal._id}`, err);
  }
}

// ── Roadmap events ────────────────────────────────────────────────────────────

/**
 * Fired after a Roadmap is created externally (not via onGoalCreated).
 * Generates tasks for all milestones that do not yet have one.
 */
async function onRoadmapCreated(roadmap, goal) {
  console.log(`[Automation] Roadmap Generated — roadmapId=${roadmap._id} goalId=${goal._id}`);
  try {
    await roadmapAutomation.generateTasksForRoadmap(roadmap, goal);
  } catch (err) {
    console.error(`[Automation] onRoadmapCreated failed — roadmapId=${roadmap._id}`, err);
  }
}

// ── Task events ───────────────────────────────────────────────────────────────

/**
 * Fired after a Task's completed state is toggled.
 * If the task is roadmap-linked, syncs the milestone → roadmap → goal.
 */
async function onTaskCompleted(task) {
  console.log(`[Automation] Task Completed — taskId=${task._id} completed=${task.completed}`);
  try {
    if (task.roadmap && task.milestone) {
      await roadmapAutomation.syncMilestoneProgress(task.roadmap, task.milestone);
    }
  } catch (err) {
    console.error(`[Automation] onTaskCompleted failed — taskId=${task._id}`, err);
  }
}

/**
 * Fired after a Task is deleted.
 * Removes the task reference from its milestone and cascades progress.
 */
async function onTaskDeleted(task) {
  console.log(`[Automation] Task Deleted — taskId=${task._id}`);
  try {
    if (task.roadmap && task.milestone) {
      await roadmapAutomation.removeTaskFromMilestone(
        task.roadmap,
        task.milestone,
        task._id
      );
    }
  } catch (err) {
    console.error(`[Automation] onTaskDeleted failed — taskId=${task._id}`, err);
  }
}

// ── Milestone events ──────────────────────────────────────────────────────────

/**
 * Fired after a milestone is manually toggled via PATCH
 * /api/roadmaps/:roadmapId/milestones/:milestoneId/complete.
 *
 * Keeps the linked task in sync with the milestone's new status, then
 * recomputes roadmap progress and cascades to the goal.
 *
 * newStatus: 'completed' | 'pending'
 */
async function onMilestoneToggled(roadmapId, milestoneId, newStatus) {
  console.log(`[Automation] Milestone Updated — milestoneId=${milestoneId} newStatus=${newStatus}`);
  try {
    if (newStatus === 'completed') {
      await taskAutomation.completeTaskForMilestone(roadmapId, milestoneId);
    } else {
      await taskAutomation.uncompleteTaskForMilestone(roadmapId, milestoneId);
    }
    // Recompute roadmap + goal after task state has been updated
    await roadmapAutomation.syncMilestoneProgress(roadmapId, milestoneId);
  } catch (err) {
    console.error(
      `[Automation] onMilestoneToggled failed — milestoneId=${milestoneId}`, err
    );
  }
}

// ── Mock test events ──────────────────────────────────────────────────────────

/**
 * Fired after a MockTestAttempt is saved.
 * Attempts to link the test result to a roadmap task via subject/topic
 * matching, completes that task, and cascades progress.
 */
async function onMockTestCompleted(userId, attempt) {
  try {
    await mockAutomation.onMockTestCompleted(userId, attempt);
  } catch (err) {
    console.error(
      `[Automation] onMockTestCompleted failed — attemptId=${attempt._id}`, err
    );
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  onGoalCreated,
  onRoadmapCreated,
  onTaskCompleted,
  onTaskDeleted,
  onMilestoneToggled,
  onMockTestCompleted,
};