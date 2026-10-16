import { Request, Response, NextFunction } from 'express';
import { UnauthenticatedError } from '../utils/errors.js';
import { prisma } from '../db/prisma.js';
import { User } from '../types/api.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      throw new UnauthenticatedError('Authentication required');
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    if (!dbUser) {
      if (req.session) {
        req.session.destroy(() => {});
      }
      throw new UnauthenticatedError('User session invalid');
    }

    req.user = dbUser;
    next();
  } catch (err) {
    next(err);
  }
}
