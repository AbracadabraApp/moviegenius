const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Raw TMDB search - NO popularity sorting
async function searchTMDB(query) {
  const url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US`;

  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  // Return results in TMDB's natural relevance order - DO NOT SORT
  return (data.results || []).filter(movie => movie.title && movie.id);
}

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

(async () => {
  const newMatches = [];
  const stillMissing = [];

  console.log(`# Raw TMDB API matching for ${filmEntries.length} films\n`);

  for (const film of filmEntries) {
    console.log(`\n🔍 "${film.title}" (${film.year})`);

    // Search TMDB - simple text string, no year
    const results = await searchTMDB(film.title);

    if (results.length === 0) {
      console.log(`   ❌ No TMDB results`);
      stillMissing.push(film);
      continue;
    }

    // Take top match (TMDB's relevance-ranked first result)
    const topMatch = results[0];
    const matchYear = topMatch.release_date ? parseInt(topMatch.release_date.substring(0, 4)) : null;

    console.log(`   📽️  Top: "${topMatch.title}" (${matchYear}) [ID: ${topMatch.id}]`);

    // See if we have tmdbid in db
    const dbMovie = await checkTMDBIdInDB(topMatch.id);

    if (!dbMovie) {
      console.log(`   ❌ TMDB ID ${topMatch.id} NOT in database`);
      stillMissing.push(film);
      continue;
    }

    // Sanity check: basic title overlap
    const searchLower = film.title.toLowerCase();
    const resultLower = topMatch.title.toLowerCase();

    // Check if they share at least 3 characters in sequence
    let hasOverlap = false;
    for (let i = 0; i <= searchLower.length - 3; i++) {
      const substring = searchLower.substring(i, i + 3);
      if (resultLower.includes(substring)) {
        hasOverlap = true;
        break;
      }
    }

    if (!hasOverlap && searchLower.length >= 3) {
      console.log(`   ⚠️  Sanity check failed: "${film.title}" vs "${topMatch.title}"`);
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
    fs.writeFileSync('raw-tmdb-matches.txt', entries);
    console.log(`\n✅ Saved to raw-tmdb-matches.txt`);

    // Detail report
    const report = newMatches.map(m =>
      `${m.genre} > ${m.tier}: "${m.original_title}" (${m.original_year}) → "${m.db_title}" (${m.db_year}) [TMDB: ${m.tmdb_id}]`
    ).join('\n');
    fs.writeFileSync('raw-tmdb-match-details.txt', report);
  }

  if (stillMissing.length > 0) {
    const byGenre = {};
    stillMissing.forEach(f => {
      if (!byGenre[f.genre]) byGenre[f.genre] = [];
      byGenre[f.genre].push(f);
    });

    let output = `# Films Still Not Found (${stillMissing.length} total)\n\n`;
    for (const [genre, films] of Object.entries(byGenre)) {
      output += `## ${genre}\n\n`;
      films.forEach(f => {
        output += `- ${f.tier}: ${f.title} (${f.year})\n`;
      });
      output += '\n';
    }

    fs.writeFileSync('final-still-missing.txt', output);
    console.log(`⚠️  Still missing saved to final-still-missing.txt`);
  }

  await pool.end();
})();
