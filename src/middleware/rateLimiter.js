const slidingWindow = async (key, windowMs, max) => {
  const now = Date.now();
  const windowStart = now - windowMs;
  await redis.zremrangebyscore(key, "-inf", windowStart);
  const count = await redis.zcard(key);
  if (count >= max) return false;
  await redis.zadd(key, now, now + "-" + Math.random());
  await redis.pexpire(key, windowMs);
  return true;
};  // Fixed burst exploit - Updated: 2026-06-12
// build: 1781273369
