# TMDB Catalog Policy

**Last Updated:** 2026-03-29

---

## The Policy

> Every movie that touches the system via a TMDB ID must have its full data persisted to the `movies` table. A new movie row triggers background generation of slug, More Ideas, and Why Watch — independent of page display.

The `movies` table is the canonical catalog. It grows over time as users search, browse, and interact with the site. TMDB is the source of truth for movie metadata — but it should only need to be called **once per movie**. After that, the DB serves all requests.

The three Claude-generated fields — slug, More Ideas, and Why Watch — are enrichment that arrives asynchronously. A movie page can render without them. They fill in on a future load once generated.

---

## Why This Matters

- **Catalog completeness** — the DB accumulates every movie the site has ever seen
- **No repeat backfills** — slug, More Ideas, and Why Watch generate once at insert time, never again
- **Resilience** — movie pages are servable from DB alone, independent of TMDB availability
- **Consistency** — search results, movie pages, and collections all read from the same source

---

## The Two-Phase Model

### Phase 1 — On first TMDB encounter (fast, synchronous)

`ensureMovieInDb(tmdbMovie)` upserts the movie row with core metadata:

- `tmdb_id`, `title`, `year`, `poster_url`, `release_date`, `official_title`

If the row already exists, this is a no-op. Safe to call on every TMDB response.

### Phase 2 — Background enrichment (async, fire-and-forget)

If the upsert created a **new** row (i.e. the movie was not previously in the DB), kick off three background jobs — none of which block the current request:

| Job | Output | Model |
|-----|--------|-------|
| Generate slug | `movies.slug` | Claude Haiku (30–100 char tagline) |
| Generate More Ideas | `more_ideas` table (15 related TMDB IDs + reasoning) | Claude |
| Generate Why Watch | `enhanced_why_watch` table (YES/NO + 3 reasons) | Claude |

These are independent jobs. Any one can fail without affecting the others. Results appear on next page load — the page renders fine without them in the meantime.

---

## Current State: Where the Policy Is Working

These endpoints correctly implement the fetch-once-persist pattern:

| Endpoint | Pattern |
|----------|---------|
| `poster-zero-waste.js` | DB first → TMDB fallback → auto-save ✅ |
| `cache-movie-data.js` | DB check → TMDB fetch → INSERT on conflict ✅ |
| `lib/railway-db.js` `MovieService.upsertMovie()` | Centralised upsert utility (ready to use) ✅ |

---

## Current Gaps: Where Movies Are Lost

These endpoints receive full TMDB movie data but discard it without persisting:

### Tier 1 — High volume, zero persistence

| Endpoint | What it receives | Impact |
|----------|-----------------|--------|
| `enhanced-search.js` | Full TMDB movie objects per search query | Every search is a missed catalog write |
| `search-movies.js` | Full TMDB movie objects | Duplicate of above, same gap |
| `movie-search.js` | Full TMDB movie objects | Duplicate, same gap |
| `multi-search.js` | Full TMDB movie objects | Duplicate, same gap |
| `search.js` | Full TMDB movie objects | Duplicate, same gap |
| `new-releases.js` | Lists of full TMDB movie objects | Carousel loads = free catalog data, discarded |
| `popular-movies.js` | Lists of full TMDB movie objects | Same |
| `tmdb-movie.js` | Full movie details for a specific ID | Direct detail fetch, nothing saved |

### Tier 2 — Has tmdb_id, skips movie record

| Endpoint | Gap |
|----------|-----|
| `tmdb-streaming.js` | Saves streaming data to memory cache only; no movie record guaranteed |
| `movie-credits.js` | Has `tmdb_id`, fetches credits, never ensures movie row exists |
| `tmdb-trailer.js` | Saves trailer only if movie already in DB; no insert path |

### Tier 3 — Partial / unclear

