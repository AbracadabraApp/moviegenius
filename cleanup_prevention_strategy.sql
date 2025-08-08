-- =====================================================
-- DATA CLEANUP AND PREVENTION STRATEGY
-- Railway Database Integrity Management
-- =====================================================

-- =====================================================
-- PHASE 1: DATA CLEANUP PROCEDURES
-- =====================================================

-- 1.1 Backup affected data before cleanup
CREATE TABLE IF NOT EXISTS corrupted_analyses_backup AS
SELECT 
    ma.id,
    ma.movie_id,
    m.tmdb_id,
    m.title,
    m.year,
    ma.claude_response,
    CURRENT_TIMESTAMP as backup_timestamp,
    'DUPLICATE_CONTENT' as corruption_type
FROM movie_analyses ma
JOIN movies m ON ma.movie_id = m.id
WHERE ma.id IN (
    SELECT ma1.id
    FROM movie_analyses ma1
    JOIN movies m1 ON ma1.movie_id = m1.id
    WHERE EXISTS (
        SELECT 1 FROM movie_analyses ma2
        JOIN movies m2 ON ma2.movie_id = m2.id
        WHERE ma1.claude_response->>'processed_content' = ma2.claude_response->>'processed_content'
        AND ma1.id != ma2.id
        AND m1.tmdb_id != m2.tmdb_id
    )
);

-- 1.2 Identify analyses that need to be regenerated (not just deleted)
WITH duplicate_content_groups AS (
    SELECT 
        ma.claude_response->>'processed_content' as content,
        ARRAY_AGG(
            JSON_BUILD_OBJECT(
                'analysis_id', ma.id,
                'movie_id', ma.movie_id,
                'tmdb_id', m.tmdb_id,
                'title', m.title,
                'year', m.year
            ) ORDER BY m.year DESC
        ) as affected_analyses
    FROM movie_analyses ma
    JOIN movies m ON ma.movie_id = m.id
    WHERE ma.claude_response IS NOT NULL
    GROUP BY ma.claude_response->>'processed_content'
    HAVING COUNT(*) > 1
)
SELECT 
    content,
    affected_analyses,
    ARRAY_LENGTH(affected_analyses, 1) as duplicate_count
FROM duplicate_content_groups
ORDER BY ARRAY_LENGTH(affected_analyses, 1) DESC;

-- 1.3 Soft delete corrupted analyses (mark for regeneration)
-- Add a column to track corruption status
ALTER TABLE movie_analyses 
ADD COLUMN IF NOT EXISTS data_quality_status VARCHAR(50) DEFAULT 'VALID';

ALTER TABLE movie_analyses 
ADD COLUMN IF NOT EXISTS needs_regeneration BOOLEAN DEFAULT FALSE;

-- Mark duplicate analyses for regeneration
UPDATE movie_analyses 
SET 
    data_quality_status = 'DUPLICATE_CONTENT',
    needs_regeneration = TRUE
WHERE id IN (
    SELECT ma1.id
    FROM movie_analyses ma1
    JOIN movies m1 ON ma1.movie_id = m1.id
    WHERE EXISTS (
        SELECT 1 FROM movie_analyses ma2
        JOIN movies m2 ON ma2.movie_id = m2.id
        WHERE ma1.claude_response->>'processed_content' = ma2.claude_response->>'processed_content'
        AND ma1.id != ma2.id
        AND m1.tmdb_id != m2.tmdb_id
    )
);

-- Mark metadata mismatch analyses for regeneration
UPDATE movie_analyses 
SET 
    data_quality_status = 'METADATA_MISMATCH',
    needs_regeneration = TRUE
FROM movies m
WHERE movie_analyses.movie_id = m.id
AND movie_analyses.claude_response IS NOT NULL
AND movie_analyses.claude_response->>'raw_content' IS NOT NULL
AND (
    m.year != ((movie_analyses.claude_response->>'raw_content')::jsonb->'metadata'->>'year')::int
    OR LOWER(m.title) != LOWER((movie_analyses.claude_response->>'raw_content')::jsonb->'metadata'->>'title')
);

-- 1.4 Clean up impossible contributor associations
-- Backup contributor data first
CREATE TABLE IF NOT EXISTS corrupted_contributors_backup AS
SELECT 
    mc.*,
    m.year as movie_year,
    CURRENT_TIMESTAMP as backup_timestamp,
    'IMPOSSIBLE_ASSOCIATION' as corruption_type
