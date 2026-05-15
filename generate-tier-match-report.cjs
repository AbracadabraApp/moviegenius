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

let grandTotal = 0;
let grandMatched = 0;
let grandUnmatched = 0;

console.log('# Film Journey Lists - Matched vs Unmatched\n');

for (const genre of genres) {
  console.log(`## ${genre}\n`);

  let genreTotal = 0;
  let genreMatched = 0;
  let genreUnmatched = 0;

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];

    // Extract films - note the parentheses in case statement
    const regex = new RegExp(`case \\("${genre}", "${tier}"\\):[\\s\\S]*?return \\[([\\s\\S]*?)\\]`, 'm');
    const match = swiftFile.match(regex);

    if (!match) {
      console.log(`  ${i + 1}. ${tier.padEnd(15)} NO DEFINITION`);
      continue;
    }

    const filmsStr = match[1];
    const filmMatches = Array.from(filmsStr.matchAll(/\("(.+?)",\s*(\d{4})\)/g));
    const totalFilms = filmMatches.length;

    // Count how many are in lookup
    let matched = 0;
    for (const filmMatch of filmMatches) {
      const title = filmMatch[1];
      const year = filmMatch[2];
      const lookupKey = `"${genre}|${tier}|${title}|${year}":`;
      if (lookupFile.includes(lookupKey)) {
        matched++;
      }
    }

    const unmatched = totalFilms - matched;
    genreTotal += totalFilms;
    genreMatched += matched;
    genreUnmatched += unmatched;

    const status = unmatched === 0 ? '✅' : '⚠️ ';
    console.log(`  ${status} ${(i + 1).toString().padStart(2)}. ${tier.padEnd(15)} ${totalFilms.toString().padStart(3)} films (${matched} matched, ${unmatched} unmatched)`);
  }

  grandTotal += genreTotal;
  grandMatched += genreMatched;
  grandUnmatched += genreUnmatched;

  console.log(`\n  **Total: ${genreTotal} films (${genreMatched} matched, ${genreUnmatched} unmatched)**\n`);
  console.log('---\n');
}

console.log(`## GRAND TOTAL\n`);
console.log(`**${grandTotal} films across all genres (${grandMatched} matched, ${grandUnmatched} unmatched)**\n`);
