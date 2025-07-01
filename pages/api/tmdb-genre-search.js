// pages/api/tmdb-genre-search.js - TMDB Genre Discovery API
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Category to TMDB Genre ID mapping
const GENRE_MAPPING = {
  'action': 28,
  'comedy': 35,
  'horror': 27,
  'thriller': 53,
  'drama': 18,
  'sci-fi': 878,
  'romance': 10749,
  'animated': 16,
  'documentary': 99,
  'foreign': null, // Special handling
  'marvel': null, // Special handling via keyword
  'noir': null // Special handling via keyword
};

// Special keyword mapping for non-genre categories
const KEYWORD_MAPPING = {
  'marvel': 180547, // Marvel Cinematic Universe keyword
  'noir': 4344, // Film noir keyword
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category } = req.query;

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Category parameter is required' });
    }

    console.log(`🎭 TMDB Genre search: "${category}"`);

    const genreId = GENRE_MAPPING[category];
    const keywordId = KEYWORD_MAPPING[category];
    
    let tmdbUrl;
    
    if (genreId) {
      // Standard genre discovery
      tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1`;
    } else if (keywordId) {
      // Keyword-based discovery for special categories
      tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&with_keywords=${keywordId}&sort_by=popularity.desc&page=1`;
    } else if (category === 'foreign') {
      // Foreign films: non-English language movies
      tmdbUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&with_original_language=!en&sort_by=popularity.desc&page=1`;
    } else {
      return res.status(400).json({ error: `Unknown category: ${category}` });
    }

    const response = await fetch(tmdbUrl);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform TMDB results to our movie format
    const movies = await Promise.all(
      data.results.slice(0, 20).map(async (tmdbMovie) => {
        // Check if movie already exists in our database
        const { data: existingMovie } = await supabase
          .from('movies')
          .select('id, title, year, slug, poster_url, streaming_data, tmdb_id')
          .eq('tmdb_id', tmdbMovie.id)
          .single();

        if (existingMovie) {
          // Return existing movie data
          return existingMovie;
        } else {
          // Return TMDB data in our format (will be added to DB when clicked)
          return {
            title: tmdbMovie.title,
            year: tmdbMovie.release_date ? parseInt(tmdbMovie.release_date.substring(0, 4)) : null,
            slug: tmdbMovie.overview ? tmdbMovie.overview.substring(0, 100) + '...' : null,
            poster_url: tmdbMovie.poster_path 
              ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
              : '/images/placeholder-poster.jpg',
            streaming_data: null, // Will be fetched if needed
            tmdb_id: tmdbMovie.id
          };
        }
      })
    );

    console.log(`✅ Found ${movies.length} movies for genre "${category}"`);

    res.status(200).json({
      movies: movies,
      category: category,
      total: data.total_results
    });

  } catch (error) {
    console.error('TMDB genre search error:', error);
    res.status(500).json({
      error: 'Genre search failed',
      message: error.message
    });
  }
}