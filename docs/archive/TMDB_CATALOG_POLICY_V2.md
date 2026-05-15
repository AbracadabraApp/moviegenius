# TMDB UseOnce Catalog Policy (Version 2)

**Last Updated:** 2026-05-10
**Status:** MANDATORY — All API endpoints MUST comply

---

## Core Principle

> **Every TMDB movie that enters the system MUST be persisted to the `movies` table AND trigger background enrichment if new. No exceptions.**

This is not optional. This is not best-practice guidance. **This is a mandatory architectural requirement** that prevents catalog stagnation and ensures data completeness.

---

## The Problem This Solves

**Without UseOnce enforcement:**
- ❌ Search results return 20 movies → 20 movies discarded, catalog unchanged
- ❌ Browse carousels load 100 movies → 100 movies discarded, catalog unchanged
- ❌ Users search for new releases → New movies never enter database
- ❌ Catalog stagnates at 32,950 movies while TMDB has 1M+
- ❌ Manual backfills required every time we want new content
- ❌ Slug, WhyWatch, MoreIdeas coverage gaps (never generated)

**With UseOnce enforcement:**
- ✅ Every TMDB interaction grows the catalog automatically
- ✅ New releases appear in database immediately
- ✅ Enrichment (slug, WhyWatch, MoreIdeas) triggers once at insert time
- ✅ No manual backfills ever needed again
- ✅ Catalog grows organically as users interact with the site

---

## The Two-Phase Contract

### Phase 1: Persist (MANDATORY, SYNCHRONOUS)

**Function:** `ensureMovieInDb(tmdbMovie)`

**What it does:**
- Upserts core TMDB metadata to `movies` table
- Returns `{ isNew: boolean }` to indicate if this is first time seeing this movie
- Safe to call repeatedly (idempotent)
- Does NOT overwrite enrichment fields (slug, streaming_data) if they exist

**Required fields inserted:**
- `tmdb_id` (unique constraint)
- `title`
- `official_title`
- `year`
- `release_date`
- `poster_url`

**When to call:** Immediately upon receiving TMDB movie data, before responding to client.

### Phase 2: Enrich (MANDATORY FOR NEW MOVIES, ASYNC)

**Function:** `triggerEnrichment(tmdbId)`

**What it triggers:**
1. **Slug generation** → Claude Haiku → 30-100 char marketing tagline → `movies.slug`
2. **WhyWatch generation** → Claude Sonnet → YES/NO + 3 reasons → `enhanced_why_watch` table
3. **MoreIdeas generation** → Claude Sonnet → 15 related TMDB IDs → `more_ideas` table

**When to trigger:** Only when `isNew === true` (prevents re-enriching existing movies).

**Execution model:** Fire-and-forget (does not block API response). Railway keeps process alive to complete.

### Convenience Function: `useOnce(tmdbMovie)`

**Recommended usage pattern:**
```javascript
import { useOnce } from '../../lib/services/tmdb-persist';

// This handles BOTH phases automatically
await useOnce(tmdbMovie);
```

**What it does:**
1. Calls `ensureMovieInDb(tmdbMovie)`
2. If `isNew === true`, calls `triggerEnrichment(tmdbId)` in background
3. Returns `{ isNew }` so you can log/track new additions

---

## Mandatory Implementation Rules

### Rule 1: ALL endpoints that receive TMDB movie data MUST call `useOnce`

**Applies to:**
- ✅ Search endpoints (`multi-search.js`, `simple-search.js`, etc.)
- ✅ List endpoints (`new-releases.js`, `popular-movies.js`, `trending.js`)
- ✅ Detail endpoints (`tmdb-movie.js`, `/api/v1/movie/[tmdbId].js`)
- ✅ Streaming/trailer/credits endpoints that have `tmdb_id`
- ✅ Catalog refresh jobs (`scripts/refresh-catalog.js`)

**No exceptions.**

### Rule 2: Fire-and-forget for list/search endpoints (don't block response)

```javascript
// ✅ CORRECT: Fire-and-forget for search results
movieResults.forEach(movie => {
  useOnce(movie).catch(() => {}); // Don't await
});

return res.json({ movies: movieResults }); // Response not blocked
```

```javascript
// ❌ WRONG: Awaiting persistence blocks search response
for (const movie of movieResults) {
  await useOnce(movie); // Adds 20-100ms per movie!
}
return res.json({ movies: movieResults }); // Slow response
```

### Rule 3: Await for detail endpoints (guarantee persistence before response)

