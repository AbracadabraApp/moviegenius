/**
 * A/B Test Monitoring and Rollback System
 * 
 * Provides real-time monitoring, error tracking, and emergency rollback
 * capabilities for A/B tests to ensure production safety.
 */

import { isFeatureEnabled, getFeatureMetadata, FLAGS } from './featureFlags';

// Error tracking and metrics
const errorCounts = {};
const renderCounts = {};
const performanceMetrics = {};

// Emergency rollback state
const emergencyRollbacks = {};

/**
 * Configuration for monitoring thresholds
 */
const MONITORING_CONFIG = {
  // Error rate threshold (errors per 100 renders)
  ERROR_RATE_THRESHOLD: 5,
  
  // Performance threshold (ms for component render)
  PERFORMANCE_THRESHOLD: 100,
  
  // Sample size before making rollback decisions
  MIN_SAMPLE_SIZE: 100,
  
  // Time window for error rate calculation (ms)
  TIME_WINDOW: 5 * 60 * 1000, // 5 minutes
  
  // Maximum errors before emergency rollback
  MAX_ERRORS_BEFORE_ROLLBACK: 10
};

/**
 * Tracks successful render of a variant
 * @param {string} testName - Name of the A/B test
 * @param {string} variant - Variant shown ('A' or 'B')
 * @param {number} renderTime - Time taken to render (ms)
 */
export function trackVariantRender(testName, variant, renderTime = 0) {
  const key = `${testName}_${variant}`;
  const timestamp = Date.now();
  
  // Initialize tracking data
  if (!renderCounts[key]) {
    renderCounts[key] = [];
    performanceMetrics[key] = [];
  }
  
  // Record render
  renderCounts[key].push(timestamp);
  if (renderTime > 0) {
    performanceMetrics[key].push({ timestamp, renderTime });
  }
  
  // Clean old data outside time window
  cleanOldData(key, timestamp);
  
  // Check performance threshold
  if (renderTime > MONITORING_CONFIG.PERFORMANCE_THRESHOLD) {
    console.warn(`Slow render detected for ${testName} variant ${variant}: ${renderTime}ms`);
    
    // Track slow render event
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'ab_test_slow_render', {
        event_category: 'A/B Testing Performance',
        event_label: testName,
        variant: variant,
        render_time: renderTime,
        custom_parameter_1: 'performance_warning'
      });
    }
  }
  
  // Analytics tracking
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ab_test_render_success', {
      event_category: 'A/B Testing',
      event_label: testName,
      variant: variant,
      render_time: renderTime
    });
  }
}

/**
 * Tracks error in a variant
 * @param {string} testName - Name of the A/B test
 * @param {string} variant - Variant that errored ('A' or 'B')
 * @param {Error} error - Error that occurred
 * @param {string} errorType - Type of error ('render', 'logic', 'api', etc.)
 */
export function trackVariantError(testName, variant, error, errorType = 'unknown') {
  const key = `${testName}_${variant}`;
  const timestamp = Date.now();
  
  // Initialize error tracking
  if (!errorCounts[key]) {
    errorCounts[key] = [];
  }
  
  // Record error
  const errorRecord = {
    timestamp,
    message: error.message,
    stack: error.stack,
    type: errorType
  };
  
  errorCounts[key].push(errorRecord);
  
  // Clean old data
  cleanOldData(key, timestamp);
  
  // Check for emergency rollback conditions
  checkEmergencyRollback(testName, variant);
  
  // Log error details
  console.error(`A/B Test Error [${testName}/${variant}]:`, {
    error: error.message,
    type: errorType,
    timestamp: new Date(timestamp).toISOString(),
    errorRate: calculateErrorRate(key),
    totalErrors: errorCounts[key].length
  });
  
  // Analytics tracking
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ab_test_error_tracked', {
      event_category: 'A/B Testing Errors',
      event_label: testName,
      variant: variant,
      error_type: errorType,
      error_message: error.message.substring(0, 100), // Truncate for analytics
      custom_parameter_1: calculateErrorRate(key)
    });
  }
}

