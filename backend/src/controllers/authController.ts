import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { getGoogleAuthUrl, exchangeCodeForGoogleProfile, upsertGoogleUser } from '../services/authService.js';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

export async function handleGoogleRedirect(_req: Request, res: Response): Promise<void> {
  const url = getGoogleAuthUrl();
  res.redirect(302, url);
}

export async function handleGoogleCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const code = req.query.code as string;
    if (!code) {
      throw new ValidationError('Missing authorization code');
    }

    const profile = await exchangeCodeForGoogleProfile(code);
    const user = await upsertGoogleUser(profile);

    if (!req.session) {
      throw new Error('Session store not available');
    }

    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        logger.error({ err }, 'Failed to save user session');
        return next(err);
      }
      res.redirect(302, `${env.FRONTEND_URL}/dashboard`);
    });
  } catch (err) {
    logger.error({ err }, 'Google auth callback error');
    res.redirect(302, `${env.FRONTEND_URL}/login?error=auth_failed`);
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  // req.user is guaranteed by requireAuth
  res.status(200).json({ user: req.user });
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        logger.error({ err }, 'Failed to destroy session');
        return next(err);
      }
      res.clearCookie('sid');
      res.status(200).json({ success: true });
    });
  } else {
    res.clearCookie('sid');
    res.status(200).json({ success: true });
  }
}
