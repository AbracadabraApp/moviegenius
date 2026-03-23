// Independent Why Watch API - Works for any movie regardless of analysis status
// Returns YES/NO recommendation with reasons from the database

import { getPool } from '../../lib/database';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tmdbId } = req.query;

  if (!tmdbId || isNaN(parseInt(tmdbId))) {
    return res.status(400).json({
      error: 'Valid tmdbId parameter is required'
    });
  }

  const pool = getPool();

  try {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT
          m.title,
          m.year,
          m.tmdb_id,
          v3.recommendation,
          v3.reasons,
          v3.context
        FROM movies m
        LEFT JOIN enhanced_why_watch_v3 v3 ON m.tmdb_id = v3.tmdb_id
        WHERE m.tmdb_id = $1
        LIMIT 1
      `, [parseInt(tmdbId)]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Movie not found',
          tmdbId: parseInt(tmdbId)
        });
      }

      const movie = result.rows[0];
      const hasData = !!(movie.recommendation && movie.reasons);

      const whyWatch = hasData ? {
        recommendation: movie.recommendation,
        reasons: Array.isArray(movie.reasons) ? movie.reasons : [],
        context: movie.context || null
      } : null;

      // Response format
      const response = {
        movie: {
          title: movie.title,
          year: movie.year,
          tmdbId: movie.tmdb_id
        },
        whyWatch: whyWatch || {
          recommendation: "UNKNOWN",
          reasons: ["Analysis not yet available for this movie."]
        },
        hasData,
        source: hasData ? 'enhanced_why_watch_v3' : 'no_data'
      };

      return res.status(200).json(response);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Why Watch API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}