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
      // TIER 1: Try enhanced_why_watch table first (preferred clean data)
      const enhancedQuery = `
        SELECT
          m.title,
          m.year,
          m.tmdb_id,
          eww.recommendation,
          eww.reasons
        FROM movies m
        LEFT JOIN enhanced_why_watch eww ON m.tmdb_id = eww.tmdb_id
        WHERE m.tmdb_id = $1
        LIMIT 1
      `;

      const enhancedResult = await client.query(enhancedQuery, [parseInt(tmdbId)]);

      if (enhancedResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Movie not found',
          tmdbId: parseInt(tmdbId)
        });
      }

      const movie = enhancedResult.rows[0];
      let whyWatch = null;

      // Try enhanced table first
      if (movie.recommendation && movie.reasons) {
        try {
          const reasons = Array.isArray(movie.reasons) ? movie.reasons :
                         (movie.reasons.reasons && Array.isArray(movie.reasons.reasons)) ? movie.reasons.reasons : [];

          whyWatch = {
            recommendation: movie.recommendation,
            reasons: reasons
          };
        } catch (parseError) {
          console.warn(`Failed to parse enhanced Why Watch for movie ${tmdbId}:`, parseError.message);
        }
      }

      // TIER 2: Fallback to movie_analyses if no enhanced data
      if (!whyWatch) {
        const fallbackQuery = `
          SELECT ma.claude_response
          FROM movies m
          LEFT JOIN movie_analyses ma ON m.id = ma.movie_id
          WHERE m.tmdb_id = $1
          LIMIT 1
        `;

        const fallbackResult = await client.query(fallbackQuery, [parseInt(tmdbId)]);

        if (fallbackResult.rows.length > 0 && fallbackResult.rows[0].claude_response) {
          try {
            const response = fallbackResult.rows[0].claude_response;

            // Check if it's the new structured format
            if (typeof response === 'object' && response.raw_content) {
              const rawContent = typeof response.raw_content === 'string'
                ? JSON.parse(response.raw_content)
                : response.raw_content;

              if (rawContent && rawContent.whyWatch) {
                whyWatch = rawContent.whyWatch;
              }
            }
            // Check if claude_response itself contains whyWatch
            else if (response.whyWatch) {
              whyWatch = response.whyWatch;
            }
          } catch (parseError) {
            console.warn(`Failed to parse fallback Why Watch for movie ${tmdbId}:`, parseError.message);
          }
        }
      }

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
        hasData: !!whyWatch,
        source: whyWatch ? (movie.recommendation ? 'enhanced_why_watch_table' : 'movie_analyses_fallback') : 'no_data'
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