# Database Documentation Index

Complete guide to MovieGenius database documentation and structure.

## Quick Start

1. **Just need to write a query?** → Read `/docs/DATABASE_QUICK_REFERENCE.md`
2. **Need table definitions?** → Read `/docs/DATABASE_SCHEMA.md`
3. **Want the big picture?** → Read `../DATABASE_ANALYSIS_SUMMARY.txt`

---

## Documentation Files

### DATABASE_SCHEMA.md (Comprehensive Reference - 967 lines)

Complete technical reference for the entire database schema.

**Sections:**
- Core Tables (movies, movie_analyses, enhanced_why_watch)
- Browse System Tables (lists, facets, relationships, engagement, jobs)
- Supporting Tables (persons, contributors, legacy lists, episodes)
- Administrative Tables (error tracking, metrics, deployments)
- Views (6 pre-built queries for common operations)
- Database Functions and Triggers
- Data Relationships (ER diagram equivalent)
- Query Patterns (documented examples)
- Performance Notes (indexing strategy)
- Migration Strategy (safe schema changes)

**Use when:**
- Setting up a new development environment
- Writing complex queries
- Understanding table relationships
- Learning about JSONB field structures
- Implementing new features that need schema changes

---

### DATABASE_QUICK_REFERENCE.md (Quick Lookup - 240+ lines)

Fast reference guide with practical examples for common tasks.

**Sections:**
- Core Tables at a Glance (quick comparison table)
- Common Queries with Code Examples
- Status Flags Hierarchy (content pipeline visualization)
- Browse System Structure (facet types, list statuses)
- Indexes for Performance (which columns are indexed)
- JSONB Field Access (examples for extracting nested data)
- Constraints & Uniqueness (what fields are unique)
- Pre-built Views (ready-to-use queries)
- Self-Healing Features (automatic data maintenance)
- Connection Settings (Railway PostgreSQL config)

**Use when:**
- Writing API endpoints
- Debugging data issues
- Optimizing slow queries
- Checking constraint details
- Extracting JSONB data
- Understanding status flags

---

### DATABASE_ANALYSIS_SUMMARY.txt (Executive Summary - This Directory)

High-level overview of schema design and key findings.

**Sections:**
- Analysis Summary (table categorization)
- Key Findings (schema characteristics)
- Structure by Table (visual tree diagrams)
- Key Indexes (performance-critical indexes)
- JSONB Field Structures (data examples)
- Query Patterns (common operations)
- Recommendations (best practices)

**Use when:**
- Onboarding new team members
- Understanding overall data architecture
- Planning new features
- Reviewing performance strategies
- Making schema design decisions

---

## Table Organization by Purpose

### Core Movie Data
- **movies** - Master table with TMDB integration and processing pipeline
- **movie_analyses** - AI-generated analysis content
- **enhanced_why_watch** - Binary recommendations with reasons

Use together for complete movie information.

### Browse System (Collections & Taxonomy)
- **browse_lists** - Curated movie collections (827+)
- **browse_facets** - Taxonomy categories (genre/theme/location/time/contributor/technique/mood)
- **list_movies** - Movies assigned to lists
- **list_facets** - Facets assigned to lists
- **browse_list_jobs** - Batch processing jobs
- **browse_list_engagement** - User interaction tracking

Use for collection browsing and navigation features.

### Legacy Lists (Older System)
- **movie_lists** - Legacy list data
- **movie_list_items** - Legacy list membership
- **list_analyses** - AI descriptions for lists

Being phased out in favor of browse_lists system.

### Person Management
- **persons** - Cast/crew registry (39,606 entries)
- **movie_contributors** - Relationship index

Use for person pages and credits.

### Educational Content (Archived)
- **episodes** - Educational content (Genius feature - now archived)

Not actively used.

### System Monitoring
- **error_logs** - Error tracking
- **error_alerts** - Critical alerts
- **performance_metrics** - Query metrics
- **deployments** - Deployment history

Use for system health and diagnostics.

---

## Data Flow Diagrams

### Movie Content Pipeline

```
User Creates Movie
    ↓
Movie Enters "movies" Table
    ↓
TMDB Data Enriched (tmdb_id, poster_url, streaming_data)
    ↓
Claude Analysis Generated
    ↓
movie_analyses Created (claude_response with raw_content, keyElements)
    ↓
Contributors Auto-Extracted (→ movie_contributors, persons)
    ↓
Links Processed (links_processed = TRUE)
    ↓
Slug Generated (slug_generated = TRUE)
    ↓
Validation Passed (validation_passed = TRUE, quality_score >= 70)
    ↓
display_ready = TRUE ✓
```

