/**
 * Direct TMDB API Test
 * 
 * Tests TMDB authentication directly to isolate the issue
 */

export default async function handler(req, res) {
  try {
    const results = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME
      },
      authentication: {},
      tests: []
    };

    // Test 1: Bearer Token Authentication
    const bearerToken = process.env.TMDB_BEARER_TOKEN;
    if (bearerToken) {
      console.log('🔐 Testing Bearer token authentication...');
      try {
        const bearerResponse = await fetch('https://api.themoviedb.org/3/movie/550', {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Accept': 'application/json'
          }
        });
        
        results.tests.push({
          method: 'bearer',
          status: bearerResponse.status,
          statusText: bearerResponse.statusText,
          success: bearerResponse.ok,
          tokenLength: bearerToken.length,
          tokenStart: bearerToken.substring(0, 20) + '...'
        });

        if (bearerResponse.ok) {
          const data = await bearerResponse.json();
          results.tests[results.tests.length - 1].movieTitle = data.title;
        }
      } catch (error) {
        results.tests.push({
          method: 'bearer',
          error: error.message,
          success: false
        });
      }
    } else {
      results.tests.push({
        method: 'bearer',
        error: 'No Bearer token found',
        success: false
      });
    }

    // Test 2: API Key Authentication (Server-side)
    const apiKey = process.env.TMDB_API_KEY;
    if (apiKey && apiKey !== 'placeholder' && !apiKey.startsWith('placehol')) {
      console.log('🔑 Testing API key authentication...');
      try {
        const apiResponse = await fetch(`https://api.themoviedb.org/3/movie/550?api_key=${apiKey}`);
        
        results.tests.push({
          method: 'server_api_key',
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          success: apiResponse.ok,
          keyLength: apiKey.length,
          keyStart: apiKey.substring(0, 8) + '...'
        });

        if (apiResponse.ok) {
          const data = await apiResponse.json();
          results.tests[results.tests.length - 1].movieTitle = data.title;
        }
      } catch (error) {
        results.tests.push({
          method: 'server_api_key',
          error: error.message,
          success: false
        });
      }
    } else {
      results.tests.push({
        method: 'server_api_key',
        error: 'No valid server API key found',
        success: false,
        keyValue: process.env.TMDB_API_KEY
      });
    }

    // Test 3: Public API Key (should be rejected)
    const publicApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (publicApiKey && publicApiKey !== 'placeholder' && !publicApiKey.startsWith('placehol')) {
      console.log('🔓 Testing public API key authentication...');
      try {
        const publicResponse = await fetch(`https://api.themoviedb.org/3/movie/550?api_key=${publicApiKey}`);
        
        results.tests.push({
          method: 'public_api_key',
          status: publicResponse.status,
          statusText: publicResponse.statusText,
          success: publicResponse.ok,
          keyLength: publicApiKey.length,
          keyStart: publicApiKey.substring(0, 8) + '...'
        });

        if (publicResponse.ok) {
          const data = await publicResponse.json();
          results.tests[results.tests.length - 1].movieTitle = data.title;
        }
      } catch (error) {
        results.tests.push({
          method: 'public_api_key',
          error: error.message,
          success: false
        });
      }
    } else {
      results.tests.push({
        method: 'public_api_key',
        error: 'Public API key is placeholder or invalid',
        success: false,
        keyValue: publicApiKey
      });
    }

    // Test 4: Using our TMDB service
    try {
      console.log('🔧 Testing our TMDB service...');
      const { getTMDBMovieDetails } = await import('../../lib/services/tmdb-search');
      const serviceResult = await getTMDBMovieDetails(550);
      
      results.tests.push({
        method: 'our_service',
        success: !!serviceResult,
        movieTitle: serviceResult?.title,
        movieYear: serviceResult?.release_date?.substring(0, 4),
        hasTitle: !!(serviceResult?.title)
      });
    } catch (error) {
      results.tests.push({
        method: 'our_service',
        error: error.message,
        success: false
      });
    }

    results.summary = {
      totalTests: results.tests.length,
      successfulTests: results.tests.filter(t => t.success).length,
      failedTests: results.tests.filter(t => !t.success).length,
      authenticationWorking: results.tests.some(t => t.success && t.movieTitle),
      recommendedAction: results.tests.some(t => t.success) 
        ? 'Authentication is working for some methods' 
        : 'All authentication methods failed'
    };

    return res.status(200).json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('TMDB debug error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}