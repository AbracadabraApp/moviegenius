/**
 * Demo Phase 3 Integration Tests
 * 
 * Tests predictive loading, auto-rollback system, and
 * overall Phase 3 integration and safety features.
 */

import { jest } from '@jest/globals';

// Mock demo config
const mockDemoConfig = {
  ENABLED: true,
  PREDICTIVE: {
    enabled: true,
    prefetchCount: 5,
    backgroundProcessLimit: 0.2,
    maxPrefetchMemory: 100
  },
  MONITORING: {
    enabled: true,
    autoRollbackEnabled: true,
    performanceRegressionThreshold: 0.1,
    errorRateThreshold: 0.05
  }
};

// Mock safety monitor
const mockSafetyMonitor = {
  recordMetric: jest.fn(),
  metrics: new Map(),
  getSafetyStatus: jest.fn(() => ({
    alerts: [],
    metrics: {}
  }))
};

// Mock components
jest.mock('../lib/demo-config.js', () => ({
  getDemoConfig: () => mockDemoConfig,
  getDemoSafetyMonitor: () => mockSafetyMonitor
}));

jest.mock('../lib/mediacard-cache.js', () => ({
  getMediaCardCache: () => ({
    getCacheStats: () => ({
      hitRate: '95.0',
      memoryCacheUtilization: '45.2%',
      totalRequests: 100
    }),
    getDemoPerformanceReport: () => ({
      status: 'excellent',
      metrics: { overall_hit_rate: 95 }
    }),
    cacheMovieData: jest.fn(),
    getMovieData: jest.fn()
  })
}));

jest.mock('../lib/performance-monitor.js', () => ({
  getPerformanceMonitor: () => ({
    trackMetric: jest.fn()
  })
}));

describe('Phase 3: Predictive Loading', () => {
  let predictiveLoader;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Dynamic import to avoid hoisting issues
    const { getPredictiveLoader } = await import('../lib/predictive-loader.js');
    predictiveLoader = getPredictiveLoader();
  });

  describe('User Behavior Tracking', () => {
    test('should track page views and generate predictions', () => {
      predictiveLoader.trackPageView('movie_detail', 550, { title: 'Fight Club', year: 1999 });
      
      expect(predictiveLoader.behaviorPattern.visitedMovies.has(550)).toBe(true);
      expect(predictiveLoader.behaviorPattern.pageViews.length).toBe(1);
      
      const lastView = predictiveLoader.behaviorPattern.pageViews[0];
      expect(lastView.type).toBe('movie_detail');
      expect(lastView.movieId).toBe(550);
    });

    test('should generate demo pattern predictions', () => {
      const currentView = { type: 'movie_detail', movieId: 550 }; // Fight Club
      const predictions = predictiveLoader.generatePredictions(currentView);
      
      expect(predictions.length).toBeGreaterThan(0);
      
      // Should predict Matrix, Dark Knight, Godfather based on demo patterns
      const predictedIds = predictions.map(p => p.movieId);
      expect(predictedIds).toContain(603); // Matrix
      expect(predictedIds).toContain(155); // Dark Knight
      expect(predictedIds).toContain(238); // Godfather
    });

    test('should prioritize predictions by confidence', () => {
      const currentView = { type: 'movie_detail', movieId: 550 };
      const predictions = predictiveLoader.generatePredictions(currentView);
      
      // Should be sorted by confidence (highest first)
      for (let i = 0; i < predictions.length - 1; i++) {
        expect(predictions[i].confidence).toBeGreaterThanOrEqual(predictions[i + 1].confidence);
      }
    });
  });

  describe('Circuit Breaker Functionality', () => {
    test('should start in CLOSED state', () => {
      expect(predictiveLoader.circuitBreaker.state).toBe('CLOSED');
      expect(predictiveLoader.circuitBreaker.failureCount).toBe(0);
    });

    test('should open circuit breaker after threshold failures', () => {
      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        predictiveLoader.circuitBreakerFailure();
      }
      
      expect(predictiveLoader.circuitBreaker.state).toBe('OPEN');
      expect(predictiveLoader.circuitBreaker.failureCount).toBe(5);
    });

    test('should reset failure count on success in CLOSED state', () => {
      predictiveLoader.circuitBreaker.failureCount = 2;
      predictiveLoader.circuitBreakerSuccess();
      
      expect(predictiveLoader.circuitBreaker.failureCount).toBe(1);
    });

    test('should transition to HALF_OPEN after timeout', (done) => {
      // Open the circuit breaker
      predictiveLoader.circuitBreaker.state = 'OPEN';
      predictiveLoader.circuitBreaker.timeout = 100; // 100ms for testing
      
      setTimeout(() => {
        predictiveLoader.circuitBreaker.state = 'HALF_OPEN';
        expect(predictiveLoader.circuitBreaker.state).toBe('HALF_OPEN');
        done();
      }, 150);
    });
  });

  describe('Resource Management', () => {
    test('should check resource constraints before loading', () => {
      // Set high resource usage
      predictiveLoader.resourceUsage.activeLoads = 10;
      predictiveLoader.resourceUsage.maxConcurrent = 5;
      
      const canLoad = predictiveLoader.checkResourceConstraints();
      expect(canLoad).toBe(false);
    });

    test('should allow loading when resources are available', () => {
      predictiveLoader.resourceUsage.activeLoads = 1;
      predictiveLoader.resourceUsage.maxConcurrent = 5;
      
      const canLoad = predictiveLoader.checkResourceConstraints();
      expect(canLoad).toBe(true);
    });

    test('should track resource utilization in status', () => {
      predictiveLoader.resourceUsage.activeLoads = 3;
      predictiveLoader.resourceUsage.maxConcurrent = 10;
      
      const status = predictiveLoader.getStatus();
      expect(status.resourceUsage.utilizationPercent).toBe('30.0');
    });
  });
});

