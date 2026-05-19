# Firebase Crashlytics - Quick Start

**Time:** 20 minutes | **Status:** Ready to configure

---

## ✅ Prerequisites Complete

- Code prepared with Firebase initialization (commented out until setup)
- Bundle ID: `moviegenius.moviegenius`
- Xcode project ready

---

## Step 1: Create Firebase Project (5 min)

1. Go to: **https://console.firebase.google.com/**
2. Click **"Add project"**
3. Project name: **`moviegenius-ios`**
4. Enable Google Analytics: **Yes** (recommended)
5. Click **"Create project"**
6. Wait ~30 seconds

---

## Step 2: Add iOS App (3 min)

1. Click **iOS icon** (⊕ Add app → iOS)
2. **Bundle ID:** `moviegenius.moviegenius`
3. **App nickname:** `MovieGenius iOS`
4. **App Store ID:** Leave blank
5. Click **"Register app"**
6. Click **"Download GoogleService-Info.plist"**
   - Save to Desktop
7. Click **"Next"** → **"Next"** → **"Continue to console"**

---

## Step 3: Add Firebase SDK to Xcode (5 min)

1. **Open Xcode** → MovieGenius project
2. **File** → **Add Package Dependencies...**
3. **URL:**
   ```
   https://github.com/firebase/firebase-ios-sdk.git
   ```
4. **Version:** Up to Next Major `11.0.0`
5. Click **"Add Package"** (wait ~60 seconds)
6. **Select products:**
   - ✅ **FirebaseAnalytics**
   - ✅ **FirebaseCrashlytics**
   - ❌ Uncheck all others
7. Click **"Add Package"** (wait ~60 seconds)

---

## Step 4: Add GoogleService-Info.plist to Xcode (1 min)

1. **Drag** `GoogleService-Info.plist` from Desktop into Xcode navigator
2. **Check:**
   - ✅ Copy items if needed
   - ✅ moviegenius target
3. Click **"Finish"**
4. **Verify:** File appears next to Info.plist in navigator

---

## Step 5: Enable Firebase in Code (1 min)

**Edit `moviegeniusApp.swift`:**

1. **Uncomment these lines:**
   ```swift
   import FirebaseCore
   import FirebaseCrashlytics
   ```

2. **Uncomment this line in init():**
   ```swift
   FirebaseApp.configure()
   ```

**File should now look like:**
```swift
import SwiftUI
import FirebaseCore
import FirebaseCrashlytics

@main
struct moviegeniusApp: App {
    init() {
        FirebaseApp.configure()
        configureURLCache()
    }
    // ... rest of file
}
```

3. **Build app** (⌘B) - should succeed with no errors

---

## Step 6: Add Upload dSYMs Script (3 min)

**Critical for readable crash reports!**

1. **Select project** in Xcode navigator
2. **Select "moviegenius" target**
3. **Build Phases tab**
4. Click **➕** → **"New Run Script Phase"**
5. **Drag it** to be **after "Compile Sources"**
6. **Rename:** "Upload dSYMs to Crashlytics"
7. **Paste script:**
   ```bash
   "${BUILD_DIR%/Build/*}/SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run"
   ```
8. **Check:** ☑️ "Based on dependency analysis"

---

## Step 7: Test Crash Reporting (5 min)

1. **Build & Run** app on your iPhone (⌘R)
2. **Let app launch** completely
3. **Force quit** the app (swipe up from app switcher)
4. **Wait 2 minutes**
5. **Go to Firebase Console** → Crashlytics dashboard
6. **Look for:** "Viewing data from 1 user in the last 90 days"
7. **Status:** ✅ Firebase connected (even with 0 crashes)

---

## Step 8: Test Crash Detection (Optional but Recommended)

**Add temporary test crash:**

1. **Edit `ContentView.swift`** (bottom of file):
   ```swift
   // TEMPORARY: Remove after verifying Crashlytics works
   #if DEBUG
   struct TestCrashButton: View {
       var body: some View {
           Button("🧪 Test Crash (Remove Me)") {
               fatalError("Test crash for Crashlytics verification")
           }
           .padding()
           .background(.red.opacity(0.2))
       }
   }
   #endif
   ```

2. **Add to ContentView** body:
   ```swift
   VStack {
       // Your existing content

       #if DEBUG
       TestCrashButton()
       #endif
   }
   ```

3. **Run app** (⌘R)
4. **Tap "Test Crash" button** → app crashes
5. **Relaunch app** from home screen
6. **Wait 5 minutes**
7. **Check Firebase Console** → Crashlytics → Should show 1 crash
8. **Remove test crash code** after verification

---

## Verification Checklist

After setup:

- [ ] App builds successfully (⌘B)
- [ ] Firebase shows "1 user in last 90 days"
- [ ] Test crash appears in Firebase Console (if you ran test)
- [ ] Email alerts enabled in Firebase → Project Settings → Integrations

---

## Troubleshooting

### "No module named 'FirebaseCore'"
**Fix:** Firebase SDK not added. Repeat Step 3.

### "GoogleService-Info.plist not found"
**Fix:** Drag plist file into Xcode navigator (Step 4).

### Crashes not appearing in Firebase
**Fix:**
1. Wait 5-10 minutes (crashes batch upload)
2. Check internet connection on device
3. Verify GoogleService-Info.plist is in app bundle

### "Upload script failed"
**Fix:** Check script path is exactly:
```
"${BUILD_DIR%/Build/*}/SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run"
```

---

## Success Criteria

✅ **Ready for TestFlight when:**
- Build succeeds with Firebase imports
- Firebase Console shows your app connected
- Email alerts configured
- Test crash code removed

---

## What's Next?

After Firebase is configured:
1. ✅ Archive app for TestFlight (Product → Archive)
2. ✅ Upload to App Store Connect
3. ✅ Monitor crashes from beta testers

**Total time from here to TestFlight:** ~1 hour

---

## Resources

- **Firebase Console:** https://console.firebase.google.com/
- **Crashlytics Docs:** https://firebase.google.com/docs/crashlytics
- **Support:** Firebase support in console

---

**Ready to start?** Follow steps 1-7 in order. Each step is ~5 minutes or less.
