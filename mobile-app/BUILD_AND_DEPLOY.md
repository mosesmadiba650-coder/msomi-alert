# 📱 MSOMI ALERT - APK Build & Play Store Deployment Guide

**Edition**: Production Ready  
**Version**: 1.0.0  
**Target**: Android 6.0+ (API 23+)  
**Build Date**: February 25, 2026  

---

## 🚀 QUICK START - BUILD PREVIEW APK (5 MINUTES)

### Prerequisites Checklist
```bash
✅ Node.js 18+ installed
✅ npm or yarn installed
✅ Git configured
✅ Expo CLI installed globally
✅ EAS CLI installed globally
✅ Expo account created (https://expo.dev)
✅ GitHub account linked to Expo
```

### One-Command Build
```bash
cd mobile-app
npm install
eas build -p android --profile preview
```

**Time**: 5-10 minutes  
**Output**: `MSOMI_ALERT_preview.apk` ready for testing  
**File Size**: ~80-100MB

---

## 📦 BUILD PROFILES EXPLAINED

### 1. **Development** (For Local Testing)
```bash
eas build -p android --profile development
```
- ** For internal testing on your device
- Can use development client
- No code signing needed
- Output: Installable APK for debugging
- **Size**: ~90MB

### 2. **Preview** (For QA & Beta Testing)
```bash
eas build -p android --profile preview
```
- For internal QA and beta testers
- Uses release build configuration
- Signed with EAS managed key
- Output: Internal distribution APK
- **Size**: ~85MB
- **Best For**: Hackathon judges, stakeholders

### 3. **Production** (For Play Store)
```bash
eas build -p android --profile production
```
- For public release on Google Play Store
- Generates AAB (Android App Bundle)
- Optimized for store delivery
- Output: `app-production.aab`
- **Size**: ~50MB (optimized)
- **Best For**: Real users in production

---

## 🛠️ SETUP: First Time Only

### Step 1: Create Expo Account
```bash
# Go to https://expo.dev and create account
# Or use existing account
```

### Step 2: Install Global Tools
```bash
npm install -g eas-cli expo-cli
```

### Step 3: Authenticate with EAS
```bash
eas login
# Follow prompts to authenticate with your Expo account
# Generates ~/.eas/credentials.json
```

### Step 4: Link Project to Expo
```bash
cd mobile-app
eas project:init
# Generates 'projectId' in eas.json
```

### Step 5: Configure Android
```bash
eas device:create
# For previewing on physical device (optional)
```

---

## 🏗️ BUILD PROCESS EXPLAINED

### What Happens During `eas build`:

1. **Code Analysis** (1-2 min)
   - Validates JavaScript/TypeScript
   - Checks dependencies
   - Verifies app.json configuration

2. **Build Queue** (0-5 min)
   - Your build joins EAS build servers queue
   - Free tier: may wait 2-5 minutes
   - Paid tier: prioritized

3. **Environment Setup** (2-3 min)
   - Spins up build machine
   - Installs dependencies
   - Sets up Android SDK

4. **Compilation** (3-5 min)
   - Compiles React Native code
   - Bundles JavaScript
   - Compiles native code
   - Creates APK binary

5. **Signing & Testing** (1-2 min)
   - Signs APK with certificate
   - Runs basic smoke tests
   - Generates download URL

6. **Download** (Instant)
   - QR code appears in terminal
   - Download link provided
   - APK ready to install

**Total Time**: 10-20 minutes

---

## 💾 INSTALLATION COMMANDS

### Option 1: Download from EAS Dashboard
```bash
# After build completes, EAS displays URL and QR code
# Scan QR code with phone or click link
# APK downloads and installs automatically
```

### Option 2: Command Line Installation
```bash
# Get the APK filename from build output
eas build:list
# Shows recent builds with URLs

# Download using curl
curl -o MSOMI_ALERT.apk [BUILD_URL_FROM_EAS]

# Connect Android device via USB
# Enable USB debugging on phone
adb install MSOMI_ALERT.apk
```

### Option 3: Via Android Studio
```bash
# Open Android Studio > Device Manager
# Start emulator or connect physical device
adb install -r build/MSOMI_ALERT.apk
```

---

## 🧪 TESTING BEFORE RELEASE

### Pre-Release Checklist

- [ ] **Functionality Test**
  - [ ] App starts without crashes
  - [ ] Registration works with test data
  - [ ] Can add courses
  - [ ] Demo mode loads all 4 scenarios
  - [ ] Offline indicator shows status

- [ ] **Network Test**
  - [ ] Works with mobile data
  - [ ] Works on WiFi
  - [ ] Offline mode detects connection loss
  - [ ] Falls back to demo mode if backend fails

- [ ] **Storage Test**
  - [ ] AsyncStorage persists data
  - [ ] SQLite database works
  - [ ] Document downloads save locally
  - [ ] Cache clears properly

- [ ] **Performance Test**
  - [ ] Startup time < 3 seconds
  - [ ] Registration response < 5 seconds
  - [ ] Scrolling is smooth (60 FPS)
  - [ ] Memory usage < 200MB
  - [ ] Battery drain minimal

- [ ] **Compatibility Test**
  - [ ] Android 6.0+ working
  - [ ] Notches handled properly
  - [ ] Portrait orientation forced
  - [ ] Navigation flows correctly

