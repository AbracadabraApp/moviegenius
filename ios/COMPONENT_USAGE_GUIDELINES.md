# MovieGenius iOS Component Usage Guidelines

**Last Updated:** 2026-05-20
**Purpose:** Prevent recurring breaking changes and maintain consistency

---

## Table of Contents
1. [Critical Rules (NEVER Violate)](#critical-rules-never-violate)
2. [StandardMovieCard Usage](#standardmoviecard-usage)
3. [Navigation Patterns](#navigation-patterns)
4. [Theme and Colors](#theme-and-colors)
5. [State Management](#state-management)
6. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
7. [Testing Checklist](#testing-checklist)

---

## Critical Rules (NEVER Violate)

### 🚫 NEVER Hide Navigation Bars
```swift
// ❌ NEVER DO THIS
.navigationBarHidden(true)
.navigationBarBackButtonHidden(true)
.toolbar(.hidden)

// ✅ ALWAYS DO THIS
// Let NavigationStack handle navigation naturally
// Use .toolbar modifiers for customization
```

**Why:** Hiding navigation bars breaks iOS swipe-back gestures, forcing users to tap buttons.

### 🚫 NEVER Create Custom Movie Cards
```swift
// ❌ NEVER DO THIS
struct MyCustomMovieCard: View { ... }
struct FilmCard: View { ... }
struct WatchQueueCard: View { ... }

// ✅ ALWAYS DO THIS
StandardMovieCard(movie: movie)
```

**Why:** Multiple card variants cause inconsistency and maintenance burden.

### 🚫 NEVER Truncate Movie Text
```swift
// ❌ NEVER DO THIS
Text(movie.title)
    .lineLimit(1)
    .truncationMode(.tail)

// ✅ ALWAYS DO THIS
Text(movie.title)
    .lineLimit(nil)  // Let text wrap naturally
```

**Why:** Truncated text is an indicator of unauthorized changes. All movie titles and descriptions must display in full. See `/MOVIE_REPRESENTATION_SPEC.md`.

### 🚫 NEVER Use Hardcoded Colors
```swift
// ❌ NEVER DO THIS
Color.white
Color.black
Color(.systemGray)

// ✅ ALWAYS DO THIS
Color.mgBackground
Color.mgText
Color.mgSecondaryText
```

**Why:** Hardcoded colors break dark mode support.

---

## StandardMovieCard Usage

### Correct Implementation
```swift
StandardMovieCard(
    movie: movie,
    showFavoriteButtons: true,  // Default: true
    onDelete: nil                // Only for editable lists
)
```

### Component Structure
```
StandardMovieCard
├── VStack
│   ├── Poster (125x188 fixed)
│   ├── Title
│   └── Year + Rating
└── HStack (BELOW content, not overlay)
    ├── FavoriteButtons
    └── Delete button (if provided)
```

### Key Requirements
- **Poster dimensions:** Always 125×188 (2:3 ratio)
- **FavoriteButtons placement:** Below content in HStack
- **Never use overlays** for buttons
- **Min height:** Matches poster height (188pt)

### Do NOT Modify Without Permission
The following aspects are LOCKED:
- Poster dimensions
- Button placement
- Overall structure
- Shadow/border styling

---

## Navigation Patterns

### Use Native iOS Navigation
```swift
// ✅ CORRECT: Native NavigationStack
NavigationStack {
    HomeView()
        .navigationDestination(for: MovieDestination.self) { dest in
            MovieDetailView(movieId: dest.movieId)
        }
}

// ❌ WRONG: Custom headers
ZStack {
    VStack {
        CustomHeader() // NO!
        content
    }
}
```

### Navigation Testing
Before committing ANY navigation changes:
1. Build and run on physical device
2. Test swipe-back from every detail view
3. Verify no custom back buttons needed
4. Ensure navigation bar visible

### Navigation Destinations
```swift
// Standard navigation destinations
enum MovieDestination: Hashable {
    case movie(id: Int)
    case person(id: Int)
    case collection(id: String)
}
```

---

## Theme and Colors

### Semantic Color System
```swift
// Primary colors
Color.mgBackground       // Adapts light/dark
Color.mgText             // Primary text
Color.mgSecondaryText    // Secondary text

// Component colors
Color.mgCardBackground   // Card backgrounds
Color.mgBorder           // Borders/dividers

// Interactive colors
Color.mgAccent           // Primary actions
Color.mgDestructive      // Delete/remove
```

### Shadow System
```swift
// ✅ CORRECT: Semantic shadows
.mgShadowSmall()
.mgShadowMedium()
.mgShadowLarge()

// ❌ WRONG: Hardcoded shadows
.shadow(radius: 10, color: .black.opacity(0.3))
```

---

## State Management

### Use FavoritesManager Singleton
```swift
// ✅ CORRECT: Centralized state
@ObservedObject var favorites = FavoritesManager.shared

var isLoved: Bool {
    favorites.isLoved(movieId: movie.id)
}

// ❌ WRONG: Local state
@State private var isLoved = false
@State private var isQueued = false
```

### UserDefaults Access
```swift
// ✅ CORRECT: Through managers
FavoritesManager.shared.toggleLoved(movieId: 123)
SettingsManager.shared.isDarkMode

// ❌ WRONG: Direct access
UserDefaults.standard.set(true, forKey: "loved_123")
```

---

## Common Mistakes to Avoid

### 1. The "Back Swipe Break"
```swift
// ❌ This breaks swipe-back gesture
.navigationBarHidden(true)

// User impact: Must tap back button
// Fix: Remove the modifier entirely
```

### 2. The "Button Drift"
```swift
// ❌ Buttons in overlay move around
.overlay(alignment: .topTrailing) {
    FavoriteButtons()
}

// ✅ Buttons in stable position
HStack {
    FavoriteButtons()
    Spacer()
}
```

### 3. The "Dark Mode Surprise"
```swift
// ❌ Invisible in dark mode
Text("Title")
    .foregroundColor(.white)

// ✅ Adapts to color scheme
Text("Title")
    .foregroundColor(Color.mgText)
```

### 4. The "Film Slip"
```swift
// ❌ Wrong terminology
"Add film to favorites"

// ✅ Correct terminology
"Add movie to queue"
```

### 5. The "State Sprawl"
```swift
// ❌ Each view manages favorites
@State var myFavorites = Set<Int>()

// ✅ Single source of truth
@ObservedObject var favorites = FavoritesManager.shared
```

---

## Testing Checklist

### Before EVERY Commit

#### 1. Navigation Tests
- [ ] Swipe-back works from MovieDetailView
- [ ] Swipe-back works from PersonDetailView
- [ ] Swipe-back works from CollectionDetailView
- [ ] Navigation bar visible on all screens
- [ ] No custom back buttons needed

#### 2. Component Tests
- [ ] StandardMovieCard dimensions correct (125×188)
- [ ] FavoriteButtons below poster, not overlaid
- [ ] Cards align properly in grid/list
- [ ] Delete button only shows when appropriate

#### 3. Theme Tests
- [ ] Switch to dark mode in Settings
- [ ] All text readable in both modes
- [ ] Shadows visible but not harsh
- [ ] No hardcoded white/black colors

#### 4. Gesture Tests
- [ ] Pull-to-refresh works (use .refreshable)
- [ ] Swipe gestures don't conflict
- [ ] Long-press menus work where expected
- [ ] Tap targets are adequate size (44×44 minimum)

#### 5. State Tests
- [ ] Love/Queue state persists across app launches
- [ ] State updates immediately when toggled
- [ ] No duplicate state management
- [ ] Settings changes apply globally

### Pre-Release Testing

Run the full test suite:
```bash
# Unit tests
xcodebuild test -scheme moviegenius

# UI tests (on simulator)
xcodebuild test -scheme moviegenius -only-testing:moviegeniusUITests

# Manual testing (on device)
# Follow: ios/testing/MANUAL_CHECKLIST.md
```

---

## Automated Enforcement

### SwiftLint
Configuration: `ios/moviegenius/.swiftlint.yml`
- Custom rules for navigation patterns
- Color usage validation
- Terminology checks

### Pre-commit Hook
Location: `.git/hooks/pre-commit`
- Blocks navigation bar hiding
- Validates StandardMovieCard changes
- Checks terminology
- Runs SwiftLint

### Build Phase Scripts
Location: `ios/moviegenius/Scripts/validate-code-quality.sh`
- Xcode integration
- Real-time error reporting
- Theme validation

---

## Quick Reference Card

### ✅ Always
- Use StandardMovieCard for movies
- Use Color.mg* semantic colors
- Use FavoritesManager.shared
- Test swipe-back on device
- Use native navigation

### ❌ Never
- Hide navigation bars
- Create custom movie cards
- Use Color.white/black
- Manage favorites locally
- Use "film" terminology

### 🧪 Test
- Swipe-back gesture
- Dark mode
- Button placement
- State persistence
- Memory leaks

---

## Key References

- **`/MOVIE_REPRESENTATION_SPEC.md`** - Master specification for all movie displays (NO TRUNCATION)
- **`/ios/IOS_NAVIGATION_GUIDE.md`** - Navigation patterns and best practices
- **`/ios/DESIGN_DECISIONS.md`** - Design rationale and history
- **`/ios/GENIUS_SYSTEM_GUIDE.md`** - Genius feature technical details

## Getting Help

1. **SwiftLint violations:** Check `.swiftlint.yml` for rule explanations
2. **Navigation issues:** See `ios/IOS_NAVIGATION_GUIDE.md`
3. **Test failures:** Run specific test for details
4. **Build errors:** Check build phase script output
5. **Text truncation:** See `/MOVIE_REPRESENTATION_SPEC.md`

## Version History

- 2026-05-20: Initial comprehensive guidelines
- Based on: Multiple production incidents and fixes
- Key incidents: Back swipe breaks, button positioning, dark mode issues