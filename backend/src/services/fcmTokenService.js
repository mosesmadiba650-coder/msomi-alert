const admin = require('firebase-admin');
const db = admin.firestore();
const logger = require('../utils/logger');

class FCMTokenService {
  // Store new token with device metadata
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

      logger.info('FCM token stored', { 
        deviceId, 
        tokenPrefix: token.substring(0, 20) 
      });
      return { success: true, deviceId };
    } catch (error) {
      logger.error('FCM token storage failed', { 
        error: error.message, 
        deviceId 
      });
      throw error;
    }
  }

  // Refresh token periodically
  async refreshToken(deviceId, oldToken, newToken) {
    try {
      const deviceRef = db.collection('devices').doc(deviceId);
      
      // Remove old token
      await deviceRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove({
          token: oldToken,
          isActive: true
        }),
        lastTokenRefresh: admin.firestore.FieldValue.serverTimestamp()
      });

      // Add new token
      await this.storeToken(deviceId, newToken, { refreshed: true });
      
      logger.info('FCM token refreshed', { deviceId });
      return { success: true };
    } catch (error) {
      logger.error('FCM token refresh failed', { 
        error: error.message, 
        deviceId 
      });
      throw error;
    }
  }

  // Mark token as invalid (uninstalled/revoked)
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
      logger.error('Token invalidation failed', { 
        error: error.message 
      });
      throw error;
    }
  }

  // Get active tokens for device
  async getActiveTokens(deviceId) {
    try {
      const device = await db.collection('devices').doc(deviceId).get();
      if (!device.exists) return [];

      const data = device.data();
      if (!data.fcmTokens) return [];
      
      const tokens = data.fcmTokens || [];
      return tokens.filter(t => t.isActive).map(t => t.token);
    } catch (error) {
      logger.error('Failed to get active tokens', { 
        error: error.message, 
        deviceId 
      });
      return [];
    }
  }

  // Test token validity
  async testToken(token) {
    try {
      const response = await admin.messaging().send({
        token,
        notification: {
          title: 'MSOMI ALERT Test',
          body: 'If you see this, FCM is working!'
        },
        webpush: { ttl: 0 }
      });

      logger.info('Token test successful', { 
        tokenPrefix: token.substring(0, 20) 
      });
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
