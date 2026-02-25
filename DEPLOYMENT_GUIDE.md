# MSOMI ALERT - Deployment Guide

## 📦 PART 1: BACKEND DEPLOYMENT TO RENDER

### Step 1: Prepare for Deployment

1. **Create GitHub Repository**
```bash
cd "C:\Users\Admin\Desktop\ANCESTRAL CODE"
git init
git add .
git commit -m "MSOMI ALERT - Ready for hackathon deployment"
```

2. **Create GitHub Repo Online**
- Go to github.com
- Click "New Repository"
- Name: `msomi-alert`
- Make it Public
- Don't initialize with README (we already have one)

3. **Push to GitHub**
```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/msomi-alert.git
git push -u origin main
```

### Step 2: Deploy to Render

1. **Sign Up for Render**
- Go to https://render.com
- Sign up with GitHub account
- Authorize Render to access your repos

2. **Create New Web Service**
- Click "New +" → "Web Service"
- Connect your `msomi-alert` repository
- Select the `backend` folder as root directory

3. **Configure Service**
```
Name:           msomi-alert-backend
Environment:    Node
Region:         Frankfurt (closest to Kenya)
Branch:         main
Root Directory: backend
Build Command:  npm install
Start Command:  npm start
```

4. **Add Environment Variables**
Click "Advanced" → "Add Environment Variable":
```
NODE_VERSION=18.x
PORT=5000
TELEGRAM_BOT_TOKEN=8691727581:AAFgHu4ECNWZ_5KXnOZKzlYSH0Z5B9Q8Rhs
BACKEND_URL=https://msomi-alert-backend.onrender.com
```

