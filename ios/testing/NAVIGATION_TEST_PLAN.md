# Navigation Test Plan

**Purpose:** Comprehensive testing strategy for MovieGenius iOS navigation
**Status:** ✅ CURRENT
**Last Updated:** 2026-05-26

---

## Executive Summary

This test plan ensures MovieGenius navigation remains robust and never regresses to the May 2026 incident patterns. It covers unit tests, UI tests, integration tests, and snapshot tests to verify all navigation behaviors work correctly.

**Test Coverage Goals:**
- ✅ 100% coverage of navigation state management
- ✅ 100% coverage of critical user gestures (swipe-back, tab switching)
- ✅ 100% coverage of navigation bar configurations
- ✅ 0 tolerance for `.navigationBarHidden(true)` usage

---

## Test Suite Overview

### 1. Unit Tests (`NavigationStateTests.swift`)
**Purpose:** Test navigation state management and data structures
**Runtime:** < 1 second
**Run Frequency:** Every commit

### 2. UI Tests (`NavigationUITests.swift`)
**Purpose:** Test actual user interactions and gestures
**Runtime:** ~2 minutes
**Run Frequency:** Before every PR merge

### 3. Integration Tests (`NavigationIntegrationTests.swift`)
**Purpose:** Test complete navigation flows with real data
**Runtime:** ~30 seconds
**Run Frequency:** Before every release

### 4. Snapshot Tests (`NavigationSnapshotTests.swift`)
**Purpose:** Visual regression testing of navigation bars
**Runtime:** ~10 seconds
**Run Frequency:** After UI changes

---

## Critical Test Cases

### 🔴 MUST PASS (Blocks Release)

1. **Swipe-Back Gesture Works**
   - Test: `testSwipeBackGesture()`
   - Verification: Swipe from left edge navigates back
   - Device: Physical device required

2. **Navigation Bar Always Visible**
   - Test: `testNavigationBarVisibility()`
   - Verification: Navigation bar never hidden
   - Check: No `.navigationBarHidden(true)` in codebase

3. **Tab State Persistence**
   - Test: `testTabNavigationStatePersistence()`
   - Verification: Each tab maintains independent navigation stack
   - Check: Switching tabs preserves navigation depth

4. **Back Button Present**
   - Test: `testBackButtonNavigation()`
   - Verification: Back button shows parent title
   - Check: Can navigate back at any depth

5. **Tab Double-Tap Pops to Root**
   - Test: `testTabDoubleTapPopToRoot()`
   - Verification: Double-tapping current tab returns to root
   - Special: Search tab also clears search text

### 🟡 SHOULD PASS (Fix Before Next Release)

6. **Deep Navigation Works**
   - Test: `testDeepNavigationStack()`
   - Verification: Can navigate 10+ levels deep
   - Check: Performance remains acceptable

7. **Error States Handle Navigation**
   - Test: `testNavigationWithNetworkError()`
   - Verification: Can navigate away from error states
   - Check: Navigation not blocked by loading/errors

8. **Rapid Tab Switching**
   - Test: `testRapidTabSwitching()`
   - Verification: App doesn't crash with rapid switches
   - Check: Last selected tab is correct

### 🟢 NICE TO HAVE (Monitor)

9. **Navigation Performance**
   - Test: `testNavigationPerformance()`
   - Metric: < 16ms for navigation operations
   - Monitor: Track regression over time

10. **Accessibility Navigation**
    - Test: `testNavigationAccessibility()`
    - Verification: VoiceOver announces correctly
    - Check: All navigation elements have labels

---

## Test Execution Plan

### Pre-Commit Checks

```bash
# Run unit tests only (fast)
xcodebuild test \
  -scheme moviegenius \
  -only-testing:moviegeniusTests/NavigationStateTests \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

### Pre-PR Checks

```bash
# Run all navigation tests
xcodebuild test \
  -scheme moviegenius \
  -only-testing:moviegeniusTests/NavigationStateTests \
  -only-testing:moviegeniusTests/NavigationIntegrationTests \
  -only-testing:moviegeniusUITests/NavigationUITests \
  -destination 'platform=iOS Simulator,name=iPhone 15'
```

### Pre-Release Checks

1. **Physical Device Testing** (30 minutes)
   - [ ] Swipe-back gesture works on all screens
   - [ ] Tab bar visible and responsive
   - [ ] Navigation bar configurations correct
   - [ ] No visual glitches during transitions

2. **Snapshot Verification** (5 minutes)
   ```bash
   xcodebuild test \
     -scheme moviegenius \
     -only-testing:moviegeniusTests/NavigationSnapshotTests
   ```

3. **Performance Baseline** (5 minutes)
   - Run performance tests
   - Compare with previous release
   - Flag any regression > 10%

---

## Regression Prevention

### SwiftLint Rules

Add to `.swiftlint.yml`:

```yaml
custom_rules:
  no_navigation_bar_hidden:
    name: "Navigation Bar Hidden Banned"
    regex: '\.navigationBarHidden\s*\(\s*true\s*\)'
    message: "Never hide navigation bar - breaks swipe-back gesture"
    severity: error

  no_custom_header_overlay:
    name: "Custom Header Overlay Banned"
    regex: 'AppHeader|CustomHeader|HeaderOverlay'
    message: "Use native navigation patterns only"
    severity: error

  no_toolbar_hidden:
    name: "Toolbar Hidden Warning"
    regex: '\.toolbar\s*\(\s*\.hidden\s*\)'
    message: "Consider using .toolbarVisibility instead"
    severity: warning
