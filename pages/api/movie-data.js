// pages/api/movie-data.js - Movie DB data: slug + streaming availability
import { Client } from 'pg';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Movie ID is required' });
  }

  if (!process.env.RAILWAY_DATABASE_URL && !process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Database configuration missing' });
  }

  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    await client.connect();

    const result = await client.query(
      'SELECT tmdb_id, title, year, slug, streaming_data, contributors_json FROM movies WHERE tmdb_id = $1',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Movie not found in database',
        tmdb_id: id,
        streaming_data: null
      });
    }

    const movie = result.rows[0];
    return res.status(200).json({
      tmdb_id: movie.tmdb_id,
      title: movie.title,
      year: movie.year,
      slug: movie.slug || null,
      streaming_data: movie.streaming_data,
      contributors_json: movie.contributors_json || null
    });
  } catch (error) {
    console.error('❌ movie-data fetch failed:', error);
    return res.status(500).json({
      error: `Database error: ${error.message}`,
      tmdb_id: id,
    });
  } finally {
    await client.end();
  }
}
