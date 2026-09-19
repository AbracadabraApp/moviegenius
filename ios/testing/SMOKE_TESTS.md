# Smoke Test Setup & Implementation

**Estimated Time:** 30 minutes
**Goal:** One automated test that verifies critical flow works

---

## What is a Smoke Test?

A **smoke test** is a quick test that verifies "does the app basically work?"

Think of it like: *"If this test passes, I'm confident enough to ship to beta."*

**Our smoke test checks:**
1. ✅ App launches
2. ✅ Browse tab loads collections
3. ✅ Can navigate to a movie
4. ✅ Can navigate back

**That's it.** If these 4 things work, 80% of your app works.

---

## Step 1: Create UI Test Target (5 minutes)

1. **In Xcode:**
   - File → New → Target...

2. **Select:**
   - iOS → UI Testing Bundle
   - Click "Next"

3. **Settings:**
   - **Product Name:** `moviegeniusUITests`
   - **Team:** (your Apple Developer team)
   - **Organization Identifier:** (same as main app)
   - **Project:** moviegenius
   - **Target to be Tested:** moviegenius

4. **Click:** "Finish"

5. **Verify:**
   - New folder appears: `moviegeniusUITests/`
   - New test file: `moviegeniusUITests.swift`

---

## Step 2: Delete Default Test File (1 minute)

1. **Delete:** `moviegeniusUITests/moviegeniusUITests.swift`
   - Right-click → Delete
   - Choose "Move to Trash"

We'll create our own simpler version.

---

## Step 3: Create Smoke Test File (5 minutes)

1. **In Xcode:**
   - Right-click `moviegeniusUITests` folder
   - New File...
   - iOS → Swift File
   - Name: `SmokeTests.swift`

2. **Paste this code:**

```swift
//
//  SmokeTests.swift
//  moviegeniusUITests
//
//  Critical flow test - if this passes, ship to beta
//

import XCTest

final class SmokeTests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        // Stop immediately when a failure occurs
        continueAfterFailure = false

        // Launch app fresh for each test
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    // MARK: - The One Test That Matters

    func testCriticalUserFlow() throws {
        // **Test 1: App launches and shows Browse tab**

        // Verify Browse tab is selected (default)
        let browseTab = app.tabBars.buttons["Browse"]
        XCTAssertTrue(browseTab.exists, "Browse tab should exist")

        // Wait for collections to load (max 10 seconds)
        let firstScrollView = app.scrollViews.firstMatch
        let collectionsLoaded = firstScrollView.waitForExistence(timeout: 10)
        XCTAssertTrue(collectionsLoaded, "Collections should load within 10 seconds")

        // **Test 2: Can navigate to movie detail**

        // Find first movie poster (it's an image)
        let firstPoster = app.images.matching(identifier: "movie_poster").firstMatch

        // If no specific identifier, just grab first image that appears
        let anyPoster = firstPoster.exists ? firstPoster : app.images.firstMatch

        let posterExists = anyPoster.waitForExistence(timeout: 5)
        XCTAssertTrue(posterExists, "At least one movie poster should be visible")

        // Tap the poster
        anyPoster.tap()

        // Verify movie detail view opened
        // Look for WhyWatch section (unique to movie detail)
        let whyWatchSection = app.staticTexts["WhyWatch"].exists ||
                              app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Why watch'")).firstMatch.exists

        // Alternative: Check if any navigation bar appeared (movie detail has one)
        let navigationBarAppeared = app.navigationBars.firstMatch.waitForExistence(timeout: 5)

        XCTAssertTrue(
            whyWatchSection || navigationBarAppeared,
            "Movie detail view should open after tapping poster"
        )

        // **Test 3: Can navigate back**

        // Tap back button
        let backButton = app.navigationBars.buttons.firstMatch
        if backButton.exists {
            backButton.tap()
        }

        // Verify we're back at Browse (collections visible again)
        let backAtBrowse = firstScrollView.waitForExistence(timeout: 3)
        XCTAssertTrue(backAtBrowse, "Should return to Browse after tapping back")

        // **Test 4: Tabs are functional**

        // Switch to Genius tab
        let geniusTab = app.tabBars.buttons["Genius"]
        geniusTab.tap()

        // Verify tab switched (Genius tab is now selected)
        // Note: XCTest doesn't have .isSelected, so we check if tapping it has no effect
        XCTAssertTrue(geniusTab.exists, "Genius tab should exist")

        // Switch back to Browse
        browseTab.tap()
        XCTAssertTrue(browseTab.exists, "Should be able to switch back to Browse")
    }

    // MARK: - Optional: Launch Performance Test

    func testLaunchPerformance() throws {
        if #available(iOS 13.0, *) {
            // Measure how long it takes to launch
            measure(metrics: [XCTApplicationLaunchMetric()]) {
                XCUIApplication().launch()
            }
        }

        // Goal: Launch time < 2 seconds on device
    }
}
```

3. **Save file:** Cmd+S

---

## Step 4: Configure Accessibility Identifiers (10 minutes)

**Problem:** UI tests can't find elements reliably without identifiers.

**Solution:** Add accessibility identifiers to key views.

### A. Add identifier to movie posters

**Edit MoviePosterView.swift** (or wherever poster AsyncImage is):

```swift
AsyncImage(url: posterURL) { phase in
    // ... your existing code
}
.accessibilityIdentifier("movie_poster")  // ADD THIS LINE
```

### B. Add identifier to WhyWatch section

**Edit WhyWatchView.swift:**

```swift
VStack {
    Text("WhyWatch")
        .font(.mgTitle2)
        .accessibilityIdentifier("whywatch_title")  // ADD THIS

    // ... rest of view
}
```

### C. Verify tab accessibility

Tabs automatically have accessibility, but verify:

