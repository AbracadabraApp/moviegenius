// 404 Production Monitoring Framework
class MoviePageMonitor {
  constructor() {
    this.errors = [];
    this.startTime = Date.now();
    this.init();
  }

  init() {
    // Track URL changes and 404s
    this.monitorNavigation();
    this.monitorErrors();
    this.checkCurrentPage();
  }

  monitorNavigation() {
    // Track if we end up on 404 page
    const checkFor404 = () => {
      const is404 = window.location.pathname.includes('/404') || 
                   document.title.includes('404') ||
                   document.body.textContent.includes('page could not be found');
      
      if (is404) {
        this.reportError('404_redirect', {
          originalUrl: document.referrer || 'unknown',
          currentUrl: window.location.href,
          timestamp: Date.now()
        });
      }
    };

    // Check immediately and after navigation
    setTimeout(checkFor404, 1000);
    window.addEventListener('popstate', checkFor404);
  }

  monitorErrors() {
    // Track console errors that might cause 404s
    const originalError = console.error;
    console.error = (...args) => {
      this.reportError('console_error', {
        message: args.join(' '),
        timestamp: Date.now()
      });
      originalError.apply(console, args);
    };

    // Track page errors
    window.addEventListener('error', (e) => {
      this.reportError('page_error', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        timestamp: Date.now()
      });
    });
  }

  checkCurrentPage() {
    const movieMatch = window.location.pathname.match(/\/movie\/(\d+)/);
    if (movieMatch) {
      const movieId = movieMatch[1];
      this.validateMoviePage(movieId);
    }
  }

  validateMoviePage(movieId) {
    // Check if movie page loaded correctly
    const hasContent = document.querySelector('h1') || 
                      document.body.textContent.length > 1000;
    
    const hasError = document.body.textContent.includes('Movie information currently unavailable') ||
                    document.body.textContent.includes('Static generation failed');

    this.reportResult('movie_page_validation', {
      movieId,
      hasContent,
      hasError,
      url: window.location.href,
      timestamp: Date.now()
    });
  }

  reportError(type, details) {
    this.errors.push({ type, details });
    console.log(`🚨 404Monitor: ${type}`, details);
  }

  reportResult(type, details) {
    console.log(`✅ 404Monitor: ${type}`, details);
  }

  generateReport() {
    return {
      testDuration: Date.now() - this.startTime,
      errorCount: this.errors.length,
      errors: this.errors,
      currentUrl: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
  }
}

// Auto-initialize monitoring
if (typeof window !== 'undefined') {
  window.moviePageMonitor = new MoviePageMonitor();
  
  // Global function for manual testing
  window.generateMoviePageReport = () => {
    return window.moviePageMonitor.generateReport();
  };
}