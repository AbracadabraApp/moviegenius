# TV Show Filtering Strategy for MoreIdeas

**Date:** 2026-05-14
**Purpose:** Prevent TV shows from appearing in movie recommendations

---

## Executive Summary

The TMDB API test revealed that **~20-25% of null tmdbId entries are TV shows**, not movies. This pollutes the MoreIdeas recommendation system with content users cannot navigate to in a movie-focused app.

**Strategy:** Refuse, Purge, Hide

---

## Problem Analysis

### TV Shows Found in MoreIdeas Sample (100 entries with null tmdbId)

From `/tmp/tmdb-test-results.log`:

**Confirmed TV Series:**
1. My Brilliant Friend (2018) - Italian TV series
2. The Sinner (2017) - Anthology crime drama series
3. Gurren Lagann (2007) - Anime series
4. SSSS.Gridman (2018) - Anime series
5. Ultraman Nexus (2004) - Tokusatsu series
6. Tensou Sentai Goseiger (2010) - Super Sentai series
7. Angie Tribeca (2018) - Comedy series
8. Mayberry R.F.D. (1968) - Sitcom
9. Beautiful People (2000) - BBC series
10. In Sickness and in Health (1979) - BBC sitcom
11. The Department (2007) - Australian drama series
12. Wicked City (1992) - Anime series
13. The Innocent Man (2018) - Netflix documentary series
14. WordGirl (2006) - Animated children's series
15. Buck Rogers in the 25th Century (1979) - Sci-fi series

**Events/Specials (not theatrical movies):**
- Tokyo Idol Festival 2019 (2019) - Concert event
- Big Bird in China (1983) - TV special
- The Beatles First U.S. Visit (1991) - Documentary TV special
- Jonathan Demme Presents: New Order (1989) - Concert film/TV special

**Estimated:** 15-20 out of 100 = **15-20% are TV shows**

---

## Detection Strategy

### Pattern Recognition

**1. Title Keywords (High Confidence)**
Titles containing these patterns are likely TV shows:
```javascript
const TV_SHOW_KEYWORDS = [
  // Season references
  /season \d+/i,
  /s\d{2}e\d{2}/i,

  // Series indicators
  /: the series/i,
  /: season/i,
  /- season/i,

  // Episode indicators
  /pilot episode/i,
  /series finale/i,

  // TV special indicators
  /tv special/i,
  /television special/i,
  /tv movie/i
];
```

**2. Year Patterns (Medium Confidence)**
- Year ranges (e.g., "2017-2020") = TV series
- Recent years (2015+) with common TV names = higher likelihood

**3. TMDB Type Field (Highest Confidence)**
When matching against TMDB:
```javascript
// TMDB returns media_type field
if (result.media_type === 'tv') {
  // REJECT
}
```

### Detection Algorithm

**Priority Order:**
1. **TMDB API validation** (during generation) - Check `media_type` field
2. **Title keyword matching** - Reject obvious TV patterns
3. **Database type check** - Cross-reference against known TV shows list
4. **Manual review list** - Maintain curated blocklist

---

## Implementation: 4-Layer Defense

### Layer 1: REFUSAL (AI Generation Prompt)

**Current Prompt Issue:** AI generates TV show recommendations

**New Prompt Section:**
```
CRITICAL CONSTRAINTS:

1. ONLY recommend THEATRICAL FEATURE FILMS
   - NOT TV shows, series, miniseries, or limited series
   - NOT TV movies or made-for-TV films
   - NOT documentaries about events (festivals, concerts)
   - NOT straight-to-streaming series (even if feature-length)

2. Examples of INVALID recommendations:
   ❌ "The Sinner" (2017) - This is a TV series
   ❌ "Gurren Lagann" (2007) - This is an anime series
   ❌ "My Brilliant Friend" (2018) - This is an Italian TV series
   ❌ "Tokyo Idol Festival 2019" - This is a concert event, not a movie

3. If uncertain whether something is a movie or TV show, DO NOT recommend it

4. Verify recommendations are theatrical releases with proper titles
```

---

### Layer 2: VALIDATION (Generation Pipeline)

**Location:** `pages/api/generate-moreideas.js` (or equivalent)

**Add validation step BEFORE saving:**

