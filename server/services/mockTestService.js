const MockTest = require('../models/MockTest');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const {
  buildAssessmentScope,
  generateMockTestQuestions,
  normaliseQuestionCount,
  DEFAULT_QUESTION_COUNT,
} = require('./mockTestQuestionService');

function sanitiseQuestionsForClient(questions = []) {
  return questions.map((question) => ({
    _id: question._id,
    questionText: question.questionText,
    options: question.options,
  }));
}

function sanitiseTestForClient(test) {
  const plain = test.toObject ? test.toObject() : test;
  return {
    ...plain,
    totalQuestions: plain.questions?.length || 0,
    questions: sanitiseQuestionsForClient(plain.questions || []),
  };
}

async function listPublishedTests() {
  return MockTest.aggregate([
    { $match: { isPublished: true } },
    {
      $addFields: {
        totalQuestions: { $size: { $ifNull: ['$questions', []] } },
      },
    },
    { $project: { questions: 0 } },
    { $sort: { subject: 1, difficulty: 1, title: 1 } },
  ]);
}

async function collectUserLearningTerms(userId) {
  const [goals, tasks] = await Promise.all([
    Goal.find({ user: userId }, 'title description').lean(),
    Task.find({ user: userId }, 'title description enrichmentMetadata').lean(),
  ]);

  const terms = new Set();

  for (const goal of goals) {
    if (goal.title?.trim()) terms.add(goal.title.trim());
    if (goal.description?.trim()) terms.add(goal.description.trim());
  }

  for (const task of tasks) {
    if (task.title?.trim()) terms.add(task.title.trim());
    if (task.description?.trim()) terms.add(task.description.trim());
    if (task.enrichmentMetadata?.subject?.trim()) terms.add(task.enrichmentMetadata.subject.trim());
    if (task.enrichmentMetadata?.topic?.trim()) terms.add(task.enrichmentMetadata.topic.trim());
  }

  return [...terms];
}

function isTestRelevantToTerms(test, terms) {
  if (!terms.length) return true;

  const haystack = [
    test.title,
    test.subject,
    test.topic,
  ].filter(Boolean).join(' ').toLowerCase();

  return terms.some((term) => {
    const needle = term.toLowerCase();
    if (!needle) return false;
    return haystack.includes(needle) || needle.includes(test.subject?.toLowerCase() || '') || needle.includes(test.topic?.toLowerCase() || '');
  });
}

async function listPublishedTestsForUser(userId, { relevantOnly = false } = {}) {
  const visibilityMatch = userId
    ? {
      $or: [
        { user: null },
        { user: { $exists: false } },
        { user: userId },
      ],
    }
    : {
      $or: [
        { user: null },
        { user: { $exists: false } },
      ],
    };

  const tests = await MockTest.aggregate([
    {
      $match: {
        ...visibilityMatch,
        $or: [
          { generationStatus: 'completed', isPublished: true },
          { generationStatus: { $exists: false }, isPublished: true },
          { user: userId, generationStatus: { $in: ['processing', 'failed'] } },
        ],
      },
    },
    {
      $addFields: {
        totalQuestions: { $size: { $ifNull: ['$questions', []] } },
      },
    },
    { $project: { questions: 0 } },
    { $sort: { source: 1, subject: 1, difficulty: 1, title: 1 } },
  ]);

  if (!relevantOnly || !userId) return tests;

  const terms = await collectUserLearningTerms(userId);
  if (!terms.length) return tests;

  const userOwned = tests.filter((test) => String(test.user) === String(userId));
  const relevantPublic = tests.filter(
    (test) => !test.user && test.source !== 'roadmap-generated' && isTestRelevantToTerms(test, terms)
  );
  const combined = [...userOwned, ...relevantPublic.filter((test) => !userOwned.some((owned) => String(owned._id) === String(test._id)))];

  return combined.length ? combined : tests;
}

