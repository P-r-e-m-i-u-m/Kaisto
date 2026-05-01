/**
 * @file logger.js
 * @description Structured logger with console and file transports
 * @updated 2026-05-01
 */
const fs = require("fs");
const path = require("path");

const LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const COLORS = { error: "\x1b[31m", warn: "\x1b[33m", info: "\x1b[36m", http: "\x1b[35m", debug: "\x1b[37m", reset: "\x1b[0m" };
const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;
const IS_PROD = process.env.NODE_ENV === "production";

class Logger {
  constructor(context = "app", options = {}) {
    this.context = context;
    this.logDir = options.logDir || path.join(process.cwd(), "logs");
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024;
    this._ensureLogDir();
  }

  _ensureLogDir() {
    try { if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true }); }
    catch (e) { /* silently fail */ }
  }

  _format(level, msg, meta = {}) {
    return JSON.stringify({
      level, msg,
      context: this.context,
      env: process.env.NODE_ENV || "development",
      pid: process.pid,
      ...meta,
      ts: new Date().toISOString()
    });
  }

  _colorize(level, line) {
    if (IS_PROD) return line;
    return (COLORS[level] || "") + line + COLORS.reset;
  }

  _write(level, msg, meta) {
    if ((LEVELS[level] ?? 99) > CURRENT_LEVEL) return;
    const line = this._format(level, msg, meta);
    const output = level === "error" ? process.stderr : process.stdout;
    output.write(this._colorize(level, line) + "\n");
    try {
      const logFile = path.join(this.logDir, level + ".log");
      fs.appendFileSync(logFile, line + "\n");
      const combinedFile = path.join(this.logDir, "combined.log");
      fs.appendFileSync(combinedFile, line + "\n");
    } catch (e) { /* disk full or permission error */ }
  }

  info(msg, meta = {}) { this._write("info", msg, meta); }
  warn(msg, meta = {}) { this._write("warn", msg, meta); }
  error(msg, err) { this._write("error", msg, { stack: err?.stack, message: err?.message, code: err?.code }); }
  debug(msg, meta = {}) { this._write("debug", msg, meta); }
  http(msg, meta = {}) { this._write("http", msg, meta); }

  child(context, meta = {}) {
    const child = new Logger(this.context + ":" + context, { logDir: this.logDir });
    child._defaultMeta = { ...this._defaultMeta, ...meta };
    return child;
  }

  time(label) {
    const start = Date.now();
    return { end: (meta = {}) => this.info(label + " completed", { ...meta, durationMs: Date.now() - start }) };
  }
}

const defaultLogger = new Logger();
module.exports = defaultLogger;
module.exports.Logger = Logger;
// build: 1777633501
