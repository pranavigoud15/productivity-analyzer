const Roadmap      = require('../models/Roadmap');
const Task         = require('../models/Task');
const Goal         = require('../models/Goal');
const { completeLinkedTask }    = require('./taskAutomation');
const { syncMilestoneProgress, cascadeToGoal } = require('./roadmapAutomation');

/**
 * Finds the first incomplete roadmap-generated task whose milestone title
 * contains the test's subject or topic. This is a best-effort subject
 * match — not a hard foreign-key link — because MockTest has no direct
 * reference to a Roadmap or Milestone in the current schema.
 *
 * Match priority:
 *   1. Exact subject match in milestone title (case-insensitive)
 *   2. Topic match in milestone title (case-insensitive)
 *
 * Returns the matched Task document or null.
 */
async function findLinkedTask(userId, attempt) {
  const { subject, topic } = attempt;

  // Fetch all incomplete roadmap-generated tasks for this user
  const candidates = await Task.find({
    user:      userId,
    source:    'roadmap-generated',
    completed: false,
  }).lean();

  if (!candidates.length) return null;

  const subjectLower = (subject || '').toLowerCase();
  const topicLower   = (topic   || '').toLowerCase();

  // Priority 1 — subject appears in the task title
  let match = candidates.find(t =>
    subjectLower && t.title.toLowerCase().includes(subjectLower)
  );

  // Priority 2 — topic appears in the task title
  if (!match) {
    match = candidates.find(t =>
      topicLower && t.title.toLowerCase().includes(topicLower)
    );
  }

  return match || null;
}

/**
 * Called after a MockTestAttempt is saved.
 *
 * Flow:
 *   1. Try to find a roadmap-generated task matching the test subject/topic.
 *   2. If found, complete it → triggers milestone sync → roadmap progress → goal progress.
 *   3. If no linked task found, check if the user has any active goal and
 *      log that no automatic link could be established (no silent failure).
 *
 * This is fire-and-forget from the controller — errors are caught and
 * logged here so they never surface to the user.
 */
async function onMockTestCompleted(userId, attempt) {
  console.log(`[Automation] Mock Test Completed — attemptId=${attempt._id} subject=${attempt.subject} score=${attempt.percentage}%`);

  try {
    const linkedTask = await findLinkedTask(userId, attempt);

    if (linkedTask) {
      console.log(`[Automation] Linked Task Found — taskId=${linkedTask._id} title="${linkedTask.title}"`);
      // completeLinkedTask handles the full cascade internally:
      // Task → syncMilestoneProgress → Roadmap progress → cascadeToGoal
      await completeLinkedTask(linkedTask._id);
    } else {
      console.log(`[Automation] No linked task found for subject="${attempt.subject}" topic="${attempt.topic}" — no task or roadmap update performed`);

      // Even without a task link, if the user has a roadmap whose title
      // matches the subject we still cascade the roadmap progress so that
      // Insights stays consistent. This handles the case where milestone
      // tasks were never generated (e.g. roadmap created before automation).
      await tryCascadeMatchingRoadmap(userId, attempt);
    }
  } catch (err) {
    console.error(`[Automation] onMockTestCompleted failed — attemptId=${attempt._id}`, err);
  }
}

/**
 * Fallback cascade: if no task link found, look for a roadmap whose
 * title or any milestone title mentions the test subject. If found,
 * recompute its progress and cascade to goal.
 * This keeps Goal + Insights consistent even for partially-migrated data.
 */
async function tryCascadeMatchingRoadmap(userId, attempt) {
  const subjectLower = (attempt.subject || '').toLowerCase();
  if (!subjectLower) return;

  const roadmaps = await Roadmap.find({ user: userId });
  const matched  = roadmaps.find(r =>
    r.title.toLowerCase().includes(subjectLower) ||
    r.milestones.some(m => m.title.toLowerCase().includes(subjectLower))
  );

  if (!matched) return;

  console.log(`[Automation] Fallback Roadmap Cascade — roadmapId=${matched._id}`);
  await cascadeToGoal(matched);
}

module.exports = { onMockTestCompleted };