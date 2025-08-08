// API endpoint to check TMDB ID statistics
import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  try {
    const pool = getPool();

    // Count total movies
    const { count: totalMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    // Count movies with null TMDB IDs
    const { count: nullTmdbMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .is('tmdb_id', null);

    // Count movies with 'MISSING' TMDB IDs
    const { count: missingTmdbMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('tmdb_id', 'MISSING');

    // Count movies with empty string TMDB IDs
    const { count: emptyTmdbMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .eq('tmdb_id', '');

    // Count total missing TMDB IDs (null, empty, or 'MISSING')
    const totalMissingTmdb = nullTmdbMovies + missingTmdbMovies + emptyTmdbMovies;

    // Count movies with valid TMDB IDs (excluding null, empty, and 'MISSING')
    const { count: validTmdbMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null)
      .not('tmdb_id', 'eq', '')
      .not('tmdb_id', 'eq', 'MISSING');

    // Show examples of movies with null TMDB IDs
    const { data: nullExamples } = await supabase
      .from('movies')
      .select('title, year, poster_url, created_at')
      .is('tmdb_id', null)
      .limit(5);

    // Show examples of movies with 'MISSING' TMDB IDs
    const { data: missingExamples } = await supabase
      .from('movies')
      .select('title, year, poster_url, created_at')
      .eq('tmdb_id', 'MISSING')
      .limit(5);

    // Show examples of movies with empty TMDB IDs
    const { data: emptyExamples } = await supabase
      .from('movies')
      .select('title, year, poster_url, created_at')
      .eq('tmdb_id', '')
      .limit(5);

    console.log('📊 TMDB ID Statistics:');
    console.log(`Total movies in database: ${totalMovies}`);
    console.log(`Movies with valid TMDB IDs: ${validTmdbMovies}`);
    console.log(`Movies with NULL TMDB IDs: ${nullTmdbMovies}`);
    console.log(`Movies with 'MISSING' TMDB IDs: ${missingTmdbMovies}`);
    console.log(`Movies with empty string TMDB IDs: ${emptyTmdbMovies}`);
    console.log(`Total missing TMDB IDs: ${totalMissingTmdb}`);
    console.log(`Percentage with valid TMDB IDs: ${((validTmdbMovies / totalMovies) * 100).toFixed(1)}%`);
    console.log(`Percentage missing TMDB IDs: ${((totalMissingTmdb / totalMovies) * 100).toFixed(1)}%`);

    if (nullExamples?.length > 0) {
      console.log('\n🔍 Examples of movies with NULL TMDB IDs:');
      nullExamples.forEach(movie => {
        const hasPoster = movie.poster_url && !movie.poster_url.includes('placeholder');
        console.log(
          `- "${movie.title}" (${movie.year}) - ${hasPoster ? 'HAS POSTER' : 'no poster'} - Created: ${movie.created_at}`
        );
      });
    }

    if (missingExamples?.length > 0) {
      console.log('\n🔍 Examples of movies with "MISSING" TMDB IDs:');
      missingExamples.forEach(movie => {
        const hasPoster = movie.poster_url && !movie.poster_url.includes('placeholder');
        console.log(
          `- "${movie.title}" (${movie.year}) - ${hasPoster ? 'HAS POSTER' : 'no poster'} - Created: ${movie.created_at}`
        );
      });
    }

    if (emptyExamples?.length > 0) {
      console.log('\n🔍 Examples of movies with empty string TMDB IDs:');
      emptyExamples.forEach(movie => {
        const hasPoster = movie.poster_url && !movie.poster_url.includes('placeholder');
        console.log(
          `- "${movie.title}" (${movie.year}) - ${hasPoster ? 'HAS POSTER' : 'no poster'} - Created: ${movie.created_at}`
        );
      });
    }

    res.status(200).json({
      totalMovies,
      validTmdbIds: validTmdbMovies,
      nullTmdbIds: nullTmdbMovies,
      missingTmdbIds: missingTmdbMovies,
      emptyTmdbIds: emptyTmdbMovies,
      totalMissingTmdb,
      percentageWithValidTmdbIds: ((validTmdbMovies / totalMovies) * 100).toFixed(1),
      percentageMissingTmdbIds: ((totalMissingTmdb / totalMovies) * 100).toFixed(1),
      nullExamples,
      missingExamples,
      emptyExamples,
    });
  } catch (error) {
    console.error('Error checking TMDB IDs:', error);
    res.status(500).json({ error: 'Failed to check TMDB statistics' });
  }
}
