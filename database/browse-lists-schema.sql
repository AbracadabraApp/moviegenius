-- Browse Lists: Polyhierarchical Taxonomy Database Schema
-- Supports 1000+ lists with multi-dimensional facet organization
-- Schema-driven feature development approach

-- Core browse lists table
CREATE TABLE browse_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL UNIQUE, -- Prevent duplicate list concepts
    description TEXT,
    
    -- AI generation metadata
    concept_analysis JSONB, -- Claude's reasoning for this list concept
    ai_confidence DECIMAL(3,2) DEFAULT 0.0 CHECK (ai_confidence >= 0.0 AND ai_confidence <= 1.0),
    generation_prompt_version VARCHAR(10) DEFAULT '1.0',
    
    -- List metrics
    total_movies INTEGER DEFAULT 0,
    avg_relevance_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- User engagement (populated by UI interactions)
    view_count INTEGER DEFAULT 0,
    click_through_rate DECIMAL(3,2) DEFAULT 0.0,
    user_rating DECIMAL(3,2) DEFAULT 0.0,
    
    -- Status and lifecycle
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived', 'merged')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Facets: Multi-dimensional organization (genre, theme, location, time, contributor)  
CREATE TABLE browse_facets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    facet_type VARCHAR(50) NOT NULL CHECK (facet_type IN ('genre', 'theme', 'location', 'time', 'contributor', 'technique', 'mood')),
    
    -- Hierarchical support (e.g., Crime > White Collar Crime)
    parent_facet_id UUID REFERENCES browse_facets(id),
    
    -- UI customization
    display_name VARCHAR(100), -- User-friendly name if different from 'name'
    description TEXT,
    ui_color VARCHAR(7), -- Hex color for UI theming
    ui_icon VARCHAR(50), -- Icon identifier
    display_order INTEGER DEFAULT 0,
    
    -- Analytics for schema-driven features
    list_count INTEGER DEFAULT 0, -- How many lists use this facet
    movie_count INTEGER DEFAULT 0, -- Total movies across all lists in this facet
    engagement_score DECIMAL(5,2) DEFAULT 0.0, -- User interaction strength
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(name, facet_type) -- Same name can exist across different facet types
);

-- Many-to-many: Movies belong to multiple lists
CREATE TABLE list_movies (
    list_id UUID REFERENCES browse_lists(id) ON DELETE CASCADE,
    movie_id UUID REFERENCES movies(id) ON DELETE CASCADE,
    
    -- Semantic relationship strength
    relevance_score DECIMAL(3,2) NOT NULL CHECK (relevance_score >= 0.1 AND relevance_score <= 1.0),
    selection_reason TEXT, -- Claude's explanation for why this movie fits
    
    -- List organization
    display_order INTEGER, -- Position within list (usually by relevance_score DESC)
    is_featured BOOLEAN DEFAULT FALSE, -- Highlight as perfect example of list concept
    is_gateway BOOLEAN DEFAULT FALSE, -- Good entry point for understanding this list
    
    -- Metadata
    added_at TIMESTAMP DEFAULT NOW(),
    added_by_job_id UUID, -- Reference to generation job for tracking
    
    PRIMARY KEY (list_id, movie_id)
);

-- Many-to-many: Lists organized by multiple facets (polyhierarchical)
CREATE TABLE list_facets (
    list_id UUID REFERENCES browse_lists(id) ON DELETE CASCADE,
    facet_id UUID REFERENCES browse_facets(id) ON DELETE CASCADE,
    
    -- Facet relationship strength
    relevance_score DECIMAL(3,2) DEFAULT 1.0 CHECK (relevance_score >= 0.1 AND relevance_score <= 1.0),
    is_primary BOOLEAN DEFAULT FALSE, -- Primary classification facet
    
    -- UI organization
    display_order INTEGER, -- Order within facet
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    PRIMARY KEY (list_id, facet_id)
);

-- Browse list generation jobs (track AI processing batches)
CREATE TABLE browse_list_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('initial_generation', 'incremental', 'consolidation', 'refinement')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Input parameters
    analysis_batch_id VARCHAR(100), -- Reference to source analysis batch
    movie_count INTEGER,
    prompt_version VARCHAR(10),
    
    -- Processing targets
    target_list_count INTEGER,
    facet_focus JSONB, -- Which facet types to emphasize: ['genre', 'theme']
    
    -- Results
    lists_created INTEGER DEFAULT 0,
    lists_updated INTEGER DEFAULT 0,
    movies_assigned INTEGER DEFAULT 0,
    total_cost DECIMAL(8,2) DEFAULT 0.0,
    
    -- Timing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_duration_minutes INTEGER,
    
    -- Error tracking  
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Job metadata
    configuration JSONB, -- Full job parameters for reproducibility
    created_at TIMESTAMP DEFAULT NOW()
);

