import { searchTMDB } from './lib/services/tmdb-search.js';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Check if TMDB ID exists in our database
async function checkTMDBIdInDB(tmdbId) {
  const res = await pool.query(
    'SELECT tmdb_id, title, year FROM movies WHERE tmdb_id = $1',
    [tmdbId]
  );
  return res.rows[0] || null;
}

// Parse the unmatched films file
const unmatchedContent = fs.readFileSync('final-unmatched-films.txt', 'utf8');
const filmEntries = [];

const lines = unmatchedContent.split('\n');
let currentGenre = null;

for (const line of lines) {
  const genreMatch = line.match(/^## (.+)$/);
  if (genreMatch) {
    currentGenre = genreMatch[1];
    continue;
  }

  const filmMatch = line.match(/^- (.+): (.+) \((\d{4})\)$/);
  if (filmMatch && currentGenre) {
    filmEntries.push({
      genre: currentGenre,
      tier: filmMatch[1],
      title: filmMatch[2],
      year: parseInt(filmMatch[3])
    });
  }
}

const newMatches = [];
const stillMissing = [];

console.log(`# Using lib/services/tmdb-search.js for ${filmEntries.length} films\n`);

for (const film of filmEntries) {
  console.log(`\n🔍 "${film.title}"`);

  // Use lib/services/tmdb-search.js - simple text string, no year
  const results = await searchTMDB(film.title);

  if (results.length === 0) {
    console.log(`   ❌ No TMDB results`);
    stillMissing.push(film);
    continue;
  }

  // Take top match
  const topMatch = results[0];
  const matchYear = topMatch.release_date ? parseInt(topMatch.release_date.substring(0, 4)) : null;

  console.log(`   📽️  Top: "${topMatch.title}" (${matchYear}) [ID: ${topMatch.id}]`);

  // See if we have tmdbid in db
  const dbMovie = await checkTMDBIdInDB(topMatch.id);

  if (!dbMovie) {
    console.log(`   ❌ TMDB ID ${topMatch.id} NOT in our database`);
    stillMissing.push(film);
    continue;
  }

  // Sanity check: title should have some overlap
  const searchWords = film.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const resultWords = topMatch.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const hasCommonWord = searchWords.some(sw =>
    resultWords.some(rw => rw.includes(sw) || sw.includes(rw))
  );

  if (!hasCommonWord && searchWords.length > 0) {
    console.log(`   ⚠️  Sanity check failed: no common words`);
    stillMissing.push(film);
    continue;
  }

  // Add to list
  console.log(`   ✅ Match: "${dbMovie.title}" (${dbMovie.year})`);
  newMatches.push({
    genre: film.genre,
    tier: film.tier,
    original_title: film.title,
    original_year: film.year,
    db_title: dbMovie.title,
    db_year: dbMovie.year,
    tmdb_id: dbMovie.tmdb_id,
    key: `"${film.genre}|${film.tier}|${film.title}|${film.year}": ${dbMovie.tmdb_id},`
  });

  // Rate limit
  await new Promise(resolve => setTimeout(resolve, 250));
}

console.log(`\n\n=== RESULTS ===`);
console.log(`✅ Matches: ${newMatches.length}`);
console.log(`❌ Still missing: ${stillMissing.length}`);

if (newMatches.length > 0) {
  const entries = newMatches.map(m => `    ${m.key}`).join('\n');
  fs.writeFileSync('lib-tmdb-matches.txt', entries);
  console.log(`\n✅ Saved to lib-tmdb-matches.txt`);
}

await pool.end();
