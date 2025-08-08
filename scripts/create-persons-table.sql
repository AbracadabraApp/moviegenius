-- Simple Persons Table
-- Minimal person system with unique numeric IDs
-- 
-- Design principles:
-- - Simple ID-based system, no complex algorithms
-- - Each person gets a unique numeric ID
-- - Person URLs become /person/12345 instead of /person/christopher-nolan
-- - No deduplication logic - let different people with same names be separate records
-- - No confidence scores or merging complexity

-- =============================================
-- CREATE PERSONS TABLE
-- =============================================

CREATE TABLE persons (
    id SERIAL PRIMARY KEY,
    
    -- Person name exactly as it appears in movie_contributors
    name VARCHAR(255) NOT NULL,
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Allow multiple people with the same name (no uniqueness constraint on name)
    -- This simplifies the system and avoids complex merging logic
);

-- =============================================
-- CREATE PERFORMANCE INDEXES
-- =============================================

-- Name lookup for migration and admin purposes
CREATE INDEX idx_persons_name 
ON persons(name);

-- =============================================
-- TABLE DOCUMENTATION
-- =============================================

COMMENT ON TABLE persons IS 'Simple person registry with unique numeric IDs. No deduplication - allows multiple people with same names.';
COMMENT ON COLUMN persons.id IS 'Unique numeric ID used in URLs: /person/12345';
COMMENT ON COLUMN persons.name IS 'Person name exactly as extracted from movie analysis. No normalization or merging.';

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
WHERE table_name = 'persons'
ORDER BY ordinal_position;

-- Test indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'persons';