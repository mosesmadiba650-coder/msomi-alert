#!/usr/bin/env node

/**
 * Verification Script for Debugging Implementation
 * Run: node verify-implementation.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, type = 'info') {
  const prefix = {
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    info: `${colors.cyan}ℹ${colors.reset}`
  };
  
  console.log(`${prefix[type]} ${message}`);
}

function checkFile(filePath, fileName) {
  if (fs.existsSync(filePath)) {
    log(`${fileName} exists`, 'success');
    return true;
  } else {
    log(`${fileName} missing at ${filePath}`, 'error');
    return false;
  }
}

function checkDependency(packageName, version = '') {
  try {
    require.resolve(packageName);
    log(`${packageName} installed`, 'success');
    return true;
  } catch (e) {
    log(`${packageName} not installed`, 'error');
    return false;
  }
}

console.log(
  `\n${colors.bold}${colors.cyan}🔍 MSOMI ALERT Backend Verification${colors.reset}\n`
);

let allGood = true;

// ===== FILE CHECKS =====
console.log(`${colors.bold}📁 File Structure Checks:${colors.reset}`);

const files = [
  ['src/utils/AppError.js', 'AppError.js'],
  ['src/utils/cache.js', 'Cache.js'],
  ['src/middleware/validateRequest.js', 'Validate Middleware'],
  ['src/middleware/errorHandler.js', 'Error Handler'],
  ['src/validators/schemas.js', 'Validation Schemas'],
  ['src/config/redis.js', 'Redis Config'],
  ['src/config/swagger.js', 'Swagger Config'],
  ['src/config/queue.js', 'Bull Queue Config'],
  ['src/routes/health.js', 'Health Routes'],
  ['src/routes/queue.js', 'Queue Routes'],
  ['src/controllers/healthController.js', 'Health Controller'],
  ['src/controllers/queueController.js', 'Queue Controller'],
  ['.env.example', '.env.example Template'],
  ['DEBUGGING_IMPLEMENTATION.md', 'Implementation Guide']
];

files.forEach(([filePath, name]) => {
  if (!checkFile(filePath, name)) {
    allGood = false;
  }
});

// ===== DEPENDENCY CHECKS =====
console.log(`\n${colors.bold}📦 Dependency Checks:${colors.reset}`);

const dependencies = [
  'joi',
  'express-validator',
  'redis',
  'bull',
  'swagger-ui-express',
  'swagger-jsdoc',
  'express-status-monitor',
  'express',
  'firebase-admin',
  'winston',
  'cors',
  'helmet',
  'compression'
];

dependencies.forEach(dep => {
  if (!checkDependency(dep)) {
    allGood = false;
  }
});

// ===== CONFIGURATION CHECKS =====
console.log(`\n${colors.bold}⚙️  Configuration Checks:${colors.reset}`);

if (fs.existsSync('.env')) {
  log('.env file exists', 'success');
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'FIREBASE_PROJECT_ID',
    'TELEGRAM_BOT_TOKEN'
  ];
  
  requiredVars.forEach(variable => {
    if (envContent.includes(variable)) {
      log(`${variable} in .env`, 'success');
    } else {
      log(`${variable} missing from .env`, 'warning');
    }
  });
} else {
  log('.env file not found (create from .env.example)', 'warning');
}

// ===== PACKAGE.JSON CHECKS =====
console.log(`\n${colors.bold}📋 package.json Checks:${colors.reset}`);

const packageJson = JSON.parse(
  fs.readFileSync('package.json', 'utf8')
);

const requiredDeps = [
  'joi',
  'redis',
  'bull',
  'swagger-ui-express',
  'swagger-jsdoc'
];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    log(`${dep} in package.json`, 'success');
  } else {
    log(`${dep} NOT in package.json`, 'error');
    allGood = false;
  }
});

// ===== SUMMARY =====
console.log(`\n${colors.bold}${'='.repeat(50)}${colors.reset}`);

if (allGood) {
  console.log(
    `\n${colors.green}${colors.bold}✓ All checks passed!${colors.reset}\n`
  );
  console.log('Next steps:');
  console.log('1. npm install (if not done)');
  console.log('2. cp .env.example .env');
  console.log('3. Update .env with your configuration');
  console.log('4. Start Redis: docker run -d -p 6379:6379 redis:latest');
  console.log('5. npm run dev');
  console.log('6. Visit http://localhost:5000/api/docs\n');
} else {
  console.log(
    `\n${colors.red}${colors.bold}✗ Some checks failed!${colors.reset}\n`
  );
  console.log('Please review the errors above and run:');
  console.log('npm install\n');
}

console.log(`${colors.bold}${'='.repeat(50)}${colors.reset}\n`);

process.exit(allGood ? 0 : 1);
