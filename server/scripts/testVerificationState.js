/**
 * Deterministic regression tests for task verification UI/API state.
 * Run: node scripts/testVerificationState.js
 */
const {
  hasLinkedMockTest,
  resolveVerificationUiState,
  getInlineVerificationBlockReason,
  scoreVerificationAnswers,
} = require('../utils/taskVerificationState');
const { buildVerificationContext } = require('../services/taskContextService');
const { validateQuestions } = require('../services/verificationAiService');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

const enrichedGuide = {
  overview: 'Learn string manipulation in Java',
  whatToLearn: ['String class', 'immutability', 'common methods'],
  keyConcepts: ['charAt', 'substring', 'length'],
  learningSteps: ['Review String API', 'Practice indexing'],
  examples: ['"hello".substring(1)'],
  practicalApplications: [],
  commonMistakes: [],
  prerequisites: [],
  practiceSuggestions: [],
  expectedOutcome: 'Use core String methods confidently',
};

const baseTask = {
  title: 'Week 5: Strings',
  description: 'Understand Java String fundamentals',
  source: 'roadmap-generated',
  completed: false,
  mockTest: null,
  enrichmentStatus: 'completed',
  learningGuide: enrichedGuide,
  resources: [
    {
      title: 'Oracle Java Documentation',
      description: 'Official String class reference',
      category: 'official',
    },
  ],
};

console.log('\n=== Verification state regression tests ===\n');

console.log('A. Pending task + no mock test');
const inlineReady = { ...baseTask, source: 'manual', mockTest: null };
assert(
  resolveVerificationUiState(inlineReady) === 'ready',
  'pending task without mock test is ready for verification'
);
assert(
  getInlineVerificationBlockReason(inlineReady) === null,
  'API allows verification start without mock test'
);

console.log('\nB. Pending task + linked mock test');
const mockLinked = {
  ...baseTask,
  mockTest: '507f1f77bcf86cd799439011',
};
assert(
  resolveVerificationUiState(mockLinked) === 'ready',
  'pending task with linked mock test is still ready for task-level verification'
);
assert(
  getInlineVerificationBlockReason(mockLinked) === null,
  'API does not block verification when mockTest is linked'
);
assert(hasLinkedMockTest(mockLinked) === true, 'mock test link is detected independently');

console.log('\nC. Completed task via task verification');
const completedInline = {
  ...baseTask,
  completed: true,
  mockTest: null,
};
assert(
  resolveVerificationUiState(completedInline) === 'completed',
  'completed task shows completed verification state'
);
assert(
  getInlineVerificationBlockReason(completedInline) === 'Task is already completed.',
  'completed task cannot start another verification'
);

console.log('\nD. Completed task with linked mock test');
const completedMock = {
  ...baseTask,
  completed: true,
  mockTest: '507f1f77bcf86cd799439011',
};
assert(
  resolveVerificationUiState(completedMock) === 'completed',
  'completed task with linked mock test shows completed state'
);
assert(
  getInlineVerificationBlockReason(completedMock) === 'Task is already completed.',
  'completed task with mock test cannot start another verification'
);

console.log('\nE. Enrichment pending');
const pending = {
  ...baseTask,
  enrichmentStatus: 'pending',
  learningGuide: {},
};
assert(
  resolveVerificationUiState(pending) === 'preparing',
  'pending enrichment shows preparing state'
);
assert(
  getInlineVerificationBlockReason(pending) === 'Task learning content is still being prepared. Please wait and try again.',
  'API blocks verification while enrichment is pending'
);

console.log('\nF. Enrichment failed');
const failedEnrichment = {
  ...baseTask,
  enrichmentStatus: 'failed',
  learningGuide: {},
};
assert(
  resolveVerificationUiState(failedEnrichment) === 'enrichment-failed',
  'failed enrichment shows failure state'
);
assert(
  getInlineVerificationBlockReason(failedEnrichment) === 'Task enrichment failed. Learning content is unavailable for verification.',
  'API blocks verification when enrichment failed'
);

console.log('\nVerification scoring');
const sampleQuestions = [
  { correctOption: 'A', explanation: 'Concept A' },
  { correctOption: 'B', explanation: 'Concept B' },
  { correctOption: 'C', explanation: 'Concept C' },
  { correctOption: 'D', explanation: 'Concept D' },
  { correctOption: 'A', explanation: 'Concept E' },
];
const passResult = scoreVerificationAnswers(sampleQuestions, ['A', 'B', 'C', 'D', 'A']);
assert(passResult.score === 5 && passResult.passed === true, '5/5 passes verification');

const thresholdPass = scoreVerificationAnswers(sampleQuestions, ['A', 'B', 'C', 'X', 'X']);
assert(thresholdPass.score === 3 && thresholdPass.passed === true, '3/5 passes verification threshold');

const failResult = scoreVerificationAnswers(sampleQuestions, ['B', 'A', 'X', 'X', 'X']);
assert(failResult.score === 0 && failResult.passed === false, '0/5 fails verification');

console.log('\nLearning scope for question generation');
const learningScope = buildVerificationContext(baseTask, {
  task: baseTask,
  goal: { title: 'Java Developer Roadmap', description: 'Become job-ready in Java' },
  roadmap: { title: 'Java Developer Roadmap' },
  milestone: { title: 'Week 5: Strings', description: 'String fundamentals' },
});
assert(learningScope.includes('Week 5: Strings'), 'learning scope includes task title');
assert(learningScope.includes('String class'), 'learning scope includes guide content');
assert(learningScope.includes('Oracle Java Documentation'), 'learning scope includes trusted resource titles');
assert(learningScope.includes('Official String class reference'), 'learning scope includes trusted resource descriptions');
assert(learningScope.includes('Milestone title: Week 5: Strings'), 'learning scope includes milestone context');

console.log('\nQuestion format validation');
const validQuestions = Array.from({ length: 5 }, (_, index) => ({
  questionText: `Question ${index + 1}?`,
  options: [
    { label: 'A', text: 'Option A' },
    { label: 'B', text: 'Option B' },
    { label: 'C', text: 'Option C' },
    { label: 'D', text: 'Option D' },
  ],
  correctOption: 'A',
  explanation: 'Because A is correct.',
}));
assert(validateQuestions(validQuestions) === true, 'verification responses must contain exactly 5 valid questions');

try {
  validateQuestions(validQuestions.slice(0, 4));
  assert(false, 'fewer than 5 questions should fail validation');
} catch (error) {
  assert(error.message.includes('expected exactly 5'), 'validation rejects non-5 question sets');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
