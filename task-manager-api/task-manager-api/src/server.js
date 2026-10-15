const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');
const mongoose = require('mongoose');

(async () => {
  await connectDB();
  const server = app.listen(port, () => console.log(`API listening on port ${port}`));

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
})().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
