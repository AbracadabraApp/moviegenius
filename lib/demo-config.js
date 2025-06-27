/**
 * Demo Mode Configuration and Feature Flags
 * 
 * Centralized configuration for ultra-aggressive demo optimizations
 * with safe rollback capabilities and performance monitoring.
 */

/**
 * Demo mode feature flags
 */
export const DEMO_CONFIG = {
  // Master demo mode toggle
  ENABLED: process.env.DEMO_MODE === 'true',
  
  // Static generation optimizations
  STATIC_GENERATION: {
    enabled: process.env.DEMO_STATIC_GENERATION !== 'false',
    preGenerateAllMovies: process.env.DEMO_PREGENERATE_ALL === 'true',
    preGenerateGeniusPages: process.env.DEMO_PREGENERATE_GENIUS === 'true',
    revalidationInterval: parseInt(process.env.DEMO_REVALIDATE_SECONDS) || 43200, // 12 hours default
    buildTimeout: parseInt(process.env.DEMO_BUILD_TIMEOUT) || 900000 // 15 minutes
  },
  
  // Ultra-aggressive caching
  CACHING: {
    enabled: process.env.DEMO_ULTRA_CACHING !== 'false',
    mediaCardTTL: process.env.DEMO_MEDIACARD_TTL === 'forever' ? 0 : parseInt(process.env.DEMO_MEDIACARD_TTL) || 86400,
    preWarmPopularMovies: process.env.DEMO_PREWARM_POPULAR === 'true',
    maxCacheMemory: parseInt(process.env.DEMO_MAX_CACHE_MB) || 500, // MB
    hitRateThreshold: parseFloat(process.env.DEMO_CACHE_HIT_THRESHOLD) || 0.9
  },
  
  // Predictive loading
  PREDICTIVE: {
    enabled: process.env.DEMO_PREDICTIVE_LOADING === 'true',
    prefetchCount: parseInt(process.env.DEMO_PREFETCH_COUNT) || 5,
    backgroundProcessLimit: parseFloat(process.env.DEMO_BACKGROUND_LIMIT) || 0.2, // 20% of resources
    maxPrefetchMemory: parseInt(process.env.DEMO_PREFETCH_MEMORY_MB) || 100
  },
  
  // Performance monitoring and safety
  MONITORING: {
    enabled: process.env.DEMO_MONITORING !== 'false',
    performanceRegressionThreshold: parseFloat(process.env.DEMO_REGRESSION_THRESHOLD) || 0.1, // 10%
    errorRateThreshold: parseFloat(process.env.DEMO_ERROR_THRESHOLD) || 0.05, // 5%
    memoryUsageThreshold: parseFloat(process.env.DEMO_MEMORY_THRESHOLD) || 0.9, // 90%
    autoRollbackEnabled: process.env.DEMO_AUTO_ROLLBACK !== 'false'
  },
  
  // Demo-specific paths and content
  DEMO_PATHS: {
    popularMovies: [550, 603, 155, 238, 680], // Fight Club, Matrix, Dark Knight, Godfather, Pulp Fiction
    geniusPages: [
      'batman/the-dark-knight',
      'marvel/iron-man',
      'scorsese/goodfellas',
      'nolan/inception'
    ],
    commonQueries: [
      'best noir films',
      'sci-fi movies like blade runner', 
      'martin scorsese classics',
      'superhero origin stories'
    ]
  }
};

/**
 * Environment-based configuration resolver
 */
export function getDemoConfig() {
  const config = { ...DEMO_CONFIG };
  
  // Disable all demo optimizations in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.DEMO_MODE_PRODUCTION) {
    config.ENABLED = false;
    console.log('🔒 Demo mode disabled in production (set DEMO_MODE_PRODUCTION=true to override)');
  }
  
  // Development environment overrides
  if (process.env.NODE_ENV === 'development') {
    config.MONITORING.autoRollbackEnabled = false; // Don't auto-rollback in dev
    config.STATIC_GENERATION.buildTimeout = 300000; // 5 minutes for dev builds
  }
  
  return config;
}

/**
 * Check if specific demo feature is enabled
 */
export function isDemoFeatureEnabled(feature) {
  const config = getDemoConfig();
  
  if (!config.ENABLED) return false;
  
  const featurePath = feature.split('.');
  let current = config;
  
  for (const path of featurePath) {
    if (current[path] === undefined) return false;
    current = current[path];
  }
  
  return current.enabled !== false;
}

/**
 * Get demo-specific configuration value
 */
