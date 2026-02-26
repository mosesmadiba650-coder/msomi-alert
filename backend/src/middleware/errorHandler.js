const { logger } = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Centralized error handling middleware
 * Should be added AFTER all other routes and middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log all errors
  logger.error('Error Handler:', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Validation errors
  if (err.isJoi || err.joi) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: err.details || [err.message]
    });
  }

  // Firebase authentication errors
  if (err.code && err.code.includes('auth')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: err.message
    });
  }

  // Duplicate key error (MongoDB/Firestore)
  if (err.code === 'DUPLICATE_KEY' || err.message.includes('duplicate')) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate Entry',
      message: 'This record already exists'
    });
  }

  // Not found errors
  if (err.statusCode === 404) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: err.message
    });
  }

  // Programming or unknown errors: don't leak details
  console.error('💥 UNHANDLED ERROR:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      message: err.message,
      stack: err.stack 
    })
  });
};

/**
 * Wrapper for async route handlers to catch errors
 * Usage: router.get('/', asyncHandler(async (req, res, next) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { errorHandler, asyncHandler, AppError };
