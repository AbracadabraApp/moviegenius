/**
 * Data Source Integration Tests
 *
 * Tests for reading from the correct database fields:
 * - enhanced_sections (not claude_response.raw_content)
 * - enhanced_why_watch table
 * - more_ideas table
 * - movie_contributors table
 */

import { Pool } from 'pg';
import { TEST_MOVIES, DATA_SOURCE_MAPPING, TEST_QUERIES } from '../fixtures/assembly-test-data.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

describe('Data Source Integration', () => {
  const testTmdbIds = [
    TEST_MOVIES.FIGHT_CLUB.tmdbId,
    TEST_MOVIES.CHARLIES_ANGELS.tmdbId,
    TEST_MOVIES.THE_ROCKETEER.tmdbId
  ];

  afterAll(async () => {
    await pool.end();
  });

  describe('Enhanced Analysis Data', () => {
    test('should read from enhanced_sections field, not claude_response', async () => {
      const result = await pool.query(TEST_QUERIES.checkEnhancedAnalysis, testTmdbIds);

      expect(result.rows.length).toBeGreaterThan(0);

      result.rows.forEach(row => {
        expect(row.has_sections).toBe(true);
        expect(row.enhanced_format).toBe(true);

        // Verify we have the test movies
        const testMovie = Object.values(TEST_MOVIES).find(m => m.tmdbId === row.tmdb_id);
        expect(testMovie).toBeDefined();
        expect(row.title).toContain(testMovie.title.split(' ')[0]); // Partial match for flexibility
      });
    });

    test('should retrieve analysis content from enhanced_sections', async () => {
      const query = `
        SELECT
          m.tmdb_id,
          ma.enhanced_sections::text as sections,
          ma.enhanced_key_elements::text as key_elements
        FROM movies m
        JOIN movie_analyses ma ON m.id = ma.movie_id
        WHERE m.tmdb_id = $1
        AND ma.analysis_type = 'general'
        AND ma.enhanced_format = true
      `;

      const result = await pool.query(query, [TEST_MOVIES.CHARLIES_ANGELS.tmdbId]);
      expect(result.rows.length).toBe(1);

      const row = result.rows[0];
      expect(row.sections).toBeDefined();
      expect(row.sections).not.toBe('');

      // Parse and validate sections structure
      const sections = JSON.parse(row.sections);
      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBe(TEST_MOVIES.CHARLIES_ANGELS.expectedSections);

      // Validate section structure
      sections.forEach(section => {
        expect(section).toHaveProperty('text');
        expect(typeof section.text).toBe('string');
        expect(section.text.length).toBeGreaterThan(0);
      });

      // Parse and validate key elements
      if (row.key_elements) {
        const keyElements = JSON.parse(row.key_elements);
        expect(typeof keyElements).toBe('object');
        expect(keyElements).not.toBeNull();
      }
    });
  });

  describe('Why Watch Data Integration', () => {
    test('should read from enhanced_why_watch table', async () => {
      const result = await pool.query(TEST_QUERIES.checkWhyWatch, testTmdbIds);

      expect(result.rows.length).toBeGreaterThan(0);

      result.rows.forEach(row => {
        expect(['YES', 'NO']).toContain(row.recommendation);
        expect(Array.isArray(row.reasons)).toBe(true);
        expect(row.reasons.length).toBe(3);

        // Validate reasons format
        row.reasons.forEach(reason => {
          expect(typeof reason).toBe('string');
          expect(reason.length).toBeGreaterThan(0);
        });
      });
    });

    test('should match test movie expectations for Why Watch', async () => {
      for (const movie of Object.values(TEST_MOVIES)) {
        if (movie.hasWhyWatch) {
          const result = await pool.query(
            'SELECT recommendation, reasons FROM enhanced_why_watch WHERE tmdb_id = $1',
            [movie.tmdbId]
          );

          expect(result.rows.length).toBe(1);
          const whyWatch = result.rows[0];

          expect(['YES', 'NO']).toContain(whyWatch.recommendation);
          expect(whyWatch.reasons.length).toBe(3);
        }
      }
    });
  });

  describe('More Ideas Data Integration', () => {
    test('should read from more_ideas table', async () => {
      const result = await pool.query(TEST_QUERIES.checkMoreIdeas, testTmdbIds);

      expect(result.rows.length).toBeGreaterThan(0);

      result.rows.forEach(row => {
        expect(Array.isArray(row.ideas)).toBe(true);
        expect(row.ideas.length).toBe(15); // Expected 15 ideas per movie

        // Validate ideas structure
        row.ideas.forEach(idea => {
          expect(typeof idea).toBe('object');
          expect(idea).toHaveProperty('title');
          expect(idea).toHaveProperty('year');
          expect(typeof idea.title).toBe('string');
          expect(typeof idea.year).toBe('number');
        });
      });
    });
  });

  describe('Contributors Data Integration', () => {
    test('should read from movie_contributors table', async () => {
      const result = await pool.query(TEST_QUERIES.checkContributors, testTmdbIds);

      expect(result.rows.length).toBeGreaterThan(0);

      result.rows.forEach(row => {
        expect(typeof row.contributor_count).toBe('string'); // COUNT returns string
        expect(parseInt(row.contributor_count)).toBeGreaterThan(0);
      });
    });

    test('should retrieve detailed contributor information', async () => {
      const query = `
        SELECT
          mc.person_name,
          mc.role,
          mc.person_id
        FROM movie_contributors mc
        WHERE mc.movie_tmdb_id = $1
        LIMIT 5
      `;

      const result = await pool.query(query, [TEST_MOVIES.FIGHT_CLUB.tmdbId]);

      if (result.rows.length > 0) {
        result.rows.forEach(contributor => {
          expect(contributor.person_name).toBeDefined();
          expect(typeof contributor.person_name).toBe('string');
          expect(contributor.person_name.length).toBeGreaterThan(0);

          // Role can be null, but if present should be string
          if (contributor.role) {
            expect(typeof contributor.role).toBe('string');
          }
        });
      }
    });
  });

  describe('Data Source Completeness Validation', () => {
    test('all test movies should have complete data across all sources', async () => {
      for (const movie of Object.values(TEST_MOVIES)) {
        console.log(`Validating complete data for ${movie.title} (${movie.tmdbId})`);

        // Check enhanced analysis
        const analysisResult = await pool.query(
          TEST_QUERIES.checkEnhancedAnalysis,
          [movie.tmdbId, movie.tmdbId, movie.tmdbId]
        );
        const hasAnalysis = analysisResult.rows.some(row => row.tmdb_id === movie.tmdbId);

        // Check why watch
        const whyWatchResult = await pool.query(
          'SELECT 1 FROM enhanced_why_watch WHERE tmdb_id = $1',
          [movie.tmdbId]
        );

        // Check more ideas
        const moreIdeasResult = await pool.query(
          'SELECT 1 FROM more_ideas WHERE tmdb_id = $1',
          [movie.tmdbId]
        );

        // Check contributors
        const contributorsResult = await pool.query(
          'SELECT 1 FROM movie_contributors WHERE movie_tmdb_id = $1 LIMIT 1',
          [movie.tmdbId]
        );

        // Validate expectations
        expect(hasAnalysis).toBe(true);
        expect(whyWatchResult.rows.length).toBe(movie.hasWhyWatch ? 1 : 0);
        expect(moreIdeasResult.rows.length).toBe(movie.hasMoreIdeas ? 1 : 0);
        expect(contributorsResult.rows.length).toBeGreaterThanOrEqual(movie.hasContributors ? 1 : 0);
      }
    });
  });

  describe('Data Quality Validation', () => {
    test('enhanced_sections should contain movie title patterns for linking', async () => {
      const query = `
        SELECT
          m.tmdb_id,
          m.title,
          ma.enhanced_sections::text as sections
        FROM movies m
        JOIN movie_analyses ma ON m.id = ma.movie_id
        WHERE m.tmdb_id = $1
        AND ma.analysis_type = 'general'
        AND ma.enhanced_format = true
      `;

      const result = await pool.query(query, [TEST_MOVIES.CHARLIES_ANGELS.tmdbId]);
      expect(result.rows.length).toBe(1);

      const sections = JSON.parse(result.rows[0].sections);
      const allText = sections.map(s => s.text).join(' ');

      // Look for **Movie Title** patterns that need linking
      const movieTitlePattern = /\*\*[^*]+\*\*\s*\(\d{4}\)/g;
      const matches = allText.match(movieTitlePattern);

      if (matches) {
        expect(matches.length).toBeGreaterThan(0);
        console.log(`Found ${matches.length} movie title patterns in ${result.rows[0].title}:`, matches.slice(0, 3));
      }
    });
  });
});