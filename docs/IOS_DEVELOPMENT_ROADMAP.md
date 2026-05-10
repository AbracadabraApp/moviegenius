# iOS Development Roadmap

**Created:** 2026-05-08
**Status:** Week 2 - Backend Complete, Ready for iOS
**Target:** Native Swift/SwiftUI app consuming production API

---

## Production Context

### Backend Status (Week 1 Complete - May 3, 2026)

**Unified API:** `https://moviegenius.ai/api/v1/movie/{tmdbId}`
- Replaces 4 waterfall calls with 1 optimized query
- 67% faster page load (1,800ms → 600ms)
- Returns: movie metadata, WhyWatch, MoreIdeas, contributors, analysis

**Database Coverage:**
- Total movies: 32,950
- WhyWatch v3: 28,156 (85%) - includes context paragraph
- MoreIdeas: 19,915 (60%) - 15 related movies each
- Contributors: Full cast/crew data

**Recent API Fixes (May 8, 2026):**
- Fixed MoreIdeas JOIN bug (was returning null)
- Upgraded to enhanced_why_watch_v3 table (includes context field)
- iOS now gets complete data in single API call

---

## Production Movie Page Structure

**Components (in order):**
1. **Search bar** - SimpleSearch component
2. **Poster** - 267×400px with trailer overlay button
3. **WhyWatch** - Verdict (YES/NO) + 3 bullet reasons + context paragraph
4. **Seen/Add buttons** - User interaction controls
5. **Cast/Crew** - MovieCreativeFooter with contributors
6. **MoreIdeas** - 15 related movies (hide section if null)

