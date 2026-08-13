const Roadmap = require('../models/Roadmap');
const Task = require('../models/Task');
const MockTest = require('../models/MockTest');
const {
  buildAssessmentScope,
  generateMockTestQuestions,
  normaliseQuestionCount,
  DEFAULT_QUESTION_COUNT,
} = require('./mockTestQuestionService');

const STALE_PROCESSING_MS = 5 * 60 * 1000;
const GENERATION_TIMEOUT_MS = Number(process.env.MOCK_TEST_GENERATION_TIMEOUT_MS) || 90000;
const GENERATION_CONCURRENCY = Math.max(1, Number(process.env.MOCK_TEST_GENERATION_CONCURRENCY) || 2);

function withTimeout(promise, timeoutMs, label = 'Mock test generation') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function runWithConcurrency(items, worker, concurrency = GENERATION_CONCURRENCY) {
  const results = [];
  let index = 0;

  async function next() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      results.push(await worker(current));
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => next());
  await Promise.all(workers);
  return results;
}

function parseMilestoneTopic(milestoneTitle = '') {
  const cleaned = milestoneTitle.replace(/^Week\s+\d+:\s*/i, '').trim();
  return cleaned || milestoneTitle.trim() || 'Learning Module';
}

function inferDifficultyFromProgress(weekNumber, totalWeeks) {
  const week = Number(weekNumber) || 1;
  const total = Math.max(Number(totalWeeks) || 1, 1);
  const ratio = week / total;
  if (ratio <= 0.34) return 'Easy';
  if (ratio <= 0.67) return 'Medium';
  return 'Hard';
}

function buildRoadmapAssessmentScope({ goal, roadmap, milestone, task }) {
  return [
    goal?.title ? `Goal title: ${goal.title}` : '',
    goal?.description ? `Goal description: ${goal.description}` : '',
    roadmap?.title ? `Roadmap title: ${roadmap.title}` : '',
    milestone?.title ? `Milestone title: ${milestone.title}` : '',
    milestone?.description ? `Milestone description: ${milestone.description}` : '',
    task?.title ? `Task title: ${task.title}` : '',
    task?.description ? `Learning objective: ${task.description}` : '',
  ].filter(Boolean).join('\n');
}

function buildRoadmapAssessmentMetadata({ goal, roadmap, milestone, task }) {
  const topic = parseMilestoneTopic(milestone?.title || task?.title || '');
  const subject = (goal?.title || roadmap?.title || topic).trim();
  const totalWeeks = roadmap?.milestones?.length || 1;

  return {
    user: roadmap.user,
    goal: goal?._id || roadmap.goal,
    roadmap: roadmap._id,
    milestone: milestone._id,
    task: task?._id || null,
    source: 'roadmap-generated',
    title: `${topic} Assessment`,
    subject,
    topic,
    difficulty: inferDifficultyFromProgress(milestone?.weekNumber, totalWeeks),
    questionCount: DEFAULT_QUESTION_COUNT,
    durationMinutes: Math.max(15, DEFAULT_QUESTION_COUNT * 2),
    scope: buildRoadmapAssessmentScope({ goal, roadmap, milestone, task }),
    description: milestone?.description || task?.description || '',
  };
}

function isProcessingStale(test) {
  if (!test || test.generationStatus !== 'processing') return false;
  const updatedAt = test.updatedAt || test.createdAt;
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() > STALE_PROCESSING_MS;
}

async function linkMockTestReferences(taskId, roadmapId, milestoneId, mockTestId) {
  if (taskId) {
    await Task.updateOne({ _id: taskId }, { $set: { mockTest: mockTestId } });
  }

  if (roadmapId && milestoneId) {
    await Roadmap.updateOne(
      { _id: roadmapId, 'milestones._id': milestoneId },
      { $set: { 'milestones.$.mockTest': mockTestId } }
    );
  }
}

