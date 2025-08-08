-- Person Link Monitoring and Detection Queries
-- Comprehensive set of queries to detect and monitor person link issues

-- =============================================
-- DETECTION QUERIES FOR BAD PERSON LINKS
-- =============================================

-- Query 1: Find all records with name slug person links (malformed)
-- This is the primary detection query for the original issue
CREATE OR REPLACE VIEW bad_person_links AS
SELECT 
    tmdb_id,
    title,
    -- Extract all person links from processed_content
    regexp_split_to_table(
        coalesce(claude_response->>'processed_content', ''),
        'href="/person/([^"]+)"'
    ) as found_links,
    -- Count total person links
    (LENGTH(coalesce(claude_response->>'processed_content', '')) - 
     LENGTH(REPLACE(coalesce(claude_response->>'processed_content', ''), 'href="/person/', ''))) / LENGTH('href="/person/') as total_person_links,
    created_at
FROM movie_analyses
WHERE claude_response->>'processed_content' LIKE '%href="/person/%';

-- Query 2: Detect name slug links (non-numeric person IDs)
SELECT 
    tmdb_id,
    title,
    -- Use regexp_matches to extract person IDs that are NOT numeric
    (regexp_matches(
        claude_response->>'processed_content',
        'href="/person/([^0-9][^"]*)"', 'g'
    ))[1] as invalid_person_id,
    created_at
FROM movie_analyses
WHERE claude_response->>'processed_content' ~ 'href="/person/[^0-9]'
ORDER BY created_at DESC;

-- Query 3: Count malformed person links by movie
SELECT 
    tmdb_id,
    title,
    COUNT(*) as malformed_link_count,
    array_agg(DISTINCT (regexp_matches(
        claude_response->>'processed_content',
        'href="/person/([^0-9][^"]*)"', 'g'
    ))[1]) as invalid_person_ids
FROM movie_analyses
WHERE claude_response->>'processed_content' ~ 'href="/person/[^0-9]'
GROUP BY tmdb_id, title
ORDER BY malformed_link_count DESC;

-- =============================================
-- INTEGRITY CHECKING QUERIES
-- =============================================

-- Query 4: Find person IDs in links that don't exist in persons table
WITH person_link_extract AS (
    SELECT 
        tmdb_id,
        title,
        regexp_matches(
            claude_response->>'processed_content',
            'href="/person/([0-9]+)"', 'g'
        ) as person_id_match
    FROM movie_analyses
    WHERE claude_response->>'processed_content' ~ 'href="/person/[0-9]+'
)
SELECT 
    ple.tmdb_id,
    ple.title,
    (ple.person_id_match)[1]::INTEGER as person_id,
    CASE 
        WHEN p.id IS NULL THEN 'MISSING'
        ELSE 'EXISTS'
    END as person_status
FROM person_link_extract ple
LEFT JOIN persons p ON (ple.person_id_match)[1]::INTEGER = p.id
WHERE p.id IS NULL
ORDER BY ple.tmdb_id;

-- Query 5: Comprehensive person link audit
WITH link_analysis AS (
    SELECT 
        tmdb_id,
        title,
        claude_response->>'processed_content' as content,
        -- Count total person links
        (LENGTH(coalesce(claude_response->>'processed_content', '')) - 
         LENGTH(REPLACE(coalesce(claude_response->>'processed_content', ''), 'href="/person/', ''))) / LENGTH('href="/person/') as total_links,
        -- Count numeric person links (valid format)
        (LENGTH(coalesce(claude_response->>'processed_content', '')) - 
         LENGTH(regexp_replace(coalesce(claude_response->>'processed_content', ''), 'href="/person/[0-9]+"', '', 'g'))) / LENGTH('href="/person/') as valid_format_links,
        created_at,
        updated_at
    FROM movie_analyses
    WHERE claude_response->>'processed_content' LIKE '%href="/person/%'
)
SELECT 
    tmdb_id,
    title,
    total_links,
    valid_format_links,
    (total_links - valid_format_links) as malformed_links,
    CASE 
        WHEN total_links = valid_format_links THEN 'CLEAN'
        WHEN valid_format_links = 0 THEN 'ALL_MALFORMED'
        ELSE 'MIXED'
    END as status,
    created_at
FROM link_analysis
WHERE total_links > 0
ORDER BY malformed_links DESC, total_links DESC;

