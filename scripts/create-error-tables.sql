-- Error monitoring tables for MovieGenius production monitoring

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  name VARCHAR(255),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  environment VARCHAR(50) NOT NULL,
  deployment_id VARCHAR(255),
  context JSONB,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_agent TEXT,
  url TEXT,
  user_id UUID,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Error alerts table
CREATE TABLE IF NOT EXISTS error_alerts (
  id SERIAL PRIMARY KEY,
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  latest_error TEXT,
  error_count INTEGER NOT NULL,
  environment VARCHAR(50) NOT NULL,
  deployment_id VARCHAR(255),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(255) NOT NULL,
  value NUMERIC NOT NULL,
  threshold NUMERIC,
  endpoint VARCHAR(255),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  environment VARCHAR(50) NOT NULL,
  deployment_id VARCHAR(255),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deployment tracking table
CREATE TABLE IF NOT EXISTS deployments (
  id SERIAL PRIMARY KEY,
  deployment_id VARCHAR(255) NOT NULL UNIQUE,
  environment VARCHAR(50) NOT NULL,
  git_commit VARCHAR(40),
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_by VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  health_check_passed BOOLEAN DEFAULT NULL,
  notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_environment ON error_logs(environment);
CREATE INDEX IF NOT EXISTS idx_error_logs_deployment ON error_logs(deployment_id);

CREATE INDEX IF NOT EXISTS idx_error_alerts_timestamp ON error_alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_alerts_severity ON error_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_error_alerts_acknowledged ON error_alerts(acknowledged);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric ON performance_metrics(metric_name);

CREATE INDEX IF NOT EXISTS idx_deployments_environment ON deployments(environment);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);

-- RLS policies for security (optional, enable if using RLS)
-- ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE error_alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Views for monitoring dashboards
CREATE OR REPLACE VIEW error_summary AS
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  severity,
  environment,
  COUNT(*) as error_count,
  COUNT(DISTINCT message) as unique_errors
FROM error_logs 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

CREATE OR REPLACE VIEW recent_critical_errors AS
SELECT 
  timestamp,
  message,
  deployment_id,
  environment,
  context
FROM error_logs 
WHERE severity = 'critical'
AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;

CREATE OR REPLACE VIEW performance_summary AS
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  metric_name,
  environment,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  COUNT(*) as measurement_count
FROM performance_metrics 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;