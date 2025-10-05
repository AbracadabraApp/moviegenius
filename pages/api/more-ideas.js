// Independent More Ideas API - Works for any movie regardless of analysis status
// Returns related movie suggestions from the database

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
      // Query for More Ideas data from more_ideas table
      const query = `
        SELECT
          m.title,
          m.year,
          m.tmdb_id,
          mi.ideas
        FROM movies m
        LEFT JOIN more_ideas mi ON m.tmdb_id = mi.tmdb_id
        WHERE m.tmdb_id = $1
        LIMIT 1
      `;

      const result = await client.query(query, [parseInt(tmdbId)]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Movie not found',
          tmdbId: parseInt(tmdbId)
        });
      }

      const movie = result.rows[0];
      let moreIdeas = null;

      // Extract More Ideas from the ideas JSONB column
      if (movie.ideas) {
        try {
          // ideas column is already parsed JSONB, so we can access it directly
          if (Array.isArray(movie.ideas)) {
            moreIdeas = movie.ideas;
          } else if (movie.ideas.moreIdeas && Array.isArray(movie.ideas.moreIdeas)) {
            moreIdeas = movie.ideas.moreIdeas;
          } else if (movie.ideas.ideas && Array.isArray(movie.ideas.ideas)) {
            moreIdeas = movie.ideas.ideas;
          }
        } catch (parseError) {
          console.warn(`Failed to parse More Ideas for movie ${tmdbId}:`, parseError.message);
        }
      }

      // Format more ideas for MediaCard compatibility
      const formattedMoreIdeas = moreIdeas ? moreIdeas.map(idea => ({
        title: idea.title,
        year: idea.year,
        connection: idea.connection || idea.reason || idea.description,
        // Add MediaCard compatible fields
        initialSlug: idea.connection || idea.reason || idea.description,
        tmdbId: idea.tmdbId || null // Will be resolved by MediaCard if not provided
      })) : [];

      // Response format
      const response = {
        movie: {
          title: movie.title,
          year: movie.year,
          tmdbId: movie.tmdb_id
        },
        moreIdeas: formattedMoreIdeas,
        hasData: moreIdeas && moreIdeas.length > 0,
        source: moreIdeas ? 'more_ideas_table' : 'no_data',
        count: formattedMoreIdeas.length
      };

      return res.status(200).json(response);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('More Ideas API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}