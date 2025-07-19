// pages/api/popular-movies.js - TMDB Popular & Top Rated Movies API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!TMDB_API_KEY) {
      return res.status(500).json({ 
        error: 'TMDB API key not configured',
        movies: []
      });
    }

    console.log(`🎬 Fetching popular movies: ${category}`);

    let tmdbUrl;
    let categoryTitle;

    switch (category) {
      case 'popular-all-time':
        // Use TMDB popular endpoint - these are the most popular movies
        tmdbUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
        categoryTitle = 'Most Popular All Time';
        break;
      
      case 'top-rated':
        // Use TMDB top rated endpoint - highest rated movies
        tmdbUrl = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
        categoryTitle = 'Top Rated Movies';
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid category' });
    }

    const response = await fetch(tmdbUrl);

    if (!response.ok) {
      console.error(`TMDB API error: ${response.status}`);
      return res.status(500).json({
        error: 'Failed to fetch movies',
        movies: []
      });
    }

    const data = await response.json();
    
    // Transform results to match our format
    const movies = (data.results || [])
      .filter(movie => movie.title && movie.id) // Ensure valid movie data
      .slice(0, 20) // Limit to 20 results
      .map(movie => ({
        id: `tmdb_${movie.id}`,
        title: movie.title,
        year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
        tmdb_id: movie.id,
        poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/images/placeholder-poster.jpg',
        popularity: movie.popularity || 0,
        vote_average: movie.vote_average || 0,
        vote_count: movie.vote_count || 0,
        release_date: movie.release_date
      }));

    console.log(`✅ Popular movies success: ${category} -> ${movies.length} movies`);

    res.status(200).json({
      movies,
      category,
      categoryTitle,
      hasResults: movies.length > 0,
      totalResults: data.total_results || movies.length
    });

  } catch (error) {
    console.error('Popular movies error:', error);
    res.status(500).json({
      error: 'Internal server error',
      movies: [],
      message: error.message
    });
  }
}