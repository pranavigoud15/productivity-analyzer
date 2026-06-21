const Task = require('../models/Task');
const { syncMilestoneProgress, removeTaskFromMilestone } = require('./roadmapController');
 
// @desc   Create a task
// @route  POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const { title } = req.body;
 
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
 
    const task = await Task.create({
      user: req.user.id,
      title: title.trim(),
    });
 
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create task' });
  }
};
 
// @desc   Get all tasks for the logged-in user
// @route  GET /api/tasks
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: 1 });
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};
 
// @desc   Update a task's title.
//         Does NOT accept `completed` — completion is handled exclusively
//         by completeTask below.
// @route  PATCH /api/tasks/:id
exports.updateTask = async (req, res) => {
  try {
    const { title } = req.body;
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
 
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
 
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ message: 'Title cannot be empty' });
      }
      task.title = title.trim();
    }
 
    await task.save();
    res.status(200).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update task' });
  }
};
 
// @desc   Toggle a task's completed state. Sets/clears completedAt. If
//         this task was auto-generated from a roadmap milestone, also
//         recomputes that milestone's status from all its linked tasks.
// @route  PATCH /api/tasks/:id/complete
exports.completeTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
 
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
 
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date() : null;
 
    await task.save();
 
    // Milestone sync must never block the task completion response —
    // same resilience pattern used throughout: log and continue.
    if (task.roadmap && task.milestone) {
      try {
        await syncMilestoneProgress(task.roadmap, task.milestone);
      } catch (syncErr) {
        console.error('Milestone sync failed for task', task._id, syncErr);
      }
    }
 
    res.status(200).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update task status' });
  }
};
 
// @desc   Delete a task. If it was linked to a roadmap milestone, remove
//         it from that milestone's tasks array and recompute status.
// @route  DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
 
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
 
    if (task.roadmap && task.milestone) {
      try {
        await removeTaskFromMilestone(task.roadmap, task.milestone, task._id);
      } catch (syncErr) {
        console.error('Milestone cleanup failed for deleted task', task._id, syncErr);
      }
    }
 
    res.status(200).json({ message: 'Task deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete task' });
  }
};