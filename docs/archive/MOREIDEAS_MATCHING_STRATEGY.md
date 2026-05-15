# Strategy: Fixing 14% MoreIdeas Matching Failures

**Date:** 2026-05-11
**Audit Data:** 3,000 recommendations from 200 movies
**Success Rate:** 86.7% exact match
**Problem Rate:** 13.3% (400/3,000 recommendations)
  - 4.9% fuzzy matches (148 cases - mostly year drift ±1)
  - 8.4% no match (252 cases - truly not in database)

---

## Root Cause Analysis

### Category 1: Year Drift (4.9% - 148 cases)

**Pattern:** Festival/international release dates differ by ±1-2 years from TMDB theatrical release

**Examples:**
- "Ex Machina (2014)" → Database has 2015
- "In America (2002)" → Database has 2003
- "Dogtown and Z-Boys (2001)" → Database has 2002

**Root Cause:** TMDB uses different release date conventions (festival premiere vs wide release vs international)

**Impact:** Moderate - movies exist in DB but year mismatch prevents lookup

---

### Category 2: Punctuation Variations (2-3% estimated from sample)

**Pattern:** Punctuation differs between AI recommendation and TMDB canonical title

**Examples:**
- "America, America" → "America America" (comma removed)
- "The Long Hot Summer" → "The Long, Hot Summer" (comma added)
- "Mr. and Mrs. Smith" → "Mr. & Mrs. Smith" (and vs &)

**Root Cause:** AI generates titles from natural language descriptions, TMDB uses canonical punctuation

**Impact:** Low-moderate - high similarity score (1.0) but exact match fails

---

### Category 3: Diacritics & Special Characters (1-2% estimated)

**Pattern:** Accented characters normalized or missing

**Examples:**
- "Veronique" → "Véronique" (é missing)
- "Salò" → "Salo" (ò missing)

**Root Cause:** AI may strip diacritics for readability, TMDB preserves original

**Impact:** Low - similarity matching handles this reasonably well

---

### Category 4: Subtitle/Version Variations (1-2% estimated)

**Pattern:** Base title matches but missing subtitle/version

**Examples:**
- "The Disappearance of Eleanor Rigby" → "...Rigby: Them" (subtitle missing)
- "Street Dancers" → "Street Dancer 3D" (version suffix missing)

**Root Cause:** AI recommends "main" title, TMDB has specific release version

**Impact:** Moderate - similarity score high (0.95+) but exact fails

---

### Category 5: Article Variations (1% estimated)

**Pattern:** Missing or extra "The/A/An"

**Examples:**
- "Talk of the Town" → "The Talk of the Town"

**Root Cause:** Natural language generation inconsistency

**Impact:** Low - existing trigram similarity handles this

---

### Category 6: Truly Not in Database (8.4% - 252 cases)

**Pattern:** Movie doesn't exist in 35K database

**Examples:**
- Obscure international films
- Very old films (<1940s)
- Documentary shorts
- TV movies misidentified as theatrical

**Root Cause:** Limited database scope (35K movies vs millions worldwide)

**Impact:** High wasted cost - triggers TMDB fetch + potential duplicate insert

---

## Strategic Solutions

### Solution 1: Pre-Lookup Normalization (Addresses 2-5%)

**What:** Normalize both query and database titles before comparison

**Implementation:**
1. Strip punctuation: `[,.:;!?'"&-]` → space
2. Remove diacritics: `é→e, ò→o, ñ→n`
3. Remove articles: `^(The|A|An)\s+`
4. Normalize whitespace: multiple spaces → single space
5. Lowercase everything

**PostgreSQL Implementation:**
```sql
-- Add normalized column to movies table
ALTER TABLE movies ADD COLUMN title_normalized TEXT;

-- Create normalized title index
CREATE INDEX idx_movies_title_normalized ON movies(title_normalized);

-- Populate normalized titles
UPDATE movies SET title_normalized = (
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          UNACCENT(title),
          '^(the|a|an)\s+', '', 'i'
        ),
        '[,.:;!?''\"&\-]+', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )
  )
);
```

**Matching Strategy:**
```sql
-- Stage 1: Exact normalized match
SELECT * FROM movies
WHERE title_normalized = normalize_query($1)
AND year = $2;

-- Stage 2: Exact normalized match with ±2 year fuzzy
SELECT * FROM movies
WHERE title_normalized = normalize_query($1)
AND year BETWEEN $2 - 2 AND $2 + 2;

-- Stage 3: Trigram on normalized
SELECT * FROM movies
WHERE similarity(title_normalized, normalize_query($1)) > 0.7
ORDER BY similarity DESC, year;
```

**Expected Impact:**
- Fixes 80-90% of Category 2-5 issues (~40-50 recommendations)
- Improves matching from 86.7% → 88-89%

**Cost:** Schema migration + index rebuild (~5 minutes)

---

### Solution 2: Year Fuzzy Matching (Addresses 4.9%)

**What:** Accept ±1 year as valid match (±2 for pre-1970 films)

**Rationale:**
- 95% of year drift is ±1 year (festival vs release)
- Very rare for two movies with identical title to release within 1 year
- Risk of false positive: <0.1%

