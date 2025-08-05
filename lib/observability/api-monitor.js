// lib/observability/api-monitor.js - API response time and error rate monitoring
// Tracks performance metrics, error rates, and API health across all endpoints

import { logger, apiLogger } from './logger.js';

export class APIMonitor {
  constructor() {
    this.metrics = new Map();
    this.requestHistory = [];
    this.maxHistorySize = 10000;
    this.alertThresholds = {
      responseTime: {
        warning: 2000,   // 2 seconds
        critical: 5000   // 5 seconds
      },
      errorRate: {
        warning: 5,      // 5%
        critical: 15     // 15%
      },
      throughput: {
        warning: 100,    // requests per minute
        critical: 200    // requests per minute
      }
    };
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  // Track an API request
  startRequest(method, path, details = {}) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    const request = {
      id: requestId,
      method,
      path,
      started_at: startTime,
      timestamp: new Date().toISOString(),
      details,
      status: 'in_progress'
    };
    
    // Store active request
    this.metrics.set(requestId, request);
    
    return {
      requestId,
      complete: (statusCode, responseSize = null, error = null) => {
        this.completeRequest(requestId, statusCode, responseSize, error);
      }
    };
  }

  // Complete an API request
  completeRequest(requestId, statusCode, responseSize = null, error = null) {
    const request = this.metrics.get(requestId);
    if (!request) return;

    const endTime = Date.now();
    const duration = endTime - request.started_at;
    
    // Update request record
    request.completed_at = endTime;
    request.duration = duration;
    request.status_code = statusCode;
    request.response_size = responseSize;
    request.error = error;
    request.status = error ? 'error' : 'completed';
    request.success = statusCode >= 200 && statusCode < 400;

    // Add to history
    this.requestHistory.unshift({ ...request });
    
    // Trim history if needed
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(0, this.maxHistorySize);
    }

    // Clean up active request
    this.metrics.delete(requestId);

    // Log performance metrics
    this.logRequestMetrics(request);
    
