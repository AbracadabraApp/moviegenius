// pages/api/new-releases.js - TMDB New Releases API
import { ensureMovieInDb } from '../../lib/services/tmdb-persist';

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
        movies: [],
      });
    }

    console.log(`🎬 Fetching new releases: ${category}`);

    let tmdbUrl;
    let categoryTitle;

    // Get current date for date-based filtering
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Calculate dates
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    switch (category) {
      case 'now-playing':
        tmdbUrl = `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
        categoryTitle = 'Now Playing';
        break;

      case 'upcoming':
        tmdbUrl = `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
        categoryTitle = 'Coming Soon';
        break;

      case 'recent':
        // Use discover to find movies released in the last 60 days
        tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=release_date.desc&release_date.gte=${sixtyDaysAgo}&release_date.lte=${currentDate}&page=1`;
        categoryTitle = 'Recent Releases';
        break;

      case 'trending':
        tmdbUrl = `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`;
        categoryTitle = 'Trending This Week';
        break;

      default:
        return res.status(400).json({ error: 'Invalid category' });
    }

    const response = await fetch(tmdbUrl);

    if (!response.ok) {
      console.error(`TMDB API error: ${response.status}`);
      return res.status(500).json({
        error: 'Failed to fetch movies',
        movies: [],
      });
    }

    const data = await response.json();

    // Persist all results to DB — fire-and-forget
    (data.results || []).forEach(movie => ensureMovieInDb(movie).catch(() => {}));

    // Transform results to match our format
    const movies = (data.results || [])
      .filter(movie => movie.title && movie.id) // Ensure valid movie data
      .slice(0, 20) // Limit to 20 results
      .map(movie => ({
        id: `tmdb_${movie.id}`,
        title: movie.title,
        year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
        tmdb_id: movie.id,
        poster_url: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : '/images/placeholder-poster.jpg',
        popularity: movie.popularity || 0,
        vote_average: movie.vote_average || 0,
        release_date: movie.release_date,
      }));

    console.log(`✅ New releases success: ${category} -> ${movies.length} movies`);

    res.status(200).json({
      movies,
      category,
      categoryTitle,
      hasResults: movies.length > 0,
      totalResults: data.total_results || movies.length,
    });
  } catch (error) {
    console.error('New releases error:', error);
    res.status(500).json({
      error: 'Internal server error',
      movies: [],
      message: error.message,
    });
  }
}
