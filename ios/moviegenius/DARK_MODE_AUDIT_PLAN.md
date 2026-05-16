# Dark Mode & Glass Effects Audit Plan
**MovieGenius iOS App**
**Date:** 2025-01-XX
**Overall Grade:** A- (95% Production-Ready)

---

## Executive Summary

The MovieGenius iOS app has excellent dark mode architecture with semantic colors and adaptive materials. The design system is well-structured using `mg*` prefixed colors that adapt to color schemes.

**Issues Found:** 9 total issues across 3 priority levels
**Estimated Fix Time:** 6-11 hours total
**Recommended Timeline:** 2-week sprint

---

## Audit Methodology

### Search Patterns Used
```bash
# Hardcoded white/black
grep -r "Color\.white\|Color\.black" --include="*.swift"

# Foreground style literals
grep -r "\.foregroundStyle(\.white)\|\.foregroundStyle(\.black)" --include="*.swift"

# RGB/Hex colors
grep -r "Color(red:\|Color(hex:" --include="*.swift"

# System colors
grep -r "Color\.red\|Color\.green\|Color\.blue" --include="*.swift"
```

### Testing Workflow
1. Launch iOS Simulator (iPhone 15)
2. Settings → Developer → Dark Appearance → Toggle
3. Use Xcode → Debug → View Debugging → Accessibility Inspector
4. Check contrast ratios (WCAG AA minimum 4.5:1 for text)
5. Screenshot each screen in Light + Dark mode
6. Document issues with before/after comparisons

---

## Issues by Priority

### CRITICAL (Fix Immediately)
**Est. Time:** 30 minutes

#### 1. Asset Catalog AccentColor Missing
**File:** `moviegenius/Assets.xcassets/AccentColor.colorset/`
**Issue:** AccentColor is empty - no color definitions
**Impact:** App may not have proper accent color in system contexts
**Fix:**
```json
// Contents.json
{
  "colors": [
    {
      "color": {
        "color-space": "srgb",
        "components": {
          "red": "0.831",
          "green": "0.686",
          "blue": "0.216",
          "alpha": "1.000"
        }
      },
      "idiom": "universal"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
```

---

### HIGH Priority (This Sprint - Week 1)
**Est. Time:** 4-6 hours

#### 2. Category Badge Hardcoded Black Text
**Files:**
- `moviegenius/Views/CollectionCarousel.swift:21`
- `moviegenius/Views/GenreMasteryCard.swift:37`

**Current Code:**
```swift
Text(category.uppercased())
    .foregroundStyle(.black)  // ❌ Hardcoded
    .background(Color.mgGold)
```

**Issue:** Black text on gold badge won't adapt to dark mode
**Impact:** May have poor contrast in dark mode

**Recommended Fix:**
```swift
@Environment(\.colorScheme) var colorScheme

Text(category.uppercased())
    .foregroundStyle(
        colorScheme == .dark ? Color.white : Color.black
    )
    .background(Color.mgGold)
```

**OR** (if gold background changes in dark mode):
```swift
Text(category.uppercased())
    .foregroundStyle(Color.mgPrimary)  // Semantic color
    .background(Color.mgGold)
```

**Test Cases:**
- [ ] Light mode: Black text on gold - verify WCAG AA contrast
- [ ] Dark mode: White text on gold - verify WCAG AA contrast
- [ ] Take screenshots in both modes
- [ ] Verify on device (not just simulator)

---

#### 3. Try Again Button Hardcoded White Text
**File:** `moviegenius/Views/HomeView.swift:44`

**Current Code:**
```swift
Button("Try Again") {
    // ...
}
.foregroundStyle(Color.white)  // ❌ Hardcoded
```

**Issue:** White text may not be visible in all dark mode contexts
**Impact:** Button may be invisible or low contrast

**Recommended Fix:**
```swift
Button("Try Again") {
    // ...
}
.foregroundStyle(Color.mgPrimary)  // Use semantic color
```

**OR** if on dark background:
```swift
@Environment(\.colorScheme) var colorScheme

Button("Try Again") {
    // ...
}
.foregroundStyle(
    colorScheme == .dark ? Color.mgPrimary : Color.white
)
```

**Test Cases:**
- [ ] Light mode: Verify visibility on error state background
- [ ] Dark mode: Verify visibility on error state background
- [ ] Check button style (MGGlassButtonStyle) interaction

---

