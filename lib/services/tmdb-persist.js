/**
 * TMDB Catalog Persistence
 *
 * Implements the fetch-once-persist policy: every movie that touches the
 * system via a TMDB ID must have its full data persisted to the movies table.
 *
 * See: docs/strategies/TMDB_CATALOG_POLICY.md
 */

import { getPool } from '../database';

/**
 * Upsert core metadata for a TMDB movie object into the movies table.
 *
 * Safe to call on every TMDB response — idempotent. On conflict (movie already
 * exists) only updates metadata fields; never overwrites slug, streaming_data,
 * or other enrichment columns.
 *
 * @param {object} tmdbMovie - Raw TMDB movie object from any TMDB API response
 * @returns {Promise<{ isNew: boolean }>}
 */
export async function ensureMovieInDb(tmdbMovie) {
  const tmdbId = tmdbMovie.id || tmdbMovie.tmdb_id;
  if (!tmdbId) return { isNew: false };

  const title = tmdbMovie.title;
  if (!title) return { isNew: false };

  const releaseDate = tmdbMovie.release_date || null;
  const year = releaseDate ? parseInt(releaseDate.substring(0, 4)) : null;
  const posterUrl = tmdbMovie.poster_path
    ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
    : (tmdbMovie.poster_url || null);

  const pool = getPool();

  const result = await pool.query(
    `INSERT INTO movies (tmdb_id, title, official_title, year, release_date, poster_url, updated_at)
     VALUES ($1, $2, $2, $3, $4, $5, NOW())
     ON CONFLICT (tmdb_id) DO UPDATE SET
       title = EXCLUDED.title,
       official_title = EXCLUDED.official_title,
       year = EXCLUDED.year,
       release_date = EXCLUDED.release_date,
       poster_url = COALESCE(movies.poster_url, EXCLUDED.poster_url),
       updated_at = NOW()
     RETURNING (xmax = 0) AS inserted`,
    [tmdbId, title, year, releaseDate, posterUrl]
  );

  const isNew = result.rows[0]?.inserted === true;
  return { isNew };
}

/**
 * Phase 2: Trigger background enrichment (async, fire-and-forget)
 * Calls Railway-hosted background jobs for slug, WhyWatch, MoreIdeas
 *
 * @param {number} tmdbId - TMDB movie ID
 * @returns {Promise<void>}
 */
export async function triggerEnrichment(tmdbId) {
  if (!tmdbId) {
    throw new Error('TMDB ID is required for enrichment');
  }

  // Fire-and-forget pattern - don't await these
  // Railway background process will handle them
  const enrichmentJobs = [
    triggerSlugGeneration(tmdbId),
    triggerWhyWatchGeneration(tmdbId),
    triggerMoreIdeasGeneration(tmdbId)
  ];

  // Run in parallel, catch all errors
  Promise.allSettled(enrichmentJobs)
    .then(results => {
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.warn(`Enrichment partial failure for TMDB ${tmdbId}:`,
          failed.map(r => r.reason?.message || 'Unknown error'));
      }
    })
    .catch(err => {
      console.error(`Enrichment trigger failed for TMDB ${tmdbId}:`, err);
    });
}

/**
 * Generate slug using Claude Haiku (30-100 char tagline)
 * @private
 */
async function triggerSlugGeneration(tmdbId) {
  try {
    const response = await fetch(`${getBaseUrl()}/api/generate-slug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId })
    });

    if (!response.ok) {
      throw new Error(`Slug generation failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Slug generation error for TMDB ${tmdbId}:`, error);
    throw error;
  }
}

/**
 * Generate WhyWatch (YES/NO + 3 reasons) using Claude Sonnet
 * @private
 */
async function triggerWhyWatchGeneration(tmdbId) {
  try {
    const response = await fetch(`${getBaseUrl()}/api/generate-why-watch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId })
    });

    if (!response.ok) {
      throw new Error(`WhyWatch generation failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`WhyWatch generation error for TMDB ${tmdbId}:`, error);
    throw error;
  }
}

/**
 * Generate MoreIdeas (15 related TMDB IDs) using Claude Sonnet
 * @private
 */
async function triggerMoreIdeasGeneration(tmdbId) {
  try {
    const response = await fetch(`${getBaseUrl()}/api/generate-more-ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId })
    });

    if (!response.ok) {
      throw new Error(`MoreIdeas generation failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`MoreIdeas generation error for TMDB ${tmdbId}:`, error);
    throw error;
  }
}

/**
 * Get base URL for internal API calls
 * @private
 */
function getBaseUrl() {
  // Railway production URL
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  // Vercel production URL (if used)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Local development
  return 'http://localhost:3000';
}

/**
 * Convenience function: persist + enrich in one call
 * Use this as the standard pattern for new movies
 *
 * @param {Object} tmdbMovie - Raw TMDB movie object
 * @returns {Promise<Object>} Result with isNew flag
 */
export async function useOnce(tmdbMovie) {
  const result = await ensureMovieInDb(tmdbMovie);

  // Trigger enrichment in background only for new movies (don't await)
  if (result.isNew) {
    const tmdbId = tmdbMovie.id || tmdbMovie.tmdb_id;
    triggerEnrichment(tmdbId).catch(err => {
      console.error(`Background enrichment failed for ${tmdbId}:`, err);
    });
  }

  return result;
}