```javascript
// ✅ CORRECT: Detail page guarantees movie in DB
const tmdbData = await fetchFromTMDB(id);
await useOnce(tmdbData); // Ensures row exists
return res.json(tmdbData); // DB now has complete record
```

### Rule 4: Never skip enrichment triggers for new movies

```javascript
// ❌ WRONG: Only Phase 1 (persist), missing Phase 2 (enrich)
await ensureMovieInDb(tmdbMovie); // Missing enrichment!

// ✅ CORRECT: Both phases
await useOnce(tmdbMovie); // Persists + triggers enrichment
```

```javascript
// ✅ ALSO CORRECT: Manual control of both phases
const { isNew } = await ensureMovieInDb(tmdbMovie);
if (isNew) {
  triggerEnrichment(tmdbMovie.id).catch(() => {});
}
```

---

## Enforcement Checklist

Before deploying ANY API endpoint that touches TMDB data:

- [ ] Imports `useOnce` from `lib/services/tmdb-persist`
- [ ] Calls `useOnce(tmdbMovie)` for every TMDB movie object received
- [ ] For search/list: Fire-and-forget (don't await)
- [ ] For detail: Await to guarantee persistence
- [ ] Tested locally: New movies trigger enrichment jobs
- [ ] Verified: Check `movies` table row count increases
- [ ] Verified: Check Railway logs for enrichment job execution

---

## Current Implementation Status (AUDIT)

### ✅ Compliant Endpoints

| Endpoint | Pattern | Notes |
|----------|---------|-------|
| `refresh-catalog.js` | Calls `useOnce` | ✅ Fire-and-forget for lists |
| `popular-movies.js` | Calls `useOnce` | ✅ Fire-and-forget |
| `new-releases.js` | Calls `useOnce` | ✅ Fire-and-forget |

### ⚠️ Partial Compliance (Missing Enrichment)

| Endpoint | Issue | Fix Required |
|----------|-------|--------------|
| `tmdb-movie.js` | Only calls `ensureMovieInDb` | Change to `useOnce` |
| `multi-search.js` | Only calls `ensureMovieInDb` | Change to `useOnce` |

### ❌ Non-Compliant Endpoints

| Endpoint | Issue | Fix Required |
|----------|-------|--------------|
| `simple-search.js` | No persistence at all | Add `useOnce` for TMDB fallback |
| `universal-search.js` | Unknown | Audit needed |
| `tmdb-streaming.js` | No persistence | Add `useOnce` before saving streaming |
| `tmdb-trailer.js` | No persistence | Add `useOnce` before saving trailer |
| `movie-credits.js` | No persistence | Add `useOnce` before returning credits |

---

## Migration Guide

### Step 1: Identify all TMDB-touching endpoints

```bash
# Find all API endpoints that call TMDB
grep -r "api.themoviedb.org" pages/api/
grep -r "TMDB_API_KEY\|TMDB_BEARER_TOKEN" pages/api/
```

### Step 2: Add import

```javascript
import { useOnce } from '../../lib/services/tmdb-persist';
```

### Step 3: Implement pattern

**For search/list endpoints:**
```javascript
const tmdbResponse = await fetchFromTMDB(query);
const movies = tmdbResponse.results;

// Persist all movies (fire-and-forget)
movies.forEach(movie => {
  useOnce(movie).catch(err => {
    console.error(`UseOnce failed for ${movie.id}:`, err);
  });
});

return res.json({ movies });
```

**For detail endpoints:**
```javascript
const tmdbMovie = await fetchFromTMDB(id);

// Guarantee persistence before responding
const { isNew } = await useOnce(tmdbMovie);

if (isNew) {
  console.log(`🆕 New movie added: ${tmdbMovie.title} (${tmdbMovie.id})`);
}

return res.json(tmdbMovie);
```

### Step 4: Test locally

```bash
# Start dev server
npm run dev

# Trigger endpoint (example)
curl -X POST http://localhost:3000/api/multi-search \
  -H "Content-Type: application/json" \
  -d '{"query":"Inception"}'

# Check database
psql $DATABASE_URL -c "SELECT title, created_at FROM movies ORDER BY created_at DESC LIMIT 5;"

# Check enrichment triggered (Railway logs)
# Should see: "🆕 New movie added: Inception (27205)"
# Should see: "Triggering slug generation for 27205"
# Should see: "Triggering WhyWatch generation for 27205"
# Should see: "Triggering MoreIdeas generation for 27205"
```

---

## Testing Requirements

### Unit Test Pattern

```javascript
// __tests__/api/multi-search.test.js
import { useOnce } from '../../lib/services/tmdb-persist';

jest.mock('../../lib/services/tmdb-persist');

test('multi-search persists all TMDB results', async () => {
  const mockMovies = [
    { id: 1, title: 'Movie A', release_date: '2024-01-01' },
    { id: 2, title: 'Movie B', release_date: '2024-02-01' },
  ];

  // Mock TMDB response
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ results: mockMovies }),
    })
  );

  const req = { method: 'POST', body: { query: 'test' } };
  const res = mockResponse();

  await handler(req, res);

  // Verify useOnce called for each movie
  expect(useOnce).toHaveBeenCalledTimes(2);
  expect(useOnce).toHaveBeenCalledWith(mockMovies[0]);
  expect(useOnce).toHaveBeenCalledWith(mockMovies[1]);
});
```

### Integration Test Pattern

```javascript
// scripts/test-useonce-integration.js
import { useOnce } from '../lib/services/tmdb-persist.js';
import { getPool } from '../lib/database.js';

async function testUseOnce() {
  const pool = getPool();

  // Get initial movie count
  const before = await pool.query('SELECT COUNT(*) FROM movies');
  const countBefore = parseInt(before.rows[0].count);

  console.log(`📊 Movies before: ${countBefore}`);

  // Test movie (use obscure TMDB ID unlikely to be in DB)
  const testMovie = {
    id: 999999, // Fake ID for testing
    title: 'Test Movie',
    release_date: '2024-01-01',
    poster_path: '/test.jpg'
  };

  const { isNew } = await useOnce(testMovie);

  // Check movie was persisted
  const after = await pool.query('SELECT COUNT(*) FROM movies');
  const countAfter = parseInt(after.rows[0].count);

  console.log(`📊 Movies after: ${countAfter}`);
  console.log(`🆕 Was new movie: ${isNew}`);

  if (countAfter === countBefore + 1) {
    console.log('✅ UseOnce test PASSED');
  } else {
    console.error('❌ UseOnce test FAILED');
  }

  // Wait 5 seconds for enrichment jobs to trigger
  console.log('⏳ Waiting for enrichment jobs...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('✅ Check Railway logs for enrichment job execution');

  await pool.end();
}

testUseOnce();
```

---

## Monitoring & Observability

### Metrics to Track

1. **Catalog growth rate**
   ```sql
   SELECT DATE(created_at), COUNT(*) as new_movies
   FROM movies
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY DATE(created_at)
   ORDER BY DATE(created_at) DESC;
   ```

2. **Enrichment coverage**
   ```sql
   SELECT
     COUNT(*) as total_movies,
     COUNT(slug) as has_slug,
     COUNT(CASE WHEN slug IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as slug_coverage_pct
   FROM movies;
   ```

3. **Recent additions**
   ```sql
   SELECT tmdb_id, title, year, created_at
   FROM movies
   ORDER BY created_at DESC
   LIMIT 20;
   ```

### Alert Conditions

**🚨 Alert if:**
- No new movies added in 24 hours (catalog stagnation)
- Enrichment coverage drops below 85% (jobs failing)
- Catalog growth rate < 10 movies/day (policy not enforced)

### Railway Logs to Monitor

**Expected log patterns when UseOnce working:**
```
🆕 New movie added: Dune: Part Two (693134)
🎨 Triggering slug generation for 693134
💡 Triggering WhyWatch generation for 693134
🎬 Triggering MoreIdeas generation for 693134
✅ Slug generated: "Sand, spice, and destiny collide in epic sequel"
✅ WhyWatch generated: YES (3 reasons)
✅ MoreIdeas generated: 15 related movies
```

**🚨 Warning signs:**
```
❌ Enrichment trigger failed for 693134: Connection timeout
⚠️ WhyWatch generation error: Rate limit exceeded
⚠️ MoreIdeas generation skipped: Movie already has data
```

---

## Cost Implications

### Per New Movie

| Job | Model | Tokens | Cost |
|-----|-------|--------|------|
| Slug | Claude Haiku | ~150 | $0.003 |
| WhyWatch | Claude Sonnet | ~800 | $0.015 |
| MoreIdeas | Claude Sonnet | ~800 | $0.015 |
| **Total** | | | **$0.033/movie** |

### Monthly Estimates

**Scenario 1: Passive growth (20 new movies/day)**
- 20 movies/day × $0.033 = $0.66/day
- **~$20/month**

**Scenario 2: Active discovery (100 new movies/day)**
- 100 movies/day × $0.033 = $3.30/day
- **~$100/month**

**Scenario 3: Backfill (1,000 movies)**
- 1,000 movies × $0.033 = **$33 one-time**

**Note:** These costs apply ONLY to NEW movies. Existing 32,950 movies are never re-enriched.

---

## Success Criteria

**The UseOnce policy is working when:**

✅ **Catalog grows automatically** (no manual intervention)
✅ **Every search adds new movies** (if not already in DB)
✅ **Enrichment triggers immediately** (slug/WhyWatch/MoreIdeas queued)
✅ **No duplicate enrichment** (existing movies not re-processed)
✅ **Coverage stays high** (>85% movies have slug/WhyWatch)
✅ **Zero manual backfills** (system self-maintains)

**The policy is failing when:**

❌ Catalog count unchanged for 24+ hours
❌ New releases not appearing in database
❌ Enrichment coverage declining over time
❌ Manual backfill scripts required

---

## FAQ

### Q: Why not batch-persist at end of day instead of real-time?

**A:** Real-time persistence ensures:
1. Movie detail pages work immediately (no 404s)
2. Slug/WhyWatch/MoreIdeas start generating right away
3. No data loss if job crashes mid-batch
4. Users see fresh content immediately

### Q: What if enrichment jobs fail?

**A:** Enrichment is **resilient**:
- Each job checks if output already exists before running
- Safe to retry/re-trigger manually
- Independent jobs (slug failure doesn't block WhyWatch)
- Fire-and-forget (doesn't block API response)

### Q: Should we enrich every movie in search results?

**A:** **No.** Only persist. Enrichment is expensive ($0.033/movie).

**Strategy:**
- Search results: Persist only (Phase 1)
- Movie detail pages: Persist + enrich (Phase 1 + 2)
- User visits movie page → Enrichment triggers → Future visitors see enriched data

This means:
- Searching for "Inception" → Persists Inception to DB
- User clicks Inception → Triggers enrichment jobs
- Next user sees slug, WhyWatch, MoreIdeas

### Q: What about TMDB data staleness?

**A:** `ensureMovieInDb` uses `ON CONFLICT DO UPDATE` to refresh:
- `title`, `year`, `poster_url` → Always updated
- `slug`, `streaming_data` → Never overwritten (curated data)

Streaming data staleness is separate problem (out of scope for UseOnce).

---

## Rollout Plan

### Phase 1: Fix partial implementations (Week 1)

- [ ] `tmdb-movie.js` → Change `ensureMovieInDb` to `useOnce`
- [ ] `multi-search.js` → Change `ensureMovieInDb` to `useOnce`

### Phase 2: Add to non-compliant endpoints (Week 2)

- [ ] `simple-search.js` → Add `useOnce` to TMDB fallback
- [ ] `tmdb-streaming.js` → Add `useOnce` before saving streaming data
- [ ] `tmdb-trailer.js` → Add `useOnce` before saving trailer
- [ ] `movie-credits.js` → Add `useOnce` before returning credits

### Phase 3: Audit and verify (Week 3)

- [ ] Run integration tests on all endpoints
- [ ] Monitor catalog growth for 7 days
- [ ] Verify enrichment coverage stays >85%
- [ ] Document any endpoints that need exceptions

### Phase 4: Enforce via CI/CD (Week 4)

- [ ] Add pre-commit hook checking for `useOnce` usage
- [ ] Add test requiring all TMDB endpoints to import `tmdb-persist`
- [ ] Update CLAUDE.md with UseOnce as locked pattern
- [ ] Create violation detection script

---

## Appendix: Code Reference

### Current Implementation

**File:** `lib/services/tmdb-persist.js`

```javascript
export async function ensureMovieInDb(tmdbMovie)
export async function triggerEnrichment(tmdbId)
export async function useOnce(tmdbMovie)
```

### Import Pattern

```javascript
import { useOnce } from '../../lib/services/tmdb-persist';
// OR
import { ensureMovieInDb, triggerEnrichment } from '../../lib/services/tmdb-persist';
```

### Railway Environment

- ✅ Process stays alive after response (background jobs complete)
- ✅ No worker queue needed (simple fire-and-forget works)
- ✅ Logs visible in Railway dashboard

### Database Schema

```sql
CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  official_title VARCHAR(255),
  year INTEGER,
  release_date DATE,
  poster_url TEXT,
  slug TEXT, -- Generated by enrichment, not overwritten
  streaming_data TEXT, -- Saved separately, not overwritten
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Document History

- **v1.0** (2026-03-29): Initial policy documentation
- **v2.0** (2026-05-10): Strengthened enforcement, audit, testing, FAQ

---

**This policy is MANDATORY and NON-NEGOTIABLE. No exceptions without explicit architectural review.**
