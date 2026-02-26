// services/api.service.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import ENV from '../config/env';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: ENV.API_URL,
      timeout: ENV.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('@auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        if (ENV.ENABLE_LOGS) {
          console.log('📤 API Request:', config.method.toUpperCase(), config.url);
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        if (ENV.ENABLE_LOGS) {
          console.log('📥 API Response:', response.status, response.config.url);
        }
        return response.data;
      },
      async (error) => {
        if (ENV.ENABLE_LOGS) {
          console.error('❌ API Error:', error.message);
        }

        // Handle network errors
        if (error.message === 'Network Error') {
          const netInfo = await NetInfo.fetch();
          if (!netInfo.isConnected) {
            throw {
              offline: true,
              message: 'No internet connection. Request will be queued.'
            };
          }
        }

        // Normalize error
        throw this.normalizeError(error);
      }
    );
  }

  normalizeError(error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.data?.error || 'Server error',
        details: error.response.data?.details,
        validation: error.response.data?.validation
      };
    } else if (error.request) {
      return {
        status: 503,
        message: 'Network error - please check connection',
        offline: true
      };
    } else {
      return {
        status: 500,
        message: error.message || 'Unknown error'
      };
    }
  }

  // Device Management
  async registerDevice(data) {
    return this.api.post('/api/devices/register', data);
  }

  async getDevices() {
    return this.api.get('/api/devices');
  }

  // Notifications
  async getNotifications(params = {}) {
    return this.api.get('/api/notifications/history', { params });
  }

  async sendNotification(data) {
    return this.api.post('/api/notifications/course', data);
  }

  // Health Check
  async healthCheck() {
    return this.api.get('/health');
  }
}

export default new ApiService();
