/**
 * /api/favorites
 * GET  - fetch all favorites for the signed-in user
 * POST - bulk upsert favorites (used on first login to migrate localStorage)
 * DELETE - remove a single favorite
 */
const { getServerSession } = require('next-auth/next');
import { authOptions } from './auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.dbId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const userId = session.user.dbId;

  if (req.method === 'GET') {
    const result = await pool.query(
      `SELECT uf.tmdb_id, uf.type, uf.title, uf.year, uf.poster,
              COALESCE(m.slug, uf.slug) AS slug, uf.added_at
       FROM user_favorites uf
       LEFT JOIN movies m ON m.tmdb_id = uf.tmdb_id::int
       WHERE uf.user_id = $1 ORDER BY uf.added_at DESC`,
      [userId]
    );
    return res.status(200).json({ favorites: result.rows });
  }

  if (req.method === 'POST') {
    // Expects: { favorites: [{ tmdb_id, type, title, year, poster, slug }] }
    const { favorites } = req.body;
    if (!Array.isArray(favorites) || favorites.length === 0) {
      return res.status(400).json({ error: 'favorites array required' });
    }

    // Bulk upsert
    const values = [];
    const params = [];
    let idx = 1;
    for (const f of favorites) {
      values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      params.push(userId, f.tmdb_id, f.type, f.title || null, f.year || null, f.poster || null, f.slug || null);
    }

    await pool.query(
      `INSERT INTO user_favorites (user_id, tmdb_id, type, title, year, poster, slug)
       VALUES ${values.join(', ')}
       ON CONFLICT (user_id, tmdb_id, type) DO UPDATE
       SET title = EXCLUDED.title, poster = EXCLUDED.poster, slug = EXCLUDED.slug`,
      params
    );
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    // Expects: { tmdb_id, type }
    const { tmdb_id, type } = req.body;
    if (!tmdb_id || !type) {
      return res.status(400).json({ error: 'tmdb_id and type required' });
    }
    await pool.query(
      `DELETE FROM user_favorites WHERE user_id = $1 AND tmdb_id = $2 AND type = $3`,
      [userId, tmdb_id, type]
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
