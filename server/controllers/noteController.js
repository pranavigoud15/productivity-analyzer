const Note = require('../models/Note');
 
// @desc   Create a note
// @route  POST /api/notes
exports.createNote = async (req, res) => {
  try {
    const { title, content, tags } = req.body;
 
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
 
    const note = await Note.create({
      user: req.user.id,
      title: title.trim(),
      content: content?.trim() || '',
      tags: Array.isArray(tags) ? tags.map((t) => t.trim()).filter(Boolean) : [],
    });
 
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create note' });
  }
};
 
// @desc   Get all notes for the logged-in user, pinned first
// @route  GET /api/notes
exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id }).sort({ pinned: -1, createdAt: -1 });
    res.status(200).json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
};
 
// @desc   Update a note's title, content, tags, or pinned state
// @route  PATCH /api/notes/:id
exports.updateNote = async (req, res) => {
  try {
    const { title, content, tags, pinned } = req.body;
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
 
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
 
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ message: 'Title cannot be empty' });
      }
      note.title = title.trim();
    }
    if (content !== undefined) note.content = content.trim();
    if (tags !== undefined) {
      note.tags = Array.isArray(tags) ? tags.map((t) => t.trim()).filter(Boolean) : note.tags;
    }
    if (pinned !== undefined) note.pinned = Boolean(pinned);
 
    await note.save();
    res.status(200).json(note);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update note' });
  }
};
 
// @desc   Delete a note
// @route  DELETE /api/notes/:id
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id });
 
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
 
    res.status(200).json({ message: 'Note deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete note' });
  }
};