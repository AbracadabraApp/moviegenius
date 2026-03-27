# MovieGenius Database Schema

**Last Updated:** 2026-03-22  
**Database:** Railway PostgreSQL  
**Current Records:** 21,275+ movie analyses, 35K+ movies, 39,606 persons

---

## Table of Contents

1. [Core Tables](#core-tables)
   - [movies](#movies)
   - [movie_analyses](#movie_analyses)
   - [enhanced_why_watch](#enhanced_why_watch)
2. [Browse System Tables](#browse-system-tables)
   - [browse_lists](#browse_lists)
   - [browse_facets](#browse_facets)
   - [list_movies](#list_movies)
   - [list_facets](#list_facets)
3. [Supporting Tables](#supporting-tables)
   - [persons](#persons)
   - [movie_contributors](#movie_contributors)
   - [movie_lists](#movie_lists)
   - [movie_list_items](#movie_list_items)
   - [list_analyses](#list_analyses)
   - [episodes](#episodes)
4. [Administrative Tables](#administrative-tables)
5. [Views](#views)

---

## Core Tables

### movies

**Purpose:** Master table for all movies in the system, integrating TMDB data and internal processing flags.

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | NO | AUTO | Internal primary key |
| tmdb_id | INTEGER | YES | NULL | TMDB movie ID (unique for premium movies) |
| title | VARCHAR(255) | NO | - | Movie title |
| year | INTEGER | YES | NULL | Release year |
| official_title | VARCHAR(255) | YES | NULL | Official/international title from TMDB |
| release_date | DATE | YES | NULL | Full release date |
| slug | TEXT | YES | NULL | URL-friendly identifier (auto-generated) |
| poster_url | TEXT | YES | NULL | TMDB poster image URL |
| streaming_data | JSONB | YES | NULL | Streaming availability data (JustWatch) |
| trailer_url | TEXT | YES | NULL | URL to movie trailer |
| created_at | TIMESTAMP | NO | NOW() | Record creation timestamp |
| updated_at | TIMESTAMP | NO | NOW() | Last update timestamp |
| **Content Status Flags** | | | | |
| analysis_ready | BOOLEAN | NO | FALSE | Has complete movie analysis |
| links_processed | BOOLEAN | NO | FALSE | Internal movie links extracted and validated |
| content_complete | BOOLEAN | NO | FALSE | All content steps completed |
| display_ready | BOOLEAN | NO | FALSE | High-quality content, ready for display |
| slug_generated | BOOLEAN | NO | FALSE | URL slug has been generated |
| **Quality Tracking** | | | | |
| validation_passed | BOOLEAN | NO | FALSE | Content validation successful |
| quality_score | INTEGER | NO | 0 | Quality rating (0-100) |
| requires_review | BOOLEAN | NO | FALSE | Manual review needed |
| **Failure Tracking** | | | | |
| last_failure_reason | TEXT | YES | NULL | Reason for last processing failure |
| failure_count | INTEGER | NO | 0 | Total processing failures |
| last_failure_at | TIMESTAMP | YES | NULL | Timestamp of last failure |
| analysis_ready_at | TIMESTAMP | YES | NULL | When analysis became ready |
| links_processed_at | TIMESTAMP | YES | NULL | When links were processed |
| content_complete_at | TIMESTAMP | YES | NULL | When all content completed |
| last_validation_at | TIMESTAMP | YES | NULL | Last validation timestamp |

**Key Indexes:**

```sql
CREATE INDEX idx_movies_title_year ON movies(title, year);
CREATE INDEX idx_movies_tmdb_id ON movies(tmdb_id) WHERE tmdb_id IS NOT NULL;
CREATE INDEX idx_movies_created_at ON movies(created_at DESC);
CREATE INDEX idx_movies_analysis_ready ON movies(analysis_ready) WHERE analysis_ready = TRUE;
CREATE INDEX idx_movies_content_complete ON movies(content_complete) WHERE content_complete = TRUE;
CREATE INDEX idx_movies_display_ready ON movies(display_ready) WHERE display_ready = TRUE;
CREATE INDEX idx_movies_status_compound ON movies(analysis_ready, links_processed, slug_generated, validation_passed);
CREATE INDEX idx_movies_failures ON movies(last_failure_at, failure_count) WHERE failure_count > 0;
CREATE INDEX idx_movies_title_gin ON movies USING GIN(title gin_trgm_ops);
```

**Example Query:**

```javascript
const query = 'SELECT * FROM movies WHERE tmdb_id = $1 LIMIT 1';
const result = await dbClient.query(query, [238]); // The Godfather
```

---

### movie_analyses

**Purpose:** Stores AI-generated movie analysis from Claude, containing detailed content, key elements, and metadata.

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | NO | AUTO | Primary key |
| movie_id | INTEGER | NO | - | Foreign key to movies table |
| analysis_type | VARCHAR(50) | NO | - | Type of analysis (e.g., 'page_analysis', 'enhanced_analysis') |
| claude_response | JSONB | YES | NULL | Full Claude API response containing analysis content |
| created_at | TIMESTAMP | NO | NOW() | Analysis creation timestamp |
| updated_at | TIMESTAMP | NO | NOW() | Last update timestamp |

**claude_response Structure (JSONB):**

```json
{
  "raw_content": "200-300 word analysis text...",
  "keyElements": {
    "director": "Name",
    "writers": ["Name1", "Name2"],
    "stars": ["Name1", "Name2"],
    "composer": "Name",
    "cinematographer": "Name"
  },
  "has_links": true,
  "validation_report": {
    "validation_passed": true,
    "quality_score": 85,
    "issues": []
  }
}
```

**Key Indexes:**

```sql
CREATE INDEX idx_movie_analyses_movie_type ON movie_analyses(movie_id, analysis_type);
CREATE INDEX idx_movie_analyses_movie_id ON movie_analyses(movie_id);
CREATE INDEX idx_movie_analyses_type ON movie_analyses(analysis_type);
```

**Example Query:**

```javascript
const query = `
  SELECT * FROM movie_analyses 
  WHERE movie_id = $1 
  ORDER BY created_at DESC 
  LIMIT 1
`;
const result = await dbClient.query(query, [movieId]);
```

---

### enhanced_why_watch

**Purpose:** Stores enhanced Why Watch recommendations for movies with binary YES/NO recommendation and 3 specific reasons.

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | SERIAL | NO | AUTO | Primary key |
| movie_id | UUID | NO | - | Foreign key to movies |
| tmdb_id | INTEGER | NO | - | TMDB ID for faster lookups |
| recommendation | VARCHAR(3) | NO | - | YES or NO recommendation |
| reasons | JSONB | NO | - | Array of 3 reason objects |
| metadata | JSONB | YES | NULL | Generation metadata (cost, processing_time) |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |

**reasons Structure (JSONB Array):**

```json
[
  {
    "reason": "Reason text 1...",
    "strength": 0.95,
    "category": "plot|character|theme|visual|performance"
  },
  {
    "reason": "Reason text 2...",
    "strength": 0.87
  },
  {
    "reason": "Reason text 3...",
    "strength": 0.82
  }
]
```

**metadata Structure:**

```json
{
  "cost": 0.00234,
  "processingTime": 1234,
  "model": "claude-3-haiku",
  "version": "v1"
}
```

**Query Pattern:**

```javascript
const query = `
  SELECT 
    eww.recommendation,
    eww.reasons,
    m.title,
    m.year
  FROM enhanced_why_watch eww
  JOIN movies m ON eww.movie_id = m.id
  WHERE eww.tmdb_id = $1
`;
```

---

## Browse System Tables

The browse system implements a polyhierarchical taxonomy for organizing 1000+ curated movie lists.

### browse_lists

**Purpose:** Core browse list metadata and AI generation information.

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| title | VARCHAR(200) | NO | - | List title (UNIQUE) |
| description | TEXT | YES | NULL | Full list description |
| concept_analysis | JSONB | YES | NULL | Claude's reasoning for this list concept |
| ai_confidence | DECIMAL(3,2) | NO | 0.0 | AI confidence score (0.0-1.0) |
| generation_prompt_version | VARCHAR(10) | NO | '1.0' | Prompt version used for generation |
| total_movies | INTEGER | NO | 0 | Count of movies in this list |
| avg_relevance_score | DECIMAL(3,2) | NO | 0.0 | Average relevance score of movies |
| view_count | INTEGER | NO | 0 | Number of times viewed |
| click_through_rate | DECIMAL(3,2) | NO | 0.0 | CTR (0.0-1.0) |
| user_rating | DECIMAL(3,2) | NO | 0.0 | User satisfaction rating |
| status | VARCHAR(20) | NO | 'active' | 'active', 'draft', 'archived', 'merged' |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NO | NOW() | Last update timestamp |

**Key Indexes:**

```sql
CREATE INDEX idx_browse_lists_status ON browse_lists(status);
CREATE INDEX idx_browse_lists_engagement ON browse_lists(user_rating DESC, view_count DESC);
CREATE INDEX idx_browse_lists_movies_count ON browse_lists(total_movies DESC);
```

---

### browse_facets

**Purpose:** Multi-dimensional taxonomy facets for organizing browse lists (genre, theme, location, time, contributor, technique, mood).

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| name | VARCHAR(100) | NO | - | Facet name (unique per type) |
| facet_type | VARCHAR(50) | NO | - | Type: 'genre', 'theme', 'location', 'time', 'contributor', 'technique', 'mood' |
| parent_facet_id | UUID | YES | NULL | Parent facet (for hierarchies) |
| display_name | VARCHAR(100) | YES | NULL | User-friendly display name |
| description | TEXT | YES | NULL | Facet description |
| ui_color | VARCHAR(7) | YES | NULL | Hex color for UI theming |
| ui_icon | VARCHAR(50) | YES | NULL | Icon identifier |
| display_order | INTEGER | NO | 0 | Sort order in UI |
| list_count | INTEGER | NO | 0 | Lists using this facet |
| movie_count | INTEGER | NO | 0 | Total unique movies across all lists |
| engagement_score | DECIMAL(5,2) | NO | 0.0 | User interaction strength |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NO | NOW() | Last update timestamp |

**Key Indexes:**

```sql
CREATE INDEX idx_browse_facets_type ON browse_facets(facet_type);
CREATE INDEX idx_browse_facets_engagement ON browse_facets(engagement_score DESC);
CREATE INDEX idx_browse_facets_hierarchy ON browse_facets(parent_facet_id);
```

---

### list_movies

**Purpose:** Junction table linking movies to browse lists with relevance and positioning data.

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| list_id | UUID | NO | - | Foreign key to browse_lists |
| movie_id | UUID | NO | - | Foreign key to movies |
| relevance_score | DECIMAL(3,2) | NO | - | How well movie fits list (0.1-1.0) |
| selection_reason | TEXT | YES | NULL | Claude's explanation for inclusion |
| display_order | INTEGER | YES | NULL | Position within list (usually by relevance DESC) |
| is_featured | BOOLEAN | NO | FALSE | Highlight as perfect example |
| is_gateway | BOOLEAN | NO | FALSE | Good entry point for list concept |
| added_at | TIMESTAMP | NO | NOW() | When added to list |
| added_by_job_id | UUID | YES | NULL | Reference to generation job |
| **Primary Key:** list_id, movie_id | | | | |

**Key Indexes:**

```sql
CREATE INDEX idx_list_movies_relevance ON list_movies(list_id, relevance_score DESC);
CREATE INDEX idx_list_movies_featured ON list_movies(list_id, is_featured) WHERE is_featured = true;
CREATE INDEX idx_list_movies_gateway ON list_movies(list_id, is_gateway) WHERE is_gateway = true;
CREATE INDEX idx_list_movies_by_movie ON list_movies(movie_id, relevance_score DESC);
```

---

### list_facets

**Purpose:** Many-to-many junction linking browse lists to facets for polyhierarchical organization.

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| list_id | UUID | NO | - | Foreign key to browse_lists |
| facet_id | UUID | NO | - | Foreign key to browse_facets |
| relevance_score | DECIMAL(3,2) | NO | 1.0 | Facet relationship strength (0.1-1.0) |
| is_primary | BOOLEAN | NO | FALSE | Primary classification facet |
| display_order | INTEGER | YES | NULL | Order within facet for UI |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |
| **Primary Key:** list_id, facet_id | | | | |

**Key Indexes:**

```sql
CREATE INDEX idx_list_facets_primary ON list_facets(facet_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_list_facets_relevance ON list_facets(facet_id, relevance_score DESC);
```

---

### browse_list_jobs

**Purpose:** Track AI processing batches for list generation and updates.

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| job_type | VARCHAR(50) | NO | - | 'initial_generation', 'incremental', 'consolidation', 'refinement' |
| status | VARCHAR(20) | NO | 'pending' | 'pending', 'processing', 'completed', 'failed', 'cancelled' |
| analysis_batch_id | VARCHAR(100) | YES | NULL | Reference to source analysis batch |
| movie_count | INTEGER | YES | NULL | Movies in batch |
| prompt_version | VARCHAR(10) | YES | NULL | Prompt version used |
| target_list_count | INTEGER | YES | NULL | Target number of lists |
| facet_focus | JSONB | YES | NULL | Facet types to emphasize: ['genre', 'theme'] |
| lists_created | INTEGER | NO | 0 | Lists created by job |
| lists_updated | INTEGER | NO | 0 | Lists updated by job |
| movies_assigned | INTEGER | NO | 0 | Total movie assignments |
| total_cost | DECIMAL(8,2) | NO | 0.0 | API cost of job |
| started_at | TIMESTAMP | YES | NULL | Job start time |
| completed_at | TIMESTAMP | YES | NULL | Job completion time |
| estimated_duration_minutes | INTEGER | YES | NULL | Estimated processing time |
| error_message | TEXT | YES | NULL | Error details if failed |
| retry_count | INTEGER | NO | 0 | Number of retries |
| configuration | JSONB | YES | NULL | Full job parameters for reproducibility |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |

**Key Indexes:**

```sql
CREATE INDEX idx_browse_jobs_status ON browse_list_jobs(status, created_at DESC);
CREATE INDEX idx_browse_jobs_type ON browse_list_jobs(job_type, created_at DESC);
```

---

### browse_list_engagement

**Purpose:** Track user interactions with browse lists for analytics and discovery pathway analysis.

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| list_id | UUID | NO | - | Foreign key to browse_lists |
| session_id | VARCHAR(100) | NO | - | Anonymous session identifier |
| user_agent_hash | VARCHAR(64) | YES | NULL | Hashed user agent for privacy |
| event_type | VARCHAR(50) | NO | - | 'view', 'click_movie', 'share', 'rate', 'bookmark' |
| event_data | JSONB | YES | NULL | Additional context (clicked movie, rating value) |
| referrer_list_id | UUID | YES | NULL | List user came from |
| referrer_facet_id | UUID | YES | NULL | Facet user came from |
| referrer_type | VARCHAR(50) | YES | NULL | 'search', 'recommendation', 'direct' |
| session_duration_seconds | INTEGER | YES | NULL | How long user was on list |
| device_type | VARCHAR(20) | YES | NULL | 'mobile', 'tablet', 'desktop' |
| created_at | TIMESTAMP | NO | NOW() | Event timestamp |

**Key Indexes:**

```sql
CREATE INDEX idx_engagement_list_events ON browse_list_engagement(list_id, event_type, created_at DESC);
CREATE INDEX idx_engagement_discovery_path ON browse_list_engagement(referrer_list_id, list_id);
CREATE INDEX idx_engagement_session ON browse_list_engagement(session_id, created_at);
```

---

### browse_list_consolidations

**Purpose:** Track list lifecycle management operations (merge, split, archive).

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| action_type | VARCHAR(20) | NO | - | 'merge', 'split', 'archive' |
| source_list_ids | UUID[] | NO | - | Lists that were changed |
| result_list_ids | UUID[] | YES | NULL | Lists created from action |
| reason | VARCHAR(100) | YES | NULL | 'sparse_lists', 'excessive_overlap', 'concept_refinement' |
| consolidation_data | JSONB | YES | NULL | Detailed consolidation parameters and results |
| job_id | UUID | YES | NULL | Reference to browse_list_jobs |
| performed_by | VARCHAR(50) | NO | 'ai_consolidation' | Who performed the action |
| created_at | TIMESTAMP | NO | NOW() | Action timestamp |

---

## Supporting Tables

### persons

**Purpose:** Simple registry of cast and crew members extracted from movie analyses.

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | SERIAL | NO | AUTO | Unique numeric ID (used in URLs: /person/12345) |
| name | VARCHAR(255) | NO | - | Person name exactly as extracted from analysis |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |

**Design Notes:**
- Simple numeric ID system (no slugs)
- Allows multiple people with same name (no deduplication)
- Names extracted directly from movie analyses

**Key Indexes:**

```sql
CREATE INDEX idx_persons_name ON persons(name);
```

---

### movie_contributors

**Purpose:** Index of key contributors extracted from movie analysis keyElements, linking movies to persons.

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | SERIAL | NO | AUTO | Primary key |
| movie_tmdb_id | INTEGER | NO | - | TMDB ID of movie (FK to movies.tmdb_id) |
| person_id | INTEGER | YES | NULL | Foreign key to persons table |
| person_name | VARCHAR(255) | NO | - | Person name from keyElements (no TMDB resolution) |
| role | VARCHAR(50) | NO | - | 'director', 'writer', 'star', 'cinematographer', 'composer' |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |
| **Unique:** movie_tmdb_id, person_id, role | | | | |

**Key Indexes:**

```sql
CREATE INDEX idx_movie_contributors_person_name ON movie_contributors(person_name);
CREATE INDEX idx_movie_contributors_movie_id ON movie_contributors(movie_tmdb_id);
CREATE INDEX idx_movie_contributors_role ON movie_contributors(role);
CREATE INDEX idx_movie_contributors_person_role ON movie_contributors(person_name, role);
```

**Foreign Keys:**

```sql
ALTER TABLE movie_contributors 
ADD CONSTRAINT fk_movie_contributors_movie_id 
FOREIGN KEY (movie_tmdb_id) REFERENCES movies(tmdb_id) ON DELETE CASCADE;
```

---

### movie_lists

**Purpose:** Legacy movie list storage (predates browse_lists system).

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | SERIAL | NO | AUTO | Primary key |
| name | TEXT | NO | - | List name |
| slug | TEXT | NO | - | URL-friendly identifier (UNIQUE) |
| description | TEXT | YES | NULL | List description |
| content_type | TEXT | NO | 'declarative' | 'declarative' (curated) or 'educational' (Genius) |
| claude_prompt | TEXT | YES | NULL | Optional prompt for AI descriptions |
| is_active | BOOLEAN | NO | TRUE | Appears in tag clouds |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NO | NOW() | Last update timestamp |

**Key Indexes:**

```sql
CREATE INDEX idx_movie_lists_slug ON movie_lists(slug);
CREATE INDEX idx_movie_lists_active ON movie_lists(is_active);
CREATE INDEX idx_movie_lists_content_type ON movie_lists(content_type);
```

---

### movie_list_items

**Purpose:** Junction table linking movies to legacy movie_lists with ordering.

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | SERIAL | NO | AUTO | Primary key |
| list_id | INTEGER | NO | - | Foreign key to movie_lists |
| movie_id | INTEGER | NO | - | Foreign key to movies |
| order_index | INTEGER | NO | - | Position in list (1-based) |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |
| **Unique:** list_id, movie_id | | | | |

**Key Indexes:**

```sql
CREATE INDEX idx_movie_list_items_list ON movie_list_items(list_id);
CREATE INDEX idx_movie_list_items_movie ON movie_list_items(movie_id);
CREATE INDEX idx_movie_list_items_order ON movie_list_items(list_id, order_index);
```

---

### list_analyses

**Purpose:** AI-generated descriptions and analyses for movie_lists.

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | SERIAL | NO | AUTO | Primary key |
| list_id | INTEGER | NO | - | Foreign key to movie_lists |
| analysis_type | TEXT | NO | - | Type of analysis |
| claude_response | JSONB | YES | NULL | Full Claude response as JSONB |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NO | NOW() | Last update timestamp |
| **Unique:** list_id, analysis_type | | | | |

**Key Indexes:**

```sql
CREATE INDEX idx_list_analyses_list ON list_analyses(list_id);
```

---

### episodes

**Purpose:** Educational episode content for Genius feature (now archived/inactive).

**Column Structure:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | SERIAL | NO | AUTO | Primary key |
| theme_id | INTEGER | NO | - | Theme ID (1=Genres, 2=Directors, etc.) |
| series_id | INTEGER | NO | - | Series within theme |
| episode_id | INTEGER | NO | - | Episode number (1, 2, 3, etc.) |
| title | TEXT | NO | - | Episode title |
| subtitle | TEXT | YES | NULL | Episode subtitle |
| content | JSONB | NO | - | Full episode content (opener, sections, moreIdeas) |
| hero_image | TEXT | YES | NULL | Path to hero image |
| generated_at | TIMESTAMP | YES | NULL | Generation timestamp |
| version | TEXT | YES | NULL | Content version |
| locked | BOOLEAN | NO | FALSE | Prevents accidental regeneration |
| locked_at | TIMESTAMP | YES | NULL | When episode was locked |
| locked_by | TEXT | YES | NULL | Who locked it (user or system) |
| created_at | TIMESTAMP | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NO | NOW() | Last update timestamp |
| **Unique:** theme_id, series_id, episode_id | | | | |

**Key Indexes:**

```sql
CREATE INDEX idx_episodes_theme_series ON episodes(theme_id, series_id);
CREATE INDEX idx_episodes_lookup ON episodes(theme_id, series_id, episode_id);
CREATE INDEX idx_episodes_title ON episodes(title);
CREATE INDEX idx_episodes_locked ON episodes(locked);
CREATE INDEX idx_episodes_created_at ON episodes(created_at);
CREATE INDEX idx_episodes_content_gin ON episodes USING GIN(content);
```

---

## Administrative Tables

### error_logs

**Purpose:** Track API and processing errors for monitoring and debugging.

**Column Structure:**

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| severity | VARCHAR(20) | 'error', 'warning', 'critical' |
| error_message | TEXT | Error details |
| context | JSONB | Additional context |
| timestamp | TIMESTAMP | When error occurred |
| resolved | BOOLEAN | Whether error has been resolved |

---

### error_alerts

**Purpose:** Critical error alerts for immediate attention.

**Column Structure:**

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| error_type | VARCHAR(100) | Type of error |
| severity | VARCHAR(20) | Alert severity level |
| details | JSONB | Alert details |
| created_at | TIMESTAMP | Alert creation time |
| acknowledged | BOOLEAN | Whether alert has been acknowledged |

---

### performance_metrics

**Purpose:** Track query performance and system metrics.

**Column Structure:**

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| metric_name | VARCHAR(100) | Name of metric |
| metric_value | DECIMAL | Measured value |
| timestamp | TIMESTAMP | When metric was recorded |
| context | JSONB | Additional context |

---

### deployments

**Purpose:** Track application deployments.

**Column Structure:**

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| version | VARCHAR(50) | Deployment version |
| status | VARCHAR(20) | 'pending', 'in_progress', 'completed', 'failed' |
| started_at | TIMESTAMP | Deployment start time |
| completed_at | TIMESTAMP | Deployment completion time |
| error_message | TEXT | Any error details |

---

## Views

### content_status_dashboard

**Purpose:** Real-time summary of content completion status across all movies.

```sql
SELECT 
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE analysis_ready = TRUE) as analysis_complete,
    COUNT(*) FILTER (WHERE links_processed = TRUE) as links_processed,
    COUNT(*) FILTER (WHERE slug_generated = TRUE) as slugs_generated,
    COUNT(*) FILTER (WHERE content_complete = TRUE) as content_complete,
    COUNT(*) FILTER (WHERE display_ready = TRUE) as display_ready,
    COUNT(*) FILTER (WHERE validation_passed = TRUE) as validation_passed,
    COUNT(*) FILTER (WHERE failure_count > 0) as failed_items,
    ROUND(COUNT(*) FILTER (WHERE display_ready = TRUE) * 100.0 / COUNT(*), 2) as completion_percentage,
    ROUND(AVG(quality_score), 1) as avg_quality_score
FROM movies 
WHERE tmdb_id IS NOT NULL;
```

---

### movies_needing_analysis

**Purpose:** Movies that haven't been analyzed yet.

```sql
SELECT 
    id, title, year, tmdb_id,
    'Missing Analysis' as gap_type,
    created_at,
    last_failure_reason
FROM movies 
WHERE tmdb_id IS NOT NULL 
AND analysis_ready = FALSE
ORDER BY created_at DESC;
```

---

### movies_needing_links

**Purpose:** Movies with analysis but no link processing.

```sql
SELECT 
    id, title, year, tmdb_id,
    'Missing Links' as gap_type,
    analysis_ready_at,
    last_failure_reason
FROM movies 
WHERE analysis_ready = TRUE 
AND links_processed = FALSE
ORDER BY analysis_ready_at DESC;
```

---

### movies_needing_slugs

**Purpose:** Movies without generated URL slugs.

```sql
SELECT 
    id, title, year, tmdb_id,
    'Missing Slug' as gap_type,
    analysis_ready_at,
    last_failure_reason
FROM movies 
WHERE analysis_ready = TRUE 
AND slug_generated = FALSE
ORDER BY analysis_ready_at DESC;
```

---

### movies_needing_review

**Purpose:** Content with quality issues requiring manual review.

```sql
SELECT 
    id, title, year, tmdb_id,
    quality_score,
    'Quality Review' as gap_type,
    last_validation_at,
    last_failure_reason
FROM movies 
WHERE content_complete = TRUE 
AND (quality_score < 70 OR requires_review = TRUE)
ORDER BY quality_score ASC, last_validation_at DESC;
```

---

### facet_hierarchy

**Purpose:** Browse facets with full hierarchical paths for navigation.

```sql
WITH RECURSIVE facet_tree AS (
    -- Base case: root facets (no parent)
    SELECT 
        id, name, facet_type, parent_facet_id, 
        name::text as full_path, 0 as level,
        ARRAY[id] as path_ids
    FROM browse_facets 
    WHERE parent_facet_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child facets
    SELECT 
        bf.id, bf.name, bf.facet_type, bf.parent_facet_id,
        (ft.full_path || ' > ' || bf.name)::text as full_path, 
        ft.level + 1,
        ft.path_ids || bf.id
    FROM browse_facets bf
    JOIN facet_tree ft ON bf.parent_facet_id = ft.id
)
SELECT * FROM facet_tree ORDER BY facet_type, level, name;
```

---

## Database Functions

### mark_content_complete(movie_id_param INTEGER)

**Purpose:** Mark a movie's content as complete if all prerequisites are met.

```sql
UPDATE movies 
SET 
    content_complete = TRUE,
    content_complete_at = NOW(),
    display_ready = (validation_passed = TRUE AND quality_score >= 70)
WHERE id = movie_id_param
AND analysis_ready = TRUE 
AND links_processed = TRUE 
AND slug_generated = TRUE;
```

---

### record_content_failure(movie_id_param INTEGER, failure_reason_param TEXT)

**Purpose:** Track content processing failures and mark for review if too many failures.

```sql
UPDATE movies 
SET 
    last_failure_reason = failure_reason_param,
    failure_count = failure_count + 1,
    last_failure_at = NOW(),
    requires_review = (failure_count + 1 >= 3)
WHERE id = movie_id_param;
```

---

### update_list_metrics() (TRIGGER)

**Purpose:** Automatically maintain browse_lists metrics when list_movies changes.

Updates:
- `total_movies` - count of movies in list
- `avg_relevance_score` - average relevance across movies
- `updated_at` - current timestamp

---

### update_facet_metrics() (TRIGGER)

**Purpose:** Automatically maintain browse_facets metrics when list_facets changes.

Updates:
- `list_count` - count of lists using this facet
- `movie_count` - count of unique movies across all lists using this facet

---

## Data Relationships

```
movies (1) ──→ (∞) movie_analyses
            ──→ (∞) movie_contributors
            ──→ (∞) enhanced_why_watch
            ──→ (∞) list_movies

browse_lists (1) ──→ (∞) list_movies
             ──→ (∞) list_facets
             ──→ (∞) browse_list_engagement

browse_facets (1) ──→ (∞) list_facets
              ──→ (∞) browse_list_engagement
              ──→ (∞) browse_facets (self-referential parent)

movie_lists (1) ──→ (∞) movie_list_items
            ──→ (∞) list_analyses

persons (1) ──→ (∞) movie_contributors
```

---

## Querying Patterns

### Get Complete Movie with Analysis

```javascript
const query = `
  SELECT 
    m.*,
    ma.claude_response,
    eww.recommendation,
    eww.reasons
  FROM movies m
  LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
  LEFT JOIN enhanced_why_watch eww ON m.tmdb_id = eww.tmdb_id
  WHERE m.tmdb_id = $1
`;
```

### Get Browse List with Movies

```javascript
const query = `
  SELECT 
    bl.*,
    array_agg(m.title) as movie_titles,
    array_agg(m.tmdb_id) as movie_ids,
    array_agg(lm.relevance_score) as relevance_scores
  FROM browse_lists bl
  LEFT JOIN list_movies lm ON bl.id = lm.list_id
  LEFT JOIN movies m ON lm.movie_id = m.id
  WHERE bl.id = $1
  GROUP BY bl.id
`;
```

### Get Facet with Hierarchical Path

```javascript
const query = `
  SELECT * FROM facet_hierarchy
  WHERE facet_type = 'genre'
  ORDER BY level, name
`;
```

### Content Completion Report

```javascript
const query = `
  SELECT * FROM content_status_dashboard
`;
```

---

## Performance Notes

1. **Large JSONB fields:** Use GIN indexes for complex queries on `claude_response`, `event_data`, `content`
2. **Compound indexes:** Critical for frequently joined tables (movies + analyses, lists + movies)
3. **Status flags:** Partial indexes on boolean status columns improve filtered queries
4. **Text search:** GIN trigram indexes enable fuzzy matching on titles and slugs
5. **Time-series data:** Indexes on `created_at` timestamps for timeline queries

---

## Migration Strategy

All schema changes use:

```sql
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_name ON table_name(column);
```

This allows safe re-application without conflicts.

---

## Related Documentation

- See `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md` for system design
- See `/docs/API_REFERENCE.md` for API endpoints accessing these tables
- See `/docs/operations/DEPLOYMENT_COMPLETE_GUIDE.md` for database backups
