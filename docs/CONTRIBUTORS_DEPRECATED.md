# Contributors Feature - DEPRECATED

**Date:** 2026-05-10
**Status:** PAUSED / DEPRECATED
**Reason:** Focus on core movie data, contributors are low-value feature

---

## Decision

**All contributors building, population, and generation work is PAUSED.**

The `contributors_json` field exists in the database and is populated for ~13,645 movies (41% of catalog). This is sufficient. We will NOT:
- Run scripts to populate more contributors
- Build new contributors generation features
- Maintain contributors extraction tools
- Add contributors to new movies automatically

---

## What Still Works (Read-Only)

**Existing contributors data is available:**
- `/api/v1/movie/${id}` returns `contributors_json` if it exists
- Movie pages display contributors if available
- Cast detail pages work for movies that have contributors

**This is sufficient.** 41% coverage is acceptable for a secondary feature.

---

## Deprecated Scripts (Moved to Archive)

The following scripts have been moved to `/archive/contributors-scripts/`:

1. `check-contributors-status.js` - Status checker
2. `execute-contributors-migration.js` - Migration tool
3. `extract-contributors-batch.js` - Batch extraction
4. `extract-contributors.js` - Single extraction
5. `generate-contributors-static.js` - Static generation
6. `populate-contributors-json.js` - Population script
7. `test-contributors.js` - Testing tool

**Do NOT run these scripts.** They are archived for reference only.

---

## Why Deprecate?

**Low value for high cost:**
- Contributors data available via TMDB API anytime
- Not worth the TMDB API calls to populate
- UseOnce policy says "save what you fetch" - we only get contributors when users visit cast pages
- 41% coverage is enough for a nice-to-have feature

**Focus on high-value features:**
- WhyWatch (85% coverage) - core recommendation engine
- MoreIdeas (60% coverage) - discovery feature
- Slug (86% coverage) - marketing copy
- Contributors (41% coverage) - nice-to-have, low priority

---

## What If We Need Contributors?

**Option 1: Fetch on-demand (current approach)**
- User visits cast page → `/api/movie-credits` → Redis cache → TMDB fallback
- Works fine, no need to pre-populate

**Option 2: UseOnce natural growth**
- As users visit cast pages, contributors get cached
- Over time, coverage improves organically
- No manual intervention needed

**Option 3: Re-enable if critical (unlikely)**
- Restore scripts from archive
- Run batch population
- Update UseOnce to include contributors

---

## Database Field Status

**Keep `contributors_json` column:**
- Already populated for 13,645 movies
- No cost to keep it
- May be useful for future features
- Don't drop the column, just stop actively populating

---

## API Endpoints (Keep As-Is)

**These endpoints still work:**
- `/api/v1/movie/${id}` - Returns contributors_json if exists
- `/api/movie-credits` - Fetches from TMDB with Redis cache
- `/api/tmdb-credits` - Direct TMDB fetch (backend only)

**No changes needed.** Read-only access is fine.

---

## Documentation Updates

**Updated docs to reflect deprecation:**
- ✅ This file created
- ✅ Scripts moved to archive
- ⏳ Update API_REFERENCE.md to note contributors is optional
- ⏳ Update CURRENT_STATE_MAY_2026.md to mark as paused

---

## If Someone Asks About Contributors

**Standard response:**

> "Contributors data is available for 41% of movies via the `contributors_json` field. For movies without it, the data is fetched on-demand from TMDB when users visit the cast page. We're not actively populating contributors for all movies because it's a low-priority feature compared to WhyWatch (85% coverage) and MoreIdeas (60% coverage)."

---

## Archive Location

**Scripts moved to:**
```
/archive/contributors-scripts/
├── check-contributors-status.js
├── execute-contributors-migration.js
├── extract-contributors-batch.js
├── extract-contributors.js
├── generate-contributors-static.js
├── populate-contributors-json.js
└── test-contributors.js
```

**Original location (now empty):**
```
/scripts/
```

---

## Rollback Plan (If Needed)

**To re-enable contributors generation:**

1. Restore scripts from archive to `/scripts/`
2. Run `populate-contributors-json.js` for batch population
3. Update `ensureMovieInDb` to save contributors on TMDB fetch
4. Add contributors to catalog refresh job
5. Update this doc to mark as RE-ENABLED

**Estimated cost to backfill 100% coverage:**
- 19,305 movies without contributors × 1 TMDB call = 19,305 API calls
- Under TMDB free tier (10,000/day limit)
- Run over 2 days to stay under limit
- No Claude API cost (just saving TMDB data)

**Not worth it unless product requires it.**

---

**Status:** DEPRECATED - Do not run contributors scripts unless explicitly re-enabled.
