const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const admin = require('firebase-admin');
const db = admin.firestore();
const {
  notificationQueue,
  getJobStatus,
  getQueueStats,
  addNotificationJob,
  clearQueue
} = require('../config/queue');

/**
 * @swagger
 * /api/queue/status:
 *   get:
 *     summary: Get queue status and statistics
 *     tags: [Queue]
 *     responses:
 *       200:
 *         description: Queue statistics
 */
exports.getStatus = asyncHandler(async (req, res) => {
  try {
    const stats = await getQueueStats();

    if (!stats) {
      return res.json({
        success: false,
        message: 'Queue not available'
      });
    }

    // Get recent jobs from Firestore
    const recentJobs = await db
      .collection('queue_jobs')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const jobs = [];
    recentJobs.forEach(doc => {
      jobs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    logger.info('Queue status retrieved', stats);

    res.json({
      success: true,
      stats,
      recentJobs: jobs
    });
  } catch (error) {
    logger.error('Queue status failed:', error);
    throw new AppError('Failed to get queue status', 500);
  }
});

/**
 * @swagger
 * /api/queue/enqueue:
 *   post:
 *     summary: Add a notification to the queue
 *     tags: [Queue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [push, telegram, batch]
 *               tokens:
 *                 type: array
 *                 items:
 *                   type: string
 *               message:
 *                 type: object
 *     responses:
 *       200:
 *         description: Job queued successfully
 */
exports.enqueueMessage = asyncHandler(async (req, res) => {
  try {
    const { type, tokens, message, courseCode, urgency } = req.body;

    if (!type || !tokens || !message) {
      throw new AppError('Missing required fields: type, tokens, message', 400);
    }

    if (!Array.isArray(tokens) || tokens.length === 0) {
      throw new AppError('Tokens must be a non-empty array', 400);
    }

    // Add job to Bull queue
    const job = await addNotificationJob({
      type,
      tokens,
      message,
      courseCode,
      urgency
    });

    // Store job reference in Firestore
    await db.collection('queue_jobs').doc(job.id).set({
      jobId: job.id,
      type,
      courseCode,
      tokenCount: tokens.length,
      status: 'queued',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info('Message queued successfully', {
      jobId: job.id,
      type,
      tokenCount: tokens.length
    });

    res.json({
      success: true,
      jobId: job.id,
      message: 'Message queued for processing'
    });
  } catch (error) {
    if (error.isOperational) throw error;
    logger.error('Enqueue failed:', error);
    throw new AppError('Failed to queue message', 500);
  }
});

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
 *     responses:
 *       200:
 *         description: Job status
 */
exports.getJobStatus = asyncHandler(async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      throw new AppError('Job ID is required', 400);
    }

    const jobStatus = await getJobStatus(jobId);

    if (!jobStatus) {
      throw new AppError('Failed to retrieve job status', 500);
    }

    res.json({
      success: true,
      ...jobStatus
    });
  } catch (error) {
    if (error.isOperational) throw error;
    logger.error('Get job status failed:', error);
    throw new AppError('Failed to get job status', 500);
  }
});

/**
 * @swagger
 * /api/queue/retry:
 *   post:
 *     summary: Retry failed job
 *     tags: [Queue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job queued for retry
 */
exports.retryFailed = asyncHandler(async (req, res) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      throw new AppError('Job ID is required', 400);
    }

    const job = await notificationQueue.getJob(jobId);

    if (!job) {
      throw new AppError('Job not found', 404);
    }

    const state = await job.getState();

    if (state !== 'failed') {
      throw new AppError(
        `Cannot retry job in ${state} state`,
        400
      );
    }

    // Retry the job
    await job.retry();

    logger.info('Job queued for retry', { jobId });

    res.json({
      success: true,
      message: 'Job queued for retry'
    });
  } catch (error) {
    if (error.isOperational) throw error;
    logger.error('Retry failed:', error);
    throw new AppError('Failed to retry job', 500);
  }
});

/**
 * @swagger
 * /api/queue/messages:
 *   get:
 *     summary: Get recent messages in queue
 *     tags: [Queue]
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of recent messages
 */
exports.getMessages = asyncHandler(async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const messages = await db
      .collection('queue_jobs')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .get();

    const jobs = [];
    messages.forEach(doc => {
      jobs.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      });
    });

    res.json({
      success: true,
      count: jobs.length,
      messages: jobs
    });
  } catch (error) {
    logger.error('Get messages failed:', error);
    throw new AppError('Failed to get messages', 500);
  }
});

/**
 * @swagger
 * /api/queue/clear:
 *   post:
 *     summary: Clear completed jobs from queue
 *     tags: [Queue]
 *     responses:
 *       200:
 *         description: Queue cleared
 */
exports.clearQueue = asyncHandler(async (req, res) => {
  try {
    await clearQueue();

    res.json({
      success: true,
      message: 'Queue cleared'
    });
  } catch (error) {
    logger.error('Clear queue failed:', error);
    throw new AppError('Failed to clear queue', 500);
  }
});
