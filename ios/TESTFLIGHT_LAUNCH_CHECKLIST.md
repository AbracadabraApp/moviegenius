# TestFlight Beta 1 Launch Checklist

**Goal:** Ship to TestFlight with confidence
**Timeline:** Complete in 1 day

---

## Pre-Flight Checklist (Must Complete Before Upload)

### Code Readiness
- [ ] All Priority 1 fixes implemented:
  - [ ] Task cancellation in ViewModels ✅ (DONE)
  - [ ] URLCache configuration ✅ (DONE)
  - [ ] Navigation state restoration ✅ (DONE)
- [ ] Build succeeds with zero errors
- [ ] No compiler warnings in critical files
- [ ] Firebase Crashlytics integrated and tested

### Testing Completed
- [ ] Manual testing checklist completed (see MANUAL_TESTING_CHECKLIST.md)
- [ ] Smoke test passes 3 times in a row (see SMOKE_TEST_SETUP.md)
- [ ] Tested on at least 1 physical device
- [ ] Tested airplane mode (offline caching works)
- [ ] Tested state restoration (tab persistence works)

### Content Verification
- [ ] App displays real movie data (not placeholder/dummy data)
- [ ] Posters load correctly
- [ ] WhyWatch verdicts show (YES/NO + 3 reasons)
- [ ] MoreIdeas shows 2 recommendations per movie
- [ ] Search works

### Crashlytics Verification
- [ ] Firebase Crashlytics configured
- [ ] Test crash appeared in Firebase Console
- [ ] Test crash code removed from production build
- [ ] Email alerts enabled for crashes

---

## App Store Connect Setup (One-Time)

### Prerequisites
- [ ] Apple Developer Account ($99/year)
  - Enroll at: https://developer.apple.com/programs/
- [ ] Xcode command line tools installed
  - Run: `xcode-select --install`

### Create App in App Store Connect

1. **Go to:** https://appstoreconnect.apple.com/

2. **Click:** "My Apps" → ➕ (plus icon)

3. **Select:** "New App"

4. **Fill in:**
   - **Platforms:** ✅ iOS
   - **Name:** MovieGenius
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** Select your app's bundle ID (com.yourname.moviegenius)
   - **SKU:** `moviegenius-ios` (unique identifier for your records)
   - **User Access:** Full Access

5. **Click:** "Create"

6. **Navigate to:** App Store → App Information
   - **Privacy Policy URL:** (required for TestFlight)
     - Option A: Use your website: `https://moviegenius.ai/privacy`
     - Option B: Create a simple page with basic privacy info
     - Option C: Use generator: https://www.privacypolicies.com/
   - **Category:** Entertainment
   - **Content Rights:** Check if you own the rights

7. **Save** changes

---

## Build & Archive (30 minutes)

### Step 1: Update Version & Build Number

1. **In Xcode:**
   - Select project "moviegenius" → Target "moviegenius" → General tab

2. **Version:**
   - Set to: `1.0` (your first public version)

3. **Build:**
   - Set to: `1` (increment for each TestFlight upload)
   - For subsequent uploads: `2`, `3`, `4`, etc.

### Step 2: Select Build Configuration

1. **In Xcode:**
   - Product → Scheme → Edit Scheme...

2. **Archive tab:**
   - Build Configuration: **Release** (not Debug)

3. **Click:** "Close"

### Step 3: Select Device

1. **In Xcode toolbar:**
   - Select: "Any iOS Device (arm64)" (NOT Simulator)

### Step 4: Archive

1. **In Xcode:**
   - Product → Archive
   - **Wait:** 2-5 minutes for build to complete

2. **Verify:**
   - Organizer window opens automatically
   - See your archive listed with version 1.0 (1)

3. **If archive fails:**
   - Check build errors in Issue Navigator (Cmd+5)
   - Common issues:
     - Signing certificate missing → see "Troubleshooting" below
     - Missing Info.plist keys → add required keys
     - API key exposure → remove hardcoded keys

### Step 5: Upload to App Store Connect

1. **In Organizer:**
   - Select your archive
   - Click "Distribute App"

2. **Distribution method:**
   - Select: "TestFlight & App Store"
   - Click "Next"

3. **Destination:**
   - Select: "Upload"
   - Click "Next"

4. **App Store Connect distribution options:**
   - ✅ Upload your app's symbols (for Crashlytics)
   - ✅ Manage Version and Build Number (auto-increment)
   - Click "Next"

5. **Automatically manage signing:**
   - Select: "Automatically manage signing"
   - Click "Next"

6. **Review archive:**
   - Check export summary
   - Click "Upload"

7. **Wait:**
   - Upload takes 5-10 minutes depending on connection
   - You'll see progress bar

8. **Success:**
   - "Upload Successful" message appears
   - Click "Done"

---

## TestFlight Configuration (15 minutes)

### Step 1: Wait for Processing

1. **Go to:** App Store Connect → My Apps → MovieGenius → TestFlight tab

