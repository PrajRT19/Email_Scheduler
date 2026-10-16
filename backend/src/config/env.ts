import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword@localhost:5432/email_scheduler?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),

  SESSION_SECRET: z.string().min(16).default('reachinbox-super-secret-session-key-minimum-32-chars'),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  GOOGLE_CLIENT_ID: z.string().default('mock-google-client-id'),
  GOOGLE_CLIENT_SECRET: z.string().default('mock-google-client-secret'),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/api/auth/google/callback'),

  SLACK_CLIENT_ID: z.string().default('mock-slack-client-id'),
  SLACK_CLIENT_SECRET: z.string().default('mock-slack-client-secret'),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:4000/api/slack/callback'),

  WORKER_CONCURRENCY: z.coerce.number().min(1).default(5),
  MIN_DELAY_BETWEEN_EMAILS_SECONDS: z.coerce.number().min(0).default(2),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().min(1).default(50),
  MAX_RECIPIENTS_PER_REQUEST: z.coerce.number().min(1).default(5000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
