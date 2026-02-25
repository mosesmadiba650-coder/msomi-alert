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
    logger.error('Token refresh failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.markInvalid = async (req, res) => {
  try {
    const { token, reason } = req.body;
    const result = await fcmTokenService.markTokenInvalid(token, reason);
    res.json(result);
  } catch (error) {
    logger.error('Mark invalid failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.testToken = async (req, res) => {
  try {
    const { token } = req.body;
    const result = await fcmTokenService.testToken(token);
    res.json(result);
  } catch (error) {
    logger.error('Token test failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getActiveTokens = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const tokens = await fcmTokenService.getActiveTokens(deviceId);
    res.json({ success: true, tokens, count: tokens.length });
  } catch (error) {
    logger.error('Get tokens failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};
