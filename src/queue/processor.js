/**
 * @file processor.js
 * @description Async job queue with exponential backoff and dead letter queue
 * @updated 2026-05-07
 */
const redis = require("../config/redis");
const logger = require("../services/logger");

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

class QueueProcessor {
  constructor(queueName) {
    this.queueName = queueName;
    this.deadLetterQueue = queueName + ":dlq";
    this.processingQueue = queueName + ":processing";
    this.processing = false;
    this.stats = { processed: 0, failed: 0, retried: 0 };
  }

  async enqueue(job, priority = 0) {
    const payload = JSON.stringify({
      ...job,
      id: Date.now() + "-" + Math.random().toString(36).slice(2),
      enqueuedAt: new Date().toISOString(),
      retries: 0,
      priority
    });
    await redis.zadd(this.queueName, priority, payload);
    logger.info("Job enqueued", { queue: this.queueName, type: job.type });
    return payload;
  }

  async dequeue() {
    const items = await redis.zpopmin(this.queueName, 1);
    if (!items || items.length === 0) return null;
    return JSON.parse(items[0]);
  }

  async process(handler, options = {}) {
    const { concurrency = 1, pollInterval = 1000 } = options;
    this.processing = true;
    logger.info("Queue processor started", { queue: this.queueName, concurrency });
    while (this.processing) {
      const jobs = await Promise.all(Array(concurrency).fill(null).map(() => this.dequeue()));
      const validJobs = jobs.filter(Boolean);
      if (validJobs.length === 0) {
        await new Promise((r) => setTimeout(r, pollInterval));
        continue;
      }
      await Promise.allSettled(validJobs.map((job) => this._execute(job, handler)));
    }
  }

  async _execute(job, handler) {
    try {
      await handler(job);
      this.stats.processed++;
      logger.info("Job completed", { type: job.type, id: job.id });
    } catch (err) {
      if (job.retries < MAX_RETRIES) {
        job.retries++;
        this.stats.retried++;
        const delay = BASE_DELAY_MS * Math.pow(2, job.retries);
        setTimeout(() => redis.zadd(this.queueName, 0, JSON.stringify(job)), delay);
        logger.warn("Job retry scheduled", { type: job.type, attempt: job.retries, delayMs: delay });
      } else {
        this.stats.failed++;
        await redis.lpush(this.deadLetterQueue, JSON.stringify({ ...job, failedAt: new Date().toISOString(), error: err.message }));
        logger.error("Job moved to DLQ", err);
      }
    }
  }

  async getStats() {
    const pending = await redis.zcard(this.queueName);
    const dead = await redis.llen(this.deadLetterQueue);
    return { ...this.stats, pending, dead };
  }

  stop() {
    this.processing = false;
    logger.info("Queue processor stopped", { queue: this.queueName });
  }
}

module.exports = QueueProcessor;
// build: 1778154385
