// pages/api/simple-search.js - 100% TMDB-based movie search API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const searchQuery = query.trim();
    console.log(`🔍 TMDB search: "${searchQuery}" [with popularity scores]`);

    // Search TMDB directly - 100% coverage with TMDB IDs
    const { searchTMDB } = await import('../../lib/services/tmdb-search.js');
    const tmdbResults = await searchTMDB(searchQuery);

    let movies = [];
    if (tmdbResults && tmdbResults.length > 0) {
      // Convert TMDB results to our format - all have TMDB IDs
      movies = tmdbResults.slice(0, 20).map(movie => ({
        id: `tmdb_${movie.id}`, // Temporary ID for frontend
        title: movie.title,
        year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
        tmdb_id: movie.id, // 100% guaranteed TMDB ID
        poster_url: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : '/images/placeholder-poster.jpg',
        popularity: movie.popularity || 0, // Include TMDB popularity score for ranking
        streaming_data: null, // Will be fetched organically if needed
        slug: null,
      }));

      console.log(`🎬 Found ${movies.length} TMDB results for "${searchQuery}"`);
    }

    // V1 Feature: Provide fallback info for empty results
    const hasResults = movies && movies.length > 0;

    res.status(200).json({
      movies: movies || [],
      query: searchQuery,
      hasResults,
      fallback: !hasResults
        ? {
            message:
              "We didn't find a result, but would you like to pass it on to our Movie Genius?",
            askUrl: `/genius?q=${encodeURIComponent(searchQuery)}`,
          }
        : null,
    });
  } catch (error) {
    console.error('Simple search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
    });
  }
}
