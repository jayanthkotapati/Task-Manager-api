/*
 * Compares query plans WITH the compound index vs a forced collection scan.
 *   npm run explain
 */
require('../src/config/env');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Task = require('../src/models/Task');
const User = require('../src/models/User');

async function run(label, query) {
  const exp = await query.explain('executionStats');
  const s = exp.executionStats;
  const stage = JSON.stringify(exp.queryPlanner.winningPlan).match(/"stage":"(IXSCAN|COLLSCAN)"/);
  console.log(
    `${label.padEnd(34)} ${String(s.executionTimeMillis).padStart(5)} ms | docs examined: ${String(s.totalDocsExamined).padStart(7)} | keys: ${String(s.totalKeysExamined).padStart(7)} | ${stage ? stage[1] : 'n/a'}`
  );
  return s.executionTimeMillis;
}

(async () => {
  await connectDB();
  const user = await User.findOne({ role: 'user' }).lean();
  if (!user) throw new Error('No users found. Run `npm run seed` first.');
  const total = await Task.estimatedDocumentCount();
  console.log(`\nTasks in collection: ${total}\nTest owner: ${user.email}\n`);

  const filter = { owner: user._id, status: 'todo' };
  const base = () => Task.find(filter).sort({ dueDate: 1, _id: 1 }).skip(20).limit(20).lean();

  const scan = await run('No index (COLLSCAN, paginated)', base().hint({ $natural: 1 }));
  const idx = await run('Compound index (paginated)', base());
  const unpaged = await run('Compound index, NO pagination', Task.find(filter).sort({ dueDate: 1 }).lean());

  const gain = scan > 0 ? (((scan - idx) / scan) * 100).toFixed(1) : 'n/a';
  console.log(`\nIndex vs collection scan: ${gain}% faster server-side (paginated query)`);
  console.log(`Unpaginated query took ${unpaged} ms and returns every matching document.\n`);

  await mongoose.connection.close();
})().catch((e) => { console.error(e); process.exit(1); });
