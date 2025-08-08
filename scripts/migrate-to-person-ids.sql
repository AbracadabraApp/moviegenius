-- Migration: Convert from name-based to ID-based person system
-- 
-- This migration:
-- 1. Creates persons table
-- 2. Populates it with unique person names from movie_contributors
-- 3. Adds person_id column to movie_contributors
-- 4. Updates movie_contributors to use person IDs instead of names
-- 5. Creates necessary foreign key constraints
-- 
-- IMPORTANT: This migration allows multiple people with the same name
-- to become separate person records. No complex deduplication logic.

-- =============================================
-- STEP 1: CREATE PERSONS TABLE
-- =============================================

CREATE TABLE persons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_persons_name ON persons(name);

COMMENT ON TABLE persons IS 'Simple person registry with unique numeric IDs. No deduplication - allows multiple people with same names.';

-- =============================================
-- STEP 2: POPULATE PERSONS TABLE
-- =============================================

-- Insert all unique person names from movie_contributors
-- Each unique name gets its own person record (no merging)
INSERT INTO persons (name)
SELECT DISTINCT person_name
FROM movie_contributors
ORDER BY person_name;

-- =============================================
-- STEP 3: ADD PERSON_ID TO MOVIE_CONTRIBUTORS
-- =============================================

-- Add the new person_id column
ALTER TABLE movie_contributors 
ADD COLUMN person_id INTEGER;

-- =============================================
-- STEP 4: POPULATE PERSON_ID VALUES
-- =============================================

-- Update movie_contributors to reference person IDs
UPDATE movie_contributors 
SET person_id = persons.id
FROM persons 
WHERE movie_contributors.person_name = persons.name;

-- =============================================
-- STEP 5: ADD CONSTRAINTS AND CLEANUP
-- =============================================

-- Make person_id NOT NULL (all rows should be updated)
ALTER TABLE movie_contributors 
ALTER COLUMN person_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE movie_contributors 
ADD CONSTRAINT fk_movie_contributors_person_id 
FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_movie_contributors_person_id 
ON movie_contributors(person_id);

-- Update unique constraint to use person_id instead of person_name
ALTER TABLE movie_contributors 
DROP CONSTRAINT movie_contributors_movie_tmdb_id_person_name_role_key;

ALTER TABLE movie_contributors 
ADD CONSTRAINT movie_contributors_movie_tmdb_id_person_id_role_key 
UNIQUE(movie_tmdb_id, person_id, role);

-- =============================================
-- STEP 6: OPTIONAL CLEANUP (keep person_name for now)
-- =============================================

-- DON'T drop person_name column yet - keep it for validation and rollback
-- We can remove it in a future migration once we're confident the system works

-- Add comment to person_name indicating it's deprecated
COMMENT ON COLUMN movie_contributors.person_name IS 'DEPRECATED: Use person_id instead. Kept for rollback purposes.';
COMMENT ON COLUMN movie_contributors.person_id IS 'References persons.id. Primary person identifier for new ID-based system.';

-- =============================================
-- VALIDATION QUERIES
-- =============================================

-- Verify all movie_contributors have person_id
SELECT 
    COUNT(*) as total_contributors,
    COUNT(person_id) as contributors_with_person_id,
    COUNT(*) - COUNT(person_id) as contributors_missing_person_id
FROM movie_contributors;

-- Show sample person records
SELECT id, name, created_at 
FROM persons 
ORDER BY id 
LIMIT 10;

-- Show sample movie_contributors with person_id
SELECT 
    movie_tmdb_id,
    person_name,
    person_id,
    role
FROM movie_contributors
ORDER BY person_id
LIMIT 10;

-- Count total persons created
SELECT COUNT(*) as total_persons FROM persons;