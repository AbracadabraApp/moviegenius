-- Add trailer_url column to movies table
-- This will store YouTube video IDs or full URLs to trailers

ALTER TABLE movies ADD COLUMN trailer_url TEXT;

-- Create index for efficient trailer lookups
CREATE INDEX idx_movies_trailer_url ON movies(trailer_url) WHERE trailer_url IS NOT NULL;

-- Update any existing movies that might have trailer data
-- (This will be populated by the batch trailer script)

COMMENT ON COLUMN movies.trailer_url IS 'YouTube video ID or trailer URL - populated from TMDB videos endpoint';