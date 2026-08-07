import http from 'http';
import { app } from './src/app.js';
import { connectDb } from './src/config/db.js';
import { env } from './src/config/env.js';
import { registerSocketServer } from './src/sockets/index.js';
import { registerJobs } from './src/jobs/index.js';
import { logger } from './src/utils/logger.js';

const server = http.createServer(app);

registerSocketServer(server);

const start = async () => {
  await connectDb();
  registerJobs();

  server.listen(env.port, () => {
    logger.info(`API server listening on port ${env.port}`);
  });
};

start().catch((error) => {
  logger.error(error, 'Failed to start server');
  process.exit(1);
});
