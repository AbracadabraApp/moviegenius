-- Movie Contributors Table
-- Phase 1: Internal-only person discovery system
-- 
-- This table creates a verified relationship index between:
-- - Movies we have analyses for (movie_tmdb_id)
-- - Contributors mentioned in their keyElements (person_name, role)
--
-- Design principles:
-- - Zero external dependencies (no TMDB person IDs)
-- - Verified relationships only (data from existing analyses)
-- - Simple person discovery (name-based lookup)

-- =============================================
-- CREATE MOVIE CONTRIBUTORS TABLE
-- =============================================

CREATE TABLE movie_contributors (
    id SERIAL PRIMARY KEY,
    
    -- Movie reference (NOT NULL = we only have contributors for movies we analyzed)
    movie_tmdb_id INTEGER NOT NULL,
    
    -- Person information (exactly as appears in keyElements)
    person_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure no duplicate entries
    UNIQUE(movie_tmdb_id, person_name, role)
);

-- =============================================
-- CREATE PERFORMANCE INDEXES
-- =============================================

-- Person lookup - primary use case for person discovery
CREATE INDEX CONCURRENTLY idx_movie_contributors_person_name 
ON movie_contributors(person_name);

-- Movie lookup - find all contributors for a specific movie
CREATE INDEX CONCURRENTLY idx_movie_contributors_movie_id 
ON movie_contributors(movie_tmdb_id);

-- Role-based queries - find all directors, writers, etc.
CREATE INDEX CONCURRENTLY idx_movie_contributors_role 
ON movie_contributors(role);

-- Compound index for efficient person + role queries
CREATE INDEX CONCURRENTLY idx_movie_contributors_person_role 
ON movie_contributors(person_name, role);

-- =============================================
-- ADD FOREIGN KEY CONSTRAINT
-- =============================================

-- Ensure referential integrity - movie_tmdb_id must exist in movies table
ALTER TABLE movie_contributors 
ADD CONSTRAINT fk_movie_contributors_movie_id 
FOREIGN KEY (movie_tmdb_id) REFERENCES movies(tmdb_id) ON DELETE CASCADE;

-- =============================================
-- TABLE DOCUMENTATION
-- =============================================

COMMENT ON TABLE movie_contributors IS 'Index of key contributors extracted from movie analysis keyElements. Phase 1 internal-only person discovery system.';
COMMENT ON COLUMN movie_contributors.movie_tmdb_id IS 'TMDB ID of movie (references movies.tmdb_id). NOT NULL ensures we only index contributors for analyzed movies.';
COMMENT ON COLUMN movie_contributors.person_name IS 'Person name exactly as it appears in keyElements (no TMDB resolution). Used for person page lookup.';
COMMENT ON COLUMN movie_contributors.role IS 'Role in movie: director, writer, star, cinematographer, composer';

-- =============================================
-- VALIDATION QUERIES
-- =============================================

-- Test table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'movie_contributors'
ORDER BY ordinal_position;

-- Test indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'movie_contributors';

-- Test foreign key constraint
SELECT 
    constraint_name,
    constraint_type,
    table_name,
    column_name
FROM information_schema.constraint_column_usage 
WHERE table_name = 'movie_contributors';