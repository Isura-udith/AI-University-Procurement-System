/**
 * Rate Limiting Middleware
 *
 * NOTE: Rate limiting is disabled in development mode (NODE_ENV=development)
 * to prevent false positives during hot-reloads and testing.
 */
const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 500,                   // increased from 200 → 500 for production
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,          // skip entirely in development
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                    // increased from 10 → 20 for production
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,          // skip entirely in development
});

module.exports = { apiLimiter, authLimiter };
