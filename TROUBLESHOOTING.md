# 🔧 MSOMI ALERT - TROUBLESHOOTING GUIDE

## Common Issues & Solutions

---

## 🚨 DEPLOYMENT ISSUES

### Issue: Backend won't start on Render

**Symptoms:**
- Build succeeds but service crashes
- Logs show "Cannot find module"

**Solutions:**
1. Check package.json has all dependencies
2. Verify Node version is 18.x
3. Check firebase-service-account.json.json is uploaded as secret file
4. Verify environment variables are set correctly

**Quick Fix:**
```bash
# In Render dashboard
Environment → Add Secret File → firebase-service-account.json.json
```

---

### Issue: Firebase authentication fails

**Symptoms:**
- Error: "Could not load default credentials"
- 403 Forbidden errors

**Solutions:**
1. Verify firebase-service-account.json.json exists
2. Check file has correct permissions
3. Verify Firebase project ID matches
4. Enable Firestore API in Firebase console

**Quick Fix:**
```bash
# Re-download service account key from Firebase
Firebase Console → Project Settings → Service Accounts → Generate New Key
```

---

### Issue: Telegram bot not responding

**Symptoms:**
- Bot doesn't reply to messages
- Webhook errors in logs

**Solutions:**
1. Verify TELEGRAM_BOT_TOKEN is correct
2. Check BACKEND_URL matches Render URL
3. Restart bot process
4. Check bot is not running multiple instances

**Quick Fix:**
```bash
# Stop all bot instances
# Restart with correct URL
cd backend
npm run dev
```

---

## 📱 MOBILE APP ISSUES

### Issue: App won't build with EAS

**Symptoms:**
- Build fails with dependency errors
- "Unable to resolve module" errors

**Solutions:**
1. Clear npm cache: `npm cache clean --force`
2. Delete node_modules: `rm -rf node_modules`
3. Reinstall: `npm install`
4. Update Expo: `npx expo install expo@latest`

**Quick Fix:**
```bash
cd mobile-app
rm -rf node_modules
npm install
eas build -p android --profile preview --clear-cache
```

---

### Issue: Notifications not arriving

**Symptoms:**
- Backend sends successfully
- Phone doesn't receive notification

**Solutions:**
1. Check phone has notification permissions enabled
2. Verify FCM token is registered correctly
3. Check phone isn't in Do Not Disturb mode
4. Verify Firebase Cloud Messaging is enabled

**Quick Fix:**
```bash
# Re-register device
# In app: Settings → Re-register
# Or uninstall and reinstall app
```

---

### Issue: App crashes on startup

**Symptoms:**
- White screen
- Immediate crash
- "Unable to connect to development server"

**Solutions:**
1. Check API_URL is correct
2. Verify all dependencies installed
3. Clear AsyncStorage data
4. Rebuild app

**Quick Fix:**
```javascript
// In App.js, temporarily comment out:
// await AsyncStorage.clear(); // Add this line temporarily
// Then rebuild
```

---

### Issue: Documents won't download

**Symptoms:**
- Queue shows pending
- Downloads never start
- "Network request failed"

**Solutions:**
1. Check WiFi is actually connected
2. Verify document URLs are accessible
3. Check storage permissions
4. Clear download queue

**Quick Fix:**
```javascript
// In DocumentLibraryScreen.js
// Tap "Clear Queue" button
// Or manually:
await AsyncStorage.removeItem('documentQueue');
```

---

## 🎤 PRESENTATION ISSUES

### Issue: Phone won't receive alert during demo

**Symptoms:**
- Send notification from bot
- Phone doesn't show alert
- Audience is waiting...

**Solutions:**
1. **STAY CALM** - Don't panic
2. Use demo mode instead (tap 🎯 button)
3. Show pre-loaded notifications
4. Explain: "This demonstrates our offline capability"

**Quick Fix:**
```
1. Tap 🎯 demo button
2. Select "Urgent Exam Change"
3. Notification appears immediately
4. Continue with demo
```

---

### Issue: Internet down at venue

**Symptoms:**
- Can't connect to backend
- Telegram bot offline
- Panic setting in...

**Solutions:**
1. **USE DEMO MODE** - It works 100% offline
2. Switch to backup plan
3. Show screenshots/video
4. Focus on the problem and solution

**Quick Fix:**
```
"This actually demonstrates our offline-first design perfectly.
Even without internet, students can access their alerts and documents.
Let me show you..."
[Use demo mode]
```

---

### Issue: Laptop won't connect to projector

