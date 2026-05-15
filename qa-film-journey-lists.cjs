const fs = require('fs');

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

console.log('# Film Journey Lists - QA Report\n');
console.log('Generated:', new Date().toISOString().split('T')[0]);
console.log('');

for (const genre of genres) {
  console.log(`## ${genre}`);
  console.log('');

  let genreTotal = 0;
  const missingTiers = [];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const tierNum = i + 1;

    const regex = new RegExp(`case \\("${genre}", "${tier}"\\):[\\s\\S]*?return \\[([\\s\\S]*?)\\]`, 'm');
    const match = swiftFile.match(regex);

    if (match) {
      const filmsStr = match[1];
      const filmMatches = Array.from(filmsStr.matchAll(/\("(.+?)",\s*(\d{4})\)/g));
      const count = filmMatches.length;
      genreTotal += count;

      console.log(`  ${tierNum}. ${tier.padEnd(15)} ${count} films`);

      if (count === 0) {
        missingTiers.push(`${tierNum}. ${tier} - NO FILMS DEFINED`);
      }
    } else {
      console.log(`  ${tierNum}. ${tier.padEnd(15)} ❌ NOT FOUND`);
      missingTiers.push(`${tierNum}. ${tier} - TIER NOT DEFINED`);
    }
  }

  console.log('');
  console.log(`  **Total: ${genreTotal} films**`);

  if (missingTiers.length > 0) {
    console.log('');
    console.log('  ⚠️ **Issues:**');
    missingTiers.forEach(issue => console.log(`     - ${issue}`));
  }

  console.log('');
  console.log('---');
  console.log('');
}

// Grand total
console.log('## Summary\n');
let grandTotal = 0;
for (const genre of genres) {
  let genreTotal = 0;
  for (const tier of tiers) {
    const regex = new RegExp(`case \\("${genre}", "${tier}"\\):[\\s\\S]*?return \\[([\\s\\S]*?)\\]`, 'm');
    const match = swiftFile.match(regex);
    if (match) {
      const count = Array.from(match[1].matchAll(/\("(.+?)",\s*(\d{4})\)/g)).length;
      genreTotal += count;
    }
  }
  console.log(`${genre.padEnd(20)} ${genreTotal} films`);
  grandTotal += genreTotal;
}

console.log('');
console.log(`**GRAND TOTAL: ${grandTotal} films across ${genres.length} genres**`);
