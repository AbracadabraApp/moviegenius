# MovieGenius Release Status

**Updated:** 2026-03-26
**Status:** Production — Browse system live, movie page complete

---

## ✅ Completed

### Browse System (complete)
- Netflix-style homepage with collection carousels (NetflixCarousel)
- Per-session random seed with back-navigation restoration (sessionStorage)
- Category balancing: 25% cap, no sequential repeats
- Quality scoring: AFI Top 100 + full Criterion Top 100 (194 honored films)
  — `quality_score` column on `browse_lists`, offline script `scripts/score-collections.cjs`
  — ORDER BY formula: `(quality_score × 2 + seeded random)` surfaces quality consistently
- Dedup fix: maxPerCategory based on `limit + offset`, not `limit` alone
- Collection dedup pipeline: suppressed flag on `browse_lists`
- CollectionPage: 3-column poster grid, aisle markers, no counts
- Genius page: 3-column grid matching CollectionPage style
- Title hyphenation fix: `overflowWrap/wordBreak/hyphens:none` everywhere

### Movie Page (complete)
- WhyWatch-first hierarchy (YES/NO + 3 reasons as hero)
- Description below WhyWatch, no 500-word analysis shown
- More Ideas section (related collections)
- Removed: old analysis display, broken movie links, breadcrumbs

### Search (complete)
- SimpleSearch with TMDB popularity ranking across all pages
- Replaced AskInputBar everywhere

### Infrastructure
- `list_movies` table removed; all queries use `editorial_data` JSONB
- `featured-collections` API reads directly from `browse_lists.editorial_data`
- Railway PostgreSQL: 21,275 movie analyses, 35K+ movies, 10K+ collections

---

## 🔲 Remaining

### High value
- **Skip It / Watch It design polish** (in progress)
- **Side padding consistency audit** (in progress)

### Lower priority / deferred
- iOS `/api/v1/*` endpoints (only relevant when iOS app exists)
- V3 component simplification (1,900 → 400 lines) — optional refactor
- Unified API (1 call vs 4 per movie page) — premature until iOS needed

---

## 📝 Notes

The Browse system exceeded the original "Browse Enhancement" scope and is now
the main product surface. WhyWatch + description replaces the need for a
500-word analysis rewrite — the MVF goal is achieved with better structure.

Remaining work is polish (Skip It design, padding) and optional infrastructure
(iOS endpoints, component simplification) when those become relevant.
