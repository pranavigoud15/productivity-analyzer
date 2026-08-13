const Task = require('../models/Task');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');

async function loadTaskEnrichmentContext(taskId) {
  const task = await Task.findById(taskId).lean();
  if (!task) return null;

  const [goal, roadmap] = await Promise.all([
    task.goal ? Goal.findById(task.goal).lean() : null,
    task.roadmap ? Roadmap.findById(task.roadmap).lean() : null,
  ]);

  const milestone = roadmap?.milestones?.find(
    (item) => String(item._id) === String(task.milestone)
  ) || null;

  return { task, goal, roadmap, milestone };
}

function formatContextBlock(context) {
  const { task, goal, roadmap, milestone } = context;
  return [
    `Task title: ${task.title}`,
    task.description ? `Task description: ${task.description}` : '',
    task.source ? `Task source: ${task.source}` : '',
    goal?.title ? `Goal title: ${goal.title}` : '',
    goal?.description ? `Goal description: ${goal.description}` : '',
    roadmap?.title ? `Roadmap title: ${roadmap.title}` : '',
    milestone?.title ? `Milestone title: ${milestone.title}` : '',
    milestone?.description ? `Milestone description: ${milestone.description}` : '',
  ].filter(Boolean).join('\n');
}

function buildVerificationContext(task, context) {
  const guide = task.learningGuide || {};
  const list = (items) => (Array.isArray(items) && items.length ? items.join('; ') : '');

  return [
    formatContextBlock(context),
    task.description ? `Learning objective: ${task.description}` : '',
    guide.overview ? `Overview: ${guide.overview}` : '',
    list(guide.whatToLearn) ? `What to learn: ${list(guide.whatToLearn)}` : '',
    list(guide.keyConcepts) ? `Key concepts: ${list(guide.keyConcepts)}` : '',
    list(guide.learningSteps) ? `Learning steps: ${list(guide.learningSteps)}` : '',
    list(guide.examples) ? `Examples: ${list(guide.examples)}` : '',
    list(guide.practicalApplications) ? `Practical applications: ${list(guide.practicalApplications)}` : '',
    list(guide.commonMistakes) ? `Common mistakes: ${list(guide.commonMistakes)}` : '',
    list(guide.prerequisites) ? `Prerequisites: ${list(guide.prerequisites)}` : '',
    list(guide.practiceSuggestions) ? `Practice suggestions: ${list(guide.practiceSuggestions)}` : '',
    guide.expectedOutcome ? `Expected outcome: ${guide.expectedOutcome}` : '',
    task.resources?.length
      ? `Trusted resources:\n${task.resources.map((resource) => {
        const description = resource.description?.trim();
        return `- ${resource.title}${description ? `: ${description}` : ''} (${resource.category})`;
      }).join('\n')}`
      : '',
  ].filter(Boolean).join('\n');
}

module.exports = { loadTaskEnrichmentContext, formatContextBlock, buildVerificationContext };
