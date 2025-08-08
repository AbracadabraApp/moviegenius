// Test the Railway database service
import { RailwayMovieService } from './lib/railway-db.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testRailwayService() {
  console.log('🧪 Testing Railway Movie Service...\n');

  try {
    // Test 1: Get existing movie by TMDB ID (Fight Club = 550)
    console.log('📺 Test 1: Get Fight Club by TMDB ID (550)');
    const movie = await RailwayMovieService.getMovieByTmdbId(550);
    
    if (movie.data) {
      console.log(`✅ Found movie: ${movie.data.title} (${movie.data.year})`);
      console.log(`   Movie ID: ${movie.data.id}`);
      
      // Test 2: Get analysis for this movie
      console.log('\n🎬 Test 2: Get analysis for Fight Club');
      const analysis = await RailwayMovieService.getMovieAnalysis(movie.data.id);
      
      if (analysis.data) {
        console.log('✅ Found analysis!');
        console.log(`   Analysis type: ${analysis.data.analysis_type}`);
        console.log(`   Has Claude response: ${!!analysis.data.claude_response}`);
        console.log(`   Query: ${analysis.data.query_text?.substring(0, 50)}...`);
      } else {
        console.log('❌ No analysis found for this movie');
      }
    } else {
      console.log('❌ Movie not found');
    }

    // Test 3: Search movies
    console.log('\n🔍 Test 3: Search for movies with "Fight" in title');
    const searchResults = await RailwayMovieService.searchMovies('Fight', 1999);
    console.log(`✅ Found ${searchResults.data.length} movies matching search`);
    
    searchResults.data.forEach(movie => {
      console.log(`   - ${movie.title} (${movie.year})`);
    });

    console.log('\n🎉 Railway Movie Service tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRailwayService();