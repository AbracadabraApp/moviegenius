// pages/api/test-tmdb.js - Minimal TMDB API connectivity test
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;

  if (!TMDB_KEY) {
    return res.status(500).json({
      error: 'TMDB API key not configured',
      env_check: {
        NEXT_PUBLIC_TMDB_API_KEY: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
        TMDB_API_KEY: !!process.env.TMDB_API_KEY,
      },
    });
  }

  try {
    console.log('🧪 Testing TMDB API connectivity...');

    // Test with a simple, reliable query
    const testQuery = 'Matrix';
    const response = await fetch(
      `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${testQuery}&include_adult=false&language=en-US`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`TMDB API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`✅ TMDB API test successful - found ${data.results?.length || 0} results`);

    // Return structured test results
    return res.status(200).json({
      success: true,
      test_query: testQuery,
      api_status: response.status,
      results_count: data.results?.length || 0,
      media_types_found: [...new Set(data.results?.map(item => item.media_type) || [])],
      sample_result: data.results?.[0] || null,
      full_response: data,
    });
  } catch (error) {
    console.error('❌ TMDB API test failed:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      test_query: 'Matrix',
      timestamp: new Date().toISOString(),
    });
  }
}
