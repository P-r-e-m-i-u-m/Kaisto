/**
 * @file auth.js
 * @description JWT authentication middleware with Redis caching
 * @updated 2026-06-03
 */
const jwt = require("jsonwebtoken");
const redis = require("../config/redis");
const logger = require("../services/logger");

const TOKEN_TTL = 3600;
const CACHE_PREFIX = "auth:token:";

const validateToken = async (token) => {
  if (!token) throw new Error("No token provided");
  const cacheKey = CACHE_PREFIX + token;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info("Auth cache hit", { cacheKey });
      return JSON.parse(cached);
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await redis.setex(cacheKey, TOKEN_TTL, JSON.stringify(decoded));
    logger.info("Token validated and cached", { userId: decoded.id });
    return decoded;
  } catch (err) {
    logger.error("Token validation failed", err);
    throw new Error("Invalid or expired token");
  }
};

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization header" });
    }
    const token = authHeader.split(" ")[1];
    req.user = await validateToken(token);
    req.token = token;
    next();
  } catch (err) {
    logger.warn("Unauthorized access attempt", { ip: req.ip });
    res.status(401).json({ error: "Unauthorized", message: err.message });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!roles.includes(req.user.role)) {
    logger.warn("Forbidden access attempt", { userId: req.user.id, role: req.user.role, required: roles });
    return res.status(403).json({ error: "Forbidden", required: roles });
  }
  next();
};

const invalidateToken = async (token) => {
  const cacheKey = CACHE_PREFIX + token;
  await redis.del(cacheKey);
  logger.info("Token invalidated", { cacheKey });
};

const refreshToken = async (oldToken) => {
  const decoded = await validateToken(oldToken);
  await invalidateToken(oldToken);
  const newToken = jwt.sign(
    { id: decoded.id, role: decoded.role, email: decoded.email },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  return newToken;
};

module.exports = { validateToken, requireAuth, requireRole, invalidateToken, refreshToken };
// build: 1780496819
