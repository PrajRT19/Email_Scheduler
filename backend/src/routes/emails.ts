import { Router } from 'express';
import {
  handleScheduleEmail,
  handleGetScheduled,
  handleGetSent,
  handleGetCounts,
  handleGetDetail,
} from '../controllers/emailController.js';
import { requireAuth } from '../middleware/auth.js';

export const emailRouter = Router();

emailRouter.post('/emails/schedule', requireAuth, handleScheduleEmail);
emailRouter.get('/emails/scheduled', requireAuth, handleGetScheduled);
emailRouter.get('/emails/sent', requireAuth, handleGetSent);
emailRouter.get('/emails/counts', requireAuth, handleGetCounts);
emailRouter.get('/emails/:id', requireAuth, handleGetDetail);
