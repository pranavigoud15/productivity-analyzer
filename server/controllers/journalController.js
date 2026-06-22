const Journal = require('../models/Journal');
 
// @desc   Create a journal entry
// @route  POST /api/journals
exports.createJournalEntry = async (req, res) => {
  try {
    const { title, content, mood, studyHours, date } = req.body;
 
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }
    if (mood && !Journal.MOODS.includes(mood)) {
      return res.status(400).json({ message: `Mood must be one of: ${Journal.MOODS.join(', ')}` });
    }
 
    const entry = await Journal.create({
      user: req.user.id,
      title: title.trim(),
      content: content.trim(),
      mood: mood || 'okay',
      studyHours: studyHours !== undefined ? Math.max(0, Number(studyHours)) : 0,
      date: date || Date.now(),
    });
 
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create journal entry' });
  }
};
 
// @desc   Get all journal entries for the logged-in user
// @route  GET /api/journals
exports.getJournalEntries = async (req, res) => {
  try {
    const entries = await Journal.find({ user: req.user.id }).sort({ date: -1 });
    res.status(200).json(entries);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch journal entries' });
  }
};
 
// @desc   Delete a journal entry
// @route  DELETE /api/journals/:id
exports.deleteJournalEntry = async (req, res) => {
  try {
    const entry = await Journal.findOneAndDelete({ _id: req.params.id, user: req.user.id });
 
    if (!entry) {
      return res.status(404).json({ message: 'Journal entry not found' });
    }
 
    res.status(200).json({ message: 'Journal entry deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete journal entry' });
  }
};