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
