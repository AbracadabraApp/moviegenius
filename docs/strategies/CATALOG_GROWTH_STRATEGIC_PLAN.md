# Catalog Growth Strategic Plan

**Version:** 1.0
**Date:** 2025-05-08
**Status:** Audit & Recommendations
**Purpose:** Comprehensive strategy for catalog updates, new releases, and automated content generation

---

## Executive Summary

MovieGenius has well-documented catalog growth strategies ("Use Once" policy, daily new releases, automatic enrichment) but implementation gaps have created a stagnant catalog. This plan audits current systems, identifies failures, and proposes a comprehensive fix.

**Key Issues:**
- Daily catalog refresh cron job status unknown (may be broken)
- Search endpoints not persisting movies to catalog (documented gap)
- More Ideas may not be triggering catalog expansion
- WhyWatch and More Ideas batch generation incomplete (61% coverage)
- No monitoring of catalog growth metrics

**Strategic Priority:** Fix before iOS launch to ensure iOS has fresh, growing catalog.

---

## Part 1: Current State Audit

### 1.1 Documented Systems

#### A. "Use Once" Policy (TMDB_CATALOG_POLICY.md)
**Intent:** Every movie that touches the system via TMDB ID must be persisted to `movies` table, then enriched asynchronously.

**Two-Phase Model:**
- **Phase 1 (Sync):** `ensureMovieInDb(tmdbMovie)` - Persist metadata
- **Phase 2 (Async):** Trigger slug, WhyWatch, More Ideas generation

**Status:** 🟡 **Partially Implemented** - Design exists, unclear if all endpoints call it

#### B. Daily New Releases Refresh (CATALOG_REFRESH_SETUP.md)
**Intent:** Automated daily cron job fetches from 4 TMDB endpoints:
- Now Playing
- Upcoming
- Trending This Week
- Popular

**Schedule:** `0 6 * * *` (Daily at 6 AM UTC)
**Script:** `scripts/refresh-catalog.js`
**Cost:** ~$0.66/day (~$20/month) for 20 new movies/day

**Status:** 🔴 **UNKNOWN** - Needs verification

#### C. Automatic Search Result Persistence
**Intent:** Every search result should be persisted to `movies` table (lightweight), enrichment only triggers when user explicitly views movie.

**Status:** 🔴 **NOT IMPLEMENTED** - Per TMDB_CATALOG_POLICY.md Lines 66-77:
> "Every search is a missed catalog write... Full TMDB objects discarded"

#### D. More Ideas Graph Expansion
**Intent:** When More Ideas generates 15 related movies, each should be persisted to catalog.

**Status:** 🔴 **NEEDS VERIFICATION** - Unclear if More Ideas batch process calls `ensureMovieInDb` for related movies

#### E. Background Enrichment Jobs
**Intent:** New movies trigger async Claude jobs:
- Slug generation (Haiku - $0.003/movie)
- WhyWatch generation (Sonnet - $0.015/movie)
- More Ideas generation (Sonnet - $0.015/movie)

**Status:** 🟡 **WORKING BUT INCOMPLETE**
- Total movies: 32,935
- Movies with slug: 30,894 (94%)
- WhyWatch coverage: 19,948 (61%)
- More Ideas coverage: Unknown

---

### 1.2 Known Gaps (From TMDB_CATALOG_POLICY.md)

#### Tier 1: High Volume, Zero Persistence
| Endpoint | File | Impact |
|----------|------|--------|
| Enhanced Search | `enhanced-search.js` | Every search = missed catalog write |
| Search Movies | `search-movies.js` | Full TMDB objects discarded |
| Multi-Search | `multi-search.js` | Duplicate of above |
| New Releases | `new-releases.js` | Carousel loads = free catalog data, discarded |
| Popular Movies | `popular-movies.js` | Free catalog data, discarded |

#### Tier 2: Has TMDB ID, Skips Movie Record
| Endpoint | File | Gap |
|----------|------|-----|
| Streaming Data | `tmdb-streaming.js` | Saves streaming only, no movie record |
| Movie Credits | `movie-credits.js` | Has `tmdb_id`, never ensures movie row exists |
| Trailer | `tmdb-trailer.js` | Saves trailer only if movie already in DB |

