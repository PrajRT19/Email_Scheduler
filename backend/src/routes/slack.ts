import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  connectSlack,
  slackCallback,
  getSlackStatus,
  disconnectSlack,
} from '../controllers/slackController.js';

export const slackRouter = Router();

slackRouter.get('/slack/connect', requireAuth, connectSlack);
slackRouter.get('/slack/callback', slackCallback);
slackRouter.get('/slack/status', requireAuth, getSlackStatus);
slackRouter.delete('/slack/disconnect', requireAuth, disconnectSlack);
