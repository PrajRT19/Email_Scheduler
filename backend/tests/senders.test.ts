import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';

describe('Senders Endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/senders should return 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/senders');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('GET /api/senders should return senders without sensitive credentials', async () => {
    const mockSenders = [
      {
        id: 'sender-1',
        email: 'sender1@example.com',
        name: 'Oliver Brown',
        etherealUser: 'secret-ethereal-user',
        etherealPass: 'secret-ethereal-pass',
        etherealHost: 'smtp.ethereal.email',
        etherealPort: 587,
        etherealSecure: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    vi.spyOn(prisma.sender, 'findMany').mockResolvedValue(mockSenders as any);

    // Mock authenticated user session
    const mockUser = {
      id: 'user-1',
      name: 'Oliver Brown',
      email: 'oliver.brown@domain.io',
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue(mockUser as any);

    // Login via callback to establish session
    const agent = request.agent(app);
    await agent.get('/api/auth/google/callback?code=mock-dev-code');

    const res = await agent.get('/api/senders');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);

    const sender = res.body.data[0];
    expect(sender).toEqual({
      id: 'sender-1',
      email: 'sender1@example.com',
      name: 'Oliver Brown',
    });

    // Ensure secrets never leak
    expect((sender as any).etherealUser).toBeUndefined();
    expect((sender as any).etherealPass).toBeUndefined();
  });
});
