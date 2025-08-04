// pages/api/health.js - Health check + Search Authentication Testing
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { test } = req.query;
    
    // If test=search parameter, run search authentication tests
    if (test === 'search') {
      return await runSearchTests(req, res);
    }
    
    // Default health check
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'MovieGenius'
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function runSearchTests(req, res) {
  const results = {
    timestamp: new Date().toISOString(),
    testType: 'search_authentication',
    environment: process.env.NODE_ENV,
    tests: []
  };

  const testQuery = 'fight club';
  
  // Test 1: Check environment variables
  results.tests.push({
    name: 'environment_check',
    bearerToken: !!process.env.TMDB_BEARER_TOKEN,
    bearerJWT: process.env.TMDB_BEARER_TOKEN?.split('.').length === 3,
    serverKey: !!process.env.TMDB_API_KEY,
    publicKey: process.env.NEXT_PUBLIC_TMDB_API_KEY,
    publicKeyIsPlaceholder: process.env.NEXT_PUBLIC_TMDB_API_KEY === 'placeholder'
  });

  // Test 2: TMDB Search with Bearer Token
  try {
    const bearerToken = process.env.TMDB_BEARER_TOKEN;
    if (bearerToken && bearerToken.split('.').length === 3) {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(testQuery)}&include_adult=false&language=en-US`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      results.tests.push({
        name: 'search_bearer',
        status: response.status,
        success: response.ok,
        resultCount: data?.results?.length || 0,
        firstResult: data?.results?.[0]?.title || null,
        error: data?.status_message || null
      });
    } else {
      results.tests.push({
        name: 'search_bearer',
        error: 'No valid Bearer token',
        success: false
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'search_bearer',
      error: error.message,
      success: false
    });
  }

  // Test 3: TMDB Search with API Key (current search endpoint method)
  try {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
    if (apiKey && apiKey !== 'placeholder') {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(testQuery)}&include_adult=false&language=en-US`
      );
      
      const data = await response.json();
      results.tests.push({
        name: 'search_api_key',
        status: response.status,
        success: response.ok,
        resultCount: data?.results?.length || 0,
        firstResult: data?.results?.[0]?.title || null,
        error: data?.status_message || null,
        keySource: process.env.NEXT_PUBLIC_TMDB_API_KEY ? 'public' : 'server'
      });
    } else {
      results.tests.push({
        name: 'search_api_key',
        error: 'No valid API key (placeholder detected)',
        success: false,
        keyValue: apiKey
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'search_api_key',
      error: error.message,
      success: false
    });
  }

  // Test 4: Movie Details (for comparison)
  try {
    const bearerToken = process.env.TMDB_BEARER_TOKEN;
    if (bearerToken && bearerToken.split('.').length === 3) {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/550`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      results.tests.push({
        name: 'details_bearer',
        status: response.status,
        success: response.ok,
        movieTitle: data?.title || null,
        error: data?.status_message || null
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'details_bearer',
      error: error.message,
      success: false
    });
  }

  // Analysis
  const workingTests = results.tests.filter(t => t.success);
  const searchTests = results.tests.filter(t => t.name.includes('search'));
  const detailsTests = results.tests.filter(t => t.name.includes('details'));
  
  results.analysis = {
    workingCount: workingTests.length,
    searchWorking: searchTests.some(t => t.success),
    detailsWorking: detailsTests.some(t => t.success),
    diagnosis: []
  };
  
  if (detailsTests.some(t => t.success) && !searchTests.some(t => t.success)) {
    results.analysis.diagnosis.push('Details work but search fails - authentication method issue');
  }
  
  if (results.tests[0]?.publicKeyIsPlaceholder) {
    results.analysis.diagnosis.push('Search API using placeholder public key');
  }
  
  return res.status(200).json(results);
}
