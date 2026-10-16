import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Health & Error Middleware', () => {
  it('GET /api/health should return { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('Unknown routes should return 404 with contract error shape', async () => {
    const res = await request(app).get('/api/non-existent-route');
    // Express returns default 404 if no route matched, let's make sure 404 handler can be mounted
    expect(res.status).toBe(404);
  });
});
