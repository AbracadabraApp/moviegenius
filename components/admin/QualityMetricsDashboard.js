// components/admin/QualityMetricsDashboard.js
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export default function QualityMetricsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/quality-metrics?period=${period}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch quality metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (direction) => {
    switch (direction) {
      case 'improving':
        return <TrendingUp size={16} style={{ color: '#10b981' }} />;
      case 'declining':
        return <TrendingDown size={16} style={{ color: '#ef4444' }} />;
      default:
        return <Minus size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASSED':
        return '#10b981';
      case 'WARNING':
        return '#f59e0b';
      case 'FAILED':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} style={{ color: '#10b981' }} />;
      case 'warning':
        return <AlertTriangle size={16} style={{ color: '#f59e0b' }} />;
      case 'error':
        return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
      default:
        return <AlertCircle size={16} style={{ color: '#6b7280' }} />;
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading quality metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Error: {error}</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={styles.container}>
        <div style={styles.noData}>No metrics data available</div>
      </div>
    );
  }

  const { aggregated, summary, trends } = metrics;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Analysis Quality Metrics</h2>
        <div style={styles.periodSelector}>
          {['1d', '7d', '30d', '90d'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                ...styles.periodButton,
                ...(period === p ? styles.periodButtonActive : {})
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Analyses</div>
          <div style={styles.summaryValue}>{aggregated.totalAnalyses.toLocaleString()}</div>
        </div>
        
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Average Score</div>
          <div style={styles.summaryValue}>
            {aggregated.averageScore}/100
            <div style={styles.trendIndicator}>
              {getTrendIcon(summary.recentTrend.direction)}
              <span style={styles.trendText}>
                {summary.recentTrend.change > 0 ? '+' : ''}{summary.recentTrend.change}
              </span>
            </div>
          </div>
        </div>
        
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Pass Rate</div>
          <div style={styles.summaryValue}>{summary.passRate}%</div>
        </div>
        
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Median Score</div>
          <div style={styles.summaryValue}>{aggregated.medianScore}/100</div>
        </div>
      </div>

      {/* Quality Distribution */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Quality Distribution</h3>
        <div style={styles.distributionGrid}>
          {Object.entries(aggregated.qualityDistribution).map(([status, count]) => (
            <div key={status} style={styles.distributionItem}>
              <div 
                style={{
                  ...styles.distributionBar,
                  width: `${(count / aggregated.totalAnalyses) * 100}%`,
                  backgroundColor: getStatusColor(status)
                }}
              />
              <div style={styles.distributionLabel}>
                <span style={styles.distributionStatus}>{status}</span>
                <span style={styles.distributionCount}>{count} ({Math.round((count / aggregated.totalAnalyses) * 100)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Scores */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Category Averages</h3>
        <div style={styles.categoryGrid}>
          {Object.entries(aggregated.categoryAverages).map(([category, score]) => {
            const maxScore = category === 'content' ? 35 : category === 'structure' || category === 'formatting' ? 25 : 15;
            const percentage = (score / maxScore) * 100;
            
            return (
              <div key={category} style={styles.categoryItem}>
                <div style={styles.categoryHeader}>
                  <span style={styles.categoryName}>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                  <span style={styles.categoryScore}>{Math.round(score * 10) / 10}/{maxScore}</span>
                </div>
                <div style={styles.categoryBarContainer}>
                  <div 
                    style={{
                      ...styles.categoryBar,
                      width: `${percentage}%`,
                      backgroundColor: percentage >= 80 ? '#10b981' : percentage >= 60 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Quality Indicators */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Content Quality</h3>
        <div style={styles.contentGrid}>
          <div style={styles.contentMetric}>
            <div style={styles.contentLabel}>Avg Word Count</div>
            <div style={styles.contentValue}>{Math.round(aggregated.contentMetrics.averageWordCount)}</div>
            <div style={styles.contentTarget}>Target: 800-1000</div>
          </div>
          
          <div style={styles.contentMetric}>
            <div style={styles.contentLabel}>Avg Film References</div>
            <div style={styles.contentValue}>{Math.round(aggregated.contentMetrics.averageFilmReferences * 10) / 10}</div>
            <div style={styles.contentTarget}>Target: 5+</div>
          </div>
          
          <div style={styles.contentMetric}>
            <div style={styles.contentLabel}>Technical Depth</div>
            <div style={styles.contentValue}>{Math.round(aggregated.contentMetrics.technicalDepthPercentage)}%</div>
            <div style={styles.contentTarget}>Target: 90%+</div>
          </div>
          
          <div style={styles.contentMetric}>
            <div style={styles.contentLabel}>Cultural Impact</div>
            <div style={styles.contentValue}>{Math.round(aggregated.contentMetrics.culturalImpactPercentage)}%</div>
            <div style={styles.contentTarget}>Target: 90%+</div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Key Insights</h3>
        <div style={styles.insightsList}>
          {aggregated.insights.slice(0, 5).map((insight, index) => (
            <div key={index} style={styles.insightItem}>
              <div style={styles.insightIcon}>
                {getInsightIcon(insight.type)}
              </div>
              <div style={styles.insightContent}>
                <div style={styles.insightMessage}>{insight.message}</div>
                {insight.recommendation && (
                  <div style={styles.insightRecommendation}>{insight.recommendation}</div>
                )}
              </div>
              <div style={{
                ...styles.insightPriority,
                color: insight.priority === 'high' ? '#ef4444' : insight.priority === 'medium' ? '#f59e0b' : '#6b7280'
              }}>
                {insight.priority}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Performance</h3>
        <div style={styles.performanceGrid}>
          <div style={styles.performanceMetric}>
            <div style={styles.performanceLabel}>Avg Cost</div>
            <div style={styles.performanceValue}>
              ${(aggregated.performanceMetrics.averageCost || 0).toFixed(4)}
            </div>
          </div>
          
          <div style={styles.performanceMetric}>
            <div style={styles.performanceLabel}>Avg Generation Time</div>
            <div style={styles.performanceValue}>
              {(aggregated.performanceMetrics.averageGenerationTime || 0).toFixed(1)}s
            </div>
          </div>
          
          <div style={styles.performanceMetric}>
            <div style={styles.performanceLabel}>Voice Consistency</div>
            <div style={styles.performanceValue}>
              {Math.round(aggregated.voiceMetrics.cleanVoicePercentage)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f9fafb',
    minHeight: '100vh',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  
  periodSelector: {
    display: 'flex',
    gap: '8px',
  },
  
  periodButton: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  
  periodButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderColor: '#3b82f6',
  },
  
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  
  summaryCard: {
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  
  summaryLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  
  summaryValue: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  trendIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '14px',
  },
  
  trendText: {
    fontSize: '14px',
    fontWeight: '500',
  },
  
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '24px',
  },
  
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
    margin: '0 0 16px 0',
  },
  
  distributionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  
  distributionItem: {
    position: 'relative',
  },
  
  distributionBar: {
    height: '24px',
    borderRadius: '4px',
    marginBottom: '4px',
  },
  
  distributionLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  
  distributionStatus: {
    fontWeight: '500',
    color: '#111827',
  },
  
  distributionCount: {
    color: '#6b7280',
  },
  
  categoryGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  
  categoryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  categoryName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#111827',
  },
  
  categoryScore: {
    fontSize: '14px',
    color: '#6b7280',
  },
  
  categoryBarContainer: {
    height: '8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  
  categoryBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  
  contentMetric: {
    textAlign: 'center',
  },
  
  contentLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  
  contentValue: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px',
  },
  
  contentTarget: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  
  insightsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  
  insightItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  
  insightIcon: {
    marginTop: '2px',
  },
  
  insightContent: {
    flex: 1,
  },
  
  insightMessage: {
    fontSize: '14px',
    color: '#111827',
    marginBottom: '4px',
  },
  
  insightRecommendation: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  
  insightPriority: {
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  
  performanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
  },
  
  performanceMetric: {
    textAlign: 'center',
  },
  
  performanceLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  
  performanceValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
  },
  
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: '#6b7280',
    fontSize: '16px',
  },
  
  error: {
    textAlign: 'center',
    padding: '48px',
    color: '#ef4444',
    fontSize: '16px',
  },
  
  noData: {
    textAlign: 'center',
    padding: '48px',
    color: '#6b7280',
    fontSize: '16px',
  },
};