---

### 1.3 Critical Unknowns (Requires Investigation)

**Questions to Answer:**

1. **Is daily cron job running?**
   - Check Railway cron configuration
   - Check `scripts/refresh-catalog.js` execution logs
   - Verify last 7 days of catalog growth

2. **Which endpoints actually call `ensureMovieInDb`?**
   - Audit all API routes in `/pages/api/`
   - Find which implement Use Once policy
   - Identify critical gaps

3. **What is actual catalog growth rate?**
   - Query: `SELECT COUNT(*) FROM movies WHERE created_at > NOW() - INTERVAL '7 days'`
   - Compare to expected 140 movies/week (20/day)

4. **Are More Ideas batch jobs running?**
   - Check database for recent `more_ideas` inserts
   - Verify batch scripts still functional
   - Check error logs for failed enrichment jobs

5. **Why is WhyWatch only 61% coverage?**
   - Are batch jobs failing silently?
   - Is there a backlog queue?
   - Are costs preventing completion?

---

## Part 2: Strategic Recommendations

### 2.1 Immediate Actions (Week 1) - Investigation Phase

#### Action 1: Audit Daily Cron Job
**Goal:** Confirm if `scripts/refresh-catalog.js` is running

**Steps:**
1. Check Railway cron configuration
2. Review execution logs for last 30 days
3. Query database: `SELECT COUNT(*) FROM movies WHERE created_at > NOW() - INTERVAL '30 days'`
4. If broken: Fix cron schedule, test manually, redeploy

**Success Criteria:**
- Cron job executes daily at 6 AM UTC
- 15-25 new movies added daily
- Zero failures in last 7 days

#### Action 2: Audit API Endpoints
**Goal:** Identify which endpoints implement Use Once policy

**Steps:**
1. Search all files in `/pages/api/` for `ensureMovieInDb` calls
2. Create matrix: Endpoint → Calls ensureMovieInDb? (Yes/No)
3. Prioritize high-traffic endpoints (search, movie detail, browse)
4. Document current implementation status

**Deliverable:** `CATALOG_GROWTH_AUDIT.md` with implementation matrix

#### Action 3: Measure Catalog Growth Baseline
**Goal:** Establish current growth metrics for comparison

**Queries to Run:**
```sql
-- Total movies
SELECT COUNT(*) FROM movies;

-- Added last 7/30/90 days
SELECT
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_week,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as last_month,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '90 days') as last_quarter
FROM movies;

-- Enrichment coverage
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE slug IS NOT NULL) as has_slug,
  COUNT(*) FILTER (WHERE more_ideas IS NOT NULL) as has_more_ideas
FROM movies;

-- WhyWatch coverage
SELECT COUNT(*) FROM enhanced_why_watch;
```

**Deliverable:** Baseline metrics document for tracking improvements

---

### 2.2 Short-Term Fixes (Week 2-3) - Implementation

#### Fix 1: Wire Search Endpoints to Use Once
**Priority:** HIGH (biggest gap, high user traffic)

**Implementation:**
```javascript
// In enhanced-search.js, search-movies.js, multi-search.js
const results = await fetchTMDB(...);

// Add this for each result:
for (const movie of results) {
  const { isNew } = await ensureMovieInDb(movie);
  if (isNew) {
    // Fire-and-forget enrichment
    triggerEnrichment(movie.id).catch(console.error);
  }
}

return results;
```

**Impact:**
- Every search = catalog growth opportunity
- Estimated 50-200 new movies/day from user searches
- Cost: Only enrichment for viewed movies (~$1-5/day)

#### Fix 2: Wire Ancillary Endpoints (Streaming, Credits, Trailer)
**Priority:** MEDIUM

**Implementation:**
```javascript
// In tmdb-streaming.js, movie-credits.js, tmdb-trailer.js
const tmdbId = req.query.tmdbId;

// Add this at top of handler:
const tmdbMovie = await fetchMovieDetails(tmdbId);
await ensureMovieInDb(tmdbMovie);

// Then proceed with existing logic
```

**Impact:** Guarantees movie row exists before saving related data

