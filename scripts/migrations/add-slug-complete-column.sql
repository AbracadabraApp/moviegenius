-- Add slug_complete column to movies table
-- This prevents continuous slug regeneration and waste

-- Add the column with default false
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS slug_complete BOOLEAN DEFAULT false;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_movies_slug_complete 
ON movies(slug_complete) 
WHERE slug_complete = true;

-- Set slug_complete=true for movies that already have valid slugs
UPDATE movies 
SET slug_complete = true 
WHERE slug IS NOT NULL 
  AND slug != '' 
  AND LENGTH(slug) > 5 
  AND LENGTH(slug) <= 80
  AND slug NOT LIKE '%Plot:%'
  AND slug NOT LIKE '%Overview:%'
  AND slug NOT LIKE '%Synopsis:%'
  AND slug NOT LIKE '%Summary:%';

-- Show results
SELECT 
  COUNT(*) as total_movies,
  COUNT(CASE WHEN slug_complete = true THEN 1 END) as complete_slugs,
  COUNT(CASE WHEN slug IS NULL THEN 1 END) as null_slugs,
  ROUND(
    COUNT(CASE WHEN slug_complete = true THEN 1 END) * 100.0 / COUNT(*), 
    1
  ) as completion_percentage
FROM movies;