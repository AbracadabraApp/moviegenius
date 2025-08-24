// Extract rich metadata from musical movies for list generation
import fs from 'fs';

console.log('🎵 Extracting Musical Movie Metadata\n');

try {
  const testData = JSON.parse(fs.readFileSync('musical-test-data.json', 'utf8'));
  console.log(`Processing ${testData.movieCount} Musical movies`);
  
  const movieIds = testData.movieData.map(movie => movie.tmdb_id).filter(Boolean);
    
  console.log(`Extracted ${movieIds.length} movie IDs`);
  
  const enrichedMovies = [];
  let processed = 0;
  
  for (const movieId of movieIds.slice(0, 10)) { // Test with first 10
    try {
      const response = await fetch(`http://localhost:3001/api/movie-analysis?tmdbId=${movieId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.analysis) {
          const analysis = JSON.parse(data.analysis);
          
          enrichedMovies.push({
            movieId: movieId,
            title: data.movie.title,
            year: data.movie.year,
            enhancedMetadata: analysis.enhancedMetadata || {},
            whyWatch: analysis.whyWatch || {},
            exploreTopics: analysis.exploreTopics || []
          });
          processed++;
        }
      }
    } catch (error) {
      console.log(`Failed to process movie ${movieId}: ${error.message}`);
    }
  }
  
  console.log(`Successfully processed ${processed} movies`);
  
  // Save enriched data
  fs.writeFileSync('musical-enriched-metadata.json', JSON.stringify({
    movieCount: processed,
    movies: enrichedMovies
  }, null, 2));
  
  console.log('Saved to musical-enriched-metadata.json');
  
  // Show sample data structure
  if (enrichedMovies.length > 0) {
    console.log('\n📊 Sample metadata structure:');
    console.log(JSON.stringify(enrichedMovies[0], null, 2));
  }
  
} catch (error) {
  console.error('❌ Failed:', error.message);
}