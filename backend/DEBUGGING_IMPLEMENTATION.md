# Backend Debugging & Improvements Implementation

## 🎯 Overview

This document outlines the critical fixes and improvements implemented to the MSOMI ALERT backend system.

---

## ✅ Completed Implementations

### 1. **Input Validation** ✓
**Files:** 
- `src/middleware/validateRequest.js` - Validation middleware
- `src/validators/schemas.js` - Joi validation schemas

**What was added:**
- Comprehensive input validation using Joi
- Automatic error handling for invalid requests
- Type coercion and data normalization
- Detailed error messages for debugging

**Example Usage:**
```javascript
const { validate } = require('./middleware/validateRequest');
const { registerDeviceSchema } = require('./validators/schemas');

router.post('/register', validate(registerDeviceSchema), controller.register);
```

**Schemas Implemented:**
- `registerDeviceSchema` - Device registration
- `sendNotificationSchema` - Notification sending
- `fcmTokenSchema` - FCM token management
- `paginationSchema` - Query pagination

---

### 2. **Error Handling** ✓
**Files:** 
- `src/utils/AppError.js` - Custom error class
- `src/middleware/errorHandler.js` - Central error handler

**What was added:**
- `AppError` class for operational errors
- `asyncHandler` wrapper for async routes
- Centralized error handling middleware
- Specific handlers for different error types

**Error Types Handled:**
- Validation errors (400)
- Authentication errors (401)
- Not found errors (404)
- Duplicate entries (409)
- Server errors (500)

**Example Usage:**
```javascript
const { asyncHandler, AppError } = require('./middleware/errorHandler');

router.post('/create', asyncHandler(async (req, res) => {
  if (!req.body.id) {
    throw new AppError('ID is required', 400);
  }
  // ... rest of logic
}));
```

---

### 3. **Caching System** ✓
**Files:**
- `src/config/redis.js` - Redis connection
- `src/utils/cache.js` - Cache utility with dual backend

**What was added:**
- Redis-backed caching for high performance
- Automatic fallback to in-memory caching
- TTL support for automatic expiration
- Cache statistics and monitoring

**Methods Available:**
- `cache.get(key)` - Get cached value
- `cache.set(key, value, ttl)` - Set cache with TTL
- `cache.delete(key)` - Remove from cache
- `cache.getOrSet(key, fetchFn, ttl)` - Get or compute and cache
- `cache.clear()` - Clear all cache
- `cache.getStats()` - Get cache statistics

**Example Usage:**
```javascript
const cache = require('./utils/cache');

// Get or compute
const data = await cache.getOrSet(
  'devices:list',
  async () => {
    return await db.collection('devices').get();
  },
  300 // 5 minutes TTL
);
```

---

### 4. **API Documentation** ✓
**Files:** 
- `src/config/swagger.js` - Swagger configuration

**What was added:**
- Swagger/OpenAPI documentation
- Interactive API explorer
- Endpoint descriptions and examples
- Request/response schemas
- Error documentation

**Access Documentation:**
- Visit: `http://localhost:5000/api/docs`
- Raw spec: `http://localhost:5000/api/docs.json`

**Documented Endpoints:**
- `/api/devices/register` - Register device
- `/api/devices` - List devices
- `/api/devices/{deviceId}` - Get device
- `/api/notifications/course` - Send notification
- `/api/notifications/history` - Get history
- `/api/health/detailed` - Detailed health check
- `/api/health/metrics` - Performance metrics
- `/api/health/status` - Quick status
- `/api/queue/status` - Queue status
- `/api/queue/enqueue` - Add job
- `/api/queue/job/{jobId}` - Get job status

---

### 5. **Background Job Processing** ✓
**Files:** 
- `src/config/queue.js` - Bull queue configuration

**What was added:**
- Bull queue for async notifications
- Job retry logic with exponential backoff
- Job status tracking
- Queue statistics
- Event handlers for monitoring

