const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { logger } = require('../utils/logger');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { validate, validateQuery } = require('../middleware/validateRequest');
const { registerDeviceSchema, paginationSchema } = require('../validators/schemas');
const cache = require('../utils/cache');

/**
 * @swagger
 * /api/devices/register:
 *   post:
 *     summary: Register a new device for push notifications
 *     tags: [Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Device'
 *     responses:
 *       201:
 *         description: Device registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 deviceId: { type: string }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', validate(registerDeviceSchema), asyncHandler(async (req, res) => {
  const { deviceToken, phoneNumber, courses, studentName } = req.body;

  try {
    const deviceRef = admin.firestore().collection('devices').doc(deviceToken);
    const deviceDoc = await deviceRef.get();

    if (deviceDoc.exists) {
      // Update existing device
      await deviceRef.update({
        phoneNumber: phoneNumber || deviceDoc.data().phoneNumber,
        courses: courses || deviceDoc.data().courses,
        studentName: studentName || deviceDoc.data().studentName,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Clear cache
      await cache.delete(`device:${deviceToken}`);

      logger.info(`Device updated: ${deviceToken.substring(0, 10)}...`, {
        courses: courses?.length || 0
      });

      return res.json({
        success: true,
        message: 'Device updated',
        deviceId: deviceToken
      });
    }

    // Create new device
    await deviceRef.set({
      deviceToken,
      phoneNumber: phoneNumber || null,
      courses: courses || [],
      studentName: studentName || null,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      active: true
    });

    logger.info(`Device registered: ${deviceToken.substring(0, 10)}...`, {
      courses: courses?.length || 0
    });

    res.status(201).json({
      success: true,
      message: 'Device registered',
      deviceId: deviceToken
    });
  } catch (error) {
    logger.error('Device registration failed:', error);
    throw new AppError('Failed to register device', 500);
  }
}));

/**
 * @swagger
 * /api/devices:
 *   get:
 *     summary: Get all active devices
 *     tags: [Devices]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 1000
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 devices:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/', validateQuery(paginationSchema), asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;

  try {
    // Try to get from cache
    const cacheKey = `devices:list:${limit}:${offset}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Query from Firestore
    const snapshot = await admin
      .firestore()
      .collection('devices')
      .where('active', '==', true)
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const devices = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      devices.push({
        id: doc.id,
        studentName: data.studentName,
        courses: data.courses || [],
        registeredAt: data.registeredAt?.toDate(),
        lastSeen: data.lastSeen?.toDate()
      });
    });

    const response = {
      success: true,
      count: devices.length,
      devices,
      limit,
      offset
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, response, 300);

    res.json(response);
  } catch (error) {
    logger.error('Failed to fetch devices:', error);
    throw new AppError('Failed to fetch devices', 500);
  }
}));

/**
 * @swagger
 * /api/devices/{deviceId}:
 *   get:
 *     summary: Get a specific device by ID
 *     tags: [Devices]
 *     parameters:
 *       - name: deviceId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device details
 *       404:
 *         description: Device not found
 */
router.get('/:deviceId', asyncHandler(async (req, res) => {
  const { deviceId } = req.params;

  try {
    // Check cache
    const cacheKey = `device:${deviceId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, device: cached });
    }

    const doc = await admin
      .firestore()
      .collection('devices')
      .doc(deviceId)
      .get();

    if (!doc.exists) {
      throw new AppError('Device not found', 404);
    }

    const deviceData = {
      id: doc.id,
      ...doc.data()
    };

    // Cache for 10 minutes
    await cache.set(cacheKey, deviceData, 600);

    res.json({
      success: true,
      device: deviceData
    });
  } catch (error) {
    if (error.isOperational) throw error;
    logger.error('Failed to fetch device:', error);
    throw new AppError('Failed to fetch device', 500);
  }
}));

module.exports = router;