/**
 * Checks if emergency rollback should be triggered
 * @param {string} testName - Name of the A/B test
 * @param {string} variant - Variant to check
 */
function checkEmergencyRollback(testName, variant) {
  const key = `${testName}_${variant}`;
  const errorRate = calculateErrorRate(key);
  const totalRenders = getTotalRenders(key);
  const totalErrors = errorCounts[key]?.length || 0;
  
  // Only consider rollback if we have enough data
  if (totalRenders < MONITORING_CONFIG.MIN_SAMPLE_SIZE) {
    return;
  }
  
  // Check error rate threshold
  const shouldRollback = 
    errorRate > MONITORING_CONFIG.ERROR_RATE_THRESHOLD ||
    totalErrors > MONITORING_CONFIG.MAX_ERRORS_BEFORE_ROLLBACK;
  
  if (shouldRollback && !emergencyRollbacks[testName]) {
    triggerEmergencyRollback(testName, variant, {
      errorRate,
      totalErrors,
      totalRenders,
      threshold: MONITORING_CONFIG.ERROR_RATE_THRESHOLD
    });
  }
}

/**
 * Triggers emergency rollback for a test
 * @param {string} testName - Name of the A/B test
 * @param {string} variant - Variant that triggered rollback
 * @param {object} metrics - Metrics that triggered the rollback
 */
function triggerEmergencyRollback(testName, variant, metrics) {
  emergencyRollbacks[testName] = {
    timestamp: Date.now(),
    triggeredBy: variant,
    metrics,
    reason: 'automated_error_threshold'
  };
  
  console.error(`🚨 EMERGENCY ROLLBACK TRIGGERED for ${testName}:`, {
    variant,
    metrics,
    timestamp: new Date().toISOString()
  });
  
  // Store in localStorage for persistence across page loads
  if (typeof window !== 'undefined') {
    const rollbacks = JSON.parse(localStorage.getItem('emergency_rollbacks') || '{}');
    rollbacks[testName] = emergencyRollbacks[testName];
    localStorage.setItem('emergency_rollbacks', JSON.stringify(rollbacks));
  }
  
  // Analytics tracking
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'ab_test_emergency_rollback', {
      event_category: 'A/B Testing Critical',
      event_label: testName,
      variant: variant,
      error_rate: metrics.errorRate,
      total_errors: metrics.totalErrors,
      total_renders: metrics.totalRenders,
      custom_parameter_1: 'emergency_rollback_triggered'
    });
  }
  
  // Could also trigger alerts to monitoring systems
  if (typeof window !== 'undefined' && window.fetch) {
    // Example: Send alert to monitoring service
    fetch('/api/alerts/ab-test-rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testName,
        variant,
        metrics,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(err => console.warn('Failed to send rollback alert:', err));
  }
}

/**
 * Checks if a test is under emergency rollback
 * @param {string} testName - Name of the A/B test
 * @returns {boolean} Whether the test is rolled back
 */
export function isTestRolledBack(testName) {
  // Check in-memory state first
  if (emergencyRollbacks[testName]) {
    return true;
  }
  
  // Check persistent storage
  if (typeof window !== 'undefined') {
    const rollbacks = JSON.parse(localStorage.getItem('emergency_rollbacks') || '{}');
    if (rollbacks[testName]) {
      emergencyRollbacks[testName] = rollbacks[testName];
      return true;
    }
  }
  
  return false;
}

/**
 * Manually clear emergency rollback (development/ops use)
 * @param {string} testName - Name of the A/B test
 */
