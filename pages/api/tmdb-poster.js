// pages/api/tmdb-poster.js
/**
 * TMDB Poster API Route
 *
 * Fetches movie poster from TMDB API using title and year.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { title, year } = req.body;

  if (!title || !year) {
    return res.status(400).json({ error: 'Movie title and year are required' });
  }

  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  try {
    const tmdbResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`
    );

    if (!tmdbResponse.ok) {
      throw new Error('TMDB API request failed');
    }

    const tmdbData = await tmdbResponse.json();
    const movie = tmdbData.results?.[0];

    if (movie) {
      const posterUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : '/images/placeholder-poster.jpg';

      // Cache TMDB data for 30 days - movie metadata is permanent (was 7 days)
      res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=5184000');
      res.status(200).json({
        poster: posterUrl,
        tmdb_id: movie.id,
        // Note: overview intentionally omitted to prevent TMDB summary contamination
      });
    } else {
      // Cache "not found" results for 24 hours (was 1 hour)
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');
      res.status(200).json({
        poster: '/images/placeholder-poster.jpg',
        // Note: overview intentionally omitted to prevent TMDB summary contamination
      });
    }
  } catch (error) {
    console.error('Error fetching TMDB poster:', error);
    res.status(500).json({
      error: 'Failed to fetch poster',
      poster: '/images/placeholder-poster.jpg', // Fallback
      // Note: overview intentionally omitted to prevent TMDB summary contamination
    });
  }
}
