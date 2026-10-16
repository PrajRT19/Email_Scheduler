import { env } from './config/env.js';
import { logger } from './utils/logger.js';

logger.info(`👷 ReachInbox Worker booting up with concurrency = ${env.WORKER_CONCURRENCY}...`);

const gracefulShutdown = () => {
  logger.info('Shutting down worker gracefully...');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
