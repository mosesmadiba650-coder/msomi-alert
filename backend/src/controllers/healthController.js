const admin = require('firebase-admin');
const db = admin.firestore();
const { logger } = require('../utils/logger');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const cache = require('../utils/cache');

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Get detailed health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health status
 */
exports.detailedHealth = asyncHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    // Check Firebase connectivity
    const startTime = Date.now();
    await db.collection('health').doc('test').set(
      { lastCheck: new Date() },
      { merge: true }
    );
    const responseTime = Date.now() - startTime;

    health.checks.firebase = {
      status: 'ok',
      responseTime: responseTime + 'ms',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    health.checks.firebase = {
      status: 'failed',
      error: error.message
    };
    health.status = 'degraded';
    logger.error('Firebase health check failed:', error);
  }

  try {
    // Check memory usage
    const mem = process.memoryUsage();
    const heapPercent = (mem.heapUsed / mem.heapTotal) * 100;

    health.checks.memory = {
      status: heapPercent > 90 ? 'warning' : 'ok',
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(mem.external / 1024 / 1024)}MB`,
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      percent: heapPercent.toFixed(1) + '%'
    };

    if (heapPercent > 90) {
      health.status = 'degraded';
      logger.warn('High memory usage detected:', { heapPercent });
    }

    if (heapPercent > 95) {
      health.status = 'critical';
      logger.error('Critical memory usage:', { heapPercent });
    }
  } catch (error) {
    health.checks.memory = { status: 'failed', error: error.message };
  }

  try {
    // Check process uptime
    const uptime = process.uptime();
    health.checks.uptime = {
      status: 'ok',
      seconds: Math.round(uptime),
      hours: (uptime / 3600).toFixed(2),
      days: (uptime / (3600 * 24)).toFixed(2)
    };
  } catch (error) {
    health.checks.uptime = { status: 'failed' };
  }

  try {
    // Check cache status
    const cacheStats = await cache.getStats();
    health.checks.cache = {
      status: 'ok',
      ...cacheStats
    };
  } catch (error) {
    health.checks.cache = { status: 'failed', error: error.message };
  }

  res.json(health);
});

/**
 * @swagger
 * /api/health/metrics:
 *   get:
 *     summary: Get performance metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Metrics data
 */
exports.getMetrics = asyncHandler(async (req, res) => {
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + ' MB',
      heapPercent: ((mem.heapUsed / mem.heapTotal) * 100).toFixed(2) + '%',
      external: Math.round(mem.external / 1024 / 1024) + ' MB',
      rss: Math.round(mem.rss / 1024 / 1024) + ' MB',
      arrayBuffers: Math.round(mem.arrayBuffers / 1024 / 1024) + ' MB'
    },
    cpu: {
      user: cpu.user + ' μs',
      system: cpu.system + ' μs'
    },
    uptime: {
      seconds: Math.round(process.uptime()),
      hours: (process.uptime() / 3600).toFixed(2),
      days: (process.uptime() / (3600 * 24)).toFixed(2)
    },
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

/**
 * @swagger
 * /api/health/status:
 *   get:
 *     summary: Quick status check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Status OK
 */
exports.getStatus = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime())
  });
});
