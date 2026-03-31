#!/usr/bin/env node

import fs from 'fs';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function simpleConsolidationTest() {
  console.log('🎬 Testing 10 movies across all 467 small lists (no batch)...\n');
  
  // Load data
  const testData = JSON.parse(fs.readFileSync('./musical-test-data.json', 'utf8'));
  const progressData = JSON.parse(fs.readFileSync('./musical-fresh-start/musical-progress.json', 'utf8'));
  
  // Get 10 movies and all small lists
  const movies = testData.movieData.slice(0, 10);
  const smallLists = progressData.masterLists.filter(list => list.movieIds.length <= 9);
  
  console.log(`📊 Processing: ${movies.length} movies against ${smallLists.length} small lists`);
  console.log(`📝 Estimated prompt size: ~${Math.ceil((smallLists.length * 50) / 4)} tokens per movie\n`);
  
  // Create movie lookup for existing titles
  const movieLookup = {};
  testData.movieData.forEach(movie => {
    movieLookup[movie.id] = movie;
  });
  
  // Build lists text with existing titles
  const listsText = smallLists.map(list => {
    const description = generateListDescription(list.name);
    const existingTitles = list.movieIds.slice(0, 3).map(id => {
      const movie = movieLookup[id];
      return movie ? `"${movie.title}" (${movie.year})` : `Movie ${id}`;
    }).join(', ');
    const truncated = list.movieIds.length > 3 ? '...' : '';
    
    return `"${list.name}" (${list.movieIds.length} movies) - ${description}
  Current titles: ${existingTitles}${truncated}`;
  }).join('\n\n');
  
  const results = [];
  let totalCost = 0;
  
  // Process each movie individually
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    console.log(`🎥 ${i+1}/10: Processing "${movie.title}" (${movie.year})...`);
    
    const movieText = `"${movie.title}" (${movie.year})`;
    
    const prompt = `You are a film curator analyzing whether musical films belong in existing thematic lists.

You have 467 LISTS below.

For each movie, use your knowledge of the film to:

1. Assign movie to lists where this movie has a strong thematic fit (>65% match required)
2. Skip assignments if the movie is already in that list
3. Explain your reasoning based on the film's actual content, themes, cultural context

Output Format (JSON only):
{
  "assignments": [
    {
      "listName": "Existing List Name", 
      "movieId": "${movie.id}",
      "reason": "Evidence-based explanation of thematic connection"
    }
  ]
}

Lists (467 total):
${listsText}

Movie to analyze: ${movieText}

Use your knowledge of this film to make evidence-based categorization decisions.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      // Calculate cost (Haiku pricing)
      const cost = (response.usage.input_tokens / 1000000) * 0.25 + (response.usage.output_tokens / 1000000) * 1.25;
      totalCost += cost;
      
      // Parse response
      const responseText = response.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.assignments && Array.isArray(parsed.assignments)) {
            console.log(`   ✅ Found ${parsed.assignments.length} assignments (Cost: $${cost.toFixed(4)})`);
            
            results.push({
              movieId: movie.id,
              movieTitle: movie.title,
              movieYear: movie.year,
              assignments: parsed.assignments,
              cost: cost,
              tokens: response.usage
            });
            
            // Show assignments
            parsed.assignments.forEach(assignment => {
              console.log(`      → "${assignment.listName}": ${assignment.reason.substring(0, 80)}...`);
            });
          } else {
            console.log(`   ❌ Invalid JSON structure`);
          }
        } catch (parseError) {
          console.log(`   ❌ JSON parse error: ${parseError.message}`);
        }
      } else {
        console.log(`   ❌ No JSON found in response`);
      }
      
    } catch (error) {
      console.log(`   ❌ API error: ${error.message}`);
    }
    
    console.log(''); // Empty line
    
    // Small delay to be nice to API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('📈 CONSOLIDATION TEST RESULTS:');
  console.log(`💰 Total cost: $${totalCost.toFixed(4)}`);
  console.log(`🎬 Movies processed: ${results.length}/${movies.length}`);
  
  const totalAssignments = results.reduce((sum, r) => sum + r.assignments.length, 0);
  console.log(`📋 Total assignments: ${totalAssignments}`);
  console.log(`📊 Average assignments per movie: ${(totalAssignments / results.length).toFixed(1)}`);
  
  // Show which lists got the most assignments
  const listCounts = {};
  results.forEach(result => {
    result.assignments.forEach(assignment => {
      listCounts[assignment.listName] = (listCounts[assignment.listName] || 0) + 1;
    });
  });
  
  const topLists = Object.entries(listCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  console.log('\n🏆 TOP LISTS BY ASSIGNMENTS:');
  topLists.forEach(([listName, count], index) => {
    console.log(`${index + 1}. "${listName}": ${count} new movies`);
  });
  
  // Save results
  fs.writeFileSync('./simple-consolidation-results.json', JSON.stringify({
    testType: 'simple_consolidation_10_movies',
    totalCost: totalCost,
    totalAssignments: totalAssignments,
    results: results,
    listGrowth: listCounts
  }, null, 2));
  
  console.log('\n💾 Results saved to simple-consolidation-results.json');
}

function generateListDescription(listName) {
  const name = listName.toLowerCase();
  
  if (name.includes('broadway') || name.includes('stage')) {
    return 'Films adapted from Broadway musicals and stage productions';
  } else if (name.includes('jazz') || name.includes('1920')) {
    return 'Musical films from or about the jazz age era';
  } else if (name.includes('golden age') || name.includes('classic')) {
    return 'Classic Hollywood musical films from the golden age';
  } else if (name.includes('romance') || name.includes('love')) {
    return 'Musical films centered around romantic themes';
  } else if (name.includes('dance') || name.includes('dancing')) {
    return 'Musical films with significant dance sequences';
  } else if (name.includes('christmas') || name.includes('holiday')) {
    return 'Musical films with holiday or seasonal themes';
  } else if (name.includes('comedy') || name.includes('comedies')) {
    return 'Light-hearted and comedic musical films';
  } else if (name.includes('drama') || name.includes('dramas')) {
    return 'Dramatic musical films with serious themes';
  } else if (name.includes('animated') || name.includes('animation')) {
    return 'Animated musical films and cartoons';
  } else if (name.includes('folk') || name.includes('traditional')) {
    return 'Musical films featuring folk or traditional music';
  } else {
    return `Musical films with ${listName.toLowerCase()} themes`;
  }
}

simpleConsolidationTest().catch(console.error);