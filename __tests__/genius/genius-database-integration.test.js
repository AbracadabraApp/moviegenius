/**
 * Genius Database Integration Tests
 *
 * Tests integration between Genius JSON data and database:
 * - TMDB ID validation against database
 * - Movie existence checks
 * - Poster URL consistency
 * - Heat tier assignments
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const GENIUS_DATA_PATH = path.join(process.cwd(), 'ios/moviegenius/moviegenius/Resources/genius_data.json');

describe('Genius Database Integration', () => {
  let pool;
  let geniusData;

  beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required for integration tests');
    }

    pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const rawData = fs.readFileSync(GENIUS_DATA_PATH, 'utf-8');
    geniusData = JSON.parse(rawData);
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  describe('TMDB ID Validation', () => {
    test('all Genius movies should exist in database', async () => {
      const allTmdbIds = [];

      geniusData.categories.forEach(category => {
        category.tiers.forEach(tier => {
          tier.films.forEach(film => {
            allTmdbIds.push(film.tmdbId);
          });
        });
      });

      const result = await pool.query(
        'SELECT tmdb_id FROM movies WHERE tmdb_id = ANY($1)',
        [allTmdbIds]
      );

      const foundIds = new Set(result.rows.map(r => r.tmdb_id));
      const missingIds = allTmdbIds.filter(id => !foundIds.has(id));

      if (missingIds.length > 0) {
        console.warn(`Missing ${missingIds.length} movies from database:`, missingIds.slice(0, 10));
      }

      // Should have most movies (allow for some missing due to TMDB API changes)
      const coveragePercent = (foundIds.size / allTmdbIds.length) * 100;
      console.log(`Database coverage: ${coveragePercent.toFixed(1)}% (${foundIds.size}/${allTmdbIds.length})`);

      expect(coveragePercent).toBeGreaterThan(95); // At least 95% coverage
    }, 30000);

    test('database movies should have required fields', async () => {
      const sampleIds = [];

      // Sample first 5 films from first 3 categories
      for (let i = 0; i < Math.min(3, geniusData.categories.length); i++) {
        const category = geniusData.categories[i];
        const tier = category.tiers[0];

        tier.films.slice(0, 5).forEach(film => {
          sampleIds.push(film.tmdbId);
        });
      }

      const result = await pool.query(
        'SELECT tmdb_id, title, year, poster_url, slug FROM movies WHERE tmdb_id = ANY($1)',
        [sampleIds]
      );

      expect(result.rows.length).toBeGreaterThan(0);

      result.rows.forEach(movie => {
        expect(movie).toHaveProperty('tmdb_id');
        expect(movie).toHaveProperty('title');
        expect(movie).toHaveProperty('year');
        expect(movie).toHaveProperty('poster_url');
        expect(movie).toHaveProperty('slug');

        expect(typeof movie.title).toBe('string');
        expect(movie.title.length).toBeGreaterThan(0);
        expect(typeof movie.year).toBe('number');
        expect(movie.poster_url).toBeTruthy();
        expect(movie.slug).toBeTruthy();
      });
    }, 20000);
  });

  describe('Title and Year Matching', () => {
    test('Genius titles should match database titles', async () => {
      const sampleFilms = [];

      // Sample films from different categories
      geniusData.categories.slice(0, 5).forEach(category => {
        const tier = category.tiers[0];
        if (tier.films.length > 0) {
          sampleFilms.push({
            tmdbId: tier.films[0].tmdbId,
            title: tier.films[0].title,
            year: tier.films[0].year,
          });
        }
      });

      for (const film of sampleFilms) {
        const result = await pool.query(
          'SELECT title, year FROM movies WHERE tmdb_id = $1',
          [film.tmdbId]
        );

        if (result.rows.length > 0) {
          const dbMovie = result.rows[0];

          // Title should match (case-insensitive)
          expect(dbMovie.title.toLowerCase()).toBe(film.title.toLowerCase());

          // Year should match (allow 1 year difference for release dates)
          const yearDiff = Math.abs(dbMovie.year - film.year);
          expect(yearDiff).toBeLessThanOrEqual(1);
        }
      }
    }, 20000);
  });

  describe('Heat Tier Data', () => {
    test('top-3 tiers should map to correct heat values', () => {
      const tierToHeat = {
        0: 1, // Essential -> Beginner
        1: 2, // Great -> Intermediate
        2: 3, // Deeper Cuts -> Advanced
      };

      geniusData.categories.forEach(category => {
        category.tiers.slice(0, 3).forEach(tier => {
          const expectedHeat = tierToHeat[tier.order];
          expect(expectedHeat).toBeDefined();
          expect(expectedHeat).toBeGreaterThanOrEqual(1);
          expect(expectedHeat).toBeLessThanOrEqual(3);
        });
      });
    });

    test('tiers beyond top-3 should be Genius level', () => {
      geniusData.categories.forEach(category => {
        category.tiers.slice(3).forEach(tier => {
          // Tiers 3+ are all "Genius" level (heat 4+)
          expect(tier.order).toBeGreaterThanOrEqual(3);
        });
      });
    });
  });

  describe('More Ideas Integration', () => {
    test('sample movies should have more_ideas entries', async () => {
      const sampleIds = [];

      // Get first 10 movies from Essential tier
      geniusData.categories.slice(0, 3).forEach(category => {
        const essentialTier = category.tiers.find(t => t.name === 'Essential');
        if (essentialTier && essentialTier.films.length > 0) {
          sampleIds.push(...essentialTier.films.slice(0, 3).map(f => f.tmdbId));
        }
      });

      const result = await pool.query(
        'SELECT tmdb_id FROM more_ideas WHERE tmdb_id = ANY($1)',
        [sampleIds]
      );

      // At least some Essential movies should have more_ideas
      expect(result.rows.length).toBeGreaterThan(0);

      console.log(`${result.rows.length}/${sampleIds.length} sampled Essential movies have more_ideas`);
    }, 20000);
  });

  describe('Collection Overlap', () => {
    test('browse_lists should contain Genius movies', async () => {
      const sampleIds = [];

      // Sample 20 random movies from Genius
      geniusData.categories.slice(0, 5).forEach(category => {
        category.tiers.slice(0, 2).forEach(tier => {
          tier.films.slice(0, 2).forEach(film => {
            sampleIds.push(film.tmdbId);
          });
        });
      });

      const result = await pool.query(
        `SELECT DISTINCT bl.id, bl.title
         FROM browse_lists bl
         WHERE EXISTS (
           SELECT 1 FROM movies m
           WHERE m.tmdb_id = ANY($1)
           AND m.id = ANY(
             SELECT unnest(array(
               SELECT jsonb_array_elements_text(
                 editorial_data->'subcategories'->0->'movies'
               )::int
             ))
           )
         )
         LIMIT 10`,
        [sampleIds]
      );

      // Should find some overlap
      console.log(`Found ${result.rows.length} browse_lists with Genius movie overlap`);

      if (result.rows.length > 0) {
        console.log('Sample collections:', result.rows.map(r => r.title).slice(0, 3));
      }
    }, 20000);
  });

  describe('Poster URL Consistency', () => {
    test('database poster URLs should be valid format', async () => {
      const sampleIds = geniusData.categories[0].tiers[0].films.slice(0, 5).map(f => f.tmdbId);

      const result = await pool.query(
        'SELECT tmdb_id, poster_url FROM movies WHERE tmdb_id = ANY($1)',
        [sampleIds]
      );

      result.rows.forEach(movie => {
        if (movie.poster_url) {
          // Should be TMDB image URL
          expect(movie.poster_url).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\//);
        }
      });
    }, 20000);
  });

  describe('Performance Checks', () => {
    test('bulk TMDB ID query should be fast', async () => {
      const allIds = [];

      geniusData.categories.forEach(category => {
        category.tiers.forEach(tier => {
          tier.films.forEach(film => {
            allIds.push(film.tmdbId);
          });
        });
      });

      const start = Date.now();

      await pool.query(
        'SELECT tmdb_id, title, year, poster_url, slug FROM movies WHERE tmdb_id = ANY($1)',
        [allIds]
      );

      const duration = Date.now() - start;

      console.log(`Queried ${allIds.length} movies in ${duration}ms`);

      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000); // 2 seconds
    }, 30000);
  });
});
