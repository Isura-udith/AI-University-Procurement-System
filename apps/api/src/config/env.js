const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

[
  path.resolve(__dirname, '../../../../.env'), // workspace root
  path.resolve(__dirname, '../../.env'),       // apps/api/.env
  path.resolve(process.cwd(), '.env'),
].forEach(envPath => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
});

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  API_VERSION: process.env.API_VERSION || 'v1',

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/uwu_procurement',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  GEMINI_API_BASE_URL: process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',

  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  // Notification System
  DIGEST_CRON: process.env.DIGEST_CRON || '30 16 * * *',           // 4:30 PM daily
  SLA_WARNING_HOURS: parseInt(process.env.SLA_WARNING_HOURS, 10) || 48,
  SLA_ESCALATION_HOURS: parseInt(process.env.SLA_ESCALATION_HOURS, 10) || 72,
  NOTIFICATION_FROM_NAME: process.env.NOTIFICATION_FROM_NAME || 'UWU Smart Procurement',
  DEBRIEFING_REQUEST_DAYS: parseInt(process.env.DEBRIEFING_REQUEST_DAYS, 10) || 3,
  DEBRIEFING_CONCLUDE_DAYS: parseInt(process.env.DEBRIEFING_CONCLUDE_DAYS, 10) || 5,
  STANDSTILL_PERIOD_DAYS: parseInt(process.env.STANDSTILL_PERIOD_DAYS, 10) || 10,

  // Frontend
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // Multi-Tenant
  DEFAULT_TENANT_ID: process.env.DEFAULT_TENANT_ID || 'uwu-main',

  // Flowise Connection
  FLOWISE_API_URL: process.env.FLOWISE_API_URL || 'http://localhost:3000/api/v1',
  FLOWISE_CHATFLOW_ID: process.env.FLOWISE_CHATFLOW_ID || 'e09a9b3b-0e76-4bb6-ba2a-4f1878d7eacb',
  FLOWISE_API_KEY: process.env.FLOWISE_API_KEY || '',
  FLOWISE_DOCUMENT_STORE_ID: process.env.FLOWISE_DOCUMENT_STORE_ID || '',
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || 'uwu-flowise-secret-key-2026-gosl-compliant',

  // Flowise Advanced Configuration
  FLOWISE_MEMORY_WINDOW_SIZE: parseInt(process.env.FLOWISE_MEMORY_WINDOW_SIZE, 10) || 10,
  CHAT_SESSION_MAX_AGE_DAYS: parseInt(process.env.CHAT_SESSION_MAX_AGE_DAYS, 10) || 90,

  isDev: () => env.NODE_ENV === 'development',
  isProd: () => env.NODE_ENV === 'production',
};

module.exports = env;
