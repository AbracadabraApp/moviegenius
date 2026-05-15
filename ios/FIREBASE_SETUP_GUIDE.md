# Firebase Crashlytics Setup Guide

**Estimated Time:** 30 minutes
**Goal:** Get crash reports from beta testers automatically

---

## Why Firebase Crashlytics?

- ✅ **Free** for your usage level (unlimited crashes tracked)
- ✅ **Real-time crash alerts** - email when app crashes
- ✅ **Device details** - iOS version, device model, memory state
- ✅ **Stack traces** - exact line of code that crashed
- ✅ **Crash-free rate** - see % of users affected
- ✅ **Zero code required** in ViewModels (crashes auto-detected)

---

## Step 1: Create Firebase Project (10 minutes)

1. **Go to:** https://console.firebase.google.com/

2. **Click:** "Add project"

3. **Enter project name:** `moviegenius-ios`

4. **Google Analytics:**
   - ✅ Enable Google Analytics (optional but recommended)
   - Accept terms
   - Click "Continue"

5. **Click:** "Create project"

6. **Wait:** ~30 seconds for project creation

---

## Step 2: Add iOS App to Firebase (5 minutes)

1. **Click:** iOS icon (⊕ Add app → iOS)

2. **iOS bundle ID:**
   - Open Xcode → MovieGenius project → General tab
   - Copy "Bundle Identifier" (e.g., `com.yourname.moviegenius`)
   - Paste into Firebase "Apple bundle ID" field

3. **App nickname:** `MovieGenius iOS`

4. **App Store ID:** Leave blank (fill in after App Store submission)

5. **Click:** "Register app"

6. **Download GoogleService-Info.plist:**
   - Click "Download GoogleService-Info.plist"
   - **Important:** Save this file somewhere safe
   - Click "Next"

7. **Add config file to Xcode:**
   - Open Xcode
   - Drag `GoogleService-Info.plist` into project navigator
   - ✅ Check "Copy items if needed"
   - ✅ Check "moviegenius" target
   - Click "Finish"
   - **Verify:** File appears in Xcode navigator (same level as Info.plist)

---

## Step 3: Install Firebase SDK via SPM (10 minutes)

**Note:** We're using Swift Package Manager (not CocoaPods) for simplicity.

1. **In Xcode:**
   - File → Add Package Dependencies...

2. **Enter URL:**
   ```
   https://github.com/firebase/firebase-ios-sdk.git
   ```

3. **Dependency Rule:**
   - Select "Up to Next Major Version"
   - Enter: `11.0.0`

4. **Click:** "Add Package"

5. **Wait:** 30-60 seconds for package resolution

6. **Select Products:**
   - ✅ Check **FirebaseAnalytics** (for basic analytics)
   - ✅ Check **FirebaseCrashlytics** (for crash reporting)
   - ❌ Uncheck everything else

7. **Click:** "Add Package"

8. **Wait:** Packages download and integrate (~60 seconds)

---

## Step 4: Initialize Firebase in Code (5 minutes)

**Edit moviegeniusApp.swift:**

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

---

## Step 5: Enable Debug Symbols Upload (5 minutes)

**This is critical - without this, crashes show gibberish instead of your code.**

1. **In Xcode:**
   - Select project "moviegenius" in navigator
   - Select "moviegenius" target
   - Build Phases tab

2. **Add Run Script:**
   - Click ➕ at top left → "New Run Script Phase"
   - Drag it to be **after** "Compile Sources"
   - Rename to: "Upload dSYMs to Crashlytics"

3. **Paste this script:**
   ```bash
   "${BUILD_DIR%/Build/*}/SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run"
   ```

4. **Input Files:** Leave empty

5. **Output Files:** Leave empty

6. **Click:** ☑️ "Based on dependency analysis"

---

## Step 6: Test Crashlytics (5 minutes)

**Add test crash button (remove after testing):**

1. **Edit ContentView.swift** (or any view for testing):
   ```swift
   import FirebaseCrashlytics

   struct TestCrashView: View {
       var body: some View {
           Button("Test Crash") {
               fatalError("Test crash for Firebase")
           }
       }
   }
   ```

