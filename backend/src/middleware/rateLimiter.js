const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');
const { logger } = require('../utils/logger');

/**
 * Create rate limiter with Redis store (falls back to memory if Redis unavailable)
 */
const createLimiter = (options) => {
  const config = {
    windowMs: options.windowMs || 60 * 1000,
    max: options.max || 60,
    message: {
      success: false,
      error: options.message || 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        limit: options.max
      });
      res.status(429).json(config.message);
    }
  };

  // Use Redis store if available
  if (redisClient.isOpen) {
    config.store = new RedisStore({
      client: redisClient,
      prefix: 'rl:',
      sendCommand: (...args) => redisClient.sendCommand(args)
    });
    logger.info(`Rate limiter using Redis store: ${options.name}`);
  } else {
    logger.warn(`Rate limiter using memory store: ${options.name}`);
  }

  return rateLimit(config);
};

/**
 * Authentication endpoints - Strict limits
 */
const authLimiter = createLimiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many authentication attempts, please try again in 15 minutes'
});

/**
 * Device registration - Moderate limits
 */
const registrationLimiter = createLimiter({
  name: 'registration',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registrations per hour
  message: 'Too many registration attempts, please try again later'
});

/**
 * Notification sending - Strict limits to prevent spam
 */
const notificationLimiter = createLimiter({
  name: 'notification',
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 notifications per minute
  message: 'Too many notifications sent, please slow down'
});

/**
 * General API endpoints - Standard limits
 */
const apiLimiter = createLimiter({
  name: 'api',
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'API rate limit exceeded, please try again later'
});

/**
 * Health check - Very lenient
 */
const healthLimiter = createLimiter({
  name: 'health',
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  message: 'Health check rate limit exceeded'
});

/**
 * Webhook endpoints - High limits for external services
 */
const webhookLimiter = createLimiter({
  name: 'webhook',
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute
  message: 'Webhook rate limit exceeded'
});

/**
 * FCM token operations - Moderate limits
 */
const fcmLimiter = createLimiter({
  name: 'fcm',
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'FCM operation rate limit exceeded'
});

/**
 * Queue operations - Moderate limits
 */
const queueLimiter = createLimiter({
  name: 'queue',
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Queue operation rate limit exceeded'
});

/**
 * Custom rate limiter by IP and user
 */
const customLimiter = (options) => {
  return createLimiter({
    ...options,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    }
  });
};

module.exports = {
  authLimiter,
  registrationLimiter,
  notificationLimiter,
  apiLimiter,
  healthLimiter,
  webhookLimiter,
  fcmLimiter,
  queueLimiter,
  customLimiter
};
