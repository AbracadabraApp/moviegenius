const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Read GeniusView.swift
const swiftFile = fs.readFileSync('ios/moviegenius/moviegenius/Views/GeniusView.swift', 'utf8');

const genres = [
  'Action', 'Adventure', 'Comedy', 'Crime', 'Documentary', 'Drama',
  'Espionage', 'Fantasy', 'History', 'Horror', 'Mystery', 'Noir',
  'Romance', 'Science Fiction', 'Thriller', 'War', 'Western'
];

const tiers = [
  'Essential', 'Foundational', 'Classics', 'Well-Versed', 'Devotee',
  'Connoisseur', 'Deep Cuts', 'Specialist', 'Archivist', 'Master'
];

// Try multiple strategies to find film
async function findFilm(title, year) {
  // Strategy 1: Exact match
  let res = await pool.query(
    'SELECT tmdb_id FROM movies WHERE title = $1 AND year = $2',
    [title, year]
  );
  if (res.rows.length > 0) return res.rows[0].tmdb_id;

  // Strategy 2: Year ±1 (TMDB sometimes differs)
  res = await pool.query(
    'SELECT tmdb_id, year as db_year FROM movies WHERE title = $1 AND year BETWEEN $2 AND $3',
    [title, year - 1, year + 1]
  );
  if (res.rows.length > 0) {
    console.log(`  📅 Year mismatch: ${title} (${year}) found as (${res.rows[0].db_year})`);
    return res.rows[0].tmdb_id;
  }

  // Strategy 3: Case-insensitive partial match
  res = await pool.query(
    'SELECT tmdb_id, title as db_title FROM movies WHERE LOWER(title) LIKE LOWER($1) AND year BETWEEN $2 AND $3 LIMIT 1',
    [`%${title}%`, year - 1, year + 1]
  );
  if (res.rows.length > 0) {
    console.log(`  🔤 Title variation: "${title}" → "${res.rows[0].db_title}"`);
    return res.rows[0].tmdb_id;
  }

  return null;
}

(async () => {
  const lookupEntries = [];
  const missingFilms = [];
  let totalFound = 0;
  let totalMissing = 0;

  for (const genre of genres) {
    console.log(`\n=== ${genre} ===`);
    let genreFound = 0;
    let genreMissing = 0;

    for (const tier of tiers) {
      const regex = new RegExp(`case \\("${genre}", "${tier}"\\):[\\s\\S]*?return \\[([\\s\\S]*?)\\]`, 'm');
      const match = swiftFile.match(regex);

      if (!match) continue;

      const filmsStr = match[1];
      const filmMatches = Array.from(filmsStr.matchAll(/\("(.+?)",\s*(\d{4})\)/g));

      for (const filmMatch of filmMatches) {
        const title = filmMatch[1].trim();
        const year = parseInt(filmMatch[2]);

        const tmdbId = await findFilm(title, year);

        if (tmdbId) {
          const key = `${genre}|${tier}|${title}|${year}`;
          lookupEntries.push(`    "${key}": ${tmdbId},`);
          totalFound++;
          genreFound++;
        } else {
          missingFilms.push({ genre, tier, title, year });
          totalMissing++;
          genreMissing++;
          console.log(`  ❌ ${tier}: ${title} (${year})`);
        }
      }
    }
    console.log(`  ✅ ${genreFound} found, ❌ ${genreMissing} missing`);
  }

  console.log(`\n=== FINAL RESULTS ===`);
  console.log(`✅ Found: ${totalFound} films`);
  console.log(`❌ Still missing: ${totalMissing} films`);

  // Generate Swift file
  const swiftOutput = `//
//  TierTmdbLookup.swift
//  moviegenius
//
//  Generated with fuzzy matching from GeniusView.swift
//  Run: node --env-file=.env.local build-complete-tier-lookup.cjs
//

import Foundation

extension CategoryEssentials {
    // Complete TMDB ID lookup for all genre tier films (${totalFound} films)
    // Missing from database: ${totalMissing} films
    // Key format: "Category|Subcategory|Title|Year"
    static let tierTmdbData: [String: Int] = [
${lookupEntries.join('\n')}
    ]
}
`;

  fs.writeFileSync('ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift', swiftOutput);
  console.log(`\n✅ Wrote TierTmdbLookup.swift with ${totalFound} entries`);

  if (missingFilms.length > 0) {
    const report = `# Films Not in Database (${missingFilms.length} total)

These films are defined in GeniusView.swift but not in your 21K movie database.

${missingFilms.map(f => `${f.genre} > ${f.tier}: ${f.title} (${f.year})`).join('\n')}
`;
    fs.writeFileSync('films-not-in-database.txt', report);
    console.log(`⚠️  Missing films saved to films-not-in-database.txt`);
  }

  await pool.end();
})();
