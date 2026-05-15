# Contributors Scripts - ARCHIVED

**Archived:** 2026-05-10
**Reason:** Feature deprecated, focus on core movie data

---

## ⚠️ DO NOT RUN THESE SCRIPTS

These scripts are archived for historical reference only. The contributors feature has been **paused/deprecated**.

See: `/docs/CONTRIBUTORS_DEPRECATED.md` for full context.

---

## Scripts in This Archive

| Script | Purpose | Status |
|--------|---------|--------|
| `check-contributors-status.js` | Check database coverage | ARCHIVED |
| `execute-contributors-migration.js` | Migrate contributors data | ARCHIVED |
| `extract-contributors-batch.js` | Batch extract from TMDB | ARCHIVED |
| `extract-contributors.js` | Single movie extraction | ARCHIVED |
| `generate-contributors-static.js` | Static file generation | ARCHIVED |
| `populate-contributors-json.js` | Populate DB from TMDB | ARCHIVED |
| `test-contributors.js` | Test contributors system | ARCHIVED |

---

## Why Archived?

**Contributors is a low-value feature:**
- 41% coverage is sufficient
- On-demand fetching works fine
- Not worth TMDB API calls to populate
- Focus on WhyWatch (85%) and MoreIdeas (60%)

**What still works:**
- Existing `contributors_json` data (13,645 movies)
- `/api/v1/movie/${id}` returns contributors if available
- `/api/movie-credits` fetches on-demand with Redis cache

---

## If You Need to Re-Enable

1. Read `/docs/CONTRIBUTORS_DEPRECATED.md` rollback section
2. Move scripts back to `/scripts/` directory
3. Update UseOnce policy to include contributors
4. Run batch population (19,305 movies, 2 days)
5. Update deprecation doc to mark RE-ENABLED

**Only do this if product critically needs 100% contributors coverage.**

---

## Historical Context

These scripts were created to:
- Populate `contributors_json` field in database
- Extract cast/crew from TMDB API
- Generate static files for contributors
- Test contributors system

They worked fine, but the feature was deprioritized because:
- Users rarely view cast pages
- TMDB API calls better spent on WhyWatch/MoreIdeas
- On-demand fetching is sufficient

---

**Status:** ARCHIVED - Reference only, do not execute.