-- =============================================
-- MONITORING DASHBOARD QUERIES
-- =============================================

-- Query 6: Person link health summary (for dashboard)
CREATE OR REPLACE VIEW person_link_health_summary AS
WITH link_stats AS (
    SELECT 
        COUNT(*) as total_analyses_with_person_links,
        SUM(CASE 
            WHEN claude_response->>'processed_content' ~ 'href="/person/[^0-9]' THEN 1 
            ELSE 0 
        END) as analyses_with_malformed_links,
        SUM(
            (LENGTH(coalesce(claude_response->>'processed_content', '')) - 
             LENGTH(REPLACE(coalesce(claude_response->>'processed_content', ''), 'href="/person/', ''))) / LENGTH('href="/person/')
        ) as total_person_links,
        SUM(
            (LENGTH(coalesce(claude_response->>'processed_content', '')) - 
             LENGTH(regexp_replace(coalesce(claude_response->>'processed_content', ''), 'href="/person/[0-9]+"', '', 'g'))) / LENGTH('href="/person/')
        ) as valid_format_links
    FROM movie_analyses
    WHERE claude_response->>'processed_content' LIKE '%href="/person/%'
)
SELECT 
    total_analyses_with_person_links,
    analyses_with_malformed_links,
    (total_analyses_with_person_links - analyses_with_malformed_links) as analyses_with_clean_links,
    total_person_links,
    valid_format_links,
    (total_person_links - valid_format_links) as malformed_person_links,
    ROUND((valid_format_links::DECIMAL / NULLIF(total_person_links, 0)) * 100, 2) as health_percentage,
    CURRENT_TIMESTAMP as last_checked
FROM link_stats;

-- Query 7: Recent person link violations (last 24 hours)
SELECT 
    tmdb_id,
    title,
    array_agg(DISTINCT (regexp_matches(
        claude_response->>'processed_content',
        'href="/person/([^0-9][^"]*)"', 'g'
    ))[1]) as malformed_person_ids,
    created_at,
    updated_at
FROM movie_analyses
WHERE claude_response->>'processed_content' ~ 'href="/person/[^0-9]'
  AND (created_at > NOW() - INTERVAL '24 hours' OR updated_at > NOW() - INTERVAL '24 hours')
GROUP BY tmdb_id, title, created_at, updated_at
ORDER BY GREATEST(created_at, updated_at) DESC;

-- =============================================
-- SECTION-SPECIFIC MONITORING
-- =============================================

-- Query 8: Check person links in all content sections
WITH section_links AS (
    SELECT 
        tmdb_id,
        title,
        'processed_content' as section_type,
        claude_response->>'processed_content' as content
    FROM movie_analyses
    WHERE claude_response ? 'processed_content'
    
    UNION ALL
    
    SELECT 
        tmdb_id,
        title,
        'sections.' || section_key as section_type,
        section_value as content
    FROM movie_analyses,
    LATERAL jsonb_each_text(claude_response->'sections') as sections(section_key, section_value)
    WHERE claude_response ? 'sections'
    
    UNION ALL
    
    SELECT 
        tmdb_id,
        title,
        'exploreFurther[' || (row_number() OVER (PARTITION BY tmdb_id ORDER BY ordinality) - 1) || '].content' as section_type,
        item->>'content' as content
    FROM movie_analyses,
    LATERAL jsonb_array_elements(claude_response->'exploreFurther') WITH ORDINALITY as items(item, ordinality)
    WHERE claude_response ? 'exploreFurther'
      AND jsonb_typeof(claude_response->'exploreFurther') = 'array'
      AND item ? 'content'
)
SELECT 
    tmdb_id,
    title,
    section_type,
    COUNT(*) as malformed_links_count,
    array_agg((regexp_matches(content, 'href="/person/([^0-9][^"]*)"', 'g'))[1]) as malformed_person_ids
FROM section_links
WHERE content ~ 'href="/person/[^0-9]'
GROUP BY tmdb_id, title, section_type
ORDER BY tmdb_id, section_type;

-- =============================================
-- PERFORMANCE AND CLEANUP QUERIES
-- =============================================

