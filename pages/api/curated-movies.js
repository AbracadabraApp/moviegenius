/**
 * Curated Movies API
 * 
 * Returns movie data for specified TMDB IDs from the database
 * with streaming information and poster URLs
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ids } = req.query;
  
  if (!ids) {
    return res.status(400).json({ error: 'Missing ids parameter' });
  }

  try {
    const tmdbIds = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    
    if (tmdbIds.length === 0) {
      return res.status(400).json({ error: 'No valid TMDB IDs provided' });
    }

    // Query database for movies with streaming data
    const placeholders = tmdbIds.map((_, index) => `$${index + 1}`).join(', ');
    const query = `
      SELECT 
        tmdb_id,
        title,
        year,
        streaming_data,
        poster_url
      FROM movies 
      WHERE tmdb_id IN (${placeholders})
        AND streaming_data IS NOT NULL
        AND streaming_data != ''
      ORDER BY 
        CASE 
          WHEN streaming_data LIKE '%Criterion%' THEN 1
          WHEN streaming_data LIKE '%HBO Max%' THEN 2  
          WHEN streaming_data LIKE '%Netflix%' THEN 3
          WHEN streaming_data LIKE '%Amazon Prime%' THEN 4
          ELSE 5
        END,
        title
    `;

    const result = await pool.query(query, tmdbIds);
    
    const movies = result.rows.map(movie => ({
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      streaming_data: movie.streaming_data,
      poster: movie.poster_url || `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      // Extract primary platform and additional count
      platform: movie.streaming_data.split(',')[0]?.trim(),
      platformCount: movie.streaming_data.split(',').length
    }));

    res.status(200).json({
      success: true,
      count: movies.length,
      movies: movies
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch curated movies',
      details: error.message 
    });
  }
}