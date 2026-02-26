/**
 * AppError - Custom error class for operational errors
 * Helps distinguish between operational errors and programming errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Maintain proper stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
