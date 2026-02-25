const Sentry = require("@sentry/node");
const logger = require('../utils/logger');

class ErrorMonitoring {
  constructor() {
    this.initialized = false;
  }

  initialize(dsn) {
    if (!dsn) {
      logger.warn('Sentry DSN not provided - error monitoring disabled');
      return;
    }

    try {
      Sentry.init({
        dsn: dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 1.0,
        beforeSend(event) {
          // Filter out health checks
          if (event.request?.url?.includes('/health')) {
            return null;
          }
          return event;
        }
      });

      this.initialized = true;
      logger.info('Sentry error monitoring initialized');
    } catch (error) {
      logger.error('Failed to initialize Sentry', { error: error.message });
    }
  }

  captureException(error, context = {}) {
    logger.error('Exception captured', { 
      error: error.message, 
      context 
    });

    if (this.initialized) {
      Sentry.captureException(error, {
        tags: context.tags || {},
        extra: context.extra || {}
      });
    }
  }

  captureMessage(message, level = 'error') {
    logger.log(level, message);

    if (this.initialized) {
      Sentry.captureMessage(message, level);
    }
  }

  recordMetric(metricName, value, tags = {}) {
    logger.info(`Metric: ${metricName}`, { value, tags });
  }

  async alertCritical(message, context) {
    logger.error(`🚨 CRITICAL: ${message}`, context);

    if (this.initialized) {
      Sentry.captureMessage(message, 'fatal', {
        tags: { severity: 'critical', ...context.tags },
        extra: context.extra
      });
    }

    // TODO: Send SMS/Email/Slack alert
    // await this.sendSlackAlert(message, context);
  }

  getRequestHandler() {
    return this.initialized ? Sentry.Handlers.requestHandler() : (req, res, next) => next();
  }

  getErrorHandler() {
    return this.initialized ? Sentry.Handlers.errorHandler() : (err, req, res, next) => next(err);
  }
}

module.exports = new ErrorMonitoring();
