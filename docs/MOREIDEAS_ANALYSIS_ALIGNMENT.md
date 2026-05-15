# MoreIdeas Analysis Alignment: Coverage vs Matching Strategy

**Date:** 2026-05-14
**Purpose:** Reconcile findings between MOREIDEAS_COVERAGE_ANALYSIS.md and MOREIDEAS_MATCHING_STRATEGY.md

---

## Executive Summary

The two analyses address **different but related problems** in the MoreIdeas system:

1. **COVERAGE_ANALYSIS (2026-05-14):** Why 13% of MoreIdeas entries have null tmdbIds (movies not in database)
2. **MATCHING_STRATEGY (2026-05-11):** Why 14% of MoreIdeas generation attempts fail to match existing movies (fuzzy matching failures)

**Key insight:** These are the SAME 13-14% gap, measured at different points in the pipeline.

---

## The Two Perspectives

### Coverage Analysis Perspective (Backfill View)

**Question:** "Why do existing MoreIdeas entries have null tmdbIds?"

**Findings:**
- 46% had null tmdbIds BEFORE backfill
- 13% still have null tmdbIds AFTER backfill (61,700 entries)
- Movies table has 98.8% poster coverage (only 393/33,666 missing)
- **Conclusion:** 13% of recommendations reference movies not in our 35K database

**Approach:** Post-hoc analysis of existing data

---

### Matching Strategy Perspective (Generation View)

**Question:** "Why do new MoreIdeas fail to match during generation?"

**Findings from 3,000 recommendation sample:**
- 86.7% exact match success
- 13.3% matching failures (400/3,000)
  - 4.9% fuzzy matches (year drift ±1)
  - 2-3% punctuation variations
  - 1-2% diacritics & special characters
  - 1-2% subtitle/version variations
  - 8.4% truly not in database (252 cases)

**Approach:** Prospective analysis during AI generation

---

## How They Align

### The 13-14% Gap is the SAME Problem

Both analyses found approximately **13-14% of MoreIdeas cannot be matched to the database:**

| Analysis | Gap Size | Context |
|----------|----------|---------|
| Coverage | **13%** (61,700/479,579) | Existing entries with null tmdbIds |
| Matching Strategy | **13.3%** (400/3,000) | New generation failures |

**This is NOT a coincidence.** They're measuring the same phenomenon from different angles.

---

## Root Cause Breakdown

### Coverage Analysis says: "13% not in database"
### Matching Strategy says: "8.4% not in database + 4.9% fuzzy match failures"

**Reconciliation:**

```
Total gap: 13-14%
├── Truly missing from database: 8.4%
│   └── Obscure/international/old films
└── Fixable with fuzzy matching: 4.9%
    ├── Year drift (±1): 4.9%
    ├── Punctuation: 2-3%
    ├── Diacritics: 1-2%
    └── Subtitles: 1-2%
```

**The coverage analysis couldn't distinguish between "not in DB" vs "in DB but failed to match"** because both result in null tmdbId.

---

## What the Backfill Actually Fixed

### Coverage Analysis claim: "Backfill fixed 72% of nulls"
### Reality: Backfill fixed EASY matches only

**Before backfill:** 46% nulls (220,579 entries)
**After backfill:** 13% nulls (61,700 entries)
**Fixed by backfill:** 33% (158,879 entries)

**What did the backfill catch?**
```sql
LEFT JOIN movies m ON LOWER(m.title) = LOWER(idea->>'title')
  AND m.year = (idea->>'year')::int
```

This ONLY matches:
- ✅ Exact case-insensitive title match
- ✅ Exact year match
- ❌ Year drift (±1) - MISSED
- ❌ Punctuation variations - MISSED
- ❌ Diacritics - MISSED

**So the backfill fixed ~33% of the 46% gap, leaving 13% unfixed.**

The remaining 13% contains:
- **8.4%** truly not in database (unfixable without catalog expansion)
- **4.9%** fixable with fuzzy matching (year drift, punctuation, etc.)

---

## The Missing Piece: Fuzzy Matching Not Implemented

### Coverage Analysis says: "Recommend fuzzy matching for future work"
### Matching Strategy says: "Implement fuzzy matching in Phase 1-2"

**Both analyses independently concluded fuzzy matching is needed**, but:
- ❌ **Not implemented in backfill script**
- ❌ **Not implemented in generation pipeline**
- ✅ **Documented as solution, but not deployed**

---

## What Would Happen If We Implement Fuzzy Matching?

