// pages/api/movie-search.js - Fresh TMDB search API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
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
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${searchQuery}&include_adult=false`
    );

    if (!response.ok) {
      throw new Error('TMDB API failed');
    }

    const data = await response.json();
    const movies = (data.results || []).slice(0, 20).map(movie => ({
      id: `tmdb_${movie.id}`,
      title: movie.title,
      year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
      tmdb_id: movie.id,
      poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      type: 'movie',
    }));

    res.status(200).json({
      movies,
      query: query.trim(),
      hasResults: movies.length > 0,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      movies: [],
    });
  }
}
