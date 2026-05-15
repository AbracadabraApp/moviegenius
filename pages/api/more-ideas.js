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

      // Enrich more ideas with tmdb_id and poster from movies table
      // FILTER OUT movies not in our catalog (null tmdbId)
      const formattedMoreIdeas = moreIdeas ? (await Promise.all(moreIdeas.map(async (idea) => {
        // Use tmdbId from JSONB if available (after backfill), otherwise look up
        let tmdbId = idea.tmdbId || null;
        let posterUrl = null;

        if (!tmdbId) {
          // Fallback: Look up movie in database to get tmdb_id and poster
          const movieLookup = await client.query(`
            SELECT tmdb_id, poster_url
            FROM movies
            WHERE LOWER(title) = LOWER($1) AND year = $2
            LIMIT 1
          `, [idea.title, idea.year]);

          const movieData = movieLookup.rows[0];
          tmdbId = movieData?.tmdb_id || null;
          posterUrl = movieData?.poster_url || null;
        } else {
          // Fetch poster for existing tmdbId
          const posterLookup = await client.query(`
            SELECT poster_url FROM movies WHERE tmdb_id = $1
          `, [tmdbId]);
          posterUrl = posterLookup.rows[0]?.poster_url || null;
        }

        // Only return if we have a valid tmdbId (movie in catalog)
        if (!tmdbId) {
          return null;
        }

        return {
          title: idea.title,
          year: idea.year,
          connection: idea.connection || idea.reason || idea.description,
          initialSlug: idea.connection || idea.reason || idea.description,
          tmdbId: tmdbId,
          posterUrl: posterUrl
        };
      }))).filter(idea => idea !== null) : [];

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