2. **Wait:** 10-30 minutes for Apple to process build
   - Status shows "Processing" → "Ready to Submit" → "Ready to Test"
   - You'll receive email when ready

3. **While waiting:**
   - Configure test information (next steps)

### Step 2: Add Test Information (Required)

1. **In TestFlight tab:**
   - Click on your build (version 1.0 (1))

2. **Test Information section:**
   - **What to Test:**
     ```
     Beta 1 - Initial release for testing

     Please test:
     - Browsing movie collections
     - Viewing movie details (WhyWatch recommendations)
     - Search functionality
     - Tab navigation

     Known issues:
     - None yet (first beta!)

     How to provide feedback:
     - Use TestFlight app's feedback button
     - Or email: your-email@example.com
     ```

   - **Test Details:**
     - Beta App Description: `MovieGenius helps you discover your next favorite movie with AI-powered recommendations.`
     - Feedback Email: `your-email@example.com`
     - Marketing URL: `https://moviegenius.ai` (optional)

3. **Export Compliance:**
   - Does your app use encryption? **No**
     - (Unless you added HTTPS certificate pinning - you didn't)
   - Click "Set Export Compliance"

4. **Click:** "Save"

### Step 3: Create Internal Testing Group (You First)

1. **TestFlight tab → Internal Testing section**

2. **Click:** ➕ to create new group

3. **Group name:** "Internal Beta"

4. **Add testers:**
   - ✅ Check your name (admin user)

5. **Enable Automatic Distribution:**
   - ✅ When new builds are available, automatically distribute to testers

6. **Click:** "Create"

7. **Select build:**
   - Choose version 1.0 (1)
   - Click "Start Testing"

---

## Install & Test on Your Device (30 minutes)

### Step 1: Install TestFlight App

1. **On your iPhone:**
   - Open App Store
   - Search: "TestFlight"
   - Install official Apple TestFlight app

### Step 2: Accept Invite

1. **Check email:**
   - Subject: "You're invited to test MovieGenius"
   - Click "View in TestFlight"

2. **TestFlight app opens:**
   - Click "Accept"
   - Click "Install"

3. **Wait:**
   - App downloads and installs (~30 seconds)

### Step 3: Run Full Manual Test

1. **Complete:** MANUAL_TESTING_CHECKLIST.md
   - Print or view on computer
   - Test every item
   - Note any issues

2. **Use app for 30 minutes:**
   - Browse 20+ movies
   - Search 5 times
   - Switch tabs frequently
   - Test offline mode
   - Test state restoration (force quit and relaunch)

### Step 4: Check Crashlytics

1. **After 30 minutes:**
   - Go to Firebase Console → Crashlytics
   - **Goal:** Zero crashes

2. **If crashes appear:**
   - Read stack trace
   - Fix critical crashes
   - Upload new build (increment to build 2)
   - Re-test

3. **If zero crashes:**
   - ✅ Ready to invite external testers

---

## Invite Beta Testers (5 minutes)

### Start with 3-5 Trusted People

1. **TestFlight tab → External Testing section**

2. **Click:** ➕ to create new group

3. **Group name:** "Beta Group 1"

4. **Add build:**
   - Select version 1.0 (1)

5. **Test Information:**
   - Copy same info from Internal Testing
   - Add: "This is the first beta - please report any bugs!"

6. **Add testers:**
   - Click "Add Testers"
   - Enter email addresses (max 10,000 testers total)
   - Click "Add"

7. **Submit for Review:**
   - Click "Submit for Review"
   - **Wait:** 12-48 hours for Apple approval
   - (First beta takes longer, subsequent builds auto-approved)

8. **After approval:**
   - Testers receive email invite
   - They install TestFlight → accept → install app

---

## Monitoring Beta (Week 1)

### Daily Checks

**Day 1-3:**
- [ ] Check Crashlytics for crashes (daily)
- [ ] Check TestFlight feedback (daily)
- [ ] Respond to tester emails within 24 hours

**Day 4-7:**
- [ ] Review crash-free rate (aim for 99%+)
- [ ] Triage bugs: critical vs nice-to-have
- [ ] Plan fixes for critical bugs

### Key Metrics

**From TestFlight:**
- Sessions: How many times app opened
- Installs: How many testers installed
- Crashes: Number of crashes (should be 0-1)

**From Firebase:**
- Crash-free users: % of users who never crashed
- Crash-free sessions: % of sessions without crash
- Top crashes: Most common crash (if any)

**From Email Feedback:**
- Confusion points: What do users not understand?
- Feature requests: What do they want?
- Bugs: What's broken?

---

## Troubleshooting

### "No signing certificate found"

**Solution:**
1. Xcode → Settings → Accounts
2. Click your Apple ID → Download Manual Profiles
3. Or: Select target → Signing & Capabilities → Check "Automatically manage signing"

### "Archive not showing in Organizer"

**Solution:**
1. Window → Organizer
2. If not there, build failed - check Issue Navigator
3. Make sure you selected "Any iOS Device" not Simulator

### "Build stuck in 'Processing' for hours"

**Solution:**
- Wait 24 hours (sometimes Apple is slow)
- Check App Store Connect status page: https://developer.apple.com/system-status/
- If still stuck, contact Apple Developer Support

### "Export compliance required"

**Solution:**
1. TestFlight → Select build → Provide Export Compliance Information
2. Does app use encryption? → No (standard HTTPS doesn't count)
3. If you use encryption beyond HTTPS, answer yes and fill out form

### "Missing Privacy Policy URL"

**Solution:**
1. Create simple privacy page:
   ```
   # Privacy Policy
   MovieGenius does not collect personal information.
   Movie preferences are stored locally on your device.
   We use Firebase Crashlytics to detect crashes (anonymous).
   Contact: your-email@example.com
   ```
2. Upload to website or use GitHub Pages
3. Add URL to App Store Connect → App Information

### "Build rejected for TestFlight"

**Rare, but possible reasons:**
- App crashes on launch
- App uses private APIs
- App violates Apple guidelines

**Solution:**
- Check rejection email for specific reason
- Fix issue
- Upload new build

---

## Beta Update Process (For Build 2, 3, etc.)

When you fix bugs and want to release new beta:

1. **Increment build number:**
   - Xcode → Target → General → Build: `2`

2. **Archive & upload:**
   - Same process as above

3. **TestFlight auto-distributes:**
   - Internal testers get update immediately
   - External testers get update after Apple review (~1 hour for subsequent builds)

4. **Notify testers:**
   - TestFlight → Build → "What to Test"
   - Add: "Fixed: [bug description]"

---

## Success Criteria for Beta 1

**Ship external beta (invite more testers) if:**
- ✅ Crash-free rate > 99%
- ✅ You personally used app for 3+ days without critical bugs
- ✅ All items in manual test checklist pass
- ✅ Positive feedback from 3+ internal testers

**Wait and fix before expanding if:**
- ❌ Crash-free rate < 95%
- ❌ Multiple testers report same bug
- ❌ App feels "not ready" to you

**Move to App Store submission if:**
- ✅ 50+ testers, 99%+ crash-free rate
- ✅ All critical bugs fixed
- ✅ App Store screenshots ready
- ✅ App description written
- ✅ Confident showing to strangers

---

## Timeline Expectations

| Milestone | Time |
|-----------|------|
| Configure App Store Connect | 1 hour (one-time) |
| Archive & upload build | 30 min |
| Apple processes build | 10-30 min |
| Install & self-test | 30 min |
| Submit for external testing | 5 min |
| Apple reviews external beta | 12-48 hours (first time) |
| Beta testers install | Minutes after approval |
| Collect feedback | 1 week |
| Fix bugs & upload build 2 | 1-3 days |
| Apple reviews build 2 | ~1 hour (subsequent builds) |

**Total to first external tester:** 1 day work + 1 day Apple review = 2 days

---

## What Comes After Beta?

**Beta 1 (Week 1):** You + 3-5 friends
- Focus: Does it crash? Is it usable?

**Beta 2 (Week 2):** Expand to 10-20 testers
- Focus: Find edge case bugs
- Fix top 3 bugs from Beta 1

**Beta 3 (Week 3):** Expand to 50-100 testers (post on Reddit, Twitter)
- Focus: Diverse devices/iOS versions
- Fix any device-specific bugs

**Beta 4+ (Week 4+):** Public beta, prepare for App Store
- Create App Store screenshots
- Write app description
- Plan launch marketing

**App Store Submission (Week 5-6):**
- Submit for review (1-3 days approval)
- Launch! 🚀

---

## Quick Reference Commands

**Archive from command line:**
```bash
cd /Users/josh.petersen/moviegenius/ios/moviegenius
xcodebuild archive \
  -scheme moviegenius \
  -archivePath ~/Desktop/MovieGenius.xcarchive
```

**Check TestFlight status:**
```bash
# Install fastlane first: gem install fastlane
fastlane pilot list
```

**Upload with fastlane (alternative to Xcode Organizer):**
```bash
fastlane pilot upload
```

---

## Resources

- **TestFlight docs:** https://developer.apple.com/testflight/
- **App Store Connect Guide:** https://developer.apple.com/app-store-connect/
- **Human Interface Guidelines:** https://developer.apple.com/design/human-interface-guidelines/
- **App Review Guidelines:** https://developer.apple.com/app-store/review/guidelines/

---

## Emergency Contacts

**If build is broken and you're stuck:**
1. Check Apple Developer Forums: https://developer.apple.com/forums/
2. Stack Overflow tag: `testflight`
3. Reddit: r/iOSProgramming

**If Apple review is taking too long:**
- Contact Apple Developer Support: https://developer.apple.com/contact/

---

**Ready to ship?** 🚀

1. ✅ Complete pre-flight checklist
2. ✅ Archive & upload
3. ✅ Install on your device via TestFlight
4. ✅ Run manual test checklist
5. ✅ Invite 3-5 friends
6. ✅ Monitor for 1 week
7. ✅ Iterate based on feedback

**You've got this!**