**Tracking:** Status flags in `movies` table show which stage each movie is in.

---

### Browse Collection System

```
AI Generation Job Started
    ↓
browse_lists Created (new collection concepts)
    ↓
Movies Assigned (→ list_movies with relevance_score)
    ↓
Facets Assigned (→ list_facets for organization)
    ↓
Metrics Updated (total_movies, avg_relevance_score)
    ↓
browse_list_engagement Tracks User Interactions
    ↓
Consolidation May Occur (merge/split/archive lists)
```

**Tracking:** browse_list_jobs table shows batch processing history.

---

## Common Query Scenarios

### Scenario 1: Get Full Movie Data for Display

```javascript
// Use this query to show movie with analysis and recommendation
const result = await pool.query(`
  SELECT 
    m.id, m.title, m.year, m.tmdb_id, m.poster_url, m.slug,
    ma.claude_response->>'raw_content' as analysis,
    eww.recommendation,
    eww.reasons
  FROM movies m
  LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
  LEFT JOIN enhanced_why_watch eww ON m.tmdb_id = eww.tmdb_id
  WHERE m.tmdb_id = $1
`, [tmdbId]);

// Documented in: DATABASE_QUICK_REFERENCE.md → "Get Movie with Analysis"
// Schema details in: DATABASE_SCHEMA.md → "movies", "movie_analyses", "enhanced_why_watch"
```

### Scenario 2: List All Browse Collections

```javascript
// Get collections with movie count and facets
const result = await pool.query(`
  SELECT 
    bl.id, bl.title, bl.description, bl.total_movies,
    array_agg(bf.name) as facets,
    bl.user_rating, bl.view_count
  FROM browse_lists bl
  LEFT JOIN list_facets lf ON bl.id = lf.list_id
  LEFT JOIN browse_facets bf ON lf.facet_id = bf.id
  WHERE bl.status = 'active'
  GROUP BY bl.id
  ORDER BY bl.user_rating DESC
`);

// Documented in: DATABASE_QUICK_REFERENCE.md → "Browse List with Movies"
// Schema details in: DATABASE_SCHEMA.md → "browse_lists", "list_facets", "browse_facets"
```

### Scenario 3: Check Content Completion Status

```javascript
// Get summary of what's been processed
const result = await pool.query('SELECT * FROM content_status_dashboard');

// Result shows:
// - total_items: 35000+
// - analysis_complete: 21275
// - display_ready: 18500 (estimate)
// - completion_percentage: 52.8%

// Documented in: DATABASE_QUICK_REFERENCE.md → "Views"
// View definition in: DATABASE_SCHEMA.md → "content_status_dashboard"
```

### Scenario 4: Find Movies Needing Work

```javascript
// Get gaps that need attention
const needsAnalysis = await pool.query('SELECT * FROM movies_needing_analysis');
const needsLinks = await pool.query('SELECT * FROM movies_needing_links');
const needsSlugs = await pool.query('SELECT * FROM movies_needing_slugs');
const needsReview = await pool.query('SELECT * FROM movies_needing_review');

// These views make content gap analysis easy
// Documented in: DATABASE_QUICK_REFERENCE.md → "Views"
// View definitions in: DATABASE_SCHEMA.md
```

### Scenario 5: Get Movie Credits

```javascript
// Show director, writers, stars for a movie
const result = await pool.query(`
  SELECT p.id, p.name, mc.role
  FROM movie_contributors mc
  JOIN persons p ON mc.person_id = p.id
  WHERE mc.movie_tmdb_id = $1
  ORDER BY 
    CASE mc.role
      WHEN 'director' THEN 1
      WHEN 'writer' THEN 2
      WHEN 'star' THEN 3
      ELSE 99
    END,
    p.name
`, [tmdbId]);

// Documented in: DATABASE_QUICK_REFERENCE.md → "Get Movie Contributors"
// Schema details in: DATABASE_SCHEMA.md → "persons", "movie_contributors"
```

---

## Performance Optimization

### Index-Aware Queries

When writing queries, always use these indexed columns in WHERE clauses:

| Column | Index | When to Use |
|--------|-------|------------|
| tmdb_id | idx_movies_tmdb_id | Exact movie lookup |
| title + year | idx_movies_title_year | Duplicate detection |
| analysis_ready | idx_movies_analysis_ready | Filter by completion status |
| status | idx_browse_lists_status | Filter lists by state |
| movie_id + analysis_type | idx_movie_analyses_movie_type | Get specific analysis |
| list_id + relevance_score | idx_list_movies_relevance | Sort movies in list |

