# MovieGenius iOS Manual Testing Checklist

**Version:** Beta 1
**Date:** 2026-05-11
**Tester:** _______________
**Device:** _______________
**iOS Version:** _______________

---

## Pre-Flight Checks

- [ ] Build succeeded in Xcode
- [ ] No compiler warnings in critical files (ViewModels, APIClient)
- [ ] App installs and launches on device

---

## Critical Flow Test (Must Pass)

### 1. Fresh Install Flow
- [ ] Delete app if already installed
- [ ] Install fresh from Xcode/TestFlight
- [ ] Launch app
- [ ] **PASS:** Browse tab shows collections within 5 seconds
- [ ] **PASS:** See at least 5 collection carousels with posters
- [ ] **PASS:** No error messages on launch

### 2. Browse → Collection → Movie
- [ ] Tap on first collection's "See All" or collection name
- [ ] **PASS:** Collection detail screen opens
- [ ] **PASS:** Shows subcategories (if applicable)
- [ ] **PASS:** Shows grid of movie posters
- [ ] Tap on first movie poster
- [ ] **PASS:** Movie detail screen opens
- [ ] **PASS:** WhyWatch section visible with YES/NO verdict
- [ ] **PASS:** See 3 reasons listed
- [ ] **PASS:** MoreIdeas section shows 2 movie recommendations
- [ ] **PASS:** Posters load (not all gray placeholders)

### 3. Navigation Back
- [ ] Tap back button from Movie Detail
- [ ] **PASS:** Returns to Collection Detail
- [ ] Tap back button from Collection Detail
- [ ] **PASS:** Returns to Browse home
- [ ] **PASS:** Scroll position preserved (still see same collections)

### 4. Search Flow
- [ ] Tap search bar at top of Browse
- [ ] Type "Fight Club"
- [ ] **PASS:** Search results appear as you type
- [ ] Tap first result
- [ ] **PASS:** Movie detail opens
- [ ] **PASS:** Shows Fight Club movie details
- [ ] Navigate back
- [ ] **PASS:** Returns to Browse (not stuck in search)

### 5. Tab Switching
- [ ] Tap Genius tab (middle)
- [ ] **PASS:** Genius tab opens (shows placeholder or content)
- [ ] Tap You tab (right)
- [ ] **PASS:** You tab opens, shows "Your Library"
- [ ] Tap Browse tab (left)
- [ ] **PASS:** Returns to Browse, collections still visible

---

## State Restoration Test (NEW - Must Pass)

### 6. Tab Persistence
- [ ] Switch to **Genius tab**
- [ ] Verify you're on Genius tab (middle tab selected)
- [ ] **Terminate app:** Double-tap Home button, swipe up on app
- [ ] **Relaunch:** Tap app icon from Home Screen
- [ ] **PASS:** App opens to Genius tab (NOT Browse tab)
- [ ] Repeat test with You tab:
  - [ ] Switch to You tab
  - [ ] Terminate app
  - [ ] Relaunch
  - [ ] **PASS:** Opens to You tab

---

## Cache Test (NEW - Must Pass)

### 7. Offline Mode
- [ ] Navigate to a movie detail page (e.g., Fight Club)
- [ ] Wait for all content to load (posters, text, etc.)
- [ ] Navigate back to Browse
- [ ] **Enable Airplane Mode** on device (swipe down, tap airplane icon)
- [ ] Navigate back to same movie from step 1
- [ ] **PASS:** Movie detail loads from cache (no "No internet connection" error)
- [ ] **PASS:** Poster image loads from cache
- [ ] **PASS:** WhyWatch and MoreIdeas sections visible
- [ ] Navigate to a NEW movie you haven't seen yet
- [ ] **EXPECTED:** "No internet connection" error appears
- [ ] **PASS:** Error message is user-friendly, not a crash
- [ ] **Disable Airplane Mode**
- [ ] Tap retry (if available) or navigate back and try again
- [ ] **PASS:** Movie loads successfully now

---

## Memory & Performance Test

### 8. Heavy Usage
- [ ] Scroll through 10 collections on Browse tab
- [ ] Open 5 different movies (one by one, back out each time)
- [ ] Switch to Genius tab
- [ ] Switch to You tab
- [ ] Switch back to Browse
- [ ] **PASS:** App still responsive (no lag)
- [ ] **PASS:** Posters still loading correctly
- [ ] **PASS:** No visual glitches

