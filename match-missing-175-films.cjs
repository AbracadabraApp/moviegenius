const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Import normalize logic from search-matching.js
function normalizeTitle(title) {
  if (!title) return '';

  return title
    .toLowerCase()
    .trim()
    // Remove leading articles
    .replace(/^(the|a|an)\s+/i, '')
    // Remove punctuation and special characters
    .replace(/[:\-–—,\.!?'"""'']/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove parenthetical info for initial matching
    .replace(/\([^)]*\)/g, '')
    // Remove diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Read both files
const swiftFile = fs.readFileSync('ios/moviegenius/moviegenius/Views/GeniusView.swift', 'utf8');
const lookupFile = fs.readFileSync('ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift', 'utf8');

const genres = [
  'Action', 'Adventure', 'Comedy', 'Crime', 'Documentary', 'Drama',
  'Espionage', 'Fantasy', 'History', 'Horror', 'Mystery', 'Noir',
  'Romance', 'Science Fiction', 'Thriller', 'War', 'Western'
];

const tiers = [
  'Essential', 'Foundational', 'Classics', 'Well-Versed', 'Devotee',
  'Connoisseur', 'Deep Cuts', 'Specialist', 'Archivist', 'Master'
];

// Multi-stage search function
async function searchMovie(title, year) {
  const normalized = normalizeTitle(title);

  // Strategy 1: Exact match
  let res = await pool.query(
    'SELECT tmdb_id, title as db_title, year as db_year FROM movies WHERE title = $1 AND year = $2',
    [title, year]
  );
  if (res.rows.length > 0) {
    return { ...res.rows[0], strategy: 'exact' };
  }

  // Strategy 2: Year ±2 tolerance
  res = await pool.query(
    'SELECT tmdb_id, title as db_title, year as db_year FROM movies WHERE title = $1 AND year BETWEEN $2 AND $3 ORDER BY ABS(year - $4) ASC LIMIT 1',
    [title, year - 2, year + 2, year]
  );
  if (res.rows.length > 0) {
    return { ...res.rows[0], strategy: 'year_fuzzy' };
  }

  // Strategy 3: Normalized title match with year ±2
  res = await pool.query(`
    SELECT tmdb_id, title as db_title, year as db_year
    FROM movies
    WHERE LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '^(the|a|an)\\s+', '', 'i'), '[^a-z0-9\\s]', '', 'g')) = $1
      AND year BETWEEN $2 AND $3
    ORDER BY ABS(year - $4) ASC
    LIMIT 1
  `, [normalized, year - 2, year + 2, year]);
  if (res.rows.length > 0) {
    return { ...res.rows[0], strategy: 'normalized' };
  }

  // Strategy 4: Contains match with year ±2
  res = await pool.query(`
    SELECT tmdb_id, title as db_title, year as db_year
    FROM movies
    WHERE LOWER(title) LIKE '%' || LOWER($1) || '%'
      AND year BETWEEN $2 AND $3
    ORDER BY ABS(year - $4) ASC
    LIMIT 1
  `, [title, year - 2, year + 2, year]);
  if (res.rows.length > 0) {
    return { ...res.rows[0], strategy: 'contains' };
  }

  // Strategy 5: Trigram similarity (requires pg_trgm extension)
  res = await pool.query(`
    SELECT tmdb_id, title as db_title, year as db_year, similarity(LOWER(title), LOWER($1)) as sim
    FROM movies
    WHERE similarity(LOWER(title), LOWER($1)) > 0.4
      AND year BETWEEN $2 AND $3
    ORDER BY sim DESC, ABS(year - $4) ASC
    LIMIT 1
  `, [title, year - 2, year + 2, year]);
  if (res.rows.length > 0) {
    return { ...res.rows[0], strategy: 'trigram' };
  }

  return null;
}

(async () => {
  const unmatchedFilms = [];
  const newMatches = [];
  let totalUnmatched = 0;

  console.log('# Matching 175 Missing Films\n');

  for (const genre of genres) {
    const genreUnmatched = [];

    for (const tier of tiers) {
      // Extract films from GeniusView.swift
      const regex = new RegExp(`case \\("${genre}", "${tier}"\\):[\\s\\S]*?return \\[([\\s\\S]*?)\\]`, 'm');
      const match = swiftFile.match(regex);

      if (!match) continue;

      const filmsStr = match[1];
      const filmMatches = Array.from(filmsStr.matchAll(/\("(.+?)",\s*(\d{4})\)/g));

      for (const filmMatch of filmMatches) {
        const title = filmMatch[1];
        const year = parseInt(filmMatch[2]);
        const lookupKey = `"${genre}|${tier}|${title}|${year}":`;

        // Skip if already in lookup
        if (lookupFile.includes(lookupKey)) continue;

        // Try to find it in database
        const result = await searchMovie(title, year);

        if (result) {
          newMatches.push({
            key: `"${genre}|${tier}|${title}|${year}": ${result.tmdb_id},`,
            genre,
            tier,
            title,
            year,
            db_title: result.db_title,
            db_year: result.db_year,
            tmdb_id: result.tmdb_id,
            strategy: result.strategy
          });
          console.log(`✅ ${genre} > ${tier}: "${title}" (${year}) → "${result.db_title}" (${result.db_year}) [${result.strategy}]`);
        } else {
          genreUnmatched.push({ tier, title, year });
          totalUnmatched++;
          console.log(`❌ ${genre} > ${tier}: "${title}" (${year}) - NOT FOUND`);
        }
      }
    }

    if (genreUnmatched.length > 0) {
      unmatchedFilms.push({ genre, films: genreUnmatched });
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`✅ New matches found: ${newMatches.length}`);
  console.log(`❌ Still unmatched: ${totalUnmatched}`);

  // Write new matches to append to lookup
  if (newMatches.length > 0) {
    const newEntriesFile = newMatches.map(m => `    ${m.key}`).join('\n');
    fs.writeFileSync('new-tier-matches.txt', newEntriesFile);
    console.log(`\n✅ New entries saved to new-tier-matches.txt (ready to append to TierTmdbLookup.swift)`);
  }

  // Write still-unmatched report
  if (unmatchedFilms.length > 0) {
    const report = `# Films Still Not Found in Database (${totalUnmatched} total)\n\n` +
      unmatchedFilms.map(g =>
        `## ${g.genre}\n\n` +
        g.films.map(f => `- ${f.tier}: ${f.title} (${f.year})`).join('\n')
      ).join('\n\n');

    fs.writeFileSync('still-unmatched-films.txt', report);
    console.log(`⚠️  Still unmatched films saved to still-unmatched-films.txt`);
  }

  await pool.end();
})();
