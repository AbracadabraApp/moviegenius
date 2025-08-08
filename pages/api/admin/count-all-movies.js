// pages/api/admin/count-all-movies.js - Count all movies in database

import { createClient, supabase } from '../../../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../../lib/railway-db.js';

const pool = getPool();

export default async function handler(req, res) {
  try {
    // Count ALL movies
    const { count: totalMovies, error: totalError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    // Count movies with slugs
    const { count: moviesWithSlugs, error: slugError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('slug', 'is', null);

    // Count movies without slugs
    const { count: moviesWithoutSlugs, error: noSlugError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .is('slug', null);

    if (totalError || slugError || noSlugError) {
      const error = totalError || slugError || noSlugError;
      console.error('❌ Error counting movies:', error);
      return res.status(500).json({ error: 'Failed to count movies' });
    }

    const result = {
      totalMovies,
      moviesWithSlugs,
      moviesWithoutSlugs,
      percentage: Math.round((moviesWithSlugs / totalMovies) * 100),
    };

    console.log(`📊 Database stats:`, result);
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Count failed:', error);
    return res.status(500).json({ error: 'Count failed', details: error.message });
  }
}
