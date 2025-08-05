// pages/api/api-monitoring.js - API performance monitoring and metrics endpoint
// Provides detailed insights into API response times, error rates, and throughput

import { apiMonitor } from '../../lib/observability/api-monitor.js';
import { apiLogger, logger } from '../../lib/observability/logger.js';

export default async function handler(req, res) {
  const startTime = Date.now();
  
  apiLogger.apiRequest(req.method, '/api/api-monitoring', req.query);
  
  if (req.method !== 'GET') {
    apiLogger.apiResponse(req.method, '/api/api-monitoring', 405, Date.now() - startTime);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    action = 'summary',
    endpoint,
    timeWindow = '3600000', // 1 hour default
    format = 'detailed',
    limit = '50'
  } = req.query;

  try {
    const timeWindowMs = parseInt(timeWindow);
    const limitNum = parseInt(limit);
    let result;

    switch (action) {
      case 'summary':
        result = apiMonitor.getPerformanceSummary(timeWindowMs);
        break;

      case 'endpoint':
        if (!endpoint) {
          apiLogger.apiResponse('GET', '/api/api-monitoring', 400, Date.now() - startTime);
          return res.status(400).json({ 
            error: 'endpoint parameter required for endpoint action' 
          });
        }
        result = apiMonitor.getEndpointMetrics(decodeURIComponent(endpoint), timeWindowMs);
        break;

      case 'all-endpoints':
        result = apiMonitor.getAllEndpointMetrics(timeWindowMs);
        break;

      case 'errors':
        result = apiMonitor.getRecentErrors(limitNum, timeWindowMs);
        break;

      case 'thresholds':
        result = {
          current_thresholds: apiMonitor.alertThresholds,
          description: {
            response_time: 'Response time thresholds in milliseconds',
            error_rate: 'Error rate thresholds as percentage',
            throughput: 'Throughput thresholds in requests per minute'
          }
        };
        break;

      case 'health':
        const summary = apiMonitor.getPerformanceSummary(timeWindowMs);
        result = {
          health_status: summary.health_status,
          overall_metrics: summary.summary,
          alert_conditions: {
            high_response_time: summary.summary.avg_response_time > apiMonitor.alertThresholds.responseTime.warning,
            high_error_rate: parseFloat(summary.summary.error_rate) > apiMonitor.alertThresholds.errorRate.warning,
            critical_response_time: summary.summary.avg_response_time > apiMonitor.alertThresholds.responseTime.critical,
            critical_error_rate: parseFloat(summary.summary.error_rate) > apiMonitor.alertThresholds.errorRate.critical
          },
          timestamp: new Date().toISOString()
        };
        break;

      case 'realtime':
        // Get very recent data (last 5 minutes)
        const realtimeWindow = 5 * 60 * 1000; // 5 minutes
        const realtimeSummary = apiMonitor.getPerformanceSummary(realtimeWindow);
        const recentErrors = apiMonitor.getRecentErrors(10, realtimeWindow);
        
        result = {
          time_window: '5 minutes',
          current_performance: realtimeSummary.summary,
          health_status: realtimeSummary.health_status,
          recent_errors: recentErrors.errors,
          top_endpoints: realtimeSummary.top_endpoints?.slice(0, 5) || [],
          timestamp: new Date().toISOString()
        };
        break;

      default:
        apiLogger.apiResponse('GET', '/api/api-monitoring', 400, Date.now() - startTime);
        return res.status(400).json({ 
          error: 'Invalid action parameter',
          available_actions: ['summary', 'endpoint', 'all-endpoints', 'errors', 'thresholds', 'health', 'realtime']
        });
    }

    // Determine response status based on health
    let statusCode = 200;
    if (result.health_status === 'critical' || 
        (result.alert_conditions && (result.alert_conditions.critical_response_time || result.alert_conditions.critical_error_rate))) {
      statusCode = 503; // Service Unavailable
    } else if (result.health_status === 'degraded' ||
               (result.alert_conditions && (result.alert_conditions.high_response_time || result.alert_conditions.high_error_rate))) {
      statusCode = 200; // OK but with warnings
    }

    // Format for monitoring systems
    if (format === 'simple') {
      const simpleResult = {
        timestamp: new Date().toISOString(),
        action,
        time_window_ms: timeWindowMs
      };

      if (result.health_status) {
        simpleResult.health_status = result.health_status;
      }

      if (result.summary || result.overall_metrics) {
        const metrics = result.summary || result.overall_metrics;
        simpleResult.total_requests = metrics.total_requests;
        simpleResult.error_rate = metrics.error_rate;
        simpleResult.avg_response_time = metrics.avg_response_time;
        simpleResult.throughput = metrics.throughput_per_minute;
      }

      if (result.total_errors !== undefined) {
        simpleResult.error_count = result.total_errors;
      }

      apiLogger.apiResponse('GET', '/api/api-monitoring', statusCode, Date.now() - startTime);
      return res.status(statusCode).json(simpleResult);
    }

    // Prometheus-style metrics format
    if (format === 'prometheus') {
      const prometheusMetrics = generatePrometheusMetrics(result);
      res.setHeader('Content-Type', 'text/plain');
      apiLogger.apiResponse('GET', '/api/api-monitoring', statusCode, Date.now() - startTime, prometheusMetrics.length);
      return res.status(statusCode).send(prometheusMetrics);
    }

    // Full detailed response
    const response = {
      service: 'MovieGenius API Monitoring',
      timestamp: new Date().toISOString(),
      action,
      time_window_ms: timeWindowMs,
      duration: Date.now() - startTime,
      result,
      links: {
        self: '/api/api-monitoring',
        summary: '/api/api-monitoring?action=summary',
        all_endpoints: '/api/api-monitoring?action=all-endpoints',
        errors: '/api/api-monitoring?action=errors',
        health: '/api/api-monitoring?action=health',
        realtime: '/api/api-monitoring?action=realtime',
        thresholds: '/api/api-monitoring?action=thresholds',
        health_dashboard: '/health-dashboard'
      }
    };

    // Log monitoring request
    logger.info('API monitoring request completed', {
      action,
      duration: Date.now() - startTime,
      time_window_ms: timeWindowMs,
      health_status: result.health_status,
      status_code: statusCode
    });

    apiLogger.apiResponse('GET', '/api/api-monitoring', statusCode, Date.now() - startTime, JSON.stringify(response).length);
    return res.status(statusCode).json(response);

  } catch (error) {
    logger.error('API monitoring endpoint error', {
      action,
      endpoint,
      duration: Date.now() - startTime,
      error: error.message
    }, error);

    apiLogger.apiResponse('GET', '/api/api-monitoring', 500, Date.now() - startTime);
    
    return res.status(500).json({
      service: 'MovieGenius API Monitoring',
      status: 'error',
      timestamp: new Date().toISOString(),
      action,
      error: error.message,
      duration: Date.now() - startTime
    });
  }
}

