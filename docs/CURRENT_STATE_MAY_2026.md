# MovieGenius Current State - May 8, 2026

**Status:** iOS-Ready 🚀
**Total Movies:** 32,950
**Build Status:** ✅ Passing

---

## API Summary

### Primary Endpoint (Use for iOS)

**GET `/api/v1/movie/{tmdbId}`**
- **Location:** `/pages/api/v1/movie/[tmdbId].js`
- **Purpose:** Single unified call returns complete movie data
- **Replaces:** 4 separate API calls (movie-data, why-watch, contributors, more-ideas)

**Response Schema:**
```json
{
  "movie": {
    "tmdb_id": 153,
    "title": "Lost in Translation",
    "year": 2003,
    "poster_url": "https://image.tmdb.org/t/p/w500/...",
    "streaming_data": { /* JustWatch data */ }
  },
  "whyWatch": {
    "recommendation": "YES",
    "reasons": ["Reason 1", "Reason 2", "Reason 3"],
    "context": "Closing paragraph with narrative context...",
    "model": "claude-sonnet-4-6"
  },
  "moreIdeas": [
    {"title": "Movie Title", "year": 1999, "tmdbId": 278, "connection": "Why similar"}
  ],
  "contributors": {
    "cast": [{"name": "Bill Murray", "character": "Bob Harris", "profile_path": "..."}],
    "crew": [{"name": "Sofia Coppola", "job": "Director", "profile_path": "..."}]
  }
}
```

---

## Coverage Statistics (32,950 Movies)

| Data Type | Count | Coverage | Quality |
|-----------|-------|----------|---------|
| **WhyWatch v3** | 28,156 | **85%** | Includes context paragraph |
| **MoreIdeas** | 19,915 | **60%** | 15 related movies each |
| **Contributors** | 13,645 | **41%** | Cast/crew from TMDB |
| **Streaming** | Varies | - | JustWatch where available |

**Target for iOS Launch:** 95% WhyWatch coverage
**Gap:** ~4,800 movies need WhyWatch

---

## Recent Fixes (May 8, 2026)

### Fix #1: MoreIdeas JOIN Bug
**Before:** Returned `null` for all movies
**After:** Returns data for 19,915 movies (60% coverage)

**Change in `/pages/api/v1/movie/[tmdbId].js` line 86:**
```diff
- LEFT JOIN more_ideas mi ON m.id = mi.movie_id
+ LEFT JOIN more_ideas mi ON m.tmdb_id = mi.tmdb_id
```

### Fix #2: WhyWatch v3 Upgrade
**Before:** Used `enhanced_why_watch` table (19,948 records, no context)
**After:** Uses `enhanced_why_watch_v3` table (28,156 records, includes context)

**Change in `/pages/api/v1/movie/[tmdbId].js` line 85:**
```diff
- LEFT JOIN enhanced_why_watch ew ON m.id = ew.movie_id
+ LEFT JOIN enhanced_why_watch_v3 ew ON m.tmdb_id = ew.tmdb_id
```

**Impact:**
- WhyWatch: +8,208 movies (+41% more data)
- MoreIdeas: Fixed from broken → 19,915 working
- iOS now gets context paragraph in single API call

---

## API Locations