FROM movie_contributors mc
JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
WHERE (
    (mc.person_name ILIKE '%billy wilder%' AND m.year > 2002)
    OR (mc.person_name ILIKE '%orson welles%' AND m.year > 1985)
    OR (mc.person_name ILIKE '%alfred hitchcock%' AND m.year > 1980)
    OR (mc.person_name ILIKE '%john ford%' AND m.year > 1973)
    OR (mc.person_name ILIKE '%howard hawks%' AND m.year > 1977)
    OR (mc.person_name ILIKE '%frank capra%' AND m.year > 1991)
    OR (mc.person_name ILIKE '%william wyler%' AND m.year > 1981)
);

-- Remove impossible contributor associations
DELETE FROM movie_contributors mc
USING movies m
WHERE mc.movie_tmdb_id = m.tmdb_id
AND (
    (mc.person_name ILIKE '%billy wilder%' AND m.year > 2002)
    OR (mc.person_name ILIKE '%orson welles%' AND m.year > 1985)
    OR (mc.person_name ILIKE '%alfred hitchcock%' AND m.year > 1980)
    OR (mc.person_name ILIKE '%john ford%' AND m.year > 1973)
    OR (mc.person_name ILIKE '%howard hawks%' AND m.year > 1977)
    OR (mc.person_name ILIKE '%frank capra%' AND m.year > 1991)
    OR (mc.person_name ILIKE '%william wyler%' AND m.year > 1981)
);

-- =====================================================
-- PHASE 2: PREVENTION MEASURES
-- =====================================================

-- 2.1 Create content hash index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_analysis_content_hash 
ON movie_analyses (MD5(claude_response->>'processed_content'))
WHERE claude_response IS NOT NULL;

-- 2.2 Create validation function for analysis insertion
CREATE OR REPLACE FUNCTION validate_analysis_content()
RETURNS TRIGGER AS $$
DECLARE
    content_hash TEXT;
    existing_movie_id UUID;
    movie_tmdb_id INTEGER;
    movie_title TEXT;
    movie_year INTEGER;
    analysis_title TEXT;
    analysis_year INTEGER;
BEGIN
    -- Skip validation if no content
    IF NEW.claude_response IS NULL OR NEW.claude_response->>'processed_content' IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get movie details for the new analysis
    SELECT m.tmdb_id, m.title, m.year 
    INTO movie_tmdb_id, movie_title, movie_year
    FROM movies m 
    WHERE m.id = NEW.movie_id;
    
    -- Check for duplicate content
    content_hash := MD5(NEW.claude_response->>'processed_content');
    
    SELECT ma.movie_id INTO existing_movie_id
    FROM movie_analyses ma
    WHERE MD5(ma.claude_response->>'processed_content') = content_hash
    AND ma.movie_id != NEW.movie_id
    AND ma.data_quality_status = 'VALID'
    LIMIT 1;
    
    IF existing_movie_id IS NOT NULL THEN
        RAISE EXCEPTION 'Duplicate analysis content detected. Content hash % already exists for different movie.', content_hash;
    END IF;
    
    -- Validate metadata consistency if present
    IF NEW.claude_response->>'raw_content' IS NOT NULL AND NEW.claude_response->>'raw_content' != '' THEN
        BEGIN
            analysis_title := (NEW.claude_response->>'raw_content')::jsonb->'metadata'->>'title';
            analysis_year := ((NEW.claude_response->>'raw_content')::jsonb->'metadata'->>'year')::int;
            
            -- Check title consistency (case-insensitive)
            IF analysis_title IS NOT NULL AND LOWER(analysis_title) != LOWER(movie_title) THEN
                RAISE EXCEPTION 'Title mismatch: Movie title "%" does not match analysis title "%"', movie_title, analysis_title;
            END IF;
            
            -- Check year consistency
            IF analysis_year IS NOT NULL AND analysis_year != movie_year THEN
                RAISE EXCEPTION 'Year mismatch: Movie year % does not match analysis year %', movie_year, analysis_year;
            END IF;
            
        EXCEPTION WHEN others THEN
            -- If JSON parsing fails, log but don't block insertion
            RAISE WARNING 'Could not validate metadata for analysis: %', SQLERRM;
        END;
    END IF;
    
    -- Set data quality status
    NEW.data_quality_status := 'VALID';
    NEW.needs_regeneration := FALSE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for analysis validation
