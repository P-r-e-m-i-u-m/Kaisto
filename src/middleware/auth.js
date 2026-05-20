const jwt = require("jsonwebtoken");
const redis = require("../config/redis");

const validateToken = async (token) => {
  const cached = await redis.get("auth:" + token);
  if (cached) return JSON.parse(cached);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  await redis.setex("auth:" + token, 3600, JSON.stringify(decoded));
  return decoded;
};

module.exports = { validateToken };
// updated: 2026-05-20 build: 1779277399
