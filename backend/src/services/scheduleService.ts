import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma.js';
import { emailQueue } from '../queue/emailQueue.js';
import { env } from '../config/env.js';
import { createBodyPreview } from '../utils/text.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { ScheduleEmailInput, ScheduleEmailResponse } from '../types/api.js';
import { logger } from '../utils/logger.js';
import { indexEmail } from './elasticsearchService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ValidatedScheduleData {
  senderId: string;
  subject: string;
  bodyHtml: string;
  uniqueRecipients: string[];
  totalRecipients: number;
  duplicatesRemoved: number;
  effectiveStartTime: Date;
  delayBetweenEmailsSeconds: number;
  hourlyLimit: number;
}

export function validateScheduleInput(input: ScheduleEmailInput): ValidatedScheduleData {
  const {
    senderId,
    subject,
    bodyHtml,
    recipients,
    startTime,
    delayBetweenEmailsSeconds = 0,
    hourlyLimit = 50,
  } = input;

  if (!senderId || typeof senderId !== 'string') {
    throw new ValidationError('senderId is required');
  }

  if (!subject || typeof subject !== 'string' || subject.trim() === '') {
    throw new ValidationError('subject is required and cannot be empty');
  }

  if (!bodyHtml || typeof bodyHtml !== 'string' || bodyHtml.trim() === '') {
    throw new ValidationError('bodyHtml is required and cannot be empty');
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new ValidationError('recipients must be a non-empty array of email strings');
  }

  if (recipients.length > env.MAX_RECIPIENTS_PER_REQUEST) {
    throw new ValidationError(
      `Number of recipients exceeds maximum allowed (${env.MAX_RECIPIENTS_PER_REQUEST})`
    );
  }

  // Validate every email address
  const invalidEmails: string[] = [];
  const normalizedRecipients: string[] = [];

  for (const r of recipients) {
    if (typeof r !== 'string' || !EMAIL_REGEX.test(r.trim())) {
      invalidEmails.push(String(r));
    } else {
      normalizedRecipients.push(r.trim().toLowerCase());
    }
  }

  if (invalidEmails.length > 0) {
    throw new ValidationError('Invalid recipient email addresses detected', invalidEmails);
  }

  // Deduplicate recipients
  const uniqueRecipients = Array.from(new Set(normalizedRecipients));
  const duplicatesRemoved = recipients.length - uniqueRecipients.length;

  // Validate startTime
  const parsedDate = new Date(startTime);
  if (isNaN(parsedDate.getTime())) {
    throw new ValidationError('Invalid startTime format, must be an ISO-8601 string');
  }

  const now = Date.now();
  let effectiveStartTime = parsedDate;

  // startTime more than 60s in the past -> 400 error
  if (parsedDate.getTime() < now - 60000) {
    throw new ValidationError('Start time cannot be more than 60 seconds in the past');
  } else if (parsedDate.getTime() < now) {
    // otherwise clamp to now
    effectiveStartTime = new Date(now);
  }

  // Validate delay and hourly limit
  const numDelay = Number(delayBetweenEmailsSeconds);
  if (isNaN(numDelay) || numDelay < 0 || !Number.isInteger(numDelay)) {
    throw new ValidationError('delayBetweenEmailsSeconds must be an integer >= 0');
  }

  const numLimit = Number(hourlyLimit);
  if (isNaN(numLimit) || numLimit < 1 || !Number.isInteger(numLimit)) {
    throw new ValidationError('hourlyLimit must be an integer >= 1');
  }

  return {
    senderId,
    subject: subject.trim(),
    bodyHtml,
    uniqueRecipients,
    totalRecipients: recipients.length,
    duplicatesRemoved,
    effectiveStartTime,
    delayBetweenEmailsSeconds: numDelay,
    hourlyLimit: numLimit,
  };
}

