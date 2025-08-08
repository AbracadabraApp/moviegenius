// Debug endpoint to test production database connectivity
import { withCache } from '../../lib/cache.js';

async function debugHandler(req, res) {
  const tests = [];
  let overallStatus = 'ok';

  try {
    // Test 1: Environment variables
    tests.push({
      test: 'Environment Variables',
      status: 'checking',
      details: {
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        supabaseKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      }
    });

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      tests[0].status = 'fail';
      tests[0].error = 'Missing required environment variables';
      overallStatus = 'fail';
    } else {
      tests[0].status = 'pass';
    }

    // Test 2: Supabase client creation
    let supabase = null;
    try {
      console.log('DEBUG ENDPOINT: About to import createClient from @supabase/supabase-js');
      const { createClient } = await import('@supabase/supabase-js');
      console.log('DEBUG ENDPOINT: Import successful, calling createClient');
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      console.log('DEBUG ENDPOINT: Client creation completed');
      tests.push({
        test: 'Supabase Client Creation',
        status: 'pass',
        details: `Client created successfully. URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`
      });
    } catch (error) {
      console.log('DEBUG ENDPOINT: Client creation failed:', error.message);
      tests.push({
        test: 'Supabase Client Creation',
        status: 'fail',
        error: error.message
      });
      overallStatus = 'fail';
    }

    // Test 3: Basic database connection (using EXACT pattern from working movie-analysis)
    if (supabase) {
      try {
        // Copy exact working pattern from movie-analysis.js line 47-51
        let { data: movie, error: movieError } = await supabase
          .from('movies')
          .select('title, year, tmdb_id')
          .eq('tmdb_id', 550)
          .single();
        
        if (!movie) {
          tests.push({
            test: 'Database Connection',
            status: 'fail',
            error: movieError?.message || 'No data returned',
            details: movieError
          });
          overallStatus = 'fail';
        } else {
          tests.push({
            test: 'Database Connection', 
            status: 'pass',
            details: `Successfully queried movie: ${movie.title} (${movie.year})`
          });
        }
      } catch (error) {
        tests.push({
          test: 'Database Connection',
          status: 'fail',
          error: error.message
        });
        overallStatus = 'fail';
      }
    }

    // Test 4: Movies table structure
    if (supabase && overallStatus !== 'fail') {
      try {
        const { data, error } = await supabase.from('movies').select('id, title, year, tmdb_id').limit(1);
        if (error) {
          tests.push({
            test: 'Movies Table Structure',
            status: 'fail',
            error: error.message
          });
          overallStatus = 'fail';
        } else {
          tests.push({
            test: 'Movies Table Structure',
            status: 'pass',
            details: `Sample row: ${data?.length ? JSON.stringify(data[0]) : 'No data'}`
          });
        }
      } catch (error) {
        tests.push({
          test: 'Movies Table Structure',
          status: 'fail',
          error: error.message
        });
        overallStatus = 'fail';
      }
    }

    // Test 5: Movie analyses table
    if (supabase && overallStatus !== 'fail') {
      try {
        const { data, error } = await supabase.from('movie_analyses').select('id, movie_id, analysis_type').limit(1);
        if (error) {
          tests.push({
            test: 'Movie Analyses Table',
            status: 'fail',
            error: error.message
          });
          overallStatus = 'fail';
        } else {
          tests.push({
            test: 'Movie Analyses Table',
            status: 'pass',
            details: `Sample analysis: ${data?.length ? JSON.stringify(data[0]) : 'No analyses found'}`
          });
        }
      } catch (error) {
        tests.push({
          test: 'Movie Analyses Table',
          status: 'fail',
          error: error.message
        });
        overallStatus = 'fail';
      }
    }

    // Test 6: Specific movie lookup (Fight Club)
    if (supabase && overallStatus !== 'fail') {
      try {
        const { data, error } = await supabase
          .from('movies')
          .select('id, title, year, tmdb_id')
          .eq('tmdb_id', 550)
          .single();
        
        if (error) {
          tests.push({
            test: 'Fight Club Lookup (tmdb_id=550)',
            status: 'fail',
            error: error.message
          });
        } else if (!data) {
          tests.push({
            test: 'Fight Club Lookup (tmdb_id=550)',
            status: 'fail',
            error: 'Movie not found in database'
          });
        } else {
          tests.push({
            test: 'Fight Club Lookup (tmdb_id=550)',
            status: 'pass',
            details: data
          });
        }
      } catch (error) {
        tests.push({
          test: 'Fight Club Lookup (tmdb_id=550)',
          status: 'fail',
          error: error.message
        });
      }
    }

  } catch (error) {
    overallStatus = 'fail';
    tests.push({
      test: 'Overall Test Suite',
      status: 'fail',
      error: error.message
    });
  }

  res.status(200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    tests: tests,
    summary: {
      total: tests.length,
      passed: tests.filter(t => t.status === 'pass').length,
      failed: tests.filter(t => t.status === 'fail').length
    }
  });
}

// Export with cache middleware (same as movie-analysis)
export default withCache(debugHandler);