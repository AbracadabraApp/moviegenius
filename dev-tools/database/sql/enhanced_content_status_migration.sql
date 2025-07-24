-- Enhanced Content Status Tracking Migration
-- Adds comprehensive flags to accurately track movie content status
-- Enables precise reporting on analysis, slug, and links completion

-- =============================================================================
-- PHASE 1: Add Enhanced Content Status Flags
-- =============================================================================

-- Add new comprehensive status flags to movies table
ALTER TABLE movies ADD COLUMN IF NOT EXISTS analysis_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS links_processed BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS content_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS display_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS slug_generated BOOLEAN DEFAULT FALSE;

-- Add enhanced tracking timestamps
ALTER TABLE movies ADD COLUMN IF NOT EXISTS analysis_ready_at TIMESTAMP;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS links_processed_at TIMESTAMP;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS content_complete_at TIMESTAMP;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS last_validation_at TIMESTAMP;

-- =============================================================================
-- PHASE 2: Add Content Quality and Failure Tracking
-- =============================================================================

-- Add quality and validation flags
ALTER TABLE movies ADD COLUMN IF NOT EXISTS validation_passed BOOLEAN DEFAULT FALSE;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT FALSE;

-- Add failure tracking columns
ALTER TABLE movies ADD COLUMN IF NOT EXISTS last_failure_reason TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMP;

-- =============================================================================
-- PHASE 3: Sync Existing Data with New Flags
-- =============================================================================

-- Update analysis_ready flag based on existing movie_analyses
UPDATE movies 
SET analysis_ready = TRUE,
    analysis_ready_at = (
        SELECT ma.created_at 
        FROM movie_analyses ma 
        WHERE ma.movie_id = movies.id 
        AND ma.analysis_type = 'page_analysis' 
        LIMIT 1
    )
WHERE id IN (
    SELECT DISTINCT movie_id 
    FROM movie_analyses 
    WHERE analysis_type = 'page_analysis'
    AND claude_response IS NOT NULL
    AND claude_response->>'raw_content' IS NOT NULL
);

-- Update links_processed flag based on has_linked_analysis or link tracking
UPDATE movies 
SET links_processed = TRUE,
    links_processed_at = (
        SELECT ma.updated_at 
        FROM movie_analyses ma 
        WHERE ma.movie_id = movies.id 
        AND ma.analysis_type = 'page_analysis'
        AND (ma.claude_response->>'has_links')::boolean = true
        LIMIT 1
    )
WHERE id IN (
    SELECT DISTINCT movie_id 
    FROM movie_analyses 
    WHERE analysis_type = 'page_analysis'
    AND (claude_response->>'has_links')::boolean = true
);

-- Update slug_generated flag based on existing slugs
UPDATE movies 
SET slug_generated = TRUE
WHERE slug IS NOT NULL 
AND slug != '' 
AND slug != 'undefined';

-- Update validation_passed based on existing validation data
UPDATE movies 
SET validation_passed = TRUE,
    quality_score = COALESCE(
        (SELECT (ma.claude_response->'validation_report'->>'quality_score')::integer
         FROM movie_analyses ma 
         WHERE ma.movie_id = movies.id 
         AND ma.analysis_type = 'page_analysis'
         AND ma.claude_response->'validation_report'->>'quality_score' IS NOT NULL
         LIMIT 1), 0
    ),
    last_validation_at = (
        SELECT ma.updated_at 
        FROM movie_analyses ma 
        WHERE ma.movie_id = movies.id 
        AND ma.analysis_type = 'page_analysis'
        AND (ma.claude_response->'validation_report'->>'validation_passed')::boolean = true
        LIMIT 1
    )
WHERE id IN (
    SELECT DISTINCT movie_id 
    FROM movie_analyses 
    WHERE analysis_type = 'page_analysis'
    AND (claude_response->'validation_report'->>'validation_passed')::boolean = true
);

-- Update content_complete flag for movies with all content types
UPDATE movies 
SET content_complete = TRUE,
    content_complete_at = GREATEST(
        COALESCE(analysis_ready_at, '1970-01-01'::timestamp),
        COALESCE(links_processed_at, '1970-01-01'::timestamp),
        COALESCE(updated_at, created_at)
    )
WHERE analysis_ready = TRUE 
AND links_processed = TRUE 
AND slug_generated = TRUE;

-- Update display_ready flag for high-quality complete content
UPDATE movies 
SET display_ready = TRUE
WHERE content_complete = TRUE 
AND validation_passed = TRUE 
AND quality_score >= 70;

-- =============================================================================
-- PHASE 4: Create Content Status Indexes for Performance
-- =============================================================================

