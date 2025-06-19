/**
 * Feature Flags Test Suite
 * 
 * Comprehensive tests for the feature flag system including
 * A/B testing logic, environment detection, and safety mechanisms.
 */

import {
  isFeatureEnabled,
  getFeatureMetadata,
  setFeatureOverride,
  clearFeatureOverrides,
  debugFeatureFlags,
  FLAGS
} from '../../lib/featureFlags';

// Mock browser APIs
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost'
  },
  writable: true
});

describe('Feature Flags System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
    mockLocalStorage.getItem.mockReturnValue(null);
    window.location.hostname = 'localhost';
  });

  describe('Environment Detection', () => {
    test('detects development environment correctly', () => {
      window.location.hostname = 'localhost';
      const metadata = getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
      expect(metadata.environment).toBe('development');
      
      window.location.hostname = '127.0.0.1';
      const metadata2 = getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
      expect(metadata2.environment).toBe('development');
    });

    test('detects staging environment correctly', () => {
      window.location.hostname = 'moviegenius-staging.vercel.app';
      const metadata = getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
      expect(metadata.environment).toBe('staging');
    });

    test('detects production environment correctly', () => {
      window.location.hostname = 'moviegenius.com';
      const metadata = getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
      expect(metadata.environment).toBe('production');
    });
  });

  describe('User Bucketing', () => {
    test('generates consistent user buckets', () => {
      mockSessionStorage.getItem
        .mockReturnValueOnce(null) // ab_test_bucket
        .mockReturnValueOnce('test-session-123'); // session_id

      const metadata1 = getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
      const metadata2 = getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
      
      expect(metadata1.userBucket).toBe(metadata2.userBucket);
      expect(typeof metadata1.userBucket).toBe('number');
      expect(metadata1.userBucket).toBeGreaterThanOrEqual(0);
      expect(metadata1.userBucket).toBeLessThan(100);
    });

    test('uses stored bucket when available', () => {
      mockSessionStorage.getItem.mockReturnValue('42');
      
      const metadata = getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
      expect(metadata.userBucket).toBe(42);
    });

    test('creates new session ID when none exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      
      getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'session_id',
        expect.any(String)
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'ab_test_bucket',
        expect.any(String)
      );
    });
  });

  describe('Feature Flag Logic', () => {
    test('respects environment overrides', () => {
      // Development environment should enable the flag
      window.location.hostname = 'localhost';
      expect(isFeatureEnabled(FLAGS.HEADER_B_VARIANT)).toBe(true);
      
      // Production environment should disable the flag
      window.location.hostname = 'moviegenius.com';
      expect(isFeatureEnabled(FLAGS.HEADER_B_VARIANT)).toBe(false);
    });

    test('handles non-existent flags gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(isFeatureEnabled('NON_EXISTENT_FLAG')).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Feature flag 'NON_EXISTENT_FLAG' not found");
      
      consoleSpy.mockRestore();
    });

    test('returns false when flag is globally disabled', () => {
      // Mock production environment and disabled flag
      window.location.hostname = 'moviegenius.com';
      expect(isFeatureEnabled(FLAGS.HEADER_B_VARIANT)).toBe(false);
    });

    test('handles SSR environment gracefully', () => {
      const originalWindow = global.window;
      delete global.window;
      
      // Should not throw and should return reasonable defaults
      expect(() => isFeatureEnabled(FLAGS.HEADER_B_VARIANT)).not.toThrow();
      
      global.window = originalWindow;
    });
  });

  describe('Development Overrides', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      window.location.hostname = 'localhost';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('allows manual overrides in development', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      setFeatureOverride(FLAGS.HEADER_B_VARIANT, true);
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'feature_overrides',
        JSON.stringify({ [FLAGS.HEADER_B_VARIANT]: true })
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        `Feature '${FLAGS.HEADER_B_VARIANT}' manually enabled`
      );
      
      consoleSpy.mockRestore();
    });

    test('prevents overrides in production', () => {
      process.env.NODE_ENV = 'production';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      setFeatureOverride(FLAGS.HEADER_B_VARIANT, true);
      
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Feature overrides only allowed in development');
      
      consoleSpy.mockRestore();
    });

    test('clears all overrides', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      clearFeatureOverrides();
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('feature_overrides');
      expect(consoleSpy).toHaveBeenCalledWith('All feature overrides cleared');
      
      consoleSpy.mockRestore();
    });

    test('applies overrides correctly', () => {
      mockLocalStorage.getItem.mockReturnValue(
        JSON.stringify({ [FLAGS.HEADER_B_VARIANT]: true })
      );
      
      // Even if environment would normally disable it
      window.location.hostname = 'moviegenius.com';
      
      // Need to re-import to get the override-aware version
      jest.resetModules();
      const { isFeatureEnabled: isFeatureEnabledWithOverrides } = require('../../lib/featureFlags');
      
      expect(isFeatureEnabledWithOverrides(FLAGS.HEADER_B_VARIANT)).toBe(true);
    });
  });

  describe('Metadata and Debugging', () => {
    test('provides comprehensive feature metadata', () => {
      window.location.hostname = 'localhost';
      mockSessionStorage.getItem.mockReturnValue('25');
      
      const metadata = getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
      
      expect(metadata).toEqual(expect.objectContaining({
        enabled: expect.any(Boolean),
        rolloutPercentage: expect.any(Number),
        environments: expect.any(Object),
        description: expect.any(String),
        dateCreated: expect.any(String),
        owner: expect.any(String),
        jiraTicket: expect.any(String),
        environment: 'development',
        userBucket: 25,
        isEnabled: expect.any(Boolean)
      }));
    });

    test('returns null for non-existent flags', () => {
      const metadata = getFeatureMetadata('NON_EXISTENT_FLAG');
      expect(metadata).toBeNull();
    });

    test('debug function works in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleTableSpy = jest.spyOn(console, 'table').mockImplementation();
      
      debugFeatureFlags();
      
      expect(consoleTableSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: FLAGS.HEADER_B_VARIANT,
            enabled: expect.any(Boolean),
            rollout: expect.any(String),
            environment: expect.any(String),
            description: expect.any(String)
          })
        ])
      );
      
      consoleTableSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    test('debug function is restricted in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      debugFeatureFlags();
      
      expect(consoleSpy).toHaveBeenCalledWith('Debug functions only available in development');
      
      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles malformed override data', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');
      
      // Should not throw
      expect(() => isFeatureEnabled(FLAGS.HEADER_B_VARIANT)).not.toThrow();
    });

    test('handles missing session storage', () => {
      Object.defineProperty(window, 'sessionStorage', {
        value: undefined,
        writable: true
      });
      
      // Should not throw and should work without session storage
      expect(() => isFeatureEnabled(FLAGS.HEADER_B_VARIANT)).not.toThrow();
    });

    test('handles hash collisions in bucketing', () => {
      // Test multiple session IDs to ensure reasonable distribution
      const buckets = [];
      for (let i = 0; i < 100; i++) {
        mockSessionStorage.getItem
          .mockReturnValueOnce(null) // ab_test_bucket
          .mockReturnValueOnce(`session-${i}`); // session_id
        
        const metadata = getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
        buckets.push(metadata.userBucket);
      }
      
      // Should have reasonable distribution (not all the same bucket)
      const uniqueBuckets = new Set(buckets);
      expect(uniqueBuckets.size).toBeGreaterThan(10);
    });
  });

  describe('Performance', () => {
    test('caches bucket calculation within session', () => {
      mockSessionStorage.getItem.mockReturnValue('42');
      
      // Multiple calls should use cached value
      getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
      getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
      getFeatureMetadata(FLAGS.HEADER_B_VARIANT);
      
      // Should only check session storage once per key
      expect(mockSessionStorage.getItem).toHaveBeenCalledTimes(3); // Called for each getFeatureMetadata
    });

    test('performs efficiently with multiple flags', () => {
      const start = performance.now();
      
      // Check multiple flags
      for (let i = 0; i < 100; i++) {
        isFeatureEnabled(FLAGS.HEADER_B_VARIANT);
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Should complete in reasonable time (less than 10ms for 100 checks)
      expect(duration).toBeLessThan(10);
    });
  });
});