DROP TRIGGER IF EXISTS validate_analysis_trigger ON movie_analyses;
CREATE TRIGGER validate_analysis_trigger
    BEFORE INSERT OR UPDATE ON movie_analyses
    FOR EACH ROW
    EXECUTE FUNCTION validate_analysis_content();

-- 2.3 Create contributor validation function
CREATE OR REPLACE FUNCTION validate_contributor_association()
RETURNS TRIGGER AS $$
DECLARE
    movie_year INTEGER;
    known_death_year INTEGER;
BEGIN
    -- Get movie year
    SELECT year INTO movie_year
    FROM movies 
    WHERE tmdb_id = NEW.movie_tmdb_id;
    
    -- Check for known deceased contributors
    known_death_year := CASE 
        WHEN NEW.person_name ILIKE '%billy wilder%' THEN 2002
        WHEN NEW.person_name ILIKE '%orson welles%' THEN 1985
        WHEN NEW.person_name ILIKE '%alfred hitchcock%' THEN 1980
        WHEN NEW.person_name ILIKE '%john ford%' THEN 1973
        WHEN NEW.person_name ILIKE '%howard hawks%' THEN 1977
        WHEN NEW.person_name ILIKE '%frank capra%' THEN 1991
        WHEN NEW.person_name ILIKE '%william wyler%' THEN 1981
        ELSE NULL
    END;
    
    -- Prevent impossible associations
    IF known_death_year IS NOT NULL AND movie_year > known_death_year THEN
        RAISE EXCEPTION 'Impossible contributor association: % died in % but movie is from %', 
            NEW.person_name, known_death_year, movie_year;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for contributor validation
DROP TRIGGER IF EXISTS validate_contributor_trigger ON movie_contributors;
CREATE TRIGGER validate_contributor_trigger
    BEFORE INSERT OR UPDATE ON movie_contributors
    FOR EACH ROW
    EXECUTE FUNCTION validate_contributor_association();

-- 2.4 Create monitoring views for ongoing data quality
CREATE OR REPLACE VIEW data_quality_summary AS
SELECT 
    COUNT(*) as total_analyses,
    COUNT(CASE WHEN data_quality_status = 'VALID' THEN 1 END) as valid_analyses,
    COUNT(CASE WHEN data_quality_status = 'DUPLICATE_CONTENT' THEN 1 END) as duplicate_content,
    COUNT(CASE WHEN data_quality_status = 'METADATA_MISMATCH' THEN 1 END) as metadata_mismatch,
    COUNT(CASE WHEN needs_regeneration = TRUE THEN 1 END) as needs_regeneration,
    ROUND(
        COUNT(CASE WHEN data_quality_status = 'VALID' THEN 1 END)::numeric / 
        COUNT(*)::numeric * 100, 2
    ) as data_quality_percentage
FROM movie_analyses;

-- 2.5 Create alerting function for data quality issues
CREATE OR REPLACE FUNCTION check_data_quality_alerts()
RETURNS TABLE (
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    affected_count INTEGER,
    check_timestamp TIMESTAMP
) AS $$
BEGIN
    -- Check for new duplicate content
    RETURN QUERY
    SELECT 
        'DUPLICATE_CONTENT'::TEXT,
        'HIGH'::TEXT,
        'New duplicate analysis content detected'::TEXT,
        COUNT(*)::INTEGER,
        CURRENT_TIMESTAMP
    FROM (
        SELECT ma.claude_response->>'processed_content' as content
        FROM movie_analyses ma
        WHERE ma.data_quality_status = 'DUPLICATE_CONTENT'
        GROUP BY ma.claude_response->>'processed_content'
        HAVING COUNT(*) > 1
    ) duplicates
    HAVING COUNT(*) > 0;
    
    -- Check for analyses needing regeneration
    RETURN QUERY
    SELECT 
        'NEEDS_REGENERATION'::TEXT,
        'MEDIUM'::TEXT,
        'Analyses marked for regeneration'::TEXT,
        COUNT(*)::INTEGER,
        CURRENT_TIMESTAMP
    FROM movie_analyses
    WHERE needs_regeneration = TRUE
    HAVING COUNT(*) > 0;
    
    -- Check overall data quality percentage
    RETURN QUERY
    SELECT 
        'LOW_DATA_QUALITY'::TEXT,
        'HIGH'::TEXT,
        'Data quality below acceptable threshold'::TEXT,
        0::INTEGER,
        CURRENT_TIMESTAMP
    FROM data_quality_summary
    WHERE data_quality_percentage < 95.0;
    
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 3: REGENERATION WORKFLOW
-- =====================================================

