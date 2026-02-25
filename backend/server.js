require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Firestore database
const db = admin.firestore();

// ===== MEMORY OPTIMIZATION SETTINGS =====
const CONCURRENT_REQUESTS = 100;
const REQUEST_TIMEOUT = 30000; // 30 seconds
const CACHE_TTL = 60000; // 1 minute cache

// Simple in-memory cache for frequently accessed data
const memoryCache = new Map();

function cacheSet(key, value, ttl = CACHE_TTL) {
  memoryCache.delete(key);
  memoryCache.set(key, { value, expires: Date.now() + ttl });
}

function cacheGet(key) {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expires) {
    memoryCache.delete(key);
    return null;
  }
  return cached.value;
}

// Cleanup old cache entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expires) {
      memoryCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Request counter for monitoring concurrent load
let activeRequests = 0;
let peakRequests = 0;

// Start Telegram Bot
if (process.env.TELEGRAM_BOT_TOKEN) {
  require('./telegramBot');
} else {
  console.warn('⚠️  TELEGRAM_BOT_TOKEN not set - bot will not start');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit request size

// Request tracking middleware
app.use((req, res, next) => {
  activeRequests++;
  peakRequests = Math.max(peakRequests, activeRequests);
  req.setTimeout(REQUEST_TIMEOUT);
  res.on('finish', () => {
    activeRequests--;
  });
  next();
});

// Memory status endpoint for monitoring
app.get('/metrics', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
    },
    requests: {
      active: activeRequests,
      peak: peakRequests
    },
    cache: {
      entries: memoryCache.size
    }
  });
});

