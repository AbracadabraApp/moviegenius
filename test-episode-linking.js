/**
 * Test Episode Movie Linking - Pattern Detection Demo
 * 
 * Tests the movie pattern detection logic without requiring database access.
 * Run with: node test-episode-linking.js
 */

// Simple version of the pattern detection logic
function extractMovieMentions(content) {
  if (!content || typeof content !== 'string') return [];
  
  const mentions = [];
  
  // Primary pattern: "Movie Title" (Year) - Quoted format used in episodes
  const quotedPattern = /"([^"]+)"\s*\((\d{4})\)/g;
  let match;
  
  while ((match = quotedPattern.exec(content)) !== null) {
    const title = match[1].trim();
    const year = parseInt(match[2]);
    
    mentions.push({
      original: match[0],
      title,
      year,
      start: match.index,
      end: match.index + match[0].length,
      type: 'quoted'
    });
  }
  
  // Secondary pattern: Movie Title (Year) - Legacy format for any unquoted mentions
  const legacyPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+\((\d{4})\)\b/g;
  legacyPattern.lastIndex = 0; // Reset regex state
  
  while ((match = legacyPattern.exec(content)) !== null) {
    const title = match[1].trim();
    const year = parseInt(match[2]);
    
    // Check for overlap with quoted patterns
    const overlaps = mentions.some(existing => 
      (match.index >= existing.start && match.index < existing.end) ||
      (existing.start >= match.index && existing.start < match.index + match[0].length)
    );
    
    if (!overlaps) {
      mentions.push({
        original: match[0],
        title,
        year,
        start: match.index,
        end: match.index + match[0].length,
        type: 'legacy'
      });
    }
  }
  
  return mentions.sort((a, b) => a.start - b.start);
}

// Test with sample episode content
const testContent = `
The roots of German Expressionism emerged from the devastation of World War I, as filmmakers sought to capture the nation's collective trauma through distorted sets, extreme angles, and chiaroscuro lighting. Robert Wiene's "The Cabinet of Dr. Caligari" (1920) marked the movement's definitive arrival, with its painted shadows, geometric set designs, and exploration of authority and madness.

F.W. Murnau's "Nosferatu" (1922) took expressionist techniques in a different direction, using real locations and natural lighting to create an equally unsettling atmosphere. Later films like "M" (1931) by Fritz Lang would bridge expressionism with early sound cinema.

These films influenced American directors who fled Nazi Germany, bringing expressionist techniques to Hollywood. The visual language created in films like "The Last Laugh" (1924) and "Pandora's Box" (1929) would become the foundation for film noir cinematography.
`;

console.log('🎬 Episode Movie Linking - Pattern Detection Test');
console.log('================================================\n');

console.log('Test Content:');
console.log(testContent);
console.log('\n=== DETECTED MOVIE MENTIONS ===\n');

const mentions = extractMovieMentions(testContent);

mentions.forEach((mention, index) => {
  console.log(`${index + 1}. ${mention.type.toUpperCase()} FORMAT:`);
  console.log(`   Original: ${mention.original}`);
  console.log(`   Title: "${mention.title}"`);
  console.log(`   Year: ${mention.year}`);
  console.log(`   Position: ${mention.start}-${mention.end}`);
  console.log(`   Would link to: /movie/[TMDB_ID_FOR_${mention.title.toUpperCase().replace(/\s+/g, '_')}]`);
  console.log('');
});

console.log(`📊 Summary:`);
console.log(`  • Total mentions found: ${mentions.length}`);
console.log(`  • Quoted format ("Movie"): ${mentions.filter(m => m.type === 'quoted').length}`);
console.log(`  • Legacy format (Movie): ${mentions.filter(m => m.type === 'legacy').length}`);

console.log(`\n🔗 Link Creation Preview:`);
console.log('Each mention would be converted to:');
console.log('• "Movie Title" (Year) → <a href="/movie/TMDB_ID">Movie Title</a> (Year)');
console.log('• Movie Title (Year) → <a href="/movie/TMDB_ID">Movie Title</a> (Year)');

console.log(`\n✅ Episode Movie Linking System Ready for V1!`);
console.log('Run with database access to process all 65 episode files.');