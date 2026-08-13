/**
 * Daily assessment regression tests — run with: node scripts/testDailyAssessment.js
 */
require('dotenv').config();
const { normaliseQuestionCount } = require('../services/mockTestQuestionService');
const {
  ALLOWED_QUESTION_COUNTS,
  resolveAdaptiveDifficulty,
  buildAttemptInsights,
} = require('../services/dailyAssessmentService');

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

console.log('\n=== Daily Assessment regression tests ===\n');

console.log('Question count support');
for (const count of ALLOWED_QUESTION_COUNTS) {
  assert(normaliseQuestionCount(count) === count, `${count} questions accepted`);
}
assert(normaliseQuestionCount(7) === 7, 'intermediate counts still allowed within 5-30');
assert(normaliseQuestionCount(30) === 30, 'maximum is 30');

console.log('\nAdaptive difficulty (history-based)');
(async () => {
  const mongoose = require('mongoose');
  const MockTestAttempt = require('../models/MockTestAttempt');

  if (!process.env.MONGO_URI) {
    console.log('  (skipped DB adaptive tests — MONGO_URI not set)');
  } else {
    await mongoose.connect(process.env.MONGO_URI);
    const userId = new mongoose.Types.ObjectId();

    assert(await resolveAdaptiveDifficulty(userId) === 'Medium', 'no history defaults to Medium');

    await MockTestAttempt.create({
      user: userId,
      mockTest: new mongoose.Types.ObjectId(),
      subject: 'Test',
      topic: 'Topic',
      difficulty: 'Medium',
      title: 'Test',
      score: 4,
      totalQuestions: 5,
      correctCount: 4,
      incorrectCount: 1,
      unansweredCount: 0,
      percentage: 80,
      startedAt: new Date(),
      completedAt: new Date(),
      timeTakenSeconds: 120,
      questionResults: [],
    });
    await MockTestAttempt.create({
      user: userId,
      mockTest: new mongoose.Types.ObjectId(),
      subject: 'Test',
      topic: 'Topic',
      difficulty: 'Medium',
      title: 'Test 2',
      score: 4,
      totalQuestions: 5,
      correctCount: 4,
      incorrectCount: 1,
      unansweredCount: 0,
      percentage: 80,
      startedAt: new Date(),
      completedAt: new Date(),
      timeTakenSeconds: 120,
      questionResults: [],
    });

    assert(await resolveAdaptiveDifficulty(userId) === 'Hard', 'strong recent history selects Hard');

    await MockTestAttempt.deleteMany({ user: userId });
    await mongoose.disconnect();
  }

  console.log('\nAttempt insights');
  const insights = buildAttemptInsights([
    { questionText: 'Q1', isCorrect: true },
    { questionText: 'Q2', isCorrect: false },
    { questionText: 'Q3', isCorrect: true },
  ]);
  assert(insights.correctCount === 2, 'insights count correct answers');
  assert(insights.incorrectCount === 1, 'insights count incorrect answers');
  assert(insights.strongAreas.length === 2, 'insights include strong areas');
  assert(insights.weakAreas.length === 1, 'insights include weak areas');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