function generatePrometheusMetrics(result) {
  let metrics = [];
  
  // Add timestamp
  const timestamp = Date.now();
  
  if (result.summary) {
    const s = result.summary;
    metrics.push(`# HELP moviegenius_api_requests_total Total number of API requests`);
    metrics.push(`# TYPE moviegenius_api_requests_total counter`);
    metrics.push(`moviegenius_api_requests_total ${s.total_requests} ${timestamp}`);
    
    metrics.push(`# HELP moviegenius_api_requests_failed Total number of failed API requests`);
    metrics.push(`# TYPE moviegenius_api_requests_failed counter`);
    metrics.push(`moviegenius_api_requests_failed ${s.failed_requests} ${timestamp}`);
    
    metrics.push(`# HELP moviegenius_api_response_time_avg Average API response time in milliseconds`);
    metrics.push(`# TYPE moviegenius_api_response_time_avg gauge`);
    metrics.push(`moviegenius_api_response_time_avg ${s.avg_response_time} ${timestamp}`);
    
    metrics.push(`# HELP moviegenius_api_error_rate API error rate as percentage`);
    metrics.push(`# TYPE moviegenius_api_error_rate gauge`);
    metrics.push(`moviegenius_api_error_rate ${parseFloat(s.error_rate)} ${timestamp}`);
    
    metrics.push(`# HELP moviegenius_api_throughput_per_minute API throughput in requests per minute`);
    metrics.push(`# TYPE moviegenius_api_throughput_per_minute gauge`);
    metrics.push(`moviegenius_api_throughput_per_minute ${parseFloat(s.throughput_per_minute)} ${timestamp}`);
  }
  
  if (result.endpoints) {
    for (const [path, endpointMetrics] of Object.entries(result.endpoints)) {
      const sanitizedPath = path.replace(/[^a-zA-Z0-9_]/g, '_');
      
      metrics.push(`# HELP moviegenius_endpoint_requests_total Total requests for endpoint`);
      metrics.push(`# TYPE moviegenius_endpoint_requests_total counter`);
      metrics.push(`moviegenius_endpoint_requests_total{endpoint="${path}"} ${endpointMetrics.total_requests} ${timestamp}`);
      
      metrics.push(`# HELP moviegenius_endpoint_response_time_avg Average response time for endpoint`);
      metrics.push(`# TYPE moviegenius_endpoint_response_time_avg gauge`);
      metrics.push(`moviegenius_endpoint_response_time_avg{endpoint="${path}"} ${endpointMetrics.avg_response_time} ${timestamp}`);
      
      metrics.push(`# HELP moviegenius_endpoint_error_rate Error rate for endpoint`);
      metrics.push(`# TYPE moviegenius_endpoint_error_rate gauge`);
      metrics.push(`moviegenius_endpoint_error_rate{endpoint="${path}"} ${parseFloat(endpointMetrics.error_rate)} ${timestamp}`);
    }
  }
  
  return metrics.join('\n') + '\n';
}