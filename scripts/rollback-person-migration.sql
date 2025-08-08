-- Rollback Script for Person System Migration
-- 
-- This script rolls back the person system migration if needed.
-- It removes the new person_id system and restores the name-based system.
-- 
-- WARNING: Only run this if you need to rollback the migration!

-- =============================================
-- STEP 1: REMOVE FOREIGN KEY CONSTRAINT
-- =============================================

ALTER TABLE movie_contributors 
DROP CONSTRAINT IF EXISTS fk_movie_contributors_person_id;

-- =============================================
-- STEP 2: DROP PERSON_ID INDEX
-- =============================================

DROP INDEX IF EXISTS idx_movie_contributors_person_id;

-- =============================================
-- STEP 3: RESTORE ORIGINAL UNIQUE CONSTRAINT
-- =============================================

-- Drop new constraint
ALTER TABLE movie_contributors 
DROP CONSTRAINT IF EXISTS movie_contributors_movie_tmdb_id_person_id_role_key;

-- Restore original constraint (if it doesn't exist)
ALTER TABLE movie_contributors 
ADD CONSTRAINT movie_contributors_movie_tmdb_id_person_name_role_key 
UNIQUE(movie_tmdb_id, person_name, role);

-- =============================================
-- STEP 4: REMOVE PERSON_ID COLUMN
-- =============================================

ALTER TABLE movie_contributors 
DROP COLUMN IF EXISTS person_id;

-- =============================================
-- STEP 5: RESTORE PERSON_NAME COMMENT
-- =============================================

COMMENT ON COLUMN movie_contributors.person_name IS 'Person name exactly as it appears in keyElements (no TMDB resolution). Used for person page lookup.';

-- =============================================
-- STEP 6: DROP PERSONS TABLE
-- =============================================

DROP TABLE IF EXISTS persons CASCADE;

-- =============================================
-- VALIDATION QUERIES
-- =============================================

-- Verify rollback completed
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'movie_contributors'
ORDER BY ordinal_position;

-- Verify constraints
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'movie_contributors';

-- Verify persons table is dropped
SELECT COUNT(*) as persons_table_exists
FROM information_schema.tables 
WHERE table_name = 'persons';