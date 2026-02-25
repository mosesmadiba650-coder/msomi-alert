# 🚀 VERCEL DEPLOYMENT GUIDE - MSOMI ALERT

**IMPORTANT**: Deploy this yourself. Never share passwords with AI assistants.

---

## 📋 PREREQUISITES

- ✅ GitHub account: mosesmadiba650-coder
- ✅ Vercel account (sign up with GitHub)
- ✅ Code pushed to: https://github.com/mosesmadiba650-coder/msomi-alert

---

## 🎯 STEP-BY-STEP DEPLOYMENT

### STEP 1: Sign Up for Vercel (2 minutes)

1. Go to: https://vercel.com/signup
2. Click "Continue with GitHub"
3. Authorize Vercel to access your repositories
4. Complete signup

### STEP 2: Create vercel.json Configuration

Create this file in your project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "backend/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### STEP 3: Update Backend for Vercel

Vercel requires serverless functions. Update `backend/server.js`:

```javascript
// Add at the very end of server.js
module.exports = app; // Export for Vercel
```

### STEP 4: Deploy to Vercel

**Option A: Via Vercel Dashboard (Recommended)**

1. Go to: https://vercel.com/new
2. Click "Import Git Repository"
3. Select: `mosesmadiba650-coder/msomi-alert`
4. Configure:
   - Framework Preset: Other
   - Root Directory: `./`
   - Build Command: `cd backend && npm install`
   - Output Directory: `backend`
5. Add Environment Variables:
   - `TELEGRAM_BOT_TOKEN`: `8691727581:AAFgHu4ECNWZ_5KXnOZKzlYSH0Z5B9Q8Rhs`
   - `NODE_ENV`: `production`
6. Click "Deploy"

**Option B: Via Vercel CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project root
cd "C:\Users\Admin\Desktop\ANCESTRAL CODE"
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: msomi-alert
# - Directory: ./
# - Override settings? No

# Deploy to production
vercel --prod
```

### STEP 5: Upload Firebase Credentials

Vercel doesn't support file uploads directly. Use environment variable:

1. Open: `backend/firebase-service-account.json.json`
2. Copy entire JSON content
3. In Vercel dashboard → Settings → Environment Variables
4. Add variable:
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: [paste entire JSON]
5. Redeploy

Update `backend/server.js` to use environment variable:

```javascript
// Replace this line:
const serviceAccount = require('./firebase-service-account.json.json');

// With this:
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('./firebase-service-account.json.json');
```

### STEP 6: Update Mobile App URL

After deployment, Vercel gives you a URL like: `https://msomi-alert.vercel.app`

Update `mobile-app/App.js`:

```javascript
const API_URL = 'https://msomi-alert.vercel.app';
```

### STEP 7: Configure Custom Domain (Optional)

1. In Vercel dashboard → Settings → Domains
2. Add custom domain (if you have one)
3. Follow DNS configuration instructions

---

## ⚠️ VERCEL LIMITATIONS FOR YOUR PROJECT

### Issues with Vercel:

1. **Serverless Functions**: 10-second timeout limit
   - Your Telegram bot needs long-running process
   - Notifications may timeout

2. **No WebSocket Support**: 
   - Telegram polling won't work
   - Need to switch to webhooks

3. **Cold Starts**: 
   - Similar to Render free tier
   - First request takes 5-10 seconds

4. **File System**: 
   - Read-only after deployment
   - Can't store uploaded files

### Recommended Alternative: Railway

Railway is better for your use case:
- ✅ Long-running processes
- ✅ WebSocket support
- ✅ File system access
- ✅ Free tier: $5 credit/month
- ✅ No cold starts

---

## 🚂 RAILWAY DEPLOYMENT (BETTER OPTION)

### STEP 1: Sign Up for Railway

1. Go to: https://railway.app
2. Sign in with GitHub
3. Authorize Railway

### STEP 2: Deploy Backend

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd "C:\Users\Admin\Desktop\ANCESTRAL CODE\backend"
railway init

# Link to new project
railway link

