# Lessons Learned

---

## 2026-03-25 - Adding fields to localStorage-saved movie data

**Mistake:** Tried 4 approaches to get the Claude slug into `movieData` saved to localStorage — including a callback prop on WhyWatchContainer, adding a field to the why-watch API, and using `movie.overview` (TMDB text) — before finding the obvious solution.

**Correction:** `movie-streaming.js` already queries the `movies` table with the tmdb_id. Just add the field to that SQL query and it's available as `streaming?.slug` on the page — same pattern as `streaming?.streaming_data`.

**Root Cause:** Didn't check what data was already being fetched from our own database before reaching for new solutions.

**Prevention:**
- When adding a field from the `movies` table to the movie page, first check `movie-streaming.js` — it's the existing SQL query against our DB that runs on every movie page load.
- The response is already in the page as the `streaming` state object.
- Pattern: `slug: streaming?.slug`, `streaming_data: streaming?.streaming_data`, etc.
- Do NOT use the `tmdb-movie` API for our own data — it's a pure TMDB proxy with no DB access.

**Files:**
- `pages/api/movie-streaming.js` — SQL query, add columns here
- `pages/movie/[id].js` — consume via `streaming?.fieldName`

---