export function clearEmergencyRollback(testName) {
  delete emergencyRollbacks[testName];
  
  if (typeof window !== 'undefined') {
    const rollbacks = JSON.parse(localStorage.getItem('emergency_rollbacks') || '{}');
    delete rollbacks[testName];
    localStorage.setItem('emergency_rollbacks', JSON.stringify(rollbacks));
  }
  
  console.log(`Emergency rollback cleared for ${testName}`);
}

/**
 * Gets monitoring dashboard data for a specific test
 * @param {string} testName - Name of the A/B test
 * @returns {object} Dashboard data
 */
export function getTestMetrics(testName) {
  const variants = ['A', 'B'];
  const metrics = {};
  
  variants.forEach(variant => {
    const key = `${testName}_${variant}`;
    metrics[variant] = {
      renders: getTotalRenders(key),
      errors: errorCounts[key]?.length || 0,
      errorRate: calculateErrorRate(key),
      avgRenderTime: calculateAverageRenderTime(key),
      isHealthy: calculateErrorRate(key) <= MONITORING_CONFIG.ERROR_RATE_THRESHOLD
    };
  });
  
  return {
    testName,
    variants: metrics,
    isRolledBack: isTestRolledBack(testName),
    rollbackInfo: emergencyRollbacks[testName] || null,
    lastUpdated: Date.now()
  };
}

/**
 * Gets dashboard data for all active tests
 * @returns {object} All test metrics
 */
export function getAllTestMetrics() {
  const allTests = ['movie_header_format']; // Add more test names as needed
  return allTests.reduce((acc, testName) => {
    acc[testName] = getTestMetrics(testName);
    return acc;
  }, {});
}

// Helper functions

function cleanOldData(key, currentTimestamp) {
  const cutoff = currentTimestamp - MONITORING_CONFIG.TIME_WINDOW;
  
  // Clean render counts
  if (renderCounts[key]) {
    renderCounts[key] = renderCounts[key].filter(ts => ts > cutoff);
  }
  
  // Clean error counts
  if (errorCounts[key]) {
    errorCounts[key] = errorCounts[key].filter(record => record.timestamp > cutoff);
  }
  
  // Clean performance metrics
  if (performanceMetrics[key]) {
    performanceMetrics[key] = performanceMetrics[key].filter(record => record.timestamp > cutoff);
  }
}

function getTotalRenders(key) {
  return renderCounts[key]?.length || 0;
}

function calculateErrorRate(key) {
  const renders = getTotalRenders(key);
  const errors = errorCounts[key]?.length || 0;
  
  if (renders === 0) return 0;
  return (errors / renders) * 100; // Errors per 100 renders
}

function calculateAverageRenderTime(key) {
  const metrics = performanceMetrics[key] || [];
  if (metrics.length === 0) return 0;
  
  const total = metrics.reduce((sum, metric) => sum + metric.renderTime, 0);
  return total / metrics.length;
}

/**
 * Development helper to simulate test scenarios
 */
export function simulateTestScenario(testName, scenario) {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Test simulation only available in development');
    return;
  }
  
  console.log(`Simulating scenario: ${scenario} for test: ${testName}`);
  
  switch (scenario) {
    case 'high_error_rate':
      // Simulate high error rate
      for (let i = 0; i < 20; i++) {
        trackVariantRender(testName, 'B', 50);
      }
      for (let i = 0; i < 3; i++) {
        trackVariantError(testName, 'B', new Error('Simulated error'), 'render');
      }
      break;
      
    case 'slow_performance':
      // Simulate slow renders
      for (let i = 0; i < 10; i++) {
        trackVariantRender(testName, 'B', 150); // Slow render
      }
      break;
      
    case 'emergency_rollback':
      // Simulate conditions for emergency rollback
      for (let i = 0; i < 100; i++) {
        trackVariantRender(testName, 'B', 50);
      }
      for (let i = 0; i < 15; i++) {
        trackVariantError(testName, 'B', new Error('Critical error'), 'render');
      }
      break;
      
    default:
      console.warn(`Unknown scenario: ${scenario}`);
  }
}