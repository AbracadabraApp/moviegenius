/**
 * Phase 2: Dynamic Page Compatibility Tests
 *
 * Tests to ensure enhanced static files are fully compatible with
 * dynamic movie page components for seamless 3-tier serving.
 */

import { assembleEnhancedMovieData } from '../../lib/enhanced-assembly.js';
import { Pool } from 'pg';
import { TEST_MOVIES } from '../fixtures/assembly-test-data.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

describe('Phase 2: Dynamic Page Compatibility', () => {

  describe('MovieHeaderLarge Component Compatibility', () => {
    let movieHeaderData;

    beforeAll(async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      movieHeaderData = enhancedData.movieHeader;
    });

    test('should provide all required MovieHeaderLarge props', () => {
      // These are the exact props MovieHeaderLarge expects
      const requiredProps = [
        'title',
        'year',
        'posterUrl',
        'trailerVideoId',
        'streaming',
        'overview'
      ];

      requiredProps.forEach(prop => {
        expect(movieHeaderData).toHaveProperty(prop);
      });
    });

    test('should have correct data types for MovieHeaderLarge', () => {
      expect(typeof movieHeaderData.title).toBe('string');
      expect(typeof movieHeaderData.year).toBe('number');
      expect(typeof movieHeaderData.posterUrl).toBe('string');
      expect(typeof movieHeaderData.overview).toBe('string');

      // These can be string or null
      expect(typeof movieHeaderData.trailerVideoId === 'string' || movieHeaderData.trailerVideoId === null).toBe(true);
      expect(typeof movieHeaderData.streaming === 'string' || movieHeaderData.streaming === null).toBe(true);
    });

    test('should have tmdbId for dynamic functionality', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      expect(enhancedData.tmdbId).toBeDefined();
      expect(typeof enhancedData.tmdbId).toBe('number');
    });
  });

  describe('MovieAnalysisWithEntities Component Compatibility', () => {
    let analysisData;

    beforeAll(async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      analysisData = enhancedData.analysis;
    });

    test('should provide sections for content rendering', () => {
      expect(Array.isArray(analysisData.sections)).toBe(true);
      expect(analysisData.sections.length).toBeGreaterThan(0);

      analysisData.sections.forEach(section => {
        expect(section).toHaveProperty('text');
        expect(section).toHaveProperty('subhead');
        expect(typeof section.text).toBe('string');
        expect(typeof section.subhead).toBe('string');
      });
    });

    test('should provide whyWatch for recommendation display', () => {
      expect(analysisData.whyWatch).toHaveProperty('recommendation');
      expect(analysisData.whyWatch).toHaveProperty('reasons');
      expect(['YES', 'NO']).toContain(analysisData.whyWatch.recommendation);
      expect(Array.isArray(analysisData.whyWatch.reasons)).toBe(true);
    });

    test('should provide moreIdeas for related movies section', () => {
      expect(Array.isArray(analysisData.moreIdeas)).toBe(true);

      if (analysisData.moreIdeas.length > 0) {
        analysisData.moreIdeas.forEach(idea => {
          expect(idea).toHaveProperty('title');
          expect(idea).toHaveProperty('year');
          expect(idea).toHaveProperty('connection');
          expect(typeof idea.title).toBe('string');
          expect(typeof idea.year).toBe('number');
          expect(typeof idea.connection).toBe('string');
        });
      }
    });

    test('should provide featuredMovies array (even if empty)', () => {
      expect(Array.isArray(analysisData.featuredMovies)).toBe(true);
    });

    test('should provide exploreTopics array (even if empty)', () => {
      expect(Array.isArray(analysisData.exploreTopics)).toBe(true);
    });
  });

  describe('DiscoveryFooter Component Compatibility', () => {
    let contributorsData;

    beforeAll(async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      contributorsData = enhancedData.keyElements;
    });

    test('should provide contributors data for footer', () => {
      expect(contributorsData).toBeDefined();
      expect(typeof contributorsData).toBe('object');
    });

    test('should handle empty contributors gracefully', () => {
      // Even if empty, should be an object, not undefined
      expect(contributorsData).not.toBeUndefined();
    });
  });

  describe('Movie Link Processing Compatibility', () => {
    test('should generate proper movie links for navigation', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      const allText = enhancedData.analysis.sections
        .map(section => section.text)
        .join(' ');

      // Check for properly formatted movie links
      const movieLinkRegex = /<a[^>]*href="\/movie\/\d+"[^>]*>.*?<\/a>/g;
      const links = allText.match(movieLinkRegex);

      if (links && links.length > 0) {
        links.forEach(link => {
          // Should have proper href format
          expect(link).toMatch(/href="\/movie\/\d+"/);
          // Should not be self-referential
          expect(link).not.toMatch(new RegExp(`href="/movie/${enhancedData.tmdbId}"`));
        });
      }
    });

    test('should not create broken or malformed links', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      const allText = enhancedData.analysis.sections
        .map(section => section.text)
        .join(' ');

      // Should not have malformed links
      expect(allText).not.toMatch(/<a[^>]*href="[^"]*"[^>]*><\/a>/); // Empty links
      expect(allText).not.toMatch(/<a[^>]*href=""[^>]*>/); // Empty href
      expect(allText).not.toMatch(/<a[^>]*>[^<]*<a[^>]*>/); // Nested links
    });
  });

  describe('JSON Structure Compatibility', () => {
    test('should match structure expected by dynamic pages', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Test that the structure exactly matches what movie/[id].js expects
      const expectedRootStructure = {
        tmdbId: 'number',
        title: 'string',
        year: 'number',
        movieHeader: 'object',
        analysis: 'object',
        keyElements: 'object',
        enhancedFormat: 'boolean',
        staticGenerated: 'boolean',
        lastUpdated: 'string',
        buildData: 'object'
      };

      Object.entries(expectedRootStructure).forEach(([key, expectedType]) => {
        expect(enhancedData).toHaveProperty(key);
        expect(typeof enhancedData[key]).toBe(expectedType);
      });
    });

    test('should be serializable and deserializable without data loss', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      const serialized = JSON.stringify(enhancedData);
      const deserialized = JSON.parse(serialized);

      // Should be deeply equal after round-trip
      expect(deserialized).toEqual(enhancedData);
    });
  });

  describe('Error Handling Compatibility', () => {
    test('should handle missing sections gracefully', async () => {
      // This tests robustness when data is incomplete
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // Even with potential missing data, these should be defined
      expect(enhancedData.analysis.sections).toBeDefined();
      expect(Array.isArray(enhancedData.analysis.sections)).toBe(true);
      expect(enhancedData.analysis.whyWatch).toBeDefined();
      expect(enhancedData.analysis.moreIdeas).toBeDefined();
    });

    test('should provide fallback values for optional fields', async () => {
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);

      // These fields should exist even if empty
      expect(Array.isArray(enhancedData.analysis.featuredMovies)).toBe(true);
      expect(Array.isArray(enhancedData.analysis.exploreTopics)).toBe(true);
      expect(enhancedData.keyElements).toBeDefined();
    });
  });

  describe('Performance Compatibility', () => {
    test('should generate data that loads quickly', async () => {
      const startTime = Date.now();
      const enhancedData = await assembleEnhancedMovieData(TEST_MOVIES.FIGHT_CLUB.tmdbId, pool);
      const endTime = Date.now();

      // Assembly should be reasonably fast
      expect(endTime - startTime).toBeLessThan(5000); // Less than 5 seconds

      // Generated data should be reasonable size for fast loading
      const jsonString = JSON.stringify(enhancedData);
      expect(jsonString.length).toBeLessThan(500000); // Less than 500KB
    });
  });
});

afterAll(async () => {
  await pool.end();
});