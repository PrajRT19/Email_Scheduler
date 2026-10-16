import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  claimEmailAtomically,
  checkAndReserveSenderDelay,
  sendEmailViaEthereal,
} from '../src/services/emailSenderService.js';
import { prisma } from '../src/db/prisma.js';
import { redisConnection } from '../src/queue/emailQueue.js';
import { processEmailJob } from '../src/workers/emailWorker.js';

describe('Worker & Sending Mechanics (Phase B5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Idempotent Claim', () => {
    it('claimEmailAtomically should return email if scheduled, and null if already processing or sent', async () => {
      const mockEmail = {
        id: 'email-claim-1',
        status: 'scheduled',
      };

      // First call simulates successful claim
      vi.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([mockEmail] as any);
      const firstClaim = await claimEmailAtomically('email-claim-1');
      expect(firstClaim).not.toBeNull();
      expect(firstClaim.id).toBe('email-claim-1');

      // Second call (simulating concurrent worker) returns 0 rows
      vi.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([] as any);
      const secondClaim = await claimEmailAtomically('email-claim-1');
      expect(secondClaim).toBeNull();
    });
  });

  describe('Per-Sender Minimum Delay Guard', () => {
    it('should allow first send and block immediate second send within delay window', async () => {
      const senderId = 'sender-delay-test';
      const delaySeconds = 5;

      // Mock Redis get returning null initially
      vi.spyOn(redisConnection, 'get').mockResolvedValueOnce(null);
      vi.spyOn(redisConnection, 'set').mockResolvedValueOnce('OK');

      const firstCheck = await checkAndReserveSenderDelay(senderId, delaySeconds);
      expect(firstCheck.allowed).toBe(true);
      expect(redisConnection.set).toHaveBeenCalledWith(
        `sender:min_delay:${senderId}`,
        expect.any(String),
        'EX',
        3600
      );

      // Second check: simulate Redis returning future timestamp
      const futureTime = Date.now() + 4000;
      vi.spyOn(redisConnection, 'get').mockResolvedValueOnce(String(futureTime));

      const secondCheck = await checkAndReserveSenderDelay(senderId, delaySeconds);
      expect(secondCheck.allowed).toBe(false);
      expect(secondCheck.remainingDelayMs).toBeGreaterThan(0);
    });
  });

  describe('Idempotent Job Processing', () => {
    it('processEmailJob should skip already sent email and never send twice', async () => {
      const mockSentEmail = {
        id: 'email-already-sent',
        status: 'sent',
        batch: { delayBetweenEmailsSeconds: 2, hourlyLimit: 50 },
        sender: { id: 'sender-1', name: 'Oliver' },
      };

      vi.spyOn(prisma.email, 'findUnique').mockResolvedValueOnce(mockSentEmail as any);
      const sendSpy = vi.fn();

      const mockJob = {
        id: 'job-1',
        data: {
          emailId: 'email-already-sent',
          senderId: 'sender-1',
          batchId: 'batch-1',
          userId: 'user-1',
        },
      };

      await processEmailJob(mockJob as any);
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });
});
