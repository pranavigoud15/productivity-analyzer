const User = require('../models/User');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const TaskVerificationAttempt = require('../models/TaskVerificationAttempt');
const MockTestAttempt = require('../models/MockTestAttempt');
const FocusSession = require('../models/FocusSession');

async function leaderboardRows() {
  return MockTestAttempt.aggregate([
    { $sort: { percentage: -1, completedAt: 1 } },
    { $group: { _id: { user: '$user', mockTest: '$mockTest' }, percentage: { $first: '$percentage' } } },
    { $group: { _id: '$_id.user', averagePercentage: { $avg: '$percentage' }, bestPercentage: { $max: '$percentage' }, testsCompleted: { $sum: 1 } } },
    { $sort: { averagePercentage: -1, testsCompleted: -1, bestPercentage: -1 } },
  ]);
}

function toActivity(type, user, occurredAt, detail) {
  return { type, user: String(user), occurredAt, detail };
}

exports.getAnalytics = async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [users, totalUsers, totalTasks, completedTasks, goalsCreated, goalsCompleted, roadmaps, verificationAttempts, verificationPassed, mockStats, focusStats, resourceStats, recentTasks, recentGoals, recentVerifications, recentMocks, recentFocus, leaderboard, activeTaskUsers, activeGoalUsers, activeVerificationUsers, activeMockUsers, activeFocusUsers] = await Promise.all([
      User.find({}, 'name email createdAt').sort({ createdAt: -1 }).limit(100).lean(), User.countDocuments(),
      Task.countDocuments(), Task.countDocuments({ completed: true }), Goal.countDocuments(), Goal.countDocuments({ status: 'completed' }), Roadmap.find({}, 'progress').lean(), TaskVerificationAttempt.countDocuments(), TaskVerificationAttempt.countDocuments({ passed: true }), MockTestAttempt.aggregate([{ $group: { _id: null, attempts: { $sum: 1 }, averageScore: { $avg: '$percentage' } } }]), FocusSession.aggregate([{ $group: { _id: null, sessions: { $sum: 1 }, seconds: { $sum: '$durationSeconds' } } }]), Task.aggregate([{ $match: { 'resources.0': { $exists: true } } }, { $project: { count: { $size: '$resources' } } }, { $group: { _id: null, tasks: { $sum: 1 }, resources: { $sum: '$count' } } }]), Task.find({}, 'user title createdAt completed completedAt').sort({ updatedAt: -1 }).limit(10).lean(), Goal.find({}, 'user title createdAt completedAt').sort({ updatedAt: -1 }).limit(10).lean(), TaskVerificationAttempt.find({}, 'user score passed completedAt').sort({ completedAt: -1 }).limit(10).lean(), MockTestAttempt.find({}, 'user title percentage completedAt').sort({ completedAt: -1 }).limit(10).lean(), FocusSession.find({}, 'user durationSeconds completedAt').sort({ completedAt: -1 }).limit(10).lean(), leaderboardRows(), Task.distinct('user', { updatedAt: { $gte: since } }), Goal.distinct('user', { updatedAt: { $gte: since } }), TaskVerificationAttempt.distinct('user', { updatedAt: { $gte: since } }), MockTestAttempt.distinct('user', { completedAt: { $gte: since } }), FocusSession.distinct('user', { completedAt: { $gte: since } }),
    ]);
    const activeIds = new Set();
    for (const event of [...recentTasks, ...recentGoals, ...recentVerifications, ...recentMocks, ...recentFocus]) if (event.user && (event.updatedAt || event.createdAt || event.completedAt) >= since) activeIds.add(String(event.user));
    const recentActivity = [
      ...recentTasks.map(task => toActivity(task.completed ? 'task_completed' : 'task_created', task.user, task.completedAt || task.createdAt, task.title)),
      ...recentGoals.map(goal => toActivity(goal.completedAt ? 'goal_completed' : 'goal_created', goal.user, goal.completedAt || goal.createdAt, goal.title)),
      ...recentVerifications.map(attempt => toActivity('verification_submitted', attempt.user, attempt.completedAt, `${attempt.score}/5 ${attempt.passed ? 'passed' : 'failed'}`)),
      ...recentMocks.map(attempt => toActivity('mock_test_submitted', attempt.user, attempt.completedAt, `${attempt.title}: ${attempt.percentage}%`)),
      ...recentFocus.map(session => toActivity('focus_completed', session.user, session.completedAt, `${Math.round(session.durationSeconds / 60)} minutes`)),
    ].filter(activity => activity.occurredAt).sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, 20);
    [...activeTaskUsers, ...activeGoalUsers, ...activeVerificationUsers, ...activeMockUsers, ...activeFocusUsers].forEach(id => activeIds.add(String(id)));
    res.json({ totals: { users: totalUsers, newUsers: users.filter(user => user.createdAt >= since).length, activeUsers: activeIds.size, tasksCreated: totalTasks, tasksCompleted: completedTasks, taskCompletionRate: totalTasks ? Math.round(completedTasks / totalTasks * 100) : 0, goalsCreated, goalsCompleted, roadmapsCreated: roadmaps.length, roadmapProgress: roadmaps.length ? Math.round(roadmaps.reduce((sum, roadmap) => sum + (roadmap.progress || 0), 0) / roadmaps.length) : 0, verificationAttempts, verificationPassRate: verificationAttempts ? Math.round(verificationPassed / verificationAttempts * 100) : 0, verificationFailureRate: verificationAttempts ? Math.round((verificationAttempts - verificationPassed) / verificationAttempts * 100) : 0, mockTestAttempts: mockStats[0]?.attempts || 0, averageMockTestScore: Math.round(mockStats[0]?.averageScore || 0), focusSessions: focusStats[0]?.sessions || 0, focusMinutes: Math.round((focusStats[0]?.seconds || 0) / 60), resourceTasks: resourceStats[0]?.tasks || 0, generatedResources: resourceStats[0]?.resources || 0, leaderboardUsers: leaderboard.length }, users, recentActivity });
  } catch {
    res.status(500).json({ message: 'Failed to load admin analytics.' });
  }
};

