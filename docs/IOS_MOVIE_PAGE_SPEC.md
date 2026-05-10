# iOS Movie Page Specification

**Version:** 1.0
**Last Updated:** 2025-05-08
**Purpose:** Define the core components and data structure for MovieGenius iOS movie detail pages

---

## Design Philosophy

**Minimal, poster-first design with no title/year display.**

The iOS movie page is built around visual recognition (poster) and immediate value (WhyWatch verdict). Unlike the web version, there is no redundant title/year text — users navigate via posters and get instant recommendations.

---

## Core Components (In Order)

### 1. Search Bar
- **Position:** Sticky header at top
- **Functionality:** Global movie search across entire catalog
- **Persistence:** Remains visible while scrolling

### 2. Movie Poster
- **Dimensions:** 267×400px (2:3 aspect ratio)
- **Source:** TMDB optimized poster URL
- **Fallback:** Placeholder for missing posters
- **No Title/Year Overlay:** Poster displayed clean without text

### 3. Trailer Button
- **Position:** Overlay on poster (centered or bottom)
- **Icon:** Play button
- **Action:** Opens YouTube trailer in modal/sheet
- **Source:** `/api/tmdb-trailer?tmdbId={id}`
- **Fallback:** Hide button if no trailer available

### 4. Why Section (WhyWatch)
- **Header:** "Why" (no additional text)
- **Verdict:** Binary recommendation
  - "Worth Watching" (YES)
  - "Skip It" (NO)
- **Reasons:** 3 specific bullet points explaining the verdict
- **Data Source:** `enhanced_why_watch` table (separate build from analysis)
- **Fallback:** If no WhyWatch data exists, hide section or show "Analysis pending"

**Example Structure:**
```
Why
Worth Watching
• Reason 1
• Reason 2
• Reason 3
```

### 5. Action Buttons (Seen/Add)
- **Position:** Below Why section, horizontal layout
- **Buttons:**
  1. **Seen Button:** Checkmark icon + "Seen" label
  2. **Add Button:** Plus icon + "Add" label
- **Functionality:**
  - Seen: Mark movie as watched (local persistence)
  - Add: Save to personal collection/watchlist
- **State:** Toggle buttons with filled/unfilled states

### 6. More Ideas
- **Header:** "More Ideas"
- **Layout:** Horizontal scrolling row of movie posters
- **Poster Size:** Smaller than main poster (e.g., 125×188px per MediaCard spec)
- **Count:** 15 related movies (tmdbIds)
- **Data Source:** `more_ideas` field from movie analysis (separate build)
- **Navigation:** Tapping poster navigates to that movie's page
- **Slugs:** Each poster includes **Movie (Year)** text below it

**IMPORTANT:** More Ideas is the ONLY place where title/year slugs appear on the movie page.

---

## Data Architecture

### WhyWatch Build (Separate Process)
- **Table:** `enhanced_why_watch`
- **Fields:**
  - `tmdb_id`
  - `verdict` (YES/NO)
  - `reasons` (3-item array)
- **Coverage:** 61% of movies (as of 2025-05)
- **Generation:** Claude AI batch processing

### More Ideas Build (Separate Process)
- **Source:** `analysis_data_v3.more_ideas` field
- **Format:** Array of 15 tmdbIds
- **Fallback:** Similar movies via TMDB API if missing

### Text Below Why
- **Source:** `enhanced_why_watch.reasons` (from Why build)
- **NOT from:** Analysis text or legacy 500-word analyses
- **Content:** 3 specific, actionable reasons (20-40 words each)

---

## What's NOT on the Page

❌ **Title/Year Text:** No redundant text — poster speaks for itself
❌ **Streaming Info:** Deferred to later phase
❌ **Cast/Crew:** Deferred to later phase
❌ **Full Analysis:** Replaced by WhyWatch (200-word analysis deprecated on iOS)
❌ **User Reviews:** Not part of MVP
❌ **Ratings (TMDB/IMDB):** Not displayed (WhyWatch is the rating)

---

## API Endpoints Required

### Primary Endpoint
```
GET /api/v1/movie/{tmdbId}
```

**Returns:**
```json
{
  "movie": {
    "tmdb_id": 550,
    "poster_url": "https://image.tmdb.org/t/p/w500/...",
    "year": 1999
  },
  "whyWatch": {
    "verdict": "YES",
    "reasons": ["Reason 1", "Reason 2", "Reason 3"]
  },
  "moreIdeas": [278, 680, 13, ...] // 15 tmdbIds
}
```

### Supporting Endpoints
```
GET /api/tmdb-trailer?tmdbId={id}
GET /api/tmdb-poster?tmdbId={id}
```

---

## SwiftUI Data Models

```swift
struct MoviePage: Identifiable {
    let id: Int  // tmdbId
    let posterUrl: String
    let year: Int
    let trailerKey: String?
    let whyWatch: WhyWatch?
    let moreIdeas: [Int]  // tmdbIds
}

struct WhyWatch {
    let verdict: Verdict
    let reasons: [String]  // Always 3 items

    enum Verdict: String {
        case yes = "Worth Watching"
        case no = "Skip It"
    }
}
```

---

## Navigation Flow

1. **Entry:** User taps poster from Browse/Search/Collection
2. **Load:** Fetch `/api/v1/movie/{tmdbId}` (unified endpoint)
3. **Display:** Render poster → Why → Actions → More Ideas
4. **Exit:** Back button or tap More Ideas poster (navigate to new movie page)

**No Title in Navigation Bar:** Use empty or app name in nav bar, not movie title

---

## Coverage & Fallbacks

**WhyWatch Coverage:** 61% of movies have WhyWatch data

**Fallback Strategy:**
- **Option A:** Hide Why section if no data (show only poster + More Ideas)
- **Option B:** Show "Analysis pending" placeholder
- **Option C:** Generate on-demand (requires backend work)

**User Decision Required:** Choose fallback strategy before Phase 2 implementation

---

## Design Constraints

1. **No Slugs:** Do not display **Movie (Year)** text except in More Ideas
2. **Separate Builds:** Why and More Ideas come from different data sources
3. **Poster-First:** Visual hierarchy prioritizes poster over text
4. **Mobile-Optimized:** 390px viewport, scroll-friendly layout
5. **Binary Verdict:** No star ratings, no percentage scores — just YES/NO

---

## Implementation Notes

**Phase 2 (Browse) Requirements:**
- MoviePage view component
- WhyWatch component (conditional rendering)
- More Ideas horizontal scroll
- Poster image loading with Kingfisher
- YouTube trailer modal

**Phase 3 (Search) Requirements:**
- Search bar integration at top of MoviePage

**Phase 4 (You Tab) Requirements:**
- Seen/Add button persistence via SwiftData

---

## Related Documentation

- [iOS Development Plan](IOS_DEVELOPMENT_PLAN.md)
- [V3 Architecture](MOVIEGENIUS_V3_ARCHITECTURE.md)
- [API Reference](API_REFERENCE.md)
- [Locked Components](architecture/LOCKED_COMPONENTS.md)

---

*This specification defines the MVP iOS movie page. Features like streaming info, cast, and long-form analysis are intentionally excluded to ship faster.*
