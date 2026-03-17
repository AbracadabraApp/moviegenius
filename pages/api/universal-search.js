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

    // Mock collections search
    const mockCollections = [
      { id: '1', title: '1940s Film Noir', total_movies: 11, genre: 'Film Noir', type: 'collection' },
      { id: '2', title: 'Film Noir Classics', total_movies: 53, genre: 'Film Noir', type: 'collection' },
      { id: '3', title: 'Neo-Noir Thrillers', total_movies: 28, genre: 'Thriller', type: 'collection' },
      { id: '4', title: 'Newsroom Dramas', total_movies: 42, genre: 'Drama', type: 'collection' },
      { id: '5', title: 'WWII Espionage Thrillers', total_movies: 26, genre: 'Action Thriller', type: 'collection' },
      { id: '6', title: '1950s Urban Stories', total_movies: 33, genre: 'Drama', type: 'collection' },
    ].filter(c => c.title.toLowerCase().includes(query));

    // Mock movies search
    const mockMovies = [
      { tmdb_id: 680, title: 'Pulp Fiction', year: 1994, slug: 'Postmodern crime masterpiece', type: 'movie' },
      { tmdb_id: 550, title: 'Fight Club', year: 1999, slug: 'Reality isn\'t what it seems', type: 'movie' },
      { tmdb_id: 13, title: 'Forrest Gump', year: 1994, slug: 'Life is like a box of chocolates', type: 'movie' },
    ].filter(m => m.title.toLowerCase().includes(query));

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
