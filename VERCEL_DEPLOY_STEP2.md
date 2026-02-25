# 🚀 VERCEL DEPLOYMENT - STEP 2

## You're in Vercel Dashboard - Do This:

### Option A: Import from GitHub (Recommended)

1. Click **"Import Project"** button
2. Select **"Import Git Repository"**
3. Choose **GitHub**
4. Find: `mosesmadiba650-coder/msomi-alert`
5. Click **"Import"**

### Configure Project:
```
Framework Preset: Other
Root Directory: backend
Build Command: npm install
Output Directory: (leave empty)
Install Command: npm install
```

### Environment Variables (Add These):
```
NODE_ENV=production
TELEGRAM_BOT_TOKEN=8691727581:AAFgHu4ECNWZ_5KXnOZKzlYSH0Z5B9Q8Rhs
```

### Firebase Credentials:
In Vercel dashboard:
1. Settings → Environment Variables
2. Add variable: `FIREBASE_SERVICE_ACCOUNT`
3. Value: Copy entire content from `backend/firebase-service-account.json.json`
4. Paste as JSON string

6. Click **"Deploy"**

---

## Option B: CLI Deploy (If Import Fails)

Open PowerShell and run:

```powershell
cd "C:\Users\Admin\Desktop\ANCESTRAL CODE\backend"
vercel --prod
```

Answer prompts:
- Set up and deploy? **Y**
- Which scope? **Your account**
- Link to existing project? **N**
- Project name? **msomi-alert**
- Directory? **./backend**
- Override settings? **N**

---

## After Deployment:

You'll get URL like: `https://msomi-alert-xxx.vercel.app`

### Test It:
```bash
curl https://msomi-alert-xxx.vercel.app/health
```

Expected response:
```json
{"status":"OK","uptime":123,"firebase":"connected"}
```

---

## Update Mobile App:

Edit `mobile-app/App.js` line 23:
```javascript
const API_URL = 'https://msomi-alert-xxx.vercel.app';
```

Replace `xxx` with your actual Vercel URL.

---

**Choose Option A (Import) - it's easier!**

Click "Import Project" in your Vercel dashboard now.
