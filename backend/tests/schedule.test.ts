import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { emailQueue } from '../src/queue/emailQueue.js';

describe('Schedule & Email Endpoints (Phase B4)', () => {
  const mockUser = {
    id: 'user-b4-test',
    name: 'Oliver Brown',
    email: 'oliver.brown@domain.io',
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSender = {
    id: 'sender-b4-test',
    email: 'oliver.brown@domain.io',
    name: 'Oliver Brown',
    etherealUser: 'ethereal-user',
    etherealPass: 'ethereal-pass',
    etherealHost: 'smtp.ethereal.email',
    etherealPort: 587,
    etherealSecure: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue(mockUser as any);
    vi.spyOn(prisma.sender, 'findUnique').mockResolvedValue(mockSender as any);
    vi.spyOn(emailQueue, 'addBulk').mockResolvedValue([] as any);
  });

  async function getAuthenticatedAgent() {
    const agent = request.agent(app);
    await agent.get('/api/auth/google/callback?code=mock-dev-code');
    return agent;
  }

  describe('Validation on POST /api/emails/schedule', () => {
    it('should reject missing subject with 400 VALIDATION_ERROR', async () => {
      const agent = await getAuthenticatedAgent();
      const res = await agent.post('/api/emails/schedule').send({
        senderId: mockSender.id,
        subject: '',
        bodyHtml: '<p>Hi</p>',
        recipients: ['valid@example.com'],
        startTime: new Date().toISOString(),
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid recipient emails with details listing them', async () => {
      const agent = await getAuthenticatedAgent();
      const res = await agent.post('/api/emails/schedule').send({
        senderId: mockSender.id,
        subject: 'Test Subject',
        bodyHtml: '<p>Hi</p>',
        recipients: ['valid@example.com', 'not-an-email', 'another-bad@@com'],
        startTime: new Date().toISOString(),
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(['not-an-email', 'another-bad@@com']);
    });

    it('should reject startTime more than 60s in the past', async () => {
      const agent = await getAuthenticatedAgent();
      const pastTime = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
      const res = await agent.post('/api/emails/schedule').send({
        senderId: mockSender.id,
        subject: 'Test Subject',
        bodyHtml: '<p>Hi</p>',
        recipients: ['valid@example.com'],
        startTime: pastTime,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Start time cannot be more than 60 seconds in the past');
    });
  });

  describe('Successful Scheduling & Deduplication', () => {
    it('should deduplicate recipients, create DB records, enqueue BullMQ jobs, and return 201', async () => {
      const agent = await getAuthenticatedAgent();

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          batch: {
            create: vi.fn().mockResolvedValue({ id: 'batch-1' }),
          },
          email: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(tx);
      });

      const startTime = new Date(Date.now() + 60000).toISOString();
      const res = await agent.post('/api/emails/schedule').send({
        senderId: mockSender.id,
        subject: 'Q4 Product Update',
        bodyHtml: '<h1>Update</h1><p>Check out our latest release notes.</p>',
        recipients: [
          'user1@example.com',
          'user2@example.com',
          'user1@example.com', // Duplicate
        ],
        startTime,
        delayBetweenEmailsSeconds: 10,
        hourlyLimit: 50,
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        batchId: expect.any(String),
        senderId: mockSender.id,
        totalRecipients: 3,
        scheduledCount: 2,
        duplicatesRemoved: 1,
        firstScheduledAt: expect.any(String),
        lastScheduledAt: expect.any(String),
      });

      expect(emailQueue.addBulk).toHaveBeenCalled();
    });
  });

  describe('Listing, Counts & Detail', () => {
    it('GET /api/emails/counts should return scheduled and sent counts', async () => {
      const agent = await getAuthenticatedAgent();
      vi.spyOn(prisma.email, 'count')
        .mockResolvedValueOnce(5)  // scheduled
        .mockResolvedValueOnce(12); // sent

      const res = await agent.get('/api/emails/counts');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        scheduled: 5,
        sent: 12,
      });
    });

    it('GET /api/emails/scheduled should return paginated scheduled items', async () => {
      const agent = await getAuthenticatedAgent();
      const mockList = [
        {
          id: 'email-1',
          batchId: 'batch-1',
          senderId: mockSender.id,
          senderEmail: mockSender.email,
          to: 'recipient@example.com',
          subject: 'Follow up',
          bodyPreview: 'Hi there',
          status: 'scheduled',
          scheduledAt: new Date(),
          sentAt: null,
          failureReason: null,
        },
      ];

      vi.spyOn(prisma.email, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.email, 'findMany').mockResolvedValue(mockList as any);

      const res = await agent.get('/api/emails/scheduled?page=1&limit=20');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('GET /api/emails/:id should return 404 for unknown email', async () => {
      const agent = await getAuthenticatedAgent();
      vi.spyOn(prisma.email, 'findFirst').mockResolvedValue(null);

      const res = await agent.get('/api/emails/unknown-id');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
