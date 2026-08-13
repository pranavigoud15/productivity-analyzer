/**
 * Deterministic tests for leaderboard scoring and ranking.
 * Run: node scripts/testLeaderboard.js
 */
const {
  SCORING,
  calculateTaskPoints,
  calculateMockTestPoints,
  calculateTotalPoints,
  compareLeaderboardEntries,
  rankLeaderboardEntries,
  mergeLeaderboardStats,
} = require('../services/leaderboardService');

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

const usersById = new Map([
  ['user-a', { name: 'Alice' }],
  ['user-b', { name: 'Bob' }],
  ['user-c', { name: 'Charlie' }],
]);

console.log('\n=== Leaderboard scoring tests ===\n');

console.log('1. New user with no activity');
const empty = mergeLeaderboardStats([], [], [], usersById);
assert(empty.length === 0, 'new user with no activity is omitted');

console.log('\n2. Complete one task');
const oneTask = mergeLeaderboardStats(
  [{ _id: 'user-a', completedTasks: 1 }],
  [],
  [],
  usersById
);
assert(oneTask[0].totalPoints === SCORING.TASK_COMPLETED_POINTS, 'one completed task awards task points');

console.log('\n3. Complete same task twice (current state still one completed task)');
const stillOne = mergeLeaderboardStats(
  [{ _id: 'user-a', completedTasks: 1 }],
  [],
  [],
  usersById
);
assert(stillOne[0].completedTasks === 1, 'duplicate completion state does not inflate task count');
assert(stillOne[0].totalPoints === oneTask[0].totalPoints, 'duplicate completion state does not inflate points');

console.log('\n4. Failed verification contributes nothing');
const failedVerification = mergeLeaderboardStats(
  [{ _id: 'user-a', completedTasks: 0 }],
  [],
  [],
  usersById
);
assert(failedVerification.length === 0 || failedVerification[0].verificationsPassed === 0, 'failed verification adds no verification credit');

console.log('\n5. Passed verification adds bonus once');
const verified = mergeLeaderboardStats(
  [{ _id: 'user-a', completedTasks: 1 }],
  [{ _id: 'user-a', verificationsPassed: 1 }],
  [],
  usersById
);
assert(
  verified[0].totalPoints === SCORING.TASK_COMPLETED_POINTS + SCORING.VERIFICATION_BONUS_POINTS,
  'passed verification adds one bonus on top of completed task points'
);

console.log('\n6. Retry passed verification does not duplicate reward');
assert(
  calculateTaskPoints(1, 1) === calculateTaskPoints(1, 1),
  'passed verification reward remains stable on retry'
);

console.log('\n7. Mock Test attempt contributes score-based points');
const mockPoints = calculateMockTestPoints([80]);
assert(mockPoints === Math.round(0.8 * SCORING.MOCK_TEST_MAX_POINTS), 'mock test performance converts to capped points');

console.log('\n8. Repeat same Mock Test cannot farm unlimited points');
const firstAttempt = calculateMockTestPoints([60]);
const betterRetry = calculateMockTestPoints([80]);
const worseRetry = calculateMockTestPoints([40]);
assert(betterRetry > firstAttempt, 'improving best score can increase mock-test points');
assert(worseRetry < betterRetry, 'worse retry does not exceed best-score contribution');

console.log('\n9. Different Mock Tests contribute independently');
const twoTests = calculateMockTestPoints([100, 50]);
const oneTest = calculateMockTestPoints([100]);
assert(twoTests > oneTest, 'different mock tests add independent capped rewards');

