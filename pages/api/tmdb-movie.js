// pages/api/tmdb-movie.js - TMDB movie details API endpoint
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Movie ID is required' });
  }

  const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;

  if (!TMDB_KEY) {
    return res.status(500).json({
      error: 'TMDB API key not configured',
      env_check: {
        NEXT_PUBLIC_TMDB_API_KEY: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
        TMDB_API_KEY: !!process.env.TMDB_API_KEY,
      },
    });
  }

  try {
    console.log(`🎬 Fetching movie details for ID: ${id}`);

    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&language=en-US`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`TMDB API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`✅ TMDB movie data fetched: ${data.title} (${data.release_date?.substring(0, 4)})`);

    return res.status(200).json(data);
  } catch (error) {
    console.error('❌ TMDB movie fetch failed:', error);

    return res.status(500).json({
      error: error.message,
      movie_id: id,
      timestamp: new Date().toISOString(),
    });
  }
}