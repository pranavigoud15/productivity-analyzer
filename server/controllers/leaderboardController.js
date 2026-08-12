const MockTestAttempt = require('../models/MockTestAttempt');

exports.getLeaderboard = async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;

    // Full ranked list (no limit — needed to find current user's rank)
    const all = await MockTestAttempt.aggregate([
      // A user's retries for the same test are one legitimate activity.
      // Keep their best result so retries cannot inflate rank or test count.
      { $sort: { percentage: -1, completedAt: 1 } },
      { $group: { _id: { user: '$user', mockTest: '$mockTest' }, percentage: { $first: '$percentage' } } },
      {
        $group: {
          _id: '$_id.user',
          averagePercentage: { $avg: '$percentage' },
          bestPercentage: { $max: '$percentage' },
          testsCompleted: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          _id: 0,
          userId: { $toString: '$_id' },
          name: '$userInfo.name',
          averagePercentage: { $round: ['$averagePercentage', 1] },
          bestPercentage: { $round: ['$bestPercentage', 1] },
          testsCompleted: 1,
        },
      },
      {
        $sort: {
          averagePercentage: -1,
          testsCompleted: -1,
          bestPercentage: -1,
        },
      },
    ]);

    const ranked = all.map((entry, i) => ({ rank: i + 1, ...entry }));
    const top20 = ranked.slice(0, 20);

    const myEntry = ranked.find((e) => e.userId === String(currentUserId)) || null;

    res.json({ leaderboard: top20, myEntry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
