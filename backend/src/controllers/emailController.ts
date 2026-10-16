import { Request, Response, NextFunction } from 'express';
import { scheduleEmailBatch } from '../services/scheduleService.js';
import {
  getScheduledEmails,
  getSentEmails,
  getEmailCounts,
  getEmailDetail,
} from '../services/emailService.js';

export async function handleScheduleEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await scheduleEmailBatch(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetScheduled(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getScheduledEmails(req.user!.id, {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      q: req.query.q as string | undefined,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetSent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getSentEmails(req.user!.id, {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      q: req.query.q as string | undefined,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetCounts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const counts = await getEmailCounts(req.user!.id);
    res.status(200).json(counts);
  } catch (err) {
    next(err);
  }
}

export async function handleGetDetail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const detail = await getEmailDetail(req.user!.id, String(req.params.id));
    res.status(200).json(detail);
  } catch (err) {
    next(err);
  }
}