2. **Build and run on device:**
   - Cmd+R to build
   - App launches
   - Tap "Test Crash" button
   - App crashes

3. **Relaunch app:**
   - Tap app icon again
   - (Crash report uploads in background)

4. **Check Firebase Console:**
   - Go to Firebase Console → Crashlytics
   - Wait 2-3 minutes
   - **You should see:** "Test crash for Firebase" in crash list
   - **If you see it:** ✅ Crashlytics working!

5. **Remove test crash code** before beta

---

## Step 7: Configure Build Settings (Optional but Recommended)

**Enable Crashlytics Debug Mode (development only):**

In Xcode:
- Edit Scheme → Run → Arguments
- Add environment variable:
  - **Key:** `FIRDebugEnabled`
  - **Value:** `YES`

**This makes crashes upload immediately instead of waiting for next launch.**

**Disable for production builds** (remove before App Store submission).

---

## Verification Checklist

Before shipping to TestFlight:

- [ ] `GoogleService-Info.plist` is in Xcode project
- [ ] Firebase SPM packages added (FirebaseCore, FirebaseCrashlytics)
- [ ] `FirebaseApp.configure()` called in app init
- [ ] Run script added to Build Phases
- [ ] Test crash appears in Firebase Console within 5 minutes
- [ ] Test crash code removed

---

## Troubleshooting

**"GoogleService-Info.plist not found" error:**
- Check file is in project root (same level as Info.plist)
- Check file is in "Copy Bundle Resources" build phase
- Clean build folder: Cmd+Shift+K, then rebuild

**"No crashes appearing in Firebase Console:"**
- Wait 5 minutes (not instant)
- Check you relaunched app after crash (reports upload on next launch)
- Verify `FirebaseApp.configure()` is called BEFORE any other code
- Check Xcode console for Firebase debug logs

**"Missing dSYM file" warning in Firebase:**
- Verify Run Script is added to Build Phases
- Verify script path is correct (from Step 5)
- Clean build and rebuild: Cmd+Shift+K

**Build errors after adding Firebase:**
- Check you added FirebaseCore AND FirebaseCrashlytics (both required)
- Try File → Packages → Reset Package Caches
- Restart Xcode

---

## What to Monitor

**During Beta 1 (Week 1):**
- Check Crashlytics daily
- **Green flag:** Crash-free rate > 99%
- **Yellow flag:** Crash-free rate 95-99% (some users crashing)
- **Red flag:** Crash-free rate < 95% (many users crashing)

**Key Metrics:**
1. **Crash-free users:** What % of users never crashed?
2. **Top crashes:** Which crash is most common?
3. **Affected devices:** Is it only iPhone SE? Only iOS 17?
4. **Crash velocity:** Are crashes increasing or decreasing over time?

---

## Firebase Console Quick Guide

**View crashes:**
1. Go to Firebase Console → Crashlytics
2. Click on a crash to see:
   - Stack trace (exact line of code)
   - Device info (iPhone model, iOS version)
   - Logs before crash
   - Number of users affected

**Set up alerts:**
1. Firebase Console → Crashlytics → Settings (gear icon)
2. Enable email alerts:
   - ✅ New crash detected
   - ✅ Crash rate increased
3. Add your email

**Download crash reports:**
- Click crash → "Export to BigQuery" or copy stack trace

---

## Cost

**Free tier includes:**
- Unlimited crash events
- 30 days of crash history
- Basic analytics
- Email alerts

**You will NOT hit paid tier** unless you have 100K+ users.

---

## Security Notes

- `GoogleService-Info.plist` contains API keys
- **Safe to commit to private repo** (keys are client-side, not secret)
- **DO NOT commit** if repo is public (add to .gitignore)
- Firebase rules protect backend data (users can't access others' data)

---

## Next Steps After Setup

1. **Remove test crash code**
2. **Build for TestFlight**
3. **Install on your device**
4. **Use app for 24 hours**
5. **Check Crashlytics for any crashes**
6. **Fix crashes before inviting beta testers**

---

**Questions?**
- Firebase docs: https://firebase.google.com/docs/crashlytics/get-started?platform=ios
- Stack Overflow tag: `firebase-crashlytics`

---

**Setup complete?** Run through manual testing checklist next.
