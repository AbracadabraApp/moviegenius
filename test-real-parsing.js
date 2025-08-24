#!/usr/bin/env node
/**
 * Test the component's parsing fix with actual database content
 */

// Simulate the actual processed_content from database with &quot; encoding
const realProcessedContent = `{
  "metadata": {
    "title": "Star Trek: The Motion Picture",
    "year": 1979,
    "analysisType": "contextual",
    "wordCount": 542,
    "targetRange": "400-600",
    "confidenceScore": 0.85
  },
  "keyElements": {
    "director": "<a href=&quot;/person/38043&quot; class=&quot;person-name&quot;>Robert Wise</a>",
    "writers": ["<a href=&quot;/person/21698&quot; class=&quot;person-name&quot;>Harold Livingston</a>"]
  },
  "whyWatch": {
    "recommendation": "NO", 
    "reasons": ["Watch <a href=&quot;/movie/154&quot; class=&quot;movie-title&quot; data-tmdb-id=&quot;154&quot;>Star Trek II: The Wrath of Khan</a> (1982) instead for a more compelling Trek film experience"]
  }
}`;

console.log('🔍 Testing Component Parsing Fix');
console.log('=================================');
console.log('\nOriginal processed_content (with &quot; encoding):');
console.log(realProcessedContent.substring(0, 200) + '...');

// Test my component fix
try {
  // Step 1: Try original parsing (should fail)
  try {
    const directParsed = JSON.parse(realProcessedContent);
    console.log('❌ Direct parsing succeeded unexpectedly');
  } catch (e) {
    console.log('✅ Step 1: Direct parsing failed as expected:', e.message.substring(0, 50) + '...');
  }
  
  // Step 2: Apply my fix - replace &quot; with "
  const cleanedContent = realProcessedContent.replace(/&quot;/g, '"');
  console.log('✅ Step 2: Applied HTML entity fix');
  
  const parsed = JSON.parse(cleanedContent);
  console.log('✅ Step 3: JSON parsing successful after fix');
  
  // Verify data structure
  console.log('\n📊 Parsed Structure:');
  console.log('- Has metadata:', !!parsed.metadata);
  console.log('- Has keyElements:', !!parsed.keyElements);
  console.log('- Has whyWatch:', !!parsed.whyWatch);
  
  // Verify HTML links are intact
  console.log('\n🔗 HTML Links Check:');
  console.log('- Director link:', parsed.keyElements.director.includes('<a href="/person/'));
  console.log('- WhyWatch link:', parsed.whyWatch.reasons[0].includes('<a href="/movie/'));
  
  console.log('\nDirector HTML:', parsed.keyElements.director);
  console.log('WhyWatch HTML:', parsed.whyWatch.reasons[0]);
  
  console.log('\n✅ Fix successful - component should now use processed_content');
  
} catch (error) {
  console.log('❌ Fix failed:', error.message);
}