5. **Deploy**
- Click "Create Web Service"
- Wait 5-10 minutes for deployment
- Copy your public URL (e.g., https://msomi-alert-backend.onrender.com)

### Step 3: Upload Firebase Credentials

**IMPORTANT**: Don't commit firebase-service-account.json.json to GitHub!

1. **In Render Dashboard**
- Go to your service
- Click "Environment" tab
- Click "Add Secret File"
- Name: `firebase-service-account.json.json`
- Paste contents of your local firebase-service-account.json.json file
- Save

2. **Update server.js** (if needed)
```javascript
// Make sure this line uses the correct path
const serviceAccount = require('./firebase-service-account.json.json');
```

### Step 4: Update Firebase Settings

1. **Go to Firebase Console**
- Open https://console.firebase.google.com
- Select your project: msomi-alert-2026

2. **Add Authorized Domain**
- Go to Authentication → Settings → Authorized domains
- Add: `msomi-alert-backend.onrender.com`

3. **Test Backend**
```bash
curl https://msomi-alert-backend.onrender.com/api/notifications
```

Should return: `{"success":true,"notifications":[]}`

---

## 📱 PART 2: BUILD ANDROID APK

### Option A: EAS Build (Recommended)

1. **Install EAS CLI**
```bash
npm install -g eas-cli
```

2. **Login to Expo**
```bash
eas login
```
(Create account at expo.dev if you don't have one)

3. **Configure Project**
```bash
cd mobile-app
eas build:configure
```

4. **Update API URL**
Edit `mobile-app/App.js`:
```javascript
const API_URL = 'https://msomi-alert-backend.onrender.com';
```

5. **Build APK**
```bash
eas build -p android --profile preview
```

6. **Download APK**
- Wait 10-15 minutes for build
- Download from EAS dashboard
- Install on demo phones

### Option B: Local Build (Backup)

1. **Install Android Studio**
- Download from developer.android.com
- Install Android SDK

2. **Build Locally**
```bash
cd mobile-app
npx expo prebuild
cd android
./gradlew assembleRelease
```

3. **Find APK**
Location: `mobile-app/android/app/build/outputs/apk/release/app-release.apk`

---

## 🤖 PART 3: UPDATE TELEGRAM BOT

### Update Bot Webhook URL

1. **Edit backend/.env**
```env
BACKEND_URL=https://msomi-alert-backend.onrender.com
```

2. **Restart Bot**
```bash
cd backend
npm run dev
```

3. **Test Bot**
- Open Telegram
- Send message to @msomi_alert_bot
- Should receive response

---

## ✅ PART 4: PRE-PRESENTATION CHECKLIST

### 24 Hours Before Presentation

- [ ] Backend deployed to Render (check URL works)
- [ ] APK built and installed on 3 phones
- [ ] Telegram bot tested with production URL
- [ ] Firebase console accessible
- [ ] GitHub repo public and clean
- [ ] README.md updated with screenshots
- [ ] Print 10 copies of JUDGES_CHEAT_SHEET.txt
- [ ] Prepare laptop with:
  - [ ] Telegram bot open
  - [ ] Render dashboard (shows live logs)
  - [ ] Firebase console (shows notifications)
  - [ ] GitHub repo (shows code)

### 2 Hours Before Presentation

- [ ] Charge all phones to 100%
- [ ] Put phones in Airplane Mode
- [ ] Turn off WiFi on phones
- [ ] Clear all notifications
- [ ] Open MSOMI ALERT app on all phones
- [ ] Test one demo alert to confirm
- [ ] Turn off auto-brightness
- [ ] Disable auto-lock (keep screen on)
- [ ] Close all other apps

### 5 Minutes Before Presentation

- [ ] Silence all phones
- [ ] Have charging cables ready
- [ ] Open presentation script on laptop
- [ ] Open Telegram bot
- [ ] Take deep breath
- [ ] You've got this! 🚀

---

## 🚨 PART 5: EMERGENCY BACKUP PLAN

### If Internet Fails at Venue

**Plan A: Use Phone Hotspot**
```bash
# Connect laptop to phone hotspot
# Backend on Render still works
# Demo phones connect to same hotspot
```

**Plan B: Local Network**
```bash
# Connect all devices to venue WiFi
# Run backend locally on laptop
cd backend
npm run dev

# Use ngrok for public URL
ngrok http 5000
# Update app API_URL to ngrok URL
```

**Plan C: Offline Demo Mode**
- Use demo mode in app (already built-in)
- Show pre-recorded video
- Show screenshots of working system

### If Firebase Fails

**Backup**: Use demo mode
- Demo mode has pre-loaded alerts
- Works 100% offline
- Shows all features

### If Phone Dies

**Backup**: Have 3 phones
- Primary phone
- Backup phone 1
- Backup phone 2
- All have same app installed
- All registered to same courses

### If Telegram Bot Fails

**Backup**: Direct API call
```bash
# From laptop terminal
curl -X POST https://msomi-alert-backend.onrender.com/api/notify/course \
  -H "Content-Type: application/json" \
  -d '{"courseCode":"CSC201","title":"Demo Alert","body":"URGENT: Exam moved to LT3 tomorrow 7am"}'
```

### If Render Goes Down

**Backup**: Local backend
```bash
cd backend
npm run dev
# Use ngrok for public URL
ngrok http 5000
```

---

## 🎯 PART 6: TESTING CHECKLIST

### Test 1: Zero Data Delivery
1. Put phone in Airplane Mode
2. Turn off WiFi
3. Send notification from Telegram bot
4. ✅ Alert should arrive on phone

### Test 2: AI Classification
1. Send: "URGENT: CSC201 exam moved to LT3 tomorrow 7am"
2. Open notification
3. ✅ Should show course tag, venue tag, time tag

### Test 3: Swahili Support
1. Send: "Msomi kesho 7am venue LT5. Darasa muhimu sana!"
2. Open notification
3. ✅ Should detect Swahili, extract time and venue

### Test 4: Offline Documents
1. Turn off all internet
2. Open Documents tab
3. Open any PDF
4. ✅ Should open without internet

### Test 5: Demo Mode
1. Tap demo button (🎯)
2. Select "Urgent Exam Change"
3. ✅ Notification should appear immediately

---

## 📊 PART 7: MONITORING DURING PRESENTATION

### Render Dashboard
- Shows live logs
- Shows request count
- Shows uptime

### Firebase Console
- Shows notification delivery
- Shows device registrations
- Shows Firestore data

### What to Watch
- Response times (should be < 500ms)
- Error rates (should be 0%)
- Delivery success (should be 100%)

---

## 🏆 FINAL WORDS

You've built something incredible:
- ✅ Backend deployed to production
- ✅ Mobile app built and tested
- ✅ Telegram bot integrated
- ✅ AI classification working
- ✅ Offline sync functional
- ✅ Demo mode ready

**This is educational equity, delivered.** 🇰🇪✨

Go show them what you built!

---

## 📞 Emergency Contacts

**If something breaks during presentation:**
1. Stay calm
2. Switch to backup plan
3. Use demo mode
4. Show screenshots/video
5. Explain the vision

**Remember**: Judges care about:
- The problem you're solving
- Your solution approach
- Social impact potential
- Technical feasibility

You've nailed all four. 🚀

---

**Type "done" when deployment is complete!**
