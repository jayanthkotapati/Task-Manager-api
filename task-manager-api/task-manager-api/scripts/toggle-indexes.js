/*
 * Drop or rebuild the Task compound indexes so you can measure the before/after
 * effect on query plans and API latency.
 *   node scripts/toggle-indexes.js drop     -> keeps only the default _id index
 *   node scripts/toggle-indexes.js create   -> rebuilds all indexes from the model
 */
require('../src/config/env');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Task = require('../src/models/Task');

(async () => {
  const action = process.argv[2];
  if (!['drop', 'create'].includes(action)) {
    console.log('Usage: node scripts/toggle-indexes.js <drop|create>');
    process.exit(1);
  }
  await connectDB();
  if (action === 'drop') {
    await Task.collection.dropIndexes();
    console.log('Dropped all non-_id indexes on tasks');
  } else {
    await Task.syncIndexes();
    console.log('Indexes rebuilt:', (await Task.collection.indexes()).map((i) => i.name).join(', '));
  }
  await mongoose.connection.close();
})().catch((e) => { console.error(e); process.exit(1); });