#### Fix 3: Verify More Ideas Calls ensureMovieInDb
**Priority:** MEDIUM

**Investigation:**
1. Find More Ideas batch generation script
2. Check if it persists related movies to `movies` table
3. If not, add `ensureMovieInDb` call for each of 15 related movies

**Implementation:**
```javascript
// In More Ideas generation script
const relatedMovies = await generateMoreIdeas(tmdbId);

for (const relatedId of relatedMovies) {
  const tmdbMovie = await fetchMovieDetails(relatedId);
  await ensureMovieInDb(tmdbMovie);
}
```

**Impact:** Graph expansion = catalog expansion (15 movies × every enrichment)

---

### 2.3 Medium-Term Improvements (Month 2) - Optimization

#### Improvement 1: Backfill WhyWatch to 95% Coverage
**Current:** 61% (19,948 / 32,935)
**Target:** 95% (31,288 movies)
**Gap:** 11,340 movies need WhyWatch

**Strategy:**
- Batch process 500 movies/day
- Cost: 500 × $0.015 = $7.50/day
- Timeline: 23 days to 95%
- Total cost: ~$170

**Prioritization:**
1. Movies with >100 TMDB votes (popular movies first)
2. Movies in browse collections (user-facing content)
3. Remaining catalog

**Script:** Extend existing batch processing with priority queue

#### Improvement 2: Backfill More Ideas to 90% Coverage
**Current:** Unknown (need to query)
**Target:** 90% coverage

**Same strategy as WhyWatch backfill**

#### Improvement 3: Consolidate Duplicate Search Endpoints
**Issue:** 5 search endpoints call same TMDB API with slight variations

**Consolidation:**
- Create single `tmdb-search-unified.js` with options
- Deprecate: `search-movies.js`, `multi-search.js`, `enhanced-search.js`
- Keep: Single source of truth with Use Once policy

**Benefits:**
- One place to maintain Use Once logic
- Reduced code duplication
- Consistent catalog growth behavior

---

### 2.4 Long-Term Strategy (Month 3+) - Automation

#### Strategy 1: Autonomous Enrichment Queue
**Goal:** Self-healing system that automatically fills coverage gaps

**Design:**
1. **Daily cron job** checks enrichment coverage
2. **Prioritizes gaps:** Movies without slug/WhyWatch/More Ideas
3. **Budget-aware:** Processes N movies/day within cost limit ($10/day max)
4. **Reports progress:** Daily email/log with coverage metrics

**Implementation:**
```javascript
// scripts/autonomous-enrichment.js
const dailyBudget = 10; // $10/day
const costPerMovie = 0.033; // $0.003 slug + $0.015 WhyWatch + $0.015 More Ideas
const maxMovies = Math.floor(dailyBudget / costPerMovie); // ~300 movies/day

// Priority queue
const queue = await fetchMoviesNeedingEnrichment(maxMovies);

for (const movie of queue) {
  await enrichMovie(movie.tmdb_id);
}
```

**Cost:** $10/day = $300/month until 95% coverage achieved

#### Strategy 2: Intelligent New Release Prediction
**Goal:** Proactively add high-value movies before users search for them

**Sources:**
1. **TMDB Upcoming** - Movies with release dates in next 30 days
2. **Box Office APIs** - Weekend top 10
3. **Streaming Debuts** - New releases on major platforms
4. **Award Season** - Oscar nominees, festival winners

