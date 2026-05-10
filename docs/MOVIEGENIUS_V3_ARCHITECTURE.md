# MovieGenius V3 Architecture Plan
**Comprehensive Redesign Strategy**

Last Updated: 2025-01-XX
Status: Planning Phase

---

## Executive Summary

MovieGenius currently has **broken movie linking** (17K+ analyses claim links but don't), **complex analysis generation** (500-token messy format), and **no iOS strategy**. This document outlines three approaches:

1. **MVF (Minimum Viable Fix)** - Fix movie analysis only ($158, 2 weeks)
2. **V3 Complete Redesign** - Clean architecture for web + iOS ($182.50, 4 weeks)
3. **Browse Enhancement** - Expand sparse collections ($12-141, ongoing)

**Recommendation:** Start with **MVF** to fix immediate problems, then evaluate **V3** based on iOS timeline.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [MVF: Minimum Viable Fix](#mvf-minimum-viable-fix)
3. [V3: Complete Redesign](#v3-complete-redesign)
4. [iOS Native App Strategy](#ios-native-app-strategy)
5. [Browse System Enhancement](#browse-system-enhancement)
6. [Database Migration Strategy](#database-migration-strategy)
7. [Implementation Timeline](#implementation-timeline)
8. [Cost Analysis](#cost-analysis)

---

## Current State Analysis

### Movie Analysis System (DEPRECATED)

**Status:** Legacy 500-word analysis format deprecated. Current movie pages use WhyWatch content instead.

**Database:**
```sql
movie_analyses (21,275 records)
├── claude_response JSONB (messy structure)
│   ├── raw_content (500+ words, no links)
│   ├── processed_content (claims links, mostly broken)
│   ├── has_links (boolean - lies 17K+ times)
│   └── link_count (integer - wrong count)
└── 3 competing data formats (legacy, JSONB, static JSON)
```

**Problems:**
- ✅ **17,523 analyses claim links but don't have them**
- ✅ **Movie linking post-processing fails silently**
- ✅ **No person links in analysis** (only in WhyWatch)
- ✅ **3 different data formats** across codebase
- ✅ **Complex component architecture** (1,900+ lines)
- ✅ **Waterfall API loading** (4 sequential requests)

---

### WhyWatch System (WORKING)

**Database:**
```sql
enhanced_why_watch (19,954 records)
├── raw_reasons TEXT[] (original)
├── reasons JSONB (with <a href="/person/"> links)
├── has_links BOOLEAN (accurate)
└── link_count INTEGER (accurate)
```

**Status:**
- ✅ **8,969 records have person links** (45% coverage)
- ✅ **Batch linking script works** (batch-whywatch-links.js)
- ✅ **No movie links** (only person links)
- ✅ **Separate from analysis** (good architecture)

**Verdict:** WhyWatch works. Leave it alone in MVF.

---

### Browse System (CLEAN BUT SPARSE)

**Database:**
```sql
browse_lists (10,248 active lists)
├── Average: 18 movies per list
├── 827 lists with ≤10 movies (too sparse)
├── 8,237 lists with 11-20 movies (average)
└── 210 lists with 100+ movies (comprehensive)

list_movies (185,254 movie-list links)
└── Many-to-many with relevance_score
```

**Architecture:**
- ✅ **Clean code** (414 lines vs 1,900 for movie page)
- ✅ **Fast queries** (single JOIN)
- ✅ **Good UX** (search, scroll restoration)
- ⚠️ **Coverage issue** (lists too narrow vs Claude's 52-film examples)

**Verdict:** Browse is in good shape. Enhancement is optional.

---

### Code Complexity Comparison

| Component | Current Lines | Issues | Ideal Lines |
|-----------|--------------|--------|-------------|
| Movie Page | 512 | 6 state vars, waterfall loading | 30 |
| MovieHeaderLarge | 559 | Unknown why so large | 50 |
| MovieAnalysisWithEntities | 500+ | Handles 3 formats | 50 |
| WhyWatchContainer | 77 | ✅ Works fine | 77 |
| Browse Page | 414 | ✅ Clean | 414 |
| **Total Movie Page Stack** | **~1,900** | Fragile, complex | **~400** |

---

## MVF: Minimum Viable Fix

**Scope:** Fix movie analysis linking. Leave everything else unchanged.

### What Gets Fixed

1. ✅ **New analysis prompt** - Inline `**Movie Title (Year)**` refs
2. ✅ **Clean JSONB structure** - No more 3 formats
3. ✅ **Client-side linking** - No post-processing needed
4. ✅ **Movie cache** - In-memory Map for O(1) lookups
5. ✅ **Person cache** - Optional, for consistency with WhyWatch
6. ✅ **Generate 35K analyses** - Fresh, clean data

### What Stays Unchanged

- ❌ WhyWatch (already works)
- ❌ Page components (keep 1,900 lines)
- ❌ Railway adapter (61 files still use it)
- ❌ API structure (waterfall loading)
- ❌ Browse system

### Database Changes

```sql
-- Add new column to existing table (non-destructive)
ALTER TABLE movie_analyses
  ADD COLUMN analysis_data_v3 JSONB;

-- New clean structure
{
  "analysis": "200 words with inline **Movie (Year)** and **Person Name** refs",
  "featuredFilms": [
    {"title": "Inception", "year": 2010, "connection": "Mind-bending narrative"}
  ],
  "mood": ["psychological", "thriller", "cerebral"],
  "metadata": {
    "generated_at": "2025-01-15T10:00:00Z",
    "model": "claude-3-5-sonnet-20241022",
    "input_tokens": 150,
    "output_tokens": 250,
    "cost": 0.0045
  }
}
```

### New Code (MVF)

```
lib/
├── cache/
│   ├── movie-lookup.js          # NEW: In-memory Map (35K movies)
│   └── person-lookup.js         # NEW: In-memory Map (39K people)
│
├── text/
│   ├── movie-linker.js          # NEW: linkifyMovies()
│   └── person-linker.js         # NEW: linkifyPeople()
│
├── analysis/
│   ├── prompt-builder-v3.js     # NEW: Inline linking prompt
│   ├── generator-v3.js          # NEW: Call Claude API
│   └── validator-v3.js          # NEW: Validate JSON structure
│
└── db.js                        # Rename railway-db.js (optional)

scripts/
└── generate-v3-analyses.js      # NEW: Batch generation

pages/api/
└── movie-analysis.js            # MODIFY: Add USE_V3_DATA flag
```

**Total new code:** ~500 lines (vs 1,900+ existing)

### Prompt Template (MVF)

```javascript
const ANALYSIS_PROMPT_V3 = `
You are a film critic writing concise analyses for curious film lovers.

Movie: ${title} (${year})

GUIDELINES:
- 180-220 words, 3 paragraphs
- Reference 2-4 related films using **Movie Title (Year)**
- When discussing performances/direction, use **Person Name**
- When discussing characters/plot, use plain text (no markup)

IMPORTANT DISTINCTIONS:
✅ Good: "**Brad Pitt** delivers a powerhouse performance"
✅ Good: "**David Fincher**'s direction creates tension"
❌ Bad: "**Brad Pitt**'s Tyler Durden" (that's a character, not the actor)
❌ Bad: "**Tyler Durden** represents" (that's a character)

OUTPUT (strict JSON):
{
  "analysis": "3 paragraphs with inline **Person Name** and **Movie (Year)** refs",
  "featuredFilms": [
    {"title": "Movie", "year": 2020, "connection": "Why it relates"}
  ],
  "mood": ["genre", "tone", "theme"]
}
`;
```

### Client-Side Linking

```javascript
// lib/text/movie-linker.js
export function linkifyMovies(text, currentMovieTitle = null) {
  return text.replace(
    /\*\*([^*]+)\*\*\s*\((\d{4})\)/g,
    (match, title, year) => {
      // Skip self-references
      if (currentMovieTitle && title.toLowerCase() === currentMovieTitle.toLowerCase()) {
        return `${title} (${year})`;
      }

      const tmdbId = lookupMovie(title, parseInt(year));

      return tmdbId
        ? `<a href="/movie/${tmdbId}" class="movie-title">${title}</a> (${year})`
        : `${title} (${year})`;
    }
  );
}

// lib/text/person-linker.js
export function linkifyPeople(text) {
  return text.replace(
    /\*\*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\*\*/g,
    (match, name) => {
      const personId = lookupPerson(name);

      return personId
        ? `<a href="/person/${personId}" class="person-name">${name}</a>`
        : name;
    }
  );
}
```

**Safety:** If name not in cache, renders as plain text (no broken links).

### Deployment Strategy (MVF)

```bash
# Phase 1: Add column (5 min)
psql $DATABASE_URL -c "ALTER TABLE movie_analyses ADD COLUMN analysis_data_v3 JSONB"

# Phase 2: Generate data (24-48 hours background)
node scripts/generate-v3-analyses.js

# Phase 3: Deploy with flag OFF (test data exists)
vercel env add USE_V3_DATA false
vercel --prod

# Phase 4: Flip switch when ready
vercel env add USE_V3_DATA true
vercel --prod

# Rollback: Instant
vercel env add USE_V3_DATA false
vercel --prod
```

### MVF Timeline

- **Day 1-2:** Build generator + cache (8 hours)
- **Day 3:** Test on 20 movies (2 hours)
- **Day 4-6:** Generate 35K analyses (background, 24-48 hours)
- **Day 7:** Deploy with feature flag (2 hours)
- **Week 2:** Monitor, validate, fix issues

**Total:** 2 weeks, $158

---

## V3: Complete Redesign

**Scope:** Clean slate architecture for web + iOS. Do everything right from scratch.

### When to Do V3

**Do V3 if:**
- ✅ iOS app starting in 1-2 months
- ✅ Willing to invest 4-6 weeks
- ✅ Want clean foundation for future
- ✅ Comfortable with bigger changes

**Do MVF if:**
- ✅ iOS app 3+ months away
- ✅ Need fixes ASAP (2 weeks)
- ✅ Prefer incremental changes
- ✅ Want to validate new approach first

### V3 Scope

**Everything from MVF, plus:**

1. ✅ **Remove railway-adapter.js** (migrate 61 files to direct SQL)
2. ✅ **Simplify page components** (1,900 → 400 lines)
3. ✅ **Parallel data loading** (1 API call vs 4 sequential)
4. ✅ **WhyWatch-first page hierarchy** (YES/NO + reasons as hero)
5. ✅ **iOS-optimized API** (`/api/v1/*` endpoints)
6. ✅ **Unified data endpoint** (`/api/v1/movie-page?tmdbId=X`)
7. ✅ **Loading states** (skeleton loaders)
8. ✅ **Clean database schema** (new tables vs columns)

### V3 Database Schema

```sql
-- Option A: New tables (clean break)
CREATE TABLE movie_analyses_v3 (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER REFERENCES movies(id) UNIQUE,
  analysis_data JSONB NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT valid_analysis CHECK (
    analysis_data ? 'analysis' AND
    analysis_data ? 'featuredFilms' AND
    analysis_data ? 'mood'
  )
);

-- Keep WhyWatch as-is
-- enhanced_why_watch table already perfect

-- Archive old (after validation)
ALTER TABLE movie_analyses RENAME TO movie_analyses_legacy;
ALTER TABLE movie_analyses_v3 RENAME TO movie_analyses;
```

### V3 Architecture

```
lib/
├── db.js                           # Renamed from railway-db
├── analysis/
│   ├── prompt-builder.js           # Pure function
│   ├── claude-client.js            # External API
│   ├── validator.js                # Pure function
│   ├── repository.js               # DB operations
│   └── generator.js                # Orchestrator
├── whywatch/
│   ├── prompt-builder.js           # Different prompt
│   ├── generator.js                # YES/NO + reasons
│   └── repository.js               # DB operations
├── cache/
│   ├── movie-lookup.js             # In-memory Map
│   └── person-lookup.js            # In-memory Map
└── text/
    ├── movie-linker.js             # Client-side linking
    └── person-linker.js            # Client-side linking

pages/
├── api/
│   └── v1/                         # iOS-optimized
│       ├── movie-analysis.js       # Single analysis
│       ├── why-watch.js            # Recommendation
│       ├── movie-page.js           # ALL data in 1 request
│       └── search.js               # Movie search
│
└── movie/[id].js                   # CLEAN: 30 lines

components/
├── MovieHeader.jsx                 # 50 lines (was 559)
├── WhyWatchHero.jsx                # 80 lines (prominent)
├── MovieAnalysis.jsx               # 50 lines (was 500)
└── FeaturedFilms.jsx               # 40 lines
```

**Total code:** ~1,000 lines (was 10,000+)

### V3 Page Structure

```javascript
// pages/movie/[id].js - CLEAN VERSION
export default function MoviePage() {
  const { id } = useRouter().query;
  const { data, loading } = useSWR(`/api/v1/movie-page?tmdbId=${id}`);

  if (loading) return <Skeleton />;

  return (
    <PhoneFrame>
      <MovieHeader movie={data.movie} />
      <WhyWatchHero
        whyWatch={data.whyWatch}
        streaming={data.streaming}
      />
      <MovieAnalysis analysis={data.analysis} />
    </PhoneFrame>
  );
}

// ~30 lines total (was 512)
```

### V3 API Endpoint (Unified)

```javascript
// pages/api/v1/movie-page.js
export default async function handler(req, res) {
  const { tmdbId } = req.query;
  const pool = getPool();

  // Parallel queries
  const [movie, streaming, analysis, whyWatch] = await Promise.all([
    getMovie(tmdbId, pool),
    getStreaming(tmdbId, pool),
    getAnalysis(tmdbId, pool),
    getWhyWatch(tmdbId, pool)
  ]);

  // Cache headers for iOS
  res.setHeader('Cache-Control', 'public, max-age=86400');

  res.json({
    movie,
    streaming,
    analysis,
    whyWatch
  });
}

// 1 request instead of 4
// 200ms load time instead of 800ms
```

### V3 Timeline

- **Week 1:** Build clean backend (analysis + whywatch)
- **Week 2:** Generate all data (35K analyses)
- **Week 3:** Build iOS API + clean components
- **Week 4:** Test, deploy, validate

**Total:** 4 weeks, $182.50

---

## iOS Native App Strategy

### Architecture Decision: Keep Same Backend ✅

```
iOS App (Swift/SwiftUI)
    ↓ URLSession HTTP
Next.js API Routes (/api/v1/*)
    ↓ pg.Pool
Railway PostgreSQL
```

**NO changes to database or infrastructure needed.**

### iOS API Design Principles

1. **Clean JSON** - No wrapper objects, no `success: true`
2. **Standard HTTP codes** - 200, 404, 500
3. **Cache headers** - `Cache-Control: public, max-age=86400`
4. **Consistent errors** - `{ "error": "...", "code": "ERROR_CODE" }`
5. **Versioned** - `/api/v1/*` can evolve independently

### iOS Data Models

```swift
// iOS: MovieAnalysis.swift
struct MovieAnalysis: Codable {
    let analysis: String
    let featuredFilms: [FeaturedFilm]
    let mood: [String]
    let metadata: Metadata?

    struct FeaturedFilm: Codable {
        let title: String
        let year: Int
        let connection: String
    }

    struct Metadata: Codable {
        let generatedAt: String
        let model: String
        let cost: Double

        enum CodingKeys: String, CodingKey {
            case generatedAt = "generated_at"
            case model
            case cost
        }
    }
}

// iOS: WhyWatch.swift
struct WhyWatch: Codable {
    let recommendation: String // "YES" or "NO"
    let reasons: [String]      // 3 bullets
}

// iOS: MoviePageData.swift (unified endpoint)
struct MoviePageData: Codable {
    let movie: Movie
    let whyWatch: WhyWatch
    let analysis: Analysis
    let streaming: StreamingData?
}
```

### iOS Repository Pattern

```swift
// iOS: MovieAPI.swift
class MovieAPI {
    let baseURL = "https://moviegenius.ai/api/v1"

    func getMoviePage(tmdbId: Int) async throws -> MoviePageData {
        let url = URL(string: "\(baseURL)/movie-page?tmdbId=\(tmdbId)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(MoviePageData.self, from: data)
    }

    func getAnalysis(tmdbId: Int) async throws -> MovieAnalysis {
        let url = URL(string: "\(baseURL)/movie-analysis?tmdbId=\(tmdbId)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(MovieAnalysis.self, from: data)
    }
}
```

### iOS SwiftUI View

```swift
// iOS: MovieDetailView.swift
struct MovieDetailView: View {
    @State private var data: MoviePageData?
    let tmdbId: Int

    var body: some View {
        ScrollView {
            if let data = data {
                MovieHeaderView(movie: data.movie)
                WhyWatchView(whyWatch: data.whyWatch)
                AnalysisView(analysis: data.analysis)
            } else {
                ProgressView("Loading...")
            }
        }
        .task {
            data = try? await MovieAPI().getMoviePage(tmdbId: tmdbId)
        }
    }
}
```

**iOS app benefits from V3 clean architecture immediately.**

### iOS Caching Strategy

```javascript
// API sets cache headers
res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours

// iOS URLSession automatically respects this
// No code needed - free caching
```

### iOS Offline (Future)

```swift
// Download static files for offline viewing
let bundle = Bundle.main.url(forResource: "movie_550", withExtension: "json")
let analysis = try? JSONDecoder().decode(MovieAnalysis.self, from: Data(contentsOf: bundle))
```

---

## Browse System Enhancement

### Current State

- **10,248 active lists**
- **Average: 18 movies per list**
- **827 lists with ≤10 movies** (too sparse)
- **8,237 lists with 11-20 movies** (average)

### Problem: Coverage Gap

**MovieGenius "Teen Identity Thrillers":** 14 movies
**Claude Artifact equivalent:** 52 films across 7 categories

**Why?** MovieGenius fragmented the concept:
- Teen Identity Thrillers (14)
- Modern Teen Identity (93)
- Identity Shifting Dramas (836)
- Hidden Identity Thrillers (546)
- +11 more lists

**Combined:** ~2,000 movies about identity, but scattered across 15+ lists.

### Enhancement Options

#### Option 1: Expand Sparse Lists

**Scenario 1:** Expand lists with ≤10 movies
- **827 lists** affected
- **Cost:** $12.40
- **Result:** Every list has 20-30 movies

**Scenario 2:** Expand lists with ≤20 movies
- **9,064 lists** affected
- **Cost:** $135.96
- **Result:** Every list has 30-40 movies (Claude-level)

**Scenario 3:** Expand lists with ≤30 movies
- **9,409 lists** affected
- **Cost:** $141.13
- **Result:** Premium coverage (40-50+ movies)

#### Option 2: Add Hierarchical Categories

```sql
-- Schema already supports this!
ALTER TABLE browse_lists
  ADD COLUMN parent_list_id UUID REFERENCES browse_lists(id);

CREATE TABLE browse_list_categories (
  id UUID PRIMARY KEY,
  list_id UUID REFERENCES browse_lists(id),
  category_name VARCHAR(100),
  category_description TEXT,
  display_order INTEGER
);
```

**Then render:**
```
Teen Identity Thrillers (52 films)

📁 The Impostor (5 films)
   ├─ The Talented Mr. Ripley (1960)
   ├─ Catch Me If You Can (2002)
   └─ ...

📁 Erased & Reprogrammed (6 films)
   ├─ Eternal Sunshine (2004)
   ├─ Maze Runner (2012)
   └─ ...
```

#### Option 3: View Mode Toggle

```javascript
const [viewMode, setViewMode] = useState('grid'); // or 'editorial'

{viewMode === 'grid' && <BrowseGrid movies={movies} />}
{viewMode === 'editorial' && <BrowseEditorial collection={collection} />}
```

**Grid view:** Current (quick visual browsing)
**Editorial view:** Claude-style (categorized, with synopses)

### Recommended Approach

**Phase 1:** Expand sparse lists (≤10 movies) - $12.40
- Quick win
- Fixes embarrassingly small lists
- Low cost

**Phase 2:** Add hierarchical categories (future)
- Organize existing lists into parent concepts
- Allow drill-down exploration
- No AI cost (manual curation or script)

**Phase 3:** Expand to 30-40 movies (if budget allows) - $136
- Comprehensive coverage
- Match Claude-level quality
- After validating Phase 1 works

---

## Database Migration Strategy

### Current Database: Railway PostgreSQL

- **Host:** `crossover.proxy.rlwy.net:11014`
- **Database:** `postgres`
- **User:** `supabase_admin` (legacy name, it's actually Railway)
- **Location:** Railway.app cloud infrastructure

**No new database needed. All migrations happen in same Railway PostgreSQL instance.**

### Migration Paths

#### MVF Approach (Add Column)

```sql
-- Non-destructive: Add column
ALTER TABLE movie_analyses
  ADD COLUMN analysis_data_v3 JSONB;

-- Generate to new column
-- When ready, DROP old column or keep as backup
```

**Pros:**
- ✅ Instant rollback (switch column)
- ✅ No table rename needed
- ✅ Old data preserved

**Cons:**
- ⚠️ Bigger table (two columns per row)
- ⚠️ Cleanup needed later

#### V3 Approach (New Table)

```sql
-- Create new clean table
CREATE TABLE movie_analyses_v3 (...);

-- Generate all data to new table
-- Validate quality

-- Swap tables
BEGIN;
  ALTER TABLE movie_analyses RENAME TO movie_analyses_legacy;
  ALTER TABLE movie_analyses_v3 RENAME TO movie_analyses;
COMMIT;

-- Archive legacy after 2 weeks
DROP TABLE movie_analyses_legacy;
```

**Pros:**
- ✅ Clean schema from day 1
- ✅ Constraint validation at DB level
- ✅ No legacy baggage

**Cons:**
- ⚠️ Harder rollback (table swap)
- ⚠️ More testing needed

### Recommended: MVF Approach for Safety

Start with column approach, migrate to clean table later if needed.

---

## Implementation Timeline

### MVF Timeline (2 Weeks)

```
Week 1:
├─ Day 1-2: Build generator + caches (8 hours)
├─ Day 3: Test on 20 movies (2 hours)
└─ Day 4-7: Generate 35K analyses (background)

Week 2:
├─ Day 8: Deploy with USE_V3_DATA=false
├─ Day 9: Validate data quality
├─ Day 10: Flip USE_V3_DATA=true
└─ Day 11-14: Monitor, fix issues
```

**Total:** 2 weeks, 12-16 hours active work, $158

### V3 Timeline (4-6 Weeks)

```
Week 1: Backend Build
├─ Database schema design
├─ Analysis generator
├─ WhyWatch generator (optional)
├─ Repository pattern
└─ API v1 endpoints

Week 2-3: Data Generation
├─ Generate 35K analyses ($158)
├─ Generate 35K WhyWatch ($24.50, optional)
└─ Validate quality

Week 4: Frontend Rebuild
├─ Simplify page components
├─ Remove railway-adapter
├─ Parallel loading
└─ Loading states

Week 5: iOS Preparation
├─ Test API with Postman
├─ Document endpoints
├─ iOS team can start building
└─ Final polish

Week 6: Testing & Deployment
├─ Stage environment testing
├─ Production deployment
└─ Monitoring
```

**Total:** 4-6 weeks, $182.50

### Browse Enhancement Timeline (Ongoing)

```
Phase 1: Sparse Lists (1-2 days)
├─ Generate script for list expansion
├─ Test on 10 lists
└─ Run batch for 827 lists ($12.40)

Phase 2: Comprehensive (1-2 weeks)
├─ Expand 9K lists to 30-40 movies
└─ Cost: $136

Phase 3: Hierarchical Categories (1 week)
├─ Design category structure
├─ Populate parent_list_id
└─ Update UI components
```

---

## Cost Analysis

### MVF Cost Breakdown

| Item | Quantity | Unit Cost | Total |
|------|----------|-----------|-------|
| Analysis generation | 35,000 | $0.0045 | $158.00 |
| Movie cache setup | 1 | $0 | $0 |
| Person cache setup | 1 | $0 | $0 |
| Database migration | 1 | $0 | $0 |
| **Total** | | | **$158.00** |

**Plus:** Development time (~16 hours)

### V3 Cost Breakdown

| Item | Quantity | Unit Cost | Total |
|------|----------|-----------|-------|
| Analysis generation | 35,000 | $0.0045 | $158.00 |
| WhyWatch generation | 35,000 | $0.0007 | $24.50 |
| Database migration | 1 | $0 | $0 |
| Development time | 4-6 weeks | Internal | - |
| **Total** | | | **$182.50** |

### Browse Enhancement Cost

| Scenario | Lists | Total Cost |
|----------|-------|------------|
| Sparse lists (≤10) | 827 | $12.40 |
| Comprehensive (≤20) | 9,064 | $135.96 |
| Premium (≤30) | 9,409 | $141.13 |

### Budget Scenarios

**Scenario A: MVF Only ($158)**
- Fix movie analysis
- Leave browse as-is
- Fast turnaround (2 weeks)

**Scenario B: MVF + Sparse Browse ($170)**
- Fix movie analysis
- Fix 827 tiny browse lists
- Quick wins on both systems

**Scenario C: Comprehensive ($294)**
- Fix movie analysis ($158)
- Expand browse to 30-40 movies ($136)
- Both systems feel premium

**Scenario D: Full V3 ($318)**
- Complete redesign ($182.50)
- Comprehensive browse ($136)
- Clean architecture for iOS
- Future-proof foundation

---

## Decision Framework

### Choose MVF If:

- ✅ Need fixes ASAP (2 weeks)
- ✅ iOS app is 3+ months away
- ✅ Prefer incremental changes
- ✅ Want to validate approach first
- ✅ Limited budget ($158)

### Choose V3 If:

- ✅ iOS app starting in 1-2 months
- ✅ Willing to invest 4-6 weeks
- ✅ Want clean foundation
- ✅ Comfortable with bigger changes
- ✅ Budget for $182.50 + dev time

### Browse Enhancement:

- ✅ Do "Sparse Lists" ($12.40) with either MVF or V3
- ✅ Do "Comprehensive" ($136) if budget allows
- ✅ Add hierarchical categories (future, no AI cost)

---

## Technical Risks & Mitigations

### Risk 1: Claude Prompt Quality

**Risk:** New prompt generates poor quality analyses

**Mitigation:**
- Test on 20 diverse movies first
- Manual review before bulk generation
- Iterate prompt based on results
- Keep old data as backup

### Risk 2: Character Name Linking

**Risk:** Accidentally link character names instead of actors

**Mitigation:**
- Clear prompt instructions (actor vs character)
- `persons` table only contains real people (safety net)
- Client-side lookup returns null for non-existent names
- Renders as plain text if not found

### Risk 3: iOS API Compatibility

**Risk:** iOS team needs different data structure

**Mitigation:**
- Version API endpoints (`/api/v1/*`)
- Can add `/api/v2/*` later without breaking iOS
- Work with iOS team on data models upfront
- Test with Postman before iOS starts

### Risk 4: Browse Expansion Quality

**Risk:** AI expands lists with irrelevant movies

**Mitigation:**
- Test on 10 lists first
- Manual spot-check results
- Use relevance_score to flag low-confidence additions
- Allow admin review before publishing

---

## Success Metrics

### MVF Success Criteria

- ✅ 0 analyses with `has_links=true` but no actual links
- ✅ 90%+ of **Movie (Year)** refs successfully linked
- ✅ 80%+ of **Person Name** refs successfully linked
- ✅ Page load time <300ms (vs 800ms current)
- ✅ Analysis length 180-220 words (vs 400-500)
- ✅ No production errors after 1 week

### V3 Success Criteria

- ✅ All MVF criteria met
- ✅ Components reduced to <500 lines (from 1,900)
- ✅ API consolidated to 1 call (from 4)
- ✅ iOS app can launch within 2 months
- ✅ Code maintainability improved (fewer files/complexity)

### Browse Enhancement Criteria

- ✅ 0 lists with <10 movies (after Scenario 1)
- ✅ Average list size 30-40 movies (after Scenario 2)
- ✅ User engagement increases (time on page, clicks)
- ✅ "Related lists" feature reduces bounce rate

---

## Next Steps

### Immediate (This Week)

1. **Decision:** MVF vs V3?
2. **Budget approval:** $158 (MVF) or $182.50 (V3)?
3. **iOS timeline:** Confirm when iOS development starts

### If MVF Approved

1. Build movie cache (1 hour)
2. Build person cache (1 hour)
3. Build prompt template (2 hours)
4. Build generator (2 hours)
5. Test on 20 movies (2 hours)
6. Review quality together
7. Batch generate 35K (24-48 hours)
8. Deploy with feature flag

### If V3 Approved

1. Design clean database schema (4 hours)
2. Build backend architecture (Week 1)
3. Generate all data (Week 2-3)
4. Rebuild frontend (Week 4)
5. iOS API documentation (Week 5)
6. Deploy and test (Week 6)

### Browse Enhancement (Optional)

1. Build expansion script (4 hours)
2. Test on 10 lists (2 hours)
3. Run batch for sparse lists (1-2 days)
4. Monitor quality
5. Decide on comprehensive expansion

---

## Appendix: Code Examples

### Example 1: V3 Analysis Prompt

```javascript
export function buildAnalysisPrompt(movie) {
  return `You are a film critic writing concise, insightful analyses.

Movie: ${movie.title} (${movie.year})

GUIDELINES:
- 180-220 words total (3 paragraphs)
- Reference 2-4 related films using **Movie Title (Year)** format
- When discussing performances/direction, use **Person Name** format
- When discussing characters/plot, use plain text (no markup)

STRUCTURE:

Paragraph 1 (60-80 words): Opening hook
- What's compelling about this film?
- Include 1-2 inline **Movie Title (Year)** references

Paragraph 2 (70-90 words): Core elements
- Performances, direction, visual style
- Include **Person Name** for crew/cast
- Include 1-2 inline **Movie Title (Year)** references

Paragraph 3 (40-50 words): Why it matters
- Contemporary relevance or lasting impact

IMPORTANT:
✅ "**Brad Pitt** delivers a powerhouse performance"
✅ "**David Fincher**'s direction creates tension"
❌ "**Brad Pitt**'s Tyler Durden" (character context)
❌ "**Tyler Durden** represents" (fictional character)

OUTPUT (strict JSON):
{
  "analysis": "Full 3-paragraph text with inline refs",
  "featuredFilms": [
    {"title": "Movie", "year": 2020, "connection": "Why it relates"}
  ],
  "mood": ["genre", "tone", "theme"]
}`;
}
```

### Example 2: iOS API Endpoint

```javascript
// pages/api/v1/movie-page.js
import { getPool } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  const { tmdbId } = req.query;

  if (!tmdbId || isNaN(parseInt(tmdbId))) {
    return res.status(400).json({
      error: 'Valid tmdbId parameter required',
      code: 'INVALID_TMDB_ID'
    });
  }

  try {
    const pool = getPool();

    // Parallel queries for speed
    const [movieResult, analysisResult, whyWatchResult, streamingResult] = await Promise.all([
      pool.query('SELECT * FROM movies WHERE tmdb_id = $1', [tmdbId]),
      pool.query('SELECT analysis_data FROM movie_analyses ma JOIN movies m ON ma.movie_id = m.id WHERE m.tmdb_id = $1', [tmdbId]),
      pool.query('SELECT recommendation, reasons FROM enhanced_why_watch WHERE tmdb_id = $1', [tmdbId]),
      pool.query('SELECT streaming_data FROM movies WHERE tmdb_id = $1', [tmdbId])
    ]);

    if (movieResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Movie not found',
        code: 'MOVIE_NOT_FOUND'
      });
    }

    const movie = movieResult.rows[0];
    const analysis = analysisResult.rows[0]?.analysis_data || null;
    const whyWatch = whyWatchResult.rows[0] || null;
    const streaming = streamingResult.rows[0]?.streaming_data || null;

    // Cache for 24 hours
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', 'application/json');

    res.status(200).json({
      movie: {
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        year: movie.year,
        poster_url: movie.poster_url,
        overview: movie.overview
      },
      analysis,
      whyWatch,
      streaming
    });

  } catch (error) {
    console.error('Movie page API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
```

### Example 3: Client-Side Linking

```javascript
// components/MovieAnalysis.jsx
import { useEffect, useState } from 'react';
import { linkifyMovies } from '../lib/text/movie-linker';
import { linkifyPeople } from '../lib/text/person-linker';

export default function MovieAnalysis({ analysis, currentMovieTitle }) {
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    if (!analysis?.analysis) return;

    // Link movies first
    let linked = linkifyMovies(analysis.analysis, currentMovieTitle);

    // Then link people
    linked = linkifyPeople(linked);

    setHtmlContent(linked);
  }, [analysis, currentMovieTitle]);

  if (!analysis) return null;

  return (
    <div className="analysis">
      <div
        className="analysis-text"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {analysis.featuredFilms && analysis.featuredFilms.length > 0 && (
        <FeaturedFilms films={analysis.featuredFilms} />
      )}

      {analysis.mood && analysis.mood.length > 0 && (
        <MoodTags tags={analysis.mood} />
      )}
    </div>
  );
}
```

---

## Document Version History

- **v1.0** - Initial architecture plan consolidating MVF, V3, iOS, Browse
- Created: 2025-01-XX

---

**End of Document**
