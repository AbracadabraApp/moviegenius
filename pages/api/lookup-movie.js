// pages/api/lookup-movie.js
import { createClient, supabase } from './railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from './railway-db.js';
import { getCache } from '../../lib/cache.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { title, year } = req.body;

  if (!title || !year) {
    return res.status(400).json({ error: 'Movie title and year are required' });
  }

  try {
    // Initialize Supabase client
    const pool = getPool();

    console.log(`🔍 Looking up movie: "${title}" (${year})`);

    // Query movie from database
    const { data: movie, error } = await supabase
      .from('movies')
      .select('id, title, year, slug, poster_url, streaming_data, tmdb_id')
      .eq('title', title)
      .eq('year', year)
      .single();

    console.log(`📊 Database result:`, { movie, error: error?.message });

    // If not found, let's see what similar movies exist
    if (!movie || error) {
      const { data: similarMovies } = await supabase
        .from('movies')
        .select('title, year, tmdb_id')
        .ilike('title', `%${title.split(':')[0].trim()}%`)
        .limit(5);

      console.log(`🔍 Similar titles found:`, similarMovies);
    }

    if (movie && !error) {
      // Movie found in database
      res.status(200).json(movie);
    } else {
      // Movie not found in database - try TMDB lookup and save
      console.log(`Movie not in database, trying TMDB lookup: ${title} (${year})`);

      try {
        // Look up movie in TMDB with Redis caching
        const cache = getCache();
        const tmdbMovie = await cache.cacheTMDBResponse(
          'search_movie',
          { title, year },
          async () => {
            console.log(`🔄 Cache miss - fetching TMDB data for lookup: ${title} (${year})`);

            const tmdbResponse = await fetch(
              `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`
            );

            if (!tmdbResponse.ok) {
              throw new Error('TMDB API request failed');
            }

            const tmdbData = await tmdbResponse.json();
            const movie = tmdbData.results?.[0];

            if (movie) {
              console.log(`💾 Cached TMDB lookup for: ${title} (${year}) - TMDB ID: ${movie.id}`);
            }

            return movie;
          }
        );

        if (tmdbMovie) {
          // Check if movie with this TMDB ID already exists
          const { data: existingMovie } = await supabase
            .from('movies')
            .select('*')
            .eq('tmdb_id', tmdbMovie.id)
            .single();

          if (existingMovie) {
            console.log(
              `Movie already exists with TMDB ID ${tmdbMovie.id}: ${existingMovie.title} (${existingMovie.year})`
            );
            res.status(200).json(existingMovie);
            return;
          }

          // Create movie record for database
          const newMovie = {
            tmdb_id: tmdbMovie.id,
            title: title,
            year: year,
            official_title: tmdbMovie.title,
            release_date: tmdbMovie.release_date || null,
            poster_url: tmdbMovie.poster_path
              ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
              : null,
            slug: null, // Will be added by Claude later if needed
            streaming_data: null,
            created_at: new Date().toISOString(),
          };

          // Save to database
          const { data: savedMovie, error: saveError } = await supabase
            .from('movies')
            .insert(newMovie)
            .select()
            .single();

          if (savedMovie && !saveError) {
            console.log(
              `Successfully saved new movie: ${title} (${year}) with TMDB ID: ${tmdbMovie.id}`
            );
            res.status(200).json(savedMovie);
          } else {
            console.error('Error saving movie to database:', saveError);
            res.status(500).json({ error: 'Failed to save movie to database' });
          }
        } else {
          // Not found in TMDB either
          res.status(404).json({ error: 'Movie not found in TMDB' });
        }
      } catch (tmdbError) {
        console.error('TMDB lookup error:', tmdbError);
        res.status(500).json({ error: 'TMDB lookup failed' });
      }
    }
  } catch (error) {
    console.error('Database lookup error:', error);
    res.status(500).json({ error: 'Database lookup failed' });
  }
}
