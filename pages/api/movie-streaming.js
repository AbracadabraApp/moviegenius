// pages/api/movie-streaming.js - Railway PostgreSQL streaming info
import { Client } from 'pg';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Movie ID is required' });
  }

  // Check environment variables
  if (!process.env.RAILWAY_DATABASE_URL && !process.env.DATABASE_URL) {
    return res.status(500).json({
      error: 'Database configuration missing'
    });
  }

  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    console.log(`📺 Fetching streaming data for TMDB ID: ${id}`);
    
    await client.connect();

    // Get movie from Railway PostgreSQL database - only what we need for streaming display
    const query = 'SELECT tmdb_id, title, year, streaming_data FROM movies WHERE tmdb_id = $1';
    const result = await client.query(query, [parseInt(id)]);

    if (result.rows.length === 0) {
      console.log(`❌ Movie not found in database for TMDB ID: ${id}`);
      return res.status(404).json({
        error: 'Movie not found in database',
        tmdb_id: id,
        streaming_data: null
      });
    }

    const movie = result.rows[0];
    const responseData = {
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      streaming_data: movie.streaming_data
    };

    console.log(`✅ Streaming data: ${movie.title} (${movie.year}) - ${movie.streaming_data || 'Not tracked'}`);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ Streaming data fetch failed:', error);

    return res.status(500).json({
      error: `Database error: ${error.message}`,
      tmdb_id: id,
      timestamp: new Date().toISOString(),
    });
  } finally {
    await client.end();
  }
}