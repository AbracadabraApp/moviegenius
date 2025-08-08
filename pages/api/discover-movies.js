// pages/api/discover-movies.js - Movie discovery API for curated sections
import { createClient, supabase } from '../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

const pool = getPool();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { sections = ['trending', 'popular', 'recent'], limit = 12 } = req.body;

    console.log(`🎬 Loading discovery sections: ${sections.join(', ')}`);

    const results = {};

    // Load each requested section
    for (const section of sections) {
      switch (section) {
        case 'trending':
          results.trending = await getTrendingMovies(limit);
          break;
        case 'popular':
          results.popular = await getPopularMovies(limit);
          break;
        case 'recent':
          results.recent = await getRecentMovies(limit);
          break;
        case 'random':
          results.random = await getRandomMovies(limit);
          break;
        default:
          console.warn(`Unknown section: ${section}`);
      }
    }

    const loadTime = Date.now() - startTime;

    console.log(
      `✅ Discovery loaded in ${loadTime}ms: ${Object.keys(results)
        .map(k => `${k}: ${results[k]?.length || 0}`)
        .join(', ')}`
    );

    res.status(200).json({
      ...results,
      loadTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const loadTime = Date.now() - startTime;
    console.error('Discovery API error:', error);

    res.status(500).json({
      error: 'Failed to load discovery content',
      message: error.message,
      loadTime,
    });
  }
}

// Get trending movies (recently added + popular)
async function getTrendingMovies(limit = 12) {
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, poster_url, streaming_data, slug, created_at')
      .not('tmdb_id', 'is', null)
      .not('poster_url', 'is', null)
      .gte('year', 2015) // Focus on recent movies
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more to filter

    if (error) throw error;

    // Prioritize movies with good metadata
    const filtered = data
      .filter(
        movie => movie.poster_url && !movie.poster_url.includes('placeholder') && movie.year >= 2015
      )
      .slice(0, limit);

    return filtered;
  } catch (error) {
    console.error('Failed to load trending movies:', error);
    return [];
  }
}

// Get popular/classic movies
async function getPopularMovies(limit = 12) {
  try {
    // Get a mix of classic and popular movies
    const classicMovies = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, poster_url, streaming_data, slug')
      .not('tmdb_id', 'is', null)
      .not('poster_url', 'is', null)
      .in('tmdb_id', [
        238, // The Godfather
        278, // The Shawshank Redemption
        603, // The Matrix
        680, // Pulp Fiction
        155, // The Dark Knight
        13, // Forrest Gump
        122, // The Lord of the Rings: The Return of the King
        550, // Fight Club
        11216, // Star Wars
        769, // GoodFellas
        289, // Casablanca
        19404, // Dilwale Dulhania Le Jayenge
      ])
      .limit(limit);

    if (classicMovies && classicMovies.length > 0) {
      return classicMovies;
    }

    // Fallback to recent popular movies if classics not available
    const { data, error } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, poster_url, streaming_data, slug')
      .not('tmdb_id', 'is', null)
      .not('poster_url', 'is', null)
      .gte('year', 2000)
      .order('year', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.filter(movie => movie.poster_url && !movie.poster_url.includes('placeholder'));
  } catch (error) {
    console.error('Failed to load popular movies:', error);
    return [];
  }
}

// Get recently added movies
async function getRecentMovies(limit = 12) {
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, poster_url, streaming_data, slug, created_at')
      .not('tmdb_id', 'is', null)
      .not('poster_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get extra to filter

    if (error) throw error;

    // Filter out placeholder posters and ensure good quality
    const filtered = data
      .filter(
        movie =>
          movie.poster_url &&
          !movie.poster_url.includes('placeholder') &&
          movie.year &&
          movie.year >= 1970
      )
      .slice(0, limit);

    return filtered;
  } catch (error) {
    console.error('Failed to load recent movies:', error);
    return [];
  }
}

// Get random selection of movies
async function getRandomMovies(limit = 12) {
  try {
    // Get a random sample using ORDER BY RANDOM()
    const { data, error } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, poster_url, streaming_data, slug')
      .not('tmdb_id', 'is', null)
      .not('poster_url', 'is', null)
      .gte('year', 1980)
      .order('id') // Use deterministic order, then shuffle client-side
      .limit(limit * 3); // Get more for better randomization

    if (error) throw error;

    // Client-side shuffle and filter
    const filtered = data
      .filter(movie => movie.poster_url && !movie.poster_url.includes('placeholder'))
      .sort(() => Math.random() - 0.5) // Simple shuffle
      .slice(0, limit);

    return filtered;
  } catch (error) {
    console.error('Failed to load random movies:', error);
    return [];
  }
}
