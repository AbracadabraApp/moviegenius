// Incremental list building - start fresh, then constrain to existing lists
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🎵 Incremental Musical List Building\n');

async function buildIncrementalLists() {
  try {
    // First, build the full dataset with all 644 movies
    const testData = JSON.parse(fs.readFileSync('musical-test-data.json', 'utf8'));
    const movieData = testData.movieData;
    
    // Create simplified movie entries (UUID + Title + Year)
    const allMovies = movieData.map(movie => ({
      uuid: movie.id,
      title: movie.title,
      year: movie.year,
      text: `UUID:${movie.id} "${movie.title}" (${movie.year})`
    }));
    
    console.log(`Total movies to process: ${allMovies.length}`);
    
    let allLists = [];
    let totalCost = 0;
    let processedMovies = 0;
    
    // PHASE 1: First 50 movies - create individual lists (50 movies → 50 lists)
    console.log('\n🚀 PHASE 1: Creating individual lists for first 50 movies');
    const phase1Movies = allMovies.slice(0, 50);
    
    const phase1Prompt = `You are a witty film enthusiast. For each of these 50 musical films, create ONE thematic list with a creative 2-4 word name. Each list contains exactly ONE movie.

Create exactly 50 lists, one for each movie.

Format:
{
  "lists": [
    {"name": "Jazz Age Pioneers", "movieIds": ["uuid1"]},
    {"name": "Broadway Legends", "movieIds": ["uuid2"]},
    {"name": "Vaudeville Dreams", "movieIds": ["uuid3"]}
  ]
}

Movies (create one list per movie):
${phase1Movies.map(m => m.text).join('\n')}`;

    const phase1Response = await callClaude(phase1Prompt, 5000);
    totalCost += phase1Response.cost;
    
    if (phase1Response.success && phase1Response.lists) {
      allLists = phase1Response.lists;
      processedMovies = phase1Movies.length;
      console.log(`✅ Phase 1: Created ${allLists.length} lists for ${processedMovies} movies (should be 50 lists)`);
      
      // Verify we have 50 lists with 1 movie each
      const singleMovieLists = allLists.filter(list => list.movieIds && list.movieIds.length === 1);
      console.log(`  📊 Single-movie lists: ${singleMovieLists.length}/50`);
    } else {
      throw new Error('Phase 1 failed');
    }
    
    // PHASE 2: Next 50 movies - match to existing 50 lists or create new ones
    console.log('\n🔄 PHASE 2: Next 50 movies - add to existing 50 lists or create new');
    const phase2Movies = allMovies.slice(50, 100);
    
    const existingLists = allLists.map(list => `"${list.name}": [${list.movieIds.join(', ')}]`).join('\n');
    
    const phase2Prompt = `You have these 50 existing lists:
${existingLists}

For each of these 50 NEW movies, either:
1. Add it to an existing list if it fits thematically 
2. Create a completely new list if it doesn't fit any existing list

Do NOT consolidate or merge existing lists. Keep all 50 original lists intact.

Return ALL lists (both existing and any new ones you create).

Format:
{
  "lists": [
    {"name": "Jazz Age Pioneers", "movieIds": ["original-uuid", "new-uuid-if-fits"]},
    {"name": "Broadway Legends", "movieIds": ["original-uuid"]},
    {"name": "New Category Name", "movieIds": ["new-uuid-for-new-list"]}
  ]
}

New movies to add:
${phase2Movies.map(m => m.text).join('\n')}`;

    const phase2Response = await callClaude(phase2Prompt, 5000);
    totalCost += phase2Response.cost;
    
    if (phase2Response.success && phase2Response.lists) {
      allLists = phase2Response.lists;
      processedMovies += phase2Movies.length;
      console.log(`✅ Phase 2: Now have ${allLists.length} lists for ${processedMovies} movies`);
      
      // Count how many lists have 2+ movies (successful matches)
      const multiMovieLists = allLists.filter(list => list.movieIds && list.movieIds.length > 1);
      console.log(`  📊 Lists with 2+ movies: ${multiMovieLists.length}`);
    } else {
      throw new Error('Phase 2 failed');
    }
    
    // Continue with remaining phases...
    console.log(`\n💰 Total cost so far: $${totalCost.toFixed(6)}`);
    console.log(`📊 Current lists: ${allLists.length}`);
    console.log(`🎬 Movies processed: ${processedMovies}/${allMovies.length}`);
    
    // Save intermediate results
    const results = {
      phase: '1-2-complete',
      totalLists: allLists.length,
      processedMovies: processedMovies,
      totalMovies: allMovies.length,
      lists: allLists,
      totalCost: totalCost,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('incremental-results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Intermediate results saved to incremental-results.json');
    
    // Show sample lists
    console.log('\n🎭 Sample current lists:');
    allLists.slice(0, 5).forEach(list => {
      console.log(`  - ${list.name} (${list.movieIds?.length || 0} movies)`);
    });
    
    return results;
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
  }
}

async function callClaude(prompt, maxTokens = 3000) {
  try {
    const startTime = Date.now();
    
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const endTime = Date.now();
    const response = message.content[0].text;
    
    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;
    const cost = (inputTokens / 1000000) * 3 + (outputTokens / 1000000) * 15;
    
    console.log(`  💰 Cost: $${cost.toFixed(6)} | Time: ${(endTime - startTime) / 1000}s`);
    
    // Try to parse JSON
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          lists: parsed.lists,
          cost: cost,
          rawResponse: response
        };
      }
    } catch (parseError) {
      console.log('  ⚠️  JSON parsing failed, but response received');
    }
    
    return {
      success: false,
      cost: cost,
      rawResponse: response
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      cost: 0
    };
  }
}

// Run the incremental builder
buildIncrementalLists();