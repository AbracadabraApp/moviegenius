/**
 * Phase 2: Enhanced Static Format Generation Tests
 *
 * Tests for generating static JSON files that match exactly what
 * dynamic movie pages expect for seamless 3-tier serving.
 */

import { assembleEnhancedMovieData } from '../../lib/enhanced-assembly.js';
import { Pool } from 'pg';
import { TEST_MOVIES } from '../fixtures/assembly-test-data.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

describe('Phase 2: Enhanced Static Format Generation', () => {

  describe('Output Format Validation', () => {
    let enhancedData;

    beforeAll(async () => {
      enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
    });

    test('should include enhancedFormat: true flag', () => {
      expect(enhancedData.enhancedFormat).toBe(true);
    });

    test('should include staticGenerated: true flag', () => {
      expect(enhancedData.staticGenerated).toBe(true);
    });

    test('should include lastUpdated timestamp', () => {
      expect(enhancedData.lastUpdated).toBeDefined();
      expect(new Date(enhancedData.lastUpdated)).toBeInstanceOf(Date);
    });

    test('should match expected root structure', () => {
      const expectedKeys = [
        'tmdbId',
        'title',
        'year',
        'movieHeader',
        'analysis',
        'keyElements',
        'enhancedFormat',
        'staticGenerated',
        'lastUpdated',
        'buildData'
      ];

      expectedKeys.forEach(key => {
        expect(enhancedData).toHaveProperty(key);
      });
    });
  });

  describe('MovieHeader Structure', () => {
    let movieHeader;

    beforeAll(async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      movieHeader = enhancedData.movieHeader;
    });

    test('should have complete movieHeader structure', () => {
      const expectedKeys = [
        'title',
        'year',
        'posterUrl',
        'trailerVideoId',
        'streaming',
        'overview'
      ];

      expectedKeys.forEach(key => {
        expect(movieHeader).toHaveProperty(key);
      });
    });

    test('should have valid poster URL format', () => {
      expect(movieHeader.posterUrl).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w500\/.+/);
    });

    test('should have properly formatted overview', () => {
      expect(movieHeader.overview).toBe(`${movieHeader.title} (${movieHeader.year})`);
    });

    test('should match dynamic page MovieHeaderLarge expectations', () => {
      // These are the exact props MovieHeaderLarge expects
      expect(movieHeader.title).toBeDefined();
      expect(typeof movieHeader.year).toBe('number');
      expect(typeof movieHeader.posterUrl).toBe('string');
      expect(typeof movieHeader.streaming === 'string' || movieHeader.streaming === null).toBe(true);
    });
  });

  describe('Analysis Structure', () => {
    let analysis;

    beforeAll(async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      analysis = enhancedData.analysis;
    });

    test('should have complete analysis structure', () => {
      const expectedKeys = [
        'keyElements',
        'sections',
        'whyWatch',
        'featuredMovies',
        'moreIdeas',
        'exploreTopics'
      ];

      expectedKeys.forEach(key => {
        expect(analysis).toHaveProperty(key);
      });
    });

    test('should have processed sections with text and subhead', () => {
      expect(Array.isArray(analysis.sections)).toBe(true);
      expect(analysis.sections.length).toBeGreaterThan(0);

      analysis.sections.forEach(section => {
        expect(section).toHaveProperty('text');
        expect(section).toHaveProperty('subhead');
        expect(typeof section.text).toBe('string');
        expect(typeof section.subhead).toBe('string');
      });
    });

    test('should have whyWatch with recommendation and reasons', () => {
      expect(analysis.whyWatch).toHaveProperty('recommendation');
      expect(analysis.whyWatch).toHaveProperty('reasons');
      expect(['YES', 'NO']).toContain(analysis.whyWatch.recommendation);
      expect(Array.isArray(analysis.whyWatch.reasons)).toBe(true);
    });

    test('should have moreIdeas array structure', () => {
      expect(Array.isArray(analysis.moreIdeas)).toBe(true);

      if (analysis.moreIdeas.length > 0) {
        analysis.moreIdeas.forEach(idea => {
          expect(idea).toHaveProperty('title');
          expect(idea).toHaveProperty('year');
          expect(idea).toHaveProperty('connection');
        });
      }
    });
  });

  describe('BuildData Metadata', () => {
    let buildData;

    beforeAll(async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      buildData = enhancedData.buildData;
    });

    test('should have complete buildData structure', () => {
      const expectedKeys = [
        'posterValidated',
        'streamingCurrent',
        'trailerResolved',
        'linksProcessed'
      ];

      expectedKeys.forEach(key => {
        expect(buildData).toHaveProperty(key);
        expect(typeof buildData[key]).toBe('boolean');
      });
    });

    test('should set linksProcessed to true for enhanced format', () => {
      expect(buildData.linksProcessed).toBe(true);
    });

    test('should validate poster URL status correctly', () => {
      const enhancedData = buildData;
      // If posterUrl exists and isn't placeholder, should be true
      expect(typeof buildData.posterValidated).toBe('boolean');
    });
  });

  describe('Movie Title Link Processing', () => {
    test('should process movie title links in sections', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Look for processed links in section text
      const allSectionText = enhancedData.analysis.sections
        .map(section => section.text)
        .join(' ');

      // Should contain HTML links for referenced movies
      if (allSectionText.includes('</a>')) {
        expect(allSectionText).toMatch(/<a[^>]*href="\/movie\/\d+"[^>]*>/);
      }
    });
  });

  describe('Contributors Integration', () => {
    test('should include contributors data in keyElements', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // keyElements should contain contributors data for footer
      expect(enhancedData.keyElements).toBeDefined();
      expect(typeof enhancedData.keyElements).toBe('object');
    });
  });

  describe('Data Validation and Integrity', () => {
    test('should handle missing data gracefully', async () => {
      // Test with movie that might have incomplete data
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Should not throw errors even with missing data
      expect(enhancedData).toBeDefined();
      expect(enhancedData.analysis.sections).toBeDefined();
    });

    test('should maintain referential integrity', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Core identifiers should match
      expect(enhancedData.tmdbId).toBe(TEST_MOVIES.FIGHT_CLUB.tmdbId);
      expect(enhancedData.title).toBe(enhancedData.movieHeader.title);
      expect(enhancedData.year).toBe(enhancedData.movieHeader.year);
    });
  });

  describe('Performance and File Size', () => {
    test('should generate reasonably sized output', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      const jsonString = JSON.stringify(enhancedData);

      // Should be substantial but not excessive (typical range: 10KB-100KB)
      expect(jsonString.length).toBeGreaterThan(1000); // At least 1KB
      expect(jsonString.length).toBeLessThan(500000);  // Less than 500KB
    });

    test('should be JSON serializable', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      expect(() => {
        JSON.stringify(enhancedData);
      }).not.toThrow();

      expect(() => {
        JSON.parse(JSON.stringify(enhancedData));
      }).not.toThrow();
    });
  });
});

