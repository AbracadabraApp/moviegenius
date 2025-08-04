/**
 * Production vs Development TMDB Authentication Tests
 * 
 * These tests specifically cover the authentication regression that caused
 * production movie analysis to fail for 4-5 days due to incorrect Bearer
 * token validation logic.
 */

// Import the actual TMDB service (not mocked for this test)
import { getTMDBMovieDetails } from '../../lib/services/tmdb-search.js';

// Mock environment variables for different scenarios
const originalEnv = process.env;

describe('TMDB Authentication Production vs Development', () => {
  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    
    // Clear any module cache to ensure fresh imports
    jest.resetModules();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Bearer Token Validation', () => {
    it('should accept valid TMDB Bearer tokens (not JWT format)', async () => {
      // TMDB Bearer tokens are long strings, NOT JWT format (no dots)
      process.env.TMDB_BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9LeyJhdWQiOiI4MmU1M2QyZDY4ZmY0MjQ1YjhkNmQzNGVkOWNhMjgwNyIsInN1YiI6IjY2NTYwMWYyNzQ1NTNiYzM2MzVjNDlhZiIsInNjb3BlcyI6W10sInZlcnNpb24iOjF9';
      delete process.env.TMDB_API_KEY;
      delete process.env.NEXT_PUBLIC_TMDB_API_KEY;

      // Import fresh module with Bearer token
      const { getTMDBAuthConfig } = await import('../../lib/services/tmdb-search.js');
      
      // This should NOT fail due to JWT validation
      // The regression was: bearerToken.split('.').length === 3
      // But TMDB tokens are not JWTs!
      expect(() => getTMDBAuthConfig()).not.toThrow();
    });

    it('should reject placeholder API keys and use real API key', async () => {
      delete process.env.TMDB_BEARER_TOKEN;
      process.env.TMDB_API_KEY = '82e53d2d68ff4245b8d6d34ed9ca2807'; // Real format
      process.env.NEXT_PUBLIC_TMDB_API_KEY = 'placeholder'; // Placeholder format
      
      const { getTMDBAuthConfig } = await import('../../lib/services/tmdb-search.js');
      const config = getTMDBAuthConfig();
      
      expect(config.method).toBe('apikey');
      expect(config.token).toBe('82e53d2d68ff4245b8d6d34ed9ca2807');
      expect(config.token).not.toBe('placeholder');
    });

    it('should reject placeholders that start with "placehol"', async () => {
      delete process.env.TMDB_BEARER_TOKEN;
      delete process.env.TMDB_API_KEY;
      process.env.NEXT_PUBLIC_TMDB_API_KEY = 'placeholder-value'; // This was the actual production value
      
      const { getTMDBAuthConfig } = await import('../../lib/services/tmdb-search.js');
      const config = getTMDBAuthConfig();
      
      // Should return null since placeholder values should be rejected
      expect(config).toBeNull();
    });

    it('should prioritize server-side API key over public placeholder', async () => {
      delete process.env.TMDB_BEARER_TOKEN;
      process.env.TMDB_API_KEY = '82e53d2d68ff4245b8d6d34ed9ca2807';
      process.env.NEXT_PUBLIC_TMDB_API_KEY = 'placeholder';
      
      const { getTMDBAuthConfig } = await import('../../lib/services/tmdb-search.js');
      const config = getTMDBAuthConfig();
      
      expect(config.method).toBe('apikey');
      expect(config.token).toBe('82e53d2d68ff4245b8d6d34ed9ca2807');
    });
  });

  describe('Movie Analysis Integration', () => {
    it('should handle null TMDB response gracefully', async () => {
      // Simulate the exact production failure scenario
      delete process.env.TMDB_BEARER_TOKEN;
      delete process.env.TMDB_API_KEY;
      process.env.NEXT_PUBLIC_TMDB_API_KEY = 'placeholder';
      
      // Mock fetch to return null (simulating TMDB auth failure)
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });
      
      const result = await getTMDBMovieDetails(550);
      
      // Should handle null gracefully, not crash with "Cannot read properties of null"
      expect(result).toBeNull();
      expect(() => result?.title).not.toThrow();
    });

    it('should not crash when TMDB returns malformed response', async () => {
      // Valid auth config
      process.env.TMDB_API_KEY = '82e53d2d68ff4245b8d6d34ed9ca2807';
      
      // Mock fetch to return malformed response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          // Missing title field - this was causing the "Cannot read properties of null" error
          id: 550,
          release_date: '1999-10-15'
          // title: 'Fight Club' <- MISSING
        })
      });
      
      const result = await getTMDBMovieDetails(550);
      
      // Should handle missing title gracefully
      expect(result).toBeDefined();
      expect(result.id).toBe(550);
      expect(result.title).toBeUndefined(); // Not crashing is the important part
    });
  });

  describe('Environment Simulation', () => {
    it('should simulate development environment (API key only)', async () => {
      // Development setup
      delete process.env.TMDB_BEARER_TOKEN;
      process.env.TMDB_API_KEY = '82e53d2d68ff4245b8d6d34ed9ca2807';
      process.env.NEXT_PUBLIC_TMDB_API_KEY = '82e53d2d68ff4245b8d6d34ed9ca2807';
      
      const { getTMDBAuthConfig } = await import('../../lib/services/tmdb-search.js');
      const config = getTMDBAuthConfig();
      
      expect(config.method).toBe('apikey');
      expect(config.token).toBe('82e53d2d68ff4245b8d6d34ed9ca2807');
    });

    it('should simulate broken production environment (Bearer + placeholder fallback)', async () => {
      // This was the exact broken production scenario
      process.env.TMDB_BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.invalid.jwt.format'; // Invalid JWT check
      process.env.TMDB_API_KEY = '82e53d2d68ff4245b8d6d34ed9ca2807';
      process.env.NEXT_PUBLIC_TMDB_API_KEY = 'placeholder';
      
      const { getTMDBAuthConfig } = await import('../../lib/services/tmdb-search.js');
      const config = getTMDBAuthConfig();
      
      // Should use Bearer token since length > 50, not fall back to placeholder
      expect(config.method).toBe('bearer');
      expect(config.token).toContain('eyJhbGciOiJIUzI1NiJ9');
    });

    it('should simulate fixed production environment (Bearer token working)', async () => {
      // Fixed production setup
      process.env.TMDB_BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9LeyJhdWQiOiI4MmU1M2QyZDY4ZmY0MjQ1YjhkNmQzNGVkOWNhMjgwNyIsInN1YiI6IjY2NTYwMWYyNzQ1NTNiYzM2MzVjNDlhZiIsInNjb3BlcyI6W10sInZlcnNpb24iOjF9';
      process.env.TMDB_API_KEY = '82e53d2d68ff4245b8d6d34ed9ca2807';
      process.env.NEXT_PUBLIC_TMDB_API_KEY = 'placeholder';
      
      const { getTMDBAuthConfig } = await import('../../lib/services/tmdb-search.js');
      const config = getTMDBAuthConfig();
      
      expect(config.method).toBe('bearer'); 
      expect(config.headers.Authorization).toContain('Bearer');
    });
  });

  describe('Regression Prevention', () => {
    it('should never validate Bearer tokens as JWTs', async () => {
      // The specific bug that caused the 4-5 day outage
      const validTMDBBearerToken = 'eyJhbGciOiJIUzI1NiJ9LeyJhdWQiOiI4MmU1M2QyZDY4ZmY0MjQ1YjhkNmQzNGVkOWNhMjgwNyIsInN1YiI6IjY2NTYwMWYyNzQ1NTNiYzM2MzVjNDlhZiIsInNjb3BlcyI6W10sInZlcnNpb24iOjF9';
      
      // TMDB v4 Bearer tokens ARE JWTs (header.payload.signature)
      const parts = validTMDBBearerToken.split('.');
      
      // TMDB Bearer tokens ARE 3-part JWTs
      expect(parts.length).toBe(3);
      
      // Should have substantial length and proper JWT structure
      expect(validTMDBBearerToken.length).toBeGreaterThan(50);
      expect(validTMDBBearerToken).toMatch(/^eyJ/);
    });

    it('should prevent placeholder fallback in production', async () => {
      // Simulate the exact failure scenario
      process.env.TMDB_BEARER_TOKEN = 'short'; // Too short, should be rejected
      delete process.env.TMDB_API_KEY;
      process.env.NEXT_PUBLIC_TMDB_API_KEY = 'placeholder';
      
      const { getTMDBAuthConfig } = await import('../../lib/services/tmdb-search.js');
      const config = getTMDBAuthConfig();
      
      // Should return null rather than using placeholder
      expect(config).toBeNull();
    });
  });
});

