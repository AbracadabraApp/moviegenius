-- Database Constraint for Analysis Type Validation
-- Ensures only 'page_analysis' type can be inserted to prevent future inconsistencies

-- Add constraint to movie_analyses table
ALTER TABLE movie_analyses 
ADD CONSTRAINT valid_analysis_type_constraint 
CHECK (analysis_type = 'page_analysis');

-- Add comment to document the constraint
COMMENT ON CONSTRAINT valid_analysis_type_constraint ON movie_analyses IS 
'Ensures only page_analysis type is allowed. Added during consolidation to prevent future inconsistencies.';

-- Verify constraint works by testing (should fail)
-- INSERT INTO movie_analyses (movie_id, analysis_type, claude_response, query_text) 
-- VALUES ('test-id', 'invalid_type', '{}', 'test') ON CONFLICT DO NOTHING;