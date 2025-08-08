-- =====================================================
-- DUPLICATE ANALYSIS DETECTION QUERIES
-- Railway Database Integrity Analysis
-- =====================================================

-- =====================================================
-- 1. DUPLICATE ANALYSIS CONTENT DETECTION
-- =====================================================

-- 1.1 Find exact duplicate analysis content across different movies
WITH analysis_content AS (
    SELECT 
        ma.id as analysis_id,
        ma.movie_id,
        m.tmdb_id,
        m.title,
        m.year,
        ma.claude_response->>'processed_content' as processed_content,
        ma.claude_response->>'raw_content' as raw_content,
        LENGTH(ma.claude_response->>'processed_content') as content_length
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE ma.claude_response IS NOT NULL
),
duplicate_groups AS (
    SELECT 
        processed_content,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(DISTINCT tmdb_id ORDER BY tmdb_id) as affected_tmdb_ids,
        ARRAY_AGG(DISTINCT title ORDER BY title) as affected_titles,
        ARRAY_AGG(DISTINCT year ORDER BY year) as affected_years,
        ARRAY_AGG(analysis_id) as analysis_ids
    FROM analysis_content
    WHERE processed_content IS NOT NULL 
    AND LENGTH(processed_content) > 100  -- Filter out very short content
    GROUP BY processed_content
    HAVING COUNT(*) > 1
)
SELECT 
    duplicate_count,
    content_length,
    affected_tmdb_ids,
    affected_titles,
    affected_years,
    analysis_ids,
    -- Show first 200 characters of duplicate content for identification
    SUBSTRING(processed_content, 1, 200) || '...' as content_preview
FROM duplicate_groups dg
JOIN analysis_content ac ON dg.processed_content = ac.processed_content
WHERE dg.duplicate_count > 1
ORDER BY duplicate_count DESC, content_length DESC;

-- 1.2 Find similar analysis content using content hashing
WITH analysis_hashes AS (
    SELECT 
        ma.id as analysis_id,
        ma.movie_id,
        m.tmdb_id,
        m.title,
        m.year,
        -- Create hash of processed content
        MD5(ma.claude_response->>'processed_content') as content_hash,
        -- Create hash of first 500 characters (for partial matches)
        MD5(SUBSTRING(ma.claude_response->>'processed_content', 1, 500)) as partial_hash,
        LENGTH(ma.claude_response->>'processed_content') as content_length,
        ma.claude_response->>'processed_content' as processed_content
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE ma.claude_response IS NOT NULL
    AND ma.claude_response->>'processed_content' IS NOT NULL
),
hash_duplicates AS (
    SELECT 
        content_hash,
        COUNT(*) as exact_duplicates,
        ARRAY_AGG(DISTINCT tmdb_id ORDER BY tmdb_id) as tmdb_ids,
        ARRAY_AGG(DISTINCT title ORDER BY title) as titles,
        ARRAY_AGG(DISTINCT year ORDER BY year) as years,
        ARRAY_AGG(analysis_id) as analysis_ids,
        AVG(content_length) as avg_content_length
    FROM analysis_hashes
    GROUP BY content_hash
    HAVING COUNT(*) > 1
),
partial_hash_duplicates AS (
    SELECT 
        partial_hash,
        COUNT(*) as similar_count,
        ARRAY_AGG(DISTINCT tmdb_id ORDER BY tmdb_id) as tmdb_ids,
        ARRAY_AGG(DISTINCT title ORDER BY title) as titles,
        ARRAY_AGG(DISTINCT year ORDER BY year) as years
    FROM analysis_hashes
    GROUP BY partial_hash
    HAVING COUNT(*) > 1
)
-- Exact hash matches
SELECT 
    'EXACT_DUPLICATE' as match_type,
    exact_duplicates as count,
    tmdb_ids,
    titles,
    years,
    analysis_ids,
    avg_content_length
FROM hash_duplicates
WHERE exact_duplicates > 1

UNION ALL

-- Partial hash matches (excluding exact duplicates)
SELECT 
    'SIMILAR_CONTENT' as match_type,
    similar_count as count,
    tmdb_ids,
    titles,
    years,
    NULL as analysis_ids,
    NULL as avg_content_length
FROM partial_hash_duplicates phd
WHERE similar_count > 1
AND partial_hash NOT IN (SELECT content_hash FROM hash_duplicates WHERE exact_duplicates > 1)

ORDER BY match_type, count DESC;

-- =====================================================
-- 2. METADATA MISMATCH DETECTION
-- =====================================================

