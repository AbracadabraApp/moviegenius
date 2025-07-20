// API endpoint to check TMDB ID statistics
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Count total movies
    const { count: totalMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true });

    // Count movies with null TMDB IDs
    const { count: nullTmdbMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .is('tmdb_id', null);

    // Count movies with TMDB IDs
    const { count: withTmdbMovies } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('tmdb_id', 'is', null);

    // Show some examples of movies with null TMDB IDs
    const { data: nullExamples } = await supabase
      .from('movies')
      .select('title, year, poster_url, created_at')
      .is('tmdb_id', null)
      .limit(10);

    console.log('📊 TMDB ID Statistics:');
    console.log(`Total movies: ${totalMovies}`);
    console.log(`Movies with TMDB IDs: ${withTmdbMovies}`);
    console.log(`Movies with NULL TMDB IDs: ${nullTmdbMovies}`);
    console.log(`Percentage with TMDB IDs: ${((withTmdbMovies / totalMovies) * 100).toFixed(1)}%`);

    console.log('\n🔍 Examples of movies with NULL TMDB IDs:');
    nullExamples?.forEach(movie => {
      const hasPoster = movie.poster_url && !movie.poster_url.includes('placeholder');
      console.log(
        `- "${movie.title}" (${movie.year}) - ${hasPoster ? 'HAS POSTER' : 'no poster'} - Created: ${movie.created_at}`
      );
    });

    res.status(200).json({
      totalMovies,
      withTmdbIds: withTmdbMovies,
      nullTmdbIds: nullTmdbMovies,
      percentageWithTmdbIds: ((withTmdbMovies / totalMovies) * 100).toFixed(1),
      nullExamples,
    });
  } catch (error) {
    console.error('Error checking TMDB IDs:', error);
    res.status(500).json({ error: 'Failed to check TMDB statistics' });
  }
}
