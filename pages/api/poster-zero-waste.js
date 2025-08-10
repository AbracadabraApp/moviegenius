// pages/api/poster-zero-waste.js
/**
 * Zero Waste Poster API
 * 
 * ALWAYS checks database first, only fetches from TMDB if not found.
 * Once fetched, stores in database to prevent future API calls.
 */

import { Client } from 'pg';
import { isValidPosterUrl } from '../../lib/poster-validation-utils.js';

// Railway PostgreSQL connection
function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL required for zero waste poster lookup');
  }
  
  return new Client({ connectionString: dbUrl });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { title, year, tmdb_id } = req.body;

  if ((!title || !year) && !tmdb_id) {
    return res.status(400).json({ 
      error: 'Either (title + year) or tmdb_id required' 
    });
  }

  const client = getRailwayClient();

  try {
    await client.connect();

    // Step 1: Check database first (ZERO WASTE)
    let movie = null;
    
    if (tmdb_id) {
      // Look up by TMDB ID (most precise)
      const result = await client.query(
        'SELECT tmdb_id, title, year, poster_url FROM movies WHERE tmdb_id = $1',
        [tmdb_id]
      );
      movie = result.rows[0];
    } else {
      // Look up by title and year
      const result = await client.query(
        'SELECT tmdb_id, title, year, poster_url FROM movies WHERE LOWER(title) = LOWER($1) AND year = $2',
        [title, year]
      );
      movie = result.rows[0];
    }

    // Step 2: If found in database with valid poster, return immediately
    if (movie && movie.poster_url && isValidPosterUrl(movie.poster_url, `${movie.title} (${movie.year})`)) {
      console.log(`✅ Zero waste: Found poster in database for "${movie.title}" (${movie.year})`);
      
      // Cache for 30 days since we have the data
      res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=5184000');
      return res.status(200).json({
        poster: movie.poster_url,
        tmdb_id: movie.tmdb_id,
        source: 'database',
        title: movie.title,
        year: movie.year
      });
    }

    // Step 3: Not in database or invalid poster - fetch from TMDB
    const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
    if (!TMDB_API_KEY) {
      return res.status(500).json({ error: 'TMDB API key not configured' });
    }

    console.log(`🔄 Fetching from TMDB for "${title || movie?.title}" (${year || movie?.year})`);

    let tmdbMovie = null;
    
    if (movie && movie.tmdb_id) {
      // Use existing TMDB ID for precise lookup
      const tmdbResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${TMDB_API_KEY}`
      );
      if (tmdbResponse.ok) {
        tmdbMovie = await tmdbResponse.json();
      }
    } else {
      // Search by title and year
      const searchTitle = title || movie?.title;
      const searchYear = year || movie?.year;
      
      const tmdbResponse = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTitle)}&year=${searchYear}`
      );
      
      if (tmdbResponse.ok) {
        const searchResults = await tmdbResponse.json();
        tmdbMovie = searchResults.results?.[0];
      }
    }

    // Step 4: Process TMDB result
    if (tmdbMovie?.poster_path) {
      const posterUrl = `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`;
      
      // Validate poster URL
      if (isValidPosterUrl(posterUrl, `${tmdbMovie.title} (${new Date(tmdbMovie.release_date).getFullYear()})`)) {
        console.log(`📸 Valid poster fetched from TMDB: ${posterUrl}`);
        
        // Step 5: Store in database for zero waste (update or insert)
        if (movie) {
          // Update existing movie
          await client.query(
            'UPDATE movies SET poster_url = $1, updated_at = NOW() WHERE tmdb_id = $2',
            [posterUrl, movie.tmdb_id]
          );
          console.log(`💾 Updated poster in database for "${movie.title}"`);
        } else {
          // Insert new movie record
          await client.query(`
            INSERT INTO movies (tmdb_id, title, year, poster_url, official_title, release_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (tmdb_id) DO UPDATE SET
              poster_url = EXCLUDED.poster_url,
              updated_at = NOW()
          `, [
            tmdbMovie.id,
            tmdbMovie.title,
            new Date(tmdbMovie.release_date).getFullYear(),
            posterUrl,
            tmdbMovie.title,
            tmdbMovie.release_date
          ]);
          console.log(`💾 Stored new movie in database: "${tmdbMovie.title}"`);
        }
        
        // Cache for 30 days
        res.setHeader('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=5184000');
        return res.status(200).json({
          poster: posterUrl,
          tmdb_id: tmdbMovie.id,
          source: 'tmdb_fetched_and_stored',
          title: tmdbMovie.title,
          year: new Date(tmdbMovie.release_date).getFullYear()
        });
      } else {
        console.warn(`🚫 Invalid poster URL blocked: ${posterUrl}`);
      }
    }

    // Step 6: No valid poster found
    console.log(`⚠️ No valid poster found for "${title || movie?.title}" (${year || movie?.year})`);
    
    // Cache "not found" for 24 hours
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');
    return res.status(200).json({
      poster: '/images/placeholder-poster.jpg',
      tmdb_id: movie?.tmdb_id || tmdbMovie?.id || null,
      source: 'placeholder',
      title: title || movie?.title || tmdbMovie?.title,
      year: year || movie?.year || (tmdbMovie?.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null)
    });

  } catch (error) {
    console.error('Zero waste poster API error:', error);
    return res.status(500).json({
      error: 'Failed to fetch poster',
      poster: '/images/placeholder-poster.jpg'
    });
  } finally {
    await client.end();
  }
}