**Job Types:**
- `push` - Firebase push notifications
- `telegram` - Telegram messages
- `batch` - Batch processing

**Example Usage:**
```javascript
const { addNotificationJob } = require('./config/queue');

await addNotificationJob({
  type: 'push',
  tokens: [...fcmTokens],
  message: { notification, data },
  courseCode: 'CSC201',
  urgency: 'urgent'
});
```

**Queue Methods:**
- `addNotificationJob(data)` - Add job to queue
- `getJobStatus(jobId)` - Get job status
- `getQueueStats()` - Get queue statistics
- `clearQueue()` - Clear completed jobs

---

### 6. **Health Monitoring** ✓
**Files:**
- `src/controllers/healthController.js` - Health endpoints
- `src/routes/health.js` - Health routes

**What was added:**
- Detailed health checks with multiple subsystems
- Performance metrics collection
- Memory usage monitoring
- Firebase connectivity verification
- Cache status checking

**Health Check Endpoints:**
```
GET /api/health/detailed  - Full health report
GET /api/health/metrics   - Performance metrics
GET /api/health/status    - Quick status
```

**Monitored Components:**
- Firebase connectivity
- Memory usage (heap, external, RSS)
- Process uptime
- Cache status
- CPU usage

---

### 7. **Request Logging** ✓
**Integrated in:** `src/app.js`

**What was added:**
- Automatic request/response logging
- Duration tracking
- Status code logging
- IP tracking
- User agent logging

**Log Format:**
```json
{
  "method": "POST",
  "url": "/api/devices/register",
  "status": 201,
  "duration": "45ms",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

---

### 8. **Status Monitoring Dashboard** ✓
**Integrated in:** `src/app.js`

**What was added:**
- Express Status Monitor middleware
- Real-time performance dashboard
- Access: `http://localhost:5000/status`

**Metrics Displayed:**
- Requests per second
- Response time distribution
- Error rates
- CPU usage
- Memory usage

---

## 📋 Route Updates

### Updated Routes with Validation & Error Handling

#### Device Controller
```
POST /api/devices/register - Register device (with validation)
GET  /api/devices - List devices (paginated, cached)
GET  /api/devices/{deviceId} - Get device details (cached)
```

#### Notification Controller
```
POST /api/notifications/course - Send course notification (validated)
GET  /api/notifications/history - Get notification history (cached)
```

#### Health Routes
```
GET /api/health/detailed - Detailed health check
GET /api/health/metrics - Performance metrics
GET /api/health/status - Quick status
```

#### Queue Routes
```
GET  /api/queue/status - Queue statistics
POST /api/queue/enqueue - Add job to queue
GET  /api/queue/job/{jobId} - Get job status
POST /api/queue/retry - Retry failed job
GET  /api/queue/messages - Recent messages
POST /api/queue/clear - Clear queue
```

---

## 🚀 Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

This installs:
- `joi` - Input validation
- `express-validator` - Additional validation
- `redis` - Caching backend
- `bull` - Job queue
- `swagger-ui-express` - API docs
- `swagger-jsdoc` - API spec generation
- `express-status-monitor` - Monitoring dashboard
- `jest` - Testing (dev)
- `supertest` - HTTP testing (dev)

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Redis (Required for production)
```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or using local Redis
redis-server
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Start Production Server
```bash
npm start
```

---

## 🧪 Testing

### Test Error Handling
```bash
# Test validation error
curl -X POST http://localhost:5000/api/devices/register \
  -H "Content-Type: application/json" \
  -d '{}' # Missing required fields

