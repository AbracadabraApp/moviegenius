import { getCache } from '../../lib/cache.js';

export default async function handler(req, res) {
  const page = req.query.page || 1;

  try {
    // Cache popular movies with Redis (12-hour TTL)
    const cache = getCache();
    const { results } = await cache.cacheTMDBResponse(
      'popular_movies',
      { page },
      async () => {
        console.log(`🔄 Cache miss - fetching TMDB popular movies page: ${page}`);
        
        const tmdbRes = await fetch(
          `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&page=${page}`
        );
        const data = await tmdbRes.json();
        
        console.log(`💾 Cached TMDB popular movies page ${page} - ${data.results?.length || 0} movies`);
        return data;
      }
    );

    const movies = await Promise.all(
      results.map(async (m) => {
        let slug = 'Popular pick!';
        try {
          const aiRes = await fetch(`${process.env.HOST}/api/get-slug`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: m.title }),
          });
          const aiData = await aiRes.json();
          slug = aiData.slug || slug;
        } catch (e) {
          console.warn('Slug fallback for:', m.title);
        }

        return {
          id: m.id,
          title: m.title,
          year: m.release_date?.split('-')[0],
          poster: m.poster_path
            ? `https://image.tmdb.org/t/p/w300${m.poster_path}`
            : '/fallback-poster.png',
          slug,
          source: 'TMDB',
        };
      })
    );

    res.status(200).json({ movies });
  } catch (err) {
    console.error('load-more error:', err);
    res.status(500).json({ message: 'Failed to load more movies' });
  }
}
