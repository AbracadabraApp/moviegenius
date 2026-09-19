# iOS Navigation Best Practices for MovieGenius

**Last Updated:** 2025-05-18
**Status:** REQUIRED READING before modifying any View file

---

## Navigation Regression Incident (May 2025)

**What happened:** Commit `9237ed047` introduced custom `AppHeader` with `.navigationBarHidden(true)`, breaking swipe-back gestures across the entire app.

**Root cause:** Hiding navigation bar disables iOS gesture recognizers.

**Lesson:** Always use native SwiftUI navigation patterns. Never overlay custom headers.

---

## ✅ Correct Patterns

### 1. Screen Titles

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
        AppHeader(title: "The Godfather") // Breaks swipe-back
        Spacer()
    }
    MovieDetailView(movieId: 123)
}
.navigationBarHidden(true)  // ❌ NEVER DO THIS
```

### 2. Search UI

```swift
// ✅ CORRECT: Native searchable
struct SearchView: View {
    @State private var query = ""

    var body: some View {
        NavigationStack {
            List(results) { movie in
                MovieRow(movie: movie)
            }
            .navigationTitle("Search")
            .searchable(text: $query, prompt: "Search movies...")
        }
    }
}

// ❌ WRONG: Custom search overlay
ZStack {
    VStack {
        HStack {
            TextField("Search...", text: $query) // Breaks native UX
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

### 3. Action Buttons

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

### 4. Navigation Hierarchy

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
    MovieDetailView(movie: movie) // Loses navigation context
}
```

---

## ❌ Banned Patterns

These patterns are **BLOCKED by SwiftLint and pre-commit hooks:**

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

**Status:** DELETED as of May 2025.

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

1. ✅ Run SwiftLint: `cd ios && swiftlint lint`
2. ✅ Run navigation tests: `xcodebuild test -scheme moviegenius -only-testing:NavigationRegressionTests`
3. ✅ Manual test on **physical device** (simulator gestures differ):
   - Swipe from left edge → should navigate back
   - Back button shows correct parent title
   - Tab bar hides on push, shows on root
   - No visual glitches during transitions

---

## Common Pitfalls

### Pitfall 1: "I need a custom header for design reasons"

**Wrong approach:** Hide nav bar, add custom overlay.

**Correct approach:** Use `.navigationTitle()` with styling:
```swift
.navigationTitle("Movies")
.navigationBarTitleDisplayMode(.large)
.toolbarBackground(.visible, for: .navigationBar)
.toolbarBackground(Color.black, for: .navigationBar)
```

### Pitfall 2: "Search bar looks wrong in navigation"

**Wrong approach:** Custom TextField overlay.

**Correct approach:** Use `.searchable()` with customization:
```swift
.searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always))
```

### Pitfall 3: "Swipe-back stopped working after my change"

**Diagnosis:**
1. Did you add `.navigationBarHidden(true)`? → Remove it
2. Did you add custom overlay? → Use native patterns
3. Did you add gesture recognizer? → May conflict with navigation gestures

**Fix:** Revert to native navigation patterns above.

---

## Reference Implementations

**Correct MovieDetailView pattern:**
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

**Correct SearchView pattern:**
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

---

## Apple HIG References

- [Navigation Patterns](https://developer.apple.com/design/human-interface-guidelines/navigation)
- [Searching](https://developer.apple.com/design/human-interface-guidelines/searching)
- [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)

---

## Questions?

Before implementing custom navigation patterns, ask:
1. Does Apple HIG provide a native pattern for this?
2. Why can't I use `.navigationTitle()` / `.searchable()` / `.toolbar()`?
3. Will this break swipe-back gestures?

If unsure, test on physical device first.
