const { generateNoteContent } = require('../utils/noteGeneratorService');

const generateNote = async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ message: 'Topic is required' });
    }

    if (topic.trim().length > 200) {
      return res.status(400).json({ message: 'Topic must be 200 characters or fewer' });
    }

    const result = generateNoteContent(topic.trim());
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate notes. Please try again.' });
  }
};

module.exports = { generateNote };