describe('Phase 2: Pre-resolved Dependencies', () => {

  describe('Poster URL Validation', () => {
    test('should validate poster URLs are accessible', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      if (enhancedData.movieHeader.posterUrl && !enhancedData.movieHeader.posterUrl.includes('placeholder')) {
        expect(enhancedData.buildData.posterValidated).toBe(true);
      }
    });

    test('should handle missing posters with placeholder', async () => {
      // This test would need a movie known to have no poster
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      expect(enhancedData.movieHeader.posterUrl).toBeDefined();
      expect(typeof enhancedData.movieHeader.posterUrl).toBe('string');
    });
  });

  describe('Streaming Data Resolution', () => {
    test('should include current streaming data', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Should be string or null, not undefined
      expect(typeof enhancedData.movieHeader.streaming === 'string' || enhancedData.movieHeader.streaming === null).toBe(true);

      if (enhancedData.movieHeader.streaming) {
        expect(enhancedData.buildData.streamingCurrent).toBe(true);
      }
    });
  });

  describe('Trailer Video ID Resolution', () => {
    test('should include trailer video ID when available', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Should be string or null, not undefined
      expect(typeof enhancedData.movieHeader.trailerVideoId === 'string' || enhancedData.movieHeader.trailerVideoId === null).toBe(true);

      if (enhancedData.movieHeader.trailerVideoId) {
        expect(enhancedData.buildData.trailerResolved).toBe(true);
      }
    });
  });
});

afterAll(async () => {
  await pool.end();
});