-- 2.1 Find analyses where metadata doesn't match the movie record
WITH analysis_metadata AS (
    SELECT 
        ma.id as analysis_id,
        ma.movie_id,
        m.tmdb_id,
        m.title as db_title,
        m.year as db_year,
        -- Extract metadata from raw_content JSON
        (ma.claude_response->>'raw_content')::jsonb->'metadata'->>'title' as analysis_title,
        ((ma.claude_response->>'raw_content')::jsonb->'metadata'->>'year')::int as analysis_year,
        (ma.claude_response->>'raw_content')::jsonb->'metadata'->>'analysisType' as analysis_type,
        ma.claude_response->>'processed_content' as processed_content
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE ma.claude_response IS NOT NULL
    AND ma.claude_response->>'raw_content' IS NOT NULL
    AND ma.claude_response->>'raw_content' != ''
)
SELECT 
    analysis_id,
    tmdb_id,
    db_title,
    db_year,
    analysis_title,
    analysis_year,
    analysis_type,
    -- Flag different types of mismatches
    CASE 
        WHEN analysis_year != db_year THEN 'YEAR_MISMATCH'
        WHEN LOWER(analysis_title) != LOWER(db_title) THEN 'TITLE_MISMATCH'
        WHEN analysis_year != db_year AND LOWER(analysis_title) != LOWER(db_title) THEN 'BOTH_MISMATCH'
        ELSE 'NO_MISMATCH'
    END as mismatch_type,
    ABS(analysis_year - db_year) as year_difference,
    -- Show content preview for verification
    SUBSTRING(processed_content, 1, 150) || '...' as content_preview
FROM analysis_metadata
WHERE 
    analysis_title IS NOT NULL 
    AND analysis_year IS NOT NULL
    AND (
        analysis_year != db_year 
        OR LOWER(analysis_title) != LOWER(db_title)
    )
ORDER BY 
    year_difference DESC, 
    mismatch_type,
    tmdb_id;

-- 2.2 Find the specific "The Apartment" case and similar patterns
SELECT 
    m.tmdb_id,
    m.title,
    m.year,
    (ma.claude_response->>'raw_content')::jsonb->'metadata'->>'title' as analysis_title,
    ((ma.claude_response->>'raw_content')::jsonb->'metadata'->>'year')::int as analysis_year,
    ma.id as analysis_id,
    SUBSTRING(ma.claude_response->>'processed_content', 1, 200) || '...' as content_preview
FROM movie_analyses ma
JOIN movies m ON ma.movie_id = m.id
WHERE 
    ma.claude_response IS NOT NULL
    AND (
        -- Look for "The Apartment" cases specifically
        (m.title ILIKE '%apartment%' AND m.year != ((ma.claude_response->>'raw_content')::jsonb->'metadata'->>'year')::int)
        OR
        -- Look for cases where analysis year is significantly different from movie year
        ABS(m.year - ((ma.claude_response->>'raw_content')::jsonb->'metadata'->>'year')::int) > 10
    )
ORDER BY ABS(m.year - ((ma.claude_response->>'raw_content')::jsonb->'metadata'->>'year')::int) DESC;

-- =====================================================
-- 3. CONTRIBUTOR DATA INTEGRITY CHECKS
-- =====================================================

-- 3.1 Find impossible contributor associations (historical figures in modern movies)
WITH contributor_years AS (
    SELECT 
        mc.movie_tmdb_id,
        mc.person_name,
        mc.role,
        mc.person_id,
        m.year as movie_year,
        m.title as movie_title,
        -- Common death years for famous directors/actors (extend as needed)
        CASE 
            WHEN mc.person_name ILIKE '%billy wilder%' THEN 2002
            WHEN mc.person_name ILIKE '%orson welles%' THEN 1985
            WHEN mc.person_name ILIKE '%alfred hitchcock%' THEN 1980
            WHEN mc.person_name ILIKE '%john ford%' THEN 1973
            WHEN mc.person_name ILIKE '%howard hawks%' THEN 1977
            WHEN mc.person_name ILIKE '%frank capra%' THEN 1991
            WHEN mc.person_name ILIKE '%william wyler%' THEN 1981
            ELSE NULL
        END as known_death_year
    FROM movie_contributors mc
    JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
)
SELECT 
    movie_tmdb_id,
    movie_title,
    movie_year,
    person_name,
    role,
    known_death_year,
    movie_year - known_death_year as years_after_death
FROM contributor_years
WHERE known_death_year IS NOT NULL
AND movie_year > known_death_year
ORDER BY years_after_death DESC, movie_year DESC;

-- 3.2 Find contributors associated with movies from widely different eras
WITH contributor_movie_spans AS (
    SELECT 
        mc.person_name,
        mc.person_id,
        COUNT(DISTINCT mc.movie_tmdb_id) as movie_count,
        MIN(m.year) as earliest_movie,
        MAX(m.year) as latest_movie,
        MAX(m.year) - MIN(m.year) as career_span,
        ARRAY_AGG(DISTINCT m.tmdb_id ORDER BY m.year) as tmdb_ids,
        ARRAY_AGG(DISTINCT m.title ORDER BY m.year) as titles,
        ARRAY_AGG(DISTINCT m.year ORDER BY m.year) as years
    FROM movie_contributors mc
    JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
    GROUP BY mc.person_name, mc.person_id
)
SELECT 
    person_name,
    person_id,
    movie_count,
    earliest_movie,
    latest_movie,
    career_span,
    tmdb_ids,
    titles,
    years
