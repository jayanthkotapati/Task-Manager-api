/*
 * Seeds the database with users and tasks.
 *   npm run seed                     -> 5,000 tasks
 *   node scripts/seed.js --tasks=100000   -> large dataset for load testing
 *   node scripts/seed.js --keep      -> don't wipe existing data
 */
require('../src/config/env');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Task = require('../src/models/Task');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true])
);
const TASK_COUNT = parseInt(args.tasks, 10) || 5000;
const BATCH = 5000;

const verbs = ['Fix', 'Write', 'Review', 'Deploy', 'Design', 'Test', 'Refactor', 'Document', 'Plan', 'Optimize'];
const nouns = ['login flow', 'API docs', 'database schema', 'CI pipeline', 'landing page', 'billing module',
  'search feature', 'cache layer', 'onboarding emails', 'Docker image', 'unit tests', 'dashboard'];
const tagPool = ['backend', 'frontend', 'devops', 'bug', 'feature', 'urgent', 'docs', 'security', 'performance'];
const statuses = ['todo', 'in-progress', 'done'];
const priorities = ['low', 'medium', 'high'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

(async () => {
  await connectDB();

  if (!args.keep) {
    await Promise.all([User.deleteMany({}), Task.deleteMany({})]);
    console.log('Cleared existing users and tasks');
  }
  await Promise.all([User.init(), Task.init()]); // make sure indexes exist

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

  const userDocs = [
    { name: 'Admin User', email: adminEmail, password: adminPassword, role: 'admin' },
    { name: 'Maya Manager', email: 'manager@example.com', password: 'Manager@12345', role: 'manager' },
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `Demo User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      password: 'User@12345',
      role: 'user',
    })),
  ];
  const users = [];
  for (const u of userDocs) users.push(await User.create(u)); // create() so passwords are hashed
  console.log(`Created ${users.length} users`);

  const regularIds = users.filter((u) => u.role === 'user').map((u) => u._id);
  const now = Date.now();
  const DAY = 86400000;

  for (let created = 0; created < TASK_COUNT; created += BATCH) {
    const size = Math.min(BATCH, TASK_COUNT - created);
    const docs = Array.from({ length: size }, () => ({
      title: `${pick(verbs)} ${pick(nouns)}`,
      description: `Auto-generated task for load testing: ${pick(verbs).toLowerCase()} ${pick(nouns)}.`,
      status: pick(statuses),
      priority: pick(priorities),
      dueDate: new Date(now + (Math.floor(Math.random() * 120) - 30) * DAY),
      tags: [pick(tagPool), pick(tagPool)],
      owner: pick(regularIds),
      createdAt: new Date(now - Math.floor(Math.random() * 180) * DAY),
      updatedAt: new Date(),
    }));
    await Task.insertMany(docs, { ordered: false, lean: true });
    process.stdout.write(`\rInserted ${created + size}/${TASK_COUNT} tasks`);
  }
  console.log('\n\nSeed complete. Demo logins:');
  console.log(`  admin   ${adminEmail} / ${adminPassword}`);
  console.log('  manager manager@example.com / Manager@12345');
  console.log('  user    user1@example.com ... user10@example.com / User@12345');

  await mongoose.connection.close();
})().catch((e) => { console.error(e); process.exit(1); });
