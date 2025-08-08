// Test the movie-analysis API for movie 805
import fetch from 'node-fetch';

async function testMovie805API() {
  try {
    console.log('🧪 Testing movie-analysis API for movie 805...');
    
    const response = await fetch('http://localhost:3003/api/movie-analysis?tmdbId=805');
    
    if (!response.ok) {
      console.log(`❌ API returned ${response.status}: ${response.statusText}`);
      const text = await response.text();
      console.log('Response body:', text);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n📊 API Response Structure:');
    console.log('Success:', data.success);
    console.log('Source:', data.source);
    console.log('Cached:', data.cached);
    
    if (data.analysis) {
      console.log('\n📝 Analysis Content:');
      console.log('Type:', typeof data.analysis);
      console.log('Length:', data.analysis.length);
      
      // Check if it's JSON
      try {
        const parsed = JSON.parse(data.analysis);
        console.log('✅ Analysis is JSON format');
        console.log('JSON keys:', Object.keys(parsed));
      } catch (e) {
        console.log('📝 Analysis is text format');
        console.log('Preview:', data.analysis.substring(0, 300) + '...');
        
        // Check for HTML links
        const linkMatches = data.analysis.match(/<a href="[^"]*"[^>]*>[^<]+<\/a>/g);
        console.log(`🔗 HTML links found: ${linkMatches ? linkMatches.length : 0}`);
        
        if (linkMatches) {
          console.log('First few links:');
          linkMatches.slice(0, 3).forEach((link, i) => {
            console.log(`  ${i + 1}. ${link}`);
          });
        }
      }
    }
    
    if (data.error) {
      console.log('❌ Error:', data.error);
    }
    
    if (data.timing) {
      console.log('\n⏱️ Timing:', data.timing);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testMovie805API();