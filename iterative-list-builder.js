// Iterative list building - fit movies to existing lists, create new only when needed
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🔄 Iterative Musical List Building\n');

async function buildIterativeLists() {
  try {
    // Load the musical dataset
    const testData = JSON.parse(fs.readFileSync('musical-test-data.json', 'utf8'));
    const movieData = testData.movieData.slice(94, 194); // Next 100 movies (95-194)
    
    // Start with existing lists from previous run (100 movies already processed)
    const existingResults = JSON.parse(fs.readFileSync('incremental-results.json', 'utf8'));
    let currentLists = existingResults.lists;
    let totalCost = 0;
    let batchSize = 25; // Process 25 movies at a time
    
    console.log(`Starting with ${currentLists.length} existing lists from previous 100 movies`);
    
    console.log(`Total movies to process: ${movieData.length}`);
    console.log(`Processing in batches of ${batchSize}\n`);
    
    // Process movies in batches
    for (let batch = 0; batch < Math.ceil(movieData.length / batchSize); batch++) {
      const startIdx = batch * batchSize;
      const endIdx = Math.min(startIdx + batchSize, movieData.length);
      const batchMovies = movieData.slice(startIdx, endIdx);
      
      console.log(`🎬 BATCH ${batch + 1}: Processing movies ${startIdx + 1}-${endIdx}`);
      
      // Create movie text for this batch
      const movieText = batchMovies.map(movie => 
        `UUID:${movie.id} "${movie.title}" (${movie.year})`
      ).join('\n');
      
      // Since we're starting with existing lists, always use the fitting approach
      const existingListsText = currentLists.map(list => 
        `"${list.name}": [${list.movieIds.join(', ')}]`
      ).join('\n');
      
      const prompt = `You have these existing thematic lists:
${existingListsText}

For each of these ${batchMovies.length} NEW movies, either:
1. Add it to an existing list if it fits thematically
2. Create a descriptive new list (2-4 words) if it doesn't fit any existing list

Focus on good thematic fits. Don't force movies into lists where they don't belong.

Return ALL lists (both existing and any new ones you create).

Format:
{
  "lists": [
    {"name": "Jazz Age Pioneers", "movieIds": ["existing-uuid", "new-uuid-if-fits"]},
    {"name": "Broadway Dreams", "movieIds": ["existing-uuids"]},
    {"name": "New Category Name", "movieIds": ["new-uuid-for-new-list"]}
  ]
}

New movies to process:
${movieText}`;
      }
      
      // Call Claude
      const response = await callClaude(prompt, 4000);
      totalCost += response.cost;
      
      if (response.success && response.lists) {
        currentLists = response.lists;
        
        // Count movies in lists
        const totalMoviesInLists = currentLists.reduce((sum, list) => sum + (list.movieIds?.length || 0), 0);
        const expectedMovies = (batch + 1) * batchSize > movieData.length ? movieData.length : (batch + 1) * batchSize;
        
        console.log(`  ✅ Now have ${currentLists.length} lists containing ${totalMoviesInLists} movies (expected: ${expectedMovies})`);
        
        // Show new/updated lists
        const listsWithMultipleMovies = currentLists.filter(list => list.movieIds && list.movieIds.length > 1);
        console.log(`  📊 Lists with 2+ movies: ${listsWithMultipleMovies.length}`);
        
      } else {
        throw new Error(`Batch ${batch + 1} failed: ${response.error || 'Unknown error'}`);
      }
      
      // Save progress after each batch
      const progress = {
        batch: batch + 1,
        totalBatches: Math.ceil(movieData.length / batchSize),
        processedMovies: endIdx,
        totalMovies: movieData.length,
        currentLists: currentLists.length,
        totalCost: totalCost,
        lists: currentLists,
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync('iterative-progress.json', JSON.stringify(progress, null, 2));
      
      console.log(`  💰 Batch cost: $${response.cost.toFixed(6)} | Total: $${totalCost.toFixed(6)}\n`);
    }
    
    // Final summary
    console.log('🎉 FINAL RESULTS:');
    console.log(`Total lists created: ${currentLists.length}`);
    console.log(`Total cost: $${totalCost.toFixed(6)}`);
    
    // Show list distribution
    const listSizes = currentLists.map(list => list.movieIds?.length || 0);
    const avgSize = listSizes.reduce((a, b) => a + b, 0) / listSizes.length;
    console.log(`Average list size: ${avgSize.toFixed(1)} movies`);
    
    // Show sample lists
    console.log('\n🎭 Sample final lists:');
    currentLists.slice(0, 8).forEach(list => {
      console.log(`  - "${list.name}" (${list.movieIds?.length || 0} movies)`);
    });
    
    // Save final results
    const finalResults = {
      method: 'iterative-fitting',
      totalLists: currentLists.length,
      totalMovies: movieData.length,
      averageListSize: avgSize,
      totalCost: totalCost,
      lists: currentLists,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('iterative-final-results.json', JSON.stringify(finalResults, null, 2));
    console.log('\n💾 Final results saved to iterative-final-results.json');
    
    return finalResults;
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
  }
}

async function callClaude(prompt, maxTokens = 4000) {
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
      console.log('  ⚠️  JSON parsing failed');
    }
    
    return {
      success: false,
      cost: cost,
      rawResponse: response,
      error: 'JSON parsing failed'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      cost: 0
    };
  }
}

// Run the iterative builder
buildIterativeLists();