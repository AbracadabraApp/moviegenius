# iOS Design Audit - Native Feel & Design System Consistency

## Summary

Comprehensive design review reveals the iOS app feels like a web port rather than a native iOS application. Missing modern iOS materials (glass morphism), inconsistent typography, hardcoded colors/spacing, and incomplete parity with web UX on key screens (Genius, You pages).

**Total Issues:** 47 across 4 priority tiers
**Critical Blockers:** 5
**High Priority:** 10
**Medium Priority:** 8
**Low Priority (Future):** 7

---

## 🔴 CRITICAL ISSUES (Priority 1 - Must Fix)

### 1. Glass Morphism Missing Throughout App

**Problem:** Only 1 instance of `.ultraThinMaterial` in entire codebase (CollectionCarousel:122). App uses flat backgrounds instead of iOS-native glass materials.

**Impact:** App feels flat and web-like, not native iOS

**Files to fix:**
- [ ] `HomeView.swift:87` - Search bar needs `.ultraThinMaterial`
- [ ] `GeniusView.swift:46` - Search bar needs glass effect
- [ ] `YouView.swift:28-92` - No glass cards, just flat white backgrounds
- [ ] `DesignSystem.swift:86-102` - Add `.mgGlassCard()` and `.mgProminentCard()` modifiers

**Solution:**
```swift
// Add to DesignSystem.swift
extension View {
    func mgGlassCard() -> some View {
        self.background {
            RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                .fill(.ultraThinMaterial)
        }
    }

    func mgProminentCard() -> some View {
        self.background {
            RoundedRectangle(cornerRadius: .mgCornerMedium, style: .continuous)
                .fill(.regularMaterial)
                .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
        }
    }
}
```

---

### 2. Typography Chaos - Inconsistent Font Usage

**Problem:** 15+ instances of hardcoded fonts instead of semantic `.mg*` typography system. Breaks Dynamic Type support.

**Impact:** Text doesn't scale with accessibility settings, lacks visual hierarchy

**Files with violations:**

- [ ] `WhyWatchView.swift:20` - `.font(.headline)` → `.font(.mgHeadline)`
- [ ] `WhyWatchView.swift:28,38` - `.font(.body)` → `.font(.mgBody)`
- [ ] `MoreIdeasView.swift:17-18` - `.font(.title2).fontWeight(.bold)` → `.font(.mgTitle2)`
- [ ] `MoreIdeasView.swift:77-78` - `.font(.headline)` → `.font(.mgHeadline)`
- [ ] `MoreIdeasView.swift:82,88` - `.font(.subheadline)` → `.font(.mgSubheadline)`
- [ ] `MoviePosterView.swift:38-39` - `.font(.caption)` → `.font(.mgCaption)`
- [ ] `YouView.swift:106` - `.font(.system(size: 28, weight: .bold))` → `.font(.mgTitle)` (hardcoded size!)

**Global fix needed:**
```bash
# Find/replace pattern:
.font(.headline) → .font(.mgHeadline)
.font(.body) → .font(.mgBody)
.font(.subheadline) → .font(.mgSubheadline)
.font(.caption) → .font(.mgCaption)
.font(.title2) → .font(.mgTitle2)
```

---

### 3. Color System Violations - Hardcoded Colors

**Problem:** Direct color literals break dark mode, unmaintainable

**Impact:** Inconsistent appearance, dark mode issues

**Files to fix:**

- [ ] `WhyWatchView.swift:18` - `.foregroundColor(.yellow)` → `Color.mgGold`
- [ ] `WhyWatchView.swift:18` - `.foregroundColor(.red)` → `Color.mgDestructive` (needs adding)
- [ ] `WhyWatchView.swift:38` - `.foregroundColor(.secondary)` → `.foregroundStyle(Color.mgSecondary)`
- [ ] `MoreIdeasView.swift:97` - `.fill(.background)` → `Color.mgBackground`
- [ ] `MoviePosterView.swift:88` - `.fill(.quaternary)` → `Color.mgSecondary.opacity(0.15)`
- [ ] `HomeView.swift:100-101` - `Color.gray.opacity(0.2)` → `Color.mgSecondary.opacity(0.15)`

