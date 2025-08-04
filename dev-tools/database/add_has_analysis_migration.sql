-- Add has_analysis flag to movies table for batch processing tracking
-- Step 1: Add the has_analysis column with default FALSE
ALTER TABLE movies ADD COLUMN has_analysis BOOLEAN DEFAULT FALSE;

-- Step 2: Update existing movies that already have analyses
UPDATE movies
SET has_analysis = TRUE
WHERE id IN (
  SELECT DISTINCT movie_id
  FROM movie_analyses
  WHERE analysis_type = 'page_analysis'
);

-- Step 3: Verify the results
SELECT
  COUNT(*) as total_movies,
  SUM(CASE WHEN has_analysis = TRUE THEN 1 ELSE 0 END) as movies_with_analysis,
  SUM(CASE WHEN has_analysis = FALSE THEN 1 ELSE 0 END) as movies_needing_analysis
FROM movies;

-- Step 4: Show sample of movies needing analysis (batch candidates)
SELECT tmdb_id, title, year, has_analysis
FROM movies
WHERE has_analysis = FALSE
ORDER BY tmdb_id
LIMIT 10;