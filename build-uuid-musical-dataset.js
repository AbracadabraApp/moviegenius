// Build musical dataset using existing UUIDs with rich descriptive text
import fs from 'fs';

console.log('🎵 Building UUID-Based Musical Dataset\n');

try {
  const testData = JSON.parse(fs.readFileSync('musical-test-data.json', 'utf8'));
  console.log(`Processing ${testData.movieCount} Musical movies`);
  
  const movieData = testData.movieData;
  const normalizedMovies = [];
  let processed = 0;
  
  // For now, let's create rich descriptive text for the first batch to test the approach
  for (let i = 0; i < Math.min(20, movieData.length); i++) {
    const movie = movieData[i];
    
    // Create rich descriptive text based on what we can infer from musical films
    let topics = '';
    let audience = '';
    let context = '';
    let whyWatch = '';
    
    // Infer topics based on era and title patterns
    if (movie.year < 1940) {
      topics = 'early_cinema_history, sound_transition, theatrical_adaptation';
      context = 'pre_golden_age_hollywood';
      audience = 'film_historians, musical_enthusiasts';
      whyWatch = 'Historical significance in the development of sound cinema and musical storytelling';
    } else if (movie.year < 1970) {
      topics = 'golden_age_musicals, studio_system, choreography';
      context = 'classic_hollywood_era';
      audience = 'general_audiences, classic_film_lovers';
      whyWatch = 'Exemplifies the artistry and production values of Hollywood\'s golden age';
    } else if (movie.year < 2000) {
      topics = 'contemporary_musical, pop_culture_integration, modern_storytelling';
      context = 'modern_musical_revival';
      audience = 'contemporary_audiences, genre_enthusiasts';
      whyWatch = 'Bridges traditional musical theater with modern sensibilities';
    } else {
      topics = 'digital_era_musicals, cross_media_adaptation, contemporary_themes';
      context = 'digital_age_cinema';
      audience = 'modern_audiences, streaming_viewers';
      whyWatch = 'Represents evolution of musical genre in contemporary filmmaking';
    }
    
    // Add title-specific enrichments
    const titleLower = movie.title.toLowerCase();
    if (titleLower.includes('broadway') || titleLower.includes('stage')) {
      topics += ', stage_adaptation, theatrical_roots';
    }
    if (titleLower.includes('jazz') || titleLower.includes('swing')) {
      topics += ', jazz_influence, american_music_history';
    }
    if (titleLower.includes('dance') || titleLower.includes('dancing')) {
      topics += ', choreography_focus, movement_as_narrative';
    }
    
    const normalizedEntry = `UUID:${movie.id} "${movie.title}" (${movie.year}) - Topics: ${topics} | Audience: ${audience} | Context: ${context} | Why: ${whyWatch}`;
    
    normalizedMovies.push(normalizedEntry);
    processed++;
  }
  
  console.log(`📊 Successfully processed: ${processed} movies`);
  
  // Save the normalized dataset
  const dataset = {
    category: 'Musical',
    movieCount: normalizedMovies.length,
    normalizedMovies: normalizedMovies,
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync('musical-uuid-normalized.json', JSON.stringify(dataset, null, 2));
  console.log(`\n💾 Saved ${normalizedMovies.length} normalized entries to musical-uuid-normalized.json`);
  
  // Show sample entries
  console.log('\n🎬 Sample normalized entries:');
  normalizedMovies.slice(0, 3).forEach((entry, i) => {
    console.log(`${i + 1}. ${entry.substring(0, 120)}...`);
  });
  
  // Now test with Claude using this format
  const promptData = normalizedMovies.join('\n');
  
  const testPrompt = `You are a film enthusiast with encyclopedic knowledge. Below are musical films with rich metadata including thematic topics, target audiences, historical context, and viewing reasons.

Create thematic movie lists using this rich data. Focus on unexpected connections through topics, contexts, and audience appeal. Use meaningful 2-4 word titles. Lists must have at least 5 items and no more than 15. You must use every single film provided.

Format:
{
  "lists": [
    {"name": "Theatrical Adaptation Stories", "movieIds": ["uuid1", "uuid2"]}
  ]
}

Movies with metadata:
${promptData}`;

  fs.writeFileSync('musical-uuid-prompt.txt', testPrompt);
  console.log('\n📝 Generated prompt saved to musical-uuid-prompt.txt');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
}