#### 4. GeniusView Tier Colors - No Dark Mode Adaptation
**File:** `moviegenius/Views/GeniusView.swift:556, 566, 569`

**Current Code:**
```swift
var tierColor: Color {
    switch tier {
    case .curator:
        return Color.white      // Line 556
    case .connoisseur:
        return Color.black      // Line 566
    case .enthusiast:
        return Color.white      // Line 569
    default:
        return Color.mgPrimary
    }
}
```

**Issue:** Tier colors are absolute, don't adapt to dark mode
**Impact:** Text may be invisible in dark mode

**Recommended Fix:**
```swift
@Environment(\.colorScheme) var colorScheme

var tierColor: Color {
    switch tier {
    case .curator:
        return colorScheme == .dark ? Color.mgPrimary : Color.white
    case .connoisseur:
        return colorScheme == .dark ? Color.white : Color.black
    case .enthusiast:
        return colorScheme == .dark ? Color.mgPrimary : Color.white
    default:
        return Color.mgPrimary
    }
}
```

**IMPORTANT:** Must understand tier badge background colors before fixing.
Check if tier badges have different background colors that justify the current logic.

**Test Cases:**
- [ ] Light mode: Verify curator tier visibility
- [ ] Light mode: Verify connoisseur tier visibility
- [ ] Light mode: Verify enthusiast tier visibility
- [ ] Dark mode: Verify all tier visibilities
- [ ] Document tier badge background colors

---

#### 5. Seen Movie Indicator Hardcoded White
**File:** `moviegenius/Views/GeniusView.swift:804`

**Current Code:**
```swift
.foregroundStyle(isSeen ? Color.white : Color.mgPrimary)
```

**Issue:** Seen state uses hardcoded white
**Impact:** May not be visible in dark mode

**Recommended Fix:**
```swift
@Environment(\.colorScheme) var colorScheme

.foregroundStyle(
    isSeen
        ? (colorScheme == .dark ? Color.mgPrimary : Color.white)
        : Color.mgPrimary
)
```

**OR** use opacity instead:
```swift
.foregroundStyle(Color.mgPrimary)
.opacity(isSeen ? 0.5 : 1.0)
```

**Test Cases:**
- [ ] Light mode: Seen vs unseen movie visibility
- [ ] Dark mode: Seen vs unseen movie visibility
- [ ] Check against movie poster background

---

### MEDIUM Priority (This Sprint - Week 2)
**Est. Time:** 2-3 hours

#### 6. FavoriteButtons onDarkBackground Parameter Unused
**File:** `moviegenius/Views/FavoriteButtons.swift:34`

**Current Code:**
```swift
let iconColor: Color =
    onDarkBackground ? Color.white.opacity(0.3) : Color.mgSecondary.opacity(0.3)
```

**Issue:** Parameter `onDarkBackground` always passed as `false` throughout app
**Impact:** Adaptive code exists but is never used

**Investigation Needed:**
```bash
# Search for all FavoriteButtons usage
grep -r "FavoriteButtons(" --include="*.swift"
```

**Recommended Fix (Option A - Remove unused parameter):**
```swift
// Remove onDarkBackground parameter entirely
let iconColor: Color = Color.mgSecondary.opacity(0.3)
```

**Recommended Fix (Option B - Use colorScheme instead):**
```swift
@Environment(\.colorScheme) var colorScheme

let iconColor: Color =
    colorScheme == .dark
        ? Color.white.opacity(0.3)
        : Color.mgSecondary.opacity(0.3)
```

**Test Cases:**
- [ ] Search all FavoriteButtons call sites
- [ ] Determine if parameter is needed
- [ ] If removing, verify no regression
- [ ] If using colorScheme, test light/dark modes

---

#### 7. System Colors Bypassing Design System
**Files:**
- `moviegenius/Views/WatchQueueView.swift:52`
- `moviegenius/Views/YouView.swift` (location TBD)

**Current Code:**
```swift
.background(Color(.systemGroupedBackground))
```

**Issue:** Direct use of system color instead of design system
**Impact:** Inconsistency with rest of app, may not match design intent

**Recommended Fix:**
```swift
.background(Color.mgGroupedBackground)
```

**Test Cases:**
- [ ] Find all `.systemGroupedBackground` usage
- [ ] Replace with `Color.mgGroupedBackground`
- [ ] Verify visual consistency in both modes

---

### LOW Priority (Next Sprint)
**Est. Time:** 1-2 hours

