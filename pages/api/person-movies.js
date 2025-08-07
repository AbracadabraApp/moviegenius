// pages/api/person-movies.js
/**
 * Person Movies API Route
 * 
 * Fetches movies featuring a specific person from our internal contributors data
 * Phase 1: Internal data only, no TMDB integration
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

  const { personName } = req.body;

  if (!personName || typeof personName !== 'string') {
    return res.status(400).json({ error: 'Person name is required' });
  }

  const client = getRailwayClient();

  try {
    await client.connect();
    
    // First check if person exists in contributors
    const personCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM movie_contributors 
      WHERE person_name = $1
    `, [personName]);
    
    if (parseInt(personCheck.rows[0].count) === 0) {
      await client.end();
      return res.status(200).json({
        personName,
        movies: [],
        stats: null,
        hasContributors: false
      });
    }
    
    // Get movies and roles for this person from contributors data
    const moviesResult = await client.query(`
      SELECT 
        m.tmdb_id,
        m.title,
        m.year,
        m.slug as overview,
        m.poster_url,
        ARRAY_AGG(DISTINCT mc.role ORDER BY mc.role) as roles
      FROM movie_contributors mc
      JOIN movies m ON m.tmdb_id = mc.movie_tmdb_id
      WHERE mc.person_name = $1
      GROUP BY m.tmdb_id, m.title, m.year, m.slug, m.poster_url
      ORDER BY m.year DESC, m.title
    `, [personName]);

    // Get person statistics
    const statsResult = await client.query(`
      SELECT 
        COUNT(DISTINCT movie_tmdb_id) as movie_count,
        ARRAY_AGG(DISTINCT role ORDER BY role) as roles
      FROM movie_contributors
      WHERE person_name = $1
    `, [personName]);

    const movies = moviesResult.rows.map(movie => ({
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      overview: movie.overview,
      poster_url: movie.poster_url,
      roles: movie.roles
    }));

    const stats = statsResult.rows[0] ? {
      movieCount: parseInt(statsResult.rows[0].movie_count),
      roles: statsResult.rows[0].roles
    } : null;

    res.status(200).json({
      personName,
      movies,
      stats,
      source: 'internal_contributors_data'
    });

  } catch (error) {
    console.error('Error fetching person movies:', error);
    res.status(500).json({
      error: 'Failed to fetch person movies',
      personName
    });
  } finally {
    await client.end();
  }
}