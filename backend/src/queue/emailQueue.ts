import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const QUEUE_NAME = 'email-queue';

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableReadyCheck: false,
});

redisConnection.on('error', (err) => {
  logger.warn({ err: err.message }, 'Redis connection warning in queue');
});

export const emailQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection as any,
  defaultJobOptions: {
    removeOnComplete: {
      age: 24 * 3600, // keep complete jobs for 24h
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed jobs for 7 days
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});
