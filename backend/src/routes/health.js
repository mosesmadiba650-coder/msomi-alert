const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Get detailed system health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health status
 */
router.get('/detailed', healthController.detailedHealth);

/**
 * @swagger
 * /api/health/metrics:
 *   get:
 *     summary: Get system performance metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Performance metrics
 */
router.get('/metrics', healthController.getMetrics);

/**
 * @swagger
 * /api/health/status:
 *   get:
 *     summary: Quick status check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Operational status
 */
router.get('/status', healthController.getStatus);

module.exports = router;