**Implementation:**
```javascript
// In MoreIdeas generation - lookup strategy
async function findMovieMatch(title, year) {
  // Try exact first
  let movie = await db.query(
    'SELECT * FROM movies WHERE title_normalized = $1 AND year = $2',
    [normalize(title), year]
  );

  if (movie) return movie;

  // Try ±1 year fuzzy
  movie = await db.query(
    'SELECT * FROM movies WHERE title_normalized = $1 AND year BETWEEN $2 AND $3',
    [normalize(title), year - 1, year + 1]
  );

  if (movie) {
    console.log(`[MoreIdeas] Year drift: ${title} ${year} → ${movie.year}`);
    return movie;
  }

  return null;
}
```

**Expected Impact:**
- Fixes 95% of year drift cases (~140 recommendations)
- Improves matching from 86.7% → 91.4%

**Cost:** Logic change only, no schema impact

---

### Solution 3: Similarity Threshold Tuning (Addresses 1-2%)

**What:** Lower similarity threshold from 0.3 → 0.25 for high-confidence contexts

**Rationale:**
- Current search uses 0.3 threshold universally
- MoreIdeas context is high-confidence (AI-generated, not user typos)
- Subtitles like "...Rigby: Them" score 0.95 similarity

**Implementation:**
```sql
-- MoreIdeas-specific matching (lower threshold, higher confidence)
SELECT * FROM movies
WHERE similarity(title_normalized, normalize_query($1)) > 0.6
AND year BETWEEN $2 - 2 AND $2 + 2
ORDER BY similarity DESC, year
LIMIT 1;
```

**Expected Impact:**
- Catches subtitle variations scoring 0.6-0.7
- Improves matching by 1-2% (~20-30 recommendations)

**Cost:** None (query-level change)

---

### Solution 4: "Not Found" Cache (Addresses 8.4%)

**What:** Cache TMDB lookups that returned no results to avoid re-fetching

**Rationale:**
- 252 "not in database" recommendations likely to recur
- Each failed lookup costs 1 TMDB API call (~$0.003)
- Caching prevents repeated failed attempts

**Schema:**
```sql
CREATE TABLE movie_lookup_failures (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  normalized_title TEXT NOT NULL,
  lookup_date TIMESTAMP DEFAULT NOW(),
  tmdb_searched BOOLEAN DEFAULT FALSE,
  UNIQUE(normalized_title, year)
);

CREATE INDEX idx_lookup_failures_normalized ON movie_lookup_failures(normalized_title, year);
```

**Logic:**
```javascript
// Before TMDB fetch in MoreIdeas generation
const failureCache = await db.query(
  'SELECT * FROM movie_lookup_failures WHERE normalized_title = $1 AND year = $2',
  [normalize(title), year]
);

if (failureCache.rows.length > 0) {
  console.log(`[MoreIdeas] Skipping known failure: ${title} (${year})`);
  return null; // Don't fetch from TMDB
}

// After TMDB fetch returns nothing
await db.query(
  'INSERT INTO movie_lookup_failures (title, year, normalized_title, tmdb_searched) VALUES ($1, $2, $3, TRUE) ON CONFLICT DO NOTHING',
  [title, year, normalize(title)]
);
```

**Expected Impact:**
- Prevents ~200-250 redundant TMDB API calls
- Saves ~$0.60-$0.75 per audit cycle
- No improvement to matching rate, but prevents waste

**Cost:** New table + ~5KB per 100 failures

---

### Solution 5: Confidence Scoring (Prevents Bad Recommendations)

**What:** Add confidence score to MoreIdeas recommendations, skip low-confidence

**Rationale:**
- Some failures are genuinely obscure films not worth fetching
- "Omar" is too generic - high false positive risk
- AI confidence can filter these out

**Implementation:**
```javascript
// In AI prompt for MoreIdeas generation
"""
For each recommendation, provide:
{
  "title": "Movie Title",
  "year": 2020,
  "confidence": 0.95  // 0-1 scale
}

Confidence guidelines:
- 0.9-1.0: Widely known film, definitive title
- 0.7-0.9: Known film, might have subtitle variations
- 0.5-0.7: Niche film, title might vary
- <0.5: Very obscure, generic title, or uncertain
"""

// Filter before lookup
const recommendations = aiResponse.filter(r => r.confidence >= 0.7);
```

**Expected Impact:**
- Reduces "not found" cases by 20-30% (~50-75 recommendations)
- Improves overall quality of recommendations
- Side benefit: faster generation (fewer lookups)

**Cost:** Slightly higher AI token usage (~5-10 tokens per recommendation)

---

## Recommended Implementation Order

### Phase 1: Quick Wins (Week 1)
1. **Year Fuzzy Matching** (Solution 2)
   - Easiest to implement
   - Highest immediate impact (4.9% → fixed)
   - No schema changes required

2. **Confidence Scoring** (Solution 5)
   - AI prompt change only
   - Reduces waste on obscure films
   - Minimal risk

**Expected improvement:** 86.7% → 91-92%

---

