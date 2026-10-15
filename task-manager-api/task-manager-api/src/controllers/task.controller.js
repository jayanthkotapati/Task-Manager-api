const mongoose = require('mongoose');
const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const isPrivileged = (role) => role === 'admin' || role === 'manager';

// Fields returned in list views (smaller payloads = faster responses)
const LIST_FIELDS = 'title status priority dueDate tags owner createdAt';

// Loads a task and enforces ownership. Admins can access anything.
// Managers can read any task but only modify their own.
async function loadTask(id, user, { write = false } = {}) {
  const task = await Task.findById(id);
  if (!task) throw new ApiError(404, 'Task not found');
  const isOwner = task.owner.toString() === user.id;
  const allowed = isOwner || user.role === 'admin' || (!write && user.role === 'manager');
  if (!allowed) throw new ApiError(403, 'You do not have access to this task');
  return task;
}

// POST /api/tasks
exports.createTask = asyncHandler(async (req, res) => {
  const task = await Task.create({ ...req.body, owner: req.user.id });
  res.status(201).json({ success: true, data: task });
});

// GET /api/tasks?page=1&limit=20&status=todo&priority=high&search=deploy&sortBy=dueDate&order=asc
exports.listTasks = asyncHandler(async (req, res) => {
  const { page, limit, status, priority, search, owner, dueBefore, dueAfter, sortBy, order } =
    req.validated.query;

  const filter = {};
  // Equality fields first -> lets MongoDB use the {owner, status, ...} compound indexes
  if (isPrivileged(req.user.role)) {
    if (owner) filter.owner = new mongoose.Types.ObjectId(owner);
  } else {
    filter.owner = new mongoose.Types.ObjectId(req.user.id);
  }
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (dueBefore || dueAfter) {
    filter.dueDate = {};
    if (dueAfter) filter.dueDate.$gte = dueAfter;
    if (dueBefore) filter.dueDate.$lte = dueBefore;
  }
  if (search) filter.$text = { $search: search };

  const sort = search
    ? { score: { $meta: 'textScore' }, _id: 1 }
    : { [sortBy]: order === 'asc' ? 1 : -1, _id: 1 }; // _id tiebreaker keeps pagination stable

  const projection = search ? { score: { $meta: 'textScore' } } : {};

  // Query + count run in parallel; .lean() skips Mongoose document hydration
  const [tasks, total] = await Promise.all([
    Task.find(filter, projection)
      .select(LIST_FIELDS)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: tasks,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total },
  });
});

// GET /api/tasks/stats  -> counts by status for the current user (admin/manager: all tasks)
exports.stats = asyncHandler(async (req, res) => {
  const match = isPrivileged(req.user.role) ? {} : { owner: new mongoose.Types.ObjectId(req.user.id) };
  const rows = await Task.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const stats = { todo: 0, 'in-progress': 0, done: 0 };
  rows.forEach((r) => (stats[r._id] = r.count));
  res.json({ success: true, data: stats });
});

// GET /api/tasks/:id
exports.getTask = asyncHandler(async (req, res) => {
  const task = await loadTask(req.params.id, req.user);
  res.json({ success: true, data: task });
});

// PATCH /api/tasks/:id
exports.updateTask = asyncHandler(async (req, res) => {
  const task = await loadTask(req.params.id, req.user, { write: true });
  Object.assign(task, req.body);
  await task.save();
  res.json({ success: true, data: task });
});

// DELETE /api/tasks/:id
exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await loadTask(req.params.id, req.user, { write: true });
  await task.deleteOne();
  res.json({ success: true, message: 'Task deleted' });
});
