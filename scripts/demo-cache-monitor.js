#!/usr/bin/env node

/**
 * Demo Cache Monitoring and Management Script
 * 
 * Provides real-time monitoring and management of ultra-aggressive
 * MediaCard caching in demo mode with performance analytics.
 */

import { getMediaCardCache } from '../lib/mediacard-cache.js';
import { getDemoConfig, getDemoSafetyMonitor } from '../lib/demo-config.js';
import { getCache } from '../lib/cache.js';

/**
 * Cache Monitor Class
 */
class DemoCacheMonitor {
  constructor() {
    this.demoConfig = getDemoConfig();
    this.safetyMonitor = getDemoSafetyMonitor();
    this.mediaCardCache = getMediaCardCache();
    this.cache = getCache();
    this.monitoring = false;
  }

  /**
   * Display current cache status
   */
  async displayCacheStatus() {
    console.log('🎯 Demo Cache Status Report');
    console.log('===========================');
    console.log();

    if (!this.demoConfig.ENABLED) {
      console.log('❌ Demo mode is not enabled');
      console.log('Enable with: DEMO_MODE=true in .env.local');
      return;
    }

    // MediaCard cache statistics
    const stats = this.mediaCardCache.getCacheStats();
    console.log('📊 MediaCard Cache Performance:');
    console.log(`   • Status: ${stats.demoMode ? '🎯 DEMO MODE' : '📊 PRODUCTION'}`);
    console.log(`   • Total Requests: ${stats.totalRequests}`);
    console.log(`   • Cache Hit Rate: ${stats.hitRate} (target: >90%)`);
    console.log(`   • Memory Hit Rate: ${stats.memoryHitRate}`);
    console.log(`   • Requests/Second: ${stats.requestsPerSecond}`);
    console.log(`   • Uptime: ${stats.uptime}`);
    console.log();

    // Memory usage analysis
    console.log('💾 Memory Usage:');
    console.log(`   • Items Cached: ${stats.memoryCacheSize}/${stats.memoryCacheCapacity}`);
    console.log(`   • Memory Utilization: ${stats.memoryCacheUtilization}`);
    console.log(`   • Estimated Memory: ${Math.round((stats.memoryCacheSize * 50) / 1024)}MB`);
    console.log();

    // Demo performance report
    const demoReport = this.mediaCardCache.getDemoPerformanceReport();
    if (demoReport) {
      console.log('🎯 Demo Performance Analysis:');
      console.log(`   • Overall Status: ${this.getStatusEmoji(demoReport.status)} ${demoReport.status.toUpperCase()}`);
      console.log(`   • Cache Efficiency: ${demoReport.metrics.cache_efficiency}`);
      console.log(`   • Average Response: ${demoReport.metrics.avg_response_time}`);
      console.log();

      console.log('💡 Recommendations:');
      demoReport.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
      console.log();
    }

    // Safety monitoring status
    const safetyStatus = this.safetyMonitor.getSafetyStatus();
    console.log('🛡️ Safety Monitoring:');
    console.log(`   • Alerts: ${safetyStatus.alerts.length}`);
    console.log(`   • Metrics Tracked: ${Object.keys(safetyStatus.metrics).length}`);
    
    if (safetyStatus.alerts.length > 0) {
      console.log('\n⚠️ Recent Alerts:');
      safetyStatus.alerts.slice(-3).forEach(alert => {
        console.log(`   • ${alert.type}: ${alert.timestamp}`);
      });
    }
    console.log();

    // Configuration summary
    console.log('⚙️ Demo Configuration:');
    console.log(`   • MediaCard TTL: ${this.demoConfig.CACHING.mediaCardTTL === 0 ? 'FOREVER' : this.demoConfig.CACHING.mediaCardTTL + 's'}`);
    console.log(`   • Pre-warming: ${this.demoConfig.CACHING.preWarmPopularMovies ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   • Max Memory: ${this.demoConfig.CACHING.maxCacheMemory}MB`);
    console.log(`   • Hit Rate Target: ${this.demoConfig.CACHING.hitRateThreshold * 100}%`);
    console.log();
  }

