-- Add updated_at column to movie_analyses table
-- This enables proper tracking of when analyses are modified with links

ALTER TABLE movie_analyses 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add trigger to automatically update the timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_movie_analyses_updated_at ON movie_analyses;
CREATE TRIGGER update_movie_analyses_updated_at
    BEFORE UPDATE ON movie_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();