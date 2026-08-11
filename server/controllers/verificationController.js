const Task = require('../models/Task');
const TaskVerificationAttempt = require('../models/TaskVerificationAttempt');
const { generateVerificationQuestions } = require('../services/verificationAiService');
const { completeLinkedTask } = require('../automation/taskAutomation');

exports.startVerification = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.source !== 'roadmap-generated') {
      return res.status(400).json({
        message: 'Only roadmap-generated practice tasks require verification.',
      });
    }

    if (task.completed) {
      return res.status(400).json({
        message: 'Task is already completed.',
      });
    }

    if (task.mockTest !== null) {
      return res.status(400).json({
        message: 'This task must be verified via its linked mock test.',
      });
    }

    const questions = await generateVerificationQuestions(task.title);

    const attempt = await TaskVerificationAttempt.create({
      task: task._id,
      user: req.user.id,
      questions,
    });

    const sanitizedQuestions = attempt.questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
    }));

    res.status(201).json({
      attemptId: attempt._id,
      questions: sanitizedQuestions,
    });
  } catch (err) {
    console.error(
      '[VerificationController] startVerification error:',
      err
    );

    res.status(500).json({
      message: err.message || 'Failed to start task verification.',
    });
  }
};

exports.submitVerification = async (req, res) => {
  try {
    const { attemptId, answers } = req.body;

    if (!attemptId) {
      return res.status(400).json({
        message: 'Verification attempt ID is required.',
      });
    }

    if (!Array.isArray(answers) || answers.length !== 5) {
      return res.status(400).json({
        message: 'Exactly 5 answers are required.',
      });
    }

    const validLabels = new Set(['A', 'B', 'C', 'D']);

    for (const answer of answers) {
      if (!validLabels.has(answer)) {
        return res.status(400).json({
          message: 'Answers must be one of: A, B, C, or D.',
        });
      }
    }

    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!task) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    if (task.source !== 'roadmap-generated') {
      return res.status(400).json({
        message: 'Only roadmap-generated practice tasks require verification.',
      });
    }

    if (task.completed) {
      return res.status(400).json({
        message: 'Task is already completed.',
      });
    }

    if (task.mockTest !== null) {
      return res.status(400).json({
        message: 'This task must be verified via its linked mock test.',
      });
    }

    const attempt = await TaskVerificationAttempt.findOne({
      _id: attemptId,
      task: task._id,
      user: req.user.id,
    }).select('+questions.correctOption +questions.explanation');

    if (!attempt) {
      return res.status(404).json({
        message: 'Verification attempt not found.',
      });
    }

    if (attempt.completedAt) {
      return res.status(400).json({
        message: 'This verification attempt has already been submitted.',
      });
    }

    let score = 0;

    for (let i = 0; i < attempt.questions.length; i++) {
      const question = attempt.questions[i];
      const selected = answers[i];

      question.selectedOption = selected;
      question.isCorrect = selected === question.correctOption;

      if (question.isCorrect) {
        score++;
      }
    }

    const passed = score >= 3;

    attempt.score = score;
    attempt.passed = passed;
    attempt.completedAt = new Date();

    await attempt.save();

    if (passed) {
      await completeLinkedTask(task._id);
    }

    const accuracy = Math.round((score / 5) * 100);

    const sanitizedResults = attempt.questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
      selectedOption: q.selectedOption,
      isCorrect: q.isCorrect,
      explanation: q.explanation,
    }));

    res.status(200).json({
      score,
      accuracy,
      passed,
      message: passed
        ? 'Passed! Practice task completed.'
        : 'Failed. Please try again.',
      results: sanitizedResults,
    });
  } catch (err) {
    console.error(
      '[VerificationController] submitVerification error:',
      err
    );

    res.status(500).json({
      message: err.message || 'Failed to submit task verification.',
    });
  }
};