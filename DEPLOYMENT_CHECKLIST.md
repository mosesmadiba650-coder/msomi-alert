# 🚀 DEPLOYMENT CHECKLIST - MSOMI ALERT

## ✅ COMPLETED STEPS

- [x] Git repository initialized
- [x] All files committed
- [x] .gitignore configured (Firebase credentials excluded)

---

## 📋 NEXT STEPS TO DEPLOY

### STEP 1: CREATE GITHUB REPOSITORY (5 minutes)

1. **Go to GitHub.com**
   - Sign in or create account
   - Click "+" → "New repository"

2. **Repository Settings:**
   ```
   Name: msomi-alert
   Description: Zero-cost offline notifications for Kenyan students
   Visibility: Public
   ❌ DO NOT initialize with README (we already have one)
   ```

3. **Push Your Code:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/msomi-alert.git
   git branch -M main
   git push -u origin main
   ```

---

### STEP 2: DEPLOY BACKEND TO RENDER (15 minutes)

1. **Sign Up for Render**
   - Go to https://render.com
   - Click "Get Started for Free"
   - Sign up with GitHub account
   - Authorize Render to access repositories

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Select "msomi-alert" repository
   - Click "Connect"

3. **Configure Service:**
   ```
   Name:           msomi-alert-backend
   Environment:    Node
   Region:         Frankfurt (closest to Kenya)
   Branch:         main
   Root Directory: Backend
   Build Command:  npm install
   Start Command:  npm start
   ```

4. **Add Environment Variables:**
   Click "Advanced" → Add these variables:
   ```
   NODE_VERSION = 18.x
   PORT = 5000
   TELEGRAM_BOT_TOKEN = 8691727581:AAFgHu4ECNWZ_5KXnOZKzlYSH0Z5B9Q8Rhs
   BACKEND_URL = https://msomi-alert-backend.onrender.com
   ```

5. **Upload Firebase Credentials:**
   - Go to "Environment" tab
   - Click "Add Secret File"
   - Name: `firebase-service-account.json.json`
   - Copy contents from: `C:\Users\Admin\Desktop\ANCESTRAL CODE\Backend\firebase-service-account.json.json`
   - Paste and Save

6. **Deploy:**
   - Click "Create Web Service"
   - Wait 5-10 minutes
   - Copy your URL: https://msomi-alert-backend.onrender.com

7. **Test Backend:**
   ```bash
   curl https://msomi-alert-backend.onrender.com/api/notifications
   ```
   Should return: `{"success":true,"notifications":[]}`

---

### STEP 3: UPDATE FIREBASE SETTINGS (5 minutes)

1. **Go to Firebase Console**
   - Open https://console.firebase.google.com
   - Select project: msomi-alert-2026

2. **Add Authorized Domain**
   - Go to Authentication → Settings → Authorized domains
   - Click "Add domain"
   - Add: `msomi-alert-backend.onrender.com`
   - Save

---

### STEP 4: UPDATE MOBILE APP (5 minutes)

1. **Update API URL in App.js:**
   ```javascript
   // Change this line in mobile-app/App.js:
   const API_URL = 'https://msomi-alert-backend.onrender.com';
   ```

2. **Commit Changes:**
   ```bash
   git add mobile-app/App.js
   git commit -m "Update API URL to production backend"
   git push
   ```

---

### STEP 5: BUILD ANDROID APK (20 minutes)

**Option A: EAS Build (Recommended)**

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```
   (Create account at expo.dev if needed)

3. **Configure Project:**
   ```bash
   cd mobile-app
   eas build:configure
   ```

4. **Build APK:**
   ```bash
   eas build -p android --profile preview
   ```

5. **Download APK:**
   - Wait 10-15 minutes
   - Check email or EAS dashboard
   - Download APK file
   - Install on 3 demo phones

**Option B: Test with Expo Go (Quick Test)**

1. **Start Expo:**
   ```bash
   cd mobile-app
   npx expo start
   ```

2. **Scan QR Code:**
   - Install Expo Go app on phone
   - Scan QR code
   - Test app immediately

---

### STEP 6: TEST EVERYTHING (15 minutes)

**Test 1: Backend Health**
```bash
curl https://msomi-alert-backend.onrender.com/api/notifications
```
✅ Should return success

**Test 2: Device Registration**
- Open app on phone
- Register with courses: CSC201, BIT401
- Check Firebase console for new device

**Test 3: Telegram Bot**
- Open Telegram
- Send message to @msomi_alert_bot
- Forward: "URGENT: CSC201 exam moved to LT3 tomorrow 7am"
- Check phone receives notification

**Test 4: Zero Data Delivery**
- Put phone in Airplane Mode
- Turn off WiFi
- Send notification from Telegram
- ✅ Alert should arrive

**Test 5: AI Classification**
- Open notification
- ✅ Should show course, venue, time tags

**Test 6: Demo Mode**
- Tap 🎯 button
- Select "Urgent Exam Change"
- ✅ Notification appears immediately

---

### STEP 7: PREPARE FOR PRESENTATION (30 minutes)

**Print Materials:**
- [ ] 10 copies of JUDGES_CHEAT_SHEET.txt
- [ ] 1 copy of PRESENTATION_QUICK_REF.txt

**Setup Phones:**
- [ ] Install APK on 3 phones
- [ ] Charge all to 100%
- [ ] Register all with same courses
- [ ] Test demo mode on each

**Setup Laptop:**
- [ ] Open Telegram bot
- [ ] Open Render dashboard
- [ ] Open Firebase console
- [ ] Open GitHub repo
- [ ] Bookmark all tabs

**Rehearse:**
- [ ] Practice 3-minute pitch 3 times
- [ ] Time each section
- [ ] Test all backup plans
- [ ] Prepare for Q&A

---

## 🎯 DEPLOYMENT COMPLETE WHEN:

- ✅ Backend live on Render
- ✅ Mobile app updated with production URL
- ✅ APK installed on 3 phones
- ✅ Telegram bot tested and working
- ✅ All tests passing
- ✅ Presentation materials printed
- ✅ Demo rehearsed 3 times

---

## 🚨 EMERGENCY CONTACTS

**If Backend Fails:**
- Use local backend: `cd Backend && npm run dev`
- Use ngrok: `ngrok http 5000`

**If Phone Fails:**
- Switch to backup phone (you have 3!)

**If Internet Fails:**
- Use demo mode (works offline)
- Show screenshots/video

**If Everything Fails:**
- Stay calm
- Explain the solution verbally
- Show the code on GitHub
- Focus on the impact

---

## 📞 SUPPORT

**Render Issues:** https://render.com/docs
**EAS Build Issues:** https://docs.expo.dev/build/introduction/
**Firebase Issues:** https://firebase.google.com/support

---

## 🏆 YOU'RE READY!

Once all checkboxes are complete, you have:
- ✅ Production backend deployed
- ✅ Mobile app ready for demo
- ✅ All systems tested
- ✅ Presentation prepared

**Go show them what you built!** 🇰🇪✨

---

**Current Status:** Git repository ready. Next: Create GitHub repo and deploy to Render.
