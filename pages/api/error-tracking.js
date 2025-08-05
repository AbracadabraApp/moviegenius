// pages/api/error-tracking.js - Frontend error tracking and monitoring
// Collects frontend errors, JavaScript exceptions, and user experience issues

import { logger, apiLogger } from '../../lib/observability/logger.js';

// In-memory error storage (in production, this would go to a database or external service)
let errorStorage = [];
const MAX_ERRORS = 1000; // Keep last 1000 errors

export default async function handler(req, res) {
  const startTime = Date.now();
  
  if (req.method === 'POST') {
    return await handleErrorReport(req, res, startTime);
  } else if (req.method === 'GET') {
    return await handleErrorRetrieval(req, res, startTime);
  }
  
  apiLogger.apiResponse('*', '/api/error-tracking', 405, Date.now() - startTime);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleErrorReport(req, res, startTime) {
  try {
    const { type, source, data } = req.body;
    
    if (!type || !source || !data) {
      apiLogger.apiResponse('POST', '/api/error-tracking', 400, Date.now() - startTime);
      return res.status(400).json({ 
        error: 'Missing required fields: type, source, data' 
      });
    }

    // Create error record
    const errorRecord = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      source,
      data,
      timestamp: new Date().toISOString(),
      server_received: Date.now(),
      user_session: req.headers['x-session-id'] || 'anonymous',
      ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown',
      user_agent: req.headers['user-agent'] || 'unknown'
    };

    // Store error (in production, save to database)
    errorStorage.unshift(errorRecord);
    if (errorStorage.length > MAX_ERRORS) {
      errorStorage = errorStorage.slice(0, MAX_ERRORS);
    }

    // Log error based on type and severity
    const logLevel = determineLogLevel(type, data);
    const logMessage = createLogMessage(type, source, data);
    
    logger[logLevel](logMessage, {
      error_id: errorRecord.id,
      type,
      source,
      url: data.url,
      error_message: data.error_message,
      component_stack: data.component_stack,
      retry_count: data.retry_count,
      user_agent: errorRecord.user_agent,
      frontend_error: true
    });

    // Track critical errors separately
    if (logLevel === 'error') {
      logger.criticalPath('frontend_stability', 'failure', {
        error_type: type,
        source,
        error_message: data.error_message,
        url: data.url,
        failure_point: 'frontend_rendering'
      });
    }

    apiLogger.apiResponse('POST', '/api/error-tracking', 200, Date.now() - startTime);
    return res.status(200).json({
      success: true,
      error_id: errorRecord.id,
      message: 'Error tracked successfully'
    });

  } catch (error) {
    logger.error('Error tracking endpoint failed', {
      error: error.message,
      request_body: req.body
    }, error);

    apiLogger.apiResponse('POST', '/api/error-tracking', 500, Date.now() - startTime);
    return res.status(500).json({
      error: 'Failed to track error',
      message: error.message
    });
  }
}

async function handleErrorRetrieval(req, res, startTime) {
  try {
    const { 
      limit = 50, 
      type, 
      source, 
      since, 
      format = 'detailed' 
    } = req.query;

    apiLogger.apiRequest('GET', '/api/error-tracking', req.query);

    let filteredErrors = [...errorStorage];

    // Apply filters
    if (type) {
      filteredErrors = filteredErrors.filter(err => err.type === type);
    }
    
    if (source) {
      filteredErrors = filteredErrors.filter(err => err.source === source);
    }
    
    if (since) {
      const sinceDate = new Date(since);
      filteredErrors = filteredErrors.filter(err => 
        new Date(err.timestamp) > sinceDate
      );
    }

    // Limit results
    const limitedErrors = filteredErrors.slice(0, parseInt(limit));

    // Generate summary statistics
    const summary = generateErrorSummary(filteredErrors);

    let response;
    if (format === 'simple') {
      response = {
        total_errors: filteredErrors.length,
        recent_errors: limitedErrors.length,
        error_rate: summary.error_rate,
        critical_errors: summary.critical_count,
        timestamp: new Date().toISOString()
      };
    } else {
      response = {
        service: 'MovieGenius Error Tracking',
        timestamp: new Date().toISOString(),
        summary,
        errors: limitedErrors,
        filters_applied: {
          type: type || 'all',
          source: source || 'all',
          since: since || 'all_time',
          limit: parseInt(limit)
        }
      };
    }

    apiLogger.apiResponse('GET', '/api/error-tracking', 200, Date.now() - startTime, JSON.stringify(response).length);
    return res.status(200).json(response);

  } catch (error) {
    logger.error('Error retrieval failed', { error: error.message }, error);
    
    apiLogger.apiResponse('GET', '/api/error-tracking', 500, Date.now() - startTime);
    return res.status(500).json({
      error: 'Failed to retrieve errors',
      message: error.message
    });
  }
}

function determineLogLevel(type, data) {
  // Critical frontend errors
  if (type === 'frontend_error' && data.error_boundary) {
    return 'error';
  }
  
  // JavaScript runtime errors
  if (type === 'javascript_error') {
    return 'error';
  }
  
  // API failures from frontend
  if (type === 'api_error' && data.status >= 500) {
    return 'error';
  }
  
  // Performance issues
  if (type === 'performance_issue') {
    return 'warn';
  }
  
  // User experience issues
  if (type === 'ux_issue') {
    return 'warn';
  }
  
  // Default to info level
  return 'info';
}

function createLogMessage(type, source, data) {
  switch (type) {
    case 'frontend_error':
      return `Frontend error in ${source}: ${data.error_message || 'Unknown error'}`;
    
    case 'javascript_error':
      return `JavaScript error: ${data.error_message || 'Unknown JS error'}`;
    
    case 'api_error':
      return `Frontend API error: ${data.endpoint} returned ${data.status}`;
    
    case 'performance_issue':
      return `Performance issue in ${source}: ${data.metric} took ${data.duration}ms`;
    
    case 'ux_issue':
      return `UX issue in ${source}: ${data.issue_type}`;
    
    default:
      return `Frontend event: ${type} from ${source}`;
  }
}

function generateErrorSummary(errors) {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  const recentErrors = errors.filter(err => err.server_received > oneHourAgo);
  const dailyErrors = errors.filter(err => err.server_received > oneDayAgo);
  
  const errorTypes = errors.reduce((acc, err) => {
    acc[err.type] = (acc[err.type] || 0) + 1;
    return acc;
  }, {});
  
  const errorSources = errors.reduce((acc, err) => {
    acc[err.source] = (acc[err.source] || 0) + 1;
    return acc;
  }, {});
  
  const criticalErrors = errors.filter(err => 
    err.type === 'frontend_error' || err.type === 'javascript_error'
  );
  
  return {
    total_errors: errors.length,
    recent_errors_1h: recentErrors.length,
    daily_errors_24h: dailyErrors.length,
    error_rate: recentErrors.length > 0 ? `${recentErrors.length}/hour` : '0/hour',
    critical_count: criticalErrors.length,
    error_types: errorTypes,
    error_sources: errorSources,
    most_common_error: Object.entries(errorTypes).sort((a, b) => b[1] - a[1])[0] || null,
    last_error: errors[0] ? {
      timestamp: errors[0].timestamp,
      type: errors[0].type,
      source: errors[0].source,
      message: errors[0].data.error_message
    } : null
  };
}