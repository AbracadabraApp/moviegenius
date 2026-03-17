import { getPool } from '../../lib/railway-db.js';
import { createClient, supabase } from '../../lib/railway-adapter.js';


// pages/api/verify-movie.js
/**
 * Verify if a movie exists in our database
 * Used by EntityLinkedText to validate movie links before creating them
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { title, year } = req.body;

  if (!title || !year) {
    return res.status(400).json({ error: 'Title and year are required' });
  }

  try {
    // TEMPORARILY DISABLED: const { createClient } = await import(@supabase/supabase-js);
    const pool = getPool();

    // Look for exact title and year match
    const { data: movie, error } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, slug')
      .eq('title', title)
      .eq('year', year)
      .single();

    if (error || !movie) {
      console.log(`❌ Movie verification failed: "${title}" (${year}) not found`);
      return res.status(200).json({
        exists: false,
        title,
        year,
      });
    }

    console.log(`✅ Movie verification success: "${title}" (${year}) -> TMDB ${movie.tmdb_id}`);
    return res.status(200).json({
      exists: true,
      movie: {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        tmdb_id: movie.tmdb_id,
        slug: movie.slug,
      },
    });
  } catch (error) {
    console.error('Movie verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
