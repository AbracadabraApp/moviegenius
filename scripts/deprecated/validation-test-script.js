// Enhanced Static Validation Test Script
// Run this in browser console at http://localhost:3000/movie/550

console.log('🧪 ENHANCED STATIC VALIDATION TESTS');

// Test 1: Check if using enhanced static file
async function testTier1Serving() {
  console.log('\n=== Test 1: Enhanced Static File Serving ===');
  try {
    const enhancedResponse = await fetch('/data/production/movie_550.json');
    if (enhancedResponse.ok) {
      const enhancedData = await enhancedResponse.json();
      console.log('✅ Enhanced static file accessible');
      console.log('📊 Enhanced format:', enhancedData.enhancedFormat);
      console.log('📊 Trailer video ID:', enhancedData.movieHeader?.trailerVideoId);
      return enhancedData;
    }
  } catch (error) {
    console.log('❌ Enhanced static file not accessible:', error.message);
  }
}

// Test 2: Check entity links in content
function testEntityLinks(enhancedData) {
  console.log('\n=== Test 2: Entity Link Validation ===');
  const sections = enhancedData.analysis?.sections || [];
  
  let hasPersonLinks = false;
  let hasMovieLinks = false;
  
  sections.forEach((section, index) => {
    const content = section.content || '';
    const personMatches = content.match(/<a href="\/person\/\d+"/g);
    const movieMatches = content.match(/<a href="\/movie\/\d+"/g);
    
    if (personMatches) {
      hasPersonLinks = true;
      console.log(`✅ Section ${index + 1} has ${personMatches.length} person links:`, personMatches);
    }
    
    if (movieMatches) {
      hasMovieLinks = true;
      console.log(`✅ Section ${index + 1} has ${movieMatches.length} movie links:`, movieMatches);
    }
  });
  
  console.log('📊 Summary:', {
    hasPersonLinks,
    hasMovieLinks,
    totalSections: sections.length
  });
}

// Test 3: Check DOM for rendered links
function testRenderedLinks() {
  console.log('\n=== Test 3: Rendered Link Validation ===');
  
  const personLinks = document.querySelectorAll('a.person-name');
  const movieLinks = document.querySelectorAll('a.movie-title');
  
  console.log(`✅ Found ${personLinks.length} rendered person links`);
  console.log(`✅ Found ${movieLinks.length} rendered movie links`);
  
  // Test if links are clickable
  personLinks.forEach((link, i) => {
    console.log(`🔗 Person link ${i + 1}: ${link.textContent} -> ${link.href}`);
  });
  
  movieLinks.forEach((link, i) => {
    console.log(`🔗 Movie link ${i + 1}: ${link.textContent} -> ${link.href}`);
  });
}

// Test 4: Check contributor footer
function testContributorFooter() {
  console.log('\n=== Test 4: Contributor Footer Validation ===');
  
  const footer = document.querySelector('[data-component="MovieCreativeFooter"]') || 
                document.querySelector('div:last-child'); // Fallback search
  
  if (footer) {
    console.log('✅ Footer element found');
    const contributorLinks = footer.querySelectorAll('a[href^="/person/"]');
    console.log(`📊 Contributor links: ${contributorLinks.length}`);
    
    contributorLinks.forEach((link, i) => {
      console.log(`🔗 Contributor ${i + 1}: ${link.textContent} -> ${link.href}`);
    });
  } else {
    console.log('❌ Footer element not found');
  }
}

// Test 5: Performance measurement
function testLoadPerformance() {
  console.log('\n=== Test 5: Load Performance ===');
  
  const entries = performance.getEntriesByType('navigation');
  if (entries.length > 0) {
    const entry = entries[0];
    const loadTime = entry.loadEventEnd - entry.loadEventStart;
    const domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
    
    console.log(`📊 Page load time: ${loadTime}ms`);
    console.log(`📊 DOM content loaded: ${domContentLoaded}ms`);
    console.log(`📊 Target: <100ms (enhanced static)`);
    
    if (loadTime < 100) {
      console.log('✅ Performance target met');
    } else {
      console.log('⚠️ Performance target not met');
    }
  }
}

// Run all tests
async function runValidationTests() {
  console.log('🚀 Starting Enhanced Static Validation Tests...\n');
  
  const enhancedData = await testTier1Serving();
  
  if (enhancedData) {
    testEntityLinks(enhancedData);
  }
  
  // Wait a moment for page to fully render
  setTimeout(() => {
    testRenderedLinks();
    testContributorFooter();
    testLoadPerformance();
    
    console.log('\n🏁 Validation tests completed');
    console.log('📋 Manual checks needed:');
    console.log('   • Click person/movie links to test navigation');
    console.log('   • Verify trailer modal opens correctly');
    console.log('   • Check media card click behavior');
    console.log('   • Confirm Why Watch section displays properly');
  }, 2000);
}

// Auto-run tests
runValidationTests();