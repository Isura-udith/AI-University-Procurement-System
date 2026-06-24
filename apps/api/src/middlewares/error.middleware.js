/**
 * Error Middleware - Global error handler
 */
const logger = require('../config/logger');
const env = require('../config/env');

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(e => e.message);
    message = errors.join(', ');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for '${field}'. This value already exists.`;
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  logger.error(message, { statusCode, stack: err.stack, path: req.originalUrl, method: req.method, ip: req.ip, userId: req.user?._id });

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.isDev() && { stack: err.stack }),
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
};

module.exports = { errorHandler, notFoundHandler };
