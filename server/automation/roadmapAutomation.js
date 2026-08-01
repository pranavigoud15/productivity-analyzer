const Roadmap = require('../models/Roadmap');
const Goal    = require('../models/Goal');
const Task    = require('../models/Task');

// ── Curricula (moved from roadmapController — single source of truth) ────────

const CURRICULA = [
  {
    keywords: ['java'],
    topics: [
      'Java Fundamentals','OOP Concepts','Collections','Arrays','Strings',
      'Sliding Window','Recursion & Backtracking','Dynamic Programming',
      'Graphs','System Design Basics','Mock Interview Prep',
    ],
  },
  {
    keywords: ['mern','mean stack','full stack web'],
    topics: [
      'HTML & CSS','JavaScript','React Basics','Node.js','Express',
      'MongoDB','REST APIs & Auth','Full Stack Project',
    ],
  },
  {
    keywords: ['python','data science'],
    topics: [
      'Python Fundamentals','Data Structures in Python','OOP in Python',
      'NumPy & Pandas','Data Visualization','Intro to Machine Learning',
    ],
  },
];

function getMilestoneTopics(goalTitle) {
  const normalized = goalTitle.toLowerCase();
  const matched = CURRICULA.find(c => c.keywords.some(kw => normalized.includes(kw)));
  return matched ? matched.topics : null;
}

function buildMilestoneTitle(goalTitle, weekIndex, topics) {
  if (!topics) return `Week ${weekIndex + 1}: ${goalTitle}`;
  const topic = topics[weekIndex];
  if (topic) return `Week ${weekIndex + 1}: ${topic}`;
  return `Week ${weekIndex + 1}: ${goalTitle} — Practice & Review`;
}

function buildMilestonesForGoal(goal) {
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(goal.targetDate); end.setHours(0,0,0,0);
  const msPerWeek  = 7 * 24 * 60 * 60 * 1000;
  const totalWeeks = Math.max(1, Math.ceil((end - start) / msPerWeek));
  const topics     = getMilestoneTopics(goal.title);

  return Array.from({ length: totalWeeks }, (_, i) => {
    const weekStart  = new Date(start.getTime() + i * msPerWeek);
    const weekEndRaw = new Date(start.getTime() + (i + 1) * msPerWeek);
    return {
      weekNumber:  i + 1,
      title:       buildMilestoneTitle(goal.title, i, topics),
      description: '',
      startDate:   weekStart,
      endDate:     weekEndRaw > end ? end : weekEndRaw,
      status:      'pending',
    };
  });
}

// ── Core automation functions ─────────────────────────────────────────────────

/**
 * Idempotent: skips if a roadmap already exists for this goal.
 * Returns the existing or newly created Roadmap document.
 */
async function generateRoadmapForGoal(goal) {
  const existing = await Roadmap.findOne({ goal: goal._id });
  if (existing) {
    console.log(`[Automation] Roadmap already exists for Goal ${goal._id} — skipping`);
    return existing;
  }

  const milestones = buildMilestonesForGoal(goal);
  const roadmap    = await Roadmap.create({
    user:        goal.user,
    goal:        goal._id,
    title:       `Roadmap: ${goal.title}`,
    generatedBy: 'rule-based',
    progress:    0,
    milestones,
  });

  console.log(`[Automation] Roadmap Generated — roadmapId=${roadmap._id} goalId=${goal._id} milestones=${milestones.length}`);
  return roadmap;
}

/**
 * Idempotent: for each milestone, creates a Task only if one does not
 * already exist with that roadmap+milestone pair. Pushes the task _id
 * into milestone.tasks and saves once per roadmap.
 */
