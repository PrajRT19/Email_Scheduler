import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';

describe('Auth Endpoints & Middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/auth/me should return 401 UNAUTHENTICATED when not logged in', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      },
    });
  });

  it('GET /api/auth/google should return 302 redirect', async () => {
    const res = await request(app).get('/api/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBeDefined();
  });

  it('POST /api/auth/logout should return { success: true } and clear sid cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    // Check Set-Cookie clears sid
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      expect(setCookie.some((c: string) => c.includes('sid='))).toBe(true);
    }
  });

  it('GET /api/auth/google/callback should authenticate, set sid cookie and redirect to dashboard', async () => {
    const mockUser = {
      id: 'test-user-uuid-1',
      name: 'Oliver Brown',
      email: 'oliver.brown@domain.io',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(prisma.user, 'upsert').mockResolvedValue(mockUser as any);

    const res = await request(app)
      .get('/api/auth/google/callback?code=mock-dev-code');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/dashboard');
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
