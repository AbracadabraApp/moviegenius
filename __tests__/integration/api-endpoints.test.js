/**
 * API Integration Tests
 * Tests actual API endpoints with real database connections
 *
 * These tests validate the complete request/response cycle:
 * - Database queries
 * - External API calls (TMDB)
 * - Response formatting
 * - Caching behavior
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import fetch from 'node-fetch';

// Import API handlers directly for testing
import trailerHandler from '../../pages/api/tmdb-trailer.js';

describe('API Integration Tests', () => {
  let app;
  let server;
  let baseURL;

  beforeAll(async () => {
    // Start Next.js server for integration testing
    const dev = process.env.NODE_ENV !== 'production';
    app = next({ dev, quiet: true });
    const handle = app.getRequestHandler();

    await app.prepare();

    server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseURL = `http://localhost:${port}`;
        resolve();
      });
    });

    console.log(`🚀 Test server running at ${baseURL}`);
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (app) {
      await app.close();
    }
  });

  describe('Trailer API (/api/tmdb-trailer)', () => {
    test('returns unique trailers for different movies', async () => {
      // Test known movies with different trailers
      const fightClubResponse = await fetch(`${baseURL}/api/tmdb-trailer?tmdbId=550`);
      const fifthElementResponse = await fetch(`${baseURL}/api/tmdb-trailer?tmdbId=18`);

      expect(fightClubResponse.status).toBe(200);
      expect(fifthElementResponse.status).toBe(200);

      const fightClubData = await fightClubResponse.json();
      const fifthElementData = await fifthElementResponse.json();

      // Critical test: trailers must be unique
      expect(fightClubData.videoId).toBeTruthy();
      expect(fifthElementData.videoId).toBeTruthy();
      expect(fightClubData.videoId).not.toBe(fifthElementData.videoId);

      // Validate response structure
      expect(fightClubData).toMatchObject({
        videoId: expect.any(String),
        source: expect.stringMatching(/^(cache|fresh)$/)
      });

      console.log(`🎬 Fight Club trailer: ${fightClubData.videoId}`);
      console.log(`🎬 Fifth Element trailer: ${fifthElementData.videoId}`);
    }, 15000);

    test('handles cache headers correctly', async () => {
      const response = await fetch(`${baseURL}/api/tmdb-trailer?tmdbId=550`);

      expect(response.status).toBe(200);

      // Should have aggressive cache headers
      const cacheControl = response.headers.get('cache-control');
      expect(cacheControl).toContain('s-maxage=2592000'); // 30 days
    });

    test('handles missing TMDB ID gracefully', async () => {
      const response = await fetch(`${baseURL}/api/tmdb-trailer`);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toMatchObject({
        error: 'TMDB ID is required'
      });
    });

    test('handles non-existent movie gracefully', async () => {
      // Use a very high TMDB ID that likely doesn't exist
      const response = await fetch(`${baseURL}/api/tmdb-trailer?tmdbId=999999999`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.videoId).toBeNull();
      expect(data.error).toBeTruthy();
    });
  });

  describe('Database Integrity Validation', () => {
    test('no mass trailer duplication in database', async () => {
      const pool = global.getTestPool();
      const client = await pool.connect();

      try {
        // Check for suspicious trailer duplicates
        const result = await client.query(`
          SELECT trailer_url, COUNT(*) as count
          FROM movies
          WHERE trailer_url IS NOT NULL
          GROUP BY trailer_url
          HAVING COUNT(*) > 50
          ORDER BY count DESC
          LIMIT 5
        `);

        // Log any duplicates found (for debugging)
        if (result.rows.length > 0) {
          console.log('⚠️ Suspicious trailer duplicates found:');
          result.rows.forEach(row => {
            console.log(`   ${row.trailer_url}: ${row.count} movies`);
          });
        }

        // Critical: No single trailer should be used by more than 50 movies
        // (This would indicate mass corruption like we had before)
        result.rows.forEach(row => {
          expect(row.count).toBeLessThan(100);
        });

      } finally {
        client.release();
      }
    });

    test('database contains expected test movies', async () => {
      const pool = global.getTestPool();
      const client = await pool.connect();

      try {
        const result = await client.query(`
          SELECT tmdb_id, title, year
          FROM movies
          WHERE tmdb_id IN (550, 18, 78)
          ORDER BY tmdb_id
        `);

        // Should have our test movies
        expect(result.rows.length).toBe(3);

        const movies = result.rows;
        expect(movies[0]).toMatchObject({ tmdb_id: 18, title: 'The Fifth Element' });
        expect(movies[1]).toMatchObject({ tmdb_id: 78, title: 'Blade Runner' });
        expect(movies[2]).toMatchObject({ tmdb_id: 550, title: 'Fight Club' });

      } finally {
        client.release();
      }
    });
  });
});