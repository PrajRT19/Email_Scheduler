import { startEmailWorker } from './workers/emailWorker.js';
import { logger } from './utils/logger.js';

logger.info('🚀 Launching ReachInbox Background Worker...');
const worker = startEmailWorker();

const gracefulShutdown = async () => {
  logger.info('Stopping BullMQ worker gracefully...');
  await worker.close();
  logger.info('BullMQ worker closed');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
