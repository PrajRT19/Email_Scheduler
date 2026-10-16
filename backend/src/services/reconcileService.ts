import { emailQueue } from '../queue/emailQueue.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Reconcile on boot:
 * 1. Find all DB emails in 'scheduled' status whose scheduledAt is in the past — these may
 *    have lost their BullMQ job due to a Redis flush or server crash.
 * 2. For each, check if a delayed job already exists in BullMQ.
 * 3. Re-enqueue any that are missing.
 * 4. Find any 'processing' rows that are stuck (> 5 min old) and reset them to 'scheduled'.
 */
export async function reconcileJobsOnBoot(): Promise<void> {
  logger.info('🔄 Running boot reconciliation...');

  try {
    // Step 1: Reset stuck 'processing' rows (older than 5 minutes)
    const stuckCutoff = new Date(Date.now() - 5 * 60 * 1000);
    const stuck = await prisma.email.updateMany({
      where: {
        status: 'processing',
        updatedAt: { lt: stuckCutoff },
      },
      data: {
        status: 'scheduled',
      },
    });

    if (stuck.count > 0) {
      logger.info({ count: stuck.count }, '♻️  Recovered stuck processing emails to scheduled');
    }

    // Step 2: Find all scheduled emails
    const scheduled = await prisma.email.findMany({
      where: { status: 'scheduled' },
      select: {
        id: true,
        batchId: true,
        userId: true,
        senderId: true,
        scheduledAt: true,
        batch: {
          select: {
            delayBetweenEmailsSeconds: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    if (scheduled.length === 0) {
      logger.info('✅ Reconciliation complete — no scheduled emails pending');
      return;
    }

    logger.info({ count: scheduled.length }, 'Checking BullMQ jobs for scheduled emails');

    let requeued = 0;

    for (const email of scheduled) {
      const existingJob = await emailQueue.getJob(email.id);

      if (!existingJob) {
        // Job missing — re-enqueue
        const now = Date.now();
        const targetMs = email.scheduledAt.getTime();
        const delay = Math.max(0, targetMs - now);

        await emailQueue.add(
          'send-email',
          {
            emailId: email.id,
            batchId: email.batchId,
            userId: email.userId,
            senderId: email.senderId,
          },
          {
            jobId: email.id,
            delay,
          }
        );

        requeued++;
      }
    }

    logger.info({ requeued, total: scheduled.length }, '✅ Boot reconciliation complete');
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Boot reconciliation error — continuing startup');
  }
}