---

## 📈 RELEASE TO PRODUCTION

### Phase 1: Internal Testing (1 week)
```bash
# Build preview APK
eas build -p android --profile preview

# Share with 5-10 internal testers
# Collect feedback for 7 days
```

### Phase 2: Beta Release (1-2 weeks)
```bash
# Create Google Play internal testing track
# Build production AAB
eas build -p android --profile production

# Submit to Google Play Console
# Enable internal testing for 100 users
# Collect 50+ reviews with 4.0+ rating
```

### Phase 3: Public Release (1 week)
```bash
# If beta successful, shift to production track
# Release to 25% of users first
# Monitor crash rate for 3 days
# If stable, release to 100%
```

---

## 🔑 GOOGLE PLAY CONSOLE SETUP

### Prerequisites
- Google Play Developer Account ($25 one-time)
- Bank account for future monetization
- App identity (package name, icon, screenshots)

### Step-by-Step

1. **Create Developer Account**
   - Go to https://play.google.com/console
   - Pay $25 registration fee
   - Agree to policies

2. **Create Application**
   - Click "Create app"
   - App name: "MSOMI ALERT"
   - Default language: English
   - Category: Education
   - Content rating: Not rated yet

3. **Add App Details**
   - Screenshots (minimum 2)
   - Description: "Zero-cost offline notifications for Kenyan students"
   - Privacy policy URL
   - Support email

4. **Configure Release**
   - Internal testing track
   - Upload AAB file from EAS
   - Add release notes
   - Submit for review

5. **Review & Approval**
   - Google reviews (usually 24-48 hours)
   - May request fixes
   - Once approved, release to users

---

## 🚨 TROUBLESHOOTING

### Build Fails: "Gradle Error"
```
Error: gradleDependencies: Gradle error (stderr)
```
**Solution**: 
```bash
cd mobile-app
rm -rf node_modules package-lock.json
npm install
eas build -p android --profile preview --clear-cache
```

### Build Fails: "Out of Memory"
```
Error: Java heap space
```
**Solution**:
```bash
# This is on EAS servers, try again
# Or contact support: support@expo.io
```

### APK Won't Install: "Parse Error"
**Solution**:
- Uninstall previous version first: `adb uninstall com.msomi.alert`
- Ensure device has enough storage (>500MB)
- Try installing on different device

### App Crashes on Startup
**Solution**:
```bash
# Check logs
adb logcat | grep -i msomi

# Enable verbose logging in app.js
# Set `__DEV__ = true`
```

### "Your app needs Google Play Setup"
**Solution**:
- Go to Play Store settings
- Add privacy policy (even placeholder)
- Complete app content rating
- Submit again

---

## 📊 RELEASE CHECKLIST

Before hitting "Publish":
- [ ] Version number incremented (semver)
- [ ] All crashes fixed (0 crashes in 100 installs)
- [ ] Permissions justified in app description
- [ ] Privacy policy available at public URL
- [ ] Support email monitored
- [ ] Crash reporting enabled
- [ ] Analytics configured
- [ ] Screenshots updated
- [ ] Release notes written
- [ ] Category correct (Education)
- [ ] Target audience set (everyone 3+)
- [ ] Content verified

---

## 🎯 SUCCESS METRICS

After launch, monitor:
- Installs per day
- Active users per day
- Crash rate (target: <0.1%)
- Session length
- Feature usage
- Network errors
- Offline success rate

---

## 🔄 UPDATE PROCESS

When you need to update the app:

```bash
# 1. Update version in app.json
"version": "1.0.1"

# 2. Build new version
eas build -p android --profile production

# 3. Submit to Google Play Console
# - Upload new AAB
# - Add release notes
# - Submit for review

# 4. Rollout strategy
# - Start with 10% users
# - Monitor for crashes
# - Increase to 100% if stable
```

**Typical update cycle**: 2-3 days from code change to all users

---

## 📞 SUPPORT & RESOURCES

- **Expo Docs**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction
- **Google Play Console**: https://play.google.com/console
- **React Native**: https://reactnative.dev
- **Firebase Cloud Messaging**: https://firebase.google.com/docs/cloud-messaging

---

## 💰 COST ANALYSIS

### EAS Build (Free Tier)
- **5 builds/month**: $0
- **Speed**: 10-20 min
- **Storage**: 15GB

### EAS Build (Pro Tier)
- **Unlimited builds**: $99/month
- **Speed**: Priority queue
- **Concurrency**: 5 simultaneous builds

### Google Play Console
- **Developer account**: $25 one-time
- **Per-app listing**: Free
- **Transaction fees**: 15-30% (if monetizing)

### Distribution (Render Backend)
- **Free tier**: $0/month (512MB RAM)
- **Paid tier**: $7+/month (scales with usage)

**Total Cost to Launch**: $25-50 one-time

---

## ✅ YOU ARE NOW READY TO:

✅ Build a preview APK in <15 minutes  
✅ Install on any Android 6.0+ device  
✅ Test with real users  
✅ Submit to Google Play Store  
✅ Release to students in Kenya  

🚀 **MSOMI ALERT is ready for the world!** 🇰🇪

---

**Next Step**: Run the build!
```bash
cd mobile-app
eas build -p android --profile preview
```

Watch the magic happen. ✨
