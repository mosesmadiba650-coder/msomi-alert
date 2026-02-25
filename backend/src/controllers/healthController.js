const db = require('firebase-admin').firestore();
const logger = require('../utils/logger');
const errorMonitoring = require('../services/errorMonitoringService');

exports.detailedHealth = async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
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
      responseTime: responseTime + 'ms' 
    };
  } catch (error) {
    health.checks.firebase = { status: 'failed', error: error.message };
    health.status = 'degraded';
    logger.error('Firebase health check failed', { error: error.message });
  }

  try {
    // Check memory usage
    const mem = process.memoryUsage();
    const heapPercent = (mem.heapUsed / mem.heapTotal) * 100;
    health.checks.memory = {
      status: heapPercent > 90 ? 'warning' : 'ok',
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      percent: heapPercent.toFixed(1) + '%'
    };

    if (heapPercent > 90) {
      logger.warn('High memory usage detected', { heapPercent });
      errorMonitoring.alertCritical('High memory usage (>90%)', {
        tags: { component: 'memory' },
        extra: { heapPercent, mem: mem.heapUsed / 1024 / 1024 + 'MB' }
      });
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.memory = { status: 'failed' };
  }

  try {
    // Check process uptime
    const uptime = process.uptime();
    health.checks.uptime = {
      status: 'ok',
      seconds: Math.round(uptime),
      hours: (uptime / 3600).toFixed(2)
    };
  } catch (error) {
    health.checks.uptime = { status: 'failed' };
  }

  res.json(health);
};

exports.getMetrics = (req, res) => {
  const mem = process.memoryUsage();
  
  res.json({
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(mem.external / 1024 / 1024) + 'MB',
      rss: Math.round(mem.rss / 1024 / 1024) + 'MB'
    },
    uptime: {
      seconds: Math.round(process.uptime()),
      hours: (process.uptime() / 3600).toFixed(2)
    },
    environment: process.env.NODE_ENV || 'development'
  });
};
