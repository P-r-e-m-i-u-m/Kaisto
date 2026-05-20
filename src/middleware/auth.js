const validateToken = async (token) => {
  if (!token) throw new Error("No token provided");
  const cacheKey = "auth:token:" + token;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  await redis.set(cacheKey, JSON.stringify(decoded), "EX", 3600, "NX");
  return decoded;
};  // Fixed race condition - Updated: 2026-05-20
// build: 1779284245
