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

  const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
  if (!TMDB_KEY) {
    return res.status(500).json({
      error: 'Search unavailable',
      movies: [],
      fallback: { message: 'Search temporarily unavailable' },
    });
  }

  try {
    const searchQuery = encodeURIComponent(query.trim());
    console.log(`🔍 TMDB search: "${query.trim()}"`);

    const response = await fetch(
      `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${searchQuery}&include_adult=false&language=en-US`
    );

    if (!response.ok) {
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
