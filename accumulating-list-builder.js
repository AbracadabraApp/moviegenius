// Accumulating list builder - preserves ALL lists ever created, allows consolidation
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🎯 Accumulating Musical List Builder\n');

async function buildAccumulatingLists(startIndex = 0, count = 50, masterListsFile = 'master-lists.json') {
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
      console.log(`📚 Loaded ${masterLists.length} existing lists from ${masterListsFile}`);
      console.log(`   Previous cost: $${totalCostSoFar.toFixed(6)}, Movies processed: ${totalMoviesProcessed}`);
    } else {
      console.log('🆕 Starting fresh master list accumulation');
    }
    
    console.log(`🎬 Processing ${count} movies (${startIndex + 1}-${startIndex + count})\n`);
    
    // Create movie text
    const movieText = movieData.map(movie => 
      `UUID:${movie.id} "${movie.title}" (${movie.year})`
    ).join('\n');
    
    // Build prompt - always show ALL accumulated lists to Claude
    let prompt;
    if (masterLists.length === 0) {
      prompt = `You are a witty film enthusiast. For these ${count} musical films, create thematic lists with creative 2-4 word names. Movies can belong to multiple lists if they fit multiple themes.

Create as many meaningful lists as needed. Each list should have 1-8 films. Use every single film provided - movies can appear on multiple lists.

Format:
{
  "lists": [
    {"name": "Jazz Age Pioneers", "movieIds": ["uuid1", "uuid2"]},
    {"name": "Broadway Dreams", "movieIds": ["uuid2", "uuid3"]},
    {"name": "Solo Spotlight", "movieIds": ["uuid4"]}
  ]
}

Movies:
${movieText}`;
    } else {
      // Show Claude ALL previous lists
      const existingListsText = masterLists.map(list => 
        `"${list.name}": [${list.movieIds.join(', ')}]`
      ).join('\n');
      
      prompt = `You have access to these ${masterLists.length} existing thematic lists:
${existingListsText}

For these ${count} NEW movies, you can:
1. Add them to existing lists if they fit thematically
2. Create new lists with creative 2-4 word names
3. Reorganize/consolidate as you see fit - but include ALL your reasoning

Movies can belong to multiple lists. Include single-movie lists if they represent unique themes.

Return your complete vision of how ALL movies (both existing and new) should be organized.

Format:
{
  "lists": [
    {"name": "Existing or New List", "movieIds": ["mix-of-old-and-new-uuids"]},
    {"name": "Single Item Theme", "movieIds": ["one-uuid"]}
  ]
}

New movies to process:
${movieText}`;
    }
    
    console.log('📤 Sending to Claude...');
    const response = await callClaude(prompt, 8000);
    
    if (response.success && response.lists) {
      const claudeResult = response.lists;
      
      // ACCUMULATE - merge Claude's result with master lists
      const newMasterLists = mergeListsPreservingAll(masterLists, claudeResult);
      
      // Count stats
      const totalMoviesInLists = newMasterLists.reduce((sum, list) => sum + (list.movieIds?.length || 0), 0);
      const uniqueMovies = new Set();
      newMasterLists.forEach(list => {
        if (list.movieIds) {
          list.movieIds.forEach(id => uniqueMovies.add(id));
        }
      });
      
      const singleItemLists = newMasterLists.filter(list => list.movieIds?.length === 1);
      
      console.log(`\n✅ SUCCESS!`);
      console.log(`Total accumulated lists: ${newMasterLists.length} (${singleItemLists.length} single-item)`);
      console.log(`Claude's current organization: ${claudeResult.length} lists`);
      console.log(`Total movie placements: ${totalMoviesInLists}`);
      console.log(`Unique movies covered: ${uniqueMovies.size}`);
      console.log(`💰 This run: $${response.cost.toFixed(6)}`);
      
      // Update totals
      totalCostSoFar += response.cost;
      totalMoviesProcessed += count;
      
      // Show sample lists
      console.log('\n🎭 Claude\'s current organization (sample):');
      claudeResult.slice(0, 6).forEach(list => {
        console.log(`  - "${list.name}" (${list.movieIds?.length || 0} movies)`);
      });
      
      console.log(`\n📦 Single-item lists preserved: ${singleItemLists.length}`);
      singleItemLists.slice(0, 3).forEach(list => {
        console.log(`  - "${list.name}"`);
      });
      
      // Save master accumulation
      const masterData = {
        method: 'accumulating-lists',
        totalLists: newMasterLists.length,
        singleItemLists: singleItemLists.length,
        claudeCurrentOrganization: claudeResult.length,
        totalMoviesProcessed: totalMoviesProcessed,
        totalCost: totalCostSoFar,
        lastRun: {
          startIndex: startIndex,
          count: count,
          cost: response.cost,
          timestamp: new Date().toISOString()
        },
        allLists: newMasterLists,
        claudeCurrentLists: claudeResult
      };
      
      fs.writeFileSync(masterListsFile, JSON.stringify(masterData, null, 2));
      console.log(`\n💾 Master accumulation saved to ${masterListsFile}`);
      
      return masterData;
      
    } else {
      throw new Error(`Processing failed: ${response.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return null;
  }
}

function mergeListsPreservingAll(masterLists, claudeResult) {
  // Start with all existing master lists
  const listsByName = new Map();
  
  // Add all master lists first
  masterLists.forEach(list => {
    listsByName.set(list.name, {
      name: list.name,
      movieIds: [...(list.movieIds || [])],
      source: 'accumulated'
    });
  });
  
  // Now add Claude's results - update existing or add new
  claudeResult.forEach(list => {
    if (listsByName.has(list.name)) {
      // Update existing list with any new movies
      const existing = listsByName.get(list.name);
      const newMovies = list.movieIds?.filter(id => !existing.movieIds.includes(id)) || [];
      existing.movieIds.push(...newMovies);
      existing.source = 'updated';
    } else {
      // Add completely new list
      listsByName.set(list.name, {
        name: list.name,
        movieIds: [...(list.movieIds || [])],
        source: 'new'
      });
    }
  });
  
  // Convert back to array, removing source field
  return Array.from(listsByName.values()).map(list => ({
    name: list.name,
    movieIds: list.movieIds
  }));
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
const masterListsFile = args[2] || 'master-lists.json';

console.log(`Parameters: startIndex=${startIndex}, count=${count}, masterFile=${masterListsFile}\n`);

// Run the accumulating builder
buildAccumulatingLists(startIndex, count, masterListsFile);