```

### Git Pre-Commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check for banned navigation patterns
if git diff --cached --name-only | grep -E '\.swift$' | xargs grep -l 'navigationBarHidden(true)'; then
    echo "❌ ERROR: navigationBarHidden(true) detected!"
    echo "This breaks swipe-back gesture. See IOS_NAVIGATION_GUIDE.md"
    exit 1
fi

# Run navigation unit tests
xcodebuild test \
  -scheme moviegenius \
  -only-testing:moviegeniusTests/NavigationStateTests \
  -quiet || {
    echo "❌ Navigation tests failed"
    exit 1
}

echo "✅ Navigation checks passed"
```

---

## Test Data Requirements

### Mock Data for Testing

```swift
// Test movie IDs (known to exist in TMDB)
let testMovieIds = [
    153,   // Lost in Translation
    550,   // Fight Club
    27205, // Inception
    603,   // The Matrix
    11     // Star Wars
]

// Test collection IDs
let testCollectionIds = [
    "90s-classics",
    "action-essentials",
    "indie-gems",
    "oscar-winners"
]

// Test person IDs
let testPersonIds = [
    1892,  // Matt Damon
    6384,  // Keanu Reeves
    1245,  // Scarlett Johansson
]
```

---

## Known Edge Cases

### 1. First Launch
- No cached data
- Navigation should work immediately
- Loading states shouldn't block navigation

### 2. Offline Mode
- Cached data only
- Navigation between cached content works
- Error states for uncached content

### 3. Memory Pressure
- Large navigation stacks (50+ screens)
- Should handle gracefully
- Consider implementing stack limit

### 4. State Restoration
- App killed in background
- Should restore navigation state
- Tab selection persisted via @SceneStorage

---

## Success Metrics

### Release Criteria
- [ ] All 🔴 MUST PASS tests passing
- [ ] No navigation-related crashes in 100 test sessions
- [ ] Swipe-back works on 100% of detail screens
- [ ] Navigation bar visible on 100% of screens

### Performance Targets
- Push animation: < 250ms
- Pop animation: < 250ms
- Tab switch: < 100ms
- Deep link navigation: < 500ms

### User Experience Metrics
- Swipe-back gesture recognition: > 95% success rate
- Tab double-tap recognition: 100% success rate
- Back button tap target: 44x44 points minimum

---

## Monitoring in Production

### Crashlytics Events to Track

```swift
// Track navigation failures
Analytics.logEvent("navigation_failed", parameters: [
    "from": sourceView,
    "to": destinationView,
    "error": error.localizedDescription
])

// Track gesture failures
Analytics.logEvent("swipe_back_failed", parameters: [
    "screen": currentScreen,
    "navigation_depth": navigationStack.count
])
```

### Key Metrics to Monitor
1. Crash-free sessions involving navigation
2. Average navigation stack depth
3. Tab switching frequency
4. Back navigation methods (button vs swipe)

---

## Test Maintenance

### Weekly
- Review any navigation test failures
- Update mock data if needed

### Monthly
- Review navigation performance metrics
- Update snapshot reference images if UI changed

### Per Release
- Full physical device test of all navigation flows
- Update this test plan with new scenarios

---

## Emergency Response

### If Navigation Breaks in Production

1. **Immediate Mitigation**
   - Revert to last known good build
   - Deploy hotfix within 24 hours

2. **Root Cause Analysis**
   - Which test should have caught this?
   - Add regression test immediately

3. **Prevention**
   - Update test plan
   - Add SwiftLint rule if applicable
   - Document in IOS_NAVIGATION_GUIDE.md

---

## Related Documentation

- [IOS_NAVIGATION_GUIDE.md](/ios/IOS_NAVIGATION_GUIDE.md) - Navigation implementation patterns
- [MANUAL_CHECKLIST.md](/ios/testing/MANUAL_CHECKLIST.md) - Manual testing steps
- [SMOKE_TESTS.md](/ios/testing/SMOKE_TESTS.md) - Automated smoke test setup
- [DOCUMENTATION_LESSONS_LEARNED.md](/DOCUMENTATION_LESSONS_LEARNED.md) - Why these tests matter

---

## Questions?

**"Do we need all these tests?"**
Yes. The May 2026 incident proved that navigation regressions are costly. These tests prevent similar issues.

**"Can we skip physical device testing?"**
No. Swipe-back gesture behavior differs between simulator and device.

**"What if a test is flaky?"**
Fix it immediately. Flaky tests erode confidence and hide real issues.

---

**Remember:** Navigation is the skeleton of the app. If navigation breaks, the entire user experience breaks.