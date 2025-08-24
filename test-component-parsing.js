#!/usr/bin/env node
/**
 * Test the component's ability to parse processed_content with HTML links
 */

// Simulate the problematic processed_content from the database
const problematicProcessedContent = `{
  "metadata": {
    "title": "48 Hrs.",
    "year": 1982,
    "analysisType": "contextual",
    "wordCount": 542,
    "targetRange": "400-600",
    "confidenceScore": 0.92
  },
  "keyElements": {
    "director": "<a href="/person/38043" class="person-name">Walter Hill</a>",
    "writers": ["<a href="/person/21698" class="person-name">Larry Gross</a>", "<a href="/person/34981" class="person-name">Steven E. de Souza</a>"]
  }
}`;

console.log('🔍 Testing Component Parsing Logic');
console.log('==================================');
console.log('\nOriginal processed_content (broken JSON):');
console.log(problematicProcessedContent.substring(0, 300) + '...');

// Test the fix from the component
try {
  const escapedContent = problematicProcessedContent.replace(/"/g, '\\"');
  console.log('\n✅ Step 1: Escaped quotes for JSON parsing');
  
  const parsed = JSON.parse(escapedContent);
  console.log('✅ Step 2: JSON parsing successful');
  
  // Unescape HTML quotes in the parsed data
  function unescapeHtmlInObject(obj) {
    if (typeof obj === 'string') {
      return obj.replace(/\\"/g, '"');
    }
    if (Array.isArray(obj)) {
      return obj.map(unescapeHtmlInObject);
    }
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = unescapeHtmlInObject(value);
      }
      return result;
    }
    return obj;
  }
  
  const unescaped = unescapeHtmlInObject(parsed);
  console.log('✅ Step 3: Unescaped HTML quotes');
  
  console.log('\nResult - Director field:');
  console.log(unescaped.keyElements.director);
  
  console.log('\nResult - Writers array:');
  console.log(unescaped.keyElements.writers);
  
  // Verify HTML links are intact
  const directorHasLink = unescaped.keyElements.director.includes('<a href="/person/');
  const writersHaveLinks = unescaped.keyElements.writers.some(writer => writer.includes('<a href="/person/'));
  
  console.log('\n📊 Verification:');
  console.log('- Director has HTML link:', directorHasLink);
  console.log('- Writers have HTML links:', writersHaveLinks);
  console.log('- Links preserved correctly:', directorHasLink && writersHaveLinks);
  
} catch (error) {
  console.log('❌ Parsing failed:', error.message);
}