import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    
    const query = `
      SELECT 
        tmdb_id,
        title,
        year,
        streaming_data,
        poster_url
      FROM movies 
      WHERE 
        streaming_data IS NOT NULL 
        AND streaming_data != ''
        AND poster_url IS NOT NULL
        AND year BETWEEN 1970 AND 2024
      ORDER BY 
        (LENGTH(streaming_data) - LENGTH(REPLACE(streaming_data, ',', '')) + 1) DESC,
        year DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    
    const movies = result.rows.map(movie => ({
      tmdbId: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      streaming_data: movie.streaming_data,
      poster: movie.poster_url,
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
      success: false,
      error: 'Failed to fetch movies'
    });
  }
}