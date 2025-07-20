/**
 * Automated Rollback System
 *
 * Comprehensive safety system that monitors demo optimizations and
 * automatically rolls back problematic features when performance
 * degrades or system stability is compromised.
 */

import { getDemoConfig, getDemoSafetyMonitor } from './demo-config.js';
import { getMediaCardCache } from './mediacard-cache.js';
import { getPredictiveLoader } from './predictive-loader.js';
import { getPerformanceMonitor } from './performance-monitor.js';

/**
 * Automated Rollback Manager
 *
 * Monitors system health and automatically disables demo features
 * when safety thresholds are exceeded.
 */
class AutoRollbackSystem {
  constructor() {
    this.demoConfig = getDemoConfig();
    this.safetyMonitor = getDemoSafetyMonitor();
    this.mediaCardCache = getMediaCardCache();
    this.predictiveLoader = getPredictiveLoader();
    this.monitor = getPerformanceMonitor();

    // Rollback state tracking
    this.rollbackState = {
      active: false,
      triggeredBy: null,
      timestamp: null,
      featuresRolledBack: [],
      originalSettings: new Map(),
    };

    // Safety thresholds (more aggressive than demo config)
    this.criticalThresholds = {
      // Performance thresholds
      responseTimeDegradation: 0.5, // 50% slower than baseline
      errorRateSpike: 0.1, // 10% error rate
      cacheHitRateDrop: 0.6, // Below 60% hit rate

      // Resource thresholds
      memoryUsagePercent: 0.95, // 95% memory usage
      cpuUsagePercent: 0.9, // 90% CPU usage
      activeConnectionsLimit: 1000,

      // System stability thresholds
      consecutiveErrors: 5,
      failureRateIncrease: 0.3, // 30% increase in failures
      circuitBreakerTrips: 3, // Multiple circuit breaker activations
    };

    // Monitoring intervals
    this.monitoringInterval = null;
    this.healthCheckInterval = 30000; // 30 seconds
    this.emergencyCheckInterval = 5000; // 5 seconds in emergency mode

    // Baseline performance data
    this.baselines = new Map();
    this.isMonitoring = false;

    console.log('🛡️ Auto-rollback system initialized');

    if (this.demoConfig.MONITORING.autoRollbackEnabled) {
      this.startMonitoring();
    }
  }

  /**
   * Start continuous safety monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    console.log('🛡️ Starting automated safety monitoring');
    this.isMonitoring = true;

    // Establish performance baselines
    this.establishBaselines();

    // Start health check cycle
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);

    // Monitor for emergency conditions more frequently
    setInterval(() => {
      this.checkEmergencyConditions();
    }, this.emergencyCheckInterval);
  }

  /**
   * Stop safety monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    console.log('🛡️ Stopping automated safety monitoring');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Establish performance baselines for comparison
   */
  async establishBaselines() {
    console.log('📊 Establishing performance baselines...');

    try {
      // MediaCard cache baseline
      const cacheStats = this.mediaCardCache.getCacheStats();
      this.baselines.set('cache_response_time', 50); // 50ms baseline
      this.baselines.set('cache_hit_rate', Math.max(80, parseFloat(cacheStats.hitRate))); // Current or 80%

      // Memory usage baseline
      this.baselines.set('memory_usage_mb', this.getCurrentMemoryUsage());

      // Error rate baseline (should be near zero)
      this.baselines.set('error_rate', 0.01); // 1% baseline

      // Response time baseline (from recent metrics)
      const recentResponseTimes = this.getRecentMetrics('page_load_time', 300000); // 5 minutes
      if (recentResponseTimes.length > 0) {
        const avgResponseTime =
          recentResponseTimes.reduce((sum, t) => sum + t.value, 0) / recentResponseTimes.length;
        this.baselines.set('response_time', avgResponseTime);
      } else {
        this.baselines.set('response_time', 1000); // 1 second default
      }

      console.log('✅ Baselines established:', Object.fromEntries(this.baselines));
    } catch (error) {
      console.error('❌ Failed to establish baselines:', error);
      this.setDefaultBaselines();
    }
  }