### 9. Background & Return
- [ ] Navigate to a movie detail page
- [ ] Press Home button (minimize app)
- [ ] Wait 10 seconds
- [ ] Reopen app
- [ ] **PASS:** Still on movie detail page (not restarted)
- [ ] Leave app in background for 5 minutes
- [ ] Reopen app
- [ ] **PASS:** App resumes (may reload data, but doesn't crash)

---

## Error Handling Test

### 10. Network Timeout
- [ ] Enable Airplane Mode BEFORE opening app
- [ ] Launch app
- [ ] **PASS:** Shows error message (not blank screen or crash)
- [ ] **PASS:** Error message says "No internet connection" or similar
- [ ] Disable Airplane Mode
- [ ] **PASS:** App recovers (either auto-refreshes or shows retry button)

### 11. Invalid Movie ID (Developer Test)
- [ ] (Skip for beta testers - requires code change)
- [ ] Developers: Force navigation to movie ID 999999999
- [ ] **PASS:** Shows "Movie not found" error, not crash

---

## UI/Layout Test

### 12. Small Screen (iPhone SE)
- [ ] **Device:** iPhone SE or similar small screen
- [ ] Navigate to Browse tab
- [ ] **PASS:** Collections visible, not cut off
- [ ] Navigate to movie detail
- [ ] **PASS:** All content fits on screen (may need scrolling)
- [ ] **PASS:** No text overlap
- [ ] **PASS:** Buttons are tappable (not too small)

### 13. Large Screen (iPhone Pro Max)
- [ ] **Device:** iPhone 15 Pro Max or similar large screen
- [ ] Navigate to Browse tab
- [ ] **PASS:** Posters scale appropriately (not pixelated)
- [ ] Navigate to movie detail
- [ ] **PASS:** Content doesn't look weirdly stretched

### 14. Rotation (Optional - if supporting landscape)
- [ ] Rotate device to landscape
- [ ] **PASS:** Layout adapts (or locks to portrait gracefully)

---

## Edge Cases

### 15. Rapid Tapping
- [ ] Rapidly tap a movie poster 5 times
- [ ] **PASS:** Only opens movie detail once (no duplicate views)
- [ ] Navigate back
- [ ] Rapidly tap back button 3 times
- [ ] **PASS:** Navigates back smoothly, no crash

### 16. Search Edge Cases
- [ ] Search for "zzzzzzzzzz" (nonsense)
- [ ] **PASS:** Shows "No results" state (not crash or blank screen)
- [ ] Search for "" (empty string)
- [ ] **PASS:** Shows placeholder or all movies

---

## Final Checks

### 17. Overall Impressions
- [ ] **Subjective:** App feels fast and responsive
- [ ] **Subjective:** No obvious visual bugs
- [ ] **Subjective:** Navigation is intuitive
- [ ] **Subjective:** Would I show this to a friend without embarrassment?

### 18. Crashlytics Verification (After Firebase Setup)
- [ ] Check Firebase Console → Crashlytics
- [ ] **PASS:** Zero crashes recorded during this test session
- [ ] If crashes: Note crash details below

---

## Notes / Issues Found

**Device:**
**iOS Version:**
**Date/Time:**

### Issues:
1.
2.
3.

### Crashes:
1.
2.

### Performance Problems:
1.
2.

---

## Pass/Fail Criteria

**SHIP TO BETA if:**
- ✅ All "Critical Flow Test" items pass (sections 1-5)
- ✅ State restoration works (section 6)
- ✅ Offline cache works (section 7)
- ✅ No crashes during 30-minute test session
- ✅ Error messages are user-friendly (section 10)

**DO NOT SHIP if:**
- ❌ App crashes on launch
- ❌ Cannot navigate to movie detail
- ❌ Offline mode shows crash instead of error
- ❌ State restoration doesn't work (opens to wrong tab)
- ❌ More than 2 critical bugs found

**FIX BEFORE NEXT BETA if:**
- ⚠️ Performance is sluggish (section 8)
- ⚠️ Search doesn't work (section 4)
- ⚠️ Layout broken on small screens (section 12)

---

## Testing Tips

1. **Test on Real Device:** Simulator is faster but misses device-specific bugs
2. **Clear Cache Between Tests:** Delete app and reinstall for "fresh install" test
3. **Take Screenshots:** If you find a bug, screenshot it immediately
4. **Note Exact Steps:** "App crashed" is less helpful than "Tapped movie #3 in 'Action Movies' collection, then tapped back button twice quickly"
5. **Test in Multiple Locations:** Home WiFi, cellular data, weak signal area
6. **Test at Different Times:** Morning (fresh device), evening (after using other apps all day)

---

## Quick Reference: How to Force Quit App (for State Restoration Test)

**iPhone with Face ID:**
1. Swipe up from bottom and pause in middle of screen
2. Swipe up on MovieGenius app card

**iPhone with Home Button:**
1. Double-press Home button
2. Swipe up on MovieGenius app card

**Relaunch:**
- Tap MovieGenius icon on Home Screen (not from App Switcher)

---

**Tester Signature:** _______________  **Date:** _______________
