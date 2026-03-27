# Database Schema Quick Reference

Quick lookup for common tables and queries in MovieGenius.

## Core Tables at a Glance

| Table | Purpose | Key Columns | Records |
|-------|---------|------------|---------|
| **movies** | Master movie list | id, tmdb_id, title, year, slug, poster_url | 35K+ |
| **movie_analyses** | Claude analysis content | movie_id, claude_response (JSONB), analysis_type | 21,275+ |
| **enhanced_why_watch** | YES/NO recommendations | recommendation, reasons (JSONB), metadata | Growing |
| **browse_lists** | Curated collections | id, title, total_movies, status | 827+ |
| **browse_facets** | Taxonomy categories | name, facet_type (genre/theme/location/time/contributor/technique/mood) | 50+ |
| **list_movies** | List membership | list_id, movie_id, relevance_score | 2000+ |
| **persons** | Cast/crew registry | id, name | 39,606 |
| **movie_contributors** | Credits index | movie_tmdb_id, person_id, role | 100K+ |

## Common Queries

### Find Movie by TMDB ID
```javascript
const movie = await pool.query(
  'SELECT * FROM movies WHERE tmdb_id = $1',
  [238] // The Godfather
);
```

### Get Movie with Analysis
```javascript
const result = await pool.query(`
  SELECT 
    m.title, m.year, m.tmdb_id,
    ma.claude_response
  FROM movies m
  LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
  WHERE m.tmdb_id = $1
`, [tmdbId]);
```

### Get Why Watch Recommendation
```javascript
const eww = await pool.query(`
  SELECT recommendation, reasons
  FROM enhanced_why_watch
  WHERE tmdb_id = $1
`, [tmdbId]);
```

### Browse List with Movies
```javascript
const list = await pool.query(`
  SELECT bl.title, bl.description,
         array_agg(m.title) as movies,
         array_agg(lm.relevance_score) as scores
  FROM browse_lists bl
  LEFT JOIN list_movies lm ON bl.id = lm.list_id
  LEFT JOIN movies m ON lm.movie_id = m.id
  WHERE bl.id = $1
  GROUP BY bl.id
`, [listId]);
```

### Get Movie Contributors
```javascript
const contributors = await pool.query(`
  SELECT p.name, mc.role
  FROM movie_contributors mc
  JOIN persons p ON mc.person_id = p.id
  WHERE mc.movie_tmdb_id = $1
  ORDER BY mc.role, p.name
`, [tmdbId]);
```

### Content Status Report
```javascript
const status = await pool.query(`
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE analysis_ready = TRUE) as analyzed,
    COUNT(*) FILTER (WHERE display_ready = TRUE) as ready,
    ROUND(COUNT(*) FILTER (WHERE display_ready = TRUE) * 100.0 / COUNT(*), 1) as percent
  FROM movies
  WHERE tmdb_id IS NOT NULL
`);
```

## Status Flags Hierarchy

Use these flags to track movie content completion:

```
✅ analysis_ready = TRUE
   ↓
✅ links_processed = TRUE
   ↓
✅ slug_generated = TRUE
   ↓
✅ content_complete = TRUE (all above + validation_passed)
   ↓
✅ display_ready = TRUE (content_complete + quality_score >= 70)
```

## Browse System Structure

**Facet Types:**
- `genre` - Drama, Horror, Comedy, Action, Thriller, Romance, Sci-Fi
- `theme` - Family Secrets, White Collar Crime, Identity Crisis, Moral Ambiguity
- `location` - Italy, New York, Small Towns, Los Angeles
- `time` - 1970s, Contemporary, Victorian Era, Post-War
- `contributor` - Directors/creators
- `technique` - Non-Linear Narrative, Single Location, Ensemble Cast
- `mood` - Dark Comedy, Paranoid Atmosphere, Nostalgic

**List Status Values:**
- `active` - Visible in UI
- `draft` - Under development
- `archived` - Retired lists
- `merged` - Combined into other lists

## Indexes for Performance

**Always use these columns in WHERE clauses:**

| Query Pattern | Use Index |
|---------------|-----------|
| `WHERE tmdb_id = X` | `idx_movies_tmdb_id` |
| `WHERE title = X AND year = Y` | `idx_movies_title_year` |
| `WHERE analysis_ready = TRUE` | `idx_movies_analysis_ready` |
| `WHERE status IN (...)` | `idx_browse_lists_status` |
| `WHERE movie_id = X AND analysis_type = Y` | `idx_movie_analyses_movie_type` |

## JSONB Field Access

Extract data from JSONB columns:

```sql
-- From movie_analyses.claude_response
SELECT 
  claude_response->>'raw_content' as content,
  claude_response->'keyElements'->>'director' as director,
  (claude_response->'validation_report'->>'quality_score')::int as score
FROM movie_analyses
WHERE movie_id = $1;

-- From enhanced_why_watch.reasons
SELECT 
  recommendation,
  reasons->>0 as first_reason,
  (reasons->1->>'strength')::decimal as second_reason_strength
FROM enhanced_why_watch
WHERE tmdb_id = $1;
```

## Constraints & Uniqueness

| Table | Unique Constraint |
|-------|-------------------|
| movies | (tmdb_id) |
| movie_analyses | (movie_id, analysis_type) |
| enhanced_why_watch | (movie_id) |
| browse_lists | (title) |
| browse_facets | (name, facet_type) |
| list_movies | (list_id, movie_id) |
| list_facets | (list_id, facet_id) |
| episodes | (theme_id, series_id, episode_id) |
| movie_lists | (slug) |
| movie_list_items | (list_id, movie_id) |
| list_analyses | (list_id, analysis_type) |

## Views (Pre-built Queries)

```sql
-- Use these ready-made views:
SELECT * FROM content_status_dashboard;      -- Overall completion stats
SELECT * FROM movies_needing_analysis;       -- Movies without analysis
SELECT * FROM movies_needing_links;          -- Analysis but no link processing
SELECT * FROM movies_needing_slugs;          -- Missing URL slugs
SELECT * FROM movies_needing_review;         -- Low quality content
SELECT * FROM facet_hierarchy;               -- Browse facets with paths
```

## Self-Healing Features

**Automatic contributor extraction:** When a movie_analyses record is created/updated, the system automatically extracts contributors (director, writers, stars, composer, cinematographer) from `keyElements` and stores them in the `movie_contributors` table.

**Status tracking:** Movies track their processing pipeline:
- When analysis created → `analysis_ready = TRUE`
- When links processed → `links_processed = TRUE`
- When slug generated → `slug_generated = TRUE`
- All three → `content_complete = TRUE`
- If quality >= 70 → `display_ready = TRUE`

**Failure recovery:** Use `record_content_failure(movie_id, reason)` function to track processing errors and mark for review after 3 failures.

## Connection Settings

**Railway PostgreSQL:**
- Connection string: `RAILWAY_DATABASE_URL` or `DATABASE_URL`
- Pool size: 20 connections max
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

```javascript
import { getPool } from '../lib/railway-db.js';
const pool = getPool();
const result = await pool.query(sql, params);
```

## Related Files

- Full schema: `/docs/DATABASE_SCHEMA.md`
- Architecture: `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md`
- API Reference: `/docs/API_REFERENCE.md`