# Add environment variables
railway variables set TELEGRAM_BOT_TOKEN=8691727581:AAFgHu4ECNWZ_5KXnOZKzlYSH0Z5B9Q8Rhs
railway variables set NODE_ENV=production

# Deploy
railway up
```

### STEP 3: Upload Firebase Credentials

```bash
# Upload as secret file
railway volumes create firebase-creds
railway volumes upload firebase-creds backend/firebase-service-account.json.json
```

### STEP 4: Get Deployment URL

```bash
railway domain
# Copy the URL (e.g., https://msomi-alert-production.up.railway.app)
```

### STEP 5: Update Mobile App

```javascript
const API_URL = 'https://msomi-alert-production.up.railway.app';
```

---

## 📊 COST COMPARISON

| Platform | Free Tier | Pros | Cons | Best For |
|----------|-----------|------|------|----------|
| **Vercel** | Unlimited | Fast CDN, Easy deploy | 10s timeout, No long processes | Static sites, APIs |
| **Railway** | $5/month credit | Full Node.js, No timeouts | Paid after credit | Your project ✅ |
| **Render** | 750 hours/month | Free forever, Full features | Cold starts | Hobby projects |
| **Fly.io** | 3 VMs free | Global edge, Fast | Complex setup | Advanced users |

**Recommendation**: Use **Railway** for production, keep Render as backup.

---

## 🔧 PRODUCTION-READY FIXES

### 1. Add Health Check Endpoint

Already exists in your code:
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});
```

### 2. Add Error Monitoring (Sentry)

```bash
cd backend
npm install @sentry/node
```

Add to `server.js`:
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

app.use(Sentry.Handlers.errorHandler());
```

### 3. Add Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 4. Add Request Logging

```bash
npm install morgan
```

```javascript
const morgan = require('morgan');
app.use(morgan('combined'));
```

---

## 🧪 TESTING YOUR DEPLOYMENT

### Test Backend Health

```bash
curl https://your-deployment-url.vercel.app/health
# Expected: {"status":"OK","service":"msomi-alert-backend"}
```

### Test Firebase Connection

```bash
curl https://your-deployment-url.vercel.app/firebase-test
# Expected: {"success":true,"message":"✅ Firebase connected successfully"}
```

### Test Device Registration

```bash
curl -X POST https://your-deployment-url.vercel.app/api/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "deviceToken": "test-token-123",
    "courses": ["CSC201"],
    "studentName": "Test User"
  }'
```

---

## 📱 BUILD PRODUCTION APK

### STEP 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### STEP 2: Configure EAS

```bash
cd "C:\Users\Admin\Desktop\ANCESTRAL CODE\mobile-app"
eas login
eas build:configure
```

### STEP 3: Update app.json

```json
{
  "expo": {
    "name": "MSOMI ALERT",
    "slug": "msomi-alert",
    "version": "1.0.0",
    "android": {
      "package": "com.msomialert.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/icon.png",
        "backgroundColor": "#27ae60"
      }
    },
    "extra": {
      "apiUrl": "https://your-deployment-url.vercel.app"
    }
  }
}
```

### STEP 4: Build APK

```bash
# Build for Android
eas build -p android --profile preview

# Download APK when complete
# Install on phone: adb install app.apk
```

---

## 🚨 SECURITY CHECKLIST

Before going live:

- [ ] Change all passwords (GitHub, Vercel, Gmail)
- [ ] Enable 2FA on all accounts
- [ ] Rotate Telegram bot token
- [ ] Add rate limiting to API
- [ ] Set up error monitoring (Sentry)
- [ ] Configure CORS properly
- [ ] Add request logging
- [ ] Set up backup strategy
- [ ] Document recovery procedures

---

## 📞 SUPPORT RESOURCES

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Expo EAS: https://docs.expo.dev/build/introduction
- Firebase: https://firebase.google.com/docs

---

**REMEMBER**: Never share credentials with AI assistants or in public chats!

**Next Steps**:
1. Change your passwords immediately
2. Choose deployment platform (Railway recommended)
3. Follow deployment steps above
4. Test thoroughly before hackathon

Good luck! 🚀🇰🇪
