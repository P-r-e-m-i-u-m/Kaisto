/**
 * @file rateLimiter.js
 * @description Sliding window rate limiter using Redis sorted sets
 * @updated 2026-06-10
 */
const redis = require("../config/redis");
const logger = require("../services/logger");

const slidingWindowLimiter = (options = {}) => {
  const {
    windowMs = 60000,
    max = 100,
    keyPrefix = "rl",
    skipSuccessfulRequests = false,
    keyGenerator = (req) => req.ip || "unknown",
    onLimitReached = null
  } = options;

  return async (req, res, next) => {
    const key = keyPrefix + ":" + keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;
    try {
      const pipeline = redis.pipeline ? redis.pipeline() : null;
      await redis.zremrangebyscore(key, "-inf", windowStart);
      const count = await redis.zcard(key);
      if (count >= max) {
        const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
        const resetTime = oldest.length > 1 ? parseInt(oldest[1]) + windowMs : now + windowMs;
        logger.warn("Rate limit exceeded", { key, count, max });
        if (onLimitReached) onLimitReached(req, res);
        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", 0);
        res.setHeader("X-RateLimit-Reset", Math.ceil(resetTime / 1000));
        res.setHeader("Retry-After", Math.ceil((resetTime - now) / 1000));
        return res.status(429).json({ error: "Too Many Requests", retryAfter: Math.ceil((resetTime - now) / 1000) });
      }
      const member = now + "-" + Math.random().toString(36).slice(2, 8);
      await redis.zadd(key, now, member);
      await redis.pexpire(key, windowMs);
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count - 1));
      res.setHeader("X-RateLimit-Reset", Math.ceil((now + windowMs) / 1000));
      next();
    } catch (err) {
      logger.error("Rate limiter error, allowing request", err);
      next();
    }
  };
};

const apiLimiter = slidingWindowLimiter({ windowMs: 15 * 60 * 1000, max: 100, keyPrefix: "api-rl" });
const authLimiter = slidingWindowLimiter({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: "auth-rl" });
const uploadLimiter = slidingWindowLimiter({ windowMs: 60 * 60 * 1000, max: 20, keyPrefix: "upload-rl" });

module.exports = { slidingWindowLimiter, apiLimiter, authLimiter, uploadLimiter };
// build: 1781096154