-- 3.1 Get list of analyses that need regeneration
CREATE OR REPLACE VIEW analyses_for_regeneration AS
SELECT 
    ma.id as analysis_id,
    ma.movie_id,
    m.tmdb_id,
    m.title,
    m.year,
    ma.data_quality_status,
    -- Priority based on corruption type
    CASE 
        WHEN ma.data_quality_status = 'DUPLICATE_CONTENT' THEN 1
        WHEN ma.data_quality_status = 'METADATA_MISMATCH' THEN 2
        ELSE 3
    END as regeneration_priority
FROM movie_analyses ma
JOIN movies m ON ma.movie_id = m.id
WHERE ma.needs_regeneration = TRUE
ORDER BY regeneration_priority, m.year DESC;

-- 3.2 Function to mark analysis as regenerated
CREATE OR REPLACE FUNCTION mark_analysis_regenerated(
    p_analysis_id UUID,
    p_new_claude_response JSONB
)
RETURNS VOID AS $$
BEGIN
    UPDATE movie_analyses 
    SET 
        claude_response = p_new_claude_response,
        data_quality_status = 'VALID',
        needs_regeneration = FALSE
    WHERE id = p_analysis_id;
    
    -- Log the regeneration
    INSERT INTO regeneration_log (
        analysis_id,
        regenerated_at,
        previous_status
    ) VALUES (
        p_analysis_id,
        CURRENT_TIMESTAMP,
        'REGENERATED'
    );
END;
$$ LANGUAGE plpgsql;

-- 3.3 Create regeneration log table
CREATE TABLE IF NOT EXISTS regeneration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES movie_analyses(id),
    regenerated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    previous_status VARCHAR(50),
    notes TEXT
);

-- =====================================================
-- PHASE 4: ONGOING MAINTENANCE
-- =====================================================

-- 4.1 Daily data quality check procedure
CREATE OR REPLACE FUNCTION daily_data_quality_check()
RETURNS TABLE (
    check_date DATE,
    total_analyses INTEGER,
    valid_analyses INTEGER,
    data_quality_percentage NUMERIC,
    new_duplicates INTEGER,
    new_metadata_mismatches INTEGER
) AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    WITH quality_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN ma.data_quality_status = 'VALID' THEN 1 END) as valid,
            COUNT(CASE WHEN ma.data_quality_status = 'DUPLICATE_CONTENT' 
                      AND ma.needs_regeneration = TRUE THEN 1 END) as duplicates,
            COUNT(CASE WHEN ma.data_quality_status = 'METADATA_MISMATCH' 
                      AND ma.needs_regeneration = TRUE THEN 1 END) as mismatches
        FROM movie_analyses ma
    )
    SELECT 
        today_date,
        qs.total,
        qs.valid,
        ROUND(qs.valid::numeric / qs.total::numeric * 100, 2),
        qs.duplicates,
        qs.mismatches
    FROM quality_stats qs;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Create index for performance
CREATE INDEX IF NOT EXISTS idx_movie_analyses_quality_status 
ON movie_analyses (data_quality_status, needs_regeneration);

CREATE INDEX IF NOT EXISTS idx_movie_analyses_movie_id 
ON movie_analyses (movie_id);

-- =====================================================
-- USAGE GUIDE
-- =====================================================

/*
CLEANUP EXECUTION STEPS:

1. BACKUP DATA:
   - Run backup queries in Section 1.1 before any cleanup

2. IDENTIFY SCOPE:
   - Execute the duplicate content groups query (1.2)
   - Review results to understand impact

3. MARK FOR CLEANUP:
   - Run the UPDATE statements in Section 1.3 to mark corrupted data

4. CLEAN CONTRIBUTORS:
   - Execute contributor cleanup in Section 1.4

5. IMPLEMENT PREVENTION:
   - Run all queries in Section 2 to add validation

6. REGENERATE DATA:
   - Use analyses_for_regeneration view to get list of analyses to regenerate
   - For each analysis, call your analysis generation process
   - Use mark_analysis_regenerated() function to update status

7. MONITOR ONGOING:
   - Run daily_data_quality_check() regularly
   - Set up alerts using check_data_quality_alerts()

PREVENTION MEASURES INCLUDED:
- Database triggers to prevent duplicate content insertion
- Metadata validation before storing analyses
- Contributor association validation
- Content hashing for duplicate detection
- Monitoring views and alerting functions
*/