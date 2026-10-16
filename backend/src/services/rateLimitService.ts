import { redisConnection } from '../queue/emailQueue.js';
import { logger } from '../utils/logger.js';
import { notifySlackOnLimitHit } from './slackService.js';

/**
 * Lua script for atomic distributed rate limiting per hour window.
 * KEYS[1]: counter key (e.g. rate_limit:senderId:2026-10-16-22)
 * ARGV[1]: hourly limit
 * ARGV[2]: TTL in seconds (e.g. 7200)
 *
 * Returns:
 * [allowed: 1 or 0, currentCount: number, ttlRemaining: number]
 */
const RATE_LIMIT_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = redis.call('get', key)

if current == false then
  redis.call('set', key, 1, 'EX', ttl)
  return {1, 1, ttl}
end

local count = tonumber(current)
if count < limit then
  local newCount = redis.call('incr', key)
  return {1, newCount, redis.call('ttl', key)}
else
  return {0, count, redis.call('ttl', key)}
end
`;

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  rescheduleDelayMs: number;
}

export function getCurrentHourWindow(now = new Date()): { windowId: string; ttlSeconds: number; nextWindowDelayMs: number } {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  const windowId = `${year}-${month}-${day}-${hour}`;

  // Next window starts at top of next hour
  const nextHour = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1, 0, 0, 0));
  const nextWindowDelayMs = Math.max(1000, nextHour.getTime() - now.getTime());
  const ttlSeconds = Math.ceil(nextWindowDelayMs / 1000) + 3600; // keep counter for 1 extra hour

  return { windowId, ttlSeconds, nextWindowDelayMs };
}

export async function checkAndIncrementHourlyLimit(
  senderId: string,
  userId: string,
  hourlyLimit: number
): Promise<RateLimitResult> {
  const { windowId, ttlSeconds, nextWindowDelayMs } = getCurrentHourWindow();
  const key = `rate_limit:${senderId}:${windowId}`;

  try {
    const result = (await redisConnection.eval(
      RATE_LIMIT_LUA,
      1,
      key,
      String(hourlyLimit),
      String(ttlSeconds)
    )) as [number, number, number];

    const allowed = result[0] === 1;
    const count = result[1];

    if (!allowed) {
      // First time hitting limit in this window? Trigger Slack alert asynchronously
      triggerSlackAlertOnce(senderId, userId, windowId, hourlyLimit).catch((err) => {
        logger.warn({ err: err.message }, 'Background Slack alert error');
      });

      // Small jitter between 100ms and 5000ms based on sender/job to preserve relative ordering
      const jitterMs = Math.floor(Math.random() * 2000) + 500;
      const rescheduleDelayMs = nextWindowDelayMs + jitterMs;

      return {
        allowed: false,
        count,
        rescheduleDelayMs,
      };
    }

    return {
      allowed: true,
      count,
      rescheduleDelayMs: 0,
    };
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Redis rate limit check fallback; allowing job');
    return {
      allowed: true,
      count: 1,
      rescheduleDelayMs: 0,
    };
  }
}

async function triggerSlackAlertOnce(
  senderId: string,
  userId: string,
  windowId: string,
  limit: number
): Promise<void> {
  const alertKey = `slack_alert_sent:${senderId}:${windowId}`;
  const alreadySent = await redisConnection.get(alertKey);

  if (!alreadySent) {
    // Atomically set with 2-hour TTL to prevent duplicate alerts in same window
    const setRes = await redisConnection.set(alertKey, '1', 'EX', 7200, 'NX');
    if (setRes === 'OK') {
      await notifySlackOnLimitHit(userId, senderId, limit, windowId);
    }
  }
}
