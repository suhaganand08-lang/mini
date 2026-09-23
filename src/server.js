const http = require('http');
const app = require('./app');
const { port, host, validateEnvironment } = require('./config/env');
const { connectDatabase } = require('./config/database');
const { createSocketServer } = require('./sockets');

async function startServer() {
  validateEnvironment();
  await connectDatabase();

  const httpServer = http.createServer(app);
  const io = createSocketServer(httpServer);
  app.set('io', io);

  const server = httpServer.listen(port, host, () => {
    console.info(`Server listening on http://${host}:${port}`);
  });

  server.on('error', (error) => {
    console.error('HTTP server error:', error.message);
  });

  const shutdown = (signal) => {
    console.info(`${signal} received. Shutting down gracefully.`);
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      process.exit(0);
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('Unable to start server:', error.message);
  process.exit(1);
});
