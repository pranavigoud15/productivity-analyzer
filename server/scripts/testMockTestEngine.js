/**
 * Deterministic tests for the domain-agnostic Mock Test engine.
 * Run: node scripts/testMockTestEngine.js
 */
const {
  buildAssessmentScope,
  validateMockQuestions,
  normaliseQuestionCount,
} = require('../services/mockTestQuestionService');
const {
  scoreMockTestAttempt,
  sanitiseTestForClient,
  isTestRelevantToTerms,
  assertTestStartable,
} = require('../services/mockTestService');

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

function makeQuestion(index, correctOption = 'A') {
  return {
    _id: `question-${index}`,
    questionText: `Question ${index}?`,
    options: [
      { label: 'A', text: 'Option A' },
      { label: 'B', text: 'Option B' },
      { label: 'C', text: 'Option C' },
      { label: 'D', text: 'Option D' },
    ],
    correctOption,
    explanation: `Explanation for question ${index}.`,
  };
}

function makeTest(overrides = {}) {
  const questions = overrides.questions || [makeQuestion(1), makeQuestion(2), makeQuestion(3), makeQuestion(4), makeQuestion(5)];
  return {
    _id: '507f1f77bcf86cd799439011',
    title: 'Sample Test',
    subject: 'Sample Subject',
    topic: 'Sample Topic',
    difficulty: 'Medium',
    durationMinutes: 20,
    isPublished: true,
    passingPercentage: 60,
    questions,
    ...overrides,
  };
}

const DOMAIN_CASES = [
  {
    name: 'Java',
    metadata: {
      title: 'Java Strings',
      subject: 'Java',
      topic: 'Strings',
      difficulty: 'Medium',
      scope: 'String immutability, charAt, substring, length, common String methods',
    },
    mustInclude: ['Java', 'Strings', 'String immutability'],
  },
  {
    name: 'Python',
    metadata: {
      title: 'Python Functions',
      subject: 'Python',
      topic: 'Functions',
      difficulty: 'Easy',
      scope: 'def syntax, parameters, return values, scope, lambda basics',
    },
    mustInclude: ['Python', 'Functions', 'def syntax'],
  },
  {
    name: 'DBMS',
    metadata: {
      title: 'DBMS Transactions',
      subject: 'DBMS',
      topic: 'ACID',
      difficulty: 'Medium',
      scope: 'Atomicity, Consistency, Isolation, Durability, rollback, commit',
    },
    mustInclude: ['DBMS', 'ACID', 'Atomicity'],
  },
  {
    name: 'Data Structures',
    metadata: {
      title: 'Arrays and Indexing',
      subject: 'Data Structures',
      topic: 'Arrays',
      difficulty: 'Easy',
      scope: 'array indexing, traversal, insertion, deletion, time complexity',
    },
    mustInclude: ['Data Structures', 'Arrays', 'indexing'],
  },
  {
    name: 'Thermodynamics',
    metadata: {
      title: 'Thermodynamics — First Law',
      subject: 'Thermodynamics',
      topic: 'First Law',
      difficulty: 'Medium',
      scope: 'internal energy, heat, work, energy conservation, closed systems',
    },
    mustInclude: ['Thermodynamics', 'First Law', 'internal energy'],
  },
  {
    name: 'Pharmacology',
    metadata: {
      title: 'Pharmacology Basics',
      subject: 'Medicine',
      topic: 'Pharmacology',
      difficulty: 'Medium',
      scope: 'drug absorption, metabolism, dosage, adverse effects, pharmacokinetics',
    },
    mustInclude: ['Medicine', 'Pharmacology', 'drug absorption'],
  },
  {
    name: 'Contract Law',
    metadata: {
      title: 'Contract Law — Offer and Acceptance',
      subject: 'Law',
      topic: 'Offer and Acceptance',
      difficulty: 'Medium',
      scope: 'offer, acceptance, consideration, revocation, mirror image rule',
    },
    mustInclude: ['Law', 'Offer and Acceptance', 'consideration'],
  },
  {
    name: 'Finance',
    metadata: {
      title: 'Corporate Finance',
      subject: 'Finance',
      topic: 'Capital Budgeting',
      difficulty: 'Medium',
      scope: 'NPV, IRR, cash flows, discount rate, investment decisions',
    },
    mustInclude: ['Finance', 'Capital Budgeting', 'NPV'],
  },
  {
    name: 'Calculus',
    metadata: {
      title: 'Calculus — Differentiation',
      subject: 'Mathematics',
      topic: 'Differentiation',
      difficulty: 'Medium',
      scope: 'derivatives, power rule, product rule, tangent lines, rate of change',
    },
    mustInclude: ['Mathematics', 'Differentiation', 'derivatives'],
  },
  {
    name: 'Arbitrary New Domain',
    metadata: {
      title: 'Underwater Basket Weaving — Pattern Design',
      subject: 'Underwater Basket Weaving',
      topic: 'Pattern Design',
      difficulty: 'Easy',
      scope: 'material preparation, weave tension, spiral patterns, waterproof sealing',
    },
    mustInclude: ['Underwater Basket Weaving', 'Pattern Design', 'weave tension'],
  },
];

