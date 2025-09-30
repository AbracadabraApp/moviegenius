/**
 * Person Movies Simple API - Get person details and their filmography
 *
 * POST /api/person-movies-simple
 * Body: { personId: number }
 *
 * Returns:
 * {
 *   person: { id, name, movieCount, roles: [] },
 *   movies: [{ tmdb_id, title, year, overview, poster_url }]
 * }
 */

import { getPool } from '../../lib/railway-db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { personId } = req.body;

  if (!personId || isNaN(parseInt(personId))) {
    return res.status(400).json({ error: 'Valid personId required' });
  }

  const pool = getPool();

  try {
    // Get person details
    const personQuery = `
      SELECT id, name
      FROM persons
      WHERE id = $1
    `;
    const personResult = await pool.query(personQuery, [personId]);

    if (personResult.rows.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const person = personResult.rows[0];

    // Get person's movies from movie_contributors table
    const moviesQuery = `
      SELECT DISTINCT
        m.tmdb_id,
        m.title,
        m.year,
        m.slug,
        m.poster_url,
        mc.role
      FROM movie_contributors mc
      JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
      WHERE mc.person_id = $1
      ORDER BY m.year DESC, m.title
    `;
    const moviesResult = await pool.query(moviesQuery, [personId]);

    // Aggregate roles
    const roles = [...new Set(moviesResult.rows.map(r => r.role).filter(Boolean))];

    // Format movies for MediaCard (same pattern as featuredMovies)
    const movies = moviesResult.rows.map(row => ({
      tmdb_id: row.tmdb_id,
      title: row.title,
      year: row.year,
      slug: row.slug,
      poster_url: row.poster_url || null
    }));

    // Return response
    return res.status(200).json({
      person: {
        id: person.id,
        name: person.name,
        movieCount: movies.length,
        roles: roles
      },
      movies: movies
    });

  } catch (error) {
    console.error('Error fetching person movies:', error);
    return res.status(500).json({
      error: 'Failed to fetch person movies',
      details: error.message
    });
  }
}
