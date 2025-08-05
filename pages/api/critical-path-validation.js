// pages/api/critical-path-validation.js - Critical user journey validation endpoint
// Automated testing of essential user flows and system functionality

import { criticalPathValidator, validateCriticalPaths, validateAllPaths, validateSinglePath } from '../../lib/observability/critical-path-validator.js';
import { apiLogger, logger } from '../../lib/observability/logger.js';

export default async function handler(req, res) {
  const startTime = Date.now();
  
  apiLogger.apiRequest(req.method, '/api/critical-path-validation', req.query);
  
  if (req.method !== 'GET') {
    apiLogger.apiResponse(req.method, '/api/critical-path-validation', 405, Date.now() - startTime);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, path, format, tmdbId } = req.query;

  try {
    let result;
    let statusCode = 200;

    switch (action) {
      case 'validate-critical':
        logger.info('Starting critical path validation', { source: 'api_request' });
        result = await validateCriticalPaths();
        statusCode = result.summary.overall_status === 'critical' ? 503 : 200;
        break;

      case 'validate-all':
        logger.info('Starting full path validation', { source: 'api_request' });
        result = await validateAllPaths();
        statusCode = result.summary.overall_status === 'critical' ? 503 : 200;
        break;

      case 'validate-single':
        if (!path) {
          apiLogger.apiResponse('GET', '/api/critical-path-validation', 400, Date.now() - startTime);
          return res.status(400).json({ 
            error: 'path parameter required for validate-single action',
            available_paths: Array.from(criticalPathValidator.paths.keys())
          });
        }
        
        logger.info('Starting single path validation', { path, source: 'api_request' });
        const options = tmdbId ? { tmdbId: parseInt(tmdbId) } : {};
        result = await validateSinglePath(path, options);
        statusCode = result.status === 'failed' ? 503 : 200;
        break;

      case 'list-paths':
        result = {
          available_paths: Array.from(criticalPathValidator.paths.entries()).map(([id, config]) => ({
            id,
            name: config.name,
            description: config.description,
            critical: config.critical,
            step_count: config.steps.length,
            timeout: config.timeout
          }))
        };
        break;

      case 'history':
        const limit = parseInt(req.query.limit) || 10;
        const history = criticalPathValidator.getValidationHistory().slice(0, limit);
        result = {
          validation_history: history,
          total_validations: history.length
        };
        break;

      case 'status':
        // Quick status check
        const lastValidation = criticalPathValidator.getValidationHistory()[0];
        result = {
          last_validation: lastValidation ? {
            timestamp: lastValidation.started_at,
            overall_status: lastValidation.status,
            success_rate: lastValidation.success_rate,
            duration: lastValidation.duration,
            failure_point: lastValidation.failure_point
          } : null,
          system_status: lastValidation ? 
            (lastValidation.status === 'success' ? 'operational' : 
             lastValidation.status === 'degraded' ? 'degraded' : 'critical') : 'unknown'
        };
        break;

      default:
        // Default: run critical path validation
        logger.info('Starting default critical path validation', { source: 'api_request' });
        result = await validateCriticalPaths();
        statusCode = result.summary.overall_status === 'critical' ? 503 : 200;
    }

    // Format for monitoring systems
    if (format === 'simple') {
      const simpleResult = {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      if (result.summary) {
        simpleResult.overall_status = result.summary.overall_status;
        simpleResult.success_rate = result.summary.success_rate;
        simpleResult.critical_failed = result.summary.critical_failed;
        simpleResult.total_paths = result.summary.total_paths;
      } else if (result.status) {
        // Single path result
        simpleResult.path_status = result.status;
        simpleResult.success_rate = result.success_rate + '%';
        simpleResult.failure_point = result.failure_point;
      } else {
        simpleResult.action = action || 'status';
      }

      apiLogger.apiResponse('GET', '/api/critical-path-validation', statusCode, Date.now() - startTime);
      return res.status(statusCode).json(simpleResult);
    }

    // Full response
    const response = {
      service: 'MovieGenius Critical Path Validation',
      timestamp: new Date().toISOString(),
      action: action || 'validate-critical',
      duration: Date.now() - startTime,
      result,
      links: {
        self: '/api/critical-path-validation',
        validate_critical: '/api/critical-path-validation?action=validate-critical',
        validate_all: '/api/critical-path-validation?action=validate-all',
        list_paths: '/api/critical-path-validation?action=list-paths',
        history: '/api/critical-path-validation?action=history',
        status: '/api/critical-path-validation?action=status',
        health_dashboard: '/health-dashboard'
      }
    };

    // Log completion
    if (result.summary) {
      logger.info('Critical path validation completed', {
        action: action || 'validate-critical',
        duration: Date.now() - startTime,
        overall_status: result.summary.overall_status,
        success_rate: result.summary.success_rate,
        critical_failed: result.summary.critical_failed
      });
    }

    apiLogger.apiResponse('GET', '/api/critical-path-validation', statusCode, Date.now() - startTime, JSON.stringify(response).length);
    return res.status(statusCode).json(response);

  } catch (error) {
    logger.error('Critical path validation endpoint error', {
      action: action || 'default',
      path,
      duration: Date.now() - startTime,
      error: error.message
    }, error);

    apiLogger.apiResponse('GET', '/api/critical-path-validation', 500, Date.now() - startTime);
    
    return res.status(500).json({
      service: 'MovieGenius Critical Path Validation',
      status: 'error',
      timestamp: new Date().toISOString(),
      action: action || 'default',
      error: error.message,
      duration: Date.now() - startTime,
      message: 'Critical path validation failed'
    });
  }
}