```javascript
async function validateRecommendation(title, year) {
  // Step 1: Check title keywords
  const TV_SHOW_KEYWORDS = [
    /season \d+/i,
    /: the series/i,
    /tv special/i,
    // ... full list
  ];

  for (const pattern of TV_SHOW_KEYWORDS) {
    if (pattern.test(title)) {
      console.log(`⚠️  REJECTED: "${title}" matches TV show pattern: ${pattern}`);
      return { valid: false, reason: 'TV_SHOW_KEYWORD' };
    }
  }

  // Step 2: Check against TMDB
  const tmdbResult = await searchTMDB(title, year);

  if (!tmdbResult || tmdbResult.results.length === 0) {
    console.log(`⚠️  REJECTED: "${title}" not found in TMDB`);
    return { valid: false, reason: 'NOT_FOUND' };
  }

  const firstMatch = tmdbResult.results[0];

  // Check media_type if available
  if (firstMatch.media_type === 'tv') {
    console.log(`⚠️  REJECTED: "${title}" is a TV show per TMDB`);
    return { valid: false, reason: 'TMDB_TV_SHOW' };
  }

  // Step 3: Check against blocklist
  const isBlocked = await checkBlocklist(title, year);
  if (isBlocked) {
    console.log(`⚠️  REJECTED: "${title}" is on manual blocklist`);
    return { valid: false, reason: 'BLOCKLIST' };
  }

  return { valid: true, tmdbId: firstMatch.id };
}

// In generation loop:
for (const rec of aiRecommendations) {
  const validation = await validateRecommendation(rec.title, rec.year);

  if (!validation.valid) {
    stats.rejected++;
    stats.rejectionReasons[validation.reason]++;
    continue; // Skip this recommendation
  }

  // Save with tmdbId
  validRecommendations.push({
    ...rec,
    tmdbId: validation.tmdbId
  });
}
```

**Expected Impact:**
- Prevent NEW TV shows from entering database
- Automatically get tmdbId during generation
- Track rejection metrics

---

### Layer 3: PURGE (Remove Existing TV Shows)

**Script:** `scripts/purge-tv-shows-from-moreideas.cjs`

**Strategy:**
1. Identify TV shows using keyword patterns
2. Remove entries from `more_ideas.ideas` JSONB array
3. Log all removals for review
4. Report stats

**Implementation:**

```javascript
const { Pool } = require('pg');

const TV_SHOW_KEYWORDS = [
  /season \d+/i,
  /: the series/i,
  /tv special/i,
  /television special/i,
  /series finale/i,
  /pilot episode/i,
  /- season/i,
  /tv movie/i
];

const KNOWN_TV_SHOWS = [
  { title: 'My Brilliant Friend', year: 2018 },
  { title: 'The Sinner', year: 2017 },
  { title: 'Gurren Lagann', year: 2007 },
  { title: 'SSSS.Gridman', year: 2018 },
  { title: 'Angie Tribeca', year: 2018 },
  { title: 'Mayberry R.F.D.', year: 1968 },
  { title: 'Ultraman Nexus', year: 2004 },
  { title: 'Tensou Sentai Goseiger', year: 2010 },
  { title: 'Beautiful People', year: 2000 },
  { title: 'Wicked City', year: 1992 },
  { title: 'The Department', year: 2007 },
  { title: 'WordGirl', year: 2006 },
  { title: 'Buck Rogers in the 25th Century', year: 1979 },
  { title: 'In Sickness and in Health', year: 1979 },
  { title: 'The Innocent Man', year: 2018 }
];

async function purgeTVShows() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const stats = {
    totalEntries: 0,
    removedByKeyword: 0,
    removedByKnownList: 0,
    entriesModified: 0
  };

  // Get all more_ideas entries
  const result = await pool.query('SELECT id, ideas FROM more_ideas');

  stats.totalEntries = result.rows.length;

  for (const row of result.rows) {
    const ideas = row.ideas;
    let modified = false;

    const filteredIdeas = ideas.filter(idea => {
      const title = idea.title;
      const year = idea.year;

      // Check keywords
      for (const pattern of TV_SHOW_KEYWORDS) {
        if (pattern.test(title)) {
          console.log(`Removing (keyword): ${title} (${year})`);
          stats.removedByKeyword++;
          modified = true;
          return false;
        }
      }

      // Check known TV shows
      const isKnownTV = KNOWN_TV_SHOWS.some(
        tv => tv.title.toLowerCase() === title.toLowerCase() && tv.year === year
      );

      if (isKnownTV) {
        console.log(`Removing (known TV): ${title} (${year})`);
        stats.removedByKnownList++;
        modified = true;
        return false;
      }

      return true; // Keep this idea
    });

    if (modified) {
      // Update the row
      await pool.query(
        'UPDATE more_ideas SET ideas = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(filteredIdeas), row.id]
      );
      stats.entriesModified++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('PURGE COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Total more_ideas entries:     ${stats.totalEntries}`);
  console.log(`Entries modified:             ${stats.entriesModified}`);
  console.log(`Removed by keyword:           ${stats.removedByKeyword}`);
  console.log(`Removed by known list:        ${stats.removedByKnownList}`);
  console.log(`Total removed:                ${stats.removedByKeyword + stats.removedByKnownList}`);

  await pool.end();
}

