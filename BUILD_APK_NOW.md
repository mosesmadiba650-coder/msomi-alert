# 🚀 BUILD APK - STEP-BY-STEP GUIDE

**Status**: All code complete. Ready to build.  
**Date**: February 25, 2026

---

## ⚡ QUICK START (5 minutes to build start)

### Step 1: Setup Expo Account (One-time)
```powershell
cd "C:\Users\Admin\Desktop\ANCESTRAL CODE\mobile-app"

# Login to Expo
npx expo login
# You'll be asked for:
# - Email
# - Password
# Then authorization code will be emailed

# Verify login
npx expo whoami
# Should show your username
```

### Step 2: Initialize EAS (One-time)
```powershell
# This creates the project link
npx eas@latest project:init

# It will ask:
# - Expo account username (auto-filled from login)
# - Project slug (keep as "msomi-alert")
# - Choose Android development method: "managed"
```

### Step 3: Build Preview APK
```powershell
# This starts the build
npx eas@latest build -p android --profile preview

# You'll see:
# "✓ Authenticated with Expo account"
# "✓ Using profile 'preview' for Android"
# "✓ Building APK (internal testing)"
# "✓ Build queued"
```

### Step 4: Wait & Download
```powershell
# Build takes 10-20 minutes
# You'll get a link like:
# https://expo.dev/artifacts/xxxxxxxx

# Or check status:
npx eas@latest build:list

# When ready, download the APK file
```

---

## 📱 INSTALLATION ON ANDROID DEVICE

### Option A: Direct Install (USB Cable)
```powershell
# Connect Android phone via USB

# Enable USB Debugging on phone:
# Settings > Developer Options > USB Debugging (toggle on)
# (If no Developer Options, tap Build Number 7 times)

# Install APK:
adb devices  # Verify phone is listed
adb install -r path\to\MSOMI_ALERT_preview.apk

# Or drop APK directly in phone downloads folder
```

### Option B: QR Code
```
- Download APK to phone
- Find QR code in build output
- Scan with device to install directly
```

### Option C: Download Link
```
- Check email after build completes
- Click download link
- Tap "Install" on phone
```

---

## ✅ TEST CHECKLIST AFTER INSTALL

```
After APK installs, run through:

STARTUP
✅ App launches without crash
✅ Welcome screen shows
✅ "Zero-cost offline notifications" subtitle visible

REGISTRATION
✅ Can type student name
✅ Can type phone number
✅ Can add courses (type in box + enter)
✅ Can remove courses (tap X)
✅ Register button clickable

DEMO MODE
✅ Demo mode shows all scenarios
✅ Notifications visible
✅ Urgency levels display correctly

OFFLINE
✅ Toggle airplane mode on
✅ App still works
✅ "Offline" indicator shows
✅ Documents still viewable
✅ No crash when offline

NETWORK
✅ Toggle airplane mode off
✅ App re-connects
✅ Offline indicator disappears
✅ Backend communication works

PERFORMANCE
⏱️ App startup < 3 seconds
⏱️ Navigation smooth (no lag)
⏱️ No memory warnings
⏱️ No crashes after 10 minutes usage
```

---

## 🔍 TROUBLESHOOTING

### Build Fails: "Not authenticated"
```powershell
# Solution: Login first
npx expo login
# Re-run build command
```

### Build Fails: "Project not found"
```powershell
# Solution: Initialize project
npx eas@latest project:init
# Re-run build command
```

### Build Fails: "Invalid profile"
```powershell
# Solution: Check eas.json for "preview" profile exists
# It should be there (we created it)
# If not: Re-run npx eas@latest project:init
```

### APK won't install: "Parse error"
```
Solution: 
- Delete old MSOMI app first
- Try ADB install again
- Or download via QR code
```

### App crash on startup
```powershell
# Check logs:
adb logcat | findstr MSOMI

# Or run in Expo:
npx expo start --android
# This shows real-time errors
```

---

## 📊 BUILD PROFILES

When you run `npx eas build -p android`, you can choose profile:

| Profile | Use Case | Size |
|---------|----------|------|
| `--profile preview` | Internal testing, QA | ~85MB |
| `--profile production` | Google Play Store | ~50MB (AAB) |
| `--profile development` | Local testing | ~90MB |

For today: Use **preview** for testing

---

## ⏱️ TIME ESTIMATES

| Task | Time |
|------|------|
| Setup Expo account | 5 min |
| Initialize EAS | 2 min |
| Start build | 1 min |
| Build completes | 10-20 min |
| Download APK | 1-5 min |
| Install on phone | 2 min |
| **TOTAL** | **~30-35 minutes** |

---

## 🎯 WHAT HAPPENS NEXT

### After successful test:
1. **Backend deployed** → Render auto-deploys from GitHub
2. **APK ready** → Can share with team/judges
3. **Production build** → Build AAB for Play Store
4. **Market launch** → Submit to Google Play Console

---

## 📞 IF YOU GET STUCK

**Common issues**:
1. No Expo account? → Create at https://expo.dev
2. Build fails? → Check Sentry.io for errors
3. APK won't run? → Check firebase config
4. Token issues? → Check backend `/api/fcm/test-token`

**Debugging**:
```bash
# Check backend health
curl https://msomi-alert.onrender.com/health

# Check queue status
curl https://msomi-alert.onrender.com/api/queue/status

# View app logs
adb logcat | grep MSOMI
```

---

## 🚀 YOU'RE READY!

All code is in place. Just run:

```powershell
cd "C:\Users\Admin\Desktop\ANCESTRAL CODE\mobile-app"
npx eas@latest build -p android --profile preview
```

**Estimated time to testable APK: 30 minutes**

Good luck! 🎉
