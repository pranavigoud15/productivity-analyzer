/**
 * Automatic enrichment pipeline smoke test — run with: node scripts/testTaskEnrichmentPipeline.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const { enrichTask } = require('../services/taskResourceService');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const goal = await Goal.create({
    user: new mongoose.Types.ObjectId(),
    title: 'Learn Java Programming',
    description: 'Java developer path',
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  const titles = ['Week 1: Java Fundamentals', 'Week 2: OOP Concepts'];
  const created = [];

  for (const title of titles) {
    const task = await Task.create({
      user: goal.user,
      title,
      goal: goal._id,
      source: 'roadmap-generated',
      enrichmentStatus: 'pending',
    });
    created.push(task);
    await enrichTask(task._id);
  }

  const results = await Task.find({ _id: { $in: created.map((task) => task._id) } }).lean();
  for (const task of results) {
    console.log(`\n${task.title}`);
    console.log(`  status: ${task.enrichmentStatus}`);
    console.log(`  objective: ${task.description?.slice(0, 80)}...`);
    console.log(`  guide overview: ${task.learningGuide?.overview ? 'yes' : 'no'}`);
    console.log(`  resources: ${task.resources?.length || 0}`);
    task.resources?.forEach((resource) => console.log(`    - ${resource.title}`));
  }

  await Task.deleteMany({ _id: { $in: created.map((task) => task._id) } });
  await Goal.deleteOne({ _id: goal._id });
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
