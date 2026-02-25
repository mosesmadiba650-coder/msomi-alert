#!/usr/bin/env node
/**
 * MSOMI ALERT - Deployment Verification Script
 * Tests backend health, Firebase connection, and Telegram bot
 */

const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'https://msomi-alert.onrender.com';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 60000 });
    if (response.data.status === 'OK') {
      console.log(`${colors.green}✅ Health check passed${colors.reset}`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Health check failed: ${error.message}${colors.reset}`);
    if (error.code === 'ECONNABORTED') {
      console.log(`${colors.yellow}⚠️  Backend is sleeping (Render free tier). Wait 60 seconds and try again.${colors.reset}`);
    }
    return false;
  }
}

async function testFirebase() {
  console.log('\n🔥 Testing Firebase Connection...');
  try {
    const response = await axios.get(`${BACKEND_URL}/firebase-test`, { timeout: 30000 });
    if (response.data.success) {
      console.log(`${colors.green}✅ Firebase connected${colors.reset}`);
      console.log(`   Document ID: ${response.data.documentId}`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Firebase test failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testDeviceRegistration() {
  console.log('\n📱 Testing Device Registration...');
  try {
    const testDevice = {
      deviceToken: 'test-token-' + Date.now(),
      phoneNumber: '+254712345678',
      studentName: 'Test Student',
      courses: ['CSC201', 'BIT401']
    };
    
    const response = await axios.post(`${BACKEND_URL}/api/register-device`, testDevice, { timeout: 30000 });
    if (response.data.success) {
      console.log(`${colors.green}✅ Device registration working${colors.reset}`);
      console.log(`   Device ID: ${response.data.deviceId}`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Device registration failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testTelegramBot() {
  console.log('\n🤖 Testing Telegram Bot...');
  console.log(`${colors.yellow}⚠️  Manual test required:${colors.reset}`);
  console.log('   1. Open Telegram and search for @msomi_alert_bot');
  console.log('   2. Send /start command');
  console.log('   3. Forward a test message with course code (e.g., "CSC201 exam tomorrow")');
  console.log('   4. Verify bot responds with message analysis');
  return null;
}

async function runAllTests() {
  console.log('🚀 MSOMI ALERT - Deployment Verification');
  console.log('========================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  
  const results = {
    health: await testHealthCheck(),
    firebase: false,
    registration: false,
    telegram: null
  };
  
  if (results.health) {
    results.firebase = await testFirebase();
    results.registration = await testDeviceRegistration();
  }
  
  results.telegram = await testTelegramBot();
  
  console.log('\n========================================');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('========================================');
  console.log(`Health Check:        ${results.health ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}${colors.reset}`);
  console.log(`Firebase:            ${results.firebase ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}${colors.reset}`);
  console.log(`Device Registration: ${results.registration ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}${colors.reset}`);
  console.log(`Telegram Bot:        ${colors.yellow}⚠️  MANUAL TEST REQUIRED${colors.reset}`);
  
  const allPassed = results.health && results.firebase && results.registration;
  
  if (allPassed) {
    console.log(`\n${colors.green}🎉 All automated tests passed! Backend is ready.${colors.reset}`);
    console.log(`\n${colors.yellow}Next steps:${colors.reset}`);
    console.log('1. Test Telegram bot manually (see instructions above)');
    console.log('2. Test mobile app registration');
    console.log('3. Send test notification from Telegram bot');
  } else {
    console.log(`\n${colors.red}❌ Some tests failed. Check logs above for details.${colors.reset}`);
  }
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests();
