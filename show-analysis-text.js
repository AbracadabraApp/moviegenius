// Show the actual analysis text from Railway PostgreSQL
import { RailwayMovieService } from './lib/railway-db.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function showAnalysisText() {
  console.log('📄 Showing actual analysis text from Railway PostgreSQL...\n');

  try {
    // Get The Maltese Falcon analysis
    const movie = await RailwayMovieService.getMovieByTmdbId(963);
    
    if (movie.data) {
      console.log(`🎬 Movie: ${movie.data.title} (${movie.data.year})\n`);
      
      const analysis = await RailwayMovieService.getMovieAnalysis(movie.data.id);
      
      if (analysis.data) {
        const claudeResponse = analysis.data.claude_response;
        
        // Handle both string and object formats
        let analysisText = '';
        if (typeof claudeResponse === 'string') {
          analysisText = claudeResponse;
        } else if (claudeResponse && claudeResponse.raw_content) {
          analysisText = claudeResponse.raw_content;
        } else {
          analysisText = JSON.stringify(claudeResponse, null, 2);
        }
        
        console.log('📝 ANALYSIS TEXT:');
        console.log('=' .repeat(80));
        console.log(analysisText.substring(0, 2000));
        if (analysisText.length > 2000) {
          console.log('\n... (truncated - showing first 2000 characters)');
          console.log(`Full length: ${analysisText.length} characters`);
        }
        console.log('=' .repeat(80));
        
      } else {
        console.log('❌ No analysis found');
      }
      
    } else {
      console.log('❌ Movie not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

showAnalysisText();