    // Check for alerts
    this.checkAlerts(request);
  }

  // Log request metrics
  logRequestMetrics(request) {
    const level = this.determineLogLevel(request);
    
    apiLogger.performance(`${request.method} ${request.path}`, request.duration, {
      status_code: request.status_code,
      success: request.success,
      response_size: request.response_size,
      threshold_warning: this.alertThresholds.responseTime.warning,
      threshold_critical: this.alertThresholds.responseTime.critical,
      slow_request: request.duration > this.alertThresholds.responseTime.warning
    });

    // Log slow requests
    if (request.duration > this.alertThresholds.responseTime.warning) {
      const alertLevel = request.duration > this.alertThresholds.responseTime.critical ? 'error' : 'warn';
      logger[alertLevel]('Slow API request detected', {
        method: request.method,
        path: request.path,
        duration: request.duration,
        status_code: request.status_code,
        threshold: request.duration > this.alertThresholds.responseTime.critical ? 'critical' : 'warning'
      });
    }

    // Log errors
    if (!request.success) {
      logger.error('API request failed', {
        method: request.method,
        path: request.path,
        status_code: request.status_code,
        duration: request.duration,
        error: request.error
      });
    }
  }

  // Check for alert conditions
  checkAlerts(request) {
    const recentRequests = this.getRecentRequests(5 * 60 * 1000); // Last 5 minutes
    const pathRequests = recentRequests.filter(r => r.path === request.path);
    
    if (pathRequests.length >= 10) { // Only check if we have enough data
      const errorRate = this.calculateErrorRate(pathRequests);
      const avgResponseTime = this.calculateAverageResponseTime(pathRequests);
      
      // Error rate alerts
      if (errorRate >= this.alertThresholds.errorRate.critical) {
        logger.error('Critical error rate detected', {
          path: request.path,
          error_rate: errorRate,
          sample_size: pathRequests.length,
          threshold: this.alertThresholds.errorRate.critical
        });
      } else if (errorRate >= this.alertThresholds.errorRate.warning) {
        logger.warn('High error rate detected', {
          path: request.path,
          error_rate: errorRate,
          sample_size: pathRequests.length,
          threshold: this.alertThresholds.errorRate.warning
        });
      }
      
      // Response time alerts
      if (avgResponseTime >= this.alertThresholds.responseTime.critical) {
        logger.error('Critical response time detected', {
          path: request.path,
          avg_response_time: avgResponseTime,
          sample_size: pathRequests.length,
          threshold: this.alertThresholds.responseTime.critical
        });
      } else if (avgResponseTime >= this.alertThresholds.responseTime.warning) {
        logger.warn('Slow response time detected', {
          path: request.path,
          avg_response_time: avgResponseTime,
          sample_size: pathRequests.length,
          threshold: this.alertThresholds.responseTime.warning
        });
      }
    }
  }

  // Get metrics for a specific endpoint
  getEndpointMetrics(path, timeWindowMs = 60 * 60 * 1000) { // Default: 1 hour
    const recentRequests = this.getRecentRequests(timeWindowMs);
    const pathRequests = recentRequests.filter(r => r.path === path);
    
    if (pathRequests.length === 0) {
      return {
        path,
        time_window: timeWindowMs,
        no_data: true
      };
    }

    return this.calculateMetrics(pathRequests, path, timeWindowMs);
  }

  // Get metrics for all endpoints
  getAllEndpointMetrics(timeWindowMs = 60 * 60 * 1000) {
    const recentRequests = this.getRecentRequests(timeWindowMs);
    const pathGroups = this.groupRequestsByPath(recentRequests);
    
    const metrics = {};
    for (const [path, requests] of pathGroups) {
      metrics[path] = this.calculateMetrics(requests, path, timeWindowMs);
    }
    
    return {
      time_window: timeWindowMs,
      total_requests: recentRequests.length,
      endpoints: metrics,
      summary: this.calculateOverallSummary(recentRequests, timeWindowMs)
    };
  }

  // Get system-wide performance summary
  getPerformanceSummary(timeWindowMs = 60 * 60 * 1000) {
    const recentRequests = this.getRecentRequests(timeWindowMs);
    
    if (recentRequests.length === 0) {
      return {
        time_window: timeWindowMs,
        no_data: true,
        message: 'No API requests in the specified time window'
      };
    }
    
    const summary = this.calculateOverallSummary(recentRequests, timeWindowMs);
    const topEndpoints = this.getTopEndpoints(recentRequests);
    const slowestEndpoints = this.getSlowestEndpoints(recentRequests);
    const errorProneEndpoints = this.getErrorProneEndpoints(recentRequests);
    
    return {
      timestamp: new Date().toISOString(),
      time_window: timeWindowMs,
      summary,
      top_endpoints: topEndpoints,
      slowest_endpoints: slowestEndpoints,
      error_prone_endpoints: errorProneEndpoints,
      alert_thresholds: this.alertThresholds,
      health_status: this.determineHealthStatus(summary)
    };
  }

  // Get recent error details
  getRecentErrors(limit = 50, timeWindowMs = 60 * 60 * 1000) {
    const recentRequests = this.getRecentRequests(timeWindowMs);
    const errors = recentRequests
      .filter(r => !r.success)
      .slice(0, limit)
      .map(r => ({
        timestamp: r.timestamp,
        method: r.method,
        path: r.path,
        status_code: r.status_code,
        duration: r.duration,
        error: r.error,
        request_id: r.id
      }));
    
    return {
      time_window: timeWindowMs,
      total_errors: errors.length,
      errors
    };
  }

  // Helper methods
  getRecentRequests(timeWindowMs) {
    const cutoff = Date.now() - timeWindowMs;
    return this.requestHistory.filter(r => r.completed_at > cutoff);
  }

  groupRequestsByPath(requests) {
    const groups = new Map();
    for (const request of requests) {
      if (!groups.has(request.path)) {
        groups.set(request.path, []);
      }
      groups.get(request.path).push(request);
    }
    return groups;
  }

  calculateMetrics(requests, path, timeWindowMs) {
    const successful = requests.filter(r => r.success);
    const failed = requests.filter(r => !r.success);
    const durations = requests.map(r => r.duration);
    
    // Calculate percentiles
    const sortedDurations = durations.sort((a, b) => a - b);
    const p50 = this.percentile(sortedDurations, 50);
    const p95 = this.percentile(sortedDurations, 95);
    const p99 = this.percentile(sortedDurations, 99);
    
    // Calculate throughput (requests per minute)
    const throughput = (requests.length / (timeWindowMs / 1000)) * 60;
    
    return {
      path,
      time_window: timeWindowMs,
      total_requests: requests.length,
      successful_requests: successful.length,
      failed_requests: failed.length,
      success_rate: ((successful.length / requests.length) * 100).toFixed(2) + '%',
      error_rate: ((failed.length / requests.length) * 100).toFixed(2) + '%',
      avg_response_time: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min_response_time: Math.min(...durations),
      max_response_time: Math.max(...durations),
      p50_response_time: p50,
      p95_response_time: p95,
      p99_response_time: p99,
      throughput_per_minute: throughput.toFixed(2),
      status_code_distribution: this.getStatusCodeDistribution(requests),
      recent_errors: failed.slice(0, 5).map(r => ({
        timestamp: r.timestamp,
        status_code: r.status_code,
        duration: r.duration,
        error: r.error
      }))
    };
  }

  calculateOverallSummary(requests, timeWindowMs) {
    const successful = requests.filter(r => r.success);
    const failed = requests.filter(r => !r.success);
    const durations = requests.map(r => r.duration);
    const throughput = (requests.length / (timeWindowMs / 1000)) * 60;
    
    return {
      total_requests: requests.length,
      successful_requests: successful.length,
      failed_requests: failed.length,
      success_rate: requests.length > 0 ? ((successful.length / requests.length) * 100).toFixed(2) + '%' : '0%',
      error_rate: requests.length > 0 ? ((failed.length / requests.length) * 100).toFixed(2) + '%' : '0%',
      avg_response_time: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      throughput_per_minute: throughput.toFixed(2)
    };
  }

  getTopEndpoints(requests, limit = 10) {
    const pathCounts = {};
    for (const request of requests) {
      pathCounts[request.path] = (pathCounts[request.path] || 0) + 1;
    }
    
    return Object.entries(pathCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([path, count]) => ({ path, request_count: count }));
  }

  getSlowestEndpoints(requests, limit = 10) {
    const pathGroups = this.groupRequestsByPath(requests);
    const pathAverages = [];
    
    for (const [path, pathRequests] of pathGroups) {
      const avgDuration = pathRequests.reduce((sum, r) => sum + r.duration, 0) / pathRequests.length;
      pathAverages.push({ path, avg_response_time: Math.round(avgDuration), request_count: pathRequests.length });
    }
    
    return pathAverages
      .sort((a, b) => b.avg_response_time - a.avg_response_time)
      .slice(0, limit);
  }

  getErrorProneEndpoints(requests, limit = 10) {
    const pathGroups = this.groupRequestsByPath(requests);
    const pathErrorRates = [];
    
    for (const [path, pathRequests] of pathGroups) {
      const errorCount = pathRequests.filter(r => !r.success).length;
      const errorRate = (errorCount / pathRequests.length) * 100;
      
      if (errorRate > 0) {
        pathErrorRates.push({ 
          path, 
          error_rate: errorRate.toFixed(2) + '%', 
          error_count: errorCount,
          total_requests: pathRequests.length 
        });
      }
    }
    
    return pathErrorRates
      .sort((a, b) => parseFloat(b.error_rate) - parseFloat(a.error_rate))
      .slice(0, limit);
  }

  getStatusCodeDistribution(requests) {
    const distribution = {};
    for (const request of requests) {
      const code = request.status_code;
      distribution[code] = (distribution[code] || 0) + 1;
    }
    return distribution;
  }

  calculateErrorRate(requests) {
    if (requests.length === 0) return 0;
    const failed = requests.filter(r => !r.success).length;
    return (failed / requests.length) * 100;
  }

  calculateAverageResponseTime(requests) {
    if (requests.length === 0) return 0;
    const total = requests.reduce((sum, r) => sum + r.duration, 0);
    return total / requests.length;
  }

  percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  determineLogLevel(request) {
    if (!request.success) return 'error';
    if (request.duration > this.alertThresholds.responseTime.critical) return 'error';
    if (request.duration > this.alertThresholds.responseTime.warning) return 'warn';
    return 'info';
  }

  determineHealthStatus(summary) {
    const errorRate = parseFloat(summary.error_rate);
    const avgResponseTime = summary.avg_response_time;
    
    if (errorRate >= this.alertThresholds.errorRate.critical || 
        avgResponseTime >= this.alertThresholds.responseTime.critical) {
      return 'critical';
    }
    
    if (errorRate >= this.alertThresholds.errorRate.warning || 
        avgResponseTime >= this.alertThresholds.responseTime.warning) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  startPeriodicCleanup() {
    // Clean up old history every hour
    setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // Keep 24 hours
      this.requestHistory = this.requestHistory.filter(r => r.completed_at > cutoff);
      
      logger.debug('API monitor history cleaned', {
        remaining_requests: this.requestHistory.length,
        active_requests: this.metrics.size
      });
    }, 60 * 60 * 1000); // Run every hour
  }

  // Update alert thresholds
  updateThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    logger.info('API monitor thresholds updated', { thresholds: this.alertThresholds });
  }
}

