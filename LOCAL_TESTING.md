# 🧪 LOCAL TESTING BEFORE DEPLOYMENT

## Test everything locally first to ensure it works!

---

## ✅ STEP 1: TEST BACKEND LOCALLY (5 minutes)

1. **Start Backend:**
   ```bash
   cd Backend
   npm run dev
   ```

2. **Test Health Endpoint:**
   Open browser: http://localhost:5000/api/notifications
   
   Should see: `{"success":true,"notifications":[]}`

3. **Test Device Registration:**
   ```bash
   curl -X POST http://localhost:5000/api/register-device ^
     -H "Content-Type: application/json" ^
     -d "{\"deviceToken\":\"test-token\",\"phoneNumber\":\"+254712345678\",\"studentName\":\"Test Student\",\"courses\":[\"CSC201\"]}"
   ```

4. **Check Telegram Bot:**
   - Bot should print: "Telegram bot is running..."
   - Send /start to @msomi_alert_bot
   - Should receive welcome message

✅ **Backend Working!**

---

## ✅ STEP 2: TEST MOBILE APP LOCALLY (5 minutes)

1. **Start Expo:**
   ```bash
   cd mobile-app
   npx expo start
   ```

2. **Open on Phone:**
   - Install Expo Go app
   - Scan QR code
   - App should open

3. **Test Registration:**
   - Enter name and phone
   - Add courses: CSC201, BIT401
   - Tap "Register Device"
   - Should see success message

4. **Test Demo Mode:**
   - Tap 🎯 button
   - Select "Urgent Exam Change"
   - Notification should appear

✅ **Mobile App Working!**

---

## ✅ STEP 3: TEST END-TO-END (10 minutes)

1. **Keep Backend Running:**
   ```bash
   cd Backend
   npm run dev
   ```

2. **Keep Mobile App Running:**
   ```bash
   cd mobile-app
   npx expo start
   ```

3. **Send Test Notification:**
   - Open Telegram
   - Send to @msomi_alert_bot:
     ```
     URGENT: CSC201 exam moved to LT3 tomorrow 7am. Bring calculators.
     ```

4. **Check Phone:**
   - Notification should arrive
   - Open notification
   - Should show AI tags: CSC201, LT3, 7am

5. **Test Offline Mode:**
   - Put phone in Airplane Mode
   - Send another notification
   - Should still arrive (FCM magic!)

✅ **Everything Working End-to-End!**

---

## ✅ STEP 4: TEST AI CLASSIFICATION (5 minutes)

1. **Test Urgent Message:**
   ```
   URGENT: CSC201 exam CANCELLED tomorrow!
   ```
   Expected: Critical urgency, red border

2. **Test Swahili:**
   ```
   Msomi kesho 7am venue LT5. Darasa muhimu sana!
   ```
   Expected: Detects Swahili, extracts time/venue

3. **Test Normal Message:**
   ```
   CSC201 class notes available on portal
   ```
   Expected: Low urgency, blue border

✅ **AI Classification Working!**

---

## ✅ STEP 5: TEST DOCUMENT SYNC (5 minutes)

1. **Queue Document:**
   - Tap Documents tab
   - Tap "Add Sample Document"
   - Should appear in queue

2. **Connect to WiFi:**
   - Turn on WiFi
   - Document should start downloading

3. **Open Document:**
   - Tap document card
   - PDF should open
   - Works offline!

✅ **Document Sync Working!**

---

## 🎯 ALL TESTS PASSING?

If all tests above pass, you're ready to deploy!

**Next Steps:**
1. Follow DEPLOYMENT_CHECKLIST.md
2. Deploy backend to Render
3. Build APK with EAS
4. Test on production

---

## 🚨 IF TESTS FAIL

**Backend won't start:**
- Check .env file exists
- Check firebase-service-account.json.json exists
- Run: `npm install`

**Mobile app won't start:**
- Run: `npm install`
- Clear cache: `npx expo start --clear`

**Notifications not arriving:**
- Check backend is running
- Check phone has notification permissions
- Check Telegram bot token is correct

**AI not working:**
- Check aiService.js exists
- Check initialization in App.js
- Look for errors in console

---

## 📊 TESTING CHECKLIST

Before deploying, verify:
- [ ] Backend starts without errors
- [ ] Telegram bot responds to /start
- [ ] Mobile app opens successfully
- [ ] Device registration works
- [ ] Notifications arrive on phone
- [ ] AI classification shows tags
- [ ] Demo mode works
- [ ] Document sync queues files
- [ ] Offline indicator shows status

---

## ✅ READY TO DEPLOY!

Once all tests pass locally, proceed to:
**DEPLOYMENT_CHECKLIST.md**

Your local system is working perfectly.
Time to make it live! 🚀

---

**Current Status:** Ready for local testing. Run backend and mobile app to verify everything works.
