// Direct Claude API calls for movie recommendations - no web server needed
import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import { MOVIE_RECOMMENDATION_CONTEXT } from './lib/prompts/contexts.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const tmdbIds = JSON.parse(fs.readFileSync('tmdb-ids-1000.json', 'utf8'));

let yesCount = 0;
let noCount = 0;
let totalTime = 0;
let totalCost = 0;
let processedCount = 0;

console.log('Direct Claude API Testing - 1000 Movie Recommendations\n');

for (const id of tmdbIds) {
  const startTime = Date.now();
  
  try {
    // Look up actual movie title from TMDB
    const tmdbResponse = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}`);
    
    if (!tmdbResponse.ok) {
      console.log(`Movie ${id}: ERROR - TMDB lookup failed\n`);
      continue;
    }
    
    const tmdbData = await tmdbResponse.json();
    const movieTitle = `${tmdbData.title} (${tmdbData.release_date?.substring(0, 4) || 'Unknown'})`;
    
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: MOVIE_RECOMMENDATION_CONTEXT.max_tokens,
      temperature: MOVIE_RECOMMENDATION_CONTEXT.temperature,
      system: MOVIE_RECOMMENDATION_CONTEXT.structure.replace('{{FILM_TITLE}}', movieTitle),
      messages: [
        {
          role: 'user',
          content: movieTitle,
        },
      ],
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Calculate cost (Claude 3.5 Sonnet pricing)
    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;
    const cost = (inputTokens * 3 + outputTokens * 15) / 1000000; // $3/$15 per million tokens
    
    const rawResponse = message.content[0].text;
    
    try {
      const analysis = JSON.parse(rawResponse);
      const movieTitle = analysis.metadata?.title || `Movie ${id}`;
      const recommendation = analysis.whyWatch?.recommendation;
      const reasons = analysis.whyWatch?.reasons || [];
      
      if (recommendation === 'YES' || recommendation === 'NO') {
        console.log(`${movieTitle} (${id}): ${recommendation}`);
        reasons.forEach(reason => {
          console.log(`  • ${reason}`);
        });
        console.log(`  Time: ${duration.toFixed(2)}s | Cost: $${cost.toFixed(4)}\n`);
        
        if (recommendation === 'YES') yesCount++;
        else noCount++;
        
        totalTime += duration;
        totalCost += cost;
        processedCount++;
      } else {
        console.log(`${movieTitle} (${id}): ERROR - Invalid recommendation: ${recommendation}\n`);
      }
      
    } catch (parseError) {
      console.log(`Movie ${id}: ERROR - JSON parse failed\n`);
    }
    
  } catch (error) {
    console.log(`Movie ${id}: ERROR - ${error.message}\n`);
  }
  
  // Brief pause to avoid rate limits
  await new Promise(resolve => setTimeout(resolve, 200));
}

// Final report
console.log('='.repeat(60));
console.log('FINAL REPORT');
console.log('='.repeat(60));

const total = yesCount + noCount;
console.log(`Successfully processed: ${processedCount}/1000 movies`);
console.log(`YES: ${yesCount} (${total > 0 ? ((yesCount/total)*100).toFixed(1) : 0}%)`);
console.log(`NO: ${noCount} (${total > 0 ? ((noCount/total)*100).toFixed(1) : 0}%)`);
console.log(`Total time: ${(totalTime/60).toFixed(1)} minutes`);
console.log(`Total cost: $${totalCost.toFixed(2)}`);

if (processedCount > 0) {
  const avgTimePerMovie = totalTime / processedCount;
  const avgCostPerMovie = totalCost / processedCount;
  
  console.log(`Average per movie: ${avgTimePerMovie.toFixed(2)}s, $${avgCostPerMovie.toFixed(4)}`);
  
  // Estimates for 16k movies
  const estimated16kTime = (avgTimePerMovie * 16000) / 60 / 60; // hours
  const estimated16kCost = avgCostPerMovie * 16000;
  
  console.log('\n16K MOVIE ESTIMATES:');
  console.log(`Estimated time: ${estimated16kTime.toFixed(1)} hours`);
  console.log(`Estimated cost: $${estimated16kCost.toFixed(0)}`);
}

console.log('='.repeat(60));