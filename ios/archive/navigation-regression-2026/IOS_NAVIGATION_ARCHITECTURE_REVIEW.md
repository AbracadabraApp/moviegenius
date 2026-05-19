# iOS Navigation Architecture Review
**Date:** 2026-05-18
**Reviewer:** iOS Engineering Lead
**Status:** ✅ APPROVED — Revert to native iOS patterns

---

## Executive Summary

**Verdict:** Your architectural plan is 100% correct. The AppHeader custom overlay pattern is a web-influenced anti-pattern that fundamentally breaks iOS navigation conventions. Revert to native iOS navigation immediately.

**Root Cause Identified:**
- Commit `813101bde` (2026-05-15) introduced `.enableSwipeBack()` UIKit hack
- Commit `9237ed047` (2026-05-15) introduced `AppHeader.swift` custom overlay
- Commit `ac5a2ae52` (2026-05-13) had the **CORRECT** native iOS implementation

**Recommendation:** Revert all affected views to the pattern used in commit `ac5a2ae52`, which used:
- Native `NavigationStack` with standard toolbar
- `.navigationBarTitleDisplayMode(.inline)`
- `.toolbar { ToolbarItem(placement: .principal) { SearchBarCompactSmaller() } }`
- No `.navigationBarHidden(true)` modifier
- No ZStack overlay hacks
- No UIKit introspection workarounds

---

## Architectural Analysis

### ❌ Current (Broken) Architecture

**Pattern:** Custom overlay header with hidden navigation bar

```swift
ZStack(alignment: .top) {
    ScrollView { /* content */ }

    VStack {
        AppHeader(showBackButton: true)  // Custom overlay
        Spacer()
    }
}
.navigationBarHidden(true)  // ← BREAKS iOS conventions
.enableSwipeBack()          // ← UIKit hack (wrong solution)
```

**Why This Is Wrong:**

1. **Breaks Platform Conventions**
   - Hides iOS native navigation bar completely
   - Replaces standard back button with custom implementation
   - Disables iOS edge-swipe gesture automatically (consequence of `.navigationBarHidden`)
   - Requires UIKit introspection to force-enable gesture (fragile hack)

2. **Web-Influenced Anti-Pattern**
   - Treats navigation bar as "fixed header" overlay (web thinking)
   - Manually manages Z-index with ZStack (not iOS paradigm)
   - Requires manual spacer coordination (`Color.clear.frame(height: 60)`)
   - Fragile: breaks if header height changes

3. **Gesture Recognition Conflicts**
   - `.navigationBarHidden(true)` disables `UINavigationController.interactivePopGestureRecognizer`
   - `.enableSwipeBack()` force-enables it via `UIViewRepresentable` introspection
   - Unreliable: requires finding navigation controller in view hierarchy
   - Fails when view hierarchy structure changes
   - May conflict with other gesture recognizers

4. **Search Implementation Issues**
   - `SearchBarCompactSmaller` is decorative button opening modal
   - Could be replaced with native `.searchable()` modifier
   - Modal approach correct, but placement is wrong (should be in toolbar)

5. **Maintenance Burden**
   - Every view requires identical ZStack + spacer + overlay pattern
   - Breaking changes if AppHeader height changes
   - Custom back button doesn't show parent title (iOS default)
   - No automatic tab bar hiding on push (must be managed manually)

---

### ✅ Correct (Native iOS) Architecture

**Pattern:** Standard NavigationStack with toolbar modifiers

#### For Detail Views (MovieDetailView, CollectionDetailView, PersonDetailView)

```swift
ScrollView { /* content */ }
.navigationBarTitleDisplayMode(.inline)
.toolbar {
    ToolbarItem(placement: .principal) {
        SearchBarCompactSmaller()  // Centered in toolbar
    }
}
.toolbarBackground(.visible, for: .navigationBar)
.toolbarBackground(Color.mgBackground.opacity(0.95), for: .navigationBar)
```

**Benefits:**
- ✅ Native back button with parent title (free)
- ✅ Edge-swipe gesture works automatically (no hack needed)
- ✅ Tab bar auto-hides on push (iOS default)
- ✅ Safe area handling automatic
- ✅ No manual spacer coordination
- ✅ No ZStack overlay positioning
- ✅ Respects platform conventions

#### For Root Views (HomeView, GeniusView, WatchQueueView tabs)

**Option A: Toolbar Search Button (Recommended)**

```swift
ScrollView { /* content */ }
.navigationTitle("Movies")  // or "Genius", "Watchlist"
.navigationBarTitleDisplayMode(.large)
.toolbar {
    ToolbarItem(placement: .navigationBarTrailing) {
        Button {
            showSearch = true
        } label: {
            Image(systemName: "magnifyingglass")
        }
    }
}
.sheet(isPresented: $showSearch) {
    SearchView()
}
```

