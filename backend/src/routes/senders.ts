import { Router } from 'express';
import { getSenders } from '../controllers/senderController.js';
import { requireAuth } from '../middleware/auth.js';

export const senderRouter = Router();

senderRouter.get('/senders', requireAuth, getSenders);
