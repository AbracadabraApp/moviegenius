// One-by-one movie analyzer - true 1:1 analysis with batched data management
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🎯 One-by-One Movie Analyzer\n');

async function analyzeOneByOne(startIndex = 0, count = 50, masterListsFile = 'master-lists.json', saveInterval = 10) {
  try {
    // Load the musical dataset
    const testData = JSON.parse(fs.readFileSync('musical-test-data.json', 'utf8'));
    const movieData = testData.movieData.slice(startIndex, startIndex + count);
    
    // Load master accumulated lists
    let masterLists = [];
    let totalCostSoFar = 0;
    let totalMoviesProcessed = 0;
    
    if (fs.existsSync(masterListsFile)) {
      const masterData = JSON.parse(fs.readFileSync(masterListsFile, 'utf8'));
      masterLists = masterData.allLists || [];
      totalCostSoFar = masterData.totalCost || 0;
      totalMoviesProcessed = masterData.totalMoviesProcessed || 0;
      console.log(`📚 Starting with ${masterLists.length} existing lists`);
      console.log(`   Previous cost: $${totalCostSoFar.toFixed(6)}, Movies processed: ${totalMoviesProcessed}`);
    } else {
      console.log('🆕 Starting fresh with no existing lists');
    }
    
    console.log(`🎬 Will analyze ${count} movies one-by-one (${startIndex + 1}-${startIndex + count})`);
    console.log(`💾 Saving progress every ${saveInterval} movies\n`);
    
    // Process each movie individually
    for (let i = 0; i < movieData.length; i++) {
      const movie = movieData[i];
      const movieIndex = startIndex + i + 1;
      
      console.log(`🎭 Movie ${movieIndex}: "${movie.title}" (${movie.year})`);
      
      // Build individual movie prompt
      const movieText = `UUID:${movie.id} "${movie.title}" (${movie.year})`;
      
      let prompt;
      if (masterLists.length === 0) {
        prompt = `You are analyzing a single musical film for thematic categorization.

Movie: ${movieText}

Since this is the first movie, create 1-3 thematic lists (2-4 word names) that this movie belongs to. Consider different aspects: era, style, themes, setting, etc.

Format:
{
  "lists": [
    {"name": "Jazz Age Classics", "movieIds": ["${movie.id}"]},
    {"name": "Broadway Adaptations", "movieIds": ["${movie.id}"]}
  ]
}`;
      } else {
        const existingListsText = masterLists.map(list => 
          `"${list.name}": [${list.movieIds.length} movies]`
        ).join('\n');
        
        prompt = `You are analyzing a single musical film for thematic categorization.

Existing ${masterLists.length} thematic lists:
${existingListsText}

Movie to analyze: ${movieText}

For this ONE movie, decide:
1. Which existing lists it belongs to (can be multiple)
2. Whether it needs any NEW lists (1-3 new lists max with 2-4 word names)

Return ALL lists that should contain this movie (existing + any new ones you create).

Format:
{
  "lists": [
    {"name": "Existing List Name", "movieIds": ["${movie.id}"]},
    {"name": "New List If Needed", "movieIds": ["${movie.id}"]}
  ]
}`;
      }
      
      // Analyze this single movie
      const response = await callClaude(prompt, 4000);
      totalCostSoFar += response.cost;
      
      if (response.success && response.lists) {
        const movieLists = response.lists;
        
        // Update master lists with this movie's analysis
        movieLists.forEach(movieList => {
          const existingList = masterLists.find(list => list.name === movieList.name);
          if (existingList) {
            // Add to existing list if not already there
            if (!existingList.movieIds.includes(movie.id)) {
              existingList.movieIds.push(movie.id);
            }
          } else {
            // Create new list
            masterLists.push({
              name: movieList.name,
              movieIds: [movie.id]
            });
          }
        });
        
        console.log(`  ✅ Added to ${movieLists.length} lists: ${movieLists.map(l => l.name).join(', ')}`);
        console.log(`  💰 Cost: $${response.cost.toFixed(6)} | Total: $${totalCostSoFar.toFixed(6)}`);
        console.log(`  📊 Master lists now: ${masterLists.length} total`);
        
      } else {
        console.log(`  ❌ Failed: ${response.error}`);
        // Continue with next movie
      }
      
      // Save progress periodically
      if ((i + 1) % saveInterval === 0 || i === movieData.length - 1) {
        const progress = {
          method: 'one-by-one-analysis',
          totalLists: masterLists.length,
          moviesProcessed: totalMoviesProcessed + i + 1,
          totalCost: totalCostSoFar,
          currentBatch: {
            startIndex: startIndex,
            processed: i + 1,
            total: count
          },
          allLists: masterLists,
          timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(masterListsFile, JSON.stringify(progress, null, 2));
        console.log(`  💾 Progress saved (${i + 1}/${count} movies)\n`);
      }
    }
    
    // Final summary
    totalMoviesProcessed += count;
    
    const singleItemLists = masterLists.filter(list => list.movieIds?.length === 1);
    const totalPlacements = masterLists.reduce((sum, list) => sum + list.movieIds.length, 0);
    
    console.log('🎉 BATCH COMPLETE!');
    console.log(`Movies analyzed: ${count} (one-by-one)`);
    console.log(`Total lists: ${masterLists.length} (${singleItemLists.length} single-item)`);
    console.log(`Total movie placements: ${totalPlacements}`);
    console.log(`Average placements per movie: ${(totalPlacements / count).toFixed(1)}`);
    console.log(`Batch cost: $${response?.cost ? (totalCostSoFar - (totalCostSoFar - response.cost * count)).toFixed(6) : 'N/A'}`);
    console.log(`Total cost so far: $${totalCostSoFar.toFixed(6)}`);
    
    // Show sample lists
    console.log('\n🎭 Sample master lists:');
    masterLists.slice(0, 8).forEach(list => {
      console.log(`  - "${list.name}" (${list.movieIds?.length || 0} movies)`);
    });
    
    return {
      totalLists: masterLists.length,
      moviesProcessed: totalMoviesProcessed,
      totalCost: totalCostSoFar,
      lists: masterLists
    };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    return null;
  }
}

async function callClaude(prompt, maxTokens = 4000) {
  try {
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

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
      // Parsing failed
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

// Parse command line arguments
const args = process.argv.slice(2);
const startIndex = parseInt(args[0]) || 0;
const count = parseInt(args[1]) || 20;
const masterListsFile = args[2] || 'one-by-one-lists.json';
const saveInterval = parseInt(args[3]) || 10;

console.log(`Parameters: startIndex=${startIndex}, count=${count}, masterFile=${masterListsFile}, saveInterval=${saveInterval}\n`);

// Run the one-by-one analyzer
analyzeOneByOne(startIndex, count, masterListsFile, saveInterval);