**Option B: Inline Search Bar in Principal Position**

```swift
ScrollView { /* content */ }
.navigationBarTitleDisplayMode(.inline)
.toolbar {
    ToolbarItem(placement: .principal) {
        SearchBarCompactSmaller()
    }
}
```

**Recommendation:** Use **Option A** for root tabs (magnifying glass icon), **Option B** for detail views (inline search bar). This follows iOS platform conventions:
- Root tabs: Large title with toolbar actions
- Detail views: Inline title with centered toolbar content

---

## Reference Implementation (Commit `ac5a2ae52`)

**File:** `ios/moviegenius/moviegenius/Views/MovieDetailView.swift` (before AppHeader)

```swift
var body: some View {
    ScrollView {
        VStack(spacing: 0) {
            // Content directly - no spacer needed
            MoviePosterView(...)
            FavoriteButtons(...)
            WhyWatchView(...)
            MoreIdeasView(...)
        }
    }
    .scrollIndicators(.hidden)
    .background(Color.mgBackground)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
        ToolbarItem(placement: .principal) {
            SearchBarCompactSmaller()  // Decorative button opening modal
        }
    }
    .toolbarBackground(.visible, for: .navigationBar)
    .toolbarBackground(Color.mgBackground.opacity(0.95), for: .navigationBar)
    .task {
        await viewModel.loadMovie()
    }
}
```

**Key Points:**
- No ZStack
- No `.navigationBarHidden(true)`
- No `.enableSwipeBack()` hack
- No manual spacer
- Search bar in toolbar principal position (centered)
- Swipe-back works automatically (iOS default)

---

## Migration Plan

### Phase 1: Delete AppHeader Infrastructure

**Files to delete:**
- `/ios/moviegenius/moviegenius/Views/AppHeader.swift` (entire file)

**Code to remove from DesignSystem.swift:**
```swift
// DELETE (lines 680-686):
extension View {
    func enableSwipeBack() -> some View {
        modifier(SwipeBackGesture())
    }
}

// DELETE (lines 660-678):
struct SwipeBackGesture: ViewModifier {
    // ... entire struct
}
```

### Phase 2: Restore Native Navigation (Detail Views)

**Views to update:**
1. `MovieDetailView.swift` (lines 21-119)
2. `CollectionDetailView.swift` (lines 21-147)
3. `PersonDetailView.swift` (lines 20-45)
4. `GeniusView.swift` subviews:
   - `CategorySubcategoriesView` (line 494)
   - `CategoryEssentialsView` (line 731)

**Migration Pattern (MovieDetailView example):**

```swift
// OLD (DELETE):
var body: some View {
    ZStack(alignment: .top) {
        ScrollView {
            VStack(spacing: 0) {
                Color.clear.frame(height: 60)  // DELETE spacer
                // ... content
            }
        }
        VStack {
            AppHeader(showBackButton: true)  // DELETE overlay
            Spacer()
        }
    }
    .navigationBarHidden(true)  // DELETE
    .enableSwipeBack()          // DELETE
}

// NEW (RESTORE):
var body: some View {
    ScrollView {
        VStack(spacing: 0) {
            // No spacer - content starts at top
            // ... content
        }
    }
    .scrollIndicators(.hidden)
    .background(Color.mgBackground)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
        ToolbarItem(placement: .principal) {
            SearchBarCompactSmaller()
        }
    }
    .toolbarBackground(.visible, for: .navigationBar)
    .toolbarBackground(Color.mgBackground.opacity(0.95), for: .navigationBar)
    .task {
        await viewModel.loadMovie()
    }
}
```

### Phase 3: Update Root Views (Tab Views)

**Views to update:**
- `HomeView.swift`
- `GeniusView.swift` (root tab)
- `WatchQueueView.swift`

**Migration Pattern (HomeView example):**

```swift
// OLD (DELETE):
var body: some View {
    ZStack(alignment: .top) {
        ScrollView {
            LazyVStack(spacing: 0) {
                Color.clear.frame(height: 60)  // DELETE
                // ... content
            }
        }
        VStack {
            AppHeader()  // DELETE
            Spacer()
        }
    }
    .navigationBarHidden(true)  // DELETE
}

// NEW (RESTORE):
var body: some View {
    ScrollView {
        LazyVStack(spacing: 0) {
            // No spacer - content starts at top
            // ... content
        }
    }
    .scrollIndicators(.hidden)
    .background(Color.mgBackground)
    .navigationTitle("Movies")  // or "Genius", "Watchlist"
    .navigationBarTitleDisplayMode(.large)
    .toolbar {
        ToolbarItem(placement: .navigationBarTrailing) {
            Button {
                showSearch = true
            } label: {
                Image(systemName: "magnifyingglass")
            }
        }
    }
    .sheet(isPresented: $showSearch) {
        SearchView()
    }
    .refreshable {
        await viewModel.loadInitialCollections()
    }
    .task {
        await viewModel.loadInitialCollections()
    }
}
```

