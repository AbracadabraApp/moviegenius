// pages/api/movie-contributors.js
/**
 * Movie Contributors API Route
 * 
 * Fetches contributors for a specific movie from Railway contributors data
 * Used by MovieCreativeFooter to display contributor information
 */

import { Client } from 'pg';

// Railway PostgreSQL connection helper
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  
  return new Client({ connectionString: dbUrl });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { movieId } = req.body;

  if (!movieId || isNaN(parseInt(movieId))) {
    return res.status(400).json({ error: 'Valid movie ID is required' });
  }

  const tmdbId = parseInt(movieId);
  const client = getRailwayClient();

  try {
    await client.connect();
    
    // Get contributors for this movie grouped by role
    const contributorsResult = await client.query(`
      SELECT person_name, role
      FROM movie_contributors
      WHERE movie_tmdb_id = $1
      ORDER BY role, person_name
    `, [tmdbId]);

    if (contributorsResult.rows.length === 0) {
      return res.status(200).json({
        movieId: tmdbId,
        contributors: {},
        hasContributors: false
      });
    }

    // Group contributors by role
    const contributors = {};
    contributorsResult.rows.forEach(row => {
      const role = row.role;
      const name = row.person_name;
      
      if (!contributors[role]) {
        contributors[role] = [];
      }
      contributors[role].push(name);
    });

    res.status(200).json({
      movieId: tmdbId,
      contributors,
      hasContributors: true,
      source: 'railway_contributors_data'
    });

  } catch (error) {
    console.error('Error fetching movie contributors:', error);
    res.status(500).json({
      error: 'Failed to fetch movie contributors',
      movieId: tmdbId
    });
  } finally {
    await client.end();
  }
}