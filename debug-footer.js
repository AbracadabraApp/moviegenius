// Debug script for MovieCreativeFooter issue
// Run this in browser console at http://localhost:3000/movie/550

console.log('🔍 DEBUG: MovieCreativeFooter Issue');

// Check if enhanced static file is accessible
async function debugFooterIssue() {
  try {
    // 1. Check enhanced static file structure
    const enhancedResponse = await fetch('/data/production/movie_550.json');
    if (enhancedResponse.ok) {
      const enhancedData = await enhancedResponse.json();
      console.log('✅ Enhanced static file loaded');
      console.log('📊 keyElements structure:', enhancedData.keyElements);
      
      // 2. Check what should be passed to components
      console.log('\n=== Expected Data Structures ===');
      console.log('movie.staticData should be:', true);
      console.log('movie.keyElements should be:', enhancedData.keyElements);
      console.log('analysis.keyElements should be:', enhancedData.keyElements);
      
      // 3. Check if the keyElements structure matches component expectations
      const keyElements = enhancedData.keyElements;
      const hasValidFooterData = keyElements && (
        keyElements.director || 
        (keyElements.stars && keyElements.stars.length > 0) ||
        keyElements.cinematographer ||
        keyElements.composer
      );
      
      console.log('✅ Has valid footer data:', hasValidFooterData);
      
      // 4. Check current page state (if available)
      if (typeof window !== 'undefined' && window.React) {
        // Try to find React component state
        console.log('\n=== Current Page State ===');
        console.log('Searching for React component data...');
      }
      
    } else {
      console.log('❌ Enhanced static file not accessible');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Check if footer element exists in DOM
function checkFooterInDOM() {
  console.log('\n=== DOM Footer Check ===');
  
  // Look for footer element
  const footerSelectors = [
    '[data-component="MovieCreativeFooter"]',
    'div:contains("Starring:")',
    'div:contains("Director:")',
    'div:last-child'
  ];
  
  footerSelectors.forEach(selector => {
    try {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`✅ Found element with selector: ${selector}`);
        console.log('Element content:', element.textContent.substring(0, 100));
      } else {
        console.log(`❌ No element found with selector: ${selector}`);
      }
    } catch (e) {
      // Skip invalid selectors
    }
  });
  
  // Search for any text that looks like contributor info
  const bodyText = document.body.textContent;
  const hasStarring = bodyText.includes('Starring');
  const hasDirector = bodyText.includes('Director:');
  const hasBradPitt = bodyText.includes('Brad Pitt');
  
  console.log('📊 Footer text indicators:', {
    hasStarring,
    hasDirector,
    hasBradPitt,
    bodyTextLength: bodyText.length
  });
}

// Check browser console for relevant messages
function checkConsoleMessages() {
  console.log('\n=== Console Message Check ===');
  console.log('Looking for TIER 1 serving message...');
  
  // This would normally be visible in console already if it's working
  console.log('Expected: "⚡ TIER 1: Using enhanced static file - zero API calls"');
}

// Run all debug checks
debugFooterIssue().then(() => {
  checkFooterInDOM();
  checkConsoleMessages();
  
  console.log('\n🏁 Debug complete. Check the output above for issues.');
});