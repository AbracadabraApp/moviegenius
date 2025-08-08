-- Simple Person Link Validation Constraint
-- Prevents insertion of name-based person links, only allows numeric person IDs

-- Create simple validation function
CREATE OR REPLACE FUNCTION validate_person_links_simple(content JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if content is null
    IF content IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check processed_content field for invalid person links
    IF content ? 'processed_content' THEN
        -- Look for person links with non-numeric IDs (name slugs)
        -- This catches patterns like href="/person/wallace-beery" or href="/person/christopher-nolan"
        IF content->>'processed_content' ~ 'href="/person/[^0-9][^"]*"' THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add check constraint to movie_analyses table
ALTER TABLE movie_analyses 
ADD CONSTRAINT valid_person_links_check 
CHECK (validate_person_links_simple(claude_response));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_person_links_validation 
ON movie_analyses USING gin ((claude_response->>'processed_content'));

-- Test the constraint
DO $$
BEGIN
    -- Test that it blocks bad data
    BEGIN
        INSERT INTO movie_analyses (id, movie_id, claude_response) 
        VALUES (
            gen_random_uuid(),
            (SELECT id FROM movies LIMIT 1),
            '{"processed_content": "Check out <a href=\"/person/wallace-beery\">Wallace Beery</a>"}'::jsonb
        );
        RAISE EXCEPTION 'Constraint failed to block bad person link';
    EXCEPTION 
        WHEN check_violation THEN
            RAISE NOTICE 'SUCCESS: Constraint correctly blocked bad person link';
        WHEN others THEN
            RAISE NOTICE 'Test failed with unexpected error: %', SQLERRM;
    END;
    
    -- Test that it allows good data
    BEGIN
        INSERT INTO movie_analyses (id, movie_id, claude_response) 
        VALUES (
            gen_random_uuid(),
            (SELECT id FROM movies LIMIT 1),
            '{"processed_content": "Check out <a href=\"/person/12345\">Wallace Beery</a>"}'::jsonb
        );
        DELETE FROM movie_analyses WHERE claude_response->>'processed_content' LIKE '%Check out <a href="/person/12345"%';
        RAISE NOTICE 'SUCCESS: Constraint correctly allowed good person link';
    EXCEPTION 
        WHEN others THEN
            RAISE NOTICE 'Test failed with unexpected error: %', SQLERRM;
    END;
END;
$$;

COMMENT ON FUNCTION validate_person_links_simple(JSONB) IS 
'Validates that person links use numeric IDs only, blocking name-based slugs';

COMMENT ON CONSTRAINT valid_person_links_check ON movie_analyses IS 
'Ensures person links use format /person/12345 instead of /person/name-slug';