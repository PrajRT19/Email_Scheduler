import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const esClient = new Client({ node: env.ELASTICSEARCH_NODE });

export const EMAIL_INDEX = 'emails';

/**
 * Initialize the Elasticsearch index mapping. Called once on startup.
 * Safe to call on an already-existing index.
 */
export async function ensureEmailIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: EMAIL_INDEX });
    if (exists) {
      logger.info('Elasticsearch email index already exists');
      return;
    }

    await esClient.indices.create({
      index: EMAIL_INDEX,
      mappings: {
        properties: {
          userId: { type: 'keyword' },
          batchId: { type: 'keyword' },
          senderId: { type: 'keyword' },
          senderEmail: { type: 'keyword' },
          to: { type: 'keyword' },
          subject: { type: 'text', analyzer: 'standard' },
          bodyPreview: { type: 'text', analyzer: 'standard' },
          status: { type: 'keyword' },
          scheduledAt: { type: 'date' },
          sentAt: { type: 'date' },
          createdAt: { type: 'date' },
        },
      },
    });

    logger.info('Elasticsearch email index created');
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Elasticsearch index setup skipped (not available)');
  }
}

/**
 * Index or update an email document in Elasticsearch.
 */
export async function indexEmail(email: {
  id: string;
  userId: string;
  batchId: string;
  senderId: string;
  senderEmail: string;
  to: string;
  subject: string;
  bodyPreview: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  createdAt: Date;
}): Promise<void> {
  try {
    await esClient.index({
      index: EMAIL_INDEX,
      id: email.id,
      document: {
        userId: email.userId,
        batchId: email.batchId,
        senderId: email.senderId,
        senderEmail: email.senderEmail,
        to: email.to,
        subject: email.subject,
        bodyPreview: email.bodyPreview,
        status: email.status,
        scheduledAt: email.scheduledAt.toISOString(),
        sentAt: email.sentAt ? email.sentAt.toISOString() : null,
        createdAt: email.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    logger.warn({ err: err.message, emailId: email.id }, 'ES index failed; continuing without ES');
  }
}

/**
 * Search emails in Elasticsearch with multi_match on subject + bodyPreview + to.
 * Returns an array of email IDs matching the query.
 */
export async function searchEmailIds(userId: string, q: string): Promise<string[]> {
  const result = await esClient.search({
    index: EMAIL_INDEX,
    size: 200,
    query: {
      bool: {
        filter: [{ term: { userId } }],
        must: [
          {
            multi_match: {
              query: q,
              fields: ['subject^3', 'bodyPreview^2', 'to'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          },
        ],
      },
    },
    _source: false,
  });

  return result.hits.hits.map((hit) => hit._id as string);
}
