# Nuclear Static Analysis Report

## Summary

I analyzed the MovieGenius database to identify movies that have analysis
content but haven't been converted to nuclear static files yet. Here's what I
found:

### Current Status

- **Total movies with analysis**: 6,065
- **Total nuclear static files**: 6,024
- **Nuclear conversion rate**: 99.3%
- **Movies needing nuclear conversion**: 44

### Gap Analysis

#### 1. Movies with Analysis but No Nuclear Static Files (44 movies)

These movies have been analyzed but their nuclear static files haven't been
generated:

**Top 10 candidates:**

1. Throw Momma from the Train (1987) - TMDB: 11896
2. Yojimbo (1961) - TMDB: 11878
3. Miracle on 34th Street (1947) - TMDB: 11881
4. The Last Starfighter (1984) - TMDB: 11884
5. Alcarràs (2022) - TMDB: 804251
6. Alice (1988) - TMDB: 976732
7. Anyone But You (2023) - TMDB: 1072790
8. Oppenheimer (2023) - TMDB: 872585
9. 27 Dresses (2008) - TMDB: 6557
10. Above and Beyond (2014) - TMDB: 1034474

**Complete list of TMDB IDs:** 11896, 11878, 11881, 11884, 804251, 976732,
1072790, 872585, 6557, 1034474, 762968, 881209, 802839, 1175201, 6106, 6479,
5919, 7300, 11873, 13509, 24837, 1054757, 949075, 811933, 973484, 820517,
835961, 1282378, 830488, 771464, 768386, 766507, 787434, 763390, 1220995,
876794, 779207, 820912, 855823, 1035090, 856369, 88950, 1004663, 1251838

#### 2. Nuclear Candidates Without Analysis (471 movies)

These are movies in the top 1,000 nuclear candidates but don't have analysis
yet.

## Tools and Scripts Created

### 1. Analysis Gap Checker (`check-analysis-gap.js`)

- Basic script to identify movies with analysis but no nuclear static files
- Shows conversion rate and lists candidates

### 2. Nuclear Conversion Report (`nuclear-conversion-report.js`)

- Comprehensive analysis of the conversion gap
- Categorizes movies by status (analyzed, nuclear static, both)
- Provides actionable recommendations
- Exports data in JSON format for scripting

### 3. Nuclear Conversion Script (`convert-missing-nuclear.js`)

- Automated script to convert the 44 movies with analysis to nuclear static
  files
- Processes movies in batches of 10
- Uses the existing nuclear-static-generator.js

## Existing System Analysis

### Nuclear Dashboard (`pages/nuclear-dashboard.js`)

- Shows real-time status of nuclear conversion progress
- Displays recent activity, cost tracking, and next actions
- Includes autonomous system monitoring

### Nuclear Status API (`pages/api/nuclear-status.js`)

- Provides comprehensive nuclear status including:
  - Movies with analysis vs nuclear static files
  - Recent activity (last 24 hours)
  - Cost estimates and completion percentages
  - Recommended next actions

### Nuclear Static Generator (`scripts/nuclear-static-generator.js`)

- Main script for generating nuclear static files
- Supports batch processing and resume capability
- Includes validation and error handling
- Converts movie analysis to static JSON files

### Autonomous Nuclear System (`lib/autonomous-nuclear-system.js`)

- Self-healing background system for nuclear conversion
- Automatically identifies and processes nuclear candidates
- Includes health monitoring and rate limiting
- Processes movies in batches with retry logic

### Detection Scripts

- `detect-processed-files.js`: Analyzes which nuclear static files have been
  processed
- `check-nuclear-transformation.js`: Validates nuclear format transformation
- `check-static-readiness.js`: Assesses readiness for static page generation

## How to Identify Movies Needing Nuclear Conversion

### Method 1: Using the Nuclear Dashboard

1. Visit `/nuclear-dashboard` page
2. Check "Movies needing nuclear conversion" section
3. Review "Recommended Actions" for conversion commands

### Method 2: Using the Nuclear Status API

```javascript
// GET /api/nuclear-status
// Returns:
{
  "pending_movies": [...], // Movies needing conversion
  "processed_movies": [...], // Already converted
  "next_actions": [...] // Recommended commands
}
```

### Method 3: Using Analysis Scripts

```bash
# Generate comprehensive report
node nuclear-conversion-report.js

# Quick analysis gap check
node check-analysis-gap.js

# Convert missing nuclear files
node convert-missing-nuclear.js
```

## Conversion Commands

### Convert Specific Movies

```bash
# Convert the 44 movies with analysis to nuclear static
node convert-missing-nuclear.js

# Or manually using the generator
node scripts/nuclear-static-generator.js --tmdb-ids=11896,11878,11881,11884,804251,976732,1072790,872585,6557,1034474
```

### Generate Analysis for Nuclear Candidates

```bash
# For the 471 candidates without analysis
node scripts/batch-analysis-generator.js --tmdb-ids=137599,626392,800383,471498,1279334,639829,330044,15938,423154,987504
```

## Database Queries

### Find Movies with Analysis but No Nuclear Static Files

```sql
SELECT m.tmdb_id, m.title, m.year, ma.created_at
FROM movies m
JOIN movie_analyses ma ON m.id = ma.movie_id
WHERE ma.analysis_type = 'page_analysis'
AND m.tmdb_id NOT IN (
  -- List of nuclear static file TMDB IDs
  SELECT DISTINCT tmdb_id FROM nuclear_static_files
);
```

### Find Nuclear Candidates Without Analysis

```sql
SELECT m.tmdb_id, m.title, m.year, m.created_at
FROM movies m
WHERE m.tmdb_id IS NOT NULL
AND m.id NOT IN (
  SELECT DISTINCT movie_id FROM movie_analyses
  WHERE analysis_type = 'page_analysis'
)
ORDER BY m.created_at DESC
LIMIT 1000;
```

## Recommendations

1. **Immediate Action**: Run `convert-missing-nuclear.js` to convert the 44
   movies with analysis
2. **Monitor Progress**: Use the nuclear dashboard to track conversion progress
3. **Automate**: Let the autonomous nuclear system handle ongoing conversions
4. **Validate**: Use the detection scripts to verify conversion quality

## Files Created/Modified

- `check-analysis-gap.js` - Basic analysis gap checker
- `nuclear-conversion-report.js` - Comprehensive conversion analysis
- `convert-missing-nuclear.js` - Automated conversion script
- `nuclear-conversion-report.json` - Generated report data
- `NUCLEAR_ANALYSIS_REPORT.md` - This documentation

The system is 99.3% complete with only 44 movies needing nuclear conversion,
indicating a very mature and well-functioning nuclear static system.
