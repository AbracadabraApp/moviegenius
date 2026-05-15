# Catalog Coverage Baseline

**Date:** 2026-05-12
**Status:** Measurement System Active
**Baseline Snapshot:** Saved to `coverage_snapshots` table

---

## Executive Summary

Established comprehensive catalog coverage measurement system and fixed critical MoreIdeas join issue. Coverage jumped from 0% complete → 30.3% complete after MoreIdeas recovery.

---

## What Was Done Today

### 1. ✅ Diagnosed MoreIdeas Join Issue

**Problem:** 0% of movies had MoreIdeas despite 32,028 records existing

**Root Cause:** All `more_ideas.movie_id` fields were NULL

**Discovery:**
- Ran diagnostic script (`diagnose-moreideas.js`)
- Found 100% of records had NULL `movie_id`
- Confirmed 99.97% recoverable via `tmdb_id` join (32,019 out of 32,028)
- Only 9 records orphaned (movies not in catalog)

### 2. ✅ Fixed MoreIdeas Join

**Action:** Populated `movie_id` from `tmdb_id` matches

**Script:** `/scripts/fix-moreideas-join.js`

**Results:**
- Updated 32,019 records in 4.88 seconds
- MoreIdeas coverage: 0% → 97.2%
- Complete movies: 0% → 30.3% (9,977 movies)

### 3. ✅ Created Coverage Measurement System

**Components Built:**

**Database:**
- `coverage_snapshots` table - Daily tracking
- 17 metrics per snapshot
- Indexed on `snapshot_date` for fast lookups

**Scripts:**
- `/scripts/diagnose-moreideas.js` - Diagnostic tool
- `/scripts/fix-moreideas-join.js` - Recovery tool
- `/scripts/create-coverage-snapshots-table.js` - Schema setup
- `/scripts/measure-catalog-coverage.js` - **Main measurement script**

**Documentation:**
- Updated `CATALOG_MANAGEMENT_STRATEGY.md` with actual numbers
- Added Coverage Measurement System section
- This baseline document

---

## Baseline Metrics (2026-05-12)

### Catalog Size
**Total movies:** 32,953

### Core Feature Coverage (8 Features)

| Feature | Coverage | Missing | % | Status |
|---------|----------|---------|---|--------|
| Title | 32,953 | 0 | 100.0% | ✅ |
| Year | 32,953 | 0 | 100.0% | ✅ |
| Poster | 32,554 | 399 | 98.8% | ✅ |
| Slug | 30,894 | 2,059 | 93.8% | ⚠️ |
| MoreIdeas | 32,019 | 934 | 97.2% | ✅ |
| WhyWatch | 19,289 | 13,664 | 58.5% | 🔴 |
| Trailer | 15,020 | 17,933 | 45.6% | 🔴 |
| Contributors | 13,645 | 19,308 | 41.4% | 🔴 |

### Completeness Analysis

**Complete (all 8 features):** 9,977 movies (30.3%)
**Complete (7 of 8):** 8,078 movies (24.5%)
**Complete (6 of 8):** 1,633 movies (5.0%)
**Incomplete:** 22,976 movies (69.7%)

### External Coverage (Recommendations)

**Total films recommended:** 54,647
**In catalog:** 31,710 (58.0%)
**Missing from catalog:** 22,937 (42.0%)
**High priority missing (8+ recs):** 802 films

---

## Impact Assessment

### Before MoreIdeas Fix
- **MoreIdeas coverage:** 0%
- **Complete movies:** 0%
- **Discovery system:** Completely broken
- **Recommendation links:** 100% broken

### After MoreIdeas Fix
- **MoreIdeas coverage:** 97.2%
- **Complete movies:** 30.3% (9,977 movies)
- **Discovery system:** Functional for 32,019 movies
- **Recommendation links:** 97.2% working

### Net Improvement
- **+9,977 complete movies** (now have all 8 features)
- **+32,019 movies with MoreIdeas**
- **Discovery system recovered**

---

## Remaining Gaps

### High-Priority Gaps

**1. Missing Recommended Films (802 high-priority)**
- 802 films recommended 8+ times but not in catalog
- Represents 42% of all recommended films
- Immediate action: Add these 802 to catalog

**2. WhyWatch (13,664 missing - 41.5%)**
- Flagship feature unavailable for 41.5% of movies
- Generate WhyWatch for missing movies

**3. Trailer (17,933 missing - 54.4%)**
- Over half of movies missing trailers
- Fetch from TMDB API

**4. Contributors (19,308 missing - 58.6%)**
- Cast/crew data missing for majority
- Fetch from TMDB API

