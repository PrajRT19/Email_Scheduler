import { Router } from 'express';
import { handleGoogleRedirect, handleGoogleCallback, getMe, logout } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.get('/auth/google', handleGoogleRedirect);
authRouter.get('/auth/google/callback', handleGoogleCallback);
authRouter.get('/auth/me', requireAuth, getMe);
authRouter.post('/auth/logout', logout);
