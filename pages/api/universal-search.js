// API endpoint for universal search
// V1: Searches Collections and Movies only (People disabled - focus on thematic discovery)
// GET /api/universal-search?q=noir

export default async function universalSearchHandler(req, res) {
  const startTime = Date.now();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  try {
    // TODO: Implement actual search against database
    // For now, return mock data for prototype

    const query = q.toLowerCase();
    const duration = Date.now() - startTime;

    // Mock collections search - expanded with realistic data from browse lists
    const allMockCollections = [
      // Film Noir collections
      { id: '1', title: '1940s Film Noir', total_movies: 11, genre: 'Film Noir', type: 'collection' },
      { id: '2', title: 'Film Noir Classics', total_movies: 53, genre: 'Film Noir', type: 'collection' },
      { id: '3', title: 'Neo-Noir Thrillers', total_movies: 28, genre: 'Thriller', type: 'collection' },
      // Drama collections
      { id: '4', title: 'Newsroom Dramas', total_movies: 42, genre: 'Drama', type: 'collection' },
      { id: '6', title: '1950s Urban Stories', total_movies: 33, genre: 'Drama', type: 'collection' },
      { id: '7', title: 'Family Secrets Unveiled', total_movies: 18, genre: 'Drama', type: 'collection' },
      { id: '8', title: 'Corporate Corruption Thrillers', total_movies: 22, genre: 'Drama', type: 'collection' },
      // Action/Thriller collections
      { id: '5', title: 'WWII Espionage Thrillers', total_movies: 26, genre: 'Action Thriller', type: 'collection' },
      { id: '9', title: '70s Exploitation Films', total_movies: 48, genre: 'Action', type: 'collection' },
      { id: '10', title: 'OSS Intelligence Films', total_movies: 46, genre: 'Action Thriller', type: 'collection' },
      { id: '11', title: 'Heist Films', total_movies: 31, genre: 'Crime', type: 'collection' },
      { id: '12', title: 'Psychological Thrillers', total_movies: 38, genre: 'Thriller', type: 'collection' },
      // Sci-Fi collections
      { id: '13', title: 'Dystopian Futures', total_movies: 24, genre: 'Sci-Fi', type: 'collection' },
      { id: '14', title: 'Time Travel Paradoxes', total_movies: 19, genre: 'Sci-Fi', type: 'collection' },
      { id: '15', title: 'AI and Consciousness', total_movies: 16, genre: 'Sci-Fi', type: 'collection' },
      // Horror collections
      { id: '16', title: 'Supernatural Horror', total_movies: 52, genre: 'Horror', type: 'collection' },
      { id: '17', title: 'Slasher Films', total_movies: 34, genre: 'Horror', type: 'collection' },
      { id: '18', title: 'Psychological Horror', total_movies: 29, genre: 'Horror', type: 'collection' },
      // Romance collections
      { id: '19', title: 'Star-Crossed Lovers', total_movies: 27, genre: 'Romance', type: 'collection' },
      { id: '20', title: 'Second Chance Romance', total_movies: 21, genre: 'Romance', type: 'collection' },
      // Comedy collections
      { id: '21', title: 'Dark Comedy', total_movies: 43, genre: 'Comedy', type: 'collection' },
      { id: '22', title: 'Screwball Comedies', total_movies: 25, genre: 'Comedy', type: 'collection' },
      { id: '23', title: 'Mockumentaries', total_movies: 15, genre: 'Comedy', type: 'collection' },
      // Documentary collections
      { id: '24', title: 'Political Documentaries', total_movies: 38, genre: 'Documentary', type: 'collection' },
      { id: '25', title: 'Music Documentaries', total_movies: 31, genre: 'Documentary', type: 'collection' },
      // Western collections
      { id: '26', title: 'Spaghetti Westerns', total_movies: 28, genre: 'Western', type: 'collection' },
      { id: '27', title: 'Revisionist Westerns', total_movies: 19, genre: 'Western', type: 'collection' },
    ];
    const mockCollections = allMockCollections.filter(c => c.title.toLowerCase().includes(query));

    // Mock movies search - expanded with variety
    const allMockMovies = [
      // Classics
      { tmdb_id: 680, title: 'Pulp Fiction', year: 1994, slug: 'Postmodern crime masterpiece', type: 'movie' },
      { tmdb_id: 550, title: 'Fight Club', year: 1999, slug: 'Reality isn\'t what it seems', type: 'movie' },
      { tmdb_id: 13, title: 'Forrest Gump', year: 1994, slug: 'Life is like a box of chocolates', type: 'movie' },
      { tmdb_id: 278, title: 'The Shawshank Redemption', year: 1994, slug: 'Hope springs eternal', type: 'movie' },
      { tmdb_id: 238, title: 'The Godfather', year: 1972, slug: 'The definitive crime saga', type: 'movie' },
      // Noir
      { tmdb_id: 71, title: 'Blade Runner', year: 1982, slug: 'What does it mean to be human?', type: 'movie' },
      { tmdb_id: 70, title: 'The Third Man', year: 1949, slug: 'Post-war Vienna noir classic', type: 'movie' },
      { tmdb_id: 845, title: 'Chinatown', year: 1974, slug: 'Neo-noir corruption mystery', type: 'movie' },
      { tmdb_id: 73, title: 'Double Indemnity', year: 1944, slug: 'Classic film noir insurance fraud', type: 'movie' },
      // Sci-Fi
      { tmdb_id: 603, title: 'The Matrix', year: 1999, slug: 'Reality is a simulation', type: 'movie' },
      { tmdb_id: 424, title: '2001: A Space Odyssey', year: 1968, slug: 'Kubrick\'s space epic', type: 'movie' },
      { tmdb_id: 78, title: 'Blade Runner 2049', year: 2017, slug: 'Stunning sequel exploring identity', type: 'movie' },
      // Thrillers
      { tmdb_id: 807, title: 'Se7en', year: 1995, slug: 'Dark detective thriller', type: 'movie' },
      { tmdb_id: 77, title: 'Memento', year: 2000, slug: 'Reverse chronology mystery', type: 'movie' },
      { tmdb_id: 157336, title: 'Interstellar', year: 2014, slug: 'Space exploration epic', type: 'movie' },
      // Horror
      { tmdb_id: 694, title: 'The Shining', year: 1980, slug: 'Kubrick\'s psychological horror', type: 'movie' },
      { tmdb_id: 539, title: 'Psycho', year: 1960, slug: 'Hitchcock\'s masterpiece', type: 'movie' },
      { tmdb_id: 329865, title: 'Arrival', year: 2016, slug: 'First contact linguistics', type: 'movie' },
    ];
    const mockMovies = allMockMovies.filter(m => m.title.toLowerCase().includes(query));

    // V1: People search disabled - focus on thematic discovery
    // const mockPeople = [
    //   { id: '1', name: 'David Fincher', role: 'Director', filmCount: 12, type: 'person' },
    //   { id: '2', name: 'Martin Scorsese', role: 'Director', filmCount: 28, type: 'person' },
    // ].filter(p => p.name.toLowerCase().includes(query));

    res.status(200).json({
      success: true,
      query: q,
      collections: mockCollections,
      movies: mockMovies,
      // people: mockPeople, // V1: Disabled
      total: mockCollections.length + mockMovies.length, // + mockPeople.length,
      query_time_ms: duration
    });

  } catch (error) {
    console.error('Universal search failed:', error);

    res.status(500).json({
      success: false,
      error: 'Search failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