  /**
   * Set conservative default baselines if measurement fails
   */
  setDefaultBaselines() {
    this.baselines.set('cache_response_time', 100);
    this.baselines.set('cache_hit_rate', 80);
    this.baselines.set('memory_usage_mb', 100);
    this.baselines.set('error_rate', 0.05);
    this.baselines.set('response_time', 2000);

    console.log('⚠️ Using default baselines due to measurement failure');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    if (this.rollbackState.active) {
      return this.checkRecoveryConditions();
    }

    try {
      const healthReport = await this.generateHealthReport();
      const issues = this.analyzeHealthReport(healthReport);

      if (issues.critical.length > 0) {
        await this.triggerEmergencyRollback(issues.critical);
      } else if (issues.warning.length > 0) {
        this.handleWarningConditions(issues.warning);
      }

      // Track health check completion
      this.safetyMonitor.recordMetric('auto_rollback_health_check', Date.now(), {
        critical_issues: issues.critical.length,
        warning_issues: issues.warning.length,
        system_status:
          issues.critical.length > 0
            ? 'critical'
            : issues.warning.length > 0
              ? 'warning'
              : 'healthy',
      });
    } catch (error) {
      console.error('🛡️ Health check failed:', error);
      this.safetyMonitor.recordMetric('auto_rollback_health_check_error', 1);
    }
  }

