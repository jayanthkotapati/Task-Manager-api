process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taskmanager_test';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Task = require('../src/models/Task');

let userToken, otherToken, adminToken, taskId;

beforeAll(async () => {
  await connectDB();
  await Promise.all([User.deleteMany({}), Task.deleteMany({})]);
  await User.create({ name: 'Admin', email: 'admin@test.com', password: 'Password123', role: 'admin' });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Auth', () => {
  it('registers a user and forces role=user', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'Password123', role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
    userToken = res.body.token;
  });

  it('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'Password123' });
    expect(res.status).toBe(409);
  });

  it('rejects invalid login', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('logs in admin', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Password123' });
    expect(res.status).toBe(200);
    adminToken = res.body.token;
  });

  it('blocks requests without a token', async () => {
    expect((await request(app).get('/api/tasks')).status).toBe(401);
  });
});

describe('Tasks', () => {
  it('creates a task', async () => {
    const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Write tests', priority: 'high' });
    expect(res.status).toBe(201);
    taskId = res.body.data._id;
  });

  it('validates input', async () => {
    const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${userToken}`).send({});
    expect(res.status).toBe(400);
  });

  it('lists tasks with pagination meta', async () => {
    const res = await request(app).get('/api/tasks?limit=5').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 5, total: 1 });
  });

  it("prevents another user from reading someone else's task", async () => {
    const reg = await request(app).post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@test.com', password: 'Password123' });
    otherToken = reg.body.token;
    const res = await request(app).get(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it('lets admin read any task', async () => {
    const res = await request(app).get(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('updates and deletes own task', async () => {
    const upd = await request(app).patch(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'done' });
    expect(upd.body.data.status).toBe('done');
    const del = await request(app).delete(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${userToken}`);
    expect(del.status).toBe(200);
  });
});

describe('RBAC', () => {
  it('forbids normal users from admin routes', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('allows admin to list users', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(3);
  });
});