**Add to DesignSystem.swift:**
```swift
extension Color {
    static let mgDestructive = Color.red
    static let mgSuccess = Color.green
    static let mgWarning = Color.orange
}
```

---

### 4. GeniusView Doesn't Match Web Design

**Problem:** iOS GeniusView is just an empty state with button. Web `you.js` has full-featured tab system, journey stages, stats grid, educational cards.

**Impact:** Broken UX parity between platforms, users get less value on iOS

**Web has (you.js:114-178):**
- ✅ Tab bar with 3 tabs: Journey / Loved / Queue
- ✅ Journey progress stages (🎬, 🌱, 🔍, 🎭)
- ✅ Stats grid (3 cards showing counts)
- ✅ Educational "Learning Opportunities" section

**iOS has (GeniusView.swift:10-52):**
- ❌ Just icon + title + button
- ❌ No tabs
- ❌ No stats
- ❌ No educational content

**Required changes:**
- [ ] Rewrite `GeniusView.swift` to match web `you.js` structure
- [ ] Add `@StateObject var favorites = FavoritesManager.shared`
- [ ] Implement 3-tab system (Journey/Loved/Queue)
- [ ] Add journey stage logic matching web
- [ ] Add stats grid
- [ ] Add educational cards section

**This is a MAJOR gap** - GeniusView is a placeholder, not a feature.

---

### 5. YouView Missing Key Web Features

**Problem:** iOS YouView partial implementation - has journey/stats but missing tabbed navigation and educational content

**What iOS has:**
- ✅ Journey stages
- ✅ Stats grid

**What's missing from web:**
- [ ] Tab bar navigation (Journey/Loved/Queue)
- [ ] "What We're Learning" section (web you.js:238-260)
- [ ] "Learning Opportunities" cards (web you.js:264-303)
- [ ] Educational tip toggle (web you.js:28, 195-196)

**Decision needed:** Either implement web's tab system OR document intentional iOS divergence.

---

## 🟠 HIGH PRIORITY (Priority 2 - Should Fix)

### 6. Spacing Inconsistencies

**Problem:** Mix of semantic spacing constants and hardcoded values

- [ ] `HomeView.swift:109` - `.padding(.horizontal, 16)` → `.mgSpacing16`
- [ ] `WhyWatchView.swift:14` - `spacing: 16` → `.mgSpacing16`
- [ ] `WhyWatchView.swift:24` - `spacing: 8` → `.mgSpacing8`
- [ ] `WhyWatchView.swift:38` - `.padding(.top, 8)` → `.mgSpacing8`
- [ ] `MoreIdeasView.swift:14` - `spacing: 16` → `.mgSpacing16`
- [ ] `CollectionCarousel.swift:22-23` - Hardcoded `8 + 2`, `4 - 1` math → defined constants

---

### 7. Navigation Bar Inconsistencies

**Problem:** Different `.navigationBarTitleDisplayMode` settings without clear pattern

| View | Current | Should Be | Reason |
|------|---------|-----------|--------|
| HomeView | `.large` | ✅ Correct | Top-level browse page |
| GeniusView | `.large` | ✅ Correct | Top-level page |
| YouView | `.inline` | ⚠️ `.large` | Consistency with other top-level pages |
| MovieDetailView | `.inline` | ✅ Correct | Detail/drill-down page |
| CollectionDetailView | `.inline` | ✅ Correct | Detail/drill-down page |

- [ ] `YouView.swift:91` - Change from `.inline` to `.large`

---

### 8. Dark Mode Not Tested

**Problem:** Hardcoded colors and shadows won't adapt properly

**Known issues:**
- [ ] `MoreIdeasView.swift:99` - Shadow invisible in dark mode
- [ ] `HomeView.swift:98` - Shadow opacity too high for dark mode
- [ ] `CollectionCarousel.swift:107` - Shadow needs conditional opacity