| Endpoint | Gap |
|----------|-----|
| `tmdb-bulk.js` | Partially migrated: imports Railway Pool but falls back to Supabase adapter for movie upserts; persistence broken |
| `ask-claude.js` | 7-day in-memory cache only; not persisted to DB |

---

## The Fix Plan

### Step 1 — Consolidate duplicate search endpoints

Five endpoints call the same TMDB `/search/multi`: `enhanced-search.js`, `search-movies.js`, `movie-search.js`, `multi-search.js`, `search.js`. Consolidate into one, deprecate the rest. **Do this first** — otherwise the persistence fix lands in 5 files and 4 get deleted.

Note: `simple-search.js` and `universal-search.js` do not call TMDB directly and are not part of this consolidation.

### Step 2 — Shared utility: `ensureMovieInDb(tmdbMovie)`

Create a single utility function in `lib/services/tmdb-persist.js`:

```javascript
// Given a raw TMDB movie object, upsert it into the movies table.
// Returns { isNew: boolean } so callers can decide whether to trigger enrichment.
// Safe to call on every TMDB response — idempotent.
async function ensureMovieInDb(tmdbMovie, pool) {
  const result = await MovieService.upsertMovie(tmdbMovie);
  return { isNew: result.created };
}
```

Uses `MovieService.upsertMovie()` from `lib/railway-db.js` — already implemented.

### Step 3 — Trigger background enrichment for new movies

In `lib/services/tmdb-persist.js`, add a `triggerEnrichment(tmdbId)` function that fires three independent background jobs when `isNew === true`:

```javascript
// Fire-and-forget — does not block the caller
async function triggerEnrichment(tmdbId) {
  generateSlug(tmdbId).catch(() => {});
  generateMoreIdeas(tmdbId).catch(() => {});
  generateWhyWatch(tmdbId).catch(() => {});
}
```

Each job checks whether its output already exists before calling Claude — safe to call redundantly.

> **Railway vs Vercel:** MovieGenius runs on Railway, which keeps the Node.js process alive after the response is sent. Fire-and-forget background jobs will complete. This pattern would be unreliable on Vercel (process freezes on response). No job queue or worker service is needed.

### Step 4 — Wire into search and detail endpoints

In the consolidated search endpoint and in `tmdb-movie.js`:

```javascript
const { isNew } = await ensureMovieInDb(tmdbMovie);
if (isNew) triggerEnrichment(tmdbMovie.id);
```

Fire-and-forget on `ensureMovieInDb` too for search results (don't await — don't slow the response). For `tmdb-movie.js` (direct page load), awaiting the upsert is acceptable since the response already depends on DB.

### Step 5 — Wire into list and ancillary endpoints

- `new-releases.js` / `popular-movies.js` — call `ensureMovieInDb()` for each movie in list, fire-and-forget
- `tmdb-streaming.js` — call `ensureMovieInDb()` first, then save streaming data
- `tmdb-trailer.js` — call `ensureMovieInDb()` to guarantee row exists before saving trailer

### Step 6 — Fix tmdb-bulk.js

Replace Supabase adapter with Railway Pool. Use `MovieService.upsertMovie()` for all persistence.

---

## What Not to Fix

- **Search query caching** — not the goal. The policy is about persisting movie records, not caching search result sets.
- **Credits / person data** — out of scope. The `movies` table is the priority.
- **Streaming data freshness** — streaming availability changes over time; that's a separate staleness problem.
- **Enrichment for search-result movies** — only trigger enrichment for movies a user explicitly loads (via `tmdb-movie.js`), not every movie that appears in a search result list. Enriching search results would be expensive and mostly wasted.

---

## Success Criteria

- Every movie returned by a direct TMDB fetch (`tmdb-movie.js`) has a row in `movies` immediately
- Every movie appearing in search/list results has a row within the same request, fire-and-forget
- New movies trigger slug, More Ideas, and Why Watch generation automatically — no manual backfills
- `poster-zero-waste.js` pattern is the model all endpoints follow
