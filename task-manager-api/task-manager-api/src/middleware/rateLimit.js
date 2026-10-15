const rateLimit = require('express-rate-limit');
const { rateLimitMax, env } = require('../config/env');

const make = (limit, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env === 'test' ? 100000 : limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });

exports.apiLimiter = make(rateLimitMax * 10, 'Too many requests, please try again later');
exports.authLimiter = make(rateLimitMax, 'Too many auth attempts, please try again later');
