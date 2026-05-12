#!/usr/bin/env node
/**
 * batch-add-missing-films.js
 *
 * Add truly missing films from TMDB to catalog
 * - Reads output/truly-missing-films.csv
 * - Searches TMDB /search/multi for each film
 * - Filters out TV shows (saves to tv_shows table)
 * - Saves movies to catalog with all fields
 *
 * Usage:
 *   node --env-file=.env.local scripts/batch-add-missing-films.js
 *   node --env-file=.env.local scripts/batch-add-missing-films.js --limit 50
 */

import pg from 'pg';
import fs from 'fs/promises';
import { ensureMovieInDb } from '../lib/services/tmdb-persist.js';

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL required');
  process.exit(1);
}

const bearerToken = process.env.TMDB_BEARER_TOKEN;
const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;

if (!bearerToken && !apiKey) {
  console.error('❌ TMDB authentication required: TMDB_BEARER_TOKEN or TMDB_API_KEY');
  process.exit(1);
}

const useBearerAuth = bearerToken && bearerToken.split('.').length === 3;
console.log(`Using ${useBearerAuth ? 'Bearer token' : 'API key'} authentication`);
console.log('');

const pool = new Pool({ connectionString: dbUrl });
const limit = process.argv.includes('--limit')
  ? parseInt(process.argv[process.argv.indexOf('--limit') + 1])
  : null;

/**
 * Search TMDB and filter by media type
 */
async function searchTMDB(title, year) {
  let tmdbUrl;
  let headers = { 'Accept': 'application/json' };

  if (useBearerAuth) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
    tmdbUrl = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}`;
  } else {
    tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(title)}`;
  }

  const response = await fetch(tmdbUrl, { headers });

  if (!response.ok) {
    throw new Error(`TMDB returned ${response.status}`);
  }

  const data = await response.json();
  const results = data.results || [];

  // Separate by media type
  const movies = results
    .filter(item => item.media_type === 'movie')
    .map(m => ({
      media_type: 'movie',
      tmdb_id: m.id,
      title: m.title,
      release_date: m.release_date,
      year: m.release_date ? parseInt(m.release_date.split('-')[0]) : null,
      poster_path: m.poster_path,
      popularity: m.popularity || 0
    }));

  const tvShows = results
    .filter(item => item.media_type === 'tv')
    .map(tv => ({
      media_type: 'tv',
      tmdb_id: tv.id,
      name: tv.name,
      original_name: tv.original_name,
      first_air_date: tv.first_air_date,
      year: tv.first_air_date ? parseInt(tv.first_air_date.split('-')[0]) : null
    }));

  return { movies, tvShows };
}

/**
 * Find best match with year tolerance
 */
function findBestMatch(movies, searchTitle, searchYear) {
  if (movies.length === 0) return null;

  // Try exact year first
  let exactYear = movies.find(m => m.year === searchYear);
  if (exactYear) return exactYear;

  // Try ±1 year
  let fuzzy1 = movies.find(m => Math.abs(m.year - searchYear) === 1);
  if (fuzzy1) return fuzzy1;

  // Try ±2 years
  let fuzzy2 = movies.find(m => Math.abs(m.year - searchYear) <= 2);
  if (fuzzy2) return fuzzy2;

  // Return most popular if no year match
  return movies.sort((a, b) => b.popularity - a.popularity)[0];
}

/**
 * Save TV show to tv_shows table
 */
async function saveTVShow(client, tvShow) {
  await client.query(
    `INSERT INTO tv_shows (tmdb_id, title, original_name, first_air_date)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tmdb_id) DO NOTHING`,
    [tvShow.tmdb_id, tvShow.name, tvShow.original_name, tvShow.first_air_date || null]
  );
}

/**
 * Main batch add process
 */
