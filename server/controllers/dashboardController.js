const Task = require('../models/Task');
const Goal = require('../models/Goal');
const Roadmap = require('../models/Roadmap');
const Journal = require('../models/Journal');
const Note = require('../models/Note');
const { calculateStreakFromDates } = require('../utils/streak');

// Preserved exactly as-is from your real file — no changes.
const getDashboard = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Dashboard data fetched",
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc   Aggregate dashboard statistics — tasks, goals, roadmaps,
//         journal, and notes. All computed from MongoDB.
// @route  GET /api/dashboard/summary
const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      totalTasks,
      completedTasks,
      completedTaskDocs,
      totalGoals,
      completedGoals,
      roadmaps,
      topPendingTasks,
      nearestActiveGoal,
      journalCount,
      notesCount,
      journalDateDocs,
      recentJournalEntry,
    ] = await Promise.all([
      Task.countDocuments({ user: userId }),
      Task.countDocuments({ user: userId, completed: true }),
      Task.find({ user: userId, completed: true, completedAt: { $ne: null } }, 'completedAt').lean(),
      Goal.countDocuments({ user: userId }),
      Goal.countDocuments({ user: userId, status: 'completed' }),
      Roadmap.find({ user: userId }, 'progress').lean(),
      Task.find({ user: userId, completed: false }).sort({ createdAt: 1 }).limit(5).lean(),
      Goal.findOne({ user: userId, status: 'active' }).sort({ targetDate: 1 }).lean(),
      Journal.countDocuments({ user: userId }),
      Note.countDocuments({ user: userId }),
      Journal.find({ user: userId }, 'date').lean(),
      Journal.findOne({ user: userId }).sort({ date: -1 }).lean(),
    ]);

    const pendingTasks = totalTasks - completedTasks;
    const activeGoals = totalGoals - completedGoals;
    const currentStreak = calculateStreakFromDates(completedTaskDocs.map((t) => t.completedAt));
    const journalStreak = calculateStreakFromDates(journalDateDocs.map((j) => j.date));

    const totalRoadmaps = roadmaps.length;
    const completedRoadmaps = roadmaps.filter((r) => r.progress === 100).length;
    const roadmapProgressAverage =
      totalRoadmaps === 0
        ? 0
        : Math.round(roadmaps.reduce((sum, r) => sum + (r.progress || 0), 0) / totalRoadmaps);

    const activeGoal = nearestActiveGoal || null;

    let activeRoadmap = null;
    if (activeGoal) {
      const roadmapDoc = await Roadmap.findOne({ user: userId, goal: activeGoal._id }).lean();
      if (roadmapDoc) {
        const milestones = roadmapDoc.milestones || [];
        const currentMilestone = milestones.find((m) => m.status !== 'completed') || null;
        activeRoadmap = { ...roadmapDoc, currentMilestone };
      }
    }

    res.status(200).json({
      totalTasks,
      completedTasks,
      pendingTasks,
      currentStreak,
      totalGoals,
      completedGoals,
      activeGoals,
      totalRoadmaps,
      completedRoadmaps,
      roadmapProgressAverage,
      topPendingTasks,
      activeGoal,
      activeRoadmap,
      journalCount,
      notesCount,
      journalStreak,
      recentJournalEntry: recentJournalEntry || null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load dashboard summary' });
  }
};

module.exports = {
  getDashboard,
  getDashboardSummary,
};