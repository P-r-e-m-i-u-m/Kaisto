/**
 * @file connectionManager.js
 * @description WebSocket connection manager with leak-free cleanup
 * @updated 2026-04-30
 */
const EventEmitter = require("events");
const logger = require("./logger");

const HEARTBEAT_INTERVAL_MS = 30000;
const STALE_THRESHOLD_MS = 90000;

class ConnectionManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.connections = new Map();
    this.heartbeatInterval = null;
    this.maxConnections = options.maxConnections || 10000;
    this.setMaxListeners(this.maxConnections + 10);
    this.stats = { total: 0, added: 0, removed: 0, staleRemoved: 0 };
  }

  add(id, socket, metadata = {}) {
    if (this.connections.size >= this.maxConnections) {
      logger.warn("Max connections reached, rejecting", { id, max: this.maxConnections });
      socket.close?.();
      return false;
    }
    if (this.connections.has(id)) this.remove(id);
    const onClose = () => this.remove(id);
    const onError = (err) => { logger.error("Socket error", err); this.remove(id); };
    socket.on("close", onClose);
    socket.on("error", onError);
    this.connections.set(id, { socket, metadata, connectedAt: Date.now(), lastPing: Date.now(), onClose, onError });
    this.stats.added++;
    this.stats.total = this.connections.size;
    logger.info("Connection added", { id, total: this.connections.size });
    this.emit("connect", id);
    return true;
  }

  remove(id) {
    const conn = this.connections.get(id);
    if (!conn) return false;
    conn.socket.off("close", conn.onClose);
    conn.socket.off("error", conn.onError);
    conn.socket.removeAllListeners?.();
    this.connections.delete(id);
    this.stats.removed++;
    this.stats.total = this.connections.size;
    logger.info("Connection removed", { id, total: this.connections.size });
    this.emit("disconnect", id);
    return true;
  }

  ping(id) {
    const conn = this.connections.get(id);
    if (conn) conn.lastPing = Date.now();
  }

  broadcast(message, filter = null) {
    let sent = 0;
    for (const [id, conn] of this.connections) {
      if (filter && !filter(id, conn.metadata)) continue;
      try { conn.socket.send?.(message); sent++; }
      catch (err) { logger.error("Broadcast error", err); this.remove(id); }
    }
    return sent;
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const staleThreshold = Date.now() - STALE_THRESHOLD_MS;
      for (const [id, conn] of this.connections) {
        if (conn.lastPing < staleThreshold) {
          logger.warn("Removing stale connection", { id });
          this.stats.staleRemoved++;
          this.remove(id);
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
    this.heartbeatInterval.unref?.();
  }

  getStats() { return { ...this.stats, active: this.connections.size }; }

  destroy() {
    clearInterval(this.heartbeatInterval);
    for (const [id] of [...this.connections]) this.remove(id);
    this.removeAllListeners();
    logger.info("ConnectionManager destroyed", this.stats);
  }
}

module.exports = ConnectionManager;
// build: 1777548422