**Enrichment Strategy:**
- Enrich immediately upon discovery (don't wait for user search)
- Higher budget allocation for high-profile releases
- Pre-populate WhyWatch for day-one user traffic

**Cost:** ~$50/month for 100 proactive enrichments

#### Strategy 3: More Ideas Graph Healing
**Goal:** Ensure every movie in More Ideas lists exists in catalog

**Process:**
1. **Nightly job** queries all `more_ideas` JSONB fields
2. **Extracts** unique tmdbIds from all movies
3. **Checks** if each exists in `movies` table
4. **Persists** missing movies (lightweight, no enrichment yet)
5. **Queues** missing movies for enrichment

**Impact:** Closes loop where More Ideas references non-existent movies

---

## Part 3: Monitoring & Validation

### 3.1 Key Metrics to Track

**Daily Monitoring:**
- New movies added (target: 20-50/day)
- Enrichment jobs completed (slug, WhyWatch, More Ideas)
- Failed enrichment jobs (alert if >5%)
- Daily enrichment costs

**Weekly Monitoring:**
- Total catalog size
- WhyWatch coverage % (target: 95%)
- More Ideas coverage % (target: 90%)
- Slug coverage % (target: 99%)

**Monthly Monitoring:**
- Catalog growth rate (movies/month)
- Top sources of new movies (search, cron, More Ideas, etc.)
- Cost per new movie (total cost / new movies)
- User engagement with new movies

### 3.2 Validation Queries

**Catalog Growth Health Check:**
```sql
SELECT
  COUNT(*) as total_movies,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as added_today,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as added_week,
  COUNT(*) FILTER (WHERE slug IS NOT NULL) as has_slug,
  COUNT(*) FILTER (WHERE slug IS NULL) as missing_slug,
  ROUND(100.0 * COUNT(*) FILTER (WHERE slug IS NOT NULL) / COUNT(*), 1) as slug_coverage
FROM movies;
```

**WhyWatch Coverage:**
```sql
SELECT
  (SELECT COUNT(*) FROM movies) as total_movies,
  COUNT(*) as movies_with_whywatch,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM movies), 1) as coverage_pct
FROM enhanced_why_watch;
```

**Daily Enrichment Performance:**
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as movies_added,
  COUNT(*) FILTER (WHERE slug IS NOT NULL) as enriched_count
FROM movies
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 3.3 Admin Dashboard Endpoint

**Create:** `GET /api/admin/catalog-health`

**Returns:**
```json
{
  "catalog": {
    "total_movies": 35000,
    "added_today": 18,
    "added_week": 142,
    "added_month": 620
  },
  "enrichment": {
    "slug_coverage": 94.2,
    "whywatch_coverage": 61.3,
    "more_ideas_coverage": 58.7
  },
  "growth_sources": {
    "daily_cron": 140,
    "user_searches": 380,
    "more_ideas_graph": 100
  },
  "costs_30d": {
    "slug_generation": 18.60,
    "whywatch_generation": 93.00,
    "more_ideas_generation": 93.00,
    "total": 204.60
  },
  "health_status": "YELLOW",
  "warnings": [
    "WhyWatch coverage below 95% target",
    "Daily cron added 0 movies in last 24h (check job status)"
  ]
}
```

---

## Part 4: Implementation Priorities

### Phase 1: Investigation (Week 1) - $0 Cost
**Focus:** Understand what's broken

✅ Audit daily cron job status
✅ Audit API endpoint Use Once implementation
✅ Measure baseline catalog growth metrics
✅ Query WhyWatch and More Ideas coverage

**Deliverables:**
- `CATALOG_GROWTH_AUDIT.md` (implementation status)
- Baseline metrics spreadsheet
- Priority fix list

---

### Phase 2: Critical Fixes (Week 2-3) - $50-150 Cost
**Focus:** Wire missing Use Once calls

✅ Fix search endpoints (enhanced-search, search-movies, multi-search)
✅ Fix ancillary endpoints (streaming, credits, trailer)
✅ Verify/fix More Ideas graph expansion
✅ Fix daily cron job if broken

**Deliverables:**
- All high-traffic endpoints implement Use Once
- Daily catalog growth resumes (20-50 movies/day)
- More Ideas graph closes catalog loop

---

### Phase 3: Backfill (Month 2) - $170-300 Cost
**Focus:** Achieve 95% enrichment coverage

✅ WhyWatch backfill to 95% (11,340 movies × $0.015)
✅ More Ideas backfill to 90%
✅ Consolidate duplicate search endpoints

**Deliverables:**
- 95% WhyWatch coverage (iOS-ready)
- 90% More Ideas coverage
- Single unified search endpoint

---

### Phase 4: Automation (Month 3) - $300-400/month
**Focus:** Self-healing autonomous system

✅ Autonomous enrichment queue (daily gap-filling)
✅ Intelligent new release prediction
✅ More Ideas graph healing job
✅ Admin dashboard for monitoring

**Deliverables:**
- Self-maintaining 95%+ coverage
- Proactive high-value movie enrichment
- Comprehensive monitoring dashboard

---

## Part 5: Success Criteria

**iOS Launch Ready (End of Phase 3):**
- ✅ 95% WhyWatch coverage (31,288 / 32,935 movies)
- ✅ 90% More Ideas coverage
- ✅ Daily catalog growth active (20-50 movies/day)
- ✅ All search endpoints implement Use Once
- ✅ Zero enrichment job failures in last 7 days

**Sustainable Growth (End of Phase 4):**
- ✅ Autonomous enrichment maintaining 95%+ coverage
- ✅ New releases enriched within 24 hours of TMDB availability
- ✅ More Ideas graph always pointing to existing catalog movies
- ✅ Cost per new movie <$1 (including enrichment)
- ✅ Admin dashboard showing green health status

---

## Part 6: Cost Projections

### One-Time Backfill Costs (Phase 3)
- WhyWatch: 11,340 movies × $0.015 = $170
- More Ideas: ~10,000 movies × $0.015 = $150
- Slug: Minimal (94% coverage already)
- **Total:** ~$320

### Ongoing Monthly Costs (Phase 4)
- Daily new releases: 600 movies/month × $0.033 = $20
- Autonomous gap-filling: $300/month (until 95% stable)
- Proactive enrichment: $50/month
- **Total:** ~$370/month initially, ~$70/month at steady state

### Cost Savings
- Current: Unknown (need audit)
- Target: $70/month for 600 new movies/month = $0.12 per movie
- Zero waste via intelligent deduplication

---

## Part 7: Risks & Mitigations

### Risk 1: Daily Cron Job Never Worked
**Impact:** No automated new releases since deployment
**Mitigation:** Phase 1 audit will confirm, Phase 2 fix takes 1 day
**Backup:** Manual trigger via `/api/admin/refresh-catalog` until fixed

### Risk 2: More Ideas Graph Not Expanding Catalog
**Impact:** 15 related movies per enrichment = wasted catalog opportunities
**Mitigation:** Phase 2 verification + fix
**Backup:** Backfill from existing More Ideas JSONB data

### Risk 3: Enrichment Jobs Silently Failing
**Impact:** New movies persist but never get WhyWatch/More Ideas
**Mitigation:** Add error logging + monitoring to enrichment triggers
**Backup:** Phase 3 backfill catches all gaps

### Risk 4: Budget Overruns During Backfill
**Impact:** $170-320 one-time cost may be too high
**Mitigation:** Spread backfill over 60 days at $5/day instead of 23 days
**Backup:** Prioritize top 5,000 movies only (user-facing content)

### Risk 5: iOS Launches with <95% Coverage
**Impact:** Many movies lack WhyWatch (poor UX)
**Mitigation:** Phase 3 backfill BEFORE iOS Phase 2 (Browse implementation)
**Backup:** iOS hides movies without WhyWatch (filter at query time)

---

## Part 8: Related Documentation

- [TMDB Catalog Policy](TMDB_CATALOG_POLICY.md) - Use Once implementation guide
- [Catalog Refresh Setup](CATALOG_REFRESH_SETUP.md) - Daily cron job configuration
- [Zero Waste Architecture](../architecture/zero-waste.md) - Cost efficiency principles
- [TMDB Bulk API Usage](../reference/TMDB_BULK_API_USAGE.md) - Batch processing patterns
- [iOS Development Plan](../IOS_DEVELOPMENT_PLAN.md) - Timeline and requirements

---

## Part 9: Next Steps

**Immediate Actions (This Week):**
1. Run Phase 1 investigation queries
2. Check Railway cron job logs
3. Create `CATALOG_GROWTH_AUDIT.md` with findings
4. Present findings and get approval for Phase 2

**Owner:** Engineering
**Timeline:** Complete investigation by end of week
**Blocker:** None - pure analysis

---

*This strategic plan provides a comprehensive roadmap for catalog growth. Execute phases sequentially, validate at each step, and adjust based on audit findings.*

**Last Updated:** 2025-05-08
**Next Review:** After Phase 1 investigation complete
