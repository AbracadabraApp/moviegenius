import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    console.log('Environment check:');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test 1: Basic connection
    console.log('Testing basic connection...');
    const { data: tables, error: tablesError } = await supabase
      .from('movies')
      .select('count')
      .limit(1);
    
    if (tablesError) {
      console.error('Table access error:', tablesError);
      return res.status(500).json({ 
        success: false, 
        error: 'Table access failed',
        details: tablesError
      });
    }

    // Test 2: Simple select
    console.log('Testing simple select...');
    const { data: movies, error: moviesError } = await supabase
      .from('movies')
      .select('tmdb_id, title')
      .limit(3);
    
    if (moviesError) {
      console.error('Movies query error:', moviesError);
      return res.status(500).json({ 
        success: false, 
        error: 'Movies query failed',
        details: moviesError
      });
    }

    console.log('Success! Found movies:', movies);
    
    return res.status(200).json({
      success: true,
      message: 'Database connection working',
      sampleMovies: movies,
      movieCount: movies?.length || 0
    });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Handler failed',
      details: error.message
    });
  }
}