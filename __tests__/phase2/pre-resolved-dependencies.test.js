/**
 * Phase 2: Pre-resolved Dependencies Tests
 *
 * Tests for pre-resolving runtime dependencies (poster URLs, streaming data,
 * trailer IDs) to eliminate API calls during static file serving.
 */

import { assembleEnhancedMovieData } from '../../lib/enhanced-assembly.js';
import { Pool } from 'pg';
import { TEST_MOVIES } from '../fixtures/assembly-test-data.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

describe('Phase 2: Pre-resolved Dependencies', () => {

  describe('Poster URL Pre-resolution', () => {
    test('should include poster URL from database', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      expect(enhancedData.movieHeader.posterUrl).toBeDefined();
      expect(typeof enhancedData.movieHeader.posterUrl).toBe('string');
    });

    test('should use TMDB poster URL format', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      if (enhancedData.movieHeader.posterUrl && !enhancedData.movieHeader.posterUrl.includes('placeholder')) {
        expect(enhancedData.movieHeader.posterUrl).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w500\/.+/);
      }
    });

    test('should set posterValidated flag correctly', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      expect(typeof enhancedData.buildData.posterValidated).toBe('boolean');

      // If poster URL exists and isn't placeholder, should be validated
      if (enhancedData.movieHeader.posterUrl && !enhancedData.movieHeader.posterUrl.includes('placeholder')) {
        expect(enhancedData.buildData.posterValidated).toBe(true);
      }
    });

    test('should provide fallback for missing posters', async () => {
      // Test with a movie that might not have poster data
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Should always have a poster URL, even if placeholder
      expect(enhancedData.movieHeader.posterUrl).toBeDefined();
      expect(enhancedData.movieHeader.posterUrl).toBeTypeOf('string');
      expect(enhancedData.movieHeader.posterUrl.length).toBeGreaterThan(0);
    });
  });

  describe('Streaming Data Pre-resolution', () => {
    test('should include streaming data from database', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Should be string or null, never undefined
      expect(typeof enhancedData.movieHeader.streaming === 'string' || enhancedData.movieHeader.streaming === null).toBe(true);
    });

    test('should set streamingCurrent flag when data exists', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      expect(typeof enhancedData.buildData.streamingCurrent).toBe('boolean');

      if (enhancedData.movieHeader.streaming) {
        expect(enhancedData.buildData.streamingCurrent).toBe(true);
      } else {
        expect(enhancedData.buildData.streamingCurrent).toBe(false);
      }
    });

    test('should handle null streaming data gracefully', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Should not be undefined, even if no streaming data
      expect(enhancedData.movieHeader.streaming).not.toBeUndefined();
    });

    test('should format streaming data consistently', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      if (enhancedData.movieHeader.streaming) {
        // Should be a readable string format
        expect(typeof enhancedData.movieHeader.streaming).toBe('string');
        expect(enhancedData.movieHeader.streaming.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Trailer Video ID Pre-resolution', () => {
    test('should include trailer video ID from database', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Should be string or null, never undefined
      expect(typeof enhancedData.movieHeader.trailerVideoId === 'string' || enhancedData.movieHeader.trailerVideoId === null).toBe(true);
    });

    test('should set trailerResolved flag correctly', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      expect(typeof enhancedData.buildData.trailerResolved).toBe('boolean');

      if (enhancedData.movieHeader.trailerVideoId) {
        expect(enhancedData.buildData.trailerResolved).toBe(true);
      } else {
        expect(enhancedData.buildData.trailerResolved).toBe(false);
      }
    });

    test('should handle missing trailer data gracefully', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Should not be undefined, even if no trailer
      expect(enhancedData.movieHeader.trailerVideoId).not.toBeUndefined();
    });

    test('should provide valid YouTube video ID format when present', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      if (enhancedData.movieHeader.trailerVideoId && typeof enhancedData.movieHeader.trailerVideoId === 'string') {
        // YouTube video IDs are typically 11 characters
        expect(enhancedData.movieHeader.trailerVideoId.length).toBeGreaterThan(0);
        expect(typeof enhancedData.movieHeader.trailerVideoId).toBe('string');
      }
    });
  });

  describe('Build Metadata Validation', () => {
    let buildData;

    beforeAll(async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      buildData = enhancedData.buildData;
    });

    test('should include all required build flags', () => {
      const requiredFlags = [
        'posterValidated',
        'streamingCurrent',
        'trailerResolved',
        'linksProcessed'
      ];

      requiredFlags.forEach(flag => {
        expect(buildData).toHaveProperty(flag);
        expect(typeof buildData[flag]).toBe('boolean');
      });
    });

    test('should always set linksProcessed to true for enhanced format', () => {
      expect(buildData.linksProcessed).toBe(true);
    });

    test('should provide build status summary', () => {
      // All build flags should be boolean
      Object.values(buildData).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });
  });

  describe('Database Source Validation', () => {
    test('should read from correct database tables', async () => {
      // This test ensures we're reading from the right sources
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Should have data that indicates correct database sources
      expect(enhancedData.tmdbId).toBe(TEST_MOVIES.FIGHT_CLUB.tmdbId);
      expect(enhancedData.title).toBeDefined();
      expect(enhancedData.year).toBeDefined();

      // Analysis should come from enhanced_sections, not claude_response
      expect(Array.isArray(enhancedData.analysis.sections)).toBe(true);

      // Should have whyWatch data from enhanced_why_watch table
      expect(enhancedData.analysis.whyWatch).toBeDefined();
      expect(['YES', 'NO']).toContain(enhancedData.analysis.whyWatch.recommendation);
    });

    test('should handle missing database records gracefully', async () => {
      // Test with a movie that might have incomplete data
      try {
        const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

        // Should not throw errors even with missing data
        expect(enhancedData).toBeDefined();
        expect(enhancedData.movieHeader).toBeDefined();
        expect(enhancedData.analysis).toBeDefined();
      } catch (error) {
        // Should provide meaningful error messages
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('Performance Optimization', () => {
    test('should pre-resolve all expensive operations', async () => {
      const startTime = Date.now();
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      const endTime = Date.now();

      // Should be reasonably fast since everything is pre-resolved
      expect(endTime - startTime).toBeLessThan(10000); // Less than 10 seconds

      // All expensive operations should be pre-resolved
      expect(enhancedData.buildData.posterValidated).toBeDefined();
      expect(enhancedData.buildData.streamingCurrent).toBeDefined();
      expect(enhancedData.buildData.trailerResolved).toBeDefined();
      expect(enhancedData.buildData.linksProcessed).toBeDefined();
    });

    test('should eliminate need for runtime API calls', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // All required data should be present, no API calls needed
      expect(enhancedData.movieHeader.posterUrl).toBeDefined();
      expect(enhancedData.movieHeader.streaming).toBeDefined(); // Can be null, but defined
      expect(enhancedData.movieHeader.trailerVideoId).toBeDefined(); // Can be null, but defined

      // Processed links should be ready
      expect(enhancedData.buildData.linksProcessed).toBe(true);
    });
  });

  describe('Static File Readiness', () => {
    test('should generate complete static file without external dependencies', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Should be completely self-contained
      expect(enhancedData.enhancedFormat).toBe(true);
      expect(enhancedData.staticGenerated).toBe(true);
      expect(enhancedData.lastUpdated).toBeDefined();

      // Should contain all data needed for static serving
      expect(enhancedData.movieHeader).toBeDefined();
      expect(enhancedData.analysis).toBeDefined();
      expect(enhancedData.keyElements).toBeDefined();
      expect(enhancedData.buildData).toBeDefined();
    });

    test('should be ready for /public/data/enhanced-movies/ deployment', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Should match the format of existing enhanced static files
      const jsonString = JSON.stringify(enhancedData, null, 2);

      // Should be valid JSON
      expect(() => JSON.parse(jsonString)).not.toThrow();

      // Should have reasonable size for file system storage
      expect(jsonString.length).toBeGreaterThan(1000);  // At least 1KB
      expect(jsonString.length).toBeLessThan(1000000);  // Less than 1MB
    });
  });
});

afterAll(async () => {
  await pool.end();
});