FROM contributor_movie_spans
WHERE career_span > 50  -- Unusually long career spans that might indicate data issues
OR (earliest_movie < 1950 AND latest_movie > 1990)  -- Classic era to modern era
ORDER BY career_span DESC, movie_count DESC;

-- =====================================================
-- 4. SCOPE ASSESSMENT QUERIES
-- =====================================================

-- 4.1 Overall corruption scope assessment
WITH corruption_stats AS (
    SELECT 
        COUNT(*) as total_analyses,
        COUNT(CASE WHEN ma.claude_response->>'processed_content' IS NULL THEN 1 END) as null_content_count,
        COUNT(CASE WHEN LENGTH(ma.claude_response->>'processed_content') < 100 THEN 1 END) as short_content_count,
        COUNT(DISTINCT ma.claude_response->>'processed_content') as unique_content_count,
        COUNT(*) - COUNT(DISTINCT ma.claude_response->>'processed_content') as potential_duplicates
    FROM movie_analyses ma
    WHERE ma.claude_response IS NOT NULL
),
metadata_stats AS (
    SELECT 
        COUNT(*) as total_with_metadata,
        COUNT(CASE WHEN 
            m.year != ((ma.claude_response->>'raw_content')::jsonb->'metadata'->>'year')::int 
            THEN 1 END) as year_mismatches,
        COUNT(CASE WHEN 
            LOWER(m.title) != LOWER((ma.claude_response->>'raw_content')::jsonb->'metadata'->>'title') 
            THEN 1 END) as title_mismatches
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE ma.claude_response IS NOT NULL
    AND ma.claude_response->>'raw_content' IS NOT NULL
    AND (ma.claude_response->>'raw_content')::jsonb->'metadata' IS NOT NULL
)
SELECT 
    'ANALYSIS_CORRUPTION' as metric_type,
    cs.total_analyses,
    cs.null_content_count,
    cs.short_content_count,
    cs.unique_content_count,
    cs.potential_duplicates,
    ROUND(cs.potential_duplicates::numeric / cs.total_analyses * 100, 2) as duplicate_percentage,
    ms.total_with_metadata,
    ms.year_mismatches,
    ms.title_mismatches,
    ROUND(ms.year_mismatches::numeric / ms.total_with_metadata * 100, 2) as year_mismatch_percentage,
    ROUND(ms.title_mismatches::numeric / ms.total_with_metadata * 100, 2) as title_mismatch_percentage
FROM corruption_stats cs, metadata_stats ms;

-- 4.2 Affected movies summary
WITH affected_movies AS (
    SELECT DISTINCT
        m.tmdb_id,
        m.title,
        m.year,
        'DUPLICATE_CONTENT' as issue_type
    FROM movie_analyses ma1
    JOIN movies m ON ma1.movie_id = m.id
    WHERE EXISTS (
        SELECT 1 FROM movie_analyses ma2
        JOIN movies m2 ON ma2.movie_id = m2.id
        WHERE ma1.claude_response->>'processed_content' = ma2.claude_response->>'processed_content'
        AND ma1.id != ma2.id
        AND m.tmdb_id != m2.tmdb_id
    )
    
    UNION
    
    SELECT DISTINCT
        m.tmdb_id,
        m.title,
        m.year,
        'METADATA_MISMATCH' as issue_type
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE ma.claude_response IS NOT NULL
    AND ma.claude_response->>'raw_content' IS NOT NULL
    AND (
        m.year != ((ma.claude_response->>'raw_content')::jsonb->'metadata'->>'year')::int
        OR LOWER(m.title) != LOWER((ma.claude_response->>'raw_content')::jsonb->'metadata'->>'title')
    )
)
SELECT 
    issue_type,
    COUNT(*) as affected_movie_count,
    ARRAY_AGG(DISTINCT tmdb_id ORDER BY year DESC) as sample_tmdb_ids,
    ARRAY_AGG(DISTINCT title ORDER BY year DESC) as sample_titles
FROM affected_movies
GROUP BY issue_type
ORDER BY affected_movie_count DESC;

-- =====================================================
-- 5. SPECIFIC INVESTIGATION QUERIES
-- =====================================================

