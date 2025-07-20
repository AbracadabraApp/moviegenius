/**
 * Nuclear Dashboard - Monitor nuclear static generation progress
 *
 * Shows:
 * - Overall progress (completed vs pending)
 * - Cost tracking
 * - Recent activity
 * - Next steps
 */

import { useState, useEffect } from 'react';
import PhoneFrame from '../components/PhoneFrame';

export default function NuclearDashboard() {
  const [status, setStatus] = useState(null);
  const [autonomousStatus, setAutonomousStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    fetchStatus();
    fetchAutonomousStatus();

    // Auto-refresh every 30 seconds (disabled when system is stopped)
    // const interval = setInterval(() => {
    //   fetchStatus();
    //   fetchAutonomousStatus();
    // }, 30000);

    // return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      if (!status) setLoading(true);
      const response = await fetch('/api/nuclear-status');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setStatus(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (error) {
      console.error('Failed to fetch nuclear status:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutonomousStatus = async () => {
    try {
      const response = await fetch('/api/nuclear-autonomous');

      if (response.ok) {
        const data = await response.json();
        setAutonomousStatus(data);
      }
    } catch (error) {
      console.warn('Failed to fetch autonomous status:', error);
      // Don't set error - autonomous system is optional
    }
  };

  const controlAutonomousSystem = async action => {
    try {
      const response = await fetch('/api/nuclear-autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        setAutonomousStatus(data);
        // Refresh main status too
        setTimeout(() => fetchStatus(), 1000);
      } else {
        const error = await response.json();
        alert(`Failed to ${action} system: ${error.error}`);
      }
    } catch (error) {
      alert(`Failed to ${action} system: ${error.message}`);
    }
  };

  if (loading && !status) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <div>Loading nuclear status...</div>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  if (error) {
    return (
      <PhoneFrame>
        <div style={styles.container}>
          <div style={styles.error}>
            <h2>Error Loading Status</h2>
            <p>{error}</p>
            <button onClick={fetchStatus} style={styles.retryButton}>
              Retry
            </button>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const { database_overview, recent_activity, processed_movies, pending_movies, next_actions } =
    status;

  return (
    <PhoneFrame>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🚀 Nuclear Dashboard</h1>
          <div style={styles.refreshInfo}>
            Last updated: {lastRefresh?.toLocaleTimeString()}
            <button onClick={fetchStatus} style={styles.refreshButton} disabled={loading}>
              {loading ? '⟳' : '🔄'}
            </button>
          </div>
        </div>

        {/* Autonomous System Status */}
        {autonomousStatus && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🤖 Autonomous Nuclear System</h2>
            <div style={styles.autonomousHeader}>
              <div style={styles.systemStatus}>
                Status:{' '}
                <span
                  style={{
                    color: autonomousStatus.running ? '#10b981' : '#ef4444',
                    fontWeight: 'bold',
                  }}
                >
                  {autonomousStatus.running ? '🟢 Running' : '🔴 Stopped'}
                </span>
                {autonomousStatus.pausedUntil && (
                  <span style={{ color: '#f59e0b', marginLeft: '8px' }}>
                    (Paused until {new Date(autonomousStatus.pausedUntil).toLocaleTimeString()})
                  </span>
                )}
              </div>
              <div style={styles.systemControls}>
                <button
                  onClick={() =>
                    controlAutonomousSystem(autonomousStatus.running ? 'stop' : 'start')
                  }
                  style={{
                    ...styles.controlButton,
                    backgroundColor: autonomousStatus.running ? '#ef4444' : '#10b981',
                  }}
                >
                  {autonomousStatus.running ? 'Stop' : 'Start'}
                </button>
                <button
                  onClick={() => controlAutonomousSystem('restart')}
                  style={styles.controlButton}
                >
                  Restart
                </button>
              </div>
            </div>

            {autonomousStatus.stats && (
              <div style={styles.autonomousStats}>
                <div style={styles.statItem}>
                  <span>Processed:</span> <strong>{autonomousStatus.stats.processed}</strong>
                </div>
                <div style={styles.statItem}>
                  <span>Failed:</span> <strong>{autonomousStatus.stats.failed}</strong>
                </div>
                <div style={styles.statItem}>
                  <span>Success Rate:</span>{' '}
                  <strong>{(autonomousStatus.stats.successRate * 100).toFixed(1)}%</strong>
                </div>
                <div style={styles.statItem}>
                  <span>Total Cost:</span>{' '}
                  <strong>${autonomousStatus.stats.cost.toFixed(4)}</strong>
                </div>
                {autonomousStatus.stats.startTime && (
                  <div style={styles.statItem}>
                    <span>Uptime:</span>{' '}
                    <strong>{Math.round(autonomousStatus.uptime / 1000 / 60)}m</strong>
                  </div>
                )}
              </div>
            )}

            {autonomousStatus.currentBatch && (
              <div style={styles.currentBatch}>
                <strong>🔄 Processing Batch:</strong> {autonomousStatus.currentBatch.movieCount}{' '}
                movies (started{' '}
                {new Date(autonomousStatus.currentBatch.startTime).toLocaleTimeString()})
              </div>
            )}
          </div>
        )}

        {/* Recent Activity */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Recent Activity (24h)</h2>
          <div style={styles.activityGrid}>
            <div style={styles.activityItem}>
              <span style={styles.activityLabel}>New Analyses:</span>
              <span style={styles.activityValue}>{recent_activity.analyses_last_24h}</span>
            </div>
            <div style={styles.activityItem}>
              <span style={styles.activityLabel}>Cost (24h):</span>
              <span style={styles.activityValue}>${recent_activity.cost_last_24h.toFixed(4)}</span>
            </div>
            <div style={styles.activityItem}>
              <span style={styles.activityLabel}>Latest:</span>
              <span style={styles.activityValue}>
                {recent_activity.latest_analysis
                  ? new Date(recent_activity.latest_analysis).toLocaleString()
                  : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Next Actions */}
        {next_actions.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Recommended Actions</h2>
            {next_actions.map((action, index) => (
              <div key={index} style={styles.actionCard}>
                <div style={styles.actionHeader}>
                  <span style={styles.actionTitle}>{action.description}</span>
                  <span
                    style={{
                      ...styles.actionPriority,
                      color:
                        action.priority === 'high'
                          ? '#ef4444'
                          : action.priority === 'medium'
                            ? '#f59e0b'
                            : '#6b7280',
                    }}
                  >
                    {action.priority}
                  </span>
                </div>
                <div style={styles.actionDetails}>
                  <div>Cost: {action.estimated_cost}</div>
                  <code style={styles.actionCommand}>{action.command}</code>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recently Processed Movies */}
        {processed_movies.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Recently Processed Movies</h2>
            <div style={styles.movieList}>
              {processed_movies.slice(0, 10).map(movie => (
                <div key={movie.id} style={styles.movieItem}>
                  <div style={styles.movieRank}>#{movie.rank}</div>
                  <div style={styles.movieInfo}>
                    <div style={styles.movieTitle}>
                      {movie.title} ({movie.year})
                    </div>
                    <div style={styles.movieMeta}>
                      Cost: ${movie.cost.toFixed(4)} • Tokens: {movie.tokens.toLocaleString()} •
                      {movie.is_batch ? ' Batch' : ' Individual'}
                    </div>
                  </div>
                  <div style={styles.movieStatus}>✅</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Movies */}
        {pending_movies.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Next Movies to Process</h2>
            <div style={styles.movieList}>
              {pending_movies.slice(0, 10).map(movie => (
                <div key={movie.id} style={styles.movieItem}>
                  <div style={styles.movieRank}>#{movie.rank}</div>
                  <div style={styles.movieInfo}>
                    <div style={styles.movieTitle}>
                      {movie.title} ({movie.year})
                    </div>
                    <div style={styles.movieMeta}>TMDB ID: {movie.tmdb_id}</div>
                  </div>
                  <div style={styles.movieStatus}>⏳</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Overview */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Database Overview</h2>
          <div style={styles.dbStats}>
            <div>Total Movies: {database_overview.total_movies?.toLocaleString()}</div>
            <div>With Analysis: {database_overview.total_with_analysis?.toLocaleString()}</div>
            <div>Coverage: {database_overview.analysis_coverage_percentage}%</div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

const styles = {
  container: {
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
  },
  refreshInfo: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  refreshButton: {
    background: 'none',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 16px 0',
  },
  progressContainer: {
    marginBottom: '20px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  statCard: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  activityGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  activityLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  activityValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937',
  },
  actionCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '8px',
  },
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  actionTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937',
  },
  actionPriority: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionDetails: {
    fontSize: '12px',
    color: '#6b7280',
  },
  actionCommand: {
    backgroundColor: '#f3f4f6',
    padding: '2px 4px',
    borderRadius: '3px',
    fontSize: '11px',
    marginTop: '4px',
    display: 'block',
  },
  movieList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  movieItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    gap: '12px',
  },
  movieRank: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#6b7280',
    minWidth: '30px',
  },
  movieInfo: {
    flex: 1,
  },
  movieTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937',
  },
  movieMeta: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
  },
  movieStatus: {
    fontSize: '16px',
  },
  dbStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
    color: '#6b7280',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    gap: '16px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#dc2626',
  },
  retryButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '16px',
  },
  autonomousHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  systemStatus: {
    fontSize: '14px',
    color: '#374151',
  },
  systemControls: {
    display: 'flex',
    gap: '8px',
  },
  controlButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  autonomousStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  statItem: {
    fontSize: '14px',
    color: '#6b7280',
    display: 'flex',
    justifyContent: 'space-between',
  },
  currentBatch: {
    backgroundColor: '#f3f4f6',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#374151',
    border: '1px solid #e5e7eb',
  },
};
