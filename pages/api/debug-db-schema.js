// More targeted database schema and data verification
export default async function handler(req, res) {
  const tests = [];

  try {
    // Basic environment check
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        status: 'fail',
        error: 'Missing environment variables',
        tests: []
      });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const pool = getPool();

    // Test 1: Check if movies table exists and has data
    try {
      const { count, error } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        tests.push({
          test: 'Movies Table Access',
          status: 'fail',
          error: error.message,
          code: error.code
        });
      } else {
        tests.push({
          test: 'Movies Table Access',
          status: 'pass',
          details: { totalMovies: count }
        });
      }
    } catch (error) {
      tests.push({
        test: 'Movies Table Access',
        status: 'fail',
        error: error.message
      });
    }

    // Test 2: Check if movie_analyses table exists and has data
    try {
      const { count, error } = await supabase
        .from('movie_analyses')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        tests.push({
          test: 'Movie Analyses Table Access',
          status: 'fail',
          error: error.message,
          code: error.code
        });
      } else {
        tests.push({
          test: 'Movie Analyses Table Access',
          status: 'pass',
          details: { totalAnalyses: count }
        });
      }
    } catch (error) {
      tests.push({
        test: 'Movie Analyses Table Access',
        status: 'fail',
        error: error.message
      });
    }

    // Test 3: Check specific movie by tmdb_id (Fight Club - 550)
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('id, title, year, tmdb_id')
        .eq('tmdb_id', 550)
        .single();
      
      if (error) {
        tests.push({
          test: 'Fight Club Movie Lookup',
          status: 'fail',
          error: error.message,
          code: error.code
        });
      } else if (!data) {
        tests.push({
          test: 'Fight Club Movie Lookup',
          status: 'fail',
          error: 'No movie found with tmdb_id=550'
        });
      } else {
        tests.push({
          test: 'Fight Club Movie Lookup',
          status: 'pass',
          details: data
        });

        // Test 4: Check if Fight Club has analysis
        try {
          const { data: analysisData, error: analysisError } = await supabase
            .from('movie_analyses')
            .select('id, analysis_type, created_at')
            .eq('movie_id', data.id);
          
          if (analysisError) {
            tests.push({
              test: 'Fight Club Analysis Lookup',
              status: 'fail',
              error: analysisError.message,
              code: analysisError.code
            });
          } else {
            tests.push({
              test: 'Fight Club Analysis Lookup',
              status: 'pass',
              details: {
                analysisCount: analysisData.length,
                analyses: analysisData
              }
            });
          }
        } catch (error) {
          tests.push({
            test: 'Fight Club Analysis Lookup',
            status: 'fail',
            error: error.message
          });
        }
      }
    } catch (error) {
      tests.push({
        test: 'Fight Club Movie Lookup',
        status: 'fail',
        error: error.message
      });
    }

    // Test 5: Sample of movies with analyses
    try {
      const { data, error } = await supabase
        .from('movies')
        .select(`
          id, 
          title, 
          year, 
          tmdb_id,
          movie_analyses!inner(id, analysis_type)
        `)
        .limit(5);
      
      if (error) {
        tests.push({
          test: 'Sample Movies with Analyses',
          status: 'fail',
          error: error.message,
          code: error.code
        });
      } else {
        tests.push({
          test: 'Sample Movies with Analyses',
          status: 'pass',
          details: {
            count: data.length,
            samples: data.map(movie => ({
              title: movie.title,
              year: movie.year,
              tmdb_id: movie.tmdb_id,
              analysisCount: movie.movie_analyses.length
            }))
          }
        });
      }
    } catch (error) {
      tests.push({
        test: 'Sample Movies with Analyses',
        status: 'fail',
        error: error.message
      });
    }

    const overallStatus = tests.some(t => t.status === 'fail') ? 'fail' : 'pass';

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

  } catch (error) {
    res.status(500).json({
      status: 'fail',
      error: error.message,
      timestamp: new Date().toISOString(),
      tests: tests
    });
  }
}