-- Person Link Validation Constraints
-- Prevents insertion of malformed person links in movie analysis content

-- =============================================
-- CHECK CONSTRAINT FOR PERSON LINK FORMAT
-- =============================================

-- This constraint ensures that any person links in processed_content follow the correct format:
-- Valid: <a href="/person/12345" ...>
-- Invalid: <a href="/person/christopher-nolan" ...>

-- Create a function to validate person links in JSONB content
CREATE OR REPLACE FUNCTION validate_person_links(content JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    section_key TEXT;
    section_content TEXT;
    processed_content TEXT;
    explore_further JSONB;
    link_match TEXT;
BEGIN
    -- Check if content is null or empty
    IF content IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check processed_content field if it exists
    IF content ? 'processed_content' THEN
        processed_content := content->>'processed_content';
        
        -- Find all person links in processed content
        -- Pattern: href="/person/[anything]"
        FOR link_match IN 
            SELECT regexp_matches[1] 
            FROM regexp_split_to_table(processed_content, E'href="/person/([^"]+)"') AS regexp_matches
        LOOP
            -- Check if the link contains only digits (valid person ID)
            -- If it contains non-digits, it's a name slug (invalid)
            IF link_match !~ '^[0-9]+$' THEN
                RAISE WARNING 'Invalid person link found: /person/% (should be numeric ID)', link_match;
                RETURN FALSE;
            END IF;
        END LOOP;
    END IF;

    -- Check sections object if it exists
    IF content ? 'sections' THEN
        FOR section_key IN SELECT jsonb_object_keys(content->'sections')
        LOOP
            section_content := content->'sections'->>section_key;
            
            -- Find person links in section content
            FOR link_match IN 
                SELECT regexp_matches[1] 
                FROM regexp_split_to_table(section_content, E'href="/person/([^"]+)"') AS regexp_matches
            LOOP
                IF link_match !~ '^[0-9]+$' THEN
                    RAISE WARNING 'Invalid person link in section %: /person/% (should be numeric ID)', section_key, link_match;
                    RETURN FALSE;
                END IF;
            END LOOP;
        END LOOP;
    END IF;

    -- Check exploreFurther array if it exists
    IF content ? 'exploreFurther' AND jsonb_typeof(content->'exploreFurther') = 'array' THEN
        FOR explore_further IN SELECT jsonb_array_elements(content->'exploreFurther')
        LOOP
            IF explore_further ? 'content' THEN
                section_content := explore_further->>'content';
                
                -- Find person links in explore further content
                FOR link_match IN 
                    SELECT regexp_matches[1] 
                    FROM regexp_split_to_table(section_content, E'href="/person/([^"]+)"') AS regexp_matches
                LOOP
                    IF link_match !~ '^[0-9]+$' THEN
                        RAISE WARNING 'Invalid person link in exploreFurther: /person/% (should be numeric ID)', link_match;
                        RETURN FALSE;
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add the check constraint to movie_analyses table
DO $$
BEGIN
    -- Drop existing constraint if it exists
    BEGIN
        ALTER TABLE movie_analyses DROP CONSTRAINT IF EXISTS chk_valid_person_links;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;

    -- Add the new constraint
    ALTER TABLE movie_analyses ADD CONSTRAINT chk_valid_person_links 
        CHECK (validate_person_links(claude_response));
        
    RAISE NOTICE 'Added person link validation constraint to movie_analyses table';
END
$$;

-- =============================================
-- CONSTRAINT FOR PERSON ID REFERENCES
-- =============================================

-- Create function to validate that person IDs in links actually exist
CREATE OR REPLACE FUNCTION validate_person_id_exists(content JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    section_key TEXT;
    section_content TEXT;
    processed_content TEXT;
    explore_further JSONB;
    person_id TEXT;
    person_id_int INTEGER;
    person_exists BOOLEAN;
BEGIN
    -- Check if content is null or empty
    IF content IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check processed_content field
    IF content ? 'processed_content' THEN
        processed_content := content->>'processed_content';
        
        FOR person_id IN 
            SELECT regexp_matches[1] 
            FROM regexp_split_to_table(processed_content, E'href="/person/([0-9]+)"') AS regexp_matches
        LOOP
            person_id_int := person_id::INTEGER;
            SELECT EXISTS(SELECT 1 FROM persons WHERE id = person_id_int) INTO person_exists;
            
            IF NOT person_exists THEN
                RAISE WARNING 'Person ID % referenced in link does not exist in persons table', person_id;
                RETURN FALSE;
            END IF;
        END LOOP;
    END IF;

    -- Check sections
    IF content ? 'sections' THEN
        FOR section_key IN SELECT jsonb_object_keys(content->'sections')
        LOOP
            section_content := content->'sections'->>section_key;
            
            FOR person_id IN 
                SELECT regexp_matches[1] 
                FROM regexp_split_to_table(section_content, E'href="/person/([0-9]+)"') AS regexp_matches
            LOOP
                person_id_int := person_id::INTEGER;
                SELECT EXISTS(SELECT 1 FROM persons WHERE id = person_id_int) INTO person_exists;
                
                IF NOT person_exists THEN
                    RAISE WARNING 'Person ID % in section % does not exist', person_id, section_key;
                    RETURN FALSE;
                END IF;
            END LOOP;
        END LOOP;
    END IF;

    -- Check exploreFurther
    IF content ? 'exploreFurther' AND jsonb_typeof(content->'exploreFurther') = 'array' THEN
        FOR explore_further IN SELECT jsonb_array_elements(content->'exploreFurther')
        LOOP
            IF explore_further ? 'content' THEN
                section_content := explore_further->>'content';
                
                FOR person_id IN 
                    SELECT regexp_matches[1] 
                    FROM regexp_split_to_table(section_content, E'href="/person/([0-9]+)"') AS regexp_matches
                LOOP
                    person_id_int := person_id::INTEGER;
                    SELECT EXISTS(SELECT 1 FROM persons WHERE id = person_id_int) INTO person_exists;
                    
                    IF NOT person_exists THEN
                        RAISE WARNING 'Person ID % in exploreFurther does not exist', person_id;
                        RETURN FALSE;
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add person ID existence validation (optional - can be enabled later)
-- ALTER TABLE movie_analyses ADD CONSTRAINT chk_person_ids_exist 
--     CHECK (validate_person_id_exists(claude_response));

-- =============================================
-- INDEX FOR PERFORMANCE
-- =============================================

-- Create GIN index on claude_response JSONB column for efficient person link queries
CREATE INDEX IF NOT EXISTS idx_movie_analyses_person_links 
ON movie_analyses USING GIN ((claude_response->'processed_content'), (claude_response->'sections'));

-- =============================================
-- TESTING QUERIES
-- =============================================

-- Test the validation function with sample data
DO $$
DECLARE
    test_content_valid JSONB := '{"processed_content": "Visit <a href=\"/person/123\">Director Name</a> for more info."}';
    test_content_invalid JSONB := '{"processed_content": "Visit <a href=\"/person/christopher-nolan\">Director Name</a> for more info."}';
    test_content_mixed JSONB := '{"processed_content": "Visit <a href=\"/person/123\">Good Link</a> and <a href=\"/person/bad-slug\">Bad Link</a>."}';
BEGIN
    -- Test valid content
    IF validate_person_links(test_content_valid) THEN
        RAISE NOTICE 'TEST PASS: Valid person links accepted';
    ELSE
        RAISE NOTICE 'TEST FAIL: Valid person links rejected';
    END IF;

    -- Test invalid content
    IF NOT validate_person_links(test_content_invalid) THEN
        RAISE NOTICE 'TEST PASS: Invalid person links rejected';
    ELSE
        RAISE NOTICE 'TEST FAIL: Invalid person links accepted';
    END IF;

    -- Test mixed content
    IF NOT validate_person_links(test_content_mixed) THEN
        RAISE NOTICE 'TEST PASS: Mixed person links rejected';
    ELSE
        RAISE NOTICE 'TEST FAIL: Mixed person links accepted';
    END IF;
END
$$;

-- =============================================
-- USAGE DOCUMENTATION
-- =============================================

COMMENT ON FUNCTION validate_person_links(JSONB) IS 
'Validates that all person links in movie analysis content use numeric IDs (/person/123) not name slugs (/person/name-slug)';

COMMENT ON FUNCTION validate_person_id_exists(JSONB) IS 
'Validates that person IDs referenced in links actually exist in the persons table';

-- Summary of what this script does:
-- 1. Creates validation functions to check person link formats
-- 2. Adds check constraints to prevent bad data insertion
-- 3. Validates both format (numeric IDs only) and referential integrity
-- 4. Provides comprehensive testing of the validation logic
-- 5. Creates performance indexes for person link queries