exports.getUserSummary = async (req, res) => {
  try {
    const user = await User.findById(req.params.id, 'name email createdAt');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const [tasks, completedTasks, goals, roadmaps, verifications, mockTests, focusSessions, leaderboard] = await Promise.all([Task.countDocuments({ user: user._id }), Task.countDocuments({ user: user._id, completed: true }), Goal.countDocuments({ user: user._id }), Roadmap.find({ user: user._id }, 'progress').lean(), TaskVerificationAttempt.find({ user: user._id }, 'score passed completedAt').sort({ completedAt: -1 }).limit(10).lean(), MockTestAttempt.find({ user: user._id }, 'percentage title completedAt').sort({ completedAt: -1 }).limit(10).lean(), FocusSession.aggregate([{ $match: { user: user._id } }, { $group: { _id: null, sessions: { $sum: 1 }, seconds: { $sum: '$durationSeconds' } } }]), leaderboardRows()]);
    const rank = leaderboard.findIndex(row => String(row._id) === String(user._id));
    const recentActivity = [...verifications.map(item => toActivity('verification_submitted', user._id, item.completedAt, `${item.score}/5 ${item.passed ? 'passed' : 'failed'}`)), ...mockTests.map(item => toActivity('mock_test_submitted', user._id, item.completedAt, `${item.title}: ${item.percentage}%`))].filter(item => item.occurredAt).sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
    res.json({ user, summary: { tasks, completedTasks, taskCompletionRate: tasks ? Math.round(completedTasks / tasks * 100) : 0, goals, roadmaps: roadmaps.length, roadmapProgress: roadmaps.length ? Math.round(roadmaps.reduce((sum, roadmap) => sum + (roadmap.progress || 0), 0) / roadmaps.length) : 0, focusSessions: focusSessions[0]?.sessions || 0, focusMinutes: Math.round((focusSessions[0]?.seconds || 0) / 60), leaderboardPosition: rank >= 0 ? rank + 1 : null }, verifications, mockTests, recentActivity });
  } catch {
    res.status(500).json({ message: 'Failed to load user summary.' });
  }
};