**Add @State for search modal:**
```swift
@State private var showSearch = false
```

### Phase 4: AuthManager Sign-In UI

**Issue:** AppHeader currently shows sign-in indicator and logout button (lines 136-163).

**Solution:** Move to dedicated profile/settings view accessible via toolbar:

```swift
// Add to HomeView toolbar:
.toolbar {
    ToolbarItem(placement: .navigationBarLeading) {
        Button {
            showProfile = true
        } label: {
            Image(systemName: auth.isAuthenticated ? "person.circle.fill" : "person.circle")
                .foregroundStyle(Color.mgGold)
        }
    }
}
.sheet(isPresented: $showProfile) {
    ProfileView()  // New view with sign-in/out
}
```

---

## Testing Checklist

After migration, verify each view:

### Detail Views (MovieDetailView, CollectionDetailView, PersonDetailView)
- [ ] Swipe from left edge navigates back (no `.enableSwipeBack()` hack)
- [ ] Back button shows parent title ("< Movies", "< Collection Name")
- [ ] Search bar centered in navigation bar
- [ ] Tapping search bar opens SearchView modal
- [ ] Tab bar hidden automatically on detail views
- [ ] No Z-fighting or overlay positioning issues
- [ ] Safe area insets respected (no content under status bar)
- [ ] Pull-to-refresh works (if implemented)

### Root Tab Views (HomeView, GeniusView, WatchQueueView)
- [ ] Large navigation title visible ("Movies", "Genius", "Watchlist")
- [ ] Search icon in top-right toolbar
- [ ] Tapping search icon opens SearchView modal
- [ ] Tab bar always visible on root views
- [ ] Scrolling doesn't hide/show navigation bar (large title collapses on scroll)
- [ ] Pull-to-refresh works

### SearchView (Already Correct)
- [ ] Modal presentation with "Done" button
- [ ] Native keyboard focus on appear
- [ ] Swipe-down dismisses modal
- [ ] No regression from existing implementation

### Sign-In Flow (After Phase 4)
- [ ] Profile icon in top-left of HomeView
- [ ] Tapping profile opens ProfileView modal
- [ ] Sign-in/out flow works
- [ ] Authenticated state visible in profile view

---

## Risk Assessment

### Low Risk
- Migration is straightforward revert to known-good state
- Reference implementation exists in commit `ac5a2ae52`
- All affected views follow identical pattern
- No API changes or data model impacts

### Rollback Strategy
If migration causes issues, revert to commit `813101bde`:
```bash
git diff 813101bde HEAD -- ios/moviegenius/moviegenius/Views/ | git apply -R
```

### Potential Conflicts
1. **FavoriteButtons padding:** May need adjustment after removing 60pt spacer
   - Check `FavoriteButtons` top padding in MovieDetailView
   - Adjust if favorites overlap with toolbar

2. **SearchBarCompactSmaller behavior:** Currently opens modal, keep that behavior
   - Don't replace with real TextField
   - Modal approach is correct (maintains keyboard auto-focus)

3. **GeniusView complexity:** Largest file with multiple subviews
   - Test all category navigation flows
   - Verify tier progress screens work

---

## Implementation Approach

### Option 1: Revert Commits (Safest)
```bash
git revert --no-commit 813101bde 9237ed047
git commit -m "Revert to native iOS navigation (remove AppHeader)"
```

**Pros:** Minimal manual work, guaranteed correct state
**Cons:** May conflict with other changes made after those commits

### Option 2: Manual Migration (Recommended)
1. Use commit `ac5a2ae52` as reference
2. Update each view one at a time
3. Test after each view
4. Commit per-view with descriptive messages

**Pros:** Fine-grained control, easier to debug issues
**Cons:** More manual work, requires careful comparison

### Option 3: Hybrid Approach (Fastest)
1. Checkout files from `ac5a2ae52` for views that haven't changed much
2. Manually migrate views with significant changes
3. Test all views together
4. Single commit with complete migration

**Recommendation:** Use **Option 2** (manual migration) for production safety. Test each view thoroughly before moving to next.

---

## Git History Analysis

**Key Commits:**

1. **`ac5a2ae52`** (2026-05-13) - ✅ **LAST CORRECT IMPLEMENTATION**
   - Native navigation with toolbar search
   - No AppHeader, no `.navigationBarHidden`, no hacks
   - Swipe-back worked automatically

2. **`9237ed047`** (2026-05-15) - ❌ **REGRESSION INTRODUCED**
   - Created `AppHeader.swift`
   - Added custom overlay pattern
   - Initial swipe-back breakage

