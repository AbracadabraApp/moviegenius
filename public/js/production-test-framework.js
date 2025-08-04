// Production Testing Framework for Movie Page 404 Fix
class ProductionTestFramework {
  constructor(config = {}) {
    this.config = {
      hydrationTimeout: config.hydrationTimeout || 5000,
      rootSelector: config.rootSelector || '#__next',
      reportStorage: config.reportStorage || 'localStorage',
      staticAssets: config.staticAssets || ['/favicon.ico'],
      tmdbApiUrl: config.tmdbApiUrl || '/api/movie',
      nuclearPath: config.nuclearPath || 'nuclear-static',
      testRoutes: config.testRoutes || ['/movie/11', '/movie/550', '/film-noir/german-expressionism', '/'],
      testMovieIds: config.testMovieIds || ['11', '550'],
    };
    this.logs = [];
    this.errors = [];
    this.networkErrors = [];
    this.staticAssetErrors = [];
    this.tmdbErrors = [];
    this.nuclearErrors = [];
    this.hydrationStatus = 'pending';
    this.is404Page = false;
    this.performanceMetrics = [];
    this.routeTestResults = [];
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  log(message, data = {}) {
    const logEntry = { timestamp: this.getTimestamp(), message, data };
    this.logs.push(logEntry);
    console.log('[PROD-TEST]', logEntry);
  }

  interceptErrors() {
    const originalError = window.onerror;
    const self = this;

    window.onerror = function (message, source, lineno, colno, error) {
      const errorEntry = { timestamp: self.getTimestamp(), message, source, lineno, colno, error: error?.stack };
      self.errors.push(errorEntry);
      self.log('🚨 Error detected', errorEntry);
      if (originalError) originalError.apply(this, arguments);
    };

    // Also capture unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
      const errorEntry = { 
        timestamp: self.getTimestamp(), 
        message: 'Unhandled promise rejection', 
        reason: event.reason?.toString() || 'Unknown',
        stack: event.reason?.stack
      };
      self.errors.push(errorEntry);
      self.log('🚨 Promise rejection detected', errorEntry);
    });
  }

  interceptNetwork() {
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = async (...args) => {
      const startTime = performance.now();
      const requestInfo = {
        timestamp: self.getTimestamp(),
        url: args[0],
        method: args[1]?.method || 'GET',
        status: null,
        duration: null,
        error: null,
      };

      try {
        const response = await originalFetch(...args);
        requestInfo.status = response.status;
        requestInfo.duration = performance.now() - startTime;
        
        if (response.status === 404) {
          self.networkErrors.push(requestInfo);
          if (self.config.staticAssets.some((asset) => requestInfo.url.includes(asset))) {
            self.staticAssetErrors.push(requestInfo);
            self.log('🚨 Static asset 404 detected', requestInfo);
          } else if (requestInfo.url.includes(self.config.tmdbApiUrl)) {
            self.tmdbErrors.push(requestInfo);
            self.log('🚨 TMDB API 404 detected', requestInfo);
          } else if (requestInfo.url.includes(self.config.nuclearPath)) {
            self.nuclearErrors.push(requestInfo);
            self.log('🚨 Nuclear static file 404 detected', requestInfo);
          } else {
            self.is404Page = true;
            self.log('🚨 Resource 404 detected', requestInfo);
          }
        }
        
        self.log('Network request completed', requestInfo);
        return response;
      } catch (error) {
        requestInfo.error = error.message;
        requestInfo.duration = performance.now() - startTime;
        self.networkErrors.push(requestInfo);
        self.log('🚨 Network error', requestInfo);
        throw error;
      }
    };
  }

  testHydrationComplete() {
    const self = this;
    let attempts = 0;
    const maxAttempts = Math.ceil(this.config.hydrationTimeout / 100);

    const checkHydration = () => {
      attempts++;
      const hasRoot = document.querySelector(this.config.rootSelector);
      const hasNavBar = document.querySelector('nav') && document.querySelectorAll('a[href]').length >= 2;
      const hasContent = document.querySelector('h1, .movie-title, .container');

      if (hasRoot && hasNavBar && hasContent) {
        self.hydrationStatus = 'complete';
        self.log('✅ Hydration complete', {
          hasRoot: !!hasRoot,
          hasNavBar: !!hasNavBar,
          hasContent: !!hasContent,
          attempts
        });
        return;
      }

      if (attempts >= maxAttempts) {
        self.hydrationStatus = 'failed';
        self.log('❌ Hydration failed - timeout', {
          hasRoot: !!hasRoot,
          hasNavBar: !!hasNavBar,
          hasContent: !!hasContent,
          attempts
        });
        return;
      }

      setTimeout(checkHydration, 100);
    };

    setTimeout(checkHydration, 100);
  }

  testStaticAssets() {
    const results = this.config.staticAssets.map((asset) => {
      const isAvailable = !this.staticAssetErrors.some((err) => err.url.includes(asset));
      this.log(isAvailable ? `✅ Static asset available: ${asset}` : `❌ Static asset missing: ${asset}`);
      return isAvailable;
    });
    return results.every((r) => r);
  }

  async testNuclearStatic() {
    const results = await Promise.all(
      this.config.testMovieIds.map(async (tmdbId) => {
        try {
          // Try multiple potential nuclear static paths
          const paths = [
            `/nuclear-static/${tmdbId}.json`,
            `/_next/static/nuclear-static/${tmdbId}.json`,
            `/public/nuclear-static/${tmdbId}.json`
          ];
          
          let found = false;
          for (const path of paths) {
            try {
              const response = await fetch(path);
              if (response.ok) {
                found = true;
                this.log(`✅ Nuclear static file found: ${tmdbId} at ${path}`, { status: response.status });
                break;
              }
            } catch (e) {
              // Continue to next path
            }
          }
          
          if (!found) {
            this.nuclearErrors.push({ timestamp: this.getTimestamp(), tmdbId, paths });
            this.log(`❌ Nuclear static file missing: ${tmdbId}`, { testedPaths: paths });
          }
          
          return found;
        } catch (error) {
          this.nuclearErrors.push({ timestamp: this.getTimestamp(), error: error.message });
          this.log('🚨 Nuclear static file error', { error: error.message });
          return false;
        }
      })
    );
    return results.some((r) => r); // At least one should work
  }

  async testTmdbFallback() {
    const results = await Promise.all(
      this.config.testMovieIds.map(async (tmdbId) => {
        try {
          const response = await fetch(`${this.config.tmdbApiUrl}/${tmdbId}`);
          const isSuccess = response.ok;
          this.log(isSuccess ? `✅ TMDB API fallback successful: ${tmdbId}` : `❌ TMDB API fallback failed: ${tmdbId}`, { status: response.status });
          return isSuccess;
        } catch (error) {
          this.tmdbErrors.push({ timestamp: this.getTimestamp(), error: error.message });
          this.log('🚨 TMDB API error', { error: error.message });
          return false;
        }
      })
    );
    return results.some((r) => r); // At least one should work
  }

  async testRoutes() {
    const results = await Promise.all(
      this.config.testRoutes.map(async (route) => {
        try {
          const response = await fetch(route);
          const isSuccess = response.ok && !response.url.includes('404');
          this.routeTestResults.push({ route, isSuccess, status: response.status });
          this.log(isSuccess ? `✅ Route available: ${route}` : `❌ Route failed: ${route}`, { status: response.status });
          return isSuccess;
        } catch (error) {
          this.routeTestResults.push({ route, isSuccess: false, error: error.message });
          this.log(`🚨 Route error: ${route}`, { error: error.message });
          return false;
        }
      })
    );
    return results.every((r) => r);
  }

  testNavBar() {
    const navBarExists = document.querySelector('nav');
    const navLinks = document.querySelectorAll('nav a[href], a[href*="movie"], a[href*="genius"], a[href*="you"]');
    const hasValidLinks = navLinks.length >= 2;
    const isSuccess = navBarExists && hasValidLinks;
    this.log(isSuccess ? '✅ NavBar rendered correctly' : '❌ NavBar rendering failed', { 
      navBarExists: !!navBarExists, 
      linkCount: navLinks.length,
      hasValidLinks 
    });
    return isSuccess;
  }

  measurePerformance() {
    const metrics = {
      timestamp: this.getTimestamp(),
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0,
    };
    this.performanceMetrics.push(metrics);
    this.log('📊 Performance metrics', metrics);
    return metrics.loadTime < 5000; // 5 second threshold
  }

  detect404Page() {
    const is404 = document.querySelector('meta[name="status"][content="404"]') || 
                  window.location.pathname.includes('404') ||
                  document.title.includes('404') ||
                  document.body.textContent.includes('404');
    
    if (is404) {
      this.is404Page = true;
      this.log('🚨 Detected 404 page');
    }
    return is404;
  }

  async generateValidationReport() {
    const report = {
      timestamp: this.getTimestamp(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      is404Page: this.is404Page,
      hydrationStatus: this.hydrationStatus,
      staticAssetsAvailable: this.testStaticAssets(),
      nuclearStaticSuccess: await this.testNuclearStatic(),
      tmdbFallbackSuccess: await this.testTmdbFallback(),
      routesSuccess: await this.testRoutes(),
      navBarSuccess: this.testNavBar(),
      performanceAcceptable: this.measurePerformance(),
      errorCount: this.errors.length,
      networkErrorCount: this.networkErrors.length,
      staticAssetErrorCount: this.staticAssetErrors.length,
      tmdbErrorCount: this.tmdbErrors.length,
      nuclearErrorCount: this.nuclearErrors.length,
      errors: this.errors,
      networkErrors: this.networkErrors,
      staticAssetErrors: this.staticAssetErrors,
      tmdbErrors: this.tmdbErrors,
      nuclearErrors: this.nuclearErrors,
      performanceMetrics: this.performanceMetrics,
      routeTestResults: this.routeTestResults,
      logs: this.logs
    };

    // Calculate test results
    report.testResults = {
      no404Errors: !this.is404Page,
      clientSideWorking: this.hydrationStatus === 'complete',
      noErrors: this.errors.length === 0,
      noNetworkErrors: this.networkErrors.length === 0,
      noStaticAssetErrors: this.staticAssetErrors.length === 0,
      noTmdbErrors: this.tmdbErrors.length === 0,
      noNuclearErrors: this.nuclearErrors.length === 0,
      staticAssetsAvailable: report.staticAssetsAvailable,
      nuclearStaticSuccess: report.nuclearStaticSuccess,
      tmdbFallbackSuccess: report.tmdbFallbackSuccess,
      routesSuccess: report.routesSuccess,
      navBarSuccess: report.navBarSuccess,
      performanceAcceptable: report.performanceAcceptable,
    };

    // Overall validation
    report.validationPassed = Object.values(report.testResults).every(result => result === true);

    if (this.config.reportStorage === 'localStorage') {
      localStorage.setItem('prodTestReport', JSON.stringify(report));
    }

    console.log('📊 PRODUCTION VALIDATION REPORT:', report);
    console.log(report.validationPassed ? '✅ All tests PASSED' : '❌ Validation FAILED');

    return report;
  }

  init() {
    this.log('🚀 Production testing framework initializing', {
      config: this.config,
      url: window.location.href
    });
    
    this.detect404Page();
    this.interceptNetwork();
    this.interceptErrors();
    this.testHydrationComplete();

    // Run initial tests
    setTimeout(() => {
      this.testNavBar();
      this.measurePerformance();
    }, 1000);

    // Generate final report after page load
    window.addEventListener('load', () => {
      setTimeout(() => this.generateValidationReport(), 3000);
    });
  }
}

// Auto-initialize with production configuration
if (typeof window !== 'undefined') {
  const tester = new ProductionTestFramework({
    hydrationTimeout: 5000,
    rootSelector: '#__next',
    reportStorage: 'localStorage',
    staticAssets: ['/favicon.ico'],
    tmdbApiUrl: '/api/movie',
    nuclearPath: 'nuclear-static',
    testRoutes: ['/movie/11', '/movie/550', '/'],
    testMovieIds: ['11', '550'],
  });
  
  tester.init();

  // Global functions for manual testing
  window.generateProdTestReport = () => tester.generateValidationReport();
  window.getProdTestLogs = () => tester.logs;
  window.prodTestFramework = tester;
}