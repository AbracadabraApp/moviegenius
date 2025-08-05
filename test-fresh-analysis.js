// Test what happens when we call the movie analysis API for a movie without existing analysis
import { Client } from 'pg';
import dotenv from 'dotenv';

async function testFreshAnalysis() {
  // Test the API call
  console.log('🧪 Testing fresh analysis generation...');
  
  try {
    const response = await fetch('http://localhost:3003/api/movie-analysis?tmdbId=242224');
    const data = await response.json();
    
    console.log('\n📊 API Response Summary:');
    console.log('Success:', data.success);
    console.log('Source:', data.source);
    console.log('Analysis type:', typeof data.analysis);
    console.log('Analysis length:', data.analysis?.length || 0);
    
    if (data.analysis) {
      // Check if it's JSON
      try {
        const parsed = JSON.parse(data.analysis);
        console.log('\n✅ Analysis is JSON format!');
        console.log('JSON structure keys:', Object.keys(parsed));
        
        if (parsed.whyWatch) {
          console.log(`whyWatch items: ${parsed.whyWatch.length}`);
        }
        if (parsed.featuredMovies) {
          console.log(`featuredMovies: ${parsed.featuredMovies.length}`);
        }
        if (parsed.exploreTopics) {
          console.log(`exploreTopics: ${parsed.exploreTopics.length}`);
        }
        if (parsed.moreIdeas) {
          console.log(`moreIdeas: ${parsed.moreIdeas.length}`);
        }
        
      } catch (e) {
        console.log('\n❌ Analysis is NOT JSON format');
        console.log('Content preview:', data.analysis.substring(0, 200) + '...');
      }
    }
    
  } catch (error) {
    console.log('❌ API test failed:', error.message);
  }
}

// Load environment variables and test
dotenv.config({ path: '.env.local' });
testFreshAnalysis();