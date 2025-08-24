-- Add simple use/don't use flags to movie_lists table
-- This allows for simple deduplication management without complex processing

ALTER TABLE movie_lists 
ADD COLUMN IF NOT EXISTS use_flag BOOLEAN DEFAULT true;

-- Add index for efficient filtering of active lists
CREATE INDEX IF NOT EXISTS idx_movie_lists_use_flag ON movie_lists(use_flag);

-- Add comment explaining the flag system
COMMENT ON COLUMN movie_lists.use_flag IS 'Simple flag for list management - true=use, false=dont use (can become relevant later)';

-- Optional: Add created_at timestamp for audit trail
ALTER TABLE movie_lists 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Sample query to show flagged lists
-- SELECT name, movie_count, use_flag, created_at 
-- FROM movie_lists 
-- WHERE use_flag = true 
-- ORDER BY movie_count DESC;