# Expected response:
{
  "success": false,
  "error": "Validation Failed",
  "details": [
    {
      "field": "deviceToken",
      "message": "Device token is required",
      "type": "any.required"
    }
  ]
}
```

### Test Health Endpoints
```bash
curl http://localhost:5000/api/health/detailed
curl http://localhost:5000/api/health/metrics
curl http://localhost:5000/health
```

### Test API Documentation
```
http://localhost:5000/api/docs
```

### Test Status Monitor
```
http://localhost:5000/status
```

---

## 📊 Validation Schemas

### Device Registration
```json
{
  "deviceToken": "string (required, 20-300 chars)",
  "phoneNumber": "string (optional, valid phone format)",
  "studentName": "string (optional, 2-100 chars)",
  "courses": ["CSC201", "BIT401"] // Optional array
}
```

### Send Notification
```json
{
  "courseCode": "string (required, pattern: [A-Z]{2,4}\\d{3,4})",
  "title": "string (required, 3-100 chars)",
  "body": "string (required, 5-1000 chars)",
  "urgency": "normal | urgent (optional, default: normal)"
}
```

---

## 🔍 Monitoring

### Queue Status
```bash
curl http://localhost:5000/api/queue/status
```

Response:
```json
{
  "success": true,
  "stats": {
    "active": 5,
    "completed": 120,
    "failed": 2,
    "delayed": 0,
    "waiting": 10,
    "paused": 0
  }
}
```

### Job Status
```bash
curl http://localhost:5000/api/queue/job/{jobId}
```

Response:
```json
{
  "success": true,
  "id": "notification-abc123",
  "state": "completed",
  "progress": 100,
  "attempts": 1
}
```

---

## 🐛 Debugging Tips

### 1. Check Logs
```bash
# All logs
tail -f logs/combined.log

# Errors only
tail -f logs/error.log
```

### 2. Monitor Memory
```bash
curl http://localhost:5000/api/health/metrics
```

### 3. Check Cache Status
```bash
curl http://localhost:5000/api/health/detailed
# Look for cache stats in response
```

### 4. Queue Debugging
```bash
# Get all jobs
curl http://localhost:5000/api/queue/messages?limit=100

# Check specific job
curl http://localhost:5000/api/queue/job/{jobId}
```

### 5. Enable Debug Logging
```bash
# In .env
LOG_LEVEL=debug
NODE_ENV=development
```

---

## 🎨 Best Practices Implemented

1. **Separation of Concerns**
   - Controllers handle business logic
   - Middleware handles cross-cutting concerns
   - Services handle data operations

2. **Error Handling**
   - All async operations wrapped with `asyncHandler`
   - Operational errors use `AppError`
   - Centralized error handler catches everything

3. **Validation**
   - Input validation at middleware level
   - Joi schemas define validation rules
   - Detailed error messages for debugging

4. **Caching**
   - Redis for distributed caching
   - Automatic fallback to memory
   - TTL for cache expiration
   - Cache invalidation on updates

5. **Monitoring**
   - Health checks at multiple levels
   - Performance metrics collection
   - Request/response logging
   - Queue status tracking

6. **Documentation**
   - Swagger/OpenAPI specs
   - Inline code comments
   - Environment configuration template
   - This comprehensive guide

---

## 🚨 Error Codes Reference

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Validation Error | Check request format |
| 401 | Authentication Error | Verify credentials |
| 404 | Not Found | Check resource ID |
| 409 | Duplicate Entry | Use different ID/email |
| 500 | Server Error | Check logs |
| 503 | Service Unavailable | Check Redis/Firebase |

---

## 📈 Next Steps

### High Priority
- [ ] Add Redis connection pooling
- [ ] Implement rate limiting per user
- [ ] Add JWT authentication
- [ ] Setup monitoring alerts

### Medium Priority
- [ ] Add database migration system
- [ ] Implement data backup strategy
- [ ] Setup CI/CD pipeline
- [ ] Add performance benchmarks

### Low Priority
- [ ] Migrate to TypeScript
- [ ] Add comprehensive unit tests
- [ ] Setup GraphQL API
- [ ] Add multi-language support

---

## 📞 Support

For issues or questions:
1. Check the logs: `logs/error.log`
2. Review health checks: `GET /api/health/detailed`
3. Check API docs: `GET /api/docs`
4. Enable debug logging: `LOG_LEVEL=debug`

---

**Last Updated:** February 26, 2026
**Version:** 1.0.0
