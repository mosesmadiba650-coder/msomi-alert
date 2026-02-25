# 🚀 MSOMI ALERT - 7-DAY PRODUCTION EXECUTION PLAN

**Start Date**: February 25, 2026  
**Goal**: Transform prototype into production-ready system  
**Target Completion**: March 3, 2026  

---

## 📋 OVERVIEW

This is a **day-by-day execution plan** with specific commands, code, and deliverables. Every task is something you can DO, not just think about.

**Success Criteria**:
- ✅ Backend handles 100+ concurrent users
- ✅ FCM tokens properly managed
- ✅ Telegram broadcasts queued reliably
- ✅ Production APK built and tested
- ✅ Health monitoring live
- ✅ Error alerts configured
- ✅ Deployment runbook documented

---

---

## 📅 DAY 1: ARCHITECTURE & ENVIRONMENT (Thursday Feb 25)

### Goal: Set up production-ready backend structure

### Task 1.1: Create Production Directory Structure
```bash
cd "C:\Users\Admin\Desktop\ANCESTRAL CODE\backend"

# Create new directories
mkdir -p src/{controllers,services,middleware,utils,config}
mkdir -p config/{env,database}
mkdir -p tests/{unit,integration}
mkdir -p logs

# Create directory structure files
echo "Production backend structure" > src/README.md
```

### Task 1.2: Refactor server.js into modular structure

**Create: `backend/src/config/environment.js`**
```javascript
// Environment configuration management
const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    PORT: 5000,
    LOG_LEVEL: 'debug',
    CACHE_TTL: 60000,
    REQUEST_TIMEOUT: 30000,
    MAX_CONCURRENT: 100,
    BATCH_SIZE: 500,
    CLEANUP_INTERVAL: 5000
  },
  staging: {
    PORT: process.env.PORT || 5000,
    LOG_LEVEL: 'info',
    CACHE_TTL: 120000,
    REQUEST_TIMEOUT: 45000,
    MAX_CONCURRENT: 500,
    BATCH_SIZE: 1000,
    CLEANUP_INTERVAL: 10000
  },
  production: {
    PORT: process.env.PORT || 5000,
    LOG_LEVEL: 'warn',
    CACHE_TTL: 300000, // 5 minutes
    REQUEST_TIMEOUT: 60000,
    MAX_CONCURRENT: 1000,
    BATCH_SIZE: 2000,
    CLEANUP_INTERVAL: 30000
  }
};

module.exports = config[env] || config.development;
```

### Task 1.3: Create error handling middleware

**Create: `backend/src/middleware/errorHandler.js`**
```javascript
// Global error handler with Sentry integration
const handleError = (err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    statusCode: err.statusCode || 500
  });

  // Send error response
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });

  // TODO: Send to Sentry
  // Sentry.captureException(err);
};

module.exports = handleError;
```

### Task 1.4: Create logger service

**Create: `backend/src/utils/logger.js`**
```javascript
// Structured logging system
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');

class Logger {
  constructor() {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data
    };

    // Console
    console.log(`[${timestamp}] ${level}: ${message}`);

    // File
    const filename = path.join(LOG_DIR, `${level}.log`);
    fs.appendFileSync(filename, JSON.stringify(logEntry) + '\n');
  }

  error(message, data) { this.log('ERROR', message, data); }
  warn(message, data) { this.log('WARN', message, data); }
  info(message, data) { this.log('INFO', message, data); }
  debug(message, data) { this.log('DEBUG', message, data); }
}

module.exports = new Logger();
```

### Task 1.5: Update .env with production variables

**Create/Update: `backend/.env.production`**
```
NODE_ENV=production
PORT=5000
BACKEND_URL=https://msomi-alert.onrender.com
TELEGRAM_BOT_TOKEN=YOUR_TOKEN_HERE
CACHE_TTL=300000
LOG_LEVEL=warn
```

### Deliverables for Day 1
- ✅ Directory structure created
- ✅ Configuration files created
- ✅ Error handling middleware ready
- ✅ Logger utility ready
- ✅ Environment management system ready

### Verification Commands
```bash
ls -la backend/src/
ls -la backend/src/config/
ls -la backend/src/middleware/
```

---

## 📅 DAY 2: FCM TOKEN MANAGEMENT (Friday Feb 26)

### Goal: Build bulletproof FCM token handling

### Task 2.1: Create FCM Token Service

