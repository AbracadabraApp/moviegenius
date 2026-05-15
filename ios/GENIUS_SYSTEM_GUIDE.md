# Genius System Guide

**Version:** 1.0
**Date:** 2026-05-15
**File:** `ios/moviegenius/moviegenius/Views/GeniusView.swift` (6,136 lines)

---

## Overview

The Genius system is a **gamified film education journey** that uses color progression (gray → bronze → gold) to visualize mastery across 22 curated categories, each containing 10 tiers of essential films.

**Core Innovation:** Visual RPG progression system where watching films transforms badge colors from gray → gold, creating tangible progress toward cinematic expertise.

---

## Navigation Hierarchy

```
GeniusView (Main Entry)
    ↓
Journey Tab (Category Grid)
    ↓
CategoryEssentialsView (Tier Selection)
    ↓
Tier Navigation (10 Tiers)
    ↓
Film List (Individual Movies)
    ↓
MovieDetailView
```

---

## 1. Main Entry: GeniusView

**Header:** "Start your cinematic journey"
**Layout:** Shuffled grid of 22 category badges using FlowLayout

### Categories (Shuffled on each load)

**Genres (17):**
- Action, Adventure, Comedy, Crime, Documentary, Drama, Espionage
- Fantasy, History, Horror, Mystery, Noir, Romance
- Science Fiction, Thriller, War, Western

**Awards (2):**
- Academy Awards
- AFI Awards

**People (3):**
- Actors
- Actresses
- Directors

**Visual:** Each badge shows category name (uppercase) + color based on completion progress

---

## 2. Color Progression System

**The genius of the system:** Colors evolve from gray → bronze → gold as you watch more films.

### 9 Color Gradations (0% → 100%)

| Progress | Color Name | RGB Values | Visual State |
|----------|------------|------------|--------------|
| **0-10%** | Light Gray | `(0.60, 0.60, 0.60)` | Just starting |
| **10-20%** | Medium Gray | `(0.65, 0.62, 0.60)` | Getting started |
| **20-30%** | Warm Gray | `(0.70, 0.65, 0.58)` | Warming up |
| **30-40%** | Light Bronze | `(0.75, 0.68, 0.56)` | Bronze emerging |
| **40-50%** | Bronze | `(0.80, 0.70, 0.52)` | Solid bronze ⭐ |
| **50-60%** | Copper | `(0.85, 0.72, 0.48)` | Copper shine |
| **60-70%** | Rose Gold | `(0.90, 0.75, 0.50)` | Rose gold glow |
| **70-80%** | Light Gold | `(0.95, 0.82, 0.55)` | Almost there |
| **80%+** | **Pure Gold** | `Color.mgGold` | **Mastery** 🏆 |

⭐ = Text color switches to white at 40%+ for contrast

### Visual Progression

```
Gray ████░░░░░░ → Bronze ██████░░░░ → Gold ██████████
0%               40%                  80%        100%
```

### Text Color Logic

Applied to both category badges and tier chips:

| Progress Range | Text Color | Background | Reason |
|---------------|------------|------------|---------|
| **0-39%** | Black | Light colors | High contrast on light |
| **40-100%** | White | Dark colors | High contrast on dark |

### 100% Completion State

When a category or tier reaches 100%:
- **Gold border:** 2px stroke
- **Star badge:** ⭐ Black circle with gold star icon (top-right corner)
- Background remains pure gold (`Color.mgGold`)

---

## 3. Tier System (10 Levels)

Each category contains **10 tiers** of curated films, progressing from essential to deep cuts:

### Tier Names & Progression

1. **Essential** - Foundation films (start here)
2. **Foundational** - Core classics
3. **Classics** - Widely recognized masterpieces
4. **Well-Versed** - Depth emerging
5. **Devotee** - True fan territory
6. **Connoisseur** - Expert level knowledge
7. **Deep Cuts** - Hidden gems
8. **Specialist** - Niche mastery
9. **Archivist** - Comprehensive knowledge
10. **Master** - Complete mastery

### Tier Navigation Display

**Horizontal flow layout (wraps to multiple rows)**
- Displayed at **top AND bottom** of film list
- Chips are **shuffled** on each load (exploration > alphabetical)
- Tapping navigates to: `CategoryEssentialsView(category: "Drama", subcategory: "Devotee")`

### Tier Chip Visual States

| State | Background | Text Color | Border | Notes |
|-------|------------|------------|--------|-------|
| **Selected** | White | Black | 1px white | Current tier |
| **In Progress (1-99%)** | Gradient (gray→gold) | Smart (black/white) | None | Shows progress color |
| **Not Started (0%)** | `Color.mgSecondaryBackground` | `Color.mgSecondary` | None | Gray/inactive |
| **Complete (100%)** | Pure gold | White | 2px gold | Mastery achieved |

