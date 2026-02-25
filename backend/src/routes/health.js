const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// Health check endpoints
router.get('/detailed', healthController.detailedHealth);
router.get('/metrics', healthController.getMetrics);

module.exports = router;
