// Next.js Testing Framework for 404, Flicker, and Webpack Issues
class NextJsTestFramework {
  constructor(config = {}) {
    this.config = {
      hydrationTimeout: config.hydrationTimeout || 10000, // 10s timeout
      rootSelector: config.rootSelector || '[data-app-root]', // Custom root
      reportStorage: config.reportStorage || 'localStorage',
      nextRoute: config.nextRoute || window.__NEXT_DATA__?.props?.pageProps, // Next.js route data
    };
    this.logs = [];
    this.bundleErrors = [];
    this.requireErrors = [];
    this.networkErrors = [];
    this.hydrationErrors = [];
    this.hydrationStatus = 'pending';
    this.is404Page = false;
    this.staticAssetErrors = [];
  }

  // Utility: Generate timestamp
  getTimestamp() {
    return new Date().toISOString();
  }

  // Log messages
  log(message, data = {}) {
    const logEntry = { timestamp: this.getTimestamp(), message, data };
    this.logs.push(logEntry);
    console.log('[NEXTJS-TEST]', logEntry);
  }

  // Test for require availability
  testRequireAvailability() {
    try {
      if (typeof require === 'function') {
        this.log('✅ require is available and is a function');
        return true;
      } else if (typeof require !== 'undefined') {
        this.log('⚠️ require is defined but not a function', { type: typeof require });
        return false;
      } else {
        this.log('❌ require is not defined');
        return false;
      }
    } catch (error) {
      this.captureRequireError(error);
      return false;
    }
  }

  // Monitor Webpack/require and React errors
  interceptErrors() {
    const originalError = window.onerror;
    const self = this;

    window.onerror = function (message, source, lineno, colno, error) {
      const errorEntry = {
        timestamp: self.getTimestamp(),
        message,
        source,
        lineno,
        colno,
        error: error?.stack,
      };

      if (message.includes('require') || message.includes('webpack')) {
        self.bundleErrors.push(errorEntry);
        self.log('🚨 Webpack/require error detected', errorEntry);
      }
      if (message.includes('Minified React error #418') || message.includes('Minified React error #423')) {
        self.hydrationErrors.push(errorEntry);
        self.log('🚨 React hydration error detected', errorEntry);
      }
      if (originalError) originalError.apply(this, arguments);
    };
  }

  // Monitor network requests for 404s and static assets
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
          if (requestInfo.url.includes('favicon.ico') || requestInfo.url.includes('.js') || requestInfo.url.includes('.css')) {
            self.staticAssetErrors.push(requestInfo);
            self.log('🚨 Static asset 404 detected', requestInfo);
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

  // Test hydration completion
  testHydrationComplete() {
    const self = this;
    let attempts = 0;
    const maxAttempts = Math.ceil(this.config.hydrationTimeout / 100);

    const checkHydration = () => {
      attempts++;
      const hasRoot = document.querySelector(this.config.rootSelector);
      const hasInteractiveElements = document.querySelectorAll('button, input, [role="button"]').length > 0;
      const hasNextData = !!window.__NEXT_DATA__;

      if (hasRoot && hasInteractiveElements && hasNextData) {
        self.hydrationStatus = 'complete';
        self.log('✅ Hydration appears complete', { route: window.__NEXT_DATA__?.props?.pageProps });
        return;
      }

      if (attempts >= maxAttempts) {
        self.hydrationStatus = 'failed';
        self.log('❌ Hydration failed - timeout');
        return;
      }

      setTimeout(checkHydration, 100);
    };

    setTimeout(checkHydration, 100);
  }

  // Test Next.js route data
  testNextRoute() {
    if (!this.config.nextRoute) {
      this.log('❌ No Next.js route data found');
      return false;
    }
    const { asPath, pathname, query } = this.config.nextRoute;
    const isValidRoute = asPath && pathname && query;
    this.log(isValidRoute ? '✅ Valid Next.js route data' : '❌ Invalid Next.js route data', {
      asPath,
      pathname,
      query,
    });
    return isValidRoute;
  }

  // Capture require-specific errors
  captureRequireError(error) {
    this.requireErrors.push({
      timestamp: this.getTimestamp(),
      message: error.message,
      stack: error.stack,
    });
  }

  // Detect 404 page
  detect404Page() {
    const is404 = document.querySelector('meta[name="status"][content="404"]') || window.location.pathname.includes('404');
    if (is404) {
      this.is404Page = true;
      this.log('🚨 Detected 404 page');
    }
    return is404;
  }

  // Generate validation report
  generateValidationReport() {
    const report = {
      timestamp: this.getTimestamp(),
      is404Page: this.is404Page,
      requireAvailable: this.testRequireAvailability(),
      hydrationStatus: this.hydrationStatus,
      nextRouteValid: this.testNextRoute(),
      bundleErrorCount: this.bundleErrors.length,
      requireErrorCount: this.requireErrors.length,
      networkErrorCount: this.networkErrors.length,
      hydrationErrorCount: this.hydrationErrors.length,
      staticAssetErrorCount: this.staticAssetErrors.length,
      bundleErrors: this.bundleErrors,
      requireErrors: this.requireErrors,
      networkErrors: this.networkErrors,
      hydrationErrors: this.hydrationErrors,
      staticAssetErrors: this.staticAssetErrors,
      testResults: {
        no404Errors: !this.is404Page,
        webpackBundlesLoaded: this.bundleErrors.length === 0,
        clientSideWorking: this.hydrationStatus === 'complete',
        noRequireErrors: this.requireErrors.length === 0,
        noNetworkErrors: this.networkErrors.length === 0,
        noHydrationErrors: this.hydrationErrors.length === 0,
        noStaticAssetErrors: this.staticAssetErrors.length === 0,
        validNextRoute: this.testNextRoute(),
      },
    };

    report.validationPassed =
      report.testResults.no404Errors &&
      report.testResults.webpackBundlesLoaded &&
      report.testResults.clientSideWorking &&
      report.testResults.noRequireErrors &&
      report.testResults.noNetworkErrors &&
      report.testResults.noHydrationErrors &&
      report.testResults.noStaticAssetErrors &&
      report.testResults.validNextRoute;

    if (this.config.reportStorage === 'localStorage') {
      localStorage.setItem('nextJsTestReport', JSON.stringify(report));
    }

    return report;
  }

  // Initialize framework
  init() {
    this.log('Next.js testing framework initializing');
    this.detect404Page();
    this.interceptNetwork();
    this.interceptErrors();
    this.testHydrationComplete();
    this.testNextRoute();

    window.addEventListener('load', () => {
      setTimeout(() => {
        const report = this.generateValidationReport();
        console.log('📊 NEXTJS VALIDATION REPORT:', report);
        if (report.validationPassed) {
          console.log('✅ All tests PASSED');
        } else {
          console.log('❌ Validation FAILED');
        }
      }, 2000);
    });
  }
}

// Auto-initialize with Next.js-specific config
const tester = new NextJsTestFramework({
  hydrationTimeout: 10000,
  rootSelector: '#__next', // Next.js default root
  reportStorage: 'localStorage',
  nextRoute: window.__NEXT_DATA__?.props?.pageProps,
});
tester.init();

// Expose report generation
window.generateNextJsReport = () => tester.generateValidationReport();