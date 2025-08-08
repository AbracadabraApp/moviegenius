import { getPool } from './railway-db.js';
import { createClient, supabase } from './railway-adapter.js';


// Debug database connection and specific movie lookup
export default async function handler(req, res) {
  const { tmdbId = 257 } = req.query;
  
  console.log(`🧪 DATABASE DEBUG: Starting comprehensive test for tmdbId ${tmdbId}`);
  
  const result = {
    timestamp: new Date().toISOString(),
    tmdbId: parseInt(tmdbId),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      supabaseKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    },
    database: {},
    movieLookup: {},
    analysisLookup: {}
  };

  try {
    console.log(`🔍 Testing Supabase client creation...`);
    
    // Test 1: Create Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    const pool = getPool();
    
    supabase.clientCreated = true;
    console.log(`✅ Supabase client created successfully`);

    // Test 2: Basic database connection test
    console.log(`🔍 Testing basic database connection...`);
    const { data: testQuery, error: testError } = await supabase
      .from('movies')
      .select('count')
      .limit(1);
    
    supabase.connectionTest = {
      success: !testError,
      error: testError?.message || null
    };
    
    if (testError) {
      console.log(`❌ Database connection failed: ${testError.message}`);
    } else {
      console.log(`✅ Database connection successful`);
    }

    // Test 3: Movie lookup by tmdb_id (exact same as analysis API)
    console.log(`🔍 Looking up movie by tmdb_id=${tmdbId}...`);
    const { data: movie, error: movieError } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id')
      .eq('tmdb_id', parseInt(tmdbId))
      .single();
    
    result.movieLookup = {
      success: !!movie && !movieError,
      movie: movie,
      error: movieError?.message || null,
      errorCode: movieError?.code || null,
      queryDetails: {
        tmdbIdParsed: parseInt(tmdbId),
        tmdbIdType: typeof parseInt(tmdbId)
      }
    };

    if (movieError) {
      console.log(`❌ Movie lookup failed: ${movieError.message} (code: ${movieError.code})`);
    } else if (movie) {
      console.log(`✅ Movie found: "${movie.title}" (${movie.year}) - ID: ${movie.id}, TMDB: ${movie.tmdb_id}`);
      
      // Test 4: Analysis lookup for this movie
      console.log(`🔍 Looking up analyses for movie_id=${movie.id}...`);
      const { data: analyses, error: analysisError } = await supabase
        .from('movie_analyses')
        .select('id, analysis_type, created_at')
        .eq('movie_id', movie.id)
        .order('created_at', { ascending: false });
      
      result.analysisLookup = {
        success: !!analyses && !analysisError,
        count: analyses?.length || 0,
        analyses: analyses?.slice(0, 3).map(a => ({ 
          id: a.id, 
          type: a.analysis_type, 
          created: a.created_at 
        })) || [],
        error: analysisError?.message || null
      };

      if (analysisError) {
        console.log(`❌ Analysis lookup failed: ${analysisError.message}`);
      } else {
        console.log(`✅ Found ${analyses?.length || 0} analyses for this movie`);
      }
    } else {
      console.log(`❌ Movie not found in database`);
    }

  } catch (error) {
    result.error = {
      message: error.message,
      stack: error.stack?.substring(0, 500)
    };
    console.log(`❌ Debug test failed: ${error.message}`);
  }

  console.log(`🧪 Database debug complete:`, JSON.stringify(result, null, 2));
  res.status(200).json(result);
}