### Medium-Priority Gaps

**5. Slug (2,059 missing - 6.2%)**
- URL slugs missing for small percentage
- Generate from title + year

**6. Poster (399 missing - 1.2%)**
- Very small gap, likely obscure films
- Attempt TMDB fetch or mark unavailable

---

## Daily Measurement

### How to Run

**Preview (no save):**
```bash
node --env-file=.env.local scripts/measure-catalog-coverage.js
```

**Save snapshot:**
```bash
node --env-file=.env.local scripts/measure-catalog-coverage.js --save
```

### Recommended Schedule

**Daily:** Run with `--save` flag at midnight
**Weekly:** Review trends and gaps
**Monthly:** Generate progress report

### Querying Snapshots

```sql
-- Latest snapshot
SELECT * FROM coverage_snapshots
ORDER BY snapshot_date DESC
LIMIT 1;

-- Trend over last 30 days
SELECT
  snapshot_date,
  total_catalog,
  complete_all_8,
  ROUND(100.0 * complete_all_8 / total_catalog, 1) as pct_complete
FROM coverage_snapshots
WHERE snapshot_date > CURRENT_DATE - INTERVAL '30 days'
ORDER BY snapshot_date;

-- Feature-by-feature trend
SELECT
  snapshot_date,
  has_whywatch,
  has_trailer,
  has_contributors
FROM coverage_snapshots
ORDER BY snapshot_date DESC
LIMIT 7;
```

---

## Next Steps

### Immediate Actions

1. **Add 802 high-priority missing films** to catalog
   - Use `/output/missing_high_frequency.csv`
   - Match to TMDB and import
   - Expected impact: +802 movies, -6,704 broken recommendation links

2. **Generate WhyWatch for 13,664 movies**
   - Priority: Movies with MoreIdeas (maximize discovery)
   - Cost: ~$273 (13,664 × $0.02)
   - Expected impact: WhyWatch coverage 58.5% → 100%

3. **Fetch trailers for 17,933 movies**
   - Use TMDB API
   - Low cost (included in free tier)
   - Expected impact: Trailer coverage 45.6% → ~90%

### Long-Term Strategy

4. **Implement Enrichment Pipeline** (per CATALOG_MANAGEMENT_STRATEGY.md)
   - Add enrichment_status tracking to movies table
   - Build background worker
   - Automate backfill process
   - Goal: 95%+ complete within 7 days of movie addition

5. **Monitor daily** via coverage_snapshots
   - Set up alerting for coverage drops
   - Track enrichment progress
   - Ensure gap doesn't grow

---

## Success Criteria

### Short-Term (1 Month)
- ✅ Coverage measurement active
- ⏳ Complete movies: 30.3% → 50%
- ⏳ Missing recommended films: 802 → 0 (high-priority)
- ⏳ WhyWatch coverage: 58.5% → 80%

### Medium-Term (3 Months)
- ⏳ Complete movies: 50% → 80%
- ⏳ All 8 features > 90% coverage
- ⏳ Enrichment pipeline implemented
- ⏳ Automatic backfill active

### Long-Term (6 Months)
- ⏳ Complete movies: 80% → 95%
- ⏳ All features > 95% coverage
- ⏳ New movies enriched within 24 hours
- ⏳ Zero gap growth

---

## Files Created

**Scripts:**
- `/scripts/diagnose-moreideas.js` - Diagnostic tool
- `/scripts/fix-moreideas-join.js` - MoreIdeas recovery (one-time)
- `/scripts/create-coverage-snapshots-table.js` - Schema setup (one-time)
- `/scripts/measure-catalog-coverage.js` - **Daily measurement (use this!)**

**Documentation:**
- `/docs/CATALOG_COVERAGE_BASELINE.md` - This file
- Updated `/docs/strategies/CATALOG_MANAGEMENT_STRATEGY.md`

**Database:**
- `coverage_snapshots` table
- `more_ideas.movie_id` populated (32,019 records)

---

## Summary

**Achievement:** Built comprehensive catalog coverage measurement system and recovered 32,019 MoreIdeas records.

**Impact:** Complete movies jumped from 0% → 30.3% (9,977 movies now have all 8 features)

**Ongoing:** Run `measure-catalog-coverage.js --save` daily to track progress

**Next:** Address remaining gaps (WhyWatch, Trailer, Contributors) and add 802 high-priority missing films

---

**Document Status:**
- Version: 1.0
- Owner: Engineering
- Review: Daily until >50% complete, then weekly
- Last Updated: 2026-05-12
