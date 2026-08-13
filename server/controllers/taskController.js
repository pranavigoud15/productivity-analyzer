const Task       = require('../models/Task');
const automation = require('../automation/automationService');
const { scheduleTaskEnrichment, needsEnrichment } = require('../services/taskResourceService');
const { loadTaskEnrichmentContext } = require('../services/taskContextService');
const { ensureMockTestForMilestone } = require('../services/roadmapMockTestService');
const {
  resolveVerificationUiState,
  hasLinkedMockTest,
} = require('../utils/taskVerificationState');

// @desc   Create a manual task
// @route  POST /api/tasks
exports.createTask = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const task = await Task.create({
      user:  req.user.id,
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
    const tasks = await Task.find({ user: req.user.id })
      .populate('mockTest', 'title generationStatus isPublished')
      .sort({ createdAt: 1 });

    for (const task of tasks) {
      if (needsEnrichment(task)) {
        scheduleTaskEnrichment(task._id);
      }
    }

    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};

// @desc   Get a single task with learning content and verification state
// @route  GET /api/tasks/:id
exports.getTaskById = async (req, res) => {
  try {
    let task = await Task.findOne({ _id: req.params.id, user: req.user.id })
      .populate('mockTest', 'title subject topic difficulty generationStatus isPublished durationMinutes passingPercentage source');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (needsEnrichment(task)) {
      scheduleTaskEnrichment(task._id);
    }

    if (task.source === 'roadmap-generated' && task.roadmap && task.milestone) {
      const linkedMock = task.mockTest;
      const hasRoadmapMock = linkedMock
        && typeof linkedMock === 'object'
        && linkedMock.source === 'roadmap-generated';

      if (!hasRoadmapMock) {
        loadTaskEnrichmentContext(task._id)
          .then((context) => {
            if (context?.roadmap && context?.milestone) {
              return ensureMockTestForMilestone(context);
            }
            return null;
          })
          .catch((err) => {
            console.warn(`[TaskController] Mock test backfill failed taskId=${task._id}: ${err.message}`);
          });
      }
    }

    const enrichmentLoading = needsEnrichment(task);
    const verificationUiState = resolveVerificationUiState(task.toObject(), { enrichmentLoading });

    res.status(200).json({
      ...task.toObject(),
      verificationUiState,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch task' });
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

// @desc   Toggle a task's completed state. Sets/clears completedAt.
//         Fires onTaskCompleted automation event which cascades
//         milestone → roadmap → goal progress if task is roadmap-linked.
//         Practice tasks (source: 'roadmap-generated') cannot be toggled
//         here — they are verified automatically via mock test
//         submission (see automation/mockAutomation.js). This route
//         remains the only way manual tasks get completed.
// @route  PATCH /api/tasks/:id/complete
exports.completeTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

   if (task.source === 'roadmap-generated') {
    return res.status(403).json({
        message: 'Practice tasks are verified automatically via mock tests.',
    });
}

    task.completed   = !task.completed;
    task.completedAt = task.completed ? new Date() : null;

    await task.save();

    // Fire and forget — task response must not be blocked by cascade.
    if (task.completed) automation.onTaskCompleted(task).catch(err =>
      console.error('[Automation] onTaskCompleted error — taskId=', task._id, err)
    );

    res.status(200).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update task status' });
  }
};

// @desc   Delete a task. Fires onTaskDeleted automation event which
//         removes the task from its milestone and recomputes progress.
// @route  DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Fire and forget — delete response must not be blocked by cascade.
    automation.onTaskDeleted(task).catch(err =>
      console.error('[Automation] onTaskDeleted error — taskId=', task._id, err)
    );

    res.status(200).json({ message: 'Task deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete task' });
  }
};