async function batchAdd() {
  const client = await pool.connect();

  try {
    console.log('=== BATCH ADD: Truly Missing Films ===');
    console.log('');

    // Read CSV
    const csvPath = './output/truly-missing-films.csv';
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Skip header

    const missingFilms = lines
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/"([^"]+)",(\d{4}),(\d+)/);
        if (!match) return null;
        return {
          title: match[1],
          year: parseInt(match[2]),
          recs: parseInt(match[3])
        };
      })
      .filter(Boolean);

    const totalToProcess = limit ? Math.min(limit, missingFilms.length) : missingFilms.length;
    const filmsToProcess = missingFilms.slice(0, totalToProcess);

    console.log(`Processing ${totalToProcess.toLocaleString()} films from CSV`);
    if (limit) {
      console.log(`(Limited to first ${limit})`);
    }
    console.log('');

    let moviesAdded = 0;
    let tvShowsFound = 0;
    let notFound = 0;
    let errors = 0;

    for (let i = 0; i < filmsToProcess.length; i++) {
      const film = filmsToProcess[i];
      const progress = `[${i + 1}/${totalToProcess}]`;

      try {
        // Search TMDB
        const { movies, tvShows } = await searchTMDB(film.title, film.year);

        // Handle TV shows
        if (tvShows.length > 0) {
          for (const tv of tvShows) {
            await saveTVShow(client, tv);
            tvShowsFound++;
          }
          if (i < 20 || tvShows.length > 0) {
            console.log(`${progress} 📺 "${film.title}" → Found ${tvShows.length} TV show(s): ${tvShows.map(tv => `"${tv.name}" (${tv.year})`).join(', ')}`);
          }
        }

        // Handle movies
        if (movies.length > 0) {
          const bestMatch = findBestMatch(movies, film.title, film.year);

          if (bestMatch) {
            // Save to catalog using ensureMovieInDb
            const result = await ensureMovieInDb({
              id: bestMatch.tmdb_id,
              title: bestMatch.title,
              release_date: bestMatch.release_date,
              poster_path: bestMatch.poster_path
            });

            if (result.isNew) {
              moviesAdded++;
              if (i < 20 || moviesAdded <= 50) {
                console.log(`${progress} ✅ "${film.title}" (${film.year}) → Added "${bestMatch.title}" (${bestMatch.year}) [TMDB ${bestMatch.tmdb_id}]`);
              }
            } else {
              if (i < 20) {
                console.log(`${progress} ⚠️  "${film.title}" → Already existed as "${bestMatch.title}"`);
              }
            }
          }
        }

        // Not found in either
        if (movies.length === 0 && tvShows.length === 0) {
          notFound++;
          if (i < 20 || notFound <= 20) {
            console.log(`${progress} ❌ "${film.title}" (${film.year}) → NOT FOUND [${film.recs} recs]`);
          }
        }

        // Progress updates every 100
        if ((i + 1) % 100 === 0) {
          console.log(`Progress: ${i + 1}/${totalToProcess} | Added: ${moviesAdded} movies, ${tvShowsFound} TV shows | Not found: ${notFound}`);
        }

        // Rate limiting: 50 requests per second max
        if (i < filmsToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 25));
        }

      } catch (error) {
        errors++;
        console.error(`${progress} ERROR: "${film.title}" → ${error.message}`);

        // Back off on errors
        if (errors > 5) {
          console.error('Too many errors, stopping...');
          break;
        }
      }
    }

    console.log('');
    console.log('=== RESULTS ===');
    console.log('');
    console.log(`Processed: ${totalToProcess.toLocaleString()} films`);
    console.log(`✅ Movies added: ${moviesAdded.toLocaleString()}`);
    console.log(`📺 TV shows found: ${tvShowsFound.toLocaleString()}`);
    console.log(`❌ Not found: ${notFound.toLocaleString()}`);
    console.log(`⚠️  Errors: ${errors.toLocaleString()}`);
    console.log('');

    if (moviesAdded > 0) {
      console.log('📊 Next: Run coverage measurement to see updated numbers');
      console.log('   node --env-file=.env.local scripts/measure-catalog-coverage.js');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

batchAdd().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
