const Roadmap = require('../models/Roadmap');
const Task = require('../models/Task');
const { completeLinkedTask } = require('./taskAutomation');
const { cascadeToGoal } = require('./roadmapAutomation');

/**
 * Finds the incomplete roadmap-generated task explicitly linked
 * to this MockTest.
 *
 * MockTest automation is only allowed to complete tasks that have
 * an explicit mockTest reference matching the submitted attempt.
 *
 * Tasks with mockTest === null are handled by the separate
 * AI verification flow and must never be completed here.
 */
async function findLinkedTask(userId, attempt) {
  if (!attempt.mockTest) {
    return null;
  }

  const match = await Task.findOne({
    user: userId,
    source: 'roadmap-generated',
    completed: false,
    mockTest: attempt.mockTest,
  });

  return match || null;
}

/**
 * Called after a MockTestAttempt is saved.
 *
 * Flow:
 *   1. Find a roadmap-generated task explicitly linked to the MockTest.
 *   2. If found, complete it through completeLinkedTask().
 *   3. If no linked task is found, do not complete any task.
 *
 * Tasks without an explicit mockTest link are left for the
 * AI verification flow.
 */
async function onMockTestCompleted(userId, attempt) {
  console.log(
    `[Automation] Mock Test Completed — attemptId=${attempt._id} subject=${attempt.subject} score=${attempt.percentage}%`
  );

  try {
    const linkedTask = await findLinkedTask(userId, attempt);

    if (linkedTask) {
      console.log(
        `[Automation] Linked Task Found — taskId=${linkedTask._id} title="${linkedTask.title}"`
      );

      // completeLinkedTask handles the existing cascade:
      // Task → Milestone → Roadmap → Goal
      await completeLinkedTask(linkedTask._id);
    } else {
      console.log(
        `[Automation] No explicitly linked task found for mockTest=${attempt.mockTest} — no task completion performed`
      );

      // Preserve the existing fallback roadmap cascade behavior.
      await tryCascadeMatchingRoadmap(userId, attempt);
    }
  } catch (err) {
    console.error(
      `[Automation] onMockTestCompleted failed — attemptId=${attempt._id}`,
      err
    );
  }
}

/**
 * Fallback cascade: if no task link is found, look for a roadmap
 * whose title or milestone title mentions the test subject.
 *
 * This does not complete a task. It only preserves the existing
 * roadmap progress synchronization behavior.
 */
async function tryCascadeMatchingRoadmap(userId, attempt) {
  const subjectLower = (attempt.subject || '').toLowerCase();

  if (!subjectLower) {
    return;
  }

  const roadmaps = await Roadmap.find({ user: userId });

  const matched = roadmaps.find(
    (roadmap) =>
      roadmap.title.toLowerCase().includes(subjectLower) ||
      roadmap.milestones.some((milestone) =>
        milestone.title.toLowerCase().includes(subjectLower)
      )
  );

  if (!matched) {
    return;
  }

  console.log(
    `[Automation] Fallback Roadmap Cascade — roadmapId=${matched._id}`
  );

  await cascadeToGoal(matched);
}

module.exports = {
  onMockTestCompleted,
};