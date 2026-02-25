const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

// Send notification to course
router.post('/course', async (req, res, next) => {
  try {
    const { courseCode, title, body, urgency = 'normal' } = req.body;
    
    if (!courseCode || !title || !body) {
      return res.status(400).json({ 
        success: false, 
        error: 'courseCode, title, and body are required' 
      });
    }

    // Get devices for this course
    const devicesSnapshot = await admin.firestore()
      .collection('devices')
      .where('courses', 'array-contains', courseCode)
      .where('active', '==', true)
      .get();

    if (devicesSnapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: `No devices found for course ${courseCode}` 
      });
    }

    const tokens = [];
    devicesSnapshot.forEach(doc => {
      tokens.push(doc.data().deviceToken);
    });

    // Send notifications
    const message = {
      notification: { title, body },
      data: { courseCode, urgency, timestamp: new Date().toISOString() },
      android: { priority: urgency === 'urgent' ? 'high' : 'normal' }
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      ...message
    });

    // Log notification
    await admin.firestore().collection('notifications').add({
      courseCode,
      title,
      body,
      urgency,
      recipientCount: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`Notification sent: ${response.successCount}/${tokens.length} successful`);

    res.json({
      success: true,
      message: `Sent to ${response.successCount} devices`,
      recipientCount: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount
    });

  } catch (error) {
    next(error);
  }
});

// Get notification history
router.get('/history', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const snapshot = await admin.firestore()
      .collection('notifications')
      .orderBy('sentAt', 'desc')
      .limit(parseInt(limit))
      .get();

    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate()
      });
    });

    res.json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
