/**
 * Search Test Framework
 * 
 * Comprehensive testing system to debug search vs details authentication
 * and identify why search fails while details works in production
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME
    },
    authentication: {
      hasBearer: !!process.env.TMDB_BEARER_TOKEN,
      bearerLength: process.env.TMDB_BEARER_TOKEN?.length || 0,
      bearerJWTFormat: process.env.TMDB_BEARER_TOKEN?.split('.').length === 3,
      hasServerKey: !!process.env.TMDB_API_KEY,
      serverKeyLength: process.env.TMDB_API_KEY?.length || 0,
      hasPublicKey: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
      publicKeyValue: process.env.NEXT_PUBLIC_TMDB_API_KEY,
      publicKeyIsPlaceholder: process.env.NEXT_PUBLIC_TMDB_API_KEY === 'placeholder'
    },
    tests: []
  };

  const testMovie = 'fight club';
  const testTmdbId = 550;

  // Test 1: Direct TMDB Search with Bearer Token
  try {
    const bearerToken = process.env.TMDB_BEARER_TOKEN;
    if (bearerToken && bearerToken.split('.').length === 3) {
      console.log('🔐 Testing search with Bearer token...');
      
      const searchParams = new URLSearchParams({
        query: testMovie,
        include_adult: 'false',
        language: 'en-US'
      });
      
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?${searchParams}`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const responseText = await response.text();
      let data = null;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Keep data as null if not JSON
      }
      
      results.tests.push({
        name: 'search_bearer_token',
        method: 'Bearer',
        endpoint: '/search/movie',
        query: testMovie,
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        resultCount: data?.results?.length || 0,
        firstResult: data?.results?.[0]?.title || null,
        errorMessage: data?.status_message || null,
        rawResponse: responseText.substring(0, 500),
        rateLimitRemaining: response.headers.get('X-RateLimit-Remaining')
      });
    } else {
      results.tests.push({
        name: 'search_bearer_token',
        method: 'Bearer',
        endpoint: '/search/movie',
        error: 'No valid Bearer token available',
        success: false
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'search_bearer_token',
      method: 'Bearer',
      endpoint: '/search/movie',
      error: error.message,
      success: false
    });
  }

  // Test 2: Direct TMDB Search with API Key
  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (apiKey && apiKey !== 'placeholder' && apiKey.length > 10) {
      console.log('🔑 Testing search with API key...');
      
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(testMovie)}&include_adult=false&language=en-US`
      );
      
      const responseText = await response.text();
      let data = null;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Keep data as null if not JSON
      }
      
      results.tests.push({
        name: 'search_api_key',
        method: 'API Key',
        endpoint: '/search/movie',
        query: testMovie,
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        resultCount: data?.results?.length || 0,
        firstResult: data?.results?.[0]?.title || null,
        errorMessage: data?.status_message || null,
        rawResponse: responseText.substring(0, 500),
        rateLimitRemaining: response.headers.get('X-RateLimit-Remaining')
      });
    } else {
      results.tests.push({
        name: 'search_api_key',
        method: 'API Key',
        endpoint: '/search/movie',
        error: 'No valid API key available',
        success: false
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'search_api_key',
      method: 'API Key',
      endpoint: '/search/movie',
      error: error.message,
      success: false
    });
  }

  // Test 3: Direct TMDB Details with Bearer Token (for comparison)
  try {
    const bearerToken = process.env.TMDB_BEARER_TOKEN;
    if (bearerToken && bearerToken.split('.').length === 3) {
      console.log('🔐 Testing details with Bearer token...');
      
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${testTmdbId}`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const responseText = await response.text();
      let data = null;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Keep data as null if not JSON
      }
      
      results.tests.push({
        name: 'details_bearer_token',
        method: 'Bearer',
        endpoint: '/movie/{id}',
        tmdbId: testTmdbId,
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        movieTitle: data?.title || null,
        movieYear: data?.release_date?.substring(0, 4) || null,
        errorMessage: data?.status_message || null,
        rawResponse: responseText.substring(0, 500),
        rateLimitRemaining: response.headers.get('X-RateLimit-Remaining')
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'details_bearer_token',
      method: 'Bearer',
      endpoint: '/movie/{id}',
      error: error.message,
      success: false
    });
  }

  // Test 4: Our Search Service Function
  try {
    console.log('🔧 Testing our search service...');
    const { searchTMDB } = await import('../../lib/services/tmdb-search.js');
    const serviceResults = await searchTMDB(testMovie);
    
    results.tests.push({
      name: 'our_search_service',
      method: 'Service Function',
      endpoint: 'searchTMDB()',
      query: testMovie,
      success: serviceResults.length > 0,
      resultCount: serviceResults.length,
      firstResult: serviceResults[0]?.title || null,
      allResults: serviceResults.slice(0, 3).map(r => ({
        title: r.title,
        year: r.release_date?.substring(0, 4),
        popularity: r.popularity
      }))
    });
  } catch (error) {
    results.tests.push({
      name: 'our_search_service',
      method: 'Service Function',
      endpoint: 'searchTMDB()',
      error: error.message,
      success: false
    });
  }

  // Test 5: Our Search API Endpoint
  try {
    console.log('🌐 Testing our search API endpoint...');
    
    // Simulate the search API call internally
    const searchBody = JSON.stringify({ query: testMovie });
    const searchRequest = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: searchBody
    };
    
    // We can't easily call our own API from within the API, so let's simulate the logic
    const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
    
    if (!TMDB_KEY) {
      results.tests.push({
        name: 'our_search_api',
        method: 'API Endpoint',
        endpoint: '/api/search',
        error: 'No TMDB key available for search API',
        success: false,
        tmdbKeyUsed: 'none'
      });
    } else {
      const searchQuery = encodeURIComponent(testMovie.trim());
      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${searchQuery}&include_adult=false&language=en-US`
      );
      
      const responseText = await response.text();
      let data = null;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Keep data as null if not JSON
      }
      
      results.tests.push({
        name: 'our_search_api',
        method: 'API Endpoint Logic',
        endpoint: '/search/multi',
        query: testMovie,
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        resultCount: data?.results?.length || 0,
        tmdbKeyUsed: TMDB_KEY === 'placeholder' ? 'placeholder' : 'valid',
        tmdbKeySource: process.env.NEXT_PUBLIC_TMDB_API_KEY ? 'NEXT_PUBLIC_TMDB_API_KEY' : 'TMDB_API_KEY',
        errorMessage: data?.status_message || null,
        rawResponse: responseText.substring(0, 500)
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'our_search_api',
      method: 'API Endpoint Logic',
      endpoint: '/search/multi',
      error: error.message,
      success: false
    });
  }

  // Analysis and Recommendations
  const searchTests = results.tests.filter(t => t.endpoint?.includes('search'));
  const detailsTests = results.tests.filter(t => t.endpoint?.includes('movie'));
  const workingTests = results.tests.filter(t => t.success);
  const failingTests = results.tests.filter(t => !t.success);
  
  results.analysis = {
    summary: {
      totalTests: results.tests.length,
      workingTests: workingTests.length,
      failingTests: failingTests.length,
      searchTestsWorking: searchTests.filter(t => t.success).length,
      detailsTestsWorking: detailsTests.filter(t => t.success).length
    },
    findings: [],
    recommendations: []
  };
  
  // Generate findings
  if (detailsTests.some(t => t.success) && !searchTests.some(t => t.success)) {
    results.analysis.findings.push('Details endpoints work but search endpoints fail - authentication method mismatch');
  }
  
  if (results.authentication.publicKeyIsPlaceholder) {
    results.analysis.findings.push('Public API key is placeholder - search API will fail');
  }
  
  if (results.authentication.bearerJWTFormat && !searchTests.some(t => t.method === 'Bearer' && t.success)) {
    results.analysis.findings.push('Bearer token available but search not using it properly');
  }
  
  // Generate recommendations
  if (results.authentication.bearerJWTFormat && results.authentication.publicKeyIsPlaceholder) {
    results.analysis.recommendations.push('Update search API to use Bearer token instead of placeholder public key');
  }
  
  if (workingTests.length > 0 && failingTests.length > 0) {
    const workingAuth = workingTests[0]?.method;
    results.analysis.recommendations.push(`Use ${workingAuth} authentication method for all failing endpoints`);
  }

  return res.status(200).json({
    success: true,
    results,
    timestamp: new Date().toISOString()
  });
}