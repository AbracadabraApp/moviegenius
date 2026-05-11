/**
 * GET /api/v1/person/[id]
 *
 * Returns person details and filmography
 *
 * Path Parameters:
 * - id: person ID (number)
 *
 * Response:
 * {
 *   person: {
 *     id: number,
 *     name: string,
 *     movieCount: number,
 *     roles: string[],  // e.g. ["Actor", "Director"]
 *     profile_path?: string
 *   },
 *   movies: [{
 *     tmdb_id: number,
 *     title: string,
 *     year?: number,
 *     slug?: string,
 *     poster_url?: string,
 *     roles: string[]  // roles in this specific movie
 *   }]
 * }
 */

import { getPool } from '../../../../lib/railway-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'Valid person ID required' });
  }

  const personId = parseInt(id);
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
    // Use GROUP BY to aggregate roles per movie, avoiding duplicates
    const moviesQuery = `
      SELECT
        m.tmdb_id,
        m.title,
        m.year,
        m.slug,
        m.poster_url,
        array_agg(DISTINCT mc.role) as roles
      FROM movie_contributors mc
      JOIN movies m ON mc.movie_tmdb_id = m.tmdb_id
      WHERE mc.person_id = $1
      GROUP BY m.tmdb_id, m.title, m.year, m.slug, m.poster_url
      ORDER BY m.year DESC, m.title
    `;
    const moviesResult = await pool.query(moviesQuery, [personId]);

    // Aggregate all roles across all movies
    const allRoles = new Set();
    moviesResult.rows.forEach(row => {
      if (row.roles && Array.isArray(row.roles)) {
        row.roles.forEach(role => {
          if (role) allRoles.add(role);
        });
      }
    });
    const roles = Array.from(allRoles);

    // Format movies
    const movies = moviesResult.rows.map(row => ({
      tmdb_id: row.tmdb_id,
      title: row.title,
      year: row.year,
      slug: row.slug,
      poster_url: row.poster_url || null,
      roles: row.roles || []
    }));

    res.status(200).json({
      person: {
        id: person.id,
        name: person.name,
        movieCount: movies.length,
        roles
      },
      movies
    });

  } catch (error) {
    console.error('[v1] Person API error:', error);
    res.status(500).json({
      error: 'Failed to fetch person details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