  /**
   * Start real-time monitoring
   */
  async startMonitoring(intervalSeconds = 10) {
    if (this.monitoring) {
      console.log('❌ Monitoring is already running');
      return;
    }

    console.log(`🔄 Starting real-time cache monitoring (${intervalSeconds}s intervals)`);
    console.log('Press Ctrl+C to stop');
    console.log();

    this.monitoring = true;
    let previousStats = null;

    const monitorInterval = setInterval(async () => {
      if (!this.monitoring) {
        clearInterval(monitorInterval);
        return;
      }

      const currentStats = this.mediaCardCache.getCacheStats();
      const timestamp = new Date().toLocaleTimeString();

      // Calculate deltas
      if (previousStats) {
        const requestDelta = currentStats.totalRequests - previousStats.totalRequests;
        const hitDelta = currentStats.cacheHits - previousStats.cacheHits;
        
        console.log(`[${timestamp}] Requests: +${requestDelta} | Hits: +${hitDelta} | Hit Rate: ${currentStats.hitRate} | Memory: ${currentStats.memoryCacheUtilization}`);
        
        // Alert on performance issues
        if (parseFloat(currentStats.hitRate) < 80 && currentStats.totalRequests > 20) {
          console.log(`🚨 WARNING: Cache hit rate low (${currentStats.hitRate})`);
        }
      } else {
        console.log(`[${timestamp}] Initial stats - Requests: ${currentStats.totalRequests} | Hit Rate: ${currentStats.hitRate}`);
      }

      previousStats = currentStats;
    }, intervalSeconds * 1000);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      this.monitoring = false;
      console.log('\n✅ Monitoring stopped');
      process.exit(0);
    });
  }

  /**
   * Pre-warm cache with demo content
   */
  async preWarmCache() {
    if (!this.demoConfig.ENABLED) {
      console.log('❌ Demo mode is not enabled');
      return;
    }

    console.log('🔥 Pre-warming MediaCard cache with demo content...');
    
    try {
      await this.mediaCardCache.preWarmDemoContent();
      
      // Show updated stats
      const stats = this.mediaCardCache.getCacheStats();
      console.log(`✅ Pre-warming complete`);
      console.log(`   • Cache size: ${stats.memoryCacheSize} items`);
      console.log(`   • Memory usage: ${stats.memoryCacheUtilization}`);
      
    } catch (error) {
      console.error('❌ Pre-warming failed:', error.message);
    }
  }

  /**
   * Clear all cache data
   */
  async clearCache() {
    console.log('🧹 Clearing all cache data...');
    
    try {
      // Clear MediaCard memory cache
      this.mediaCardCache.memoryCache.clear();
      
      // Clear Redis cache (be careful in demo mode)
      const answer = await this.promptUser('This will clear ALL Redis cache data. Continue? (y/N): ');
      if (answer.toLowerCase() === 'y') {
        await this.mediaCardCache.clearCache();
        console.log('✅ All cache data cleared');
      } else {
        console.log('🔍 Only cleared memory cache');
      }
      
    } catch (error) {
      console.error('❌ Cache clearing failed:', error.message);
    }
  }

  /**
   * Analyze cache performance trends
   */
  async analyzeTrends() {
    console.log('📈 Cache Performance Trend Analysis');
    console.log('==================================');
    console.log();

    const demoReport = this.mediaCardCache.getDemoPerformanceReport();
    if (!demoReport) {
      console.log('❌ Demo mode not enabled');
      return;
    }

    // Performance trends
    console.log('📊 Current Performance:');
    console.log(`   • Hit Rate: ${demoReport.metrics.overall_hit_rate.toFixed(1)}%`);
    console.log(`   • Memory Hit Rate: ${demoReport.metrics.memory_hit_rate.toFixed(1)}%`);
    console.log(`   • Total Requests: ${demoReport.metrics.total_requests}`);
    console.log();

    // Memory efficiency
    console.log('💾 Memory Efficiency:');
    console.log(`   • Current Usage: ${demoReport.memory_usage.current_mb}MB`);
    console.log(`   • Memory Limit: ${demoReport.memory_usage.limit_mb}MB`);
    console.log(`   • Utilization: ${demoReport.memory_usage.utilization}`);
    console.log();

    // Improvement suggestions
    console.log('💡 Optimization Opportunities:');
    demoReport.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
    console.log();

    // Demo effectiveness
    if (demoReport.metrics.total_requests > 0) {
      const effectiveness = this.calculateDemoEffectiveness(demoReport);
      console.log('🎯 Demo Effectiveness:');
      console.log(`   • Performance Grade: ${effectiveness.grade}`);
      console.log(`   • Demo Readiness: ${effectiveness.readiness}`);
      console.log(`   • Estimated User Experience: ${effectiveness.userExperience}`);
    }
  }

  /**
   * Calculate demo effectiveness score
   */
  calculateDemoEffectiveness(report) {
    const hitRate = report.metrics.overall_hit_rate;
    const memoryRate = report.metrics.memory_hit_rate;
    
    let grade = 'F';
    let readiness = 'Not Ready';
    let userExperience = 'Poor';
    
    if (hitRate >= 95 && memoryRate >= 80) {
      grade = 'A+';
      readiness = 'Excellent';
      userExperience = 'Instant (< 50ms)';
    } else if (hitRate >= 90 && memoryRate >= 70) {
      grade = 'A';
      readiness = 'Very Good';
      userExperience = 'Very Fast (< 100ms)';
    } else if (hitRate >= 80 && memoryRate >= 60) {
      grade = 'B';
      readiness = 'Good';
      userExperience = 'Fast (< 200ms)';
    } else if (hitRate >= 70) {
      grade = 'C';
      readiness = 'Acceptable';
      userExperience = 'Moderate (< 500ms)';
    }
    
    return { grade, readiness, userExperience };
  }

  /**
   * Get status emoji
   */
  getStatusEmoji(status) {
    const emojis = {
      excellent: '🟢',
      good: '🔵', 
      acceptable: '🟡',
      needs_improvement: '🟠'
    };
    return emojis[status] || '⚪';
  }

  /**
   * Simple user input prompt
   */
  async promptUser(question) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }
}

/**
 * Command line interface
 */
async function main() {
  const monitor = new DemoCacheMonitor();
  const command = process.argv[2];
  const param = process.argv[3];

  switch (command) {
    case 'status':
    case undefined:
      await monitor.displayCacheStatus();
      break;

    case 'monitor':
      const interval = parseInt(param) || 10;
      await monitor.startMonitoring(interval);
      break;

    case 'prewarm':
      await monitor.preWarmCache();
      break;

    case 'clear':
      await monitor.clearCache();
      break;

    case 'analyze':
      await monitor.analyzeTrends();
      break;

    case 'help':
      console.log('Demo Cache Monitor Commands:');
      console.log('  status              - Show current cache status');
      console.log('  monitor [seconds]   - Real-time monitoring (default: 10s)');
      console.log('  prewarm            - Pre-warm cache with demo content');
      console.log('  clear              - Clear cache data');
      console.log('  analyze            - Analyze performance trends');
      console.log('  help               - Show this help');
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "node scripts/demo-cache-monitor.js help" for available commands');
      process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DemoCacheMonitor };