-- Indexes for content status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_analysis_ready 
ON movies(analysis_ready) WHERE analysis_ready = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_content_complete 
ON movies(content_complete) WHERE content_complete = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_display_ready 
ON movies(display_ready) WHERE display_ready = TRUE;

-- Compound index for batch processing queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_status_compound 
ON movies(analysis_ready, links_processed, slug_generated, validation_passed);

-- Index for failure tracking and debugging
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_failures 
ON movies(last_failure_at, failure_count) WHERE failure_count > 0;

-- =============================================================================
-- PHASE 5: Create Content Status Dashboard View
-- =============================================================================

CREATE OR REPLACE VIEW content_status_dashboard AS
SELECT 
    'Movies' as content_type,
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE analysis_ready = TRUE) as analysis_complete,
    COUNT(*) FILTER (WHERE links_processed = TRUE) as links_processed,
    COUNT(*) FILTER (WHERE slug_generated = TRUE) as slugs_generated,
    COUNT(*) FILTER (WHERE content_complete = TRUE) as content_complete,
    COUNT(*) FILTER (WHERE display_ready = TRUE) as display_ready,
    COUNT(*) FILTER (WHERE validation_passed = TRUE) as validation_passed,
    COUNT(*) FILTER (WHERE failure_count > 0) as failed_items,
    ROUND(
        COUNT(*) FILTER (WHERE display_ready = TRUE) * 100.0 / COUNT(*), 2
    ) as completion_percentage,
    ROUND(AVG(quality_score), 1) as avg_quality_score
FROM movies 
WHERE tmdb_id IS NOT NULL;

-- =============================================================================
-- PHASE 6: Create Content Gap Analysis Views
-- =============================================================================

-- Movies needing analysis
CREATE OR REPLACE VIEW movies_needing_analysis AS
SELECT 
    id, title, year, tmdb_id,
    'Missing Analysis' as gap_type,
    created_at,
    last_failure_reason
FROM movies 
WHERE tmdb_id IS NOT NULL 
AND analysis_ready = FALSE
ORDER BY created_at DESC;

-- Movies needing link processing
CREATE OR REPLACE VIEW movies_needing_links AS
SELECT 
    id, title, year, tmdb_id,
    'Missing Links' as gap_type,
    analysis_ready_at,
    last_failure_reason
FROM movies 
WHERE analysis_ready = TRUE 
AND links_processed = FALSE
ORDER BY analysis_ready_at DESC;

-- Movies needing slugs
CREATE OR REPLACE VIEW movies_needing_slugs AS
SELECT 
    id, title, year, tmdb_id,
    'Missing Slug' as gap_type,
    analysis_ready_at,
    last_failure_reason
FROM movies 
WHERE analysis_ready = TRUE 
AND slug_generated = FALSE
ORDER BY analysis_ready_at DESC;

-- Low quality content needing review
CREATE OR REPLACE VIEW movies_needing_review AS
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

-- =============================================================================
-- PHASE 7: Create Content Status Functions
-- =============================================================================

-- Function to mark content as complete for a movie
CREATE OR REPLACE FUNCTION mark_content_complete(movie_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE movies 
    SET 
        content_complete = TRUE,
        content_complete_at = NOW(),
        display_ready = (validation_passed = TRUE AND quality_score >= 70)
    WHERE id = movie_id_param
    AND analysis_ready = TRUE 
    AND links_processed = TRUE 
    AND slug_generated = TRUE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to record content processing failure
CREATE OR REPLACE FUNCTION record_content_failure(
    movie_id_param INTEGER,
    failure_reason_param TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE movies 
    SET 
        last_failure_reason = failure_reason_param,
        failure_count = failure_count + 1,
        last_failure_at = NOW(),
        requires_review = (failure_count + 1 >= 3)
    WHERE id = movie_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Show migration results
SELECT 
    'Migration Results' as report_type,
    COUNT(*) as total_movies,
    COUNT(*) FILTER (WHERE analysis_ready = TRUE) as analysis_ready,
    COUNT(*) FILTER (WHERE links_processed = TRUE) as links_processed,
    COUNT(*) FILTER (WHERE slug_generated = TRUE) as slug_generated,
    COUNT(*) FILTER (WHERE content_complete = TRUE) as content_complete,
    COUNT(*) FILTER (WHERE display_ready = TRUE) as display_ready
FROM movies 
WHERE tmdb_id IS NOT NULL;

-- Show content gaps summary
SELECT * FROM content_status_dashboard;

-- Show top failure reasons
SELECT 
    last_failure_reason,
    COUNT(*) as failure_count,
    AVG(failure_count) as avg_retries
FROM movies 
WHERE last_failure_reason IS NOT NULL
GROUP BY last_failure_reason
ORDER BY COUNT(*) DESC
LIMIT 10;