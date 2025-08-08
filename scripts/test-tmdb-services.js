// Test if TMDB services are available and working
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testTMDBServices() {
  console.log('🧪 Testing TMDB Services availability...\n');

  try {
    // Test 1: Check environment variables
    console.log('1. Environment Variables:');
    console.log(`   TMDB_API_KEY exists: ${!!process.env.NEXT_PUBLIC_TMDB_API_KEY}`);
    console.log(`   TMDB_BEARER_TOKEN exists: ${!!process.env.TMDB_BEARER_TOKEN}`);
    
    // Test 2: Try importing TMDB service
    console.log('\n2. TMDB Service Import:');
    try {
      const { getTMDBMovieDetails } = await import('./lib/services/tmdb-search.js');
      console.log('   ✅ Successfully imported getTMDBMovieDetails');
      
      // Test with Avatar (2009) - TMDB ID: 19995
      console.log('\n3. TMDB API Call Test:');
      const testResult = await getTMDBMovieDetails(19995);
      
      if (testResult && testResult.title) {
        console.log(`   ✅ TMDB API working: ${testResult.title} (${testResult.release_date})`);
        console.log(`   Overview: ${testResult.overview?.substring(0, 100)}...`);
      } else {
        console.log('   ❌ TMDB API call failed or returned no data');
        console.log('   Result:', testResult);
      }
      
    } catch (importError) {
      console.log('   ❌ Failed to import TMDB service:', importError.message);
    }
    
    // Test 3: Try importing database service  
    console.log('\n4. Database Service Import:');
    try {
      const { createBasicMovieEntry } = await import('./lib/services/database-search.js');
      console.log('   ✅ Successfully imported createBasicMovieEntry');
    } catch (dbImportError) {
      console.log('   ❌ Failed to import database service:', dbImportError.message);
    }
    
    console.log('\n🎯 TMDB Discovery should work if all tests passed!');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testTMDBServices();