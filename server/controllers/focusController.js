const FocusSession = require('../models/FocusSession');

exports.recordCompletedSession = async (req, res) => {
  try {
    const durationSeconds = Number(req.body.durationSeconds);
    if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 12 * 60 * 60) {
      return res.status(400).json({ message: 'A valid completed focus duration is required.' });
    }
    const session = await FocusSession.create({ user: req.user.id, durationSeconds });
    res.status(201).json(session);
  } catch {
    res.status(500).json({ message: 'Failed to record focus session.' });
  }
};
