import { prisma } from '../db/prisma.js';
import { EmailListItem, EmailDetail, Paginated, EmailCountsResponse } from '../types/api.js';
import { NotFoundError } from '../utils/errors.js';

export interface EmailQueryParams {
  page?: number;
  limit?: number;
  q?: string;
}

export async function getScheduledEmails(
  userId: string,
  params: EmailQueryParams
): Promise<Paginated<EmailListItem>> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;
  const q = params.q?.trim();

  const whereClause: any = {
    userId,
    status: { in: ['scheduled', 'processing'] },
  };

  if (q) {
    whereClause.OR = [
      { to: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { bodyPreview: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.email.count({ where: whereClause }),
    prisma.email.findMany({
      where: whereClause,
      orderBy: { scheduledAt: 'asc' },
      skip,
      take: limit,
      select: {
        id: true,
        batchId: true,
        senderId: true,
        senderEmail: true,
        to: true,
        subject: true,
        bodyPreview: true,
        status: true,
        scheduledAt: true,
        sentAt: true,
        failureReason: true,
      },
    }),
  ]);

  const data: EmailListItem[] = items.map((item) => ({
    id: item.id,
    batchId: item.batchId,
    senderId: item.senderId,
    senderEmail: item.senderEmail,
    to: item.to,
    subject: item.subject,
    bodyPreview: item.bodyPreview,
    status: item.status,
    scheduledAt: item.scheduledAt.toISOString(),
    sentAt: item.sentAt ? item.sentAt.toISOString() : null,
    failureReason: item.failureReason,
  }));

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getSentEmails(
  userId: string,
  params: EmailQueryParams
): Promise<Paginated<EmailListItem>> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;
  const q = params.q?.trim();

  const whereClause: any = {
    userId,
    status: { in: ['sent', 'failed'] },
  };

  if (q) {
    whereClause.OR = [
      { to: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { bodyPreview: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.email.count({ where: whereClause }),
    prisma.email.findMany({
      where: whereClause,
      orderBy: { sentAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        batchId: true,
        senderId: true,
        senderEmail: true,
        to: true,
        subject: true,
        bodyPreview: true,
        status: true,
        scheduledAt: true,
        sentAt: true,
        failureReason: true,
      },
    }),
  ]);

  const data: EmailListItem[] = items.map((item) => ({
    id: item.id,
    batchId: item.batchId,
    senderId: item.senderId,
    senderEmail: item.senderEmail,
    to: item.to,
    subject: item.subject,
    bodyPreview: item.bodyPreview,
    status: item.status,
    scheduledAt: item.scheduledAt.toISOString(),
    sentAt: item.sentAt ? item.sentAt.toISOString() : null,
    failureReason: item.failureReason,
  }));

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getEmailCounts(userId: string): Promise<EmailCountsResponse> {
  const [scheduled, sent] = await Promise.all([
    prisma.email.count({
      where: {
        userId,
        status: { in: ['scheduled', 'processing'] },
      },
    }),
    prisma.email.count({
      where: {
        userId,
        status: { in: ['sent', 'failed'] },
      },
    }),
  ]);

  return { scheduled, sent };
}

export async function getEmailDetail(userId: string, id: string): Promise<EmailDetail> {
  const email = await prisma.email.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!email) {
    throw new NotFoundError(`Email with id '${id}' not found`);
  }

  return {
    id: email.id,
    batchId: email.batchId,
    senderId: email.senderId,
    senderEmail: email.senderEmail,
    to: email.to,
    subject: email.subject,
    bodyHtml: email.bodyHtml,
    bodyPreview: email.bodyPreview,
    status: email.status,
    scheduledAt: email.scheduledAt.toISOString(),
    sentAt: email.sentAt ? email.sentAt.toISOString() : null,
    previewUrl: email.previewUrl,
    failureReason: email.failureReason,
    createdAt: email.createdAt.toISOString(),
  };
}