async function ensureMockTestForMilestone({ goal, roadmap, milestone, task }) {
  const metadata = buildRoadmapAssessmentMetadata({ goal, roadmap, milestone, task });

  let existing = await MockTest.findOne({
    user: metadata.user,
    roadmap: metadata.roadmap,
    milestone: metadata.milestone,
    source: 'roadmap-generated',
  });

  if (existing) {
    if (existing.generationStatus === 'completed' && existing.questions.length > 0) {
      if (task?._id) {
        await linkMockTestReferences(task._id, roadmap._id, milestone._id, existing._id);
      }
      return existing;
    }

    if (existing.generationStatus === 'processing' && !isProcessingStale(existing)) {
      return existing;
    }
  }

  const claimFilter = existing
    ? { _id: existing._id, generationStatus: { $in: ['processing', 'failed'] } }
    : {
      user: metadata.user,
      roadmap: metadata.roadmap,
      milestone: metadata.milestone,
      source: 'roadmap-generated',
    };

  const claimed = await MockTest.findOneAndUpdate(
    claimFilter,
    {
      $set: {
        user: metadata.user,
        goal: metadata.goal,
        roadmap: metadata.roadmap,
        milestone: metadata.milestone,
        task: metadata.task,
        source: 'roadmap-generated',
        title: metadata.title,
        subject: metadata.subject,
        topic: metadata.topic,
        difficulty: metadata.difficulty,
        durationMinutes: metadata.durationMinutes,
        questions: [],
        isPublished: false,
        generationStatus: 'processing',
        generationError: '',
        passingPercentage: 60,
        aiMetadata: {
          scopePreview: metadata.scope.slice(0, 500),
          generatedFrom: 'roadmap-milestone',
        },
      },
    },
    { upsert: !existing, new: true, setDefaultsOnInsert: true }
  ).catch(async (err) => {
    if (err?.code === 11000) {
      return MockTest.findOne({
        user: metadata.user,
        roadmap: metadata.roadmap,
        milestone: metadata.milestone,
        source: 'roadmap-generated',
      });
    }
    throw err;
  });

  if (!claimed) {
    return MockTest.findOne({
      user: metadata.user,
      roadmap: metadata.roadmap,
      milestone: metadata.milestone,
      source: 'roadmap-generated',
    });
  }

  try {
    const questions = await withTimeout(
      generateMockTestQuestions(
        {
          title: metadata.title,
          subject: metadata.subject,
          topic: metadata.topic,
          difficulty: metadata.difficulty,
          description: metadata.description,
          scope: metadata.scope,
        },
        metadata.questionCount
      ),
      GENERATION_TIMEOUT_MS,
      `Mock test generation for "${metadata.title}"`
    );

    const completed = await MockTest.findByIdAndUpdate(
      claimed._id,
      {
        $set: {
          questions,
          generationStatus: 'completed',
          generationError: '',
          isPublished: true,
          task: metadata.task,
          aiMetadata: {
            generatedAt: new Date().toISOString(),
            questionCount: questions.length,
            scopePreview: metadata.scope.slice(0, 500),
            generatedFrom: 'roadmap-milestone',
          },
        },
      },
      { new: true }
    );

    if (task?._id) {
      await linkMockTestReferences(task._id, roadmap._id, milestone._id, completed._id);
    }

    console.log(
      `[MockTestAutomation] Generated mock test mockTestId=${completed._id} milestone="${milestone.title}" questions=${questions.length}`
    );

    return completed;
  } catch (err) {
    await MockTest.updateOne(
      { _id: claimed._id },
      {
        $set: {
          generationStatus: 'failed',
          generationError: String(err.message || 'Mock test generation failed').slice(0, 240),
          isPublished: false,
        },
      }
    );

    console.warn(
      `[MockTestAutomation] Failed milestone="${milestone.title}" roadmapId=${roadmap._id}: ${err.message}`
    );

    return null;
  }
}

async function generateMockTestsForRoadmap(roadmapId, goal) {
  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) return;

  const milestoneJobs = [];

  for (const milestone of roadmap.milestones) {
    const task = await Task.findOne({
      roadmap: roadmap._id,
      milestone: milestone._id,
      source: 'roadmap-generated',
    }).lean();

    if (!task) continue;
    milestoneJobs.push({ milestone, task });
  }

  if (!milestoneJobs.length) return;

  // Prioritize the first milestone so at least one assessment becomes ready quickly.
  const [firstJob, ...remainingJobs] = milestoneJobs;
  await ensureMockTestForMilestone({ goal, roadmap, milestone: firstJob.milestone, task: firstJob.task });

  if (remainingJobs.length) {
    await runWithConcurrency(
      remainingJobs,
      ({ milestone, task }) => ensureMockTestForMilestone({ goal, roadmap, milestone, task }),
    );
  }

  console.log(`[MockTestAutomation] Finished roadmap mock test generation roadmapId=${roadmapId}`);
}

function scheduleRoadmapMockTestGeneration(roadmapId, goal) {
  generateMockTestsForRoadmap(roadmapId, goal).catch((err) => {
    console.warn(
      `[MockTestAutomation] Background failure roadmapId=${roadmapId}: ${err.message}`
    );
  });
}

module.exports = {
  parseMilestoneTopic,
  inferDifficultyFromProgress,
  buildRoadmapAssessmentScope,
  buildRoadmapAssessmentMetadata,
  ensureMockTestForMilestone,
  generateMockTestsForRoadmap,
  scheduleRoadmapMockTestGeneration,
  linkMockTestReferences,
  GENERATION_TIMEOUT_MS,
  STALE_PROCESSING_MS,
};