### Primary APIs (Use for iOS)
| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/v1/movie/{tmdbId}` | `/pages/api/v1/movie/[tmdbId].js` | Unified movie data |
| `GET /api/health` | `/pages/api/health.js` | Health check |
| `GET /api/admin/catalog-status` | `/pages/api/admin/catalog-status.js` | Coverage monitoring |

### Legacy APIs (Web Still Uses)
| Endpoint | File | Notes |
|----------|------|-------|
| `GET /api/movie-data` | `/pages/api/movie-data.js` | Superseded by unified API |
| `GET /api/why-watch` | `/pages/api/why-watch.js` | Uses v3 table, standalone |
| `GET /api/tmdb-movie` | `/pages/api/tmdb-movie.js` | Raw TMDB passthrough |
| `GET /api/movie-contributors-simple` | `/pages/api/movie-contributors-simple.js` | Cast/crew only |

### Background Generation (Auto-triggered)
| Endpoint | File | Model | Cost |
|----------|------|-------|------|
| `POST /api/generate-slug` | `/pages/api/generate-slug.js` | Haiku | $0.003 |
| `POST /api/generate-why-watch` | `/pages/api/generate-why-watch.js` | Sonnet 4.6 | $0.015 |
| `POST /api/generate-more-ideas` | `/pages/api/generate-more-ideas.js` | Sonnet | $0.015 |

---

## Scripts & Services

### Core Scripts
| Script | Location | Purpose | Schedule |
|--------|----------|---------|----------|
| Catalog Refresh | `/scripts/refresh-catalog.js` | Fetch new movies from TMDB | Daily 6 AM UTC |
| WhyWatch Batch | `/scripts/batch-generate-why-watch.js` | Generate WhyWatch in bulk | Manual |
| MoreIdeas Batch | `/scripts/batch-more-ideas.js` | Generate MoreIdeas in bulk | Manual |

**Usage:**
```bash
# Manual catalog refresh
node scripts/refresh-catalog.js

# Batch WhyWatch generation
node scripts/batch-generate-why-watch.js

# Batch MoreIdeas generation (with options)
node scripts/batch-more-ideas.js --limit=100 --batch-size=25
```

### Key Services
| Service | Location | Purpose |
|---------|----------|---------|
| TMDB Persistence | `/lib/services/tmdb-persist.js` | UseOnce policy implementation |
| Database | `/lib/database.js` | PostgreSQL connection pool |

**UseOnce Policy Methods:**
```javascript
import { useOnce, ensureMovieInDb, triggerEnrichment } from './lib/services/tmdb-persist.js';

// Full UseOnce: persist + enrich
await useOnce(tmdbMovie);

// Phase 1 only: persist
const { isNew } = await ensureMovieInDb(tmdbMovie);

// Phase 2 only: enrich
if (isNew) {
  await triggerEnrichment(tmdbId);
}
```

---

## Database Schema

### Primary Tables
| Table | Records | Key Fields | Purpose |
|-------|---------|------------|---------|
| `movies` | 32,950 | tmdb_id, title, year, poster_url | Catalog core |
| `enhanced_why_watch_v3` | 28,156 | tmdb_id, recommendation, reasons, context | WhyWatch v3 |
| `more_ideas` | 19,915 | tmdb_id, ideas (JSONB) | Related movies |
| `contributors_simplified` | 13,645 | tmdb_id, cast, crew (JSONB) | Cast/crew |
| `movie_analyses` | ~21K | Analysis legacy data | Deprecated |

---

## Documentation Created (Week 1)

| Document | Location | Purpose |
|----------|----------|---------|
| Week 1 Final Status | `/docs/WEEK1_FINAL_STATUS.md` | Completion summary |
| Week 1 Implementation | `/docs/WEEK1_IMPLEMENTATION_COMPLETE.md` | Technical details |
| iOS Development Roadmap | `/docs/IOS_DEVELOPMENT_ROADMAP.md` | 8-week iOS plan |
| Catalog Refresh Setup | `/docs/CATALOG_REFRESH_SETUP.md` | Cron job configuration |
| Railway Cron Setup | `/docs/RAILWAY_CRON_SETUP.md` | Railway deployment |
| API Reference | `/docs/API_REFERENCE.md` | All endpoints documented |

**New (May 8, 2026):**
- `/docs/IOS_MOVIE_PAGE_SPEC.md` - Movie page component spec
- `/docs/strategies/CATALOG_GROWTH_STRATEGIC_PLAN.md` - Catalog growth strategy
- `/docs/strategies/BATCH_BUILD_AUDIT.md` - WhyWatch/MoreIdeas batch audit

---

## iOS Development Status

**Phase:** Ready to begin
**Next Step:** Create Xcode project (Phase 1: Foundation)

### Swift Data Models (Ready to Implement)
```swift
struct Movie {
    let tmdbId: Int
    let title: String
    let year: Int
    let posterUrl: String
}