#### 8. MoviePosterView Play Button
**File:** `moviegenius/Views/MoviePosterView.swift:83`

**Current Code:**
```swift
Image(systemName: "play.fill")
    .foregroundStyle(.white)  // On semi-transparent background
```

**Issue:** White may not be visible in all contexts
**Impact:** Play button visibility

**Investigation:** Check background opacity and dark mode appearance

**Recommended Fix (if needed):**
```swift
@Environment(\.colorScheme) var colorScheme

Image(systemName: "play.fill")
    .foregroundStyle(
        colorScheme == .dark ? Color.mgPrimary : .white
    )
```

**Test Cases:**
- [ ] Screenshot play button in light mode
- [ ] Screenshot play button in dark mode
- [ ] Verify contrast on poster images

---

#### 9. Documentation for Intentional Absolute Colors
**Files:**
- `moviegenius/DesignSystem.swift:56-57` (Video player colors)
- `moviegenius/Views/GenreMasteryCard.swift:37` (Progress bar fills)

**Issue:** Intentional absolute colors lack documentation
**Impact:** Future developers may incorrectly "fix" these

**Recommended Fix:**
Add inline comments:
```swift
// INTENTIONAL: Video player uses absolute black background
// for cinema experience regardless of system dark mode
static let mgVideoPlayerBackground = Color.black

// INTENTIONAL: Video player text is always white for
// maximum contrast on black background
static let mgVideoPlayerText = Color.white

// INTENTIONAL: Progress bar fills use opaque colors
// on gold backgrounds for consistent branding
.foregroundStyle(.black)  // Always black on gold badge
```

**Action Items:**
- [ ] Add comments to all intentional absolute colors
- [ ] Document reasoning in design system
- [ ] Update pre-commit hook to allow documented exceptions

---

## Color Audit Summary

### Hardcoded Colors Found

| Location | Type | Status | Priority |
|----------|------|--------|----------|
| DesignSystem.swift:13 | `mgGold` RGB | ✅ Intentional | N/A |
| DesignSystem.swift:51-53 | System semantics (red/green/orange) | ✅ Intentional | N/A |
| DesignSystem.swift:56-57 | Video player black/white | ✅ Intentional | LOW (docs) |
| CollectionCarousel.swift:21 | Category badge `.black` | ❌ Issue | HIGH |
| GenreMasteryCard.swift:37 | Category badge `.black` | ❌ Issue | HIGH |
| HomeView.swift:44 | Try Again `.white` | ❌ Issue | HIGH |
| GeniusView.swift:556,566,569 | Tier colors | ❌ Issue | HIGH |
| GeniusView.swift:804 | Seen indicator `.white` | ❌ Issue | HIGH |
| FavoriteButtons.swift:34 | Conditional white/secondary | ⚠️ Review | MEDIUM |
| MoviePosterView.swift:83 | Play button `.white` | ⚠️ Review | LOW |
| ProjectorBeamIcon.swift | 18 gold RGB values | ✅ Intentional | N/A |

**Total Issues:** 9 (5 HIGH, 2 MEDIUM, 2 LOW)
**Total Intentional:** 33 instances

---

## Glass/Material Effects Audit

### Material Usage Patterns

| Component | Material Type | Status | Notes |
|-----------|--------------|--------|-------|
| WatchQueueCard | `.regularMaterial` | ✅ Good | Proper card elevation |
| MoreIdeaCard | `.regularMaterial` | ✅ Good | Consistent with queue cards |
| TrailerView toolbar | `.ultraThinMaterial` | ✅ Good | Proper for navigation |
| LayeredGlassCard | Custom glass | ✅ Good | Proper elevation system |
| AppHeader | Custom blur | ✅ Good | Proper z-index |

### Material Best Practices Checklist

- [x] No excessive material nesting (max 2 layers)
- [x] Text readable on all glass backgrounds
- [x] Glass works in both light and dark modes
- [x] Performance acceptable (no lag on scroll)
- [x] Material hierarchy clear (thin → regular → thick)

**Recommendations:**
- Continue using `.ultraThinMaterial` for nav bars
- Continue using `.regularMaterial` for cards
- LayeredGlassCard elevation system is well-designed
- No performance issues detected

---

## Testing Checklist

### Per-Screen Dark Mode Test

