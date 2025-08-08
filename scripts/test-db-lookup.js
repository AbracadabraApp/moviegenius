// Test database lookup for movie and analysis
export default async function handler(req, res) {
  const { tmdbId = 257 } = req.query;
  
  console.log(`🧪 DB LOOKUP TEST: Starting test for tmdbId ${tmdbId}`);
  
  const result = {
    tmdbId: parseInt(tmdbId),
    movieLookup: {},
    analysisLookup: {}
  };

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test 1: Look up movie by tmdbId
    console.log(`🔍 Looking up movie with tmdbId=${tmdbId}`);
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .eq('tmdb_id', parseInt(tmdbId))
      .single();
    
    result.movieLookup = {
      success: !!movie && !movieError,
      movie: movie,
      error: movieError?.message || null
    };

    if (movie) {
      // Test 2: Look up analysis for this movie
      console.log(`🔍 Looking up analysis for movie_id=${movie.id}`);
      const { data: analyses, error: analysisError } = await supabase
        .from('movie_analyses')
        .select('id, analysis_type, created_at')
        .eq('movie_id', movie.id)
        .order('created_at', { ascending: false });
      
      result.analysisLookup = {
        success: !!analyses && !analysisError,
        count: analyses?.length || 0,
        analyses: analyses?.map(a => ({ 
          id: a.id, 
          type: a.analysis_type, 
          created: a.created_at 
        })) || [],
        error: analysisError?.message || null
      };
    }

  } catch (error) {
    result.error = error.message;
  }

  console.log(`🧪 DB lookup results:`, JSON.stringify(result, null, 2));
  res.status(200).json(result);
}