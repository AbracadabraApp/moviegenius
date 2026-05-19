# Navigation Migration Guide
**Target:** Revert to native iOS navigation (remove AppHeader)
**Reference Commit:** `ac5a2ae52` (2026-05-13) - Last correct implementation
**Estimated Time:** 2 hours

---

## Quick Start

```bash
cd /Users/josh.petersen/moviegenius

# Create feature branch
git checkout -b fix/native-navigation

# Follow steps below
```

---

## Step 1: Delete AppHeader Infrastructure (5 min)

### 1.1 Delete AppHeader.swift
```bash
git rm ios/moviegenius/moviegenius/Views/AppHeader.swift
```

### 1.2 Remove SwipeBackGesture from DesignSystem.swift

**File:** `/ios/moviegenius/moviegenius/DesignSystem.swift`

**Delete lines 660-686:**
```swift
// DELETE THIS:
struct SwipeBackGesture: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(
                UIViewControllerRepresentation()
            )
    }

    private struct UIViewControllerRepresentation: UIViewControllerRepresentable {
        func makeUIViewController(context: Context) -> UIViewController {
            UIViewController()
        }

        func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
            DispatchQueue.main.async {
                if let navigationController = uiViewController.navigationController ?? uiViewController
                    .view
                    .window?
                    .rootViewController?
                    .children
                    .first(where: { $0 is UINavigationController }) as? UINavigationController {
                    navigationController.interactivePopGestureRecognizer?.isEnabled = true
                    navigationController.interactivePopGestureRecognizer?.delegate = nil
                }
            }
    }
}

extension View {
    /// Enable swipe-back navigation gesture (for views with hidden navigation bar)
    func enableSwipeBack() -> some View {
        modifier(SwipeBackGesture())
    }
}
```

---

## Step 2: Migrate Detail Views (30 min)

### 2.1 MovieDetailView.swift

**Reference:** `git show ac5a2ae52:ios/moviegenius/moviegenius/Views/MovieDetailView.swift`

**Changes:**
1. Remove ZStack wrapper
2. Remove `Color.clear.frame(height: 60)` spacer (line 25)
3. Remove AppHeader overlay (lines 111-115)
4. Remove `.navigationBarHidden(true)` (line 118)
5. Remove `.enableSwipeBack()` (line 119)
6. Add native toolbar modifiers

**Before (lines 20-121):**
```swift
var body: some View {
    ZStack(alignment: .top) {
        ScrollView {
            VStack(spacing: 0) {
                // Top spacer for overlaid header
                Color.clear.frame(height: 60)

                if let movieResponse = viewModel.movieResponse {
                    // ... content
                }
            }
        }
        .scrollIndicators(.hidden)
        .task {
            await viewModel.loadMovie()
        }

        // Overlaid AppHeader
        VStack {
            AppHeader(showBackButton: true)
            Spacer()
        }
    }
    .background(Color.mgBackground)
    .navigationBarHidden(true)
    .enableSwipeBack()
}
```

