const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');

/**
 * @swagger
 * /api/queue/status:
 *   get:
 *     summary: Get queue status
 *     tags: [Queue]
 *     responses:
 *       200:
 *         description: Queue statistics
 */
router.get('/status', queueController.getStatus);

/**
 * @swagger
 * /api/queue/enqueue:
 *   post:
 *     summary: Add notification to queue
 *     tags: [Queue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 */
router.post('/enqueue', queueController.enqueueMessage);

/**
 * @swagger
 * /api/queue/job/{jobId}:
 *   get:
 *     summary: Get job status
 *     tags: [Queue]
 *     parameters:
 *       - name: jobId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/job/:jobId', queueController.getJobStatus);

/**
 * @swagger
 * /api/queue/retry:
 *   post:
 *     summary: Retry failed job
 *     tags: [Queue]
 */
router.post('/retry', queueController.retryFailed);

/**
 * @swagger
 * /api/queue/messages:
 *   get:
 *     summary: Get recent messages
 *     tags: [Queue]
 */
router.get('/messages', queueController.getMessages);

/**
 * @swagger
 * /api/queue/clear:
 *   post:
 *     summary: Clear queue
 *     tags: [Queue]
 */
router.post('/clear', queueController.clearQueue);

module.exports = router;
