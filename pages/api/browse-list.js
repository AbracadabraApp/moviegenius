/**
 * Browse List API - Get collection details and movies
 * GET /api/browse-list?id={listId}
 *
 * Returns collection info and all movies in the collection
 */

import { getPool } from '../../lib/railway-db.js';

export default async function browseListHandler(req, res) {
  const startTime = Date.now();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, limit = 100 } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'id parameter is required' });
  }

  const pool = getPool();

  try {
    // Get browse list info
    const listQuery = `
      SELECT id, title, description, total_movies, status, created_at
      FROM browse_lists
      WHERE id = $1 AND status = 'active'
    `;

    const listResult = await pool.query(listQuery, [id]);

    if (listResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Browse list not found or inactive'
      });
    }

    const browseList = listResult.rows[0];

    // Get movies in this browse list
    const moviesQuery = `
      SELECT
        m.id,
        m.tmdb_id,
        m.title,
        m.year,
        m.poster_url,
        m.slug,
        lm.relevance_score,
        lm.display_order,
        lm.is_featured,
        lm.is_gateway
      FROM movies m
      JOIN list_movies lm ON m.id = lm.movie_id
      WHERE lm.list_id = $1
      ORDER BY lm.display_order ASC, lm.relevance_score DESC
      LIMIT $2
    `;

    const moviesResult = await pool.query(moviesQuery, [id, parseInt(limit)]);

    const movies = moviesResult.rows.map(row => ({
      id: row.id,
      tmdb_id: row.tmdb_id,
      title: row.title,
      year: row.year,
      poster_url: row.poster_url,
      slug: row.slug,
      relevance_score: parseFloat(row.relevance_score),
      is_featured: row.is_featured,
      is_gateway: row.is_gateway
    }));

    const duration = Date.now() - startTime;

    res.status(200).json({
      success: true,
      id: browseList.id,
      title: browseList.title,
      description: browseList.description,
      total_movies: browseList.total_movies,
      movies: movies,
      query_time_ms: duration
    });

  } catch (error) {
    console.error('Browse list query failed:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch browse list',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
