# Genius Feed

**Last Updated:** 2026-03-28

---

## Overview

The Genius feed is a personalized movie recommendation feed driven by the **More Ideas graph** — a pre-computed set of 15 related movies per film stored in the `more_ideas` database table.

It replaces the previous overlap-matching approach (which found collections literally containing the user's saved movies) with a graph-traversal approach that surfaces thematically connected films and collections the user hasn't seen yet.

---

## Algorithm

### Input
- User's **Want to Watch** bookmarks (from `localStorage` via `FavoritesManager.getBookmarkedMovies()`)
- Minimum 3 bookmarks required (cold start otherwise)

### Steps

1. **Random seed sample**
   Take a random sample of up to 15 movies from the user's Want to Watch list. This keeps the query cost bounded and introduces variety across sessions.

2. **Fetch More Ideas**
   Query `more_ideas` table for all seed movies. Each row contains a JSONB array of ~15 related movies with `title`, `year`, and `connection` fields.

3. **Score related movies**
   Count how many seeds point to each related movie. A movie scoring 3 means 3 of the user's saved films have it as a More Ideas suggestion — a meaningful signal.

4. **Drop the extremes**
   - Skip **score = 1** — too weak, likely noise
   - Skip the **top scoring cluster** — these are the obvious choices (e.g. everyone who saves Blade Runner gets The Matrix) — not interesting
   - The **middle tier** is the feed signal: connected enough to be relevant, specific enough to feel like a discovery

5. **Find collections**
   Query `browse_lists` for subcategories containing the middle-tier related movies, ranked by overlap count. Each parent collection appears at most once.

6. **Interleave**
   Build the feed in a repeating pattern:
   ```
   MediaCard  (related movie)
   MediaCard  (related movie)
   Collection (6-poster subcategory grid)
   MediaCard
   MediaCard
   Collection
   ...
   ```
   Capped at 30 items total.

---

## Files

| File | Purpose |
|------|---------|
| `pages/genius.js` | Genius page — cold start, loading state, feed render |
| `pages/api/genius-feed.js` | Feed API — seeds, scoring, collection matching, interleave |
| `components/FavoritesManager.js` | localStorage access for Want to Watch bookmarks |
| `more_ideas` table | Pre-computed related movies (~15 per film), generated via batch Claude |

---

## Feed Item Types

### `type: 'movie'`
A single related movie rendered as a horizontal MediaCard (poster + title + year). Taps through to `/movie/[tmdbId]`.

### `type: 'collection'`
A subcategory from `browse_lists` rendered as a 3×2 poster grid with title and parent collection label. Taps through to `/collection/[collectionId]`.

---

## Cold Start

When the user has fewer than 3 Want to Watch bookmarks, the cold start picker is shown — a scrollable grid of ~120 canonical films the user can tap to seed their list. Once they reach 3, the feed loads.

---

## Design Decisions

**Why random 15 seeds (not all)?**
Bounding the seed set keeps DB queries fast and ensures the feed varies between sessions — a user with 80 saved movies gets a different mix each visit.

**Why drop the top cluster?**
The highest-scoring related movies are the ones everyone who likes that genre knows. They're not surprising. The middle tier — appearing in 2-4 seed lists — is specific enough to feel like a real recommendation.

**Why not score-weight the collections?**
Kept simple intentionally. If quality issues emerge, collection ranking by related-movie frequency is the next lever to pull.

---

## Previous Approach

The old `genius-recommendations` API matched collections that **literally contained** the user's saved movies. This meant:
- Results often felt random (the connection between saved movie and collection wasn't obvious)
- Popular movies drove too many results
- Collections shown weren't discoveries — the user had already effectively "seen" them by saving the movie

The More Ideas graph fixes this by traversing one hop outward, finding what the user's taste points *toward* rather than what it already contains.
