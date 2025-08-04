-- MovieGenius Database Performance Optimization
-- Critical indexes for high-performance query execution
-- 
-- This script creates essential database indexes to improve:
-- - Movie lookup performance (title + year combinations)
-- - TMDB ID-based queries for data enrichment
-- - Cache system performance
-- - Text search capabilities
-- - Batch processing efficiency

-- =============================================
-- PHASE 1: CRITICAL PERFORMANCE INDEXES
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS btree_gin; -- For composite GIN indexes

-- Movies table - Primary performance bottlenecks
-- Compound index for exact movie lookups (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_title_year 
ON movies(title, year);

-- TMDB ID lookups for data enrichment and API integration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_tmdb_id 
ON movies(tmdb_id) 
WHERE tmdb_id IS NOT NULL;

-- Sorted movie lists for pagination and browsing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_created_at 
ON movies(created_at DESC);

-- Premium/enhanced movies with TMDB data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_title_with_tmdb 
ON movies(title) 
WHERE tmdb_id IS NOT NULL;

-- Movie analyses table - Analysis retrieval optimization
-- Compound index for movie analysis lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movie_analyses_movie_type 
ON movie_analyses(movie_id, analysis_type);

-- Individual indexes for flexible querying
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movie_analyses_movie_id 
ON movie_analyses(movie_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movie_analyses_type 
ON movie_analyses(analysis_type);

-- Query cache table - Cache system performance
-- Primary cache lookup by hash
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_cache_hash 
ON query_cache(query_hash);

-- Cache cleanup and expiration management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_cache_expires 
ON query_cache(expires_at);

-- Optimized cleanup index for expired entries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_cache_cleanup 
ON query_cache(expires_at) 
WHERE expires_at < NOW();

-- =============================================
-- PHASE 2: TEXT SEARCH OPTIMIZATION
-- =============================================

-- Fuzzy search indexes using trigrams for similarity matching
-- Movie title fuzzy search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_title_gin 
ON movies USING GIN(title gin_trgm_ops);

-- Official title fuzzy search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_official_title_gin 
ON movies USING GIN(official_title gin_trgm_ops) 
WHERE official_title IS NOT NULL;

-- Description/slug fuzzy search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_slug_gin 
ON movies USING GIN(slug gin_trgm_ops) 
WHERE slug IS NOT NULL;

-- =============================================
-- PHASE 3: SUPPORTING TABLE INDEXES
-- =============================================

-- People table optimization
-- Person name exact lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_name 
ON people(name);

-- Compound name and birth year for disambiguation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_name_birth 
ON people(name, birth_year);

-- TMDB person ID lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_tmdb_id 
ON people(tmdb_id) 
WHERE tmdb_id IS NOT NULL;

-- Fuzzy person name search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_name_gin 
ON people USING GIN(name gin_trgm_ops);

-- List analyses table
-- List analysis lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_list_analyses_list_type 
ON list_analyses(list_id, analysis_type);

-- =============================================
-- PHASE 4: BATCH PROCESSING OPTIMIZATION
-- =============================================

-- Batch jobs table - Processing status tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_jobs_status 
ON batch_jobs(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_jobs_type 
ON batch_jobs(type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batch_jobs_created 
ON batch_jobs(created_at DESC);

-- =============================================
-- PHASE 5: MONITORING AND MAINTENANCE
-- =============================================

-- Error logs - Error analysis and monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_timestamp_severity 
ON error_logs(timestamp DESC, severity);

-- Performance metrics - Query performance analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_name_timestamp 
ON performance_metrics(metric_name, timestamp DESC);

-- =============================================
-- INDEX ANALYSIS AND STATISTICS
-- =============================================

-- Update table statistics after index creation
ANALYZE movies;
ANALYZE movie_analyses;
ANALYZE query_cache;
ANALYZE people;
ANALYZE list_analyses;
ANALYZE batch_jobs;
ANALYZE error_logs;
ANALYZE performance_metrics;

-- =============================================
-- PERFORMANCE VALIDATION QUERIES
-- =============================================

-- Test critical query patterns after index creation

-- 1. Movie lookup by title and year (should use idx_movies_title_year)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM movies WHERE title = 'The Godfather' AND year = 1972;

-- 2. TMDB ID lookup (should use idx_movies_tmdb_id)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM movies WHERE tmdb_id = 238;

-- 3. Fuzzy title search (should use idx_movies_title_gin)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT title, year FROM movies WHERE title ILIKE '%godfather%' LIMIT 10;

-- 4. Cache lookup (should use idx_query_cache_hash)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM query_cache WHERE query_hash = 'test_hash';

-- 5. Movie analysis retrieval (should use idx_movie_analyses_movie_type)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT claude_response FROM movie_analyses 
WHERE movie_id = 1 AND analysis_type = 'page_analysis';

-- =============================================
-- INDEX MONITORING QUERIES
-- =============================================

-- Monitor index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Monitor table and index sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for unused indexes (run after some production usage)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND idx_scan = 0
ORDER BY tablename, indexname;

-- =============================================
-- MAINTENANCE RECOMMENDATIONS
-- =============================================

-- Automatic maintenance tasks to run periodically:
-- 1. REINDEX CONCURRENTLY for heavily updated tables
-- 2. VACUUM ANALYZE for table statistics updates
-- 3. Monitor slow query log for new optimization opportunities
-- 4. Review index usage statistics monthly

-- Example maintenance script (run weekly):
-- VACUUM ANALYZE movies;
-- VACUUM ANALYZE movie_analyses;
-- VACUUM ANALYZE query_cache;
-- 
-- Example index rebuild (run monthly for high-write tables):
-- REINDEX INDEX CONCURRENTLY idx_movies_title_year;
-- REINDEX INDEX CONCURRENTLY idx_query_cache_hash;