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

(async () => {
  const lookupEntries = [];
  const missingFilms = [];
  let totalFound = 0;
  let totalMissing = 0;

  for (const genre of genres) {
    console.log(`\n=== ${genre} ===`);

    for (const tier of tiers) {
      const regex = new RegExp(`case \\("${genre}", "${tier}"\\):[\\s\\S]*?return \\[([\\s\\S]*?)\\]`, 'm');
      const match = swiftFile.match(regex);

      if (!match) continue;

      const filmsStr = match[1];
      const filmMatches = Array.from(filmsStr.matchAll(/\("(.+?)",\s*(\d{4})\)/g));

      for (const filmMatch of filmMatches) {
        const title = filmMatch[1].trim();
        const year = parseInt(filmMatch[2]);

        // Query database for TMDB ID
        const res = await pool.query(
          'SELECT tmdb_id FROM movies WHERE title = $1 AND year = $2',
          [title, year]
        );

        if (res.rows.length > 0) {
          const tmdbId = res.rows[0].tmdb_id;
          const key = `${genre}|${tier}|${title}|${year}`;
          lookupEntries.push(`    "${key}": ${tmdbId},`);
          totalFound++;
        } else {
          missingFilms.push({ genre, tier, title, year });
          totalMissing++;
          console.log(`  ❌ ${tier}: ${title} (${year})`);
        }
      }
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`✅ Found: ${totalFound} films`);
  console.log(`❌ Missing: ${totalMissing} films`);

  // Generate Swift file
  const swiftOutput = `//
//  TierTmdbLookup.swift
//  moviegenius
//
//  Generated from GeniusView.swift film definitions
//  Run: node --env-file=.env.local regenerate-complete-tier-lookup.cjs
//

import Foundation

extension CategoryEssentials {
    // Complete TMDB ID lookup for all genre tier films (${totalFound} films)
    // Key format: "Category|Subcategory|Title|Year"
    static let tierTmdbData: [String: Int] = [
${lookupEntries.join('\n')}
    ]
}
`;

  // Write to file
  fs.writeFileSync('ios/moviegenius/moviegenius/Data/TierTmdbLookup.swift', swiftOutput);
  console.log(`\n✅ Generated TierTmdbLookup.swift with ${totalFound} entries`);

  // Write missing films report
  if (missingFilms.length > 0) {
    const missingReport = `# Missing Films Report

Total missing from database: ${missingFilms.length}

${missingFilms.map(f => `${f.genre} > ${f.tier}: ${f.title} (${f.year})`).join('\n')}
`;

    fs.writeFileSync('missing-films-report.txt', missingReport);
    console.log(`\n⚠️  Missing films report saved to missing-films-report.txt`);
  }

  await pool.end();
})();
