const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

exports.register = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});

exports.login = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const f = {
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(2000),
  status: z.enum(['todo', 'in-progress', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.coerce.date(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10),
};

exports.createTask = z.object({
  title: f.title,
  description: f.description.optional(),
  status: f.status.optional(),
  priority: f.priority.optional(),
  dueDate: f.dueDate.optional(),
  tags: f.tags.optional(),
});

exports.updateTask = z
  .object({
    title: f.title.optional(),
    description: f.description.optional(),
    status: f.status.optional(),
    priority: f.priority.optional(),
    dueDate: f.dueDate.nullable().optional(),
    tags: f.tags.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

exports.listTasksQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: f.status.optional(),
  priority: f.priority.optional(),
  search: z.string().trim().min(1).max(100).optional(),
  owner: objectId.optional(), // admin / manager only
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

exports.idParam = z.object({ id: objectId });
exports.updateRole = z.object({ role: z.enum(['user', 'manager', 'admin']) });
exports.listUsersQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
