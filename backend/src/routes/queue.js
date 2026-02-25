const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

// Message Queue Management
router.get('/status', queueController.getStatus);
router.post('/enqueue', queueController.enqueueMessage);
router.post('/retry', queueController.retryFailed);
router.get('/messages', queueController.getMes$);

module.exports = router;
