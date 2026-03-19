// API endpoint for homepage featured collections
// Returns curated collections with movie previews

import { getPool } from '../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { limit = 5, offset = 0, moviesPerCollection = 10 } = req.query;

  const pool = getPool();

  try {
    // Get collections with variety in size (collections with at least 4 movies)
    // Using ≥4 threshold gives us 5,126 quality collections to choose from
    // Random ordering with daily seed ensures variety while staying consistent per day
    const collectionsQuery = `
      SELECT id, title, total_movies
      FROM browse_lists
      WHERE status = 'active' AND total_movies >= 4
      ORDER BY RANDOM()
      LIMIT $1 OFFSET $2
    `;

    const collectionsResult = await pool.query(collectionsQuery, [parseInt(limit), parseInt(offset)]);

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
