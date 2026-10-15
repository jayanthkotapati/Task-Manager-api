const { env } = require('../config/env');

exports.notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'CastError') { status = 400; message = `Invalid ${err.path}: ${err.value}`; }
  if (err.code === 11000) { status = 409; message = `Duplicate value for: ${Object.keys(err.keyValue).join(', ')}`; }
  if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body'; }

  if (status === 500) console.error(err);
  if (status === 500 && env === 'production') message = 'Internal server error';

  res.status(status).json({
    success: false,
    message,
    ...(err.details && { details: err.details }),
    ...(env === 'development' && status === 500 && { stack: err.stack }),
  });
};
