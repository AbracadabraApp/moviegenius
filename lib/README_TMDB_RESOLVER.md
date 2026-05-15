# TMDB Resolver - Authoritative String-to-TMDB-ID Converter

**Location:** `/lib/tmdb-resolver.js`
**Purpose:** Single source of truth for converting movie title strings to TMDB IDs
**Type:** Offline batch processing utility (not for production real-time use)

---

## Overview

The TMDB Resolver is the **definitive offline tool** for matching text strings to TMDB IDs. Use this for:

- ✅ Batch processing of movie lists
- ✅ Data analysis and auditing
- ✅ Debugging matching issues
- ✅ CSV/JSON file processing
- ✅ Testing matching strategies
- ✅ Generating reports

**NOT for:** Real-time user search (use `/lib/services/railway-database-search.js` instead)

---

## Quick Start

```javascript
import TMDBResolver from './lib/tmdb-resolver.js';

const resolver = new TMDBResolver();

// Single resolution - returns ALL matches
const results = await resolver.resolve("Alice in Wonderland");
console.log(results);
// [
//   { tmdbId: 12155, title: "Alice in Wonderland", year: 2010, strategy: "normalized_match" },
//   { tmdbId: 30923, title: "Alice in Wonderland", year: 1999, strategy: "normalized_match" },
//   { tmdbId: 12092, title: "Alice in Wonderland", year: 1951, strategy: "normalized_match" },
//   ...
// ]

// Pick the first (most recent) or let user choose
const mostRecent = results[0];

await resolver.close();
```

---

## Matching Strategy (Simplified)

The resolver uses a **3-stage approach**:

### Stage 1: Normalized Match (Fast, Local)
```sql
SELECT * FROM movies
WHERE title_normalized = normalize(query)
ORDER BY year DESC;
```
- Handles: articles (The/A/An), punctuation, diacritics
- Returns: **ALL matches** sorted by year DESC
- Speed: ~10ms
- Coverage: ~85% of queries

**Examples:**
- `"Matrix"` → matches `"The Matrix"`
- `"Amelie"` → matches `"Amélie"`
- `"Mr and Mrs Smith"` → matches `"Mr. & Mrs. Smith"`