struct WhyWatch {
    let recommendation: Verdict // YES/NO
    let reasons: [String] // 3 items
    let context: String? // Narrative paragraph
    let model: String
}

struct MoreIdea {
    let title: String
    let year: Int
    let tmdbId: Int
    let connection: String
}
```

### Movie Page Components (Documented)
1. Search bar (sticky header)
2. Poster (267×400px with trailer overlay)
3. WhyWatch (verdict + 3 reasons + context)
4. Seen/Add buttons
5. Cast/crew (from contributors)
6. MoreIdeas (horizontal scroll, 15 movies)

---

## Known Issues & Limitations

### Coverage Gaps
- WhyWatch: 4,794 movies missing (15% gap)
- MoreIdeas: 13,035 movies missing (40% gap)
- Contributors: 19,305 movies missing (59% gap)

### WhyWatch Recalibration Needed
- Current YES rate: 96% (too permissive)
- Target YES rate: 85-86% (more selective)
- Action: Update prompt to be more critical

### Batch Processing Not Automated
- WhyWatch and MoreIdeas scripts exist but run manually
- No cron jobs scheduled for batch enrichment
- Daily catalog refresh exists but enrichment coverage incomplete

---

## Cost Estimates

### Current Per-Movie Costs
| Operation | Model | Cost |
|-----------|-------|------|
| Slug Generation | Haiku | $0.003 |
| WhyWatch Generation | Sonnet 4.6 | $0.015 |
| MoreIdeas Generation | Sonnet | $0.015 |
| **Total per movie** | - | **$0.033** |

### Optimization Potential
**With Haiku 3.5 + aggressive caching:**
- Slug: $0.003 → $0.001 (67% savings)
- WhyWatch: $0.015 → $0.001 (93% savings)
- MoreIdeas: $0.015 → $0.0016 (89% savings)
- **Total: $0.033 → $0.0036** (89% savings)

### Backfill to 95% Coverage
**Current (no optimization):**
- WhyWatch: 4,794 × $0.015 = $72
- MoreIdeas: 13,035 × $0.015 = $196
- **Total: $268**

**Optimized (Haiku + caching):**
- WhyWatch: 4,794 × $0.001 = $5
- MoreIdeas: 13,035 × $0.0016 = $21
- **Total: $26** (90% savings)

---

## Next Actions

### Immediate (This Week)
1. ✅ Fixed MoreIdeas JOIN bug
2. ✅ Upgraded to WhyWatch v3
3. ✅ Documented iOS development plan
4. ⏳ Recalibrate WhyWatch prompt (target 85% YES)
5. ⏳ Create Haiku-optimized batch scripts

### Short-Term (Next 2 Weeks)
1. Run optimized backfill to reach 95% coverage
2. Set up automated weekly batch enrichment
3. Begin iOS Phase 1 (Foundation)
4. Create Xcode project and Swift models

### Long-Term (Month 2-3)
1. Complete iOS app (8-week roadmap)
2. Automate catalog growth via UseOnce policy
3. Implement on-demand enrichment for new movies
4. Launch iOS app to App Store

---

## Quick Commands

**Check Coverage:**
```bash
node --env-file=.env.local -e "/* coverage queries */"
```

**Test Unified API:**
```bash
curl "https://moviegenius.ai/api/v1/movie/153" | jq
```

**Manual Catalog Refresh:**
```bash
node scripts/refresh-catalog.js
```

**Batch Generation:**
```bash
# WhyWatch
node scripts/batch-generate-why-watch.js

# MoreIdeas
node scripts/batch-more-ideas.js --limit=100
```

---

*Last Updated: May 8, 2026*
*Production URL: https://moviegenius.ai*
*iOS Launch Target: June 2026*
