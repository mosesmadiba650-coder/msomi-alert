const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');
const admin = require('firebase-admin');

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

const app = express();

// Security & Performance
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
});
app.use('/api', limiter);

// Health check
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK'
  };

  try {
    await admin.firestore().collection('health').doc('check').get();
    health.firebase = 'connected';
  } catch (e) {
    health.firebase = 'disconnected';
  }

  res.json(health);
});

// Routes
app.use('/api/devices', deviceController);
app.use('/api/notifications', notificationController);

// Error handling
app.use(errorHandler);

module.exports = app;
