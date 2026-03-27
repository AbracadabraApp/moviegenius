# MovieGenius Codebase Comprehensive Overview

**Last Updated:** March 22, 2026  
**Repository:** AbracadabraApp/moviegenius  
**Framework:** Next.js 15.4.10  
**Runtime:** Node.js 20+  
**Database:** Railway PostgreSQL (21,275+ analyses, 35K+ movies)  

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [Database Integration](#database-integration)
4. [Page Components](#page-components)
5. [Analysis System](#analysis-system)
6. [WhyWatch System](#whywatch-system)
7. [API Structure](#api-structure)
8. [Key Technologies](#key-technologies)
9. [Component Complexity Analysis](#component-complexity-analysis)
10. [Browse System](#browse-system)
11. [Search & Navigation](#search--navigation)
12. [Locked Components](#locked-components)

---

## Architecture Overview

### Current State (V2 Production)

MovieGenius is a **Next.js movie discovery application** with:
- AI-powered movie analyses using Claude API
- Two-tier recommendation system (WhyWatch + Detailed Analysis)
- Browse collections (~10K lists, ~185K movie-list links)
- TMDB integration for movie metadata
- Railway PostgreSQL backend with 39K+ actors/crew

### Technology Stack

```
Frontend:     Next.js 15.4.10 (React 18, JavaScript ES modules)
Backend:      Node.js 20+ with PostgreSQL (pg library, Pool-based)
Styling:      CSS modules + inline styles
State:        React Context (FavoritesContext)
Icons:        Lucide React 0.511
Caching:      Redis (ioredis 5.4.1) + in-memory
AI Provider:  Anthropic Claude (@anthropic-ai/sdk 0.53.0)
Testing:      Jest 30.0.3 + React Testing Library
```

### Deployment

- **Platform:** Railway
- **Database Connection:** RAILWAY_DATABASE_URL environment variable
- **Static Analysis:** 21,275 complete movie analyses in database
- **Build:** Next.js ISR (Incremental Static Regeneration)

---

## File Structure

### Root Directory Organization

```
moviegenius/
├── pages/                    # Next.js page routes (70 files, ~8.6K lines)
│   ├── _app.js             # Global app wrapper (172 lines)
│   ├── _document.js        # HTML document structure (25 lines)
│   ├── index.js            # Homepage (285 lines)
│   ├── movie/[id].js       # Movie detail page (200+ lines)
│   ├── person/[id].js      # Person/cast page
│   ├── explore/[...slug].js # Browse explore (18K lines!)
│   └── api/                # 60+ API endpoints
├── components/              # React components (88 files, ~19.4K lines)
│   ├── MovieAnalysisWithEntities.js  (1,200 lines) 🔴
│   ├── MovieHeaderLarge.js           (559 lines) 🔒 LOCKED
│   ├── MediaCard.js                  (463 lines) 🔒 LOCKED
│   ├── WhyWatchContainer.js          (77 lines)
│   ├── WhyWatchSection.js            (125 lines)
│   └── [90+ other components]
├── lib/                     # Utilities & services (73 files, ~18K lines)
│   ├── railway-db.js       (793 lines) - Database service layer
│   ├── movie-analysis-linker.js (781 lines)
│   ├── auto-rollback-system.js (848 lines)
│   ├── routes.js           (760 lines)
│   ├── cache.js            (449 lines)
│   ├── performance-monitor.js (361 lines)
│   └── [60+ utility modules]
├── styles/                  # CSS files (4 files)
│   ├── globals.css
│   ├── entity-linking.css
│   ├── movieTitle.css
│   └── cinema-through-time.css
├── hooks/                   # Custom React hooks (2 files)
│   ├── usePredictiveLoading.js
│   └── useTapDetection.js
├── contexts/                # React Context (1 file)
│   └── FavoritesContext.js
├── __tests__/               # Test suite (38+ test directories, 86 test files)
├── scripts/                 # Batch processing & utilities (285 files)
├── docs/                    # Documentation (34 files)
├── data/                    # Static data & analysis output
├── public/                  # Static assets
└── package.json            # Dependencies & scripts (113 npm commands!)
```

### Key Statistics

| Metric | Value |
|--------|-------|
| Total Components | 88 files |
| Total Pages | 70 files |
| Total API Endpoints | 60+ routes |
| Total Lib Utilities | 73 files |
| Test Files | 86 suites |
| NPM Scripts | 113 (!) |
| Component Lines (avg) | 220 |
| Largest Component | 1,200 (MovieAnalysisWithEntities) |

---

## Database Integration

### Connection Architecture

**Server-Only Database Client** (`lib/railway-db.js` - 793 lines)

```javascript
// Import: ONLY in server context (API routes, scripts, SSR)
// Never in browser components - will throw error
import { getPool, MovieService } from '../../lib/railway-db.js';

// Connection pooling: max 20 clients, 30s idle timeout
const pool = getPool(); // Singleton pattern
```

### Core Database Services

#### 1. **MovieService** - Movie CRUD operations
```javascript
MovieService.getMovieByTMDBId(tmdbId)      // Single lookup
MovieService.upsertMovie(movieData)         // Insert/update with ON CONFLICT
MovieService.getMoviesByTitleYear(title)    // Search by title+year
MovieService.updateAnalysisStatus(movieId)  // Set analysis flags
```

#### 2. **MovieAnalysisService** - Analysis content storage
```javascript
// movie_analyses table (21,275 records)
// - movie_id: FK to movies
// - claude_response: JSONB with raw_content, keyElements, links
// - analysis_type: 'page_analysis' or 'enhanced_analysis'
```

#### 3. **WhyWatchService** - Recommendations (working system)
```javascript
// enhanced_why_watch table (19,954 records)
// - tmdb_id: TMDB ID for fast lookup
// - recommendation: 'YES' or 'NO'
// - reasons: JSONB array of 3 reasons with person/movie links
// - has_links: BOOLEAN (accurate, unlike analyses)
```

#### 4. **BrowseListService** - Collection management
```javascript
// browse_lists table: ~10K lists
// list_movies table: ~185K movie-list associations
// browse_facets & list_facets: Genre/theme categorization
```

#### 5. **PersonService** - Cast/crew lookup
```javascript
// persons table: 39,606 entries
// movie_contributors: movie-person relationships
```

### Schema Overview

```sql
-- Core Tables
movies                    (35K+ records)    ← Master movie data
movie_analyses           (21,275 records)  ← AI-generated analyses
enhanced_why_watch       (19,954 records)  ← YES/NO recommendations

-- Browse System Tables
browse_lists             (~10K records)    ← Collections
list_movies              (~185K records)   ← Movie-list associations
browse_facets            (Categories)      ← Genre facets
list_facets              (Associations)    ← Facet mappings

-- Supporting Tables
persons                  (39,606 records)  ← Cast/crew data
movie_contributors       (Relationships)   ← Movie-person links
episodes                 (Archived)        ← TV series (no longer active)
```

### Data Flow

```
Request → API Endpoint → MovieService → Pool.query() → Railway PostgreSQL
                           ↓
                      Results cached (Redis/memory)
                           ↓
                      Component receives data
```

---

## Page Components

### Main Pages (70 files, ~8.6K lines)

#### Production Pages

| Page | Lines | Purpose | Status |
|------|-------|---------|--------|
| `/movie/[id].js` | 200+ | Movie detail page | 🔒 LOCKED |
| `index.js` | 285 | Homepage with carousels | Production |
| `/person/[id].js` | - | Actor/director page | Production |
| `/explore/[...slug].js` | 18K | Browse explore system | Complex |
| `genius.js` | 253 | Genius mode (special UI) | Experimental |
| `/list/[slug].js` | - | Browse collection page | Production |

#### Alternative/Experimental Pages

| Page | Lines | Purpose | Status |
|------|-------|---------|--------|
| `movies-final.js` | 462 | Movie listing (final version) | Experimental |
| `movies-new.js` | 364 | Movie listing (new variant) | Experimental |
| `recs.js` | 930 | Recommendations page | Experimental |
| `landing.js` | 925 | Landing page variant | Experimental |
| `you.js` | - | Personalized You page | Prototype |
| `netflix-demo.js` | 274 | Netflix-style demo | Demo |

### Movie Detail Page Flow

**Path:** `/movie/[id].js` (200+ lines)

```
1. Route Parameter Extraction
   ↓
2. API Calls (Waterfall - 4 sequential)
   ├── /api/tmdb-movie?id={id}           (TMDB metadata)
   ├── /api/movie-streaming?id={id}      (Streaming data)
   ├── /api/movie-analysis?id={id}       (Analysis content)
   └── /api/why-watch?tmdbId={id}        (Recommendations)
   ↓
3. Component Rendering Stack
   ├── PhoneFrame (Mobile container)
   ├── MovieHeaderLarge (Poster, buttons, trailer)
   ├── MovieAnalysisWithEntities (Main analysis)
   ├── WhyWatchContainer (Recommendations)
   └── MovieCreativeFooter (Cast, crew, more info)
   ↓
4. Static Analysis Fallback
   └── Try /nuclear-static/{id}.json first (zero API calls if available)
```

---

## Analysis System

### Current Implementation (LEGACY - COMPLEX)

**Main Component:** `MovieAnalysisWithEntities.js` (1,200 lines) 🔴

#### Architecture Problem

This component handles **3 competing data formats**:

1. **Legacy Text Format**
   ```javascript
   // Old: 500+ word raw text with no structure
   "The Godfather is a masterpiece..."
   ```

2. **JSONB Format (database)**
   ```javascript
   {
     "content": "200-word analysis...",
     "processed_content": "With movie links...",
     "featuredMovies": [{...}],
     "exploreTopics": [{...}],
     "moreIdeas": [{...}]
   }
   ```

3. **Static File Format**
   ```javascript
   // /nuclear-static/{id}.json
   {
     "props": {
       "sections": [{content, ...}],
       "exploreFurther": [{...}]
     }
   }
   ```

#### Analysis Data Flow

```
Database → MovieAnalysisWithEntities → Format Detection
                                           ↓
                        Try parse as JSON → If fails, treat as text
                                           ↓
                        EntityLinkedText component (renders with <a> links)
                                           ↓
                        Extract "Why Watch" data (if present)
                                           ↓
                        Extract Featured Movies (if present)
```

#### Current Problems

- ✅ **17,523 analyses claim movie links but don't have them** (false `has_links`)
- ✅ **3 different storage formats** cause parsing complexity
- ✅ **No person links in analysis** (only in WhyWatch)
- ✅ **500+ word verbose content** (target: 200 words)
- ✅ **Post-processing links fail silently**

#### Key Components

1. **EntityLinkedText.js** - Renders text with `<a href="/movie/...">` links
2. **MovieAnalysisWithEntities.js** - Orchestrates format detection + linking
3. **ExplorePromptCard.js** - "Explore Further" section with related movies
4. **StreamingAvailabilityLink.js** - Links to JustWatch/streaming services

---

## WhyWatch System

### Current Implementation (WORKING ✅)

**Components:**
- `WhyWatchContainer.js` (77 lines) - Data fetching wrapper
- `WhyWatchSection.js` (125 lines) - Display component

#### Architecture (Clean Design)

```
Request → /api/why-watch?tmdbId={id}
             ↓
          Database lookup: enhanced_why_watch
             ↓
          Return: {
            recommendation: "YES" | "NO",
            reasons: [
              "Outstanding cinematography",
              "Extraordinary performances",
              "Groundbreaking narrative structure"
            ],
            hasData: boolean
          }
             ↓
          WhyWatchSection renders with gold (YES) or red (NO) styling
```

#### Data Structure

```sql
enhanced_why_watch (19,954 records)
├── tmdb_id
├── recommendation VARCHAR(3) -- 'YES' or 'NO'
├── reasons JSONB[]           -- Array of 3 reason objects
├── has_links BOOLEAN         -- TRUE only if links verified
├── link_count INTEGER        -- Accurate count
├── created_at, updated_at
```

#### Features

- ✅ **Binary recommendation** (YES/NO, no maybe)
- ✅ **Exactly 3 reasons** per movie
- ✅ **Person linking works** (8,969/19,954 have links = 45%)
- ✅ **Clean architecture** (independent from analysis)
- ✅ **Silent fail** if no data (returns null, no error)

#### API Endpoint

**Route:** `/api/why-watch?tmdbId={id}`

```javascript
// Returns: {
//   hasData: boolean,
//   whyWatch: {
//     recommendation: 'YES' | 'NO',
//     reasons: string[],
//     linking?: { /* person/movie links */ }
//   }
// }
```

---

## API Structure

### 60+ API Endpoints Organized by Function

#### Movie Data Endpoints

| Endpoint | Lines | Purpose | Status |
|----------|-------|---------|--------|
| `/api/movie-analysis` | 439 | Fetch movie analysis from DB | Production |
| `/api/tmdb-movie` | - | Fetch movie from TMDB | Production |
| `/api/movie-streaming` | - | Streaming data (JustWatch) | Production |
| `/api/movie-details` | - | Enhanced movie metadata | Production |
| `/api/movie-credits` | - | Cast/crew information | Production |
| `/api/movie-contributors` | - | Person relationships | Production |

#### Analysis & Content Generation

| Endpoint | Lines | Purpose | Status |
|----------|-------|---------|--------|
| `/api/ask-claude` | **1,020** | Main Claude analysis endpoint | Production |
| `/api/movie-analysis-direct` | 268 | Direct analysis lookup | Legacy |
| `/api/movie-analysis-stream` | - | Streaming response | Experimental |
| `/api/background-analysis-warming` | 360 | Preload analyses in background | Utility |

#### Search & Browse

| Endpoint | Lines | Purpose | Status |
|----------|-------|---------|--------|
| `/api/simple-search` | - | Movie/person search (word wheel) | Production |
| `/api/multi-search` | - | Multi-type search | Production |
| `/api/tmdb-genre-search` | - | Genre-based search | Production |
| `/api/movie-browse-lists` | - | Collections for movie | Production |
| `/api/browse-list-movies` | - | Movies in collection | Production |

#### Recommendations & Why Watch

| Endpoint | Lines | Purpose | Status |
|----------|-------|---------|--------|
| `/api/why-watch` | - | YES/NO recommendation | Production |
| `/api/more-ideas` | - | Related movie suggestions | Production |
| `/api/genius-list` | 250 | Curated lists | Experimental |
| `/api/genius-topics` | - | Topic-based lists | Experimental |

#### Utility & Monitoring

| Endpoint | Lines | Purpose | Status |
|----------|-------|---------|--------|
| `/api/health` | 251 | System health check | Production |
| `/api/nuclear-status` | 218 | Analysis generation status | Utility |
| `/api/performance-metrics` | - | Performance tracking | Utility |
| `/api/cache-warming-optimized` | 506 | Preload popular movies | Utility |

#### Batch & Admin

| Endpoint | Lines | Purpose | Status |
|----------|-------|---------|--------|
| `/api/batch-populate-all-lists` | 506 | Bulk list generation | Admin |
| `/api/nuclear-autonomous` | - | Autonomous processing | Admin |
| `/api/optimize-database` | 285 | DB optimization | Admin |

### Largest Endpoints (Architecture Debt)

```
ask-claude.js             1,020 lines ⚠️ (Handles deduplication, caching, saving)
railway-db.js              698 lines ⚠️ (Database abstraction layer)
series-episode.js          564 lines ⚠️ (TV episodes, feature cancelled)
batch-populate-*.js        506 lines ⚠️ (Batch processing)
tmdb-bulk.js               492 lines ⚠️ (TMDB bulk operations)
```

---

## Key Technologies

### Frontend Framework

**Next.js 15.4.10** with React 18

```javascript
// Page routing
pages/
├── [id].js           // Dynamic routes with getStaticProps
├── [...slug].js      // Catch-all routes
├── api/              // API endpoints (serverless functions)

// Features used:
// - ISR (Incremental Static Regeneration) for movie pages
// - getStaticProps/getStaticPaths for static generation
// - API routes with req/res
// - Dynamic imports for code splitting
```

### Styling Approach

**CSS Modules + Inline Styles** (No Tailwind)

```css
/* Component-level CSS */
.containerStyle { }
.buttonStyle { }

/* Global CSS */
styles/globals.css           (Base styles)
styles/entity-linking.css    (Movie/person links)
styles/movieTitle.css        (Title-specific styles)
```

**Inline Styles Pattern:**
```javascript
const containerStyle = {
  display: 'flex',
  gap: '16px',
  marginTop: '20px'
};

return <div style={containerStyle}>{content}</div>;
```

### State Management

**React Context (Minimal)**

- `FavoritesContext.js` - User's favorite movies (local persistence)
- URL parameters - Primary state management
- Component-level useState - For UI state

```javascript
import { FavoritesContext } from '../contexts/FavoritesContext';

const { favorites } = useContext(FavoritesContext);
```

### Caching Strategy (Multi-Layer)

1. **In-Memory Cache** (Application lifetime)
   ```javascript
   const movieCache = new Map(); // O(1) lookups
   ```

2. **Redis Cache** (Persistent across requests)
   ```javascript
   const cache = getCache();
   await cache.set(`movie:${id}`, data, 3600); // 1 hour TTL
   ```

3. **Browser Cache** (Fetch API HTTP caching)
   ```javascript
   // Static files: long TTL
   // API responses: short TTL or conditional
   ```

4. **Static Generation** (Build-time)
   ```javascript
   export async function getStaticProps() {
     return { props, revalidate: 86400 }; // ISR
   }
   ```

### Testing

**Jest 30.0.3 + React Testing Library**

```
__tests__/ (86 test files)
├── __tests__/api/                 (API endpoint tests)
├── __tests__/components/          (Component tests)
├── __tests__/integration/         (End-to-end flows)
├── __tests__/critical-paths/      (Production paths)
└── __tests__/performance/         (Performance benchmarks)
```

**Run Tests:**
```bash
npm test                            # All tests
npm run test:critical-paths         # Production flows only
npm run test:integration            # E2E tests
npm run test:performance            # Performance benchmarks
```

---

## Component Complexity Analysis

### Top 10 Largest Components

| Component | Lines | Complexity | Status |
|-----------|-------|-----------|--------|
| MovieAnalysisWithEntities.js | 1,200 | ❌ HIGH | Handles 3 formats |
| GeniusEpisodeTemplate.js | 877 | ❌ MEDIUM | TV episodes (cancelled) |
| YouPagePrototype.js | 714 | ❌ MEDIUM | Personalization proto |
| EssentialMoviesCarousel.js | 619 | ⚠️ MEDIUM | Movie carousel |
| ImageSourceBrowser.js | 589 | ⚠️ MEDIUM | Image selection |
| StreamingCarousel.js | 567 | ⚠️ MEDIUM | Streaming options |
| MovieHeaderLarge.js | 559 | ❌ MEDIUM | 🔒 LOCKED |
| EssentialMovies.js | 545 | ⚠️ MEDIUM | Essential list |
| MovieHeaderCompact.js | 534 | ⚠️ MEDIUM | Compact header |
| StreamingAnalysisDisplay.js | 484 | ⚠️ MEDIUM | Streaming info |

### Component Breakdown by Category

#### Lean Components (< 200 lines) ✅

```javascript
WhyWatchContainer.js          (77 lines)   ✅ Perfect size
WhyWatchSection.js            (125 lines)  ✅ Good design
ErrorBoundary.js              (~100 lines) ✅ Simple wrapper
MediaCardErrorFallback.js      (~80 lines) ✅ Error handling
```

#### Medium Components (200-400 lines) ⚠️

```javascript
MediaCard.js                   (463 lines)  🔒 LOCKED
PersonCard.js                  (392 lines)
FavoritesManager.js            (375 lines)
AskInputBar.js                 (369 lines)
SearchFilters.js               (363 lines)
```

#### Large Components (400-700 lines) ⚠️

```javascript
MovieHeaderLarge.js            (559 lines)  🔒 LOCKED
StreamingCarousel.js           (567 lines)
EssentialMovies.js             (545 lines)
MovieHeaderCompact.js          (534 lines)
```

#### Massive Components (700+ lines) ❌

```javascript
YouPagePrototype.js            (714 lines)  Needs refactoring
GeniusEpisodeTemplate.js        (877 lines) Needs refactoring
MovieAnalysisWithEntities.js    (1,200 lines) ❌ URGENT
```

### Movie Page Component Stack (Total ~1,900 lines)

**Single movie page loads:**

```
movie/[id].js (200 lines)
├── PhoneFrame (Mobile container)
├── MovieHeaderLarge (559 lines) 🔒
│   ├── Trailer integration
│   ├── Add/Seen buttons
│   ├── Streaming availability
│   └── Poster + title display
├── MovieAnalysisWithEntities (1,200 lines) ❌
│   ├── Format detection (JSON vs text)
│   ├── EntityLinkedText rendering
│   ├── Featured movies extraction
│   └── Explore prompts
├── WhyWatchContainer (77 lines) ✅
│   └── WhyWatchSection (125 lines) ✅
├── MovieCreativeFooter
│   ├── Cast information
│   ├── Crew credits
│   └── Production details
└── SimpleSearch (323 lines)
    └── Word wheel search

Total: ~2,400 lines across 5-7 files per page load
```

### Refactoring Opportunities

| Issue | Current | Target | Effort |
|-------|---------|--------|--------|
| MovieAnalysisWithEntities | 1,200 | 100-150 | High |
| MovieHeaderLarge | 559 | 50-100 | Medium |
| YouPagePrototype | 714 | 200-300 | Medium |
| GeniusEpisodeTemplate | 877 | 300-400 | Medium |

---

## Browse System

### Architecture (Clean ✅)

**Files:** `lib/browse-lists/` (2 files, 889 lines)

```
lib/browse-lists/
├── pipeline-orchestrator.js (416 lines) - Main processor
└── claude-processor.js       (473 lines) - Claude integration
```

### Database Structure

```sql
browse_lists (10,248 records)
├── id
├── title: "Best Neo-Noir Films"
├── description: TEXT
├── genre_focus: VARCHAR
├── source: 'claude' | 'gemini' | 'manual'
├── validation_status: 'pending' | 'approved' | 'rejected'
└── created_at

list_movies (185,254 records)
├── list_id → browse_lists
├── movie_id → movies
├── position: INTEGER (display order)
└── relevance_score: FLOAT (quality metric)
```

### Query Pattern

```javascript
// Get movies in a collection
const query = `
  SELECT m.* FROM movies m
  JOIN list_movies lm ON m.id = lm.movie_id
  WHERE lm.list_id = $1
  ORDER BY lm.position ASC
  LIMIT $2 OFFSET $3
`;
```

### Feature Status

- ✅ **Collections working** (827 sparse, 8,237 average, 210 comprehensive)
- ✅ **Fast queries** (single JOIN, indexed)
- ✅ **Clean code** (414 lines vs 1,900 for movie page)
- ⚠️ **Coverage sparse** (avg 18 movies/list vs Claude's 50+ examples)

---

## Search & Navigation

### SimpleSearch Component (323 lines)

**Type:** Google-style word wheel (predictive dropdown)

```
User Input → Debounce (300ms) → /api/simple-search → Dropdown
                                      ↓
                                TMDB lookup
                                      ↓
                                Return 20 results
```

#### Features

- **Debounced search** - 300ms delay to reduce API calls
- **Minimum 3 characters** - Prevents spam queries
- **Arrow key navigation** - Select from dropdown
- **Click outside close** - Auto-dismiss dropdown
- **Request deduplication** - Cancel stale requests

#### API Endpoint: `/api/simple-search`

```javascript
// POST /api/simple-search
// Body: { query: "Inception" }

// Response:
{
  "movies": [
    { id: 27205, title: "Inception", year: 2010, ... },
    { id: ..., title: "...", year: ..., ... }
  ]
}
```

### Explore System (18K lines!)

**Path:** `/explore/[...slug].js` - Browse collections

```
/explore/genre/action
/explore/theme/heist-films
/explore/director/christopher-nolan
/explore/era/1970s-cinema
```

**Status:** Complex, 18K lines - needs refactoring

### Navigation Architecture

```javascript
// Main navigation in _app.js
SimpleSearch (header)
  ↓
Routes:
├── / (Homepage)
├── /movie/[id] (Detail page)
├── /person/[id] (Cast page)
├── /explore/[...slug] (Browse)
├── /list/[slug] (Collection detail)
└── /search (Full search page)
```

---

## Locked Components

### Protection Status (Last Updated 2025-07-02)

**These components are LOCKED against modification:**

#### Core Movie Page Stack

| Component | Lock Date | Lines | Reason |
|-----------|-----------|-------|--------|
| `/pages/movie/[id].js` | 2025-07-02 | 200+ | Core routing, ISR config |
| `/components/MovieHeaderLarge.js` | 2025-07-02 | 559 | Trailer logic, buttons |
| `/components/MediaCard.js` | 2025-07-02 | 463 | Card structure, favorites |
| `/lib/services/analysis-service.js` | 2025-07-02 | - | TMDB integration, caching |

#### API Endpoints

| Endpoint | Lock Date | Purpose |
|----------|-----------|---------|
| `/api/generate-organic-slug.js` | 2025-07-02 | Prevents TMDB summary contamination |
| `/api/enhance-movie-data.js` | 2025-07-02 | DEPRECATED - locked against use |
| `/api/tmdb-trailer.js` | 2025-07-02 | YouTube trailer fetching |

#### Configuration

| File | Lock Date | Reason |
|------|-----------|--------|
| `next.config.js` | 2025-07-02 | Performance optimizations |

### Unlock Procedure (Emergency Only)

```bash
# 1. Create backup
cp components/MovieHeaderLarge.js \
   components/MovieHeaderLarge.js.BACKUP-$(date +%Y%m%d)

# 2. Document reason in LOCKED_COMPONENTS.md

# 3. Make minimal changes only

# 4. Test full movie page workflow

# 5. Update lock date in documentation
```

### Recovery Command

```bash
# Restore from git history
git checkout HEAD~1 -- pages/movie/[id].js
git checkout HEAD~1 -- components/MovieHeaderLarge.js
```

---

## Key Insights & Recommendations

### Current Strengths ✅

1. **WhyWatch System Works** (77 lines, clean architecture)
2. **Browse Lists Scale** (10K collections, ~185K associations)
3. **Database Well-Structured** (Railway PostgreSQL, indexed)
4. **API Endpoints Organized** (60+ routes, clear patterns)
5. **Mobile-First Design** (PhoneFrame container)
6. **Caching Layers** (Redis + in-memory + static)

### Critical Issues ❌

1. **MovieAnalysisWithEntities** (1,200 lines, handles 3 formats)
2. **Broken Movie Linking** (17,523 false `has_links` flags)
3. **Waterfall API Loading** (4 sequential requests for movie page)
4. **Component Stack Complexity** (~2,400 lines per page load)
5. **Post-Processing Failures** (Link extraction silent failures)

### Architecture Debt

| Issue | Impact | Fix Effort | Priority |
|-------|--------|-----------|----------|
| Analysis format unification | High complexity | Medium | HIGH |
| Component size reduction | Code maintainability | High | MEDIUM |
| API request waterfall | Performance | Low | MEDIUM |
| Broken link validation | UX quality | Low | LOW |

### V3 Architecture Vision

**Target:** 400-500 total lines for movie page (vs ~2,400 today)

```
Proposed refactoring:
├── Unified analysis format (JSON only)
├── Client-side movie linking (no post-processing)
├── Component decomposition (max 150 lines each)
├── Parallel API loading (Promise.all, not waterfall)
└── Separate concerns (analysis ≠ whywatch ≠ header)
```

---

## Summary Statistics

### Codebase Metrics

```
Components:          88 files, ~19.4K lines
Pages:              70 files, ~8.6K lines
API Endpoints:      60+ routes, ~18.5K lines
Lib Utilities:      73 files, ~18K lines
Tests:              86 test suites
Database Tables:    15+ (core + browse + supporting)
NPM Scripts:        113 commands

Largest Components:
  1. MovieAnalysisWithEntities.js  (1,200 lines)
  2. GeniusEpisodeTemplate.js       (877 lines)
  3. YouPagePrototype.js            (714 lines)

Most Complex Systems:
  1. Movie Page Stack (~2,400 lines)
  2. Explore System (18K lines)
  3. Ask Claude Endpoint (1,020 lines)
```

### Team Guidance

**For code changes:**
1. Always check `/docs/architecture/LOCKED_COMPONENTS.md` before modifying
2. Read `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md` for long-term strategy
3. Follow Plan Mode for 3+ step tasks
4. Run `npm run test:critical-paths` before committing

**For database changes:**
1. Test migrations on staging first
2. Document rollback procedure
3. Check Railway logs after deployment
4. Verify data integrity with sample queries

**For new features:**
1. Keep components under 200 lines
2. Use WhyWatch pattern for independent data
3. Parallel API loading (Promise.all)
4. Silent fail on missing data (no error states)

