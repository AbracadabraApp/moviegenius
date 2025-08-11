// pages/api/movie-contributors-simple.js
/**
 * Simple Movie Contributors API - Maintainable Version  
 * Uses core tables: movie_contributors + persons
 * No fast tables, no complex optimization - just works reliably
 * Returns contributors grouped by role with person IDs for linking
 */

import { getPool } from './railway-db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { movieId } = req.body;

  if (!movieId || isNaN(parseInt(movieId))) {
    return res.status(400).json({ error: 'Valid movie ID is required' });
  }

  const tmdbId = parseInt(movieId);
  const pool = getPool();
  let client = null;

  try {
    client = await pool.connect();
    
    // Get all contributors for this movie
    const contributorsQuery = `
      SELECT 
        p.id as person_id,
        p.name,
        mc.role
      FROM movie_contributors mc
      JOIN persons p ON mc.person_id = p.id
      WHERE mc.movie_tmdb_id = $1
      ORDER BY 
        CASE mc.role 
          WHEN 'director' THEN 1
          WHEN 'writer' THEN 2  
          WHEN 'star' THEN 3
          WHEN 'composer' THEN 4
          WHEN 'cinematographer' THEN 5
          ELSE 6
        END,
        p.name ASC
    `;
    
    const result = await client.query(contributorsQuery, [tmdbId]);
    
    // Group contributors by role
    const contributorsByRole = {};
    
    result.rows.forEach(row => {
      if (!contributorsByRole[row.role]) {
        contributorsByRole[row.role] = [];
      }
      
      contributorsByRole[row.role].push({
        personId: row.person_id,  // Use personId to match footer component expectation
        name: row.name
      });
    });

    res.status(200).json({
      movieId: tmdbId,
      contributors: contributorsByRole,
      hasContributors: result.rows.length > 0,
      source: 'movie_contributors_simple'
    });

  } catch (error) {
    console.error('Error fetching simple movie contributors:', error);
    res.status(500).json({
      error: 'Failed to fetch movie contributors',
      movieId: tmdbId
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}