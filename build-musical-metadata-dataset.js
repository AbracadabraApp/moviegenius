// Build full musical dataset with rich metadata in normalized format
import fs from 'fs';

console.log('🎵 Building Musical Metadata Dataset\n');

try {
  const testData = JSON.parse(fs.readFileSync('musical-test-data.json', 'utf8'));
  console.log(`Processing ${testData.movieCount} Musical movies`);
  
  const movieData = testData.movieData;
  const normalizedMovies = [];
  let processed = 0;
  let errors = 0;
  
  console.log('📡 Fetching metadata from API...');
  
  // Process movies in batches to avoid overwhelming the API
  const BATCH_SIZE = 10;
  
  for (let i = 0; i < Math.min(50, movieData.length); i += BATCH_SIZE) { // Test with first 50 movies
    const batch = movieData.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}...`);
    
    const batchPromises = batch.map(async (movie) => {
      try {
        // The musical test data uses internal IDs, but we need to check if there are TMDB IDs
        // Let's try to find movies by title search first
        const searchResponse = await fetch(`http://localhost:3001/api/simple-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: movie.title })
        });
        
        if (!searchResponse.ok) {
          throw new Error(`Search failed: ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        
        if (!searchData.results || searchData.results.length === 0) {
          throw new Error('No search results');
        }
        
        // Find matching movie by title and year
        const matchingMovie = searchData.results.find(result => 
          result.title.toLowerCase() === movie.title.toLowerCase() && 
          result.year == movie.year
        );
        
        if (!matchingMovie) {
          throw new Error('No matching movie found');
        }
        
        // Now get the full analysis
        const analysisResponse = await fetch(`http://localhost:3001/api/movie-analysis?tmdbId=${matchingMovie.tmdb_id}`);
        
        if (!analysisResponse.ok) {
          throw new Error(`Analysis failed: ${analysisResponse.status}`);
        }
        
        const analysisData = await analysisResponse.json();
        
        if (!analysisData.success || !analysisData.analysis) {
          throw new Error('No analysis available');
        }
        
        const analysis = JSON.parse(analysisData.analysis);
        
        // Build normalized metadata string
        const topics = analysis.exploreTopics?.map(t => t.topic?.replace(/\s+/g, '_').toLowerCase()).join(', ') || 'unknown';
        const audiences = analysis.enhancedMetadata?.recommendedFor?.join(', ') || 'general_audiences';
        const context = analysis.enhancedMetadata?.historicalContext || 'contemporary';
        const whyWatch = analysis.whyWatch?.reasons?.[0] || 'Notable film worth viewing';
        
        const normalizedEntry = `TMDB:${matchingMovie.tmdb_id} "${movie.title}" (${movie.year}) - Topics: ${topics} | Audience: ${audiences} | Context: ${context} | Why: ${whyWatch}`;
        
        return {
          success: true,
          entry: normalizedEntry,
          tmdbId: matchingMovie.tmdb_id
        };
        
      } catch (error) {
        return {
          success: false,
          error: error.message,
          movie: movie
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Process results
    batchResults.forEach(result => {
      if (result.success) {
        normalizedMovies.push(result.entry);
        processed++;
      } else {
        errors++;
        console.log(`❌ Failed: ${result.movie?.title} - ${result.error}`);
      }
    });
    
    console.log(`Batch complete: ${processed} success, ${errors} errors`);
    
    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`Successfully processed: ${processed}`);
  console.log(`Errors: ${errors}`);
  
  if (normalizedMovies.length > 0) {
    // Save the normalized dataset
    const dataset = {
      category: 'Musical',
      movieCount: normalizedMovies.length,
      normalizedMovies: normalizedMovies,
      generatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync('musical-metadata-normalized.json', JSON.stringify(dataset, null, 2));
    console.log(`\n💾 Saved ${normalizedMovies.length} normalized entries to musical-metadata-normalized.json`);
    
    // Show sample entries
    console.log('\n🎬 Sample normalized entries:');
    normalizedMovies.slice(0, 3).forEach((entry, i) => {
      console.log(`${i + 1}. ${entry}`);
    });
  } else {
    console.log('\n❌ No movies successfully processed');
  }
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
}