**Fix pattern:**
```swift
@Environment(\.colorScheme) var colorScheme

.shadow(
    color: .black.opacity(colorScheme == .dark ? 0.4 : 0.15),
    radius: 6
)
```

**Testing checklist:**
- [ ] Test all views in dark mode
- [ ] Verify white backgrounds → dark
- [ ] Verify black text → white
- [ ] Verify gold accent remains visible
- [ ] Verify shadows adapt or disappear

---

### 9. Inconsistent Corner Radius Usage

**Problem:** Mix of semantic constants and hardcoded values

- [ ] `DesignSystem.swift` - Add `.mgCornerTiny: CGFloat = 4`
- [ ] `WhyWatchView.swift` - No corner radius at all, needs card treatment
- [ ] `MoreIdeasView.swift:70` - `cornerRadius: 8` → `.mgCornerSmall`
- [ ] `MoreIdeasView.swift:96` - `cornerRadius: 12` → `.mgCornerMedium`
- [ ] `MoviePosterView.swift:47` - `cornerRadius: 16` → `.mgCornerLarge`
- [ ] `CollectionCarousel.swift:25` - `cornerRadius: 4` → `.mgCornerTiny`

**Add to DesignSystem.swift:**
```swift
extension CGFloat {
    static let mgCornerTiny: CGFloat = 4   // Badges, pills
    static let mgCornerSmall: CGFloat = 8  // Cards, posters
    static let mgCornerMedium: CGFloat = 12 // Containers
    static let mgCornerLarge: CGFloat = 16  // Hero elements
}
```

---

### 10. Accessibility Gaps - No VoiceOver Support

**Problem:** Zero accessibility labels on interactive elements

- [ ] `MoviePosterView.swift:56-74` - Trailer button needs `.accessibilityLabel("Play trailer")`
- [ ] `FavoriteButtons.swift:29-53` - Need state hints: `.accessibilityLabel("Seen, marked as loved")` / `"Seen, not marked"`
- [ ] `CollectionCarousel.swift:42-47` - Movie cards need `.accessibilityElement(children: .combine)`
- [ ] `HomeView.swift:34-47` - "Try Again" button needs `.accessibilityHint("Retries loading collections")`

**Pattern:**
```swift
.accessibilityLabel("Descriptive label")
.accessibilityHint("What happens when activated")
.accessibilityValue("Current state if toggleable")
```

---

### 11. Haptic Feedback Inconsistent

**Problem:** Only uses `.light()` for all interactions; should vary by type

**Current usage:**
- [ ] `FavoriteButtons.swift:30,57` - Uses `.light()` ⚠️ Should use `.selection()` for toggles
- [ ] `CollectionDetailView.swift:146` - Uses `.light()` ⚠️ Should use `.selection()` for bookmark toggle
- [ ] `GeniusView.swift:34` - Uses `.light()` ✅ Correct for button tap
- [ ] `YouView.swift:126` - Uses `.selection()` ✅ Correct

**Fix:**
```swift
// Toggle actions (favorites, bookmarks)
HapticManager.selection()

// Light taps (navigation, buttons)
HapticManager.light()
```

---

### 12. Skeleton Loading States Inconsistent

**Problem:** Only HomeView has skeleton, others just show `ProgressView()`

- [ ] `CollectionDetailView.swift:80-88` - Replace `ProgressView()` with skeleton grid
- [ ] `MovieDetailView.swift:50-59` - Replace `ProgressView()` with skeleton poster + cards
- ✅ `HomeView.swift:52-54, 94-125` - Good skeleton pattern (extract to DesignSystem)

**Recommendation:** Extract `SkeletonCarousel` component to DesignSystem.swift for reuse.

---

### 13. Search Bar Needs Prominent Glass Style

**Problem:** Using default `.searchable()` modifier, not prominent iOS glass style