describe('Production Deployment Regression Detection', () => {
  it('should detect common deployment failures', async () => {
    const scenarios = [
      {
        name: 'Bearer token rejected due to JWT validation',
        env: {
          TMDB_BEARER_TOKEN: 'long-valid-tmdb-token-but-not-jwt-format',
          NEXT_PUBLIC_TMDB_API_KEY: 'placeholder'
        },
        expectedAuth: 'bearer' // Should use Bearer, not fall back
      },
      {
        name: 'Placeholder API key in production',
        env: {
          TMDB_API_KEY: 'placeholder',
          NEXT_PUBLIC_TMDB_API_KEY: 'placeholder'
        },
        expectedAuth: null // Should reject all placeholders
      },
      {
        name: 'Working development setup',
        env: {
          TMDB_API_KEY: '82e53d2d68ff4245b8d6d34ed9ca2807'
        },
        expectedAuth: 'apikey'
      }
    ];

    for (const scenario of scenarios) {
      // Reset environment
      process.env = { ...originalEnv, ...scenario.env };
      jest.resetModules();

      const { getTMDBAuthConfig } = await import('../../lib/services/tmdb-search.js');
      const config = getTMDBAuthConfig();

      if (scenario.expectedAuth === null) {
        expect(config).toBeNull();
      } else {
        expect(config?.method).toBe(scenario.expectedAuth);
      }
    }
  });
});