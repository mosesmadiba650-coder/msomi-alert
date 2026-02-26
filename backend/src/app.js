const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const statusMonitor = require('express-status-monitor');
const { errorHandler, asyncHandler, AppError } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const admin = require('firebase-admin');
const { setupSwagger } = require('./config/swagger');
const {
  apiLimiter,
  healthLimiter,
  registrationLimiter,
  notificationLimiter,
  fcmLimiter,
  queueLimiter
} = require('./middleware/rateLimiter');

// Initialize Firebase
try {
  const serviceAccount = require('../firebase-service-account.json.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  logger.info('Firebase initialized');
} catch (error) {
  logger.error('Firebase init failed:', error);
}

// Import controllers
const deviceController = require('./controllers/deviceController');
const notificationController = require('./controllers/notificationController');
const healthRoutes = require('./routes/health');
const queueRoutes = require('./routes/queue');
const fcmRoutes = require('./routes/fcm');

const app = express();

// ===== SECURITY & PERFORMANCE MIDDLEWARE =====
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Status monitoring
app.use(statusMonitor());

// ===== REQUEST LOGGING MIDDLEWARE =====
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
});

// ===== HEALTH CHECK =====
app.get('/health', healthLimiter, asyncHandler(async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'OK',
    checks: {}
  };

  try {
    await admin.firestore().collection('health').doc('check').set(
      { lastCheck: new Date() },
      { merge: true }
    );
    health.checks.firebase = 'connected';
  } catch (e) {
    health.checks.firebase = 'disconnected';
    health.status = 'DEGRADED';
  }

  // Check memory
  const memUsage = process.memoryUsage();
  const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  health.checks.memory = {
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    percent: heapPercent.toFixed(1) + '%'
  };

  res.json(health);
}));

// ===== API DOCUMENTATION =====
setupSwagger(app);

// ===== ROUTES =====
app.use('/api/devices', registrationLimiter, deviceController);
app.use('/api/notifications', notificationLimiter, notificationController);
app.use('/api/health', healthLimiter, healthRoutes);
app.use('/api/queue', queueLimiter, queueRoutes);
app.use('/api/fcm', fcmLimiter, fcmRoutes);

// General API rate limit for any other routes
app.use('/api', apiLimiter);

// ===== 404 HANDLER =====
app.use((req, res, next) => {
  const error = new AppError(
    `Cannot find ${req.originalUrl} on this server`,
    404
  );
  next(error);
});

// ===== CENTRALIZED ERROR HANDLING =====
// MUST BE LAST MIDDLEWARE
app.use(errorHandler);

module.exports = app;
