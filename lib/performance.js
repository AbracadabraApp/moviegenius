// Performance monitoring utilities for MovieGenius
// Tracks Core Web Vitals and custom metrics

export function initPerformanceMonitoring() {
  // Only run in browser
  if (typeof window === 'undefined') return;

  // Track Core Web Vitals
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(sendToAnalytics);
    getFID(sendToAnalytics);
    getFCP(sendToAnalytics);
    getLCP(sendToAnalytics);
    getTTFB(sendToAnalytics);
  });

  // Track custom MovieGenius metrics
  trackCustomMetrics();
}

function sendToAnalytics(metric) {
  // Send to Cloudflare Analytics Engine or your preferred service
  const data = {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    delta: metric.delta,
    rating: metric.rating,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };

  // Send to analytics endpoint
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', JSON.stringify(data));
  } else {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    }).catch(() => {}); // Ignore errors
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Performance metric:', metric);
  }
}

function trackCustomMetrics() {
  // Track Claude API response times
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const start = performance.now();
    const url = args[0];
    
    try {
      const response = await originalFetch.apply(this, args);
      const duration = performance.now() - start;
      
      // Track API performance
      if (typeof url === 'string' && url.includes('/api/')) {
        sendToAnalytics({
          name: 'api-response-time',
          value: duration,
          id: generateId(),
          delta: duration,
          rating: duration < 1000 ? 'good' : duration < 3000 ? 'needs-improvement' : 'poor',
          endpoint: url
        });
      }
      
      return response;
    } catch (error) {
      const duration = performance.now() - start;
      sendToAnalytics({
        name: 'api-error',
        value: duration,
        id: generateId(),
        delta: duration,
        rating: 'poor',
        endpoint: url,
        error: error.message
      });
      throw error;
    }
  };

  // Track image loading performance
  trackImageLoading();

  // Track cache hit rates
  trackCachePerformance();
}

function trackImageLoading() {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.name.includes('image.tmdb.org')) {
        sendToAnalytics({
          name: 'tmdb-image-load',
          value: entry.duration,
          id: generateId(),
          delta: entry.duration,
          rating: entry.duration < 500 ? 'good' : entry.duration < 1500 ? 'needs-improvement' : 'poor',
          resource: entry.name
        });
      }
    });
  });

  observer.observe({ entryTypes: ['resource'] });
}

function trackCachePerformance() {
  // Monitor cache hit/miss via response headers
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    const cacheStatus = response.headers.get('X-Cache');
    if (cacheStatus) {
      sendToAnalytics({
        name: 'cache-performance',
        value: cacheStatus === 'HIT' ? 1 : 0,
        id: generateId(),
        delta: 1,
        rating: cacheStatus === 'HIT' ? 'good' : 'needs-improvement',
        cacheStatus,
        url: args[0]
      });
    }
    
    return response;
  };
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Performance observer for page-specific metrics
export function trackPagePerformance(pageType) {
  const startTime = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - startTime;
      sendToAnalytics({
        name: `page-load-${pageType}`,
        value: duration,
        id: generateId(),
        delta: duration,
        rating: duration < 1000 ? 'good' : duration < 3000 ? 'needs-improvement' : 'poor'
      });
    }
  };
}

// Utility to measure specific operations
export function measureOperation(name, operation) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    
    Promise.resolve(operation())
      .then((result) => {
        const duration = performance.now() - start;
        sendToAnalytics({
          name: `operation-${name}`,
          value: duration,
          id: generateId(),
          delta: duration,
          rating: duration < 500 ? 'good' : duration < 2000 ? 'needs-improvement' : 'poor'
        });
        resolve(result);
      })
      .catch((error) => {
        const duration = performance.now() - start;
        sendToAnalytics({
          name: `operation-${name}-error`,
          value: duration,
          id: generateId(),
          delta: duration,
          rating: 'poor',
          error: error.message
        });
        reject(error);
      });
  });
}