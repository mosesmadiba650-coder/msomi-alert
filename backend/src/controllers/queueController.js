const messageQueue = require('../services/messageQueueService');
const logger = require('../utils/logger');
const admin = require('firebase-admin');
const db = admin.firestore();

exports.getStatus = async (req, res) => {
  try {
    const status = messageQueue.getQueueStatus();
    const recentMessages = await messageQueue.getRecentMessages(20);
    
    const stats = {
      total: recentMessages.length,
      pending: recentMessages.filter(m => m.status === 'pending').length,
      success: recentMessages.filter(m => m.status === 'success').length,
      failed: recentMessages.filter(m => m.status === 'failed').length
    };

    res.json({ 
      success: true, 
      stats, 
      queueStatus: status,
      recentMessages 
    });
  } catch (error) {
    logger.error('Queue status failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.retryFailed = async (req, res) => {
  try {
    const { messageId } = req.body;
    
    const doc = await db.collection('messageQueue').doc(messageId).get();
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Message not found' 
      });
    }

    await doc.ref.update({
      status: 'pending',
      attempts: 0,
      errors: []
    });

    logger.info('Message queued for retry', { messageId });
    res.json({ success: true, message: 'Queued for retry' });
  } catch (error) {
    logger.error('Retry failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.enqueueMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }

    const queueId = messageQueue.enqueue(message);
    res.json({ 
      success: true, 
      queueId,
      message: 'Message queued for processing'
    });
  } catch (error) {
    logger.error('Enqueue failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMes$ = async (req, res) => {
  try {
    const messages = await messageQueue.getRecentMessages(100);
    res.json({ 
      success: true, 
      count: messages.length,
      messages 
    });
  } catch (error) {
    logger.error('Get messages failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};
