import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { getSlackOAuthUrl } from '../services/slackService.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/slack/connect
 * Redirects user to Slack OAuth v2 authorization page.
 */
export async function connectSlack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const slackUrl = getSlackOAuthUrl(userId);
    res.redirect(slackUrl);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/slack/callback
 * Handles Slack OAuth v2 callback: exchanges code for access token, stores webhookUrl.
 */
export async function slackCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, state: userId } = req.query as { code: string; state: string };

    if (!code || !userId) {
      res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Missing code or state parameter' } });
      return;
    }

    let webhookUrl: string;
    let teamName: string;

    if (env.SLACK_CLIENT_ID === 'mock-slack-client-id') {
      // Mock mode: store a placeholder webhook for local dev/testing
      webhookUrl = `https://hooks.slack.com/services/mock/${userId}/webhook`;
      teamName = 'MockTeam';
      logger.info({ userId }, 'Slack connected in MOCK mode');
    } else {
      // Real Slack OAuth token exchange
      const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.SLACK_CLIENT_ID,
          client_secret: env.SLACK_CLIENT_SECRET,
          redirect_uri: env.SLACK_REDIRECT_URI,
        }),
      });

      const tokenData = (await tokenRes.json()) as any;

      if (!tokenData.ok) {
        logger.warn({ error: tokenData.error }, 'Slack OAuth token exchange failed');
        res.redirect(`${env.FRONTEND_URL}?slack_error=${encodeURIComponent(tokenData.error)}`);
        return;
      }

      webhookUrl = tokenData.incoming_webhook?.url || '';
      teamName = tokenData.team?.name || 'Unknown Team';

      if (!webhookUrl) {
        res.status(400).json({ error: { code: 'SLACK_NO_WEBHOOK', message: 'Slack app did not return a webhook URL. Ensure incoming-webhook scope is granted.' } });
        return;
      }
    }

    // Upsert SlackConnection for this user
    await prisma.slackConnection.upsert({
      where: { userId },
      update: { webhookUrl, teamName },
      create: { userId, webhookUrl, teamName },
    });

    logger.info({ userId, teamName }, 'Slack connection saved');

    // Redirect back to frontend
    res.redirect(`${env.FRONTEND_URL}?slack_connected=true`);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/slack/status
 * Returns whether Slack is connected for the authenticated user.
 */
export async function getSlackStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    const conn = await prisma.slackConnection.findUnique({ where: { userId } });

    if (!conn) {
      res.json({ connected: false });
      return;
    }

    res.json({
      connected: true,
      teamName: conn.teamName,
      connectedAt: conn.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/slack/disconnect
 * Removes the Slack integration for the authenticated user.
 */
export async function disconnectSlack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.session.userId!;
    await prisma.slackConnection.deleteMany({ where: { userId } });
    logger.info({ userId }, 'Slack disconnected');
    res.json({ disconnected: true });
  } catch (err) {
    next(err);
  }
}
