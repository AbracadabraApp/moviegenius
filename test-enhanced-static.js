#!/usr/bin/env node
/**
 * Test Enhanced Static Serving
 * Verifies that the enhanced static file is being served correctly
 */

async function testEnhancedStatic() {
  const movieId = 550;
  
  console.log(`🧪 Testing Enhanced Static Serving for Movie ${movieId}`);
  console.log('=' .repeat(50));
  
  try {
    // Test direct access to enhanced static file
    const response = await fetch(`http://localhost:3000/data/production/movie_${movieId}.json`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Enhanced static file accessible');
      console.log(`📊 Title: ${data.title}`);
      console.log(`📊 Enhanced Format: ${data.enhancedFormat}`);
      console.log(`📊 Sections: ${data.analysis.sections.length}`);
      console.log(`📊 Featured Movies: ${data.analysis.featuredMovies.length}`);
      console.log(`📊 Has Why Watch: ${!!data.analysis.whyWatch}`);
      console.log(`📊 Has Key Elements: ${!!data.keyElements}`);
      
      // Test that movie page loads and uses enhanced data
      console.log('\n🌐 Testing movie page response...');
      const pageResponse = await fetch(`http://localhost:3000/movie/${movieId}`);
      
      if (pageResponse.ok) {
        console.log('✅ Movie page loads successfully');
        console.log(`📊 Response time: ${pageResponse.headers.get('x-response-time') || 'Unknown'}ms`);
        console.log(`📊 Content-Type: ${pageResponse.headers.get('content-type')}`);
        
        const htmlContent = await pageResponse.text();
        if (htmlContent.includes('Fight Club')) {
          console.log('✅ Page contains expected movie content');
        } else {
          console.log('⚠️  Page may not contain expected content');
        }
      } else {
        console.log('❌ Movie page failed to load');
      }
      
    } else {
      console.log('❌ Enhanced static file not accessible');
      console.log(`📊 Status: ${response.status}`);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🧪 Enhanced Static Test Complete');
  console.log('\n💡 To see tier selection in action, check browser console at:');
  console.log('   http://localhost:3000/movie/550');
}

// Run the test
testEnhancedStatic();