---

## 4. CategoryEssentialsView Structure

**Navigation Title:** `"{Category}: {Tier}"`
Example: "Drama: Devotee" or "Directors: Connoisseur"

### Layout (Vertical Scroll)

```
┌─────────────────────────────┐
│ Tier Chips (shuffled)       │ ← Top navigation
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐   │
│  │  Film Card 1        │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  Film Card 2        │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  Film Card 3        │   │
│  └─────────────────────┘   │
│                             │
│  ...                        │
│                             │
├─────────────────────────────┤
│ Tier Chips (shuffled)       │ ← Bottom navigation
└─────────────────────────────┘
```

### Film Card Layout

**Horizontal card (poster + metadata + actions):**

```
┌──────────┬─────────────────────────┐
│          │  Title (headline)       │
│  Poster  │  Year (caption)         │
│ 140×210  │  Slug (full text)       │
│          │                         │
│          │  ┌──────────────────┐  │
│          │  │ ✓ Seen It        │  │ ← Primary action
│          │  └──────────────────┘  │
│          │                         │
│          │  Spacer                 │
│          │                         │
│          │        Add to List →    │ ← Secondary action
└──────────┴─────────────────────────┘
```

### Button States

**"Seen It" Button (Primary):**
- **Not Seen:**
  - Icon: Hollow circle `checkmark.circle`
  - Text: Black "Seen It"
  - Background: White with 2px outline (`Color.mgPrimary.opacity(0.3)`)
- **Seen:**
  - Icon: Filled circle `checkmark.circle.fill`
  - Text: White "Seen It"
  - Background: **Gold fill** (`Color.mgGold`)

**"Add to List" Button (Secondary):**
- **Not Queued:**
  - Text: Gray (`Color.mgPrimary`)
  - Background: Clear
- **Queued:**
  - Text: Gold (`Color.mgGold`)
  - Background: Gold tinted (15% opacity `Color.mgGold.opacity(0.15)`)

---

## 5. Progress Calculation

### Category Badge Progress

Calculates across **ALL 10 tiers** in that category:

```swift
progress = (total seen films across all tiers) / (total films across all tiers)
```

**Example:**
- Drama has 287 total films across 10 tiers
- User has seen 143 films
- Category badge shows: **50%** (copper color)

### Tier Chip Progress

Calculates only for **THAT specific tier**:

```swift
progress = (seen films in this tier) / (total films in this tier)
```

**Example:**
- Drama: Devotee has 25 films
- User has seen 20 films
- Tier chip shows: **80%** (pure gold color)

### Progress Tracking System

**Singleton:** `TierProgressTracker.shared`

**Cache Structure:**
```swift
[category: [tier: completionPercent]]
// Example:
["Drama": ["Essential": 0.85, "Devotee": 0.60, ...]]
```

**Refresh Triggers:**
1. On view appear (first load)
2. When `favorites.lovedMovies.count` changes (user marks film seen)

**Lookup Mechanism:**
```swift
let lookupKey = "\(category)|\(tier)|\(title)|\(year)"
// Example: "Drama|Devotee|Network|1976"

if let tmdbId = CategoryEssentials.tmdbIdLookup[lookupKey] {
    return seenIds.contains(tmdbId)
}
```

---

## 6. Data Structure

### Embedded Film Data

**Location:** `GeniusView.swift` (lines ~1,300-6,000)
**Format:** Static Swift code (287 film entries)

```swift
struct CategoryEssentials {
    static func films(for category: String, subcategory: String) -> [EssentialMovie] {
        switch (category, subcategory) {
        case ("Drama", "Devotee"):
            return [
                EssentialMovie(
                    title: "Network",
                    year: 1976,
                    slug: "Paddy Chayefsky's scathing media satire...",
                    tmdbId: 8392
                ),
                // ... 24 more films
            ]
        // ... 286 more cases
        }
    }
}
```

### TMDB ID Lookup Table

**Location:** `ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift` (1,846 lines)

```swift
static let tmdbIdLookup: [String: Int] = [
    "Drama|Devotee|Network|1976": 8392,
    "Drama|Devotee|All That Jazz|1979": 11398,
    // ... 285 more mappings
]
```

### EssentialMovie Model

```swift
struct EssentialMovie: Identifiable {
    let id = UUID()
    let title: String
    let year: Int?
    let slug: String  // Single-sentence description
    let tmdbId: Int   // For cross-referencing with favorites
}
```

---

## 7. User Journey Stages

**Displayed in GeniusView header based on `favorites.lovedMovies.count`:**

