/**
 * Performance Monitoring Infrastructure for MovieGenius
 *
 * Provides comprehensive performance tracking, measurement, and validation
 * for all optimization efforts with risk mitigation capabilities.
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.baselines = new Map();
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';

    // Performance thresholds for validation
    this.thresholds = {
      componentRender: 16, // 60fps threshold
      apiResponse: 2000, // 2 second API response
      cacheHitRate: 80, // 80% cache hit rate target
      memoryUsage: 100 * 1024 * 1024, // 100MB memory threshold
      bundleSize: 5 * 1024 * 1024, // 5MB bundle size threshold
    };

    // Initialize Core Web Vitals tracking if in browser
    if (typeof window !== 'undefined') {
      this.initCoreWebVitals();
    }
  }

  /**
   * Track baseline performance before optimization
   */
  recordBaseline(metric, value, context = {}) {
    const key = `${metric}_baseline`;
    this.baselines.set(key, {
      value,
      timestamp: Date.now(),
      context,
      environment: this.isProduction ? 'production' : 'development',
    });

    if (this.isDevelopment) {
      console.log(`📊 Baseline recorded: ${metric} = ${value}`, context);
    }
  }

  /**
   * Track performance metric with automatic baseline comparison
   */
  trackMetric(metric, value, context = {}) {
    const timestamp = Date.now();
    const entry = { value, timestamp, context };

    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }

    this.metrics.get(metric).push(entry);

    // Compare against baseline if available
    const baselineKey = `${metric}_baseline`;
    if (this.baselines.has(baselineKey)) {
      const baseline = this.baselines.get(baselineKey);
      const improvement = ((baseline.value - value) / baseline.value) * 100;

      if (this.isDevelopment) {
        console.log(
          `📈 ${metric}: ${value} (${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}% vs baseline)`
        );
      }

      // Validate against expected improvements
      this.validateImprovement(metric, improvement, context);
    }

    return entry;
  }

  /**
   * Validate that improvements meet expected targets
   */
  validateImprovement(metric, improvement, context) {
    const expectedImprovements = {
      mediacard_render_time: 60, // Expected 60% improvement
      episode_load_time: 70, // Expected 70% improvement
      api_response_time: 50, // Expected 50% improvement
      cache_hit_rate: 20, // Expected 20% improvement in hit rate
      console_log_overhead: 8, // Expected 8% baseline improvement
    };

    const expected = expectedImprovements[metric];
    if (expected && improvement < expected * 0.8) {
      // 80% of expected
      console.warn(
        `⚠️ Performance warning: ${metric} improvement (${improvement.toFixed(1)}%) below expected (${expected}%)`
      );
    } else if (expected && improvement >= expected) {
      console.log(
        `✅ Performance target met: ${metric} improved ${improvement.toFixed(1)}% (target: ${expected}%)`
      );
    }
  }

  /**
   * Time a function execution with automatic metric tracking
   */
  async timeFunction(name, fn, context = {}) {
    const startTime = performance.now();
    const startMemory = typeof process !== 'undefined' ? process.memoryUsage() : null;

    try {
      const result = await fn();
      const endTime = performance.now();
      const duration = endTime - startTime;

      const endMemory = typeof process !== 'undefined' ? process.memoryUsage() : null;
      const memoryDelta =
        endMemory && startMemory ? endMemory.heapUsed - startMemory.heapUsed : null;

      this.trackMetric(`${name}_execution_time`, duration, {
        ...context,
        memoryDelta,
        success: true,
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.trackMetric(`${name}_execution_time`, duration, {
        ...context,
        error: error.message,
        success: false,
      });

      throw error;
    }
  }

  /**
   * React component render tracking
   */
  trackComponentRender(componentName, phase, actualDuration, baseDuration, startTime, commitTime) {
    this.trackMetric(`${componentName}_render_time`, actualDuration, {
      phase,
      baseDuration,
      startTime,
      commitTime,
      efficiency: baseDuration > 0 ? baseDuration / actualDuration : 1,
    });

    // Alert on slow renders
    if (actualDuration > this.thresholds.componentRender) {
      console.warn(`🐌 Slow render detected: ${componentName} took ${actualDuration.toFixed(2)}ms`);
    }
  }

  /**
   * Cache performance tracking
   */
  trackCachePerformance(operation, key, hit, responseTime, context = {}) {
    this.trackMetric(`cache_${operation}`, responseTime, {
      key: key.substring(0, 50), // Truncate long keys
      hit,
      ...context,
    });

    // Track hit rate
    const hitRate = this.calculateCacheHitRate();
    if (hitRate < this.thresholds.cacheHitRate) {
      console.warn(
        `📊 Cache hit rate below threshold: ${hitRate.toFixed(1)}% (target: ${this.thresholds.cacheHitRate}%)`
      );
    }
  }

  /**
   * API cost tracking for Claude/TMDB
   */
  trackAPICost(service, operation, inputTokens = 0, outputTokens = 0, cached = false) {
    const costs = {
      claude_sonnet: { input: 3.0, output: 15.0 }, // Per million tokens
      claude_haiku: { input: 0.25, output: 1.25 },
      tmdb: { request: 0 }, // Free tier
    };

    const cost = cached
      ? 0
      : (inputTokens * costs[service]?.input || 0) / 1000000 +
        (outputTokens * costs[service]?.output || 0) / 1000000;

    this.trackMetric(`${service}_cost`, cost, {
      operation,
      inputTokens,
      outputTokens,
      cached,
      costPerToken: costs[service],
    });

    if (this.isDevelopment && !cached) {
      console.log(
        `💰 API Cost: ${service} ${operation} = $${cost.toFixed(4)} (${inputTokens + outputTokens} tokens)`
      );
    }
  }

  /**
   * Calculate cache hit rate from recent metrics
   */
  calculateCacheHitRate() {
    const cacheMetrics = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith('cache_'))
      .flatMap(([_, entries]) => entries.slice(-100)); // Last 100 cache operations

    if (cacheMetrics.length === 0) return 100;

    const hits = cacheMetrics.filter(entry => entry.context.hit).length;
    return (hits / cacheMetrics.length) * 100;
  }

  /**
   * Initialize Core Web Vitals tracking (browser only)
   * Note: Requires web-vitals package to be installed
   */
  initCoreWebVitals() {
    if (typeof window === 'undefined') return;

    // Skip web-vitals tracking for now - package not installed
    // TODO: Install web-vitals package if performance monitoring is needed
    console.debug(
      'Performance Monitor: Core Web Vitals tracking disabled (web-vitals package not installed)'
    );
    return;

    // Commented out until web-vitals is installed:
    // import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    //   getCLS((metric) => this.trackMetric('core_web_vitals_cls', metric.value, metric));
    //   getFID((metric) => this.trackMetric('core_web_vitals_fid', metric.value, metric));
    //   getFCP((metric) => this.trackMetric('core_web_vitals_fcp', metric.value, metric));
    //   getLCP((metric) => this.trackMetric('core_web_vitals_lcp', metric.value, metric));
    //   getTTFB((metric) => this.trackMetric('core_web_vitals_ttfb', metric.value, metric));
    // }).catch(() => {
    //   console.debug('Performance Monitor: web-vitals package not available');
    // });
  }

  /**
   * Generate performance report
   */
  generateReport(timeWindow = 3600000) {
    // Default 1 hour
    const cutoff = Date.now() - timeWindow;
    const report = {
      timestamp: new Date().toISOString(),
      timeWindow: `${timeWindow / 1000}s`,
      metrics: {},
      summary: {},
      recommendations: [],
    };

    for (const [metric, entries] of this.metrics.entries()) {
      const recentEntries = entries.filter(e => e.timestamp > cutoff);
      if (recentEntries.length === 0) continue;

      const values = recentEntries.map(e => e.value);
      report.metrics[metric] = {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        median: values.sort((a, b) => a - b)[Math.floor(values.length / 2)],
      };

      // Add baseline comparison
      const baselineKey = `${metric}_baseline`;
      if (this.baselines.has(baselineKey)) {
        const baseline = this.baselines.get(baselineKey);
        const improvement =
          ((baseline.value - report.metrics[metric].average) / baseline.value) * 100;
        report.metrics[metric].improvement = `${improvement.toFixed(1)}%`;
      }
    }

    // Generate summary and recommendations
    report.summary.cacheHitRate = `${this.calculateCacheHitRate().toFixed(1)}%`;
    report.summary.totalMetrics = Object.keys(report.metrics).length;

    if (this.calculateCacheHitRate() < this.thresholds.cacheHitRate) {
      report.recommendations.push(
        'Cache hit rate below target - consider cache warming or TTL adjustments'
      );
    }

    return report;
  }

  /**
   * Risk mitigation: Rollback detection
   */
  detectPerformanceRegression(metric, threshold = 20) {
    const recent = this.metrics.get(metric)?.slice(-10) || [];
    if (recent.length < 5) return false;

    const recentAvg = recent.reduce((sum, entry) => sum + entry.value, 0) / recent.length;
    const baselineKey = `${metric}_baseline`;

    if (this.baselines.has(baselineKey)) {
      const baseline = this.baselines.get(baselineKey).value;
      const regression = ((recentAvg - baseline) / baseline) * 100;

      if (regression > threshold) {
        console.error(
          `🚨 Performance regression detected: ${metric} increased ${regression.toFixed(1)}% above baseline`
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics() {
    return {
      metrics: Object.fromEntries(this.metrics),
      baselines: Object.fromEntries(this.baselines),
      report: this.generateReport(),
    };
  }
}

// Singleton instance
let performanceMonitor = null;

export function getPerformanceMonitor() {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

// React Profiler component for easy integration (client-side only)
export function PerformanceProfiler({ id, children, onRender }) {
  const monitor = getPerformanceMonitor();

  const handleRender = (id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    monitor.trackComponentRender(id, phase, actualDuration, baseDuration, startTime, commitTime);
    if (onRender) {
      onRender(id, phase, actualDuration, baseDuration, startTime, commitTime);
    }
  };

  // Note: JSX removed for Node.js compatibility
  // Use React.createElement when importing in React components
  return { handleRender, id, children };
}

export default getPerformanceMonitor;
