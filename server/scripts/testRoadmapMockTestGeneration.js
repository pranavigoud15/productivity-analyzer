/**
 * Deterministic tests for roadmap → automatic Mock Test generation.
 * Run: node scripts/testRoadmapMockTestGeneration.js
 */
const {
  parseMilestoneTopic,
  inferDifficultyFromProgress,
  buildRoadmapAssessmentScope,
  buildRoadmapAssessmentMetadata,
} = require('../services/roadmapMockTestService');
const { canUserAccessMockTest } = require('../services/mockTestService');

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

function makeRoadmapContext({ goalTitle, milestoneTitle, weekNumber = 1, totalWeeks = 4 }) {
  const goal = { _id: 'goal1', title: goalTitle, description: `Learn ${goalTitle}` };
  const roadmap = {
    _id: 'roadmap1',
    user: 'user1',
    goal: goal._id,
    title: `Roadmap: ${goalTitle}`,
    milestones: Array.from({ length: totalWeeks }, (_, index) => ({
      _id: `milestone-${index + 1}`,
      weekNumber: index + 1,
      title: index === weekNumber - 1 ? milestoneTitle : `Week ${index + 1}: Module ${index + 1}`,
      description: '',
    })),
  };
  const milestone = roadmap.milestones[weekNumber - 1];
  const task = {
    _id: `task-${weekNumber}`,
    title: milestone.title,
    description: `Study and apply concepts from ${parseMilestoneTopic(milestone.title)}.`,
  };

  return { goal, roadmap, milestone, task };
}

const DOMAIN_CASES = [
  ['Java Fundamentals', 'Week 1: Java Fundamentals', 'Java Fundamentals'],
  ['Python Fundamentals', 'Week 1: Python Fundamentals', 'Python Fundamentals'],
  ['Data Structures', 'Week 2: Arrays', 'Arrays'],
  ['Machine Learning', 'Week 3: Intro to Machine Learning', 'Intro to Machine Learning'],
  ['Learn Thermodynamics', 'Week 2: First Law', 'First Law'],
  ['Medicine Basics', 'Week 1: Pharmacology', 'Pharmacology'],
  ['Contract Law', 'Week 1: Offer and Acceptance', 'Offer and Acceptance'],
  ['Finance', 'Week 1: Capital Budgeting', 'Capital Budgeting'],
  ['Calculus', 'Week 2: Differentiation', 'Differentiation'],
  ['Underwater Basket Weaving', 'Week 1: Pattern Design', 'Pattern Design'],
];

console.log('\n=== Roadmap Mock Test generation tests ===\n');

console.log('Generic milestone topic parsing');
for (const [, milestoneTitle, expectedTopic] of DOMAIN_CASES) {
  assert(parseMilestoneTopic(milestoneTitle) === expectedTopic, `${milestoneTitle} → ${expectedTopic}`);
}

console.log('\nAssessment metadata is domain-agnostic');
for (const [goalTitle, milestoneTitle, expectedTopic] of DOMAIN_CASES) {
  const context = makeRoadmapContext({ goalTitle, milestoneTitle });
  const metadata = buildRoadmapAssessmentMetadata(context);
  assert(metadata.topic === expectedTopic, `${goalTitle} metadata topic is ${expectedTopic}`);
  assert(metadata.title === `${expectedTopic} Assessment`, `${goalTitle} assessment title is scoped`);
  assert(metadata.subject.includes(goalTitle) || metadata.subject.length > 0, `${goalTitle} metadata has subject`);
  assert(metadata.source === 'roadmap-generated', `${goalTitle} metadata source is roadmap-generated`);
  assert(metadata.user === 'user1', `${goalTitle} metadata belongs to user`);
  assert(metadata.roadmap === 'roadmap1', `${goalTitle} metadata links roadmap`);
  assert(metadata.milestone === context.milestone._id, `${goalTitle} metadata links milestone`);
}

console.log('\nAssessment scope includes learning context');
const thermo = makeRoadmapContext({
  goalTitle: 'Learn Thermodynamics',
  milestoneTitle: 'Week 2: First Law',
  weekNumber: 2,
});
const thermoScope = buildRoadmapAssessmentScope(thermo);
assert(thermoScope.includes('Learn Thermodynamics'), 'scope includes goal title');
assert(thermoScope.includes('First Law'), 'scope includes milestone topic');

console.log('\nDuplicate prevention key is deterministic');
const first = buildRoadmapAssessmentMetadata(makeRoadmapContext({
  goalTitle: 'Learn Java',
  milestoneTitle: 'Week 1: Java Fundamentals',
}));
const second = buildRoadmapAssessmentMetadata(makeRoadmapContext({
  goalTitle: 'Learn Java',
  milestoneTitle: 'Week 1: Java Fundamentals',
}));
assert(
  first.user === second.user
  && String(first.roadmap) === String(second.roadmap)
  && String(first.milestone) === String(second.milestone),
  'same roadmap milestone produces the same idempotency key'
);

console.log('\nDifficulty progression is generic');
assert(inferDifficultyFromProgress(1, 6) === 'Easy', 'early milestone is Easy');
assert(inferDifficultyFromProgress(3, 6) === 'Medium', 'middle milestone is Medium');
assert(inferDifficultyFromProgress(6, 6) === 'Hard', 'late milestone is Hard');

console.log('\nUser ownership / visibility');
const publicTest = { user: null, source: 'public' };
const personalTest = { user: 'user1', source: 'roadmap-generated' };
const otherUserTest = { user: 'user2', source: 'roadmap-generated' };
assert(canUserAccessMockTest(publicTest, 'user1') === true, 'public test visible to any user');
assert(canUserAccessMockTest(personalTest, 'user1') === true, 'personalized test visible to owner');
assert(canUserAccessMockTest(otherUserTest, 'user1') === false, 'another user\'s personalized test is hidden');

console.log('\nGeneration timeout and concurrency exports');
const { GENERATION_TIMEOUT_MS, STALE_PROCESSING_MS } = require('../services/roadmapMockTestService');
assert(GENERATION_TIMEOUT_MS >= 30000 && GENERATION_TIMEOUT_MS <= 180000, 'generation timeout is within reasonable bounds');
assert(STALE_PROCESSING_MS <= 10 * 60 * 1000, 'stale processing window is bounded');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
