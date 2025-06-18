-- Episodes table schema for MovieGenius Genius Episodes
-- Migrates episode content from JSON files to database storage

-- Create episodes table
CREATE TABLE IF NOT EXISTS episodes (
    id SERIAL PRIMARY KEY,
    theme_id INTEGER NOT NULL,
    series_id INTEGER NOT NULL,
    episode_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    content JSONB NOT NULL,
    hero_image TEXT,
    generated_at TIMESTAMP,
    version TEXT,
    locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMP,
    locked_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique episodes per theme/series combination
    CONSTRAINT episodes_unique_key UNIQUE(theme_id, series_id, episode_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_episodes_theme_series ON episodes(theme_id, series_id);
CREATE INDEX IF NOT EXISTS idx_episodes_lookup ON episodes(theme_id, series_id, episode_id);
CREATE INDEX IF NOT EXISTS idx_episodes_title ON episodes(title);
CREATE INDEX IF NOT EXISTS idx_episodes_locked ON episodes(locked);
CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON episodes(created_at);

-- Create GIN index for JSONB content searches
CREATE INDEX IF NOT EXISTS idx_episodes_content_gin ON episodes USING GIN(content);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_episodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS trigger_episodes_updated_at ON episodes;
CREATE TRIGGER trigger_episodes_updated_at
    BEFORE UPDATE ON episodes
    FOR EACH ROW
    EXECUTE FUNCTION update_episodes_updated_at();

-- Add helpful comments
COMMENT ON TABLE episodes IS 'Storage for Genius educational episode content';
COMMENT ON COLUMN episodes.theme_id IS 'Reference to theme (1=Genres, 2=Directors, etc.)';
COMMENT ON COLUMN episodes.series_id IS 'Series within theme (1=Classic Film Noir, etc.)';
COMMENT ON COLUMN episodes.episode_id IS 'Episode within series (1, 2, 3, etc.)';
COMMENT ON COLUMN episodes.content IS 'Full episode content as JSONB (opener, sections, moreIdeas)';
COMMENT ON COLUMN episodes.hero_image IS 'Path to hero image for episode';
COMMENT ON COLUMN episodes.locked IS 'Prevents accidental regeneration of content';
COMMENT ON COLUMN episodes.locked_by IS 'Who locked the episode (user or system)';