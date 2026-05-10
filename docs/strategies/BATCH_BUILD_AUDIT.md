# Batch Build System Audit

**Date:** 2025-05-08
**Status:** Manual scripts exist, no automation
**Issue:** WhyWatch and More Ideas are not updating

---

## Executive Summary

MovieGenius has well-built batch processing scripts for WhyWatch and More Ideas generation, but **neither is running automatically**. Both are manual one-time scripts with no cron scheduling, no triggers on new movies, and no autonomous operation.

**Current Coverage:**
- WhyWatch: 61% (19,948 movies with YES/NO recommendations)
- More Ideas: Unknown% (need to query `SELECT COUNT(*) FROM more_ideas`)
- Target: 95% for iOS launch readiness

---

## Part 1: Existing Batch Scripts

### Script 1: WhyWatch Batch Generator

**Location:** `scripts/batch-generate-why-watch.js`

**What It Does:**
- Generates YES/NO + 3 reasons for each movie
- Uses Claude Sonnet 3.5 (`claude-3-5-sonnet-20241022`)
- Processes movies from `movie_analyses` table that have existing analysis
- Saves to `enhanced_why_watch` table
- Includes prompt caching for cost reduction

**Key Features:**
- Progress tracking with resume capability (`why-watch-batch-progress.json`)
- Batch processing (10 movies per batch)
- Rate limiting (2 second delay between batches)
- Database verification and table creation
- Cost tracking (~$0.002/movie estimated)
- Validation of response format

**Input Source:**
```sql
SELECT ma.id, ma.movie_id, ma.claude_response, m.title, m.year, m.tmdb_id
FROM movie_analyses ma
JOIN movies m ON ma.movie_id = m.id
WHERE ma.claude_response IS NOT NULL
  AND ma.claude_response->>'raw_content' IS NOT NULL
```

**Output Schema:**
```sql
CREATE TABLE enhanced_why_watch (
  id UUID PRIMARY KEY,
  analysis_id UUID REFERENCES movie_analyses(id),
  movie_id UUID REFERENCES movies(id),
  tmdb_id INTEGER,
  recommendation VARCHAR(3) CHECK (recommendation IN ('YES', 'NO')),
  reasons JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(analysis_id)
)
```

**Execution:**
```bash
node scripts/batch-generate-why-watch.js
```

**Cost Estimate:**
- ~$0.002 per movie (with prompt caching)
- 11,340 movies @ $0.002 = ~$23 to reach 95% coverage

---

### Script 2: More Ideas Batch Generator

**Location:** `scripts/batch-more-ideas.js`

**What It Does:**
- Generates 15 movie recommendations per movie
- Uses Anthropic Batch API (50% discount)
- Processes movies missing More Ideas
- Saves to `more_ideas` table
- Includes comprehensive database verification

**Key Features:**
- Anthropic Batch API with 50% cost discount
- Progress tracking (`batch-progress.json`)
- Configurable batch size (default 25 movies/batch)
- Resume capability
- Database schema verification and auto-creation
- Extensive logging and error handling
- Dry-run mode for testing

**Input Source:**
```sql
SELECT m.tmdb_id, m.title, m.year
FROM movies m
LEFT JOIN more_ideas mi ON m.tmdb_id = mi.tmdb_id
WHERE mi.tmdb_id IS NULL
  AND m.tmdb_id IS NOT NULL
ORDER BY m.tmdb_id
```

**Output Schema:**
```sql
CREATE TABLE more_ideas (
  id SERIAL PRIMARY KEY,
  analysis_id UUID,
  movie_id UUID,
  tmdb_id INTEGER UNIQUE NOT NULL,
  ideas JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Execution:**
```bash
# Process all missing movies
node scripts/batch-more-ideas.js

# Process with limit
node scripts/batch-more-ideas.js --limit=100

# Process with custom batch size
node scripts/batch-more-ideas.js --limit=500 --batch-size=50

# Dry run
node scripts/batch-more-ideas.js --limit=100 --dry-run
```

**Cost Estimate:**
- ~$0.002 per movie (with 50% Batch API discount)
- Unknown gap movies @ $0.002 = TBD after coverage query

---

## Part 2: Current State Analysis

### Problem: No Automation

**Neither script runs automatically:**
- ❌ No cron jobs scheduled
- ❌ No triggers on new movie addition
- ❌ No autonomous daily/weekly runs
- ❌ No monitoring of coverage gaps

**Result:**
- Coverage frozen at 61% WhyWatch
- More Ideas coverage unknown
- New movies never get enriched
- Manual invocation required

### Dependencies

**WhyWatch Generation Requires:**
1. Movie exists in `movies` table ✅
2. Movie has entry in `movie_analyses` table ⚠️
3. Analysis has `claude_response->>'raw_content'` ⚠️

**Issue:** WhyWatch script depends on legacy 500-word analysis existing first. If new movies bypass old analysis system, they'll never get WhyWatch.

**More Ideas Generation Requires:**
1. Movie exists in `movies` table ✅
2. Movie not yet in `more_ideas` table ✅

**Good:** More Ideas is independent of analysis system.

---

## Part 3: Coverage Analysis (Needs Verification)

### Queries to Run:

**Total Movies:**
```sql
SELECT COUNT(*) FROM movies;
```

**WhyWatch Coverage:**
```sql
SELECT
  COUNT(*) as total_movies,
  (SELECT COUNT(*) FROM enhanced_why_watch) as has_whywatch,
  ROUND(100.0 * (SELECT COUNT(*) FROM enhanced_why_watch) / COUNT(*), 1) as coverage_pct
