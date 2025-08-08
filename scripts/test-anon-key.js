// Test endpoint using ANON key instead of SERVICE_ROLE key
export default async function handler(req, res) {
  try {
    console.log('Testing Supabase connectivity with ANON key...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ 
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      });
    }

    // Test basic connectivity with ANON key
    const moviesResponse = await fetch(`${supabaseUrl}/rest/v1/movies?select=title,year&limit=5`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Movies query status:', moviesResponse.status);

    if (!moviesResponse.ok) {
      const errorText = await moviesResponse.text();
      return res.status(500).json({ 
        error: 'Supabase query failed with anon key',
        status: moviesResponse.status,
        statusText: moviesResponse.statusText,
        details: errorText
      });
    }

    const moviesData = await moviesResponse.json();

    return res.status(200).json({
      success: true,
      message: 'ANON KEY WORKS on Railway!',
      movieCount: moviesData?.length || 0,
      sampleMovies: moviesData?.slice(0, 3) || [],
      keyType: 'ANON',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('ANON key test error:', error);
    return res.status(500).json({ 
      error: 'ANON key test failed',
      details: error.message,
      type: error.constructor.name
    });
  }
}