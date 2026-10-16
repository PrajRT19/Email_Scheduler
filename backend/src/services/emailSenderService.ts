import nodemailer from 'nodemailer';
import { prisma } from '../db/prisma.js';
import { redisConnection } from '../queue/emailQueue.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Cache nodemailer transporters by senderId
const transporterCache = new Map<string, nodemailer.Transporter>();

export function getTransporter(sender: {
  id: string;
  etherealUser: string;
  etherealPass: string;
  etherealHost: string;
  etherealPort: number;
  etherealSecure: boolean;
}): nodemailer.Transporter {
  if (transporterCache.has(sender.id)) {
    return transporterCache.get(sender.id)!;
  }

  const transporter = nodemailer.createTransport({
    host: sender.etherealHost,
    port: sender.etherealPort,
    secure: sender.etherealSecure,
    auth: {
      user: sender.etherealUser,
      pass: sender.etherealPass,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  transporterCache.set(sender.id, transporter);
  return transporter;
}

/**
 * Atomically claim an email for sending.
 * Returns the email row if successfully claimed, or null if already claimed / sent.
 */
export async function claimEmailAtomically(emailId: string): Promise<any | null> {
  const result: any[] = await prisma.$queryRaw`
    UPDATE "Email"
    SET status = 'processing'::"EmailStatus", "updatedAt" = NOW()
    WHERE id = ${emailId} AND status = 'scheduled'::"EmailStatus"
    RETURNING *;
  `;

  if (!result || result.length === 0) {
    return null;
  }

  return result[0];
}

/**
 * Enforce minimum delay between sends per sender via atomic Redis check.
 * Returns { allowed: true } or { allowed: false, retryAt: number, remainingDelayMs: number }.
 */
export async function checkAndReserveSenderDelay(
  senderId: string,
  batchDelaySeconds: number
): Promise<{ allowed: boolean; retryAt?: number; remainingDelayMs?: number }> {
  const delaySec = Math.max(
    batchDelaySeconds || 0,
    env.MIN_DELAY_BETWEEN_EMAILS_SECONDS
  );
  const delayMs = delaySec * 1000;
  const now = Date.now();
  const redisKey = `sender:min_delay:${senderId}`;

  // Check current next allowed send time in Redis
  const nextAllowed = await redisConnection.get(redisKey);

  if (nextAllowed) {
    const nextAllowedMs = parseInt(nextAllowed, 10);
    if (now < nextAllowedMs) {
      const remainingDelayMs = nextAllowedMs - now;
      return {
        allowed: false,
        retryAt: nextAllowedMs,
        remainingDelayMs,
      };
    }
  }

  // Atomically reserve the next send time: now + delayMs
  const newNextAllowed = now + delayMs;
  // Expire key after 1 hour (safety ttl)
  await redisConnection.set(redisKey, String(newNextAllowed), 'EX', 3600);

  return { allowed: true };
}

/**
 * Send an email through Nodemailer (Ethereal SMTP).
 */
export async function sendEmailViaEthereal(
  email: any,
  sender: any
): Promise<{ sent: boolean; previewUrl: string | null; error?: string }> {
  try {
    const transporter = getTransporter(sender);

    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`,
      to: email.to,
      subject: email.subject,
      html: email.bodyHtml,
      text: email.bodyPreview,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    return { sent: true, previewUrl };
  } catch (err: any) {
    logger.error({ err: err.message, emailId: email.id }, 'SMTP delivery failure');
    return { sent: false, previewUrl: null, error: err.message || 'Unknown SMTP error' };
  }
}

/**
 * Record delivery result in the database.
 */
export async function recordEmailResult(
  emailId: string,
  result: { sent: boolean; previewUrl: string | null; error?: string }
): Promise<void> {
  if (result.sent) {
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'sent',
        sentAt: new Date(),
        previewUrl: result.previewUrl,
        failureReason: null,
      },
    });
  } else {
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'failed',
        failureReason: result.error || 'Delivery failed',
      },
    });
  }
}
