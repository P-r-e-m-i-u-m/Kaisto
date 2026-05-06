const { randomUUID } = require("crypto");
const logger = require("../services/logger");

const requestId = (req, res, next) => {
  const id = req.headers["x-request-id"] || randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-ID", id);
  req.log = logger.child({ requestId: id });
  next();
};

module.exports = { requestId };  // Updated: 2026-05-06
// build: 1778070419
