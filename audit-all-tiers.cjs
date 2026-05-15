const fs = require('fs');

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

let totalIssues = 0;
const allIssues = [];

for (const genre of genres) {
  const genreIssues = [];

  for (const tier of tiers) {
    // Extract films from GeniusView.swift
    const regex = new RegExp(`case \\("${genre}", "${tier}"\\):[\\s\\S]*?return \\[([\\s\\S]*?)\\]`, 'm');
    const match = swiftFile.match(regex);

    if (!match) {
      genreIssues.push(`  ❌ ${tier}: NOT DEFINED IN SWIFT FILE`);
      continue;
    }

    const filmsStr = match[1];
    const filmMatches = Array.from(filmsStr.matchAll(/\("(.+?)",\s*(\d{4})\)/g));
    const swiftFilms = filmMatches.map(m => ({ title: m[1], year: m[2] }));

    // Check how many are in lookup
    let inLookup = 0;
    const missingFromLookup = [];

    for (const film of swiftFilms) {
      const lookupKey = `"${genre}|${tier}|${film.title}|${film.year}":`;
      if (lookupFile.includes(lookupKey)) {
        inLookup++;
      } else {
        missingFromLookup.push(`${film.title} (${film.year})`);
      }
    }

    // Report discrepancies
    if (swiftFilms.length !== inLookup) {
      const issue = `  ⚠️  ${tier}: ${swiftFilms.length} films defined, only ${inLookup} in lookup`;
      genreIssues.push(issue);

      if (missingFromLookup.length > 0) {
        genreIssues.push(`      Missing: ${missingFromLookup.join(', ')}`);
      }
      totalIssues++;
    }
  }

  if (genreIssues.length > 0) {
    allIssues.push({ genre, issues: genreIssues });
  }
}

console.log('# Film Journey Lists - Complete Audit\n');
console.log('Checking GeniusView.swift vs TierTmdbLookup.swift\n');
console.log('---\n');

if (allIssues.length === 0) {
  console.log('✅ **ALL LISTS VERIFIED - NO ISSUES FOUND**\n');
  console.log('All films defined in GeniusView.swift have matching TMDB IDs in TierTmdbLookup.swift');
} else {
  console.log(`⚠️  **FOUND ${totalIssues} ISSUES**\n`);

  for (const { genre, issues } of allIssues) {
    console.log(`## ${genre}\n`);
    issues.forEach(issue => console.log(issue));
    console.log('');
  }
}

console.log('\n---\n');
console.log('## Summary by Genre\n');

for (const genre of genres) {
  let totalInSwift = 0;
  let totalInLookup = 0;

  for (const tier of tiers) {
    const regex = new RegExp(`case \\("${genre}", "${tier}"\\):[\\s\\S]*?return \\[([\\s\\S]*?)\\]`, 'm');
    const match = swiftFile.match(regex);
    if (match) {
      const count = Array.from(match[1].matchAll(/\("(.+?)",\s*(\d{4})\)/g)).length;
      totalInSwift += count;

      // Count in lookup
      const lookupMatches = lookupFile.match(new RegExp(`"${genre}\\|${tier}\\|`, 'g'));
      totalInLookup += (lookupMatches ? lookupMatches.length : 0);
    }
  }

  const status = totalInSwift === totalInLookup ? '✅' : '⚠️ ';
  console.log(`${status} ${genre.padEnd(20)} Swift: ${totalInSwift}, Lookup: ${totalInLookup}`);
}
