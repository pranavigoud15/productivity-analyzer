const Task = require('../models/Task');
const { loadTaskEnrichmentContext } = require('./taskContextService');
const { generateTaskEnrichment, fallbackEnrichment } = require('./resourceAiService');
const { selectResources, buildAnalysis } = require('./resourceSearchService');

const GUIDE_LIST_FIELDS = [
  'whatToLearn', 'keyConcepts', 'learningSteps', 'examples',
  'practicalApplications', 'commonMistakes', 'prerequisites', 'practiceSuggestions',
];

const STALE_PROCESSING_MS = 10 * 60 * 1000;

function isGuideEmpty(guide) {
  if (!guide) return true;
  if (guide.overview?.trim() || guide.expectedOutcome?.trim()) return false;
  return !GUIDE_LIST_FIELDS.some((field) => Array.isArray(guide[field]) && guide[field].length);
}

function isProcessingStale(task) {
  if (!task || task.enrichmentStatus !== 'processing') return false;
  const updatedAt = task.updatedAt || task.createdAt;
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() > STALE_PROCESSING_MS;
}

function hasEmptyResources(task) {
  return !task?.resources || task.resources.length === 0;
}

function needsResourceRematch(task) {
  if (!task) return false;
  return task.enrichmentStatus === 'completed'
    && !isGuideEmpty(task.learningGuide)
    && hasEmptyResources(task);
}

function needsEnrichment(task) {
  if (!task || task.source !== 'roadmap-generated') return false;

  if (task.enrichmentStatus === 'processing') {
    return isProcessingStale(task);
  }

  if (!task.enrichmentStatus || task.enrichmentStatus === 'pending' || task.enrichmentStatus === 'failed') {
    return true;
  }

  if (task.enrichmentStatus === 'completed' && isGuideEmpty(task.learningGuide)) {
    return true;
  }

  if (needsResourceRematch(task)) {
    return true;
  }

  return false;
}

function needsFullEnrichment(task) {
  if (!task || task.source !== 'roadmap-generated') return false;
  if (task.enrichmentStatus === 'processing') return isProcessingStale(task);
  if (!task.enrichmentStatus || task.enrichmentStatus === 'pending' || task.enrichmentStatus === 'failed') {
    return true;
  }
  if (task.enrichmentStatus === 'completed' && isGuideEmpty(task.learningGuide)) {
    return true;
  }
  return false;
}

function buildClaimFilter(taskId, task) {
  if (task.enrichmentStatus === 'processing' && isProcessingStale(task)) {
    return { _id: taskId, enrichmentStatus: 'processing' };
  }

  const base = { _id: taskId, enrichmentStatus: { $ne: 'processing' } };
  if (task.enrichmentStatus === 'completed' && isGuideEmpty(task.learningGuide)) {
    return { ...base, enrichmentStatus: 'completed' };
  }
  return {
    ...base,
    $or: [
      { enrichmentStatus: { $in: ['pending', 'failed'] } },
      { enrichmentStatus: { $exists: false } },
    ],
  };
}

function buildEnrichmentMetadata(enrichment) {
  return {
    domain: enrichment.domain || '',
    subject: enrichment.subject || '',
    topic: enrichment.topic || '',
    subtopics: enrichment.subtopics || [],
    matchingTerms: enrichment.matchingTerms || [],
    difficulty: enrichment.difficulty || '',
  };
}

function buildEnrichmentFromTask(task, context) {
  const meta = task.enrichmentMetadata || {};
  const hasMeta = meta.domain || meta.subject || (meta.matchingTerms && meta.matchingTerms.length);

  if (hasMeta) {
    return {
      learningObjective: task.description || '',
      domain: meta.domain || '',
      subject: meta.subject || '',
      topic: meta.topic || task.title,
      subtopics: meta.subtopics || [],
      difficulty: meta.difficulty || '',
      matchingTerms: meta.matchingTerms || [],
      learningGuide: task.learningGuide,
    };
  }

  const fallback = fallbackEnrichment(context);
  return {
    ...fallback,
    learningObjective: task.description || fallback.learningObjective,
    learningGuide: task.learningGuide,
  };
}

async function rematchTaskResources(taskId) {
  const context = await loadTaskEnrichmentContext(taskId);
  if (!context) return false;

  const task = await Task.findById(taskId).lean();
  if (!needsResourceRematch(task)) return false;

  const enrichment = buildEnrichmentFromTask(task, context);
  const resources = await selectResources(enrichment, context);

  await Task.updateOne(
    { _id: taskId },
    { $set: { resources } },
  );

  console.log(`[Enrichment] Re-matched taskId=${taskId} resources=${resources.length}`);
  return true;
}

async function enrichTask(taskId) {
  const context = await loadTaskEnrichmentContext(taskId);
  if (!context) return;

  const existing = await Task.findById(taskId).lean();
  if (!needsEnrichment(existing)) return;

  if (needsResourceRematch(existing) && !needsFullEnrichment(existing)) {
    await rematchTaskResources(taskId);
    return;
  }

  const claimed = await Task.findOneAndUpdate(
    buildClaimFilter(taskId, existing),
    { $set: { enrichmentStatus: 'processing', enrichmentError: '' } },
  );

  if (!claimed) return;

  try {
    const enrichment = await generateTaskEnrichment(context);
    const resources = await selectResources(enrichment, context);

    await Task.updateOne(
      { _id: taskId },
      {
        $set: {
          description: enrichment.learningObjective,
          learningGuide: enrichment.learningGuide,
          resources,
          enrichmentMetadata: buildEnrichmentMetadata(enrichment),
          enrichmentStatus: 'completed',
          enrichmentError: '',
        },
      },
    );

    console.log(`[Enrichment] Completed taskId=${taskId} guide=${!isGuideEmpty(enrichment.learningGuide)} resources=${resources.length}`);
  } catch (err) {
    await Task.updateOne(
      { _id: taskId },
      {
        $set: {
          enrichmentStatus: 'failed',
          enrichmentError: String(err.message || 'Enrichment failed').slice(0, 240),
        },
      },
    );
    console.warn(`[Enrichment] Failed taskId=${taskId}: ${err.message}`);
  }
}

function scheduleTaskEnrichment(taskId) {
  enrichTask(taskId).catch((err) => {
    console.warn(`[Enrichment] Background failure taskId=${taskId}: ${err.message}`);
  });
}

module.exports = {
  enrichTask,
  rematchTaskResources,
  scheduleTaskEnrichment,
  scheduleTaskResourceEnrichment: scheduleTaskEnrichment,
  needsEnrichment,
  needsResourceRematch,
  isGuideEmpty,
  buildEnrichmentFromTask,
};