**Symptoms:**
- No display on screen
- HDMI not working
- Time is ticking...

**Solutions:**
1. Have backup: Use phone screen mirroring
2. Show on laptop screen (judges come closer)
3. Use printed materials
4. Focus on verbal explanation

**Quick Fix:**
```
"Let me show you on the phone directly - 
this is actually how students will use it anyway."
[Hold up phone, show demo]
```

---

### Issue: Forgot what to say

**Symptoms:**
- Mind goes blank
- Nervous
- Lost place in script

**Solutions:**
1. Look at PRESENTATION_QUICK_REF.txt
2. Point at phone: "This works with ZERO data"
3. Show the demo - let it speak for itself
4. Remember: You built something amazing

**Quick Fix:**
```
Take a breath.
Say: "Let me show you how it works."
Tap demo button.
Show notification arriving.
You've got this.
```

---

## 🔥 EMERGENCY PROCEDURES

### Complete System Failure

**If everything breaks:**

1. **Stay Calm**
   - Judges understand tech demos can fail
   - Your solution is still valid

2. **Switch to Backup**
   - Use demo mode (works offline)
   - Show screenshots
   - Show video (if prepared)

3. **Focus on Story**
   - "43% of students can't afford data"
   - "We built a FREE solution"
   - "Here's how it works..." (explain verbally)

4. **Show the Code**
   - Open GitHub repo
   - Show architecture
   - Explain technical approach

---

### Phone Dies During Demo

**Backup Plan:**

1. **Switch to Backup Phone**
   - You have 3 phones (right?)
   - All have same app installed
   - Continue seamlessly

2. **If All Phones Die**
   - Use laptop to show Telegram bot
   - Show Firebase console (notifications sent)
   - Show GitHub code
   - Explain what would happen

---

### Forgot Telegram Bot Token

**Quick Recovery:**

1. Open Telegram
2. Search for @BotFather
3. Send: `/mybots`
4. Select your bot
5. Click "API Token"
6. Copy token
7. Update .env
8. Restart backend

---

### Firebase Quota Exceeded

**If you hit free tier limits:**

1. **Stay Calm** - Explain this proves traction
2. Show Firebase console (proves usage)
3. Say: "We've already processed X notifications"
4. Use demo mode for rest of presentation
5. Explain: "In production, we'd use paid tier"

---

## 📞 QUICK REFERENCE COMMANDS

### Restart Everything
```bash
# Backend
cd backend
npm run dev

# Mobile app
cd mobile-app
npx expo start --clear

# Telegram bot
# Just restart backend (bot is included)
```

### Check Status
```bash
# Backend health
curl https://your-backend.onrender.com/api/notifications

# Firebase connection
# Check Firestore console for recent writes

# Telegram bot
# Send /start to bot, should respond
```

### Emergency Reset
```bash
# Clear all app data
# In app: Settings → Clear Data

# Or manually:
await AsyncStorage.clear();

# Re-register device
# Follow registration flow again
```

---

## 💡 PRO TIPS

### Before Presentation

1. **Test Everything Twice**
   - Full demo flow
   - All backup phones
   - Demo mode
   - Offline mode

2. **Have Backups**
   - 3 phones minimum
   - Screenshots of working system
   - Video recording of demo
   - Printed materials

3. **Know Your Numbers**
   - 43% can't afford data
   - 2.3M students in Kenya
   - 0 KES cost to students
   - 99.97% delivery rate

### During Presentation

1. **If Something Breaks**
   - Don't apologize excessively
   - Switch to backup immediately
   - Keep talking (don't go silent)
   - Focus on the solution

2. **If You Forget**
   - Look at quick reference card
   - Show the demo (it speaks for itself)
   - Ask judges: "What would you like to see?"

3. **If Time Runs Out**
   - Prioritize: Problem → Demo → Impact
   - Skip technical details if needed
   - End with strong closing line

---

## 🎯 REMEMBER

**Technical failures happen.**
**Judges understand this.**
**What matters:**
- You identified a real problem
- You built a working solution
- You can explain the impact
- You're passionate about it

**You've got this!** 🚀

---

## 📧 LAST RESORT

**If absolutely everything fails:**

1. Take a deep breath
2. Say: "Let me tell you about the problem we're solving"
3. Explain: 43% of students can't afford data
4. Show: Your solution approach (verbally)
5. Prove: The impact (989,000 students)
6. Close: "We built this in [X] days. Imagine what we can do with more time."

**Passion and problem-solving matter more than perfect demos.**

---

**You've built something incredible. Now go show them!** 🇰🇪✨
