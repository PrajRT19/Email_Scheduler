import { Worker, Job, DelayedError } from 'bullmq';
import { QUEUE_NAME, redisConnection } from '../queue/emailQueue.js';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  claimEmailAtomically,
  checkAndReserveSenderDelay,
  sendEmailViaEthereal,
  recordEmailResult,
} from '../services/emailSenderService.js';
import { checkAndIncrementHourlyLimit } from '../services/rateLimitService.js';

export interface EmailJobData {
  emailId: string;
  batchId: string;
  userId: string;
  senderId: string;
}

export async function processEmailJob(job: Job<EmailJobData>, token?: string): Promise<void> {
  const { emailId, senderId } = job.data;
  logger.info({ emailId, jobId: job.id }, 'Processing email job');

  // 1. Fetch email and sender details
  const emailRecord = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      batch: true,
      sender: true,
    },
  });

  if (!emailRecord) {
    logger.warn({ emailId }, 'Email record not found, skipping job');
    return;
  }

  // If already sent or failed, maintain idempotency and exit immediately
  if (emailRecord.status === 'sent' || emailRecord.status === 'failed') {
    logger.info({ emailId, status: emailRecord.status }, 'Email already finalized, skipping');
    return;
  }

  // 2. Enforce Minimum Delay between sends per sender
  const delayCheck = await checkAndReserveSenderDelay(
    senderId,
    emailRecord.batch?.delayBetweenEmailsSeconds ?? 0
  );

  if (!delayCheck.allowed && delayCheck.retryAt) {
    logger.info(
      { emailId, senderId, delayMs: delayCheck.remainingDelayMs },
      'Minimum delay throttle active: rescheduling via moveToDelayed'
    );
    if (token) {
      await job.moveToDelayed(delayCheck.retryAt, token);
      throw new DelayedError();
    } else {
      // Fallback delay
      return;
    }
  }

  // 3. Enforce Distributed Hourly Rate Limit per sender (Lua script)
  const hourlyLimit = emailRecord.batch?.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER;
  const rateLimitResult = await checkAndIncrementHourlyLimit(
    senderId,
    emailRecord.userId,
    hourlyLimit
  );

  if (!rateLimitResult.allowed) {
    logger.warn(
      { emailId, senderId, nextWindowMs: rateLimitResult.rescheduleDelayMs },
      'Hourly rate limit exceeded: rescheduling job into next window'
    );

    // Reschedule to next window start + offset, update DB scheduledAt, consume NO slot
    const newScheduledAt = new Date(Date.now() + rateLimitResult.rescheduleDelayMs);
    await prisma.email.update({
      where: { id: emailId },
      data: { scheduledAt: newScheduledAt },
    });

    if (token) {
      await job.moveToDelayed(newScheduledAt.getTime(), token);
      throw new DelayedError();
    }
    return;
  }

  // 4. Atomically claim row (concurrency safety across workers)
  const claimed = await claimEmailAtomically(emailId);
  if (!claimed) {
    logger.info({ emailId }, 'Email already claimed by another worker, skipping');
    return;
  }

  // 5. Deliver email through Nodemailer (Ethereal SMTP)
  const result = await sendEmailViaEthereal(claimed, emailRecord.sender);

  // 6. Record final outcome in DB
  await recordEmailResult(emailId, result);

  logger.info(
    { emailId, success: result.sent, previewUrl: result.previewUrl },
    'Email delivery job completed'
  );
}

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    QUEUE_NAME,
    async (job, token) => {
      await processEmailJob(job, token);
    },
    {
      connection: redisConnection as any,
      concurrency: env.WORKER_CONCURRENCY,
      lockDuration: 30000,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Job completed successfully');
  });

  worker.on('failed', (job, err) => {
    if (err instanceof DelayedError) {
      // Normal moveToDelayed flow
      return;
    }
    logger.error({ jobId: job?.id, err: err.message }, 'Job execution failed');
  });

  logger.info(
    `✅ Worker registered for queue '${QUEUE_NAME}' with concurrency = ${env.WORKER_CONCURRENCY}`
  );

  return worker;
}
