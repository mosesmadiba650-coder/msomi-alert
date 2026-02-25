const express = require('express');
const router = express.Router();
const fcmController = require('../controllers/fcmController');

// FCM Token Management
router.post('/register-token', fcmController.registerToken);
router.post('/refresh-token', fcmController.refreshToken);
router.post('/mark-invalid', fcmController.markInvalid);
router.post('/test-token', fcmController.testToken);
router.post('/get-active-tokens', fcmController.getActiveTokens);

module.exports = router;