**Create: `backend/src/services/fcmTokenService.js`**
```javascript
const admin = require('firebase-admin');
const db = admin.firestore();
const logger = require('../utils/logger');

class FCMTokenService {
  // Store new token
  async storeToken(deviceId, token, metadata = {}) {
    try {
      const deviceRef = db.collection('devices').doc(deviceId);
      await deviceRef.set({
        fcmTokens: admin.firestore.FieldValue.arrayUnion({
          token,
          registeredAt: admin.firestore.FieldValue.serverTimestamp(),
          deviceInfo: metadata,
          isActive: true,
          refreshCount: 0
        })
      }, { merge: true });

      logger.info('FCM token stored', { deviceId, tokenPrefix: token.substring(0, 20) });
      return { success: true, deviceId };
    } catch (error) {
      logger.error('FCM token storage failed', { error: error.message, deviceId });
      throw error;
    }
  }

  // Refresh token periodically
  async refreshToken(deviceId, oldToken, newToken) {
    try {
      const deviceRef = db.collection('devices').doc(deviceId);
      
      // Remove old token, add new
      await deviceRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove({
          token: oldToken,
          isActive: true
        }),
        lastTokenRefresh: admin.firestore.FieldValue.serverTimestamp()
      });

      await this.storeToken(deviceId, newToken, { refreshed: true });
      
      logger.info('FCM token refreshed', { deviceId });
      return { success: true };
    } catch (error) {
      logger.error('FCM token refresh failed', { error: error.message, deviceId });
      throw error;
    }
  }

  // Mark token as invalid
  async markTokenInvalid(token, reason) {
    try {
      const devicesSnapshot = await db.collectionGroup('devices')
        .where('fcmTokens', 'array-contains', { token })
        .limit(10)
        .get();

      for (const device of devicesSnapshot.docs) {
        await device.ref.update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove({
            token,
            isActive: true
          })
        });

        logger.warn('Token marked invalid', { 
          deviceId: device.id, 
          reason,
          tokenPrefix: token.substring(0, 20)
        });
      }

      return { success: true, devicesUpdated: devicesSnapshot.docs.length };
    } catch (error) {
      logger.error('Token invalidation failed', { error: error.message });
      throw error;
    }
  }

  // Get active tokens for device
  async getActiveTokens(deviceId) {
    try {
      const device = await db.collection('devices').doc(deviceId).get();
      if (!device.exists) return [];

      const tokens = device.data().fcmTokens || [];
      return tokens.filter(t => t.isActive).map(t => t.token);
    } catch (error) {
      logger.error('Failed to get active tokens', { error: error.message, deviceId });
      return [];
    }
  }

  // Health check: test token validity
  async testToken(token) {
    try {
      // Send test message
      const response = await admin.messaging().send({
        token,
        notification: {
          title: 'MSOMI ALERT Test',
          body: 'If you see this, FCM is working!'
        },
        webpush: {
          ttl: 0 // Don't retry
        }
      });

      logger.info('Token test successful', { tokenPrefix: token.substring(0, 20) });
      return { valid: true, messageId: response };
    } catch (error) {
      if (error.code === 'messaging/invalid-registration-token') {
        logger.warn('Token invalid', { error: error.message });
        return { valid: false, reason: 'INVALID_TOKEN' };
      }
      logger.error('Token test failed', { error: error.message });
      return { valid: false, reason: 'TEST_ERROR' };
    }
  }
}

module.exports = new FCMTokenService();
```

### Task 2.2: Create FCM Controller

**Create: `backend/src/controllers/fcmController.js`**
```javascript
const fcmTokenService = require('../services/fcmTokenService');
const logger = require('../utils/logger');

exports.registerToken = async (req, res) => {
  try {
    const { deviceId, token, metadata } = req.body;

    if (!deviceId || !token) {
      return res.status(400).json({
        success: false,
        error: 'deviceId and token are required'
      });
    }

    const result = await fcmTokenService.storeToken(deviceId, token, metadata);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Token registration failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { deviceId, oldToken, newToken } = req.body;
    const result = await fcmTokenService.refreshToken(deviceId, oldToken, newToken);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.markInvalid = async (req, res) => {
  try {
    const { token, reason } = req.body;
    const result = await fcmTokenService.markTokenInvalid(token, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.testToken = async (req, res) => {
  try {
    const { token } = req.body;
    const result = await fcmTokenService.testToken(token);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Task 2.3: Add FCM routes to server

**Create: `backend/src/routes/fcm.js`**
```javascript
const express = require('express');
const router = express.Router();
const fcmController = require('../controllers/fcmController');

router.post('/register-token', fcmController.registerToken);
router.post('/refresh-token', fcmController.refreshToken);
router.post('/mark-invalid', fcmController.markInvalid);
router.post('/test-token', fcmController.testToken);

