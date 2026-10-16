import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export async function notifySlackOnLimitHit(
  userId: string,
  senderId: string,
  limit: number,
  windowId: string
): Promise<void> {
  try {
    const slackConn = await prisma.slackConnection.findUnique({
      where: { userId },
    });

    if (!slackConn || !slackConn.webhookUrl) {
      // User has not connected Slack, skip silently
      return;
    }

    const sender = await prisma.sender.findUnique({
      where: { id: senderId },
    });

    const senderName = sender ? `${sender.name} (${sender.email})` : senderId;
    const message = {
      text: `⚠️ *ReachInbox Rate Limit Alert*: Sender *${senderName}* has reached the hourly limit of *${limit} emails* in window \`${windowId}\`. Remaining emails have been queued for the next window.`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ Hourly Email Limit Reached',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Sender:* ${senderName}\n*Hourly Limit:* ${limit} emails/hour\n*Window:* \`${windowId}\`\n*Action:* Rate limiting active. Overflow emails are safely rescheduled into the next hour window preserving sequence.`,
          },
        },
      ],
    };

    const response = await fetch(slackConn.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, 'Slack webhook delivery returned non-200');
    } else {
      logger.info({ userId, senderId, windowId }, 'Slack rate limit notification delivered');
    }
  } catch (err: any) {
    // Log failure without failing the email job
    logger.warn({ err: err.message }, 'Failed to deliver Slack limit notification');
  }
}

export function getSlackOAuthUrl(userId: string): string {
  if (env.SLACK_CLIENT_ID === 'mock-slack-client-id') {
    return `${env.SLACK_REDIRECT_URI}?code=mock-slack-code&state=${userId}`;
  }

  const rootUrl = 'https://slack.com/oauth/v2/authorize';
  const options = {
    client_id: env.SLACK_CLIENT_ID,
    scope: 'incoming-webhook',
    redirect_uri: env.SLACK_REDIRECT_URI,
    state: userId,
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}
