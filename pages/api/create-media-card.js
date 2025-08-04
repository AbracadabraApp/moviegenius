// pages/api/create-media-card.js
/**
 * Create MediaCard API
 *
 * Universal function for creating MediaCards from any source:
 * - User searches
 * - Claude analysis mentions
 * - List browsing
 * - Recommendations
 *
 * Process:
 * 1. Check if movie exists in database
 * 2. If not, fetch from TMDB
 * 3. Generate Claude slug for new movies
 * 4. Save to database
 * 5. Return MediaCard data
 */

import { createClient } from '@supabase/supabase-js';
import { getCache } from '../../lib/cache.js';
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { title, year, tmdb_id } = req.body;

  // Validate input - need either title/year OR tmdb_id
  if (!tmdb_id && (!title || !year)) {
    return res.status(400).json({
      error: 'Either tmdb_id OR title+year is required',
    });
  }

  try {
    // Creating MediaCard

    // Step 1: Check if movie already exists with COMPLETE data (not placeholder)
    let existingMovie = null;

    if (tmdb_id) {
      const { data } = await supabase.from('movies').select('*').eq('tmdb_id', tmdb_id).single();
      existingMovie = data;
    } else {
      const { data } = await supabase
        .from('movies')
        .select('*')
        .eq('title', title)
        .eq('year', year)
        .single();
      existingMovie = data;
    }

    // Check if existing movie has complete data (not placeholder)
    const isCompleteMovie =
      existingMovie &&
      existingMovie.title !== 'TMDB_FETCH_REQUIRED' &&
      !existingMovie.slug?.startsWith('tmdb-') &&
      existingMovie.slug?.length > 5;

    if (isCompleteMovie) {
      // Complete movie already exists
      return res.status(200).json({
        success: true,
        movie: existingMovie,
        source: 'existing',
      });
    }

    if (existingMovie && !isCompleteMovie) {
      // Found placeholder movie, will update with TMDB data
    }

    // Movie not found, creating new MediaCard

    // Step 2: Fetch movie data from TMDB
    let tmdbMovie;
    const cache = getCache();

    if (tmdb_id) {
      // Fetch by TMDB ID with caching
      tmdbMovie = await cache.cacheTMDBResponse('movie_details', { tmdb_id }, async () => {
        // Cache miss - fetching TMDB movie details

        const tmdbResponse = await fetch(
          `https://api.themoviedb.org/3/movie/${tmdb_id}?api_key=${process.env.TMDB_API_KEY}`
        );

        if (!tmdbResponse.ok) {
          throw new Error(`TMDB API failed: ${tmdbResponse.status}`);
        }

        const movie = await tmdbResponse.json();
        // Cached TMDB movie details

        return movie;
      });
    } else {
      // Search by title and year with caching
      const searchResults = await cache.cacheTMDBResponse(
        'search_movie',
        { title, year },
        async () => {
          // Cache miss - searching TMDB

          const tmdbResponse = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`
          );

          if (!tmdbResponse.ok) {
            throw new Error(`TMDB search failed: ${tmdbResponse.status}`);
          }

          const data = await tmdbResponse.json();
          // Cached TMDB search results

          return data;
        }
      );

      tmdbMovie = searchResults.results?.[0];

      if (!tmdbMovie) {
        return res.status(404).json({ error: 'Movie not found in TMDB' });
      }
    }

    // Extract data from TMDB
    const movieYear = tmdbMovie.release_date
      ? new Date(tmdbMovie.release_date).getFullYear()
      : year;

    // Step 3: Generate Claude slug for new MediaCard
    // Generating Claude slug

    const slugPrompt = `For the movie "${tmdbMovie.title}" (${movieYear}), provide a punchy marketing tagline under 50 characters. Think movie poster tagline - short, memorable, exciting. Examples: "Terror has a new name", "Love conquers all", "Justice is coming". Just return the tagline, nothing else.`;

    const message = await Promise.race([
      anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
        messages: [{ role: 'user', content: slugPrompt }],
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Claude slug timeout')), 10000)),
    ]);

    let claudeSlug = message.content[0].text.trim();

    // Remove quotes if Claude added them
    if (claudeSlug.startsWith('"') && claudeSlug.endsWith('"')) {
      claudeSlug = claudeSlug.slice(1, -1);
    }

    // Step 4: Save new movie to database (only use existing columns)
    const newMovie = {
      tmdb_id: tmdbMovie.id,
      title: tmdbMovie.title,
      year: movieYear,
      official_title: tmdbMovie.title,
      release_date: tmdbMovie.release_date || null,
      poster_url: tmdbMovie.poster_path
        ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
        : null,
      slug: claudeSlug,
      streaming_data: null, // Will be populated later if needed
      created_at: new Date().toISOString(),
    };

    const { data: savedMovie, error: saveError } = await supabase
      .from('movies')
      .insert(newMovie)
      .select()
      .single();

    if (saveError) {
      throw new Error(`Database save failed: ${saveError.message}`);
    }

    // Created new MediaCard

    // Cache for 1 hour since this is fresh data
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');

    res.status(201).json({
      success: true,
      movie: savedMovie,
      source: 'created',
    });
  } catch (error) {
    console.error('❌ MediaCard creation failed:', error);
    res.status(500).json({
      error: 'Failed to create MediaCard',
      details: error.message,
    });
  }
}
