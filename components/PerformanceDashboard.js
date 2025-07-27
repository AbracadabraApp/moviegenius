/**
 * Performance Dashboard - Real-time performance metrics display
 * 
 * Shows key performance indicators for movie page render times
 * Only visible in development environment
 */

import { useState, useEffect } from 'react';
import { getPerformanceMonitor } from '../lib/performance-monitor';

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState({});
  const [isVisible, setIsVisible] = useState(false);
  const performanceMonitor = getPerformanceMonitor();
  
  // Only show in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  useEffect(() => {
    if (!isDevelopment) return;
    
    const updateMetrics = () => {
      const report = performanceMonitor.generateReport(60000); // Last minute
      setMetrics(report);
    };
    
    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial load
    
    return () => clearInterval(interval);
  }, [isDevelopment]);
  
  if (!isDevelopment) return null;
  
  const toggleVisibility = () => setIsVisible(!isVisible);
  
  const formatTime = (ms) => ms ? `${Math.round(ms)}ms` : 'N/A';
  const getPerformanceColor = (value, threshold) => {
    if (!value) return '#666';
    return value > threshold ? '#ff4444' : '#44ff44';
  };
  
  return (
    <div style={styles.container}>
      <button 
        onClick={toggleVisibility}
        style={styles.toggleButton}
        title="Performance Dashboard"
      >
        📊 Perf
      </button>
      
      {isVisible && (
        <div style={styles.dashboard}>
          <div style={styles.header}>
            <h3 style={styles.title}>Performance Metrics</h3>
            <button onClick={toggleVisibility} style={styles.closeButton}>×</button>
          </div>
          
          <div style={styles.metricsGrid}>
            {/* Page Load Metrics */}
            <div style={styles.metricGroup}>
              <h4 style={styles.groupTitle}>Page Load</h4>
              <div style={styles.metric}>
                <span>Load Complete:</span>
                <span style={{color: getPerformanceColor(metrics.metrics?.page_load_complete?.average, 2000)}}>
                  {formatTime(metrics.metrics?.page_load_complete?.average)}
                </span>
              </div>
              <div style={styles.metric}>
                <span>Count:</span>
                <span>{metrics.metrics?.page_load_complete?.count || 0}</span>
              </div>
            </div>
            
            {/* Component Metrics */}
            <div style={styles.metricGroup}>
              <h4 style={styles.groupTitle}>Analysis Component</h4>
              <div style={styles.metric}>
                <span>Processing:</span>
                <span style={{color: getPerformanceColor(metrics.metrics?.analysis_component_complete?.average, 500)}}>
                  {formatTime(metrics.metrics?.analysis_component_complete?.average)}
                </span>
              </div>
              <div style={styles.metric}>
                <span>Count:</span>
                <span>{metrics.metrics?.analysis_component_complete?.count || 0}</span>
              </div>
            </div>
            
            {/* MediaCard Metrics */}
            <div style={styles.metricGroup}>
              <h4 style={styles.groupTitle}>MediaCard</h4>
              <div style={styles.metric}>
                <span>Renders:</span>
                <span>{metrics.metrics?.mediacard_render_start?.count || 0}</span>
              </div>
              <div style={styles.metric}>
                <span>Avg Duration:</span>
                <span style={{color: getPerformanceColor(metrics.metrics?.mediacard_render_complete?.average, 100)}}>
                  {formatTime(metrics.metrics?.mediacard_render_complete?.average)}
                </span>
              </div>
            </div>
            
            {/* Summary */}
            <div style={styles.metricGroup}>
              <h4 style={styles.groupTitle}>Summary</h4>
              <div style={styles.metric}>
                <span>Total Metrics:</span>
                <span>{metrics.summary?.totalMetrics || 0}</span>
              </div>
              <div style={styles.metric}>
                <span>Cache Hit Rate:</span>
                <span>{metrics.summary?.cacheHitRate || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          {/* Performance Warnings */}
          {metrics.recommendations && metrics.recommendations.length > 0 && (
            <div style={styles.warnings}>
              <h4 style={styles.warningsTitle}>⚠️ Recommendations</h4>
              {metrics.recommendations.map((rec, index) => (
                <div key={index} style={styles.warning}>{rec}</div>
              ))}
            </div>
          )}
          
          <div style={styles.footer}>
            <small>Updated: {metrics.timestamp ? new Date(metrics.timestamp).toLocaleTimeString() : 'Never'}</small>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: '10px',
    right: '10px',
    zIndex: 9999,
    fontFamily: 'monospace',
  },
  
  toggleButton: {
    background: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'monospace',
    opacity: 0.7,
    transition: 'opacity 0.2s',
  },
  
  dashboard: {
    position: 'absolute',
    top: '100%',
    right: '0',
    marginTop: '5px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '16px',
    minWidth: '320px',
    maxWidth: '400px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    fontSize: '12px',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    borderBottom: '1px solid #eee',
    paddingBottom: '8px',
  },
  
  title: {
    margin: 0,
    fontSize: '14px',
    color: '#333',
  },
  
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '20px',
    height: '20px',
  },
  
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '12px',
  },
  
  metricGroup: {
    background: '#f8f9fa',
    padding: '8px',
    borderRadius: '4px',
  },
  
  groupTitle: {
    margin: '0 0 6px 0',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#555',
    textTransform: 'uppercase',
  },
  
  metric: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '2px',
    fontSize: '11px',
  },
  
  warnings: {
    background: '#fff3cd',
    border: '1px solid #ffd700',
    borderRadius: '4px',
    padding: '8px',
    marginBottom: '8px',
  },
  
  warningsTitle: {
    margin: '0 0 4px 0',
    fontSize: '11px',
    color: '#856404',
  },
  
  warning: {
    fontSize: '10px',
    color: '#856404',
    marginBottom: '2px',
  },
  
  footer: {
    textAlign: 'center',
    color: '#666',
    borderTop: '1px solid #eee',
    paddingTop: '6px',
    fontSize: '10px',
  },
};