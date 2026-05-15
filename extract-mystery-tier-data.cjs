const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Read GeniusView.swift and extract Mystery tier data
const swiftFile = fs.readFileSync('ios/moviegenius/moviegenius/Views/GeniusView.swift', 'utf8');

// Extract Mystery film data using regex
const mysterySection = swiftFile.match(/case \("Mystery", "Essential"\):[\s\S]*?case \("Mystery", "Master"\):[\s\S]*?\n\s*\]/);

if (!mysterySection) {
  console.log('Could not find Mystery section in GeniusView.swift');
  process.exit(1);
}

// Parse all Mystery tiers
const tiers = ['Essential', 'Foundational', 'Classics', 'Well-Versed', 'Devotee', 'Connoisseur', 'Deep Cuts', 'Specialist', 'Archivist', 'Master'];
const mysteryData = {};

for (const tier of tiers) {
  const regex = new RegExp(`case \\("Mystery", "${tier}"\\):[\\s\\S]*?return \\[([\\s\\S]*?)\\]`, 'm');
  const match = swiftFile.match(regex);

  if (match) {
    const filmsStr = match[1];
    const filmMatches = filmsStr.matchAll(/\("(.+?)",\s*(\d{4})\)/g);
    mysteryData[tier] = Array.from(filmMatches, m => `${m[1]} (${m[2]})`);
    console.log(`${tier}: ${mysteryData[tier].length} films`);
  }
}

(async () => {
  const lookupEntries = [];

  for (const [tier, films] of Object.entries(mysteryData)) {
    for (const filmStr of films) {
      const match = filmStr.match(/^(.+?)\s*\((\d{4})\)$/);
      if (!match) continue;

      const title = match[1].trim();
      const year = parseInt(match[2]);

      // Query database for TMDB ID
      const res = await pool.query(
        'SELECT tmdb_id FROM movies WHERE title = $1 AND year = $2',
        [title, year]
      );

      if (res.rows.length > 0) {
        const tmdbId = res.rows[0].tmdb_id;
        const key = `Mystery|${tier}|${title}|${year}`;
        lookupEntries.push(`    "${key}": ${tmdbId},`);
        console.log(`✓ ${title} (${year}) → ${tmdbId}`);
      } else {
        console.log(`✗ ${title} (${year}) - NOT FOUND in database`);
      }
    }
  }

  console.log(`\n=== Generated ${lookupEntries.length} Mystery entries ===\n`);
  console.log(lookupEntries.join('\n'));

  await pool.end();
})();
