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
app.use(express.json());

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

// Get all registered devices
app.get('/api/devices', async (req, res) => {
  try {
    const devicesSnapshot = await db.collection('devices')
      .orderBy('lastSeen', 'desc')
      .limit(100)
      .get();
    
    const devices = [];
    devicesSnapshot.forEach(doc => {
      devices.push({
        id: doc.id,
        ...doc.data(),
        deviceToken: doc.data().deviceToken.substring(0, 10) + '...'
      });
    });
    
    res.json({ 
      success: true, 
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

// Helper function to remove invalid tokens
async function removeInvalidToken(deviceToken) {
  try {
    const devicesSnapshot = await db.collection('devices')
      .where('deviceToken', '==', deviceToken)
      .get();
    
    if (!devicesSnapshot.empty) {
      const deviceDoc = devicesSnapshot.docs[0];
      await deviceDoc.ref.update({
        active: false,
        invalidToken: true,
        invalidatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Removed invalid token: ${deviceToken.substring(0, 15)}...`);
    }
  } catch (error) {
    console.error('Error removing invalid token:', error);
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
    
    const sendResults = [];
    const batchSize = 500;
    
    for (let i = 0; i < deviceTokens.length; i += batchSize) {
      const batch = deviceTokens.slice(i, i + batchSize);
      
      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: batch,
          ...payload
        });
        
        sendResults.push({
          batch: i / batchSize + 1,
          successCount: response.successCount,
          failureCount: response.failureCount,
          responses: response.responses.map((r, idx) => ({
            success: r.success,
            error: r.error ? r.error.message : null,
            token: batch[idx].substring(0, 15) + '...'
          }))
        });
        
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error && 
              (resp.error.code === 'messaging/invalid-registration-token' ||
               resp.error.code === 'messaging/registration-token-not-registered')) {
            const invalidToken = batch[idx];
            removeInvalidToken(invalidToken);
          }
        });
        
      } catch (batchError) {
        console.error('Batch send error:', batchError);
        sendResults.push({
          batch: i / batchSize + 1,
          error: batchError.message
        });
      }
    }
    
    const notificationLog = {
      courseCode,
      title,
      body,
      urgency,
      recipientCount: deviceTokens.length,
      sendResults: sendResults,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      dataPayload: data || null
    };
    
    await db.collection('notifications').add(notificationLog);
    
    res.json({
      success: true,
      message: `Notification sent to ${deviceTokens.length} devices`,
      course: courseCode,
      recipientCount: deviceTokens.length,
      batches: sendResults.length,
      details: sendResults
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

// Get notification history
app.get('/api/notifications', async (req, res) => {
  try {
    const { limit = 50, course } = req.query;
    
    let query = db.collection('notifications')
      .orderBy('sentAt', 'desc')
      .limit(parseInt(limit));
    
    if (course) {
      query = query.where('courseCode', '==', course);
    }
    
    const snapshot = await query.get();
    
    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate()
      });
    });
    
    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
    
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

// Start server
app.listen(PORT, () => {
  console.log('🚀 MSOMI ALERT backend running on port', PORT);
  console.log('🔥 Firebase Admin SDK initialized');
  console.log('📍 Test Firebase at: http://localhost:' + PORT + '/firebase-test');
});
