// Copy this to moviegenius-minimal/pages/api/test-anon.js
// Test with ANON key instead of SERVICE_ROLE key

export default async function handler(req, res) {
  try {
    console.log('Testing Supabase connectivity with ANON key...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // ANON key instead of SERVICE_ROLE

    console.log('URL length:', supabaseUrl?.length);
    console.log('Anon Key length:', supabaseAnonKey?.length);

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ 
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      });
    }

    // Test 1: Basic REST API health check with ANON key
    const healthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`, // ANON key
      }
    });

    console.log('Health check status:', healthResponse.status);

    if (!healthResponse.ok) {
      return res.status(500).json({ 
        error: 'Supabase health check failed',
        status: healthResponse.status,
        statusText: healthResponse.statusText
      });
    }

    // Test 2: Simple query with ANON key (should work for public tables)
    const moviesResponse = await fetch(`${supabaseUrl}/rest/v1/movies?select=title,year&limit=3`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`, // ANON key
        'Content-Type': 'application/json'
      }
    });

    console.log('Movies query status:', moviesResponse.status);

    let moviesData = null;
    if (moviesResponse.ok) {
      moviesData = await moviesResponse.json();
    }

    return res.status(200).json({
      success: true,
      message: 'Supabase connectivity working with ANON key!',
      healthStatus: healthResponse.status,
      moviesStatus: moviesResponse.status,
      movieCount: moviesData?.length || 0,
      sampleMovies: moviesData?.slice(0, 2) || [],
      keyType: 'ANON',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('ANON key connectivity test error:', error);
    return res.status(500).json({ 
      error: 'ANON key connectivity test failed',
      details: error.message,
      type: error.constructor.name
    });
  }
}