// Test Firebase connection route
app.get('/firebase-test', async (req, res) => {
  try {
    // Try to write a test document
    const testDoc = await db.collection('test').add({
      message: 'Firebase connected',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      message: '✅ Firebase connected successfully',
      documentId: testDoc.id
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Basic test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'MSOMI ALERT Backend Running',
    firebase: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'msomi-alert-backend' });
});

// ===== DEVICE REGISTRATION ENDPOINTS =====

// Register student device
app.post('/api/register-device', async (req, res) => {
  try {
    const { 
      deviceToken,
      phoneNumber,
      courses,
      studentName
    } = req.body;
    
    if (!deviceToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'deviceToken is required' 
      });
    }
    
    const existingQuery = await db.collection('devices')
      .where('deviceToken', '==', deviceToken)
      .limit(1)
      .get();
    
    let deviceDoc;
    
    if (!existingQuery.empty) {
      deviceDoc = existingQuery.docs[0];
      await deviceDoc.ref.update({
        phoneNumber: phoneNumber || deviceDoc.data().phoneNumber,
        courses: courses || deviceDoc.data().courses,
        studentName: studentName || deviceDoc.data().studentName,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.json({ 
        success: true, 
        message: 'Device registration updated',
        deviceId: deviceDoc.id
      });
    } else {
      const newDevice = {
        deviceToken,
        phoneNumber: phoneNumber || null,
        courses: courses || [],
        studentName: studentName || null,
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        active: true
      };
      
      const docRef = await db.collection('devices').add(newDevice);
      
      res.status(201).json({ 
        success: true, 
        message: 'Device registered successfully',
        deviceId: docRef.id
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all registered devices (with caching)
app.get('/api/devices', async (req, res) => {
  try {
    // Check cache first
    const cached = cacheGet('api:devices');
    if (cached) {
      return res.json(cached);
    }
    
    const devicesSnapshot = await db.collection('devices')
      .orderBy('lastSeen', 'desc')
      .limit(50)
      .get();
    
    const devices = [];
    devicesSnapshot.forEach(doc => {
      const data = doc.data();
      devices.push({
        id: doc.id,
        phoneNumber: data.phoneNumber,
        courses: data.courses,
        studentName: data.studentName,
        active: data.active,
        deviceToken: data.deviceToken.substring(0, 10) + '...'
      });
    });
    
    const response = { 
      success: true, 
      count: devices.length,
      devices 
    };
    
    cacheSet('api:devices', response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get devices by course
app.get('/api/devices/course/:courseCode', async (req, res) => {
  try {
    const { courseCode } = req.params;
    
    const devicesSnapshot = await db.collection('devices')
      .where('courses', 'array-contains', courseCode)
      .where('active', '==', true)
      .get();
    
    const devices = [];
    devicesSnapshot.forEach(doc => {
      devices.push({
        id: doc.id,
        deviceToken: doc.data().deviceToken,
        studentName: doc.data().studentName
      });
    });
    
    res.json({ 
      success: true, 
      course: courseCode,
      count: devices.length,
      devices 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Unregister device
app.post('/api/unregister-device', async (req, res) => {
  try {
    const { deviceToken } = req.body;
    
    if (!deviceToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'deviceToken is required' 
      });
    }
    
    const devicesSnapshot = await db.collection('devices')
      .where('deviceToken', '==', deviceToken)
      .get();
    
    if (devicesSnapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'Device not found' 
      });
    }
    
    const deviceDoc = devicesSnapshot.docs[0];
    await deviceDoc.ref.update({
      active: false,
      unregisteredAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      message: 'Device unregistered successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===== CLASS REP ENDPOINTS =====

// Register class rep
app.post('/api/register-classrep', async (req, res) => {
  try {
    const { telegramId, telegramUsername, name, courses } = req.body;
    
    const classRep = {
      telegramId,
      telegramUsername,
      name,
      courses: courses || [],
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      alertsSent: 0,
      studentsReached: 0,
      active: true
    };
    
    const existing = await db.collection('classreps')
      .where('telegramId', '==', telegramId)
      .get();
    
    if (!existing.empty) {
      const doc = existing.docs[0];
      await doc.ref.update({
        courses: admin.firestore.FieldValue.arrayUnion(...courses),
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.json({ success: true, message: 'Class rep updated' });
    } else {
      await db.collection('classreps').add(classRep);
      res.json({ success: true, message: 'Class rep registered' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get class rep courses
app.get('/api/classrep/:telegramId/courses', async (req, res) => {
  try {
    const { telegramId } = req.params;
    
    const snapshot = await db.collection('classreps')
      .where('telegramId', '==', parseInt(telegramId))
      .get();
    
    if (snapshot.empty) {
      return res.json({ courses: [] });
    }
    
    const classRep = snapshot.docs[0].data();
    res.json({ courses: classRep.courses || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get class rep stats
app.get('/api/classrep/:telegramId/stats', async (req, res) => {
  try {
    const { telegramId } = req.params;
    
    const repSnapshot = await db.collection('classreps')
      .where('telegramId', '==', parseInt(telegramId))
      .get();
    
    if (repSnapshot.empty) {
      return res.json({ totalAlerts: 0, totalRecipients: 0, last7Days: 0 });
    }
    
    const repData = repSnapshot.docs[0].data();
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const notificationsSnapshot = await db.collection('notifications')
      .where('dataPayload.forwardedBy', '==', parseInt(telegramId))
      .where('sentAt', '>', sevenDaysAgo)
      .get();
    
    let last7Days = 0;
    let totalRecipients = 0;
    
    notificationsSnapshot.forEach(doc => {
      last7Days++;
      totalRecipients += doc.data().recipientCount || 0;
    });
    
    res.json({
      totalAlerts: (repData.alertsSent || 0) + last7Days,
      totalRecipients: (repData.studentsReached || 0) + totalRecipients,
      last7Days
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== NOTIFICATION SENDING ENDPOINTS =====

// Helper function to remove invalid tokens (batched and delayed)
const invalidTokenQueue = [];
let tokenCleanupScheduled = false;

async function removeInvalidToken(deviceToken) {
  // Queue the cleanup instead of doing it immediately
  invalidTokenQueue.push(deviceToken);
  
  // Process queue in batches every 5 seconds
  if (!tokenCleanupScheduled && invalidTokenQueue.length > 0) {
    tokenCleanupScheduled = true;
    
    setTimeout(async () => {
      const batch = invalidTokenQueue.splice(0, 50); // Process max 50 at a time
      
      for (const token of batch) {
        try {
          const devicesSnapshot = await db.collection('devices')
            .where('deviceToken', '==', token)
            .limit(1)
            .get();
          
          if (!devicesSnapshot.empty) {
            const deviceDoc = devicesSnapshot.docs[0];
            await deviceDoc.ref.update({
              active: false,
              invalidToken: true,
              invalidatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        } catch (error) {
          console.error('Token cleanup error:', error.message);
        }
      }
      
      tokenCleanupScheduled = false;
      
      // Schedule next batch if queue not empty
      if (invalidTokenQueue.length > 0) {
        removeInvalidToken('').catch(() => {});
      }
    }, 5000);
  }
}

// Send notification to all devices in a course
app.post('/api/notify/course', async (req, res) => {
  try {
    const { 
      courseCode,
      title,
      body,
      data,
      urgency = 'normal'
    } = req.body;
    
    if (!courseCode || !title || !body) {
      return res.status(400).json({ 
        success: false, 
        error: 'courseCode, title, and body are required' 
      });
    }
    
    const devicesSnapshot = await db.collection('devices')
      .where('courses', 'array-contains', courseCode)
      .where('active', '==', true)
      .get();
    
    if (devicesSnapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: `No registered devices found for course ${courseCode}` 
      });
    }
    
    const deviceTokens = [];
    devicesSnapshot.forEach(doc => {
      deviceTokens.push(doc.data().deviceToken);
    });
    
    const payload = {
      notification: {
        title: title,
        body: body,
        sound: urgency === 'urgent' ? 'urgent_sound.wav' : 'default',
        priority: urgency === 'urgent' ? 'high' : 'normal',
        android_channel_id: urgency === 'urgent' ? 'urgent_alerts' : 'general_notifications'
      },
      data: {
        courseCode: courseCode,
        urgency: urgency,
        timestamp: new Date().toISOString(),
        click_action: 'OPEN_ALERT',
        ...data
      },
      android: {
        priority: urgency === 'urgent' ? 'high' : 'normal',
        ttl: 86400
      },
      apns: {
        payload: {
          aps: {
            sound: urgency === 'urgent' ? 'urgent.caf' : 'default',
            badge: 1
          }
        }
      }
    };
    
    let successTotal = 0;
    let failureTotal = 0;
    const batchSize = 500;
    const maxBatchLimit = deviceTokens.length;
    
    console.log(`📤 Sending notification to ${deviceTokens.length} devices for ${courseCode}`);
    
    // Send notifications in batches
    for (let i = 0; i < maxBatchLimit; i += batchSize) {
      const batch = deviceTokens.slice(i, i + batchSize);
      
      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: batch,
          ...payload
        });
        
        successTotal += response.successCount;
        failureTotal += response.failureCount;
        
        // Clean up invalid tokens asynchronously (fire and forget)
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error && 
              (resp.error.code === 'messaging/invalid-registration-token' ||
               resp.error.code === 'messaging/registration-token-not-registered')) {
            const invalidToken = batch[idx];
            removeInvalidToken(invalidToken).catch(err => {
              console.error('Cleanup error:', err.message);
            });
          }
        });
        
      } catch (batchError) {
        console.error('Batch send error:', batchError);
        failureTotal += batch.length;
      }
    }
    
    // Log notification asynchronously (don't await)
    const notificationLog = {
      courseCode,
      title,
      body,
      urgency,
      recipientCount: deviceTokens.length,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      dataPayload: data || null,
      summary: {
        successCount: successTotal,
        failureCount: failureTotal
      }
    };
    
    db.collection('notifications').add(notificationLog).catch(err => {
      console.error('Notification log error:', err);
    });
    
    // Clear large arrays to help garbage collection
    deviceTokens.length = 0;
    
    res.json({
      success: true,
      message: `Notification sent to ${successTotal} devices`,
      course: courseCode,
      summary: {
        total: successTotal + failureTotal,
        success: successTotal,
        failure: failureTotal
      }
    });
    
  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Send notification to a single device
app.post('/api/notify/device', async (req, res) => {
  try {
    const { deviceToken, title, body, data } = req.body;
    
    if (!deviceToken || !title || !body) {
      return res.status(400).json({ 
        success: false, 
        error: 'deviceToken, title, and body are required' 
      });
    }
    
    const payload = {
      notification: {
        title,
        body,
        sound: 'default'
      },
      data: {
        timestamp: new Date().toISOString(),
        ...data
      }
    };
    
    const response = await admin.messaging().send({
      token: deviceToken,
      ...payload
    });
    
    res.json({
      success: true,
      message: 'Notification sent successfully',
      messageId: response
    });
    
  } catch (error) {
    console.error('Device notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get notification history (with caching)
app.get('/api/notifications', async (req, res) => {
  try {
    let limit = Math.min(parseInt(req.query.limit) || 50, 100); // Cap at 100
    const { course } = req.query;
    const cacheKey = course ? `notifications:course:${course}:${limit}` : `notifications:recent:${limit}`;
    
    // Check cache first
    const cached = cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    let query = db.collection('notifications')
      .select('courseCode', 'title', 'body', 'urgency', 'recipientCount', 'sentAt', 'summary')
      .orderBy('sentAt', 'desc')
      .limit(limit);
    
    if (course) {
      query = query.where('courseCode', '==', course);
    }
    
    const snapshot = await query.get();
    
    const notifications = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        courseCode: data.courseCode,
        title: data.title,
        body: data.body,
        urgency: data.urgency,
        recipientCount: data.recipientCount,
        sentAt: data.sentAt?.toDate(),
        summary: data.summary
      });
    });
    
    const response = {
      success: true,
      count: notifications.length,
      notifications
    };
    
    cacheSet(cacheKey, response);
    res.json(response);
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get notification stats
app.get('/api/notifications/stats', async (req, res) => {
  try {
    const totalSnapshot = await db.collection('notifications').count().get();
    const totalCount = totalSnapshot.data().count;
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentSnapshot = await db.collection('notifications')
      .where('sentAt', '>', oneDayAgo)
      .count()
      .get();
    
    const recentCount = recentSnapshot.data().count;
    
    const coursesSnapshot = await db.collection('notifications')
      .select('courseCode')
      .get();
    
    const courses = new Set();
    coursesSnapshot.forEach(doc => {
      if (doc.data().courseCode) {
        courses.add(doc.data().courseCode);
      }
    });
    
    res.json({
      success: true,
      stats: {
        totalNotifications: totalCount,
        last24Hours: recentCount,
        uniqueCourses: courses.size
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Keep-alive mechanism to prevent Render free tier from sleeping
const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 minutes
let keepAliveTimer = null;

function startKeepAlive() {
  if (process.env.NODE_ENV === 'production' && process.env.BACKEND_URL) {
    keepAliveTimer = setInterval(async () => {
      try {
        const response = await require('axios').get(
          `${process.env.BACKEND_URL}/health`,
          { timeout: 5000 }
        );
        console.log('⏰ Keep-alive ping:', response.data.status);
      } catch (error) {
        console.error('❌ Keep-alive failed:', error.message);
      }
    }, KEEP_ALIVE_INTERVAL);
    console.log('⏰ Keep-alive enabled (pings every 14 minutes)');
  }
}

// Force garbage collection every 10 minutes if available
if (global.gc) {
  setInterval(() => {
    const before = process.memoryUsage().heapUsed;
    global.gc();
    const after = process.memoryUsage().heapUsed;
    const released = Math.round((before - after) / 1024 / 1024);
    if (released > 0) {
      console.log(`♻️ GC: Released ${released}MB`);
    }
  }, 10 * 60 * 1000);
}

// ===== NEW MODULE ROUTES =====
// Import new route modules
const fcmRoutes = require('./src/routes/fcm');
const queueRoutes = require('./src/routes/queue');
const healthRoutes = require('./src/routes/health');

// Use new routes
app.use('/api/fcm', fcmRoutes);
app.use('/api/queue', queueRoutes);
app.use('/health/detailed', healthRoutes);

// Memory stats logger
setInterval(() => {
  const mem = process.memoryUsage();
  const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  console.log(
    `📊 Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB/${Math.round(mem.heapTotal / 1024 / 1024)}MB (${heapPercent}%) | ` +
    `Req: ${activeRequests}/${peakRequests} | Cache: ${memoryCache.size}`
  );
}, 60 * 1000);

// Start server
const server = app.listen(PORT, () => {
  console.log('🚀 MSOMI ALERT backend running on port', PORT);
  console.log('🔥 Firebase Admin SDK initialized');
  console.log('📍 Health: /health | Firebase: /firebase-test');
  console.log('📊 Metrics: /metrics | Notifications: /api/notifications');
  console.log(`⚙️ Memory limits: ${REQUEST_TIMEOUT}ms timeout, ${CONCURRENT_REQUESTS} concurrent`);
  
  startKeepAlive();
});

// Set connection timeouts
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = REQUEST_TIMEOUT;

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - starting graceful shutdown...');
  
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  
  // Stop accepting new connections
  server.close(() => {
    console.log('✅ Server closed');
    
    // Clear memory
    memoryCache.clear();
    invalidTokenQueue.length = 0;
    
    console.log('✅ Cleanup complete');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});
