// Secure TMDB API route for movie fallback
export default async function handler(req, res) {
  const { id } = req.query;
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Validate ID parameter
  const tmdbId = parseInt(id, 10);
  if (isNaN(tmdbId) || tmdbId <= 0) {
    return res.status(400).json({ error: 'Invalid movie ID' });
  }
  
  // Use proper TMDB authentication hierarchy (Bearer token preferred)
  const bearerToken = process.env.TMDB_BEARER_TOKEN;
  let url, headers;
  
  if (bearerToken && bearerToken.split('.').length === 3) {
    // Use Bearer token method (TMDB v4)
    url = `https://api.themoviedb.org/3/movie/${tmdbId}`;
    headers = {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json'
    };
  } else {
    // Fall back to API key method (TMDB v3)
    const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    
    if (!apiKey || apiKey === 'placeholder' || apiKey.startsWith('placehol')) {
      console.error('TMDB authentication not configured properly:', {
        hasBearerToken: !!bearerToken,
        hasServerKey: !!process.env.TMDB_API_KEY,
        hasPublicKey: !!process.env.NEXT_PUBLIC_TMDB_API_KEY
      });
      return res.status(500).json({ error: 'TMDB service unavailable' });
    }
    
    url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}`;
    headers = { 'Accept': 'application/json' };
  }
  
  try {
    // Fetch from TMDB with proper authentication
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Movie not found' });
      }
      if (response.status === 401) {
        // Check rate limit headers for 401s
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        console.error('TMDB 401 Unauthorized:', {
          authMethod: bearerToken ? 'Bearer' : 'API Key',
          rateLimitRemaining,
          possibleCauses: ['Invalid/expired token', 'Rate limit exceeded', 'Wrong scope']
        });
        return res.status(401).json({ 
          error: 'TMDB authentication failed',
          details: rateLimitRemaining === '0' ? 'Rate limit exceeded' : 'Invalid or expired credentials'
        });
      }
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const tmdbData = await response.json();
    
    // Return sanitized movie data
    const movieData = {
      title: tmdbData.title,
      year: tmdbData.release_date ? parseInt(tmdbData.release_date.substring(0, 4)) : null,
      tmdb_id: tmdbData.id,
      poster_url: tmdbData.poster_path 
        ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
        : '/images/placeholder-poster.jpg',
      overview: tmdbData.overview,
      genres: tmdbData.genres || [],
      runtime: tmdbData.runtime,
      vote_average: tmdbData.vote_average
    };
    
    // Cache response for 1 hour
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
    res.status(200).json(movieData);
    
  } catch (error) {
    console.error('TMDB API route error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch movie data',
      details: error.message 
    });
  }
}