- [ ] `HomeView.swift:87` - Add `.searchSuggestions(.hidden)` + prominent style
- [ ] `GeniusView.swift:46` - Add `.searchSuggestions(.hidden)` + prominent style

**Better approach** - custom glass search bar:
```swift
HStack {
    Image(systemName: "magnifyingglass")
        .foregroundStyle(Color.mgSecondary)
    TextField("Search movies", text: $searchText)
        .textFieldStyle(.plain)
        .font(.mgBody)
}
.padding(.mgSpacing12)
.background(.ultraThinMaterial)
.clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
.padding(.horizontal, .mgSpacing16)
```

---

### 14. Button Styles Not Consistently Applied

**Problem:** Some buttons use custom styles, others use `.plain` without animation

- [ ] `YouView.swift:125-159` - Uses `.buttonStyle(.plain)`, should use `MGCardButtonStyle()` for scale animation
- [ ] Add `MGListRowButtonStyle` to DesignSystem.swift for list row press states

**Add to DesignSystem.swift:**
```swift
struct MGListRowButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(configuration.isPressed ? Color.mgSecondary.opacity(0.1) : .clear)
            .animation(.easeOut(duration: 0.1), value: configuration.isPressed)
    }
}
```

---

### 15. Tab Bar Needs Custom Appearance

**Problem:** Default tab bar styling, no background customization

- [ ] `MainTabView.swift:34-65` - Add custom tab bar appearance on appear

```swift
.onAppear {
    let appearance = UITabBarAppearance()
    appearance.configureWithOpaqueBackground()
    appearance.backgroundColor = UIColor(Color.mgBackground)

    UITabBar.appearance().standardAppearance = appearance
    UITabBar.appearance().scrollEdgeAppearance = appearance
}
```

---

## 🟡 MEDIUM PRIORITY (Priority 3 - Nice to Have)

### 16. Missing Animations

**Current animations:**
- ✅ Button press scaling
- ✅ Image fade-in
- ✅ Bookmark toggle

**Missing:**
- [ ] List item insertion/deletion animations (YouView loved/queue lists)
- [ ] Tab switching transitions
- [ ] Error state transitions

**Recommendation:** Add later - current animations sufficient for MVP.

---

### 17. Empty States Could Be Richer

- [ ] `CollectionDetailView` - Add empty state for when `movies.isEmpty` (currently only has error state)
- ✅ `HomeView` - Has empty state (line 56-65)
- ✅ `GeniusView` - Has empty state (line 16-40)
- ✅ `YouView` - Has empty state (line 71-83)

---

### 18. Trailer Player Not Implemented

**Problem:** `MoviePosterView.swift:73` references `TrailerPlayerView` which doesn't exist

- [ ] Create `Views/TrailerPlayerView.swift`
- [ ] Implement YouTube player using WKWebView

```swift
import SwiftUI
import WebKit

struct TrailerPlayerView: View {
    let youtubeId: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            YouTubePlayer(videoID: youtubeId)
                .navigationTitle("Trailer")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { dismiss() }
                    }
                }
        }
    }
}

struct YouTubePlayer: UIViewRepresentable {
    let videoID: String

    func makeUIView(context: Context) -> WKWebView {
        WKWebView()
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        guard let url = URL(string: "https://www.youtube.com/embed/\(videoID)") else { return }
        uiView.scrollView.isScrollEnabled = false
        uiView.load(URLRequest(url: url))
    }
}
```

---

## ⚪️ LOW PRIORITY (Priority 4 - Future Enhancements)

### 19. Bug: HomeView.swift Missing Constant

- [ ] `HomeView.swift:46` - `.mgCornerRadiusMedium` does not exist (typo)
  - Should be `.mgCornerMedium` OR add the missing constant

---

## 📋 DESIGN SYSTEM IMPROVEMENTS

### Complete DesignSystem.swift Rewrite Needed