console.log('\n=== Mock Test engine regression tests ===\n');

console.log('Question count normalisation');
assert(normaliseQuestionCount(10) === 10, 'accepts valid question count');
assert(normaliseQuestionCount(4) === 5, 'enforces minimum question count');
assert(normaliseQuestionCount(99) === 20, 'enforces maximum question count');

console.log('\nCross-domain assessment scope');
for (const domainCase of DOMAIN_CASES) {
  const scope = buildAssessmentScope(domainCase.metadata);
  for (const fragment of domainCase.mustInclude) {
    assert(scope.includes(fragment), `${domainCase.name} scope includes "${fragment}"`);
  }
}

console.log('\nQuestion validation and count');
const fiveQuestions = Array.from({ length: 5 }, (_, index) => makeQuestion(index + 1));
assert(validateMockQuestions(fiveQuestions, 5) === true, 'accepts exactly 5 valid questions');
try {
  validateMockQuestions(fiveQuestions.slice(0, 4), 5);
  assert(false, 'rejects fewer than expected questions');
} catch (error) {
  assert(error.message.includes('expected exactly 5'), 'validation reports wrong question count');
}

console.log('\nStart test sanitisation');
const test = makeTest();
const clientTest = sanitiseTestForClient(test);
assert(clientTest.totalQuestions === 5, 'client payload exposes actual question count');
assert(clientTest.questions.length === 5, 'start test returns usable questions');
assert(clientTest.questions.every((question) => !('correctOption' in question)), 'correct answers are not exposed before submission');
assert(clientTest.questions.every((question) => !('explanation' in question)), 'explanations are not exposed before submission');

console.log('\nEmpty/broken test handling');
try {
  assertTestStartable(makeTest({ questions: [] }));
  assert(false, 'empty test should be rejected');
} catch (error) {
  assert(error.statusCode === 422, 'empty test returns safe 422 status');
}

try {
  assertTestStartable(makeTest({ isPublished: false }));
  assert(false, 'unpublished test should be rejected');
} catch (error) {
  assert(error.statusCode === 404, 'unpublished test returns 404');
}

console.log('\nServer-side scoring');
const scoringTest = makeTest({
  questions: [
    makeQuestion(1, 'A'),
    makeQuestion(2, 'B'),
    makeQuestion(3, 'C'),
    makeQuestion(4, 'D'),
    makeQuestion(5, 'A'),
  ],
});
const answers = Object.fromEntries(
  scoringTest.questions.map((question, index) => {
    const labels = ['A', 'B', 'C', 'D', 'A'];
    return [String(question._id), labels[index]];
  })
);
const passResult = scoreMockTestAttempt(scoringTest, answers);
assert(passResult.score === 5 && passResult.percentage === 100, 'full score calculates correctly');
assert(passResult.totalQuestions === 5, 'score uses actual question count');

const partialAnswers = Object.fromEntries(
  scoringTest.questions.slice(0, 3).map((question, index) => [String(question._id), ['A', 'B', 'C'][index]])
);
const thresholdResult = scoreMockTestAttempt(scoringTest, partialAnswers);
assert(thresholdResult.score === 3, 'partial score counts answered questions only');
assert(thresholdResult.unansweredCount === 2, 'unanswered questions are tracked');

console.log('\nLearning-context relevance (generic matching)');
const thermoTest = {
  title: 'Thermodynamics — First Law',
  subject: 'Thermodynamics',
  topic: 'First Law',
};
const userTerms = ['Learn Thermodynamics', 'First Law', 'Entropy'];
assert(isTestRelevantToTerms(thermoTest, userTerms) === true, 'relevant test matches user learning terms');
assert(isTestRelevantToTerms({ title: 'Java OOP', subject: 'Java', topic: 'OOP' }, userTerms) === false, 'irrelevant test is filtered out');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
