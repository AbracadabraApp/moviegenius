# MovieGenius iOS - Current State & Handoff Document

**Date:** 2026-05-10
**Version:** Phase 1 MVP
**Status:** Basic functionality working, needs design & architecture review

---

## 1. Project Overview

MovieGenius is a movie recommendation app with AI-generated analysis. The iOS app is a native Swift/SwiftUI port consuming the same unified API as the production web app (https://moviegenius.ai).

**Web App Context:**
- Next.js/React production app with 21,275 analyzed movies
- WhyWatch feature: Binary YES/NO recommendations with 3 specific reasons
- Browse system with 827 curated lists
- PhoneFrame-first design (390px mobile viewport)

**iOS Goal:**
- Native iOS experience with same content/features
- Better performance than web wrapper
- Proper iOS navigation, gestures, and UX patterns

---

## 2. What's Built (Phase 1)

### ✅ Working Features
- **API Integration** - Consuming unified `/api/v1/movie/{tmdbId}` endpoint
- **Movie Detail Screen** - Poster, title, year, WhyWatch section, More Ideas carousel
- **Trailer Playback** - Embedded YouTube player via WKWebView
- **Data Models** - `Movie`, `WhyWatch`, `MoreIdea` matching API response
- **Error Handling** - Network errors, timeouts, 404s, decoding failures
- **MVVM Architecture** - ViewModel handles business logic, Views are declarative

### ⚠️ Current Limitations
- **Hardcoded Movie** - App shows Lost in Translation (tmdbId: 153) only
- **No Navigation** - No search, browse, or ability to view other movies
- **No Design System** - Ad-hoc colors, fonts, spacing
- **Placeholder UI** - "Seen" and "Add" buttons are non-functional
- **No App Icon** - Using default Xcode placeholder
- **No Launch Screen** - Plain white screen on launch
- **Basic Animations** - Loading states are simple spinners
- **More Ideas Posters** - Showing placeholder film icons, not real posters

---

## 3. Project Structure

```
ios/moviegenius/moviegenius/
├── Models/
│   ├── Movie.swift          # MovieResponse, Movie, WhyWatch, MoreIdea
│   └── ...
├── Services/
│   └── APIClient.swift      # Actor-based API client with URLSession
├── ViewModels/
│   └── MovieDetailViewModel.swift  # @MainActor ObservableObject
├── Views/
│   ├── ContentView.swift           # Main app view
│   ├── MoviePosterView.swift       # Poster with trailer button
│   ├── WhyWatchView.swift          # WhyWatch section display
│   ├── MoreIdeasView.swift         # Horizontal scrolling carousel
│   └── TrailerPlayerView.swift     # YouTube embed player
└── moviegeniusApp.swift     # App entry point
```

---

## 4. Technical Details

### API Integration

**Endpoint:** `https://moviegenius.ai/api/v1/movie/{tmdbId}`

**Response Structure:**
```json
{
  "movie": {
    "tmdb_id": 153,
    "title": "Lost in Translation",
    "year": 2003,
    "poster_url": "https://image.tmdb.org/t/p/w500/...",
    "trailer_url": "SUXWAEX2jlg",  // YouTube video ID
    "slug": "...",
    // ... other fields
  },
  "whyWatch": {
    "is_why_watch": true,
    "reason_1": "Sofia Coppola's masterful...",
    "reason_2": "Bill Murray and Scarlett...",
    "reason_3": "The film captures..."
  },
  "moreIdeas": [
    {
      "tmdb_id": 152601,
      "title": "Her",
      "year": 2013,
      "connection": "Spike Jonze's film..."
    }
    // ... more movies
  ]
}
```

### Architecture Decisions Made

**✅ Good Choices:**
1. **Actor-based APIClient** - Thread-safe, modern Swift concurrency
2. **MVVM Pattern** - Clear separation of concerns
3. **@MainActor on ViewModel** - UI updates always on main thread
4. **Codable Models** - Type-safe JSON parsing with CodingKeys for snake_case
5. **Async/Await** - No completion handlers, cleaner error handling
6. **LazyHStack** - Memory-efficient scrolling in More Ideas
7. **15s Network Timeout** - Prevents hanging requests
8. **Specific Error Messages** - User-friendly errors (404, timeout, no internet)

**❓ Questionable Choices:**
1. **No Combine usage** - Just ObservableObject, no publishers/subscribers
2. **No persistence layer** - No CoreData/SwiftData caching
3. **Simple state management** - No Redux/TCA pattern
4. **Inline styles** - All styling in View code, no design tokens
5. **No dependency injection** - APIClient is singleton
6. **No unit tests** - No test coverage yet

---

## 5. Current Code Quality

### Production-Ready ✅
- **No forced unwraps** - All optionals handled with guard/if-let
- **No debug logging** - All print statements removed
- **Proper error handling** - Catch blocks with specific APIError enum
- **Concurrency safety** - @MainActor annotations where needed
- **Memory management** - LazyHStack, no retain cycles

### Needs Improvement ⚠️
- **No accessibility** - No VoiceOver labels, Dynamic Type support
- **Hard-coded values** - tmdbId: 153, colors, font sizes
- **Repetitive code** - Each View has similar loading/error states
- **No reusable components** - Button styles, cards not extracted
- **Magic numbers** - `125×188` poster size, `12pt` padding, etc.
- **No animation** - AsyncImage just pops in, no smooth transitions

---

## 6. Design Questions (Need iOS Expert Input)

### Navigation Architecture
- **Tab bar?** Browse, Search, You sections like web?
- **Navigation stack?** Drill-down from lists to movies?
- **Modal presentation?** Full-screen overlays for detail views?
- **Deep linking?** Handle moviegenius:// URLs?

### Design System
- **Native iOS?** Use system colors, SF Symbols, standard spacing?
- **Custom brand?** Match web app's exact colors/fonts?
- **Dark mode?** Support or defer to v2?
- **Typography?** SF Pro or custom font?

### UX Patterns
- **Search** - Modal sheet? Tab bar item? Nav bar search?
- **Favorites** - Heart icon in nav bar? Separate tab?
- **Browse lists** - Grid? List? Horizontal scrolling?
- **Loading states** - Skeleton screens? Spinners? Shimmer effect?
- **Empty states** - Illustrations? Text only?
- **Pull-to-refresh?** On movie detail? Browse lists?

### Performance
- **Image caching?** Use native AsyncImage or Kingfisher/SDWebImage?
- **Pagination?** Load more movies as user scrolls?
- **Prefetching?** Load next movie's data in background?
- **Offline mode?** Cache viewed movies for offline viewing?

### Polish
- **Haptics?** On button taps, trailer open, etc.?
- **Animations?** Page transitions, card reveals, loading states?
- **App icon design?** Match web or unique iOS identity?
- **Launch screen?** Branded vs. simple?
- **Onboarding?** Tutorial for first launch?

---

## 7. Known Issues

### Critical 🔴
- None currently - app builds and runs

### Medium 🟡
1. **Trailer player** - Using WKWebView iframe (works but not ideal for iOS)
2. **More Ideas posters** - Placeholder icons instead of real poster images
3. **No real navigation** - Can't leave Lost in Translation movie

### Low 🟢
1. **Seen/Add buttons** - Non-functional placeholders
2. **No app icon** - Using Xcode default
3. **No launch screen** - White screen on launch
4. **Search bar** - Currently a gray placeholder rectangle

---

## 8. Next Steps (Prioritized)

### Phase 1 Completion (Before expanding features)
1. **Design Review** ⭐ CRITICAL
   - Navigation architecture decision
   - Design system (colors, typography, spacing)
   - UX patterns for search, browse, favorites

2. **Code Review** ⭐ IMPORTANT
   - Architecture validation (MVVM vs. TCA/Redux)
   - State management approach
   - Testing strategy

3. **Polish Current Screen**
   - Real More Ideas posters (add poster_url to API response)
   - Improve trailer player (native video player vs. WKWebView)
   - Add proper loading animations
   - Implement Seen/Add buttons (localStorage equivalent)

### Phase 2 Features (After design decisions)
4. **Search Implementation**
   - UI: Modal? Tab? Nav bar?
   - API: Use existing `/api/search-movies` endpoint
   - Results: List? Grid? Infinite scroll?

5. **Browse Lists**
   - Navigation from Browse tab
   - List of 827 collections
   - Horizontal scrolling movie cards

6. **Favorites/You Section**
   - Persistent storage (UserDefaults? CoreData?)
   - Hearted movies, bookmarked lists
   - Seen/want-to-see tracking

7. **App Infrastructure**
   - App icon design & implementation
   - Launch screen
   - Deep linking setup
   - Analytics integration (if desired)

---

## 9. Questions for iOS Expert

### Architecture
1. Is MVVM the right choice, or should we use TCA/Redux for this app?
2. Should we introduce Combine publishers for state updates?
3. Is a singleton APIClient acceptable, or use dependency injection?
4. How should we handle navigation (Coordinator pattern)?

### Design
5. Should we match the web app's design exactly, or create an iOS-native feel?
6. Tab bar navigation (Browse/Search/You) - best practice for this app?
7. How to handle 390px PhoneFrame constraint on larger iPhones/iPads?
8. Dark mode: support now or defer to v2?

### Performance
9. Image caching: native AsyncImage or third-party library?
10. Should we cache movie data locally (CoreData/SwiftData)?
11. Pagination strategy for Browse lists (827 collections)?

### Code Quality
12. What's missing from a production-quality iOS app?
13. Testing strategy: Unit tests? UI tests? Snapshot tests?
14. Accessibility: what's the minimum viable implementation?

---

## 10. Files to Review

**Priority 1 - Core Architecture:**
- `/ios/moviegenius/moviegenius/Services/APIClient.swift`
- `/ios/moviegenius/moviegenius/ViewModels/MovieDetailViewModel.swift`
- `/ios/moviegenius/moviegenius/Models/Movie.swift`

**Priority 2 - UI Implementation:**
- `/ios/moviegenius/moviegenius/ContentView.swift`
- `/ios/moviegenius/moviegenius/Views/MoviePosterView.swift`
- `/ios/moviegenius/moviegenius/Views/WhyWatchView.swift`
- `/ios/moviegenius/moviegenius/Views/TrailerPlayerView.swift`

**Priority 3 - Project Config:**
- `/ios/moviegenius/moviegenius.xcodeproj/project.pbxproj`

---

## 11. Development Environment

- **Xcode:** 26.4.1
- **iOS Target:** 26.4 (latest)
- **Swift Version:** 5.0
- **Device Tested:** iPhone 7 (physical device, 00008140-001A384A1ED3001C)
- **Deployment Target:** Should we lower to iOS 16/17 for wider compatibility?

---

## 12. Success Metrics for Expert Review

**What we need from an iOS expert:**

✅ **Architecture Validation**
- Is the current structure scalable for full app features?
- What needs to be refactored before building more?

✅ **Design System Definition**
- Colors, typography, spacing tokens
- Reusable component library

✅ **Navigation Blueprint**
- Tab bar structure
- Modal flows
- Deep linking strategy

✅ **Prioritized Roadmap**
- What to build next (search? browse? favorites?)
- What can wait for v2
- Estimated complexity for each feature

✅ **Code Quality Bar**
- Testing strategy
- Accessibility requirements
- Performance benchmarks

---

## 13. Contact & Resources

**Production Web App:** https://moviegenius.ai
**API Base URL:** `https://moviegenius.ai/api/v1/`
**Project Repo:** `/Users/josh.petersen/moviegenius`

**Reference Files (Web Implementation):**
- `/components/MovieHeaderLarge.js` - Web poster/trailer implementation
- `/pages/movie/[id].js` - Web movie detail page
- `/docs/API_REFERENCE.md` - Full API documentation

**Key Contacts:**
- Josh Petersen (Product Owner)

---

**Document Version:** 1.0
**Last Updated:** 2026-05-10
**Next Review:** After iOS expert consultation