function canUserAccessMockTest(test, userId) {
  if (!test) return false;
  if (!test.user) return true;
  return String(test.user) === String(userId);
}

function assertTestStartable(test) {
  if (!test) {
    const error = new Error('Mock test not found.');
    error.statusCode = 404;
    throw error;
  }

  if (test.generationStatus === 'processing') {
    const error = new Error('This mock test is still being generated. Please check back shortly.');
    error.statusCode = 409;
    throw error;
  }

  if (test.generationStatus === 'failed') {
    const error = new Error(test.generationError || 'This mock test could not be generated.');
    error.statusCode = 422;
    throw error;
  }

  if (!test.isPublished) {
    const error = new Error('Mock test not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!Array.isArray(test.questions) || test.questions.length === 0) {
    const error = new Error('This mock test has no questions available.');
    error.statusCode = 422;
    throw error;
  }
}

function scoreMockTestAttempt(test, answers = {}) {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  const questionResults = test.questions.map((question) => {
    const id = String(question._id);
    const selected = answers[id] || null;
    const isCorrect = selected === question.correctOption;

    if (!selected) unansweredCount += 1;
    else if (isCorrect) correctCount += 1;
    else incorrectCount += 1;

    return {
      questionId: question._id,
      questionText: question.questionText,
      options: question.options,
      correctOption: question.correctOption,
      selectedOption: selected,
      isCorrect,
      explanation: question.explanation || '',
    };
  });

  const percentage = Math.round((correctCount / test.questions.length) * 10000) / 100;

  return {
    correctCount,
    incorrectCount,
    unansweredCount,
    questionResults,
    percentage,
    score: correctCount,
    totalQuestions: test.questions.length,
  };
}

async function createMockTestFromMetadata(input = {}) {
  const {
    title,
    subject,
    topic,
    difficulty,
    durationMinutes,
    questionCount,
    scope,
    description,
    tags,
    passingPercentage,
    isPublished = true,
    user = null,
    goal = null,
    roadmap = null,
    milestone = null,
    task = null,
    source = user ? 'manual' : 'public',
  } = input;

  if (!title?.trim() || !subject?.trim() || !topic?.trim() || !difficulty) {
    const error = new Error('title, subject, topic, and difficulty are required.');
    error.statusCode = 400;
    throw error;
  }

  const expectedCount = normaliseQuestionCount(questionCount || DEFAULT_QUESTION_COUNT);
  const metadata = {
    title: title.trim(),
    subject: subject.trim(),
    topic: topic.trim(),
    difficulty,
    description: description?.trim() || '',
    scope: scope?.trim() || buildAssessmentScope({
      title,
      subject,
      topic,
      difficulty,
      description,
      tags,
    }),
    tags,
  };

  const questions = await generateMockTestQuestions(metadata, expectedCount);

  const test = await MockTest.create({
    user,
    goal,
    roadmap,
    milestone,
    task,
    source,
    generationStatus: 'completed',
    generationError: '',
    title: metadata.title,
    subject: metadata.subject,
    topic: metadata.topic,
    difficulty,
    durationMinutes: Number(durationMinutes) > 0 ? Number(durationMinutes) : Math.max(15, expectedCount * 2),
    questions,
    isPublished,
    passingPercentage: Number.isFinite(Number(passingPercentage))
      ? Math.min(100, Math.max(0, Number(passingPercentage)))
      : 60,
    aiMetadata: {
      generatedAt: new Date().toISOString(),
      questionCount: expectedCount,
      scopePreview: metadata.scope.slice(0, 500),
    },
  });

  return test;
}

module.exports = {
  listPublishedTests,
  listPublishedTestsForUser,
  collectUserLearningTerms,
  isTestRelevantToTerms,
  canUserAccessMockTest,
  assertTestStartable,
  sanitiseTestForClient,
  sanitiseQuestionsForClient,
  scoreMockTestAttempt,
  createMockTestFromMetadata,
  buildAssessmentScope,
};
