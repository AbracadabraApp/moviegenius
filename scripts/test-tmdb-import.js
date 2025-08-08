// Test endpoint to debug service import failures
export default async function handler(req, res) {
  console.log('🧪 Testing TMDB service imports...');
  
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasTmdbKey: !!process.env.NEXT_PUBLIC_TMDB_API_KEY
    },
    imports: {},
    functions: {}
  };

  // Test 1: Try dynamic import of tmdb-search
  try {
    console.log('Attempting import of tmdb-search...');
    const tmdbModule = await import('../../lib/services/tmdb-search');
    results.imports.tmdbSearch = {
      success: true,
      exports: Object.keys(tmdbModule)
    };
    
    // Test the getTMDBMovieDetails function directly
    if (tmdbModule.getTMDBMovieDetails) {
      try {
        console.log('Testing getTMDBMovieDetails function...');
        const movieResult = await tmdbModule.getTMDBMovieDetails(257);
        results.functions.getTMDBMovieDetails = {
          success: !!movieResult,
          result: movieResult ? { title: movieResult.title, year: movieResult.release_date?.substring(0, 4) } : null
        };
      } catch (funcError) {
        results.functions.getTMDBMovieDetails = {
          success: false,
          error: funcError.message
        };
      }
    }
  } catch (importError) {
    results.imports.tmdbSearch = {
      success: false,
      error: importError.message,
      stack: importError.stack
    };
  }

  // Test 2: Try dynamic import of database-search
  try {
    console.log('Attempting import of database-search...');
    const dbModule = await import('../../lib/services/database-search');
    results.imports.databaseSearch = {
      success: true,
      exports: Object.keys(dbModule)
    };
    
    // Test the createBasicMovieEntry function
    if (dbModule.createBasicMovieEntry) {
      results.functions.createBasicMovieEntry = {
        available: true,
        // Don't actually call it without proper data
      };
    }
  } catch (importError) {
    results.imports.databaseSearch = {
      success: false,
      error: importError.message,
      stack: importError.stack
    };
  }

  // Test 3: Try Supabase client creation
  try {
    console.log('Testing Supabase client creation...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    results.supabase = {
      success: true,
      clientCreated: !!supabase
    };
  } catch (supabaseError) {
    results.supabase = {
      success: false,
      error: supabaseError.message
    };
  }

  console.log('🧪 Import test results:', JSON.stringify(results, null, 2));

  res.status(200).json(results);
}