-- Query 9: Find analyses that would benefit from cleanup
SELECT 
    tmdb_id,
    title,
    (LENGTH(claude_response->>'processed_content') - 
     LENGTH(REPLACE(claude_response->>'processed_content', 'href="/person/', ''))) / LENGTH('href="/person/') as total_person_links,
    created_at,
    -- Estimate cleanup priority based on link count and recency
    CASE 
        WHEN created_at > NOW() - INTERVAL '30 days' THEN 'HIGH'
        WHEN created_at > NOW() - INTERVAL '90 days' THEN 'MEDIUM'
        ELSE 'LOW'
    END as cleanup_priority
FROM movie_analyses
WHERE claude_response->>'processed_content' ~ 'href="/person/[^0-9]'
ORDER BY cleanup_priority DESC, total_person_links DESC;

-- Query 10: Person link format distribution
SELECT 
    CASE 
        WHEN person_id ~ '^[0-9]+$' THEN 'NUMERIC_ID'
        WHEN person_id ~ '^[a-zA-Z]' THEN 'NAME_SLUG'
        ELSE 'OTHER'
    END as link_format,
    COUNT(*) as count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM (
    SELECT DISTINCT
        (regexp_matches(
            claude_response->>'processed_content',
            'href="/person/([^"]+)"', 'g'
        ))[1] as person_id
    FROM movie_analyses
    WHERE claude_response->>'processed_content' LIKE '%href="/person/%'
) person_links
GROUP BY 
    CASE 
        WHEN person_id ~ '^[0-9]+$' THEN 'NUMERIC_ID'
        WHEN person_id ~ '^[a-zA-Z]' THEN 'NAME_SLUG'
        ELSE 'OTHER'
    END
ORDER BY count DESC;

-- =============================================
-- AUTOMATED MONITORING FUNCTIONS
-- =============================================

-- Function to check person link health and raise alerts
CREATE OR REPLACE FUNCTION check_person_link_health()
RETURNS TABLE(
    alert_level TEXT,
    message TEXT,
    affected_count INTEGER,
    recommendation TEXT
) AS $$
DECLARE
    malformed_count INTEGER;
    total_with_links INTEGER;
    health_percentage DECIMAL;
BEGIN
    -- Get current stats
    SELECT 
        analyses_with_malformed_links,
        total_analyses_with_person_links,
        health_percentage
    INTO malformed_count, total_with_links, health_percentage
    FROM person_link_health_summary;

    -- Generate alerts based on health metrics
    IF health_percentage < 50 THEN
        RETURN QUERY SELECT 
            'CRITICAL'::TEXT,
            'More than 50% of person links are malformed'::TEXT,
            malformed_count,
            'Run sanitization script immediately'::TEXT;
    ELSIF health_percentage < 80 THEN
        RETURN QUERY SELECT 
            'WARNING'::TEXT,
            'Significant number of malformed person links detected'::TEXT,
            malformed_count,
            'Schedule sanitization script'::TEXT;
    ELSIF malformed_count > 0 THEN
        RETURN QUERY SELECT 
            'INFO'::TEXT,
            'Some malformed person links present'::TEXT,
            malformed_count,
            'Monitor and clean up when convenient'::TEXT;
    ELSE
        RETURN QUERY SELECT 
            'OK'::TEXT,
            'All person links are properly formatted'::TEXT,
            0,
            'No action needed'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- USAGE EXAMPLES AND DOCUMENTATION
-- =============================================

/*
USAGE EXAMPLES:

1. Quick health check:
   SELECT * FROM person_link_health_summary;

2. Find all malformed links:
   SELECT * FROM bad_person_links LIMIT 10;

3. Get cleanup priorities:
   SELECT * FROM check_person_link_health();

4. Monitor recent violations:
   SELECT tmdb_id, title, malformed_person_ids 
   FROM (Query 7 above) 
   WHERE created_at > NOW() - INTERVAL '1 hour';

5. Check specific movie:
   SELECT * FROM movie_analyses 
   WHERE tmdb_id = 550 
   AND claude_response->>'processed_content' ~ 'href="/person/[^0-9]';

MONITORING SCHEDULE:
- Run person_link_health_summary every hour
- Run check_person_link_health() daily
- Review recent violations weekly
- Full audit monthly

ALERT THRESHOLDS:
- CRITICAL: <50% valid links
- WARNING: <80% valid links  
- INFO: Any malformed links present
- OK: All links properly formatted
*/