-- 5.1 Deep dive into "The Apartment" case
SELECT 
    m.tmdb_id,
    m.title,
    m.year,
    (ma.claude_response->>'raw_content')::jsonb->'metadata'->>'title' as analysis_title,
    ((ma.claude_response->>'raw_content')::jsonb->'metadata'->>'year')::int as analysis_year,
    ma.id as analysis_id,
    MD5(ma.claude_response->>'processed_content') as content_hash,
    -- Check for Billy Wilder mentions (should not be in 1996 movie)
    CASE WHEN ma.claude_response->>'processed_content' ILIKE '%billy wilder%' THEN 'YES' ELSE 'NO' END as mentions_wilder,
    -- Check for Jack Lemmon mentions (should not be in 1996 movie)
    CASE WHEN ma.claude_response->>'processed_content' ILIKE '%jack lemmon%' THEN 'YES' ELSE 'NO' END as mentions_lemmon,
    -- Show relevant contributor data
    (SELECT ARRAY_AGG(person_name) FROM movie_contributors WHERE movie_tmdb_id = m.tmdb_id) as contributors
FROM movie_analyses ma
JOIN movies m ON ma.movie_id = m.id
WHERE m.title ILIKE '%apartment%'
ORDER BY m.year, m.tmdb_id;

-- 5.2 Find all movies sharing the same analysis content as TMDB 12531
WITH apartment_1996_content AS (
    SELECT ma.claude_response->>'processed_content' as content
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE m.tmdb_id = 12531
    LIMIT 1
)
SELECT 
    m.tmdb_id,
    m.title,
    m.year,
    ma.id as analysis_id,
    'SHARES_CONTENT_WITH_12531' as issue
FROM movie_analyses ma
JOIN movies m ON ma.movie_id = m.id
CROSS JOIN apartment_1996_content ac
WHERE ma.claude_response->>'processed_content' = ac.content
ORDER BY m.year, m.tmdb_id;

-- =====================================================
-- 6. DATA QUALITY MONITORING QUERIES
-- =====================================================

-- 6.1 Create a monitoring query for ongoing data quality
CREATE OR REPLACE VIEW data_quality_dashboard AS
WITH current_issues AS (
    -- Duplicate content issues
    SELECT 
        'DUPLICATE_ANALYSIS' as issue_type,
        COUNT(*) as issue_count,
        'High Priority' as severity
    FROM (
        SELECT ma.claude_response->>'processed_content' as content
        FROM movie_analyses ma
        WHERE ma.claude_response IS NOT NULL
        GROUP BY ma.claude_response->>'processed_content'
        HAVING COUNT(*) > 1
    ) duplicates
    
    UNION ALL
    
    -- Metadata mismatch issues
    SELECT 
        'METADATA_MISMATCH' as issue_type,
        COUNT(*) as issue_count,
        'Medium Priority' as severity
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE ma.claude_response IS NOT NULL
    AND ma.claude_response->>'raw_content' IS NOT NULL
    AND (
        m.year != ((ma.claude_response->>'raw_content')::jsonb->'metadata'->>'year')::int
        OR LOWER(m.title) != LOWER((ma.claude_response->>'raw_content')::jsonb->'metadata'->>'title')
    )
    
    UNION ALL
    
    -- Contributor anomalies
    SELECT 
        'CONTRIBUTOR_ANOMALY' as issue_type,
        COUNT(*) as issue_count,
        'Low Priority' as severity
    FROM movie_contributors mc
    JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
    WHERE (
        (mc.person_name ILIKE '%billy wilder%' AND m.year > 2002)
        OR (mc.person_name ILIKE '%orson welles%' AND m.year > 1985)
        OR (mc.person_name ILIKE '%alfred hitchcock%' AND m.year > 1980)
    )
)
SELECT 
    issue_type,
    issue_count,
    severity,
    CURRENT_TIMESTAMP as last_checked
FROM current_issues
ORDER BY 
    CASE severity 
        WHEN 'High Priority' THEN 1
        WHEN 'Medium Priority' THEN 2
        WHEN 'Low Priority' THEN 3
    END,
    issue_count DESC;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

/*
QUERY EXECUTION ORDER:
1. Start with Section 4.1 (Scope Assessment) to understand the overall problem
2. Run Section 1.1 (Exact Duplicates) to identify duplicate analysis content
3. Run Section 2.1 (Metadata Mismatches) to find content/metadata inconsistencies
4. Run Section 3.1 (Contributor Issues) to identify impossible associations
5. Run Section 5 (Specific Investigation) for detailed analysis of known issues

CLEANUP STRATEGY:
Based on query results, implement these steps:
1. Identify the "source of truth" analysis for each duplicate group
2. Update incorrect analyses with proper content for their specific movie
3. Regenerate analyses where metadata mismatches are found
4. Clean up contributor data for impossible associations
5. Implement validation checks to prevent future issues

PREVENTION MEASURES:
1. Add database constraints to prevent duplicate content insertion
2. Implement metadata validation before storing analysis results
3. Add contributor data validation against known death dates
4. Create monitoring alerts using the data_quality_dashboard view
*/