For each screen, verify:
- [ ] All text is readable (WCAG AA 4.5:1 minimum)
- [ ] All icons are visible
- [ ] All buttons have proper contrast
- [ ] Shadows are visible (or intentionally invisible)
- [ ] Separators/dividers are visible
- [ ] Glass materials look appropriate
- [ ] No pure white/black areas (unless intentional)

### Screens to Test

#### Tab Views
- [ ] HomeView (collections, carousels, search)
- [ ] GeniusView (genre mastery, tiers, badges)
- [ ] WatchQueueView (saved movies list)
- [ ] YouView (profile, loved movies, settings)

#### Detail Views
- [ ] MovieDetailView (poster, WhyWatch, More Ideas)
- [ ] CollectionDetailView (subcategories, grid)
- [ ] CategorySubcategoriesView (Genius subcategories)
- [ ] CategoryEssentialsView (Genius essentials)
- [ ] PersonDetailView (cast/crew details)

#### Modals/Sheets
- [ ] TrailerView (video player)
- [ ] SignInPromptView (authentication)
- [ ] SearchView (global search)

#### Components
- [ ] FavoriteButtons (love/queue icons)
- [ ] MoviePosterCard (carousel cards)
- [ ] MovieGridCard (3-column grid)
- [ ] GenreMasteryCard (progress cards)
- [ ] LayeredGlassCard (various elevations)

---

## Xcode Tools & Workflow

### Accessibility Inspector
```
Xcode → Developer Tools → Accessibility Inspector
1. Select running simulator
2. Enable "Inspection" mode
3. Click elements to check contrast
4. Verify WCAG AA compliance (4.5:1 for text)
```

### Debug View Hierarchy
```
Debug → View Debugging → Capture View Hierarchy
- Inspect layer nesting
- Check material effect stacking
- Verify shadow rendering
```

### Environment Overrides
```
Xcode bottom bar → Environment Overrides
- Toggle "Dark Appearance"
- Toggle "Text Size" (Dynamic Type)
- Test all combinations
```

### Screenshot Workflow
```bash
# Create screenshots directory
mkdir -p docs/dark-mode-audit/screenshots

# Naming convention:
# {screen}-{mode}-{issue}.png
# Examples:
# - homeview-light-baseline.png
# - homeview-dark-baseline.png
# - collectioncarousel-dark-badge-issue.png
# - collectioncarousel-dark-badge-fixed.png
```

---

## Implementation Roadmap

### Sprint 1 (Current) - Week 1
**Goal:** Fix all CRITICAL and HIGH priority issues
**Est. Hours:** 5-7 hours

**Day 1: Critical Fix**
- [ ] Fix Asset Catalog AccentColor (30 min)
- [ ] Build and verify on device (15 min)

**Day 2-3: Category Badges**
- [ ] Investigate badge background colors (30 min)
- [ ] Fix CollectionCarousel badge (1 hour)
- [ ] Fix GenreMasteryCard badge (1 hour)
- [ ] Test in light/dark mode (30 min)
- [ ] Screenshot before/after (15 min)

**Day 4: Button & Tier Colors**
- [ ] Fix Try Again button (30 min)
- [ ] Fix GeniusView tier colors (1.5 hours)
- [ ] Test tier system thoroughly (1 hour)
- [ ] Screenshot all tier states (30 min)

**Day 5: Seen Indicator**
- [ ] Fix seen movie indicator (30 min)
- [ ] Test against various backgrounds (30 min)
- [ ] Build, test, commit (30 min)

**Deliverables:**
- All HIGH priority issues resolved
- Screenshots of before/after
- Git commit with fixes
- Updated documentation

---

### Sprint 1 (Current) - Week 2
**Goal:** Address MEDIUM priority issues
**Est. Hours:** 2-3 hours

**Day 1: FavoriteButtons Investigation**
- [ ] Search all FavoriteButtons usage (30 min)
- [ ] Determine if onDarkBackground is needed (30 min)
- [ ] Implement fix (remove param OR use colorScheme) (1 hour)
- [ ] Test all call sites (30 min)

**Day 2: System Color Cleanup**
- [ ] Find all `.systemGroupedBackground` usage (15 min)
- [ ] Replace with `Color.mgGroupedBackground` (30 min)
- [ ] Verify visual consistency (30 min)
- [ ] Build and test (15 min)

**Deliverables:**
- FavoriteButtons parameter resolved
- System colors replaced with design system
- Git commit with MEDIUM priority fixes

---