export function getDemoConfigValue(path, defaultValue = null) {
  const config = getDemoConfig();
  
  const pathArray = path.split('.');
  let current = config;
  
  for (const pathSegment of pathArray) {
    if (current[pathSegment] === undefined) return defaultValue;
    current = current[pathSegment];
  }
  
  return current;
}

/**
 * Demo mode performance safety checks
 */
export class DemoSafetyMonitor {
  constructor() {
    this.config = getDemoConfig();
    this.metrics = new Map();
    this.alerts = [];
  }
  
  /**
   * Record performance metric for safety monitoring
   */
  recordMetric(metric, value) {
    if (!this.config.MONITORING.enabled) return;
    
    const now = Date.now();
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    
    this.metrics.get(metric).push({ value, timestamp: now });
    
    // Keep only last 100 measurements
    const measurements = this.metrics.get(metric);
    if (measurements.length > 100) {
      measurements.splice(0, measurements.length - 100);
    }
    
    this.checkSafetyThresholds(metric, value);
  }
  
  /**
   * Check if performance has regressed beyond safety thresholds
   */
  checkSafetyThresholds(metric, currentValue) {
    const config = this.config.MONITORING;
    const measurements = this.metrics.get(metric) || [];
    
    if (measurements.length < 10) return; // Need baseline
    
    // Calculate baseline average (first 10 measurements)
    const baseline = measurements.slice(0, 10)
      .reduce((sum, m) => sum + m.value, 0) / 10;
    
    // Check for regression
    const regressionThreshold = baseline * (1 + config.performanceRegressionThreshold);
    
    if (currentValue > regressionThreshold) {
      this.triggerAlert('performance_regression', {
        metric,
        baseline,
        current: currentValue,
        regression: ((currentValue - baseline) / baseline * 100).toFixed(1)
      });
    }
  }
  
  /**
   * Trigger safety alert
   */
  triggerAlert(type, data) {
    const alert = {
      type,
      timestamp: new Date().toISOString(),
      data,
      id: `${type}_${Date.now()}`
    };
    
    this.alerts.push(alert);
    console.warn(`🚨 Demo Safety Alert [${type}]:`, data);
    
    // Auto-rollback if enabled and critical
    if (this.config.MONITORING.autoRollbackEnabled && this.shouldAutoRollback(type, data)) {
      this.triggerAutoRollback(alert);
    }
  }
  
  /**
   * Determine if auto-rollback should be triggered
   */
  shouldAutoRollback(type, data) {
    const criticalAlerts = ['performance_regression', 'memory_exhaustion', 'error_rate_spike'];
    
    if (!criticalAlerts.includes(type)) return false;
    
    // Check if regression is severe (>20%)
    if (type === 'performance_regression' && parseFloat(data.regression) > 20) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Trigger automatic rollback to safe configuration
   */
  triggerAutoRollback(alert) {
    console.error('🔄 AUTO-ROLLBACK TRIGGERED:', alert);
    
    // This would disable demo features - in real implementation,
    // this could update environment variables or toggle feature flags
    process.env.DEMO_MODE = 'false';
    process.env.DEMO_ULTRA_CACHING = 'false';
    process.env.DEMO_PREDICTIVE_LOADING = 'false';
    
    console.log('✅ Demo optimizations disabled due to safety alert');
  }
  
  /**
   * Get current safety status
   */
  getSafetyStatus() {
    return {
      enabled: this.config.MONITORING.enabled,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            latest: values[values.length - 1]?.value,
            average: values.reduce((sum, v) => sum + v.value, 0) / values.length
          }
        ])
      )
    };
  }
}

// Singleton instance
let demoSafetyMonitor = null;

export function getDemoSafetyMonitor() {
  if (!demoSafetyMonitor) {
    demoSafetyMonitor = new DemoSafetyMonitor();
  }
  return demoSafetyMonitor;
}

/**
 * Quick demo status check
 */
export function getDemoStatus() {
  const config = getDemoConfig();
  return {
    enabled: config.ENABLED,
    features: {
      staticGeneration: isDemoFeatureEnabled('STATIC_GENERATION'),
      ultraCaching: isDemoFeatureEnabled('CACHING'),
      predictiveLoading: isDemoFeatureEnabled('PREDICTIVE'),
      monitoring: isDemoFeatureEnabled('MONITORING')
    },
    environment: process.env.NODE_ENV,
    safetyMonitoring: config.MONITORING.autoRollbackEnabled
  };
}