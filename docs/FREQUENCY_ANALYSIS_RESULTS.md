# MoreIdeas Recommendation Frequency Analysis Results

**Date:** 2026-05-11
**Status:** Analysis complete, catalog expansion work paused pending new More Ideas build

---

## Executive Summary

Analyzed 42,325 unique films recommended across all MoreIdeas records to identify catalog gaps and prioritize expansion.

**Key Findings:**
- **69.6% coverage** - 29,442 recommendations match existing catalog
- **30.4% gap** - 12,883 recommendations not in catalog
- **416 high-priority films** - Recommended 8+ times, not in catalog (6,704 broken recommendation links)
- **1,178 medium-priority films** - Recommended 3-7 times, not in catalog (4,850 broken links)

---

## Database State

### Catalog Size
- **32,953 movies** in catalog
- **19,374 movies** with analyses (58.8%)
- **19,289 movies** with WhyWatch (58.5%)

### Recommendation Coverage
Out of **42,325 unique films** recommended:

| Status | Count | % | Notes |
|--------|-------|---|-------|
| exact_match | 26,373 | 62.3% | Title + year exact match |
| normalized_match | 1,690 | 4.0% | Normalized title + year match |
| fuzzy_year_match | 1,379 | 3.3% | Normalized title + year ±1 |
| **missing** | **12,883** | **30.4%** | **Not in catalog** |

---

## Missing Films Breakdown (by recommendation frequency)

| Frequency | Films | Total Recs | Priority |
|-----------|-------|------------|----------|
| 1 | 9,924 | 9,924 | Long tail (defer) |
| 2 | 1,365 | 2,730 | Long tail (defer) |
| **3-5** | **961** | **3,456** | **Tier 2** |
| **6-7** | **217** | **1,394** | **Tier 2** |
| **8+** | **416** | **6,704** | **Tier 1 (high priority)** |

**Tier 1 (416 films):** Recommended 8+ times = 6,704 broken recommendation links
**Tier 2 (1,178 films):** Recommended 3-7 times = 4,850 broken recommendation links

---

## Output Files Generated

Located in `/Users/josh.petersen/moviegenius/output/`

### `missing_high_frequency.csv` (293 rows)
Films with `recommendation_count >= 10` that are missing from catalog.

**Columns:**
- `title` - Film title as it appears in recommendations
- `year` - Release year
- `recommendation_count` - How many times recommended
- `distinct_source_count` - How many different MoreIdeas records mention it

**Use:** Highest priority for catalog expansion

### `fuzzy_match_review.csv` (559 rows)
Films matched via normalized title + year ±1 fuzzy logic.

**Columns:**
- `rec_title`, `rec_year` - Title/year from recommendations
- `recommendation_count` - Frequency
- `matched_title`, `matched_year` - What we matched it to in catalog

**Use:** Spot-check for false positives in fuzzy matching logic

### `missing_long_tail.csv` (12,590 rows)
All missing films with `recommendation_count < 10`.

**Use:** Reference for future expansion, not immediate priority

---

## Database Table: `more_ideas_frequency`

**Schema:**
```sql
CREATE TABLE more_ideas_frequency (
  title TEXT,
  year INTEGER,
  recommendation_count INTEGER,
  distinct_source_count INTEGER,
  title_normalized TEXT,
  catalog_status TEXT -- 'exact_match', 'normalized_match', 'fuzzy_year_match', 'missing'
);
```

**Indexes:**
- `idx_mif_count` - On recommendation_count DESC
- `idx_mif_title_year` - On (title, year)
- `idx_mif_normalized` - On title_normalized

**Query Examples:**
```sql
-- Get Tier 1 films (8+ recommendations)
SELECT title, year, recommendation_count
FROM more_ideas_frequency
WHERE catalog_status = 'missing' AND recommendation_count >= 8
ORDER BY recommendation_count DESC;

-- Get Tier 2 films (3-7 recommendations)
SELECT title, year, recommendation_count
FROM more_ideas_frequency
WHERE catalog_status = 'missing'
  AND recommendation_count BETWEEN 3 AND 7
ORDER BY recommendation_count DESC;
```

---

## Script: `files/build-frequency-table.js`

**Location:** `/Users/josh.petersen/moviegenius/files/build-frequency-table.js`

