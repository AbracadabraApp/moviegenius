// Universal list builder - fits movies to existing lists AND/OR creates new ones
// Movies can appear on multiple lists
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🌟 Universal Musical List Builder\n');

async function buildUniversalLists(startIndex = 0, count = 50, existingListsFile = null) {
  try {
    // Load the musical dataset
    const testData = JSON.parse(fs.readFileSync('musical-test-data.json', 'utf8'));
    const movieData = testData.movieData.slice(startIndex, startIndex + count);
    
    // Load existing lists if provided
    let existingLists = [];
    if (existingListsFile && fs.existsSync(existingListsFile)) {
      const existingResults = JSON.parse(fs.readFileSync(existingListsFile, 'utf8'));
      existingLists = existingResults.lists || [];
      console.log(`📚 Loaded ${existingLists.length} existing lists from ${existingListsFile}`);
    } else {
      console.log('🆕 Starting with no existing lists');
    }
    
    console.log(`🎬 Processing ${count} movies (${startIndex + 1}-${startIndex + count})\n`);
    
    // Create movie text
    const movieText = movieData.map(movie => 
      `UUID:${movie.id} "${movie.title}" (${movie.year})`
    ).join('\n');
    
    // Build the universal prompt
    let prompt;
    if (existingLists.length === 0) {
      prompt = `You are a witty film enthusiast. For these ${count} musical films, create thematic lists with creative 2-4 word names. Movies can belong to multiple lists if they fit multiple themes.

Create as many meaningful lists as needed. Each list should have 2-8 films. Use every single film provided - movies can appear on multiple lists.

Format:
{
  "lists": [
    {"name": "Jazz Age Pioneers", "movieIds": ["uuid1", "uuid2"]},
    {"name": "Broadway Dreams", "movieIds": ["uuid2", "uuid3", "uuid4"]},
    {"name": "Romance & Rhythm", "movieIds": ["uuid1", "uuid4", "uuid5"]}
  ]
}

Movies:
${movieText}`;
    } else {
      const existingListsText = existingLists.map(list => 
        `"${list.name}": [${list.movieIds.join(', ')}]`
      ).join('\n');
      
      prompt = `You have these existing thematic lists:
${existingListsText}

For these ${count} NEW movies, you can:
1. Add them to existing lists if they fit thematically (movies can be on multiple existing lists)
2. Create new lists with creative 2-4 word names if they don't fit existing themes
3. Both - add to existing AND create new lists as appropriate

Movies can belong to multiple lists. Focus on meaningful thematic connections.

Return ALL lists (existing ones with any new additions + any new lists you create).

Format:
{
  "lists": [
    {"name": "Existing List", "movieIds": ["old-uuids", "new-uuid-if-fits"]},
    {"name": "Another Existing", "movieIds": ["old-uuids"]},
    {"name": "New Category Name", "movieIds": ["new-uuids-for-new-theme"]}
  ]
}

New movies to process:
${movieText}`;
    }
    
    console.log('📤 Sending to Claude...');
    const response = await callClaude(prompt, 8000);
    
    if (response.success && response.lists) {
      const newLists = response.lists;
      
      // Count movies and lists
      const totalMoviesInLists = newLists.reduce((sum, list) => sum + (list.movieIds?.length || 0), 0);
      const uniqueMovies = new Set();
      newLists.forEach(list => {
        if (list.movieIds) {
          list.movieIds.forEach(id => uniqueMovies.add(id));
        }
      });
      
      console.log(`\n✅ SUCCESS!`);
      console.log(`Lists: ${newLists.length}`);
      console.log(`Total movie placements: ${totalMoviesInLists}`);
      console.log(`Unique movies covered: ${uniqueMovies.size}/${count}`);
      console.log(`Average placements per movie: ${(totalMoviesInLists / uniqueMovies.size).toFixed(1)}`);
      console.log(`💰 Cost: $${response.cost.toFixed(6)}`);
      
      // Show sample lists
      console.log('\n🎭 Sample lists:');
      newLists.slice(0, 8).forEach(list => {
        console.log(`  - "${list.name}" (${list.movieIds?.length || 0} movies)`);
      });
      
      // Save results
      const results = {
        method: 'universal-fit-create',
        startIndex: startIndex,
        count: count,
        totalLists: newLists.length,
        totalPlacements: totalMoviesInLists,
        uniqueMoviesCovered: uniqueMovies.size,
        avgPlacementsPerMovie: totalMoviesInLists / uniqueMovies.size,
        cost: response.cost,
        lists: newLists,
        timestamp: new Date().toISOString()
      };
      
      const outputFile = `universal-results-${startIndex}-${startIndex + count}.json`;
      fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
      console.log(`\n💾 Results saved to ${outputFile}`);
      
      return results;
      
    } else {
      throw new Error(`Processing failed: ${response.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return null;
  }
}

async function callClaude(prompt, maxTokens = 8000) {
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

// Parse command line arguments
const args = process.argv.slice(2);
const startIndex = parseInt(args[0]) || 0;
const count = parseInt(args[1]) || 50;
const existingListsFile = args[2] || null;

console.log(`Parameters: startIndex=${startIndex}, count=${count}, existingFile=${existingListsFile || 'none'}\n`);

// Run the universal builder
buildUniversalLists(startIndex, count, existingListsFile);