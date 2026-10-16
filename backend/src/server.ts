import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { reconcileJobsOnBoot } from './services/reconcileService.js';
import { ensureEmailIndex } from './services/elasticsearchService.js';

async function main() {
  // Initialize Elasticsearch index mapping (non-fatal if ES unavailable)
  await ensureEmailIndex();

  // Reconcile any scheduled emails that lost their BullMQ jobs on the previous run
  await reconcileJobsOnBoot();

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
}

main().catch((err) => {
  logger.error({ err }, 'Fatal server startup error');
  process.exit(1);
});
