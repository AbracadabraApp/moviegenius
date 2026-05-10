// Simple poster URL endpoint for iOS app
// Returns poster URL redirect for a given TMDB ID

import { Client } from 'pg';

export default async function handler(req, res) {
  const { tmdbId } = req.query;

  if (!tmdbId) {
    return res.status(400).json({ error: 'tmdbId required' });
  }

  const parsedId = parseInt(tmdbId);
  if (isNaN(parsedId)) {
    return res.status(400).json({ error: 'tmdbId must be a number' });
  }

  const client = new Client({
    connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const result = await client.query(
      'SELECT poster_url FROM movies WHERE tmdb_id = $1',
      [parsedId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const posterUrl = result.rows[0].poster_url;

    if (!posterUrl) {
      return res.status(404).json({ error: 'No poster available' });
    }

    // Redirect to TMDB poster URL
    res.redirect(307, posterUrl);
  } catch (error) {
    console.error('Poster fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.end();
  }
}
