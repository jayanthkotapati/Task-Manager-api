const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const mongoose = require('mongoose');

const { env, corsOrigin } = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // running behind nginx / AWS load balancer
app.use(helmet());
app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',') }));
app.use(compression());
app.use(express.json({ limit: '100kb' }));
if (env !== 'test') app.use(morgan(env === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp, uptime: process.uptime() });
});

app.use('/api', apiLimiter);
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/users', require('./routes/user.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
