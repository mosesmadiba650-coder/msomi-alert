const admin = require('firebase-admin');
const db = admin.firestore();
const logger = require('../utils/logger');

class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
    this.processInterval = 2000; // 2 seconds between batches
  }

  async enqueue(message) {
    const queueItem = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
      errors: []
    };

    this.queue.push(queueItem);
    
    // Persist to Firestore
    try {
      await db.collection('messageQueue').add({
        ...queueItem,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      logger.error('Failed to persist message to queue', { error: error.message });
    }

    logger.info('Message queued', { 
      queueId: queueItem.id, 
      queueSize: this.queue.length 
    });

    if (!this.processing) {
      this.processQueue();
    }

    return queueItem.id;
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];

      try {
        logger.info('Processing message', { queueId: item.id });
        await this.sendMessage(item.message);
        
        item.status = 'success';
        await this.updateStatus(item.id, 'success');
        
        this.queue.shift();
        logger.info('Message sent successfully', { queueId: item.id });
      } catch (error) {
        item.attempts++;
        item.errors.push(error.message);

        if (item.attempts >= this.maxRetries) {
          item.status = 'failed';
          await this.updateStatus(item.id, 'failed', error.message);
          this.queue.shift();
          
          logger.error('Message failed after retries', { 
            queueId: item.id, 
            attempts: item.attempts,
            error: error.message 
          });
        } else {
          logger.warn('Message send failed, retrying', { 
            queueId: item.id,
            attempt: item.attempts,
            error: error.message 
          });
        }
      }

      // Wait before next message
      await new Promise(resolve => setTimeout(resolve, this.processInterval));
    }

    this.processing = false;
  }

  async sendMessage(message) {
    // This will be called by Telegram bot or notification service
    return { success: true, messageId: Date.now() };
  }

  async updateStatus(messageId, status, error = null) {
    try {
      const doc = await db.collection('messageQueue')
        .where('id', '==', messageId)
        .limit(1)
        .get();

      if (!doc.empty) {
        await doc.docs[0].ref.update({
          status,
          error: error || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      logger.error('Failed to update message status', { error: error.message });
    }
  }

  getQueueStatus() {
    return {
      pending: this.queue.filter(m => m.status === 'pending').length,
      processing: this.processing,
      total: this.queue.length
    };
  }

  async getRecentMessages(limit = 50) {
    try {
      const snapshot = await db.collection('messageQueue')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const messages = [];
      snapshot.forEach(doc => {
        messages.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });

      return messages;
    } catch (error) {
      logger.error('Failed to get recent messages', { error: error.message });
      return [];
    }
  }
}

module.exports = new MessageQueue();