**After:**
```swift
var body: some View {
    ScrollView {
        VStack(spacing: 0) {
            // No spacer - content starts at top

            if let movieResponse = viewModel.movieResponse {
                // ... content
            }
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

**Test:**
```bash
# Build and run
# Navigate to any movie detail
# Test swipe-back from left edge
# Verify back button shows parent title
```

---

### 2.2 CollectionDetailView.swift

**Changes:** Same pattern as MovieDetailView

1. Remove ZStack wrapper (line 21)
2. Remove spacer (line 26)
3. Remove AppHeader overlay (lines 139-143)
4. Remove `.navigationBarHidden(true)` (line 146)
5. Remove `.enableSwipeBack()` (line 147)
6. Add toolbar modifiers

**Before (lines 20-147):**
```swift
var body: some View {
    ZStack(alignment: .top) {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                Color.clear.frame(height: 60)
                // ... content
            }
        }
        // ... other modifiers

        VStack {
            AppHeader(showBackButton: true)
            Spacer()
        }
    }
    .navigationBarHidden(true)
    .enableSwipeBack()
}
```

**After:**
```swift
var body: some View {
    ScrollView {
        VStack(alignment: .leading, spacing: 0) {
            // No spacer

            if let collection = viewModel.collection {
                // Collection header
                VStack(alignment: .leading, spacing: .mgSpacing6) {
                    Text(collection.title)
                        .font(.mgTitle)
                        .foregroundStyle(Color.mgPrimary)
                    // ... rest of header
                }
                .padding(.mgSpacing20)
                // ... rest of content
            }
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
        if viewModel.collection == nil {
            await viewModel.loadCollection()
        }
    }
}
```

---

### 2.3 PersonDetailView.swift

**Changes:** Same pattern

1. Remove ZStack wrapper
2. Remove spacer
3. Remove AppHeader overlay
4. Remove `.navigationBarHidden(true)` (line 44)
5. Remove `.enableSwipeBack()` (line 45)
6. Add toolbar modifiers

**After:**
```swift
var body: some View {
    ScrollView {
        VStack(spacing: 0) {
            // No spacer

            if let person = viewModel.person {
                // ... content
            }
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
        await viewModel.loadPerson()
    }
}
```

---

### 2.4 GeniusView Subviews

**Files to update:**
- `CategorySubcategoriesView` (line 494)
- `CategoryEssentialsView` (line 731)

**Find in GeniusView.swift:**
```swift
.navigationBarHidden(true)
.enableSwipeBack()
```

**Replace with:**
```swift
.navigationBarTitleDisplayMode(.inline)
.toolbar {
    ToolbarItem(placement: .principal) {
        SearchBarCompactSmaller()
    }
}
.toolbarBackground(.visible, for: .navigationBar)
.toolbarBackground(Color.mgBackground.opacity(0.95), for: .navigationBar)
```

**Also remove ZStack and spacer from these views if present.**

---

## Step 3: Migrate Root Tab Views (30 min)

### 3.1 HomeView.swift

**Changes:**
1. Remove ZStack wrapper
2. Remove spacer from LazyVStack (line 19)
3. Remove AppHeader overlay
4. Remove `.navigationBarHidden(true)`
5. Add navigation title and toolbar

**Before:**
```swift
var body: some View {
    ZStack(alignment: .top) {
        MGAtmosphericBackground()

        ScrollView {
            LazyVStack(spacing: 0) {
                Color.clear.frame(height: 60)
                // ... content
            }
        }

        VStack {
            AppHeader()
            Spacer()
        }
    }
    .navigationBarHidden(true)
}
```

**After:**
```swift
@State private var showSearch = false

var body: some View {
    ZStack(alignment: .top) {
        MGAtmosphericBackground()

        ScrollView {
            LazyVStack(spacing: 0) {
                // No spacer

                if let error = viewModel.error {
                    // ... error state
                } else if viewModel.isLoading && viewModel.collections.isEmpty {
                    // ... loading skeleton
                } else if viewModel.collections.isEmpty {
                    // ... empty state
                } else {
                    // Collections
                    ForEach(viewModel.collections) { collection in
                        CollectionCarousel(collection: collection)
                    }
                    // ... load more trigger
                }
            }
        }
        .scrollIndicators(.hidden)
    }
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
        await viewModel.loadInitialCollections()
    }
    .task {
        await viewModel.loadInitialCollections()
    }
}
```

---

### 3.2 GeniusView.swift (Root Tab)

**Changes:** Same pattern as HomeView

**Find the root body (around line 104):**
```swift
.navigationBarHidden(true)
.enableSwipeBack()
```

**Replace with:**
```swift
@State private var showSearch = false

// ... in body:
.navigationTitle("Genius")
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
```

---

### 3.3 WatchQueueView.swift

**Changes:** Same pattern

**Before (line 67):**
```swift
.navigationBarHidden(true)
.enableSwipeBack()
```

**After:**
```swift
@State private var showSearch = false

// ... in body:
.navigationTitle("Watchlist")
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
```

---

## Step 4: Handle Sign-In UI (20 min)

**Issue:** AppHeader had sign-in indicator and logout button.

**Solution:** Add profile icon to HomeView toolbar (or all root tabs).

### 4.1 Add Profile Button to HomeView

**Add to toolbar:**
```swift
.toolbar {
    // Sign-in profile button (leading)
    ToolbarItem(placement: .navigationBarLeading) {
        Button {
            showProfile = true
        } label: {
            Image(systemName: auth.isAuthenticated ? "person.circle.fill" : "person.circle")
                .foregroundStyle(Color.mgGold)
        }
    }

    // Search button (trailing)
    ToolbarItem(placement: .navigationBarTrailing) {
        Button {
            showSearch = true
        } label: {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(Color.mgGold)
        }
    }
}
.sheet(isPresented: $showProfile) {
    ProfileView()
}
```

**Add state:**
```swift
@State private var showSearch = false
@State private var showProfile = false
@ObservedObject private var auth = AuthManager.shared
```

### 4.2 Create ProfileView (Simple)

**Create:** `/ios/moviegenius/moviegenius/Views/ProfileView.swift`

```swift
import SwiftUI

struct ProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var auth = AuthManager.shared
    @State private var showSignOutConfirmation = false

    var body: some View {
        NavigationStack {
            List {
                if auth.isAuthenticated {
                    Section {
                        if let email = auth.currentUser?.email {
                            Text(email)
                                .font(.mgBody)
                        }
                    } header: {
                        Text("Signed In")
                    }

                    Section {
                        Button(role: .destructive) {
                            showSignOutConfirmation = true
                        } label: {
                            Text("Sign Out")
                        }
                    }
                } else {
                    Section {
                        Text("Sign in to sync your favorites and watch queue")
                            .font(.mgBody)
                            .foregroundStyle(Color.mgSecondary)
                    }

                    Section {
                        SignInPromptView()
                    }
                }
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundStyle(Color.mgGold)
                }
            }
            .confirmationDialog("Sign Out", isPresented: $showSignOutConfirmation) {
                Button("Sign Out", role: .destructive) {
                    auth.signOut()
                    dismiss()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                if let email = auth.currentUser?.email {
                    Text("Signed in as \(email)")
                } else {
                    Text("Are you sure you want to sign out?")
                }
            }
        }
    }
}

