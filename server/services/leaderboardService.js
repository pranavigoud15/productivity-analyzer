const User = require('../models/User');
const Task = require('../models/Task');
const TaskVerificationAttempt = require('../models/TaskVerificationAttempt');
const MockTestAttempt = require('../models/MockTestAttempt');

const SCORING = {
  TASK_COMPLETED_POINTS: 10,
  VERIFICATION_BONUS_POINTS: 5,
  MOCK_TEST_MAX_POINTS: 20,
};

function calculateTaskPoints(completedTasks = 0, verificationsPassed = 0) {
  return (completedTasks * SCORING.TASK_COMPLETED_POINTS)
    + (verificationsPassed * SCORING.VERIFICATION_BONUS_POINTS);
}

function calculateMockTestPoints(mockTestBestPercentages = []) {
  return mockTestBestPercentages.reduce(
    (sum, percentage) => sum + Math.round((percentage / 100) * SCORING.MOCK_TEST_MAX_POINTS),
    0
  );
}

function calculateTotalPoints({
  completedTasks = 0,
  verificationsPassed = 0,
  mockTestBestPercentages = [],
}) {
  return calculateTaskPoints(completedTasks, verificationsPassed)
    + calculateMockTestPoints(mockTestBestPercentages);
}

function compareLeaderboardEntries(a, b) {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  if (b.averagePercentage !== a.averagePercentage) return b.averagePercentage - a.averagePercentage;
  if (b.testsCompleted !== a.testsCompleted) return b.testsCompleted - a.testsCompleted;
  if (b.completedTasks !== a.completedTasks) return b.completedTasks - a.completedTasks;

  const nameA = (a.name || '').toLowerCase();
  const nameB = (b.name || '').toLowerCase();
  if (nameA !== nameB) return nameA.localeCompare(nameB);

  return String(a.userId).localeCompare(String(b.userId));
}

function rankLeaderboardEntries(entries = []) {
  return [...entries]
    .sort(compareLeaderboardEntries)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

async function aggregateCompletedTasksByUser() {
  return Task.aggregate([
    { $match: { completed: true } },
    { $group: { _id: '$user', completedTasks: { $sum: 1 } } },
  ]);
}

async function aggregatePassedVerificationsByUser() {
  return TaskVerificationAttempt.aggregate([
    { $match: { passed: true, completedAt: { $ne: null } } },
    { $group: { _id: { user: '$user', task: '$task' } } },
    { $group: { _id: '$_id.user', verificationsPassed: { $sum: 1 } } },
  ]);
}

async function aggregateMockTestStatsByUser() {
  return MockTestAttempt.aggregate([
    { $sort: { percentage: -1, completedAt: 1 } },
    {
      $group: {
        _id: { user: '$user', mockTest: '$mockTest' },
        percentage: { $first: '$percentage' },
      },
    },
    {
      $group: {
        _id: '$_id.user',
        averagePercentage: { $avg: '$percentage' },
        bestPercentage: { $max: '$percentage' },
        testsCompleted: { $sum: 1 },
        mockTestBestPercentages: { $push: '$percentage' },
      },
    },
  ]);
}

function mergeLeaderboardStats(taskRows, verificationRows, mockRows, usersById) {
  const merged = new Map();

  const ensure = (userId) => {
    const key = String(userId);
    if (!merged.has(key)) {
      merged.set(key, {
        userId: key,
        name: usersById.get(key)?.name || 'Student',
        completedTasks: 0,
        verificationsPassed: 0,
        testsCompleted: 0,
        averagePercentage: 0,
        bestPercentage: 0,
        mockTestBestPercentages: [],
        totalPoints: 0,
      });
    }
    return merged.get(key);
  };

  for (const row of taskRows) {
    const entry = ensure(row._id);
    entry.completedTasks = row.completedTasks;
  }

  for (const row of verificationRows) {
    const entry = ensure(row._id);
    entry.verificationsPassed = row.verificationsPassed;
  }

  for (const row of mockRows) {
    const entry = ensure(row._id);
    entry.testsCompleted = row.testsCompleted;
    entry.averagePercentage = Math.round(row.averagePercentage * 10) / 10;
    entry.bestPercentage = Math.round(row.bestPercentage * 10) / 10;
    entry.mockTestBestPercentages = row.mockTestBestPercentages || [];
  }

  for (const entry of merged.values()) {
    entry.totalPoints = calculateTotalPoints(entry);
  }

  return [...merged.values()];
}

async function buildLeaderboardEntries() {
  const [taskRows, verificationRows, mockRows, users] = await Promise.all([
    aggregateCompletedTasksByUser(),
    aggregatePassedVerificationsByUser(),
    aggregateMockTestStatsByUser(),
    User.find({}, 'name').lean(),
  ]);

  const usersById = new Map(users.map((user) => [String(user._id), user]));
  return mergeLeaderboardStats(taskRows, verificationRows, mockRows, usersById);
}

async function getRankedLeaderboard(currentUserId) {
  const entries = rankLeaderboardEntries(await buildLeaderboardEntries());
  const top20 = entries.slice(0, 20);
  const myEntry = entries.find((entry) => entry.userId === String(currentUserId)) || null;

  return {
    leaderboard: top20,
    myEntry,
    totalParticipants: entries.length,
  };
}

module.exports = {
  SCORING,
  calculateTaskPoints,
  calculateMockTestPoints,
  calculateTotalPoints,
  compareLeaderboardEntries,
  rankLeaderboardEntries,
  mergeLeaderboardStats,
  buildLeaderboardEntries,
  getRankedLeaderboard,
};