### Phase 1: Year Fuzzy Matching (±1 year)

**Coverage Analysis perspective:**
- Current gap: 13% (61,700 entries)
- Fixable with year fuzzy: ~5% (23,979 entries)
- **New gap:** 8% (37,721 entries)

**Matching Strategy perspective:**
- Current success: 86.7%
- After year fuzzy: 91.6% (+4.9%)
- Remaining failures: 8.4%

**Alignment:** Both predict ~5% improvement from year fuzzy matching

---

### Phase 2: Title Normalization (punctuation, diacritics, articles)

**Coverage Analysis perspective:**
- Gap after year fuzzy: 8% (37,721 entries)
- Fixable with normalization: ~3% (14,387 entries)
- **Final gap:** 5% (23,979 entries)

**Matching Strategy perspective:**
- Success after year fuzzy: 91.6%
- After normalization: 95%+ (+3-4%)
- Remaining failures: 5%

**Alignment:** Both predict ~3-4% improvement from normalization

---

## Final State Comparison

| State | Coverage Analysis | Matching Strategy | Alignment |
|-------|-------------------|-------------------|-----------|
| **Today** | 87% coverage (13% gap) | 86.7% match (13.3% failures) | ✅ Same |
| **After Year Fuzzy** | 92% coverage (8% gap) | 91.6% match (8.4% failures) | ✅ Same |
| **After Normalization** | 95% coverage (5% gap) | 95% match (5% failures) | ✅ Same |

---

## Recommended Actions

### 1. Update Coverage Analysis Document

Add clarification:
```markdown
The remaining 13% breaks down as:
- 8.4% truly not in database (catalog expansion needed)
- 4.9% fixable with fuzzy matching (see MOREIDEAS_MATCHING_STRATEGY.md)
```

### 2. Implement Matching Strategy Phase 1-2

From MOREIDEAS_MATCHING_STRATEGY.md:
- ✅ Year fuzzy matching (±1 year)
- ✅ Title normalization (punctuation, diacritics, articles)
- ✅ Confidence scoring (filter low-quality recommendations)

**Implementation locations:**
1. **Generation pipeline** (pages/api/generate-moreideas.js or equivalent)
2. **Backfill script re-run** (scripts/backfill-moreideas-from-existing.cjs)

### 3. Add Normalized Title Column

From MOREIDEAS_MATCHING_STRATEGY.md:
```sql
ALTER TABLE movies ADD COLUMN title_normalized TEXT;
CREATE INDEX idx_movies_title_normalized ON movies(title_normalized);
```

Then update both generation and backfill to use:
```sql
SELECT * FROM movies
WHERE title_normalized = normalize_query($1)
AND year BETWEEN $2 - 1 AND $2 + 1;
```

---

## Validation Strategy

### Test on Historical Data

Run fuzzy matching against the 61,700 null entries:
```sql
-- How many of the 61,700 nulls would match with fuzzy logic?
SELECT COUNT(DISTINCT idea->>'title')
FROM more_ideas mi
CROSS JOIN jsonb_array_elements(mi.ideas) as idea
WHERE (idea->>'tmdbId')::text = 'null'
AND EXISTS (
  SELECT 1 FROM movies m
  WHERE title_normalized = normalize(idea->>'title')
  AND m.year BETWEEN (idea->>'year')::int - 1 AND (idea->>'year')::int + 1
);
```

**Expected result:** ~23,000 matches (37,721 remaining nulls)

---

## Conclusion

### Both analyses are correct, measuring the same phenomenon:

**Coverage Analysis (backfill view):**
- "13% of MoreIdeas have null tmdbIds"
- "These are movies not in our database"
- ✅ TRUE - but includes fuzzy match failures

**Matching Strategy (generation view):**
- "13.3% of new recommendations fail to match"
- "8.4% truly missing, 4.9% fixable with fuzzy matching"
- ✅ TRUE - breaks down the 13% more precisely

### The path forward:

1. **Acknowledge:** 13% gap = 8.4% unfixable + 4.9% fuzzy-matchable
2. **Implement:** Fuzzy matching (year ±1, normalization)
3. **Target:** 95% coverage (5% gap from truly missing movies)
4. **Accept:** Final 5% requires catalog expansion (outside scope)

### Key takeaway:

We can improve from **87% → 95% coverage** by implementing the fuzzy matching strategy already documented in MOREIDEAS_MATCHING_STRATEGY.md. The remaining 5% truly requires expanding the movie catalog beyond 35K movies.
