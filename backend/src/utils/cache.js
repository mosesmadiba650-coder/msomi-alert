const redisClient = require('../config/redis');
const { logger } = require('./logger');

/**
 * Cache utility with Redis fallback to in-memory storage
 */
class Cache {
  constructor() {
    this.memoryCache = new Map();
    this.ttlMap = new Map();
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      // Try Redis first
      if (redisClient.isOpen) {
        const value = await redisClient.get(key);
        if (value) {
          logger.debug(`Cache HIT (Redis): ${key}`);
          return JSON.parse(value);
        }
      }

      // Fallback to memory cache
      if (this.memoryCache.has(key)) {
        logger.debug(`Cache HIT (Memory): ${key}`);
        return this.memoryCache.get(key);
      }

      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache Get Error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = 3600) {
    try {
      const jsonValue = JSON.stringify(value);

      // Set in Redis
      if (redisClient.isOpen) {
        await redisClient.setEx(key, ttl, jsonValue);
        logger.debug(`Cache SET (Redis): ${key} (TTL: ${ttl}s)`);
      } else {
        // Fallback to memory cache
        this.memoryCache.set(key, value);
        
        // Set TTL cleanup
        if (this.ttlMap.has(key)) {
          clearTimeout(this.ttlMap.get(key));
        }
        
        const timer = setTimeout(() => {
          this.memoryCache.delete(key);
          this.ttlMap.delete(key);
          logger.debug(`Cache EXPIRED (Memory): ${key}`);
        }, ttl * 1000);
        
        this.ttlMap.set(key, timer);
        logger.debug(`Cache SET (Memory): ${key} (TTL: ${ttl}s)`);
      }
    } catch (error) {
      logger.error('Cache Set Error:', error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key) {
    try {
      if (redisClient.isOpen) {
        await redisClient.del(key);
      } else {
        this.memoryCache.delete(key);
        if (this.ttlMap.has(key)) {
          clearTimeout(this.ttlMap.get(key));
        }
      }
      logger.debug(`Cache DELETE: ${key}`);
    } catch (error) {
      logger.error('Cache Delete Error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      if (redisClient.isOpen) {
        await redisClient.flushDb();
      } else {
        this.memoryCache.clear();
        this.ttlMap.forEach((timer) => clearTimeout(timer));
        this.ttlMap.clear();
      }
      logger.info('Cache CLEARED');
    } catch (error) {
      logger.error('Cache Clear Error:', error);
    }
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet(key, fetchFunction, ttl = 3600) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached) {
        return cached;
      }

      // Compute value
      const value = await fetchFunction();

      // Store in cache
      await this.set(key, value, ttl);

      return value;
    } catch (error) {
      logger.error('Cache GetOrSet Error:', error);
      // If error, still try to compute value
      return await fetchFunction();
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      if (redisClient.isOpen) {
        const info = await redisClient.info('memory');
        return {
          backend: 'redis',
          info
        };
      } else {
        return {
          backend: 'memory',
          size: this.memoryCache.size,
          keys: Array.from(this.memoryCache.keys())
        };
      }
    } catch (error) {
      logger.error('Cache Stats Error:', error);
      return null;
    }
  }
}

module.exports = new Cache();
