const Task = require('../models/Task');
const Goal = require('../models/Goal');
const Journal = require('../models/Journal');
const Note = require('../models/Note');
const MockTestAttempt = require('../models/MockTestAttempt');

exports.getInsights = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const now = new Date();

    const startOf7Days = new Date(now);
    startOf7Days.setDate(now.getDate() - 6);
    startOf7Days.setHours(0, 0, 0, 0);

    const startOf30Days = new Date(now);
    startOf30Days.setDate(now.getDate() - 29);
    startOf30Days.setHours(0, 0, 0, 0);

    // ── Parallel fetch ────────────────────────────────────────────────────────
    const [tasks, goals, journals, notes, mockAttempts] = await Promise.all([
      Task.find({ user: userId }).lean(),
      Goal.find({ user: userId }).lean(),
      Journal.find({ user: userId }).lean(),
      Note.find({ user: userId }).lean(),
      MockTestAttempt.find({ user: userId })
        .sort({ completedAt: 1 })
        .lean(),
    ]);

    // ── Tasks ─────────────────────────────────────────────────────────────────
    const totalTasks     = tasks.length;
    const completedTasks = tasks.filter(t => t.completed === true).length;
    const pendingTasks   = totalTasks - completedTasks;
    const taskCompletionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Streak: count back from today using completedAt (the dedicated field)
    // Fall back to updatedAt only if completedAt is null (shouldn't happen
    // for completed tasks, but defensive).
    const completedDateStrings = new Set(
      tasks
        .filter(t => t.completed)
        .map(t => {
          const d = new Date(t.completedAt || t.updatedAt);
          return d.toDateString();
        })
    );
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      if (completedDateStrings.has(d.toDateString())) {
        streak++;
      } else if (i > 0) {
        break; // allow today to have no completions yet
      }
    }

    // Weekly task trend — last 7 days
    const weeklyTaskTrend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOf7Days);
      d.setDate(startOf7Days.getDate() + i);
      const dateStr = d.toDateString();
      const label   = d.toLocaleDateString('en-US', { weekday: 'short' });
      const created   = tasks.filter(t => new Date(t.createdAt).toDateString() === dateStr).length;
      const completed = tasks.filter(
        t => t.completed && new Date(t.completedAt || t.updatedAt).toDateString() === dateStr
      ).length;
      return { day: label, created, completed };
    });

    // Source breakdown (manual vs roadmap-generated)
    const manualTasks    = tasks.filter(t => t.source === 'manual').length;
    const generatedTasks = tasks.filter(t => t.source === 'roadmap-generated').length;

    // ── Goals ─────────────────────────────────────────────────────────────────
    const totalGoals     = goals.length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const activeGoals    = goals.filter(g => g.status === 'active').length;
    const goalCompletionRate =
      totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
    const avgGoalProgress =
      totalGoals > 0
        ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / totalGoals)
        : 0;

    // Goals by progress bucket
    const goalBuckets = { 'Not Started': 0, 'In Progress': 0, 'Near Done': 0, 'Completed': 0 };
    goals.forEach(g => {
      if (g.status === 'completed' || g.progress >= 100) goalBuckets['Completed']++;
      else if (g.progress === 0)         goalBuckets['Not Started']++;
      else if (g.progress < 75)          goalBuckets['In Progress']++;
      else                               goalBuckets['Near Done']++;
    });
    const goalProgressBuckets = Object.entries(goalBuckets)
      .map(([label, value]) => ({ label, value }))
      .filter(b => b.value > 0);

    // ── Mock Tests ────────────────────────────────────────────────────────────
    const totalAttempts = mockAttempts.length;
    const avgScore =
      totalAttempts > 0
        ? Math.round(
            (mockAttempts.reduce((s, a) => s + a.percentage, 0) / totalAttempts) * 10
          ) / 10
        : 0;
    const bestScore =
      totalAttempts > 0 ? Math.max(...mockAttempts.map(a => a.percentage)) : 0;
    const passCount = mockAttempts.filter(a => a.percentage >= 50).length;

    // Subject performance — using denormalized `subject` field on the attempt
    const subjectMap = {};
    mockAttempts.forEach(a => {
      if (!subjectMap[a.subject]) subjectMap[a.subject] = { total: 0, count: 0 };
      subjectMap[a.subject].total += a.percentage;
      subjectMap[a.subject].count += 1;
    });
    const subjectPerformance = Object.entries(subjectMap)
      .map(([subject, v]) => ({
        subject,
        average: Math.round((v.total / v.count) * 10) / 10,
        attempts: v.count,
      }))
      .sort((a, b) => b.average - a.average);

    // Difficulty performance — denormalized `difficulty` field
    const DIFF_ORDER = { Easy: 0, Medium: 1, Hard: 2 };
    const diffMap = {};
    mockAttempts.forEach(a => {
      if (!diffMap[a.difficulty]) diffMap[a.difficulty] = { total: 0, count: 0 };
      diffMap[a.difficulty].total += a.percentage;
      diffMap[a.difficulty].count += 1;
    });
    const difficultyPerformance = Object.entries(diffMap)
      .map(([difficulty, v]) => ({
        difficulty,
        average: Math.round((v.total / v.count) * 10) / 10,
        attempts: v.count,
      }))
      .sort((a, b) => (DIFF_ORDER[a.difficulty] ?? 9) - (DIFF_ORDER[b.difficulty] ?? 9));

    // Score trend — all attempts sorted by completedAt (already sorted above)
    const mockTrend = mockAttempts.map(a => ({
      date: new Date(a.completedAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      }),
      score:     a.percentage,
      subject:   a.subject,
      difficulty: a.difficulty,
    }));

    // Last-30-days attempts
    const recentAttempts = mockAttempts.filter(
      a => new Date(a.completedAt) >= startOf30Days
    ).length;

    // ── Journals ──────────────────────────────────────────────────────────────
    const totalJournals = journals.length;

    // Use the `date` field (user-settable calendar date) for streak + bucketing
    const journalsThisWeek  = journals.filter(j => new Date(j.date) >= startOf7Days).length;
    const journalsThisMonth = journals.filter(j => new Date(j.date) >= startOf30Days).length;

    // Total study hours logged
    const totalStudyHours = Math.round(
      journals.reduce((s, j) => s + (j.studyHours || 0), 0) * 10
    ) / 10;
    const avgStudyHours =
      totalJournals > 0 ? Math.round((totalStudyHours / totalJournals) * 10) / 10 : 0;

    // Mood distribution — only for entries that have a mood set
    const moodMap = {};
    journals.forEach(j => {
      if (j.mood) moodMap[j.mood] = (moodMap[j.mood] || 0) + 1;
    });
    const moodDistribution = Object.entries(moodMap)
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count);

    // Weekly study hours trend (last 7 days using journal `date`)
    const weeklyStudyTrend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOf7Days);
      d.setDate(startOf7Days.getDate() + i);
      const dateStr = d.toDateString();
      const label   = d.toLocaleDateString('en-US', { weekday: 'short' });
      const hours   = journals
        .filter(j => new Date(j.date).toDateString() === dateStr)
        .reduce((s, j) => s + (j.studyHours || 0), 0);
      return { day: label, hours: Math.round(hours * 10) / 10 };
    });

    // Journal streak (consecutive calendar days with an entry, using `date`)
    const journalDateStrings = new Set(
      journals.map(j => new Date(j.date).toDateString())
    );
    let journalStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      if (journalDateStrings.has(d.toDateString())) {
        journalStreak++;
      } else if (i > 0) {
        break;
      }
    }

    // ── Notes ─────────────────────────────────────────────────────────────────
    const totalNotes  = notes.length;
    const pinnedNotes = notes.filter(n => n.pinned).length;

    // Top tags by frequency
    const tagMap = {};
    notes.forEach(n => n.tags.forEach(tag => {
      tagMap[tag] = (tagMap[tag] || 0) + 1;
    }));
    const topTags = Object.entries(tagMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── Productivity Score (0–100) ────────────────────────────────────────────
    // Only computed from existing data; each component skips if no data exists.
    let scoreComponents = 0;
    let scoreTotal      = 0;

    if (totalTasks > 0) {
      scoreTotal += taskCompletionRate * 0.35;
      scoreComponents += 0.35;
    }
    if (totalGoals > 0) {
      scoreTotal += goalCompletionRate * 0.25;
      scoreComponents += 0.25;
    }
    if (totalAttempts > 0) {
      scoreTotal += avgScore * 0.25;
      scoreComponents += 0.25;
    }
    if (totalJournals > 0) {
      const journalConsistency = Math.min(journalsThisMonth, 20) / 20 * 100;
      scoreTotal += journalConsistency * 0.15;
      scoreComponents += 0.15;
    }

    const productivityScore =
      scoreComponents > 0 ? Math.round(scoreTotal / scoreComponents) : 0;

    // ── Recommendations ───────────────────────────────────────────────────────
    const recommendations = [];

    if (pendingTasks > 5)
      recommendations.push({
        type: 'tasks', priority: 'high',
        text: `You have ${pendingTasks} pending tasks. Try completing at least 3 today to maintain momentum.`,
      });
    if (totalTasks > 0 && taskCompletionRate < 50)
      recommendations.push({
        type: 'tasks', priority: 'medium',
        text: `Task completion is at ${taskCompletionRate}%. Break larger tasks into smaller steps to improve throughput.`,
      });
    if (streak === 0 && totalTasks > 0)
      recommendations.push({
        type: 'streak', priority: 'high',
        text: 'Your task streak has ended. Complete at least one task today to restart it.',
      });
    if (totalAttempts === 0)
      recommendations.push({
        type: 'mock', priority: 'medium',
        text: 'You haven\'t taken any mock tests yet. Start with an Easy test to establish a baseline.',
      });
    if (totalAttempts > 0 && avgScore < 60)
      recommendations.push({
        type: 'mock', priority: 'high',
        text: `Your average test score is ${avgScore}%. Review incorrect answers and retry those subjects.`,
      });
    if (subjectPerformance.length > 1) {
      const weakest = subjectPerformance[subjectPerformance.length - 1];
      if (weakest.average < 60)
        recommendations.push({
          type: 'mock', priority: 'medium',
          text: `${weakest.subject} is your weakest subject at ${weakest.average}%. Schedule focused revision time for it.`,
        });
    }
    if (totalGoals > 0 && avgGoalProgress < 30)
      recommendations.push({
        type: 'goals', priority: 'medium',
        text: 'Most goals have low progress. Update your goal progress regularly to stay on track.',
      });
    if (totalJournals > 0 && journalsThisWeek === 0)
      recommendations.push({
        type: 'journal', priority: 'low',
        text: 'No journal entries this week. A short daily reflection helps consolidate your learning.',
      });
    if (totalJournals === 0)
      recommendations.push({
        type: 'journal', priority: 'low',
        text: 'Start journaling. Even a 5-minute daily entry improves focus and goal clarity over time.',
      });
    if (productivityScore >= 75 && scoreComponents > 0)
      recommendations.push({
        type: 'general', priority: 'positive',
        text: `Strong work — your productivity score is ${productivityScore}/100. Keep this consistency going.`,
      });

    const PRIORITY_ORDER = { high: 0, medium: 1, positive: 2, low: 3 };
    recommendations.sort(
      (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
    );

    // ── Response ──────────────────────────────────────────────────────────────
    res.json({
      productivityScore,
      tasks: {
        total:          totalTasks,
        completed:      completedTasks,
        pending:        pendingTasks,
        completionRate: taskCompletionRate,
        streak,
        manual:         manualTasks,
        generated:      generatedTasks,
        weeklyTrend:    weeklyTaskTrend,
      },
      goals: {
        total:          totalGoals,
        completed:      completedGoals,
        active:         activeGoals,
        completionRate: goalCompletionRate,
        avgProgress:    avgGoalProgress,
        buckets:        goalProgressBuckets,
      },
      mockTests: {
        totalAttempts,
        avgScore,
        bestScore,
        passCount,
        recentAttempts,
        subjectPerformance,
        difficultyPerformance,
        trend: mockTrend,
      },
      journals: {
        total:           totalJournals,
        thisWeek:        journalsThisWeek,
        thisMonth:       journalsThisMonth,
        streak:          journalStreak,
        totalStudyHours,
        avgStudyHours,
        moodDistribution,
        weeklyStudyTrend,
      },
      notes: {
        total:  totalNotes,
        pinned: pinnedNotes,
        topTags,
      },
      recommendations: recommendations.slice(0, 5),
    });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ message: err.message });
  }
};