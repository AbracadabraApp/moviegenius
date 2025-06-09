// pages/api/fetch-tmdb-poster.js

export default async function handler(req, res) {
  const { title } = req.query;

  if (!title) {
    return res.status(400).json({ error: 'Missing title parameter' });
  }

  const apiKey = process.env.TMDB_API_KEY;
  const query = encodeURIComponent(title);
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}`;

  try {
    const tmdbRes = await fetch(url);
    const data = await tmdbRes.json();
    const result = data.results?.[0];

    if (!result || !result.poster_path) {
      return res.status(404).json({ poster: null });
    }

    const poster = `https://image.tmdb.org/t/p/w500${result.poster_path}`;
    res.status(200).json({ poster });
  } catch (err) {
    console.error('TMDb error:', err.message);
    res.status(500).json({ error: 'Failed to fetch poster' });
  }
}
