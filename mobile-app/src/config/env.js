// config/env.js
const ENV = {
  development: {
    API_URL: 'http://localhost:5000',
    TIMEOUT: 30000,
    ENABLE_LOGS: true
  },
  production: {
    API_URL: 'https://msomi-alert.vercel.app',
    TIMEOUT: 10000,
    ENABLE_LOGS: false
  }
};

// Detect environment
const isDevelopment = __DEV__;
const currentEnv = isDevelopment ? 'development' : 'production';

export default {
  ...ENV[currentEnv],
  isDevelopment
};
