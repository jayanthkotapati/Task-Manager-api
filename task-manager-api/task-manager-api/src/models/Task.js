const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date },
    tags: [{ type: String, trim: true, lowercase: true }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

/*
 * Compound indexes follow the ESR rule (Equality, Sort, Range) and match the
 * most common query shapes in task.controller.js:
 *
 *  1. owner + status, sorted by dueDate      -> "my open tasks by deadline"
 *  2. owner + priority, sorted by createdAt  -> "my high priority tasks, newest first"
 *  3. owner + createdAt                      -> default listing / pagination
 *  4. status + dueDate                       -> admin / manager dashboards
 *  5. text index on title/description        -> keyword search
 */
taskSchema.index({ owner: 1, status: 1, dueDate: 1 });
taskSchema.index({ owner: 1, priority: 1, createdAt: -1 });
taskSchema.index({ owner: 1, createdAt: -1 });
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Task', taskSchema);
