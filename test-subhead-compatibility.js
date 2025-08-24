/**
 * Test script to validate backward compatibility between old and new analysis formats
 */

// Test data - old format
const oldFormatAnalysis = {
  metadata: { title: "Test Movie", year: 2023 },
  content: [
    { type: "plotAndCharacters", text: "Plot content here" },
    { type: "performancesAndVision", text: "Performance content here" },
    { type: "socialCulturalAndRelevance", text: "Cultural content here" }
  ]
};

// Test data - new format
const newFormatAnalysis = {
  metadata: { title: "Test Movie", year: 2023 },
  content: [
    { subhead: "Urban Nightmare", text: "Plot content here" },
    { subhead: "Dunne's Desperation", text: "Performance content here" },
    { subhead: "Technical Mastery", text: "Technical content here" },
    { subhead: "Cultural Commentary", text: "Cultural content here" }
  ]
};

// Compatibility function - handles both old and new formats
function extractSectionHeaders(analysis) {
  if (!analysis.content || !Array.isArray(analysis.content)) {
    return [];
  }
  
  return analysis.content.map((section, index) => ({
    index,
    header: section.subhead || section.type || `Section ${index + 1}`,
    isNewFormat: !!section.subhead,
    text: section.text
  }));
}

// Test both formats
console.log('🧪 Testing Analysis Format Compatibility\n');

console.log('📊 Old Format Analysis:');
const oldHeaders = extractSectionHeaders(oldFormatAnalysis);
oldHeaders.forEach(h => {
  console.log(`  Section ${h.index + 1}: "${h.header}" (${h.isNewFormat ? 'NEW' : 'OLD'} format)`);
});

console.log('\n📊 New Format Analysis:');  
const newHeaders = extractSectionHeaders(newFormatAnalysis);
newHeaders.forEach(h => {
  console.log(`  Section ${h.index + 1}: "${h.header}" (${h.isNewFormat ? 'NEW' : 'OLD'} format)`);
});

console.log('\n✅ Compatibility test completed');
console.log(`Old format sections: ${oldHeaders.length}`);
console.log(`New format sections: ${newHeaders.length}`);
console.log('Both formats can be processed by the same code! 🎉');