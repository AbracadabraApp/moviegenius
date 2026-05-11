/**
 * GET /api/v1/collections/[id]
 *
 * Returns collection data with subcategories, annotations, and tags
 *
 * Path Parameters:
 * - id: collection ID (string)
 *
 * Response:
 * {
 *   collection: {
 *     id: string,
 *     title: string,
 *     subtitle?: string,
 *     subcategories: [{
 *       id: string,
 *       name: string,
 *       description?: string,
 *       movies: [{
 *         tmdb_id: number,
 *         title: string,
 *         year?: number,
 *         note?: string,
 *         tags?: string[]
 *       }]
 *     }]
 *   },
 *   movies: [{
 *     tmdb_id: number,
 *     title: string,
 *     year?: number,
 *     poster_url?: string
 *   }]
 * }
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Mock data for demonstration
const MOCK_DATA = {
  'demo': {
    collection: {
      id: 'demo',
      title: 'Studying Abroad Films',
      subtitle: 'Films centered on characters who leave their home country to study, travel, or immerse themselves in a foreign culture, experiencing transformation through displacement.',
      subcategories: [
        {
          id: 'classic-european',
          name: 'Classic European Immersion',
          description: 'American or British protagonists discover themselves while studying or living in Europe, often involving romance and cultural awakening.',
          movies: [
            { tmdb_id: 804,   title: 'Roman Holiday',             year: 1953, note: 'An American journalist abroad guides a runaway princess through Rome in a single transformative day.',                                    tags: ['romance','Italy','classic'] },
            { tmdb_id: 41503, title: 'Three Coins in the Fountain',year: 1954, note: 'Three American women working and studying in Rome each pursue love while navigating a foreign city.',                                   tags: ['romance','Italy','classic'] },
            { tmdb_id: 50363, title: 'Summertime',                 year: 1955, note: 'A lonely American secretary vacationing in Venice falls in love and discovers a deeper sense of self.',                                  tags: ['romance','Italy','classic'] },
            { tmdb_id: 18736, title: 'The Lizzie McGuire Movie',   year: 2003, note: 'A teenage girl\'s class trip to Rome becomes a transformative adventure involving mistaken identity.',                                   tags: ['teen','Italy','coming-of-age'] },
            { tmdb_id: 13320, title: 'Funny Face',                 year: 1957, note: 'A bookish American shop girl is whisked to Paris for a fashion shoot and studies existentialism while falling in love.',                 tags: ['romance','France','classic'] },
          ]
        },
        {
          id: 'coming-of-age',
          name: 'Coming-of-Age Abroad',
          description: 'Young protagonists undergo significant personal growth and identity formation specifically because of their time in a foreign country.',
          movies: [
            { tmdb_id: 116745, title: 'The Secret Life of Walter Mitty', year: 2013, note: 'A daydreaming magazine worker travels the world and finally lives the adventurous life he always imagined.',                     tags: ['adventure','self-discovery','drama'] },
            { tmdb_id: 14421,  title: 'The Year My Parents Went on Vacation', year: 2006, note: 'A Brazilian boy left with strangers during the 1970 World Cup navigates displacement and cultural belonging.',              tags: ['drama','Brazil','childhood'] },
            { tmdb_id: 1786,   title: 'Au Revoir les Enfants',         year: 1987, note: 'A French boy at a Catholic boarding school befriends a Jewish student hiding in plain sight, losing his innocence.',              tags: ['war','France','drama'] },
            { tmdb_id: 18602,  title: 'Morvern Callar',                year: 2002, note: 'A young Scottish woman flees grief by traveling to Spain, reinventing herself through radical displacement.',                      tags: ['drama','Spain','identity'] },
            { tmdb_id: 1391,   title: 'Y Tu Mamá También',             year: 2001, note: 'Two Mexican teens travel across their own country with an older woman, discovering adulthood and political reality.',               tags: ['road trip','Mexico','coming-of-age'] },
          ]
        }
      ]
    },
    movie_ids: [804, 41503, 50363, 18736, 13320, 116745, 14421, 1786, 18602, 1391]
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Collection ID is required' });
  }

  try {
    // Check for mock data first
    if (MOCK_DATA[id]) {
      const mockData = MOCK_DATA[id];

      const moviesResult = await pool.query(
        `SELECT tmdb_id, title, year, poster_url FROM movies WHERE tmdb_id = ANY($1) ORDER BY year DESC`,
        [mockData.movie_ids]
      );

      return res.status(200).json({
        collection: mockData.collection,
        movies: moviesResult.rows,
      });
    }

    // Real data path
    const collectionResult = await pool.query(
      `SELECT id, revised_title, editorial_data
       FROM browse_lists
       WHERE id = $1 AND editorial_data IS NOT NULL`,
      [id]
    );

    if (collectionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const collectionRow = collectionResult.rows[0];
    const editorial = collectionRow.editorial_data;

    // Extract all tmdb_ids mentioned in editorial_data subcategories
    const tmdbIds = [];
    for (const sub of (editorial.subcategories || [])) {
      for (const m of (sub.movies || [])) {
        if (m.tmdb_id) tmdbIds.push(m.tmdb_id);
      }
    }

    const moviesResult = tmdbIds.length > 0
      ? await pool.query(
          `SELECT tmdb_id, title, year, poster_url FROM movies WHERE tmdb_id = ANY($1)`,
          [tmdbIds]
        )
      : { rows: [] };

    const collection = {
      id: collectionRow.id,
      title: collectionRow.revised_title,
      ...editorial,
    };

    res.status(200).json({
      collection,
      movies: moviesResult.rows,
    });

  } catch (error) {
    console.error('[v1] Collection API error:', error);
    res.status(500).json({
      error: 'Failed to fetch collection',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
