// Debug endpoint to test TMDB discovery process
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { tmdb_id } = req.query;

  if (!tmdb_id) {
    return res.status(400).json({ error: 'tmdb_id query parameter required' });
  }

  const results = {
    tmdb_id: parseInt(tmdb_id),
    steps: []
  };

  try {
    // Step 1: Check environment variables
    results.steps.push({
      step: 'Environment Check',
      tmdb_api_key_exists: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
      tmdb_api_key_length: process.env.NEXT_PUBLIC_TMDB_API_KEY ? process.env.NEXT_PUBLIC_TMDB_API_KEY.length : 0,
      supabase_url_exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_key_exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    // Step 2: Try to import TMDB service
    let getTMDBMovieDetails;
    try {
      const tmdbService = await import('../../lib/services/tmdb-search');
      getTMDBMovieDetails = tmdbService.getTMDBMovieDetails;
      results.steps.push({
        step: 'TMDB Service Import',
        success: true,
        function_exists: typeof getTMDBMovieDetails === 'function'
      });
    } catch (importError) {
      results.steps.push({
        step: 'TMDB Service Import',
        success: false,
        error: importError.message
      });
      return res.status(500).json(results);
    }

    // Step 3: Try TMDB API call
    let tmdbMovie;
    try {
      tmdbMovie = await getTMDBMovieDetails(parseInt(tmdb_id));
      results.steps.push({
        step: 'TMDB API Call',
        success: !!tmdbMovie,
        movie_found: !!tmdbMovie,
        movie_title: tmdbMovie?.title,
        movie_year: tmdbMovie?.release_date?.substring(0, 4)
      });
    } catch (tmdbError) {
      results.steps.push({
        step: 'TMDB API Call',
        success: false,
        error: tmdbError.message
      });
    }

    // Step 4: Try database creation
    if (tmdbMovie) {
      try {
        const dbService = await import('../../lib/services/database-search');
        const createBasicMovieEntry = dbService.createBasicMovieEntry;
        
        const newMovie = await createBasicMovieEntry(tmdbMovie);
        results.steps.push({
          step: 'Database Creation',
          success: !!newMovie,
          movie_created: !!newMovie,
          movie_id: newMovie?.id
        });
      } catch (dbError) {
        results.steps.push({
          step: 'Database Creation',
          success: false,
          error: dbError.message,
          error_details: dbError.toString(),
          error_code: dbError.code
        });
      }
    }

    res.status(200).json(results);

  } catch (error) {
    results.steps.push({
      step: 'General Error',
      error: error.message
    });
    res.status(500).json(results);
  }
}