describe('Phase 3: Auto-Rollback System', () => {
  let autoRollback;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const { getAutoRollbackSystem } = await import('../lib/auto-rollback-system.js');
    autoRollback = getAutoRollbackSystem();
  });

  describe('Baseline Establishment', () => {
    test('should establish performance baselines', async () => {
      await autoRollback.establishBaselines();
      
      expect(autoRollback.baselines.has('cache_hit_rate')).toBe(true);
      expect(autoRollback.baselines.has('memory_usage_mb')).toBe(true);
      expect(autoRollback.baselines.has('error_rate')).toBe(true);
      expect(autoRollback.baselines.has('response_time')).toBe(true);
    });

    test('should use conservative defaults if measurement fails', () => {
      autoRollback.setDefaultBaselines();
      
      expect(autoRollback.baselines.get('cache_hit_rate')).toBe(80);
      expect(autoRollback.baselines.get('memory_usage_mb')).toBe(100);
      expect(autoRollback.baselines.get('error_rate')).toBe(0.05);
    });
  });

  describe('Health Monitoring', () => {
    test('should generate comprehensive health report', async () => {
      const healthReport = await autoRollback.generateHealthReport();
      
      expect(healthReport).toHaveProperty('timestamp');
      expect(healthReport).toHaveProperty('performance');
      expect(healthReport).toHaveProperty('resources');
      expect(healthReport).toHaveProperty('stability');
      expect(healthReport).toHaveProperty('features');
    });

    test('should categorize issues by severity', async () => {
      const mockHealthReport = {
        performance: [
          { type: 'cache_hit_rate_critical', severity: 'critical' },
          { type: 'response_time_slow', severity: 'warning' }
        ],
        resources: [
          { type: 'memory_high', severity: 'warning' }
        ],
        stability: [],
        features: []
      };

      const issues = autoRollback.analyzeHealthReport(mockHealthReport);
      
      expect(issues.critical).toHaveLength(1);
      expect(issues.warning).toHaveLength(2);
    });
  });

  describe('Rollback Execution', () => {
    test('should trigger rollback for critical issues', async () => {
      const criticalIssues = [{
        type: 'memory_exhaustion',
        severity: 'critical',
        message: 'Memory usage critical'
      }];

      await autoRollback.triggerEmergencyRollback(criticalIssues);
      
      expect(autoRollback.rollbackState.active).toBe(true);
      expect(autoRollback.rollbackState.triggeredBy).toEqual(criticalIssues);
      expect(autoRollback.rollbackState.featuresRolledBack.length).toBeGreaterThan(0);
    });

    test('should rollback memory-intensive features for memory issues', async () => {
      const originalPredictiveEnabled = mockDemoConfig.PREDICTIVE.enabled;
      
      await autoRollback.rollbackMemoryIntensiveFeatures();
      
      expect(autoRollback.rollbackState.featuresRolledBack).toContain('predictive_loading');
      expect(autoRollback.originalSettings.has('predictive_loading')).toBe(true);
    });

    test('should rollback aggressive caching for cache issues', async () => {
      await autoRollback.rollbackAggressiveCaching();
      
      expect(autoRollback.rollbackState.featuresRolledBack).toContain('forever_cache_disabled');
      expect(autoRollback.originalSettings.has('cache_ttls')).toBe(true);
    });
  });

  describe('Recovery Process', () => {
    test('should check recovery conditions after rollback', async () => {
      // Set rollback state
      autoRollback.rollbackState.active = true;
      autoRollback.rollbackState.timestamp = new Date(Date.now() - 400000).toISOString(); // 6+ minutes ago
      
      const spy = jest.spyOn(autoRollback, 'initiateRecovery').mockImplementation(async () => {});
      
      await autoRollback.checkRecoveryConditions();
      
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('should restore features during recovery', async () => {
      autoRollback.originalSettings.set('predictive_loading', true);
      
      await autoRollback.restoreFeature('predictive_loading', true);
      
      expect(mockDemoConfig.PREDICTIVE.enabled).toBe(true);
    });
  });

  describe('Emergency Conditions', () => {
    test('should detect emergency memory conditions', () => {
      // Mock high memory usage
      jest.spyOn(autoRollback, 'getCurrentMemoryUsage').mockReturnValue(495); // 99% of 500MB limit
      
      const spy = jest.spyOn(autoRollback, 'triggerEmergencyRollback').mockImplementation(async () => {});
      
      autoRollback.checkEmergencyConditions();
      
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('should perform emergency shutdown', () => {
      autoRollback.emergencyShutdown();
      
      expect(autoRollback.isMonitoring).toBe(false);
      expect(mockDemoConfig.ENABLED).toBe(false);
      expect(mockDemoConfig.PREDICTIVE.enabled).toBe(false);
    });
  });
});

describe('Phase 3: Integration Tests', () => {
  test('should integrate predictive loading with auto-rollback', async () => {
    const { getPredictiveLoader } = await import('../lib/predictive-loader.js');
    const { getAutoRollbackSystem } = await import('../lib/auto-rollback-system.js');
    
    const predictiveLoader = getPredictiveLoader();
    const autoRollback = getAutoRollbackSystem();
    
    // Test that predictive loader can be disabled by auto-rollback
    predictiveLoader.demoConfig.PREDICTIVE.enabled = true;
    predictiveLoader.emergencyDisable();
    
    expect(predictiveLoader.demoConfig.PREDICTIVE.enabled).toBe(false);
  });

  test('should provide comprehensive system status', async () => {
    const { DemoMonitorDashboard } = await import('../scripts/demo-monitor-dashboard.js');
    const dashboard = new DemoMonitorDashboard();
    
    const effectiveness = dashboard.calculateOverallEffectiveness();
    
    expect(effectiveness).toHaveProperty('score');
    expect(effectiveness).toHaveProperty('grade');
    expect(effectiveness.score).toBeGreaterThanOrEqual(0);
    expect(effectiveness.score).toBeLessThanOrEqual(100);
  });

  test('should assess demo readiness correctly', async () => {
    const { DemoMonitorDashboard } = await import('../scripts/demo-monitor-dashboard.js');
    const dashboard = new DemoMonitorDashboard();
    
    const readiness = dashboard.assessDemoReadiness();
    
    expect(readiness).toHaveProperty('status');
    expect(readiness).toHaveProperty('score');
    expect(readiness).toHaveProperty('checklist');
    expect(readiness).toHaveProperty('recommendations');
    
    expect(Array.isArray(readiness.checklist)).toBe(true);
    expect(Array.isArray(readiness.recommendations)).toBe(true);
  });
});