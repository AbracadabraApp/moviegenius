import fs from 'fs';
import { Pool } from 'pg';

const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const TMDB_API = 'https://api.themoviedb.org/3';
const CALL_SLEEP_MS = 30;
const LEAD_ORDER_MAX = 2;
const MIN_MOVIES = 5;
const DOC_GENRE_ID = 99;

const SELF_MARKERS = ['self', 'himself', 'herself', 'narrator', 'host', 'uncredited', 'archive footage'];

function isLeadingRole(credit) {
  const order = credit.order;
  if (order === null || order === undefined || order > LEAD_ORDER_MAX) {
    return false;
  }

  const character = (credit.character || '').toLowerCase();
  if (SELF_MARKERS.some(marker => character.includes(marker))) {
    return false;
  }

  return true;
}

async function tmdbFetch(path, params = {}) {
  const url = new URL(`${TMDB_API}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
  }

  await new Promise(resolve => setTimeout(resolve, CALL_SLEEP_MS));
  return response.json();
}

async function buildFilmography(personId, personType) {
  const data = await tmdbFetch(`/person/${personId}/movie_credits`);

  const seenMovies = new Set();
  const movies = [];

  if (personType === 'directors') {
    const crew = data.crew || [];
    for (const credit of crew) {
      if (credit.job !== 'Director') continue;

      const tmdbId = credit.id;
      if (!tmdbId || seenMovies.has(tmdbId)) continue;
      if ((credit.genre_ids || []).includes(DOC_GENRE_ID)) continue;

      seenMovies.add(tmdbId);
      movies.push(tmdbId);
    }
  } else {
    const cast = data.cast || [];
    for (const credit of cast) {
      if (!isLeadingRole(credit)) continue;

      const tmdbId = credit.id;
      if (!tmdbId || seenMovies.has(tmdbId)) continue;
      if ((credit.genre_ids || []).includes(DOC_GENRE_ID)) continue;

      seenMovies.add(tmdbId);
      movies.push(tmdbId);
    }
  }

  return movies;
}

// PHASE 1: Fetch all TMDB filmographies
async function fetchAllFilmographies(personsData) {
  console.log('=== PHASE 1: Fetching TMDB Filmographies ===\n');

  const personFilms = [];
  const allTmdbIds = new Set();

  for (const [personType, persons] of Object.entries(personsData)) {
    console.log(`\n📋 Fetching ${personType}...`);
    const subcategory = personType.charAt(0).toUpperCase() + personType.slice(1);

    for (const person of persons) {
      const { name, tmdbId } = person;
      console.log(`  🔍 ${name} (TMDB ID: ${tmdbId})`);

      try {
        const tmdbMovieIds = await buildFilmography(tmdbId, personType);
        console.log(`     Found ${tmdbMovieIds.length} films`);

        if (tmdbMovieIds.length > 0) {
          personFilms.push({
            name,
            tmdbId,
            personType,
            subcategory,
            tmdbMovieIds
          });

          // Collect all TMDB IDs for bulk query
          tmdbMovieIds.forEach(id => allTmdbIds.add(id));
        } else {
          console.log(`     ⚠️  No films found`);
        }
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
      }
    }
  }

  console.log(`\n✅ Phase 1 complete: ${personFilms.length} persons with filmographies`);
  console.log(`   Total unique TMDB IDs: ${allTmdbIds.size}\n`);

  return { personFilms, allTmdbIds: Array.from(allTmdbIds) };
}

// PHASE 2: Fetch ALL movie data from database at once
async function fetchAllMovieData(allTmdbIds, pool) {
  console.log('=== PHASE 2: Fetching All Movie Data from Database ===\n');

  console.log(`Querying database for ${allTmdbIds.length} TMDB IDs...`);

  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, tmdb_id FROM movies WHERE tmdb_id = ANY($1)',
      [allTmdbIds]
    );

    console.log(`✅ Found ${result.rows.length} movies in database\n`);

    // Create lookup map: tmdbId -> movie.id
    const tmdbIdToMovieId = new Map();
    result.rows.forEach(row => {
      tmdbIdToMovieId.set(row.tmdb_id, row.id);
    });

    return tmdbIdToMovieId;

  } finally {
    client.release();
  }
}

// PHASE 3: Create browse lists (fast, all data is in memory)
async function createBrowseLists(personFilms, tmdbIdToMovieId, pool) {
  console.log('=== PHASE 3: Creating Browse Lists ===\n');

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const person of personFilms) {
    console.log(`  🔍 ${person.name}`);

    // Match TMDB IDs to database movie IDs (in-memory)
    const matchedMovieIds = [];
    for (const tmdbId of person.tmdbMovieIds) {
      const movieId = tmdbIdToMovieId.get(tmdbId);
      if (movieId) {
        matchedMovieIds.push(movieId);
      }
    }

    console.log(`     Matched ${matchedMovieIds.length}/${person.tmdbMovieIds.length} movies in database`);

    if (matchedMovieIds.length < MIN_MOVIES) {
      console.log(`     ⚠️  Only ${matchedMovieIds.length} movies (minimum ${MIN_MOVIES}) - skipping`);
      totalSkipped++;
      continue;
    }

    try {
      // Quick database insert
      const client = await pool.connect();
      try {
        // Insert browse list using actual schema
        const listResult = await client.query(
          `INSERT INTO browse_lists (
            title,
            categories,
            total_movies,
            status,
            created_at,
            updated_at,
            editorial_data
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW(), $5)
          RETURNING id`,
          [
            person.name,
            ['People'],
            matchedMovieIds.length,
            'active',
            JSON.stringify({
              subcategories: [{
                name: person.subcategory,
                description: `Films featuring ${person.name}`,
                movies: []  // Will be populated via list_movies table
              }]
            })
          ]
        );

        const listId = listResult.rows[0].id;

        // Batch insert list_movies
        const values = matchedMovieIds.map((_, idx) =>
          `($${idx * 2 + 1}, $${idx * 2 + 2})`
        ).join(',');
        const params = matchedMovieIds.flatMap(movieId => [listId, movieId]);

        await client.query(
          `INSERT INTO list_movies (list_id, movie_id)
           VALUES ${values}
           ON CONFLICT DO NOTHING`,
          params
        );

        console.log(`     ✅ Created browse list (${matchedMovieIds.length} movies)`);
        totalCreated++;

      } finally {
        client.release();
      }

    } catch (error) {
      console.log(`     ❌ Error: ${error.message}`);
      totalSkipped++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Browse lists created: ${totalCreated}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`\n✅ Done`);
}

// Main
async function createPersonBrowseLists() {
  const personsData = JSON.parse(fs.readFileSync('persons-list-with-ids.json', 'utf-8'));

  // Phase 1: Fetch TMDB data (no database)
  const { personFilms, allTmdbIds } = await fetchAllFilmographies(personsData);

  // Phase 2 & 3: Database operations
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
  });

  try {
    // Phase 2: Fetch ALL movie data once
    const tmdbIdToMovieId = await fetchAllMovieData(allTmdbIds, pool);

    // Phase 3: Create browse lists (fast, all data in memory)
    await createBrowseLists(personFilms, tmdbIdToMovieId, pool);

  } finally {
    await pool.end();
  }
}

createPersonBrowseLists().catch(console.error);
