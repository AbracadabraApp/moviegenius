// lib/observability/logger.js - Production-ready logging system for MovieGenius
// Provides structured logging with context, error tracking, and production observability

export class Logger {
  constructor(context = 'app') {
    this.context = context;
    this.metadata = {
      timestamp: () => new Date().toISOString(),
      deploymentId: process.env.RAILWAY_DEPLOYMENT_ID || 'local',
      nodeEnv: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    };
    
    // Initialize error tracking
    this.errorCount = 0;
    this.errorHistory = [];
    this.maxErrorHistory = 100;
  }

  // Core logging method with structured output
  _log(level, message, data = {}, error = null) {
    const logEntry = {
      timestamp: this.metadata.timestamp(),
      level: level.toUpperCase(),
      context: this.context,
      message,
      data,
      deployment: {
        id: this.metadata.deploymentId,
        environment: this.metadata.nodeEnv,
        version: this.metadata.version
      }
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      };
      
      // Track error for monitoring
      this.errorCount++;
      this.errorHistory.unshift({
        ...logEntry,
        errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      
      // Keep error history manageable
      if (this.errorHistory.length > this.maxErrorHistory) {
        this.errorHistory.pop();
      }
    }

    // Output based on environment
    if (this.metadata.nodeEnv === 'production') {
      // Production: JSON for log aggregation systems
      console.log(JSON.stringify(logEntry));
    } else {
      // Development: Human-readable format
      const prefix = `[${logEntry.timestamp}] ${level.toUpperCase()} [${this.context}]`;
      console.log(`${prefix} ${message}`, data, error || '');
    }

    return logEntry;
  }

  // Convenience methods
  info(message, data = {}) {
    return this._log('info', message, data);
  }

  warn(message, data = {}) {
    return this._log('warn', message, data);
  }

  error(message, data = {}, error = null) {
    return this._log('error', message, data, error);
  }

  debug(message, data = {}) {
    if (this.metadata.nodeEnv === 'development' || process.env.DEBUG_LOGS === 'true') {
      return this._log('debug', message, data);
    }
  }

  // Database-specific logging
  dbQuery(query, params = [], duration = null, rowCount = null) {
    return this.info('Database query executed', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      paramCount: params.length,
      duration: duration ? `${duration}ms` : 'unknown',
      rowCount,
      operation: this._extractDbOperation(query)
    });
  }

  dbError(query, params = [], error) {
    return this.error('Database query failed', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      paramCount: params.length,
      operation: this._extractDbOperation(query),
      errorCode: error.code,
      errorDetail: error.detail
    }, error);
  }

  // API-specific logging
  apiRequest(method, path, params = {}, userId = null) {
    return this.info('API request received', {
      method,
      path,
      paramCount: Object.keys(params).length,
      userId,
      userAgent: params.userAgent?.substring(0, 100)
    });
  }

  apiResponse(method, path, statusCode, duration = null, dataSize = null) {
    const level = statusCode >= 400 ? 'error' : (statusCode >= 300 ? 'warn' : 'info');
    return this._log(level, 'API response sent', {
      method,
      path,
      statusCode,
      duration: duration ? `${duration}ms` : 'unknown',
      dataSize,
      success: statusCode < 400
    });
  }

  // Railway-specific logging
  railwayConnection(status, details = {}) {
    const level = status === 'connected' ? 'info' : 'error';
    return this._log(level, `Railway PostgreSQL ${status}`, {
      databaseUrl: details.url ? 'configured' : 'missing',
      ssl: details.ssl || 'unknown',
      maxConnections: details.maxConnections || 'default',
      connectionTime: details.connectionTime
    });
  }

  // Movie analysis specific logging
  movieAnalysis(tmdbId, status, details = {}) {
    return this.info('Movie analysis request', {
      tmdbId,
      status, // 'started' | 'completed' | 'cached' | 'failed'
      source: details.source, // 'database' | 'static' | 'api'
      analysisLength: details.content?.length,
      hasEntities: !!details.entities,
      processingTime: details.duration
    });
  }

  // Critical path monitoring
  criticalPath(path, status, details = {}) {
    const level = status === 'success' ? 'info' : 'error';
    return this._log(level, `Critical path: ${path}`, {
      status,
      duration: details.duration,
      checkpoints: details.checkpoints,
      failurePoint: details.failurePoint
    });
  }

  // Performance monitoring
  performance(metric, value, context = {}) {
    return this.info('Performance metric', {
      metric,
      value,
      unit: context.unit || 'ms',
      threshold: context.threshold,
      isSlowQuery: context.threshold && value > context.threshold,
      context
    });
  }

  // Get current error statistics
  getErrorStats() {
    return {
      totalErrors: this.errorCount,
      recentErrors: this.errorHistory.slice(0, 10),
      errorRate: this._calculateErrorRate(),
      lastError: this.errorHistory[0] || null
    };
  }

  // Helper methods
  _extractDbOperation(query) {
    const operation = query.trim().split(' ')[0].toUpperCase();
    return ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'].includes(operation) 
      ? operation : 'UNKNOWN';
  }

  _calculateErrorRate() {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(
      err => new Date(err.timestamp).getTime() > fiveMinutesAgo
    );
    return {
      count: recentErrors.length,
      period: '5min',
      timestamp: new Date().toISOString()
    };
  }

  // Create child logger with additional context
  child(additionalContext) {
    const childLogger = new Logger(`${this.context}:${additionalContext}`);
    childLogger.errorCount = this.errorCount;
    childLogger.errorHistory = this.errorHistory;
    return childLogger;
  }
}

// Global logger instances
export const logger = new Logger('app');
export const dbLogger = new Logger('database');
export const apiLogger = new Logger('api');
export const railwayLogger = new Logger('railway');

// Convenience function to create context-specific loggers
export function createLogger(context) {
  return new Logger(context);
}

// Log startup information
logger.info('MovieGenius logging system initialized', {
  environment: process.env.NODE_ENV,
  deployment: process.env.RAILWAY_DEPLOYMENT_ID || 'local',
  timestamp: new Date().toISOString()
});