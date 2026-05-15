// /api/v1/user/favorites/[tmdbId] - Remove favorite

import { Pool } from 'pg';
import { authenticateRequest } from '../../../../../lib/jwt-ios.js';

const pool = new Pool({
  connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
});

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Only DELETE allowed' });
  }

  const { tmdbId } = req.query;

  try {
    // Verify JWT and extract user ID
    const userId = await authenticateRequest(req);

    const client = await pool.connect();

    try {
      const result = await client.query(
        `DELETE FROM user_favorites
         WHERE user_id = $1 AND movie_tmdb_id = $2`,
        [userId, parseInt(tmdbId)]
      );

      return res.status(200).json({
        success: true,
        deleted: result.rowCount > 0
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Delete favorite error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
