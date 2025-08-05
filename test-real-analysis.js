// Test Railway service with real migrated movie analysis data
import { RailwayMovieService } from './lib/railway-db.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testRealAnalysis() {
  console.log('🧪 Testing Railway Movie Service with real analysis data...\n');

  // Test with The Maltese Falcon (TMDB ID: 963)
  console.log('📺 Test: Get The Maltese Falcon by TMDB ID (963)');
  
  try {
    const movie = await RailwayMovieService.getMovieByTmdbId(963);
    
    if (movie.data) {
      console.log(`✅ Found movie: ${movie.data.title} (${movie.data.year})`);
      console.log(`   Movie ID: ${movie.data.id}`);
      console.log(`   Official title: ${movie.data.official_title}`);
      
      // Get analysis for this movie
      console.log('\n🎬 Test: Get analysis for The Maltese Falcon');
      const analysis = await RailwayMovieService.getMovieAnalysis(movie.data.id);
      
      if (analysis.data) {
        console.log('✅ Found real analysis!');
        console.log(`   Analysis type: ${analysis.data.analysis_type}`);
        console.log(`   Created: ${analysis.data.created_at}`);
        
        // Show part of the Claude response
        if (analysis.data.claude_response) {
          const response = typeof analysis.data.claude_response === 'string' 
            ? analysis.data.claude_response 
            : JSON.stringify(analysis.data.claude_response);
          
          console.log(`   Claude response preview: ${response.substring(0, 100)}...`);
        }
        
        console.log(`   Query: ${analysis.data.query_text?.substring(0, 80)}...`);
      } else {
        console.log('❌ No analysis found for this movie');
      }
      
    } else {
      console.log('❌ The Maltese Falcon not found in Railway database');
    }

    // Test Psycho too
    console.log('\n📺 Test: Get Psycho by TMDB ID (539)');
    const psychoMovie = await RailwayMovieService.getMovieByTmdbId(539);
    
    if (psychoMovie.data) {
      console.log(`✅ Found movie: ${psychoMovie.data.title} (${psychoMovie.data.year})`);
      
      const psychoAnalysis = await RailwayMovieService.getMovieAnalysis(psychoMovie.data.id);
      if (psychoAnalysis.data) {
        console.log('✅ Found analysis for Psycho!');
        console.log(`   Analysis type: ${psychoAnalysis.data.analysis_type}`);
      }
    }

    console.log('\n🎉 Railway real analysis test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealAnalysis();