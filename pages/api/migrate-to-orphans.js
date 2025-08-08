// Migrate null TMDB movies to orphan_movies table
// Assumes orphan_movies table already exists
import { createClient, supabase } from './railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from './railway-db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  try {
    const pool = getPool();

    // Step 1: Get count of movies to migrate
    const { count: nullCount } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .is('tmdb_id', null);

    console.log(`Found ${nullCount} movies with null TMDB IDs to migrate`);

    if (nullCount === 0) {
      return res.status(200).json({
        success: true,
        message: 'No movies to migrate - all movies already have TMDB IDs',
        migratedMovies: 0,
      });
    }

    // Step 2: Get the actual movies to migrate
    const { data: nullMovies, error: fetchError } = await supabase
      .from('movies')
      .select('*')
      .is('tmdb_id', null);

    if (fetchError) {
      throw new Error(`Failed to fetch null movies: ${fetchError.message}`);
    }

    // Step 3: Prepare orphan data
    const orphanData = nullMovies.map(movie => ({
      title: movie.title,
      year: movie.year,
      slug: movie.slug,
      reason: movie.poster_url?.includes('tmdb') ? 'tmdb_id_not_saved' : 'tmdb_not_found',
      source: 'legacy_migration',
      tmdb_search_attempted: movie.poster_url?.includes('tmdb') || false,
      mention_count: 1,
      first_mentioned_at: movie.created_at || new Date().toISOString(),
      last_mentioned_at: movie.created_at || new Date().toISOString(),
      created_at: movie.created_at || new Date().toISOString(),
    }));

    // Step 4: Insert into orphan_movies table
    const { error: insertError } = await supabase.from('orphan_movies').insert(orphanData);

    if (insertError) {
      throw new Error(`Failed to insert orphans: ${insertError.message}`);
    }

    console.log(`Successfully migrated ${nullMovies.length} movies to orphan_movies`);

    // Step 5: Delete null TMDB movies from main table
    const { error: deleteError } = await supabase.from('movies').delete().is('tmdb_id', null);

    if (deleteError) {
      throw new Error(`Failed to delete null movies: ${deleteError.message}`);
    }

    // Step 6: Get final counts
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
      migratedMovies: nullMovies.length,
      finalMovieCount,
      orphanCount,
      message: `Successfully migrated ${nullMovies.length} movies to orphan_movies table`,
      details: {
        moviesWithTmdbIds: finalMovieCount,
        totalOrphans: orphanCount,
      },
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      error: 'Migration failed',
      details: error.message,
    });
  }
}
