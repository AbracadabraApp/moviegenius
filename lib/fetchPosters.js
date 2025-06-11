// lib/fetchPosters.js
export async function fetchMoviePosters(titles) {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  const results = [];

  for (const title of titles) {
    try {
      const query = encodeURIComponent(title.replace(/’/g, "'"));
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}`
      );
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        const movie = data.results[0];
        results.push({
          title,
          year: movie.release_date ? movie.release_date.slice(0, 4) : '—',
          poster: movie.poster_path
            ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
            : '/placeholder.png',
          slug: null, // Never use TMDB overview as slug - preserve Claude-generated taglines
        });
      }
    } catch (err) {
      console.error(`Failed to fetch poster for ${title}:`, err);
    }
  }

  return results;
}
