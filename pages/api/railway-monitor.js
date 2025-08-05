// pages/api/railway-monitor.js - Railway PostgreSQL monitoring endpoint
// Provides detailed monitoring and validation for Railway database connectivity

import { railwayMonitor, testRailwayConnection, monitorMovieQuery, getRailwayMetrics } from '../../lib/observability/railway-monitor.js';
import { apiLogger, railwayLogger } from '../../lib/observability/logger.js';

export default async function handler(req, res) {
  const startTime = Date.now();
  
  apiLogger.apiRequest('GET', '/api/railway-monitor', req.query);
  
  if (req.method !== 'GET') {
    apiLogger.apiResponse('GET', '/api/railway-monitor', 405, Date.now() - startTime);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, tmdbId, format } = req.query;

  try {
    let result;

    switch (action) {
      case 'test-connection':
        result = await testRailwayConnection();
        break;

      case 'monitor-movie':
        if (!tmdbId) {
          apiLogger.apiResponse('GET', '/api/railway-monitor', 400, Date.now() - startTime);
          return res.status(400).json({ 
            error: 'tmdbId parameter required for monitor-movie action' 
          });
        }
        result = await monitorMovieQuery(tmdbId);
        break;

      case 'metrics':
        result = getRailwayMetrics();
        break;

      case 'schema':
        result = await railwayMonitor.getDatabaseSchema();
        break;

      case 'config':
        result = {
          config: railwayMonitor.getConnectionConfig(),
          environment: {
            node_env: process.env.NODE_ENV,
            railway_deployment_id: process.env.RAILWAY_DEPLOYMENT_ID,
            has_database_url: !!(process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL),
            database_url_length: (process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL || '').length
          },
          timestamp: new Date().toISOString()
        };
        break;

      case 'clear-metrics':
        railwayMonitor.clearMetrics();
        result = {
          success: true,
          message: 'Metrics cleared',
          timestamp: new Date().toISOString()
        };
        break;

      default:
        // Default: comprehensive status
        const [connectionTest, metrics, config] = await Promise.all([
          testRailwayConnection(),
          Promise.resolve(getRailwayMetrics()),
          Promise.resolve(railwayMonitor.getConnectionConfig())
        ]);

        result = {
          status: 'railway_monitor',
          timestamp: new Date().toISOString(),
          connection_test: connectionTest,
          metrics,
          config,
          available_actions: [
            'test-connection',
            'monitor-movie',
            'metrics',
            'schema',
            'config',
            'clear-metrics'
          ]
        };
    }

    // Determine response status
    let statusCode = 200;
    if (action === 'test-connection' && !result.success) {
      statusCode = 503; // Service Unavailable
    } else if (action === 'monitor-movie' && !result.success) {
      statusCode = 404; // Not Found or database error
    }

    // Format for monitoring systems
    if (format === 'simple') {
      const simpleResult = {
        success: result.success !== false,
        timestamp: result.timestamp || new Date().toISOString(),
        duration: Date.now() - startTime
      };

      if (action === 'test-connection') {
        simpleResult.connection_time = result.connection_time;
        simpleResult.tests_passed = result.tests ? result.tests.filter(t => t.success).length : 0;
      } else if (action === 'monitor-movie') {
        simpleResult.movie_found = result.success;
        simpleResult.has_analysis = result.has_analysis;
        simpleResult.total_time = result.performance?.total_time;
      }

      apiLogger.apiResponse('GET', '/api/railway-monitor', statusCode, Date.now() - startTime);
      return res.status(statusCode).json(simpleResult);
    }

    // Full response
    const response = {
      service: 'Railway PostgreSQL Monitor',
      timestamp: new Date().toISOString(),
      action: action || 'status',
      duration: Date.now() - startTime,
      result,
      links: {
        self: '/api/railway-monitor',
        test_connection: '/api/railway-monitor?action=test-connection',
        metrics: '/api/railway-monitor?action=metrics',
        config: '/api/railway-monitor?action=config',
        schema: '/api/railway-monitor?action=schema',
        monitor_movie: '/api/railway-monitor?action=monitor-movie&tmdbId=550',
        health_dashboard: '/health-dashboard'
      }
    };

    railwayLogger.info('Railway monitor request completed', {
      action: action || 'status',
      duration: Date.now() - startTime,
      success: result.success !== false,
      status_code: statusCode
    });

    apiLogger.apiResponse('GET', '/api/railway-monitor', statusCode, Date.now() - startTime, JSON.stringify(response).length);
    return res.status(statusCode).json(response);

  } catch (error) {
    railwayLogger.error('Railway monitor endpoint error', {
      action: action || 'status',
      tmdbId,
      duration: Date.now() - startTime,
      error: error.message
    }, error);

    apiLogger.apiResponse('GET', '/api/railway-monitor', 500, Date.now() - startTime);
    
    return res.status(500).json({
      service: 'Railway PostgreSQL Monitor',
      status: 'error',
      timestamp: new Date().toISOString(),
      action: action || 'status',
      error: error.message,
      duration: Date.now() - startTime
    });
  }
}