| Count | Icon | Stage | Description | Insight |
|-------|------|-------|-------------|---------|
| **0** | `film` | Your Cinematic Journey | "Start building your collection" | nil |
| **1-5** | `leaf` | Building Foundation | "X films seen" | "Every film you watch teaches us about your taste" |
| **6-15** | `chart.line.uptrend.xyaxis` | Patterns Emerging | "X films • Taste developing" | "Your collection reveals emerging patterns in your preferences" |
| **16+** | `star` | Sophisticated Profile | "X films seen" | "Your collection spans genres, eras, and storytelling traditions" |

**Purpose:** Provides encouragement and context for the user's cinematic education journey.

---

## 8. Navigation Flow Examples

### Example 1: Browse Drama Films

```
User Flow:
1. GeniusView loads
   → 22 category badges shuffled
   → "DRAMA" badge shows 5% (light gray)

2. Tap "DRAMA" badge
   → Navigate to: CategoryEssentialsView(category: "Drama", subcategory: "Essential")
   → Top navigation: 10 tier chips (shuffled)
   → Film list: 30 essential Drama films

3. Scroll and tap "DEVOTEE" tier chip
   → Navigate to: CategoryEssentialsView(category: "Drama", subcategory: "Devotee")
   → Film list: 25 Devotee-level Drama films

4. Scroll to "Network (1976)"
   → Tap "Seen It" button
   → Button fills with gold
   → Badge color updates in real-time
   → Tier chip progress recalculates (60% → 64%)

5. Back to main Genius view
   → "DRAMA" badge now shows 6% (slightly darker gray)
```

### Example 2: Progress Through Tiers

```
User Journey:
1. Drama: Essential (0% → 100%)
   → Badge: Light gray → Medium gray → Warm gray → Bronze → Gold
   → Chip: Same color progression
   → At 100%: Gold border + star badge appears

2. Drama: Foundational begins
   → User explores next tier
   → Category badge continues climbing (now 10% overall)

3. After 8 tiers completed (80% overall)
   → Category badge: Pure gold
   → Text: White for contrast
   → Border: 2px gold stroke
   → Star: Appears on badge
```

### Example 3: Multi-Category Mastery

```
Visual State:
- Drama: 85% (pure gold, star badge)
- Comedy: 45% (bronze)
- Horror: 12% (medium gray)
- Directors: 0% (light gray)

Grid View:
┌─────────┬─────────┬─────────┬─────────┐
│ DRAMA⭐ │ COMEDY  │ HORROR  │DIRECTORS│
│  Gold   │ Bronze  │  Gray   │  Gray   │
└─────────┴─────────┴─────────┴─────────┘
```

---

## 9. Key Visual Behaviors

### Shuffling Strategy

**Why shuffle?**
- Encourages **exploration** over predictable alphabetical browsing
- Creates unique experience per user
- Prevents genre bias (e.g., always starting with Action)

**Shuffle Points:**
1. **Categories** - Shuffled once per GeniusView session
2. **Tier chips** - Shuffled once per CategoryEssentialsView appear

**Persistence:**
- Shuffles are stored in `@State` to maintain order during navigation
- Resets on app restart or view dismissal

### Color Update Triggers

**Real-time reactivity using Combine + SwiftUI:**

1. **User taps "Seen It"**
   → `FavoritesManager.shared.lovedMovies` updates
   → `@Published` property broadcasts change
   → `@ObservedObject` views receive update
   → Color recalculation triggered

2. **Progress calculation**
   → `TierProgressTracker.refreshCategory()` called
   → Cache updated: `completionCache[category][tier] = newPercent`
   → SwiftUI re-renders badges/chips with new colors

3. **Badge/chip re-render**
   → `switch completionPercent` evaluates new range
   → New color returned from `badgeColor` / `gradientColor`
   → Smooth transition (no animation—instant feedback)

### Navigation Patterns

**NavigationLink Wrapping:**
```swift
NavigationLink(destination: CategoryEssentialsView(...)) {
    CategoryBadge(category: category, progress: progress)
}
.buttonStyle(MGCardButtonStyle())
```

**Button Styling:**
- `.buttonStyle(.plain)` - Prevents default iOS tap effects
- Custom `MGCardButtonStyle()` - Maintains visual consistency
- No explicit tap animations (relies on instant color changes)

---

## 10. Technical Implementation Details

### Performance Optimizations

**Problem:** 287 films × 22 categories = 6,314 data points to track

**Solutions:**
1. **Lazy loading** - `LazyVStack` for film lists
2. **Cached progress** - `TierProgressTracker` singleton caches calculations
3. **On-demand refresh** - Only recalculates visible category
4. **Set-based lookup** - `Set(favorites.lovedMovies.map { $0.id })` for O(1) checks

### Memory Footprint

