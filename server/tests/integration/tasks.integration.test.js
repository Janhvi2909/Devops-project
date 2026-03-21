const request = require('supertest');
const { execSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Set test database
process.env.DATABASE_URL = 'file:./test.db';

const app = require('../../src/index');
const prisma = new PrismaClient();

beforeAll(async () => {
  execSync('npx prisma db push', {
    cwd: path.join(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  });
  await prisma.task.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Tasks API - Integration Tests', () => {
  let createdTaskId;

  test('GET /api/health should return ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /api/tasks should return empty array initially', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/tasks should create a task', async () => {
    const res = await request(app).post('/api/tasks').send({
      title: 'Integration Test Task',
      description: 'Testing the API',
      priority: 'high',
      category: 'testing',
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Integration Test Task');
    expect(res.body.priority).toBe('high');
    createdTaskId = res.body.id;
  });

  test('POST /api/tasks should reject empty title', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '' });
    expect(res.status).toBe(400);
  });

  test('GET /api/tasks/:id should return the created task', async () => {
    const res = await request(app).get(`/api/tasks/${createdTaskId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdTaskId);
    expect(res.body.title).toBe('Integration Test Task');
  });

  test('GET /api/tasks/:id should return 404 for non-existent task', async () => {
    const res = await request(app).get('/api/tasks/99999');
    expect(res.status).toBe(404);
  });

  test('PUT /api/tasks/:id should update a task', async () => {
    const res = await request(app)
      .put(`/api/tasks/${createdTaskId}`)
      .send({ title: 'Updated Task', status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Task');
    expect(res.body.status).toBe('completed');
  });

  test('PUT /api/tasks/:id should reject invalid status', async () => {
    const res = await request(app).put(`/api/tasks/${createdTaskId}`).send({ status: 'invalid' });
    expect(res.status).toBe(400);
  });

  test('DELETE /api/tasks/:id should delete a task', async () => {
    const res = await request(app).delete(`/api/tasks/${createdTaskId}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Task deleted successfully');
  });

  test('DELETE /api/tasks/:id should return 404 for deleted task', async () => {
    const res = await request(app).delete(`/api/tasks/${createdTaskId}`);
    expect(res.status).toBe(404);
  });

  test('GET /api/tasks should support status filter', async () => {
    await request(app).post('/api/tasks').send({ title: 'Pending Task', status: 'pending' });
    await request(app).post('/api/tasks').send({ title: 'Done Task', status: 'completed' });

    const res = await request(app).get('/api/tasks?status=pending');
    expect(res.status).toBe(200);
    res.body.forEach((task) => {
      expect(task.status).toBe('pending');
    });
  });
});
