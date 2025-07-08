// pages/api/multi-search.js - Movies & People multi-search API
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
    console.log(`🔍 Multi-search: "${searchQuery}"`);

    // Use TMDB multi-search endpoint
    const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(tmdbUrl);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter for movies and people only (NO TV)
    const movies = data.results
      .filter(r => r.media_type === 'movie')
      .slice(0, 10)
      .map(movie => ({
        id: `tmdb_${movie.id}`,
        title: movie.title,
        year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
        tmdb_id: movie.id,
        poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/images/placeholder-poster.jpg',
        media_type: 'movie'
      }));

    const people = data.results
      .filter(r => r.media_type === 'person')
      .slice(0, 5)
      .map(person => ({
        id: `person_${person.id}`,
        name: person.name,
        tmdb_id: person.id,
        profile_url: person.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : '/images/placeholder-person.jpg',
        known_for: person.known_for_department || 'Acting',
        media_type: 'person'
      }));

    console.log(`🎬 Found ${movies.length} movies, ${people.length} people for "${searchQuery}"`);

    const hasResults = movies.length > 0 || people.length > 0;
    
    res.status(200).json({
      movies,
      people,
      query: searchQuery,
      hasResults,
      fallback: !hasResults ? {
        message: "We didn't find a result, but would you like to pass it on to our Movie Genius?",
        askUrl: `/genius?q=${encodeURIComponent(searchQuery)}`
      } : null
    });

  } catch (error) {
    console.error('Multi-search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
}