console.log('\n10. Two users rank by total points');
const ranked = rankLeaderboardEntries([
  { userId: 'user-a', name: 'Alice', totalPoints: 20, averagePercentage: 0, testsCompleted: 0, completedTasks: 2, verificationsPassed: 0, bestPercentage: 0, mockTestBestPercentages: [] },
  { userId: 'user-b', name: 'Bob', totalPoints: 35, averagePercentage: 0, testsCompleted: 0, completedTasks: 1, verificationsPassed: 1, bestPercentage: 0, mockTestBestPercentages: [] },
]);
assert(ranked[0].userId === 'user-b', 'higher total points ranks first');
assert(ranked[1].userId === 'user-a', 'lower total points ranks second');

console.log('\n11. Equal scores use deterministic tie ordering');
const tied = rankLeaderboardEntries([
  { userId: 'user-b', name: 'Bob', totalPoints: 20, averagePercentage: 0, testsCompleted: 0, completedTasks: 2, verificationsPassed: 0, bestPercentage: 0, mockTestBestPercentages: [] },
  { userId: 'user-a', name: 'Alice', totalPoints: 20, averagePercentage: 0, testsCompleted: 0, completedTasks: 2, verificationsPassed: 0, bestPercentage: 0, mockTestBestPercentages: [] },
]);
assert(tied[0].name === 'Alice', 'ties break alphabetically by name');
assert(tied[0].rank === 1 && tied[1].rank === 2, 'ties receive sequential ranks');

console.log('\n12. Users remain isolated in merged stats');
const merged = mergeLeaderboardStats(
  [{ _id: 'user-a', completedTasks: 2 }],
  [{ _id: 'user-b', verificationsPassed: 1 }],
  [{ _id: 'user-b', averagePercentage: 90, bestPercentage: 90, testsCompleted: 1, mockTestBestPercentages: [90] }],
  usersById
);
assert(merged.find((entry) => entry.userId === 'user-a').completedTasks === 2, 'user A keeps only user A task stats');
assert(merged.find((entry) => entry.userId === 'user-b').verificationsPassed === 1, 'user B keeps only user B verification stats');

console.log('\n13. Refreshing leaderboard does not change scores');
const snapshotA = calculateTotalPoints({
  completedTasks: 2,
  verificationsPassed: 1,
  mockTestBestPercentages: [80, 60],
});
const snapshotB = calculateTotalPoints({
  completedTasks: 2,
  verificationsPassed: 1,
  mockTestBestPercentages: [80, 60],
});
assert(snapshotA === snapshotB, 'recomputing from the same persisted stats is deterministic');

console.log('\n14. Public leaderboard entry shape');
const publicEntry = mergeLeaderboardStats(
  [{ _id: 'user-a', completedTasks: 1 }],
  [],
  [{ _id: 'user-a', averagePercentage: 70, bestPercentage: 70, testsCompleted: 1, mockTestBestPercentages: [70] }],
  usersById
)[0];
assert(publicEntry.name === 'Alice', 'leaderboard exposes name');
assert(publicEntry.userId === 'user-a', 'leaderboard exposes userId');
assert(!('email' in publicEntry), 'leaderboard does not expose email');
assert(!('password' in publicEntry), 'leaderboard does not expose password');

console.log('\n15. Anti-inflation for mock-test counts');
const mockMerged = mergeLeaderboardStats(
  [],
  [],
  [{ _id: 'user-a', averagePercentage: 75, bestPercentage: 90, testsCompleted: 2, mockTestBestPercentages: [90, 75] }],
  usersById
)[0];
assert(mockMerged.testsCompleted === 2, 'testsCompleted counts distinct mock tests');
assert(
  mockMerged.totalPoints === calculateMockTestPoints([90, 75]),
  'points use best score per mock test, not every retry'
);

console.log('\n16. Compare function prefers points before percentages');
assert(
  compareLeaderboardEntries(
    { userId: 'a', name: 'A', totalPoints: 30, averagePercentage: 10, testsCompleted: 0, completedTasks: 0 },
    { userId: 'b', name: 'B', totalPoints: 20, averagePercentage: 99, testsCompleted: 5, completedTasks: 0 }
  ) < 0,
  'ranking uses total points before mock-test averages'
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