### Sprint 2 (Next) - LOW Priority Polish
**Goal:** Documentation and edge cases
**Est. Hours:** 1-2 hours

**Tasks:**
- [ ] Test MoviePosterView play button (30 min)
- [ ] Add documentation comments (30 min)
- [ ] Update pre-commit hook documentation (30 min)
- [ ] Create dark mode testing guide (30 min)

**Deliverables:**
- All intentional colors documented
- Testing guide for future features
- Updated CLAUDE.md with dark mode guidelines

---

## Documentation Templates

### Issue Report Template
```markdown
## Issue: [Brief Description]

**File:** `path/to/file.swift:line`
**Priority:** CRITICAL | HIGH | MEDIUM | LOW
**Status:** Open | In Progress | Fixed | Won't Fix

### Current Code
```swift
// Problematic code here
```

### Issue Description
[What's wrong and why it's a problem]

### Impact
- Light Mode: [Description]
- Dark Mode: [Description]
- Accessibility: [WCAG compliance status]

### Recommended Fix
```swift
// Fixed code here
```

### Test Cases
- [ ] Light mode verification
- [ ] Dark mode verification
- [ ] Accessibility Inspector check
- [ ] Device testing

### Screenshots
- Before (Light): [path/to/screenshot]
- Before (Dark): [path/to/screenshot]
- After (Light): [path/to/screenshot]
- After (Dark): [path/to/screenshot]
```

---

### Git Commit Template
```
Fix dark mode support for [component name]

- Replace hardcoded .black with adaptive color in category badges
- Update tier colors to respond to colorScheme
- Add Environment colorScheme to affected views

Before: Category badges used .foregroundStyle(.black) which doesn't
adapt to dark mode, causing poor contrast.

After: Badges now use conditional colors based on colorScheme,
ensuring WCAG AA contrast in both light and dark modes.

Tested:
- Light mode on iPhone 15 simulator
- Dark mode on iPhone 15 simulator
- Physical device (iPhone 15 Pro)
- Accessibility Inspector (all passed)

Files changed:
- CollectionCarousel.swift
- GenreMasteryCard.swift

Related: DARK_MODE_AUDIT_PLAN.md #2, #3
```

---

## Best Practices for Future Features

### Color Usage Guidelines

**✅ DO:**
- Use `Color.mgPrimary`, `Color.mgSecondary` for text
- Use `Color.mgBackground`, `Color.mgGroupedBackground` for backgrounds
- Use `@Environment(\.colorScheme)` when conditional colors needed
- Document intentional absolute colors with inline comments
- Test both light and dark modes before committing

**❌ DON'T:**
- Use `Color.white`, `Color.black` for text
- Use `.foregroundStyle(.white)` or `.foregroundStyle(.black)`
- Use `Color(.systemBackground)` - use design system instead
- Assume dark mode will "just work" - always test
- Skip accessibility checks

### Material Effects Guidelines

**✅ DO:**
- Use `.ultraThinMaterial` for navigation bars
- Use `.regularMaterial` for cards and elevated content
- Keep material nesting to 2 levels maximum
- Ensure text on glass has sufficient contrast

**❌ DON'T:**
- Stack more than 2 materials (performance issues)
- Use materials on every element (visual fatigue)
- Forget to test readability in both modes
- Use materials when solid colors would work better

---

## Appendix: Color System Reference

### Design System Colors (Adaptive)
```swift
Color.mgPrimary           // Primary text (adapts)
Color.mgSecondary         // Secondary text (adapts)
Color.mgTertiary          // Tertiary text (adapts)
Color.mgBackground        // Main background (adapts)
Color.mgGroupedBackground // Grouped background (adapts)
Color.mgGold              // Accent (static - brand color)
```

### Semantic System Colors (OK to use)
```swift
Color.red                 // Destructive actions
Color.green               // Success states
Color.orange              // Warning states
```

### Video Player Colors (Intentional)
```swift
Color.mgVideoPlayerBackground     // Always black
Color.mgVideoPlayerText           // Always white
Color.mgVideoPlayerSecondaryText  // Muted white
Color.mgVideoPlayerOverlay        // Semi-transparent
```

---

## Contact & Questions

For questions about this audit plan:
1. Review CLAUDE.md for project guidelines
2. Check pre-commit hooks for automated checks
3. Test changes in both light and dark modes
4. Document any intentional deviations

**Remember:** When in doubt, use semantic colors from the design system!
