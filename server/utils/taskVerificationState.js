const { isGuideEmpty } = require('../services/taskResourceService');

function hasLinkedMockTest(task) {
  const mockTest = task?.mockTest;
  if (mockTest == null) return false;
  if (typeof mockTest === 'string') return mockTest.length > 0;
  if (typeof mockTest === 'object' && mockTest._id != null) return true;
  return Boolean(mockTest);
}

function isEnrichmentReady(task) {
  return task?.enrichmentStatus === 'completed' && !isGuideEmpty(task?.learningGuide);
}

/**
 * Pure UI/API gate for task-level 5-question verification.
 * Linked mock tests are independent — they never block this flow.
 */
function resolveVerificationUiState(task, options = {}) {
  const { enrichmentLoading = false } = options;

  if (!task) return 'hidden';

  if (task.completed) {
    return 'completed';
  }

  if (task.enrichmentStatus === 'failed') {
    return 'enrichment-failed';
  }

  if (
    enrichmentLoading
    || task.enrichmentStatus === 'pending'
    || task.enrichmentStatus === 'processing'
    || !isEnrichmentReady(task)
  ) {
    return 'preparing';
  }

  return 'ready';
}

function getInlineVerificationBlockReason(task) {
  if (!task) return 'Task not found.';
  if (task.completed) return 'Task is already completed.';
  if (task.enrichmentStatus === 'failed') {
    return 'Task enrichment failed. Learning content is unavailable for verification.';
  }
  if (!isEnrichmentReady(task)) {
    return 'Task learning content is still being prepared. Please wait and try again.';
  }
  return null;
}

function scoreVerificationAnswers(questions, answers) {
  if (!Array.isArray(questions) || questions.length !== 5) {
    throw new Error('Verification requires exactly 5 questions.');
  }
  if (!Array.isArray(answers) || answers.length !== 5) {
    throw new Error('Exactly 5 answers are required.');
  }

  let score = 0;
  const results = questions.map((question, index) => {
    const isCorrect = answers[index] === question.correctOption;
    if (isCorrect) score += 1;
    return { isCorrect, explanation: question.explanation };
  });

  return {
    score,
    passed: score >= 3,
    results,
  };
}

module.exports = {
  hasLinkedMockTest,
  isEnrichmentReady,
  resolveVerificationUiState,
  getInlineVerificationBlockReason,
  scoreVerificationAnswers,
};
