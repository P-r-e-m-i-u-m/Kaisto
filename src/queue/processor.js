const scheduleRetry = (queueName, job, delay) => {
  const payload = JSON.stringify(job);
  const timer = setTimeout(() => {
    redis.zadd(queueName, 0, payload).catch((err) => {
      logger.error("Retry enqueue failed", err);
    });
  }, delay);
  timer.unref();
};  // Fixed memory leak - Updated: 2026-07-20
// build: 1784552678
