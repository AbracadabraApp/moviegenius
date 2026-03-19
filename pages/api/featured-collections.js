// API endpoint for homepage featured collections
// Returns curated collections with movie previews

import { getPool } from '../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { limit = 5, moviesPerCollection = 10 } = req.query;

  const pool = getPool();

  try {
    // Get top collections by movie count (most substantial collections)
    const collectionsQuery = `
      SELECT id, title, total_movies
      FROM browse_lists
      WHERE status = 'active' AND total_movies >= 20
      ORDER BY total_movies DESC
      LIMIT $1
    `;

    const collectionsResult = await pool.query(collectionsQuery, [parseInt(limit)]);

    if (collectionsResult.rows.length === 0) {
      return res.status(200).json({
        collections: [],
        message: 'No collections found'
      });
    }

    // For each collection, get preview movies
    const collectionsWithMovies = await Promise.all(
      collectionsResult.rows.map(async (collection) => {
        const moviesQuery = `
          SELECT
            m.id,
            m.tmdb_id,
            m.title,
            m.year,
            m.poster_url
          FROM movies m
          JOIN list_movies lm ON m.id = lm.movie_id
          WHERE lm.list_id = $1
          ORDER BY lm.display_order ASC, lm.relevance_score DESC
          LIMIT $2
        `;

        const moviesResult = await pool.query(moviesQuery, [
          collection.id,
          parseInt(moviesPerCollection)
        ]);

        return {
          id: collection.id,
          title: collection.title,
          totalMovies: collection.total_movies,
          movies: moviesResult.rows.map(row => ({
            id: row.id,
            tmdb_id: row.tmdb_id,
            title: row.title,
            year: row.year,
            poster_url: row.poster_url || '/images/placeholder-poster.jpg'
          }))
        };
      })
    );

    res.status(200).json({
      collections: collectionsWithMovies,
      count: collectionsWithMovies.length
    });

  } catch (error) {
    console.error('Featured collections API error:', error);
    res.status(500).json({
      error: 'Failed to fetch featured collections',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
