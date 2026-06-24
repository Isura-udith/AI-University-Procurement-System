/**
 * Express Application Setup
 * UWU Smart Procurement System - API Server
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { tenantScope } = require('./middlewares/auth.middleware');
const routes = require('./routes');
const env = require('./config/env');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (env.isDev()) {
  app.use(morgan('dev'));
}

// Rate limiting
app.use(`/api/${env.API_VERSION}`, apiLimiter);

// Multi-tenant middleware
app.use(tenantScope);

// API Routes
app.use(`/api/${env.API_VERSION}`, routes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'UWU Smart Procurement System API',
    version: '1.0.0',
    status: 'running',
    documentation: `/api/${env.API_VERSION}/health`,
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