async function generateTasksForRoadmap(roadmap, goal) {
  let modified = false;

  for (const milestone of roadmap.milestones) {
    const alreadyExists = await Task.findOne({
      roadmap:   roadmap._id,
      milestone: milestone._id,
    });

    if (alreadyExists) {
      // Ensure the task id is in milestone.tasks (repair if missing)
      if (!milestone.tasks.some(id => String(id) === String(alreadyExists._id))) {
        milestone.tasks.push(alreadyExists._id);
        modified = true;
      }
      continue;
    }

    const task = await Task.create({
      user:      roadmap.user,
      title:     milestone.title,
      goal:      goal._id,
      roadmap:   roadmap._id,
      milestone: milestone._id,
      source:    'roadmap-generated',
    });

    milestone.tasks.push(task._id);
    modified = true;
    console.log(`[Automation] Task Generated — taskId=${task._id} milestone="${milestone.title}"`);
  }

  if (modified) await roadmap.save();
  console.log(`[Automation] Tasks Generated — roadmapId=${roadmap._id}`);
}

// ── Progress helpers ──────────────────────────────────────────────────────────

function computeMilestoneStatus(linkedTasks) {
  if (!linkedTasks.length) return 'pending';
  const done = linkedTasks.filter(t => t.completed).length;
  if (done === 0) return 'pending';
  if (done === linkedTasks.length) return 'completed';
  return 'in-progress';
}

function computeRoadmapProgress(roadmap) {
  const ms = roadmap.milestones || [];
  if (!ms.length) return 0;
  const done = ms.filter(m => m.status === 'completed').length;
  return Math.round((done / ms.length) * 100);
}

/**
 * Pushes roadmap progress onto linked Goal. Syncs status + completedAt.
 */
async function cascadeToGoal(roadmap) {
  if (!roadmap?.goal) return;
  const goal = await Goal.findById(roadmap.goal);
  if (!goal) return;

  const progress = computeRoadmapProgress(roadmap);
  goal.progress  = progress;

  if (progress === 100 && goal.status !== 'completed') {
    goal.status      = 'completed';
    goal.completedAt = new Date();
  } else if (progress < 100 && goal.status === 'completed') {
    goal.status      = 'active';
    goal.completedAt = null;
  }

  await goal.save();
  console.log(`[Automation] Goal Progress Updated — goalId=${goal._id} progress=${progress}%`);
}

/**
 * Recomputes a milestone's status from all its linked tasks, updates
 * roadmap progress, cascades to goal.
 */
async function syncMilestoneProgress(roadmapId, milestoneId) {
  if (!roadmapId || !milestoneId) return;

  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) return;

  const milestone = roadmap.milestones.id(milestoneId);
  if (!milestone) return;

  const linkedTasks = await Task.find({ _id: { $in: milestone.tasks } });
  const newStatus   = computeMilestoneStatus(linkedTasks);

  if (milestone.status !== newStatus) {
    milestone.status      = newStatus;
    milestone.completedAt = newStatus === 'completed' ? new Date() : null;
    console.log(`[Automation] Milestone Updated — milestoneId=${milestoneId} status=${newStatus}`);
  }

  roadmap.progress = computeRoadmapProgress(roadmap);
  await roadmap.save();
  await cascadeToGoal(roadmap);
}

/**
 * Removes a deleted task from its milestone, recomputes, cascades.
 */
async function removeTaskFromMilestone(roadmapId, milestoneId, taskId) {
  if (!roadmapId || !milestoneId) return;

  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) return;

  const milestone = roadmap.milestones.id(milestoneId);
  if (!milestone) return;

  milestone.tasks   = milestone.tasks.filter(id => String(id) !== String(taskId));
  const linkedTasks = await Task.find({ _id: { $in: milestone.tasks } });
  const newStatus   = computeMilestoneStatus(linkedTasks);

  milestone.status      = newStatus;
  milestone.completedAt = newStatus === 'completed' ? new Date() : null;
  roadmap.progress      = computeRoadmapProgress(roadmap);

  await roadmap.save();
  await cascadeToGoal(roadmap);
  console.log(`[Automation] Milestone Updated — task removed milestoneId=${milestoneId}`);
}

module.exports = {
  generateRoadmapForGoal,
  generateTasksForRoadmap,
  syncMilestoneProgress,
  removeTaskFromMilestone,
  cascadeToGoal,
  computeRoadmapProgress,
};