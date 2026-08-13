const Goal = require('../models/Goal');
const Task = require('../models/Task');
const Note = require('../models/Note');
const MockTestAttempt = require('../models/MockTestAttempt');
const { loadTaskEnrichmentContext, buildVerificationContext } = require('./taskContextService');
const { createMockTestFromMetadata } = require('./mockTestService');

const ALLOWED_QUESTION_COUNTS = [5, 10, 15, 30];
const ALLOWED_DIFFICULTIES = ['Adaptive', 'Easy', 'Medium', 'Hard'];

function listField(items) {
  return Array.isArray(items) && items.length ? items.join('; ') : '';
}

async function buildTaskScopeBlock(task) {
  const context = await loadTaskEnrichmentContext(task._id);
  if (context) {
    return buildVerificationContext(task, context);
  }

  const meta = task.enrichmentMetadata || {};
  return [
    `Task: ${task.title}`,
    task.description ? `Objective: ${task.description}` : '',
    task.completed ? 'Status: completed' : 'Status: active/pending',
    meta.subject ? `Subject: ${meta.subject}` : '',
    meta.topic ? `Topic: ${meta.topic}` : '',
    listField(meta.subtopics) ? `Sub-topics: ${listField(meta.subtopics)}` : '',
    task.learningGuide?.overview ? `Overview: ${task.learningGuide.overview}` : '',
    listField(task.learningGuide?.keyConcepts) ? `Key concepts: ${listField(task.learningGuide.keyConcepts)}` : '',
    task.resources?.length
      ? `Resources:\n${task.resources.map((r) => `- ${r.title}`).join('\n')}`
      : '',
  ].filter(Boolean).join('\n');
}

async function buildDailyAssessmentScope(userId) {
  const [goals, tasks, notes] = await Promise.all([
    Goal.find({ user: userId }).sort({ updatedAt: -1 }).lean(),
    Task.find({ user: userId }).sort({ updatedAt: -1 }).limit(20).lean(),
    Note.find({ user: userId }).sort({ pinned: -1, updatedAt: -1 }).limit(8).lean(),
  ]);

  const activeGoals = goals.filter((g) => g.status !== 'completed');
  const priorityTasks = [
    ...tasks.filter((t) => !t.completed).slice(0, 12),
    ...tasks.filter((t) => t.completed).slice(0, 6),
  ].slice(0, 15);

  const uniqueTasks = [];
  const seen = new Set();
  for (const task of priorityTasks) {
    const id = String(task._id);
    if (seen.has(id)) continue;
    seen.add(id);
    uniqueTasks.push(task);
  }

  const taskBlocks = await Promise.all(uniqueTasks.map((task) => buildTaskScopeBlock(task)));

  const goalBlock = (activeGoals.length ? activeGoals : goals).slice(0, 3).map((goal) => [
    `Goal: ${goal.title}`,
    goal.description ? `Goal description: ${goal.description}` : '',
    typeof goal.progress === 'number' ? `Goal progress: ${goal.progress}%` : '',
  ].filter(Boolean).join('\n')).join('\n\n');

  const noteBlock = notes.slice(0, 5).map((note) => [
    `Note: ${note.title}`,
    note.content ? note.content.slice(0, 400) : '',
    note.tags?.length ? `Tags: ${note.tags.join(', ')}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');

  const scope = [
    'Daily Task Assessment — generate questions ONLY from the learning context below.',
    goalBlock ? `=== Goals ===\n${goalBlock}` : '',
    taskBlocks.length ? `=== Tasks ===\n${taskBlocks.join('\n\n---\n\n')}` : '',
    noteBlock ? `=== Notes ===\n${noteBlock}` : '',
  ].filter(Boolean).join('\n\n');

  return { scope, goals, tasks: uniqueTasks, notes };
}

async function resolveAdaptiveDifficulty(userId) {
  const recent = await MockTestAttempt.find({ user: userId })
    .sort({ completedAt: -1 })
    .limit(8)
    .lean();

  if (recent.length < 2) return 'Medium';

  const avg = recent.reduce((sum, attempt) => sum + attempt.percentage, 0) / recent.length;
  if (avg >= 75) return 'Hard';
  if (avg >= 50) return 'Medium';
  return 'Easy';
}

function deriveAssessmentLabels({ goals, tasks }) {
  const primaryGoal = goals.find((g) => g.status !== 'completed') || goals[0];
  const recentTask = tasks[0];

  const subject = primaryGoal?.title?.trim()
    || recentTask?.enrichmentMetadata?.subject
    || recentTask?.title?.replace(/^Week \d+:\s*/i, '').trim()
    || 'Daily Learning';

  const topic = recentTask?.enrichmentMetadata?.topic
    || recentTask?.title?.replace(/^Week \d+:\s*/i, '').trim()
    || 'Task Assessment';

  const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    title: `Daily Assessment — ${dateLabel}`,
    subject: subject.slice(0, 120),
    topic: topic.slice(0, 120),
    goal: primaryGoal?._id || null,
  };
}

async function createDailyAssessment(userId, { questionCount, difficulty }) {
  if (!ALLOWED_QUESTION_COUNTS.includes(questionCount)) {
    const error = new Error('questionCount must be one of: 5, 10, 15, 30.');
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
    const error = new Error('difficulty must be one of: Adaptive, Easy, Medium, Hard.');
    error.statusCode = 400;
    throw error;
  }

  const { scope, goals, tasks, notes } = await buildDailyAssessmentScope(userId);

  if (!goals.length && !tasks.length && !notes.length) {
    const error = new Error('Add at least one goal, task, or note before starting a daily assessment.');
    error.statusCode = 400;
    throw error;
  }

  if (!scope.trim()) {
    const error = new Error('Could not build learning context for daily assessment.');
    error.statusCode = 422;
    throw error;
  }

  const resolvedDifficulty = difficulty === 'Adaptive'
    ? await resolveAdaptiveDifficulty(userId)
    : difficulty;

  const labels = deriveAssessmentLabels({ goals, tasks });

  const test = await createMockTestFromMetadata({
    user: userId,
    goal: labels.goal,
    roadmap: null,
    milestone: null,
    task: null,
    source: 'daily-task-assessment',
    title: labels.title,
    subject: labels.subject,
    topic: labels.topic,
    difficulty: resolvedDifficulty,
    questionCount,
    durationMinutes: Math.max(15, questionCount * 2),
    scope,
    description: `Personalized assessment from ${tasks.length} task(s), ${goals.length} goal(s), ${notes.length} note(s).`,
    passingPercentage: 60,
    isPublished: true,
    aiMetadata: {
      generatedFrom: 'daily-task-assessment',
      requestedDifficulty: difficulty,
      resolvedDifficulty,
      taskCount: tasks.length,
      goalCount: goals.length,
      noteCount: notes.length,
    },
  });

  return {
    test,
    resolvedDifficulty,
    questionCount: test.questions.length,
  };
}

function buildAttemptInsights(questionResults = []) {
  const incorrect = questionResults.filter((q) => !q.isCorrect);
  const correct = questionResults.filter((q) => q.isCorrect);

  return {
    weakAreas: incorrect.slice(0, 5).map((q) => q.questionText),
    strongAreas: correct.slice(0, 5).map((q) => q.questionText),
    incorrectCount: incorrect.length,
    correctCount: correct.length,
  };
}

module.exports = {
  ALLOWED_QUESTION_COUNTS,
  ALLOWED_DIFFICULTIES,
  buildDailyAssessmentScope,
  resolveAdaptiveDifficulty,
  createDailyAssessment,
  buildAttemptInsights,
};
