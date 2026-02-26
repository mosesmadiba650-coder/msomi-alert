const redis = require('redis');
const { logger } = require('../utils/logger');

// Create Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  }
});

// Event handlers
redisClient.on('connect', () => {
  logger.info('✅ Redis Connected');
});

redisClient.on('error', (err) => {
  logger.error('❌ Redis Error:', err);
});

redisClient.on('ready', () => {
  logger.info('✅ Redis Ready');
});

redisClient.on('reconnecting', () => {
  logger.warn('🔄 Redis Reconnecting...');
});

// Connect to Redis
redisClient.connect().catch((err) => {
  logger.error('Failed to connect to Redis:', err);
  // App can still run without Redis, with in-memory fallback
});

module.exports = redisClient;
