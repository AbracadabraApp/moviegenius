-- Analysis Quality Metrics Table
-- Tracks detailed quality metrics for all movie analyses

CREATE TABLE IF NOT EXISTS analysis_quality_metrics (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Overall quality scores
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  validation_status TEXT NOT NULL CHECK (validation_status IN ('PASSED', 'WARNING', 'FAILED')),
  
  -- Category scores (out of max points per category)
  structure_score INTEGER DEFAULT 0 CHECK (structure_score >= 0 AND structure_score <= 25),
  content_score INTEGER DEFAULT 0 CHECK (content_score >= 0 AND content_score <= 35),
  formatting_score INTEGER DEFAULT 0 CHECK (formatting_score >= 0 AND formatting_score <= 25),
  voice_score INTEGER DEFAULT 0 CHECK (voice_score >= 0 AND voice_score <= 15),
  
  -- Content quality indicators
  word_count INTEGER DEFAULT 0,
  film_references INTEGER DEFAULT 0,
  decade_coverage INTEGER DEFAULT 0,
  technical_depth BOOLEAN DEFAULT FALSE,
  cultural_impact BOOLEAN DEFAULT FALSE,
  
  -- Structure metrics
  paragraph_count INTEGER DEFAULT 0,
  movie_count INTEGER DEFAULT 0,
  explore_topic_count INTEGER DEFAULT 0,
  subhead_count INTEGER DEFAULT 0,
  
  -- Voice consistency metrics
  generic_phrase_count INTEGER DEFAULT 0,
  banned_phrases JSONB DEFAULT '[]'::jsonb,
  direct_opening BOOLEAN DEFAULT FALSE,
  
  -- Quality feedback counts
  warning_count INTEGER DEFAULT 0,
  strength_count INTEGER DEFAULT 0,
  recommendation_count INTEGER DEFAULT 0,
  
  -- Generation metadata
  model_used TEXT DEFAULT 'unknown',
  cost_estimate DECIMAL(10, 6) DEFAULT 0.00,
  generation_time DECIMAL(8, 3) DEFAULT 0.00, -- seconds
  context_type TEXT DEFAULT 'MOVIE_ANALYSIS',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analysis_quality_metrics_movie_id ON analysis_quality_metrics(movie_id);
CREATE INDEX IF NOT EXISTS idx_analysis_quality_metrics_recorded_at ON analysis_quality_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_quality_metrics_validation_status ON analysis_quality_metrics(validation_status);
CREATE INDEX IF NOT EXISTS idx_analysis_quality_metrics_overall_score ON analysis_quality_metrics(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_quality_metrics_context_type ON analysis_quality_metrics(context_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analysis_quality_metrics_date_status ON analysis_quality_metrics(recorded_at DESC, validation_status);
CREATE INDEX IF NOT EXISTS idx_analysis_quality_metrics_movie_date ON analysis_quality_metrics(movie_id, recorded_at DESC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_analysis_quality_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_analysis_quality_metrics_updated_at
  BEFORE UPDATE ON analysis_quality_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_analysis_quality_metrics_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON analysis_quality_metrics TO authenticated;
GRANT USAGE ON SEQUENCE analysis_quality_metrics_id_seq TO authenticated;

-- Optional: Create a view for easy quality monitoring
CREATE OR REPLACE VIEW quality_metrics_summary AS
SELECT 
  DATE(recorded_at) as analysis_date,
  COUNT(*) as total_analyses,
  AVG(overall_score) as avg_score,
  COUNT(*) FILTER (WHERE validation_status = 'PASSED') as passed_count,
  COUNT(*) FILTER (WHERE validation_status = 'WARNING') as warning_count,
  COUNT(*) FILTER (WHERE validation_status = 'FAILED') as failed_count,
  AVG(word_count) as avg_word_count,
  AVG(film_references) as avg_film_references,
  AVG(decade_coverage) as avg_decade_coverage,
  COUNT(*) FILTER (WHERE technical_depth = true) as technical_depth_count,
  COUNT(*) FILTER (WHERE cultural_impact = true) as cultural_impact_count,
  AVG(generic_phrase_count) as avg_generic_phrases,
  AVG(cost_estimate) as avg_cost,
  AVG(generation_time) as avg_generation_time
FROM analysis_quality_metrics
GROUP BY DATE(recorded_at)
ORDER BY analysis_date DESC;

GRANT SELECT ON quality_metrics_summary TO authenticated;

COMMENT ON TABLE analysis_quality_metrics IS 'Tracks detailed quality metrics and validation results for all movie analyses';
COMMENT ON VIEW quality_metrics_summary IS 'Daily aggregated quality metrics for monitoring dashboard';