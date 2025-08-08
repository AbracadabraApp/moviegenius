// API endpoint to remove movies with null TMDB IDs
import { createClient, supabase } from '../../../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../../lib/railway-db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  try {
    const pool = getPool();

    // First, get the movies with null TMDB IDs for logging
    const { data: nullMovies, error: fetchError } = await supabase
      .from('movies')
      .select('id, title, year, created_at')
      .is('tmdb_id', null);

    if (fetchError) {
      console.error('Error fetching null TMDB movies:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch null TMDB movies' });
    }

    if (!nullMovies || nullMovies.length === 0) {
      return res.status(200).json({
        message: 'No movies with null TMDB IDs found',
        removedMovies: [],
        count: 0,
      });
    }

    console.log('🗑️  Movies to be removed:');
    nullMovies.forEach(movie => {
      console.log(`- "${movie.title}" (${movie.year}) - Created: ${movie.created_at}`);
    });

    // Delete movies with null TMDB IDs
    const { error: deleteError } = await supabase.from('movies').delete().is('tmdb_id', null);

    if (deleteError) {
      console.error('Error deleting null TMDB movies:', deleteError);
      return res.status(500).json({ error: 'Failed to delete null TMDB movies' });
    }

    console.log(`✅ Successfully removed ${nullMovies.length} movies with null TMDB IDs`);

    res.status(200).json({
      message: `Successfully removed ${nullMovies.length} movies with null TMDB IDs`,
      removedMovies: nullMovies,
      count: nullMovies.length,
    });
  } catch (error) {
    console.error('Error removing null TMDB movies:', error);
    res.status(500).json({ error: 'Failed to remove null TMDB movies' });
  }
}
