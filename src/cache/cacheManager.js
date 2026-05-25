/**
 * @file cacheManager.js
 * @description Multi-level cache with TTL, invalidation and stats
 * @updated 2026-05-25
 */
const redis = require("../config/redis");
const logger = require("../services/logger");

const DEFAULT_TTL = 300;
const LOCAL_CACHE_MAX = 1000;

class CacheManager {
  constructor(prefix = "cache") {
    this.prefix = prefix;
    this.localCache = new Map();
    this.stats = { hits: 0, misses: 0, localHits: 0, sets: 0, deletes: 0 };
  }

  _key(key) { return this.prefix + ":" + key; }

  async get(key) {
    if (this.localCache.has(key)) {
      const { value, expiresAt } = this.localCache.get(key);
      if (Date.now() < expiresAt) { this.stats.localHits++; this.stats.hits++; return value; }
      this.localCache.delete(key);
    }
    const raw = await redis.get(this._key(key));
    if (raw) {
      this.stats.hits++;
      const value = JSON.parse(raw);
      this._setLocal(key, value, 60);
      return value;
    }
    this.stats.misses++;
    return null;
  }

  async set(key, value, ttl = DEFAULT_TTL) {
    await redis.setex(this._key(key), ttl, JSON.stringify(value));
    this._setLocal(key, value, ttl);
    this.stats.sets++;
    logger.info("Cache set", { key: this._key(key), ttl });
  }

  _setLocal(key, value, ttl) {
    if (this.localCache.size >= LOCAL_CACHE_MAX) {
      const firstKey = this.localCache.keys().next().value;
      this.localCache.delete(firstKey);
    }
    this.localCache.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  }

  async invalidate(pattern) {
    const keys = await redis.keys(this._key(pattern) + "*");
    if (keys.length > 0) {
      await redis.del(...keys);
      this.stats.deletes += keys.length;
    }
    for (const k of this.localCache.keys()) {
      if (k.startsWith(pattern)) this.localCache.delete(k);
    }
    logger.info("Cache invalidated", { pattern, count: keys.length });
    return keys.length;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return { ...this.stats, hitRatio: total ? (this.stats.hits / total).toFixed(3) : 0, localCacheSize: this.localCache.size };
  }

  clear() { this.localCache.clear(); }
}

const withCache = (fn, ttl = DEFAULT_TTL, prefix = "fn") => {
  const cache = new CacheManager(prefix);
  return async (...args) => {
    const key = fn.name + ":" + JSON.stringify(args);
    const cached = await cache.get(key);
    if (cached !== null) return cached;
    const result = await fn(...args);
    await cache.set(key, result, ttl);
    return result;
  };
};

module.exports = { CacheManager, withCache };
// build: 1779715691
