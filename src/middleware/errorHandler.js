/**
 * @file errorHandler.js
 * @description Global error handler with operational vs programmer error classification
 * @updated 2026-05-04
 */
const logger = require("../services/logger");

class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 422, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(resource + " not found", 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isOperational = err.isOperational || false;
  const isProd = process.env.NODE_ENV === "production";
  logger.error("Request error", err);
  if (isProd && !isOperational) {
    return res.status(500).json({ error: "Internal Server Error", code: "INTERNAL_ERROR", requestId: req.headers["x-request-id"] });
  }
  const response = { error: err.message || "Internal Server Error", code: err.code || "INTERNAL_ERROR", requestId: req.headers["x-request-id"] };
  if (err.details) response.details = err.details;
  if (!isProd) response.stack = err.stack;
  res.status(statusCode).json(response);
};

const notFoundHandler = (req, res) => {
  logger.warn("Route not found", { method: req.method, path: req.originalUrl });
  res.status(404).json({ error: "Route not found", path: req.originalUrl, method: req.method, code: "NOT_FOUND" });
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection", reason instanceof Error ? reason : new Error(String(reason)));
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", err);
  process.exit(1);
});

module.exports = { errorHandler, notFoundHandler, asyncHandler, AppError, ValidationError, NotFoundError, UnauthorizedError };
// build: 1777895257
