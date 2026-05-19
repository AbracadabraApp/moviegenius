# Firebase Crashlytics Setup Guide
**Status:** ✅ CURRENT
**Last Updated:** 2026-05-18
**Estimated Time:** 20-30 minutes (Quick Start: 20 min | Detailed: 30 min)
**Goal:** Get crash reports from beta testers automatically
**Consolidates:** FIREBASE_QUICK_START.md merged as Quick Start section

---

## Table of Contents

1. [Quick Start](#quick-start) - Command-driven (20 minutes)
2. [Why Firebase Crashlytics?](#why-firebase-crashlytics)
3. [Detailed Setup](#detailed-setup) - With explanations (30 minutes)
4. [Troubleshooting](#troubleshooting)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Cost & Security](#cost--security)

---

## Quick Start

**For developers who just need the commands:**

### Step 1: Create Firebase Project (5 min)
1. Go to: https://console.firebase.google.com/
2. Click "Add project"
3. Project name: `moviegenius-ios`
4. Enable Google Analytics: Yes
5. Click "Create project"

### Step 2: Add iOS App (3 min)
1. Click iOS icon (⊕)
2. Bundle ID: `moviegenius.moviegenius`
3. App nickname: `MovieGenius iOS`
4. Register app
5. Download `GoogleService-Info.plist` to Desktop
6. Click "Next" → "Next" → "Continue to console"

### Step 3: Add Firebase SDK (5 min)
1. Xcode → File → Add Package Dependencies
2. URL: `https://github.com/firebase/firebase-ios-sdk.git`
3. Version: Up to Next Major `11.0.0`
4. Select: ✅ FirebaseAnalytics, ✅ FirebaseCrashlytics
5. Add Package

### Step 4: Add Config File (1 min)
1. Drag `GoogleService-Info.plist` into Xcode navigator
2. Check: ✅ Copy items, ✅ moviegenius target

### Step 5: Enable in Code (1 min)
**Edit `moviegeniusApp.swift`:**
```swift
import SwiftUI
import FirebaseCore
import FirebaseCrashlytics

@main
struct moviegeniusApp: App {
    init() {
        FirebaseApp.configure()  // Add this line
        configureURLCache()
    }
    // ... rest
}
```

### Step 6: Add Upload Script (3 min)
1. Xcode → Project → moviegenius target → Build Phases
2. Click ➕ → New Run Script Phase
3. Drag after "Compile Sources"
4. Rename: "Upload dSYMs to Crashlytics"
5. Script:
   ```bash
   "${BUILD_DIR%/Build/*}/SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run"
   ```
6. Check ☑️ "Based on dependency analysis"

### Step 7: Verify (2 min)
1. Build & Run (⌘R) on device
2. Wait 2 minutes
3. Check Firebase Console → Crashlytics
4. Should see: "Viewing data from 1 user"
5. ✅ Done!

---

## Why Firebase Crashlytics?

**Benefits:**
- ✅ **Free** for your usage level (unlimited crashes tracked)
- ✅ **Real-time crash alerts** - email when app crashes
- ✅ **Device details** - iOS version, device model, memory state
- ✅ **Stack traces** - exact line of code that crashed
- ✅ **Crash-free rate** - see % of users affected
- ✅ **Zero code required** in ViewModels (crashes auto-detected)

**What You Get:**
- Automatic crash detection (no code in ViewModels)
- Email alerts when crashes occur
- Crash-free user percentage
- Top crashes ranked by impact
- Device and OS version breakdown

---

## Detailed Setup

**For first-time setup with full explanations:**

### Step 1: Create Firebase Project (10 minutes)

Firebase projects are free containers for your app's backend services.

1. **Go to:** https://console.firebase.google.com/

2. **Click:** "Add project"

3. **Enter project name:** `moviegenius-ios`
   - This name is only visible to you
   - Can be different from your app name

4. **Google Analytics:**
   - ✅ Enable Google Analytics (optional but recommended)
   - Provides user behavior insights (not just crashes)
   - Accept terms
   - Click "Continue"

5. **Click:** "Create project"

6. **Wait:** ~30 seconds for project creation
   - Firebase creates your project backend
   - Sets up default services

**Why this step:** Firebase needs a project container before you can add your iOS app.

---

### Step 2: Add iOS App to Firebase (5 minutes)

This connects your iOS app to the Firebase project.

1. **Click:** iOS icon (⊕ Add app → iOS)

2. **iOS bundle ID:**
   - Open Xcode → MovieGenius project → General tab
   - Copy "Bundle Identifier" (e.g., `moviegenius.moviegenius`)
   - Paste into Firebase "Apple bundle ID" field
   - **Must match exactly** - Firebase uses this to identify your app

3. **App nickname:** `MovieGenius iOS`
   - Friendly name for Firebase Console
   - Can be anything

4. **App Store ID:** Leave blank
   - Fill in after App Store submission
   - Not needed for TestFlight

5. **Click:** "Register app"

6. **Download GoogleService-Info.plist:**
   - Click "Download GoogleService-Info.plist"
   - **Important:** Save this file somewhere safe (Desktop is fine)
   - This file contains your app's Firebase configuration
   - Click "Next"

7. **Add config file to Xcode:**
   - Open Xcode
   - Drag `GoogleService-Info.plist` from Desktop into project navigator
   - **Drop location:** Root level (same level as Info.plist)
   - ✅ Check "Copy items if needed" (important!)
   - ✅ Check "moviegenius" target (not moviegensiusTests)
   - Click "Finish"
   - **Verify:** File appears in Xcode navigator (gray text = not copied, black text = copied correctly)

**Why this step:** `GoogleService-Info.plist` tells Firebase SDK which project your app belongs to.

---

### Step 3: Install Firebase SDK via SPM (10 minutes)

**Note:** We use Swift Package Manager (not CocoaPods) for simplicity.

1. **In Xcode:**
   - File → Add Package Dependencies...

2. **Enter URL:**
   ```
   https://github.com/firebase/firebase-ios-sdk.git
   ```

3. **Dependency Rule:**
   - Select "Up to Next Major Version"
   - Enter: `11.0.0`
   - This means: use any version 11.x.x (automatically gets updates)

4. **Click:** "Add Package"

5. **Wait:** 30-60 seconds for package resolution
   - Xcode downloads package list from GitHub
   - Calculates dependencies

6. **Select Products:**
   - ✅ Check **FirebaseAnalytics** (for basic analytics)
   - ✅ Check **FirebaseCrashlytics** (for crash reporting)
   - ❌ Uncheck everything else (we don't need Auth, Firestore, etc.)

7. **Click:** "Add Package"

8. **Wait:** Packages download and integrate (~60 seconds)
   - Downloads ~50MB of libraries
   - Compiles and integrates with your app

**Why these packages:**
- **FirebaseCore:** Required base library (included automatically)
- **FirebaseAnalytics:** Basic app usage analytics (free tier)
- **FirebaseCrashlytics:** Crash reporting (what we need)

---

### Step 4: Initialize Firebase in Code (5 minutes)

Tell Firebase to start when your app launches.

**Edit `moviegeniusApp.swift`:**

Open `/ios/moviegenius/moviegenius/moviegeniusApp.swift`

1. **Add imports at top:**
   ```swift
   import FirebaseCore
   import FirebaseCrashlytics
   ```

2. **Initialize in init():**
   ```swift
   init() {
       // Configure Firebase FIRST (before anything else)
       FirebaseApp.configure()

       // Then your existing setup
       configureURLCache()
   }
   ```

**Full file should look like:**
```swift
import SwiftUI
import FirebaseCore
import FirebaseCrashlytics

@main
struct moviegeniusApp: App {
    init() {
        // Initialize Firebase for crash reporting
        FirebaseApp.configure()

        // Then configure app-specific settings
        configureURLCache()
    }

    var body: some Scene {
        WindowGroup {
            MainTabView()
        }
    }

    private func configureURLCache() {
        // Configure global URLCache for AsyncImage poster caching
        // 50 MB memory for quick access to recently viewed posters
        // 200 MB disk for persistent cache across app launches
        let memoryCapacity = 50 * 1024 * 1024
        let diskCapacity = 200 * 1024 * 1024
        URLCache.shared = URLCache(
            memoryCapacity: memoryCapacity,
            diskCapacity: diskCapacity
        )
    }
}
```

**Why `init()`:** This runs once when the app launches, before any views are created.

**Why first:** Firebase must be configured before any Firebase services are used.

---

### Step 5: Enable Debug Symbols Upload (5 minutes)

**This is critical** - without this, crashes show memory addresses instead of your code.

**What are dSYMs?**
- Debug symbol files that map crash addresses → your code
- Xcode generates them during build
- Firebase needs them to show readable crash reports

**Setup:**

1. **In Xcode:**
   - Select project "moviegenius" in navigator (top item)
   - Select "moviegenius" target (under TARGETS)
   - Build Phases tab

2. **Add Run Script:**
   - Click ➕ at top left → "New Run Script Phase"
   - Drag it to be **after** "Compile Sources" (important for order)
   - Double-click "Run Script" to rename
   - Rename to: "Upload dSYMs to Crashlytics"

3. **Paste this script:**
   ```bash
   "${BUILD_DIR%/Build/*}/SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run"
   ```
   - This is Firebase's upload script
   - Runs after each build
   - Uploads dSYMs automatically

4. **Input Files:** Leave empty

5. **Output Files:** Leave empty

6. **Click:** ☑️ "Based on dependency analysis"
   - Optimizes when script runs
   - Only runs when needed

**Why this step:** Without dSYMs, crash reports look like:
```
0x10004a2b8
0x10004a3c4
0x10004a4f0
```

With dSYMs:
```
MovieDetailViewModel.swift:45 - loadMovie()
APIClient.swift:123 - fetchMovieDetails()
NetworkManager.swift:89 - request()
```

---

### Step 6: Test Crashlytics (5 minutes)

Verify Firebase is receiving crash reports.

**Add test crash button (remove after testing):**

1. **Edit any view for testing** (e.g., ContentView.swift):
   ```swift
   import FirebaseCrashlytics

   struct TestCrashView: View {
       var body: some View {
           VStack {
               Text("Testing Crashlytics")

               Button("Test Crash (Remove After Testing)") {
                   fatalError("Test crash for Firebase verification")
               }
               .padding()
               .background(.red.opacity(0.2))
           }
       }
   }
   ```

2. **Build and run on device:**
   - Cmd+R to build and launch
   - App launches successfully

3. **Tap "Test Crash" button:**
   - App crashes immediately
   - iPhone returns to home screen

4. **Relaunch app:**
   - Tap app icon again from home screen
   - (Crash report uploads in background during launch)

5. **Check Firebase Console:**
   - Go to Firebase Console → Crashlytics
   - Wait 2-5 minutes (not instant)
   - **You should see:** "Test crash for Firebase verification" in crash list
   - **If you see it:** ✅ Crashlytics working perfectly!
   - Click on crash to see stack trace

6. **Remove test crash code** before TestFlight submission
   - Delete or comment out the test crash button
   - Clean build: Cmd+Shift+K

**Why this step:** Confirms end-to-end crash reporting works.

---

### Step 7: Configure Build Settings (Optional but Recommended)

**Enable Crashlytics Debug Mode (development only):**

Makes crashes upload immediately instead of waiting for next app launch.

**Setup:**
1. In Xcode: Edit Scheme → Run → Arguments tab
2. Environment Variables section → Click ➕
3. Add:
   - **Name:** `FIRDebugEnabled`
   - **Value:** `YES`

**Important:** Disable for production builds (remove before App Store submission).

**When to use:**
- Development builds: Enabled (see crashes immediately)
- TestFlight builds: Disabled (normal behavior)
- App Store builds: Disabled (must be disabled)

---

## Verification Checklist

Before shipping to TestFlight, verify:

- [ ] `GoogleService-Info.plist` is in Xcode project (black text, not gray)
- [ ] Firebase SPM packages added (FirebaseCore, FirebaseCrashlytics)
- [ ] `FirebaseApp.configure()` called in app init (before other code)
- [ ] Upload dSYMs run script added to Build Phases
- [ ] Run script is **after** "Compile Sources" phase
- [ ] Test crash appears in Firebase Console within 5 minutes
- [ ] Test crash code removed from app
- [ ] Build succeeds with no Firebase-related errors

---

## Troubleshooting

### "GoogleService-Info.plist not found" error
**Cause:** File not in app bundle or not copied properly.

**Fix:**
1. Check file is in project root (same level as Info.plist)
2. Check file is black text in navigator (not gray)
3. Select file → File Inspector → Target Membership → Check "moviegenius"
4. Clean build folder: Cmd+Shift+K, then rebuild

### "No crashes appearing in Firebase Console"
**Cause:** Crashes upload on next app launch, not immediately.

**Fix:**
1. Wait 5-10 minutes (batch upload, not instant)
2. Relaunch app after crash (crashes upload during launch)
3. Verify `FirebaseApp.configure()` is called BEFORE any other code
4. Check internet connection on device
5. Check Xcode console for Firebase debug logs

### "Missing dSYM file" warning in Firebase
**Cause:** Upload script not running or incorrect path.

**Fix:**
1. Verify Run Script is added to Build Phases
2. Verify script path matches exactly (from Step 5)
3. Verify script is **after** "Compile Sources" phase
4. Clean build and rebuild: Cmd+Shift+K
5. Check Build Phases → Run Script → Check "Based on dependency analysis"

### Build errors after adding Firebase
**Cause:** Missing package or Xcode cache issue.

**Fix:**
1. Check you added FirebaseCore AND FirebaseCrashlytics (both required)
2. File → Packages → Reset Package Caches
3. Clean build: Cmd+Shift+K
4. Restart Xcode
5. If still failing, remove and re-add packages

### "No module named 'FirebaseCore'"
**Cause:** Swift Package Manager didn't add the package.

**Fix:**
1. File → Packages → Resolve Package Versions
2. Repeat Step 3 (Add Firebase SDK)
3. Restart Xcode

---

## Monitoring & Alerts

### During Beta 1 (Week 1)

**Check Crashlytics daily:**
- **Green flag:** Crash-free rate > 99% (excellent)
- **Yellow flag:** Crash-free rate 95-99% (some users crashing, investigate)
- **Red flag:** Crash-free rate < 95% (many users crashing, urgent fix needed)

**Key Metrics to Watch:**
1. **Crash-free users:** What % of users never crashed?
   - Goal: > 99%
2. **Top crashes:** Which crash is most common?
   - Fix highest-impact crashes first
3. **Affected devices:** Is it only iPhone SE? Only iOS 17?
   - Device-specific bugs
4. **Crash velocity:** Are crashes increasing or decreasing over time?
   - Regression detection

### Firebase Console Quick Guide

**View crashes:**
1. Go to Firebase Console → Crashlytics
2. Dashboard shows:
   - Crash-free users percentage
   - Total crashes (events)
   - Affected users
3. Click on a crash to see:
   - **Stack trace** - exact line of code that crashed
   - **Device info** - iPhone model, iOS version, memory
   - **Logs before crash** - what user was doing
   - **Number of users affected** - is it widespread?
   - **First seen / Last seen** - when did it start?

**Set up email alerts:**
1. Firebase Console → Project Settings (gear icon)
2. Integrations tab
3. Crashlytics section
4. Enable:
   - ✅ New crash detected
   - ✅ Crash rate increased
   - ✅ Regression detected
5. Add your email
6. Click "Save"

**What to monitor:**
- Check daily during beta
- Fix crashes with >10 users affected immediately
- Fix crashes affecting >1% of users within 24 hours
- Nice-to-fix: Rare crashes (<0.1% of users)

---

## Cost & Security

### Pricing

**Free tier includes:**
- Unlimited crash events (no limit)
- 30 days of crash history
- Basic analytics
- Email alerts
- Crashlytics dashboard

**You will NOT hit paid tier** unless you have 100K+ users.

**For MovieGenius beta (100-1000 users):** Free forever.

### Security

**GoogleService-Info.plist:**
- Contains Firebase API keys
- **Safe to commit to private repo** - keys are client-side identifiers, not secrets
- **DO NOT commit** if repo is public - add to `.gitignore`:
  ```
  GoogleService-Info.plist
  ```

**What Firebase can access:**
- Crash reports (stack traces, device info)
- Basic analytics (app opens, screen views - if Analytics enabled)
- **Cannot access:** User data in your database, user content, passwords

**Firebase Security Rules:**
- Protect backend data (if using Firestore/Realtime Database)
- Users cannot access others' data
- Rules configured in Firebase Console

---

## Next Steps After Setup

1. ✅ **Remove test crash code**
2. ✅ **Build for TestFlight** (Product → Archive)
3. ✅ **Install on your device**
4. ✅ **Use app for 24 hours** (catch obvious crashes)
5. ✅ **Check Crashlytics** for any crashes
6. ✅ **Fix crashes** before inviting beta testers
7. ✅ **Invite beta testers** when crash-free
8. ✅ **Monitor daily** during beta period

---

## Resources

**Official Documentation:**
- Firebase iOS Setup: https://firebase.google.com/docs/ios/setup
- Crashlytics Get Started: https://firebase.google.com/docs/crashlytics/get-started?platform=ios
- Crashlytics API: https://firebase.google.com/docs/reference/swift/firebasecrashlytics/api/reference/Classes

**Support:**
- Stack Overflow: Tag `firebase-crashlytics`
- Firebase Support: In console → Support tab
- GitHub Issues: https://github.com/firebase/firebase-ios-sdk/issues

---

**Setup complete? Run through MANUAL_TESTING_CHECKLIST.md next.**

---

## Change Log

**2026-05-18:**
- Consolidated FIREBASE_QUICK_START.md into Quick Start section
- Added detailed explanations for first-time setup
- Updated to Firebase SDK 11.0.0
- Added troubleshooting for common issues
- Clarified security notes