**What it does:**
1. Creates `more_ideas_frequency` table from `more_ideas` records (cutoff: 2026-05-09)
2. Normalizes titles using `lib/search-matching.js`
3. Classifies each film by catalog status (exact/normalized/fuzzy/missing)
4. Generates histogram report
5. Exports three CSV priority lists

**Features:**
- ✅ Full checkpoint system (resumes from any step)
- ✅ Batch processing with ETA tracking
- ✅ Heartbeat logging for long queries
- ✅ Error tracking with abort threshold

**Usage:**
```bash
# Run analysis
node --env-file=.env.local files/build-frequency-table.js

# Resume from checkpoint (automatic if interrupted)
node --env-file=.env.local files/build-frequency-table.js --resume

# With logging
node --env-file=.env.local files/build-frequency-table.js | tee logs/freq-$(date +%s).log
```

**Checkpoints stored in:** `checkpoints/frequency/`

---

## Next Steps (PAUSED - Resume after new More Ideas build)

### Why Paused
Waiting for new More Ideas build to complete (expected tomorrow). The recommendation corpus may change, so frequency analysis should be re-run before proceeding with catalog expansion.

### When Resuming

**Step 1: Re-run frequency analysis**
```bash
# Drop old table and re-analyze with updated data
node --env-file=.env.local -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const client = await pool.connect();
  await client.query('DROP TABLE IF EXISTS more_ideas_frequency');
  client.release();
  await pool.end();
})();
"

# Re-run script
node --env-file=.env.local files/build-frequency-table.js
```

**Step 2: Review updated CSVs**
- Check if Tier 1 count changed (currently 416 films @ 8+ recs)
- Identify any new high-frequency recommendations

**Step 3: Proceed with catalog expansion**

Two-tier approach:

#### **Tier 1: Immediate Addition (416 films @ 8+ recs)**
1. Build `scripts/match-missing-to-tmdb.js` - Auto-match to TMDB API
2. Manual review of matches (check for false positives)
3. Build `scripts/bulk-add-movies.js` - Insert into catalog
4. Generate analyses for new films (existing pipeline)
5. Measure broken link reduction

**Time investment:** ~5 hours one-time
**Broken links recovered:** 6,704 recommendation links
**Cost:** ~$62 for analysis generation (416 × $0.15)

#### **Tier 2: Ongoing Pipeline (1,178 films @ 3-7 recs)**
1. Build `scripts/curate-missing-films.js` - Interactive curation tool
2. Set weekly cadence: 50 films/week (~10 min/day)
3. Track progress over 6 months

**Time investment:** ~3 hours to build tool, then 10 min/day ongoing
**Broken links recovered:** 4,850 recommendation links over time

---

## Key Decisions Still Open

1. **Analysis format:** V2 (500-word) or V3 (200-word)?
2. **TMDB API tier:** Free (rate limited) or paid?
3. **Manual review:** Human review all 416, or confidence threshold?
4. **Batch size:** All 416 at once, or 4 batches of ~100?
5. **Timing:** Wait for new More Ideas build stats first

---

## Files Reference

**Scripts:**
- `/Users/josh.petersen/moviegenius/files/build-frequency-table.js` - Main analysis script
- `/Users/josh.petersen/moviegenius/files/TASK_frequency_histogram.md` - Original task spec

**Output:**
- `/Users/josh.petersen/moviegenius/output/missing_high_frequency.csv` - 293 rows (10+ recs)
- `/Users/josh.petersen/moviegenius/output/fuzzy_match_review.csv` - 559 rows
- `/Users/josh.petersen/moviegenius/output/missing_long_tail.csv` - 12,590 rows

**Checkpoints:**
- `/Users/josh.petersen/moviegenius/checkpoints/frequency/progress.json` - Step-level progress
- `/Users/josh.petersen/moviegenius/checkpoints/frequency/batch_*.json` - Batch checkpoints

**Database:**
- `more_ideas_frequency` table - 42,325 rows
- `movies` table - 32,953 rows (current catalog)

---

## Contact Points for Resume

When ready to resume:
1. Share this document
2. Check if new More Ideas build changed recommendation corpus
3. Re-run frequency analysis if data changed
4. Review updated Tier 1/Tier 2 counts
5. Make decisions on open questions
6. Proceed with Tier 1 implementation