  /**
   * Generate comprehensive health report
   */
  async generateHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      performance: await this.checkPerformanceHealth(),
      resources: await this.checkResourceHealth(),
      stability: await this.checkSystemStability(),
      features: await this.checkFeatureHealth(),
    };

    return report;
  }

  /**
   * Check performance health against baselines
   */
  async checkPerformanceHealth() {
    const issues = [];

    try {
      // Cache performance
      const cacheStats = this.mediaCardCache.getCacheStats();
      const currentHitRate = parseFloat(cacheStats.hitRate);
      const baselineHitRate = this.baselines.get('cache_hit_rate');

      if (currentHitRate < baselineHitRate * this.criticalThresholds.cacheHitRateDrop) {
        issues.push({
          type: 'cache_hit_rate_critical',
          severity: 'critical',
          current: currentHitRate,
          baseline: baselineHitRate,
          threshold: baselineHitRate * this.criticalThresholds.cacheHitRateDrop,
          message: `Cache hit rate dropped to ${currentHitRate}% (baseline: ${baselineHitRate}%)`,
        });
      }

      // Response time degradation
      const recentResponseTimes = this.getRecentMetrics('mediacard_cache_miss_time', 300000);
      if (recentResponseTimes.length > 0) {
        const avgResponseTime =
          recentResponseTimes.reduce((sum, t) => sum + t.value, 0) / recentResponseTimes.length;
        const baselineResponseTime = this.baselines.get('response_time');

        if (
          avgResponseTime >
          baselineResponseTime * (1 + this.criticalThresholds.responseTimeDegradation)
        ) {
          issues.push({
            type: 'response_time_degradation',
            severity: 'critical',
            current: avgResponseTime,
            baseline: baselineResponseTime,
            degradation:
              (((avgResponseTime - baselineResponseTime) / baselineResponseTime) * 100).toFixed(1) +
              '%',
            message: `Response time degraded by ${(((avgResponseTime - baselineResponseTime) / baselineResponseTime) * 100).toFixed(1)}%`,
          });
        }
      }

      // Error rate spike
      const recentErrors = this.getRecentMetrics('mediacard_cache_miss', 300000);
      const recentTotal =
        this.getRecentMetrics('mediacard_cache_hit', 300000).length + recentErrors.length;

      if (recentTotal > 0) {
        const errorRate = recentErrors.length / recentTotal;
        if (errorRate > this.criticalThresholds.errorRateSpike) {
          issues.push({
            type: 'error_rate_spike',
            severity: 'critical',
            current: errorRate,
            threshold: this.criticalThresholds.errorRateSpike,
            message: `Error rate spiked to ${(errorRate * 100).toFixed(1)}%`,
          });
        }
      }
    } catch (error) {
      issues.push({
        type: 'performance_check_error',
        severity: 'warning',
        error: error.message,
        message: 'Failed to check performance health',
      });
    }

    return issues;
  }

  /**
   * Check resource health (memory, CPU, connections)
   */
  async checkResourceHealth() {
    const issues = [];

    try {
      // Memory usage
      const currentMemory = this.getCurrentMemoryUsage();
      const memoryLimit = this.demoConfig.CACHING.maxCacheMemory;
      const memoryUsagePercent = currentMemory / memoryLimit;

      if (memoryUsagePercent > this.criticalThresholds.memoryUsagePercent) {
        issues.push({
          type: 'memory_exhaustion',
          severity: 'critical',
          current: currentMemory,
          limit: memoryLimit,
          usage_percent: (memoryUsagePercent * 100).toFixed(1),
          message: `Memory usage critical: ${currentMemory}MB/${memoryLimit}MB (${(memoryUsagePercent * 100).toFixed(1)}%)`,
        });
      }

      // Predictive loader resource usage
      if (this.demoConfig.PREDICTIVE.enabled) {
        const predictiveStatus = this.predictiveLoader.getStatus();
        const resourceUtilization = parseFloat(predictiveStatus.resourceUsage.utilizationPercent);

        if (resourceUtilization > 90) {
          issues.push({
            type: 'predictive_resource_overload',
            severity: 'warning',
            utilization: resourceUtilization,
            active_loads: predictiveStatus.resourceUsage.activeLoads,
            message: `Predictive loader resource utilization high: ${resourceUtilization}%`,
          });
        }
      }
    } catch (error) {
      issues.push({
        type: 'resource_check_error',
        severity: 'warning',
        error: error.message,
        message: 'Failed to check resource health',
      });
    }

    return issues;
  }

  /**
   * Check system stability (circuit breakers, consecutive errors)
   */
  async checkSystemStability() {
    const issues = [];

    try {
      // Circuit breaker status
      if (this.demoConfig.PREDICTIVE.enabled) {
        const predictiveStatus = this.predictiveLoader.getStatus();

        if (predictiveStatus.circuitBreaker.state === 'OPEN') {
          issues.push({
            type: 'circuit_breaker_open',
            severity: 'warning',
            component: 'predictive_loader',
            failure_count: predictiveStatus.circuitBreaker.failureCount,
            message: 'Predictive loader circuit breaker is OPEN',
          });
        }
      }

      // Consecutive error tracking
      const recentErrors = this.getRecentMetrics('auto_rollback_health_check_error', 600000); // 10 minutes
      if (recentErrors.length >= this.criticalThresholds.consecutiveErrors) {
        issues.push({
          type: 'consecutive_health_check_errors',
          severity: 'critical',
          error_count: recentErrors.length,
          threshold: this.criticalThresholds.consecutiveErrors,
          message: `${recentErrors.length} consecutive health check errors`,
        });
      }
    } catch (error) {
      issues.push({
        type: 'stability_check_error',
        severity: 'warning',
        error: error.message,
        message: 'Failed to check system stability',
      });
    }

    return issues;
  }

  /**
   * Check individual feature health
   */
  async checkFeatureHealth() {
    const issues = [];

    try {
      // MediaCard cache health
      const cacheReport = this.mediaCardCache.getDemoPerformanceReport();
      if (cacheReport && cacheReport.status === 'needs_improvement') {
        issues.push({
          type: 'mediacard_cache_degraded',
          severity: 'warning',
          status: cacheReport.status,
          hit_rate: cacheReport.metrics.overall_hit_rate,
          message: 'MediaCard cache performance degraded',
        });
      }

      // Predictive loader health
      if (this.demoConfig.PREDICTIVE.enabled) {
        const predictiveStatus = this.predictiveLoader.getStatus();
        const successRate = parseFloat(predictiveStatus.performance.successRate);

        if (successRate < 70) {
          // Below 70% success rate
          issues.push({
            type: 'predictive_loader_high_failure',
            severity: 'warning',
            success_rate: successRate,
            message: `Predictive loader success rate low: ${successRate}%`,
          });
        }
      }
    } catch (error) {
      issues.push({
        type: 'feature_check_error',
        severity: 'warning',
        error: error.message,
        message: 'Failed to check feature health',
      });
    }

    return issues;
  }

  /**
   * Analyze health report and categorize issues
   */
  analyzeHealthReport(healthReport) {
    const issues = {
      critical: [],
      warning: [],
    };

    // Flatten all issues from health report
    const allIssues = [
      ...healthReport.performance,
      ...healthReport.resources,
      ...healthReport.stability,
      ...healthReport.features,
    ];

    // Categorize by severity
    allIssues.forEach(issue => {
      if (issue.severity === 'critical') {
        issues.critical.push(issue);
      } else if (issue.severity === 'warning') {
        issues.warning.push(issue);
      }
    });

    return issues;
  }

  /**
   * Trigger emergency rollback for critical issues
   */
  async triggerEmergencyRollback(criticalIssues) {
    if (this.rollbackState.active) {
      console.log('🛡️ Rollback already active, skipping trigger');
      return;
    }

    console.log('🚨 EMERGENCY ROLLBACK TRIGGERED');
    console.log(
      'Critical issues:',
      criticalIssues.map(i => i.message)
    );

    this.rollbackState = {
      active: true,
      triggeredBy: criticalIssues,
      timestamp: new Date().toISOString(),
      featuresRolledBack: [],
      originalSettings: new Map(),
    };

    // Execute rollback based on issue types
    for (const issue of criticalIssues) {
      await this.executeRollbackForIssue(issue);
    }

    // Track emergency rollback
    this.safetyMonitor.recordMetric('auto_rollback_triggered', 1, {
      trigger_count: criticalIssues.length,
      triggers: criticalIssues.map(i => i.type),
      features_rolled_back: this.rollbackState.featuresRolledBack,
    });

    console.log(
      `🛡️ Emergency rollback complete: ${this.rollbackState.featuresRolledBack.join(', ')}`
    );
  }

  /**
   * Execute specific rollback actions based on issue type
   */
  async executeRollbackForIssue(issue) {
    switch (issue.type) {
      case 'memory_exhaustion':
        await this.rollbackMemoryIntensiveFeatures();
        break;

      case 'cache_hit_rate_critical':
        await this.rollbackAggressiveCaching();
        break;

      case 'response_time_degradation':
        await this.rollbackPerformanceFeatures();
        break;

      case 'error_rate_spike':
        await this.rollbackUnstableFeatures();
        break;

      case 'consecutive_health_check_errors':
        await this.rollbackAllNonEssentialFeatures();
        break;

      default:
        console.log(`🛡️ No specific rollback action for: ${issue.type}`);
    }
  }

  /**
   * Rollback memory-intensive features
   */
  async rollbackMemoryIntensiveFeatures() {
    console.log('🛡️ Rolling back memory-intensive features');

    // Disable predictive loading
    if (this.demoConfig.PREDICTIVE.enabled) {
      this.originalSettings.set('predictive_loading', true);
      this.predictiveLoader.emergencyDisable();
      this.rollbackState.featuresRolledBack.push('predictive_loading');
    }

    // Reduce memory cache size
    const originalCacheSize = this.mediaCardCache.memoryCacheSize;
    this.originalSettings.set('memory_cache_size', originalCacheSize);
    this.mediaCardCache.memoryCacheSize = Math.floor(originalCacheSize * 0.5);
    this.mediaCardCache.performMemoryCleanup();
    this.rollbackState.featuresRolledBack.push('memory_cache_reduced');

    console.log('✅ Memory-intensive features rolled back');
  }

  /**
   * Rollback aggressive caching features
   */
  async rollbackAggressiveCaching() {
    console.log('🛡️ Rolling back aggressive caching');

    // Restore production TTLs
    const originalTTLs = { ...this.mediaCardCache.ttls };
    this.originalSettings.set('cache_ttls', originalTTLs);

    this.mediaCardCache.ttls = {
      movieData: 86400, // 24 hours
      poster: 604800, // 7 days
      streaming: 43200, // 12 hours
      enhancement: 86400, // 24 hours
    };

    this.rollbackState.featuresRolledBack.push('forever_cache_disabled');
    console.log('✅ Aggressive caching rolled back to production TTLs');
  }

  /**
   * Rollback performance-impacting features
   */
  async rollbackPerformanceFeatures() {
    console.log('🛡️ Rolling back performance features');

    // Disable predictive loading
    if (this.demoConfig.PREDICTIVE.enabled) {
      this.originalSettings.set('predictive_loading', true);
      this.predictiveLoader.emergencyDisable();
      this.rollbackState.featuresRolledBack.push('predictive_loading');
    }

    // Reduce memory cache TTL
    const originalTTL = this.mediaCardCache.memoryCacheTTL;
    this.originalSettings.set('memory_cache_ttl', originalTTL);
    this.mediaCardCache.memoryCacheTTL = 300000; // 5 minutes
    this.rollbackState.featuresRolledBack.push('memory_cache_ttl_reduced');

    console.log('✅ Performance features rolled back');
  }

  /**
   * Rollback unstable features
   */
  async rollbackUnstableFeatures() {
    console.log('🛡️ Rolling back unstable features');

    // Disable predictive loading (most likely source of errors)
    if (this.demoConfig.PREDICTIVE.enabled) {
      this.originalSettings.set('predictive_loading', true);
      this.predictiveLoader.emergencyDisable();
      this.rollbackState.featuresRolledBack.push('predictive_loading');
    }

    console.log('✅ Unstable features rolled back');
  }

  /**
   * Rollback all non-essential features (nuclear option)
   */
  async rollbackAllNonEssentialFeatures() {
    console.log('🚨 NUCLEAR ROLLBACK: Disabling all non-essential features');

    await this.rollbackMemoryIntensiveFeatures();
    await this.rollbackAggressiveCaching();
    await this.rollbackPerformanceFeatures();

    this.rollbackState.featuresRolledBack.push('nuclear_rollback');
    console.log('☢️ Nuclear rollback complete - only essential features remain');
  }

  /**
   * Check for recovery conditions to restore features
   */
  async checkRecoveryConditions() {
    console.log('🛡️ Checking recovery conditions...');

    try {
      const healthReport = await this.generateHealthReport();
      const issues = this.analyzeHealthReport(healthReport);

      // Check if all critical issues are resolved
      if (issues.critical.length === 0) {
        // Check if system has been stable for recovery period
        const rollbackAge = Date.now() - new Date(this.rollbackState.timestamp).getTime();
        const recoveryPeriod = 300000; // 5 minutes

        if (rollbackAge > recoveryPeriod) {
          await this.initiateRecovery();
        } else {
          console.log(
            `🛡️ System stable but waiting for recovery period (${Math.round((recoveryPeriod - rollbackAge) / 1000)}s remaining)`
          );
        }
      } else {
        console.log(`🛡️ Recovery blocked by ${issues.critical.length} critical issues`);
      }
    } catch (error) {
      console.error('🛡️ Recovery check failed:', error);
    }
  }

  /**
   * Initiate gradual feature recovery
   */
  async initiateRecovery() {
    console.log('🔄 Initiating gradual feature recovery...');

    // Restore features one by one with monitoring
    const restoredFeatures = [];

    for (const [setting, originalValue] of this.originalSettings.entries()) {
      try {
        await this.restoreFeature(setting, originalValue);
        restoredFeatures.push(setting);

        // Wait and check health after each restoration
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds

        const quickHealth = await this.generateHealthReport();
        const quickIssues = this.analyzeHealthReport(quickHealth);

        if (quickIssues.critical.length > 0) {
          console.log(`🛡️ Recovery halted - critical issue after restoring ${setting}`);
          break;
        }
      } catch (error) {
        console.error(`🛡️ Failed to restore ${setting}:`, error);
        break;
      }
    }

    // Mark recovery complete
    this.rollbackState = {
      active: false,
      triggeredBy: null,
      timestamp: null,
      featuresRolledBack: [],
      originalSettings: new Map(),
    };

    this.safetyMonitor.recordMetric('auto_rollback_recovery', 1, {
      features_restored: restoredFeatures,
      recovery_duration: Date.now() - new Date(this.rollbackState.timestamp).getTime(),
    });

    console.log(`✅ Recovery complete - restored: ${restoredFeatures.join(', ')}`);
  }

  /**
   * Restore individual feature from rollback
   */
  async restoreFeature(setting, originalValue) {
    switch (setting) {
      case 'predictive_loading':
        this.demoConfig.PREDICTIVE.enabled = true;
        console.log('🔄 Restored predictive loading');
        break;

      case 'memory_cache_size':
        this.mediaCardCache.memoryCacheSize = originalValue;
        console.log(`🔄 Restored memory cache size: ${originalValue}`);
        break;

      case 'cache_ttls':
        this.mediaCardCache.ttls = originalValue;
        console.log('🔄 Restored aggressive cache TTLs');
        break;

      case 'memory_cache_ttl':
        this.mediaCardCache.memoryCacheTTL = originalValue;
        console.log(`🔄 Restored memory cache TTL: ${originalValue}`);
        break;

      default:
        console.log(`🔄 Unknown setting for restoration: ${setting}`);
    }
  }

  /**
   * Check for immediate emergency conditions
   */
  checkEmergencyConditions() {
    // This runs more frequently to catch severe issues quickly
    try {
      // Check memory usage immediately
      const currentMemory = this.getCurrentMemoryUsage();
      const memoryLimit = this.demoConfig.CACHING.maxCacheMemory;

      if (currentMemory > memoryLimit * 0.98) {
        // 98% memory usage
        this.triggerEmergencyRollback([
          {
            type: 'emergency_memory_exhaustion',
            severity: 'critical',
            current: currentMemory,
            limit: memoryLimit,
            message: `Emergency memory exhaustion: ${currentMemory}MB/${memoryLimit}MB`,
          },
        ]);
      }
    } catch (error) {
      // Don't log emergency check errors frequently
    }
  }

  /**
   * Get current memory usage (estimate)
   */
  getCurrentMemoryUsage() {
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage();
        return Math.round(usage.heapUsed / 1024 / 1024); // MB
      }

      // Fallback estimation
      const cacheItems = this.mediaCardCache.memoryCache.size;
      return Math.round(cacheItems * 0.05); // ~50KB per item
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get recent metrics from safety monitor
   */
  getRecentMetrics(metricName, timeWindow = 300000) {
    const metrics = this.safetyMonitor.metrics.get(metricName) || [];
    const cutoff = Date.now() - timeWindow;

    return metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Handle warning conditions (non-critical issues)
   */
  handleWarningConditions(warnings) {
    console.log(`⚠️ ${warnings.length} warning conditions detected:`);
    warnings.forEach(warning => {
      console.log(`   • ${warning.message}`);
    });

    // Track warnings but don't rollback
    this.safetyMonitor.recordMetric('auto_rollback_warnings', warnings.length, {
      warning_types: warnings.map(w => w.type),
    });
  }

  /**
   * Get current rollback system status
   */
  getStatus() {
    return {
      monitoring: this.isMonitoring,
      rollback_active: this.rollbackState.active,
      rollback_state: this.rollbackState,
      baselines: Object.fromEntries(this.baselines),
      thresholds: this.criticalThresholds,
      auto_rollback_enabled: this.demoConfig.MONITORING.autoRollbackEnabled,
      last_health_check:
        this.getRecentMetrics('auto_rollback_health_check', 300000).length > 0
          ? this.getRecentMetrics('auto_rollback_health_check', 300000).slice(-1)[0].timestamp
          : null,
    };
  }

  /**
   * Force emergency shutdown of all demo features
   */
  emergencyShutdown() {
    console.log('🚨 EMERGENCY SHUTDOWN: Disabling all demo features');

    this.stopMonitoring();

    // Disable all demo features
    this.demoConfig.ENABLED = false;
    this.demoConfig.PREDICTIVE.enabled = false;
    this.demoConfig.CACHING.preWarmPopularMovies = false;

    // Emergency disable components
    this.predictiveLoader.emergencyDisable();
    this.mediaCardCache.clearCache();

    this.safetyMonitor.recordMetric('auto_rollback_emergency_shutdown', 1);

    console.log('🛑 Emergency shutdown complete');
  }
}

// Singleton instance
let autoRollbackSystem = null;

export function getAutoRollbackSystem() {
  if (!autoRollbackSystem) {
    autoRollbackSystem = new AutoRollbackSystem();
  }
  return autoRollbackSystem;
}

export default getAutoRollbackSystem;
