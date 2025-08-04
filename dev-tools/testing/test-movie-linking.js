// Quick test for dual movie title pattern detection
// Run with: node test-movie-linking.js

const testText = `
Christopher Nolan's The Dark Knight (2008) revolutionized superhero films with its realistic approach.

**Casablanca** (1942) remains one of cinema's greatest achievements, while Citizen Kane (1941) 
is often cited as the best film ever made.

Other films like **Parasite** (2019) and The Godfather (1972) have also achieved critical acclaim.

Some non-movie examples that should NOT link:
- moved to Chicago (1998) when I was young
- graduated from college (2003) with honors
- the golden age (1940s) was a great time
`;

// Simulate the patterns from EntityLinkedText
function testPatterns(text) {
  const matches = [];

  // Pattern 1: Bold format **Movie Title** (Year)
  const boldPattern = /\*\*([^*]+)\*\* \((\d{4})\)/g;
  let match;

  console.log('=== BOLD PATTERN MATCHES ===');
  while ((match = boldPattern.exec(text)) !== null) {
    const title = match[1].trim();
    const year = parseInt(match[2]);
    console.log(`✅ Bold: "${title}" (${year})`);
    matches.push({ title, year, type: 'bold' });
  }

  // Pattern 2: Legacy format Movie Title (Year)
  const legacyPattern = /\b([A-Z][a-z]+(?: [A-Z][a-z]+)+) \((\d{4})\)\b/g;

  console.log('\n=== LEGACY PATTERN MATCHES ===');
  while ((match = legacyPattern.exec(text)) !== null) {
    const title = match[1].trim();
    const year = parseInt(match[2]);

    // Check for overlaps with bold matches
    const overlaps = matches.some(existing => existing.title === title && existing.year === year);

    if (!overlaps) {
      console.log(`✅ Legacy: "${title}" (${year})`);
      matches.push({ title, year, type: 'legacy' });
    } else {
      console.log(`⚠️  Skipped duplicate: "${title}" (${year})`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  const boldCount = matches.filter(m => m.type === 'bold').length;
  const legacyCount = matches.filter(m => m.type === 'legacy').length;
  console.log(`Total matches: ${matches.length}`);
  console.log(`Bold format: ${boldCount}`);
  console.log(`Legacy format: ${legacyCount}`);

  return matches;
}

testPatterns(testText);