export async function scheduleEmailBatch(
  userId: string,
  input: ScheduleEmailInput
): Promise<ScheduleEmailResponse> {
  const validated = validateScheduleInput(input);

  // Check sender existence
  const sender = await prisma.sender.findUnique({
    where: { id: validated.senderId },
  });

  if (!sender) {
    throw new NotFoundError(`Sender with id '${validated.senderId}' not found`);
  }

  const batchId = randomUUID();
  const startTimeMs = validated.effectiveStartTime.getTime();
  const delayMs = validated.delayBetweenEmailsSeconds * 1000;
  const count = validated.uniqueRecipients.length;

  const firstScheduledAt = new Date(startTimeMs);
  const lastScheduledAt = new Date(startTimeMs + (count - 1) * delayMs);
  const preview = createBodyPreview(validated.bodyHtml);

  // Prepare Email entities
  const emailsToInsert = validated.uniqueRecipients.map((to, index) => {
    const scheduledAt = new Date(startTimeMs + index * delayMs);
    const emailId = randomUUID();
    return {
      id: emailId,
      batchId,
      userId,
      senderId: sender.id,
      senderEmail: sender.email,
      to,
      subject: validated.subject,
      bodyHtml: validated.bodyHtml,
      bodyPreview: preview,
      status: 'scheduled' as const,
      scheduledAt,
    };
  });

  // Transaction: Create Batch and Email rows
  await prisma.$transaction(async (tx) => {
    await tx.batch.create({
      data: {
        id: batchId,
        userId,
        senderId: sender.id,
        subject: validated.subject,
        bodyHtml: validated.bodyHtml,
        totalRecipients: validated.totalRecipients,
        scheduledCount: validated.uniqueRecipients.length,
        duplicatesRemoved: validated.duplicatesRemoved,
        delayBetweenEmailsSeconds: validated.delayBetweenEmailsSeconds,
        hourlyLimit: validated.hourlyLimit,
        firstScheduledAt,
        lastScheduledAt,
      },
    });

    // Chunked inserts for high volumes (chunks of 500)
    const CHUNK_SIZE = 500;
    for (let i = 0; i < emailsToInsert.length; i += CHUNK_SIZE) {
      const chunk = emailsToInsert.slice(i, i + CHUNK_SIZE);
      await tx.email.createMany({
        data: chunk,
      });
    }
  });

  // Enqueue delayed BullMQ jobs in chunks of 500
  const now = Date.now();
  const CHUNK_SIZE = 500;

  for (let i = 0; i < emailsToInsert.length; i += CHUNK_SIZE) {
    const chunk = emailsToInsert.slice(i, i + CHUNK_SIZE);
    const jobs = chunk.map((email) => {
      const targetTime = email.scheduledAt.getTime();
      const delay = Math.max(0, targetTime - now);
      return {
        name: 'send-email',
        data: {
          emailId: email.id,
          batchId: email.batchId,
          userId: email.userId,
          senderId: email.senderId,
        },
        opts: {
          jobId: email.id, // Idempotent: same email ID produces same job
          delay,
        },
      };
    });

    try {
      await emailQueue.addBulk(jobs);
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Queue addBulk deferred (Redis may be offline)');
    }
  }

  // Index emails in Elasticsearch asynchronously (non-blocking)
  const now2 = new Date();
  Promise.all(
    emailsToInsert.map((email) =>
      indexEmail({
        id: email.id,
        userId: email.userId,
        batchId: email.batchId,
        senderId: email.senderId,
        senderEmail: email.senderEmail,
        to: email.to,
        subject: email.subject,
        bodyPreview: preview,
        status: email.status,
        scheduledAt: email.scheduledAt,
        sentAt: null,
        createdAt: now2,
      })
    )
  ).catch((err) => logger.warn({ err: err?.message }, 'ES bulk index error'));

  return {
    batchId,
    senderId: sender.id,
    totalRecipients: validated.totalRecipients,
    scheduledCount: validated.uniqueRecipients.length,
    duplicatesRemoved: validated.duplicatesRemoved,
    firstScheduledAt: firstScheduledAt.toISOString(),
    lastScheduledAt: lastScheduledAt.toISOString(),
  };
}
