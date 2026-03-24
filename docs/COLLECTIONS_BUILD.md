# Collections Build

**Status:** Phase 1 complete (10,125 collections). Phase 2 (editorial prose) not yet written.
**Owner:** Josh
**Last updated:** 2026-03-24

---

## What This Is

MovieGenius has ~827 browse lists (e.g. "Cold War Spy Films", "Parent-Child Body Swap Films"). The collections pipeline turns those bare titles into fully-rendered editorial pages — subcategories, movie lists, posters, and eventually prose annotations.

The rendered page lives at `/collection/:id`.

---

## Current State

| Phase | Script | Status |
|---|---|---|
| 0 — Title curation | `browse-curate.cjs` | Done (pre-existing) |
| 1 — Movie structure | `collection-structure.cjs` | **Done — 10,125 collections** |
| 2 — Prose fill | `collection-descriptions.cjs` | Not yet written |

**10,125 collections have full `editorial_data` with `tmdb_id` on every movie.**
**6 collections remain `editorial_data IS NULL`** — obscure documentary topics with no resolvable films.

There are also 117 collections with `editorial_data` from an older pipeline (`browse-collection-pages.cjs`) using a different schema — treat those as legacy, do not overwrite.

---

## Data Schema

### `browse_lists` table (relevant columns)

```
id               UUID
title            VARCHAR(200)     original title
revised_title    VARCHAR(200)     curated title (use COALESCE(revised_title, title))
status           VARCHAR(20)      'active' | 'archived' | 'merged'
editorial_data   JSONB            see below
total_movies     INTEGER
updated_at       TIMESTAMP
```

### `editorial_data` shape (Phase 1 output)

```json
{
  "subtitle": null,
  "subcategories": [
    {
      "name": "Classic European Immersion",
      "description": null,
      "movies": [
        {
          "title": "Roman Holiday",
          "year": 1953,
          "tmdb_id": 804,
          "note": null
        }
      ]
    }
  ]
}
```

**`null` fields are intentional placeholders for Phase 2.**
`tmdb_id` is always resolved in Phase 1.

---

## Phase 1 — Movie Structure (`collection-structure.cjs`)

**What it does:**
- Asks Claude (Sonnet 4.6) to generate 4–5 subcategories with 5–8 movies each for a given collection title
- Resolves every movie to a `tmdb_id` via 4-pass DB + TMDB API lookup
- Saves to `browse_lists.editorial_data`
- Accepts whatever Claude returns — no strict count enforcement

**Run:**
```bash
# Dry run (no DB writes, shows per-movie ID resolution)
node --env-file=.env.local scripts/collection-structure.cjs --dry-run --limit 5

# Live, all pending
node --env-file=.env.local scripts/collection-structure.cjs

# Live, limited batch
node --env-file=.env.local scripts/collection-structure.cjs --limit 50
```

**Picks up:** `WHERE status = 'active' AND editorial_data IS NULL`

**Cost:** ~$0.013/collection at 10 concurrency. Full run of 10,067 collections = $127.

**TMDB resolution passes:**
1. Exact `(title, year)` match in DB
2. Case-insensitive title + `±5 years`
3. Longest word (4+ chars) ILIKE + `±5 years`
4. TMDB API `/search/movie` (handles accents, alternate titles) — uses `NEXT_PUBLIC_TMDB_API_KEY` (v3 query param) or `TMDB_BEARER_TOKEN` (v4 Bearer header)

**Warnings (not failures):** If a movie is missing a title or a subcategory comes back thin, it logs `⚠` and saves anyway. Only hard failure is an empty/unparseable response.

---

## Phase 2 — Prose Fill _(not yet built)_

**Goal:** Fill the three `null` fields left by Phase 1:

| Field | Level | Description |
|---|---|---|
| `subtitle` | collection | One sentence. What unites these films. |
| `description` | subcategory | One sentence. What defines this subcategory. |
| `note` | movie | One sentence. Why this specific film belongs here. |

**Suggested approach:**
- New script: `collection-descriptions.cjs`
- Input: existing `editorial_data` (subcategory names + movie titles/years already known)
- Model: Haiku (cheap, these are short strings)
- Single Claude call per collection — pass full structure, get all fields back in one response
- Picks up: `WHERE editorial_data IS NOT NULL AND editorial_data->>'subtitle' IS NULL`
- Concurrency: 20+ (Haiku is fast and cheap)

**Prompt sketch:**
```
Given the collection "{title}", fill in the editorial annotations.

Return JSON only:
{
  "subtitle": "one sentence describing the collection",
  "subcategories": [
    {
      "name": "...",  // unchanged — return as given
      "description": "one sentence",
      "movies": [
        { "tmdb_id": 804, "note": "one sentence why this film belongs" }
      ]
    }
  ]
}
```

Note: use `tmdb_id` as the key (not title) so matching back is unambiguous.

---

## Rendering Pipeline

```
browse_lists.editorial_data
        ↓
GET /api/collection?id={uuid}          pages/api/collection.js
  — fetches editorial_data
  — extracts all tmdb_ids
  — joins movies table for poster_url
        ↓
/collection/[id].js                    pages/collection/[id].js
  — calls API on mount
  — passes collection + movies to component
        ↓
<CollectionPage>                       components/CollectionPage.js
  — gold gradient hero header
  — title, subtitle, tally
  — subcategory sections with MediaCard grid
```

**Movie matching** in `CollectionPage.js` (line 56–58):
```js
subcategory.movies?.some(sm => sm.tmdb_id === m.tmdb_id)
```
This is why `tmdb_id` must be present — without it subcategories render empty.

---

## Key Files

| File | Purpose |
|---|---|
| `scripts/collection-structure.cjs` | Phase 1 — movie selection + TMDB resolution |
| `scripts/collection-descriptions.cjs` | Phase 2 — prose fill _(to be written)_ |
| `pages/api/collection.js` | Serves collection data to frontend |
| `pages/collection/[id].js` | Route page — fetches and wires data |
| `components/CollectionPage.js` | Renders the collection UI |
| `components/MediaCard.js` | **Locked** — individual movie card, do not modify |

---

## Decisions Made

1. **Phase 2 prompt design** — `subtitle` output last in the JSON so the model writes all subcategory/movie copy first, then summarizes. Single call per collection (no split passes).

2. **Legacy collections** — keep as-is. `CollectionPage.js` already handles both shapes via `subcategory.movie_ids?.includes()` fallback. Migration deferred until a tag-filter UI exists.

3. **`total_movies` accuracy** — non-issue. `CollectionPage.js` renders `movies.length` (the live join result), not `total_movies` from the row. No update needed.

4. **Scale plan** — ran full Phase 1 in one overnight pass. 10,125 collections, 0 failures, ~$127.

5. **Collection discovery** — open. Collections are only reachable via direct URL or `NetflixCarousel` "View All" links. A `/browse` index page is needed before collections have meaningful reach.

## Known Issues

- **6 collections permanently stuck at `editorial_data IS NULL`** — obscure documentary topics (e.g. "Vanishing Traditional Crafts Documentaries") with no resolvable films in DB or TMDB. Not worth pursuing.
- **~2% TMDB miss rate** across Phase 1 collections — niche/foreign films genuinely absent from catalog. Movies with `tmdb_id: null` are silently dropped by `CollectionPage.js` (subcategory renders empty if all movies unresolved).
- **`pages/api/collection.js` contains hardcoded mock data** for the `demo` collection ID — dead weight, should be removed before public launch.
