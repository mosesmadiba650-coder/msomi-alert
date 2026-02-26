const Joi = require('joi');

/**
 * Device Registration Schema
 */
const registerDeviceSchema = Joi.object({
  deviceToken: Joi.string()
    .alphanum()
    .min(20)
    .max(300)
    .required()
    .messages({
      'string.empty': 'Device token is required',
      'string.alphanum': 'Device token must contain alphanumeric characters',
      'string.min': 'Device token is invalid'
    }),
  
  phoneNumber: Joi.string()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid phone number format'
    }),
  
  studentName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .pattern(/^[a-zA-Z\s'-]+$/)
    .messages({
      'string.pattern.base': 'Student name contains invalid characters'
    }),
  
  courses: Joi.array()
    .items(
      Joi.string()
        .trim()
        .uppercase()
        .pattern(/^[A-Z]{2,4}\d{3,4}[A-Z]?$/)
        .messages({
          'string.pattern.base': 'Invalid course code format'
        })
    )
    .optional()
    .messages({
      'array.base': 'Courses must be an array'
    })
});

/**
 * Send Notification Schema
 */
const sendNotificationSchema = Joi.object({
  courseCode: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{2,4}\d{3,4}[A-Z]?$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid course code format (e.g., CSC201)',
      'string.empty': 'Course code is required'
    }),
  
  title: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title cannot exceed 100 characters'
    }),
  
  body: Joi.string()
    .trim()
    .min(5)
    .max(1000)
    .required()
    .messages({
      'string.empty': 'Message body is required',
      'string.min': 'Message must be at least 5 characters',
      'string.max': 'Message cannot exceed 1000 characters'
    }),
  
  urgency: Joi.string()
    .lowercase()
    .valid('normal', 'urgent')
    .optional()
    .default('normal')
    .messages({
      'any.only': 'Urgency must be either "normal" or "urgent"'
    }),
  
  data: Joi.object()
    .optional()
});

/**
 * FCM Token Schema
 */
const fcmTokenSchema = Joi.object({
  deviceId: Joi.string()
    .alphanum()
    .min(5)
    .max(300)
    .required()
    .messages({
      'string.empty': 'Device ID is required'
    }),
  
  token: Joi.string()
    .min(50)
    .max(500)
    .required()
    .messages({
      'string.empty': 'FCM token is required',
      'string.min': 'Invalid FCM token'
    }),
  
  metadata: Joi.object()
    .optional()
    .keys({
      platform: Joi.string().valid('android', 'ios', 'web').optional(),
      osVersion: Joi.string().optional(),
      appVersion: Joi.string().optional()
    })
});

/**
 * Message Queue Schema
 */
const enqueueMessageSchema = Joi.object({
  message: Joi.object()
    .required()
    .keys({
      title: Joi.string().max(100).required(),
      body: Joi.string().max(1000).required(),
      recipients: Joi.array().items(Joi.string()).optional()
    })
});

/**
 * Retry Message Schema
 */
const retryMessageSchema = Joi.object({
  messageId: Joi.string()
    .required()
    .messages({
      'string.empty': 'Message ID is required'
    })
});

/**
 * Query Schemas
 */
const paginationSchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .optional()
    .default(50),
  
  offset: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0)
});

module.exports = {
  registerDeviceSchema,
  sendNotificationSchema,
  fcmTokenSchema,
  enqueueMessageSchema,
  retryMessageSchema,
  paginationSchema
};
