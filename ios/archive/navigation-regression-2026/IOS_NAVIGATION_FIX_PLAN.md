# iOS Navigation Fix Plan

**Problem:** Swipe-back gesture broken because AppHeader requires hiding navigation bar with `.toolbar(.hidden)`, which disables the native gesture.

**Root Cause:** Custom AppHeader overlay pattern (borrowed from web thinking) fights iOS conventions.

---

## ❌ Wrong Solution (What I Was Doing)

- Keep AppHeader + `.toolbar(.hidden)`
- Add UIKit introspection to force-enable swipe gesture
- Result: Fragile, requires maintenance, fights the platform

## ✅ Correct Solution (Native iOS)

**Use standard iOS navigation with `.searchable()` modifier**

### Architecture

```swift
struct MovieDetailView: View {
    var body: some View {
        ScrollView {
            // Content
        }
        .navigationTitle("Movie Title")           // Standard nav title
        .navigationBarTitleDisplayMode(.inline)   // Small title
        .searchable(text: $searchText)            // Native search in toolbar
        // .toolbar(.hidden) ← REMOVE THIS
    }
}
```

**Benefits:**
- ✅ Swipe-back works automatically (iOS default)
- ✅ Native search UI (bottom of nav bar when activated)
- ✅ Standard back button (free from NavigationStack)
- ✅ No custom overlay positioning hacks
- ✅ Respects safe areas automatically

---

## Migration Plan

### Phase 1: Remove AppHeader
- **Delete:** `AppHeader.swift` entirely
- **Delete:** All `AppHeader(showBackButton:)` usages
- **Delete:** `.toolbar(.hidden)` modifiers
- **Delete:** ZStack overlay patterns

### Phase 2: Add Native Navigation
For each view (MovieDetailView, CollectionDetailView, PersonDetailView, GeniusView subviews):

```swift
// OLD (wrong):
ZStack {
    ScrollView { /* content */ }
    VStack {
        AppHeader(showBackButton: true)
        Spacer()
    }
}
.toolbar(.hidden)

// NEW (correct):
ScrollView { /* content */ }
.navigationTitle(title)
.navigationBarTitleDisplayMode(.inline)
.searchable(text: $searchViewModel.searchText,
            placement: .navigationBarDrawer(displayMode: .always))
```

### Phase 3: Search Integration
- **SearchView.swift:** Already uses `.searchable()` correctly (SearchView.swift:76-80)
- **Other views:** Can open SearchView as a sheet from toolbar button
- **Alternative:** Each view can have its own inline `.searchable()` for contextual search

### Phase 4: Tab Bar Search (Optional)
For root views (HomeView, GeniusView root), can add toolbar search button:

```swift
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

---

## Files to Modify

**Delete:**
- `moviegenius/Views/AppHeader.swift`

**Modify:**
- `moviegenius/Views/MovieDetailView.swift` - Add .navigationTitle + .searchable
- `moviegenius/Views/CollectionDetailView.swift` - Add .navigationTitle + .searchable
- `moviegenius/Views/PersonDetailView.swift` - Add .navigationTitle + .searchable
- `moviegenius/Views/GeniusView.swift` - Add .navigationTitle to root + subviews
- `moviegenius/Views/WatchQueueView.swift` - Add .navigationTitle
- `moviegenius/Views/HomeView.swift` - Add toolbar search button

**Keep as-is:**
- `moviegenius/Views/SearchView.swift` - Already correct (uses .searchable())
- `moviegenius/Views/MainTabView.swift` - NavigationStack structure is correct

---

## Testing Checklist

- [ ] Swipe from left edge navigates back on all detail views
- [ ] Search bar appears in navigation toolbar (not custom overlay)
- [ ] Back button shows correct parent title
- [ ] Tab bar visible on root views, hidden on detail views (automatic)
- [ ] No Z-fighting or overlay positioning issues
- [ ] Sign-in state (if any) accessible from profile icon in toolbar

---

## References

- SearchView.swift:76-80 - Correct `.searchable()` usage example
- Apple HIG: [Navigation Bars](https://developer.apple.com/design/human-interface-guidelines/navigation-bars)
- SwiftUI `.searchable()`: [Documentation](https://developer.apple.com/documentation/swiftui/view/searchable(text:placement:))
