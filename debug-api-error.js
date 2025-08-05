// Debug the API endpoint error
import { RailwayMovieService } from './lib/railway-db.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugAPIError() {
  console.log('🔍 Debugging API endpoint error...\n');

  try {
    console.log('1. Testing Railway database connection...');
    const movieResult = await RailwayMovieService.getMovieByTmdbId(963);
    console.log('✅ Database connection works');
    
    console.log('2. Testing import of railway-db module...');
    console.log('✅ Import works');
    
    console.log('3. Checking environment variables...');
    console.log(`   RAILWAY_DATABASE_URL exists: ${!!process.env.RAILWAY_DATABASE_URL}`);
    
    if (movieResult.data) {
      console.log(`✅ Found movie: ${movieResult.data.title}`);
      
      const analysisResult = await RailwayMovieService.getMovieAnalysis(movieResult.data.id);
      if (analysisResult.data) {
        console.log('✅ Found analysis');
      } else {
        console.log('❌ No analysis found');
      }
    } else {
      console.log('❌ No movie found');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    console.error('Error stack:', error.stack);
  }
}

debugAPIError();