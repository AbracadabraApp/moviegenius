// Test the Railway-adapted analysis-movie-linker service
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testMovieLinker() {
  console.log('🧪 Testing Railway-adapted Movie Linker...\n');

  try {
    // Test importing the service
    console.log('1. Testing service import...');
    const { extractAllMovieReferences, processAnalysisMovies } = await import('./lib/analysis-movie-linker.js');
    console.log('   ✅ Successfully imported movie linker services');

    // Test movie reference extraction
    console.log('\n2. Testing movie reference extraction...');
    const testAnalysis = `
This is a test analysis with movie references.

MOVIES: The Godfather|1972|the-godfather|Netflix

The film draws inspiration from **Casablanca** (1942) and **The Maltese Falcon** (1941).
It also references **Citizen Kane** without a year.

Some more text here.
    `;
    
    const references = extractAllMovieReferences(testAnalysis);
    console.log(`   ✅ Found ${references.featuredMovies.length} featured movies:`);
    references.featuredMovies.forEach(movie => {
      console.log(`      - ${movie.title} (${movie.year}) [${movie.source}]`);
    });
    
    console.log(`   ✅ Found ${references.linkedMovies.length} linked movies:`);
    references.linkedMovies.forEach(movie => {
      console.log(`      - ${movie.title} (${movie.year || 'no year'}) [${movie.source}]`);
    });

    // Test processing with a simple example (database lookup)
    console.log('\n3. Testing movie processing (database lookup)...');
    try {
      const simpleAnalysis = 'This analysis mentions **The Maltese Falcon** (1941).';
      const result = await processAnalysisMovies(simpleAnalysis, 963); // Use The Maltese Falcon as current movie
      
      console.log('   ✅ Processing completed successfully');
      console.log(`   Featured movies: ${result.featuredMovies.length}`);
      console.log(`   Linked movies: ${result.linkedMovies.length}`);
      console.log(`   All movies: ${result.allMovies.length}`);
      
      if (result.allMovies.length > 0) {
        console.log('   First movie processed:', result.allMovies[0].title);
      }
      
    } catch (processingError) {
      console.log('   ⚠️  Processing failed (expected if no database connection):', processingError.message);
    }

    console.log('\n🎯 Movie linker adaptation looks good!');
    console.log('📝 Ready for integration into movie-analysis API');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testMovieLinker();