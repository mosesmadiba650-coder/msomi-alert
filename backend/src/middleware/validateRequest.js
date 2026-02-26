const Joi = require('joi');
const { logger } = require('../utils/logger');

/**
 * Generic validation middleware factory
 * Usage: router.post('/route', validate(schema), controller.method)
 */
const validate = (schema) => (req, res, next) => {
  // Validation options
  const options = {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  };

  // Validate request body
  const { error, value } = schema.validate(req.body, options);

  if (error) {
    logger.warn('Validation Error:', {
      path: req.path,
      method: req.method,
      errors: error.details
    });

    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: detail.type
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation Failed',
      details
    });
  }

  // Replace req.body with validated data
  req.body = value;
  next();
};

/**
 * Validate query parameters
 */
const validateQuery = (schema) => (req, res, next) => {
  const options = {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  };

  const { error, value } = schema.validate(req.query, options);

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Invalid Query Parameters',
      details
    });
  }

  req.query = value;
  next();
};

/**
 * Validate request params
 */
const validateParams = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.params);

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Parameters',
      details: error.details
    });
  }

  req.params = value;
  next();
};

module.exports = {
  validate,
  validateQuery,
  validateParams
};