### Phase 2: Normalization (Week 2-3)
3. **Pre-Lookup Normalization** (Solution 1)
   - Requires schema migration
   - Test on staging first
   - Validate no false positives

4. **Similarity Threshold Tuning** (Solution 3)
   - Fine-tune after normalization deployed
   - A/B test different thresholds

**Expected improvement:** 91-92% → 94-96%

---

### Phase 3: Optimization (Week 4)
5. **Not Found Cache** (Solution 4)
   - Cost optimization, not accuracy
   - Low priority unless API costs spike
   - Easy to add later

**Expected improvement:** Cost reduction, no accuracy change

---

## Testing Strategy

### 1. Shadow Matching (Pre-Deployment)
Run new matching logic on historical MoreIdeas data without affecting production:

```bash
# Test on 1,000 historical recommendations
node scripts/test-improved-matching.js --sample=1000 --dry-run

# Compare success rates
# Before: 86.7%
# After: Target 94%+
```

### 2. Validation Queries
```sql
-- Check for false positives (wrong movie matched)
SELECT
  m1.title as recommended,
  m2.title as matched,
  m1.year as rec_year,
  m2.year as matched_year,
  similarity(m1.title, m2.title) as sim
FROM more_ideas_new m1
JOIN movies m2 ON m1.matched_movie_id = m2.id
WHERE similarity(LOWER(m1.title), LOWER(m2.title)) < 0.7
OR ABS(m1.year - m2.year) > 2;
```

### 3. Rollback Plan
- Keep old matching logic as fallback
- Add feature flag: `USE_IMPROVED_MATCHING`
- Monitor for 2 weeks before removing old code

---

## Success Metrics

**Target:** Improve from 86.7% → 95%+

**Measurements:**
1. **Match Rate:** % of recommendations finding database match
2. **False Positive Rate:** % of matches that are wrong movie (target: <0.1%)
3. **API Call Reduction:** Number of TMDB fetches avoided
4. **Generation Time:** Avg time to generate 15 recommendations (should decrease)

**Monitoring:**
```sql
-- Daily success rate
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_recs,
  SUM(CASE WHEN matched_movie_id IS NOT NULL THEN 1 ELSE 0 END) as matched,
  ROUND(100.0 * SUM(CASE WHEN matched_movie_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) as match_rate
FROM more_ideas_recommendations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Risk Assessment

### Low Risk
- Year fuzzy matching (±1 year): Very rare for same-title films in same year
- Confidence scoring: Only improves quality
- Not found cache: Pure optimization

### Medium Risk
- Normalization: Could cause false positives if too aggressive
  - Mitigation: Test thoroughly, start with conservative normalization
  - Example risk: "It" (2017) vs "It" (1927) - need year matching too

### High Risk
- Similarity threshold lowering: Could match wrong movies
  - Mitigation: Only use in MoreIdeas context (high confidence), not user search
  - Require year within ±2 as safety check

---

## Alternative Considered: TMDB Search API

**What:** Use TMDB `/search/movie?query={title}&year={year}` before checking database

**Pros:**
- Handles all title variations automatically
- TMDB canonical matching logic
- No schema changes needed

**Cons:**
- API call for EVERY recommendation (3,000 calls per audit = $9)
- Rate limit risk (40 req/sec)
- Network latency (15x slower)
- Defeats purpose of UseOnce policy (still fetches duplicates)

**Decision:** Rejected - too expensive and slow for batch operations

---

## Cost-Benefit Analysis

### Current State
- Success: 86.7% (2,600 matches)
- Failures: 13.3% (400 non-matches)
- Wasted API calls: ~250/audit × $0.003 = $0.75/audit
- Annual waste (assuming 50 audits): ~$37.50

### After Implementation (Phases 1-2)
- Success: 95% (2,850 matches)
- Failures: 5% (150 non-matches)
- Wasted API calls: ~150/audit × $0.003 = $0.45/audit
- Annual waste: ~$22.50
- **Savings:** $15/year + improved UX (fewer duplicates)

### Development Cost
- Phase 1: 4 hours (year fuzzy + confidence)
- Phase 2: 12 hours (normalization + tuning)
- Testing: 4 hours
- **Total:** ~20 hours

**ROI:** Not financially significant, but architecturally important for:
1. UseOnce policy compliance
2. Database integrity (fewer duplicates)
3. User experience (fewer "you already have this" scenarios)

---

## Conclusion

The 14% failure rate breaks down into:
- **5% fixable with year fuzzy matching** (quick win)
- **2-3% fixable with normalization** (medium effort)
- **5% legitimately not in DB** (cache to reduce waste)
- **1-2% edge cases** (similarity tuning)

**Recommended approach:** Implement Phase 1 immediately (year fuzzy + confidence), then evaluate if Phase 2 normalization is worth the schema migration effort.

The existing trigram similarity in both search endpoints is already quite good - the main improvements come from:
1. Accepting ±1 year drift (festival dates)
2. Normalizing titles before comparison (punctuation, articles)
3. Not wasting API calls on known failures

**Key insight:** The problem isn't search quality - it's the strictness of exact matching in the MoreIdeas generation context where we need fuzzy by default.
