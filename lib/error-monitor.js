// Error monitoring and alerting system for MovieGenius
// Provides production error tracking and alerting

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class ErrorMonitor {
  constructor() {
    this.enabled = process.env.NODE_ENV === 'production';
    this.environment = process.env.NODE_ENV || 'development';
    this.deploymentId = process.env.RAILWAY_DEPLOYMENT_ID || 'local';
  }

  async logError(error, context = {}) {
    if (!this.enabled) {
      console.error('Development Error:', error);
      return;
    }

    const errorData = {
      message: error.message || 'Unknown error',
      stack: error.stack || '',
      name: error.name || 'Error',
      timestamp: new Date().toISOString(),
      environment: this.environment,
      deployment_id: this.deploymentId,
      context: JSON.stringify(context),
      severity: this.determineSeverity(error, context),
      user_agent: context.userAgent || null,
      url: context.url || null,
      user_id: context.userId || null,
    };

    try {
      // Log to Supabase for persistence
      const { error: dbError } = await supabase.from('error_logs').insert([errorData]);

      if (dbError) {
        console.error('Failed to log error to database:', dbError);
      }

      // Console log for immediate visibility
      console.error(`[${errorData.severity}] ${errorData.message}`, {
        context: errorData.context,
        stack: errorData.stack,
      });

      // Check if we need to send alerts
      await this.checkAlertThresholds(errorData);
    } catch (logError) {
      console.error('Error monitor failed to log error:', logError);
    }
  }

  determineSeverity(error, context) {
    // Critical: Database failures, payment processing, security issues
    if (
      error.message.includes('database') ||
      error.message.includes('connection') ||
      error.message.includes('auth') ||
      context.endpoint?.includes('/api/payment')
    ) {
      return 'critical';
    }

    // High: API failures, core functionality broken
    if (
      error.message.includes('API') ||
      error.message.includes('failed to fetch') ||
      context.endpoint?.includes('/api/ask-claude') ||
      context.endpoint?.includes('/api/movie-analysis')
    ) {
      return 'high';
    }

    // Medium: UI issues, non-critical features
    if (error.name === 'TypeError' || error.name === 'ReferenceError' || context.component) {
      return 'medium';
    }

    // Low: Everything else
    return 'low';
  }

  async checkAlertThresholds(errorData) {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    try {
      // Count recent errors of same severity
      const { data: recentErrors, error } = await supabase
        .from('error_logs')
        .select('id')
        .eq('severity', errorData.severity)
        .gte('timestamp', fiveMinutesAgo.toISOString());

      if (error) {
        console.error('Failed to check error thresholds:', error);
        return;
      }

      const errorCount = recentErrors?.length || 0;
      const thresholds = {
        critical: 1, // Alert immediately
        high: 3, // Alert after 3 in 5 minutes
        medium: 10, // Alert after 10 in 5 minutes
        low: 50, // Alert after 50 in 5 minutes
      };

      if (errorCount >= thresholds[errorData.severity]) {
        await this.sendAlert(errorData, errorCount);
      }
    } catch (thresholdError) {
      console.error('Failed to check alert thresholds:', thresholdError);
    }
  }

  async sendAlert(errorData, errorCount) {
    const alertData = {
      severity: errorData.severity,
      message: `${errorCount} ${errorData.severity} errors in last 5 minutes`,
      latest_error: errorData.message,
      error_count: errorCount,
      environment: errorData.environment,
      deployment_id: errorData.deployment_id,
      timestamp: new Date().toISOString(),
    };

    try {
      // Log alert to database
      await supabase.from('error_alerts').insert([alertData]);

      // In a production setup, you would send to:
      // - Slack webhook
      // - Discord webhook
      // - Email service
      // - PagerDuty
      // - etc.

      console.error(`🚨 ALERT [${alertData.severity.toUpperCase()}]: ${alertData.message}`);

      // For Railway, we can use console.error which appears in logs
      if (process.env.RAILWAY_ENVIRONMENT_NAME) {
        console.error(`Railway Alert: ${JSON.stringify(alertData)}`);
      }
    } catch (alertError) {
      console.error('Failed to send alert:', alertError);
    }
  }

  // Middleware for Express/Next.js API routes
  wrapApiRoute(handler) {
    return async (req, res) => {
      try {
        return await handler(req, res);
      } catch (error) {
        await this.logError(error, {
          endpoint: req.url,
          method: req.method,
          userAgent: req.headers['user-agent'],
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        });

        // Re-throw to maintain normal error handling
        throw error;
      }
    };
  }

  // React error boundary helper
  async logReactError(error, errorInfo, componentStack) {
    await this.logError(error, {
      component: true,
      componentStack,
      errorInfo: JSON.stringify(errorInfo),
      url: typeof window !== 'undefined' ? window.location.href : null,
    });
  }

  // Performance monitoring
  async logPerformanceIssue(metric, value, threshold) {
    if (value > threshold) {
      await this.logError(new Error(`Performance threshold exceeded: ${metric}`), {
        performance: true,
        metric,
        value,
        threshold,
        url: typeof window !== 'undefined' ? window.location.href : null,
      });
    }
  }

  // Health check for error monitoring system
  async healthCheck() {
    try {
      const testError = {
        message: 'Health check test',
        timestamp: new Date().toISOString(),
        environment: this.environment,
        deployment_id: this.deploymentId,
        context: '{}',
        severity: 'low',
      };

      const { error } = await supabase.from('error_logs').insert([testError]);

      if (error) {
        throw new Error(`Error monitoring health check failed: ${error.message}`);
      }

      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('Error monitoring health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// Create singleton instance
const errorMonitor = new ErrorMonitor();

// Export convenience functions
export const logError = (error, context) => errorMonitor.logError(error, context);
export const wrapApiRoute = handler => errorMonitor.wrapApiRoute(handler);
export const logReactError = (error, errorInfo, componentStack) =>
  errorMonitor.logReactError(error, errorInfo, componentStack);
export const logPerformanceIssue = (metric, value, threshold) =>
  errorMonitor.logPerformanceIssue(metric, value, threshold);
export const errorMonitorHealthCheck = () => errorMonitor.healthCheck();

export default errorMonitor;
