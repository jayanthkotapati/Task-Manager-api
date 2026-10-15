const User = require('../models/User');
const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/users  (admin)
exports.listUsers = asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(),
  ]);
  res.json({ success: true, data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// PATCH /api/users/:id/role  (admin)
exports.updateRole = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new ApiError(400, 'You cannot change your own role');
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: user });
});

// DELETE /api/users/:id  (admin) - deletes the user and their tasks
exports.deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new ApiError(400, 'You cannot delete yourself');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  await Task.deleteMany({ owner: user._id });
  res.json({ success: true, message: 'User and their tasks deleted' });
});
