// pages/api/cache-movie-data.js
// Cache enhanced movie data to Railway PostgreSQL directly (zero Supabase dependencies)
import { getPool, MovieService } from '../../lib/railway-db.js';
import { isValidPosterUrl } from '../../lib/poster-validation-utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, year, slug, poster, streaming } = req.body;

  if (!title || !year) {
    return res.status(400).json({ error: 'Title and year are required' });
  }

  try {
    // Find existing movie using Railway PostgreSQL directly
    const existingMovie = await MovieService.getMovie(title, year);

    // No error handling needed - MovieService.getMovie returns null if not found

    let result;
    let updated = false;

    if (existingMovie) {
      // Update existing movie with enhanced data
      const updates = {};

      // Only update fields that were provided and are different/missing
      // 🛡️ ULTIMATE PROTECTION: Don't overwrite good Claude slugs with bad ones
      const existingSlugIsGood =
        existingMovie.slug && existingMovie.slug.length > 30 && !existingMovie.slug.includes('-');
      const newSlugIsBetter = slug && slug.length > 30 && !slug.includes('-');

      // 🚨 STRICT FILTER: Block obvious URL-format slugs
      const isUrlFormatSlug =
        slug &&
        slug.includes('-') &&
        slug.length < 40 &&
        (slug.match(/^[a-z0-9-]+-(19|20)\d{2}$/) ||
          slug.toLowerCase() ===
            title
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '-')
              .replace(/^the-|^a-|^an-/, ''));

      if (isUrlFormatSlug) {
        console.warn(`🚫 BLOCKED URL-format slug for ${title} (${year}): "${slug}"`);
        // Don't update with corrupted slug
      } else if (slug && (!existingMovie.slug || (newSlugIsBetter && !existingSlugIsGood))) {
        updates.slug = slug;
        updated = true;
      }

      // 🛡️ POSTER CORRUPTION PREVENTION
      if (
        poster &&
        poster !== '/images/placeholder-poster.jpg' &&
        (!existingMovie.poster_url || poster !== existingMovie.poster_url)
      ) {
        // Validate poster URL before updating
        if (isValidPosterUrl(poster, `${title} (${year})`)) {
          updates.poster_url = poster;
          updated = true;
        } else {
          console.warn(`🚫 Cache API: Blocked invalid poster for "${title}" (${year}): ${poster}`);
          // Don't update poster_url, keep existing one
        }
      }

      if (
        streaming &&
        (!existingMovie.streaming_data || streaming !== existingMovie.streaming_data)
      ) {
        updates.streaming_data = streaming;
        updated = true;
      }

      if (updated) {
        // Use Railway PostgreSQL directly for updates
        const pool = getPool();
        const client = await pool.connect();
        
        try {
          // Build update query dynamically
          const updateFields = Object.keys(updates);
          const setClause = updateFields.map((key, i) => `${key} = $${i + 1}`).join(', ');
          const values = [...Object.values(updates), existingMovie.id];
          
          const query = `
            UPDATE movies 
            SET ${setClause}, updated_at = NOW()
            WHERE id = $${values.length}
            RETURNING *
          `;
          
          const updateResult = await client.query(query, values);
          result = updateResult.rows[0];
          console.log(`✅ Updated Railway record for: ${title} (${year})`);
          
        } finally {
          client.release();
        }
      } else {
        result = existingMovie;
        console.log(`No updates needed for: ${title} (${year})`);
      }
    } else {
      // Movie not found in DB — look up via TMDB before inserting
      const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
      let tmdbId = null;
      let tmdbPoster = null;

      if (tmdbKey) {
        try {
          const r = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(title)}`
          );
          const d = await r.json();
          const results = (d.results || []).filter(m => m.id && m.release_date);
          if (results.length) {
            results.sort((a, b) =>
              Math.abs(parseInt(a.release_date) - year) - Math.abs(parseInt(b.release_date) - year)
            );
            tmdbId = results[0].id;
            if (results[0].poster_path) {
              tmdbPoster = `https://image.tmdb.org/t/p/w500${results[0].poster_path}`;
            }
          }
        } catch (e) { console.warn('TMDB lookup failed:', e.message); }
      }

      if (!tmdbId) {
        console.warn(`⚠️ Cache API: No TMDB match for "${title}" (${year}) — skipping insert`);
        return res.status(200).json({
          success: true,
          cached: false,
          updated: { slug: false, poster: false, streaming: false },
          movie: null,
        });
      }

      // Check if this tmdb_id already exists (race condition / case mismatch)
      const pool = getPool();
      const client = await pool.connect();
      try {
        const existing = await client.query('SELECT * FROM movies WHERE tmdb_id = $1', [tmdbId]);
        if (existing.rows.length > 0) {
          // Already exists under different title casing — just update it
          result = existing.rows[0];
          console.log(`✅ Found existing record via TMDB ID for: ${title} (${year})`);
        } else {
          let validatedPoster = tmdbPoster;
          if (poster && poster !== '/images/placeholder-poster.jpg' && isValidPosterUrl(poster, `${title} (${year})`)) {
            validatedPoster = poster;
          }

          const insertResult = await client.query(
            `INSERT INTO movies (tmdb_id, title, year, slug, poster_url, streaming_data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             ON CONFLICT (tmdb_id) DO UPDATE SET updated_at = NOW()
             RETURNING *`,
            [tmdbId, title, year, slug || null, validatedPoster, streaming ? JSON.stringify(streaming) : null]
          );
          result = insertResult.rows[0];
          updated = true;
          console.log(`✅ Created new Railway record for: ${title} (${year}) tmdb_id=${tmdbId}`);
        }
      } finally {
        client.release();
      }
    }

    // Return response in format MediaCard expects
    res.status(200).json({
      success: true,
      cached: updated,
      updated: {
        slug: !!slug,
        poster: !!poster,
        streaming: !!streaming,
      },
      movie: {
        title: result.title,
        year: result.year,
        slug: result.slug,
        poster: result.poster_url, // Map database field to MediaCard format
        streaming: result.streaming_data, // Map database field to MediaCard format
        id: result.id,
        dataSource: 'railway',
      },
    });
  } catch (error) {
    console.error('❌ Railway cache error:', error);

    res.status(500).json({
      error: 'Failed to cache movie data to Railway PostgreSQL',
      details: error.message,
    });
  }
}