// Export singleton instance
export const apiMonitor = new APIMonitor();

// Middleware function for automatic API monitoring
export function withAPIMonitoring(handler) {
  return async (req, res) => {
    const { requestId, complete } = apiMonitor.startRequest(
      req.method,
      req.url,
      {
        user_agent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        content_length: req.headers['content-length']
      }
    );

    // Override res.status and res.json to capture response details
    const originalStatus = res.status;
    const originalJson = res.json;
    const originalSend = res.send;
    
    let statusCode = 200;
    let responseSize = 0;
    let error = null;
    
    res.status = function(code) {
      statusCode = code;
      return originalStatus.call(this, code);
    };
    
    res.json = function(data) {
      const jsonString = JSON.stringify(data);
      responseSize = jsonString.length;
      
      if (statusCode >= 400 && data && data.error) {
        error = data.error;
      }
      
      complete(statusCode, responseSize, error);
      return originalJson.call(this, data);
    };
    
    res.send = function(data) {
      responseSize = typeof data === 'string' ? data.length : JSON.stringify(data).length;
      complete(statusCode, responseSize, error);
      return originalSend.call(this, data);
    };

    try {
      await handler(req, res);
    } catch (handlerError) {
      error = handlerError.message;
      complete(statusCode || 500, responseSize, error);
      throw handlerError;
    }
  };
}