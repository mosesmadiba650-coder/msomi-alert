// Production environment configuration management
const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    PORT: 5000,
    LOG_LEVEL: 'debug',
    CACHE_TTL: 60000,
    REQUEST_TIMEOUT: 30000,
    MAX_CONCURRENT: 100,
    BATCH_SIZE: 500,
    CLEANUP_INTERVAL: 5000,
    FCM_BATCH_SIZE: 500
  },
  staging: {
    PORT: process.env.PORT || 5000,
    LOG_LEVEL: 'info',
    CACHE_TTL: 120000,
    REQUEST_TIMEOUT: 45000,
    MAX_CONCURRENT: 500,
    BATCH_SIZE: 1000,
    CLEANUP_INTERVAL: 10000,
    FCM_BATCH_SIZE: 1000
  },
  production: {
    PORT: process.env.PORT || 5000,
    LOG_LEVEL: 'warn',
    CACHE_TTL: 300000, // 5 minutes
    REQUEST_TIMEOUT: 60000,
    MAX_CONCURRENT: 1000,
    BATCH_SIZE: 2000,
    CLEANUP_INTERVAL: 30000,
    FCM_BATCH_SIZE: 2000
  }
};

module.exports = config[env] || config.development;