3. **`813101bde`** (2026-05-15) - ❌ **HACK ADDED**
   - Standardized AppHeader across all views
   - Added `.enableSwipeBack()` UIKit hack
   - Attempted to fix swipe-back with wrong solution

4. **`42f25f4da`** (recent) - ⚠️ **PARTIAL FIX ATTEMPT**
   - "Fix search regression - restore decorative button opening modal"
   - Fixed search behavior but didn't address navigation architecture

**Conclusion:** Revert changes from commits `813101bde` and `9237ed047`, restore pattern from `ac5a2ae52`.

---

## Alternative Approaches (NOT Recommended)

### Could We Keep AppHeader?

**No.** Even if we fix the swipe-back gesture with better UIKit introspection, the architectural issues remain:

1. Still fighting iOS platform conventions
2. Still requires manual spacer coordination
3. Still requires `.navigationBarHidden(true)` (loses native features)
4. Still breaks standard back button behavior (no parent title)
5. Still fragile when view hierarchy changes
6. Still maintenance burden across 8+ views

**Custom headers are appropriate in iOS only when:**
- Building completely custom navigation (not using NavigationStack at all)
- Full-screen immersive experiences (video player, photo viewer)
- Onboarding flows with no back navigation

MovieGenius is a standard navigation app. Use native iOS patterns.

---

## Search Implementation Notes

**Current (Correct) Pattern:**
- `SearchBarCompactSmaller` is a **decorative button** that opens modal
- Tapping opens full-screen `SearchView` with `.sheet()` presentation
- SearchView has real TextField with keyboard auto-focus
- Swipe-down dismisses modal

**Why This Is Correct:**
- Native keyboard behavior (auto-focus, dismissal)
- Native modal presentation (swipe-to-dismiss)
- Search results in dedicated full-screen view
- No interference with navigation gestures

**Don't Change To:**
- ❌ Inline TextField in toolbar (loses focus management)
- ❌ Custom search overlay (Z-index issues)
- ❌ NavigationStack push to SearchView (wrong metaphor)

**Only Change:**
- Where the decorative button lives: AppHeader overlay → toolbar principal position

---

## Final Recommendation

**APPROVED:** Your migration plan is correct. Execute as follows:

1. ✅ Delete `AppHeader.swift`
2. ✅ Delete `.enableSwipeBack()` infrastructure from DesignSystem.swift
3. ✅ Restore native navigation using commit `ac5a2ae52` as reference
4. ✅ Test each view thoroughly
5. ✅ Move sign-in UI to profile modal (toolbar icon)

**Timeline:**
- Phase 1 (Delete AppHeader): 10 minutes
- Phase 2 (Detail views): 30 minutes (4 views)
- Phase 3 (Root views): 30 minutes (3 views)
- Phase 4 (Profile UI): 20 minutes (new ProfileView)
- Testing: 30 minutes (all views)
- **Total: ~2 hours**

**Priority:** High. Custom overlay pattern is architectural debt causing production issues.

**Next Steps:** Create feature branch `fix/native-navigation`, implement migration, test, merge.

---

## Additional Context

**User mentioned:** "Most recent build has search in the lower nav" (not top).

**Clarification needed:** Are you referring to:
1. **Tab bar search icon?** (magnifying glass in bottom tab bar)
2. **Navigation bar search?** (top toolbar)
3. **Something else?**

Current plan assumes search should be in **top navigation toolbar** (iOS standard). If you want search in tab bar, that's a different architectural decision (would require 4th tab for Search).

**iOS Platform Standard:**
- Search in navigation toolbar (top)
- Tabs in tab bar (bottom) for app sections
- Don't put search action in tab bar unless it's a dedicated search tab

Let me know if you want search as a 4th tab instead of toolbar access.

---

## Appendix: Native iOS Navigation Patterns

**Standard Patterns by View Type:**

### Modal Views (Full-Screen)
- `SearchView`, `TrailerView`, `ProfileView`
- Use `.sheet()` or `.fullScreenCover()` presentation
- Include explicit "Done" or "Close" button
- Dismissible via swipe-down (sheet) or button (full-screen)

### Root Tab Views
- `HomeView`, `GeniusView`, `WatchQueueView`
- Use `.navigationTitle()` with `.navigationBarTitleDisplayMode(.large)`
- Toolbar actions in trailing/leading positions
- Tab bar always visible

### Detail Views (Pushed)
- `MovieDetailView`, `CollectionDetailView`, `PersonDetailView`
- Use `.navigationBarTitleDisplayMode(.inline)`
- Native back button (free from NavigationStack)
- Toolbar content in principal/trailing/leading positions
- Tab bar auto-hides (iOS default)

### Settings/Profile Views
- Presented as modal sheet from toolbar icon
- Grouped list style (iOS standard)
- Dismiss button in navigation bar

---

**End of Review**
