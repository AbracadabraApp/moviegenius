/**
 * Debug endpoint to check why popularity scores are null
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const query = req.query.q || 'matrix';
    
    // Test 1: Direct TMDB API call
    const bearerToken = process.env.TMDB_BEARER_TOKEN;
    const directResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const directData = await directResponse.json();
    const firstDirectResult = directData.results?.[0];
    
    // Test 2: Our tmdb-search service
    const { searchTMDB } = await import('../../lib/services/tmdb-search.js');
    const serviceResults = await searchTMDB(query);
    const firstServiceResult = serviceResults?.[0];
    
    // Test 3: Our simple-search endpoint (internal call)
    const simpleResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/simple-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const simpleData = await simpleResponse.json();
    const firstSimpleResult = simpleData.movies?.[0];
    
    return res.status(200).json({
      query,
      tests: {
        direct_tmdb: {
          status: directResponse.status,
          result: firstDirectResult ? {
            title: firstDirectResult.title,
            year: firstDirectResult.release_date?.substring(0, 4),
            popularity: firstDirectResult.popularity,
            id: firstDirectResult.id
          } : null
        },
        tmdb_search_service: {
          resultCount: serviceResults?.length || 0,
          result: firstServiceResult ? {
            title: firstServiceResult.title,
            year: firstServiceResult.release_date?.substring(0, 4), 
            popularity: firstServiceResult.popularity,
            id: firstServiceResult.id
          } : null
        },
        simple_search_endpoint: {
          status: simpleResponse.status,
          resultCount: simpleData.movies?.length || 0,
          result: firstSimpleResult ? {
            title: firstSimpleResult.title,
            year: firstSimpleResult.year,
            popularity: firstSimpleResult.popularity,
            tmdb_id: firstSimpleResult.tmdb_id
          } : null
        }
      },
      analysis: {
        directTMDBHasPopularity: !!firstDirectResult?.popularity,
        serviceHasPopularity: !!firstServiceResult?.popularity,
        endpointHasPopularity: !!firstSimpleResult?.popularity
      }
    });
    
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}