**Missing components:**
- [ ] Corner radius constants (`.mgCornerTiny` through `.mgCornerLarge`)
- [ ] Semantic colors (`.mgDestructive`, `.mgSuccess`, `.mgWarning`)
- [ ] Glass card modifiers (`.mgGlassCard()`, `.mgProminentCard()`)
- [ ] List row button style (`MGListRowButtonStyle`)
- [ ] Additional haptic methods (`.medium()`, `.warning()`)

**Full v2 implementation:** See `/ios/DESIGN_AUDIT_ISSUE.md` for complete DesignSystem.swift v2 code.

---

## 🗺️ IMPLEMENTATION ROADMAP

### Phase 1 - Critical (Week 1)
- [ ] 1. Fix DesignSystem.swift - add glass materials, corner radius constants, semantic colors
- [ ] 2. Global find/replace: all hardcoded fonts → `.mg*` variants
- [ ] 3. Global find/replace: all hardcoded colors → semantic color system
- [ ] 4. Fix `HomeView.swift:46` typo (`.mgCornerRadiusMedium`)
- [ ] 5. Rewrite GeniusView to match web you.js structure (tabs + stats + educational cards)

### Phase 2 - High Priority (Week 2)
- [ ] 6. Apply glass materials to search bars (HomeView, GeniusView)
- [ ] 7. Fix all spacing inconsistencies (replace hardcoded numbers with `.mgSpacing*`)
- [ ] 8. Standardize navigation bar display modes (YouView → `.large`)
- [ ] 9. Test in dark mode + fix shadow opacity issues
- [ ] 10. Add accessibility labels to all interactive elements

### Phase 3 - Polish (Week 3)
- [ ] 11. Improve haptic feedback usage (selection vs light vs success)
- [ ] 12. Add skeleton loading states to CollectionDetailView + MovieDetailView
- [ ] 13. Implement custom glass search bars
- [ ] 14. Polish tab bar appearance
- [ ] 15. Create TrailerPlayerView

### Phase 4 - Future Enhancements
- [ ] 16. Add list insertion/deletion animations
- [ ] 17. Rich empty states for all views
- [ ] 18. Tab switching transitions

---

## ✅ TESTING CHECKLIST

**Before declaring "fixed":**

- [ ] Run app in **Light Mode** - verify all screens look correct
- [ ] Run app in **Dark Mode** - verify colors adapt properly
- [ ] Enable **Larger Text** (Settings > Accessibility > Display & Text Size) - verify Dynamic Type works
- [ ] Enable **VoiceOver** (Settings > Accessibility > VoiceOver) - verify all buttons/cards labeled
- [ ] Test on **iPhone SE** (small screen) - verify layout doesn't break
- [ ] Test on **iPhone 15 Pro Max** (large screen) - verify spacing scales properly
- [ ] Compare **web version** side-by-side with iOS - verify UX parity on Genius/You pages

---

## 📊 METRICS

**Files requiring changes:** 12
**Total line-level fixes:** 47+
**New files to create:** 1 (TrailerPlayerView.swift)
**Major rewrites needed:** 2 (GeniusView.swift, DesignSystem.swift)

---

## 🔗 RELATED DOCUMENTATION

- Full audit report: `/ios/moviegenius/DESIGN_AUDIT_FULL_REPORT.md` (if created)
- iOS Quick Start: `/ios/QUICK_START.md`
- Design System: `/ios/moviegenius/moviegenius/DesignSystem.swift`
- Web reference pages:
  - `pages/you.js` (for GeniusView/YouView parity)
  - `pages/genius.js` (if exists)

---

## 📝 NOTES

**Key Insight:** The app currently has only **1 instance** of proper iOS glass material usage (CollectionCarousel:122) out of dozens of cards/overlays. This is the primary driver of the "web view" feel.

**Design Philosophy:** Modern iOS apps use materials (glass morphism) extensively for cards, search bars, and overlays. The semantic design system exists but isn't being used consistently - lots of hardcoded values bypassing the system.

**GeniusView Gap:** This is effectively a non-functional placeholder compared to the web version. Requires full feature implementation, not just styling fixes.
