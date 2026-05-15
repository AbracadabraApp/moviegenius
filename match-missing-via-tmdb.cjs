const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// TMDB authentication
function getTMDBAuthConfig() {
  const bearerToken = process.env.TMDB_BEARER_TOKEN;
  if (bearerToken && bearerToken.split('.').length === 3) {
    return {
      method: 'bearer',
      token: bearerToken,
      headers: { 'Authorization': `Bearer ${bearerToken}` }
    };
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (apiKey && apiKey !== 'placeholder' && apiKey.length > 10) {
    return {
      method: 'apikey',
      token: apiKey,
      headers: {}
    };
  }

  const publicApiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (publicApiKey && publicApiKey !== 'placeholder' && publicApiKey.length > 10) {
    return {
      method: 'apikey',
      token: publicApiKey,
      headers: {}
    };
  }

  throw new Error('TMDB authentication not configured');
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Search TMDB with simple string query
async function searchTMDB(query) {
  const authConfig = getTMDBAuthConfig();

  let url, headers;
  if (authConfig.method === 'bearer') {
    const searchParams = new URLSearchParams({
      query: query,
      include_adult: 'false',
      language: 'en-US',
    });
    url = `${TMDB_BASE_URL}/search/movie?${searchParams}`;
    headers = { ...authConfig.headers, 'Accept': 'application/json' };
  } else {
    const searchParams = new URLSearchParams({
      api_key: authConfig.token,
      query: query,
      include_adult: 'false',
      language: 'en-US',
    });
    url = `${TMDB_BASE_URL}/search/movie?${searchParams}`;
    headers = { 'Accept': 'application/json' };
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    console.error(`TMDB search failed for "${query}":`, response.status);
    return [];
  }

  const data = await response.json();

  // Return results in TMDB's natural order (relevance-ranked)
  // DO NOT sort by popularity - that breaks relevance
  const results = (data.results || [])
    .filter(movie => movie.title && movie.id);

  return results;
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

// Extract films from the markdown list
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

  console.log(`# TMDB Matching for ${filmEntries.length} Missing Films\n`);

  for (const film of filmEntries) {
    console.log(`\n🔍 Searching: "${film.title}" (${film.year})`);

    // Search TMDB with just the title
    const results = await searchTMDB(film.title);

    if (results.length === 0) {
      console.log(`   ❌ No TMDB results found`);
      stillMissing.push(film);
      continue;
    }

    // Get top match (no year filtering - trust TMDB ranking)
    const topMatch = results[0];
    const matchYear = topMatch.release_date ? parseInt(topMatch.release_date.substring(0, 4)) : null;

    console.log(`   📽️  Top TMDB result: "${topMatch.title}" (${matchYear}) [ID: ${topMatch.id}]`);

    // Check if TMDB ID exists in our database
    const dbMovie = await checkTMDBIdInDB(topMatch.id);

    if (!dbMovie) {
      console.log(`   ❌ TMDB ID ${topMatch.id} NOT in our database`);
      stillMissing.push(film);
      continue;
    }

    // Sanity check: basic title similarity (at least 3 chars in common)
    const searchLower = film.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const resultLower = topMatch.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if search term appears in result or vice versa
    const hasOverlap = searchLower.length >= 3 &&
      (resultLower.includes(searchLower.substring(0, Math.min(5, searchLower.length))) ||
       searchLower.includes(resultLower.substring(0, Math.min(5, resultLower.length))));

    if (!hasOverlap) {
      console.log(`   ⚠️  SANITY CHECK FAILED: "${film.title}" vs "${topMatch.title}" - too different`);
      stillMissing.push(film);
      continue;
    }

    console.log(`   ✅ FOUND in DB: "${dbMovie.title}" (${dbMovie.year})`);

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

    // Rate limit: 50 requests per second for TMDB
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  console.log(`\n\n=== RESULTS ===`);
  console.log(`✅ New matches: ${newMatches.length}`);
  console.log(`❌ Still missing: ${stillMissing.length}`);

  // Write new matches
  if (newMatches.length > 0) {
    const entries = newMatches.map(m => `    ${m.key}`).join('\n');
    fs.writeFileSync('tmdb-matched-films.txt', entries);
    console.log(`\n✅ New matches saved to tmdb-matched-films.txt`);

    // Detailed report
    const report = newMatches.map(m =>
      `${m.genre} > ${m.tier}: "${m.original_title}" (${m.original_year}) → "${m.db_title}" (${m.db_year}) [TMDB: ${m.tmdb_id}]`
    ).join('\n');
    fs.writeFileSync('tmdb-match-details.txt', report);
  }

  // Write still missing
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

    fs.writeFileSync('still-missing-after-tmdb.txt', output);
    console.log(`⚠️  Still missing films saved to still-missing-after-tmdb.txt`);
  }

  await pool.end();
})();
