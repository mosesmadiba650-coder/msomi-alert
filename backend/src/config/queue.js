const Queue = require('bull');
const admin = require('firebase-admin');
const { logger } = require('../utils/logger');

/**
 * Initialize Notification Queue
 * Used for sending push notifications in background
 */
const notificationQueue = new Queue('notifications', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    url: process.env.REDIS_URL
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  },
  settings: {
    maxStalledCount: 2,
    lockRenewTime: 30000
  }
});

/**
 * Process notification jobs
 */
notificationQueue.process(async (job) => {
  const {
    type,
    tokens,
    message,
    courseCode,
    urgency
  } = job.data;

  logger.info(`Processing notification job: ${job.id}`, {
    type,
    tokenCount: tokens?.length || 0
  });

  try {
    switch (type) {
      case 'push':
        return await sendPushNotification(tokens, message, courseCode, urgency);

      case 'telegram':
        return await sendTelegramNotification(job.data);

      case 'batch':
        return await processBatch(tokens, message);

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  } catch (error) {
    logger.error(`Job ${job.id} failed:`, error);
    throw error;
  }
});

/**
 * Send push notifications
 */
async function sendPushNotification(tokens, message, courseCode, urgency) {
  logger.info('Sending push notifications', {
    tokenCount: tokens.length,
    courseCode,
    urgency
  });

  const firebaseMessage = {
    notification: message.notification || {},
    data: {
      courseCode,
      urgency,
      timestamp: new Date().toISOString(),
      ...message.data
    },
    android: {
      priority: urgency === 'urgent' ? 'high' : 'normal',
      notification: {
        sound: 'default'
      }
    }
  };

  const successfulTokens = [];
  const failedTokens = [];

  // Send in batches of 500
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);

    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: batch,
        ...firebaseMessage
      });

      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          successfulTokens.push(batch[idx]);
        } else {
          failedTokens.push({
            token: batch[idx].substring(0, 20),
            error: resp.error?.message
          });
        }
      });
    } catch (error) {
      logger.error('Batch failed:', error);
      failedTokens.push(...batch.map(t => ({ token: t.substring(0, 20), error: error.message })));
    }
  }

  logger.info('Push notification complete', {
    total: tokens.length,
    successful: successfulTokens.length,
    failed: failedTokens.length
  });

  return {
    type: 'push',
    successful: successfulTokens.length,
    failed: failedTokens.length,
    failedTokens: failedTokens.slice(0, 10)
  };
}

/**
 * Send Telegram notifications
 */
async function sendTelegramNotification(data) {
  logger.info('Sending Telegram notification', { chatId: data.chatId });

  try {
    // Use Telegram Bot API to send message
    const bot = require('../telegramBot');
    await bot.sendMessage(data.chatId, data.message, data.options);

    return {
      type: 'telegram',
      success: true,
      chatId: data.chatId
    };
  } catch (error) {
    logger.error('Telegram notification failed:', error);
    throw error;
  }
}

/**
 * Process batch operations
 */
async function processBatch(tokens, message) {
  logger.info('Processing batch operation', { count: tokens.length });

  // Process tokens in chunks
  for (const token of tokens) {
    try {
      await admin.messaging().send({
        token,
        ...message
      });
    } catch (error) {
      logger.warn(`Failed to send to token ${token.substring(0, 20)}:`, error.message);
    }
  }

  return { type: 'batch', count: tokens.length };
}

/**
 * Event handlers
 */
notificationQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`, { result: job.returnvalue });
});

notificationQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed permanently:`, {
    error: err.message,
    attempts: job.attemptsMade
  });
});

notificationQueue.on('error', (error) => {
  logger.error('Queue error:', error);
});

notificationQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

/**
 * Queue methods
 */
const queueMethods = {
  /**
   * Add notification job to queue
   */
  async addNotificationJob(data) {
    try {
      const job = await notificationQueue.add(data, {
        ...notificationQueue.opts.defaultJobOptions
      });

      logger.info(`Job added to queue: ${job.id}`, { type: data.type });
      return job;
    } catch (error) {
      logger.error('Failed to add job to queue:', error);
      throw error;
    }
  },

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    try {
      const job = await notificationQueue.getJob(jobId);
      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      const progress = job.progress();

      return {
        id: job.id,
        state,
        progress,
        attempts: job.attemptsMade,
        data: job.data
      };
    } catch (error) {
      logger.error('Failed to get job status:', error);
      return null;
    }
  },

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      const counts = await notificationQueue.getJobCounts();
      return {
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed,
        waiting: counts.waiting,
        paused: counts.paused
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      return null;
    }
  },

  /**
   * Clear queue
   */
  async clearQueue() {
    try {
      await notificationQueue.clean(0, 'completed');
      await notificationQueue.clean(0, 'failed');
      logger.info('Queue cleared');
    } catch (error) {
      logger.error('Failed to clear queue:', error);
    }
  }
};

module.exports = { notificationQueue, ...queueMethods };