**Key Details:**
- Mobile-first design (390px width target)
- No separate title/year display (poster is the header)
- WhyWatch context paragraph is part of WhyWatch data (not separate slug field)
- MoreIdeas should gracefully hide when null (don't show empty state)

---

## iOS App Architecture

### Phase 1: Foundation (Week 2) - 2 weeks

**Goal:** Single movie detail screen consuming unified API

#### 1.1 Xcode Project Setup
- [ ] Create new SwiftUI project "MovieGenius"
- [ ] Configure deployment target (iOS 17+)
- [ ] Set up project structure:
  ```
  MovieGenius/
  ├── Models/
  ├── Services/
  ├── Views/
  ├── ViewModels/
  └── Resources/
  ```

#### 1.2 Data Models
Create Swift models matching unified API response:

```swift
// Models/Movie.swift
struct MovieResponse: Codable {
    let movie: Movie
    let whyWatch: WhyWatch?
    let moreIdeas: [MoreIdea]?
    let contributors: Contributors?
    let analysis: Analysis?
}

struct Movie: Codable, Identifiable {
    let tmdbId: Int
    let title: String
    let year: Int?
    let officialTitle: String?
    let releaseDate: String?
    let slug: String?
    let posterUrl: String?
    let trailerUrl: String?
    let streamingData: StreamingData?
    let hasAnalysis: Bool
    let hasLinkedAnalysis: Bool

    var id: Int { tmdbId }
}

struct WhyWatch: Codable {
    let id: String
    let recommendation: String  // "YES" or "NO"
    let reasons: [String]       // Always 3 reasons
    let context: String?        // Closing paragraph
    let model: String?
    let createdAt: String

    var isRecommended: Bool {
        recommendation == "YES"
    }
}

struct MoreIdea: Codable, Identifiable {
    let tmdbId: Int?  // Some entries don't have tmdbId
    let title: String
    let year: Int
    let connection: String

    var id: String {
        "\(tmdbId ?? 0)-\(title)"
    }
}

struct Contributors: Codable {
    let cast: [CastMember]?
    let crew: [CrewMember]?
}

struct CastMember: Codable, Identifiable {
    let id: Int
    let name: String
    let character: String?
    let profilePath: String?
}

struct CrewMember: Codable, Identifiable {
    let id: Int
    let name: String
    let job: String?
    let department: String?
    let profilePath: String?
}
```

#### 1.3 API Client Service

```swift
// Services/APIClient.swift
actor APIClient {
    static let shared = APIClient()
    private let baseURL = "https://moviegenius.ai/api/v1"

    private init() {}

    func fetchMovie(tmdbId: Int) async throws -> MovieResponse {
        let url = URL(string: "\(baseURL)/movie/\(tmdbId)")!
        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.invalidResponse
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(MovieResponse.self, from: data)
    }
}

enum APIError: Error {
    case invalidResponse
    case networkError
    case decodingError
}
```

#### 1.4 Movie Detail View

Build the 6-component structure:

```swift
// Views/MovieDetailView.swift
struct MovieDetailView: View {
    let tmdbId: Int
    @StateObject private var viewModel: MovieDetailViewModel

    init(tmdbId: Int) {
        self.tmdbId = tmdbId
        _viewModel = StateObject(wrappedValue: MovieDetailViewModel(tmdbId: tmdbId))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                if let movie = viewModel.movieResponse {
                    // 1. Search bar (placeholder for Phase 2)
                    SearchBarPlaceholder()

                    // 2. Poster with trailer overlay
                    MoviePosterView(
                        posterUrl: movie.movie.posterUrl,
                        trailerUrl: movie.movie.trailerUrl
                    )

                    // 3. WhyWatch section
                    if let whyWatch = movie.whyWatch {
                        WhyWatchView(whyWatch: whyWatch)
                    }

                    // 4. Seen/Add buttons (placeholder for Phase 3)
                    ActionButtonsPlaceholder()

                    // 5. Cast/Crew
                    if let contributors = movie.contributors {
                        ContributorsView(contributors: contributors)
                    }

                    // 6. MoreIdeas (hide if null)
                    if let moreIdeas = movie.moreIdeas, !moreIdeas.isEmpty {
                        MoreIdeasView(moreIdeas: moreIdeas)
                    }
                } else if viewModel.isLoading {
                    ProgressView("Loading...")
                } else if let error = viewModel.error {
                    ErrorView(error: error)
                }
            }
        }
        .frame(maxWidth: 390)  // iPhone target width
        .task {
            await viewModel.loadMovie()
        }
    }
}

// ViewModels/MovieDetailViewModel.swift
@MainActor
class MovieDetailViewModel: ObservableObject {
    @Published var movieResponse: MovieResponse?
    @Published var isLoading = false
    @Published var error: Error?

    private let tmdbId: Int

    init(tmdbId: Int) {
        self.tmdbId = tmdbId
    }

    func loadMovie() async {
        isLoading = true
        error = nil

        do {
            movieResponse = try await APIClient.shared.fetchMovie(tmdbId: tmdbId)
        } catch {
            self.error = error
        }

        isLoading = false
    }
}
```

#### 1.5 Component Views

**MoviePosterView:**
```swift
struct MoviePosterView: View {
    let posterUrl: String?
    let trailerUrl: String?

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            AsyncImage(url: posterURL) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } placeholder: {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .aspectRatio(2/3, contentMode: .fit)
            }
            .frame(maxWidth: 267, maxHeight: 400)

            if trailerUrl != nil {
                Button {
                    // TODO: Play trailer
                } label: {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 44))
                        .foregroundColor(.white)
                        .shadow(radius: 4)
                }
                .padding()
            }
        }
    }

    private var posterURL: URL? {
        guard let posterUrl = posterUrl else { return nil }
        return URL(string: posterUrl)
    }
}
```

**WhyWatchView:**
```swift
struct WhyWatchView: View {
    let whyWatch: WhyWatch

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Verdict line
            HStack {
                Image(systemName: whyWatch.isRecommended ? "sparkles" : "hand.raised")
                    .foregroundColor(whyWatch.isRecommended ? .yellow : .red)
                Text(whyWatch.isRecommended ? "Worth Watching" : "Skip It")
                    .font(.headline)
            }

            // 3 reasons
            VStack(alignment: .leading, spacing: 8) {
                ForEach(whyWatch.reasons, id: \.self) { reason in
                    HStack(alignment: .top) {
                        Text("•")
                        Text(reason)
                    }
                }
            }

            // Context paragraph
            if let context = whyWatch.context {
                Text(context)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .padding(.top, 8)
            }
        }
        .padding()
    }
}
```

**MoreIdeasView:**
```swift
struct MoreIdeasView: View {
    let moreIdeas: [MoreIdea]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("More Ideas")
                .font(.headline)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(moreIdeas) { idea in
                        MoreIdeaCard(idea: idea)
                    }
                }
                .padding(.horizontal)
            }
        }
        .padding(.vertical)
    }
}

struct MoreIdeaCard: View {
    let idea: MoreIdea

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(idea.title)
                .font(.subheadline)
                .fontWeight(.semibold)
                .lineLimit(2)

            Text(String(idea.year))
                .font(.caption)
                .foregroundColor(.secondary)

            Text(idea.connection)
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(3)
        }
        .frame(width: 125)
        .padding(8)
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(8)
    }
}
```

**ContributorsView:**
```swift
struct ContributorsView: View {
    let contributors: Contributors

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let cast = contributors.cast, !cast.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Cast")
                        .font(.headline)

                    ForEach(cast.prefix(5)) { member in
                        HStack {
                            Text(member.name)
                            Spacer()
                            if let character = member.character {
                                Text(character)
                                    .foregroundColor(.secondary)
                                    .font(.caption)
                            }
                        }
                    }
                }
            }

            if let crew = contributors.crew, !crew.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Crew")
                        .font(.headline)

                    ForEach(crew.prefix(5)) { member in
                        HStack {
                            Text(member.name)
                            Spacer()
                            if let job = member.job {
                                Text(job)
                                    .foregroundColor(.secondary)
                                    .font(.caption)
                            }
                        }
                    }
                }
            }
        }
        .padding()
    }
}
```

#### 1.6 Testing
- [ ] Test with tmdbId=153 (Lost in Translation) - Has full data
- [ ] Test with movie without MoreIdeas - Verify section hidden
- [ ] Test error handling (invalid tmdbId, network failure)
- [ ] Verify poster aspect ratio (2:3)
- [ ] Confirm 390px width constraint

**Success Criteria:**
- ✅ Movie detail screen renders all 6 components correctly
- ✅ Unified API call returns complete data
- ✅ MoreIdeas hidden when null
- ✅ Build compiles without errors
- ✅ UI matches web production design

---

### Phase 2: Search & Discovery (Weeks 3-4) - 2 weeks

**Goal:** Add movie search and browsing capabilities

#### 2.1 Search Implementation
- [ ] Create search API endpoint (or use existing TMDB search)
- [ ] Build SearchView with query input
- [ ] Display search results as grid of posters
- [ ] Navigate to MovieDetailView on selection

#### 2.2 Browse Collections
- [ ] Fetch browse lists from backend
- [ ] Create BrowseView with collection cards
- [ ] Horizontal scrolling for movies within collection
- [ ] Link to MovieDetailView

#### 2.3 Navigation Structure
- [ ] TabView with Search / Browse / You tabs
- [ ] NavigationStack for detail view transitions
- [ ] Back navigation with proper state management

---

### Phase 3: User Features (Weeks 5-6) - 2 weeks

**Goal:** Implement Seen/Add functionality and user state

#### 3.1 Local Storage
- [ ] UserDefaults or SwiftData for seen movies
- [ ] Track user's movie list (to watch, favorites)
- [ ] Persist state across app launches

#### 3.2 User Interface
- [ ] Seen/Add button functionality on MovieDetailView
- [ ] "You" tab with user's lists
- [ ] Filter/sort user's collection

#### 3.3 Sync Strategy (Optional)
- [ ] Cloud sync (iCloud or backend API)
- [ ] Conflict resolution for multi-device usage

---

### Phase 4: Enhanced Features (Weeks 7-8) - 2 weeks

**Goal:** Polish and additional features

#### 4.1 Trailer Playback
- [ ] AVPlayer integration for trailer URLs
- [ ] Full-screen video player
- [ ] Play/pause controls

#### 4.2 Image Caching
- [ ] Implement poster image caching
- [ ] Optimize memory usage
- [ ] Pre-load nearby movies

#### 4.3 Offline Support
- [ ] Cache movie data locally
- [ ] Offline browsing of previously viewed movies
- [ ] Sync when connection restored

#### 4.4 Accessibility
- [ ] VoiceOver support
- [ ] Dynamic Type
- [ ] Color contrast compliance

---

## API Reference

### Unified Endpoint

**URL:** `GET https://moviegenius.ai/api/v1/movie/{tmdbId}`

**Response Schema:**
```json
{
  "movie": {
    "tmdb_id": 153,
    "title": "Lost in Translation",
    "year": 2003,
    "official_title": "Lost in Translation",
    "release_date": "2003-09-18",
    "slug": "tagline-text-30-100-chars",
    "poster_url": "https://image.tmdb.org/t/p/w500/...",
    "trailer_url": "https://www.youtube.com/watch?v=...",
    "streaming_data": { /* JustWatch data */ },
    "has_analysis": true,
    "has_linked_analysis": true,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  },
  "whyWatch": {
    "id": "uuid",
    "recommendation": "YES",
    "reasons": [
      "Murray's restrained performance carries every quiet scene",
      "Dialogue feels genuinely overheard, not written",
      "Redefined American indie romance for the 2000s"
    ],
    "context": "Coppola shot guerrilla-style in real Tokyo locations...",
    "model": "claude-sonnet-4-6",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "moreIdeas": [
    {
      "tmdbId": 152601,
      "title": "Her",
      "year": 2013,
      "connection": "Spike Jonze's film about loneliness in modern Tokyo..."
    }
    // ... 14 more entries
  ],
  "contributors": {
    "cast": [
      {
        "id": 1234,
        "name": "Bill Murray",
        "character": "Bob Harris",
        "profile_path": "/path.jpg"
      }
    ],
    "crew": [
      {
        "id": 5678,
        "name": "Sofia Coppola",
        "job": "Director",
        "department": "Directing",
        "profile_path": "/path.jpg"
      }
    ]
  },
  "analysis": {
    "id": "uuid",
    "query_text": "Analyze Lost in Translation",
    "claude_response": "Full 400-word analysis text...",
    "analysis_type": "standard",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Field Notes:**
- `whyWatch` can be null if movie hasn't been analyzed yet
- `moreIdeas` can be null for ~40% of movies - hide section when null
- `analysis` is legacy data (deprecated 400-word format) - not used on production pages
- `contributors` contains full cast/crew from TMDB
- `streaming_data` is JustWatch format (where to watch)

---

## Design Guidelines

### Colors & Typography
- Use system fonts (SF Pro)
- Follow iOS Human Interface Guidelines
- Match web aesthetics where appropriate

### Layout
- **Target width:** 390px (iPhone 14/15 standard)
- **Poster dimensions:** 267×400px (2:3 aspect ratio)
- **Spacing:** 16pt standard padding
- **Corner radius:** 8pt for cards

### Interactions
- Standard iOS navigation gestures
- Swipe back to dismiss
- Pull to refresh (for search/browse lists)
- Haptic feedback for important actions

---

## Testing Strategy

### Unit Tests
- Model decoding from JSON
- API client error handling
- ViewModel state management

### UI Tests
- Navigation flows
- Search functionality
- Movie detail rendering

### Integration Tests
- Production API calls
- Image loading
- Offline mode

### Test Data
**Recommended test movies:**
- **tmdbId=153** (Lost in Translation) - Complete data
- **tmdbId=550** (Fight Club) - Check different content
- **tmdbId=12345** (Invalid) - Test error handling
- Find movie without MoreIdeas - Test null handling

---

## Deployment

### App Store Requirements
- [ ] App icon (1024×1024)
- [ ] Launch screen
- [ ] Privacy policy (data usage disclosure)
- [ ] App Store screenshots (required sizes)
- [ ] App Store description
- [ ] Keywords for search optimization

### Beta Testing
- [ ] TestFlight setup
- [ ] Internal testing (week 6)
- [ ] External beta (week 7)
- [ ] Feedback integration

### Release Schedule
- **Week 8:** App Store submission
- **Week 9:** Review period
- **Week 10:** Public launch

---

## Success Metrics

### Technical
- API call latency < 1s (p95)
- App launch time < 2s
- Crash-free rate > 99.5%
- Memory usage < 150MB average

### User Experience
- Movie detail renders in < 500ms
- Smooth 60fps scrolling
- Search results < 2s
- 4.5+ star rating target

---

## Known Limitations & Considerations

1. **MoreIdeas Coverage:** Only 60% of movies have MoreIdeas - must handle gracefully
2. **WhyWatch Coverage:** 85% of movies have WhyWatch - show placeholder for missing
3. **Analysis Data:** Legacy field included but not displayed (future feature?)
4. **Streaming Data:** JustWatch format may need parsing for iOS display
5. **Trailer URLs:** YouTube links - need appropriate player or WebView

---

## Open Questions

- [ ] Should iOS implement its own search or use web's existing endpoint?
- [ ] CloudKit vs custom backend for user data sync?
- [ ] Should we cache entire movie responses or just metadata?
- [ ] Trailer playback: native player or WebView?
- [ ] How to handle deep links (share movie URLs)?

---

## Resources

**Backend:**
- Production: https://moviegenius.ai
- Unified API: https://moviegenius.ai/api/v1/movie/{tmdbId}
- Health Check: https://moviegenius.ai/api/health
- Catalog Status: https://moviegenius.ai/api/admin/catalog-status

**Documentation:**
- V3 Architecture: `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md`
- Week 1 Status: `/docs/WEEK1_FINAL_STATUS.md`
- API Reference: `/docs/API_REFERENCE.md` (if exists)

**Development:**
- Railway Dashboard: https://railway.com/project/a644b7ec-ad55-4f37-933e-76b76735238d
- TMDB API Docs: https://developers.themoviedb.org/3

---

## Timeline Summary

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| Phase 1: Foundation | 2 weeks | Movie detail screen with unified API |
| Phase 2: Search & Discovery | 2 weeks | Search + browse collections |
| Phase 3: User Features | 2 weeks | Seen/Add functionality + user lists |
| Phase 4: Enhanced Features | 2 weeks | Trailer playback + polish |
| **Total** | **8 weeks** | App Store submission |

---

## Next Steps

1. ✅ Backend unified API complete (Week 1)
2. ✅ API bugs fixed (MoreIdeas, WhyWatch v3)
3. ⏩ **Start Phase 1:** Create Xcode project and data models
4. → Test with production API (tmdbId=153)
5. → Build MovieDetailView with 6 components
6. → Deploy to TestFlight for internal testing

**Status:** Ready to begin iOS development!
**Next Session:** Create Xcode project + Swift models
