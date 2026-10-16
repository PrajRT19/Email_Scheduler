import { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import { Sender } from '../types/api.js';

export async function getSenders(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let senders = await prisma.sender.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // If database has no senders yet, auto-provision one test account dynamically
    if (senders.length === 0) {
      try {
        const testAccount = await nodemailer.createTestAccount();
        const created = await prisma.sender.create({
          data: {
            email: testAccount.user,
            name: 'Oliver Brown',
            etherealUser: testAccount.user,
            etherealPass: testAccount.pass,
            etherealHost: testAccount.smtp.host,
            etherealPort: testAccount.smtp.port,
            etherealSecure: testAccount.smtp.secure,
          },
          select: {
            id: true,
            email: true,
            name: true,
          },
        });
        senders = [created];
      } catch (e) {
        logger.warn({ err: e }, 'Could not auto-create Ethereal account on getSenders');
      }
    }

    const data: Sender[] = senders.map((s) => ({
      id: s.id,
      email: s.email,
      name: s.name,
    }));

    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}
