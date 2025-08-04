// Centralized logging utility
class TestFramework {
  constructor() {
    this.logs = [];
    this.errors = [];
    this.performanceMetrics = [];
    this.networkRequests = [];
  }

  // Log general messages
  log(message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data,
    };
    this.logs.push(logEntry);
    console.log('[TEST]', logEntry);
  }

  // Capture errors
  captureError(error) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      url: window.location.href,
    };
    this.errors.push(errorEntry);
    console.error('[TEST ERROR]', errorEntry);
  }

  // Track network requests
  interceptNetwork() {
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = async (...args) => {
      const startTime = performance.now();
      const requestInfo = {
        timestamp: new Date().toISOString(),
        url: args[0],
        method: args[1]?.method || 'GET',
        status: null,
        duration: null,
        response: null,
        error: null,
      };

      try {
        const response = await originalFetch(...args);
        requestInfo.status = response.status;
        requestInfo.duration = performance.now() - startTime;
        try {
          requestInfo.response = await response.clone().json();
        } catch (e) {
          requestInfo.response = 'Non-JSON response';
        }
        self.networkRequests.push(requestInfo);
        self.log('Network request completed', requestInfo);
        return response;
      } catch (error) {
        requestInfo.error = error.message;
        requestInfo.duration = performance.now() - startTime;
        self.networkRequests.push(requestInfo);
        self.captureError(error);
        throw error;
      }
    };
  }

  // Monitor rendering events (for flickering detection)
  monitorRendering() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const renderEvent = {
          timestamp: new Date().toISOString(),
          type: mutation.type,
          target: mutation.target.nodeName,
          addedNodes: mutation.addedNodes.length,
          removedNodes: mutation.removedNodes.length,
        };
        this.log('DOM mutation detected', renderEvent);
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }

  // Measure performance metrics
  measurePerformance() {
    const metrics = {
      timestamp: new Date().toISOString(),
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      paintTiming: this.getPaintTiming(),
    };
    this.performanceMetrics.push(metrics);
    this.log('Performance metrics', metrics);
  }

  // Get First Contentful Paint (FCP) or similar
  getPaintTiming() {
    const paintEntries = performance.getEntriesByType('paint');
    return paintEntries.reduce((acc, entry) => {
      acc[entry.name] = entry.startTime;
      return acc;
    }, {});
  }

  // Capture console errors
  captureConsoleErrors() {
    const originalError = console.error;
    const self = this;
    console.error = (...args) => {
      self.captureError(new Error(args.join(' ')));
      originalError.apply(console, args);
    };
  }

  // Generate report
  generateReport() {
    return {
      logs: this.logs,
      errors: this.errors,
      networkRequests: this.networkRequests,
      performanceMetrics: this.performanceMetrics,
    };
  }

  // Save report to localStorage or send to server
  saveReport() {
    const report = this.generateReport();
    localStorage.setItem('testFrameworkReport', JSON.stringify(report));
    // Optionally send to server
    // fetch('/api/test-report', { method: 'POST', body: JSON.stringify(report) });
    this.log('Report saved', { reportSize: JSON.stringify(report).length });
  }

  // Initialize framework
  init() {
    this.interceptNetwork();
    this.monitorRendering();
    this.captureConsoleErrors();
    window.addEventListener('error', (event) => this.captureError(event.error));
    window.addEventListener('load', () => this.measurePerformance());
    this.log('Testing framework initialized');
  }
}

// Usage: Initialize the framework
const tester = new TestFramework();
tester.init();

// Export report manually if needed
window.generateTestReport = () => {
  const report = tester.generateReport();
  console.log('Test Report:', report);
  tester.saveReport();
  return report;
};