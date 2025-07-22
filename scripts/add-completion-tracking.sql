-- Add completion status tracking to database
-- This provides bulletproof protection against content regeneration waste

-- Add completion flags to movies table
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS has_linked_analysis BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS analysis_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS nuclear_static_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP;

-- Add completion flags to movie_analyses table
ALTER TABLE movie_analyses 
ADD COLUMN IF NOT EXISTS has_links BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS linked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS link_count INTEGER DEFAULT 0;

-- Create index for fast completion queries
CREATE INDEX IF NOT EXISTS idx_movies_completion_status 
ON movies (has_linked_analysis, analysis_completed_at) 
WHERE has_linked_analysis = TRUE;

CREATE INDEX IF NOT EXISTS idx_movie_analyses_completion 
ON movie_analyses (has_links, linked_at) 
WHERE has_links = TRUE;

-- Create completion tracking table for detailed metrics
CREATE TABLE IF NOT EXISTS zero_waste_metrics (
  id SERIAL PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL, -- 'tier1_skip', 'tier2_link_only', 'tier3_fresh'
  content_type VARCHAR(50) NOT NULL,   -- 'movie_analysis', 'nuclear_static', 'episode'
  content_id INTEGER,
  cost_saved DECIMAL(10,4) DEFAULT 0,
  cost_incurred DECIMAL(10,4) DEFAULT 0,
  processing_time_ms INTEGER,
  links_added INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Create index for metrics queries
CREATE INDEX IF NOT EXISTS idx_zero_waste_metrics_operation 
ON zero_waste_metrics (operation_type, content_type, created_at);

-- Function to mark movie analysis as complete with links
CREATE OR REPLACE FUNCTION mark_analysis_complete(
  p_movie_id INTEGER,
  p_link_count INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  -- Update movies table
  UPDATE movies 
  SET 
    has_linked_analysis = TRUE,
    analysis_completed_at = NOW(),
    last_processed_at = NOW()
  WHERE id = p_movie_id;
  
  -- Update movie_analyses table
  UPDATE movie_analyses 
  SET 
    has_links = TRUE,
    linked_at = NOW(),
    link_count = p_link_count
  WHERE movie_id = p_movie_id 
    AND analysis_type = 'page_analysis';
    
  -- Log the completion
  INSERT INTO zero_waste_metrics (
    operation_type, 
    content_type, 
    content_id, 
    links_added,
    metadata
  ) VALUES (
    'mark_complete',
    'movie_analysis', 
    p_movie_id, 
    p_link_count,
    jsonb_build_object(
      'marked_complete_at', NOW(),
      'function', 'mark_analysis_complete'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to record zero-waste operation
CREATE OR REPLACE FUNCTION record_zero_waste_operation(
  p_operation_type VARCHAR(50),
  p_content_type VARCHAR(50),
  p_content_id INTEGER,
  p_cost_saved DECIMAL(10,4) DEFAULT 0,
  p_cost_incurred DECIMAL(10,4) DEFAULT 0,
  p_processing_time_ms INTEGER DEFAULT NULL,
  p_links_added INTEGER DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS INTEGER AS $$
DECLARE
  metric_id INTEGER;
BEGIN
  INSERT INTO zero_waste_metrics (
    operation_type,
    content_type, 
    content_id,
    cost_saved,
    cost_incurred,
    processing_time_ms,
    links_added,
    metadata
  ) VALUES (
    p_operation_type,
    p_content_type,
    p_content_id,
    p_cost_saved,
    p_cost_incurred,
    p_processing_time_ms,
    p_links_added,
    p_metadata
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for zero-waste dashboard
CREATE OR REPLACE VIEW zero_waste_dashboard AS
SELECT 
  operation_type,
  content_type,
  COUNT(*) as operation_count,
  SUM(cost_saved) as total_cost_saved,
  SUM(cost_incurred) as total_cost_incurred,
  SUM(cost_saved - cost_incurred) as net_savings,
  SUM(links_added) as total_links_added,
  AVG(processing_time_ms) as avg_processing_time_ms,
  DATE_TRUNC('day', created_at) as date
FROM zero_waste_metrics 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY operation_type, content_type, DATE_TRUNC('day', created_at)
ORDER BY date DESC, operation_type;

-- Create view for completion status
CREATE OR REPLACE VIEW completion_status AS
SELECT 
  'movie_analysis' as content_type,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE has_linked_analysis = TRUE) as completed_items,
  COUNT(*) FILTER (WHERE has_linked_analysis = FALSE) as pending_items,
  ROUND(
    (COUNT(*) FILTER (WHERE has_linked_analysis = TRUE)::DECIMAL / COUNT(*)) * 100, 
    2
  ) as completion_percentage
FROM movies
WHERE EXISTS (
  SELECT 1 FROM movie_analyses 
  WHERE movie_analyses.movie_id = movies.id 
    AND analysis_type = 'page_analysis'
)

UNION ALL

SELECT 
  'nuclear_static' as content_type,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE nuclear_static_completed_at IS NOT NULL) as completed_items,
  COUNT(*) FILTER (WHERE nuclear_static_completed_at IS NULL) as pending_items,
  ROUND(
    (COUNT(*) FILTER (WHERE nuclear_static_completed_at IS NOT NULL)::DECIMAL / COUNT(*)) * 100,
    2
  ) as completion_percentage
FROM movies
WHERE has_linked_analysis = TRUE;

-- Sample queries for monitoring

-- Check current completion status
-- SELECT * FROM completion_status;

-- View recent zero-waste operations
-- SELECT * FROM zero_waste_dashboard WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- Find movies that need linking (Tier 2)
-- SELECT m.id, m.title, m.year, ma.claude_response->>'raw_content' as content_snippet
-- FROM movies m
-- JOIN movie_analyses ma ON m.id = ma.movie_id 
-- WHERE m.has_linked_analysis = FALSE 
--   AND ma.analysis_type = 'page_analysis'
--   AND ma.claude_response->>'raw_content' IS NOT NULL
-- LIMIT 10;

-- Calculate total savings over time
-- SELECT 
--   DATE_TRUNC('week', created_at) as week,
--   SUM(cost_saved - cost_incurred) as net_savings,
--   COUNT(*) as operations
-- FROM zero_waste_metrics 
-- GROUP BY DATE_TRUNC('week', created_at)
-- ORDER BY week DESC
-- LIMIT 12;

COMMENT ON TABLE zero_waste_metrics IS 'Tracks all zero-waste operations for cost monitoring and optimization';
COMMENT ON FUNCTION mark_analysis_complete IS 'Marks a movie analysis as complete with links - prevents regeneration';
COMMENT ON FUNCTION record_zero_waste_operation IS 'Records zero-waste operation metrics for monitoring dashboard';
COMMENT ON VIEW zero_waste_dashboard IS 'Real-time dashboard showing zero-waste operation metrics';
COMMENT ON VIEW completion_status IS 'Overview of completion status across all content types';