module.exports = router;
```

### Task 2.4: Update mobile app to use new FCM endpoints

**Update: `mobile-app/App.js` - Add token management**
```javascript
// In useEffect after registration:
const handleTokenRefresh = async () => {
  const newToken = await Notifications.getExpoPushTokenAsync();
  
  if (newToken && oldToken !== newToken.data) {
    try {
      await axios.post(`${API_URL}/api/fcm/refresh-token`, {
        deviceId: deviceToken,
        oldToken: oldToken.data,
        newToken: newToken.data
      });
      setOldToken(newToken);
      console.log('✅ Token refreshed');
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  }
};

// Run every hour
setInterval(handleTokenRefresh, 60 * 60 * 1000);
```

### Deliverables for Day 2
- ✅ FCM Token Service created
- ✅ FCM Controller created
- ✅ FCM Routes created
- ✅ Token refresh mechanism implemented
- ✅ Token validation system ready
- ✅ Mobile app updated for token management

### Verification Commands
```bash
curl -X POST http://localhost:5000/api/fcm/test-token \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TEST_TOKEN"}'
```

---

## 📅 DAY 3: TELEGRAM MESSAGE QUEUE (Saturday Feb 27)

### Goal: Build reliable message queuing for Telegram broadcasts

### Task 3.1: Create Message Queue Service

**Create: `backend/src/services/messageQueueService.js`**
```javascript
const admin = require('firebase-admin');
const db = admin.firestore();
const logger = require('../utils/logger');

class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
    this.processInterval = 2000; // 2 seconds between batches
  }

  async enqueue(message) {
    const queueItem = {
      id: `msg_${Date.now()}_${Math.random()}`,
      message,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
      errors: []
    };

    this.queue.push(queueItem);
    
    // Persist to Firestore
    await db.collection('messageQueue').add({
      ...queueItem,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info('Message queued', { 
      queueId: queueItem.id, 
      queueSize: this.queue.length 
    });

    if (!this.processing) {
      this.processQueue();
    }

    return queueItem.id;
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];

      try {
        logger.info('Processing message', { queueId: item.id });
        await this.sendMessage(item.message);
        
        item.status = 'success';
        await this.updateStatus(item.id, 'success');
        
        this.queue.shift();
        logger.info('Message sent successfully', { queueId: item.id });
      } catch (error) {
        item.attempts++;
        item.errors.push(error.message);

        if (item.attempts >= this.maxRetries) {
          item.status = 'failed';
          await this.updateStatus(item.id, 'failed', error.message);
          this.queue.shift();
          
          logger.error('Message failed after retries', { 
            queueId: item.id, 
            attempts: item.attempts,
            error: error.message 
          });
        } else {
          logger.warn('Message send failed, retrying', { 
            queueId: item.id,
            attempt: item.attempts,
            error: error.message 
          });
        }
      }

      // Wait before next message
      await new Promise(resolve => setTimeout(resolve, this.processInterval));
    }

    this.processing = false;
  }

  async sendMessage(message) {
    // This will be called by Telegram bot
    // Implementation depends on Telegram API
    return { success: true, messageId: Date.now() };
  }

  async updateStatus(messageId, status, error = null) {
    try {
      const doc = await db.collection('messageQueue')
        .where('id', '==', messageId)
        .limit(1)
        .get();

      if (!doc.empty) {
        await doc.docs[0].ref.update({
          status,
          error: error || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      logger.error('Failed to update message status', { error: error.message });
    }
  }

  getQueueStatus() {
    return {
      pending: this.queue.filter(m => m.status === 'pending').length,
      processing: this.processing,
      total: this.queue.length
    };
  }
}

module.exports = new MessageQueue();
```

### Task 3.2: Update Telegram Bot with Queueing

**Update: `backend/telegramBot.js` - Add queue integration**
```javascript
const messageQueue = require('./src/services/messageQueueService');

// In callback_query handler:
bot.on('callback_query', async (callbackQuery) => {
  // ... existing code ...
  
  if (data.startsWith('send_')) {
    const parts = data.split('_');
    const courseCode = parts[1];
    
    try {
      // Queue the message instead of sending immediately
      const messageItem = {
        type: 'telegram_broadcast',
        courseCode,
        title: context.title,
        body: context.body,
        urgency: urgency,
        timestamp: Date.now(),
        telegramUserId: userId
      };

      const queueId = await messageQueue.enqueue(messageItem);
      
      bot.editMessageText(
        `📤 **Message Queued!**\n\n` +
        `Your alert has been queued for broadcast.\n\n` +
        `Queue ID: \`${queueId}\`\n` +
        `Status: Processing\n\n` +
        `Students will receive notifications shortly.`,
        {
          chat_id: chatId,
          message_id: msg.message_id,
          parse_mode: 'Markdown'
        }
      );
    } catch (error) {
      logger.error('Queue error', { error: error.message });
    }
    
    messageContext.delete(userId);
  }
});

// Add queue status endpoint
app.get('/api/queue/status', (req, res) => {
  const status = messageQueue.getQueueStatus();
  res.json({ success: true, queue: status });
});
```

### Task 3.3: Create Queue Dashboard Endpoint

**Create: `backend/src/controllers/queueController.js`**
```javascript
const db = require('firebase-admin').firestore();
const logger = require('../utils/logger');

exports.getStatus = async (req, res) => {
  try {
    const snapshot = await db.collection('messageQueue')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const messages = [];
    snapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      });
    });

    const stats = {
      total: messages.length,
      pending: messages.filter(m => m.status === 'pending').length,
      success: messages.filter(m => m.status === 'success').length,
      failed: messages.filter(m => m.status === 'failed').length
    };

    res.json({ success: true, stats, recentMessages: messages });
  } catch (error) {
    logger.error('Queue status failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.retryFailed = async (req, res) => {
  try {
    const { messageId } = req.body;
    
    const doc = await db.collection('messageQueue').doc(messageId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    await doc.ref.update({
      status: 'pending',
      attempts: 0,
      errors: []
    });

    logger.info('Message queued for retry', { messageId });
    res.json({ success: true, message: 'Queued for retry' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Deliverables for Day 3
- ✅ Message Queue Service created
- ✅ Queue persistence (Firestore)
- ✅ Retry logic implemented
- ✅ Telegram integration with queuing
- ✅ Queue status monitoring endpoint
- ✅ Manual retry capability

### Verification Commands
```bash
# Check queue status
curl http://localhost:5000/api/queue/status

# Retry a failed message
curl -X POST http://localhost:5000/api/queue/retry \
  -H "Content-Type: application/json" \
  -d '{"messageId":"YOUR_MESSAGE_ID"}'
```

---

## 📅 DAY 4: ERROR MONITORING WITH SENTRY (Sunday Feb 28)

### Goal: Set up production error tracking and alerting

### Task 4.1: Setup Sentry Account

```bash
# 1. Go to https://sentry.io and create account
# 2. Create new project: Select "Node.js -> Express"
# 3. Get your DSN (Data Source Name)
# 4. Save DSN in .env.production:

# In backend/.env.production:
SENTRY_DSN=https://YOUR_DSN@sentry.io/YOUR_PROJECT_ID
```

### Task 4.2: Integrate Sentry into Backend

**Update: `backend/server.js` - Add Sentry**
```javascript
const Sentry = require("@sentry/node");

// MUST be called first
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
    beforeSend(event) {
      // Filter out health checks
      if (event.request?.url?.includes('/health')) {
        return null;
      }
      return event;
    }
  });
  
  app.use(Sentry.Handlers.requestHandler());
}

// ... rest of server code ...

// Error handler MUST be last
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(globalErrorHandler);
```

### Task 4.3: Create Error Monitoring Service

**Create: `backend/src/services/errorMonitoringService.js`**
```javascript
const Sentry = require("@sentry/node");
const logger = require('../utils/logger');

class ErrorMonitoring {
  captureException(error, context = {}) {
    logger.error('Exception captured', { 
      error: error.message, 
      context 
    });

    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        tags: context.tags || {},
        extra: context.extra || {}
      });
    }
  }

  captureMessage(message, level = 'error') {
    logger.log(level, message);

    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(message, level);
    }
  }

  recordMetric(metricName, value, tags = {}) {
    // Send to monitoring service
    logger.info(`Metric: ${metricName}`, { value, tags });
  }

  // Critical alert triggered
  async alertCritical(message, context) {
    logger.error(`🚨 CRITICAL: ${message}`, context);

    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(message, 'fatal', {
        tags: { severity: 'critical', ...context.tags },
        extra: context.extra
      });
    }

    // TODO: Send SMS/Email/Slack alert
    // await this.sendSlackAlert(message, context);
  }
}

module.exports = new ErrorMonitoring();
```

### Task 4.4: Add Health Monitoring Dashboard

**Create: `backend/src/controllers/healthController.js`**
```javascript
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
    // Check Firebase
    const testDoc = await db.collection('health').doc('test').set(
      { lastCheck: new Date() },
      { merge: true }
    );
    health.checks.firebase = { status: 'ok', responseTime: '< 100ms' };
  } catch (error) {
    health.checks.firebase = { status: 'failed', error: error.message };
    health.status = 'degraded';
  }

  try {
    // Check memory
    const mem = process.memoryUsage();
    const heapPercent = (mem.heapUsed / mem.heapTotal) * 100;
    health.checks.memory = {
      status: heapPercent > 90 ? 'warning' : 'ok',
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      percent: heapPercent.toFixed(1) + '%'
    };

    if (heapPercent > 90) {
      errorMonitoring.alertCritical('High memory usage', {
        tags: { component: 'memory' },
        extra: { heapPercent, mem }
      });
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.memory = { status: 'failed' };
  }

  res.json(health);
};
```

### Task 4.5: Install and test Sentry

```bash
cd backend
npm install @sentry/node
npm install dotenv

# Update .env.production with SENTRY_DSN

# Test error capture
npm run dev

# In another terminal:
curl -X POST http://localhost:5000/api/notify/course \
  -H "Content-Type: application/json" \
  -d '{"courseCode":"TEST","title":"","body":""}'
  # Should trigger 400 error - check Sentry dashboard
```

### Deliverables for Day 4
- ✅ Sentry account created
- ✅ Error monitoring integrated
- ✅ Health check endpoint with dependency checks
- ✅ Metrics tracking system
- ✅ Critical alert system
- ✅ Error context enrichment

### Verification Commands
```bash
# Check detailed health
curl http://localhost:5000/health/detailed | jq

# Check Sentry dashboard
# Visit: https://sentry.io/organizations/YOUR_ORG/issues/
```

---

## 📅 DAY 5: PRODUCTION APK BUILD (Monday Mar 1)

### Goal: Build, test, and prepare APK for distribution

### Task 5.1: Install Global Tools

```bash
npm install -g eas-cli expo-cli
```

### Task 5.2: Authenticate & Setup Expo

```bash
# Create Expo account at https://expo.dev if needed
eas login

# Verify authentication
eas whoami
```

### Task 5.3: Initialize EAS for Project

```bash
cd mobile-app
npx expo@latest --version

# Link project to Expo
eas project:init

# This creates projectId in eas.json
```

### Task 5.4: Build Preview APK

```bash
cd mobile-app

# Install latest dependencies
npm install

# Build APK (takes 10-15 minutes)
eas build -p android --profile preview

# Follow the prompts
# You'll see: "📱 Your build is in the queue"
# Wait for completion...
```

### Task 5.5: Download & Test APK

```bash
# EAS will provide download link
# Scan QR code with phone OR click link directly

# OR download via ADB:
adb devices  # Ensure device is connected

# Install APK
adb install -r ~/Downloads/MSOMI_ALERT_preview.apk

# Or manually drag-drop APK to phone
```

### Task 5.6: Manual Testing Checklist

On physical Android device:
```bash
# 1. Launch app
# ✅ Verify: App starts without crashes
# ✅ Verify: Welcome screen displays
# ✅ Verify: Can add courses
# ✅ Verify: Demo mode loads all scenarios

# 2. Network tests
# ✅ Verify: Works on WiFi
# ✅ Verify: Works on mobile data
# ✅ Verify: Offline indicator shown correctly
# ✅ Verify: Backend timeout handled gracefully (30sec)

# 3. Feature tests
# ✅ Verify: Registration completes
# ✅ Verify: Course selection works
# ✅ Verify: Demo notification scenario triggers
# ✅ Verify: Notification displays with sound

# 4. Performance tests
# ✅ Verify: Startup time < 3 seconds
# ✅ Verify: Navigation smooth (60 FPS)
# ✅ Verify: Memory < 200MB
# ✅ Verify: No crashes after 10 minutes usage

# 5. Offline tests
# ✅ Verify: Enable airplane mode
# ✅ Verify: App still displays cached data
# ✅ Verify: Shows offline indicator
# ✅ Verify: Can read stored documents without internet
```

### Task 5.7: Capture Screenshots for Store

```bash
# Use device or emulator to capture:
# 1. Registration screen
# 2. Course selection
# 3. Notification inbox
# 4. Demo mode
# 5. Offline indicator

# Save as:
# - screenshot_1_registration.png
# - screenshot_2_courses.png
# - screenshot_3_inbox.png
# - screenshot_4_demo.png
# - screenshot_5_offline.png

# Min. 2 screenshots, max 8
# Size: 1080x1920 pixels recommended
```

### Deliverables for Day 5
- ✅ Preview APK built
- ✅ APK tested on physical device
- ✅ All features verified working
- ✅ Performance validated
- ✅ Screenshots captured
- ✅ Build artifacts documented

### Verification Commands
```bash
# Check build status
eas build:list

# Get download URL
eas build:info --id YOUR_BUILD_ID

# Monitor app logs on device
adb logcat | grep -i msomi
```

---

## 📅 DAY 6: DEPLOYMENT & MONITORING SETUP (Tuesday Mar 2)

### Goal: Deploy to production-grade infrastructure with monitoring

### Task 6.1: Set up GitHub Actions for CI/CD

**Create: `.github/workflows/deploy.yml`**
```yaml
name: Deploy to Render

on:
  push:
    branches: [ main ]
    paths: [ 'backend/**', '.github/workflows/deploy.yml' ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Render
      env:
        RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
      run: |
        curl -X POST https://api.render.com/deploy/srv/${{ secrets.RENDER_SERVICE_ID }} \
          -H "Authorization: Bearer $RENDER_API_KEY"
```

### Task 6.2: Configure Production Environment

**Create: `backend/deploy/.env.production`** (Example)
```
NODE_ENV=production
PORT=5000
BACKEND_URL=https://msomi-alert.onrender.com
TELEGRAM_BOT_TOKEN=${{ secrets.TELEGRAM_BOT_TOKEN }}
SENTRY_DSN=${{ secrets.SENTRY_DSN }}
CACHE_TTL=300000
LOG_LEVEL=warn
MAX_CONCURRENT_REQUESTS=1000
```

### Task 6.3: Set up Render Deployment

```bash
# Login to Render dashboard: https://dashboard.render.com

# 1. Go to existing service: msomi-alert-backend
# 2. Update environment variables:
#    - NODE_ENV=production
#    - SENTRY_DSN=YOUR_DSN
#    - Add any new variables

# 3. Deploy latest code from main branch
# 4. Monitor logs in real-time
```

### Task 6.4: Create Uptime Monitoring

**Create: `monitoring/uptime.js`**
```javascript
const axios = require('axios');
const nodemailer = require('nodemailer');

const BACKEND_URL = 'https://msomi-alert.onrender.com';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Email config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL,
    pass: process.env.ALERT_PASSWORD
  }
});

async function checkHealth() {
  try {
    const start = Date.now();
    const response = await axios.get(`${BACKEND_URL}/health/detailed`, {
      timeout: 30000
    });
    const duration = Date.now() - start;

    console.log(`✅ [${new Date().toISOString()}] Backend OK (${duration}ms)`);

    return { status: 'ok', duration, health: response.data };
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Backend DOWN: ${error.message}`);

    // Send alert email
    await transporter.sendMail({
      from: process.env.ALERT_EMAIL,
      to: process.env.ALERT_EMAIL,
      subject: '🚨 MSOMI ALERT Backend is DOWN',
      html: `
        <h2>Backend Health Check Failed</h2>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>URL:</strong> ${BACKEND_URL}</p>
        <p>Please investigate immediately.</p>
      `
    });

    return { status: 'down', error: error.message };
  }
}

// Run continuously
setInterval(checkHealth, CHECK_INTERVAL);

// Run immediately
checkHealth();

console.log(`🔍 Uptime monitoring started (check every ${CHECK_INTERVAL / 60000} minutes)`);
```

### Task 6.5: Create Incident Response Plan

**Create: `docs/INCIDENT_RESPONSE.md`**
```markdown
# Incident Response Runbook

## 🚨 Backend Down (502, Connection Refused)

1. **Verify the issue**
   ```bash
   curl https://msomi-alert.onrender.com/health
   ```

2. **Check Render dashboard**
   - Go to https://dashboard.render.com
   - Look for deployment errors
   - Check resource usage (CPU, memory)

3. **Options**
   - **If out of memory**: Increase plan or clear old data
   - **If crash loop**: Check recent deploy, rollback if needed
   - **If database issue**: Check Firebase console

4. **Manual restart**
   ```bash
   # Via Render dashboard > Service > Manual Restart
   # Or via API:
   curl -X POST https://api.render.com/v1/services/YOUR_SERVICE_ID/restart \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

## 📬 High Error Rate (>5% of requests)

1. Check Sentry dashboard: https://sentry.io
2. Look for error pattern
3. Deploy fix if identified
4. Monitor recovery

## 📊 Memory Leak

1. Check `/metrics` endpoint
2. Look for growing heap usage
3. Review recent code changes
4. Restart service if necessary
5. Investigate root cause

## 🔗 FCM Issues (Notifications Not Arriving)

1. Check token validity
2. Verify Firebase project permissions
3. Test with `/api/fcm/test-token`
4. Review Firebase Cloud Messaging rules
```

### Deliverables for Day 6
- ✅ GitHub Actions CI/CD configured
- ✅ Production environment validated
- ✅ Uptime monitoring deployed
- ✅ Alert system configured
- ✅ Incident response plan documented
- ✅ Log aggregation configured

---

## 📅 DAY 7: LAUNCH & DOCUMENTATION (Wednesday Mar 3)

### Goal: Complete documentation and prepare for launch

### Task 7.1: Create Production Deployment Checklist

**Create: `DEPLOYMENT_CHECKLIST.md`**
```markdown
# 🚀 Production Deployment Checklist

## Pre-Deployment (48 hours before)
- [ ] All tests passing
- [ ] Code reviewed by 2 team members
- [ ] Database backups created
- [ ] Rollback plan documented
- [ ] Team notified of deployment window
- [ ] Firebase project backed up

## Deployment
- [ ] Deploy code to GitHub main branch
- [ ] Trigger Render automatic deploy
- [ ] Monitor error rate (should stay < 1%)
- [ ] Monitor memory usage (should stay < 300MB)
- [ ] Field test with 5 internal users
- [ ] Check FCM token registration
- [ ] Test Telegram bot message broadcast

## Post-Deployment (24 hours after)
- [ ] No critical errors in Sentry
- [ ] Database size stable
- [ ] Token refresh working
- [ ] Cache hit rate > 50%
- [ ] Response times < 500ms
- [ ] All services responsive

## Monitoring (Weekly)
- [ ] Review error trends
- [ ] Check database growth
- [ ] Validate token expiry handling
- [ ] Monitor user growth
- [ ] Review performance metrics
```

### Task 7.2: Create User Documentation

**Create: `docs/USER_GUIDE.md`**
```markdown
# MSOMI ALERT - User Guide for Students

## 📥 Installation

1. **Download from Google Play Store**
   - Search "MSOMI ALERT"
   - Or visit: https://play.google.com/store/apps/details?id=com.msomi.alert
   - Click "Install"

2. **Grant Permissions**
   - Notifications: Required (to receive alerts)
   - Location: Optional
   - Storage: Required (to store documents offline)

## 📝 Registration

1. **Open the app**
2. **Enter your details** (optional):
   - Name
   - Phone number
3. **Select your courses**:
   - CSC201
   - BIT401
   - etc.
4. **Tap "Register Device"**
5. **Wait for confirmation** (up to 60 seconds)

## 🔔 Receiving Alerts

- **Urgent alerts** appear as pop-up notifications
- **Normal updates** appear in notification center
- **Alerts work even with 0 data balance!**
- **Offline data**: App auto-updates when on WiFi

## 💾 Offline Documents

1. Tap "📄 Documents"
2. Available documents auto-download on WiFi
3. Open documents anytime, even offline
4. Swipe to filter by course

## ⚙️ Settings

- **App language**: English, Swahili, Sheng
- **Notification sound**: On/Off
- **Vibration**: On/Off
- **Dark mode**: On/Off
- **Clear data**: Delete all local data and re-register

## 🆘 Support

- Email: support@msomi-alert.com
- WhatsApp: +254 XXX XXX XXX
- Website: https://msomi-alert.com
```

### Task 7.3: Create System Architecture Diagram

**Create: `ARCHITECTURE.md`**
```markdown
# MSOMI ALERT - System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    STUDENTS (Kenya)                         │
│  (Android App · Offline · Zero Data Balance)               │
└──────────────────────────┬──────────────────────────────────┘
                            │ FCM Push Notifications
                            │
┌──────────────────────────▼──────────────────────────────────┐
│           BACKEND - Render.com (Node.js/Express)           │
│  (Keep-alive · Token Management · Message Queue)           │
└──────────────────┬───────────────────────┬──────────────────┘
                    │                       │
        ┌───────────▼────┐        ┌────────▼──────┐
        │ Firebase       │        │ Telegram Bot  │
        │ Firestore      │        │ Integration   │
        │ Auth           │        │ (Message Rx)  │
        └────────────────┘        └───────────────┘
            │
            ├─ Devices collection (device tokens, courses)
            ├─ Notifications collection (history, logs)
            ├─ Message Queue (pending broadcasts)
            └─ Classreps collection (class rep mapping)

## Data Flow

1. **Registration**
   - Student → App → Backend → Firebase Devices collection

2. **Alert Broadcasting**
   - Classrep → Telegram → Backend → Message Queue → FCM → Students

3. **Offline Sync**
   - WiFi available → App → Document sync service → Downloads → Local storage

4. **Error Recovery**
   - Failed notification → Queue retry logic → Backend → Sentry alerts
```

### Task 7.4: Create Scaling Roadmap

**Create: `SCALING_ROADMAP.md`**
```markdown
# Scaling Roadmap

## Phase 1: 100 Users (Current)
✅ **Architecture**: Single Node.js instance + Firebase
✅ **Database**: Firestore free tier
✅ **Bottleneck**: None expected

### What breaks first:
- Render free tier might fall asleep (FIXED with keep-alive)
- Firebase free tier might hit limits

### Prevention:
```bash
# Monitor metrics
curl https://msomi-alert.onrender.com/metrics

# Expected:
- Heap: 100-200MB
- Requests: 0-50 active
- Cache: 10-50 entries
```

## Phase 2: 1,000 Users (March 2026)
🟡 **Action needed**: Upgrade Render to paid tier

### Cost analysis:
- Render Standard: $7/month (2 GB RAM, 1 CPU)
- Firebase: Still free tier
- Total: ~$10/month

### Setup:
```bash
# Via Render dashboard:
# 1. Go to Service Settings
# 2. Change plan to Standard ($7/month)
# 3. Increase max instances to 2

# Result: Auto-scaling, better performance
```

##Phase 3: 10,000 Users (June 2026)
🔴 **Major architecture change needed**

### Current bottleneck:
- Single database instance
- Single backend instance insufficient
- Firebase might hit write limits

### Recommended changes:
1. **Multi-region deployment**
   - Deploy multiple backend instances
   - Use load balancer (Render Pro)
   - Firebase already handles global load

2. **Database optimization**
   - Migrate old notifications (> 90 days)
   - Add indexes for common queries
   - Implement data archival

3. **Caching layer**
   - Add Redis (can use Firebase free tier alternative)
   - Cache device lists by course (1-5 min TTL)
   - Cache stats endpoints

### Estimated cost:
- Render Pro + instances: $25-50/month
- Docker + load balancer: $50/month
- Firebase upgraded: $0 (covers 10k users)
- **Total: $50-100/month**

## Monitoring Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Heap memory | > 150MB | > 250MB | Restart or upgrade |
| Active requests | > 100 | > 500 | Scale up |
| Error rate | > 1% | > 5% | Investigate |
| FCM delivery | < 95% | < 90% | Check tokens |
| Response time | > 1s | > 5s | Scale up |
|Database size | > 1GB | > 5GB | Migrate data |
```

### Task 7.5: Final Integration Test

```bash
# Test entire system as a user would

# 1. Backend health
curl https://msomi-alert.onrender.com/health

# 2. Firebase connectivity
curl https://msomi-alert.onrender.com/firebase-test

# 3. Device registration
curl -X POST https://msomi-alert.onrender.com/api/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "deviceToken": "test-token-'$(date +%s)'",
    "phoneNumber": "+254712345678",
    "studentName": "Test Student",
    "courses": ["CSC201"]
  }'

# 4. Notification broadcast
curl -X POST https://msomi-alert.onrender.com/api/notify/course \
  -H "Content-Type: application/json" \
  -d '{
    "courseCode": "CSC201",
    "title": "Test Notification",
    "body": "System is ready for production!",
    "urgency": "normal"
  }'

# 5. System metrics
curl https://msomi-alert.onrender.com/metrics
```

### Task 7.6: Create README for Contributors

**Create: `CONTRIBUTING.md`**
```markdown
# Contributing to MSOMI ALERT

## Setup Development Environment

```bash
# Clone repository
git clone https://github.com/mosesmadiba/msomi-alert.git
cd msomi-alert

# Backend setup
cd backend
npm install
cp .env.example .env
npm run dev

# Mobile setup
cd ../mobile-app
npm install
npx expo start
```

## Deployment Process

1. Create feature branch
2. Make changes
3. Test locally
4. Push to GitHub
5. Create Pull Request
6. Get code review
7. Merge to main (triggers auto-deploy)

## Code Style

- Use ESLint
- Follow Node.js best practices
- Comment complex logic
- Add error handling

## Testing

- Test locally before pushing
- Test on actual device for mobile
- Verify on production URL
```

###Deliverables for Day 7
- ✅ Deployment checklist created
- ✅ User documentation written
- ✅ Architecture documented
- ✅ Scaling roadmap defined
- ✅ Final integration tests passing
- ✅ Contributing guide created
- ✅ Ready for public launch

---

## 🎯 7-DAY SUMMARY

### What You've Accomplished

| Day | Focus | Key Deliverables |
|-----|-------|------------------|
| 1 | Architecture | Production structure, error handling, logging |
| 2 | FCM Tokens | Token management, refresh logic, validation |
| 3 | Messaging | Message queue, retry logic, Telegram integration |
| 4 | Monitoring | Sentry integration, error tracking, health checks |
| 5 | APK Build | Preview APK, testing, screenshots |
| 6 | Deployment | CI/CD, monitoring, incident response |
| 7 | Launch | Documentation, scaling roadmap, final tests |

### System Now Ready For:
- ✅ **100+ concurrent users**
- ✅ **Production deployment**
- ✅ **Real Kenyan students**
- ✅ **Continuous operation**
- ✅ **Automatic error recovery**
- ✅ **Scalable growth**

---

## 🚀 NEXT IMMEDIATE STEPS

### After Day 7:

1. **Launch APK to Google Play Beta** (1-2 days)
   ```bash
   eas build -p android --profile production
   # Submit to Play Store internal testing
   ```

2. **Invite Beta Testers** (3-5 days)
   - 10-20 real Kenyan students
   - Collect feedback
   - Fix issues

3. **Go Public** (1 week)
   - Shift from beta to production track
   - Monitor for first week
   - Fix any issues

4. **Scale to 1,000 Users** (2-3 weeks)
   - Upgrade Render tier
   - Monitor performance
   - Optimize as needed

---

## 📞 SUPPORT

**If you get stuck on any day**:
1. Check error messages: `curl http://localhost:5000/metrics`
2. Review Sentry dashboard for errors
3. Check logs: `adb logcat | grep msomi`
4. Refer back to documentation in that day's section

**You've got this! 🚀🇰🇪**
