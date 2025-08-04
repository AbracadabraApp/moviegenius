-- Movie Lists Schema for MovieGenius
-- Creates the core database structure for movie list management

-- Create movie_lists table
CREATE TABLE IF NOT EXISTS movie_lists (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    content_type TEXT DEFAULT 'declarative' CHECK (content_type IN ('declarative', 'educational')),
    claude_prompt TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create movie_list_items table (junction table)
CREATE TABLE IF NOT EXISTS movie_list_items (
    id SERIAL PRIMARY KEY,
    list_id INTEGER REFERENCES movie_lists(id) ON DELETE CASCADE,
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(list_id, movie_id)
);

-- Create list_analyses table
CREATE TABLE IF NOT EXISTS list_analyses (
    id SERIAL PRIMARY KEY,
    list_id INTEGER REFERENCES movie_lists(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL,
    claude_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(list_id, analysis_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_movie_lists_slug ON movie_lists(slug);
CREATE INDEX IF NOT EXISTS idx_movie_lists_active ON movie_lists(is_active);
CREATE INDEX IF NOT EXISTS idx_movie_lists_content_type ON movie_lists(content_type);
CREATE INDEX IF NOT EXISTS idx_movie_list_items_list ON movie_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_movie_list_items_movie ON movie_list_items(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_list_items_order ON movie_list_items(list_id, order_index);
CREATE INDEX IF NOT EXISTS idx_list_analyses_list ON list_analyses(list_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_movie_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS trigger_movie_lists_updated_at ON movie_lists;
CREATE TRIGGER trigger_movie_lists_updated_at
    BEFORE UPDATE ON movie_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_movie_lists_updated_at();

-- Add helpful comments
COMMENT ON TABLE movie_lists IS 'Storage for curated movie list metadata';
COMMENT ON COLUMN movie_lists.slug IS 'URL-friendly identifier for the list';
COMMENT ON COLUMN movie_lists.content_type IS 'Type of list: declarative (curated) or educational (Genius)';
COMMENT ON COLUMN movie_lists.claude_prompt IS 'Optional prompt for AI-generated descriptions';
COMMENT ON COLUMN movie_lists.is_active IS 'Whether the list should appear in tag clouds';

COMMENT ON TABLE movie_list_items IS 'Junction table linking movies to lists';
COMMENT ON COLUMN movie_list_items.order_index IS 'Position of movie within the list (1-based)';

COMMENT ON TABLE list_analyses IS 'AI-generated descriptions and analyses for movie lists';
COMMENT ON COLUMN list_analyses.claude_response IS 'Full Claude response as JSONB';