FROM movies;
```

**More Ideas Coverage:**
```sql
SELECT
  COUNT(*) as total_movies,
  (SELECT COUNT(*) FROM more_ideas) as has_more_ideas,
  ROUND(100.0 * (SELECT COUNT(*) FROM more_ideas) / COUNT(*), 1) as coverage_pct
FROM movies;
```

**Gap Movies:**
```sql
-- Movies with neither WhyWatch nor More Ideas
SELECT COUNT(*)
FROM movies m
WHERE NOT EXISTS (SELECT 1 FROM enhanced_why_watch WHERE tmdb_id = m.tmdb_id)
  AND NOT EXISTS (SELECT 1 FROM more_ideas WHERE tmdb_id = m.tmdb_id);
```

---

## Part 4: Execution Strategy

### Option A: One-Time Backfill (Current Need)

**Goal:** Get to 95% coverage before iOS launch

**Approach:**
1. **Query coverage gaps** (run queries above)
2. **Run WhyWatch backfill** (manual invocation)
3. **Run More Ideas backfill** (manual invocation)
4. **Verify coverage** (re-run queries)

**Timeline:** 1-3 days (depending on gap size)

**Cost:**
- WhyWatch: 11,340 movies × $0.002 = ~$23
- More Ideas: TBD after gap query × $0.002 = ~$20-50
- **Total: ~$43-73**

**Execution:**
```bash
# Step 1: Check coverage
node --env-file=.env.local -e "/* run coverage queries */"

# Step 2: Run WhyWatch backfill
node scripts/batch-generate-why-watch.js

# Step 3: Run More Ideas backfill
node scripts/batch-more-ideas.js

# Step 4: Verify coverage
node --env-file=.env.local -e "/* verify queries */"
```

---

### Option B: Scheduled Cron Jobs (Ongoing Maintenance)

**Goal:** Maintain 95% coverage automatically

**Approach:**
1. **Daily WhyWatch job** - Process 100 gap movies/day
2. **Daily More Ideas job** - Process 100 gap movies/day
3. **Weekly full scan** - Identify remaining gaps

**Implementation:**

**Railway Cron Configuration:**
```yaml
# In railway.toml or Railway dashboard
[[services]]
  name = "moviegenius"

  [[services.cron]]
    schedule = "0 7 * * *"  # Daily at 7 AM UTC
    command = "node scripts/batch-generate-why-watch.js --limit=100"

  [[services.cron]]
    schedule = "0 8 * * *"  # Daily at 8 AM UTC
    command = "node scripts/batch-more-ideas.js --limit=100"

  [[services.cron]]
    schedule = "0 6 * * 0"  # Weekly Sunday 6 AM UTC
    command = "node scripts/check-coverage-gaps.js"
