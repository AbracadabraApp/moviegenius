// pages/api/tmdb-movie.js - TMDB movie details API endpoint
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { id, test } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Movie ID is required' });
  }

  // TEMPORARY: Test service import if test=1
  if (test === '1') {
    try {
      const { getTMDBMovieDetails } = await import('../../lib/services/tmdb-search');
      const result = await getTMDBMovieDetails(parseInt(id));
      return res.status(200).json({
        test: 'service_import_success',
        result: result ? { title: result.title, year: result.release_date?.substring(0, 4) } : null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return res.status(500).json({
        test: 'service_import_failed',
        error: error.message,
        stack: error.stack?.substring(0, 500),
        timestamp: new Date().toISOString()
      });
    }
  }

  // Use dual authentication approach (Bearer token + API key fallback)
  const bearerToken = process.env.TMDB_BEARER_TOKEN;
  const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  
  let url, headers;
  
  if (bearerToken && bearerToken.split('.').length === 3) {
    // Use Bearer token method (production preference)
    url = `https://api.themoviedb.org/3/movie/${id}?language=en-US`;
    headers = {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json',
    };
  } else if (apiKey) {
    // Use API key method (development fallback)
    url = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=en-US`;
    headers = {
      'Accept': 'application/json',
    };
  } else {
    return res.status(500).json({
      error: 'TMDB authentication not configured',
      env_check: {
        TMDB_BEARER_TOKEN: !!process.env.TMDB_BEARER_TOKEN,
        TMDB_API_KEY: !!process.env.TMDB_API_KEY,
        NEXT_PUBLIC_TMDB_API_KEY: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
      },
    });
  }

  try {
    console.log(`🎬 Fetching movie details for ID: ${id}`);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      // Try to get error details from response
      let errorText = 'Unknown error';
      try {
        const errorData = await response.json();
        errorText = errorData.status_message || errorData.error || `HTTP ${response.status}`;
      } catch (parseError) {
        // If JSON parsing fails, try to get text
        try {
          errorText = await response.text() || `HTTP ${response.status}: ${response.statusText}`;
        } catch (textError) {
          errorText = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
      
      console.error(`❌ TMDB API Error: ${response.status} - ${errorText}`);
      
      return res.status(response.status).json({
        error: `TMDB API Error: ${errorText}`,
        movie_id: id,
        status_code: response.status,
        timestamp: new Date().toISOString(),
      });
    }

    const data = await response.json();

    console.log(`✅ TMDB movie data fetched: ${data.title} (${data.release_date?.substring(0, 4)})`);

    return res.status(200).json(data);
  } catch (error) {
    console.error('❌ TMDB movie fetch failed:', error);

    return res.status(500).json({
      error: `Network or parsing error: ${error.message}`,
      movie_id: id,
      timestamp: new Date().toISOString(),
    });
  }
}