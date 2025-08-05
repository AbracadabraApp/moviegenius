// lib/observability/frontend-logger.js - Client-side error tracking and performance monitoring
// Captures JavaScript errors, API failures, performance issues, and user experience problems

class FrontendLogger {
  constructor() {
    this.initialized = false;
    this.errorQueue = [];
    this.maxQueueSize = 50;
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.pageLoadTime = null;
    
    // Initialize if running in browser
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  initialize() {
    if (this.initialized) return;
    
    // Capture page load time
    if (document.readyState === 'complete') {
      this.capturePageLoadTime();
    } else {
      window.addEventListener('load', () => this.capturePageLoadTime());
    }
    
    // Global error handler
    window.addEventListener('error', this.handleGlobalError.bind(this));
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // Performance observer for long tasks
    if ('PerformanceObserver' in window) {
      try {
        const perfObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 100) { // Tasks longer than 100ms
              this.logPerformanceIssue('long_task', {
                duration: entry.duration,
                start_time: entry.startTime,
                name: entry.name
              });
            }
          }
        });
        perfObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        // PerformanceObserver not supported or failed
        console.warn('PerformanceObserver failed to initialize:', error);
      }
    }
    
    // Capture navigation timing
    this.captureNavigationTiming();
    
    this.initialized = true;
    console.log('🔍 Frontend error tracking initialized');
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  capturePageLoadTime() {
    if (performance && performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      this.pageLoadTime = loadTime;
      
      if (loadTime > 3000) { // Slow page load
        this.logPerformanceIssue('slow_page_load', {
          load_time: loadTime,
          dom_content_loaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          first_paint: this.getFirstPaint()
        });
      }
    }
  }

  getFirstPaint() {
    if (performance && performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
      return firstPaint ? firstPaint.startTime : null;
    }
    return null;
  }

  captureNavigationTiming() {
    if (performance && performance.getEntriesByType) {
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        this.logPerformanceData('navigation_timing', {
          dns_lookup: nav.domainLookupEnd - nav.domainLookupStart,
          tcp_connect: nav.connectEnd - nav.connectStart,
          request_response: nav.responseEnd - nav.requestStart,
          dom_processing: nav.domContentLoadedEventEnd - nav.responseEnd,
          total_load_time: nav.loadEventEnd - nav.navigationStart
        });
      }
    }
  }

  handleGlobalError(event) {
    const errorData = {
      error_message: event.message,
      filename: event.filename,
      line_number: event.lineno,
      column_number: event.colno,
      error_stack: event.error ? event.error.stack : null,
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    this.logError('javascript_error', 'global_handler', errorData);
  }

  handleUnhandledRejection(event) {
    const errorData = {
      error_message: event.reason ? event.reason.toString() : 'Unhandled promise rejection',
      promise_rejection: true,
      reason: event.reason,
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    this.logError('promise_rejection', 'global_handler', errorData);
  }

  // Log different types of frontend issues
  logError(type, source, data) {
    this.sendToTracking('frontend_error', source, {
      error_type: type,
      ...data,
      session_id: this.sessionId,
      page_load_time: this.pageLoadTime,
      time_on_page: Date.now() - this.startTime
    });
  }

  logApiError(endpoint, status, response, duration) {
    this.sendToTracking('api_error', 'fetch_handler', {
      endpoint,
      status,
      response_preview: typeof response === 'string' ? response.substring(0, 200) : JSON.stringify(response).substring(0, 200),
      duration,
      url: window.location.href,
      session_id: this.sessionId,
      timestamp: new Date().toISOString()
    });
  }

  logPerformanceIssue(issueType, data) {
    this.sendToTracking('performance_issue', 'performance_observer', {
      issue_type: issueType,
      ...data,
      url: window.location.href,
      session_id: this.sessionId,
      memory_usage: this.getMemoryUsage(),
      timestamp: new Date().toISOString()
    });
  }

  logPerformanceData(metricType, data) {
    this.sendToTracking('performance_data', 'performance_api', {
      metric_type: metricType,
      ...data,
      url: window.location.href,
      session_id: this.sessionId,
      timestamp: new Date().toISOString()
    });
  }

  logUserExperienceIssue(issueType, details) {
    this.sendToTracking('ux_issue', 'user_interaction', {
      issue_type: issueType,
      details,
      url: window.location.href,
      session_id: this.sessionId,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: new Date().toISOString()
    });
  }

  // Movie-specific logging
  logMoviePageError(tmdbId, errorType, details) {
    this.sendToTracking('movie_page_error', 'movie_component', {
      tmdb_id: tmdbId,
      error_type: errorType,
      details,
      url: window.location.href,
      session_id: this.sessionId,
      timestamp: new Date().toISOString()
    });
  }

  logMovieAnalysisError(tmdbId, analysisError, apiResponse) {
    this.sendToTracking('movie_analysis_error', 'analysis_component', {
      tmdb_id: tmdbId,
      analysis_error: analysisError,
      api_response_preview: JSON.stringify(apiResponse).substring(0, 300),
      url: window.location.href,
      session_id: this.sessionId,
      timestamp: new Date().toISOString()
    });
  }

  logSearchError(query, errorType, details) {
    this.sendToTracking('search_error', 'search_component', {
      search_query: query,
      error_type: errorType,
      details,
      url: window.location.href,
      session_id: this.sessionId,
      timestamp: new Date().toISOString()
    });
  }

  // Utility methods
  getMemoryUsage() {
    if (performance && performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }

  sendToTracking(type, source, data) {
    // Add to queue
    this.errorQueue.push({ type, source, data, timestamp: Date.now() });
    
    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Send immediately for critical errors
    if (type === 'frontend_error' || type === 'javascript_error') {
      this.flushQueue();
    } else {
      // Batch send other errors
      this.debouncedFlush();
    }
  }

  flushQueue() {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    // Send each error to the tracking endpoint
    errors.forEach(error => {
      fetch('/api/error-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId
        },
        body: JSON.stringify(error)
      }).catch(fetchError => {
        // Re-queue critical errors if send fails
        if (error.type === 'frontend_error' || error.type === 'javascript_error') {
          this.errorQueue.push(error);
        }
        console.warn('Failed to send error to tracking:', fetchError);
      });
    });
  }

  debouncedFlush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    
    this.flushTimeout = setTimeout(() => {
      this.flushQueue();
    }, 2000); // Batch errors every 2 seconds
  }

  // Public API for manual error reporting
  reportError(message, context = {}) {
    this.logError('manual_report', 'user_report', {
      error_message: message,
      context,
      manual_report: true
    });
  }

  reportPerformanceIssue(description, metrics = {}) {
    this.logPerformanceIssue('manual_report', {
      description,
      metrics,
      manual_report: true
    });
  }

  // Get current session info for debugging
  getSessionInfo() {
    return {
      session_id: this.sessionId,
      start_time: this.startTime,
      page_load_time: this.pageLoadTime,
      time_on_page: Date.now() - this.startTime,
      errors_queued: this.errorQueue.length,
      memory_usage: this.getMemoryUsage(),
      url: window.location.href
    };
  }
}

// Create singleton instance
const frontendLogger = new FrontendLogger();

// Enhanced fetch wrapper for API error tracking
const originalFetch = typeof window !== 'undefined' ? window.fetch : null;
if (originalFetch) {
  window.fetch = function(...args) {
    const startTime = Date.now();
    const url = args[0];
    
    return originalFetch.apply(this, args)
      .then(response => {
        const duration = Date.now() - startTime;
        
        // Log slow API responses
        if (duration > 5000) {
          frontendLogger.logPerformanceIssue('slow_api_response', {
            url,
            duration,
            status: response.status
          });
        }
        
        // Log API errors
        if (!response.ok) {
          response.clone().text().then(responseText => {
            frontendLogger.logApiError(url, response.status, responseText, duration);
          }).catch(() => {
            frontendLogger.logApiError(url, response.status, 'Unable to read response', duration);
          });
        }
        
        return response;
      })
      .catch(error => {
        const duration = Date.now() - startTime;
        frontendLogger.logApiError(url, 0, error.message, duration);
        throw error;
      });
  };
}

export default frontendLogger;