const fs = require('fs');

// Questionable matches identified from the log
const badMatches = [
  // Horror Pearl/X - completely wrong movies
  { line: 86, reason: 'Pearl (2022) matched to "Pearl Jam: Imola 2022" - wrong movie' },
  { line: 87, reason: 'X (2022) matched to Japanese surveillance camera movie - wrong' },

  // Action/Western duplicate bad match
  { line: 11, reason: 'The Big Gundown (1967) → "The Big Job" (1965) - wrong movie AND year' },
  { line: 129, reason: 'The Big Gundown (1967) → "The Big Job" (1965) - duplicate wrong match' },

  // Science Fiction wrong movie
  { line: 109, reason: 'Mad Max 2: The Road Warrior (1981) → "The Warriors" (1979) - completely wrong' },

  // Horror wrong sequel
  { line: 89, reason: 'Ringu (1998) → "Ringu 2" (1999) - wrong sequel' },

  // Espionage questionable
  { line: 60, reason: 'Persian Lessons (2020) → "Lesson Plan" (2022) - likely wrong' },
  { line: 61, reason: 'The Black Windmill (1974) → "The Black Tavern" (1972) - wrong movie' },
  { line: 62, reason: 'The Mackintosh Man (1973) → "The Mack" (1973) - wrong movie' },
  { line: 65, reason: 'OSS (1946) → "Operation Crossroads" (1946) - likely wrong' },

  // Horror questionable
  { line: 91, reason: 'Alone (2007) → "Evangelion: 1.0 You Are (Not) Alone" (2007) - wrong movie' },

  // Action questionable
  { line: 4, reason: 'Drunken Master II (1994) → "Drunken Master III" (1994) - wrong sequel' },
  { line: 13, reason: 'Bodyguard Kiba (1973) → "The Bodyguard" (1973) - likely wrong' },
];

const newMatches = fs.readFileSync('new-tier-matches.txt', 'utf8').split('\n').filter(l => l.trim());

console.log('# Reviewing Questionable Matches\n');
console.log('## BAD MATCHES TO REMOVE:\n');

const badLines = new Set(badMatches.map(m => m.line));
const rejectedEntries = [];
const validEntries = [];

newMatches.forEach((line, idx) => {
  const lineNum = idx + 1;
  if (badLines.has(lineNum)) {
    const match = badMatches.find(m => m.line === lineNum);
    console.log(`❌ Line ${lineNum}: ${match.reason}`);
    console.log(`   ${line}`);
    console.log('');
    rejectedEntries.push(line);
  } else {
    validEntries.push(line);
  }
});

console.log(`\n## SUMMARY\n`);
console.log(`Total matches: ${newMatches.length}`);
console.log(`Rejected: ${rejectedEntries.length}`);
console.log(`Valid: ${validEntries.length}`);

// Write cleaned matches
fs.writeFileSync('valid-tier-matches.txt', validEntries.join('\n'));
console.log(`\n✅ Valid matches saved to valid-tier-matches.txt`);

// Extract titles from rejected entries to add to unmatched
const rejectedTitles = rejectedEntries.map(entry => {
  const match = entry.match(/"([^|]+)\|([^|]+)\|([^|]+)\|(\d{4})"/);
  if (match) {
    return `- ${match[2]}: ${match[3]} (${match[4]})`;
  }
  return null;
}).filter(Boolean);

console.log(`\n## Rejected films to add to unmatched list:\n`);
rejectedTitles.forEach(title => console.log(title));
