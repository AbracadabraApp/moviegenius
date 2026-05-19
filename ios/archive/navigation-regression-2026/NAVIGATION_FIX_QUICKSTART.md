# Navigation Fix — Quick Start
**Problem:** Swipe-back broken on all detail views
**Cause:** AppHeader custom overlay requires hiding native navigation bar
**Solution:** Delete AppHeader, restore native iOS navigation
**Time:** 2 hours

---

## TL;DR

```bash
# 1. Create branch
git checkout -b fix/native-navigation

# 2. Delete AppHeader
git rm ios/moviegenius/moviegenius/Views/AppHeader.swift

# 3. Remove SwipeBackGesture from DesignSystem.swift (lines 660-686)

# 4. For each detail view (MovieDetailView, CollectionDetailView, PersonDetailView):
#    - Remove ZStack wrapper
#    - Remove Color.clear.frame(height: 60) spacer
#    - Remove AppHeader overlay
#    - Remove .navigationBarHidden(true)
#    - Remove .enableSwipeBack()
#    - Add native toolbar modifiers

# 5. For each root tab view (HomeView, GeniusView, WatchQueueView):
#    - Remove ZStack wrapper (keep for HomeView if using MGAtmosphericBackground)
#    - Remove spacer
#    - Remove AppHeader overlay
#    - Remove .navigationBarHidden(true)
#    - Add .navigationTitle() + .toolbar with search icon

# 6. Test swipe-back on all views
# 7. Commit and merge
```

---

## Reference Pattern

### Detail Views (pushed in NavigationStack)

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
        SearchBarCompactSmaller()  // Centered search button
    }
}
.toolbarBackground(.visible, for: .navigationBar)
.toolbarBackground(Color.mgBackground.opacity(0.95), for: .navigationBar)
.task {
    await viewModel.loadData()
}
```

### Root Tab Views

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
    .refreshable {
        await viewModel.loadData()
    }
    .task {
        await viewModel.loadData()
    }
}
```

---

## Files to Modify

### Delete
- [x] `Views/AppHeader.swift`
- [x] DesignSystem.swift (lines 660-686: SwipeBackGesture)

### Update Detail Views
- [ ] `Views/MovieDetailView.swift`
- [ ] `Views/CollectionDetailView.swift`
- [ ] `Views/PersonDetailView.swift`
- [ ] `Views/GeniusView.swift` (CategorySubcategoriesView, CategoryEssentialsView)

### Update Root Tab Views
- [ ] `Views/HomeView.swift`
- [ ] `Views/GeniusView.swift` (root)
- [ ] `Views/WatchQueueView.swift`

### Create New
- [ ] `Views/ProfileView.swift` (for sign-in UI)

---

## Testing Checklist

### Detail Views
- [ ] Swipe from left edge navigates back
- [ ] Back button shows parent title
- [ ] Search bar centered in toolbar
- [ ] Tapping search opens SearchView modal
- [ ] Tab bar hidden automatically

### Root Tab Views
- [ ] Large title visible ("Movies", "Genius", "Watchlist")
- [ ] Search icon in top-right toolbar
- [ ] Tapping search opens SearchView modal
- [ ] Tab bar always visible
- [ ] Large title collapses on scroll

### Overall
- [ ] No crashes
- [ ] No gesture conflicts
- [ ] No layout issues
- [ ] Sign-in UI accessible (profile icon)

---

## Reference Commit

**Commit `ac5a2ae52` (2026-05-13) — Last working implementation**

View correct pattern:
```bash
git show ac5a2ae52:ios/moviegenius/moviegenius/Views/MovieDetailView.swift
```

---

## Questions?

1. **Do I need to update SearchView?** No, already correct.
2. **Do I need to update MainTabView?** No, already correct.
3. **Where does sign-in UI go?** Create ProfileView, add icon to HomeView toolbar.
4. **Will this break anything?** No, reverting to known-good implementation.
5. **How long will this take?** ~2 hours including testing.

---

## Documents

- `IOS_NAVIGATION_ARCHITECTURE_REVIEW.md` — Full architectural analysis
- `NAVIGATION_MIGRATION_GUIDE.md` — Detailed step-by-step instructions
- `ANSWERS_TO_YOUR_QUESTIONS.md` — Answers to your specific questions
- `IOS_NAVIGATION_FIX_PLAN.md` — Your original plan (confirmed correct)

**Start here:** Read `ANSWERS_TO_YOUR_QUESTIONS.md` for Q&A, then follow `NAVIGATION_MIGRATION_GUIDE.md` for implementation.
