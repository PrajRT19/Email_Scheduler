import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentHourWindow, checkAndIncrementHourlyLimit } from '../src/services/rateLimitService.js';
import { redisConnection } from '../src/queue/emailQueue.js';

// Mock the slackService to avoid network calls
vi.mock('../src/services/slackService.js', () => ({
  notifySlackOnLimitHit: vi.fn().mockResolvedValue(undefined),
  getSlackOAuthUrl: vi.fn(() => 'https://slack.com/oauth/mock'),
}));

describe('Rate Limiting Service (Phase B6)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentHourWindow', () => {
    it('returns a window ID in YYYY-MM-DD-HH format', () => {
      const { windowId, ttlSeconds, nextWindowDelayMs } = getCurrentHourWindow(new Date('2026-10-16T14:30:00Z'));
      expect(windowId).toBe('2026-10-16-14');
      expect(ttlSeconds).toBeGreaterThan(3600); // current window remainder + 1 extra hour
      expect(nextWindowDelayMs).toBeGreaterThan(0);
      expect(nextWindowDelayMs).toBeLessThanOrEqual(3600 * 1000);
    });

    it('calculates nextWindowDelayMs correctly at the top of the hour', () => {
      // 1 second into an hour
      const { nextWindowDelayMs } = getCurrentHourWindow(new Date('2026-10-16T14:00:01Z'));
      // Should be close to 3600s - 1s = 3599s, plus minimum floor of 1s
      expect(nextWindowDelayMs).toBeGreaterThan(3598 * 1000);
      expect(nextWindowDelayMs).toBeLessThanOrEqual(3600 * 1000);
    });
  });

  describe('checkAndIncrementHourlyLimit Lua script', () => {
    it('allows sends under the limit', async () => {
      vi.spyOn(redisConnection, 'eval').mockResolvedValueOnce([1, 5, 3300]);

      const result = await checkAndIncrementHourlyLimit('sender-abc', 'user-1', 50);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(5);
      expect(result.rescheduleDelayMs).toBe(0);
    });

    it('denies sends at or above the limit and returns a reschedule delay', async () => {
      vi.spyOn(redisConnection, 'eval').mockResolvedValueOnce([0, 50, 1800]);

      const result = await checkAndIncrementHourlyLimit('sender-abc', 'user-1', 50);
      expect(result.allowed).toBe(false);
      expect(result.count).toBe(50);
      expect(result.rescheduleDelayMs).toBeGreaterThan(0);
    });

    it('falls back to allowing the job when Redis throws', async () => {
      vi.spyOn(redisConnection, 'eval').mockRejectedValueOnce(new Error('Redis timeout'));

      const result = await checkAndIncrementHourlyLimit('sender-abc', 'user-1', 50);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Slack alert deduplication', () => {
    it('only fires the Slack alert once per window (NX set pattern)', async () => {
      const { notifySlackOnLimitHit } = await import('../src/services/slackService.js');

      // First call: Redis returns null (alert not yet sent), SET NX succeeds
      vi.spyOn(redisConnection, 'get').mockResolvedValueOnce(null);
      vi.spyOn(redisConnection, 'set').mockResolvedValueOnce('OK' as any);
      vi.spyOn(redisConnection, 'eval').mockResolvedValueOnce([0, 20, 1800]);

      await checkAndIncrementHourlyLimit('sender-x', 'user-x', 20);
      // Allow async alert to process
      await new Promise((r) => setTimeout(r, 50));

      expect(notifySlackOnLimitHit).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Validate Schedule Input (Phase B4)', () => {
  it('rejects past startTime (> 60s ago)', async () => {
    const { validateScheduleInput } = await import('../src/services/scheduleService.js');
    expect(() =>
      validateScheduleInput({
        senderId: 'a',
        subject: 'Test',
        bodyHtml: '<p>Test</p>',
        recipients: ['test@example.com'],
        startTime: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        delayBetweenEmailsSeconds: 0,
        hourlyLimit: 10,
      })
    ).toThrow('60 seconds');
  });

  it('deduplicates recipients correctly', async () => {
    const { validateScheduleInput } = await import('../src/services/scheduleService.js');
    const result = validateScheduleInput({
      senderId: 'sender-1',
      subject: 'Test',
      bodyHtml: '<p>Test</p>',
      recipients: ['a@x.com', 'A@X.COM', 'b@x.com', 'a@x.com'],
      startTime: new Date(Date.now() + 5000).toISOString(),
      delayBetweenEmailsSeconds: 1,
      hourlyLimit: 10,
    });
    expect(result.uniqueRecipients).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(2);
  });

  it('rejects invalid email addresses', async () => {
    const { validateScheduleInput } = await import('../src/services/scheduleService.js');
    expect(() =>
      validateScheduleInput({
        senderId: 'sender-1',
        subject: 'Test',
        bodyHtml: '<p>Test</p>',
        recipients: ['notanemail', 'valid@email.com'],
        startTime: new Date(Date.now() + 5000).toISOString(),
        delayBetweenEmailsSeconds: 0,
        hourlyLimit: 10,
      })
    ).toThrow('Invalid recipient');
  });
});
