// Test the movie analysis API functionality with Railway PostgreSQL
import { RailwayMovieService } from './lib/railway-db.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Simulate the key parts of the movie-analysis API endpoint
async function testMovieAnalysisAPI() {
  console.log('🧪 Testing Movie Analysis API logic with Railway PostgreSQL...\n');

  // Test Case 1: Get analysis by TMDB ID (963 = The Maltese Falcon)
  const tmdbId = 963;
  console.log(`🔍 Test 1: Looking up movie with tmdbId=${tmdbId}`);

  try {
    // This mimics what the API does - lookup movie by TMDB ID
    const movieResult = await RailwayMovieService.getMovieByTmdbId(tmdbId);
    
    if (movieResult.data) {
      const movie = movieResult.data;
      console.log(`✅ Found movie: ${movie.title} (${movie.year})`);
      
      // Get existing analysis for this movie
      console.log('\n🎬 Test 2: Getting existing analysis...');
      const analysisResult = await RailwayMovieService.getMovieAnalysis(movie.id);
      
      if (analysisResult.data) {
        const analysis = analysisResult.data;
        console.log('✅ Found existing analysis!');
        console.log(`   Analysis type: ${analysis.analysis_type}`);
        console.log(`   Created: ${new Date(analysis.created_at).toLocaleDateString()}`);
        
        // This is what would be returned to the frontend
        const apiResponse = {
          success: true,
          movie: {
            title: movie.title,
            year: movie.year,
            tmdb_id: movie.tmdb_id
          },
          analysis: {
            type: analysis.analysis_type,
            content: analysis.claude_response,
            query: analysis.query_text,
            created_at: analysis.created_at
          }
        };
        
        console.log('\n📤 API Response structure:');
        console.log('   ✅ Movie data included');
        console.log('   ✅ Analysis content included');
        console.log('   ✅ Metadata included');
        
        // Show a preview of what the frontend would receive
        console.log(`\n📋 Response preview:`);
        console.log(`   Movie: ${apiResponse.movie.title} (${apiResponse.movie.year})`);
        console.log(`   Analysis type: ${apiResponse.analysis.type}`);
        console.log(`   Has content: ${!!apiResponse.analysis.content}`);
        
        return apiResponse;
        
      } else {
        console.log('❌ No analysis found - would need to generate new analysis');
        return { success: false, error: 'No analysis found' };
      }
      
    } else {
      console.log('❌ Movie not found in Railway database');
      return { success: false, error: 'Movie not found' };
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test Case 2: Test another movie
async function testSecondMovie() {
  console.log('\n🔍 Test 3: Testing Psycho (TMDB ID: 539)');
  
  try {
    const movieResult = await RailwayMovieService.getMovieByTmdbId(539);
    
    if (movieResult.data) {
      const analysisResult = await RailwayMovieService.getMovieAnalysis(movieResult.data.id);
      
      if (analysisResult.data) {
        console.log('✅ Psycho analysis ready for API response');
        return true;
      } else {
        console.log('❌ Psycho missing analysis');
        return false;
      }
    }
    
  } catch (error) {
    console.error('❌ Psycho test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Movie Analysis API tests...\n');
  
  const result1 = await testMovieAnalysisAPI();
  const result2 = await testSecondMovie();
  
  console.log('\n📊 Test Summary:');
  console.log(`   The Maltese Falcon API: ${result1.success ? '✅' : '❌'}`);
  console.log(`   Psycho API: ${result2 ? '✅' : '❌'}`);
  
  if (result1.success && result2) {
    console.log('\n🎉 Railway PostgreSQL is ready for movie analysis API!');
    console.log('💡 Next step: Update the actual API endpoint to use Railway instead of Supabase');
  } else {
    console.log('\n⚠️  Some tests failed - check the data migration');
  }
}

runTests();