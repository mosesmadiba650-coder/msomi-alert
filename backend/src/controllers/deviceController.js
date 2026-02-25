const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

// Register device
router.post('/register', async (req, res, next) => {
  try {
    const { deviceToken, phoneNumber, courses, studentName } = req.body;
    
    if (!deviceToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'deviceToken is required' 
      });
    }

    const deviceRef = admin.firestore().collection('devices').doc(deviceToken);
    const deviceDoc = await deviceRef.get();

    if (deviceDoc.exists) {
      await deviceRef.update({
        phoneNumber: phoneNumber || deviceDoc.data().phoneNumber,
        courses: courses || deviceDoc.data().courses,
        studentName: studentName || deviceDoc.data().studentName,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      logger.info(`Device updated: ${deviceToken.substring(0, 10)}...`);
      
      return res.json({ 
        success: true, 
        message: 'Device updated',
        deviceId: deviceToken
      });
    }

    await deviceRef.set({
      deviceToken,
      phoneNumber: phoneNumber || null,
      courses: courses || [],
      studentName: studentName || null,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      active: true
    });

    logger.info(`Device registered: ${deviceToken.substring(0, 10)}...`);

    res.status(201).json({ 
      success: true, 
      message: 'Device registered',
      deviceId: deviceToken
    });

  } catch (error) {
    next(error);
  }
});

// Get all devices
router.get('/', async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    
    const snapshot = await admin.firestore()
      .collection('devices')
      .where('active', '==', true)
      .limit(parseInt(limit))
      .get();

    const devices = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      devices.push({
        id: doc.id,
        studentName: data.studentName,
        courses: data.courses,
        registeredAt: data.registeredAt?.toDate()
      });
    });

    res.json({ success: true, count: devices.length, devices });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
