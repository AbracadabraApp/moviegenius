// API endpoint for movie page: "What browse collections am I on?"
// GET /api/movie-browse-lists?tmdbId=12345

import { getPool } from '../../lib/railway-db.js';

export default async function movieBrowseListsHandler(req, res) {
  const startTime = Date.now();
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tmdbId } = req.query;
  
  if (!tmdbId) {
    return res.status(400).json({ error: 'tmdbId parameter is required' });
  }

  const pool = getPool();
  
  try {
    // Query: Find all browse lists for this TMDB movie
    const query = `
      SELECT 
        bl.id,
        bl.title,
        bl.description,
        bl.total_movies,
        bl.status,
        lm.relevance_score,
        lm.display_order,
        bl.created_at
      FROM browse_lists bl
      JOIN list_movies lm ON bl.id = lm.list_id  
      JOIN movies m ON lm.movie_id = m.id
      WHERE m.tmdb_id = $1 
        AND bl.status = 'active'
      ORDER BY lm.relevance_score DESC, bl.title
    `;
    
    const result = await pool.query(query, [parseInt(tmdbId)]);
    
    const browseLists = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      total_movies: row.total_movies,
      relevance_score: parseFloat(row.relevance_score),
      display_order: row.display_order,
      created_at: row.created_at
    }));
    
    const duration = Date.now() - startTime;
    
    res.status(200).json({
      success: true,
      tmdb_id: parseInt(tmdbId),
      browse_lists: browseLists,
      count: browseLists.length,
      query_time_ms: duration
    });
    
  } catch (error) {
    console.error('Movie browse lists query failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch browse lists',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}