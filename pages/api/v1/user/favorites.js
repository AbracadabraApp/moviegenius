// /api/v1/user/favorites - Get and sync user favorites

import { Pool } from 'pg';
import { authenticateRequest } from '../../../../lib/jwt-ios.js';

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
});

export default async function handler(req, res) {
  try {
    // Verify JWT and extract user ID
    const userId = await authenticateRequest(req);

    if (req.method === 'GET') {
      return await handleGet(req, res, userId);
    }

    if (req.method === 'POST') {
      return await handlePost(req, res, userId);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Favorites API error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// GET /api/v1/user/favorites - Fetch user's favorites
async function handleGet(req, res, userId) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT uf.movie_tmdb_id, uf.created_at, m.title, m.year, m.poster_url
       FROM user_favorites uf
       JOIN movies m ON m.tmdb_id = uf.movie_tmdb_id
       WHERE uf.user_id = $1
       ORDER BY uf.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      favorites: result.rows.map(row => ({
        tmdb_id: row.movie_tmdb_id,
        title: row.title,
        year: row.year,
        poster_url: row.poster_url,
        added_at: row.created_at
      }))
    });

  } finally {
    client.release();
  }
}

// POST /api/v1/user/favorites - Add favorite
async function handlePost(req, res, userId) {
  const { tmdb_id } = req.body;

  if (!tmdb_id) {
    return res.status(400).json({ error: 'tmdb_id required' });
  }

  const client = await pool.connect();

  try {
    await client.query(
      `INSERT INTO user_favorites (user_id, movie_tmdb_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, movie_tmdb_id) DO NOTHING`,
      [userId, tmdb_id]
    );

    return res.status(201).json({ success: true });

  } finally {
    client.release();
  }
}
