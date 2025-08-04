// pages/api/search.js - Dedicated search endpoint
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  console.log('🔍 Search endpoint called with method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  // Search endpoints require API key (Bearer tokens have limited scope for search)
  const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  
  if (!apiKey || apiKey === 'placeholder' || apiKey.startsWith('placehol')) {
    console.error('TMDB search authentication not configured properly:', {
      hasServerKey: !!process.env.TMDB_API_KEY,
      hasPublicKey: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
      publicKeyValue: process.env.NEXT_PUBLIC_TMDB_API_KEY,
      reason: 'Search endpoints require API key (Bearer tokens have limited scope)'
    });
    return res.status(500).json({
      error: 'Search unavailable',
      movies: [],
      fallback: { message: 'Search authentication not configured' },
    });
  }
  
  const searchQuery = encodeURIComponent(query.trim());
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${searchQuery}&include_adult=false&language=en-US`;
  const headers = { 'Accept': 'application/json' };

  try {
    console.log(`🔍 TMDB search: "${query.trim()}" using API key (${process.env.TMDB_API_KEY ? 'server' : 'public'})`);

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 401) {
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        console.error('TMDB search 401 Unauthorized:', {
          authMethod: 'API Key',
          keySource: process.env.TMDB_API_KEY ? 'server' : 'public',
          keyValue: process.env.NEXT_PUBLIC_TMDB_API_KEY || 'hidden',
          rateLimitRemaining,
          possibleCauses: ['Invalid API key', 'Rate limit exceeded', 'Scope restrictions']
        });
      }
      throw new Error(`TMDB API failed: ${response.status}`);
    }

    const data = await response.json();

    const filteredResults = (data.results || [])
      .filter(
        item =>
          (item.media_type === 'movie' && item.title && item.id) ||
          (item.media_type === 'person' && item.name && item.id)
      )
      .map(item => {
        if (item.media_type === 'movie') {
          return {
            id: `tmdb_movie_${item.id}`,
            title: item.title,
            year: item.release_date ? parseInt(item.release_date.substring(0, 4)) : null,
            tmdb_id: item.id,
            poster_url: item.poster_path
              ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
              : null,
            popularity: item.popularity || 0,
            type: 'movie',
          };
        } else if (item.media_type === 'person') {
          return {
            id: `tmdb_person_${item.id}`,
            title: item.name,
            year: null,
            tmdb_id: null,
            poster_url: item.profile_path
              ? `https://image.tmdb.org/t/p/w500${item.profile_path}`
              : null,
            popularity: item.popularity || 0,
            type: 'person',
            known_for_department: item.known_for_department,
            known_for:
              (item.known_for || [])
                .slice(0, 3)
                .map(movie => movie.title || movie.name)
                .join(', ') || 'Various films',
          };
        }
      })
      .filter(Boolean);

    const popularitySorted = filteredResults.sort((a, b) => b.popularity - a.popularity);
    const movies = popularitySorted.slice(0, 20);

    console.log(`✅ Search success: "${query.trim()}" -> ${movies.length} results`);

    // Set aggressive cache headers for search results - 24 hours
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');

    return res.status(200).json({
      movies,
      query: query.trim(),
      hasResults: movies.length > 0,
      fallback:
        movies.length === 0
          ? {
              message:
                "We didn't find a result, but would you like to pass it on to our Movie Genius?",
              askUrl: `/genius?q=${encodeURIComponent(query.trim())}`,
            }
          : null,
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: 'Search failed',
      movies: [],
      message: error.message,
    });
  }
}
