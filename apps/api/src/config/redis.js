/**
 * Redis Configuration
 * Provides IORedis connection for BullMQ queues, idempotency cache, and pub/sub.
 * Falls back gracefully when Redis is unavailable (dev-friendly).
 */
let Redis;
try {
  Redis = require('ioredis');
} catch (e) {
  Redis = null;
}
const logger = require('./logger');
const env = require('./env');

const REDIS_URL = env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisConnection = null;
let isRedisAvailable = false;

/**
 * Creates and returns a shared Redis connection.
 * Reconnects automatically; logs status transitions.
 */
const getRedisConnection = () => {
  if (!Redis) return null;
  if (redisConnection) return redisConnection;

  redisConnection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,   // Required by BullMQ
    enableReadyCheck: true,
    retryStrategy: (times) => {
      if (times > 10) return null; // Stop retrying after 10 attempts
      return Math.min(times * 500, 5000);
    },
    lazyConnect: true,
  });

  redisConnection.on('connect', () => {
    isRedisAvailable = true;
    logger.info('✅ Redis connected', { url: REDIS_URL.replace(/\/\/.*@/, '//***@') });
  });

  redisConnection.on('error', (err) => {
    if (isRedisAvailable) {
      logger.warn('⚠️ Redis connection lost', { error: err.message });
    }
    isRedisAvailable = false;
  });

  redisConnection.on('close', () => {
    isRedisAvailable = false;
  });

  return redisConnection;
};

/**
 * Attempt to connect Redis. Non-blocking — the app starts even if Redis is down.
 */
const connectRedis = async () => {
  try {
    const conn = getRedisConnection();
    await conn.connect();
    return conn;
  } catch (err) {
    logger.warn('⚠️ Redis unavailable — queue features disabled', { error: err.message });
    isRedisAvailable = false;
    return null;
  }
};

/**
 * Idempotency check: returns true if this key was already processed.
 * Uses Redis SET NX with a 24-hour TTL.
 */
const checkIdempotencyKey = async (key) => {
  if (!isRedisAvailable || !redisConnection) return false;
  try {
    const result = await redisConnection.set(`idem:${key}`, '1', 'EX', 86400, 'NX');
    return result === null; // null means key already existed → duplicate
  } catch {
    return false;
  }
};

const getRedisStatus = () => isRedisAvailable;

module.exports = {
  getRedisConnection,
  connectRedis,
  checkIdempotencyKey,
  getRedisStatus,
};
