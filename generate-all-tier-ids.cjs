const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Map genre tier files to their categories
const genreFiles = {
  'Action': '/Users/josh.petersen/Downloads/files 2/action_tiers.json',
  'Adventure': '/Users/josh.petersen/Downloads/files 2/untitled folder/adventure_tiers.json',
  'Comedy': '/Users/josh.petersen/Downloads/files 2/comedy_tiers.json',
  'Crime': '/Users/josh.petersen/Downloads/files 2/untitled folder/crime_tiers.json',
  'Drama': '/Users/josh.petersen/Downloads/drama_tiers.json',
  'Espionage': '/Users/josh.petersen/Downloads/espionage_tiers.json',
  'Fantasy': '/Users/josh.petersen/Downloads/fantasy_tiers.json',
  'History': '/Users/josh.petersen/Downloads/history_tiers.json',
  'Horror': '/Users/josh.petersen/Downloads/horror_tiers.json',
  'Noir': '/Users/josh.petersen/Downloads/noir_tiers.json',
  'Romance': '/Users/josh.petersen/Downloads/romance_tiers.json',
  'Science Fiction': '/Users/josh.petersen/Downloads/scifi_tiers.json',
  'Thriller': '/Users/josh.petersen/Downloads/thriller_tiers.json',
  'War': '/Users/josh.petersen/Downloads/war_tiers.json',
  'Western': '/Users/josh.petersen/Downloads/western_tiers.json'
};

// Manually add Documentary (no JSON source file)
const manualEntries = {
  'Documentary': {
    'Essential': [
      'Hoop Dreams (1994)',
      'Shoah (1985)',
      'The Thin Blue Line (1988)',
      'Man with a Movie Camera (1929)',
      'Nanook of the North (1922)',
      'Grey Gardens (1975)',
      'Harlan County, USA (1976)',
      'Roger & Me (1989)',
      'Bowling for Columbine (2002)',
      "Won't You Be My Neighbor? (2018)"
    ]
  }
};

(async () => {
  let swiftOutput = 'static let tmdbIdLookup: [String: Int] = [\n';
  let totalFound = 0;
  let totalMissing = 0;
  const missingFilms = [];

  for (const [category, filePath] of Object.entries(genreFiles)) {
    console.log(`\n=== Processing ${category} ===`);

    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found: ${filePath}`);
      continue;
    }

    const tierData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const [tier, films] of Object.entries(tierData)) {
      console.log(`  ${tier}: ${films.length} films`);

      for (const filmStr of films) {
        // Parse "Title (Year)" format
        const match = filmStr.match(/^(.+?)\s*\((\d{4})\)$/);
        if (!match) {
          console.log(`    ⚠️  Could not parse: ${filmStr}`);
          continue;
        }

        const title = match[1].trim();
        const year = parseInt(match[2]);

        // Query database
        const res = await pool.query(
          'SELECT tmdb_id FROM movies WHERE title = $1 AND year = $2',
          [title, year]
        );

        if (res.rows.length > 0) {
          const tmdbId = res.rows[0].tmdb_id;
          const lookupKey = `${category}|${tier}|${title}|${year}`;
          swiftOutput += `    "${lookupKey}": ${tmdbId},\n`;
          totalFound++;
        } else {
          missingFilms.push(`${category} > ${tier}: "${title}" (${year})`);
          totalMissing++;
        }
      }
    }
  }

  // Process manual entries (no JSON source files)
  for (const [category, tiers] of Object.entries(manualEntries)) {
    console.log(`\n=== Processing ${category} (manual) ===`);

    for (const [tier, films] of Object.entries(tiers)) {
      console.log(`  ${tier}: ${films.length} films`);

      for (const filmStr of films) {
        // Parse "Title (Year)" format
        const match = filmStr.match(/^(.+?)\s*\((\d{4})\)$/);
        if (!match) {
          console.log(`    ⚠️  Could not parse: ${filmStr}`);
          continue;
        }

        const title = match[1].trim();
        const year = parseInt(match[2]);

        // Query database
        const res = await pool.query(
          'SELECT tmdb_id FROM movies WHERE title = $1 AND year = $2',
          [title, year]
        );

        if (res.rows.length > 0) {
          const tmdbId = res.rows[0].tmdb_id;
          const lookupKey = `${category}|${tier}|${title}|${year}`;
          swiftOutput += `    "${lookupKey}": ${tmdbId},\n`;
          totalFound++;
        } else {
          missingFilms.push(`${category} > ${tier}: "${title}" (${year})`);
          totalMissing++;
        }
      }
    }
  }

  swiftOutput += ']';

  // Write Swift output to file
  fs.writeFileSync('/Users/josh.petersen/moviegenius/tier-tmdb-lookup.swift', swiftOutput);

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`Found: ${totalFound} films`);
  console.log(`Missing: ${totalMissing} films`);

  if (missingFilms.length > 0) {
    console.log(`\n=== MISSING FILMS ===`);
    missingFilms.forEach(film => console.log(`  ${film}`));
  }

  console.log(`\nSwift dictionary written to: /Users/josh.petersen/moviegenius/tier-tmdb-lookup.swift`);

  await pool.end();
})();
