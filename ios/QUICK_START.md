# Quick Start - Test Your App Now

**Time:** 5 minutes to launch, 30 minutes to test

---

## Step 1: Launch on Device (2 minutes)

### Option A: Physical iPhone
1. **Connect iPhone to Mac** via USB
2. **Unlock iPhone** and trust computer if prompted
3. **Open Xcode** → Open `moviegenius.xcodeproj`
4. **Select your iPhone** in device picker (top toolbar)
5. **Click Run** (▶️ button) or press Cmd+R
6. **Wait** for build and install (~60 seconds)
7. **App launches on your iPhone**

### Option B: Simulator (Faster but Less Realistic)
1. **Open Xcode** → Open `moviegenius.xcodeproj`
2. **Select simulator:** iPhone 15 Pro (top toolbar)
3. **Click Run** (▶️ button) or press Cmd+R
4. **Simulator opens and app launches**

**✅ Success:** You see Browse tab with movie collections loading

**❌ Problem:** App crashes or shows error → Check Xcode console (bottom panel)

---

## Step 2: Critical Flow Test (5 minutes)

**Do this RIGHT NOW on the running app:**

### Test 1: Browse Collections
- [ ] See at least 3-5 collection carousels
- [ ] Posters are loading (not all gray)
- [ ] Scroll down, more collections appear

**PASS** ✅ = Move to Test 2
**FAIL** ❌ = Check internet connection, check API status

### Test 2: Navigate to Movie
- [ ] Tap any movie poster
- [ ] Movie detail screen opens
- [ ] See WhyWatch section with YES/NO
- [ ] See 3 reasons listed
- [ ] See MoreIdeas with 2 movies

**PASS** ✅ = Move to Test 3
**FAIL** ❌ = Note which part didn't work

### Test 3: Navigate Back
- [ ] Tap back button (top left)
- [ ] Return to Browse collections
- [ ] Scroll position preserved

**PASS** ✅ = Move to Test 4
**FAIL** ❌ = Navigation broken, needs fix

### Test 4: Offline Cache (YOUR NEW FEATURE)
- [ ] Navigate to a movie (remember which one)
- [ ] Navigate back to Browse
- [ ] **Enable Airplane Mode** on device
  - Swipe down from top right → Tap airplane icon
  - Or Settings → Airplane Mode → ON
- [ ] Navigate back to SAME movie
- [ ] **Movie loads from cache** (no error!)

**PASS** ✅ = URLCache working! 🎉
**FAIL** ❌ = Shows "No internet" error → Check cache implementation

### Test 5: State Restoration (YOUR NEW FEATURE)
- [ ] Switch to **Genius tab** (middle tab)
- [ ] **Force quit app:**
  - Double-tap Home button (or swipe up and pause on Face ID phones)
  - Swipe up on MovieGenius card
- [ ] **Relaunch app** from Home Screen (tap icon)
- [ ] **App opens to Genius tab** (not Browse!)

**PASS** ✅ = State restoration working! 🎉
**FAIL** ❌ = Opens to Browse → @SceneStorage not working

---

## Step 3: Quick Pass/Fail

**If all 5 tests passed:**
✅ **YOU'RE READY FOR TESTFLIGHT!**
- Your app works
- Your fixes work
- Move to Firebase setup next

**If any test failed:**
❌ **FIX BEFORE PROCEEDING**
- Note which test failed
- Check error in Xcode console
- Message me with the specific failure
- Don't upload to TestFlight yet

---

## Common Issues & Quick Fixes

### "Collections not loading"
- **Check:** Is WiFi connected?
- **Check:** Try visiting https://moviegenius.ai/api/v1/collections/featured in browser
- **Fix:** API might be down, wait a few minutes

### "App crashes when tapping poster"
- **Check:** Xcode console for error message
- **Likely:** Navigation setup issue
- **Fix:** Verify navigationDestination in MainTabView

### "Offline cache doesn't work"
- **Check:** Did you visit movie FIRST (to populate cache)?
- **Check:** Are you revisiting the SAME movie?
- **Try:** Visit movie, wait 3 seconds, back, airplane mode, visit again

### "State restoration doesn't work"
- **Check:** Are you force-quitting correctly? (Double-tap Home, swipe up)
- **Check:** Are you relaunching from Home Screen (not App Switcher)?
- **Try:** Switch to You tab, force quit, relaunch

### "Xcode says 'No devices found'"
- **Fix:** Window → Devices and Simulators → Add simulator

---

## What to Do After Testing

### ✅ All Tests Passed
1. **Celebrate!** 🎉 Your app works
2. **Next:** Follow `FIREBASE_SETUP_GUIDE.md` (30 minutes)
3. **Then:** Follow `TESTFLIGHT_LAUNCH_CHECKLIST.md` (60 minutes)
4. **Timeline:** TestFlight Beta 1 by end of today

### ❌ Some Tests Failed
1. **Document the failure:**
   - Which test failed?
   - What did you expect?
   - What actually happened?
   - Any error in Xcode console?

2. **Message me with:**
   ```
   Test X failed:
   Expected: [what should happen]
   Actual: [what happened]
   Error: [paste Xcode console error]
   ```

3. **I'll help fix it** before you proceed to TestFlight

---

## Time Estimate

- **Launch app:** 2 minutes
- **Run 5 tests:** 5-10 minutes
- **Total:** ~12 minutes to know if you're ready

**Then:**
- Firebase setup: 30 minutes
- TestFlight upload: 60 minutes
- **Total to Beta 1:** ~2 hours from now

---

## Pro Tips

1. **Test on physical device** if possible (simulator is faster but less accurate)
2. **Keep Xcode console visible** (View → Debug Area → Show Debug Area)
3. **Test airplane mode on device** (simulator airplane mode doesn't fully work)
4. **Take screenshots** if you find bugs (easy to reference later)

---

## Ready?

**Right now:**
1. Open Xcode
2. Click Run (▶️)
3. Run the 5 tests above
4. Report back: ✅ All passed OR ❌ Test X failed

**You've got this!** 🚀
