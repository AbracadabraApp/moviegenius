// API to run the orphan movies migration
import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  try {
    const pool = getPool();

    // Step 1: Try to create orphan_movies table (skip if exists)
    console.log('Checking if orphan_movies table exists...');

    // Just try to query the table to see if it exists
    const { error: checkError } = await supabase.from('orphan_movies').select('count').limit(1);

    if (checkError && checkError.message.includes('does not exist')) {
      throw new Error('Please create orphan_movies table manually in Supabase dashboard first');
    }

    // Step 2: Get count of movies to migrate
    const { count: nullCount } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .is('tmdb_id', null);

    console.log(`Found ${nullCount} movies with null TMDB IDs to migrate`);

    // Step 3: Migrate null TMDB movies to orphan table
    const { data: nullMovies } = await supabase.from('movies').select('*').is('tmdb_id', null);

    if (nullMovies && nullMovies.length > 0) {
      const orphanData = nullMovies.map(movie => ({
        title: movie.title,
        year: movie.year,
        slug: movie.slug,
        reason: movie.poster_url?.includes('tmdb') ? 'tmdb_id_not_saved' : 'tmdb_not_found',
        source: 'legacy_migration',
        tmdb_search_attempted: movie.poster_url?.includes('tmdb') || false,
        mention_count: 1,
        first_mentioned_at: movie.created_at,
        last_mentioned_at: movie.created_at,
        created_at: movie.created_at,
      }));

      const { error: insertError } = await supabase.from('orphan_movies').insert(orphanData);

      if (insertError) {
        throw new Error(`Failed to insert orphans: ${insertError.message}`);
      }

      // Step 4: Delete null TMDB movies from main table
      const { error: deleteError } = await supabase.from('movies').delete().is('tmdb_id', null);

      if (deleteError) {
        throw new Error(`Failed to delete null movies: ${deleteError.message}`);
      }
    }

    // Step 5: Get final counts
    const { count: finalMovieCount } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    const { count: orphanCount } = await supabase
      .from('orphan_movies')
      .select('*', { count: 'exact', head: true });

    console.log(`Migration complete:`);
    console.log(`- Movies table: ${finalMovieCount} movies (all with TMDB IDs)`);
    console.log(`- Orphan table: ${orphanCount} orphaned movies`);

    res.status(200).json({
      success: true,
      migratedMovies: nullCount,
      finalMovieCount,
      orphanCount,
      message: 'Migration completed successfully',
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      error: 'Migration failed',
      details: error.message,
    });
  }
}
