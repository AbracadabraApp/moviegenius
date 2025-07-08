// pages/api/multi-search.js - Movies & People multi-search API

/**
 * Calculate relevance score for movie results
 * Combines title matching with popularity to surface relevant results
 */
function calculateRelevanceScore(movie, searchQuery) {
  const query = searchQuery.toLowerCase();
  const title = movie.title.toLowerCase();
  
  let score = movie.popularity || 0;
  
  // Exact title match bonus
  if (title === query) {
    score += 10000;
  }
  
  // Title starts with query bonus
  if (title.startsWith(query)) {
    score += 5000;
  }
  
  // Title contains query bonus
  if (title.includes(query)) {
    score += 2000;
  }
  
  // Word boundary matches (e.g., "baby" matches "baby driver")
  const queryWords = query.split(/\s+/);
  const titleWords = title.split(/\s+/);
  
  queryWords.forEach(queryWord => {
    titleWords.forEach(titleWord => {
      if (titleWord.startsWith(queryWord)) {
        score += 1000;
      }
      if (titleWord.includes(queryWord)) {
        score += 500;
      }
    });
  });
  
  // Popularity bonus (higher popularity = more relevant)
  score += (movie.popularity || 0) * 10;
  
  return score;
}

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

    // Fetch multiple pages to get broader results (up to 40 total)
    const allResults = [];
    
    for (let page = 1; page <= 2; page++) {
      const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&page=${page}`;
      const response = await fetch(tmdbUrl);
      
      if (!response.ok) {
        console.error(`TMDB API error page ${page}:`, response.status);
        break;
      }
      
      const data = await response.json();
      allResults.push(...data.results);
    }
    
    // Filter and rank movies by popularity and relevance (20 results)
    const movieResults = allResults
      .filter(r => r.media_type === 'movie')
      .map(movie => ({
        ...movie,
        // Calculate relevance score based on title match and popularity
        relevanceScore: calculateRelevanceScore(movie, searchQuery)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20)
      .map(movie => ({
        id: `tmdb_${movie.id}`,
        title: movie.title,
        year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null,
        tmdb_id: movie.id,
        poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/images/placeholder-poster.jpg',
        media_type: 'movie'
      }));

    // People search temporarily disabled for scope reduction
    // const people = allResults
    //   .filter(r => r.media_type === 'person')
    //   .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    //   .slice(0, 5)
    //   .map(person => ({
    //     id: `person_${person.id}`,
    //     name: person.name,
    //     tmdb_id: person.id,
    //     profile_url: person.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : '/images/placeholder-person.jpg',
    //     known_for: person.known_for_department || 'Acting',
    //     media_type: 'person'
    //   }));
    
    const people = []; // Temporarily empty for movies-only focus

    console.log(`🎬 Found ${movieResults.length} movies, ${people.length} people for "${searchQuery}"`);

    const hasResults = movieResults.length > 0 || people.length > 0;
    
    res.status(200).json({
      movies: movieResults,
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