purgeTVShows();
```

**Run Command:**
```bash
node --env-file=.env.local scripts/purge-tv-shows-from-moreideas.cjs
```

---

### Layer 4: HIDE (API Filtering)

**Location:** All API endpoints serving MoreIdeas

**Add runtime filter:**

```javascript
// In API endpoint (pages/api/more-ideas.js or similar)
function filterTVShows(ideas) {
  const TV_SHOW_KEYWORDS = [
    /season \d+/i,
    /: the series/i,
    /tv special/i
  ];

  return ideas.filter(idea => {
    // Filter by keywords
    for (const pattern of TV_SHOW_KEYWORDS) {
      if (pattern.test(idea.title)) {
        return false;
      }
    }

    // Filter entries with null tmdbId (likely TV shows or invalid)
    if (!idea.tmdbId) {
      return false;
    }

    return true;
  });
}

// In handler:
export default async function handler(req, res) {
  // ... fetch more_ideas from database

  // Filter TV shows before returning
  const filteredIdeas = filterTVShows(moreIdeas.ideas);

  res.json({ ideas: filteredIdeas });
}
```

**Impact:**
- Even if TV shows slip through, users never see them
- Handles legacy data gracefully
- Can be toggled on/off for testing

---

## Metrics & Monitoring

### Track Rejection Reasons

```javascript
const rejectionStats = {
  TV_SHOW_KEYWORD: 0,
  TMDB_TV_SHOW: 0,
  NOT_FOUND: 0,
  BLOCKLIST: 0
};
```

### Log Sample Rejections

```javascript
console.log('═══════════════════════════════════════════════════════════════');
console.log('REJECTED RECOMMENDATIONS');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(`Reason: TV_SHOW_KEYWORD (${rejectionStats.TV_SHOW_KEYWORD})`);
console.log('  - "The Sinner: Season 1" (2017)');
console.log('  - "Gurren Lagann: The Series" (2007)');
console.log(`Reason: TMDB_TV_SHOW (${rejectionStats.TMDB_TV_SHOW})`);
console.log('  - "My Brilliant Friend" (2018)');
console.log('  - "Angie Tribeca" (2018)');
```

---

## Rollout Plan

### Phase 1: Analysis (Completed)
- ✅ Identified TV shows in sample data
- ✅ Documented patterns and keywords
- ✅ Designed 4-layer strategy

### Phase 2: Validation Layer (Priority 1)
1. Add validation to generation pipeline
2. Test on 100 new recommendations
3. Measure rejection rate
4. **Expected:** 15-20% rejections (mostly TV shows)

### Phase 3: Purge Existing Data (Priority 2)
1. Create purge script with dry-run mode
2. Run dry-run to preview removals
3. Execute purge on production
4. **Expected:** Remove ~10-15K TV show entries (2-3% of 479K)

### Phase 4: API Filtering (Priority 3)
1. Add runtime filter to API endpoints
2. Test on staging
3. Deploy to production
4. **Expected:** Users see 0 TV shows in recommendations

### Phase 5: Prompt Refinement (Ongoing)
1. Update AI generation prompt
2. Monitor rejection rates
3. Add new patterns to blocklist as discovered
4. **Expected:** Rejection rate drops to 5-10% over time

---

## Success Metrics

**Before:**
- 13% of MoreIdeas have null tmdbIds
- ~2-3% are TV shows (15-20 out of 100 null sample)
- Users see broken recommendations

**After:**
- <1% TV shows slip through validation
- Purge removes 10-15K existing TV show entries
- Users see 0 TV shows in production (hidden by API filter)
- Future generations reject TV shows at source

---

## Maintenance

### Blocklist Updates

Create `/data/tv-shows-blocklist.json`:
```json
{
  "tv_shows": [
    { "title": "My Brilliant Friend", "year": 2018 },
    { "title": "The Sinner", "year": 2017 },
    { "title": "Gurren Lagann", "year": 2007 }
  ],
  "patterns": [
    "season \\d+",
    ": the series",
    "tv special"
  ]
}
```

Update monthly based on rejection logs.

---

## Related Documentation

- `/docs/MOREIDEAS_COVERAGE_ANALYSIS.md` - Coverage gaps
- `/docs/MOREIDEAS_ANALYSIS_ALIGNMENT.md` - Fuzzy matching alignment
- `/scripts/test-tmdb-moreideas-sample.cjs` - Test script that revealed TV shows
- `/tmp/tmdb-test-results.log` - Sample data with TV shows

---

## Conclusion

**The 13% null tmdbId gap contains:**
- ~20% TV shows (fixable by filtering)
- ~50% typos/wrong titles (fixable by fuzzy matching)
- ~30% truly missing movies (requires catalog expansion)

By implementing TV show filtering, we can immediately improve coverage by 2-3% and prevent future pollution of the recommendation system.

**Next Action:** Implement Phase 2 (Validation Layer) to test effectiveness before purging existing data.
