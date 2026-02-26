const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { logger } = require('../utils/logger');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { validate, validateQuery } = require('../middleware/validateRequest');
const { sendNotificationSchema, paginationSchema } = require('../validators/schemas');
const cache = require('../utils/cache');

/**
 * @swagger
 * /api/notifications/course:
 *   post:
 *     summary: Send notification to all students in a course
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Notification'
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 recipientCount: { type: integer }
 *                 successCount: { type: integer }
 *                 failureCount: { type: integer }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: No devices found for course
 */
router.post('/course', validate(sendNotificationSchema), asyncHandler(async (req, res) => {
  const { courseCode, title, body, urgency = 'normal', data } = req.body;

  try {
    logger.info(`Sending notification for course: ${courseCode}`, {
      urgency,
      titleLength: title.length
    });

    // Get devices for this course
    const devicesSnapshot = await admin
      .firestore()
      .collection('devices')
      .where('courses', 'array-contains', courseCode)
      .where('active', '==', true)
      .get();

    if (devicesSnapshot.empty) {
      throw new AppError(
        `No active devices found for course ${courseCode}`,
        404
      );
    }

    const tokens = [];
    devicesSnapshot.forEach(doc => {
      const tokens_list = doc.data().fcmTokens || [];
      tokens_list.forEach(tokenObj => {
        if (tokenObj.isActive) {
          tokens.push(tokenObj.token);
        }
      });
      
      // Fallback to old deviceToken format
      if (!tokens_list || tokens_list.length === 0) {
        tokens.push(doc.data().deviceToken);
      }
    });

    if (tokens.length === 0) {
      throw new AppError(
        `No valid FCM tokens found for course ${courseCode}`,
        404
      );
    }

    // Prepare FCM message
    const message = {
      notification: {
        title: title,
        body: body.substring(0, 100) // FCM has limits
      },
      data: {
        courseCode,
        urgency,
        timestamp: new Date().toISOString(),
        ...data
      },
      android: {
        priority: urgency === 'urgent' ? 'high' : 'normal',
        notification: {
          sound: 'default',
          priority: urgency === 'urgent' ? 'high' : 'default'
        }
      },
      apns: {
        headers: {
          'apns-priority': urgency === 'urgent' ? '10' : '10'
        },
        payload: {
          aps: {
            sound: 'default'
          }
        }
      }
    };

    // Send notifications in batches
    const batchSize = 500;
    let successCount = 0;
    let failureCount = 0;
    const failedTokens = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: batch,
          ...message
        });

        successCount += response.successCount;
        failureCount += response.failureCount;

        // Track failed tokens
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push({
              token: batch[idx].substring(0, 20),
              error: resp.error?.message
            });
          }
        });

        logger.info(`Batch sent: ${response.successCount}/${batch.length} successful`);
      } catch (error) {
        logger.error('Batch sending failed:', error);
        failureCount += batch.length;
      }
    }

    // Log notification
    await admin.firestore().collection('notifications').add({
      courseCode,
      title,
      body,
      urgency,
      recipientCount: tokens.length,
      successCount,
      failureCount,
      failedTokens: failedTokens.slice(0, 10), // Keep first 10 for debugging
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Clear cache for this course
    await cache.delete(`course:${courseCode}`);

    logger.info(`✅ Notification complete for ${courseCode}`, {
      total: tokens.length,
      success: successCount,
      failed: failureCount
    });

    res.json({
      success: true,
      message: `Sent to ${successCount} devices`,
      recipientCount: tokens.length,
      successCount,
      failureCount
    });

  } catch (error) {
    if (error.isOperational) throw error;
    logger.error('Send notification failed:', error);
    throw new AppError('Failed to send notification', 500);
  }
}));

/**
 * @swagger
 * /api/notifications/history:
 *   get:
 *     summary: Get notification history
 *     tags: [Notifications]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/history', validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;

  try {
    // Check cache
    const cacheKey = `notifications:history:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const snapshot = await admin
      .firestore()
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

    const response = {
      success: true,
      count: notifications.length,
      notifications
    };

    // Cache for 10 minutes
    await cache.set(cacheKey, response, 600);

    res.json(response);
  } catch (error) {
    logger.error('Failed to fetch notification history:', error);
    throw new AppError('Failed to fetch notification history', 500);
  }
}));

module.exports = router;

module.exports = router;
