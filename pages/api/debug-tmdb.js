// Simplified debug API to isolate TMDB function issues
export default async function handler(req, res) {
  const { tmdbId = 257 } = req.query;
  
  console.log(`🧪 DIRECT TMDB TEST: Starting test for ID ${tmdbId}`);
  
  const result = {
    tmdbId: parseInt(tmdbId),
    environment: {
      hasTmdbKey: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
      tmdbKeyLength: process.env.NEXT_PUBLIC_TMDB_API_KEY?.length || 0,
      hasTmdbBearerToken: !!process.env.TMDB_BEARER_TOKEN,
      tmdbBearerTokenLength: process.env.TMDB_BEARER_TOKEN?.length || 0
    },
    test: {},
    directFetch: {}
  };

  // Test 1: Direct fetch to TMDB API (no service layer)
  try {
    console.log(`🧪 Testing direct TMDB API call...`);
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}`);
    
    if (response.ok) {
      const data = await response.json();
      result.directFetch = {
        success: true,
        title: data.title,
        year: data.release_date?.substring(0, 4),
        id: data.id
      };
      console.log(`✅ Direct TMDB fetch successful: ${data.title}`);
    } else {
      result.directFetch = {
        success: false,
        status: response.status,
        statusText: response.statusText
      };
      console.log(`❌ Direct TMDB fetch failed: ${response.status}`);
    }
  } catch (error) {
    result.directFetch = {
      success: false,
      error: error.message
    };
    console.log(`❌ Direct TMDB fetch error: ${error.message}`);
  }

  // Test 2: Import and use the service function
  try {
    console.log(`🧪 Testing service function import...`);
    const tmdbService = await import('../../lib/services/tmdb-search');
    console.log(`✅ Service imported, available functions:`, Object.keys(tmdbService));
    
    if (tmdbService.getTMDBMovieDetails) {
      console.log(`🧪 Testing getTMDBMovieDetails function...`);
      const movieData = await tmdbService.getTMDBMovieDetails(parseInt(tmdbId));
      
      if (movieData) {
        result.test = {
          success: true,
          title: movieData.title,
          year: movieData.release_date?.substring(0, 4),
          id: movieData.id
        };
        console.log(`✅ Service function successful: ${movieData.title}`);
      } else {
        result.test = {
          success: false,
          result: null,
          message: 'Function returned null'
        };
        console.log(`❌ Service function returned null`);
      }
    } else {
      result.test = {
        success: false,
        message: 'getTMDBMovieDetails function not found in import'
      };
      console.log(`❌ getTMDBMovieDetails function not found`);
    }
  } catch (error) {
    result.test = {
      success: false,
      error: error.message,
      stack: error.stack
    };
    console.log(`❌ Service function error: ${error.message}`);
  }

  console.log(`🧪 Debug test complete:`, JSON.stringify(result, null, 2));
  res.status(200).json(result);
}