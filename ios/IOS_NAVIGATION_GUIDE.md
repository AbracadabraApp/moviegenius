# iOS Navigation Guide
**Status:** ✅ CURRENT - Required reading for all View modifications
**Last Updated:** 2026-05-18
**Consolidates:** 5 previous navigation documents into single source of truth
**Related:** DOCUMENTATION_LESSONS_LEARNED.md (Mistake Pattern #1)

---

## Table of Contents

1. [Quick Reference](#quick-reference) - TL;DR patterns (2 minutes)
2. [The May 2026 Incident](#the-may-2026-incident) - What happened and why
3. [Best Practices](#best-practices) - Correct patterns (Required reading)
4. [Banned Patterns](#banned-patterns) - What NOT to do
5. [Testing Requirements](#testing-requirements) - Pre-commit checklist
6. [Migration Guide](#migration-guide) - Historical reference (migration complete)
7. [Reference Implementations](#reference-implementations) - Code examples

---

## Quick Reference

**TL;DR: Use native iOS navigation. Never hide the navigation bar.**

### Detail Views (MovieDetailView, CollectionDetailView, etc.)

```swift
ScrollView {
    VStack(spacing: 0) {
        // Content (no spacer)
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
```

### Root Tab Views (HomeView, GeniusView, WatchQueueView)

```swift
@State private var showSearch = false

var body: some View {
    ScrollView {
        LazyVStack(spacing: 0) {
            // Content (no spacer)
        }
    }
    .scrollIndicators(.hidden)
    .navigationTitle("Movies")
    .navigationBarTitleDisplayMode(.large)
    .toolbar {
        ToolbarItem(placement: .navigationBarTrailing) {
            Button {
                showSearch = true
            } label: {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(Color.mgGold)
            }
        }
    }
    .sheet(isPresented: $showSearch) {
        SearchView()
    }
}
```

---

## The May 2026 Incident

### What Happened

**Timeline:**
- **May 13 (Commit `ac5a2ae52`)**: Native iOS navigation working correctly
- **May 15 (Commit `9237ed047`)**: Custom `AppHeader.swift` introduced with custom overlay pattern
- **May 15 (Commit `813101bde`)**: Swipe-back broken, UIKit hack (`.enableSwipeBack()`) added to fix
- **May 18**: Reverted to native patterns, archived all incident docs

**Impact:** 5 documentation files created, 2-3 days development time, broken user gestures.

### Root Cause Analysis

**The Mistake:**
```swift
// ❌ WRONG: Custom overlay header
ZStack(alignment: .top) {
    ScrollView {
        VStack(spacing: 0) {
            Color.clear.frame(height: 60)  // Manual spacer
            // Content
        }
    }

    VStack {
        AppHeader(showBackButton: true)  // Custom overlay
        Spacer()
    }
}
.navigationBarHidden(true)  // ← BREAKS swipe-back
.enableSwipeBack()          // ← UIKit hack to fix
```

**Why It Happened:**
1. **Web-influenced thinking** - Treated navigation bar as "fixed header" overlay
2. **Desire for pixel-perfect control** - Wanted custom header positioning
3. **Didn't test gestures** - Swipe-back not tested until deployed
4. **Platform conventions seemed limiting** - Native patterns felt restrictive

**Why It Broke:**
1. `.navigationBarHidden(true)` disables `UINavigationController.interactivePopGestureRecognizer`
2. Custom overlay requires hiding navigation bar to prevent overlap
3. UIKit introspection to re-enable gesture is fragile and unreliable
4. Breaks standard back button (no parent title)
5. Tab bar hiding must be managed manually

**The Lesson:**

> **"Fighting the platform creates technical debt. 5 docs written explaining workarounds vs 0 docs needed for native patterns."**

**See:** DOCUMENTATION_LESSONS_LEARNED.md for full analysis and prevention strategies.

---

## Best Practices

### Platform Convention Principle

**Rule:** Use iOS native patterns first. Custom solutions only when platform doesn't provide the feature.

✅ **Using Platform Correctly:**
- Features work without UIKit introspection
- Standard gestures work automatically
- Documentation explains WHAT to use, not HOW to work around
- Code is concise (< 50 lines for standard features)
- Other iOS devs would recognize the pattern

❌ **Fighting the Platform:**
- Need `UIViewControllerRepresentable` for standard features
- Docs describe "hacks", "workarounds", or "introspection"
- Code has comments like `// Force enable gesture`
- Standard iOS features stop working
- Solution requires multiple files to explain

### Pattern #1: Screen Titles

```swift
// ✅ CORRECT: Native navigation title
NavigationStack {
    MovieDetailView(movieId: 123)
        .navigationTitle("The Godfather")
        .navigationBarTitleDisplayMode(.inline)
}

// ❌ WRONG: Custom overlay header
ZStack {
    VStack {
        AppHeader(title: "The Godfather")  // Breaks swipe-back
        Spacer()
    }
    MovieDetailView(movieId: 123)
}
.navigationBarHidden(true)  // ❌ NEVER DO THIS
```

### Pattern #2: Search UI

```swift
// ✅ CORRECT: Toolbar button opening modal
@State private var showSearch = false

.toolbar {
    ToolbarItem(placement: .principal) {
        Button {
            showSearch = true
        } label: {
            SearchBarCompactSmaller()
        }
    }
}
.sheet(isPresented: $showSearch) {
    SearchView()
}

// ❌ WRONG: Custom TextField overlay
ZStack {
    VStack {
        HStack {
            TextField("Search...", text: $query)  // Loses native UX
            Spacer()
        }
        .padding()
        .background(Color.black)

        Spacer()
    }
    .ignoresSafeArea()

    SearchResultsView()
}
```

### Pattern #3: Action Buttons

```swift
// ✅ CORRECT: Toolbar items
.toolbar {
    ToolbarItem(placement: .topBarTrailing) {
        Button("Share", systemImage: "square.and.arrow.up") {
            shareMovie()
        }
    }
}

// ❌ WRONG: Overlay button
ZStack {
    VStack {
        HStack {
            Spacer()
            Button("Share") { shareMovie() }
                .padding()
        }
        Spacer()
    }

    MovieDetailView()
}
```

### Pattern #4: Navigation Hierarchy

```swift
// ✅ CORRECT: NavigationStack with NavigationLink
NavigationStack {
    List(movies) { movie in
        NavigationLink(value: movie) {
            MovieRow(movie: movie)
        }
    }
    .navigationDestination(for: Movie.self) { movie in
        MovieDetailView(movie: movie)
    }
}

// ❌ WRONG: Manual sheet presentation for detail views
List(movies) { movie in
    MovieRow(movie: movie)
        .onTapGesture {
            selectedMovie = movie
        }
}
.sheet(item: $selectedMovie) { movie in
    MovieDetailView(movie: movie)  // Loses navigation context
}
```

---

## Banned Patterns

**These patterns are BLOCKED by SwiftLint and pre-commit hooks:**

### 1. `.navigationBarHidden(true)`

**Why banned:** Disables swipe-back gesture, breaks iOS navigation UX.

**When it seems necessary:** You need native navigation patterns instead.

### 2. Custom Header Overlays

```swift
// ❌ BANNED
ZStack {
    VStack {
        CustomHeader()
        Spacer()
    }
    .ignoresSafeArea()

    ContentView()
}
```

**Why banned:** Conflicts with native navigation, requires hiding nav bar.

**Alternative:** Use `.navigationTitle()` + `.toolbar { }` + `.navigationBarTitleDisplayMode()`.

### 3. `AppHeader` Component

**Status:** DELETED as of May 2026.

**Why:** Caused navigation regression. All usage replaced with native patterns.

### 4. `.toolbar(.hidden)`

**Why banned:** May break navigation bar visibility and gestures.

**Alternative:** Use `.toolbarVisibility(.hidden, for: .navigationBar)` with specific placement if absolutely necessary.

### 5. UIKit Introspection for Navigation

```swift
// ❌ AVOID
.introspect(.navigationController, on: .iOS(.v15...)) { nav in
    nav.interactivePopGestureRecognizer?.isEnabled = true
}
```

**Why:** Band-aid fix for underlying SwiftUI issue. Fix root cause instead.

---

## Testing Requirements

**Before committing ANY navigation changes:**

1. ✅ Run SwiftLint:
   ```bash
   cd ios && swiftlint lint
   ```

2. ✅ Run navigation tests:
   ```bash
   xcodebuild test -scheme moviegenius -only-testing:NavigationRegressionTests
   ```

3. ✅ Manual test on **physical device** (simulator gestures differ):
   - Swipe from left edge → should navigate back
   - Back button shows correct parent title
   - Tab bar hides on push, shows on root
   - No visual glitches during transitions

---

## Common Pitfalls

### Pitfall #1: "I need a custom header for design reasons"

**Wrong approach:** Hide nav bar, add custom overlay.

**Correct approach:** Use `.navigationTitle()` with styling:
```swift
.navigationTitle("Movies")
.navigationBarTitleDisplayMode(.large)
.toolbarBackground(.visible, for: .navigationBar)
.toolbarBackground(Color.black, for: .navigationBar)
```

### Pitfall #2: "Search bar looks wrong in navigation"

**Wrong approach:** Custom TextField overlay.

**Correct approach:** Use `.searchable()` with customization:
```swift
.searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always))
```

### Pitfall #3: "Swipe-back stopped working after my change"

**Diagnosis:**
1. Did you add `.navigationBarHidden(true)`? → Remove it
2. Did you add custom overlay? → Use native patterns
3. Did you add gesture recognizer? → May conflict with navigation gestures

**Fix:** Revert to native navigation patterns above.

---

## Migration Guide

> **⚠️ NOTE:** This migration was completed in May 2026. This section is preserved for historical reference only. If you're working on the codebase now, native patterns are already in use.

### Historical Context

The AppHeader custom overlay pattern was introduced on May 15, 2026 and reverted on May 18, 2026. This section documents how the migration was performed for future reference.

### What Was Changed

**Deleted:**
- `/ios/moviegenius/moviegenius/Views/AppHeader.swift` (entire file)
- SwipeBackGesture modifier from DesignSystem.swift

**Updated (8 views):**
- MovieDetailView.swift
- CollectionDetailView.swift
- PersonDetailView.swift
- GeniusView.swift (CategorySubcategoriesView, CategoryEssentialsView)
- HomeView.swift
- WatchQueueView.swift

**Created:**
- ProfileView.swift (for sign-in UI previously in AppHeader)

### Migration Pattern

**Before (Custom Overlay):**
```swift
var body: some View {
    ZStack(alignment: .top) {
        ScrollView {
            VStack(spacing: 0) {
                Color.clear.frame(height: 60)  // Manual spacer
                // Content
            }
        }

        VStack {
            AppHeader(showBackButton: true)
            Spacer()
        }
    }
    .navigationBarHidden(true)
    .enableSwipeBack()
}
```

**After (Native Navigation):**
```swift
var body: some View {
    ScrollView {
        VStack(spacing: 0) {
            // No spacer - content starts at top
            // Content
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
}
```

### Reference Commit

**Commit `ac5a2ae52` (2026-05-13)** - Last correct implementation before regression.

View correct pattern:
```bash
git show ac5a2ae52:ios/moviegenius/moviegenius/Views/MovieDetailView.swift
```

### Timeline

- **May 13**: Native navigation working (commit `ac5a2ae52`)
- **May 15**: AppHeader introduced (commit `9237ed047`), swipe-back broken
- **May 15**: UIKit hack added (commit `813101bde`)
- **May 18**: Reverted to native patterns, migration complete

### Lessons Learned

1. **Test gestures immediately** - Don't wait until deployment
2. **Use platform conventions** - Custom solutions create debt
3. **Document incidents, then archive** - 5 docs created, should have been 1
4. **Revert quickly** - 3 days of work discarded, but correct decision

**See:** DOCUMENTATION_LESSONS_LEARNED.md for detailed analysis.

---

## Reference Implementations

### MovieDetailView (Detail View Pattern)

```swift
struct MovieDetailView: View {
    let movieId: Int
    @StateObject private var viewModel: MovieDetailViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                MoviePosterView(movieId: movieId)
                AnalysisTextView(analysis: viewModel.analysis)
                CastListView(cast: viewModel.cast)
            }
        }
        .navigationTitle(viewModel.movie.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                FavoriteButton(movieId: movieId)
            }
        }
        .task {
            await viewModel.loadMovie()
        }
    }
}
```

### SearchView (Modal Pattern)

```swift
struct SearchView: View {
    @State private var query = ""
    @StateObject private var viewModel = SearchViewModel()

    var body: some View {
        NavigationStack {
            List(viewModel.results) { movie in
                NavigationLink(value: movie) {
                    MovieRow(movie: movie)
                }
            }
            .navigationTitle("Search")
            .searchable(text: $query, prompt: "Search movies...")
            .onChange(of: query) { _, newValue in
                viewModel.search(query: newValue)
            }
            .navigationDestination(for: Movie.self) { movie in
                MovieDetailView(movieId: movie.tmdbId)
            }
        }
    }
}
```

### HomeView (Root Tab Pattern)

```swift
struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @State private var showSearch = false
    @State private var showProfile = false
    @ObservedObject private var auth = AuthManager.shared

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(viewModel.collections) { collection in
                    CollectionCarousel(collection: collection)
                }
            }
        }
        .scrollIndicators(.hidden)
        .navigationTitle("Movies")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button {
                    showProfile = true
                } label: {
                    Image(systemName: auth.isAuthenticated ? "person.circle.fill" : "person.circle")
                        .foregroundStyle(Color.mgGold)
                }
            }

            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showSearch = true
                } label: {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Color.mgGold)
                }
            }
        }
        .sheet(isPresented: $showSearch) {
            SearchView()
        }
        .sheet(isPresented: $showProfile) {
            ProfileView()
        }
        .refreshable {
            await viewModel.loadInitialCollections()
        }
        .task {
            await viewModel.loadInitialCollections()
        }
    }
}
```

---

## Apple HIG References

- [Navigation Patterns](https://developer.apple.com/design/human-interface-guidelines/navigation)
- [Searching](https://developer.apple.com/design/human-interface-guidelines/searching)
- [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)
- [SwiftUI Navigation](https://developer.apple.com/documentation/swiftui/navigationstack)

---

## Archived Documentation

**This guide consolidates these 5 previous documents:**

1. `IOS_NAVIGATION_BEST_PRACTICES.md` (308 lines) → Best Practices section
2. `IOS_NAVIGATION_ARCHITECTURE_REVIEW.md` (597 lines) → Incident analysis
3. `IOS_NAVIGATION_FIX_PLAN.md` (134 lines) → Problem statement
4. `NAVIGATION_FIX_QUICKSTART.md` (179 lines) → Quick Reference section
5. `NAVIGATION_MIGRATION_GUIDE.md` (688 lines) → Migration Guide section

**Archived to:** `/ios/archive/navigation-regression-2026/`

These files are preserved for historical reference but should NOT be followed for current development. This guide is the single source of truth for iOS navigation patterns.

---

## Questions?

**Before implementing custom navigation patterns, ask:**

1. Does Apple HIG provide a native pattern for this?
2. Why can't I use `.navigationTitle()` / `.searchable()` / `.toolbar()`?
3. Will this break swipe-back gestures?

**If unsure, test on physical device first.**

**For questions, see:**
- This guide (single source of truth)
- DOCUMENTATION_LESSONS_LEARNED.md (why these patterns matter)
- Apple HIG (platform conventions)

---

**End of Guide**