#Preview {
    ProfileView()
}
```

---

## Step 5: Testing (30 min)

### 5.1 Build and Run
```bash
# From Xcode
# Product → Build (Cmd+B)
# Product → Run (Cmd+R)
```

### 5.2 Test Matrix

**Detail Views:**
- [ ] MovieDetailView: Swipe-back works, back button shows parent
- [ ] CollectionDetailView: Swipe-back works, back button shows parent
- [ ] PersonDetailView: Swipe-back works, back button shows parent
- [ ] GeniusView subviews: Swipe-back works on CategorySubcategoriesView
- [ ] GeniusView subviews: Swipe-back works on CategoryEssentialsView

**Root Tab Views:**
- [ ] HomeView: Large title "Movies", search icon top-right
- [ ] GeniusView: Large title "Genius", search icon top-right
- [ ] WatchQueueView: Large title "Watchlist", search icon top-right
- [ ] Tab bar visible on all root views

**Search Flow:**
- [ ] Tapping search icon opens SearchView modal
- [ ] Search bar centered in detail view toolbars
- [ ] Swipe-down dismisses SearchView
- [ ] Keyboard auto-focuses in SearchView

**Profile/Sign-In:**
- [ ] Profile icon in top-left of HomeView
- [ ] Tapping profile opens ProfileView modal
- [ ] Sign-in flow works (if implemented)
- [ ] Sign-out flow works with confirmation

**Navigation Gestures:**
- [ ] Swipe from left edge on all detail views navigates back
- [ ] No crashes or gesture recognition issues
- [ ] Back button tap works on all views
- [ ] Tab bar auto-hides on pushed views

---

## Step 6: Commit and Push

```bash
git add -A
git commit -m "Restore native iOS navigation

Remove AppHeader custom overlay pattern and restore native NavigationStack
with standard toolbar modifiers. This fixes swipe-back gesture regression
and aligns with iOS platform conventions.

Changes:
- Delete AppHeader.swift and SwipeBackGesture infrastructure
- Restore native toolbar with .navigationBarTitleDisplayMode(.inline)
- Add SearchBarCompactSmaller to toolbar principal position (detail views)
- Add search icon to toolbar trailing position (root tab views)
- Add profile icon to toolbar leading position (HomeView)
- Create ProfileView for sign-in/out functionality

Reference implementation from commit ac5a2ae52 (2026-05-13).

Fixes swipe-back gesture on all detail views without UIKit hacks.
"

git push origin fix/native-navigation
```

---

## Rollback Plan

If issues occur:
```bash
# Revert changes
git checkout main
git branch -D fix/native-navigation

# Or revert to AppHeader state
git checkout 813101bde
```

---

## Summary

**Migration replaces:**
- Custom AppHeader overlay → Native navigation toolbar
- `.navigationBarHidden(true)` → Native navigation bar
- `.enableSwipeBack()` hack → iOS default gesture (automatic)
- ZStack positioning → Standard ScrollView layout
- Manual 60pt spacer → Native safe area handling

**Result:**
- ✅ Swipe-back works automatically on all views
- ✅ Back button shows parent title
- ✅ No UIKit introspection needed
- ✅ Tab bar auto-hides on push (iOS default)
- ✅ Follows iOS platform conventions
- ✅ Easier to maintain (standard pattern)

**Estimated time:** 2 hours (including testing)

---

## Questions?

- Where does sign-in UI live now? → Profile icon in HomeView toolbar
- Can users still search everywhere? → Yes, via toolbar icon or principal position
- Will this break anything? → No, restoring known-good implementation
- What if swipe-back still doesn't work? → Check NavigationStack structure in MainTabView
- Do I need to update MainTabView? → No, MainTabView already correct
