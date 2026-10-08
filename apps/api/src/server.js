const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const logger = require('./config/logger');

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 UWU Smart Procurement API running on port ${env.PORT}`, {
        environment: env.NODE_ENV,
        port: env.PORT,
        apiVersion: env.API_VERSION,
      });
      console.log(`\n`);
      console.log(`   UWU Smart Procurement System - API Server`);
      console.log(`   Port: ${env.PORT}`);
      console.log(`   Environment: ${env.NODE_ENV.padEnd(33)}`);
      console.log(`   API: http://localhost:${env.PORT}/api/${env.API_VERSION}`);
      console.log(`\n`);

      // Start Document Watcher for RAG auto-indexing
      try {
        const documentWatcherService = require('./services/document.watcher.service');
        documentWatcherService.startWatching();
      } catch (watcherErr) {
        logger.warn(`Failed to start document watcher: ${watcherErr.message}`);
      }

      // Initialize real-time WebSocket layer
      try {
        const { initializeSocket } = require('./config/socket');
        initializeSocket(server);
      } catch (socketErr) {
        logger.warn(`Failed to initialize WebSocket: ${socketErr.message}`);
      }
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
    });
  } catch (error) {
    logger.error('Server startup failed', { error: error.message });
    process.exit(1);
  }
};

startServer();