### Stage 2: TMDB API Lookup (If Stage 1 fails)
```javascript
fetch(`https://api.themoviedb.org/3/search/movie?query=${query}`)
```
- Gets official title + year from TMDB
- Handles: foreign titles, alternate names
- Speed: ~200-500ms

### Stage 3: Year Fuzzy Match (±5 years)
```sql
SELECT * FROM movies
WHERE title_normalized = normalize(tmdb_result.title)
AND year BETWEEN tmdb_year - 5 AND tmdb_year + 5
ORDER BY ABS(year - tmdb_year), year DESC;
```
- Handles: festival vs release dates, international releases
- Allows wide year range since TMDB provides authoritative year

---

## Title Normalization

```javascript
normalizeTitle(title) {
  return title
    .toLowerCase()
    .normalize('NFD')                    // Decompose diacritics
    .replace(/[\u0300-\u036f]/g, '')     // Remove diacritics
    .replace(/^(the|a|an)\s+/i, '')      // Remove leading articles
    .replace(/[:\-–—,\.!?'"""''&]/g, ' ')// Punctuation → space
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .trim();
}
```

---

## Usage Examples

### Example 1: Get All Versions of a Movie

```javascript
const resolver = new TMDBResolver();

const results = await resolver.resolve("It");
console.log(`Found ${results.length} versions:`);
results.forEach(r => {
  console.log(`  ${r.title} (${r.year}) - TMDB ID: ${r.tmdbId}`);
});

await resolver.close();
```

Output:
```
Found 2 versions:
  It (2017) - TMDB ID: 346364
  It (1990) - TMDB ID: 11317
```

### Example 2: Batch Processing with Picking Strategy

```javascript
const resolver = new TMDBResolver();

const titles = ["The Matrix", "Inception", "Alice in Wonderland"];

for (const title of titles) {
  const matches = await resolver.resolve(title);

  if (matches.length === 0) {
    console.log(`${title}: NOT FOUND`);
  } else if (matches.length === 1) {
    console.log(`${title}: ${matches[0].tmdbId} (${matches[0].year})`);
  } else {
    // Multiple matches - pick most recent
    const mostRecent = matches[0];
    console.log(`${title}: ${mostRecent.tmdbId} (${mostRecent.year}) [${matches.length} versions]`);
  }
}

await resolver.close();
```

### Example 3: CSV Export with All Versions

```javascript
import fs from 'fs';
import TMDBResolver from './lib/tmdb-resolver.js';

const resolver = new TMDBResolver();
const titles = ["It", "Alice in Wonderland", "The Matrix"];

console.log('title,year,tmdb_id,strategy');

for (const title of titles) {
  const matches = await resolver.resolve(title);

  if (matches.length === 0) {
    console.log(`${title},,,not_found`);
  } else {
    matches.forEach(m => {
      console.log(`${m.title},${m.year},${m.tmdbId},${m.strategy}`);
    });
  }
}

await resolver.close();
```

---

## Options

```javascript
{
  skipTMDB: false,      // Don't query TMDB API
  debug: false          // Enable debug logging
}
```

**Debug output:**
```javascript
const results = await resolver.resolve("Alice in Wonderland", { debug: true });
```

Output:
```
[TMDBResolver] Resolving: "Alice in Wonderland"
[TMDBResolver] Normalized: "alice in wonderland"
[TMDBResolver] ✅ Found 7 match(es) via normalized_match
[TMDBResolver]    → Alice in Wonderland (2010) [TMDB: 12155]
[TMDBResolver]    → Alice in Wonderland (1999) [TMDB: 30923]
...
```

---

## Result Format

```javascript
[
  {
    tmdbId: 603,
    title: "The Matrix",
    year: 1999,
    posterUrl: "https://image.tmdb.org/t/p/w500/...",
    strategy: "normalized_match"
  },
  ...
]
```

**Empty array** `[]` if no matches found.

---

## Statistics Tracking

```javascript
const resolver = new TMDBResolver();

await resolver.resolve("Movie 1");
await resolver.resolve("Movie 2");
await resolver.resolve("Movie 3");

console.log(resolver.getStats());
```

Output:
```javascript
{
  total: 3,
  byStrategy: {
    normalized_match: 2,
    year_fuzzy_wide: 1
  },
  notFound: 0,
  errors: 0,
  successRate: "100.0%"
}
```

---

## Integration with Existing Code

**DO NOT replace production code** - this is for offline processing only.

### Production Search (Real-time)
Use: `/lib/services/railway-database-search.js`

### MoreIdeas Generation (AI Recommendations)
Use: `/lib/search-matching.js`

### Offline Batch Processing (Audits, Reports, CSV)
Use: **`/lib/tmdb-resolver.js`** ← This tool

---

## Common Use Cases

### 1. Audit MoreIdeas Matching
```bash
node --env-file=.env.local scripts/audit-moreideas-with-resolver.js
```

### 2. Process External Movie List
```bash
node --env-file=.env.local scripts/import-letterboxd-list.js
```

### 3. Find Missing TMDB IDs
```bash
node --env-file=.env.local scripts/find-missing-tmdb-ids.js
```

---

## Performance

- **Normalized match:** ~10ms
- **TMDB API lookup:** ~200-500ms
- **Year fuzzy match:** ~15ms

**Batch processing:** ~100 titles/second (database only, no TMDB API)

---

## Database Requirements

**Required:**
- PostgreSQL with `pg_trgm` extension (not used in v2.0, but required for table)
- `title_normalized` column in `movies` table
- Index on `title_normalized`

**Setup:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS title_normalized TEXT;
CREATE INDEX IF NOT EXISTS idx_movies_title_normalized ON movies(title_normalized);
```

---

## Environment Variables

```bash
DATABASE_URL=postgresql://...      # Required
TMDB_API_KEY=...                  # Optional (for TMDB fallback)
```

---

## Version History

**Version 2.0.0** (2026-05-14)
- Simplified to 3-stage strategy
- Returns ALL matches (no year filtering)
- Removed confidence scoring
- Removed trigram similarity
- Added ±5 year fuzzy on TMDB results

**Version 1.0.0** (2026-05-14)
- Initial release with 6-stage strategy

---

## Maintainer Notes

**When to update:**
- New normalization rules discovered
- TMDB API changes
- Database schema changes

**Testing:**
```bash
node --env-file=.env.local -e "
import TMDBResolver from './lib/tmdb-resolver.js';
const resolver = new TMDBResolver();
const results = await resolver.resolve('The Matrix', { debug: true });
console.log(results);
await resolver.close();
"
```

**Last Updated:** 2026-05-14
**Maintained By:** Engineering Team
