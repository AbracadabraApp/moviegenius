# TMDB Catalog Policy

**Last Updated:** 2026-03-28

---

## The Policy

> Every movie that touches the system via a TMDB ID must have its full data persisted to the `movies` table.

The `movies` table is the canonical catalog. It grows over time as users search, browse, and interact with the site. TMDB is the source of truth for movie metadata — but it should only need to be called **once per movie**. After that, the DB serves all requests.

---

## Why This Matters

- **Catalog completeness** — the DB should accumulate every movie the site has ever seen
- **Resilience** — movie pages should be servable from DB alone, independent of TMDB availability
- **Consistency** — search results, movie pages, and collections all read from the same source

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
| `movie-search.js` | Full TMDB movie objects | Third duplicate, same gap |
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
| `tmdb-bulk.js` | Uses deprecated Supabase client instead of Railway Pool; caching broken |
| `ask-claude.js` | 7-day in-memory cache only; not persisted to DB |

---

## The Fix Plan

### Step 1 — Shared utility: `ensureMovieInDb(tmdbMovie)`

Create a single utility function in `lib/services/tmdb-persist.js`:

```javascript
// Given a raw TMDB movie object, upsert it into the movies table.
// Safe to call on every TMDB response — idempotent.
async function ensureMovieInDb(tmdbMovie, pool) { ... }
```

Fields to persist: `tmdb_id`, `title`, `year`, `poster_url`, `release_date`, `official_title`.

Uses `MovieService.upsertMovie()` from `lib/railway-db.js` — already implemented.

### Step 2 — Wire into search endpoints

In `enhanced-search.js` (and consolidate/remove the duplicates):
- After receiving TMDB search results, call `ensureMovieInDb()` for each movie result
- Fire-and-forget (don't await — don't slow the response)

### Step 3 — Wire into detail/list endpoints

- `tmdb-movie.js` — call `ensureMovieInDb()` before returning
- `new-releases.js` / `popular-movies.js` — call for each movie in list response
- `tmdb-streaming.js` — call `ensureMovieInDb()` first, then save streaming data to `movies.streaming_data`
- `tmdb-trailer.js` — call `ensureMovieInDb()` to guarantee row exists before saving trailer

### Step 4 — Fix tmdb-bulk.js

Replace Supabase client with Railway Pool. Use `MovieService.upsertMovie()` for all persistence.

### Step 5 — Consolidate duplicate search endpoints

Three endpoints (`enhanced-search.js`, `search-movies.js`, `movie-search.js`) call the same TMDB multi-search. Consolidate into one, deprecate the others.

---

## What Not to Fix

- **Search query caching** — not the goal. The policy is about persisting movie records, not caching search result sets.
- **Credits / person data** — out of scope for now. The `movies` table is the priority.
- **Streaming data completeness** — streaming availability changes; that's a separate freshness problem.

---

## Success Criteria

- Every movie returned by any TMDB API call has a row in `movies` with at minimum: `tmdb_id`, `title`, `year`, `poster_url`
- No TMDB ID ever touches the system without triggering an upsert
- `poster-zero-waste.js` pattern is the model all endpoints follow
