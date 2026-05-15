// pages/api/tmdb-poster.js
/**
 * TMDB Poster API Route - Direct Implementation
 *
 * Smart caching: Database-first lookup, TMDB fallback, safe validation
 * NO PROXY - Direct implementation to prevent state bleeding
 */

import { Client } from 'pg';
import { isValidPosterUrl } from '../../lib/poster-validation-utils.js';
import { useOnce } from '../../lib/services/tmdb-persist.js';

// Railway PostgreSQL connection
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL required for poster lookup');
  }
  
  return new Client({ connectionString: dbUrl });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { title, year } = req.body;

  if (!title || !year) {
    return res.status(400).json({ error: 'Movie title and year are required' });
  }

  const client = getRailwayClient();

  try {
    await client.connect();
    console.log(`🎬 Poster request: "${title}" (${year})`);

    // Step 1: Database-first lookup (smart caching principle)
    const dbResult = await client.query(
      'SELECT tmdb_id, title, year, poster_url FROM movies WHERE LOWER(title) = LOWER($1) AND year = $2',
      [title, year]
    );

    if (dbResult.rows.length > 0) {
      const movie = dbResult.rows[0];
      
      if (movie.poster_url && movie.poster_url !== '/images/placeholder-poster.jpg') {
        // Validate existing poster before returning
        if (isValidPosterUrl(movie.poster_url, `${movie.title} (${movie.year})`)) {
          console.log(`✅ Database hit: "${movie.title}" (${movie.year})`);
          res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=5184000');
          return res.status(200).json({
            poster: movie.poster_url,
            tmdb_id: movie.tmdb_id,
          });
        } else {
          console.warn(`⚠️ Existing poster failed validation for "${movie.title}" (${movie.year}), fetching new one`);
        }
      }
    }

    // Step 2: TMDB Fallback (if not in database or invalid poster)
    const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!TMDB_API_KEY) {
      console.error('❌ TMDB API key not configured');
      res.setHeader('Cache-Control', 'public, s-maxage=86400');
      return res.status(200).json({
        poster: '/images/placeholder-poster.jpg',
        tmdb_id: null,
      });
    }

    console.log(`🔄 Fetching from TMDB: "${title}" (${year})`);
    
    // Search TMDB by title and year
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      throw new Error(`TMDB search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    const tmdbMovie = searchData.results?.[0];
    
    if (tmdbMovie?.poster_path) {
      const posterUrl = `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`;

      // Step 3: Validate TMDB poster before using
      if (isValidPosterUrl(posterUrl, `${title} (${year})`)) {
        console.log(`📸 TMDB poster validated: "${title}" (${year})`);

        // Save to database (UseOnce Policy)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useOnce(tmdbMovie).catch(err => {
          console.error('Failed to save movie to DB (non-fatal):', err.message);
        });

        res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=5184000');
        return res.status(200).json({
          poster: posterUrl,
          tmdb_id: tmdbMovie.id,
        });
      } else {
        console.warn(`🚫 TMDB poster failed validation for "${title}" (${year}): ${posterUrl}`);
      }
    }

    // Step 4: No valid poster found
    console.log(`⚠️ No valid poster found for "${title}" (${year})`);
    res.setHeader('Cache-Control', 'public, s-maxage=86400');
    return res.status(200).json({
      poster: '/images/placeholder-poster.jpg',
      tmdb_id: tmdbMovie?.id || null,
    });

  } catch (error) {
    console.error('TMDB poster API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch poster',
      poster: '/images/placeholder-poster.jpg',
    });
  } finally {
    await client.end();
  }
}
