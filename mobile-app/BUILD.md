# 🚀 MSOMI ALERT - Production Build Guide

## Prerequisites
- Expo account (create at expo.dev)
- EAS CLI installed globally
- Firebase project configured

## Step 1: Login to Expo
```bash
eas login
```
Enter your Expo credentials.

## Step 2: Configure Project
```bash
cd "C:\Users\Admin\Desktop\ANCESTRAL CODE\mobile-app"
eas build:configure
```

## Step 3: Build Production APK
```bash
# Build for Android (APK for direct installation)
eas build -p android --profile preview

# Or build for production (AAB for Play Store)
eas build -p android --profile production
```

## Step 4: Download & Install
1. Wait for build to complete (~10-15 minutes)
2. Download APK from link provided
3. Install on Android phone
4. Enable "Install from Unknown Sources" if needed

## Step 5: Test Real Notifications

### A. Register Device
1. Open app on phone
2. Enter your details
3. Add courses (CSC201, BIT401, etc.)
4. Tap "Register Device"

### B. Send Test Notification via Telegram
1. Open Telegram → Search `@msomi_alert_bot`
2. Send: `/start`
3. Forward message: "CSC201 exam moved to LT3 tomorrow 7am"
4. Check phone for notification (works even without data!)

### C. Send Test via Backend API
```bash
curl -X POST https://msomi-alert.vercel.app/api/notify/course \
  -H "Content-Type: application/json" \
  -d '{
    "courseCode": "CSC201",
    "title": "Class Update",
    "body": "CSC201 class moved to LT3 at 7am",
    "data": {
      "type": "class_change",
      "urgent": true
    }
  }'
```

## Alternative: Development Build (Faster Testing)
```bash
# Build development client with push notifications
eas build -p android --profile development

# After installing, run:
npx expo start --dev-client
```

## Troubleshooting

### Build Fails?
- Check `eas.json` configuration
- Verify `google-services.json` exists
- Ensure Firebase project ID matches

### No Notifications?
- Check Firebase Cloud Messaging is enabled
- Verify device token registered in Firestore
- Test backend endpoint: https://msomi-alert.vercel.app/health

### App Crashes?
- Check logs: `npx expo start --dev-client`
- Verify all dependencies installed
- Rebuild with `--clear-cache` flag

## Production Checklist
- [ ] Firebase project created
- [ ] google-services.json configured
- [ ] Backend deployed to Vercel
- [ ] Telegram bot active
- [ ] EAS build completed
- [ ] APK tested on real device
- [ ] Push notifications working
- [ ] Offline features tested
- [ ] Demo mode working

## For Hackathon Demo
1. **Pre-build APK** before presentation
2. **Install on 2-3 phones** for judges to test
3. **Keep demo mode** as backup
4. **Test airplane mode** to show zero-data feature
5. **Have QR code ready** for Expo Go fallback

---

**Build Time**: ~10-15 minutes
**APK Size**: ~50-60 MB
**Min Android**: 6.0 (API 23)
**Target**: Android 14 (API 34)
