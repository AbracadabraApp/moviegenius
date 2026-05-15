# V2 Data Refresh Features (Deferred)

**Status:** Deferred to V2
**Reason:** Core metadata (title, year, poster) is static. Dynamic data refresh is optimization, not critical path.

---

## Overview

MovieGenius has two types of data with different refresh requirements:

### Static Metadata (V1 - Handled by UseOnce)
- Title, year, plot, cast, crew, poster
- **Changes:** Rarely (typo fixes, corrections)
- **Strategy:** Cache indefinitely, update only if reported issue
- **Refresh:** Not needed

### Dynamic Data (V2 - Requires Staleness Handling)
- Streaming availability (services, pricing, regions)
- Popularity scores
- User ratings count
- **Changes:** Weekly to monthly
- **Strategy:** Periodic refresh based on staleness
- **Refresh:** Needed

---

## Deferred to V2

### 1. Streaming Availability Refresh

**Current State:**
- Streaming data fetched on movie creation/request
- Never refreshed automatically
- Becomes stale over time (movies leave/join services weekly)

**V2 Implementation:**
```javascript
// Check staleness on movie page load
async function getStreamingData(movieId) {
  const movie = await getMovieByTmdbId(movieId);

  // If streaming data is older than 7 days, refresh
  if (!movie.streaming_updated_at ||
      isOlderThan(movie.streaming_updated_at, 7, 'days')) {

    const freshStreaming = await fetchStreamingFromTMDB(movieId);
    await updateStreamingData(movieId, freshStreaming);
    return freshStreaming;
  }

  return movie.streaming_data;
}
```

**Staleness thresholds:**
- High-traffic movies: 7 days
- Medium-traffic: 14 days
- Low-traffic: 30 days
- Never viewed: Never refresh (waste of API calls)

---

### 2. Popularity Score Refresh

**Current State:**
- Popularity fetched once on movie creation
- Never updated
- Recent movies can gain/lose popularity quickly

**V2 Implementation:**
```sql
-- Background job (weekly)
UPDATE movies
SET popularity = tmdb_latest.popularity,
    updated_at = NOW()
FROM (
  SELECT tmdb_id, popularity
  FROM tmdb_fresh_data
  WHERE tmdb_id IN (
    -- Only refresh movies viewed in last 30 days
    SELECT DISTINCT tmdb_id
    FROM movie_views
    WHERE viewed_at > NOW() - INTERVAL '30 days'
  )
) AS tmdb_latest
WHERE movies.tmdb_id = tmdb_latest.tmdb_id;
```

**Frequency:**
- Weekly batch job
- Only refresh recently-viewed movies
- Saves ~90% of API calls vs refreshing everything

---

### 3. User Ratings Count Refresh

**Current State:**
- Vote count fetched once
- Useful for "trending" signals
- Becomes stale for popular movies

**V2 Implementation:**
- Same as popularity refresh
- Batch weekly update
- Only for movies with >1000 votes (high-profile)

---

## Why Deferred to V2

### Cost vs Value

**Immediate refresh (V1):**
- Cost: High (continuous TMDB calls)
- Value: Low (data changes slowly)
- Risk: Rate limiting for minimal benefit

**Periodic refresh (V2):**
- Cost: Low (weekly batch, view-filtered)
- Value: Same (freshness within acceptable range)
- Risk: Minimal

### Priority

**V1 priorities:**
1. Build catalog (UseOnce)
2. Complete catalog (Enrichment Pipeline)
3. Core features (WhyWatch, Search, Browse)

**V2 priorities:**
1. Optimize user experience
2. Refresh dynamic data
3. Advanced features

Streaming staleness doesn't block V1 launch - most users won't notice 7-day-old streaming data.

---

## Technical Implementation (V2)

### Schema Changes

```sql
-- Track last refresh time per data type
ALTER TABLE movies
ADD COLUMN streaming_updated_at TIMESTAMP,
ADD COLUMN popularity_updated_at TIMESTAMP,
ADD COLUMN ratings_updated_at TIMESTAMP;

-- Track which movies need refresh
CREATE TABLE refresh_queue (
  id SERIAL PRIMARY KEY,
  movie_id UUID REFERENCES movies(id),
  refresh_type TEXT, -- 'streaming' | 'popularity' | 'ratings'
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_queue_priority ON refresh_queue(priority DESC, created_at);
```

### Refresh Worker

