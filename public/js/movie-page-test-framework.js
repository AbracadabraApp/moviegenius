/**
 * Movie Page Test Framework
 * Systematic debugging tool for movie page 404 redirect issues
 */

class MoviePageTestFramework {
  constructor() {
    this.logs = [];
    this.errors = [];
    this.performanceMetrics = [];
    this.networkRequests = [];
    this.renderingEvents = [];
    this.redirectDetected = false;
    this.pageLoadStages = {
      initialLoad: null,
      htmlReceived: null,
      jsExecuted: null,
      reactHydrated: null,
      redirectOccurred: null
    };
  }

  // Log general messages with movie page context
  log(message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data: {
        ...data,
        url: window.location.href,
        pathname: window.location.pathname,
        stage: this.getCurrentStage()
      },
    };
    this.logs.push(logEntry);
    console.log('[MOVIE-PAGE-TEST]', logEntry);
  }

  // Capture errors with enhanced context
  captureError(error) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      pathname: window.location.pathname,
      stage: this.getCurrentStage(),
      isMoviePage: this.isMoviePage(),
      movieId: this.getMovieId()
    };
    this.errors.push(errorEntry);
    console.error('[MOVIE-PAGE-ERROR]', errorEntry);
  }

  // Detect if we're on a movie page
  isMoviePage() {
    return window.location.pathname.startsWith('/movie/');
  }

  // Extract movie ID from URL
  getMovieId() {
    const match = window.location.pathname.match(/\/movie\/(\d+)/);
    return match ? match[1] : null;
  }

  // Get current loading stage
  getCurrentStage() {
    if (this.pageLoadStages.redirectOccurred) return 'redirected';
    if (this.pageLoadStages.reactHydrated) return 'hydrated';
    if (this.pageLoadStages.jsExecuted) return 'js-executed';
    if (this.pageLoadStages.htmlReceived) return 'html-received';
    if (this.pageLoadStages.initialLoad) return 'initial-load';
    return 'unknown';
  }

  // Track network requests with movie page specifics
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
        isSupabaseRequest: args[0].toString().includes('supabase'),
        isAnalysisRequest: args[0].toString().includes('analysis'),
        movieId: self.getMovieId()
      };

      try {
        const response = await originalFetch(...args);
        requestInfo.status = response.status;
        requestInfo.duration = performance.now() - startTime;
        
        // Try to capture response for debugging
        try {
          const responseText = await response.clone().text();
          if (responseText.includes('404') || responseText.includes('error')) {
            requestInfo.response = responseText.substring(0, 500); // First 500 chars
          } else {
            requestInfo.response = 'Success response';
          }
        } catch (e) {
          requestInfo.response = 'Could not read response';
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

  // Monitor rendering events specifically for flickering detection
  monitorRendering() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const renderEvent = {
          timestamp: new Date().toISOString(),
          type: mutation.type,
          target: mutation.target.nodeName,
          addedNodes: mutation.addedNodes.length,
          removedNodes: mutation.removedNodes.length,
          stage: this.getCurrentStage(),
          movieId: this.getMovieId()
        };
        this.renderingEvents.push(renderEvent);
        
        // Detect potential flickering (rapid DOM changes)
        if (mutation.addedNodes.length > 0 && mutation.removedNodes.length > 0) {
          this.log('Potential flickering detected', renderEvent);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }

  // Monitor for 404 redirects
  monitorRedirects() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    const self = this;

    // Intercept programmatic navigation
    history.pushState = function(...args) {
      self.log('History pushState', { newUrl: args[2] });
      if (args[2] && args[2].includes('404')) {
        self.redirectDetected = true;
        self.pageLoadStages.redirectOccurred = new Date().toISOString();
        self.log('404 redirect detected via pushState', { url: args[2] });
      }
      return originalPushState.apply(this, args);
    };

    history.replaceState = function(...args) {
      self.log('History replaceState', { newUrl: args[2] });
      if (args[2] && args[2].includes('404')) {
        self.redirectDetected = true;
        self.pageLoadStages.redirectOccurred = new Date().toISOString();
        self.log('404 redirect detected via replaceState', { url: args[2] });
      }
      return originalReplaceState.apply(this, args);
    };

    // Monitor for URL changes
    window.addEventListener('popstate', (event) => {
      self.log('Popstate event', { 
        newUrl: window.location.href,
        state: event.state 
      });
    });

    // Check for 404 errors in page content
    const checkFor404Content = () => {
      const bodyText = document.body.textContent || '';
      if (bodyText.includes('404') || bodyText.includes('Page not found') || 
          bodyText.includes('An error 404 occurred on server')) {
        self.redirectDetected = true;
        self.pageLoadStages.redirectOccurred = new Date().toISOString();
        self.log('404 content detected in DOM', { bodyLength: bodyText.length });
      }
    };

    // Check periodically and on DOM changes
    setInterval(checkFor404Content, 1000);
    setTimeout(checkFor404Content, 100);
    setTimeout(checkFor404Content, 500);
  }

  // Measure performance metrics
  measurePerformance() {
    const metrics = {
      timestamp: new Date().toISOString(),
      movieId: this.getMovieId(),
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      paintTiming: this.getPaintTiming(),
      redirectDetected: this.redirectDetected,
      loadStages: this.pageLoadStages
    };
    this.performanceMetrics.push(metrics);
    this.log('Performance metrics captured', metrics);
  }

  // Get paint timing
  getPaintTiming() {
    const paintEntries = performance.getEntriesByType('paint');
    return paintEntries.reduce((acc, entry) => {
      acc[entry.name] = entry.startTime;
      return acc;
    }, {});
  }

  // Capture console errors with movie page context
  captureConsoleErrors() {
    const originalError = console.error;
    const originalWarn = console.warn;
    const self = this;
    
    console.error = (...args) => {
      self.captureError(new Error(args.join(' ')));
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      self.log('Console warning', { message: args.join(' ') });
      originalWarn.apply(console, args);
    };
  }

  // Track page load stages
  trackLoadStages() {
    this.pageLoadStages.initialLoad = new Date().toISOString();
    
    document.addEventListener('DOMContentLoaded', () => {
      this.pageLoadStages.htmlReceived = new Date().toISOString();
      this.log('DOM content loaded');
    });

    window.addEventListener('load', () => {
      this.pageLoadStages.jsExecuted = new Date().toISOString();
      this.log('Window loaded');
      this.measurePerformance();
    });

    // Detect React hydration (if React is present)
    if (typeof React !== 'undefined') {
      setTimeout(() => {
        this.pageLoadStages.reactHydrated = new Date().toISOString();
        this.log('React hydration detected');
      }, 100);
    }
  }

  // Generate comprehensive report
  generateReport() {
    return {
      summary: {
        movieId: this.getMovieId(),
        isMoviePage: this.isMoviePage(),
        redirectDetected: this.redirectDetected,
        totalErrors: this.errors.length,
        totalNetworkRequests: this.networkRequests.length,
        loadStages: this.pageLoadStages,
        testDuration: Date.now() - (new Date(this.pageLoadStages.initialLoad).getTime())
      },
      logs: this.logs,
      errors: this.errors,
      networkRequests: this.networkRequests,
      performanceMetrics: this.performanceMetrics,
      renderingEvents: this.renderingEvents.slice(-50) // Last 50 events
    };
  }

  // Save report with movie page context
  saveReport() {
    const report = this.generateReport();
    const reportKey = `movie-page-test-${this.getMovieId()}-${Date.now()}`;
    localStorage.setItem(reportKey, JSON.stringify(report));
    
    // Also save latest report
    localStorage.setItem('latest-movie-page-test', JSON.stringify(report));
    
    // Send to server for analysis
    this.sendReportToServer(report);
    
    this.log('Test report saved', { 
      reportKey, 
      reportSize: JSON.stringify(report).length,
      redirectDetected: this.redirectDetected
    });
    
    return report;
  }

  // Send report to server for analysis
  async sendReportToServer(report) {
    try {
      const response = await fetch('/api/test-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report)
      });
      
      if (response.ok) {
        this.log('Report sent to server successfully');
      } else {
        this.log('Failed to send report to server', { status: response.status });
      }
    } catch (error) {
      this.log('Error sending report to server', { error: error.message });
    }
  }

  // Initialize framework
  init() {
    this.log('Movie page test framework initializing', {
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    this.trackLoadStages();
    this.interceptNetwork();
    this.monitorRendering();
    this.monitorRedirects();
    this.captureConsoleErrors();
    
    window.addEventListener('error', (event) => this.captureError(event.error));
    window.addEventListener('unhandledrejection', (event) => 
      this.captureError(new Error('Unhandled promise rejection: ' + event.reason))
    );
    
    // Auto-save report after 10 seconds and on page unload
    setTimeout(() => this.saveReport(), 10000);
    window.addEventListener('beforeunload', () => this.saveReport());
    
    this.log('Movie page test framework initialized');
  }
}

// Initialize framework immediately if on movie page
if (window.location.pathname.startsWith('/movie/')) {
  const moviePageTester = new MoviePageTestFramework();
  moviePageTester.init();
  
  // Make available globally for manual testing
  window.moviePageTester = moviePageTester;
  window.generateMoviePageReport = () => {
    const report = moviePageTester.generateReport();
    console.log('Movie Page Test Report:', report);
    moviePageTester.saveReport();
    return report;
  };
}