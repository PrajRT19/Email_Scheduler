import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 ReachInbox API server listening on http://localhost:${env.PORT}`);
  logger.info(`   Health check: http://localhost:${env.PORT}/api/health`);
  logger.info(`   Bull Board:   http://localhost:${env.PORT}/admin/queues`);
});

const gracefulShutdown = () => {
  logger.info('Shutting down API server gracefully...');
  server.close(() => {
    logger.info('API server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
