/**
 * BullMQ Queue Configuration
 * Manages notification email queue and digest queue with Redis-backed processing.
 */
let Queue, Worker, QueueScheduler;
try {
  const bullmq = require('bullmq');
  Queue = bullmq.Queue;
  Worker = bullmq.Worker;
  QueueScheduler = bullmq.QueueScheduler;
} catch (e) {
  Queue = null; Worker = null; QueueScheduler = null;
}
const { getRedisConnection, getRedisStatus } = require('./redis');
const logger = require('./logger');

// Queue names
const QUEUES = {
  EMAIL_NOTIFICATION: 'email-notification',
  DAILY_DIGEST: 'daily-digest',
  ESCALATION: 'escalation',
  SLA_CHECK: 'sla-check',
};

const queues = {};
const workers = {};

/**
 * Create a named queue. Returns null if Redis is unavailable.
 */
const createQueue = (name) => {
  if (!getRedisStatus()) {
    logger.warn(`Queue "${name}" not created — Redis unavailable`);
    return null;
  }
  if (queues[name]) return queues[name];

  const connection = getRedisConnection();
  queues[name] = new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 1000, age: 24 * 3600 },
      removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
    },
  });

  logger.info(`📬 Queue created: ${name}`);
  return queues[name];
};

/**
 * Register a worker for a named queue.
 */
const createWorker = (name, processor, opts = {}) => {
  if (!getRedisStatus()) {
    logger.warn(`Worker for "${name}" not created — Redis unavailable`);
    return null;
  }

  const connection = getRedisConnection();
  const worker = new Worker(name, processor, {
    connection,
    concurrency: opts.concurrency || 5,
    limiter: opts.limiter || { max: 50, duration: 60000 },
    ...opts,
  });

  worker.on('completed', (job) => {
    logger.debug(`✅ Job completed: ${name}/${job.id}`, { data: job.name });
  });

  worker.on('failed', (job, err) => {
    logger.error(`❌ Job failed: ${name}/${job?.id}`, { error: err.message, attempts: job?.attemptsMade });
  });

  workers[name] = worker;
  logger.info(`⚙️ Worker registered: ${name}`);
  return worker;
};

/**
 * Add a job to a named queue. Falls back to sync processing if Redis is down.
 */
const addJob = async (queueName, jobName, data, opts = {}) => {
  const queue = queues[queueName];
  if (!queue || !getRedisStatus()) {
    logger.warn(`Queue "${queueName}" unavailable — job "${jobName}" will be processed synchronously`);
    return null;
  }

  try {
    const job = await queue.add(jobName, data, opts);
    logger.debug(`📨 Job added: ${queueName}/${job.id}`, { jobName });
    return job;
  } catch (err) {
    logger.error(`Failed to add job to ${queueName}`, { error: err.message });
    return null;
  }
};

/**
 * Initialize all notification queues
 */
const initializeQueues = () => {
  if (!getRedisStatus()) {
    logger.warn('⚠️ Queues not initialized — Redis unavailable. Email will use direct send.');
    return;
  }

  Object.values(QUEUES).forEach(createQueue);
  logger.info('📬 All notification queues initialized');
};

/**
 * Gracefully shut down all workers and queues
 */
const shutdownQueues = async () => {
  for (const [name, worker] of Object.entries(workers)) {
    await worker.close();
    logger.info(`Worker closed: ${name}`);
  }
  for (const [name, queue] of Object.entries(queues)) {
    await queue.close();
    logger.info(`Queue closed: ${name}`);
  }
};

module.exports = {
  QUEUES,
  createQueue,
  createWorker,
  addJob,
  initializeQueues,
  shutdownQueues,
};
