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
  
  // Use proper TMDB authentication with placeholder validation
  const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  
  if (!apiKey || apiKey === 'placeholder' || apiKey.startsWith('placehol')) {
    console.error('TMDB API key not configured properly:', {
      hasServerKey: !!process.env.TMDB_API_KEY,
      hasPublicKey: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
      publicKeyValue: process.env.NEXT_PUBLIC_TMDB_API_KEY?.substring(0, 8) + '...'
    });
    return res.status(500).json({ error: 'TMDB service unavailable' });
  }
  
  try {
    // Fetch from TMDB with proper API key
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}`
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Movie not found' });
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