-- User engagement tracking (enables schema-driven analytics features)
CREATE TABLE browse_list_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID REFERENCES browse_lists(id) ON DELETE CASCADE,
    
    -- Anonymous session tracking
    session_id VARCHAR(100) NOT NULL,
    user_agent_hash VARCHAR(64), -- Hashed for privacy
    
    -- Engagement events
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'click_movie', 'share', 'rate', 'bookmark')),
    event_data JSONB, -- Additional context: clicked movie, rating value, etc.
    
    -- Discovery context (enables semantic pathway analysis)
    referrer_list_id UUID REFERENCES browse_lists(id), -- Came from another list
    referrer_facet_id UUID REFERENCES browse_facets(id), -- Came from facet browsing
    referrer_type VARCHAR(50), -- 'search', 'recommendation', 'direct'
    
    -- Session context
    session_duration_seconds INTEGER,
    device_type VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Consolidated/merged list tracking (for list lifecycle management)
CREATE TABLE browse_list_consolidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('merge', 'split', 'archive')),
    
    -- Source lists (what was changed)
    source_list_ids UUID[] NOT NULL,
    
    -- Result lists (what was created)
    result_list_ids UUID[],
    
    -- Consolidation reasoning
    reason VARCHAR(100), -- 'sparse_lists', 'excessive_overlap', 'concept_refinement'
    consolidation_data JSONB, -- Detailed consolidation parameters and results
    
    -- Job tracking
    job_id UUID REFERENCES browse_list_jobs(id),
    performed_by VARCHAR(50) DEFAULT 'ai_consolidation',
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes for schema-driven features
CREATE INDEX idx_browse_lists_status ON browse_lists(status);
CREATE INDEX idx_browse_lists_engagement ON browse_lists(user_rating DESC, view_count DESC);
CREATE INDEX idx_browse_lists_movies_count ON browse_lists(total_movies DESC);

CREATE INDEX idx_browse_facets_type ON browse_facets(facet_type);
CREATE INDEX idx_browse_facets_engagement ON browse_facets(engagement_score DESC);
CREATE INDEX idx_browse_facets_hierarchy ON browse_facets(parent_facet_id);

CREATE INDEX idx_list_movies_relevance ON list_movies(list_id, relevance_score DESC);
CREATE INDEX idx_list_movies_featured ON list_movies(list_id, is_featured) WHERE is_featured = true;
CREATE INDEX idx_list_movies_gateway ON list_movies(list_id, is_gateway) WHERE is_gateway = true;
CREATE INDEX idx_list_movies_by_movie ON list_movies(movie_id, relevance_score DESC);

