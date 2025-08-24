// API endpoint for browse pages: "What movies are in this browse collection?"
// GET /api/browse-list-movies?listId=uuid-123

import { getPool } from '../../lib/railway-db.js';

export default async function browseListMoviesHandler(req, res) {
  const startTime = Date.now();
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { listId, limit = 50, offset = 0 } = req.query;
  
  if (!listId) {
    return res.status(400).json({ error: 'listId parameter is required' });
  }

  const pool = getPool();
  
  try {
    // Get browse list info
    const listQuery = `
      SELECT id, title, description, total_movies, status, created_at
      FROM browse_lists 
      WHERE id = $1 AND status = 'active'
    `;
    
    const listResult = await pool.query(listQuery, [listId]);
    
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
        lm.is_gateway,
        lm.added_at
      FROM movies m
      JOIN list_movies lm ON m.id = lm.movie_id
      WHERE lm.list_id = $1
      ORDER BY lm.display_order ASC, lm.relevance_score DESC
      LIMIT $2 OFFSET $3
    `;
    
    const moviesResult = await pool.query(moviesQuery, [
      listId, 
      parseInt(limit), 
      parseInt(offset)
    ]);
    
    const movies = moviesResult.rows.map(row => ({
      id: row.id,
      tmdb_id: row.tmdb_id,
      title: row.title,
      year: row.year,
      poster_url: row.poster_url,
      slug: row.slug,
      relevance_score: parseFloat(row.relevance_score),
      display_order: row.display_order,
      is_featured: row.is_featured,
      is_gateway: row.is_gateway,
      added_at: row.added_at
    }));
    
    const duration = Date.now() - startTime;
    
    res.status(200).json({
      success: true,
      browse_list: {
        id: browseList.id,
        title: browseList.title,
        description: browseList.description,
        total_movies: browseList.total_movies,
        created_at: browseList.created_at
      },
      movies: movies,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        returned: movies.length,
        total: browseList.total_movies
      },
      query_time_ms: duration
    });
    
  } catch (error) {
    console.error('Browse list movies query failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch browse list movies',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}