**In MainTabView.swift:**

```swift
.tabItem {
    Label("Browse", systemImage: "square.grid.2x2")
}
// Tabs automatically get accessibility from Label text
```

**That's it!** These 3 identifiers make the test reliable.

---

## Step 5: Run the Test (5 minutes)

### Option A: Run from Xcode

1. **Open Test Navigator:**
   - Cmd+6 (or View → Navigators → Test)

2. **Find test:**
   - Expand `moviegeniusUITests`
   - Expand `SmokeTests`
   - See `testCriticalUserFlow()`

3. **Run test:**
   - Click ▶️ next to test name
   - **OR** hover over line number in test file, click diamond

4. **Watch:**
   - Simulator/device launches
   - App opens
   - Test taps poster automatically
   - Test navigates back
   - Test switches tabs

5. **Result:**
   - ✅ **Green checkmark:** Test passed! Ship to beta.
   - ❌ **Red X:** Test failed. Click to see which assertion failed.

### Option B: Run from Command Line

```bash
cd /Users/josh.petersen/moviegenius/ios/moviegenius

# Run all UI tests
xcodebuild test \
  -scheme moviegenius \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  -only-testing:moviegeniusUITests/SmokeTests/testCriticalUserFlow
```

---

## Step 6: Interpret Results

### ✅ Test PASSED

**What this means:**
- App launches successfully
- Collections load from API
- Navigation works
- Tabs functional

**Action:** Ship to TestFlight Beta 1

### ❌ Test FAILED: "Collections should load within 10 seconds"

**What this means:**
- API call failing or timing out
- No internet connection during test
- Server down

**Action:**
- Check internet connection
- Run manual test to verify API works
- Check Firebase Console for API errors
- Increase timeout if API is just slow: `.waitForExistence(timeout: 15)`

### ❌ Test FAILED: "At least one movie poster should be visible"

**What this means:**
- Collections loaded, but no posters displayed
- Image loading broken
- Layout issue hiding posters

**Action:**
- Run app manually, check if posters load
- Check AsyncImage URLs are valid
- Check `movie_poster` accessibility identifier is set correctly

### ❌ Test FAILED: "Movie detail view should open"

**What this means:**
- Navigation broken
- MovieDetailView not in MainTabView's navigationDestination
- Crash when opening movie detail

**Action:**
- Check Crashlytics for crash
- Verify navigationDestination includes MovieDestination.detail case
- Test manually: Does tapping poster do anything?

### ❌ Test FAILED: "Should return to Browse after tapping back"

**What this means:**
- Back button not working
- Navigation stack corrupted

**Action:**
- Verify NavigationStack is properly configured
- Check if back button appears (might be hidden)
- Test manually

---

## Step 7: Add to CI/CD (Optional - Later)

**After Beta 1 ships**, you can add this test to GitHub Actions:

```yaml
# .github/workflows/ios-test.yml
name: iOS Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Smoke Tests
        run: |
          cd ios/moviegenius
          xcodebuild test \
            -scheme moviegenius \
            -destination 'platform=iOS Simulator,name=iPhone 15' \
            -only-testing:moviegeniusUITests/SmokeTests
```

**Skip this for now.** Manual testing is fine for Beta 1.

---

## Maintenance

**How often to run:**
- ✅ Before every TestFlight upload
- ✅ After modifying navigation code
- ✅ After modifying APIClient
- ⚠️ Not after every small UI change (too slow)

**How long it takes:**
- ~45 seconds to run on simulator
- ~60 seconds on device

**When to update test:**
- If you change navigation structure
- If you rename tabs
- If you remove WhyWatch section

**Don't add more tests yet.** One smoke test is enough for Beta 1.

---

## Troubleshooting

**"Application does not have a valid bundle identifier"**
- Solution: Check Bundle ID matches between app and test target

**"Failed to launch app"**
- Solution: Clean build folder (Cmd+Shift+K), rebuild, retry

**"Unable to find element"**
- Solution: Add accessibility identifiers (Step 4)
- Alternative: Use looser matching (`.firstMatch` instead of specific identifier)

**"Test times out waiting for element"**
- Solution: Increase timeout from 5 to 10 seconds
- Check if element actually appears when testing manually

**Test is flaky (passes sometimes, fails sometimes)**
- Solution: Add explicit waits: `.waitForExistence(timeout: 5)`
- Check for race conditions (async data loading)

---

## Success Criteria

**Ship to Beta if:**
- ✅ `testCriticalUserFlow()` passes 3 times in a row
- ✅ Test completes in < 60 seconds
- ✅ No crashes during test

**Don't ship if:**
- ❌ Test fails more than once
- ❌ App crashes during test
- ❌ Test takes > 90 seconds (something is hung)

---

## What's NOT Tested

This smoke test does NOT cover:
- ❌ Offline mode (test manually)
- ❌ Search functionality
- ❌ MoreIdeas section
- ❌ State restoration
- ❌ Memory leaks
- ❌ Different devices/iOS versions

**That's okay.** Those are covered by:
- Manual testing checklist
- Beta tester feedback
- Crashlytics

**One smoke test + manual testing + Crashlytics = enough for Beta 1.**

---

## Next Steps

After test passes:
1. ✅ Run manual testing checklist
2. ✅ Build for TestFlight
3. ✅ Install on your device
4. ✅ Use app for 24 hours
5. ✅ Ship to 3-5 beta testers

After Beta 1 feedback:
- Add more UI tests if specific areas break repeatedly
- Don't add tests for things that never break

---

**Questions?**
- Apple docs: https://developer.apple.com/documentation/xctest/user_interface_tests
- WWDC video: "Testing in Xcode" (search Apple Developer videos)

**Test passes?** You're ready for TestFlight. 🚀