**Full index reference:** DATABASE_QUICK_REFERENCE.md → "Indexes for Performance"

### JSONB Query Optimization

When querying JSONB fields, use proper syntax:

```javascript
// Extract text value: use ->>
const title = row.claude_response->>'raw_content'

// Extract object/array: use ->
const keyElements = row.claude_response->'keyElements'

// Cast to specific type: use ::type
const quality = (row.claude_response->'validation_report'->>'quality_score')::int

// For GIN indexes to work, use standard operators
WHERE content @> '{"locked": true}'::jsonb
```

**Full JSONB reference:** DATABASE_QUICK_REFERENCE.md → "JSONB Field Access"

---

## Schema Change Process

When modifying the database schema:

1. **Create migration file** in `/scripts/`
2. **Use IF NOT EXISTS** for ADD COLUMN:
   ```sql
   ALTER TABLE movies ADD COLUMN IF NOT EXISTS new_column TYPE;
   ```
3. **Create CONCURRENT indexes** to avoid locks:
   ```sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_name ON table(column);
   ```
4. **Document changes** in this file
5. **Test on staging first** before production

**Full migration strategy:** DATABASE_SCHEMA.md → "Migration Strategy"

---

## Constraints & Uniqueness

Important uniqueness constraints:

| Table | Unique Constraint | Reason |
|-------|-------------------|--------|
| movies | (tmdb_id) | One TMDB record per movie |
| browse_lists | (title) | List titles must be distinct |
| browse_facets | (name, facet_type) | Same name can exist in different types |
| list_movies | (list_id, movie_id) | Movie appears once per list |
| list_analyses | (list_id, analysis_type) | One analysis per type per list |
| episodes | (theme_id, series_id, episode_id) | Episodes uniquely identified |

**Full constraints list:** DATABASE_QUICK_REFERENCE.md → "Constraints & Uniqueness"

---

## Related Documentation

- **Architecture:** `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md` - Overall system design
- **API Reference:** `/docs/API_REFERENCE.md` - API endpoints that use these tables
- **Operations:** `/docs/operations/DEPLOYMENT_COMPLETE_GUIDE.md` - Database backups, recovery
- **Code Examples:** `/lib/railway-db.js` - Service layer using these tables

---

## Troubleshooting

### Query Returns No Results?

1. Check if columns are indexed → Use them in WHERE clause
2. Verify JSONB syntax → Use ->> for text, -> for objects
3. Check status flags → Use views for quick troubleshooting
4. See: DATABASE_QUICK_REFERENCE.md → "Status Flags Hierarchy"

### Getting Slow Query Performance?

1. Check EXPLAIN plan → See which index is used
2. Use indexed columns → Reference "Indexes for Performance"
3. Avoid full table scans → Filter before joining
4. See: DATABASE_SCHEMA.md → "Performance Notes"

### Need to Extract Data from JSONB?

1. Use proper syntax → ->> for text, -> for objects
2. Cast types → Use ::int, ::boolean, etc.
3. Example queries → DATABASE_QUICK_REFERENCE.md → "JSONB Field Access"
4. Full JSONB structures → DATABASE_SCHEMA.md → "JSONB Field Structures"

---

## File Locations

```
moviegenius/
├── docs/
│   ├── DATABASE_SCHEMA.md ...................... [Complete reference - START HERE]
│   ├── DATABASE_QUICK_REFERENCE.md ............ [Fast lookup for queries]
│   ├── DATABASE_INDEX.md ....................... [This file]
│   ├── MOVIEGENIUS_V3_ARCHITECTURE.md ........ [System design]
│   └── API_REFERENCE.md ....................... [API endpoints]
├── DATABASE_ANALYSIS_SUMMARY.txt .............. [Executive summary]
├── lib/
│   └── railway-db.js .......................... [Service layer implementation]
└── scripts/
    └── *.sql .................................. [Schema migration files]
```

---

## Getting Help

**For schema questions:**
→ DATABASE_SCHEMA.md (complete technical reference)

**For writing queries:**
→ DATABASE_QUICK_REFERENCE.md (examples and patterns)

**For understanding the big picture:**
→ DATABASE_ANALYSIS_SUMMARY.txt (architecture overview)

**For system design:**
→ MOVIEGENIUS_V3_ARCHITECTURE.md (overall project vision)

**For API specifics:**
→ API_REFERENCE.md (endpoint documentation)