**Embedded Data:**
- GeniusView.swift: 233 KB (6,136 lines)
- TierTmdbLookup.swift: 97 KB (1,846 lines)
- **Total:** 330 KB compiled into app binary

**Runtime:**
- TierProgressTracker cache: ~5 KB (22 categories × 10 tiers × 8 bytes)
- FavoritesManager: Depends on user's collection size

### Scalability Considerations

**Current:** 287 films (acceptable)
**Threshold:** 500+ films → consider refactor to JSON/Core Data
**See:** `/ios/GENIUS_VIEW_DATA_ANALYSIS.md` for detailed analysis

---

## 11. Design Philosophy

### The Genius of the System

**Core Insight:** Film education should feel like **leveling up in an RPG**, not homework.

**Psychological Hooks:**
1. **Visual progression** - Tangible color changes reward effort
2. **Gamification** - Tiers create clear milestones
3. **Autonomy** - Shuffled categories = user chooses path
4. **Mastery** - Gold badges = visible expertise

### Color Psychology

| Color Range | Emotional Association | User State |
|-------------|----------------------|------------|
| **Gray** | Neutral, unexplored | Beginner |
| **Bronze** | Warmth, emerging skill | Learning |
| **Copper** | Richness, dedication | Committed |
| **Rose Gold** | Prestige, near-mastery | Advanced |
| **Gold** | Excellence, achievement | Expert |

**Result:** Users feel motivated to "complete" categories to see the gold badge—intrinsic motivation through visual design.

### Minimal Design Principles

**What's NOT included (intentionally):**
- ❌ Progress bars (too mechanical)
- ❌ Percentage numbers (too literal)
- ❌ Confetti animations (too distracting)
- ❌ Daily streaks (too stressful)

**What IS included:**
- ✅ Subtle color shifts (elegant)
- ✅ Star badges (understated reward)
- ✅ Smart typography (kerning, weights)
- ✅ Consistent spacing (design system)

**Philosophy:** Progress should be felt, not shouted.

---

## 12. Future Enhancements (Considerations)

### If Film Count Grows Beyond 500

**Option A: Extract to JSON**
```json
{
  "Drama": {
    "Devotee": [
      {"title": "Network", "year": 1976, "tmdbId": 8392, "slug": "..."}
    ]
  }
}
```
- Pros: Easier to update, smaller bundle
- Cons: Requires JSON parsing, loses type safety

**Option B: Code Generation**
- Keep data in JSON
- Generate Swift code at build time
- Best of both worlds (maintainability + performance)

**Option C: Core Data / SQLite**
- Bundle pre-populated database
- Query on demand
- Best for 1000+ films

### Additional Features (Not Implemented)

**Considered but deferred:**
- Subcategory bookmarking (user can favorite specific tiers)
- Social sharing (share gold badges)
- Personal stats (e.g., "You've seen 85% of all Noir films")
- Recommendations ("Based on your Drama mastery, try...")

**Why deferred:** Maintain simplicity and focus on core progression loop.

---

## 13. Troubleshooting

### Common Issues

**Issue:** Badge color not updating after marking film seen
**Cause:** FavoritesManager not broadcasting change
**Fix:** Verify `@Published var lovedMovies` in FavoritesManager

**Issue:** Tier chips show 0% despite films seen
**Cause:** TMDB ID lookup failing
**Fix:** Check `CategoryEssentials.tmdbIdLookup[lookupKey]` format

**Issue:** Categories not shuffling
**Cause:** `@State` not persisting shuffle
**Fix:** Verify `shuffledCategories.isEmpty` check in `.onAppear`

---

## 14. Related Documentation

**Architecture:**
- `/ios/GENIUS_VIEW_DATA_ANALYSIS.md` - Data size analysis & refactor recommendations
- `/ios/DESIGN_DECISIONS.md` - iOS architecture decisions
- `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md` - Overall system architecture

**Code Locations:**
- `ios/moviegenius/moviegenius/Views/GeniusView.swift` (6,136 lines)
- `ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift` (1,846 lines)
- `ios/moviegenius/moviegenius/Services/FavoritesManager.swift` (progress tracking)

**Testing:**
- `ios/moviegenius/moviegeniusTests/CategoryEssentialsTests.swift` (tier logic tests)

---

## Summary: The Genius System in One Sentence

**A gamified cinematic education journey where watching curated films transforms category badges from gray to gold, visualizing progress across 22 genres and 10 mastery tiers through 9 subtle color gradations—creating intrinsic motivation through elegant, minimal design.**

---

**Last Updated:** 2026-05-15
**Commit:** 4d80ca94d (iOS tier progress tracking + sign-in system)
**Total Lines:** 6,136 (GeniusView.swift) + 1,846 (TierTmdbLookup.swift) = 7,982 lines
