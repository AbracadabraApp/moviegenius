# MovieGenius v2: Local-First Architecture Plan

## Executive Summary
Transform MovieGenius from an API-dependent app into a local-first experience with bundled data, eliminating network dependencies and crashes while providing instant, offline-capable performance.

---

## Current State Analysis

### Pain Points
- **Network Dependency**: 50-200 API calls per session
- **Loading Times**: 2-5 seconds per screen
- **Crash Sources**: Network timeouts, 5K+ movie batch loads
- **Data Usage**: 5-10MB per session
- **Error Handling**: Complex network retry logic

### Strengths to Preserve
- **Curated Content**: Hand-picked films with AI analysis
- **Clean UI**: Native iOS design patterns
- **iCloud Sync**: User preferences and watchlist

---

## v2 Architecture: Local-First Design

### Core Principles
1. **Ship the Database**: Bundle all movie data with the app
2. **Zero Network for Core Features**: Browse, search, discover work offline
3. **Smart Updates**: Monthly delta updates, not real-time sync
4. **User Data in iCloud**: Preferences sync across devices

### Data Architecture

```
MovieGenius.app/
├── Resources/
│   ├── moviegenius_v2.sqlite (15-20MB)
│   │   ├── movies (10,000 records)
│   │   ├── collections (200 records)
│   │   ├── people (500 records)
│   │   ├── awards (1,000 records)
│   │   └── metadata (version, indexes)
│   └── images/
│       └── placeholder_posters/
├── Documents/ (User Space)
│   ├── user_data.sqlite
│   │   ├── watchlist
│   │   ├── ratings
│   │   └── viewing_history
│   └── cache/
│       └── poster_images/
└── iCloud Container/
    └── MovieGenius/
        ├── preferences.json
        └── sync_state.json
```

---

## Implementation Phases

### Phase 1: Data Preparation (Week 1)

#### 1.1 Build Master Database Script
```python
# build_local_database.py
"""
Consolidates all MovieGenius data into a single SQLite database
Inputs: TMDB data, curated lists, AI analyses, awards
Output: moviegenius_v2.sqlite (production-ready)
"""

# Tables:
# - movies: tmdb_id, title, year, overview, poster_path, vote_average
# - movie_analysis: movie_id, why_watch, analysis_text, themes
# - collections: id, name, subtitle, category, order
# - collection_movies: collection_id, movie_id, position
# - people: id, name, known_for, profile_path
# - filmographies: person_id, movie_id, character, billing_order
# - awards: id, name, year, category, winner_type
# - award_winners: award_id, movie_id, person_id, year
```

#### 1.2 Data Optimization
- **Compress strings**: Store common words once, reference by ID
- **Index critical paths**: title, year, collection_id
- **Denormalize for speed**: Embed frequently joined data
- **Target size**: <20MB compressed

#### 1.3 Versioning System
```json
{
  "schema_version": "2.0.0",
  "data_version": "2024.01.15",
  "movie_count": 10234,
  "last_updated": "2024-01-15T00:00:00Z"
}
```

### Phase 2: iOS App Refactor (Week 2)

#### 2.1 Swift Data Models
```swift
import SwiftData

@Model
final class LocalMovie {
    @Attribute(.unique) let tmdbId: Int
    let title: String
    let year: Int
    let overview: String
    let posterPath: String?
    let voteAverage: Double
    let whyWatch: String?
    let analysis: String?

    @Relationship(inverse: \LocalCollection.movies)
    var collections: [LocalCollection]

    @Relationship(inverse: \LocalPerson.movies)
    var cast: [LocalPerson]
}

@Model
final class LocalCollection {
    @Attribute(.unique) let id: String
    let name: String
    let subtitle: String
    let category: String
    let order: Int

    @Relationship var movies: [LocalMovie]
}

@Model
final class LocalPerson {
    @Attribute(.unique) let id: Int
    let name: String
    let profilePath: String?

    @Relationship var movies: [LocalMovie]
}
```

#### 2.2 Data Manager
```swift
final class LocalDataManager {
    static let shared = LocalDataManager()
    private let container: ModelContainer

    init() {
        // Copy bundled database on first launch
        if !databaseExists() {
            copyBundledDatabase()
        }

        // Initialize Swift Data
        let config = ModelConfiguration(
            url: documentsURL.appending("moviegenius.sqlite"),
            allowsSave: false // Read-only for bundled data
        )
        container = try! ModelContainer(for: LocalMovie.self, config)
    }

    func searchMovies(_ query: String) -> [LocalMovie] {
        // Instant, local search
    }

    func getCollection(_ id: String) -> LocalCollection? {
        // Instant, local fetch
    }
}
```