CREATE INDEX idx_list_facets_primary ON list_facets(facet_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_list_facets_relevance ON list_facets(facet_id, relevance_score DESC);

CREATE INDEX idx_browse_jobs_status ON browse_list_jobs(status, created_at DESC);
CREATE INDEX idx_browse_jobs_type ON browse_list_jobs(job_type, created_at DESC);

CREATE INDEX idx_engagement_list_events ON browse_list_engagement(list_id, event_type, created_at DESC);
CREATE INDEX idx_engagement_discovery_path ON browse_list_engagement(referrer_list_id, list_id);
CREATE INDEX idx_engagement_session ON browse_list_engagement(session_id, created_at);

-- Triggers for maintaining computed values
CREATE OR REPLACE FUNCTION update_list_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update browse_lists metrics when list_movies changes
    UPDATE browse_lists 
    SET 
        total_movies = (
            SELECT COUNT(*) 
            FROM list_movies 
            WHERE list_id = COALESCE(NEW.list_id, OLD.list_id)
        ),
        avg_relevance_score = (
            SELECT AVG(relevance_score)
            FROM list_movies 
            WHERE list_id = COALESCE(NEW.list_id, OLD.list_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.list_id, OLD.list_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_list_metrics
    AFTER INSERT OR UPDATE OR DELETE ON list_movies
    FOR EACH ROW EXECUTE FUNCTION update_list_metrics();

CREATE OR REPLACE FUNCTION update_facet_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update browse_facets metrics when list_facets changes
    UPDATE browse_facets 
    SET 
        list_count = (
            SELECT COUNT(*) 
            FROM list_facets 
            WHERE facet_id = COALESCE(NEW.facet_id, OLD.facet_id)
        ),
        movie_count = (
            SELECT COUNT(DISTINCT lm.movie_id)
            FROM list_facets lf
            JOIN list_movies lm ON lf.list_id = lm.list_id
            WHERE lf.facet_id = COALESCE(NEW.facet_id, OLD.facet_id)
        )
    WHERE id = COALESCE(NEW.facet_id, OLD.facet_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_facet_metrics
    AFTER INSERT OR UPDATE OR DELETE ON list_facets
    FOR EACH ROW EXECUTE FUNCTION update_facet_metrics();

-- Sample facet data to bootstrap the system
INSERT INTO browse_facets (name, facet_type, ui_color, ui_icon, description) VALUES 
-- Core genre facets
('Horror', 'genre', '#8B0000', 'skull', 'Films designed to frighten, create suspense and unease'),
('Drama', 'genre', '#4A5568', 'drama', 'Character-driven narratives exploring human condition'),
('Comedy', 'genre', '#F6E05E', 'laugh', 'Films primarily intended to amuse and entertain'),
('Thriller', 'genre', '#DC143C', 'zap', 'Suspenseful films with constant danger and excitement'),
('Action', 'genre', '#FF6347', 'zap', 'Fast-paced films with physical stunts and chase sequences'),
('Romance', 'genre', '#FF69B4', 'heart', 'Love stories and romantic relationships'),
('Sci-Fi', 'genre', '#4169E1', 'zap', 'Science fiction and futuristic concepts'),

-- Thematic facets
('Family Secrets', 'theme', '#8B4513', 'eye-off', 'Hidden truths within family structures'),
('White Collar Crime', 'theme', '#1F4E79', 'briefcase', 'Corporate and financial crimes'),
('Identity Crisis', 'theme', '#4B0082', 'user-question', 'Characters questioning their sense of self'),
('Power Corruption', 'theme', '#8B0000', 'crown', 'How power corrupts individuals and institutions'),
('Moral Ambiguity', 'theme', '#696969', 'balance-scale', 'Complex ethical situations without clear right/wrong'),

-- Location facets  
('Italy', 'location', '#00C851', 'map-pin', 'Films set in Italy or exploring Italian culture'),
('New York', 'location', '#007bff', 'city', 'Stories set in New York City'),
('Small Towns', 'location', '#8B4513', 'home', 'Rural and small community settings'),
('Los Angeles', 'location', '#FFD700', 'film', 'Hollywood and LA-based stories'),

-- Time period facets
('1970s', 'time', '#FF8800', 'calendar', 'Films from or depicting the 1970s era'),
('Contemporary', 'time', '#17a2b8', 'smartphone', 'Present-day settings and themes'),
('Victorian Era', 'time', '#6F4E37', 'clock', 'Victorian period pieces and themes'),
('Post-War', 'time', '#8FBC8F', 'history', '1945-1960 post-WWII period'),

-- Contributor facets (can be expanded with actual person data)
('Scorsese Style', 'contributor', '#B22222', 'user', 'Martin Scorsese directed or influenced'),
('Hitchcock Influence', 'contributor', '#2F4F4F', 'eye', 'Alfred Hitchcock style suspense'),

-- Cinematic technique facets
('Non-Linear Narrative', 'technique', '#9370DB', 'shuffle', 'Complex timeline structures'),
('Single Location', 'technique', '#20B2AA', 'home', 'Films confined to one primary location'),
('Ensemble Cast', 'technique', '#DAA520', 'users', 'Large cast with multiple storylines'),

-- Mood facets
('Dark Comedy', 'mood', '#2F2F2F', 'smile', 'Humor derived from serious or taboo subjects'),
('Paranoid Atmosphere', 'mood', '#800000', 'eye', 'Pervasive sense of distrust and surveillance'),
('Nostalgic', 'mood', '#CD853F', 'clock', 'Longing for the past or bygone eras');

-- Create view for easy facet browsing with hierarchy
CREATE VIEW facet_hierarchy AS
WITH RECURSIVE facet_tree AS (
    -- Base case: root facets (no parent)
    SELECT 
        id, name, facet_type, parent_facet_id, 
        name::text as full_path, 0 as level,
        ARRAY[id] as path_ids
    FROM browse_facets 
    WHERE parent_facet_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child facets
    SELECT 
        bf.id, bf.name, bf.facet_type, bf.parent_facet_id,
        (ft.full_path || ' > ' || bf.name)::text as full_path, ft.level + 1,
        ft.path_ids || bf.id
    FROM browse_facets bf
    JOIN facet_tree ft ON bf.parent_facet_id = ft.id
)
SELECT * FROM facet_tree ORDER BY facet_type, level, name;