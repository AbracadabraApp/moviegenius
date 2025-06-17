// pages/api/tmdb-credits.js
/**
 * TMDB Credits API - Get cast and crew for a movie
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { tmdbId } = req.body;

  if (!tmdbId) {
    return res.status(400).json({ error: 'TMDB ID is required' });
  }

  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API key not configured' });
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${process.env.TMDB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const credits = await response.json();

    // Process and filter the data
    const processedCredits = {
      directors: credits.crew?.filter(person => person.job === 'Director') || [],
      writers: credits.crew?.filter(person => 
        ['Screenplay', 'Writer', 'Story'].includes(person.job)
      ) || [],
      topCast: credits.cast?.slice(0, 5) || [], // Top 5 cast members
      cast: credits.cast || [],
      crew: credits.crew || []
    };

    res.status(200).json(processedCredits);

  } catch (error) {
    console.error('TMDB credits error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch movie credits',
      details: error.message 
    });
  }
}