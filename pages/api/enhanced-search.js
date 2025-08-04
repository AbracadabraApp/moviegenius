// pages/api/enhanced-search.js - TMDB multi-search with movie+person filtering
export default async function handler(req, res) {
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
    console.log(`🔍 Enhanced TMDB search: "${query.trim()}"`);

    // Use multi-search endpoint for movies + people (exclude TV)
    const response = await fetch(
      `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${searchQuery}&include_adult=false&language=en-US`
    );

    if (!response.ok) {
      throw new Error(`TMDB API failed: ${response.status}`);
    }

    const data = await response.json();

    // Filter and transform results - movies and people only, exclude TV shows
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
            tmdb_id: null, // People don't navigate to movie pages
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

    // Sort by popularity (higher = more popular/relevant)
    const popularitySorted = filteredResults.sort((a, b) => b.popularity - a.popularity);

    // Limit to top 20 results
    const movies = popularitySorted.slice(0, 20);

    console.log(
      `✅ Enhanced search success: "${query.trim()}" -> ${movies.length} results (${movies.filter(r => r.type === 'movie').length} movies, ${movies.filter(r => r.type === 'person').length} people)`
    );

    res.status(200).json({
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
    console.error('Enhanced search error:', error);
    res.status(500).json({
      error: 'Search failed',
      movies: [],
      message: error.message,
    });
  }
}