```javascript
// worker/refresh-dynamic-data.js

async function refreshStreamingData() {
  // Get movies needing refresh (staleness threshold)
  const staleMovies = await db.query(`
    SELECT m.tmdb_id, m.id
    FROM movies m
    WHERE m.streaming_updated_at IS NULL
       OR m.streaming_updated_at < NOW() - INTERVAL '7 days'
    ORDER BY m.popularity DESC
    LIMIT 100
  `);

  for (const movie of staleMovies.rows) {
    try {
      const streaming = await fetchStreamingFromTMDB(movie.tmdb_id);

      await db.query(
        'UPDATE movies SET streaming_data = $1, streaming_updated_at = NOW() WHERE id = $2',
        [streaming, movie.id]
      );

      console.log(`[Refresh] Updated streaming for ${movie.tmdb_id}`);

    } catch (error) {
      console.error(`[Refresh] Failed for ${movie.tmdb_id}:`, error);
    }

    await sleep(1000); // Rate limiting
  }
}

// Run daily
cron.schedule('0 2 * * *', refreshStreamingData); // 2 AM daily
```

### View-Based Prioritization

```javascript
// Only refresh movies people actually view
async function prioritizeRefresh() {
  await db.query(`
    INSERT INTO refresh_queue (movie_id, refresh_type, priority)
    SELECT
      m.id,
      'streaming' as refresh_type,
      COUNT(v.id) as priority  -- More views = higher priority
    FROM movies m
    JOIN movie_views v ON m.id = v.movie_id
    WHERE v.viewed_at > NOW() - INTERVAL '30 days'
      AND (m.streaming_updated_at IS NULL
           OR m.streaming_updated_at < NOW() - INTERVAL '7 days')
    GROUP BY m.id
    ON CONFLICT DO NOTHING
  `);
}
```

---

## Cost Estimates (V2)

### Without Staleness Handling
- 32,953 movies × 1 TMDB call/week = 4,707 calls/day
- Exceeds 10K limit if done poorly

### With Staleness + View-Filtering
- ~500 active movies/week (viewed in last 30 days)
- 500 × 1 TMDB call/week = 71 calls/day
- **98.5% reduction**

---

## Alternative: Accept Staleness

**Option:** Never refresh, accept stale data

**Pros:**
- Zero ongoing cost
- Simpler architecture
- Streaming data not critical to core experience

**Cons:**
- Streaming recommendations become outdated
- "Where to watch" section misleading
- Looks unprofessional if obviously wrong

**Decision:** Deferred to V2, then implement with view-filtering to minimize cost

---

## Migration Path

### V1 (Current)
- Fetch streaming on movie creation
- Never refresh
- Accept staleness

### V1.5 (Transition)
- Add staleness tracking columns
- Log which movies would need refresh
- Gather data on view patterns

### V2 (Full Implementation)
- Implement refresh worker
- Enable view-based prioritization
- Monitor API usage and adjust thresholds

---

## Success Metrics (V2)

**When refresh is working:**
- Streaming data < 7 days old for active movies
- TMDB calls < 200/day for refresh
- User complaints about outdated data: 0

**When refresh can be tuned:**
- High API usage (> 500/day)
- Low user engagement with streaming data
- Staleness threshold too aggressive

---

## FAQ

### Q: Why not refresh everything weekly?

**A:** Cost and waste. 90% of movies are never viewed. Refreshing them wastes API calls for zero benefit.

### Q: What if a user views a movie with 30-day-old streaming data?

**A:** We refresh on view if stale. They see old data for ~1 second, then fresh data. Acceptable UX trade-off.

### Q: Should we refresh analysis/WhyWatch?

**A:** **No.** These are generated content, not external data. They don't "go stale" - they're opinions that remain valid indefinitely. Only refresh if we improve generation quality and want to regenerate.

### Q: What about new movies that haven't been enriched yet?

**A:** Enrichment Pipeline handles those (see UNIFIED_MOVIE_LIFECYCLE_PROBLEM.md). Refresh is for *keeping existing data fresh*, not completing incomplete movies.

---

## Related Docs

- `/docs/strategies/USEONCE_POLICY.md` - How static metadata is cached
- `/docs/strategies/UNIFIED_MOVIE_LIFECYCLE_PROBLEM.md` - Enrichment pipeline for completion
- `/docs/V2_SEARCH_FEATURES.md` - Other V2 deferred features

---

**Document Status:**
- Version: 1.0
- Owner: Engineering
- Review: Before V2 planning (Q3 2026)