#### 2.3 Migration Path
```swift
class MigrationManager {
    func migrateFromV1() {
        // 1. Preserve user preferences
        let watchlist = UserDefaults.standard.object(forKey: "watchlist")
        let favorites = UserDefaults.standard.object(forKey: "favorites")

        // 2. Copy to new local database
        localDB.importUserData(watchlist, favorites)

        // 3. Clean up old cache
        clearHTTPCache()
        clearTempFiles()
    }
}
```

### Phase 3: Update System (Week 3)

#### 3.1 Delta Updates
```swift
class UpdateManager {
    func checkForUpdates() async {
        // Check monthly, not on every launch
        guard shouldCheckForUpdate() else { return }

        let currentVersion = Bundle.main.dataVersion
        let latestVersion = await fetchLatestVersion()

        if latestVersion > currentVersion {
            // Download delta file (10-50KB)
            let delta = await downloadDelta(from: currentVersion, to: latestVersion)
            applyDelta(delta)
        }
    }

    private func applyDelta(_ delta: DeltaPackage) {
        // Add new movies
        // Update changed metadata
        // Remove deprecated entries
        // Update version marker
    }
}
```

#### 3.2 Image Caching
```swift
class PosterCache {
    // Progressive loading strategy:
    // 1. Show bundled placeholder immediately
    // 2. Load from disk cache if available
    // 3. Fetch from TMDB in background
    // 4. Cache to disk for next time

    func posterImage(for path: String) async -> UIImage {
        if let cached = diskCache.image(for: path) {
            return cached
        }

        // Return placeholder immediately
        Task.detached {
            // Fetch and cache in background
            let image = await fetchFromTMDB(path)
            diskCache.store(image, for: path)
        }

        return UIImage(named: "poster_placeholder")!
    }
}
```

### Phase 4: Testing & Optimization (Week 4)

#### 4.1 Performance Targets
- **App Launch**: <500ms to first screen
- **Search Results**: <50ms for 1000+ results
- **Collection Load**: <100ms for 100 movies
- **Memory Usage**: <50MB active
- **Database Size**: <20MB compressed

#### 4.2 Test Scenarios
- [ ] Fresh install
- [ ] v1 → v2 migration
- [ ] Offline mode (airplane)
- [ ] 10,000 movie search
- [ ] Background update
- [ ] iCloud sync conflict
- [ ] Low storage warning

---

## Benefits & Tradeoffs

### Benefits ✅
- **Instant Performance**: All operations <100ms
- **Offline Capable**: Works without internet
- **Predictable**: No network failures
- **Battery Efficient**: No constant API calls
- **Reduced Complexity**: Remove entire network layer
- **Better UX**: No loading spinners

### Tradeoffs ⚠️
- **App Size**: +20MB (60MB → 80MB total)
- **Updates**: Not real-time (monthly cycle)
- **Initial Development**: 4-week investment
- **App Store Updates**: Data updates require app updates (initially)

---

## Success Metrics

### Technical KPIs
- Crash rate: <0.1% (from 2-3%)
- Load time: <100ms (from 2-5 seconds)
- App size: <100MB total
- Memory usage: <50MB active
- Battery impact: Minimal

### User Experience KPIs
- App store rating: 4.8+ stars
- Session length: +30%
- Offline usage: Measurable
- User retention: +25%

---

## Future Roadmap

### v2.1 (Month 2)
- Over-the-air delta updates
- Spotlight search integration
- Widget support with local data

### v2.2 (Month 3)
- SharePlay for movie nights
- Siri Shortcuts
- ML-powered local recommendations

### v3.0 (Future)
- Optional cloud features (reviews, social)
- Real-time collaborative watchlists
- AI chat about movies (server-side)

---

## Migration Checklist

### Pre-Launch
- [ ] Build and test SQLite database
- [ ] Implement Swift Data models
- [ ] Create migration tool for v1 users
- [ ] Test on 10+ devices
- [ ] Prepare App Store description

### Launch Day
- [ ] Submit v2.0 to App Store
- [ ] Enable phased rollout (7 days)
- [ ] Monitor crash reports
- [ ] Prepare v2.0.1 hotfix if needed

### Post-Launch
- [ ] Gather user feedback
- [ ] Monitor performance metrics
- [ ] Plan first delta update
- [ ] Document lessons learned

---

## Conclusion

MovieGenius v2's local-first architecture eliminates the primary source of crashes and poor performance while providing a premium, instant user experience. The 4-week investment will result in a fundamentally more reliable and delightful app that works everywhere, always.

**Next Step**: Begin Phase 1 with `build_local_database.py` script development.