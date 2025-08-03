/**
 * Debug TMDB Connection
 * 
 * Test endpoint to debug TMDB authentication issues
 */

export default async function handler(req, res) {
  console.log('🔍 TMDB Debug - Environment Check:');
  console.log('TMDB_BEARER_TOKEN exists:', !!process.env.TMDB_BEARER_TOKEN);
  console.log('TMDB_BEARER_TOKEN length:', process.env.TMDB_BEARER_TOKEN?.length || 0);
  console.log('TMDB_API_KEY exists:', !!process.env.TMDB_API_KEY);
  console.log('TMDB_API_KEY length:', process.env.TMDB_API_KEY?.length || 0);
  console.log('NEXT_PUBLIC_TMDB_API_KEY exists:', !!process.env.NEXT_PUBLIC_TMDB_API_KEY);
  console.log('NEXT_PUBLIC_TMDB_API_KEY value:', process.env.NEXT_PUBLIC_TMDB_API_KEY);

  try {
    // Test Bearer token authentication first
    const bearerToken = process.env.TMDB_BEARER_TOKEN;
    let bearerResult = null;
    
    if (bearerToken && bearerToken.split('.').length === 3) {
      console.log('🔐 Testing Bearer token authentication...');
      try {
        const bearerResponse = await fetch('https://api.themoviedb.org/3/movie/550', {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Accept': 'application/json'
          }
        });
        
        if (bearerResponse.ok) {
          const data = await bearerResponse.json();
          bearerResult = { success: true, title: data.title, year: data.release_date?.substring(0, 4) };
          console.log('✅ Bearer token works:', bearerResult);
        } else {
          bearerResult = { success: false, status: bearerResponse.status, statusText: bearerResponse.statusText };
          console.log('❌ Bearer token failed:', bearerResult);
        }
      } catch (error) {
        bearerResult = { success: false, error: error.message };
        console.log('❌ Bearer token error:', error.message);
      }
    } else {
      bearerResult = { success: false, error: 'Invalid Bearer token format' };
      console.log('❌ Bearer token invalid format');
    }

    // Test API key authentication
    const apiKey = process.env.TMDB_API_KEY;
    let apiKeyResult = null;
    
    if (apiKey && apiKey !== 'placeholder' && apiKey.length > 10) {
      console.log('🔑 Testing API key authentication...');
      try {
        const apiResponse = await fetch(`https://api.themoviedb.org/3/movie/550?api_key=${apiKey}`);
        
        if (apiResponse.ok) {
          const data = await apiResponse.json();
          apiKeyResult = { success: true, title: data.title, year: data.release_date?.substring(0, 4) };
          console.log('✅ API key works:', apiKeyResult);
        } else {
          apiKeyResult = { success: false, status: apiResponse.status, statusText: apiResponse.statusText };
          console.log('❌ API key failed:', apiKeyResult);
        }
      } catch (error) {
        apiKeyResult = { success: false, error: error.message };
        console.log('❌ API key error:', error.message);
      }
    } else {
      apiKeyResult = { success: false, error: 'No valid API key found' };
      console.log('❌ No valid API key');
    }

    // Test the getTMDBAuthConfig function
    const { getTMDBMovieDetails } = await import('../../lib/services/tmdb-search');
    let serviceResult = null;
    
    try {
      console.log('🔧 Testing TMDB service function...');
      const movie = await getTMDBMovieDetails(550);
      serviceResult = { 
        success: !!movie, 
        title: movie?.title, 
        year: movie?.release_date?.substring(0, 4),
        hasTitle: !!(movie?.title)
      };
      console.log('🔧 Service result:', serviceResult);
    } catch (error) {
      serviceResult = { success: false, error: error.message };
      console.log('❌ Service error:', error.message);
    }

    return res.status(200).json({
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_ENVIRONMENT_NAME: process.env.RAILWAY_ENVIRONMENT_NAME,
        bearerTokenExists: !!bearerToken,
        bearerTokenLength: bearerToken?.length || 0,
        apiKeyExists: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        publicApiKey: process.env.NEXT_PUBLIC_TMDB_API_KEY
      },
      authentication: {
        bearerToken: bearerResult,
        apiKey: apiKeyResult,
        serviceFunction: serviceResult
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}