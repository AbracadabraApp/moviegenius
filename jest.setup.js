// jest.setup.js
import '@testing-library/jest-dom';

// Nuclear Static Testing Framework Custom Matchers
expect.extend({
  toContainMovieLink(received, tmdbId) {
    const linkPattern = new RegExp(`<a[^>]*href="/movie/${tmdbId}"[^>]*>`);
    const pass = linkPattern.test(received);
    
    if (pass) {
      return {
        message: () => `Expected HTML not to contain movie link for TMDB ID ${tmdbId}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected HTML to contain movie link for TMDB ID ${tmdbId}`,
        pass: false,
      };
    }
  },

  toHaveValidHTMLStructure(received) {
    const hasDoctype = received.includes('<!DOCTYPE html>');
    const hasHtmlTags = received.includes('<html>') && received.includes('</html>');
    const hasHeadTags = received.includes('<head>') && received.includes('</head>');
    const hasBodyTags = received.includes('<body>') && received.includes('</body>');
    const hasTitle = received.includes('<title>') && received.includes('</title>');
    
    const pass = hasDoctype && hasHtmlTags && hasHeadTags && hasBodyTags && hasTitle;
    
    if (pass) {
      return {
        message: () => `Expected HTML not to have valid structure`,
        pass: true,
      };
    } else {
      const missing = [];
      if (!hasDoctype) missing.push('DOCTYPE declaration');
      if (!hasHtmlTags) missing.push('html tags');
      if (!hasHeadTags) missing.push('head tags');
      if (!hasBodyTags) missing.push('body tags');
      if (!hasTitle) missing.push('title tag');
      
      return {
        message: () => `Expected HTML to have valid structure. Missing: ${missing.join(', ')}`,
        pass: false,
      };
    }
  },

  toLoadFasterThan(received, baselineMs) {
    const pass = received < baselineMs;
    
    if (pass) {
      return {
        message: () => `Expected load time ${received}ms not to be faster than ${baselineMs}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected load time ${received}ms to be faster than ${baselineMs}ms`,
        pass: false,
      };
    }
  }
});

// Global test configuration
global.NUCLEAR_TEST_CONFIG = {
  PRODUCTION_BASE: process.env.PRODUCTION_BASE_URL || 'https://moviegenius.ai',
  LOCAL_BASE: process.env.LOCAL_BASE_URL || 'http://localhost:3000',
  TEST_TIMEOUT: parseInt(process.env.JEST_TIMEOUT) || 30000,
  PERFORMANCE_BASELINE: 2500,
  TARGET_LOAD_TIME: 200,
  MAX_FILE_SIZE_KB: 50,
  MAX_JS_SIZE_KB: 15,
  MAX_CSS_SIZE_KB: 10,
};

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Next.js dynamic imports
jest.mock('next/dynamic', () => () => {
  const DynamicComponent = () => null;
  DynamicComponent.displayName = 'LoadableComponent';
  DynamicComponent.preload = jest.fn();
  return DynamicComponent;
});

// Mock browser-specific APIs only in jsdom environment
if (typeof window !== 'undefined') {
  // Mock window.scrollTo
  Object.defineProperty(window, 'scrollTo', {
    value: jest.fn(),
    writable: true,
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  global.localStorage = localStorageMock;
}

// Mock fetch globally with better default responses
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200,
  })
);

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {
    return null;
  }

  disconnect() {
    return null;
  }

  unobserve() {
    return null;
  }
};

// API-specific mocks will be handled in individual test files

// Setup cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});
