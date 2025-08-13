// pages/health-dashboard.js - Production health monitoring dashboard
// Real-time system health, performance metrics, and observability for MovieGenius

import { useState, useEffect } from 'react';
import PhoneFrame from '../components/PhoneFrame';

export default function HealthDashboard() {
  const [healthData, setHealthData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch health data
  const fetchHealthData = async () => {
    try {
      const [healthResponse, historyResponse] = await Promise.all([
        fetch('/api/health?check=full'),
        fetch('/api/health?check=history&limit=20')
      ]);

      if (healthResponse.ok) {
        const healthResult = await healthResponse.json();
        setHealthData(healthResult.health);
      } else {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }

      if (historyResponse.ok) {
        const historyResult = await historyResponse.json();
        setHistory(historyResult.history);
      }

      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch health data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh logic
  useEffect(() => {
    fetchHealthData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Manual refresh
  const handleRefresh = async () => {
    setLoading(true);
    await fetchHealthData();
  };

  if (loading && !healthData) {
    return (
      <PhoneFrame>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>🔍</div>
          <div>Loading health data...</div>
        </div>
      </PhoneFrame>
    );
  }

  if (error && !healthData) {
    return (
      <PhoneFrame>
        <div style={{ padding: '20px', textAlign: 'center', color: '#e74c3c' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>❌</div>
          <div>Error: {error}</div>
          <button onClick={handleRefresh} style={buttonStyle}>
            Retry
          </button>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div style={{ backgroundColor: '#f8f9fa', minHeight: '100%' }}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                MovieGenius Health
              </h1>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {healthData ? new Date(healthData.timestamp).toLocaleTimeString() : 'Loading...'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={handleRefresh} 
                disabled={loading}
                style={{...buttonStyle, padding: '6px 12px', fontSize: '12px'}}
              >
                {loading ? '⟳' : '↻'}
              </button>
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh
              </label>
            </div>
          </div>
        </div>

        {/* Overall Status */}
        {healthData && (
          <div style={statusCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '24px' }}>
                {getHealthIcon(healthData.overall)}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  System Status: {healthData.overall.toUpperCase()}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {healthData.summary.passed}/{healthData.summary.total} checks passed
                  {healthData.summary.critical_failed > 0 && (
                    <span style={{ color: '#e74c3c', marginLeft: '8px' }}>
                      ({healthData.summary.critical_failed} critical failures)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              Duration: {healthData.duration}ms | 
              Deployment: {healthData.deployment?.id || 'local'}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={tabContainerStyle}>
          {['overview', 'checks', 'performance', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              style={{
                ...tabStyle,
                ...(selectedTab === tab ? activeTabStyle : {})
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '16px' }}>
          {selectedTab === 'overview' && healthData && (
            <OverviewTab healthData={healthData} />
          )}
          
          {selectedTab === 'checks' && healthData && (
            <ChecksTab checks={healthData.checks} />
          )}
          
          {selectedTab === 'performance' && healthData && (
            <PerformanceTab healthData={healthData} />
          )}
          
          {selectedTab === 'history' && (
            <HistoryTab history={history} />
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

// Overview Tab Component
function OverviewTab({ healthData }) {
  const criticalChecks = Object.entries(healthData.checks).filter(([_, check]) => check.critical);
  const recentFailures = Object.entries(healthData.checks).filter(([_, check]) => check.status !== 'pass');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Quick Stats */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>Quick Stats</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={statStyle}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#27ae60' }}>
              {healthData.summary.passed}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Passing</div>
          </div>
          <div style={statStyle}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e74c3c' }}>
              {healthData.summary.failed}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Failed</div>
          </div>
        </div>
      </div>

      {/* Critical Systems */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>Critical Systems</h3>
        {criticalChecks.map(([checkId, check]) => (
          <div key={checkId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px' }}>{check.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>{check.duration}ms</span>
              <span>{getStatusIcon(check.status)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Issues */}
      {recentFailures.length > 0 && (
        <div style={{...cardStyle, borderLeft: '4px solid #e74c3c'}}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#e74c3c' }}>
            Issues Detected
          </h3>
          {recentFailures.map(([checkId, check]) => (
            <div key={checkId} style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{check.name}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                {check.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Checks Tab Component
function ChecksTab({ checks }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Object.entries(checks).map(([checkId, check]) => (
        <div key={checkId} style={{
          ...cardStyle,
          borderLeft: `4px solid ${getStatusColor(check.status)}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                {check.name}
                {check.critical && <span style={{ fontSize: '10px', marginLeft: '6px', color: '#e74c3c' }}>CRITICAL</span>}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {check.message}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px' }}>{check.duration}ms</span>
              <span>{getStatusIcon(check.status)}</span>
            </div>
          </div>
          
          {/* Details */}
          {check.details && Object.keys(check.details).length > 0 && (
            <details style={{ fontSize: '11px', marginTop: '8px' }}>
              <summary style={{ cursor: 'pointer', color: '#666' }}>Details</summary>
              <pre style={{ 
                background: '#f8f9fa', 
                padding: '8px', 
                marginTop: '4px', 
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '10px'
              }}>
                {JSON.stringify(check.details, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

// Performance Tab Component
function PerformanceTab({ healthData }) {
  const performanceData = Object.entries(healthData.checks).map(([id, check]) => ({
    id,
    name: check.name,
    duration: check.duration,
    status: check.status,
    critical: check.critical
  })).sort((a, b) => b.duration - a.duration);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>Response Times</h3>
        {performanceData.map((item) => (
          <div key={item.id} style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px' }}>{item.name}</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.duration}ms</span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '4px', 
              backgroundColor: '#eee', 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(100, (item.duration / Math.max(...performanceData.map(p => p.duration))) * 100)}%`,
                height: '100%',
                backgroundColor: item.duration > 2000 ? '#e74c3c' : item.duration > 1000 ? '#f39c12' : '#27ae60',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>Performance Summary</h3>
        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
          <div>Total checks: {healthData.summary.total}</div>
          <div>Average response: {Math.round(performanceData.reduce((sum, item) => sum + item.duration, 0) / performanceData.length)}ms</div>
          <div>Slowest check: {Math.max(...performanceData.map(p => p.duration))}ms</div>
          <div>Total duration: {healthData.duration}ms</div>
        </div>
      </div>
    </div>
  );
}

// History Tab Component
function HistoryTab({ history }) {
  if (!history || history.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
          No health check history available
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {history.map((check, index) => (
        <div key={index} style={{
          ...cardStyle,
          borderLeft: `4px solid ${getHealthColor(check.overall)}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
              {check.overall.toUpperCase()}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {new Date(check.timestamp).toLocaleString()}
            </div>
          </div>
          
          <div style={{ fontSize: '12px', color: '#666' }}>
            {check.summary.passed}/{check.summary.total} checks passed
            {check.summary.critical_failed > 0 && (
              <span style={{ color: '#e74c3c', marginLeft: '8px' }}>
                ({check.summary.critical_failed} critical failures)
              </span>
            )}
          </div>
          
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            Duration: {check.duration}ms
          </div>
        </div>
      ))}
    </div>
  );
}

// Utility functions
function getHealthIcon(status) {
  switch (status) {
    case 'healthy': return '✅';
    case 'degraded': return '⚠️';
    case 'critical': return '❌';
    default: return '❓';
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'pass': return '✅';
    case 'warn': return '⚠️';
    case 'fail': return '❌';
    default: return '❓';
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'pass': return '#27ae60';
    case 'warn': return '#f39c12';
    case 'fail': return '#e74c3c';
    default: return '#95a5a6';
  }
}

function getHealthColor(overall) {
  switch (overall) {
    case 'healthy': return '#27ae60';
    case 'degraded': return '#f39c12';
    case 'critical': return '#e74c3c';
    default: return '#95a5a6';
  }
}

// Styles
const headerStyle = {
  backgroundColor: '#ffffff',
  padding: '16px 20px',
  borderBottom: '1px solid #e0e0e0',
  position: 'sticky',
  top: 0,
  zIndex: 10
};

const statusCardStyle = {
  backgroundColor: '#ffffff',
  padding: '16px 20px',
  borderBottom: '1px solid #e0e0e0'
};

const tabContainerStyle = {
  display: 'flex',
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #e0e0e0',
  overflowX: 'hidden' // Prevent horizontal scroll
};

const tabStyle = {
  padding: '12px 16px',
  border: 'none',
  backgroundColor: 'transparent',
  fontSize: '13px',
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  whiteSpace: 'nowrap'
};

const activeTabStyle = {
  borderBottomColor: '#007bff',
  color: '#007bff',
  fontWeight: 'bold'
};

const cardStyle = {
  backgroundColor: '#ffffff',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid #e0e0e0'
};

const statStyle = {
  textAlign: 'center',
  padding: '12px',
  backgroundColor: '#f8f9fa',
  borderRadius: '6px'
};

const buttonStyle = {
  padding: '8px 16px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  backgroundColor: '#ffffff',
  cursor: 'pointer',
  fontSize: '13px'
};