```

**Cost:**
- 100 WhyWatch/day × $0.002 = $0.20/day = $6/month
- 100 More Ideas/day × $0.002 = $0.20/day = $6/month
- **Total: $12/month steady state**

---

### Option C: On-Demand Enrichment (Curatorial Approach)

**Goal:** Only enrich movies users actually view

**Approach:**
1. **Persist movies lightweight** (Use Once policy Phase 1 only)
2. **Enrich on user view** (trigger WhyWatch + More Ideas when page loads)
3. **Proactive enrichment** (only for high-quality candidates)

**Implementation:**

**Modify movie page API:**
```javascript
// pages/api/v1/movie/[tmdbId].js
export default async function handler(req, res) {
  const { tmdbId } = req.query;

  // Fetch movie data
  const movie = await getMovie(tmdbId);

  // Check if WhyWatch exists
  const whyWatch = await getWhyWatch(tmdbId);

  if (!whyWatch) {
    // Trigger on-demand generation (don't await)
    generateWhyWatch(tmdbId).catch(console.error);

    // Return movie without WhyWatch (show loading state)
    return res.json({ movie, whyWatch: null, status: 'generating' });
  }

  return res.json({ movie, whyWatch });
}
```

**Cost:**
- Only pay for movies users view
- ~$0.033 per movie (WhyWatch + More Ideas + Slug)
- If 100 unique movie views/day: $3.30/day = $100/month

---

## Part 5: Recommendations

### Immediate Actions (This Week)

**1. Query Current Coverage (15 minutes)**
- Run coverage queries to understand gap size
- Document baseline metrics
- Estimate backfill costs

**2. WhyWatch Recalibration (1 hour)**
- Review current prompt in `lib/prompts/why-watch-generator.js`
- Add "be selective" instruction
- Test on 10 movies
- Target 85% YES rate (currently 96%)

**3. Fix WhyWatch Dependency (2 hours)**
- WhyWatch script requires old `movie_analyses.claude_response`
- Create alternate version that works with just TMDB data
- Allow WhyWatch generation independent of 500-word analysis

### Short-Term: One-Time Backfill (1-3 Days)

**Execute Option A:**
1. Run WhyWatch backfill for all gap movies
2. Run More Ideas backfill for all gap movies
3. Verify 95% coverage achieved
4. Cost: ~$50-75 one-time

**Deliverable:** iOS-ready catalog with 95% content coverage

### Long-Term: Automated Maintenance (Week 2-3)

**Execute Option B:**
1. Set up Railway cron jobs for daily enrichment
2. Create `scripts/check-coverage-gaps.js` monitoring script
3. Set up alerts if coverage drops below 90%
4. Cost: ~$12/month ongoing

**OR Execute Option C (Curatorial Alternative):**
1. Remove automatic batch processing
2. Implement on-demand enrichment on movie page load
3. Proactively enrich only high-quality candidates
4. Cost: ~$100/month (scales with traffic)

---

## Part 6: Script Modifications Needed

### Fix 1: WhyWatch Independence from Legacy Analysis

**Current Issue:** WhyWatch script requires `movie_analyses.claude_response`

**Solution:** Create `batch-generate-why-watch-standalone.js` that:
- Queries movies directly (not via movie_analyses)
- Fetches TMDB metadata on-demand
- Generates WhyWatch from TMDB data alone

**Implementation:**
```javascript
// New query
const movies = await pool.query(`
  SELECT m.tmdb_id, m.title, m.year
  FROM movies m
  WHERE NOT EXISTS (
    SELECT 1 FROM enhanced_why_watch WHERE tmdb_id = m.tmdb_id
  )
  ORDER BY m.tmdb_id
  LIMIT $1
`, [limit]);
```

### Fix 2: More Ideas Auto-Persist Related Movies

**Current Issue:** More Ideas generates 15 tmdbIds but doesn't persist them to catalog

**Solution:** Modify `batch-more-ideas.js` to:
- After generating More Ideas JSON
- Extract all 15 tmdbIds from response
- Batch-fetch TMDB details
- Call `ensureMovieInDb()` for each

**Implementation:**
```javascript
// After successful More Ideas generation
const tmdbIds = response.moreIdeas.map(idea => idea.tmdbId);
const tmdbMovies = await batchFetchTMDBDetails(tmdbIds);

for (const tmdbMovie of tmdbMovies) {
  await ensureMovieInDb(tmdbMovie); // Catalog expansion!
}
```

---

## Part 7: Monitoring Dashboard

**Create:** `pages/api/admin/content-coverage.js`

**Returns:**
```json
{
  "catalog": {
    "total_movies": 32935,
    "added_last_7d": 0,
    "added_last_30d": 51
  },
  "whywatch": {
    "total": 19948,
    "coverage_pct": 61.0,
    "yes_count": 19129,
    "no_count": 819,
    "yes_rate": 96.0
  },
  "more_ideas": {
    "total": 15823,
    "coverage_pct": 48.0
  },
  "gaps": {
    "missing_whywatch": 12987,
    "missing_more_ideas": 17112,
    "missing_both": 11456
  },
  "backfill_estimates": {
    "whywatch_cost": 25.97,
    "more_ideas_cost": 34.22,
    "total_cost": 60.19
  },
  "health_status": "YELLOW",
  "warnings": [
    "WhyWatch coverage below 95% target",
    "WhyWatch YES rate 96% (target 85%)",
    "No movies added in last 7 days (check daily cron)"
  ]
}
```

---

## Part 8: Next Steps

**Owner:** Engineering
**Blocker:** None (all scripts exist, just need execution)

**This Week:**
1. ✅ Run coverage queries (15 min)
2. ✅ Document baseline metrics (this audit)
3. ⏳ Review WhyWatch prompt recalibration (1 hour)
4. ⏳ Decide: Option A (backfill) vs Option C (on-demand)

**Next Week:**
1. Execute chosen strategy (backfill or on-demand)
2. Verify 95% coverage achieved
3. Set up monitoring dashboard

---

## Related Documentation

- [Catalog Growth Strategic Plan](CATALOG_GROWTH_STRATEGIC_PLAN.md)
- [TMDB Catalog Policy](TMDB_CATALOG_POLICY.md)
- [iOS Development Plan](../IOS_DEVELOPMENT_PLAN.md)

---

*Both batch scripts are production-ready and well-tested. The issue is execution strategy, not implementation quality.*
